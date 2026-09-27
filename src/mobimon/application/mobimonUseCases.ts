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
