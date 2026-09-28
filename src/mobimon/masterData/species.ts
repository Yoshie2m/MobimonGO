import mobimonList from '../../../MOBIMON_LIST.md?raw'
import { neverAppearsCondition } from '../domain/EncounterCondition.ts'
import type { MobimonSpeciesId } from '../domain/ids.ts'
import type { MobimonSpecies } from '../domain/MobimonSpecies.ts'
import { parseMobimonList } from './parseMobimonList.ts'

/** モビモン種のマスターデータ(151種)。MOBIMON_LIST.md(確定版)を唯一の元データとする。 */
export const SPECIES: readonly MobimonSpecies[] = parseMobimonList(mobimonList)

const byId = new Map(SPECIES.map((s) => [s.id, s]))

/**
 * 種を探す。マスターデータにない ID(種を統合・削除した場合など)でも画面を止めないよう、
 * 「不明なモビモン」を返し、警告をログに残す。
 */
export function findSpeciesOrUnknown(id: MobimonSpeciesId): MobimonSpecies {
  const species = byId.get(id)
  if (species) return species
  console.warn(`マスターデータにないモビモン種の ID です: ${id}`)
  return {
    id,
    name: '不明なモビモン',
    rarity: 'コモン',
    condition: neverAppearsCondition(),
    businessField: null,
    product: null,
    component: null,
    evolvesTo: [],
    evolutionLevel: null,
    description: `マスターデータにない種です(ID: ${id})。`,
    retired: true,
  }
}

export function findSpecies(id: MobimonSpeciesId): MobimonSpecies {
  const species = byId.get(id)
  if (!species) throw new Error(`モビモン種が見つかりません: ${id}`)
  return species
}
