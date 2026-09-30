import { systemClock, type Clock } from '../../shared/Clock.ts'
import { DomainError } from '../../shared/DomainError.ts'
import { localDateOf } from '../../shared/LocalDate.ts'
import { ownedMobimonId, playerId as toPlayerId, type PlayerId } from '../domain/ids.ts'
import { daysBetween } from '../domain/Job.ts'
import { acceptableRanks, type JobRank } from '../domain/JobRank.ts'
import type { MobimonRepository, MobimonState } from '../domain/MobimonRepository.ts'
import {
  canBeSubLeader,
  canLead,
  isTeamField,
  MAX_DIRECT_REPORTS,
  MAX_MEMBERS_PER_SUB_LEADER,
  maxSubLeaders,
  TEAM_FIELDS,
  type MobimonLookup,
  type Organization,
  type TeamField,
} from '../domain/Organization.ts'
import { findSpeciesOrUnknown } from '../masterData/species.ts'

export interface TeamMemberView {
  id: string
  name: string
  rarity: string
  businessField: string | null
  level: number
  /** 休養中なら、休養が明けるまでの日数(休養中でなければ null)。休養中は成功の確率に数えない。 */
  restingDays: number | null
}

export interface DirectReportView {
  member: TeamMemberView
  isSubLeader: boolean
  /** いまサブリーダーにできるか(リーダーのレア度・本人のレア度・置ける数)。 */
  canBecomeSubLeader: boolean
  members: TeamMemberView[]
}

export interface TeamView {
  field: TeamField
  /** 仕事を受けていて、組み替えられない。 */
  locked: boolean
  leader: TeamMemberView | null
  /** リーダーのレア度で受注できる仕事のランク。 */
  acceptableRanks: JobRank[]
  maxSubLeaders: number
  subLeaderCount: number
  directReports: DirectReportView[]
  maxDirectReports: number
  maxMembersPerSubLeader: number
  size: number
  maxSize: number
  /** チームに入っていないモビモンのうち、このチームのリーダーになれるもの。 */
  leaderCandidates: TeamMemberView[]
}

export interface OrganizationView {
  teams: TeamView[]
  /** どのチームにも入っていないモビモン(部下・メンバーの候補)。 */
  unassigned: TeamMemberView[]
}

/** 組織とチームの編成のユースケース(組織と仕事・段階1)。 */
export class OrganizationService {
  private readonly repository: MobimonRepository
  private readonly clock: Clock

  constructor(repository: MobimonRepository, clock: Clock = systemClock) {
    this.repository = repository
    this.clock = clock
  }

  getOrganization(id: string): OrganizationView {
    const state = this.repository.load()
    const { organization, members, lookup } = this.context(state, id, localDateOf(this.clock.now()))
    const assigned = new Set<string>(organization.assignedIds)
    const locked = lockedFields(state, toPlayerId(id))
    const unassigned = [...members.values()].filter((m) => !assigned.has(m.id))

    const teams = organization.teams.map((team): TeamView => {
      const leaderInfo = team.leader ? lookup(team.leader) : undefined
      const limit = maxSubLeaders(leaderInfo?.rarity ?? null)
      const subLeaderCount = team.directReports.filter((d) => d.isSubLeader).length
      const view = (mid: string) => members.get(mid)!
      return {
        field: team.field,
        locked: locked.has(team.field),
        leader: team.leader ? view(team.leader) : null,
        acceptableRanks: acceptableRanks(leaderInfo?.rarity ?? null),
        maxSubLeaders: limit,
        subLeaderCount,
        directReports: team.directReports.map((d) => ({
          member: view(d.id),
          isSubLeader: d.isSubLeader,
          canBecomeSubLeader:
            !d.isSubLeader && canBeSubLeader(lookup(d.id)!) && subLeaderCount < limit,
          members: d.members.map(view),
        })),
        maxDirectReports: MAX_DIRECT_REPORTS,
        maxMembersPerSubLeader: MAX_MEMBERS_PER_SUB_LEADER,
        size:
          (team.leader ? 1 : 0) + team.directReports.reduce((n, d) => n + 1 + d.members.length, 0),
        maxSize: 1 + MAX_DIRECT_REPORTS + limit * MAX_MEMBERS_PER_SUB_LEADER,
        leaderCandidates: unassigned.filter((m) =>
          canLead(team.field, lookup(ownedMobimonId(m.id))!),
        ),
      }
    })
    return { teams, unassigned }
  }

  setLeader(id: string, field: string, ownedId: string): void {
    this.update(id, field, (org, lookup) =>
      org.setLeader(teamField(field), info(lookup, ownedId), lookup),
    )
  }

  addDirectReport(id: string, field: string, ownedId: string): void {
    this.update(id, field, (org, lookup) =>
      org.addDirectReport(teamField(field), info(lookup, ownedId)),
    )
  }

  setSubLeader(id: string, field: string, ownedId: string, isSubLeader: boolean): void {
    this.update(id, field, (org, lookup) =>
      org.setSubLeader(teamField(field), ownedMobimonId(ownedId), isSubLeader, lookup),
    )
  }

  addMemberUnder(id: string, field: string, subLeaderId: string, ownedId: string): void {
    this.update(id, field, (org, lookup) =>
      org.addMemberUnder(teamField(field), ownedMobimonId(subLeaderId), info(lookup, ownedId)),
    )
  }

  removeFromTeam(id: string, ownedId: string): void {
    const state = this.repository.load()
    const { organization } = this.context(state, id)
    const field = organization.positionOf(ownedMobimonId(ownedId))?.field
    this.update(
      id,
      field,
      (org, lookup, locked) =>
        org.remove(ownedMobimonId(ownedId)).normalize(lookup, locked).organization,
    )
  }

  /** field のチームを変える。仕事を受けている間は組み替えられない。 */
  private update(
    id: string,
    field: string | undefined,
    fn: (org: Organization, lookup: MobimonLookup, locked: Set<TeamField>) => Organization,
  ) {
    const state = this.repository.load()
    const { pid, organization, lookup } = this.context(state, id)
    const locked = lockedFields(state, pid)
    if (field !== undefined && isTeamField(field) && locked.has(field)) {
      throw new DomainError('仕事を受けている間は、このチームを組み替えられません')
    }
    const next = fn(organization, lookup, locked)
    state.organizations = state.organizations.map((o) => (o.playerId === pid ? next : o))
    this.repository.save(state)
  }

  private context(state: MobimonState, id: string, today?: string) {
    const pid = toPlayerId(id)
    const organization = state.organizations.find((o) => o.playerId === pid)
    if (!organization) throw new DomainError(`組織がありません: ${id}`)
    return { pid, organization, ...lookupFor(state, pid, today) }
  }
}

/** 所持モビモンの情報(編成の判定用と、画面の表示用)。 */
export function lookupFor(state: MobimonState, pid: PlayerId, today?: string) {
  const members = new Map<string, TeamMemberView>()
  for (const m of state.ownedMobimons.filter((o) => o.playerId === pid)) {
    const species = findSpeciesOrUnknown(m.speciesId)
    members.set(m.id, {
      id: m.id,
      name: species.name,
      rarity: species.rarity,
      businessField: species.businessField,
      level: m.level,
      restingDays:
        today !== undefined && m.isResting(today) ? daysBetween(today, m.restUntil!) : null,
    })
  }
  const lookup: MobimonLookup = (oid) => {
    const m = state.ownedMobimons.find((o) => o.id === oid && o.playerId === pid)
    if (!m) return undefined
    const species = findSpeciesOrUnknown(m.speciesId)
    return { id: m.id, rarity: species.rarity, businessField: species.businessField }
  }
  return { members, lookup }
}

/**
 * 仕事を受けている(組み替えられない)チームの事業分野。
 * 判定(段階3)までは、歩き切った・納期切れの仕事もチームを使っている。
 */
export function lockedFields(state: MobimonState, pid: PlayerId): Set<TeamField> {
  return new Set(
    state.jobs.filter((j) => j.playerId === pid && j.status === '進行中').map((j) => j.field),
  )
}

function teamField(field: string): TeamField {
  if (!isTeamField(field)) {
    throw new DomainError(`チームを作れるのは ${TEAM_FIELDS.join('・')} だけです`)
  }
  return field
}

function info(lookup: MobimonLookup, ownedId: string) {
  const m = lookup(ownedMobimonId(ownedId))
  if (!m) throw new DomainError('所持モビモンが見つかりません')
  return m
}
