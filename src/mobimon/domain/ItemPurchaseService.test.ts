import { DomainError } from '../../shared/DomainError.ts'
import { findItem, ITEM_IDS } from '../masterData/items.ts'
import { grantId } from './ids.ts'
import { Inventory, MAX_ITEM_COUNT } from './Inventory.ts'
import { purchaseItem } from './ItemPurchaseService.ts'
import { point } from './quantities.ts'
import { PLAYER } from './testHelpers.ts'
import { Wallet } from './Wallet.ts'

const aroma = findItem(ITEM_IDS.aroma)
const walletWith = (points: number) =>
  Wallet.create(PLAYER).receivePoints(grantId('g'), point(points))

describe('purchaseItem', () => {
  it('ポイントを消費してアイテムを追加する', () => {
    const { wallet, inventory, event } = purchaseItem(
      walletWith(100),
      Inventory.create(PLAYER),
      aroma,
      2,
    )
    expect(wallet.points).toBe(40)
    expect(inventory.countOf(aroma.id)).toBe(2)
    expect(event).toMatchObject({ type: 'ItemPurchased', quantity: 2, price: 60 })
  })

  it('ポイント不足なら購入できない', () => {
    expect(() => purchaseItem(walletWith(29), Inventory.create(PLAYER), aroma)).toThrow(
      'ポイントが足りません',
    )
  })

  it('所持上限を超えるなら購入できない(ポイントは減らない)', () => {
    const full = Inventory.create(PLAYER).add(aroma.id, MAX_ITEM_COUNT)
    expect(() => purchaseItem(walletWith(100), full, aroma)).toThrow(DomainError)
  })
})
