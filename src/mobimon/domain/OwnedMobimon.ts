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
  /** 休養が明ける日(この日から戻る)。休養したことがなければ null。 */
  readonly restUntil: string | null

  private constructor(
    id: OwnedMobimonId,
    playerId: PlayerId,
    speciesId: MobimonSpeciesId,
    exp: Experience,
    restUntil: string | null = null,
  ) {
    this.id = id
    this.playerId = playerId
    this.speciesId = speciesId
    this.experience = exp
    this.restUntil = restUntil
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
    restUntil: string | null = null,
  ): OwnedMobimon {
    return new OwnedMobimon(id, playerId, speciesId, experience(exp), restUntil)
  }

  get level(): Level {
    return levelForExperience(this.experience)
  }

  /** today に休養中か(休養が明ける日の前日まで)。 */
  isResting(today: string): boolean {
    return this.restUntil !== null && today < this.restUntil
  }

  /** 休養に入る。until は休養が明ける日。 */
  rest(until: string): OwnedMobimon {
    return new OwnedMobimon(this.id, this.playerId, this.speciesId, this.experience, until)
  }

  /** 経験値を得る(仕事の成功など)。Lv30 では経験値が増えない。 */
  gainExperience(amount: number): { mobimon: OwnedMobimon; event: MobimonTrained } {
    const next = Math.min(experienceToReach(MAX_LEVEL), this.experience + amount)
    const mobimon = new OwnedMobimon(
      this.id,
      this.playerId,
      this.speciesId,
      experience(next),
      this.restUntil,
    )
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

  /** 経験値 100 × 倍率を得る。Lv30 では経験値が増えない。休養中は育成できない。 */
  train(expMultiplier = 1, today?: string): { mobimon: OwnedMobimon; event: MobimonTrained } {
    if (!(expMultiplier > 0)) throw new DomainError(`経験値の倍率が不正です: ${expMultiplier}`)
    if (today !== undefined && this.isResting(today)) {
      throw new DomainError('休養中のモビモンは育成できません')
    }
    return this.gainExperience(Math.round(EXPERIENCE_PER_TRAINING * expMultiplier))
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
      mobimon: new OwnedMobimon(this.id, this.playerId, to, this.experience, this.restUntil),
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
