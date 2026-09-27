import type { DailyGrant } from './DailyGrant.ts'
import { pointsForDailySteps } from './PointAwardRule.ts'
import { point, type Point } from './quantities.ts'
import type { StepRecord } from './StepRecord.ts'

/** その日の歩数から得られるポイントのうち、まだ付与していない分を求める。 */
export function pointsToGrant(record: StepRecord, grant: DailyGrant): Point {
  return point(Math.max(0, pointsForDailySteps(record.steps) - grant.grantedPoints))
}
