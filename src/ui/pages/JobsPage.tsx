import { useState } from 'react'
import {
  TEAM_FIELDS,
  type ActiveJobView,
  type JobOfferView,
  type JobUseCases,
} from '../../mobimon/application/mobimonUseCases.ts'
import { formatNumber, messageOf } from '../components/format.ts'
import { FieldIcon, Notice, ProgressBar, Tag } from '../components/parts.tsx'
import { Button, Card } from '../design-system/index.ts'

interface Props {
  jobs: JobUseCases
  onChanged: () => void
}

/** 仕事の画面: 受けている仕事の進み具合と、今日の掲示板。 */
function JobsPage({ jobs, onChanged }: Props) {
  const [error, setError] = useState<string>()
  const [done, setDone] = useState<string>()
  const view = jobs.getJobs()

  const run = (action: () => void, message: string) => {
    setError(undefined)
    setDone(undefined)
    try {
      action()
      setDone(message)
      onChanged()
    } catch (e) {
      setError(messageOf(e))
    }
  }

  return (
    <section className="page" aria-labelledby="jobs-title">
      <div className="page__head">
        <h2 id="jobs-title" className="heading">
          仕事
        </h2>
        <p className="caption muted">
          チームで仕事を受け、納期までに決められた歩数を歩きます(1日 20,000歩まで数えます)。
          受けられるのは1チーム1件で、受けている間はチームを組み替えられません。
          辞退は受注から24時間以内、7日間に1回までです。
        </p>
      </div>

      {error && <Notice tone="danger">{error}</Notice>}
      {done && <Notice tone="success">{done}</Notice>}

      <div className="stack">
        <h3 className="body-strong">受けている仕事</h3>
        {view.activeJobs.length === 0 ? (
          <p className="caption muted">受けている仕事はありません</p>
        ) : (
          view.activeJobs.map((job) => (
            <ActiveJobCard
              key={job.id}
              job={job}
              today={view.today}
              onDecline={() => run(() => jobs.decline(job.id), `「${job.title}」を辞退しました`)}
            />
          ))
        )}
        <p className="caption muted">
          {view.declinesLeft > 0
            ? '今は辞退できます(7日間に1回まで)'
            : '直近7日間に辞退したため、今は辞退できません'}
        </p>
      </div>

      <div className="stack">
        <h3 className="body-strong">今日の掲示板({formatDate(view.today)})</h3>
        <p className="caption muted">掲示板の仕事は、毎日入れ替わります。</p>
        {TEAM_FIELDS.map((field) => (
          <section key={field} aria-label={`${field}の仕事`}>
            <Card
              title={
                <span className="section-title">
                  <FieldIcon field={field} size={32} />
                  {field}
                </span>
              }
            >
              <div className="stack">
                {view.board
                  .filter((o) => o.field === field)
                  .map((offer) => (
                    <OfferRow
                      key={offer.key}
                      offer={offer}
                      onAccept={() =>
                        run(() => jobs.accept(offer.key), `「${offer.title}」を受注しました`)
                      }
                    />
                  ))}
              </div>
            </Card>
          </section>
        ))}
      </div>
    </section>
  )
}

function ActiveJobCard({
  job,
  today,
  onDecline,
}: {
  job: ActiveJobView
  today: string
  onDecline: () => void
}) {
  return (
    <section aria-label={`受けている仕事: ${job.title}`}>
      <Card
        title={
          <span className="section-title">
            <FieldIcon field={job.field} size={32} />
            {job.title}
          </span>
        }
        meta={`${job.field}・${job.rank} ランク・成功の確率 ${job.successRate}%`}
        value={`${formatNumber(job.progress)} / ${formatNumber(job.requiredSteps)}歩`}
      >
        <div className="stack">
          <ProgressBar
            value={job.progress}
            max={job.requiredSteps}
            label={`${job.title}の進み具合`}
          />
          <p className="caption muted">
            {formatDate(job.countStartDate)}から{formatDate(job.deadlineDate)}までの歩数を数えます
            {job.countStartDate > today ? '(今日の歩数は取り込み済みのため、明日から数えます)' : ''}
          </p>
          <p className="body">{phaseMessage(job)}</p>
          {job.declineBlocker === null ? (
            <div className="row">
              <Button size="small" variant="secondary" onClick={onDecline}>
                辞退する
              </Button>
            </div>
          ) : (
            <p className="caption muted">{job.declineBlocker}</p>
          )}
        </div>
      </Card>
    </section>
  )
}

function phaseMessage(job: ActiveJobView): string {
  switch (job.phase) {
    case '歩き切った':
      return '歩き切りました。判定を待っています'
    case '納期切れ':
      return `納期を過ぎました(あと ${formatNumber(job.remaining)}歩でした)。判定を待っています`
    case '進行中':
      return `残り ${formatNumber(job.remaining)}歩・あと ${job.daysLeft}日(1日あたり約 ${formatNumber(job.stepsPerDay)}歩)`
  }
}

function OfferRow({ offer, onAccept }: { offer: JobOfferView; onAccept: () => void }) {
  return (
    <div className="team-member">
      <Tag>{offer.rank} ランク</Tag>
      <span className="body-strong">{offer.title}</span>
      <span className="caption muted">
        {offer.days}日で {formatNumber(offer.requiredSteps)}歩
        {offer.successRate !== null ? `・成功の確率 ${offer.successRate}%` : ''}
      </span>
      <span className="team-member__actions">
        {offer.unavailableReason === null ? (
          <Button size="small" variant="secondary" onClick={onAccept}>
            受注する
          </Button>
        ) : (
          <span className="caption muted">{offer.unavailableReason}</span>
        )}
      </span>
    </div>
  )
}

/** YYYY-MM-DD → 9月28日 */
function formatDate(date: string): string {
  const [, m, d] = date.split('-').map(Number)
  return `${m}月${d}日`
}

export default JobsPage
