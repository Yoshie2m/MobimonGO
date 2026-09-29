/**
 * 歩数リソース変換コンテキストが公開するイベント(Published Language)。
 * Mobimon コンテキストはこの型だけを通じて歩数リソース変換とやり取りする。
 * walkerId は Mobimon の PlayerId と同じ値。
 */

export interface EnergyGranted {
  type: 'EnergyGranted'
  grantId: string
  walkerId: string
  /** 付与の対象になった日(YYYY-MM-DD)。 */
  date: string
  energy: number
}

export interface PointsGranted {
  type: 'PointsGranted'
  grantId: string
  walkerId: string
  date: string
  points: number
}

/** 累計歩数が変わった。増分ではなく累計値そのものを載せる。 */
export interface CumulativeStepsUpdated {
  type: 'CumulativeStepsUpdated'
  walkerId: string
  cumulativeSteps: number
}

/**
 * 日ごとの歩数を取り込んだ。その日の歩数を 1日の上限(20,000歩)で頭打ちにした値そのものを載せる
 * (増分ではない)。Mobimon は仕事の進み具合に使う。
 */
export interface DailyStepsCounted {
  type: 'DailyStepsCounted'
  walkerId: string
  /** YYYY-MM-DD */
  date: string
  steps: number
}

export type StepResourceEvent =
  EnergyGranted | PointsGranted | CumulativeStepsUpdated | DailyStepsCounted
