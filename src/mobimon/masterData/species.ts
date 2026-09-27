import mobimonList from '../../../MOBIMON_LIST.md?raw'
import type { MobimonSpeciesId } from '../domain/ids.ts'
import type { MobimonSpecies } from '../domain/MobimonSpecies.ts'
import { parseMobimonList } from './parseMobimonList.ts'

/** モビモン種のマスターデータ(151種)。MOBIMON_LIST.md(確定版)を唯一の元データとする。 */
export const SPECIES: readonly MobimonSpecies[] = parseMobimonList(mobimonList)

const byId = new Map(SPECIES.map((s) => [s.id, s]))

export function findSpecies(id: MobimonSpeciesId): MobimonSpecies {
  const species = byId.get(id)
  if (!species) throw new Error(`モビモン種が見つかりません: ${id}`)
  return species
}
