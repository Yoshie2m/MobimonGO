import type {
  MobidexView,
  MobimonUseCases,
  PlayerSummary,
} from '../mobimon/application/mobimonUseCases.ts'
import type { StepImportUseCases, WalkerStatus } from '../stepResource/application/stepImport.ts'

/** 画面のテスト用の、歩数の取り込みの偽物。 */
export const fakeStatus = (overrides: Partial<WalkerStatus> = {}): WalkerStatus => ({
  startDate: '2026-09-04',
  today: '2026-09-19',
  todaySteps: 0,
  cumulativeSteps: 0,
  stepGoal: 8_000,
  todayGrantedEnergy: 0,
  todayGrantedPoints: 0,
  ...overrides,
})

export const fakeStepImport = (
  overrides: Partial<StepImportUseCases> = {},
): StepImportUseCases => ({
  getStatus: () => fakeStatus(),
  importSteps: () => ({ imported: [], skipped: [], rejected: [], cumulativeSteps: 0 }),
  recognizeStepCalendar: async () => ({ ok: false, error: '' }),
  ...overrides,
})

export const fakeSummary = (overrides: Partial<PlayerSummary> = {}): PlayerSummary => ({
  energy: 0,
  points: 0,
  cumulativeSteps: 0,
  timeOfDay: '昼',
  encounterCost: 10,
  trainingCost: 10,
  ownedCount: 0,
  registeredCount: 0,
  totalSpecies: 151,
  titles: [],
  activeEffects: [],
  currentEncounter: null,
  ...overrides,
})

const emptyMobidex: MobidexView = {
  entries: [],
  registeredCount: 0,
  fields: [],
  fullCompleted: false,
  milestones: [],
  titles: [],
}

/** 画面のテスト用の、ゲーム操作の偽物。 */
export const fakeGame = (overrides: Partial<MobimonUseCases> = {}): MobimonUseCases => ({
  getSummary: () => fakeSummary(),
  listOwnedMobimon: () => [],
  encounter: () => {
    throw new Error('not implemented')
  },
  capture: () => {
    throw new Error('not implemented')
  },
  flee: () => {},
  train: () => {
    throw new Error('not implemented')
  },
  evolve: () => {
    throw new Error('not implemented')
  },
  listShop: () => [],
  purchase: () => {},
  useItem: () => {},
  getMobidex: () => emptyMobidex,
  ...overrides,
})
