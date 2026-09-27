import {
  BUSINESS_FIELDS,
  type MobidexEntryView,
  type MobimonUseCases,
} from '../../mobimon/application/mobimonUseCases.ts'
import { FieldIcon, ProgressBar, Tag } from '../components/parts.tsx'
import { formatNumber } from '../components/format.ts'
import { Card } from '../design-system/index.ts'

interface Props {
  game: MobimonUseCases
}

const NO_FIELD = 'どの事業分野にも属さない'

/** 図鑑。事業分野ごとの進み具合と、151種の一覧。 */
function MobidexPage({ game }: Props) {
  const dex = game.getMobidex()
  const sections = [...BUSINESS_FIELDS, null].map((field) => ({
    field,
    entries: dex.entries.filter((e) => e.businessField === field),
  }))

  return (
    <section className="page" aria-labelledby="mobidex-title">
      <div className="page__head">
        <h2 id="mobidex-title" className="heading">
          図鑑
        </h2>
        <p className="caption muted">
          捕まえたり進化させたりしたモビモンが登録されます。事業分野ごとに超レア以外をそろえると、称号とアイテムを受け取れます。
        </p>
      </div>

      <div className="grid">
        <Card title="登録数" meta="全151種" value={`${dex.registeredCount}種`}>
          <div className="stack">
            <ProgressBar
              value={dex.registeredCount}
              max={dex.entries.length}
              label="図鑑の進み具合"
            />
            <div className="row" aria-label="登録数の節目">
              {dex.milestones.map((m) => (
                <Tag key={m.count}>
                  {m.count}種 {m.reached ? '達成' : '未達成'}
                </Tag>
              ))}
            </div>
          </div>
        </Card>
        <Card title="称号" meta={dex.titles.length ? `${dex.titles.length}個` : 'まだありません'}>
          {dex.titles.length > 0 ? (
            <div className="row">
              {dex.titles.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          ) : (
            <p className="caption muted">事業分野をそろえると称号を受け取れます。</p>
          )}
        </Card>
      </div>

      <div className="grid grid--wide" aria-label="事業分野ごとの進み具合">
        {dex.fields.map((f) => (
          <Card
            key={f.field}
            title={
              <span className="section-title">
                <FieldIcon field={f.field} />
                {f.field}
              </span>
            }
            meta={f.completed ? 'コンプリートしました' : '超レアを除く全種でコンプリート'}
            value={`${f.registered} / ${f.total}種`}
          >
            <ProgressBar value={f.registered} max={f.total} label={`${f.field}の進み具合`} />
          </Card>
        ))}
      </div>

      {sections.map(({ field, entries }) => (
        <div key={field ?? 'none'} className="stack">
          <h3 className="heading section-title">
            <FieldIcon field={field} />
            {field ?? NO_FIELD}
          </h3>
          <div className="dex-grid">
            {entries.map((e) => (
              <DexEntry key={e.speciesId} entry={e} />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

function DexEntry({ entry }: { entry: MobidexEntryView }) {
  const times = entry.timesOfDay.length === 4 ? '全時間帯' : entry.timesOfDay.join('・')
  return (
    <div className={`dex-entry${entry.registered ? ' dex-entry--registered' : ''}`}>
      <span className="caption muted">No.{String(entry.no).padStart(3, '0')}</span>
      <span className="body-strong">{entry.name ?? '? ? ?'}</span>
      <span className="caption">{entry.rarity}</span>
      <span className="caption muted">
        {entry.registered
          ? '登録済み'
          : entry.unlocked
            ? `${times}に出会えます`
            : `累計 ${formatNumber(entry.unlockSteps)}歩で出会えます`}
      </span>
    </div>
  )
}

export default MobidexPage
