import { findSpecies, SPECIES } from '../masterData/species.ts'
import { encounterCandidates, generateEncounter, pickCandidate } from './EncounterGenerator.ts'
import { mobimonSpeciesId } from './ids.ts'
import { canAppear } from './MobimonSpecies.ts'
import { cumulativeSteps } from './quantities.ts'
import { species } from './testHelpers.ts'
import { timeOfDayAt } from './TimeOfDay.ts'

const steps = cumulativeSteps
const at = (h: number, m: number) => timeOfDayAt(new Date(2026, 8, 28, h, m))

describe('出現条件', () => {
  const morning = species('morning', { times: ['朝'] })
  const day = species('day', { times: ['昼'] })
  const evening = species('evening', { times: ['夕'] })
  const night = species('night', { times: ['夜'] })
  const catalog = [morning, day, evening, night]
  const namesAt = (h: number, m: number) =>
    encounterCandidates(catalog, at(h, m), steps(0)).map((c) => c.species.name)

  it.each([
    [4, 59, 'night'],
    [5, 0, 'morning'],
    [9, 59, 'morning'],
    [10, 0, 'day'],
    [15, 59, 'day'],
    [16, 0, 'evening'],
    [18, 59, 'evening'],
    [19, 0, 'night'],
  ])('%i:%i は %s の種だけが候補になる', (h, m, expected) => {
    expect(namesAt(h, m)).toEqual([expected])
  })

  it('累計歩数がちょうど閾値に達すると解放される', () => {
    const rare = species('rare', { rarity: 'レア', unlockSteps: 150_000 })
    expect(canAppear(rare, '昼', steps(149_999))).toBe(false)
    expect(canAppear(rare, '昼', steps(150_000))).toBe(true)
  })
})

describe('抽選の重み', () => {
  const common = species('common', { rarity: 'コモン' })
  const rare = species('rare', { rarity: 'レア' })
  const weights = (boost: number) =>
    encounterCandidates([common, rare], '昼', steps(0), boost).map((c) => c.weight)

  it.each([
    [1, [10, 2]],
    [2, [10, 4]],
    [3, [10, 6]],
  ])('出現率アップ ×%i なら コモン:レア = %j', (boost, expected) => {
    expect(weights(boost)).toEqual(expected)
  })

  it('レア度ごとの重みは 10 / 5 / 2 / 1、倍率はレア・超レアだけに掛かる', () => {
    const catalog = [
      species('c', { rarity: 'コモン' }),
      species('u', { rarity: 'アンコモン' }),
      species('r', { rarity: 'レア' }),
      species('s', { rarity: '超レア' }),
    ]
    expect(encounterCandidates(catalog, '昼', steps(0), 3).map((c) => c.weight)).toEqual([
      10, 5, 6, 3,
    ])
  })

  it('重みに比例して1種を選ぶ(10:2 なら 0〜10/12 がコモン、それ以降がレア)', () => {
    const candidates = encounterCandidates([common, rare], '昼', steps(0))
    expect(pickCandidate(candidates, () => 0).name).toBe('common')
    expect(pickCandidate(candidates, () => 9.99 / 12).name).toBe('common')
    expect(pickCandidate(candidates, () => 10 / 12).name).toBe('rare')
    expect(pickCandidate(candidates, () => 0.9999).name).toBe('rare')
  })

  it('候補がいなければエラー', () => {
    expect(() => pickCandidate([], () => 0)).toThrow('出現できるモビモンがいません')
  })
})

describe('マスターデータでの出現', () => {
  it('利用開始直後はコモンだけが出現する', () => {
    const candidates = encounterCandidates(SPECIES, '朝', steps(0))
    expect(candidates.length).toBeGreaterThan(0)
    expect(new Set(candidates.map((c) => c.species.rarity))).toEqual(new Set(['コモン']))
  })

  it('累計 100万歩ならデンまるも候補に入る', () => {
    const denmaru = findSpecies(mobimonSpeciesId('M151'))
    const names = encounterCandidates(SPECIES, '夜', steps(1_000_000)).map((c) => c.species)
    expect(names).toContain(denmaru)
  })

  it('乱数に応じて必ず1体出現する', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(generateEncounter(SPECIES, '夕', steps(200_000), 1, () => r)).toBeDefined()
    }
  })
})
