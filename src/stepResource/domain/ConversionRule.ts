import { energy, type Energy, type StepCount } from './quantities.ts'

/** 歩数 → エネルギーの換算規則。100歩 = 1エネルギー(端数切り捨て)、1日の上限 20,000歩。 */
export const ConversionRule = {
  stepsPerEnergy: 100,
  dailyStepCap: 20_000,
} as const

/** その日の歩数から得られるエネルギーの総量。 */
export function energyForDailySteps(steps: StepCount): Energy {
  const counted = Math.min(steps, ConversionRule.dailyStepCap)
  return energy(Math.floor(counted / ConversionRule.stepsPerEnergy))
}
