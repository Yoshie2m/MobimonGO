import { findSpecies, SPECIES } from '../masterData/species.ts'
import { mobimonSpeciesId } from './ids.ts'
import { Mobidex } from './Mobidex.ts'
import type { MobimonSpecies } from './MobimonSpecies.ts'
import { PLAYER } from './testHelpers.ts'

function registerAll(list: readonly MobimonSpecies[], start = Mobidex.create(PLAYER)) {
  let mobidex = start
  const events = []
  for (const s of list) {
    const result = mobidex.register(s, SPECIES)
    mobidex = result.mobidex
    events.push(...result.events)
  }
  return { mobidex, events }
}

const home = SPECIES.filter((s) => s.businessField === 'スマートホーム')
const denmaru = findSpecies(mobimonSpeciesId('M151'))

describe('Mobidex', () => {
  it('同じ種は重複登録しない', () => {
    const { mobidex } = registerAll([SPECIES[0], SPECIES[0]])
    expect(mobidex.registered.size).toBe(1)
  })

  it('登録数の節目 10 / 30 / 50 / 100 種で1回ずつイベントを出す', () => {
    const { events } = registerAll(SPECIES.slice(0, 100))
    const counts = events
      .filter((e) => e.type === 'MobidexMilestoneReached')
      .map((e) => e.milestone)
    expect(counts).toEqual([10, 30, 50, 100].map((count) => ({ kind: 'count', count })))
  })

  it('事業分野の超レア以外がそろうと、その事業分野のコンプリート(超レアがなくてもよい)', () => {
    expect(home.some((s) => s.rarity === '超レア')).toBe(false)
    const { mobidex, events } = registerAll(home)
    expect(mobidex.isCompleted({ kind: 'field', field: 'スマートホーム' }, SPECIES)).toBe(true)
    expect(events).toContainEqual({
      type: 'MobidexCompleted',
      playerId: PLAYER,
      scope: { kind: 'field', field: 'スマートホーム' },
    })

    const thermal = SPECIES.filter(
      (s) => s.businessField === 'サーマルマネジメント' && s.rarity !== '超レア',
    )
    expect(
      registerAll(thermal).mobidex.isCompleted(
        { kind: 'field', field: 'サーマルマネジメント' },
        SPECIES,
      ),
    ).toBe(true)
  })

  it('151種そろうと全体コンプリート', () => {
    const { mobidex: almost } = registerAll(SPECIES.slice(0, 150))
    expect(almost.isCompleted({ kind: 'full' }, SPECIES)).toBe(false)
    const { mobidex, events } = registerAll([SPECIES[150]], almost)
    expect(mobidex.isCompleted({ kind: 'full' }, SPECIES)).toBe(true)
    expect(events).toContainEqual({
      type: 'MobidexCompleted',
      playerId: PLAYER,
      scope: { kind: 'full' },
    })
  })

  it('デンまるの初登録は特別な節目で、二度目は出さない', () => {
    const first = registerAll([denmaru])
    expect(first.events).toContainEqual({
      type: 'MobidexMilestoneReached',
      playerId: PLAYER,
      milestone: { kind: 'specialSpecies' },
    })
    expect(registerAll([denmaru], first.mobidex).events).toEqual([])
  })

  it('同じコンプリートは二度達成しない', () => {
    const { mobidex } = registerAll(home)
    const again = Mobidex.reconstruct(PLAYER, [...mobidex.registered], mobidex.achievements)
    const other = SPECIES.find((s) => s.businessField !== 'スマートホーム')!
    expect(again.register(other, SPECIES).events).toEqual([])
  })
})
