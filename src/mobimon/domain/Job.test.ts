import { DomainError } from '../../shared/DomainError.ts'
import { DailyStepLog } from './DailyStepLog.ts'
import { ownedMobimonId } from './ids.ts'
import { addDays, daysBetween, Job, jobId, type JobOffer } from './Job.ts'
import { generateJobBoard, JOB_RANKS, RANK_RULES } from './JobRank.ts'
import { TEAM_FIELDS } from './Organization.ts'
import { successRate } from './SuccessRate.ts'
import { PLAYER } from './testHelpers.ts'

const offer = (rank: JobOffer['rank'] = 'C'): JobOffer => ({
  key: `2026-09-28/パワートレインシステム/${rank}`,
  date: '2026-09-28',
  field: 'パワートレインシステム',
  rank,
  title: '燃料ポンプの調子を確かめる',
})
const team = { leader: ownedMobimonId('l'), subLeaders: [], members: [] }
const NOW = new Date(2026, 8, 28, 12, 0)

const accept = (log = DailyStepLog.create(PLAYER), rank: JobOffer['rank'] = 'C') =>
  Job.accept({
    id: jobId('j1'),
    playerId: PLAYER,
    offer: offer(rank),
    now: NOW,
    today: '2026-09-28',
    log,
    team,
    successRate: 85,
  })

describe('Job', () => {
  it('受注した日の歩数をまだ取り込んでいなければ、受注した日から数える', () => {
    const job = accept()
    expect([job.countStartDate, job.deadlineDate]).toEqual(['2026-09-28', '2026-09-30'])
  })

  it('受注した時点でその日の歩数を取り込み済みなら、翌日から数える', () => {
    const job = accept(DailyStepLog.create(PLAYER).record('2026-09-28', 15_000))
    expect([job.countStartDate, job.deadlineDate]).toEqual(['2026-09-29', '2026-10-01'])
  })

  it('納期と業務達成歩数はランクで決まり、受注したときの値で固定する', () => {
    for (const rank of JOB_RANKS) {
      const job = accept(undefined, rank)
      expect(daysBetween(job.countStartDate, job.deadlineDate) + 1).toBe(RANK_RULES[rank].days)
      expect(job.requiredSteps).toBe(RANK_RULES[rank].requiredSteps)
    }
  })

  it('進み具合は、数え始める日から納期(または今日)までの日ごとの歩数の合計', () => {
    const job = accept()
    const log = DailyStepLog.create(PLAYER)
      .record('2026-09-27', 9_999) // 数え始める前
      .record('2026-09-28', 8_000)
      .record('2026-09-29', 20_000) // 上限で頭打ちにした値が届く
      .record('2026-10-01', 7_000) // 納期の後
    expect(job.progress(log, '2026-09-28')).toBe(8_000)
    expect(job.progress(log, '2026-10-05')).toBe(28_000)
  })

  it('同じ日の歩数が増えたら、差分だけ進む(減らない)', () => {
    const job = accept()
    let log = DailyStepLog.create(PLAYER).record('2026-09-28', 3_000)
    log = log.record('2026-09-28', 10_000).record('2026-09-28', 5_000)
    expect(job.progress(log, '2026-09-28')).toBe(10_000)
  })

  it('歩き切った / 納期切れ / 進行中 を見分ける', () => {
    const job = accept()
    const log = DailyStepLog.create(PLAYER).record('2026-09-28', 20_000)
    expect(job.phase(log, '2026-09-28')).toBe('歩き切った')
    expect(job.phase(DailyStepLog.create(PLAYER), '2026-09-30')).toBe('進行中')
    expect(job.phase(DailyStepLog.create(PLAYER), '2026-10-01')).toBe('納期切れ')
  })

  describe('辞退', () => {
    it('受注から24時間以内なら辞退できる', () => {
      const job = accept().decline(new Date(2026, 8, 29, 11, 59), 0)
      expect(job.status).toBe('辞退')
    })

    it('24時間を過ぎると辞退できない', () => {
      expect(() => accept().decline(new Date(2026, 8, 29, 12, 1), 0)).toThrow('24時間以内')
    })

    it('7日間に1回まで', () => {
      expect(() => accept().decline(NOW, 1)).toThrow(DomainError)
    })
  })

  it('日付の計算は月をまたげる', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(daysBetween('2026-09-28', '2026-10-04')).toBe(6)
  })
})

describe('successRate', () => {
  it('アンコモンのリーダー(Lv10)+ メンバー4体で B ランク → 81%', () => {
    expect(successRate(RANK_RULES.B, { leaderLevel: 10, subLeaders: 0, members: 4 })).toBe(81)
  })

  it('レアのリーダー(Lv20)+ サブリーダー1体 + メンバー7体で A ランク → 80%', () => {
    expect(successRate(RANK_RULES.A, { leaderLevel: 20, subLeaders: 1, members: 7 })).toBe(80)
  })

  it('上限で頭打ちにする(S ランクは 85%)', () => {
    expect(successRate(RANK_RULES.S, { leaderLevel: 30, subLeaders: 4, members: 16 })).toBe(85)
  })

  it('リーダーのレベルの上乗せは +6% まで', () => {
    expect(successRate(RANK_RULES.C, { leaderLevel: 30, subLeaders: 0, members: 0 })).toBe(91)
  })
})

describe('generateJobBoard', () => {
  const titles = () => ['一', '二']

  it('3分野 × 4ランクの12件を出す', () => {
    const board = generateJobBoard('2026-09-28', TEAM_FIELDS, titles)
    expect(board).toHaveLength(12)
    expect(new Set(board.map((o) => o.key)).size).toBe(12)
  })

  it('同じ日なら何度作っても同じ、日が変わると入れ替わる', () => {
    const today = generateJobBoard('2026-09-28', TEAM_FIELDS, titles).map((o) => o.title)
    expect(generateJobBoard('2026-09-28', TEAM_FIELDS, titles).map((o) => o.title)).toEqual(today)
    const week = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'].map((d) =>
      generateJobBoard(d, TEAM_FIELDS, titles)
        .map((o) => o.title)
        .join(),
    )
    expect(week.some((titlesOfDay) => titlesOfDay !== today.join())).toBe(true)
  })
})
