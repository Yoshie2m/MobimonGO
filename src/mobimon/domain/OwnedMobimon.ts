import { DomainError } from '../../shared/DomainError.ts'
import type { MobimonEvolved, MobimonTrained } from './events.ts'
import type { MobimonSpeciesId, OwnedMobimonId, PlayerId } from './ids.ts'
import type { MobimonSpecies } from './MobimonSpecies.ts'
import { experience, level, MAX_LEVEL, type Experience, type Level } from './quantities.ts'

/** 育成1回で得る経験値(育成アイテム使用中は倍率を掛ける)。 */
export const EXPERIENCE_PER_TRAINING = 100

/** そのレベルに到達するのに必要な累計経験値。次のレベルに必要な量は 50 × 現在のレベル。 */
export function experienceToReach(target: number): number {
  return (50 * target * (target - 1)) / 2
}

/** 累計経験値から決まるレベル。 */
export function levelForExperience(exp: number): Level {
  let lv = 1
  while (lv < MAX_LEVEL && exp >= experienceToReach(lv + 1)) lv++
  return level(lv)
}

/** プレイヤーが捕獲して所有しているモビモン個体。 */
export class OwnedMobimon {
  readonly id: OwnedMobimonId
  readonly playerId: PlayerId
  readonly speciesId: MobimonSpeciesId
  /** 累計経験値。 */
  readonly experience: Experience

  private constructor(
    id: OwnedMobimonId,
    playerId: PlayerId,
    speciesId: MobimonSpeciesId,
    exp: Experience,
  ) {
    this.id = id
    this.playerId = playerId
    this.speciesId = speciesId
    this.experience = exp
  }

  /** 捕獲時は Lv1・経験値 0。 */
  static capture(id: OwnedMobimonId, playerId: PlayerId, speciesId: MobimonSpeciesId) {
    return new OwnedMobimon(id, playerId, speciesId, experience(0))
  }

  static reconstruct(
    id: OwnedMobimonId,
    playerId: PlayerId,
    speciesId: MobimonSpeciesId,
    exp: number,
  ): OwnedMobimon {
    return new OwnedMobimon(id, playerId, speciesId, experience(exp))
  }

  get level(): Level {
    return levelForExperience(this.experience)
  }

  /** 経験値 100 × 倍率を得る。Lv30 では経験値が増えない。 */
  train(expMultiplier = 1): { mobimon: OwnedMobimon; event: MobimonTrained } {
    if (!(expMultiplier > 0)) throw new DomainError(`経験値の倍率が不正です: ${expMultiplier}`)
    const cap = experienceToReach(MAX_LEVEL)
    const next = Math.min(
      cap,
      this.experience + Math.round(EXPERIENCE_PER_TRAINING * expMultiplier),
    )
    const mobimon = new OwnedMobimon(this.id, this.playerId, this.speciesId, experience(next))
    return {
      mobimon,
      event: {
        type: 'MobimonTrained',
        ownedMobimonId: this.id,
        gainedExperience: next - this.experience,
        level: mobimon.level,
        leveledUp: mobimon.level > this.level,
      },
    }
  }

  /** 条件レベルに達していて、進化先に含まれる種にだけ進化できる。レベル・経験値は引き継ぐ。 */
  evolve(
    current: MobimonSpecies,
    to: MobimonSpeciesId,
  ): { mobimon: OwnedMobimon; event: MobimonEvolved } {
    if (current.id !== this.speciesId) {
      throw new DomainError(`種が一致しません: ${current.id} / ${this.speciesId}`)
    }
    if (current.evolutionLevel === null) throw new DomainError(`${current.name}は進化しません`)
    if (!current.evolvesTo.includes(to)) {
      throw new DomainError(`${current.name}は ${to} に進化できません`)
    }
    if (this.level < current.evolutionLevel) {
      throw new DomainError(
        `${current.name}の進化には Lv${current.evolutionLevel} が必要です(現在 Lv${this.level})`,
      )
    }
    return {
      mobimon: new OwnedMobimon(this.id, this.playerId, to, this.experience),
      event: {
        type: 'MobimonEvolved',
        ownedMobimonId: this.id,
        playerId: this.playerId,
        fromSpeciesId: this.speciesId,
        toSpeciesId: to,
      },
    }
  }
}
