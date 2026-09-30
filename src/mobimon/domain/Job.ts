import { DomainError } from '../../shared/DomainError.ts'
import type { DailyStepLog } from './DailyStepLog.ts'
import type { PlayerId } from './ids.ts'
import { pickVariant, type JobRank } from './JobRank.ts'
import type { TeamField, TeamSnapshotLike } from './Organization.ts'

export type JobId = string & { readonly __brand: 'JobId' }
export const jobId = (v: string) => v as JobId

/** 辞退できるのは受注から24時間以内。 */
export const DECLINE_WINDOW_MS = 24 * 60 * 60 * 1000
/** 辞退できるのは、直近7日間で1回まで。 */
export const DECLINE_LIMIT_DAYS = 7

export type JobStatus = '進行中' | '辞退' | '成功' | '失敗'

/** 進行中の仕事の、進み具合から見た段階。歩き切った・納期切れなら判定できる。 */
export type JobPhase = '進行中' | '歩き切った' | '納期切れ'

/** 掲示板に出ている仕事(その日の仕事)。 */
export interface JobOffer {
  /** 掲示板の中の識別子(日付・事業分野・ランク)。 */
  key: string
  date: string
  field: TeamField
  rank: JobRank
  title: string
}

/** 受注したときのチーム編成(受注中はチームを組み替えられない)。Organization.snapshot() で作る。 */
export type TeamSnapshot = TeamSnapshotLike

/** 受注した仕事の中身(保存データからの復元に使う)。 */
export interface JobProps {
  id: JobId
  playerId: PlayerId
  field: TeamField
  rank: JobRank
  title: string
  acceptedAt: string
  countStartDate: string
  deadlineDate: string
  requiredSteps: number
  successRate: number
  team: TeamSnapshot
  status: JobStatus
  declinedAt: string | null
  judgedAt: string | null
}

/** 判定の結果。失敗の理由は、納期に間に合わなかった / 歩き切ったが判定で外れた。 */
export type JudgeOutcome =
  { success: true } | { success: false; reason: '納期に間に合わなかった' | '判定で失敗した' }

/**
 * 受注した仕事。受注したときの条件(納期・業務達成歩数・成功の確率)のまま進める。
 * 進み具合は、数え始める日から納期までの日ごとの歩数(1日 20,000歩で頭打ち)の合計。
 */
export class Job {
  readonly id: JobId
  readonly playerId: PlayerId
  readonly field: TeamField
  readonly rank: JobRank
  readonly title: string
  readonly acceptedAt: string
  /** 数え始める日(受注した日。ただし、その日の歩数を取り込み済みなら翌日)。 */
  readonly countStartDate: string
  /** 納期(この日までの歩数を数える)。 */
  readonly deadlineDate: string
  readonly requiredSteps: number
  /** 受注したときに決まった成功の確率(%)。 */
  readonly successRate: number
  readonly team: TeamSnapshot
  readonly status: JobStatus
  readonly declinedAt: string | null
  readonly judgedAt: string | null

  private constructor(p: JobProps) {
    this.id = p.id
    this.playerId = p.playerId
    this.field = p.field
    this.rank = p.rank
    this.title = p.title
    this.acceptedAt = p.acceptedAt
    this.countStartDate = p.countStartDate
    this.deadlineDate = p.deadlineDate
    this.requiredSteps = p.requiredSteps
    this.successRate = p.successRate
    this.team = p.team
    this.status = p.status
    this.declinedAt = p.declinedAt
    this.judgedAt = p.judgedAt
  }

  static accept(p: {
    id: JobId
    playerId: PlayerId
    offer: JobOffer
    now: Date
    today: string
    log: DailyStepLog
    team: TeamSnapshot
    successRate: number
  }): Job {
    const variant = pickVariant(p.offer.date, p.offer.field, p.offer.rank)
    // 受注した時点でその日の歩数を取り込み済みなら、翌日から数える(夜に歩いたあとで受注する抜け道を防ぐ)
    const countStartDate = p.log.hasRecorded(p.today) ? addDays(p.today, 1) : p.today
    return new Job({
      id: p.id,
      playerId: p.playerId,
      field: p.offer.field,
      rank: p.offer.rank,
      title: p.offer.title,
      acceptedAt: p.now.toISOString(),
      countStartDate,
      deadlineDate: addDays(countStartDate, variant.days - 1),
      requiredSteps: variant.requiredSteps,
      successRate: p.successRate,
      team: p.team,
      status: '進行中',
      declinedAt: null,
      judgedAt: null,
    })
  }

  static reconstruct(p: JobProps): Job {
    return new Job(p)
  }

  /** 数え始める日から納期(または今日)までの歩数の合計。 */
  progress(log: DailyStepLog, today: string): number {
    let total = 0
    for (let d = this.countStartDate; d <= this.deadlineDate && d <= today; d = addDays(d, 1)) {
      total += log.stepsOn(d)
    }
    return total
  }

  phase(log: DailyStepLog, today: string): JobPhase {
    if (this.progress(log, today) >= this.requiredSteps) return '歩き切った'
    if (today > this.deadlineDate) return '納期切れ'
    return '進行中'
  }

  /**
   * 判定する。納期までに歩き切れなければ失敗。歩き切ったら、受注したときの成功の確率で判定する。
   * 歩き切れば納期の前でも判定できる。random は 0 以上 1 未満。
   */
  judge(p: { log: DailyStepLog; today: string; now: Date; random: () => number }): {
    job: Job
    outcome: JudgeOutcome
  } {
    if (this.status !== '進行中') throw new DomainError('進行中の仕事ではありません')
    const phase = this.phase(p.log, p.today)
    if (phase === '進行中')
      throw new DomainError('まだ判定できません(歩き切るか、納期を過ぎると判定できます)')
    const outcome: JudgeOutcome =
      phase === '納期切れ'
        ? { success: false, reason: '納期に間に合わなかった' }
        : p.random() * 100 < this.successRate
          ? { success: true }
          : { success: false, reason: '判定で失敗した' }
    const job = new Job({
      ...this,
      status: outcome.success ? '成功' : '失敗',
      judgedAt: p.now.toISOString(),
    })
    return { job, outcome }
  }

  /** 辞退できるか。できなければ理由を返す。 */
  declineBlocker(now: Date, recentDeclines: number): string | undefined {
    if (this.status !== '進行中') return '進行中の仕事ではありません'
    if (now.getTime() - new Date(this.acceptedAt).getTime() > DECLINE_WINDOW_MS) {
      return '辞退できるのは、受注から24時間以内です'
    }
    if (recentDeclines >= 1) return `辞退できるのは、${DECLINE_LIMIT_DAYS}日間に1回までです`
    return undefined
  }

  decline(now: Date, recentDeclines: number): Job {
    const blocker = this.declineBlocker(now, recentDeclines)
    if (blocker) throw new DomainError(blocker)
    return new Job({ ...this, status: '辞退', declinedAt: now.toISOString() })
  }
}

/** YYYY-MM-DD に日数を足す(端末のローカル時刻の日付として扱う)。 */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(y, m - 1, d + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`
}

/** 日付の差(to − from、日数)。 */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number)
  const [y2, m2, d2] = to.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}
