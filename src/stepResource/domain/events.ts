import type { LocalDate } from '../../shared/LocalDate.ts'
import type { StepCount } from './quantities.ts'
import type { WalkerId } from './Walker.ts'

/**
 * 歩数を取り込んだ(コンテキスト内のイベント)。
 * 購読者は StepConverter / StepGoalEvaluator / 累計歩数の再計算で、
 * 取り込みのユースケースが同じ保存単位の中で処理する。
 */
export interface StepsRecorded {
  type: 'StepsRecorded'
  walkerId: WalkerId
  date: LocalDate
  steps: StepCount
  previousSteps: StepCount
}
