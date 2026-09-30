/** モビモン種のモチーフとなる事業分野。事業分野コンプリートの範囲に使う。 */
export const BUSINESS_FIELDS = [
  'サーマルマネジメント',
  'パワートレイン',
  'インフォテイメント',
  '先進デバイス',
  'アフターサービス',
  'インダストリー',
  'フードバリュー',
  'スマートホーム',
] as const

export type BusinessField = (typeof BUSINESS_FIELDS)[number]

export const isBusinessField = (value: string): value is BusinessField =>
  (BUSINESS_FIELDS as readonly string[]).includes(value)
