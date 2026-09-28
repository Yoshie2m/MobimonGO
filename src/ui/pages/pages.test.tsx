import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { OwnedMobimonView } from '../../mobimon/application/mobimonUseCases.ts'
import { fakeGame, fakeSummary } from '../testFakes.ts'
import CollectionPage from './CollectionPage.tsx'
import EncounterPage from './EncounterPage.tsx'
import MobidexPage from './MobidexPage.tsx'
import ShopPage from './ShopPage.tsx'

const encounter = {
  encounterId: 'e1',
  speciesId: 'M151',
  name: 'デンまる',
  rarity: '超レア',
  businessField: null,
  description: '伝説の小さな仲間たち。',
}

const owned = (overrides: Partial<OwnedMobimonView> = {}): OwnedMobimonView => ({
  id: 'o1',
  speciesId: 'M001',
  name: 'フウフウ',
  rarity: 'コモン',
  businessField: 'サーマルマネジメント&エアコンシステム',
  description: '',
  level: 10,
  experience: 2250,
  experienceToNextLevel: 500,
  evolutionOptions: [{ speciesId: 'M002', name: 'ヒエポレ' }],
  evolutionLevel: 10,
  ...overrides,
})

describe('EncounterPage', () => {
  it('エネルギーが足りなければ、さがすボタンを押せず理由を添える', () => {
    render(<EncounterPage game={fakeGame()} onChanged={() => {}} />)
    expect(screen.getByRole('button', { name: 'モビモンをさがす' })).toBeDisabled()
    expect(screen.getByText(/エネルギーが足りません/)).toBeInTheDocument()
  })

  it('出現中のモビモンを捕まえると、図鑑の登録と報酬を表示する', async () => {
    const user = userEvent.setup()
    let current: typeof encounter | null = encounter
    const game = fakeGame({
      getSummary: () => fakeSummary({ energy: 20, currentEncounter: current }),
      capture: () => {
        current = null
        return {
          mobimon: owned({ name: 'デンまる' }),
          newlyRegistered: true,
          rewards: [
            { reason: 'デンまるを初めて図鑑に登録しました', items: [], title: 'Dワールドの覇者' },
          ],
        }
      },
    })
    render(<EncounterPage game={game} onChanged={() => {}} />)
    expect(screen.getByText('デンまるがあらわれました')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '捕まえる' }))
    expect(screen.getByText('デンまるを捕まえました')).toBeInTheDocument()
    expect(screen.getByText('図鑑に新しく登録しました')).toBeInTheDocument()
    expect(screen.getByText('称号「Dワールドの覇者」')).toBeInTheDocument()
  })

  it('操作に失敗したら理由を表示する', async () => {
    const user = userEvent.setup()
    const game = fakeGame({
      getSummary: () => fakeSummary({ energy: 20 }),
      encounter: () => {
        throw new Error('出現中のモビモンがいます')
      },
    })
    render(<EncounterPage game={game} onChanged={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'モビモンをさがす' }))
    expect(screen.getByRole('alert')).toHaveTextContent('出現中のモビモンがいます')
  })
})

describe('CollectionPage', () => {
  it('進化できるモビモンに進化の操作を出し、結果を表示する', async () => {
    const user = userEvent.setup()
    const game = fakeGame({
      getSummary: () => fakeSummary({ energy: 20 }),
      listOwnedMobimon: () => [owned()],
      evolve: () => ({
        mobimon: owned({ name: 'ヒエポレ' }),
        fromName: 'フウフウ',
        newlyRegistered: true,
        rewards: [],
      }),
    })
    render(<CollectionPage game={game} onChanged={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'ヒエポレに進化' }))
    expect(screen.getByText(/フウフウがヒエポレに進化しました/)).toBeInTheDocument()
  })

  it('なかまがいなければ案内を表示する', () => {
    render(<CollectionPage game={fakeGame()} onChanged={() => {}} />)
    expect(screen.getByText('まだなかまがいません')).toBeInTheDocument()
  })
})

describe('ShopPage', () => {
  it('ポイントが足りないアイテムは購入できず、理由を添える', () => {
    const game = fakeGame({
      getSummary: () => fakeSummary({ points: 20 }),
      listShop: () => [
        {
          itemId: 'aroma',
          name: 'おさんぽアロマ',
          price: 30,
          kind: 'encounterBoost',
          multiplier: 2,
          uses: 3,
          owned: 0,
          pending: 0,
        },
      ],
    })
    render(<ShopPage game={game} onChanged={() => {}} />)
    expect(screen.getByRole('button', { name: '購入する' })).toBeDisabled()
    expect(screen.getByText('ポイントが足りません')).toBeInTheDocument()
  })
})

describe('MobidexPage', () => {
  it('未登録の種は名前を伏せ、出会える条件を表示する', () => {
    const game = fakeGame({
      getMobidex: () => ({
        entries: [
          {
            speciesId: 'M003',
            no: 3,
            registered: false,
            name: null,
            rarity: 'レア',
            businessField: 'ホーム',
            unlockSteps: 150_000,
            unlocked: false,
            retired: false,
            timesOfDay: ['朝'],
          },
        ],
        registeredCount: 0,
        fields: [],
        fullCompleted: false,
        milestones: [{ count: 10, reached: false }],
        titles: [],
      }),
    })
    render(<MobidexPage game={game} />)
    expect(screen.getByText('? ? ?')).toBeInTheDocument()
    expect(screen.getByText('累計 150,000歩で出会えます')).toBeInTheDocument()
    expect(screen.getByText('10種 未達成')).toBeInTheDocument()
  })
})
