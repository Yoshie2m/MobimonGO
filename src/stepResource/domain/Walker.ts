import type { LocalDate } from '../../shared/LocalDate.ts'

/** ウォーカーの ID。Mobimon の PlayerId と同じ値を使う。 */
export type WalkerId = string & { readonly __brand: 'WalkerId' }
export const walkerId = (value: string) => value as WalkerId

/** 利用開始日。これより前の歩数は取り込まない。当日の歩数は0時からすべて数える。 */
export type StartDate = LocalDate

/** 歩数の持ち主としてのユーザー。利用開始日は一度決めたら変わらない。 */
export class Walker {
  readonly id: WalkerId
  readonly startDate: StartDate

  private constructor(id: WalkerId, startDate: StartDate) {
    this.id = id
    this.startDate = startDate
  }

  static register(id: WalkerId, startDate: StartDate): Walker {
    return new Walker(id, startDate)
  }

  static reconstruct(id: WalkerId, startDate: StartDate): Walker {
    return new Walker(id, startDate)
  }

  /** その日の歩数を取り込める期間か(利用開始日以降、今日以前)。 */
  canRecord(date: LocalDate, today: LocalDate): boolean {
    return date >= this.startDate && date <= today
  }
}
