import { itemId, type ItemId } from '../domain/ids.ts'
import type { Item } from '../domain/Item.ts'
import { point } from '../domain/quantities.ts'

export const ITEM_IDS = {
  aroma: itemId('aroma'),
  aromaPlus: itemId('aroma-plus'),
  food: itemId('food'),
  foodPlus: itemId('food-plus'),
} as const

/** アイテムのマスターデータ。価格は「目標をちょうど達成する人(10pt/日)で2〜3日に1つ」が基準。 */
export const ITEMS: readonly Item[] = [
  {
    id: ITEM_IDS.aroma,
    name: 'おさんぽアロマ',
    price: point(30),
    effect: { kind: 'encounterBoost', multiplier: 2, uses: 3 },
  },
  {
    id: ITEM_IDS.aromaPlus,
    name: 'おさんぽアロマ+',
    price: point(80),
    effect: { kind: 'encounterBoost', multiplier: 3, uses: 5 },
  },
  {
    id: ITEM_IDS.food,
    name: 'げんきフード',
    price: point(20),
    effect: { kind: 'training', multiplier: 1.5, uses: 1 },
  },
  {
    id: ITEM_IDS.foodPlus,
    name: 'げんきフード+',
    price: point(70),
    effect: { kind: 'training', multiplier: 2, uses: 3 },
  },
]

const byId = new Map(ITEMS.map((i) => [i.id, i]))

export function findItem(id: ItemId): Item {
  const item = byId.get(id)
  if (!item) throw new Error(`アイテムが見つかりません: ${id}`)
  return item
}
