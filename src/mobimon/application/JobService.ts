import type { Clock } from '../../shared/Clock.ts'
import { DomainError } from '../../shared/DomainError.ts'
import type { IdGenerator } from '../../shared/IdGenerator.ts'
import { localDateOf } from '../../shared/LocalDate.ts'
import { DailyStepLog } from '../domain/DailyStepLog.ts'
import {
  drawHeadhunting,
  drawRest,
  headhuntingRightId,
  type HeadhuntingRight,
} from '../domain/Headhunting.ts'
import { ownedMobimonId, playerId as toPlayerId, type PlayerId } from '../domain/ids.ts'
import {
  daysBetween,
  DECLINE_LIMIT_DAYS,
  Job,
  jobId,
  type JobOffer,
  type JobPhase,
} from '../domain/Job.ts'
import { OwnedMobimon } from '../domain/OwnedMobimon.ts'
import {
  acceptableRanks,
  generateJobBoard,
  pickVariant,
  RANK_RULES,
  type JobRank,
} from '../domain/JobRank.ts'
import type { MobimonState } from '../domain/MobimonRepository.ts'
import type { MobimonRepository } from '../domain/MobimonRepository.ts'
import { TEAM_FIELDS, type TeamField, type TeamSnapshotLike } from '../domain/Organization.ts'
import { successRate } from '../domain/SuccessRate.ts'
import { JOB_TITLES } from '../masterData/jobTitles.ts'
import { findSpeciesOrUnknown, SPECIES } from '../masterData/species.ts'
import { ownedView, registerInMobidex, type CaptureResult } from './MobimonService.ts'
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
  /** 結果を見られるか(歩き切った、または納期を過ぎた)。 */
  canJudge: boolean
}

export interface HeadhuntingRightView {
  id: string
  field: TeamField
  rank: JobRank
}

export interface JudgeResult {
  title: string
  success: boolean
  /** 失敗の理由(成功なら null)。 */
  failureReason: string | null
  successRate: number
  /** 成功したときに経験値を得たモビモン。 */
  experience: { name: string; gained: number; level: number; leveledUp: boolean }[]
  /** 得たヘッドハンティングの権利の数。 */
  headhuntingRights: number
  /** 休養に入ったモビモン。 */
  rested: { name: string; days: number } | null
}

export interface JobsView {
  today: string
  board: JobOfferView[]
  activeJobs: ActiveJobView[]
  /** 直近7日間に、あと何回辞退できるか。 */
  declinesLeft: number
  /** 使っていないヘッドハンティングの権利。 */
  headhuntingRights: HeadhuntingRightView[]
}

/** 仕事の掲示板・受注・辞退・判定と、ヘッドハンティングのユースケース。 */
export class JobService {
  private readonly repository: MobimonRepository
  private readonly clock: Clock
  private readonly ids: IdGenerator
  private readonly random: () => number

  constructor(
    repository: MobimonRepository,
    clock: Clock,
    ids: IdGenerator,
    random: () => number = Math.random,
  ) {
    this.repository = repository
    this.clock = clock
    this.ids = ids
    this.random = random
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
      const variant = pickVariant(offer.date, offer.field, offer.rank)
      return {
        key: offer.key,
        field: offer.field,
        rank: offer.rank,
        title: offer.title,
        days: variant.days,
        requiredSteps: variant.requiredSteps,
        successRate: team ? successRate(rule, strength(state, team, today)) : null,
        unavailableReason: this.acceptBlocker(state, ctx, offer, today) ?? null,
      }
    })

    const activeJobs = activeJobsOf(state, ctx.pid).map((job): ActiveJobView => {
      const progress = job.progress(ctx.log, today)
      const remaining = Math.max(0, job.requiredSteps - progress)
      const from = today > job.countStartDate ? today : job.countStartDate
      const daysLeft = Math.max(0, daysBetween(from, job.deadlineDate) + 1)
      const phase = job.phase(ctx.log, today)
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
        phase,
        successRate: job.successRate,
        declineBlocker: job.declineBlocker(now, recent) ?? null,
        canJudge: phase !== '進行中',
      }
    })

    const headhuntingRights = state.headhuntingRights
      .filter((h) => h.playerId === ctx.pid)
      .map((h) => ({ id: h.id, field: h.field, rank: h.rank }))

    return {
      today,
      board,
      activeJobs,
      declinesLeft: Math.max(0, 1 - recent),
      headhuntingRights,
    }
  }

  accept(id: string, offerKey: string): void {
    const state = this.repository.load()
    const now = this.clock.now()
    const today = localDateOf(now)
    const ctx = this.context(state, id)
    const offer = todaysBoard(today).find((o) => o.key === offerKey)
    if (!offer) throw new DomainError('この仕事は、今日の掲示板にありません')
    const blocker = this.acceptBlocker(state, ctx, offer, today)
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
        successRate: successRate(RANK_RULES[offer.rank], strength(state, team, today)),
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

  /**
   * 歩き切った・納期を過ぎた仕事の結果を出す。成功ならチームの全員(休養中を除く)に経験値と、
   * ヘッドハンティングの権利を渡す。失敗なら、メンバーから1体が休養に入ることがある。
   */
  judge(id: string, targetJobId: string): JudgeResult {
    const state = this.repository.load()
    const now = this.clock.now()
    const today = localDateOf(now)
    const ctx = this.context(state, id)
    const index = state.jobs.findIndex((j) => j.id === targetJobId && j.playerId === ctx.pid)
    if (index < 0) throw new DomainError('仕事が見つかりません')
    const target = state.jobs[index]
    const { job, outcome } = target.judge({ log: ctx.log, today, now, random: this.random })
    state.jobs[index] = job
    const rule = RANK_RULES[job.rank]
    // 受注したときの候補(納期・業務達成歩数の組)を、固定された requiredSteps から特定する
    const variant =
      rule.variants.find((v) => v.requiredSteps === job.requiredSteps) ?? rule.variants[0]
    const owned = (oid: string) =>
      state.ownedMobimons.findIndex((o) => o.id === oid && o.playerId === ctx.pid)
    const nameOf = (m: OwnedMobimon) => findSpeciesOrUnknown(m.speciesId).name

    const result: JudgeResult = {
      title: job.title,
      success: outcome.success,
      failureReason: outcome.success ? null : outcome.reason,
      successRate: job.successRate,
      experience: [],
      headhuntingRights: 0,
      rested: null,
    }

    if (outcome.success) {
      const team = [job.team.leader, ...job.team.subLeaders, ...job.team.members]
      for (const oid of team) {
        const i = owned(oid)
        if (i < 0 || state.ownedMobimons[i].isResting(today)) continue
        const { mobimon, event } = state.ownedMobimons[i].gainExperience(variant.experience)
        state.ownedMobimons[i] = mobimon
        result.experience.push({
          name: nameOf(mobimon),
          gained: event.gainedExperience,
          level: event.level,
          leveledUp: event.leveledUp,
        })
      }
      for (let n = 0; n < rule.headhunts; n++) {
        state.headhuntingRights.push({
          id: headhuntingRightId(this.ids.next()),
          playerId: ctx.pid,
          field: job.field,
          rank: job.rank,
          grantedAt: now.toISOString(),
        })
      }
      result.headhuntingRights = rule.headhunts
    } else {
      const rest = drawRest(
        {
          rank: job.rank,
          outcome,
          team: job.team,
          today,
          canRest: (oid) => {
            const i = owned(oid)
            return i >= 0 && !state.ownedMobimons[i].isResting(today)
          },
        },
        this.random,
      )
      if (rest) {
        const i = owned(rest.id)
        state.ownedMobimons[i] = state.ownedMobimons[i].rest(rest.until)
        result.rested = {
          name: nameOf(state.ownedMobimons[i]),
          days: daysBetween(today, rest.until),
        }
      }
    }
    this.repository.save(state)
    return result
  }

  /** ヘッドハンティングの権利を1つ使い、モビモンを迎えて図鑑に登録する。 */
  headhunt(id: string, rightId: string): CaptureResult {
    const state = this.repository.load()
    const pid = toPlayerId(id)
    const index = state.headhuntingRights.findIndex((h) => h.id === rightId && h.playerId === pid)
    if (index < 0) throw new DomainError('ヘッドハンティングの権利が見つかりません')
    const right: HeadhuntingRight = state.headhuntingRights[index]
    const species = drawHeadhunting(right, SPECIES, this.random)
    state.headhuntingRights.splice(index, 1)
    const mobimon = OwnedMobimon.capture(ownedMobimonId(this.ids.next()), pid, species.id)
    state.ownedMobimons.push(mobimon)
    const registration = registerInMobidex(state, pid, species)
    this.repository.save(state)
    return { mobimon: ownedView(mobimon), ...registration }
  }

  private acceptBlocker(
    state: MobimonState,
    ctx: ReturnType<JobService['context']>,
    offer: JobOffer,
    today: string,
  ): string | undefined {
    const team = ctx.organization.snapshot(offer.field)
    if (!team) return 'このチームにはリーダーがいません'
    if (isResting(state, team.leader, today)) return 'リーダーが休養中です'
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

/** 成功の確率に数えるチームの状態。休養中のモビモンは数えない。 */
function strength(state: MobimonState, team: TeamSnapshotLike, today: string) {
  const leader = state.ownedMobimons.find((o) => o.id === team.leader)
  const active = (ids: readonly string[]) => ids.filter((oid) => !isResting(state, oid, today))
  return {
    leaderLevel: leader?.level ?? 1,
    subLeaders: active(team.subLeaders).length,
    members: active(team.members).length,
  }
}

function isResting(state: MobimonState, oid: string, today: string): boolean {
  return state.ownedMobimons.find((o) => o.id === oid)?.isResting(today) ?? false
}
