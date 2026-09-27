import { DomainError } from '../../shared/DomainError.ts'
import type { LocalDate } from '../../shared/LocalDate.ts'
import type { StepsRecorded } from './events.ts'
import { stepCount, type StepCount } from './quantities.ts'
import type { Walker, WalkerId } from './Walker.ts'

/** 歩数の取り込み元。 */
export type StepSource = 'manual' | 'screenCapture'

/**
 * 特定のウォーカー・特定の日の歩数。
 * 歩数は減らない(付与済みのエネルギー・ポイントは取り消せないため)。
 */
export class StepRecord {
  readonly walkerId: WalkerId
  readonly date: LocalDate
  readonly steps: StepCount
  readonly source: StepSource

  private constructor(walkerId: WalkerId, date: LocalDate, steps: StepCount, source: StepSource) {
    this.walkerId = walkerId
    this.date = date
    this.steps = steps
    this.source = source
  }

  static record(
    walker: Walker,
    date: LocalDate,
    steps: number,
    source: StepSource,
    today: LocalDate,
  ): { record: StepRecord; event: StepsRecorded } {
    if (!walker.canRecord(date, today)) {
      throw new DomainError(`利用開始日より前、または今日より後の日は記録できません: ${date}`)
    }
    const record = new StepRecord(walker.id, date, stepCount(steps), source)
    return { record, event: stepsRecorded(record, 0) }
  }

  static reconstruct(
    walkerId: WalkerId,
    date: LocalDate,
    steps: number,
    source: StepSource,
  ): StepRecord {
    return new StepRecord(walkerId, date, stepCount(steps), source)
  }

  /** 同じ日の歩数を更新する。今より小さい値での更新は受け付けない。 */
  update(steps: number, source: StepSource): { record: StepRecord; event: StepsRecorded } {
    if (steps < this.steps) {
      throw new DomainError(
        `${this.date} の歩数は ${this.steps} 歩より少なくできません(入力: ${steps} 歩)`,
      )
    }
    const record = new StepRecord(this.walkerId, this.date, stepCount(steps), source)
    return { record, event: stepsRecorded(record, this.steps) }
  }
}

function stepsRecorded(record: StepRecord, previousSteps: number): StepsRecorded {
  return {
    type: 'StepsRecorded',
    walkerId: record.walkerId,
    date: record.date,
    steps: record.steps,
    previousSteps: stepCount(previousSteps),
  }
}
