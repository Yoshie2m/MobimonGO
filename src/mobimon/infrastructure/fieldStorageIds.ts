import { BUSINESS_FIELDS, type BusinessField } from '../domain/BusinessField.ts'

/**
 * 事業分野を保存するときの ID。保存データには分野の名前ではなくこの ID を書く。
 * 分野の名前を変えても保存データの移行が要らないよう、ID は一度決めたら変えない
 * (分野の称号の ID `field-<ID>` と同じ値)。
 */
export const FIELD_STORAGE_IDS: Readonly<Record<BusinessField, string>> = {
  サーマルマネジメント: 'thermal',
  パワートレイン: 'powertrain',
  インフォテイメント: 'safety',
  先進デバイス: 'semiconductor',
  アフターサービス: 'service',
  インダストリー: 'industry',
  フードバリュー: 'food',
  スマートホーム: 'home',
}

const byId = new Map(BUSINESS_FIELDS.map((f) => [FIELD_STORAGE_IDS[f], f]))

export const fieldToStorageId = (field: BusinessField): string => FIELD_STORAGE_IDS[field]

/** 保存された ID から分野を戻す。知らない ID なら undefined。 */
export const fieldFromStorageId = (id: string): BusinessField | undefined => byId.get(id)

const FIELD_ACHIEVEMENT = 'completed:field:'

/** 図鑑の達成記録のうち、分野コンプリート(`completed:field:<分野>`)の分野を ID に置き換えて保存する。 */
export function achievementToStorage(key: string): string {
  if (!key.startsWith(FIELD_ACHIEVEMENT)) return key
  const field = key.slice(FIELD_ACHIEVEMENT.length) as BusinessField
  const id = FIELD_STORAGE_IDS[field]
  return id ? FIELD_ACHIEVEMENT + id : key
}

export function achievementFromStorage(key: string): string {
  if (!key.startsWith(FIELD_ACHIEVEMENT)) return key
  const field = fieldFromStorageId(key.slice(FIELD_ACHIEVEMENT.length))
  return field ? FIELD_ACHIEVEMENT + field : key
}
