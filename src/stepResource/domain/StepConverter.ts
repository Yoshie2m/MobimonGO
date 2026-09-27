import { energyForDailySteps } from './ConversionRule.ts'
import type { DailyGrant } from './DailyGrant.ts'
import { energy, type Energy } from './quantities.ts'
import type { StepRecord } from './StepRecord.ts'

/**
 * その日の歩数から得られるエネルギーのうち、まだ付与していない分を求める。
 * 同じ日のうちは差分で付与するので、切り捨てた端数は次の取り込みで回収される。
 */
export function energyToGrant(record: StepRecord, grant: DailyGrant): Energy {
  return energy(Math.max(0, energyForDailySteps(record.steps) - grant.grantedEnergy))
}
