import { exportAppData, resetAppData } from './recovery.ts'

describe('保存データの書き出しと初期化', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('mobimongo:mobimon', '{"version":9,"data":{}}')
    localStorage.setItem('mobimongo:mobimon:backup', '{"version":1,"data":{}}')
    localStorage.setItem('other-app', 'keep')
  })

  it('このアプリのキーだけを、そのままの文字列で書き出す', () => {
    const exported = JSON.parse(exportAppData(localStorage, new Date('2026-09-29T00:00:00Z')))
    expect(exported).toEqual({
      exportedAt: '2026-09-29T00:00:00.000Z',
      entries: {
        'mobimongo:mobimon': '{"version":9,"data":{}}',
        'mobimongo:mobimon:backup': '{"version":1,"data":{}}',
      },
    })
  })

  it('初期化はこのアプリのキーだけを消す', () => {
    resetAppData(localStorage)
    expect(localStorage.getItem('mobimongo:mobimon')).toBeNull()
    expect(localStorage.getItem('mobimongo:mobimon:backup')).toBeNull()
    expect(localStorage.getItem('other-app')).toBe('keep')
  })
})
