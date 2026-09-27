/** モビモン種のモチーフとなる事業分野。事業分野コンプリートの範囲に使う。 */
export const BUSINESS_FIELDS = [
  'サーマルマネジメント&エアコンシステム',
  'パワートレインシステム',
  'セーフティ&コックピットシステム',
  '半導体・先進デバイス',
  '自動車補修用部品・アクセサリー/修理サービス',
  'インダストリー',
  'フードバリューチェーン',
  'ホーム',
] as const

export type BusinessField = (typeof BUSINESS_FIELDS)[number]

export const isBusinessField = (value: string): value is BusinessField =>
  (BUSINESS_FIELDS as readonly string[]).includes(value)
