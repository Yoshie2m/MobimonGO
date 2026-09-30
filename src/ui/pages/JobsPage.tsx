import { useState } from 'react'
import {
  TEAM_FIELDS,
  type ActiveJobView,
  type JobOfferView,
  type JobUseCases,
  type JudgeResult,
  type RewardView,
} from '../../mobimon/application/mobimonUseCases.ts'
import { formatNumber, messageOf } from '../components/format.ts'
import { FieldIcon, Notice, ProgressBar, Tag } from '../components/parts.tsx'
import { Button, Card } from '../design-system/index.ts'
import { RewardList } from './RewardList.tsx'

interface Props {
  jobs: JobUseCases
  onChanged: () => void
}

/** 仕事の画面: 受けている仕事の進み具合と結果、ヘッドハンティング、今日の掲示板。 */
function JobsPage({ jobs, onChanged }: Props) {
  const [error, setError] = useState<string>()
  const [done, setDone] = useState<string>()
  const [rewards, setRewards] = useState<RewardView[]>([])
  const [result, setResult] = useState<JudgeResult>()
  const view = jobs.getJobs()

  const run = (action: () => string | { message: string; rewards: RewardView[] }) => {
    setError(undefined)
    setDone(undefined)
    setRewards([])
    setResult(undefined)
    try {
      const outcome = action()
      if (typeof outcome === 'string') {
        setDone(outcome)
      } else {
        setDone(outcome.message)
        setRewards(outcome.rewards)
      }
      onChanged()
    } catch (e) {
      setError(messageOf(e))
    }
  }

  const judge = (job: ActiveJobView) => {
    setError(undefined)
    setDone(undefined)
    setRewards([])
    try {
      setResult(jobs.judge(job.id))
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
          歩き切ると成功の確率で判定し、成功すればチームのみんなに経験値と、モビモンを迎えるヘッドハンティングの権利が入ります。
        </p>
      </div>

      {error && <Notice tone="danger">{error}</Notice>}
      {done && (
        <Notice tone="success">
          <span className="stack">
            <span>{done}</span>
            <RewardList rewards={rewards} />
          </span>
        </Notice>
      )}
      {result && <ResultCard result={result} />}

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
              onDecline={() =>
                run(() => {
                  jobs.decline(job.id)
                  return `「${job.title}」を辞退しました`
                })
              }
              onJudge={() => judge(job)}
            />
          ))
        )}
        <p className="caption muted">
          {view.declinesLeft > 0
            ? '今は辞退できます(7日間に1回まで)'
            : '直近7日間に辞退したため、今は辞退できません'}
        </p>
      </div>

      {view.headhuntingRights.length > 0 && (
        <div className="stack">
          <h3 className="body-strong">
            ヘッドハンティングの権利 {view.headhuntingRights.length}件
          </h3>
          <p className="caption muted">
            権利1つにつき、モビモンを1体迎えます。半分は仕事の事業分野から、残りはほかの分野から選ばれ、まだ出会えない種が来ることもあります。
          </p>
          {view.headhuntingRights.map((right) => (
            <div key={right.id} className="team-member">
              <FieldIcon field={right.field} />
              <span className="body">
                {right.field}の {right.rank} ランクの仕事で得た権利
              </span>
              <span className="team-member__actions">
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() =>
                    run(() => {
                      const r = jobs.headhunt(right.id)
                      return {
                        message: `${r.mobimon.name}(${r.mobimon.rarity}・${r.mobimon.businessField ?? '分野なし'})を迎えました${r.newlyRegistered ? '(図鑑に新しく登録しました)' : ''}`,
                        rewards: r.rewards,
                      }
                    })
                  }
                >
                  迎える
                </Button>
              </span>
            </div>
          ))}
        </div>
      )}

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
                        run(() => {
                          jobs.accept(offer.key)
                          return `「${offer.title}」を受注しました`
                        })
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

function ResultCard({ result }: { result: JudgeResult }) {
  return (
    <section aria-label="仕事の結果">
      <Card
        elevated
        title={result.success ? '仕事に成功しました' : '仕事は失敗に終わりました'}
        meta={`「${result.title}」・成功の確率 ${result.successRate}%`}
      >
        <div className="stack">
          {result.failureReason && (
            <p className="body">
              {result.failureReason === '納期に間に合わなかった'
                ? '納期までに歩き切れませんでした。'
                : '歩き切りましたが、判定で届きませんでした。'}
            </p>
          )}
          {result.experience.length > 0 && (
            <div className="stack">
              <p className="body-strong">チームのみんなが経験値を得ました</p>
              {result.experience.map((e, i) => (
                <p key={i} className="caption">
                  {e.name}: 経験値 ▲ {formatNumber(e.gained)}
                  {e.leveledUp ? `(Lv${e.level} に上がりました)` : ''}
                </p>
              ))}
            </div>
          )}
          {result.headhuntingRights > 0 && (
            <p className="body">
              ヘッドハンティングの権利を {result.headhuntingRights}件
              得ました。下の「迎える」から使えます。
            </p>
          )}
          {result.rested && (
            <p className="body">
              {result.rested.name}は休養が必要になりました。{result.rested.days}
              日後に戻ります(休養中は仕事の成功の確率に数えず、育成もできません)。
            </p>
          )}
          {!result.success && !result.rested && (
            <p className="caption muted">休養が必要になったメンバーはいません。</p>
          )}
        </div>
      </Card>
    </section>
  )
}

function ActiveJobCard({
  job,
  today,
  onDecline,
  onJudge,
}: {
  job: ActiveJobView
  today: string
  onDecline: () => void
  onJudge: () => void
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
          {job.canJudge && (
            <div className="row">
              <Button size="small" onClick={onJudge}>
                結果を見る
              </Button>
            </div>
          )}
          {job.phase === '納期切れ' && (
            <p className="caption muted">
              納期の日までの歩数を取り込んでから、結果を見てください。
            </p>
          )}
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
      return '歩き切りました。結果を見ると、成功の確率で判定します'
    case '納期切れ':
      return `納期を過ぎました(あと ${formatNumber(job.remaining)}歩でした)`
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
