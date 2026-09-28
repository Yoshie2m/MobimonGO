import type { Migrations } from '../../../shared/VersionedStorage.ts'

/**
 * Mobimon の保存データ(mobimongo:mobimon)の版と移行。
 * 保存形式を変えたら、CURRENT_VERSION を1つ上げ、1つ前の版からの変換関数を MIGRATIONS に追加し、
 * 1つ前の版の見本を tests/fixtures/storage/mobimongo-mobimon/ に置く(CLAUDE.md の手順)。
 * 種の統合など、マスターデータの ID を置き換える移行もここに置く。
 */
export const CURRENT_VERSION = 1

export const MIGRATIONS: Migrations = {}
