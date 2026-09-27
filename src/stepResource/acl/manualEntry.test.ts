import { parseManualEntry } from './manualEntry.ts'

describe('parseManualEntry', () => {
  it('日付と歩数(カンマ区切りも可)を読み取る', () => {
    expect(parseManualEntry('2026-09-04', '13,186')).toEqual({
      ok: true,
      reading: { date: '2026-09-04', steps: 13_186 },
    })
  })

  it.each([
    ['', '100', '日付'],
    ['2026-09-04', '', '歩数'],
    ['2026-09-04', 'abc', '歩数'],
    ['2026-09-04', '100001', '範囲'],
  ])('%s / %s はエラー(%s)', (date, steps, keyword) => {
    const result = parseManualEntry(date, steps)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain(keyword)
  })
})
