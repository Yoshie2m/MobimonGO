import { createApp } from './composition.ts'

describe('createApp', () => {
  beforeEach(() => localStorage.clear())

  it('初回起動時にユーザーの ID を発行してウォーカーを登録し、次回も同じ ID を使う', () => {
    createApp(localStorage)
    const id = localStorage.getItem('mobimongo:userId')
    expect(id).toBeTruthy()

    const app = createApp(localStorage)
    expect(localStorage.getItem('mobimongo:userId')).toBe(id)
    expect(app.stepImport.getStatus().cumulativeSteps).toBe(0)
  })

  it('初回起動時に Walker と Player・Wallet・Inventory・Mobidex を同じ ID でそろえて作り、二重には作らない', () => {
    createApp(localStorage)
    const { userId } = createApp(localStorage)
    const stepResource = JSON.parse(localStorage.getItem('mobimongo:stepResource')!).data
    const mobimon = JSON.parse(localStorage.getItem('mobimongo:mobimon')!).data
    expect(stepResource.walkers.map((w: { id: string }) => w.id)).toEqual([userId])
    expect(mobimon.players.map((p: { id: string }) => p.id)).toEqual([userId])
    for (const key of ['wallets', 'inventories', 'mobidexes'] as const) {
      expect(mobimon[key].map((x: { playerId: string }) => x.playerId)).toEqual([userId])
    }
  })

  it('取り込んだ歩数は保存され、アプリを作り直しても残る', () => {
    const today = new Date()
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    createApp(localStorage).stepImport.importSteps([{ date, steps: 9_000 }], 'manual')
    expect(createApp(localStorage).stepImport.getStatus().todaySteps).toBe(9_000)
  })
})
