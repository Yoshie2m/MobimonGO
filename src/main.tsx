import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { createApp } from './composition.ts'
import { downloadAppData, resetAppData } from './recovery.ts'
import { StorageError } from './shared/VersionedStorage.ts'
import './ui/design-system/index.ts'
import App from './ui/App.tsx'
import RecoveryPage from './ui/RecoveryPage.tsx'
import './ui/App.css'

const root = createRoot(document.getElementById('root')!)
const render = (node: ReactNode) => root.render(<StrictMode>{node}</StrictMode>)

try {
  const app = createApp()
  render(<App stepImport={app.stepImport} game={app.game} organization={app.organization} />)
} catch (e) {
  // 保存データを読み込めなかったときは、アプリを止めずに案内する(データは書き換えない)
  if (!(e instanceof StorageError)) throw e
  console.error(e)
  render(
    <RecoveryPage
      kind={e.kind}
      detail={e.message}
      onExport={() => downloadAppData(window.localStorage)}
      onReset={() => {
        resetAppData(window.localStorage)
        window.location.reload()
      }}
      onReload={() => window.location.reload()}
    />,
  )
}
