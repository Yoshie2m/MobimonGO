import type { BusinessField } from './BusinessField.ts'
import { isUnlocked, type EncounterCondition } from './EncounterCondition.ts'
import type { MobimonSpeciesId } from './ids.ts'
import type { CumulativeSteps } from './quantities.ts'
import type { Rarity } from './Rarity.ts'
import type { TimeOfDay } from './TimeOfDay.ts'

/** モビモンの種類(マスターデータ・参照専用)。図鑑の1エントリに対応する。 */
export interface MobimonSpecies {
  readonly id: MobimonSpeciesId
  readonly name: string
  readonly rarity: Rarity
  readonly condition: EncounterCondition
  /** どの事業分野にも属さない種(デンまる)は null。 */
  readonly businessField: BusinessField | null
  readonly product: string | null
  readonly component: string | null
  /** 進化先。分岐する種は複数、進化しない種は空。 */
  readonly evolvesTo: readonly MobimonSpeciesId[]
  /** 進化に必要なレベル(系統の1段階目は 10、2段階目は 20)。進化しない種は null。 */
  readonly evolutionLevel: number | null
  readonly description: string
  /**
   * 出現しない種(引退した種)。ID と図鑑の登録・所持モビモンは残し、出現候補にだけ入らない。
   * 図鑑の総数・コンプリートの範囲には含める。
   */
  readonly retired: boolean
}

/** 時間帯と累計歩数から、その種が出現候補になるか。 */
export function canAppear(
  species: MobimonSpecies,
  timeOfDay: TimeOfDay,
  steps: CumulativeSteps,
): boolean {
  return (
    !species.retired &&
    species.condition.timesOfDay.has(timeOfDay) &&
    isUnlocked(species.condition, steps)
  )
}
