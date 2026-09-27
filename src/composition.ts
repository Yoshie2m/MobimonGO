import type { StepResourceEvent } from './publishedLanguage/stepResourceEvents.ts'
import { systemClock } from './shared/Clock.ts'
import { EventBus } from './shared/EventBus.ts'
import { randomIdGenerator, type IdGenerator } from './shared/IdGenerator.ts'
import type { KeyValueStorage } from './shared/VersionedStorage.ts'
import type { StepImportUseCases } from './stepResource/application/stepImport.ts'
import { StepResourceService } from './stepResource/application/StepResourceService.ts'
import { LocalStorageStepResourceRepository } from './stepResource/infrastructure/LocalStorageStepResourceRepository.ts'

const USER_ID_KEY = 'mobimongo:userId'

/**
 * アプリの組み立て(依存の注入)。ui/ はここで作ったユースケースだけを受け取る。
 * ユーザーの ID は初回起動時に1つ発行し、WalkerId(将来は PlayerId も)に同じ値を使う。
 */
export function createApp(storage: KeyValueStorage = window.localStorage) {
  const events = new EventBus<StepResourceEvent>()
  const stepResource = new StepResourceService(
    new LocalStorageStepResourceRepository(storage),
    systemClock,
    randomIdGenerator,
    events,
  )

  const userId = ensureUserId(storage, randomIdGenerator)
  stepResource.registerWalker(userId)

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

  return { events, stepImport }
}

function ensureUserId(storage: KeyValueStorage, ids: IdGenerator): string {
  const existing = storage.getItem(USER_ID_KEY)
  if (existing) return existing
  const id = ids.next()
  storage.setItem(USER_ID_KEY, id)
  return id
}
