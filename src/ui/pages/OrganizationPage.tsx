import { useState, type ReactNode } from 'react'
import type {
  OrganizationUseCases,
  TeamMemberView,
  TeamView,
} from '../../mobimon/application/mobimonUseCases.ts'
import { messageOf } from '../components/format.ts'
import { FieldIcon, Notice, Tag } from '../components/parts.tsx'
import { Button, Card } from '../design-system/index.ts'

interface Props {
  organization: OrganizationUseCases
  onChanged: () => void
}

/** 組織(3チームの編成)の画面。 */
function OrganizationPage({ organization, onChanged }: Props) {
  const [error, setError] = useState<string>()
  const view = organization.getOrganization()

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
    <section className="page" aria-labelledby="organization-title">
      <div className="page__head">
        <h2 id="organization-title" className="heading">
          組織
        </h2>
        <p className="caption muted">
          3つの事業分野にチームを作ります。リーダーはその分野のアンコモン以上で、レア度によって受けられる仕事が変わります。
          リーダーがレア・超レアなら、部下のアンコモン・レアをサブリーダーにでき(レアは1体、超レアは4体まで)、サブリーダーの下にもメンバーを4体まで置けます。
        </p>
      </div>

      {error && <Notice tone="danger">{error}</Notice>}

      <div className="stack">
        {view.teams.map((team) => (
          <TeamCard
            key={team.field}
            team={team}
            unassigned={view.unassigned}
            organization={organization}
            run={run}
          />
        ))}
      </div>
    </section>
  )
}

interface TeamCardProps {
  team: TeamView
  unassigned: TeamMemberView[]
  organization: OrganizationUseCases
  run: (action: () => void) => void
}

function TeamCard({ team, unassigned, organization, run }: TeamCardProps) {
  const ranks = team.acceptableRanks.length
    ? `受けられる仕事: ${team.acceptableRanks.join('・')} ランク`
    : 'リーダーを置くと仕事を受けられます'
  // 仕事を受けている間は組み替えられないので、操作を出さない
  const editable = !team.locked

  return (
    <section aria-label={`${team.field}のチーム`}>
      <Card
        title={
          <span className="section-title">
            <FieldIcon field={team.field} size={32} />
            {team.field}
          </span>
        }
        meta={ranks}
        value={`${team.size} / ${team.maxSize}体`}
      >
        <div className="stack">
          {team.locked && <p className="caption muted">仕事を受けているため、組み替えられません</p>}
          {/* リーダー */}
          <div className="team-slot">
            <p className="label muted">リーダー</p>
            {team.leader ? (
              <MemberRow member={team.leader} role="リーダー">
                {editable && (
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => run(() => organization.removeFromTeam(team.leader!.id))}
                  >
                    外す
                  </Button>
                )}
              </MemberRow>
            ) : !editable ? null : team.leaderCandidates.length > 0 ? (
              <Picker
                label={`${team.field}のリーダー`}
                candidates={team.leaderCandidates}
                action="リーダーにする"
                primary
                onPick={(id) => run(() => organization.setLeader(team.field, id))}
              />
            ) : (
              <p className="caption muted">
                リーダーになれるモビモン(この分野のアンコモン以上で、どのチームにも入っていないもの)がいません
              </p>
            )}
          </div>

          {/* 部下 */}
          <div className="team-slot">
            <p className="label muted">
              部下 {team.directReports.length} / {team.maxDirectReports}体
              {team.maxSubLeaders > 0
                ? `(サブリーダー ${team.subLeaderCount} / ${team.maxSubLeaders}体)`
                : ''}
            </p>
            {team.directReports.map((d) => (
              <div key={d.member.id} className="stack">
                <MemberRow member={d.member} role={d.isSubLeader ? 'サブリーダー' : 'メンバー'}>
                  {editable && (
                    <>
                      {d.isSubLeader ? (
                        <Button
                          size="small"
                          variant="secondary"
                          onClick={() =>
                            run(() => organization.setSubLeader(team.field, d.member.id, false))
                          }
                        >
                          サブリーダーをやめる
                        </Button>
                      ) : (
                        d.canBecomeSubLeader && (
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() =>
                              run(() => organization.setSubLeader(team.field, d.member.id, true))
                            }
                          >
                            サブリーダーにする
                          </Button>
                        )
                      )}
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => run(() => organization.removeFromTeam(d.member.id))}
                      >
                        外す
                      </Button>
                    </>
                  )}
                </MemberRow>
                {d.isSubLeader && (
                  <div className="team-sub stack">
                    <p className="caption muted">
                      {d.member.name}の下のメンバー {d.members.length} /{' '}
                      {team.maxMembersPerSubLeader}体
                    </p>
                    {d.members.map((m) => (
                      <MemberRow key={m.id} member={m} role="メンバー">
                        {editable && (
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => run(() => organization.removeFromTeam(m.id))}
                          >
                            外す
                          </Button>
                        )}
                      </MemberRow>
                    ))}
                    {editable &&
                      d.members.length < team.maxMembersPerSubLeader &&
                      unassigned.length > 0 && (
                        <Picker
                          label={`${d.member.name}の下に加えるメンバー`}
                          candidates={unassigned}
                          action="メンバーに加える"
                          onPick={(id) =>
                            run(() => organization.addMemberUnder(team.field, d.member.id, id))
                          }
                        />
                      )}
                  </div>
                )}
              </div>
            ))}
            {editable &&
              team.directReports.length < team.maxDirectReports &&
              (unassigned.length > 0 ? (
                <Picker
                  label={`${team.field}の部下`}
                  candidates={unassigned}
                  action="部下に加える"
                  onPick={(id) => run(() => organization.addDirectReport(team.field, id))}
                />
              ) : (
                <p className="caption muted">チームに入っていないなかまがいません</p>
              ))}
          </div>
        </div>
      </Card>
    </section>
  )
}

function MemberRow({
  member,
  role,
  children,
}: {
  member: TeamMemberView
  role: string
  children?: ReactNode
}) {
  return (
    <div className="team-member">
      <FieldIcon field={member.businessField} />
      <span className="body-strong">{member.name}</span>
      <Tag>{role}</Tag>
      {member.restingDays !== null && <Tag>休養中(あと {member.restingDays}日)</Tag>}
      <span className="caption muted">
        {member.rarity}・Lv{member.level}
      </span>
      <span className="team-member__actions">{children}</span>
    </div>
  )
}

function Picker({
  label,
  candidates,
  action,
  primary,
  onPick,
}: {
  label: string
  candidates: TeamMemberView[]
  action: string
  primary?: boolean
  onPick: (id: string) => void
}) {
  const [selected, setSelected] = useState(candidates[0]?.id ?? '')
  const current = candidates.some((c) => c.id === selected) ? selected : (candidates[0]?.id ?? '')
  return (
    <div className="row">
      <select
        className="input"
        aria-label={label}
        value={current}
        onChange={(e) => setSelected(e.target.value)}
      >
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}({c.rarity}・Lv{c.level}・{c.businessField ?? '分野なし'})
          </option>
        ))}
      </select>
      <Button
        size="small"
        variant={primary ? 'primary' : 'secondary'}
        disabled={!current}
        onClick={() => onPick(current)}
      >
        {action}
      </Button>
    </div>
  )
}

export default OrganizationPage
