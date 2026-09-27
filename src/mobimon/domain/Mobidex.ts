import { BUSINESS_FIELDS } from './BusinessField.ts'
import type {
  Milestone,
  MobidexCompleted,
  MobidexMilestoneReached,
  MobidexScope,
} from './events.ts'
import type { MobimonSpeciesId, PlayerId } from './ids.ts'
import type { MobimonSpecies } from './MobimonSpecies.ts'

/** 登録数の節目。 */
export const MILESTONE_COUNTS = [10, 30, 50, 100] as const

/** 特別な節目の対象になる種(どの事業分野にも属さない伝説の種 = デンまる)。 */
export const isSpecialSpecies = (species: MobimonSpecies) => species.businessField === null

type MobidexEvent = MobidexCompleted | MobidexMilestoneReached

export const scopeKey = (scope: MobidexScope) =>
  scope.kind === 'full' ? 'completed:full' : `completed:field:${scope.field}`
export const milestoneKey = (m: Milestone) =>
  m.kind === 'count' ? `milestone:${m.count}` : 'milestone:special'

/**
 * プレイヤーが捕獲または進化で手に入れたことのある種の記録。
 * 同じ種は重複登録せず、同じコンプリート・節目は二度達成しない。
 */
export class Mobidex {
  readonly playerId: PlayerId
  readonly registered: ReadonlySet<MobimonSpeciesId>
  /** 達成済みのコンプリート・節目(scopeKey / milestoneKey)。 */
  readonly achievements: ReadonlySet<string>

  private constructor(
    playerId: PlayerId,
    registered: ReadonlySet<MobimonSpeciesId>,
    achievements: ReadonlySet<string>,
  ) {
    this.playerId = playerId
    this.registered = registered
    this.achievements = achievements
  }

  static create(playerId: PlayerId): Mobidex {
    return new Mobidex(playerId, new Set(), new Set())
  }

  static reconstruct(
    playerId: PlayerId,
    registered: Iterable<MobimonSpeciesId>,
    achievements: Iterable<string>,
  ): Mobidex {
    return new Mobidex(playerId, new Set(registered), new Set(achievements))
  }

  /**
   * 種を登録し、新たに達成したコンプリート・節目のイベントを返す。
   * catalog は全モビモン種(コンプリートの判定に使う)。
   */
  register(
    species: MobimonSpecies,
    catalog: readonly MobimonSpecies[],
  ): { mobidex: Mobidex; events: MobidexEvent[] } {
    if (this.registered.has(species.id)) return { mobidex: this, events: [] }

    const registered = new Set([...this.registered, species.id])
    const achievements = new Set(this.achievements)
    const events: MobidexEvent[] = []
    const reach = (key: string, event: MobidexEvent) => {
      if (achievements.has(key)) return
      achievements.add(key)
      events.push(event)
    }

    for (const count of MILESTONE_COUNTS) {
      if (registered.size >= count) {
        const milestone: Milestone = { kind: 'count', count }
        reach(milestoneKey(milestone), {
          type: 'MobidexMilestoneReached',
          playerId: this.playerId,
          milestone,
        })
      }
    }
    if (isSpecialSpecies(species)) {
      const milestone: Milestone = { kind: 'specialSpecies' }
      reach(milestoneKey(milestone), {
        type: 'MobidexMilestoneReached',
        playerId: this.playerId,
        milestone,
      })
    }

    // コンプリートの判定は登録済みの種だけで決まる
    const probe = new Mobidex(this.playerId, registered, this.achievements)
    const scopes: MobidexScope[] = [
      ...BUSINESS_FIELDS.map((field) => ({ kind: 'field' as const, field })),
      { kind: 'full' },
    ]
    for (const scope of scopes) {
      if (probe.isCompleted(scope, catalog)) {
        reach(scopeKey(scope), { type: 'MobidexCompleted', playerId: this.playerId, scope })
      }
    }
    return { mobidex: new Mobidex(this.playerId, registered, achievements), events }
  }

  /**
   * 範囲の種をすべて登録済みか。
   * 事業分野コンプリートはその分野の超レアを除く全種、全体コンプリートは全種が対象。
   */
  isCompleted(scope: MobidexScope, catalog: readonly MobimonSpecies[]): boolean {
    const targets =
      scope.kind === 'full'
        ? catalog
        : catalog.filter((s) => s.businessField === scope.field && s.rarity !== '超レア')
    return targets.length > 0 && targets.every((s) => this.registered.has(s.id))
  }
}
