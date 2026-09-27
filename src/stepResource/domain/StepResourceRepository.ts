import type { DailyGrant } from './DailyGrant.ts'
import type { StepRecord } from './StepRecord.ts'
import type { Walker } from './Walker.ts'

/** 歩数リソース変換コンテキストの状態。まとめて読み込み、まとめて保存する(同じ保存単位)。 */
export interface StepResourceState {
  walkers: Walker[]
  stepRecords: StepRecord[]
  dailyGrants: DailyGrant[]
}

export interface StepResourceRepository {
  load(): StepResourceState
  save(state: StepResourceState): void
}
