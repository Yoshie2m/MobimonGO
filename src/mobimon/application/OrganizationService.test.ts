import { fixedClock } from '../../shared/Clock.ts'
import { DomainError } from '../../shared/DomainError.ts'
import { sequentialIdGenerator } from '../../shared/IdGenerator.ts'
import { ownedMobimonId, playerId } from '../domain/ids.ts'
import {
  emptyMobimonState,
  type MobimonRepository,
  type MobimonState,
} from '../domain/MobimonRepository.ts'
import { experienceToReach, OwnedMobimon } from '../domain/OwnedMobimon.ts'
import { SPECIES } from '../masterData/species.ts'
import { MobimonService } from './MobimonService.ts'
import { OrganizationService } from './OrganizationService.ts'

class InMemoryRepository implements MobimonRepository {
  state: MobimonState = emptyMobimonState()
  load(): MobimonState {
    return Object.fromEntries(
      Object.entries(this.state).map(([key, list]) => [key, [...list]]),
    ) as unknown as MobimonState
  }
  save(state: MobimonState): void {
    this.state = state
  }
}

const USER = 'user-1'
const THERMAL = 'サーマルマネジメント'
const byName = (name: string) => SPECIES.find((s) => s.name === name)!

function setup() {
  const repository = new InMemoryRepository()
  const game = new MobimonService(
    repository,
    fixedClock(new Date(2026, 8, 28, 12)),
    sequentialIdGenerator(),
  )
  game.registerPlayer(USER)
  const org = new OrganizationService(repository)
  const give = (name: string, experience = 0) => {
    const owned = OwnedMobimon.reconstruct(
      ownedMobimonId(`o-${name}-${repository.state.ownedMobimons.length}`),
      playerId(USER),
      byName(name).id,
      experience,
    )
    repository.state.ownedMobimons.push(owned)
    return owned.id
  }
  return { repository, game, org, give }
}

describe('OrganizationService', () => {
  it('プレイヤーの登録で、空の3チームの組織ができる', () => {
    const { org } = setup()
    const view = org.getOrganization(USER)
    expect(view.teams.map((t) => [t.field, t.leader, t.size])).toEqual([
      [THERMAL, null, 0],
      ['パワートレイン', null, 0],
      ['インフォテイメント', null, 0],
    ])
  })

  it('リーダー候補は、チームに入っていない、そのチームの事業分野のアンコモン以上だけ', () => {
    const { org, give } = setup()
    give('ヒエポレ') // サーマル・アンコモン
    give('フウフウ') // サーマル・コモン
    give('キリフキオウ') // パワートレイン・レア
    const thermal = org.getOrganization(USER).teams[0]
    expect(thermal.leaderCandidates.map((m) => m.name)).toEqual(['ヒエポレ'])
  })

  it('超レアのリーダーで、サブリーダーと、その下のメンバーを置ける', () => {
    const { org, give } = setup()
    const leader = give('ゼンネツオウ') // サーマル・超レア
    const sub = give('スズカゼン') // スマートホーム・アンコモン(分野は問わない)
    const member = give('デンまる') // 分野なし・超レア(メンバーとしては入れる)
    org.setLeader(USER, THERMAL, leader)
    org.addDirectReport(USER, THERMAL, sub)
    org.setSubLeader(USER, THERMAL, sub, true)
    org.addMemberUnder(USER, THERMAL, sub, member)

    const thermal = org.getOrganization(USER).teams[0]
    expect(thermal).toMatchObject({
      acceptableRanks: ['A', 'S'],
      maxSubLeaders: 4,
      subLeaderCount: 1,
      size: 3,
      maxSize: 21,
    })
    expect(thermal.directReports[0]).toMatchObject({
      member: { name: 'スズカゼン' },
      isSubLeader: true,
      members: [{ name: 'デンまる' }],
    })
    expect(org.getOrganization(USER).unassigned).toEqual([])
  })

  it('サブリーダーにできる部下を示す(アンコモンのリーダーの下では示さない)', () => {
    const { org, give } = setup()
    const leader = give('ヒエポレ')
    const report = give('スズカゼン')
    org.setLeader(USER, THERMAL, leader)
    org.addDirectReport(USER, THERMAL, report)
    const thermal = org.getOrganization(USER).teams[0]
    expect(thermal).toMatchObject({ acceptableRanks: ['C', 'B'], maxSubLeaders: 0, maxSize: 5 })
    expect(thermal.directReports[0].canBecomeSubLeader).toBe(false)
  })

  it('3分野以外にはチームを作れない', () => {
    const { org, give } = setup()
    expect(() => org.setLeader(USER, 'スマートホーム', give('スズカゼン'))).toThrow(DomainError)
  })

  it('外すと、なかまの一覧の所属も消える', () => {
    const { org, game, give } = setup()
    const leader = give('ヒエポレ')
    org.setLeader(USER, THERMAL, leader)
    expect(game.listOwnedMobimon(USER)[0].team).toEqual({ field: THERMAL, role: 'リーダー' })
    org.removeFromTeam(USER, leader)
    expect(game.listOwnedMobimon(USER)[0].team).toBeNull()
  })

  it('進化しても、条件を満たす配置はそのまま残る', () => {
    const { org, game, give } = setup()
    const leader = give('フウフウ', experienceToReach(10)) // コモンはリーダーになれない
    const [option] = game.listOwnedMobimon(USER)[0].evolutionOptions
    game.evolve(USER, leader, option.speciesId) // アンコモン(ヒエポレ)に進化
    org.setLeader(USER, THERMAL, leader)
    expect(org.getOrganization(USER).teams[0].leader?.name).toBe('ヒエポレ')
  })
})

describe('日ごとの歩数の受け取り', () => {
  it('DailyStepsCounted を記録し、同じ日の小さい値は無視する', () => {
    const { game, repository } = setup()
    const event = (steps: number) =>
      game.handleStepResourceEvent({
        type: 'DailyStepsCounted',
        walkerId: USER,
        date: '2026-09-28',
        steps,
      })
    event(8_000)
    event(5_000)
    expect(repository.state.dailyStepLogs[0].stepsOn('2026-09-28')).toBe(8_000)
  })
})
