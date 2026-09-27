/**
 * 出現時刻(端末のローカル時刻)の区分。
 * 朝 5:00〜9:59 / 昼 10:00〜15:59 / 夕 16:00〜18:59 / 夜 19:00〜翌4:59
 */
export type TimeOfDay = '朝' | '昼' | '夕' | '夜'

export const TIMES_OF_DAY: readonly TimeOfDay[] = ['朝', '昼', '夕', '夜']

export function timeOfDayAt(date: Date): TimeOfDay {
  const hour = date.getHours()
  if (hour >= 5 && hour < 10) return '朝'
  if (hour >= 10 && hour < 16) return '昼'
  if (hour >= 16 && hour < 19) return '夕'
  return '夜'
}
