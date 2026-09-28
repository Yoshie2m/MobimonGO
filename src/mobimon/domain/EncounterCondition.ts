import { DomainError } from '../../shared/DomainError.ts'
import type { CumulativeSteps } from './quantities.ts'
import type { TimeOfDay } from './TimeOfDay.ts'

/** 出現候補になるための条件。出現する時間帯(1つ以上)と、解放に必要な累計歩数。 */
export interface EncounterCondition {
  readonly timesOfDay: ReadonlySet<TimeOfDay>
  readonly unlockSteps: number
}

export function encounterCondition(
  timesOfDay: Iterable<TimeOfDay>,
  unlockSteps: number,
): EncounterCondition {
  const times = new Set(timesOfDay)
  if (times.size === 0) throw new DomainError('出現する時間帯は1つ以上必要です')
  if (!Number.isInteger(unlockSteps) || unlockSteps < 0) {
    throw new DomainError(`解放に必要な累計歩数は 0 以上の整数です: ${unlockSteps}`)
  }
  return { timesOfDay: times, unlockSteps }
}

/** 出現しない種の条件(時間帯なし)。種をなくすときは、表から消さずにこの条件にする。 */
export function neverAppearsCondition(unlockSteps = 0): EncounterCondition {
  return { timesOfDay: new Set(), unlockSteps }
}

/** 累計歩数が閾値に達していれば解放済み。 */
export const isUnlocked = (condition: EncounterCondition, steps: CumulativeSteps) =>
  steps >= condition.unlockSteps
