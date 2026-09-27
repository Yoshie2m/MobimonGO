import { parseLocalDate } from '../../shared/LocalDate.ts'
import { VersionedStorage, type KeyValueStorage } from '../../shared/VersionedStorage.ts'
import { DailyGrant } from '../domain/DailyGrant.ts'
import { StepRecord, type StepSource } from '../domain/StepRecord.ts'
import type { StepResourceRepository, StepResourceState } from '../domain/StepResourceRepository.ts'
import { Walker, walkerId } from '../domain/Walker.ts'

export const STEP_RESOURCE_STORAGE_KEY = 'mobimongo:stepResource'
const VERSION = 1

interface Stored {
  walkers: { id: string; startDate: string }[]
  stepRecords: { walkerId: string; date: string; steps: number; source: StepSource }[]
  dailyGrants: { walkerId: string; date: string; grantedEnergy: number; grantedPoints: number }[]
}

/** 歩数リソース変換コンテキストの状態を、localStorage の1つのキーにまとめて保存する。 */
export class LocalStorageStepResourceRepository implements StepResourceRepository {
  private readonly storage: VersionedStorage<Stored>

  constructor(storage: KeyValueStorage) {
    this.storage = new VersionedStorage<Stored>(storage, STEP_RESOURCE_STORAGE_KEY, VERSION)
  }

  load(): StepResourceState {
    const stored = this.storage.load()
    if (!stored) return { walkers: [], stepRecords: [], dailyGrants: [] }
    return {
      walkers: stored.walkers.map((w) =>
        Walker.reconstruct(walkerId(w.id), parseLocalDate(w.startDate)),
      ),
      stepRecords: stored.stepRecords.map((r) =>
        StepRecord.reconstruct(walkerId(r.walkerId), parseLocalDate(r.date), r.steps, r.source),
      ),
      dailyGrants: stored.dailyGrants.map((g) =>
        DailyGrant.reconstruct(
          walkerId(g.walkerId),
          parseLocalDate(g.date),
          g.grantedEnergy,
          g.grantedPoints,
        ),
      ),
    }
  }

  save(state: StepResourceState): void {
    this.storage.save({
      walkers: state.walkers.map((w) => ({ id: w.id, startDate: w.startDate })),
      stepRecords: state.stepRecords.map((r) => ({
        walkerId: r.walkerId,
        date: r.date,
        steps: r.steps,
        source: r.source,
      })),
      dailyGrants: state.dailyGrants.map((g) => ({
        walkerId: g.walkerId,
        date: g.date,
        grantedEnergy: g.grantedEnergy,
        grantedPoints: g.grantedPoints,
      })),
    })
  }
}
