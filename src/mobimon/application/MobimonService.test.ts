import { fixedClock } from '../../shared/Clock.ts'
import { DomainError } from '../../shared/DomainError.ts'
import { sequentialIdGenerator } from '../../shared/IdGenerator.ts'
import { ownedMobimonId, playerId } from '../domain/ids.ts'
import {
  emptyMobimonState,
  type MobimonRepository,
  type MobimonState,
} from '../domain/MobimonRepository.ts'
import { experienceToReach, OwnedMobimon } from '../domain/OwnedMobimon.ts'
import { ITEM_IDS } from '../masterData/items.ts'
import { SPECIES } from '../masterData/species.ts'
import { MobimonService } from './MobimonService.ts'

class InMemoryRepository implements MobimonRepository {
  state: MobimonState = emptyMobimonState()
  saved = 0
  load(): MobimonState {
    // 集約は不変なので、配列だけを複製すればよい
    return Object.fromEntries(
      Object.entries(this.state).map(([key, list]) => [key, [...list]]),
    ) as unknown as MobimonState
  }
  save(state: MobimonState): void {
    this.state = state
    this.saved++
  }
}

const USER = 'user-1'
const byName = (name: string) => SPECIES.find((s) => s.name === name)!

function setup({
  random = () => 0,
  energy = 0,
  points = 0,
  steps = 0,
}: { random?: () => number; energy?: number; points?: number; steps?: number } = {}) {
  const repository = new InMemoryRepository()
  const service = new MobimonService(
    repository,
    fixedClock(new Date(2026, 8, 19, 12, 0)), // 昼
    sequentialIdGenerator('id'),
    random,
  )
  service.registerPlayer(USER)
  if (energy) {
    service.handleStepResourceEvent({
      type: 'EnergyGranted',
      grantId: 'g-energy',
      walkerId: USER,
      date: '2026-09-19',
      energy,
    })
  }
  if (points) {
    service.handleStepResourceEvent({
      type: 'PointsGranted',
      grantId: 'g-points',
      walkerId: USER,
      date: '2026-09-19',
      points,
    })
  }
  if (steps) {
    service.handleStepResourceEvent({
      type: 'CumulativeStepsUpdated',
      walkerId: USER,
      cumulativeSteps: steps,
    })
  }
  return { service, repository }
}

/** 所持モビモンを直接置く(育成・進化のテスト用)。 */
function giveMobimon(repository: InMemoryRepository, name: string, experience = 0) {
  const owned = OwnedMobimon.reconstruct(
    ownedMobimonId(`owned-${name}`),
    playerId(USER),
    byName(name).id,
    experience,
  )
  repository.state.ownedMobimons.push(owned)
  return owned.id
}

describe('registerPlayer', () => {
  it('Player・Wallet・Inventory・Mobidex を1回の保存でそろえて作り、二重には作らない', () => {
    const { service, repository } = setup()
    service.registerPlayer(USER)
    const { players, wallets, inventories, mobidexes } = repository.state
    expect([players, wallets, inventories, mobidexes].map((l) => l.length)).toEqual([1, 1, 1, 1])
    expect(repository.saved).toBe(1)
  })
})

describe('歩数リソース変換のイベントを受け取る', () => {
  it('EnergyGranted / PointsGranted を Wallet に加算し、同じ GrantId の再送は二重加算しない', () => {
    const { service } = setup({ energy: 80, points: 10 })
    service.handleStepResourceEvent({
      type: 'EnergyGranted',
      grantId: 'g-energy',
      walkerId: USER,
      date: '2026-09-19',
      energy: 80,
    })
    expect(service.getSummary(USER)).toMatchObject({ energy: 80, points: 10 })
  })

  it('CumulativeStepsUpdated で累計歩数を更新し、古い値が後から届いても減らない', () => {
    const { service } = setup({ steps: 20_000 })
    service.handleStepResourceEvent({
      type: 'CumulativeStepsUpdated',
      walkerId: USER,
      cumulativeSteps: 15_000,
    })
    expect(service.getSummary(USER).cumulativeSteps).toBe(20_000)
  })

  it('登録されていないユーザーのイベントは無視する', () => {
    const { service } = setup()
    expect(() =>
      service.handleStepResourceEvent({
        type: 'CumulativeStepsUpdated',
        walkerId: 'unknown',
        cumulativeSteps: 1,
      }),
    ).not.toThrow()
  })
})

describe('出現と捕獲', () => {
  it('エネルギー 10 を消費して出現させ、1回の保存で確定する', () => {
    const { service, repository } = setup({ energy: 30 })
    const before = repository.saved
    const encounter = service.encounter(USER)
    expect(repository.saved - before).toBe(1)
    expect(encounter.rarity).toBe('コモン') // 累計 0歩ではコモンだけが出る
    expect(service.getSummary(USER)).toMatchObject({
      energy: 20,
      currentEncounter: { encounterId: encounter.encounterId },
    })
  })

  it('エネルギーが足りなければ出現しない', () => {
    const { service } = setup({ energy: 9 })
    expect(() => service.encounter(USER)).toThrow('エネルギーが足りません')
  })

  it('出現中のモビモンがいる間は、次を探せない', () => {
    const { service } = setup({ energy: 30 })
    service.encounter(USER)
    expect(() => service.encounter(USER)).toThrow(DomainError)
  })

  it('捕獲すると所持モビモンになり、図鑑に登録される', () => {
    const { service } = setup({ energy: 30 })
    const encounter = service.encounter(USER)
    const result = service.capture(USER, encounter.encounterId)
    expect(result).toMatchObject({ newlyRegistered: true, mobimon: { level: 1 } })
    expect(service.listOwnedMobimon(USER)).toHaveLength(1)
    expect(service.getMobidex(USER).registeredCount).toBe(1)
    expect(service.getSummary(USER).currentEncounter).toBeNull()
  })

  it('同じ種を2体目に捕まえても、図鑑には重複して登録されない', () => {
    const { service } = setup({ energy: 30 })
    service.capture(USER, service.encounter(USER).encounterId)
    const second = service.capture(USER, service.encounter(USER).encounterId)
    expect(second.newlyRegistered).toBe(false)
    expect(service.getMobidex(USER).registeredCount).toBe(1)
  })

  it('見送った出現は捕獲できない', () => {
    const { service } = setup({ energy: 30 })
    const { encounterId } = service.encounter(USER)
    service.flee(USER, encounterId)
    expect(() => service.capture(USER, encounterId)).toThrow(DomainError)
  })

  it('出現率アップの効果は出現ごとに残り回数が減り、0で切れる', () => {
    const { service } = setup({ energy: 100, points: 30 })
    service.purchase(USER, ITEM_IDS.aroma)
    service.useItem(USER, ITEM_IDS.aroma)
    for (let i = 0; i < 3; i++) {
      service.flee(USER, service.encounter(USER).encounterId)
    }
    expect(service.getSummary(USER).activeEffects).toEqual([])
  })
})

describe('育成と進化', () => {
  it('エネルギー 10 を消費して経験値 100 を得る', () => {
    const { service, repository } = setup({ energy: 20 })
    const id = giveMobimon(repository, 'フウフウ')
    const result = service.train(USER, id)
    expect(result).toMatchObject({ gainedExperience: 100, leveledUp: true, mobimon: { level: 2 } })
    expect(service.getSummary(USER).energy).toBe(10)
  })

  it('育成アイテムの倍率を掛け、その効果を1回分消費する', () => {
    const { service, repository } = setup({ energy: 20, points: 20 })
    const id = giveMobimon(repository, 'フウフウ')
    service.purchase(USER, ITEM_IDS.food)
    service.useItem(USER, ITEM_IDS.food)
    expect(service.train(USER, id).gainedExperience).toBe(150)
    expect(service.train(USER, id).gainedExperience).toBe(100)
  })

  it('Lv10 で進化でき、進化先の種が図鑑に登録される', () => {
    const { service, repository } = setup()
    const id = giveMobimon(repository, 'フウフウ', experienceToReach(10))
    const [option] = service.listOwnedMobimon(USER)[0].evolutionOptions
    expect(option.name).toBe('ヒエポレ')
    const result = service.evolve(USER, id, option.speciesId)
    expect(result).toMatchObject({ fromName: 'フウフウ', newlyRegistered: true })
    expect(result.mobimon).toMatchObject({ name: 'ヒエポレ', level: 10 })
  })

  it('条件レベルに達していなければ進化の選択肢はない', () => {
    const { service, repository } = setup()
    giveMobimon(repository, 'フウフウ', experienceToReach(9))
    expect(service.listOwnedMobimon(USER)[0].evolutionOptions).toEqual([])
  })
})

describe('アイテムの購入', () => {
  it('ポイントを消費してアイテムを追加する', () => {
    const { service } = setup({ points: 100 })
    service.purchase(USER, ITEM_IDS.aroma, 2)
    expect(service.getSummary(USER).points).toBe(40)
    expect(service.listShop(USER).find((i) => i.itemId === ITEM_IDS.aroma)?.owned).toBe(2)
  })

  it('ポイント不足なら購入できず、何も変わらない', () => {
    const { service, repository } = setup({ points: 10 })
    const before = repository.saved
    expect(() => service.purchase(USER, ITEM_IDS.aroma)).toThrow('ポイントが足りません')
    expect(repository.saved).toBe(before)
  })
})

describe('図鑑の報酬', () => {
  it('デンまるを初めて捕まえると称号「Dワールドの覇者」を得て、2体目では得ない', () => {
    // 累計 100万歩・乱数を最後の候補に寄せて、デンまるを出す
    const { service } = setup({ energy: 20, steps: 1_000_000, random: () => 0.99999 })
    const first = service.capture(USER, service.encounter(USER).encounterId)
    expect(first.mobimon.name).toBe('デンまる')
    expect(first.rewards).toEqual([
      { reason: 'デンまるを初めて図鑑に登録しました', items: [], title: 'Dワールドの覇者' },
    ])
    const second = service.capture(USER, service.encounter(USER).encounterId)
    expect(second.rewards).toEqual([])
    expect(service.getSummary(USER).titles).toEqual(['Dワールドの覇者'])
  })

  it('登録が 10種に達するとおさんぽアロマを受け取る', () => {
    const { service, repository } = setup()
    const names = SPECIES.filter((s) => s.evolutionLevel === 10)
      .slice(0, 10)
      .map((s) => s.name)
    const results = names.map((name) => {
      const id = giveMobimon(repository, name, experienceToReach(10))
      const [option] = service.listOwnedMobimon(USER).find((m) => m.id === id)!.evolutionOptions
      return service.evolve(USER, id, option.speciesId)
    })
    expect(results.at(-1)?.rewards).toEqual([
      {
        reason: '図鑑の登録が 10種に達しました',
        items: [{ name: 'おさんぽアロマ', quantity: 1 }],
        title: null,
      },
    ])
    expect(service.listShop(USER).find((i) => i.itemId === ITEM_IDS.aroma)?.owned).toBe(1)
  })
})
