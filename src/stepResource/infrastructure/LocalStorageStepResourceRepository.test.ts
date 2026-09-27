import { parseLocalDate } from '../../shared/LocalDate.ts'
import { DailyGrant } from '../domain/DailyGrant.ts'
import { energy, point } from '../domain/quantities.ts'
import { StepRecord } from '../domain/StepRecord.ts'
import { Walker, walkerId } from '../domain/Walker.ts'
import {
  LocalStorageStepResourceRepository,
  STEP_RESOURCE_STORAGE_KEY,
} from './LocalStorageStepResourceRepository.ts'

describe('LocalStorageStepResourceRepository', () => {
  beforeEach(() => localStorage.clear())

  it('保存していなければ空の状態を返す', () => {
    expect(new LocalStorageStepResourceRepository(localStorage).load()).toEqual({
      walkers: [],
      stepRecords: [],
      dailyGrants: [],
    })
  })

  it('状態を1つのキーに版番号付きで保存し、読み戻せる', () => {
    const id = walkerId('user-1')
    const date = parseLocalDate('2026-09-04')
    const repository = new LocalStorageStepResourceRepository(localStorage)
    repository.save({
      walkers: [Walker.register(id, date)],
      stepRecords: [StepRecord.reconstruct(id, date, 13_186, 'screenCapture')],
      dailyGrants: [DailyGrant.empty(id, date).recordGrant(energy(131), point(35))],
    })

    expect(JSON.parse(localStorage.getItem(STEP_RESOURCE_STORAGE_KEY)!).version).toBe(1)
    const loaded = new LocalStorageStepResourceRepository(localStorage).load()
    expect(loaded.walkers[0]).toMatchObject({ id: 'user-1', startDate: '2026-09-04' })
    expect(loaded.stepRecords[0]).toMatchObject({ steps: 13_186, source: 'screenCapture' })
    expect(loaded.dailyGrants[0]).toMatchObject({ grantedEnergy: 131, grantedPoints: 35 })
  })
})
