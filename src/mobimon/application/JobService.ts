import type { Clock } from '../../shared/Clock.ts'
import { DomainError } from '../../shared/DomainError.ts'
import type { IdGenerator } from '../../shared/IdGenerator.ts'
import { localDateOf } from '../../shared/LocalDate.ts'
import { DailyStepLog } from '../domain/DailyStepLog.ts'
import { playerId as toPlayerId, type PlayerId } from '../domain/ids.ts'
import {
  daysBetween,
  DECLINE_LIMIT_DAYS,
  Job,
  jobId,
  type JobOffer,
  type JobPhase,
} from '../domain/Job.ts'
import { acceptableRanks, generateJobBoard, RANK_RULES, type JobRank } from '../domain/JobRank.ts'
import type { MobimonState } from '../domain/MobimonRepository.ts'
import type { MobimonRepository } from '../domain/MobimonRepository.ts'
import { TEAM_FIELDS, type TeamField, type TeamSnapshotLike } from '../domain/Organization.ts'
import { successRate } from '../domain/SuccessRate.ts'
import { JOB_TITLES } from '../masterData/jobTitles.ts'
import { lockedFields, lookupFor } from './OrganizationService.ts'

export interface JobOfferView {
  key: string
  field: TeamField
  rank: JobRank
  title: string
  days: number
  requiredSteps: number
  /** いまのチームで受注したときの成功の確率(%)。リーダーがいなければ null。 */
  successRate: number | null
  /** 受注できないときの理由。 */
  unavailableReason: string | null
}

export interface ActiveJobView {
  id: string
  field: TeamField
  rank: JobRank
  title: string
  countStartDate: string
  deadlineDate: string
  requiredSteps: number
  progress: number
  remaining: number
  /** 今日を含めて、納期までに数える残りの日数。 */
  daysLeft: number
  /** 残りの歩数を残りの日数で割った、1日あたりの目安。 */
  stepsPerDay: number
  phase: JobPhase
  successRate: number
  /** 辞退できないときの理由(できるなら null)。 */
  declineBlocker: string | null
}

export interface JobsView {
  today: string
  board: JobOfferView[]
  activeJobs: ActiveJobView[]
  /** 直近7日間に、あと何回辞退できるか。 */
  declinesLeft: number
}

/** 仕事の掲示板・受注・辞退のユースケース(組織と仕事・段階2)。判定は段階3。 */
export class JobService {
  private readonly repository: MobimonRepository
  private readonly clock: Clock
  private readonly ids: IdGenerator

  constructor(repository: MobimonRepository, clock: Clock, ids: IdGenerator) {
    this.repository = repository
    this.clock = clock
    this.ids = ids
  }

  getJobs(id: string): JobsView {
    const state = this.repository.load()
    const now = this.clock.now()
    const today = localDateOf(now)
    const ctx = this.context(state, id)
    const recent = recentDeclines(state, ctx.pid, now)

    const board = todaysBoard(today).map((offer): JobOfferView => {
      const team = ctx.organization.snapshot(offer.field)
      const rule = RANK_RULES[offer.rank]
      return {
        key: offer.key,
        field: offer.field,
        rank: offer.rank,
        title: offer.title,
        days: rule.days,
        requiredSteps: rule.requiredSteps,
        successRate: team ? successRate(rule, strength(state, team)) : null,
        unavailableReason: this.acceptBlocker(state, ctx, offer) ?? null,
      }
    })

    const activeJobs = activeJobsOf(state, ctx.pid).map((job): ActiveJobView => {
      const progress = job.progress(ctx.log, today)
      const remaining = Math.max(0, job.requiredSteps - progress)
      const from = today > job.countStartDate ? today : job.countStartDate
      const daysLeft = Math.max(0, daysBetween(from, job.deadlineDate) + 1)
      return {
        id: job.id,
        field: job.field,
        rank: job.rank,
        title: job.title,
        countStartDate: job.countStartDate,
        deadlineDate: job.deadlineDate,
        requiredSteps: job.requiredSteps,
        progress,
        remaining,
        daysLeft,
        stepsPerDay: daysLeft > 0 ? Math.ceil(remaining / daysLeft) : 0,
        phase: job.phase(ctx.log, today),
        successRate: job.successRate,
        declineBlocker: job.declineBlocker(now, recent) ?? null,
      }
    })

    return { today, board, activeJobs, declinesLeft: Math.max(0, 1 - recent) }
  }

  accept(id: string, offerKey: string): void {
    const state = this.repository.load()
    const now = this.clock.now()
    const today = localDateOf(now)
    const ctx = this.context(state, id)
    const offer = todaysBoard(today).find((o) => o.key === offerKey)
    if (!offer) throw new DomainError('この仕事は、今日の掲示板にありません')
    const blocker = this.acceptBlocker(state, ctx, offer)
    if (blocker) throw new DomainError(blocker)

    const team = ctx.organization.snapshot(offer.field)!
    state.jobs.push(
      Job.accept({
        id: jobId(this.ids.next()),
        playerId: ctx.pid,
        offer,
        now,
        today,
        log: ctx.log,
        team,
        successRate: successRate(RANK_RULES[offer.rank], strength(state, team)),
      }),
    )
    this.repository.save(state)
  }

  decline(id: string, targetJobId: string): void {
    const state = this.repository.load()
    const now = this.clock.now()
    const pid = toPlayerId(id)
    const index = state.jobs.findIndex((j) => j.id === targetJobId && j.playerId === pid)
    if (index < 0) throw new DomainError('仕事が見つかりません')
    state.jobs[index] = state.jobs[index].decline(now, recentDeclines(state, pid, now))
    this.repository.save(state)
  }

  private acceptBlocker(
    state: MobimonState,
    ctx: ReturnType<JobService['context']>,
    offer: JobOffer,
  ): string | undefined {
    const team = ctx.organization.snapshot(offer.field)
    if (!team) return 'このチームにはリーダーがいません'
    const leader = ctx.lookup(team.leader)
    if (!acceptableRanks(leader?.rarity ?? null).includes(offer.rank)) {
      return `リーダーのレア度(${leader?.rarity ?? '不明'})では、${offer.rank} ランクの仕事を受けられません`
    }
    if (lockedFields(state, ctx.pid).has(offer.field)) {
      return 'このチームは、ほかの仕事を受けています'
    }
    return undefined
  }

  private context(state: MobimonState, id: string) {
    const pid = toPlayerId(id)
    const organization = state.organizations.find((o) => o.playerId === pid)
    if (!organization) throw new DomainError(`組織がありません: ${id}`)
    const log = state.dailyStepLogs.find((l) => l.playerId === pid) ?? DailyStepLog.create(pid)
    return { pid, organization, log, lookup: lookupFor(state, pid).lookup }
  }
}

function activeJobsOf(state: MobimonState, pid: PlayerId): Job[] {
  return state.jobs.filter((j) => j.playerId === pid && j.status === '進行中')
}

/** 直近7日間に辞退した回数。 */
function recentDeclines(state: MobimonState, pid: PlayerId, now: Date): number {
  const since = now.getTime() - DECLINE_LIMIT_DAYS * 24 * 60 * 60 * 1000
  return state.jobs.filter(
    (j) => j.playerId === pid && j.declinedAt !== null && new Date(j.declinedAt).getTime() > since,
  ).length
}

function todaysBoard(today: string): JobOffer[] {
  return generateJobBoard(today, TEAM_FIELDS, (field, rank) => JOB_TITLES[field][rank])
}

function strength(state: MobimonState, team: TeamSnapshotLike) {
  const leader = state.ownedMobimons.find((o) => o.id === team.leader)
  return {
    leaderLevel: leader?.level ?? 1,
    subLeaders: team.subLeaders.length,
    members: team.members.length,
  }
}
