import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type {
  ActiveJobView,
  JobOfferView,
  JobsView,
  JudgeResult,
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
  canJudge: false,
  ...overrides,
})

const view = (overrides: Partial<JobsView> = {}): JobsView => ({
  today: '2026-09-28',
  board: [],
  activeJobs: [],
  declinesLeft: 1,
  headhuntingRights: [],
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

  it('歩き切った仕事の結果を見ると、成功・経験値・権利を示す', async () => {
    const user = userEvent.setup()
    const judge = vi.fn((): JudgeResult => ({
      title: '電気自動車の熱をまとめて管理する',
      success: true,
      failureReason: null,
      successRate: 75,
      experience: [{ name: 'ゼンネツオウ', gained: 300, level: 21, leveledUp: true }],
      headhuntingRights: 2,
      rested: null,
    }))
    render(
      <JobsPage
        jobs={fakeJobs({
          getJobs: () =>
            view({ activeJobs: [active({ phase: '歩き切った', remaining: 0, canJudge: true })] }),
          judge,
        })}
        onChanged={() => {}}
      />,
    )
    expect(screen.getByText('歩き切りました。結果を見ると、成功の確率で判定します')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '結果を見る' }))
    expect(judge).toHaveBeenCalledWith('j1')
    const result = screen.getByRole('region', { name: '仕事の結果' })
    expect(within(result).getByText('仕事に成功しました')).toBeVisible()
    expect(
      within(result).getByText('ゼンネツオウ: 経験値 ▲ 300(Lv21 に上がりました)'),
    ).toBeVisible()
    expect(within(result).getByText(/ヘッドハンティングの権利を 2件/)).toBeVisible()
  })

  it('失敗して休養に入ったメンバーを示す', async () => {
    const user = userEvent.setup()
    render(
      <JobsPage
        jobs={fakeJobs({
          getJobs: () => view({ activeJobs: [active({ phase: '納期切れ', canJudge: true })] }),
          judge: () => ({
            title: '電気自動車の熱をまとめて管理する',
            success: false,
            failureReason: '納期に間に合わなかった',
            successRate: 75,
            experience: [],
            headhuntingRights: 0,
            rested: { name: 'フウフウ', days: 5 },
          }),
        })}
        onChanged={() => {}}
      />,
    )
    expect(screen.getByText(/納期の日までの歩数を取り込んでから/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: '結果を見る' }))
    const result = screen.getByRole('region', { name: '仕事の結果' })
    expect(within(result).getByText('仕事は失敗に終わりました')).toBeVisible()
    expect(within(result).getByText('納期までに歩き切れませんでした。')).toBeVisible()
    expect(
      within(result).getByText(/フウフウは休養が必要になりました。5日後に戻ります/),
    ).toBeVisible()
  })

  it('ヘッドハンティングの権利を使って、モビモンを迎える', async () => {
    const user = userEvent.setup()
    const headhunt = vi.fn(() => ({
      mobimon: {
        id: 'o9',
        speciesId: 'M020',
        name: 'サムサム',
        rarity: 'レア',
        businessField: THERMAL,
        description: '',
        level: 1,
        experience: 0,
        experienceToNextLevel: 50,
        evolutionOptions: [],
        evolutionLevel: null,
      },
      newlyRegistered: true,
      rewards: [],
    }))
    render(
      <JobsPage
        jobs={fakeJobs({
          getJobs: () => view({ headhuntingRights: [{ id: 'h1', field: THERMAL, rank: 'S' }] }),
          headhunt,
        })}
        onChanged={() => {}}
      />,
    )
    expect(screen.getByText('ヘッドハンティングの権利 1件')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '迎える' }))
    expect(headhunt).toHaveBeenCalledWith('h1')
    expect(
      screen.getByText(`サムサム(レア・${THERMAL})を迎えました(図鑑に新しく登録しました)`),
    ).toBeVisible()
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
