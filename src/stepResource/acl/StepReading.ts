/**
 * 外部(手入力・画面キャプチャ)から読み取った1日分の歩数。
 * 確認画面で確かめてから StepRecord に取り込む。
 */
export interface StepReading {
  /** YYYY-MM-DD */
  date: string
  steps: number
}

/** これを超える歩数は読み取り誤りとみなし、確認画面で修正を求める。 */
export const MAX_READABLE_STEPS = 100_000

/** 歩数として受け付けられない値なら、その理由を返す。 */
export function stepValueError(steps: number): string | undefined {
  if (!Number.isInteger(steps)) return '歩数は整数で入力してください'
  if (steps < 0 || steps > MAX_READABLE_STEPS) {
    return `歩数は 0〜${MAX_READABLE_STEPS.toLocaleString()} の範囲で入力してください`
  }
  return undefined
}

/** カンマやピリオドの区切りを除いて歩数を読む。数字以外が含まれていれば undefined。 */
export function parseStepText(text: string): number | undefined {
  const digits = text.trim().replace(/[,.，]/g, '')
  return /^\d+$/.test(digits) ? Number(digits) : undefined
}
