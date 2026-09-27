import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type {
  StepCalendarResult,
  StepImportResult,
  StepImportUseCases,
  StepReading,
  StepSource,
} from '../stepResource/application/stepImport.ts'
import StepImportPage from './StepImportPage.tsx'
import { fakeStatus } from './testFakes.ts'

function fakeUseCases(recognized?: StepCalendarResult) {
  const calls: { readings: readonly StepReading[]; source: StepSource }[] = []
  const useCases: StepImportUseCases = {
    getStatus: () => fakeStatus(),
    importSteps: (readings, source): StepImportResult => {
      calls.push({ readings, source })
      return {
        imported: readings.map((r) => ({ ...r, energy: 1, points: 0 })),
        skipped: [],
        rejected: [],
        cumulativeSteps: 0,
      }
    },
    recognizeStepCalendar: async () => recognized ?? { ok: false, error: '読み取れません' },
  }
  return { useCases, calls }
}

describe('StepImportPage', () => {
  it('手入力した歩数を確認して取り込む', async () => {
    const user = userEvent.setup()
    const { useCases, calls } = fakeUseCases()
    render(<StepImportPage useCases={useCases} />)

    await user.clear(screen.getByLabelText('日付'))
    await user.type(screen.getByLabelText('日付'), '2026-09-10')
    await user.type(screen.getByLabelText('歩数'), '11,671')
    await user.click(screen.getByRole('button', { name: '確認リストに追加' }))
    await user.click(screen.getByRole('button', { name: '取り込む' }))

    expect(calls).toEqual([{ readings: [{ date: '2026-09-10', steps: 11_671 }], source: 'manual' }])
    expect(screen.getByText(/1日分を取り込みました/)).toBeInTheDocument()
  })

  it('画面キャプチャの読み取り結果を確認し、範囲外の歩数は修正するまで取り込めない', async () => {
    const user = userEvent.setup()
    const { useCases, calls } = fakeUseCases({
      ok: true,
      calendar: {
        year: 2026,
        month: 9,
        warnings: [],
        days: [
          { day: 4, steps: 13_186 },
          { day: 5, steps: 591_700 },
          { day: 20, steps: null },
        ],
      },
    })
    render(<StepImportPage useCases={useCases} />)

    await user.click(screen.getByRole('tab', { name: '画面キャプチャ' }))
    await user.upload(
      screen.getByLabelText('歩数画面のキャプチャ画像'),
      new File(['x'], 'capture.png', { type: 'image/png' }),
    )

    expect(await screen.findByText('2026年9月: 2日分の歩数を読み取りました')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '取り込む' })).toBeDisabled()

    const fixed = screen.getByLabelText('2026-09-05 の歩数')
    await user.clear(fixed)
    await user.type(fixed, '5917')
    await user.click(screen.getByRole('button', { name: '取り込む' }))

    expect(calls).toEqual([
      {
        readings: [
          { date: '2026-09-04', steps: 13_186 },
          { date: '2026-09-05', steps: 5_917 },
        ],
        source: 'screenCapture',
      },
    ])
  })

  it('読み取れなかったときは理由を表示する', async () => {
    const user = userEvent.setup()
    render(<StepImportPage useCases={fakeUseCases().useCases} />)
    await user.click(screen.getByRole('tab', { name: '画面キャプチャ' }))
    await user.upload(
      screen.getByLabelText('歩数画面のキャプチャ画像'),
      new File(['x'], 'capture.png', { type: 'image/png' }),
    )
    expect(await screen.findByText('読み取れません')).toBeInTheDocument()
  })

  it('利用開始日より前の日は、取り込まれないことを知らせる', async () => {
    const user = userEvent.setup()
    render(<StepImportPage useCases={fakeUseCases().useCases} />)
    await user.clear(screen.getByLabelText('日付'))
    await user.type(screen.getByLabelText('日付'), '2026-09-01')
    await user.type(screen.getByLabelText('歩数'), '9000')
    await user.click(screen.getByRole('button', { name: '確認リストに追加' }))
    expect(screen.getByText('利用開始日より前のため取り込まれません')).toBeInTheDocument()
  })
})
