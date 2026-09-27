/** 付与イベント(EnergyGranted / PointsGranted)を一意に識別する ID。 */
export type GrantId = string & { readonly __brand: 'GrantId' }
export const grantId = (value: string) => value as GrantId
