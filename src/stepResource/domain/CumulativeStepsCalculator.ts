import { cumulativeSteps, type CumulativeSteps } from './quantities.ts'
import type { StepRecord } from './StepRecord.ts'

/** 利用開始日以降の歩数記録の合計。記録は利用開始日以降しか作れないので、合計するだけでよい。 */
export function sumCumulativeSteps(records: readonly StepRecord[]): CumulativeSteps {
  return cumulativeSteps(records.reduce((sum, r) => sum + r.steps, 0))
}
