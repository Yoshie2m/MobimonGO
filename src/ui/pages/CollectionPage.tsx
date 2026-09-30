import { useState } from 'react'
import type { MobimonUseCases, RewardView } from '../../mobimon/application/mobimonUseCases.ts'
import { FieldIcon, Notice, ProgressBar, Tag } from '../components/parts.tsx'
import { formatNumber, messageOf } from '../components/format.ts'
import { Button, Card } from '../design-system/index.ts'
import { RewardList } from './RewardList.tsx'

interface Props {
  game: MobimonUseCases
  onChanged: () => void
}

/** 所持モビモンの一覧と育成・進化。 */
function CollectionPage({ game, onChanged }: Props) {
  const [error, setError] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [rewards, setRewards] = useState<RewardView[]>([])
  const summary = game.getSummary()
  const owned = game.listOwnedMobimon()
  const training = summary.activeEffects.find((e) => e.kind === 'training')
  const enough = summary.energy >= summary.trainingCost

  const run = (action: () => { message: string; rewards?: RewardView[] }) => {
    setError(undefined)
    try {
      const result = action()
      setMessage(result.message)
      setRewards(result.rewards ?? [])
      onChanged()
    } catch (e) {
      setError(messageOf(e))
    }
  }

  return (
    <section className="page" aria-labelledby="collection-title">
      <div className="page__head">
        <h2 id="collection-title" className="heading">
          なかま
        </h2>
        <p className="caption muted">
          育成1回でエネルギー {summary.trainingCost} を使い、経験値 100 を得ます。Lv10 と Lv20
          で進化できます。
          {training &&
            ` ${training.itemName}の効果中です(経験値 ×${training.multiplier}、あと ${training.remainingUses}回)。`}
        </p>
      </div>

      {error && <Notice tone="danger">{error}</Notice>}
      {message && (
        <Notice tone="success">
          <span className="stack">
            <span>{message}</span>
            <RewardList rewards={rewards} />
          </span>
        </Notice>
      )}

      {owned.length === 0 ? (
        <Card title="まだなかまがいません" meta="「さがす」でモビモンを捕まえましょう">
          <p className="body">エネルギーを使ってモビモンをさがし、捕まえるとここに表示されます。</p>
        </Card>
      ) : (
        <div className="grid grid--wide">
          {owned.map((m) => {
            const next = m.experienceToNextLevel
            return (
              <Card
                key={m.id}
                title={
                  <span className="section-title">
                    <FieldIcon field={m.businessField} />
                    {m.name}
                  </span>
                }
                meta={m.businessField ?? 'どの事業分野にも属さない伝説のモビモン'}
                value={`Lv ${m.level}`}
              >
                <div className="stack">
                  <div className="row">
                    <Tag>{m.rarity}</Tag>
                    {m.restingDays != null && <Tag>休養中(あと {m.restingDays}日)</Tag>}
                    {m.team && (
                      <Tag>
                        {m.team.field}・{m.team.role}
                      </Tag>
                    )}
                    {m.evolutionLevel && m.evolutionOptions.length === 0 && (
                      <span className="caption muted">Lv{m.evolutionLevel} で進化できます</span>
                    )}
                  </div>
                  {next === null ? (
                    <p className="caption muted">レベルが上限に達しています</p>
                  ) : (
                    <>
                      <ProgressBar
                        value={50 * m.level - next}
                        max={50 * m.level}
                        label={`${m.name}の次のレベルまでの進み具合`}
                      />
                      <p className="caption muted">次のレベルまで経験値 {formatNumber(next)}</p>
                    </>
                  )}
                  <p className="caption">{m.description}</p>
                  <div className="actions">
                    <Button
                      size="small"
                      disabled={!enough || next === null || m.restingDays != null}
                      onClick={() =>
                        run(() => {
                          const r = game.train(m.id)
                          return {
                            message: `${m.name}を育てました(経験値 +${r.gainedExperience}${r.leveledUp ? `、Lv${r.mobimon.level} に上がりました` : ''})`,
                          }
                        })
                      }
                    >
                      育てる
                    </Button>
                    {m.evolutionOptions.map((o) => (
                      <Button
                        key={o.speciesId}
                        size="small"
                        variant="secondary"
                        onClick={() =>
                          run(() => {
                            const r = game.evolve(m.id, o.speciesId)
                            return {
                              message: `${r.fromName}が${r.mobimon.name}に進化しました${r.newlyRegistered ? '(図鑑に新しく登録しました)' : ''}`,
                              rewards: r.rewards,
                            }
                          })
                        }
                      >
                        {o.name}に進化
                      </Button>
                    ))}
                  </div>
                  {m.restingDays != null && (
                    <p className="caption muted">休養中のため育成できません</p>
                  )}
                  {!enough && next !== null && (
                    <p className="caption muted">エネルギーが足りないため育成できません</p>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default CollectionPage
