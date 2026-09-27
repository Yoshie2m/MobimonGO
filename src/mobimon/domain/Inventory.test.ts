import { DomainError } from '../../shared/DomainError.ts'
import { findItem, ITEM_IDS } from '../masterData/items.ts'
import { Inventory, MAX_ITEM_COUNT } from './Inventory.ts'
import { PLAYER } from './testHelpers.ts'

const aroma = findItem(ITEM_IDS.aroma)
const aromaPlus = findItem(ITEM_IDS.aromaPlus)
const food = findItem(ITEM_IDS.food)

describe('Inventory', () => {
  it('持っていないアイテムは使えない', () => {
    expect(() => Inventory.create(PLAYER).use(aroma)).toThrow(DomainError)
  })

  it('99個を超えて加えられない', () => {
    const full = Inventory.create(PLAYER).add(aroma.id, MAX_ITEM_COUNT)
    expect(() => full.add(aroma.id, 1)).toThrow(DomainError)
  })

  it('使うと効果が使用中になり、出現ごとに残り回数が1減り、0で切れる', () => {
    let inventory = Inventory.create(PLAYER).add(aroma.id, 1).use(aroma).inventory
    expect(inventory.countOf(aroma.id)).toBe(0)
    expect(inventory.multiplierOf('encounterBoost')).toBe(2)
    inventory = inventory.consumeEffect('encounterBoost').consumeEffect('encounterBoost')
    expect(inventory.activeEffects.get('encounterBoost')?.remainingUses).toBe(1)
    inventory = inventory.consumeEffect('encounterBoost')
    expect(inventory.multiplierOf('encounterBoost')).toBe(1)
  })

  it('同じ種別の効果が残っている間は同じ種別を使えないが、別の種別は使える', () => {
    const inventory = Inventory.create(PLAYER)
      .add(aroma.id, 1)
      .add(aromaPlus.id, 1)
      .add(food.id, 1)
      .use(aroma).inventory
    expect(() => inventory.use(aromaPlus)).toThrow('効果が残っている')
    expect(inventory.use(food).inventory.multiplierOf('training')).toBe(1.5)
  })

  it('報酬で上限を超える分は保留し、使って空きができたら受け取る', () => {
    let inventory = Inventory.create(PLAYER)
      .add(aroma.id, MAX_ITEM_COUNT - 1)
      .receive(aroma.id, 3)
    expect(inventory.countOf(aroma.id)).toBe(MAX_ITEM_COUNT)
    expect(inventory.pending.get(aroma.id)).toBe(2)
    inventory = inventory.use(aroma).inventory
    expect(inventory.countOf(aroma.id)).toBe(MAX_ITEM_COUNT)
    expect(inventory.pending.get(aroma.id)).toBe(1)
  })
})
