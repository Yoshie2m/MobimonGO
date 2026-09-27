import type { BusinessField } from './BusinessField.ts'
import type { TitleId } from './ids.ts'

/** 称号を得られる達成。 */
export type TitleSource =
  | { kind: 'fieldCompletion'; field: BusinessField }
  | { kind: 'fullCompletion' }
  | { kind: 'specialSpecies'; speciesName: string }

/** 称号(マスターデータ・参照専用)。 */
export interface Title {
  readonly id: TitleId
  readonly name: string
  readonly source: TitleSource
}
