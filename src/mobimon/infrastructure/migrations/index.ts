import type { Migrations } from '../../../shared/VersionedStorage.ts'

/**
 * Mobimon の保存データ(mobimongo:mobimon)の版と移行。
 * 保存形式を変えたら、CURRENT_VERSION を1つ上げ、1つ前の版からの変換関数を MIGRATIONS に追加し、
 * 1つ前の版の見本を tests/fixtures/storage/mobimongo-mobimon/ に置く(CLAUDE.md の手順)。
 * 種の統合など、マスターデータの ID を置き換える移行もここに置く。
 */
export const CURRENT_VERSION = 2

type Json = Record<string, unknown>

export const MIGRATIONS: Migrations = {
  /**
   * v1 → v2: 組織と、日ごとの歩数の記録を追加する(組織と仕事・段階1)。
   * v1 のプレイヤーには、空の3チームの組織と、空の歩数の記録を作る。
   * チームの事業分野は、この版の時点の値を書き写す(ドメインの定数を使わない)。
   */
  1: (data) => {
    const v1 = data as Json & { players: { id: string }[] }
    const teamFields = [
      'サーマルマネジメント&エアコンシステム',
      'パワートレインシステム',
      'セーフティ&コックピットシステム',
    ]
    return {
      ...v1,
      organizations: v1.players.map((p) => ({
        playerId: p.id,
        teams: teamFields.map((field) => ({ field, leader: null, directReports: [] })),
      })),
      dailyStepLogs: v1.players.map((p) => ({ playerId: p.id, entries: [] })),
    }
  },
}
