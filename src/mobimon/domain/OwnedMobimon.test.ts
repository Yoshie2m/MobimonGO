import { DomainError } from '../../shared/DomainError.ts'
import { findSpecies, SPECIES } from '../masterData/species.ts'
import { mobimonSpeciesId, ownedMobimonId } from './ids.ts'
import { experienceToReach, levelForExperience, OwnedMobimon } from './OwnedMobimon.ts'
import { PLAYER } from './testHelpers.ts'

const byName = (name: string) => SPECIES.find((s) => s.name === name)!
const owned = (name: string, exp = 0) =>
  OwnedMobimon.reconstruct(ownedMobimonId('o1'), PLAYER, byName(name).id, exp)

describe('レベルと経験値', () => {
  it('次のレベルに必要な経験値は 50 × 現在のレベル', () => {
    expect(levelForExperience(49)).toBe(1)
    expect(levelForExperience(50)).toBe(2)
    expect(levelForExperience(experienceToReach(10))).toBe(10)
    expect(experienceToReach(10)).toBe(2_250)
    expect(experienceToReach(20)).toBe(9_500)
    expect(experienceToReach(30)).toBe(21_750)
  })

  it('育成1回で経験値 100、育成アイテムの倍率を掛ける', () => {
    expect(owned('フウフウ').train().mobimon.experience).toBe(100)
    expect(owned('フウフウ').train(1.5).mobimon.experience).toBe(150)
    expect(owned('フウフウ').train(2).mobimon.experience).toBe(200)
  })

  it('レベルが上がったことをイベントで知らせる', () => {
    expect(owned('フウフウ').train().event).toMatchObject({ level: 2, leveledUp: true })
  })

  it('Lv30 では経験値が増えない', () => {
    const max = owned('フウフウ', experienceToReach(30))
    expect(max.level).toBe(30)
    expect(max.train().mobimon.experience).toBe(experienceToReach(30))
  })
})

describe('進化', () => {
  const lv = (n: number) => experienceToReach(n)

  it('Lv9 では進化できず、Lv10 で進化できる', () => {
    const next = byName('ヒエポレ').id
    expect(() => owned('フウフウ', lv(9)).evolve(byName('フウフウ'), next)).toThrow(DomainError)
    const { mobimon, event } = owned('フウフウ', lv(10)).evolve(byName('フウフウ'), next)
    expect(mobimon).toMatchObject({ speciesId: next, experience: lv(10) })
    expect(event).toMatchObject({ type: 'MobimonEvolved', toSpeciesId: next })
  })

  it('2段階目から3段階目へは Lv20 が必要', () => {
    const final = byName('カイテキング').id
    expect(() => owned('ヒエポレ', lv(19)).evolve(byName('ヒエポレ'), final)).toThrow(DomainError)
    expect(owned('ヒエポレ', lv(20)).evolve(byName('ヒエポレ'), final).mobimon.speciesId).toBe(
      final,
    )
  })

  it('進化先以外の種には進化できない', () => {
    expect(() =>
      owned('フウフウ', lv(10)).evolve(byName('フウフウ'), byName('カイテキング').id),
    ).toThrow(DomainError)
  })

  it('ハイブリコは3つの分岐先から選べる', () => {
    for (const name of ['プラグリン', 'バッテリオン', 'スイソリン']) {
      const evolved = owned('ハイブリコ', lv(10)).evolve(byName('ハイブリコ'), byName(name).id)
      expect(findSpecies(evolved.mobimon.speciesId).name).toBe(name)
    }
  })

  it('単独種は進化しない', () => {
    expect(() =>
      owned('シットリン', lv(30)).evolve(byName('シットリン'), mobimonSpeciesId('M001')),
    ).toThrow('進化しません')
  })
})
