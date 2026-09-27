import { DomainError } from '../../shared/DomainError.ts'
import type { ItemUsed } from './events.ts'
import type { ItemId, PlayerId } from './ids.ts'
import type { Item, ItemEffectKind } from './Item.ts'

/** 1種類のアイテムを持てる上限。 */
export const MAX_ITEM_COUNT = 99

/** 使用中のアイテム効果。 */
export interface ActiveEffect {
  readonly itemId: ItemId
  readonly multiplier: number
  readonly remainingUses: number
}

/**
 * プレイヤーが所有するアイテムとその個数、使用中の効果。
 * 個数は負にならず 99個を超えない。同じ種別の効果が残っている間は、同じ種別のアイテムを使えない。
 * 報酬で受け取って上限を超える分は保留し、空きができたら受け取る。
 */
export class Inventory {
  readonly playerId: PlayerId
  readonly counts: ReadonlyMap<ItemId, number>
  readonly activeEffects: ReadonlyMap<ItemEffectKind, ActiveEffect>
  /** 上限を超えたため受け取りを保留している報酬。 */
  readonly pending: ReadonlyMap<ItemId, number>

  private constructor(
    playerId: PlayerId,
    counts: ReadonlyMap<ItemId, number>,
    activeEffects: ReadonlyMap<ItemEffectKind, ActiveEffect>,
    pending: ReadonlyMap<ItemId, number>,
  ) {
    this.playerId = playerId
    this.counts = counts
    this.activeEffects = activeEffects
    this.pending = pending
  }

  static create(playerId: PlayerId): Inventory {
    return new Inventory(playerId, new Map(), new Map(), new Map())
  }

  static reconstruct(
    playerId: PlayerId,
    counts: Iterable<[ItemId, number]>,
    activeEffects: Iterable<[ItemEffectKind, ActiveEffect]>,
    pending: Iterable<[ItemId, number]>,
  ): Inventory {
    return new Inventory(playerId, new Map(counts), new Map(activeEffects), new Map(pending))
  }

  countOf(itemId: ItemId): number {
    return this.counts.get(itemId) ?? 0
  }

  /** アイテムを加える(購入)。上限を超える場合は加えられない。 */
  add(itemId: ItemId, quantity: number): Inventory {
    assertQuantity(quantity)
    if (this.countOf(itemId) + quantity > MAX_ITEM_COUNT) {
      throw new DomainError(`1種類のアイテムは ${MAX_ITEM_COUNT} 個までしか持てません`)
    }
    return this.withCounts(itemId, this.countOf(itemId) + quantity)
  }

  /** 報酬としてアイテムを受け取る。上限を超える分は保留する。 */
  receive(itemId: ItemId, quantity: number): Inventory {
    assertQuantity(quantity)
    const accepted = Math.min(quantity, MAX_ITEM_COUNT - this.countOf(itemId))
    const pending = new Map(this.pending)
    const held = quantity - accepted + (pending.get(itemId) ?? 0)
    if (held > 0) pending.set(itemId, held)
    const counts = new Map(this.counts)
    counts.set(itemId, this.countOf(itemId) + accepted)
    return new Inventory(this.playerId, counts, this.activeEffects, pending)
  }

  /** アイテムを使い、その効果を使用中にする。空いた分に保留中の報酬を受け取る。 */
  use(item: Item): { inventory: Inventory; event: ItemUsed } {
    if (this.countOf(item.id) === 0) throw new DomainError(`${item.name}を持っていません`)
    if (this.activeEffects.has(item.effect.kind)) {
      throw new DomainError('同じ種類のアイテムの効果が残っている間は使えません')
    }
    const effects = new Map(this.activeEffects)
    effects.set(item.effect.kind, {
      itemId: item.id,
      multiplier: item.effect.multiplier,
      remainingUses: item.effect.uses,
    })
    const used = new Inventory(
      this.playerId,
      withCount(this.counts, item.id, this.countOf(item.id) - 1),
      effects,
      this.pending,
    )
    return {
      inventory: used.claimPending(item.id),
      event: { type: 'ItemUsed', playerId: this.playerId, itemId: item.id },
    }
  }

  /** 使用中の効果の倍率(効果がなければ 1)。 */
  multiplierOf(kind: ItemEffectKind): number {
    return this.activeEffects.get(kind)?.multiplier ?? 1
  }

  /** 出現・育成を1回行ったので、その種別の効果の残り回数を1減らす。0 になれば効果が切れる。 */
  consumeEffect(kind: ItemEffectKind): Inventory {
    const effect = this.activeEffects.get(kind)
    if (!effect) return this
    const effects = new Map(this.activeEffects)
    if (effect.remainingUses <= 1) effects.delete(kind)
    else effects.set(kind, { ...effect, remainingUses: effect.remainingUses - 1 })
    return new Inventory(this.playerId, this.counts, effects, this.pending)
  }

  private withCounts(itemId: ItemId, count: number): Inventory {
    return new Inventory(
      this.playerId,
      withCount(this.counts, itemId, count),
      this.activeEffects,
      this.pending,
    )
  }

  private claimPending(itemId: ItemId): Inventory {
    const held = this.pending.get(itemId) ?? 0
    if (held === 0) return this
    const pending = new Map(this.pending)
    pending.delete(itemId)
    return new Inventory(this.playerId, this.counts, this.activeEffects, pending).receive(
      itemId,
      held,
    )
  }
}

function withCount(counts: ReadonlyMap<ItemId, number>, itemId: ItemId, count: number) {
  const next = new Map(counts)
  if (count === 0) next.delete(itemId)
  else next.set(itemId, count)
  return next
}

function assertQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new DomainError(`個数は 1 以上の整数です: ${quantity}`)
  }
}
