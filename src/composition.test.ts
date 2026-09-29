import { createApp } from './composition.ts'
import { fixedClock } from './shared/Clock.ts'
import { sequentialIdGenerator } from './shared/IdGenerator.ts'

describe('createApp', () => {
  beforeEach(() => localStorage.clear())

  it('初回起動時にユーザーの ID を発行し、次回も同じ ID を使う', () => {
    const { userId } = createApp({ storage: localStorage })
    expect(userId).toBeTruthy()
    expect(createApp({ storage: localStorage }).userId).toBe(userId)
  })

  it('初回起動時に Walker と Player・Wallet・Inventory・Mobidex を同じ ID でそろえて作り、二重には作らない', () => {
    createApp({ storage: localStorage })
    const { userId } = createApp({ storage: localStorage })
    const stepResource = JSON.parse(localStorage.getItem('mobimongo:stepResource')!).data
    const mobimon = JSON.parse(localStorage.getItem('mobimongo:mobimon')!).data
    expect(stepResource.walkers.map((w: { id: string }) => w.id)).toEqual([userId])
    expect(mobimon.players.map((p: { id: string }) => p.id)).toEqual([userId])
    for (const key of ['wallets', 'inventories', 'mobidexes'] as const) {
      expect(mobimon[key].map((x: { playerId: string }) => x.playerId)).toEqual([userId])
    }
  })
})

describe('一連の流れ(結合テスト)', () => {
  beforeEach(() => localStorage.clear())

  it('歩数取り込み → エネルギー変換・目標達成ポイント付与 → 出現 → 捕獲 → 図鑑登録 → 育成 → 購入', () => {
    const app = createApp({
      storage: localStorage,
      clock: fixedClock(new Date(2026, 8, 19, 20, 0)), // 夜
      ids: sequentialIdGenerator('id'),
      random: () => 0,
    })

    // 歩数を取り込むと、Published Language のイベントで Mobimon の Wallet・Player に届く
    app.stepImport.importSteps([{ date: '2026-09-19', steps: 13_186 }], 'manual')
    expect(app.game.getSummary()).toMatchObject({
      energy: 131,
      points: 60,
      cumulativeSteps: 13_186,
      timeOfDay: '夜',
    })

    // 出現 → 捕獲 → 図鑑登録
    const encounter = app.game.encounter()
    const captured = app.game.capture(encounter.encounterId)
    expect(captured.newlyRegistered).toBe(true)
    expect(app.game.getMobidex().registeredCount).toBe(1)

    // 育成
    const trained = app.game.train(captured.mobimon.id)
    expect(trained.mobimon.level).toBe(2)
    expect(app.game.getSummary().energy).toBe(131 - 10 - 10)

    // 購入
    app.game.purchase('aroma')
    expect(app.game.getSummary().points).toBe(30)

    // アプリを作り直しても、すべて保存されている
    const reopened = createApp({ storage: localStorage })
    expect(reopened.game.getSummary()).toMatchObject({ energy: 111, points: 30, ownedCount: 1 })
  })

  it('同じ歩数で取り込み直しても、エネルギー・ポイントは二重に届かない', () => {
    const app = createApp({
      storage: localStorage,
      clock: fixedClock(new Date(2026, 8, 19, 20, 0)),
    })
    app.stepImport.importSteps([{ date: '2026-09-19', steps: 13_186 }], 'manual')
    app.stepImport.importSteps([{ date: '2026-09-19', steps: 13_186 }], 'manual')
    expect(app.game.getSummary()).toMatchObject({ energy: 131, points: 60 })
  })
  it('歩数を取り込むと、日ごとの歩数(20,000歩で頭打ち)が Mobimon に記録される', () => {
    const app = createApp({
      storage: localStorage,
      clock: fixedClock(new Date(2026, 8, 19, 20, 0)),
    })
    app.stepImport.importSteps([{ date: '2026-09-19', steps: 25_000 }], 'manual')
    const mobimon = JSON.parse(localStorage.getItem('mobimongo:mobimon')!).data
    expect(mobimon.dailyStepLogs[0].entries).toEqual([['2026-09-19', 20_000]])
    expect(app.organization.getOrganization().teams).toHaveLength(3)
  })
})
