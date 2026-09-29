import type { StepResourceEvent } from '../../publishedLanguage/stepResourceEvents.ts'
import type { Clock } from '../../shared/Clock.ts'
import { DomainError } from '../../shared/DomainError.ts'
import type { EventBus } from '../../shared/EventBus.ts'
import type { IdGenerator } from '../../shared/IdGenerator.ts'
import { localDateOf, parseLocalDate, type LocalDate } from '../../shared/LocalDate.ts'
import { stepValueError, type StepReading } from '../acl/StepReading.ts'
import { sumCumulativeSteps } from '../domain/CumulativeStepsCalculator.ts'
import { countedDailySteps } from '../domain/ConversionRule.ts'
import { DailyGrant } from '../domain/DailyGrant.ts'
import { StepGoal } from '../domain/PointAwardRule.ts'
import type { StepsRecorded } from '../domain/events.ts'
import { grantId } from '../domain/GrantId.ts'
import { StepRecord, type StepSource } from '../domain/StepRecord.ts'
import { energyToGrant } from '../domain/StepConverter.ts'
import { pointsToGrant } from '../domain/StepGoalEvaluator.ts'
import type { StepResourceRepository, StepResourceState } from '../domain/StepResourceRepository.ts'
import { Walker, walkerId as toWalkerId, type WalkerId } from '../domain/Walker.ts'

export type { StepSource }

export interface ImportedDay {
  date: string
  steps: number
  energy: number
  points: number
}

export interface NotImportedDay {
  date: string
  reason: string
}

export interface StepImportResult {
  imported: ImportedDay[]
  /** 利用開始日より前・今日より後などで取り込まなかった日。 */
  skipped: NotImportedDay[]
  /** 歩数を減らす更新など、ルールに反するため受け付けなかった日。 */
  rejected: NotImportedDay[]
  cumulativeSteps: number
}

export interface WalkerStatus {
  startDate: string
  today: string
  todaySteps: number
  cumulativeSteps: number
  /** 目標歩数(全ユーザー共通)。 */
  stepGoal: number
  /** 今日の歩数に対して付与済みのエネルギー・ポイント。 */
  todayGrantedEnergy: number
  todayGrantedPoints: number
}

/** 歩数リソース変換コンテキストのユースケース。 */
export class StepResourceService {
  private readonly repository: StepResourceRepository
  private readonly clock: Clock
  private readonly ids: IdGenerator
  private readonly events: EventBus<StepResourceEvent>

  constructor(
    repository: StepResourceRepository,
    clock: Clock,
    ids: IdGenerator,
    events: EventBus<StepResourceEvent>,
  ) {
    this.repository = repository
    this.clock = clock
    this.ids = ids
    this.events = events
  }

  /** ウォーカーを登録する(登録済みなら何もしない)。利用開始日は今日。 */
  registerWalker(id: string): void {
    const state = this.repository.load()
    if (state.walkers.some((w) => w.id === id)) return
    state.walkers.push(Walker.register(toWalkerId(id), this.today()))
    this.repository.save(state)
  }

  getStatus(id: string): WalkerStatus {
    const state = this.repository.load()
    const walker = this.findWalker(state, toWalkerId(id))
    const records = state.stepRecords.filter((r) => r.walkerId === walker.id)
    const today = this.today()
    const grant = state.dailyGrants.find((g) => g.walkerId === walker.id && g.date === today)
    return {
      startDate: walker.startDate,
      today,
      todaySteps: records.find((r) => r.date === today)?.steps ?? 0,
      cumulativeSteps: sumCumulativeSteps(records),
      stepGoal: StepGoal,
      todayGrantedEnergy: grant?.grantedEnergy ?? 0,
      todayGrantedPoints: grant?.grantedPoints ?? 0,
    }
  }

  /**
   * 読み取った歩数を取り込み、増えた分のエネルギー・ポイントを付与する。
   * 状態は1回の保存でまとめて確定し、その後に Published Language のイベントを発行する。
   */
  importSteps(id: string, readings: readonly StepReading[], source: StepSource): StepImportResult {
    const state = this.repository.load()
    const walker = this.findWalker(state, toWalkerId(id))
    const today = this.today()
    const before = sumCumulativeSteps(state.stepRecords.filter((r) => r.walkerId === walker.id))
    const result: StepImportResult = { imported: [], skipped: [], rejected: [], cumulativeSteps: 0 }
    const published: StepResourceEvent[] = []

    for (const reading of latestPerDate(readings)) {
      let date: LocalDate
      try {
        date = parseLocalDate(reading.date)
      } catch (e) {
        result.rejected.push({ date: reading.date, reason: messageOf(e) })
        continue
      }
      const valueError = stepValueError(reading.steps)
      if (valueError) {
        result.rejected.push({ date, reason: valueError })
        continue
      }
      if (!walker.canRecord(date, today)) {
        result.skipped.push({
          date,
          reason: date < walker.startDate ? '利用開始日より前の日です' : '今日より後の日です',
        })
        continue
      }

      let recorded: { record: StepRecord; event: StepsRecorded }
      const index = state.stepRecords.findIndex((r) => r.walkerId === walker.id && r.date === date)
      try {
        recorded =
          index >= 0
            ? state.stepRecords[index].update(reading.steps, source)
            : StepRecord.record(walker, date, reading.steps, source, today)
      } catch (e) {
        result.rejected.push({ date, reason: messageOf(e) })
        continue
      }
      if (index >= 0) state.stepRecords[index] = recorded.record
      else state.stepRecords.push(recorded.record)

      // StepsRecorded の購読者(StepConverter / StepGoalEvaluator)を同じ保存単位の中で処理する
      const { energy, points } = this.grantFor(state, recorded.record, published)
      published.push({
        type: 'DailyStepsCounted',
        walkerId: walker.id,
        date,
        steps: countedDailySteps(recorded.record.steps),
      })
      result.imported.push({ date, steps: recorded.record.steps, energy, points })
    }

    const after = sumCumulativeSteps(state.stepRecords.filter((r) => r.walkerId === walker.id))
    result.cumulativeSteps = after
    if (after !== before) {
      published.push({
        type: 'CumulativeStepsUpdated',
        walkerId: walker.id,
        cumulativeSteps: after,
      })
    }

    this.repository.save(state)
    for (const event of published) this.events.publish(event)
    return result
  }

  private grantFor(state: StepResourceState, record: StepRecord, published: StepResourceEvent[]) {
    const index = state.dailyGrants.findIndex(
      (g) => g.walkerId === record.walkerId && g.date === record.date,
    )
    const grant =
      index >= 0 ? state.dailyGrants[index] : DailyGrant.empty(record.walkerId, record.date)
    const energy = energyToGrant(record, grant)
    const points = pointsToGrant(record, grant)
    const updated = grant.recordGrant(energy, points)
    if (index >= 0) state.dailyGrants[index] = updated
    else state.dailyGrants.push(updated)

    const base = { walkerId: record.walkerId, date: record.date }
    if (energy > 0) {
      published.push({ type: 'EnergyGranted', grantId: grantId(this.ids.next()), ...base, energy })
    }
    if (points > 0) {
      published.push({ type: 'PointsGranted', grantId: grantId(this.ids.next()), ...base, points })
    }
    return { energy, points }
  }

  private findWalker(state: StepResourceState, id: WalkerId): Walker {
    const walker = state.walkers.find((w) => w.id === id)
    if (!walker) throw new DomainError(`ウォーカーが登録されていません: ${id}`)
    return walker
  }

  private today(): LocalDate {
    return localDateOf(this.clock.now())
  }
}

/** 同じ日付が複数あれば、後に入力されたものを使う。 */
function latestPerDate(readings: readonly StepReading[]): StepReading[] {
  return [...new Map(readings.map((r) => [r.date, r])).values()]
}

function messageOf(e: unknown): string {
  if (e instanceof DomainError) return e.message
  throw e
}
