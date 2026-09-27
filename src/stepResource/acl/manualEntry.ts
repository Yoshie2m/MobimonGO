import { parseStepText, stepValueError, type StepReading } from './StepReading.ts'

export type ManualEntryResult = { ok: true; reading: StepReading } | { ok: false; error: string }

/** 手入力された日付(YYYY-MM-DD)と歩数を読み取る。 */
export function parseManualEntry(dateText: string, stepsText: string): ManualEntryResult {
  const date = dateText.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return { ok: false, error: '日付を入力してください' }
  }
  const steps = parseStepText(stepsText)
  if (steps === undefined) return { ok: false, error: '歩数を数字で入力してください' }
  const error = stepValueError(steps)
  if (error) return { ok: false, error }
  return { ok: true, reading: { date, steps } }
}
