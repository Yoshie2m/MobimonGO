import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecoveryPage from './RecoveryPage.tsx'

const handlers = () => ({ onExport: vi.fn(), onReset: vi.fn(), onReload: vi.fn() })

describe('RecoveryPage', () => {
  it('移行に失敗したら書き出しを勧め、初期化は確認してから行う', async () => {
    const user = userEvent.setup()
    const h = handlers()
    render(<RecoveryPage kind="migrationFailed" detail="版 1 からの移行に失敗しました" {...h} />)

    await user.click(screen.getByRole('button', { name: 'データを書き出す' }))
    expect(h.onExport).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '初期化する' }))
    expect(h.onReset).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('すべてのデータが消えます')
    await user.click(screen.getByRole('button', { name: 'すべて消して初期化する' }))
    expect(h.onReset).toHaveBeenCalled()
  })

  it('初期化の確認はやめられる', async () => {
    const user = userEvent.setup()
    render(<RecoveryPage kind="corrupt" detail="" {...handlers()} />)
    await user.click(screen.getByRole('button', { name: '初期化する' }))
    await user.click(screen.getByRole('button', { name: 'やめる' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('新しすぎるデータのときは更新を案内し、初期化は出さない', () => {
    render(<RecoveryPage kind="tooNew" detail="" {...handlers()} />)
    expect(screen.getByText('アプリを最新の状態に更新してください')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '初期化する' })).toBeNull()
  })
})
