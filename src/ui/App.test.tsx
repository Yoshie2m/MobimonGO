import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.tsx'
import { fakeGame, fakeStepImport, fakeSummary } from './testFakes.ts'

describe('App', () => {
  it('ヘッダーにエネルギー・ポイント・時間帯を表示し、ホームから始まる', () => {
    render(
      <App
        stepImport={fakeStepImport()}
        game={fakeGame({
          getSummary: () => fakeSummary({ energy: 131, points: 60, timeOfDay: '夜' }),
        })}
      />,
    )
    const status = screen.getByLabelText('いまの状態')
    expect(status).toHaveTextContent('エネルギー131')
    expect(status).toHaveTextContent('ポイント60pt')
    expect(status).toHaveTextContent('時間帯夜')
    expect(screen.getByRole('heading', { name: '今日のようす' })).toBeInTheDocument()
  })

  it('メニューで画面を切り替え、選んだ項目を示す', async () => {
    const user = userEvent.setup()
    render(<App stepImport={fakeStepImport()} game={fakeGame()} />)
    await user.click(screen.getByRole('button', { name: '図鑑' }))
    expect(screen.getByRole('heading', { name: '図鑑' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '図鑑' })).toHaveAttribute('aria-current', 'page')
    await user.click(screen.getByRole('button', { name: '歩数' }))
    expect(screen.getByRole('heading', { name: '歩数の取り込み' })).toBeInTheDocument()
  })

  it('フッターに免責事項を常時表示する', () => {
    render(<App stepImport={fakeStepImport()} game={fakeGame()} />)
    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveTextContent('パロディ(二次創作)を目的としたジョークサイト')
    expect(footer).toHaveTextContent('公式のデータは一切使用しておりません')
    expect(footer).toHaveTextContent('製作者は一切の責任を負いません')
  })
})
