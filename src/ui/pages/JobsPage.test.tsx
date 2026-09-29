import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type {
  ActiveJobView,
  JobOfferView,
  JobsView,
} from '../../mobimon/application/mobimonUseCases.ts'
import { fakeJobs } from '../testFakes.ts'
import JobsPage from './JobsPage.tsx'

const THERMAL = 'サーマルマネジメント&エアコンシステム'

const offer = (overrides: Partial<JobOfferView> = {}): JobOfferView => ({
  key: `2026-09-28/${THERMAL}/A`,
  field: THERMAL,
  rank: 'A',
  title: '電気自動車の熱をまとめて管理する',
  days: 7,
  requiredSteps: 70_000,
  successRate: 75,
  unavailableReason: null,
  ...overrides,
})

const active = (overrides: Partial<ActiveJobView> = {}): ActiveJobView => ({
  id: 'j1',
  field: THERMAL,
  rank: 'A',
  title: '電気自動車の熱をまとめて管理する',
  countStartDate: '2026-09-28',
  deadlineDate: '2026-10-04',
  requiredSteps: 70_000,
  progress: 30_000,
  remaining: 40_000,
  daysLeft: 6,
  stepsPerDay: 6_667,
  phase: '進行中',
  successRate: 75,
  declineBlocker: null,
  ...overrides,
})

const view = (overrides: Partial<JobsView> = {}): JobsView => ({
  today: '2026-09-28',
  board: [],
  activeJobs: [],
  declinesLeft: 1,
  ...overrides,
})

describe('JobsPage', () => {
  it('掲示板の仕事を、成功の確率とともに示して受注する', async () => {
    const user = userEvent.setup()
    const accept = vi.fn()
    const onChanged = vi.fn()
    render(
      <JobsPage
        jobs={fakeJobs({
          getJobs: () =>
            view({
              board: [
                offer(),
                offer({
                  key: 'k-c',
                  rank: 'C',
                  title: '車内の温度を整える',
                  successRate: 91,
                  unavailableReason: 'リーダーのレア度(超レア)では、C ランクの仕事を受けられません',
                }),
              ],
            }),
          accept,
        })}
        onChanged={onChanged}
      />,
    )
    const board = screen.getByRole('region', { name: `${THERMAL}の仕事` })
    expect(within(board).getByText('7日で 70,000歩・成功の確率 75%')).toBeVisible()
    expect(within(board).getByText(/C ランクの仕事を受けられません/)).toBeVisible()
    expect(within(board).getAllByRole('button', { name: '受注する' })).toHaveLength(1)

    await user.click(within(board).getByRole('button', { name: '受注する' }))
    expect(accept).toHaveBeenCalledWith(`2026-09-28/${THERMAL}/A`)
    expect(onChanged).toHaveBeenCalled()
    expect(screen.getByText('「電気自動車の熱をまとめて管理する」を受注しました')).toBeVisible()
  })

  it('受けている仕事の、残りの歩数・日数・1日あたりの目安を示し、辞退できる', async () => {
    const user = userEvent.setup()
    const decline = vi.fn()
    render(
      <JobsPage
        jobs={fakeJobs({ getJobs: () => view({ activeJobs: [active()] }), decline })}
        onChanged={() => {}}
      />,
    )
    const card = screen.getByRole('region', {
      name: '受けている仕事: 電気自動車の熱をまとめて管理する',
    })
    expect(within(card).getByText('30,000 / 70,000歩')).toBeVisible()
    expect(within(card).getByText('残り 40,000歩・あと 6日(1日あたり約 6,667歩)')).toBeVisible()
    await user.click(within(card).getByRole('button', { name: '辞退する' }))
    expect(decline).toHaveBeenCalledWith('j1')
  })

  it('辞退できないときは理由を示し、明日から数える仕事はそう伝える', () => {
    render(
      <JobsPage
        jobs={fakeJobs({
          getJobs: () =>
            view({
              declinesLeft: 0,
              activeJobs: [
                active({
                  countStartDate: '2026-09-29',
                  declineBlocker: '辞退できるのは、7日間に1回までです',
                }),
              ],
            }),
        })}
        onChanged={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: '辞退する' })).toBeNull()
    expect(screen.getByText('辞退できるのは、7日間に1回までです')).toBeVisible()
    expect(screen.getByText(/明日から数えます/)).toBeVisible()
  })

  it('歩き切った仕事は、判定を待っていると示す', () => {
    render(
      <JobsPage
        jobs={fakeJobs({
          getJobs: () => view({ activeJobs: [active({ phase: '歩き切った', remaining: 0 })] }),
        })}
        onChanged={() => {}}
      />,
    )
    expect(screen.getByText('歩き切りました。判定を待っています')).toBeVisible()
  })

  it('操作に失敗したら理由を示す', async () => {
    const user = userEvent.setup()
    render(
      <JobsPage
        jobs={fakeJobs({
          getJobs: () => view({ board: [offer()] }),
          accept: () => {
            throw new Error('このチームは、ほかの仕事を受けています')
          },
        })}
        onChanged={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: '受注する' }))
    expect(screen.getByRole('alert')).toHaveTextContent('このチームは、ほかの仕事を受けています')
  })
})
