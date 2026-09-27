import { useState } from 'react'
import type { CaptureResult, MobimonUseCases } from '../../mobimon/application/mobimonUseCases.ts'
import { FieldIcon, Notice, Tag } from '../components/parts.tsx'
import { formatNumber, messageOf } from '../components/format.ts'
import { Button, Card } from '../design-system/index.ts'
import { RewardList } from './RewardList.tsx'

interface Props {
  game: MobimonUseCases
  onChanged: () => void
}

/** エネルギーを使ってモビモンをさがし、捕まえる画面。 */
function EncounterPage({ game, onChanged }: Props) {
  const [error, setError] = useState<string>()
  const [captured, setCaptured] = useState<CaptureResult>()
  const [released, setReleased] = useState<string>()
  const summary = game.getSummary()
  const current = summary.currentEncounter
  const boost = summary.activeEffects.find((e) => e.kind === 'encounterBoost')
  const enough = summary.energy >= summary.encounterCost

  const run = (action: () => void) => {
    setError(undefined)
    try {
      action()
      onChanged()
    } catch (e) {
      setError(messageOf(e))
    }
  }

  return (
    <section className="page" aria-labelledby="encounter-title">
      <div className="page__head">
        <h2 id="encounter-title" className="heading">
          モビモンをさがす
        </h2>
        <p className="caption muted">
          いまは「{summary.timeOfDay}
          」の時間帯です。時間帯と累計歩数によって、出会えるモビモンが変わります。
        </p>
      </div>

      {error && <Notice tone="danger">{error}</Notice>}

      {current ? (
        <Card
          elevated
          title={
            <span className="section-title">
              <FieldIcon field={current.businessField} size={32} />
              {current.name}があらわれました
            </span>
          }
          meta={current.businessField ?? 'どの事業分野にも属さない伝説のモビモン'}
        >
          <div className="stack">
            <div className="row">
              <Tag>{current.rarity}</Tag>
            </div>
            <p className="body">{current.description}</p>
            <div className="actions">
              <Button
                onClick={() =>
                  run(() => {
                    setCaptured(game.capture(current.encounterId))
                    setReleased(undefined)
                  })
                }
              >
                捕まえる
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  run(() => {
                    game.flee(current.encounterId)
                    setReleased(current.name)
                    setCaptured(undefined)
                  })
                }
              >
                見送る
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card
          title="エネルギー"
          meta={`1回 ${summary.encounterCost} 使います`}
          value={formatNumber(summary.energy)}
        >
          <div className="stack">
            {boost && (
              <p className="body">
                {boost.itemName}の効果中です(レア以上の出やすさ ×{boost.multiplier}、あと{' '}
                {boost.remainingUses}回)
              </p>
            )}
            <div className="actions">
              <Button
                disabled={!enough}
                onClick={() =>
                  run(() => {
                    setCaptured(undefined)
                    setReleased(undefined)
                    game.encounter()
                  })
                }
              >
                モビモンをさがす
              </Button>
            </div>
            {!enough && (
              <p className="caption muted">
                エネルギーが足りません。歩数を取り込むとエネルギーが増えます(100歩で 1)。
              </p>
            )}
          </div>
        </Card>
      )}

      {captured && (
        <Card
          title={`${captured.mobimon.name}を捕まえました`}
          meta={captured.newlyRegistered ? '図鑑に新しく登録しました' : 'すでに図鑑に登録済みです'}
        >
          <RewardList rewards={captured.rewards} />
        </Card>
      )}
      {released && <Notice tone="success">{released}を見送りました。</Notice>}
    </section>
  )
}

export default EncounterPage
