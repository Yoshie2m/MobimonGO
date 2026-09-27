/**
 * 画面(ui/)から使う、歩数の取り込みの入口。
 * ui/ は application/ だけを呼ぶため、腐敗防止層の読み取り処理もここから公開する。
 */
export { parseManualEntry, type ManualEntryResult } from '../acl/manualEntry.ts'
export {
  MAX_READABLE_STEPS,
  parseStepText,
  stepValueError,
  type StepReading,
} from '../acl/StepReading.ts'
export {
  toStepReadings,
  type StepCalendar,
  type StepCalendarResult,
} from '../acl/screenCapture/parseStepCalendar.ts'
export type {
  ImportedDay,
  NotImportedDay,
  StepImportResult,
  StepSource,
  WalkerStatus,
} from './StepResourceService.ts'

import type { StepCalendarResult } from '../acl/screenCapture/parseStepCalendar.ts'
import type { StepReading } from '../acl/StepReading.ts'
import type { StepImportResult, StepSource, WalkerStatus } from './StepResourceService.ts'

/** 取り込み画面が使う操作。 */
export interface StepImportUseCases {
  getStatus(): WalkerStatus
  importSteps(readings: readonly StepReading[], source: StepSource): StepImportResult
  recognizeStepCalendar(image: Blob): Promise<StepCalendarResult>
}
