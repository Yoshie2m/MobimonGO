import type { BusinessField } from './BusinessField.ts'
import { encounterCondition } from './EncounterCondition.ts'
import { mobimonSpeciesId, playerId, type MobimonSpeciesId } from './ids.ts'
import type { MobimonSpecies } from './MobimonSpecies.ts'
import type { Rarity } from './Rarity.ts'
import { TIMES_OF_DAY, type TimeOfDay } from './TimeOfDay.ts'

export const PLAYER = playerId('user-1')

export function species(
  id: string,
  options: {
    rarity?: Rarity
    times?: TimeOfDay[]
    unlockSteps?: number
    field?: BusinessField | null
    evolvesTo?: MobimonSpeciesId[]
    evolutionLevel?: number | null
  } = {},
): MobimonSpecies {
  return {
    id: mobimonSpeciesId(id),
    name: id,
    rarity: options.rarity ?? 'コモン',
    condition: encounterCondition(options.times ?? TIMES_OF_DAY, options.unlockSteps ?? 0),
    businessField: options.field === undefined ? 'ホーム' : options.field,
    product: null,
    component: null,
    evolvesTo: options.evolvesTo ?? [],
    evolutionLevel: options.evolutionLevel ?? null,
    description: '',
  }
}
