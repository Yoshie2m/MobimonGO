/** 現在時刻の取得元。テストでは固定の時刻に差し替える。 */
export interface Clock {
  now(): Date
}

export const systemClock: Clock = { now: () => new Date() }

export function fixedClock(date: Date): Clock {
  return { now: () => new Date(date) }
}
