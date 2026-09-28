import type { Migrations } from '../../../shared/VersionedStorage.ts'

/**
 * 歩数リソース変換の保存データ(mobimongo:stepResource)の版と移行。
 * 保存形式を変えたら、CURRENT_VERSION を1つ上げ、1つ前の版からの変換関数を MIGRATIONS に追加し、
 * 1つ前の版の見本を tests/fixtures/storage/mobimongo-stepResource/ に置く(CLAUDE.md の手順)。
 */
export const CURRENT_VERSION = 1

export const MIGRATIONS: Migrations = {
  // 例: 1: (data) => ({ ...(data as object), 新しい項目: 初期値 }),
}
