import { parseStepText, type StepReading } from '../StepReading.ts'

/** 文字認識(OCR)で読み取った1語と、その画像上の位置。 */
export interface OcrWord {
  text: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

export interface CalendarDay {
  day: number
  /** 空欄のマスは null(取り込まない)。 */
  steps: number | null
}

export interface StepCalendar {
  year: number
  month: number
  days: CalendarDay[]
  /** 読み取り結果に疑わしい点があれば、確認画面で知らせる。 */
  warnings: string[]
}

export type StepCalendarResult = { ok: true; calendar: StepCalendar } | { ok: false; error: string }

const WEEKDAYS = [
  ['SUN', '日'],
  ['MON', '月'],
  ['TUE', '火'],
  ['WED', '水'],
  ['THU', '木'],
  ['FRI', '金'],
  ['SAT', '土'],
]

/** マスの左端からこの割合までに始まる数字を「日付」とみなす(歩数は右寄せで表示される)。 */
const DAY_NUMBER_LEFT_RATIO = 0.2

/**
 * 歩数画面のキャプチャから読み取った語を、カレンダー(年月・日付・歩数)として解釈する。
 *
 * - 年月はカレンダーの見出し(例: 2026/09)から読む。
 * - 曜日の見出し(SUN〜SAT)の位置から7つの列を決め、見出しより下の数字だけを使う
 *   (上部のグラフや目標値の表示は使わない)。
 * - 各マスの左上の数字を日付、それ以外の数字を歩数とし、歩数は同じ列で真上にある日付に対応づける。
 */
export function parseStepCalendar(words: readonly OcrWord[]): StepCalendarResult {
  const header = findYearMonth(words)
  if (!header) return { ok: false, error: 'カレンダーの年月(例: 2026/09)が読み取れませんでした' }

  const columns = findColumns(words)
  if (!columns) return { ok: false, error: 'カレンダーの曜日(SUN〜SAT)が読み取れませんでした' }

  const below = words.filter((w) => w.bbox.y0 > columns.headerBottom)
  const dayCells: { day: number; column: number; word: OcrWord }[] = []
  const stepCells: { steps: number; column: number; word: OcrWord }[] = []
  for (const word of below) {
    const value = parseStepText(word.text)
    if (value === undefined) continue
    const column = columns.columnOf(word)
    const isDayNumber =
      /^\d{1,2}$/.test(word.text.trim()) &&
      value >= 1 &&
      value <= 31 &&
      columns.leftRatio(word, column) < DAY_NUMBER_LEFT_RATIO
    if (isDayNumber) dayCells.push({ day: value, column, word })
    else stepCells.push({ steps: value, column, word })
  }

  const warnings: string[] = []
  const lastDay = new Date(header.year, header.month, 0).getDate()
  const days = new Map<number, CalendarDay>()
  for (const cell of dayCells) {
    if (cell.day > lastDay) {
      warnings.push(`${header.month}月にない日付を読み取ったため除外しました: ${cell.day}日`)
      continue
    }
    days.set(cell.day, { day: cell.day, steps: null })
  }

  for (const step of stepCells) {
    const owner = dayCells
      .filter((c) => c.column === step.column && c.word.bbox.y1 <= step.word.bbox.y0)
      .sort((a, b) => b.word.bbox.y1 - a.word.bbox.y1)[0]
    const day = owner && days.get(owner.day)
    if (!day) continue
    day.steps = step.steps
  }

  const first = dayCells.find((c) => c.day === 1)
  if (first && first.column !== new Date(header.year, header.month - 1, 1).getDay()) {
    warnings.push('曜日の並びが年月と一致しません。日付の読み取りを確認してください')
  }

  return {
    ok: true,
    calendar: {
      year: header.year,
      month: header.month,
      days: [...days.values()].sort((a, b) => a.day - b.day),
      warnings,
    },
  }
}

/** 歩数が読み取れた日だけを、取り込み用の読み取り結果にする。 */
export function toStepReadings(calendar: StepCalendar): StepReading[] {
  const pad = (n: number) => String(n).padStart(2, '0')
  return calendar.days
    .filter((d): d is { day: number; steps: number } => d.steps !== null)
    .map((d) => ({ date: `${calendar.year}-${pad(calendar.month)}-${pad(d.day)}`, steps: d.steps }))
}

function findYearMonth(words: readonly OcrWord[]) {
  for (const word of words) {
    const match = /^(\d{4})\s*[/年]\s*(\d{1,2})月?$/.exec(word.text.trim())
    if (!match) continue
    const year = Number(match[1])
    const month = Number(match[2])
    if (month >= 1 && month <= 12) return { year, month }
  }
  return undefined
}

/** 曜日の見出しの位置から、7つの列の中心と幅を求める(読み取れなかった曜日は補う)。 */
function findColumns(words: readonly OcrWord[]) {
  const found: { index: number; center: number; bottom: number }[] = []
  for (const word of words) {
    const text = word.text.trim().toUpperCase()
    const index = WEEKDAYS.findIndex((names) => names.includes(text))
    if (index >= 0 && !found.some((f) => f.index === index)) {
      found.push({ index, center: (word.bbox.x0 + word.bbox.x1) / 2, bottom: word.bbox.y1 })
    }
  }
  if (found.length < 2) return undefined

  // 列の中心 = start + width × 曜日の番号 を最小二乗で当てはめる
  const n = found.length
  const meanI = found.reduce((s, f) => s + f.index, 0) / n
  const meanX = found.reduce((s, f) => s + f.center, 0) / n
  const cov = found.reduce((s, f) => s + (f.index - meanI) * (f.center - meanX), 0)
  const varI = found.reduce((s, f) => s + (f.index - meanI) ** 2, 0)
  const width = cov / varI
  const start = meanX - width * meanI
  if (!(width > 0)) return undefined

  const centerX = (w: OcrWord) => (w.bbox.x0 + w.bbox.x1) / 2
  return {
    headerBottom: Math.max(...found.map((f) => f.bottom)),
    columnOf: (w: OcrWord) => Math.min(6, Math.max(0, Math.round((centerX(w) - start) / width))),
    leftRatio: (w: OcrWord, column: number) =>
      (w.bbox.x0 - (start + width * (column - 0.5))) / width,
  }
}
