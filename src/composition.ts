import { loadOrCreateUserId } from './appStorage.ts'
import { MobimonService } from './mobimon/application/MobimonService.ts'
import type { MobimonUseCases } from './mobimon/application/mobimonUseCases.ts'
import { LocalStorageMobimonRepository } from './mobimon/infrastructure/LocalStorageMobimonRepository.ts'
import type { StepResourceEvent } from './publishedLanguage/stepResourceEvents.ts'
import { systemClock, type Clock } from './shared/Clock.ts'
import { EventBus } from './shared/EventBus.ts'
import { randomIdGenerator, type IdGenerator } from './shared/IdGenerator.ts'
import type { KeyValueStorage } from './shared/VersionedStorage.ts'
import type { StepImportUseCases } from './stepResource/application/stepImport.ts'
import { StepResourceService } from './stepResource/application/StepResourceService.ts'
import { LocalStorageStepResourceRepository } from './stepResource/infrastructure/LocalStorageStepResourceRepository.ts'

export interface AppOptions {
  storage?: KeyValueStorage
  clock?: Clock
  ids?: IdGenerator
  random?: () => number
}

/**
 * アプリの組み立て(依存の注入)。ui/ はここで作ったユースケースだけを受け取る。
 * ユーザーの ID は初回起動時に1つ発行し、WalkerId と PlayerId に同じ値を使う。
 */
export function createApp({
  storage = window.localStorage,
  clock = systemClock,
  ids = randomIdGenerator,
  random = Math.random,
}: AppOptions = {}) {
  const events = new EventBus<StepResourceEvent>()
  const stepResource = new StepResourceService(
    new LocalStorageStepResourceRepository(storage),
    clock,
    ids,
    events,
  )
  const mobimon = new MobimonService(new LocalStorageMobimonRepository(storage), clock, ids, random)

  // 歩数リソース変換 → Mobimon は Published Language のイベントだけでつながる
  for (const type of ['EnergyGranted', 'PointsGranted', 'CumulativeStepsUpdated'] as const) {
    events.subscribe(type, (event) => mobimon.handleStepResourceEvent(event))
  }

  // 同じユーザーの ID で、Walker と Player(Wallet・Inventory・Mobidex を含む)を作る
  const userId = loadOrCreateUserId(storage, ids)
  stepResource.registerWalker(userId)
  mobimon.registerPlayer(userId)

  const stepImport: StepImportUseCases = {
    getStatus: () => stepResource.getStatus(userId),
    importSteps: (readings, source) => stepResource.importSteps(userId, readings, source),
    // 文字認識のライブラリは大きいため、画面キャプチャを読み込むときに初めて読み込む
    recognizeStepCalendar: async (image) => {
      const { recognizeStepCalendar } =
        await import('./stepResource/acl/screenCapture/recognizeStepCalendar.ts')
      return recognizeStepCalendar(image)
    },
  }

  const game: MobimonUseCases = {
    getSummary: () => mobimon.getSummary(userId),
    listOwnedMobimon: () => mobimon.listOwnedMobimon(userId),
    encounter: () => mobimon.encounter(userId),
    capture: (encounterId) => mobimon.capture(userId, encounterId),
    flee: (encounterId) => mobimon.flee(userId, encounterId),
    train: (ownedId) => mobimon.train(userId, ownedId),
    evolve: (ownedId, toSpeciesId) => mobimon.evolve(userId, ownedId, toSpeciesId),
    listShop: () => mobimon.listShop(userId),
    purchase: (itemId, quantity) => mobimon.purchase(userId, itemId, quantity),
    useItem: (itemId) => mobimon.useItem(userId, itemId),
    getMobidex: () => mobimon.getMobidex(userId),
  }

  return { events, stepImport, game, userId }
}
