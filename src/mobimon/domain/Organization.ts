import { DomainError } from '../../shared/DomainError.ts'
import type { BusinessField } from './BusinessField.ts'
import type { OwnedMobimonId, PlayerId } from './ids.ts'
import type { Rarity } from './Rarity.ts'

/** チームを作る事業分野(3分野だけ。残りの分野のモビモンはメンバーとして入る)。 */
export const TEAM_FIELDS = [
  'サーマルマネジメント',
  'パワートレイン',
  'インフォテイメント',
] as const satisfies readonly BusinessField[]

export type TeamField = (typeof TEAM_FIELDS)[number]

export const isTeamField = (value: string): value is TeamField =>
  (TEAM_FIELDS as readonly string[]).includes(value)

/** リーダーの直属の部下の上限。 */
export const MAX_DIRECT_REPORTS = 4
/** サブリーダーの下のメンバーの上限。 */
export const MAX_MEMBERS_PER_SUB_LEADER = 4

/** リーダーになれるか(そのチームの事業分野の、アンコモン以上)。 */
export function canLead(field: TeamField, m: TeamMemberInfo): boolean {
  return m.businessField === field && m.rarity !== 'コモン'
}

/** リーダーのレア度で置けるサブリーダーの数(アンコモン: 0 / レア: 1 / 超レア: 4)。 */
export function maxSubLeaders(leaderRarity: Rarity | null): number {
  return leaderRarity === '超レア' ? 4 : leaderRarity === 'レア' ? 1 : 0
}

/** サブリーダーになれるレア度(アンコモン・レア)。 */
export const canBeSubLeader = (m: TeamMemberInfo) =>
  m.rarity === 'アンコモン' || m.rarity === 'レア'

/** 編成の判定に使う、所持モビモンの情報。 */
export interface TeamMemberInfo {
  id: OwnedMobimonId
  rarity: Rarity
  businessField: BusinessField | null
}

/** 所持モビモンの情報を引く関数(持っていない ID なら undefined)。 */
export type MobimonLookup = (id: OwnedMobimonId) => TeamMemberInfo | undefined

export interface DirectReport {
  readonly id: OwnedMobimonId
  readonly isSubLeader: boolean
  /** サブリーダーの下のメンバー(サブリーダーでなければ空)。 */
  readonly members: readonly OwnedMobimonId[]
}

export interface Team {
  readonly field: TeamField
  readonly leader: OwnedMobimonId | null
  readonly directReports: readonly DirectReport[]
}

export type TeamRole = 'リーダー' | 'サブリーダー' | 'メンバー'

/** 受注したときのチーム編成(リーダー・サブリーダー・それ以外のメンバー)。 */
export interface TeamSnapshotLike {
  leader: OwnedMobimonId
  subLeaders: OwnedMobimonId[]
  members: OwnedMobimonId[]
}

export interface Position {
  field: TeamField
  role: TeamRole
  /** サブリーダーの下のメンバーなら、そのサブリーダー。 */
  subLeaderId?: OwnedMobimonId
}

const emptyTeam = (field: TeamField): Team => ({ field, leader: null, directReports: [] })

/**
 * プレイヤーの組織。3分野のチームを持ち、各チームは2階層(リーダー → 部下 → サブリーダーの下のメンバー)。
 * 1体のモビモンが入れるのは1チームの1か所まで。
 */
export class Organization {
  readonly playerId: PlayerId
  readonly teams: readonly Team[]

  private constructor(playerId: PlayerId, teams: readonly Team[]) {
    this.playerId = playerId
    this.teams = teams
  }

  static create(playerId: PlayerId): Organization {
    return new Organization(playerId, TEAM_FIELDS.map(emptyTeam))
  }

  static reconstruct(playerId: PlayerId, teams: readonly Team[]): Organization {
    return new Organization(
      playerId,
      TEAM_FIELDS.map((field) => teams.find((t) => t.field === field) ?? emptyTeam(field)),
    )
  }

  team(field: TeamField): Team {
    return this.teams.find((t) => t.field === field)!
  }

  /** チームに入っている全モビモンの ID。 */
  get assignedIds(): OwnedMobimonId[] {
    return this.teams.flatMap((t) => [
      ...(t.leader ? [t.leader] : []),
      ...t.directReports.flatMap((d) => [d.id, ...d.members]),
    ])
  }

  positionOf(id: OwnedMobimonId): Position | undefined {
    for (const t of this.teams) {
      if (t.leader === id) return { field: t.field, role: 'リーダー' }
      for (const d of t.directReports) {
        if (d.id === id)
          return { field: t.field, role: d.isSubLeader ? 'サブリーダー' : 'メンバー' }
        if (d.members.includes(id)) return { field: t.field, role: 'メンバー', subLeaderId: d.id }
      }
    }
    return undefined
  }

  /** リーダーを置く(いまのリーダーはチームから外れる)。サブリーダーの数が上限を超えたら整える。 */
  setLeader(field: TeamField, m: TeamMemberInfo, lookup: MobimonLookup): Organization {
    this.assertFree(m.id)
    if (!canLead(field, m)) {
      throw new DomainError(
        'リーダーになれるのは、そのチームの事業分野のアンコモン以上のモビモンです',
      )
    }
    return this.withTeam({ ...this.team(field), leader: m.id }).normalize(lookup).organization
  }

  /** リーダーの直属の部下にする(4体まで)。 */
  addDirectReport(field: TeamField, m: TeamMemberInfo): Organization {
    this.assertFree(m.id)
    const team = this.team(field)
    if (team.directReports.length >= MAX_DIRECT_REPORTS) {
      throw new DomainError(`リーダーの部下は ${MAX_DIRECT_REPORTS}体までです`)
    }
    return this.withTeam({
      ...team,
      directReports: [...team.directReports, { id: m.id, isSubLeader: false, members: [] }],
    })
  }

  /** 部下をサブリーダーにする / サブリーダーをやめる(やめると、その下のメンバーはチームから外れる)。 */
  setSubLeader(
    field: TeamField,
    id: OwnedMobimonId,
    isSubLeader: boolean,
    lookup: MobimonLookup,
  ): Organization {
    const team = this.team(field)
    const report = team.directReports.find((d) => d.id === id)
    if (!report) throw new DomainError('リーダーの部下ではありません')
    if (isSubLeader) {
      const leader = team.leader ? lookup(team.leader) : undefined
      const limit = maxSubLeaders(leader?.rarity ?? null)
      if (limit === 0) {
        throw new DomainError('サブリーダーを置けるのは、リーダーがレア・超レアのときだけです')
      }
      const info = lookup(id)
      if (!info || !canBeSubLeader(info)) {
        throw new DomainError('サブリーダーになれるのは、アンコモン・レアのモビモンです')
      }
      const current = team.directReports.filter((d) => d.isSubLeader && d.id !== id).length
      if (current >= limit) {
        throw new DomainError(`このリーダーの下に置けるサブリーダーは ${limit}体までです`)
      }
    }
    return this.withTeam({
      ...team,
      directReports: team.directReports.map((d) =>
        d.id === id ? { ...d, isSubLeader, members: isSubLeader ? d.members : [] } : d,
      ),
    })
  }

  /** サブリーダーの下のメンバーにする(4体まで)。 */
  addMemberUnder(field: TeamField, subLeaderId: OwnedMobimonId, m: TeamMemberInfo): Organization {
    this.assertFree(m.id)
    const team = this.team(field)
    const sub = team.directReports.find((d) => d.id === subLeaderId && d.isSubLeader)
    if (!sub) throw new DomainError('サブリーダーではありません')
    if (sub.members.length >= MAX_MEMBERS_PER_SUB_LEADER) {
      throw new DomainError(`サブリーダーの下のメンバーは ${MAX_MEMBERS_PER_SUB_LEADER}体までです`)
    }
    return this.withTeam({
      ...team,
      directReports: team.directReports.map((d) =>
        d.id === subLeaderId ? { ...d, members: [...d.members, m.id] } : d,
      ),
    })
  }

  /** チームから外す。サブリーダーを外すと、その下のメンバーも外れる。 */
  remove(id: OwnedMobimonId): Organization {
    const position = this.positionOf(id)
    if (!position) return this
    const team = this.team(position.field)
    if (position.role === 'リーダー') return this.withTeam({ ...team, leader: null })
    return this.withTeam({
      ...team,
      directReports: team.directReports
        .filter((d) => d.id !== id)
        .map((d) => ({ ...d, members: d.members.filter((m) => m !== id) })),
    })
  }

  /**
   * 条件を満たさなくなった配置を外す(持っていないモビモン、資格のないリーダー、
   * 置ける数を超えたサブリーダーなど)。外した ID を返す。
   */
  normalize(
    lookup: MobimonLookup,
    /** 仕事を受けているチーム(組み替えないので、整えもしない)。 */
    locked: ReadonlySet<TeamField> = new Set(),
  ): { organization: Organization; removed: OwnedMobimonId[] } {
    const removed: OwnedMobimonId[] = []
    const owned = (id: OwnedMobimonId) => {
      if (lookup(id)) return true
      removed.push(id)
      return false
    }
    const teams = this.teams.map((team): Team => {
      if (locked.has(team.field)) return team
      let leader = team.leader
      if (leader && (!owned(leader) || !canLead(team.field, lookup(leader)!))) {
        if (lookup(leader)) removed.push(leader)
        leader = null
      }
      let subLeaders = 0
      const limit = maxSubLeaders(leader ? lookup(leader)!.rarity : null)
      const directReports = team.directReports
        .filter((d) => {
          if (owned(d.id)) return true
          removed.push(...d.members)
          return false
        })
        .map((d): DirectReport => {
          if (!d.isSubLeader) return d
          const valid = canBeSubLeader(lookup(d.id)!) && subLeaders < limit
          if (valid) {
            subLeaders++
            return { ...d, members: d.members.filter(owned) }
          }
          removed.push(...d.members)
          return { ...d, isSubLeader: false, members: [] }
        })
      return { ...team, leader, directReports }
    })
    return { organization: new Organization(this.playerId, teams), removed: [...new Set(removed)] }
  }

  /** 受注するときのチーム編成(リーダーがいなければ undefined)。 */
  snapshot(field: TeamField): TeamSnapshotLike | undefined {
    const team = this.team(field)
    if (!team.leader) return undefined
    return {
      leader: team.leader,
      subLeaders: team.directReports.filter((d) => d.isSubLeader).map((d) => d.id),
      members: team.directReports.flatMap((d) => (d.isSubLeader ? d.members : [d.id])),
    }
  }

  private assertFree(id: OwnedMobimonId) {
    if (this.positionOf(id)) throw new DomainError('このモビモンはすでにチームに入っています')
  }

  private withTeam(team: Team): Organization {
    return new Organization(
      this.playerId,
      this.teams.map((t) => (t.field === team.field ? team : t)),
    )
  }
}
