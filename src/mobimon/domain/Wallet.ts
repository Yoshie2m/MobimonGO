import { DomainError } from '../../shared/DomainError.ts'
import type { GrantId, PlayerId } from './ids.ts'
import { energy, point, type Energy, type Point } from './quantities.ts'

/**
 * プレイヤーが保有するエネルギーとポイントの残高。
 * 残高は負にならず、同じ GrantId は二度加算しない。日付が変わってもリセットしない(持ち越し)。
 */
export class Wallet {
  readonly playerId: PlayerId
  readonly energy: Energy
  readonly points: Point
  readonly processedGrantIds: ReadonlySet<GrantId>

  private constructor(playerId: PlayerId, e: Energy, p: Point, processed: ReadonlySet<GrantId>) {
    this.playerId = playerId
    this.energy = e
    this.points = p
    this.processedGrantIds = processed
  }

  static create(playerId: PlayerId): Wallet {
    return new Wallet(playerId, energy(0), point(0), new Set())
  }

  static reconstruct(playerId: PlayerId, e: number, p: number, processed: Iterable<GrantId>) {
    return new Wallet(playerId, energy(e), point(p), new Set(processed))
  }

  receiveEnergy(grantId: GrantId, amount: Energy): Wallet {
    if (this.processedGrantIds.has(grantId)) return this
    return new Wallet(
      this.playerId,
      energy(this.energy + amount),
      this.points,
      new Set([...this.processedGrantIds, grantId]),
    )
  }

  receivePoints(grantId: GrantId, amount: Point): Wallet {
    if (this.processedGrantIds.has(grantId)) return this
    return new Wallet(
      this.playerId,
      this.energy,
      point(this.points + amount),
      new Set([...this.processedGrantIds, grantId]),
    )
  }

  spendEnergy(amount: Energy): Wallet {
    if (amount > this.energy) {
      throw new DomainError(`エネルギーが足りません(必要: ${amount}、残高: ${this.energy})`)
    }
    return new Wallet(
      this.playerId,
      energy(this.energy - amount),
      this.points,
      this.processedGrantIds,
    )
  }

  spendPoints(amount: Point): Wallet {
    if (amount > this.points) {
      throw new DomainError(`ポイントが足りません(必要: ${amount}pt、残高: ${this.points}pt)`)
    }
    return new Wallet(
      this.playerId,
      this.energy,
      point(this.points - amount),
      this.processedGrantIds,
    )
  }
}
