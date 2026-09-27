// @vitest-environment node
import { recognizeStepCalendar } from './recognizeStepCalendar.ts'
import { toStepReadings } from './parseStepCalendar.ts'

// 実際に文字認識を行う(初回は学習データを取得するため通信が必要)。`npm run test:ocr` で実行する。
describe('recognizeStepCalendar(サンプル画像)', () => {
  it('2026年9月の歩数を読み取る', { timeout: 120_000 }, async () => {
    const result = await recognizeStepCalendar('tests/fixtures/step-calendar-sample.png', {
      cachePath: 'node_modules/.cache/tesseract',
    })
    if (!result.ok) throw new Error(result.error)
    expect(result.calendar).toMatchObject({ year: 2026, month: 9, warnings: [] })
    expect(toStepReadings(result.calendar)).toEqual([
      { date: '2026-09-04', steps: 13_186 },
      { date: '2026-09-05', steps: 5_917 },
      { date: '2026-09-06', steps: 15_081 },
      { date: '2026-09-07', steps: 12_398 },
      { date: '2026-09-08', steps: 11_180 },
      { date: '2026-09-09', steps: 11_134 },
      { date: '2026-09-10', steps: 11_671 },
      { date: '2026-09-11', steps: 16_182 },
      { date: '2026-09-12', steps: 7_259 },
      { date: '2026-09-13', steps: 13_796 },
      { date: '2026-09-14', steps: 14_780 },
      { date: '2026-09-15', steps: 9_956 },
      { date: '2026-09-16', steps: 15_515 },
      { date: '2026-09-17', steps: 13_667 },
      { date: '2026-09-18', steps: 12_830 },
      { date: '2026-09-19', steps: 10 },
    ])
  })
})
