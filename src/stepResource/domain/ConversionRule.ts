import { energy, type Energy, type StepCount } from './quantities.ts'

/** 歩数 → エネルギーの換算規則。100歩 = 1エネルギー(端数切り捨て)、1日の上限 20,000歩。 */
export const ConversionRule = {
  stepsPerEnergy: 100,
  dailyStepCap: 20_000,
} as const

/** 公開する日ごとの歩数(1日の上限で頭打ちにした値)。仕事の進み具合もこの値で数える。 */
export function countedDailySteps(steps: StepCount): number {
  return Math.min(steps, ConversionRule.dailyStepCap)
}

/** その日の歩数から得られるエネルギーの総量。 */
export function energyForDailySteps(steps: StepCount): Energy {
  const counted = Math.min(steps, ConversionRule.dailyStepCap)
  return energy(Math.floor(counted / ConversionRule.stepsPerEnergy))
}
