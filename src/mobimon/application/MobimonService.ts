import type { StepResourceEvent } from '../../publishedLanguage/stepResourceEvents.ts'
import type { Clock } from '../../shared/Clock.ts'
import { DomainError } from '../../shared/DomainError.ts'
import type { IdGenerator } from '../../shared/IdGenerator.ts'
import { localDateOf } from '../../shared/LocalDate.ts'
import { BUSINESS_FIELDS, type BusinessField } from '../domain/BusinessField.ts'
import { DailyStepLog } from '../domain/DailyStepLog.ts'
import { Encounter } from '../domain/Encounter.ts'
import { generateEncounter } from '../domain/EncounterGenerator.ts'
import type { MobidexCompleted, MobidexMilestoneReached } from '../domain/events.ts'
import {
  encounterId,
  grantId,
  itemId as toItemId,
  mobimonSpeciesId,
  ownedMobimonId,
  playerId as toPlayerId,
  type PlayerId,
} from '../domain/ids.ts'
import { Inventory } from '../domain/Inventory.ts'
import { daysBetween } from '../domain/Job.ts'
import type { ItemEffectKind } from '../domain/Item.ts'
import { purchaseItem } from '../domain/ItemPurchaseService.ts'
import { MILESTONE_COUNTS, Mobidex } from '../domain/Mobidex.ts'
import type { MobimonRepository, MobimonState } from '../domain/MobimonRepository.ts'
import type { MobimonSpecies } from '../domain/MobimonSpecies.ts'
import { experienceToReach, OwnedMobimon } from '../domain/OwnedMobimon.ts'
import { Organization } from '../domain/Organization.ts'
import { Player } from '../domain/Player.ts'
import { EncounterCost, energy, MAX_LEVEL, point, TrainingCost } from '../domain/quantities.ts'
import { timeOfDayAt, type TimeOfDay } from '../domain/TimeOfDay.ts'
import { Wallet } from '../domain/Wallet.ts'
import { findItem, itemNameOf, ITEMS } from '../masterData/items.ts'
import { rewardForCompletion, rewardForMilestone, type Reward } from '../masterData/rewards.ts'
import { findSpeciesOrUnknown, SPECIES } from '../masterData/species.ts'
import { TITLES } from '../masterData/titles.ts'
import { lockedFields, lookupFor } from './OrganizationService.ts'

export interface OwnedMobimonView {
  id: string
  speciesId: string
  name: string
  rarity: string
  businessField: string | null
  description: string
  level: number
  experience: number
  /** 次のレベルまでに必要な残りの経験値(Lv30 なら null)。 */
  experienceToNextLevel: number | null
  /** いま進化できる種(条件レベルに達していなければ空)。 */
  evolutionOptions: { speciesId: string; name: string }[]
  /** 進化に必要なレベル(進化しない種は null)。 */
  evolutionLevel: number | null
  /** 所属チームと役割(チームに入っていなければ null)。 */
  team?: { field: string; role: string } | null
  /** 休養中なら、休養が明けるまでの日数(休養中でなければ null)。 */
  restingDays?: number | null
}

export interface EncounterView {
  encounterId: string
  speciesId: string
  name: string
  rarity: string
  businessField: string | null
  description: string
}

export interface RewardView {
  reason: string
  items: { name: string; quantity: number }[]
  title: string | null
}

export interface CaptureResult {
  mobimon: OwnedMobimonView
  /** 図鑑に新しく登録されたか。 */
  newlyRegistered: boolean
  rewards: RewardView[]
}

export interface EvolveResult extends CaptureResult {
  fromName: string
}

export interface TrainResult {
  mobimon: OwnedMobimonView
  gainedExperience: number
  leveledUp: boolean
}

export interface PlayerSummary {
  energy: number
  points: number
  cumulativeSteps: number
  timeOfDay: TimeOfDay
  encounterCost: number
  trainingCost: number
  ownedCount: number
  registeredCount: number
  totalSpecies: number
  titles: string[]
  activeEffects: {
    kind: ItemEffectKind
    itemName: string
    multiplier: number
    remainingUses: number
  }[]
  /** 出現中(まだ捕獲・逃走していない)のモビモン。 */
  currentEncounter: EncounterView | null
}

export interface ShopItemView {
  itemId: string
  name: string
  price: number
  kind: ItemEffectKind
  multiplier: number
  uses: number
  owned: number
  pending: number
}

export interface MobidexEntryView {
  speciesId: string
  no: number
  registered: boolean
  /** 登録済みなら名前、未登録なら null。 */
  name: string | null
  rarity: string
  businessField: string | null
  unlockSteps: number
  unlocked: boolean
  /** 出現しない種(図鑑の総数には含める)。 */
  retired: boolean
  timesOfDay: TimeOfDay[]
}

export interface MobidexView {
  entries: MobidexEntryView[]
  registeredCount: number
  fields: { field: BusinessField; registered: number; total: number; completed: boolean }[]
  fullCompleted: boolean
  milestones: { count: number; reached: boolean }[]
  titles: string[]
}

/** Mobimon コンテキストのユースケース。行動と消費は1回の保存でまとめて確定する。 */
export class MobimonService {
  private readonly repository: MobimonRepository
  private readonly clock: Clock
  private readonly ids: IdGenerator
  private readonly random: () => number

  constructor(
    repository: MobimonRepository,
    clock: Clock,
    ids: IdGenerator,
    random: () => number = Math.random,
  ) {
    this.repository = repository
    this.clock = clock
    this.ids = ids
    this.random = random
  }

  /**
   * プレイヤーを登録する(登録済みなら何もしない)。
   * Player と一緒に Wallet(残高 0)・Inventory(空)・Mobidex(空)・Organization(空の3チーム)・
   * DailyStepLog(空)を1回の保存で作る。
   * id はウォーカーと同じユーザーの ID を使う。
   */
  registerPlayer(id: string): void {
    const state = this.repository.load()
    const pid = toPlayerId(id)
    if (state.players.some((p) => p.id === pid)) return
    state.players.push(Player.create(pid))
    state.wallets.push(Wallet.create(pid))
    state.inventories.push(Inventory.create(pid))
    state.mobidexes.push(Mobidex.create(pid))
    state.organizations.push(Organization.create(pid))
    state.dailyStepLogs.push(DailyStepLog.create(pid))
    this.repository.save(state)
  }

  /**
   * 歩数リソース変換が公開したイベントを受け取る(Published Language)。
   * 付与は GrantId で重複を除き、累計歩数・日ごとの歩数は減らない方向にだけ更新する。
   */
  handleStepResourceEvent(event: StepResourceEvent): void {
    const state = this.repository.load()
    const pid = toPlayerId(event.walkerId)
    const player = state.players.find((p) => p.id === pid)
    if (!player) return
    switch (event.type) {
      case 'EnergyGranted':
        replace(state.wallets, (w) =>
          w.playerId === pid ? w.receiveEnergy(grantId(event.grantId), energy(event.energy)) : w,
        )
        break
      case 'PointsGranted':
        replace(state.wallets, (w) =>
          w.playerId === pid ? w.receivePoints(grantId(event.grantId), point(event.points)) : w,
        )
        break
      case 'CumulativeStepsUpdated':
        replace(state.players, (p) =>
          p.id === pid ? p.updateCumulativeSteps(event.cumulativeSteps) : p,
        )
        break
      case 'DailyStepsCounted':
        replace(state.dailyStepLogs, (l) =>
          l.playerId === pid ? l.record(event.date, event.steps) : l,
        )
        break
    }
    this.repository.save(state)
  }

  getSummary(id: string): PlayerSummary {
    const state = this.repository.load()
    const ctx = this.context(state, id)
    const current = state.encounters.find((e) => e.playerId === ctx.pid && e.state === '出現中')
    return {
      energy: ctx.wallet.energy,
      points: ctx.wallet.points,
      cumulativeSteps: ctx.player.cumulativeSteps,
      timeOfDay: timeOfDayAt(this.clock.now()),
      encounterCost: EncounterCost,
      trainingCost: TrainingCost,
      ownedCount: state.ownedMobimons.filter((m) => m.playerId === ctx.pid).length,
      registeredCount: ctx.mobidex.registered.size,
      totalSpecies: SPECIES.length,
      titles: titleNames(ctx.player.titles),
      activeEffects: [...ctx.inventory.activeEffects].map(([kind, effect]) => ({
        kind,
        itemName: itemNameOf(effect.itemId),
        multiplier: effect.multiplier,
        remainingUses: effect.remainingUses,
      })),
      currentEncounter: current ? encounterView(current) : null,
    }
  }

  /** プレイヤーの所持モビモン一覧(OwnedMobimon を PlayerId で検索する)。 */
  listOwnedMobimon(id: string): OwnedMobimonView[] {
    const pid = toPlayerId(id)
    const state = this.repository.load()
    const organization = state.organizations.find((o) => o.playerId === pid)
    const today = localDateOf(this.clock.now())
    return state.ownedMobimons
      .filter((m) => m.playerId === pid)
      .map((m) => {
        const position = organization?.positionOf(m.id)
        return {
          ...ownedView(m),
          team: position ? { field: position.field, role: position.role } : null,
          restingDays: m.isResting(today) ? daysBetween(today, m.restUntil!) : null,
        }
      })
  }

  /**
   * エネルギーを消費してモビモンを出現させる。
   * エネルギーの消費・出現・出現率アップ効果の残り回数の減算を1回の保存で確定する。
   */
  encounter(id: string): EncounterView {
    const state = this.repository.load()
    const ctx = this.context(state, id)
    if (state.encounters.some((e) => e.playerId === ctx.pid && e.state === '出現中')) {
      throw new DomainError('出現中のモビモンがいます。捕まえるか見送ってから探してください')
    }
    const wallet = ctx.wallet.spendEnergy(EncounterCost)
    const species = generateEncounter(
      SPECIES,
      timeOfDayAt(this.clock.now()),
      ctx.player.cumulativeSteps,
      ctx.inventory.multiplierOf('encounterBoost'),
      this.random,
    )
    const { encounter } = Encounter.appear(encounterId(this.ids.next()), ctx.pid, species.id)
    replaceFor(state.wallets, ctx.pid, wallet)
    replaceFor(state.inventories, ctx.pid, ctx.inventory.consumeEffect('encounterBoost'))
    state.encounters.push(encounter)
    this.repository.save(state)
    return encounterView(encounter)
  }

  /** 出現中のモビモンを捕獲し、図鑑に登録する。コンプリート・節目の報酬も同じ保存単位で渡す。 */
  capture(id: string, encId: string): CaptureResult {
    const state = this.repository.load()
    const ctx = this.context(state, id)
    const index = state.encounters.findIndex((e) => e.id === encId && e.playerId === ctx.pid)
    if (index < 0) throw new DomainError('出現が見つかりません')
    const { encounter, event } = state.encounters[index].capture()
    state.encounters[index] = encounter

    const owned = OwnedMobimon.capture(ownedMobimonId(this.ids.next()), ctx.pid, event.speciesId)
    state.ownedMobimons.push(owned)
    const registration = registerInMobidex(state, ctx.pid, findSpeciesOrUnknown(event.speciesId))
    this.repository.save(state)
    return { mobimon: ownedView(owned), ...registration }
  }

  /** 出現中のモビモンを見送る。 */
  flee(id: string, encId: string): void {
    const state = this.repository.load()
    const pid = this.context(state, id).pid
    const index = state.encounters.findIndex((e) => e.id === encId && e.playerId === pid)
    if (index < 0) throw new DomainError('出現が見つかりません')
    state.encounters[index] = state.encounters[index].flee()
    this.repository.save(state)
  }

  /**
   * エネルギーを消費して育成する。育成アイテムの倍率を掛け、その効果の残り回数を減らす。
   * すべて1回の保存で確定する。
   */
  train(id: string, ownedId: string): TrainResult {
    const state = this.repository.load()
    const ctx = this.context(state, id)
    const index = this.ownedIndex(state, ctx.pid, ownedId)
    const current = state.ownedMobimons[index]
    if (current.level >= MAX_LEVEL) throw new DomainError('レベルが上限に達しています')
    const wallet = ctx.wallet.spendEnergy(TrainingCost)
    const { mobimon, event } = current.train(
      ctx.inventory.multiplierOf('training'),
      localDateOf(this.clock.now()),
    )
    state.ownedMobimons[index] = mobimon
    replaceFor(state.wallets, ctx.pid, wallet)
    replaceFor(state.inventories, ctx.pid, ctx.inventory.consumeEffect('training'))
    this.repository.save(state)
    return {
      mobimon: ownedView(mobimon),
      gainedExperience: event.gainedExperience,
      leveledUp: event.leveledUp,
    }
  }

  /** 進化させ、進化先の種を図鑑に登録する。報酬も同じ保存単位で渡す。 */
  evolve(id: string, ownedId: string, toSpeciesId: string): EvolveResult {
    const state = this.repository.load()
    const ctx = this.context(state, id)
    const index = this.ownedIndex(state, ctx.pid, ownedId)
    const current = state.ownedMobimons[index]
    const from = findSpeciesOrUnknown(current.speciesId)
    const { mobimon } = current.evolve(from, mobimonSpeciesId(toSpeciesId))
    state.ownedMobimons[index] = mobimon
    const registration = registerInMobidex(state, ctx.pid, findSpeciesOrUnknown(mobimon.speciesId))
    // 進化でレア度が変わり、編成の条件を満たさなくなった配置を外す(仕事を受けているチームはそのまま)
    const lookup = lookupFor(state, ctx.pid).lookup
    state.organizations = state.organizations.map((o) =>
      o.playerId === ctx.pid ? o.normalize(lookup, lockedFields(state, ctx.pid)).organization : o,
    )
    this.repository.save(state)
    return { mobimon: ownedView(mobimon), fromName: from.name, ...registration }
  }

  listShop(id: string): ShopItemView[] {
    const inventory = this.context(this.repository.load(), id).inventory
    return ITEMS.map((item) => ({
      itemId: item.id,
      name: item.name,
      price: item.price,
      kind: item.effect.kind,
      multiplier: item.effect.multiplier,
      uses: item.effect.uses,
      owned: inventory.countOf(item.id),
      pending: inventory.pending.get(item.id) ?? 0,
    }))
  }

  /** ポイントでアイテムを購入する。ポイントの消費とアイテムの追加を1回の保存で確定する。 */
  purchase(id: string, item: string, quantity = 1): void {
    const state = this.repository.load()
    const ctx = this.context(state, id)
    const result = purchaseItem(ctx.wallet, ctx.inventory, findItem(toItemId(item)), quantity)
    replaceFor(state.wallets, ctx.pid, result.wallet)
    replaceFor(state.inventories, ctx.pid, result.inventory)
    this.repository.save(state)
  }

  /** アイテムを使い、その効果を使用中にする。 */
  useItem(id: string, item: string): void {
    const state = this.repository.load()
    const ctx = this.context(state, id)
    replaceFor(state.inventories, ctx.pid, ctx.inventory.use(findItem(toItemId(item))).inventory)
    this.repository.save(state)
  }

  getMobidex(id: string): MobidexView {
    const ctx = this.context(this.repository.load(), id)
    const { mobidex, player } = ctx
    return {
      entries: SPECIES.map((s) => ({
        speciesId: s.id,
        no: Number(s.id.slice(1)),
        registered: mobidex.registered.has(s.id),
        name: mobidex.registered.has(s.id) ? s.name : null,
        rarity: s.rarity,
        businessField: s.businessField,
        unlockSteps: s.condition.unlockSteps,
        unlocked: player.cumulativeSteps >= s.condition.unlockSteps,
        retired: s.retired,
        timesOfDay: [...s.condition.timesOfDay],
      })),
      registeredCount: mobidex.registered.size,
      fields: BUSINESS_FIELDS.map((field) => {
        const targets = SPECIES.filter((s) => s.businessField === field && s.rarity !== '超レア')
        return {
          field,
          registered: targets.filter((s) => mobidex.registered.has(s.id)).length,
          total: targets.length,
          completed: mobidex.isCompleted({ kind: 'field', field }, SPECIES),
        }
      }),
      fullCompleted: mobidex.isCompleted({ kind: 'full' }, SPECIES),
      milestones: MILESTONE_COUNTS.map((count) => ({
        count,
        reached: mobidex.registered.size >= count,
      })),
      titles: titleNames(player.titles),
    }
  }

  /**
   * 図鑑に登録し、達成したコンプリート・節目の報酬(アイテム・称号)を渡す
   * (MobidexCompleted / MobidexMilestoneReached の購読者)。同じ報酬は二度渡さない。
   */
  private context(state: MobimonState, id: string) {
    return playerContext(state, id)
  }

  private ownedIndex(state: MobimonState, pid: PlayerId, ownedId: string): number {
    const index = state.ownedMobimons.findIndex((m) => m.id === ownedId && m.playerId === pid)
    if (index < 0) throw new DomainError('所持モビモンが見つかりません')
    return index
  }
}

/**
 * 種を図鑑に登録し、コンプリート・節目の報酬を渡す(捕獲・進化・ヘッドハンティングで共通)。
 * state を書き換える(保存は呼び出し側)。
 */
export function registerInMobidex(state: MobimonState, pid: PlayerId, species: MobimonSpecies) {
  const ctx = playerContext(state, pid)
  const { mobidex, events } = ctx.mobidex.register(species, SPECIES)
  replaceFor(state.mobidexes, pid, mobidex)

  let inventory = ctx.inventory
  let player = ctx.player
  const rewards: RewardView[] = []
  for (const event of events) {
    const reward = rewardFor(event)
    for (const { itemId, quantity } of reward.items) inventory = inventory.receive(itemId, quantity)
    if (reward.titleId) player = player.grantTitle(reward.titleId)
    rewards.push({
      reason: rewardReason(event),
      items: reward.items.map((i) => ({ name: itemNameOf(i.itemId), quantity: i.quantity })),
      title: reward.titleId ? titleNames([reward.titleId])[0] : null,
    })
  }
  replaceFor(state.inventories, pid, inventory)
  replace(state.players, (p) => (p.id === pid ? player : p))
  return { newlyRegistered: mobidex !== ctx.mobidex, rewards }
}

function playerContext(state: MobimonState, id: string) {
  const pid = toPlayerId(id)
  const player = state.players.find((p) => p.id === pid)
  const wallet = state.wallets.find((w) => w.playerId === pid)
  const inventory = state.inventories.find((i) => i.playerId === pid)
  const mobidex = state.mobidexes.find((m) => m.playerId === pid)
  if (!player || !wallet || !inventory || !mobidex) {
    throw new DomainError(`プレイヤーが登録されていません: ${id}`)
  }
  return { pid, player, wallet, inventory, mobidex }
}

function rewardFor(event: MobidexCompleted | MobidexMilestoneReached): Reward {
  return event.type === 'MobidexCompleted'
    ? rewardForCompletion(event.scope)
    : rewardForMilestone(event.milestone)
}

function rewardReason(event: MobidexCompleted | MobidexMilestoneReached): string {
  if (event.type === 'MobidexCompleted') {
    return event.scope.kind === 'full'
      ? '図鑑をすべてそろえました'
      : `${event.scope.field}の図鑑をそろえました`
  }
  return event.milestone.kind === 'count'
    ? `図鑑の登録が ${event.milestone.count}種に達しました`
    : 'デンまるを初めて図鑑に登録しました'
}

function titleNames(ids: readonly string[]): string[] {
  return ids.map((id) => TITLES.find((t) => t.id === id)?.name ?? `不明な称号(${id})`)
}

function encounterView(encounter: Encounter): EncounterView {
  const species = findSpeciesOrUnknown(encounter.speciesId)
  return {
    encounterId: encounter.id,
    speciesId: species.id,
    name: species.name,
    rarity: species.rarity,
    businessField: species.businessField,
    description: species.description,
  }
}

export function ownedView(mobimon: OwnedMobimon): OwnedMobimonView {
  const species = findSpeciesOrUnknown(mobimon.speciesId)
  const canEvolve = species.evolutionLevel !== null && mobimon.level >= species.evolutionLevel
  return {
    id: mobimon.id,
    speciesId: species.id,
    name: species.name,
    rarity: species.rarity,
    businessField: species.businessField,
    description: species.description,
    level: mobimon.level,
    experience: mobimon.experience,
    experienceToNextLevel:
      mobimon.level >= MAX_LEVEL ? null : experienceToReach(mobimon.level + 1) - mobimon.experience,
    evolutionOptions: canEvolve
      ? species.evolvesTo.map((to) => ({ speciesId: to, name: findSpeciesOrUnknown(to).name }))
      : [],
    evolutionLevel: species.evolutionLevel,
  }
}

/** 配列の要素を関数で置き換える(集約は不変なので、新しいインスタンスを差し込む)。 */
function replace<T>(list: T[], fn: (item: T) => T): void {
  for (let i = 0; i < list.length; i++) list[i] = fn(list[i])
}

function replaceFor<T extends { playerId: PlayerId }>(list: T[], pid: PlayerId, value: T): void {
  replace(list, (item) => (item.playerId === pid ? value : item))
}
