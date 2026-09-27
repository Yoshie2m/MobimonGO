import { DomainError } from '../../shared/DomainError.ts'
import type { ItemPurchased } from './events.ts'
import type { Inventory } from './Inventory.ts'
import type { Item } from './Item.ts'
import { point } from './quantities.ts'
import type { Wallet } from './Wallet.ts'

/** Wallet からポイントを消費し、Inventory にアイテムを追加する。ポイント不足なら購入できない。 */
export function purchaseItem(
  wallet: Wallet,
  inventory: Inventory,
  item: Item,
  quantity = 1,
): { wallet: Wallet; inventory: Inventory; event: ItemPurchased } {
  if (wallet.playerId !== inventory.playerId) {
    throw new DomainError('ウォレットと所持アイテムのプレイヤーが一致しません')
  }
  // 所持上限を先に確かめ、ポイントだけが減ることがないようにする
  const added = inventory.add(item.id, quantity)
  const price = point(item.price * quantity)
  return {
    wallet: wallet.spendPoints(price),
    inventory: added,
    event: {
      type: 'ItemPurchased',
      playerId: wallet.playerId,
      itemId: item.id,
      quantity,
      price,
    },
  }
}
