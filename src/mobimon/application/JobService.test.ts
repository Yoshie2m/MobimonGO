import type { Clock } from '../../shared/Clock.ts'
import { DomainError } from '../../shared/DomainError.ts'
import { sequentialIdGenerator } from '../../shared/IdGenerator.ts'
import { ownedMobimonId, playerId } from '../domain/ids.ts'
import {
  emptyMobimonState,
  type MobimonRepository,
  type MobimonState,
} from '../domain/MobimonRepository.ts'
import { experienceToReach, OwnedMobimon } from '../domain/OwnedMobimon.ts'
import { SPECIES } from '../masterData/species.ts'
import { JobService } from './JobService.ts'
import { MobimonService } from './MobimonService.ts'
import { OrganizationService } from './OrganizationService.ts'

class InMemoryRepository implements MobimonRepository {
  state: MobimonState = emptyMobimonState()
  load(): MobimonState {
    return Object.fromEntries(
      Object.entries(this.state).map(([key, list]) => [key, [...list]]),
    ) as unknown as MobimonState
  }
  save(state: MobimonState): void {
    this.state = state
  }
}

const USER = 'user-1'
const THERMAL = 'サーマルマネジメント&エアコンシステム'
const POWERTRAIN = 'パワートレインシステム'
const speciesOf = (rarity: string, field: string | null) =>
  SPECIES.find((s) => s.rarity === rarity && s.businessField === field && !s.retired)!

function setup() {
  const repository = new InMemoryRepository()
  let now = new Date(2026, 8, 28, 12)
  const clock: Clock = { now: () => new Date(now) }
  const game = new MobimonService(repository, clock, sequentialIdGenerator())
  game.registerPlayer(USER)
  const org = new OrganizationService(repository)
  const jobs = new JobService(repository, clock, sequentialIdGenerator('job'))
  const give = (rarity: string, field: string | null, level = 1) => {
    const owned = OwnedMobimon.reconstruct(
      ownedMobimonId(`o-${repository.state.ownedMobimons.length}`),
      playerId(USER),
      speciesOf(rarity, field).id,
      experienceToReach(level),
    )
    repository.state.ownedMobimons.push(owned)
    return owned.id
  }
  const walk = (date: string, steps: number) =>
    game.handleStepResourceEvent({ type: 'DailyStepsCounted', walkerId: USER, date, steps })
  const setNow = (d: Date) => (now = d)
  const offer = (field: string, rank: string) =>
    jobs.getJobs(USER).board.find((o) => o.field === field && o.rank === rank)!
  return { repository, game, org, jobs, give, walk, setNow, offer }
}

/** 超レアのリーダー(Lv20)・サブリーダー1体・メンバー2体のサーマルのチーム。 */
function withThermalTeam() {
  const t = setup()
  const leader = t.give('超レア', THERMAL, 20)
  const sub = t.give('レア', 'ホーム')
  const a = t.give('コモン', 'ホーム')
  const b = t.give('コモン', 'ホーム')
  t.org.setLeader(USER, THERMAL, leader)
  t.org.addDirectReport(USER, THERMAL, sub)
  t.org.setSubLeader(USER, THERMAL, sub, true)
  t.org.addMemberUnder(USER, THERMAL, sub, a)
  t.org.addDirectReport(USER, THERMAL, b)
  return { ...t, leader, sub, a, b }
}

describe('JobService', () => {
  it('掲示板は3分野 × 4ランクの12件。リーダーがいないチームの仕事は受けられない', () => {
    const { jobs } = setup()
    const view = jobs.getJobs(USER)
    expect(view.today).toBe('2026-09-28')
    expect(view.board).toHaveLength(12)
    expect(
      view.board.every((o) => o.unavailableReason === 'このチームにはリーダーがいません'),
    ).toBe(true)
    expect(view.board.every((o) => o.successRate === null)).toBe(true)
  })

  it('受けられるランクはリーダーのレア度で決まる', () => {
    const { org, give, offer } = setup()
    org.setLeader(USER, POWERTRAIN, give('アンコモン', POWERTRAIN))
    expect(offer(POWERTRAIN, 'C').unavailableReason).toBeNull()
    expect(offer(POWERTRAIN, 'B').unavailableReason).toBeNull()
    expect(offer(POWERTRAIN, 'A').unavailableReason).toMatch('A ランクの仕事を受けられません')
  })

  it('受注前に、いまのチームでの成功の確率を示す', () => {
    const { offer } = withThermalTeam()
    // A: 65% + Lv20(+4%)+ サブリーダー1体(+4%)+ メンバー2体(+2%)
    expect(offer(THERMAL, 'A').successRate).toBe(75)
    expect(offer(THERMAL, 'S').successRate).toBe(60)
  })

  it('受注すると進行中になり、同じチームではほかの仕事を受けられない', () => {
    const { jobs, offer } = withThermalTeam()
    jobs.accept(USER, offer(THERMAL, 'A').key)
    const view = jobs.getJobs(USER)
    expect(view.activeJobs).toMatchObject([
      {
        field: THERMAL,
        rank: 'A',
        countStartDate: '2026-09-28',
        deadlineDate: '2026-10-04',
        requiredSteps: 70_000,
        progress: 0,
        remaining: 70_000,
        daysLeft: 7,
        stepsPerDay: 10_000,
        phase: '進行中',
        successRate: 75,
        declineBlocker: null,
      },
    ])
    expect(offer(THERMAL, 'S').unavailableReason).toBe('このチームは、ほかの仕事を受けています')
    expect(() => jobs.accept(USER, offer(THERMAL, 'S').key)).toThrow(DomainError)
  })

  it('今日の歩数を取り込み済みなら、翌日から数える', () => {
    const { jobs, offer, walk } = withThermalTeam()
    walk('2026-09-28', 15_000)
    jobs.accept(USER, offer(THERMAL, 'A').key)
    expect(jobs.getJobs(USER).activeJobs[0]).toMatchObject({
      countStartDate: '2026-09-29',
      progress: 0,
      daysLeft: 7,
    })
  })

  it('取り込んだ歩数で進み、歩き切ったら「歩き切った」になる', () => {
    const { jobs, offer, walk, setNow } = withThermalTeam()
    jobs.accept(USER, offer(THERMAL, 'A').key)
    walk('2026-09-28', 20_000)
    setNow(new Date(2026, 8, 29, 12))
    walk('2026-09-29', 10_000)
    expect(jobs.getJobs(USER).activeJobs[0]).toMatchObject({
      progress: 30_000,
      remaining: 40_000,
      daysLeft: 6,
      stepsPerDay: 6_667,
    })
    setNow(new Date(2026, 9, 1, 20))
    for (const d of ['2026-09-30', '2026-10-01']) walk(d, 20_000)
    expect(jobs.getJobs(USER).activeJobs[0].phase).toBe('歩き切った')
  })

  it('受注したときの成功の確率のまま進む(あとでチームは組み替えられない)', () => {
    const { jobs, org, offer, b } = withThermalTeam()
    jobs.accept(USER, offer(THERMAL, 'A').key)
    expect(() => org.removeFromTeam(USER, b)).toThrow(
      '仕事を受けている間は、このチームを組み替えられません',
    )
    expect(org.getOrganization(USER).teams[0].locked).toBe(true)
  })

  it('ほかのチームは組み替えられる', () => {
    const { jobs, org, give, offer } = withThermalTeam()
    jobs.accept(USER, offer(THERMAL, 'A').key)
    expect(() => org.setLeader(USER, POWERTRAIN, give('アンコモン', POWERTRAIN))).not.toThrow()
  })

  describe('辞退', () => {
    it('24時間以内なら辞退でき、チームが空く。辞退は7日間に1回まで', () => {
      const { jobs, org, offer, b, setNow } = withThermalTeam()
      jobs.accept(USER, offer(THERMAL, 'A').key)
      const [job] = jobs.getJobs(USER).activeJobs
      jobs.decline(USER, job.id)
      const view = jobs.getJobs(USER)
      expect(view.activeJobs).toEqual([])
      expect(view.declinesLeft).toBe(0)
      expect(() => org.removeFromTeam(USER, b)).not.toThrow()

      jobs.accept(USER, offer(THERMAL, 'A').key)
      const [again] = jobs.getJobs(USER).activeJobs
      expect(again.declineBlocker).toBe('辞退できるのは、7日間に1回までです')
      expect(() => jobs.decline(USER, again.id)).toThrow(DomainError)

      // 7日たつと、また辞退できる(ただし、この仕事は受注から24時間を過ぎている)
      setNow(new Date(2026, 9, 5, 13))
      expect(jobs.getJobs(USER).declinesLeft).toBe(1)
      expect(jobs.getJobs(USER).activeJobs[0].declineBlocker).toBe(
        '辞退できるのは、受注から24時間以内です',
      )
    })
  })
})
