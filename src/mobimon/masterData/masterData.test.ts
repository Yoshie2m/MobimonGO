import { BUSINESS_FIELDS } from '../domain/BusinessField.ts'
import { canAppear } from '../domain/MobimonSpecies.ts'
import { cumulativeSteps } from '../domain/quantities.ts'
import { TIMES_OF_DAY } from '../domain/TimeOfDay.ts'
import { ITEMS } from './items.ts'
import { findSpecies, SPECIES } from './species.ts'
import { TITLES } from './titles.ts'
import { mobimonSpeciesId } from '../domain/ids.ts'

describe('モビモン種のマスターデータ(MOBIMON_LIST.md)', () => {
  it('151種を読み込む', () => {
    expect(SPECIES).toHaveLength(151)
    expect(new Set(SPECIES.map((s) => s.name)).size).toBe(151)
  })

  it('レア度の内訳が MOBIMON_LIST.md と一致する', () => {
    const count = (r: string) => SPECIES.filter((s) => s.rarity === r).length
    expect([count('コモン'), count('アンコモン'), count('レア'), count('超レア')]).toEqual([
      53, 68, 24, 6,
    ])
  })

  it('すべての時間帯に、累計 0歩で解放されるコモンの種が1種以上ある', () => {
    for (const time of TIMES_OF_DAY) {
      expect(
        SPECIES.some((s) => s.rarity === 'コモン' && canAppear(s, time, cumulativeSteps(0))),
      ).toBe(true)
    }
  })

  it('事業分野を読み取る(デンまるは事業分野なし)', () => {
    expect(new Set(SPECIES.map((s) => s.businessField))).toEqual(
      new Set([...BUSINESS_FIELDS, null]),
    )
    expect(findSpecies(mobimonSpeciesId('M151'))).toMatchObject({
      name: 'デンまる',
      businessField: null,
      rarity: '超レア',
      condition: { unlockSteps: 1_000_000 },
    })
  })

  it('進化先と進化に必要なレベルを読み取る', () => {
    const byName = (name: string) => SPECIES.find((s) => s.name === name)!
    expect(byName('フウフウ')).toMatchObject({
      evolvesTo: [byName('ヒエポレ').id],
      evolutionLevel: 10,
    })
    expect(byName('ヒエポレ')).toMatchObject({
      evolvesTo: [byName('カイテキング').id],
      evolutionLevel: 20,
    })
    expect(byName('カイテキング')).toMatchObject({ evolvesTo: [], evolutionLevel: null })
    expect(byName('ハイブリコ').evolvesTo.map((id) => findSpecies(id).name)).toEqual([
      'プラグリン',
      'バッテリオン',
      'スイソリン',
    ])
    expect(byName('ハイブリコ').evolutionLevel).toBe(10)
  })

  it('全時間帯の種は4つの時間帯すべてに出現する', () => {
    expect([...findSpecies(mobimonSpeciesId('M151')).condition.timesOfDay]).toEqual([
      ...TIMES_OF_DAY,
    ])
  })
})

describe('アイテム・称号のマスターデータ', () => {
  it('アイテムは4種類', () => {
    expect(ITEMS.map((i) => `${i.name}:${i.price}pt`)).toEqual([
      'おさんぽアロマ:30pt',
      'おさんぽアロマ+:80pt',
      'げんきフード:20pt',
      'げんきフード+:70pt',
    ])
  })

  it('称号は事業分野8つ・全体コンプリート・デンまるの10種類', () => {
    expect(TITLES).toHaveLength(10)
    expect(TITLES.map((t) => t.name)).toContain('Dワールドの覇者')
  })
})
