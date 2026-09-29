/**
 * 画面(ui/)から使う、Mobimon のゲーム操作の入口。
 * ユーザーの ID は組み立て側(composition)で束ねるので、画面は意識しない。
 */
import type {
  CaptureResult,
  EncounterView,
  EvolveResult,
  MobidexView,
  OwnedMobimonView,
  PlayerSummary,
  ShopItemView,
  TrainResult,
} from './MobimonService.ts'

export type {
  CaptureResult,
  EncounterView,
  EvolveResult,
  MobidexEntryView,
  MobidexView,
  OwnedMobimonView,
  PlayerSummary,
  RewardView,
  ShopItemView,
  TrainResult,
} from './MobimonService.ts'
export { BUSINESS_FIELDS, type BusinessField } from '../domain/BusinessField.ts'
export { TEAM_FIELDS, type TeamField } from '../domain/Organization.ts'
export type {
  DirectReportView,
  OrganizationView,
  TeamMemberView,
  TeamView,
} from './OrganizationService.ts'

export type { ActiveJobView, JobOfferView, JobsView } from './JobService.ts'

import type { JobsView } from './JobService.ts'
import type { OrganizationView } from './OrganizationService.ts'

/** 仕事(掲示板・受注・辞退)の操作。 */
export interface JobUseCases {
  getJobs(): JobsView
  accept(offerKey: string): void
  decline(jobId: string): void
}

/** 組織(チームの編成)の操作。 */
export interface OrganizationUseCases {
  getOrganization(): OrganizationView
  setLeader(field: string, ownedId: string): void
  addDirectReport(field: string, ownedId: string): void
  setSubLeader(field: string, ownedId: string, isSubLeader: boolean): void
  addMemberUnder(field: string, subLeaderId: string, ownedId: string): void
  removeFromTeam(ownedId: string): void
}

export interface MobimonUseCases {
  getSummary(): PlayerSummary
  listOwnedMobimon(): OwnedMobimonView[]
  encounter(): EncounterView
  capture(encounterId: string): CaptureResult
  flee(encounterId: string): void
  train(ownedId: string): TrainResult
  evolve(ownedId: string, toSpeciesId: string): EvolveResult
  listShop(): ShopItemView[]
  purchase(itemId: string, quantity?: number): void
  useItem(itemId: string): void
  getMobidex(): MobidexView
}
