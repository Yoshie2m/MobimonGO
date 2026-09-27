import type { ItemId } from './ids.ts'
import type { Point } from './quantities.ts'

/** アイテム効果の種別。 */
export type ItemEffectKind = 'encounterBoost' | 'training'

/** アイテムを使用して得られる効果。持続は時間ではなく回数で数える。 */
export interface ItemEffect {
  readonly kind: ItemEffectKind
  /** 出現率アップはレア以上の重みへの倍率、育成は経験値への倍率。 */
  readonly multiplier: number
  readonly uses: number
}

/** アイテム(マスターデータ・参照専用)。 */
export interface Item {
  readonly id: ItemId
  readonly name: string
  readonly price: Point
  readonly effect: ItemEffect
}
