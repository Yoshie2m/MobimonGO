import { DomainError } from './DomainError.ts'

/** 時刻を持たない、端末のローカル時刻での日付(YYYY-MM-DD)。文字列のまま大小比較できる。 */
export type LocalDate = string & { readonly __brand: 'LocalDate' }

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseLocalDate(value: string): LocalDate {
  const match = PATTERN.exec(value)
  if (!match) throw new DomainError(`日付の形式が正しくありません: ${value}`)
  const [, y, m, d] = match.map(Number)
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) {
    throw new DomainError(`存在しない日付です: ${value}`)
  }
  return value as LocalDate
}

export function localDateOf(date: Date): LocalDate {
  return localDateFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

export function localDateFromParts(year: number, month: number, day: number): LocalDate {
  const pad = (n: number, width: number) => String(n).padStart(width, '0')
  return parseLocalDate(`${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`)
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** 日付の曜日(0 = 日曜)。 */
export function dayOfWeek(date: LocalDate): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}
