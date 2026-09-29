import type { StepResourceEvent } from '../../publishedLanguage/stepResourceEvents.ts'
import { fixedClock } from '../../shared/Clock.ts'
import { EventBus } from '../../shared/EventBus.ts'
import { sequentialIdGenerator } from '../../shared/IdGenerator.ts'
import type { StepResourceRepository, StepResourceState } from '../domain/StepResourceRepository.ts'
import { StepResourceService } from './StepResourceService.ts'

class InMemoryRepository implements StepResourceRepository {
  saved = 0
  private state: StepResourceState = { walkers: [], stepRecords: [], dailyGrants: [] }
  load(): StepResourceState {
    return {
      walkers: [...this.state.walkers],
      stepRecords: [...this.state.stepRecords],
      dailyGrants: [...this.state.dailyGrants],
    }
  }
  save(state: StepResourceState): void {
    this.state = state
    this.saved++
  }
}

const USER = 'user-1'

function setup(startDate = new Date(2026, 8, 4, 9, 0)) {
  const repository = new InMemoryRepository()
  const events = new EventBus<StepResourceEvent>()
  const published: StepResourceEvent[] = []
  for (const type of ['EnergyGranted', 'PointsGranted', 'CumulativeStepsUpdated'] as const) {
    events.subscribe(type, (e) => published.push(e))
  }
  let now = startDate
  const clock = { now: () => now }
  const service = new StepResourceService(repository, clock, sequentialIdGenerator('grant'), events)
  service.registerWalker(USER)
  return {
    service,
    repository,
    published,
    setToday: (date: Date) => {
      now = date
    },
  }
}

describe('StepResourceService.importSteps', () => {
  it('歩数を取り込み、エネルギー・ポイント・累計歩数のイベントを発行する', () => {
    const { service, setToday, published } = setup()
    setToday(new Date(2026, 8, 19, 20, 0))

    const result = service.importSteps(
      USER,
      [
        { date: '2026-09-04', steps: 13_186 },
        { date: '2026-09-05', steps: 5_917 },
      ],
      'screenCapture',
    )

    expect(result.imported).toEqual([
      { date: '2026-09-04', steps: 13_186, energy: 131, points: 60 },
      { date: '2026-09-05', steps: 5_917, energy: 59, points: 0 },
    ])
    expect(result.cumulativeSteps).toBe(19_103)
    expect(published).toEqual([
      {
        type: 'EnergyGranted',
        grantId: 'grant-1',
        walkerId: USER,
        date: '2026-09-04',
        energy: 131,
      },
      { type: 'PointsGranted', grantId: 'grant-2', walkerId: USER, date: '2026-09-04', points: 60 },
      { type: 'EnergyGranted', grantId: 'grant-3', walkerId: USER, date: '2026-09-05', energy: 59 },
      { type: 'CumulativeStepsUpdated', walkerId: USER, cumulativeSteps: 19_103 },
    ])
  })

  it('利用開始日より前・今日より後の日は取り込まない', () => {
    const { service, setToday } = setup(new Date(2026, 8, 4, 9, 0))
    setToday(new Date(2026, 8, 19, 20, 0))

    const result = service.importSteps(
      USER,
      [
        { date: '2026-09-03', steps: 9_000 },
        { date: '2026-09-04', steps: 13_186 },
        { date: '2026-09-20', steps: 9_000 },
      ],
      'screenCapture',
    )

    expect(result.imported.map((d) => d.date)).toEqual(['2026-09-04'])
    expect(result.skipped).toEqual([
      { date: '2026-09-03', reason: '利用開始日より前の日です' },
      { date: '2026-09-20', reason: '今日より後の日です' },
    ])
  })

  it('利用開始日は0時からの歩数をすべて取り込む(時刻に関係なく1日分)', () => {
    const { service } = setup(new Date(2026, 8, 4, 23, 30))
    const result = service.importSteps(USER, [{ date: '2026-09-04', steps: 13_186 }], 'manual')
    expect(result.imported).toEqual([
      { date: '2026-09-04', steps: 13_186, energy: 131, points: 60 },
    ])
  })

  it('同じ日の歩数が増えたら、増えた分だけを付与する(10 → 10,000)', () => {
    const { service, setToday } = setup()
    setToday(new Date(2026, 8, 19, 9, 0))
    service.importSteps(USER, [{ date: '2026-09-19', steps: 10 }], 'screenCapture')

    setToday(new Date(2026, 8, 19, 21, 0))
    const result = service.importSteps(
      USER,
      [{ date: '2026-09-19', steps: 10_000 }],
      'screenCapture',
    )

    expect(result.imported).toEqual([
      { date: '2026-09-19', steps: 10_000, energy: 100, points: 30 },
    ])
  })

  it('歩数を減らす更新は受け付けない(12,000 → 11,000)', () => {
    const { service } = setup()
    service.importSteps(USER, [{ date: '2026-09-04', steps: 12_000 }], 'manual')
    const result = service.importSteps(USER, [{ date: '2026-09-04', steps: 11_000 }], 'manual')

    expect(result.imported).toEqual([])
    expect(result.rejected).toEqual([
      { date: '2026-09-04', reason: expect.stringContaining('少なくできません') },
    ])
    expect(service.getStatus(USER).todaySteps).toBe(12_000)
  })

  it('同じ歩数で取り込み直しても、二重に付与しない', () => {
    const { service, published } = setup()
    service.importSteps(USER, [{ date: '2026-09-04', steps: 13_186 }], 'manual')
    published.length = 0

    const result = service.importSteps(USER, [{ date: '2026-09-04', steps: 13_186 }], 'manual')

    expect(result.imported).toEqual([{ date: '2026-09-04', steps: 13_186, energy: 0, points: 0 }])
    expect(published).toEqual([])
  })

  it('範囲外の歩数は受け付けない', () => {
    const { service } = setup()
    const result = service.importSteps(USER, [{ date: '2026-09-04', steps: 100_001 }], 'manual')
    expect(result.rejected).toEqual([
      { date: '2026-09-04', reason: expect.stringContaining('範囲') },
    ])
  })

  it('状態を1回の保存でまとめて確定する', () => {
    const { service, repository } = setup()
    const savedBefore = repository.saved
    service.importSteps(
      USER,
      [
        { date: '2026-09-04', steps: 13_186 },
        { date: '2026-09-04', steps: 13_500 },
      ],
      'manual',
    )
    expect(repository.saved - savedBefore).toBe(1)
  })
})

describe('StepResourceService.registerWalker', () => {
  it('利用開始日を今日にして登録し、二重には登録しない', () => {
    const { service, setToday } = setup(new Date(2026, 8, 4, 9, 0))
    setToday(new Date(2026, 8, 10, 9, 0))
    service.registerWalker(USER)
    expect(service.getStatus(USER).startDate).toBe('2026-09-04')
  })
})

describe('fixedClock', () => {
  it('固定した時刻を返す', () => {
    expect(
      fixedClock(new Date(2026, 8, 4))
        .now()
        .getDate(),
    ).toBe(4)
  })
})

describe('日ごとの歩数の公開(DailyStepsCounted)', () => {
  it('取り込んだ日ごとに、1日 20,000歩で頭打ちにした値を公開する', () => {
    const bus = new EventBus<StepResourceEvent>()
    const daily: StepResourceEvent[] = []
    bus.subscribe('DailyStepsCounted', (e) => daily.push(e))
    const service = new StepResourceService(
      new InMemoryRepository(),
      { now: () => new Date(2026, 8, 19, 20, 0) },
      sequentialIdGenerator('grant'),
      bus,
    )
    service.registerWalker(USER)

    service.importSteps(USER, [{ date: '2026-09-19', steps: 12_000 }], 'manual')
    service.importSteps(USER, [{ date: '2026-09-19', steps: 25_000 }], 'manual')

    expect(daily).toEqual([
      { type: 'DailyStepsCounted', walkerId: USER, date: '2026-09-19', steps: 12_000 },
      { type: 'DailyStepsCounted', walkerId: USER, date: '2026-09-19', steps: 20_000 },
    ])
  })
})
