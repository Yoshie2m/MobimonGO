import type { PlayerId } from './ids.ts'

/**
 * 歩数リソース変換から受け取った、日ごとの歩数(1日の上限で頭打ちにした値)の記録。
 * 仕事の進み具合と、「受注した日の歩数をすでに取り込んでいたか」の判定に使う。
 * 同じ日の値は減らない(小さい値が後から届いても無視する)。
 */
export class DailyStepLog {
  readonly playerId: PlayerId
  readonly entries: ReadonlyMap<string, number>

  private constructor(playerId: PlayerId, entries: ReadonlyMap<string, number>) {
    this.playerId = playerId
    this.entries = entries
  }

  static create(playerId: PlayerId): DailyStepLog {
    return new DailyStepLog(playerId, new Map())
  }

  static reconstruct(playerId: PlayerId, entries: Iterable<[string, number]>): DailyStepLog {
    return new DailyStepLog(playerId, new Map(entries))
  }

  record(date: string, steps: number): DailyStepLog {
    if (steps <= (this.entries.get(date) ?? -1)) return this
    const entries = new Map(this.entries)
    entries.set(date, steps)
    return new DailyStepLog(this.playerId, entries)
  }

  /** その日の歩数を受け取り済みか。 */
  hasRecorded(date: string): boolean {
    return this.entries.has(date)
  }

  stepsOn(date: string): number {
    return this.entries.get(date) ?? 0
  }
}
