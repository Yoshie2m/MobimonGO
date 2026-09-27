import { DomainError } from '../../shared/DomainError.ts'
import { StepRecord } from './StepRecord.ts'
import { d, walker } from './testHelpers.ts'

const today = d('2026-09-19')

describe('StepRecord', () => {
  it('歩数を記録し、StepsRecorded を返す', () => {
    const { record, event } = StepRecord.record(walker(), d('2026-09-04'), 13_186, 'manual', today)
    expect(record.steps).toBe(13_186)
    expect(event).toMatchObject({ type: 'StepsRecorded', steps: 13_186, previousSteps: 0 })
  })

  it('利用開始日より前・今日より後の日は記録できない', () => {
    expect(() => StepRecord.record(walker(), d('2026-09-03'), 100, 'manual', today)).toThrow(
      DomainError,
    )
    expect(() => StepRecord.record(walker(), d('2026-09-20'), 100, 'manual', today)).toThrow(
      DomainError,
    )
  })

  it('歩数を増やす更新は反映される', () => {
    const { record } = StepRecord.record(walker(), today, 10, 'screenCapture', today)
    const updated = record.update(10_000, 'screenCapture')
    expect(updated.record.steps).toBe(10_000)
    expect(updated.event.previousSteps).toBe(10)
  })

  it('歩数を減らす更新は受け付けない', () => {
    const { record } = StepRecord.record(walker(), today, 12_000, 'manual', today)
    expect(() => record.update(11_000, 'manual')).toThrow(DomainError)
  })

  it('負の歩数は受け付けない', () => {
    expect(() => StepRecord.record(walker(), today, -1, 'manual', today)).toThrow(DomainError)
  })
})
