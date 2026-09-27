import { render, screen } from '@testing-library/react'
import type { StepImportUseCases } from '../stepResource/application/stepImport.ts'
import App from './App.tsx'

const stepImport: StepImportUseCases = {
  getStatus: () => ({
    startDate: '2026-09-04',
    today: '2026-09-19',
    todaySteps: 0,
    cumulativeSteps: 0,
  }),
  importSteps: () => ({ imported: [], skipped: [], rejected: [], cumulativeSteps: 0 }),
  recognizeStepCalendar: async () => ({ ok: false, error: '' }),
}

describe('App', () => {
  it('タイトルと歩数の取り込み画面を表示する', () => {
    render(<App stepImport={stepImport} />)
    expect(screen.getByRole('heading', { name: 'MobimonGO' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '歩数の取り込み' })).toBeInTheDocument()
  })
})
