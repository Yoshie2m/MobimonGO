/** レア度。 */
export type Rarity = 'コモン' | 'アンコモン' | 'レア' | '超レア'

export const RARITIES: readonly Rarity[] = ['コモン', 'アンコモン', 'レア', '超レア']

/** 1種あたりの出現の重み。種数の多いレア度で1種あたりの確率が薄まらないよう、種ごとに重みを付ける。 */
export const RARITY_WEIGHT: Readonly<Record<Rarity, number>> = {
  コモン: 10,
  アンコモン: 5,
  レア: 2,
  超レア: 1,
}

/** 出現率アップの効果が及ぶレア度。 */
export const isBoostedRarity = (rarity: Rarity) => rarity === 'レア' || rarity === '超レア'
