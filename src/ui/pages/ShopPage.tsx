import { useState } from 'react'
import type { MobimonUseCases } from '../../mobimon/application/mobimonUseCases.ts'
import { Notice } from '../components/parts.tsx'
import { formatNumber, messageOf } from '../components/format.ts'
import { Button, Card } from '../design-system/index.ts'

interface Props {
  game: MobimonUseCases
  onChanged: () => void
}

/** ポイントでアイテムを買い、使う画面。 */
function ShopPage({ game, onChanged }: Props) {
  const [error, setError] = useState<string>()
  const [message, setMessage] = useState<string>()
  const summary = game.getSummary()
  const items = game.listShop()

  const run = (action: () => string) => {
    setError(undefined)
    try {
      setMessage(action())
      onChanged()
    } catch (e) {
      setMessage(undefined)
      setError(messageOf(e))
    }
  }

  return (
    <section className="page" aria-labelledby="shop-title">
      <div className="page__head">
        <h2 id="shop-title" className="heading">
          ショップ
        </h2>
        <p className="caption muted">
          目標歩数の達成でたまったポイントで、アイテムを購入できます。アイテムはエネルギーの代わりにはならず、歩いた成果を増やします。
        </p>
      </div>

      {error && <Notice tone="danger">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}

      <div className="grid">
        <Card
          title="ポイント"
          meta="目標歩数の達成でたまります"
          value={`${formatNumber(summary.points)}pt`}
        />
        {items.map((item) => {
          const active = summary.activeEffects.find((e) => e.kind === item.kind)
          const effect =
            item.kind === 'encounterBoost'
              ? `レア以上の出やすさ ×${item.multiplier}(次の${item.uses}回の出現)`
              : `経験値 ×${item.multiplier}(次の${item.uses}回の育成)`
          return (
            <Card key={item.itemId} title={item.name} meta={effect} value={`${item.price}pt`}>
              <div className="stack">
                <p className="body">
                  所持 {item.owned}個{item.pending > 0 && `(受け取り待ち ${item.pending}個)`}
                </p>
                <div className="actions">
                  <Button
                    size="small"
                    disabled={summary.points < item.price}
                    onClick={() =>
                      run(() => {
                        game.purchase(item.itemId)
                        return `${item.name}を購入しました`
                      })
                    }
                  >
                    購入する
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    disabled={item.owned === 0 || Boolean(active)}
                    onClick={() =>
                      run(() => {
                        game.useItem(item.itemId)
                        return `${item.name}を使いました`
                      })
                    }
                  >
                    使う
                  </Button>
                </div>
                {summary.points < item.price && (
                  <p className="caption muted">ポイントが足りません</p>
                )}
                {active && (
                  <p className="caption muted">
                    同じ種類の効果({active.itemName}、あと {active.remainingUses}
                    回)が残っているため使えません
                  </p>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

export default ShopPage
