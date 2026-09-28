import { useState } from 'react'
import { Button, Card } from './design-system/index.ts'

interface Props {
  /** tooNew: このアプリより新しい形式のデータ。それ以外: 移行の失敗・読み取れないデータ。 */
  kind: 'tooNew' | 'migrationFailed' | 'corrupt'
  detail: string
  onExport: () => void
  onReset: () => void
  onReload: () => void
}

/**
 * 保存データを読み込めなかったときの案内。アプリ全体を止めず、データは書き換えずに残す。
 * 新しすぎるデータのときは初期化を出さない(新しいアプリで開けば読めるため)。
 */
function RecoveryPage({ kind, detail, onExport, onReset, onReload }: Props) {
  const [confirming, setConfirming] = useState(false)

  if (kind === 'tooNew') {
    return (
      <main className="app">
        <Card
          elevated
          title="アプリを最新の状態に更新してください"
          meta="データはそのまま残っています"
        >
          <div className="stack">
            <p className="body">
              保存されているデータは、いまお使いのアプリより新しい形式です。ページを再読み込みして、最新のアプリで開いてください。
            </p>
            <div className="actions">
              <Button onClick={onReload}>再読み込みする</Button>
              <Button variant="secondary" onClick={onExport}>
                データを書き出す
              </Button>
            </div>
            <p className="caption muted">詳細: {detail}</p>
          </div>
        </Card>
      </main>
    )
  }

  return (
    <main className="app">
      <Card elevated title="データの更新に失敗しました" meta="データはそのまま残っています">
        <div className="stack">
          <p className="body">
            保存されているデータを、新しい形式に更新できませんでした。データは書き換えていません。
            まずデータを書き出して保存し、お問い合わせの際にお送りください。
          </p>
          <div className="actions">
            <Button onClick={onExport}>データを書き出す</Button>
            {!confirming && (
              <Button variant="secondary" onClick={() => setConfirming(true)}>
                初期化する
              </Button>
            )}
          </div>
          {confirming && (
            <div className="notice stack" role="alert">
              <p className="body-strong status-danger">初期化すると、すべてのデータが消えます</p>
              <p className="body">
                集めたモビモン・図鑑・エネルギー・ポイント・取り込んだ歩数がすべて消え、元に戻せません。先にデータを書き出しておくことをおすすめします。
              </p>
              <div className="actions">
                <Button variant="secondary" onClick={onReset}>
                  すべて消して初期化する
                </Button>
                <Button variant="secondary" onClick={() => setConfirming(false)}>
                  やめる
                </Button>
              </div>
            </div>
          )}
          <p className="caption muted">詳細: {detail}</p>
        </div>
      </Card>
    </main>
  )
}

export default RecoveryPage
