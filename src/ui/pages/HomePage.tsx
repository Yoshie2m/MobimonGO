import type { MobimonUseCases } from '../../mobimon/application/mobimonUseCases.ts'
import type { StepImportUseCases } from '../../stepResource/application/stepImport.ts'
import type { PageId } from '../App.tsx'
import { ProgressBar, Tag } from '../components/parts.tsx'
import { formatNumber } from '../components/format.ts'
import { Button, Card } from '../design-system/index.ts'

interface Props {
  stepImport: StepImportUseCases
  game: MobimonUseCases
  onNavigate: (page: PageId) => void
}

/** ダッシュボード。1カードにつき1つのメッセージにする。 */
function HomePage({ stepImport, game, onNavigate }: Props) {
  const status = stepImport.getStatus()
  const summary = game.getSummary()
  const remaining = Math.max(0, status.stepGoal - status.todaySteps)

  return (
    <section className="page" aria-labelledby="home-title">
      <div className="page__head">
        <h2 id="home-title" className="heading">
          今日のようす
        </h2>
        <p className="caption muted">{status.today}</p>
      </div>

      <div className="grid">
        <Card
          title="今日の歩数"
          meta={`目標 ${formatNumber(status.stepGoal)}歩`}
          value={`${formatNumber(status.todaySteps)}歩`}
        >
          <div className="stack">
            <ProgressBar
              value={status.todaySteps}
              max={status.stepGoal}
              label="目標までの進み具合"
            />
            {remaining === 0 ? (
              <p className="body-strong status-success">▲ 目標を達成しました</p>
            ) : (
              <p className="body">目標まであと {formatNumber(remaining)}歩です</p>
            )}
          </div>
        </Card>

        <Card
          title="エネルギー"
          meta="出現・育成に使います"
          value={formatNumber(summary.energy)}
          delta={status.todayGrantedEnergy > 0 ? `今日 +${status.todayGrantedEnergy}` : undefined}
          deltaTone="positive"
        >
          <p className="caption muted">
            1回の出現・育成に {summary.encounterCost}{' '}
            使います。使い切れなかった分は翌日に持ち越せます。
          </p>
          <div className="actions">
            <Button onClick={() => onNavigate('encounter')}>モビモンをさがす</Button>
          </div>
        </Card>

        <Card
          title="ポイント"
          meta="アイテムの購入に使います"
          value={`${formatNumber(summary.points)}pt`}
          delta={status.todayGrantedPoints > 0 ? `今日 +${status.todayGrantedPoints}pt` : undefined}
          deltaTone="positive"
        />

        <Card
          title="累計歩数"
          meta={`利用開始日 ${status.startDate}`}
          value={`${formatNumber(summary.cumulativeSteps)}歩`}
        >
          <p className="caption muted">
            累計歩数が増えると、新しいモビモンに出会えるようになります。
          </p>
        </Card>

        <Card
          title="図鑑"
          meta="集めたモビモンの種類"
          value={`${summary.registeredCount} / ${summary.totalSpecies}種`}
        >
          <ProgressBar
            value={summary.registeredCount}
            max={summary.totalSpecies}
            label="図鑑の進み具合"
          />
        </Card>

        <Card title="時間帯" meta="出会えるモビモンが変わります" value={summary.timeOfDay}>
          <p className="caption muted">朝 5〜10時 / 昼 10〜16時 / 夕 16〜19時 / 夜 19〜5時</p>
        </Card>

        {summary.activeEffects.length > 0 && (
          <Card title="使用中のアイテム" meta="回数がなくなると効果が切れます">
            <ul className="list">
              {summary.activeEffects.map((e) => (
                <li key={e.kind}>
                  {e.itemName}(×{e.multiplier}、あと {e.remainingUses}回)
                </li>
              ))}
            </ul>
          </Card>
        )}

        {summary.titles.length > 0 && (
          <Card title="称号" meta={`${summary.titles.length}個`}>
            <div className="row">
              {summary.titles.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          </Card>
        )}
      </div>
    </section>
  )
}

export default HomePage
