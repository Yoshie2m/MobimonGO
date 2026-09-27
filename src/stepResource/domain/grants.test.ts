import { DailyGrant } from './DailyGrant.ts'
import { energy, point } from './quantities.ts'
import { StepRecord } from './StepRecord.ts'
import { energyToGrant } from './StepConverter.ts'
import { pointsToGrant } from './StepGoalEvaluator.ts'
import { d, WALKER_ID, walker } from './testHelpers.ts'

const today = d('2026-09-19')
const recordOf = (steps: number) =>
  StepRecord.record(walker(), today, steps, 'manual', today).record

describe('StepConverter / StepGoalEvaluator', () => {
  it('まだ付与していない分だけを付与する', () => {
    const grant = DailyGrant.empty(WALKER_ID, today)
    expect(energyToGrant(recordOf(9_200), grant)).toBe(92)
    expect(pointsToGrant(recordOf(9_200), grant)).toBe(20)
  })

  it('同じ日の取り込みで、切り捨てた端数が回収される', () => {
    let grant = DailyGrant.empty(WALKER_ID, today)
    const first = energyToGrant(recordOf(150), grant)
    expect(first).toBe(1)
    grant = grant.recordGrant(first, point(0))
    expect(energyToGrant(recordOf(200), grant)).toBe(1)
  })

  it('同じ歩数で再取り込みしても二重に付与しない', () => {
    const grant = DailyGrant.empty(WALKER_ID, today).recordGrant(energy(130), point(80))
    expect(energyToGrant(recordOf(13_000), grant)).toBe(0)
    expect(pointsToGrant(recordOf(15_000), grant)).toBe(0)
  })

  it('上限を超えた歩数は付与しない', () => {
    const grant = DailyGrant.empty(WALKER_ID, today).recordGrant(energy(200), point(130))
    expect(energyToGrant(recordOf(25_000), grant)).toBe(0)
    expect(pointsToGrant(recordOf(25_000), grant)).toBe(0)
  })
})

describe('DailyGrant', () => {
  it('付与済みの量を加算する', () => {
    const grant = DailyGrant.empty(WALKER_ID, today).recordGrant(energy(10), point(5))
    expect(grant.recordGrant(energy(3), point(0))).toMatchObject({
      grantedEnergy: 13,
      grantedPoints: 5,
    })
  })
})
