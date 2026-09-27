import type { BusinessField } from './BusinessField.ts'
import type { EncounterId, ItemId, MobimonSpeciesId, OwnedMobimonId, PlayerId } from './ids.ts'

export interface MobimonEncountered {
  type: 'MobimonEncountered'
  encounterId: EncounterId
  playerId: PlayerId
  speciesId: MobimonSpeciesId
}

/** 捕獲に成功した。購読者: Mobidex(図鑑登録)。 */
export interface MobimonCaptured {
  type: 'MobimonCaptured'
  encounterId: EncounterId
  playerId: PlayerId
  speciesId: MobimonSpeciesId
}

export interface MobimonTrained {
  type: 'MobimonTrained'
  ownedMobimonId: OwnedMobimonId
  gainedExperience: number
  level: number
  leveledUp: boolean
}

/** 進化した。購読者: Mobidex(進化先の種を図鑑登録)。 */
export interface MobimonEvolved {
  type: 'MobimonEvolved'
  ownedMobimonId: OwnedMobimonId
  playerId: PlayerId
  fromSpeciesId: MobimonSpeciesId
  toSpeciesId: MobimonSpeciesId
}

/** 図鑑のコンプリート・節目。 */
export type MobidexScope = { kind: 'field'; field: BusinessField } | { kind: 'full' }
export type Milestone = { kind: 'count'; count: number } | { kind: 'specialSpecies' }

/** 図鑑がコンプリートされた。購読者: 報酬付与。 */
export interface MobidexCompleted {
  type: 'MobidexCompleted'
  playerId: PlayerId
  scope: MobidexScope
}

/** 登録数の節目、またはデンまるの初登録に達した。購読者: 報酬付与。 */
export interface MobidexMilestoneReached {
  type: 'MobidexMilestoneReached'
  playerId: PlayerId
  milestone: Milestone
}

export interface ItemPurchased {
  type: 'ItemPurchased'
  playerId: PlayerId
  itemId: ItemId
  quantity: number
  price: number
}

export interface ItemUsed {
  type: 'ItemUsed'
  playerId: PlayerId
  itemId: ItemId
}

export type MobimonDomainEvent =
  | MobimonEncountered
  | MobimonCaptured
  | MobimonTrained
  | MobimonEvolved
  | MobidexCompleted
  | MobidexMilestoneReached
  | ItemPurchased
  | ItemUsed
