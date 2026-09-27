import { DomainError } from '../../shared/DomainError.ts'
import type { MobimonCaptured, MobimonEncountered } from './events.ts'
import type { EncounterId, MobimonSpeciesId, PlayerId } from './ids.ts'

export type EncounterState = '出現中' | '捕獲済み' | '逃走'

/** プレイヤーの前にモビモンが現れたこと。捕獲済み・逃走済みの出現は再度捕獲できない。 */
export class Encounter {
  readonly id: EncounterId
  readonly playerId: PlayerId
  readonly speciesId: MobimonSpeciesId
  readonly state: EncounterState

  private constructor(
    id: EncounterId,
    playerId: PlayerId,
    speciesId: MobimonSpeciesId,
    state: EncounterState,
  ) {
    this.id = id
    this.playerId = playerId
    this.speciesId = speciesId
    this.state = state
  }

  static appear(
    id: EncounterId,
    playerId: PlayerId,
    speciesId: MobimonSpeciesId,
  ): { encounter: Encounter; event: MobimonEncountered } {
    return {
      encounter: new Encounter(id, playerId, speciesId, '出現中'),
      event: { type: 'MobimonEncountered', encounterId: id, playerId, speciesId },
    }
  }

  static reconstruct(
    id: EncounterId,
    playerId: PlayerId,
    speciesId: MobimonSpeciesId,
    state: EncounterState,
  ): Encounter {
    return new Encounter(id, playerId, speciesId, state)
  }

  capture(): { encounter: Encounter; event: MobimonCaptured } {
    this.assertAppeared('捕獲')
    return {
      encounter: new Encounter(this.id, this.playerId, this.speciesId, '捕獲済み'),
      event: {
        type: 'MobimonCaptured',
        encounterId: this.id,
        playerId: this.playerId,
        speciesId: this.speciesId,
      },
    }
  }

  flee(): Encounter {
    this.assertAppeared('逃走')
    return new Encounter(this.id, this.playerId, this.speciesId, '逃走')
  }

  private assertAppeared(action: string) {
    if (this.state !== '出現中') {
      throw new DomainError(`${this.state}の出現は${action}できません`)
    }
  }
}
