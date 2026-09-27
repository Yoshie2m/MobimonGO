import { point, type Point, type StepCount } from './quantities.ts'

/** 目標歩数。全ユーザー共通の固定値。 */
export const StepGoal = 8_000

/** 目標達成で 10pt、目標を 500歩超えるごとに +5pt。1日の上限 20,000歩(最大 130pt)。 */
export const PointAwardRule = {
  goalAchievedPoints: 10,
  stepsPerBonus: 500,
  bonusPoints: 5,
  dailyStepCap: 20_000,
} as const

/** その日の歩数から得られるポイントの総量。 */
export function pointsForDailySteps(steps: StepCount): Point {
  const counted = Math.min(steps, PointAwardRule.dailyStepCap)
  if (counted < StepGoal) return point(0)
  const bonus = Math.floor((counted - StepGoal) / PointAwardRule.stepsPerBonus)
  return point(PointAwardRule.goalAchievedPoints + PointAwardRule.bonusPoints * bonus)
}
