import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type {
  OrganizationView,
  TeamMemberView,
  TeamView,
} from '../../mobimon/application/mobimonUseCases.ts'
import { fakeOrganization } from '../testFakes.ts'
import OrganizationPage from './OrganizationPage.tsx'

const THERMAL = 'サーマルマネジメント&エアコンシステム'

const member = (
  id: string,
  name: string,
  rarity = 'アンコモン',
  field = 'ホーム',
): TeamMemberView => ({
  id,
  name,
  rarity,
  businessField: field,
  level: 1,
})

const team = (overrides: Partial<TeamView> = {}): TeamView => ({
  field: THERMAL,
  leader: null,
  acceptableRanks: [],
  maxSubLeaders: 0,
  subLeaderCount: 0,
  directReports: [],
  maxDirectReports: 4,
  maxMembersPerSubLeader: 4,
  size: 0,
  maxSize: 5,
  leaderCandidates: [],
  ...overrides,
})

const view = (thermal: TeamView, unassigned: TeamMemberView[] = []): OrganizationView => ({
  teams: [
    thermal,
    team({ field: 'パワートレインシステム' }),
    team({ field: 'セーフティ&コックピットシステム' }),
  ],
  unassigned,
})

describe('OrganizationPage', () => {
  it('リーダー候補から選んでリーダーにする', async () => {
    const user = userEvent.setup()
    const setLeader = vi.fn()
    const candidate = member('o1', 'ヒエポレ', 'アンコモン', THERMAL)
    render(
      <OrganizationPage
        organization={fakeOrganization({
          getOrganization: () => view(team({ leaderCandidates: [candidate] }), [candidate]),
          setLeader,
        })}
        onChanged={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'リーダーにする' }))
    expect(setLeader).toHaveBeenCalledWith(THERMAL, 'o1')
  })

  it('リーダー候補がいなければ、理由を示す', () => {
    render(<OrganizationPage organization={fakeOrganization()} onChanged={() => {}} />)
    expect(screen.getAllByText(/リーダーになれるモビモン/)).toHaveLength(3)
  })

  it('受けられる仕事と人数を示し、サブリーダーにできる部下にだけ操作を出す', async () => {
    const user = userEvent.setup()
    const setSubLeader = vi.fn()
    const thermal = team({
      leader: member('lead', 'ゼンネツオウ', '超レア', THERMAL),
      acceptableRanks: ['A', 'S'],
      maxSubLeaders: 4,
      maxSize: 21,
      size: 3,
      directReports: [
        {
          member: member('u1', 'スズカゼン'),
          isSubLeader: false,
          canBecomeSubLeader: true,
          members: [],
        },
        {
          member: member('c1', 'スズカゼ', 'コモン'),
          isSubLeader: false,
          canBecomeSubLeader: false,
          members: [],
        },
      ],
    })
    render(
      <OrganizationPage
        organization={fakeOrganization({ getOrganization: () => view(thermal), setSubLeader })}
        onChanged={() => {}}
      />,
    )
    expect(screen.getByText('受けられる仕事: A・S ランク')).toBeInTheDocument()
    expect(screen.getByText('3 / 21体')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'サブリーダーにする' })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'サブリーダーにする' }))
    expect(setSubLeader).toHaveBeenCalledWith(THERMAL, 'u1', true)
  })

  it('サブリーダーの下にメンバーを加える', async () => {
    const user = userEvent.setup()
    const addMemberUnder = vi.fn()
    const free = member('free', 'ワキユ')
    const thermal = team({
      leader: member('lead', 'カイテキング', 'レア', THERMAL),
      maxSubLeaders: 1,
      subLeaderCount: 1,
      directReports: [
        {
          member: member('sub', 'スズカゼン'),
          isSubLeader: true,
          canBecomeSubLeader: false,
          members: [],
        },
      ],
    })
    render(
      <OrganizationPage
        organization={fakeOrganization({
          getOrganization: () => view(thermal, [free]),
          addMemberUnder,
        })}
        onChanged={() => {}}
      />,
    )
    const under = screen.getByText('スズカゼンの下のメンバー 0 / 4体').parentElement!
    await user.click(within(under).getByRole('button', { name: 'メンバーに加える' }))
    expect(addMemberUnder).toHaveBeenCalledWith(THERMAL, 'sub', 'free')
  })

  it('操作に失敗したら理由を表示する', async () => {
    const user = userEvent.setup()
    const candidate = member('o1', 'ヒエポレ', 'アンコモン', THERMAL)
    render(
      <OrganizationPage
        organization={fakeOrganization({
          getOrganization: () => view(team({ leaderCandidates: [candidate] }), [candidate]),
          setLeader: () => {
            throw new Error('このモビモンはすでにチームに入っています')
          },
        })}
        onChanged={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'リーダーにする' }))
    expect(screen.getByRole('alert')).toHaveTextContent('すでにチームに入っています')
  })
})
