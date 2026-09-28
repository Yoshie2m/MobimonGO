import type { IdGenerator } from './shared/IdGenerator.ts'
import { VersionedStorage, type KeyValueStorage } from './shared/VersionedStorage.ts'

/** アプリ全体の保存データ(ユーザーの ID など)のキー。 */
export const APP_STORAGE_KEY = 'mobimongo:app'
/** 版番号を持たなかった頃のユーザーの ID のキー(移行元)。 */
export const LEGACY_USER_ID_KEY = 'mobimongo:userId'

const CURRENT_VERSION = 1

interface AppData {
  userId: string
}

/**
 * ユーザーの ID を読み込む。なければ発行して保存する。
 * 版番号のない旧キー(mobimongo:userId)があれば、その ID を引き継いで新しいキーに移す。
 * ユーザーの ID は WalkerId と PlayerId に同じ値を使う。
 */
export function loadOrCreateUserId(storage: KeyValueStorage, ids: IdGenerator): string {
  const app = new VersionedStorage<AppData>(storage, APP_STORAGE_KEY, CURRENT_VERSION)
  const existing = app.load()
  if (existing) return existing.userId

  const legacy = storage.getItem(LEGACY_USER_ID_KEY)
  const userId = legacy ?? ids.next()
  app.save({ userId })
  if (legacy !== null) storage.removeItem(LEGACY_USER_ID_KEY)
  return userId
}
