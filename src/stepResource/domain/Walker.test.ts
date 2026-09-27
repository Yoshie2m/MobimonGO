import { d, walker } from './testHelpers.ts'

describe('Walker.canRecord', () => {
  const w = walker('2026-09-04')
  const today = d('2026-09-19')

  it('利用開始日の前日は記録できない', () => {
    expect(w.canRecord(d('2026-09-03'), today)).toBe(false)
  })
  it('利用開始日と今日は記録できる', () => {
    expect(w.canRecord(d('2026-09-04'), today)).toBe(true)
    expect(w.canRecord(today, today)).toBe(true)
  })
  it('今日より後の日は記録できない', () => {
    expect(w.canRecord(d('2026-09-20'), today)).toBe(false)
  })
})
