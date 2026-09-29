import { useState } from 'react'
import type { MobimonUseCases } from '../mobimon/application/mobimonUseCases.ts'
import type { StepImportUseCases } from '../stepResource/application/stepImport.ts'
import { ICONS } from './design-system/index.ts'
import { formatNumber } from './components/format.ts'
import CollectionPage from './pages/CollectionPage.tsx'
import EncounterPage from './pages/EncounterPage.tsx'
import HomePage from './pages/HomePage.tsx'
import MobidexPage from './pages/MobidexPage.tsx'
import ShopPage from './pages/ShopPage.tsx'
import StepImportPage from './StepImportPage.tsx'

interface Props {
  stepImport: StepImportUseCases
  game: MobimonUseCases
}

export type PageId = 'home' | 'steps' | 'encounter' | 'collection' | 'shop' | 'mobidex'

const PAGES: { id: PageId; label: string }[] = [
  { id: 'home', label: 'ホーム' },
  { id: 'steps', label: '歩数' },
  { id: 'encounter', label: 'さがす' },
  { id: 'collection', label: 'なかま' },
  { id: 'shop', label: 'ショップ' },
  { id: 'mobidex', label: '図鑑' },
]

function App({ stepImport, game }: Props) {
  const [page, setPage] = useState<PageId>('home')
  // 各画面は描画のたびにユースケースから状態を読む。操作のあとに再描画して、ヘッダーなどにも反映する
  const [, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)
  const summary = game.getSummary()

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <img src={ICONS.mobility} width={32} height={32} alt="" />
          <h1 className="heading">MobimonGO</h1>
        </div>
        <div className="app-header__status" aria-label="いまの状態">
          <span className="status-chip">
            <span className="status-chip__label caption">エネルギー</span>
            <span className="body-strong">{formatNumber(summary.energy)}</span>
          </span>
          <span className="status-chip">
            <span className="status-chip__label caption">ポイント</span>
            <span className="body-strong">{formatNumber(summary.points)}pt</span>
          </span>
          <span className="status-chip">
            <span className="status-chip__label caption">時間帯</span>
            <span className="body-strong">{summary.timeOfDay}</span>
          </span>
        </div>
      </header>

      <nav className="nav" aria-label="メニュー">
        {PAGES.map((p) => (
          <button
            key={p.id}
            className="nav__item label"
            aria-current={page === p.id ? 'page' : undefined}
            onClick={() => setPage(p.id)}
          >
            {p.label}
          </button>
        ))}
      </nav>

      <main>
        {page === 'home' && <HomePage stepImport={stepImport} game={game} onNavigate={setPage} />}
        {page === 'steps' && <StepImportPage useCases={stepImport} onImported={refresh} />}
        {page === 'encounter' && <EncounterPage game={game} onChanged={refresh} />}
        {page === 'collection' && <CollectionPage game={game} onChanged={refresh} />}
        {page === 'shop' && <ShopPage game={game} onChanged={refresh} />}
        {page === 'mobidex' && <MobidexPage game={game} />}
      </main>

      <footer className="app-footer caption muted">
        <p>
          本サイトは個人が制作したパロディ(二次創作)を目的としたジョークサイトであり、実在のいかなる企業、団体、および既存のゲーム作品(「ポケモンGO」等)とも一切関係ありません。
        </p>
        <p>
          本サイト内で使用されているイラスト、キャラクター、システム等はすべて独自に作成されたものであり、公式のデータは一切使用しておりません。
        </p>
        <p>
          本サイトの利用により生じた利益の発生、または損害(不利益)について、製作者は一切の責任を負いません。利益を目的とした運営は行っておらず、完全無料で提供されています。
        </p>
      </footer>
    </div>
  )
}

export default App
