import { DomainError } from '../../shared/DomainError.ts'
import type { LocalDate } from '../../shared/LocalDate.ts'
import { energy, point, type Energy, type Point } from './quantities.ts'
import type { WalkerId } from './Walker.ts'

/** 特定のウォーカー・特定の日に付与済みのエネルギー / ポイント。付与済みの量は減らない。 */
export class DailyGrant {
  readonly walkerId: WalkerId
  readonly date: LocalDate
  readonly grantedEnergy: Energy
  readonly grantedPoints: Point

  private constructor(
    walkerId: WalkerId,
    date: LocalDate,
    grantedEnergy: Energy,
    grantedPoints: Point,
  ) {
    this.walkerId = walkerId
    this.date = date
    this.grantedEnergy = grantedEnergy
    this.grantedPoints = grantedPoints
  }

  static empty(walkerId: WalkerId, date: LocalDate): DailyGrant {
    return new DailyGrant(walkerId, date, energy(0), point(0))
  }

  static reconstruct(
    walkerId: WalkerId,
    date: LocalDate,
    grantedEnergy: number,
    grantedPoints: number,
  ): DailyGrant {
    return new DailyGrant(walkerId, date, energy(grantedEnergy), point(grantedPoints))
  }

  /** 新たに付与した量を加える。 */
  recordGrant(addedEnergy: Energy, addedPoints: Point): DailyGrant {
    if (addedEnergy < 0 || addedPoints < 0) {
      throw new DomainError('付与済みの量は減らせません')
    }
    return new DailyGrant(
      this.walkerId,
      this.date,
      energy(this.grantedEnergy + addedEnergy),
      point(this.grantedPoints + addedPoints),
    )
  }
}
