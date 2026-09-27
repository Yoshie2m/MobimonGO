import type { BusinessField } from '../domain/BusinessField.ts'
import { titleId } from '../domain/ids.ts'
import type { Title } from '../domain/Title.ts'

const FIELD_TITLES: Record<BusinessField, { id: string; name: string }> = {
  'サーマルマネジメント&エアコンシステム': { id: 'field-thermal', name: '熱と風の達人' },
  パワートレインシステム: { id: 'field-powertrain', name: '動力の達人' },
  'セーフティ&コックピットシステム': { id: 'field-safety', name: '安全と快適の達人' },
  '半導体・先進デバイス': { id: 'field-semiconductor', name: '半導体の達人' },
  '自動車補修用部品・アクセサリー/修理サービス': { id: 'field-service', name: '整備の達人' },
  インダストリー: { id: 'field-industry', name: 'ものづくりの達人' },
  フードバリューチェーン: { id: 'field-food', name: '食と農の達人' },
  ホーム: { id: 'field-home', name: '暮らしの達人' },
}

/** 称号のマスターデータ。 */
export const TITLES: readonly Title[] = [
  ...Object.entries(FIELD_TITLES).map(([field, t]) => ({
    id: titleId(t.id),
    name: t.name,
    source: { kind: 'fieldCompletion' as const, field: field as BusinessField },
  })),
  { id: titleId('full-completion'), name: 'モビモンマスター', source: { kind: 'fullCompletion' } },
  {
    id: titleId('d-world'),
    name: 'Dワールドの覇者',
    source: { kind: 'specialSpecies', speciesName: 'デンまる' },
  },
]
