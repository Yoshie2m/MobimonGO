import { DailyStepLog } from './DailyStepLog.ts'
import { PLAYER } from './testHelpers.ts'

describe('DailyStepLog', () => {
  it('日ごとの歩数を記録し、同じ日の値は減らない', () => {
    const log = DailyStepLog.create(PLAYER).record('2026-09-28', 5_000).record('2026-09-28', 3_000)
    expect(log.stepsOn('2026-09-28')).toBe(5_000)
    expect(log.record('2026-09-28', 12_000).stepsOn('2026-09-28')).toBe(12_000)
  })

  it('その日の歩数を受け取り済みかが分かる', () => {
    const log = DailyStepLog.create(PLAYER).record('2026-09-28', 0)
    expect(log.hasRecorded('2026-09-28')).toBe(true)
    expect(log.hasRecorded('2026-09-29')).toBe(false)
  })
})
