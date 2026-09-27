/** プレイヤーの ID。歩数リソース変換の WalkerId と同じ値を使う。 */
export type PlayerId = string & { readonly __brand: 'PlayerId' }
/** モビモン種の ID(例: M001)。 */
export type MobimonSpeciesId = string & { readonly __brand: 'MobimonSpeciesId' }
export type OwnedMobimonId = string & { readonly __brand: 'OwnedMobimonId' }
export type EncounterId = string & { readonly __brand: 'EncounterId' }
export type ItemId = string & { readonly __brand: 'ItemId' }
export type TitleId = string & { readonly __brand: 'TitleId' }
/** 歩数リソース変換から受け取った付与イベントの ID。 */
export type GrantId = string & { readonly __brand: 'GrantId' }

export const playerId = (v: string) => v as PlayerId
export const mobimonSpeciesId = (v: string) => v as MobimonSpeciesId
export const ownedMobimonId = (v: string) => v as OwnedMobimonId
export const encounterId = (v: string) => v as EncounterId
export const itemId = (v: string) => v as ItemId
export const titleId = (v: string) => v as TitleId
export const grantId = (v: string) => v as GrantId
