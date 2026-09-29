import { DomainError } from '../../shared/DomainError.ts'
import type { BusinessField } from './BusinessField.ts'
import { ownedMobimonId, type OwnedMobimonId } from './ids.ts'
import { acceptableRanks } from './JobRank.ts'
import { Organization, type MobimonLookup, type TeamMemberInfo } from './Organization.ts'
import type { Rarity } from './Rarity.ts'
import { PLAYER } from './testHelpers.ts'

const THERMAL = 'サーマルマネジメント&エアコンシステム'
const POWERTRAIN = 'パワートレインシステム'

/** テスト用の所持モビモンの一覧。 */
function roster(entries: Record<string, [Rarity, BusinessField | null]>) {
  const infos = new Map<OwnedMobimonId, TeamMemberInfo>(
    Object.entries(entries).map(([id, [rarity, businessField]]) => [
      ownedMobimonId(id),
      { id: ownedMobimonId(id), rarity, businessField },
    ]),
  )
  const lookup: MobimonLookup = (id) => infos.get(id)
  const info = (id: string) => infos.get(ownedMobimonId(id))!
  return { lookup, info, remove: (id: string) => infos.delete(ownedMobimonId(id)) }
}

const r = roster({
  thermalCommon: ['コモン', THERMAL],
  thermalUncommon: ['アンコモン', THERMAL],
  thermalRare: ['レア', THERMAL],
  thermalSuper: ['超レア', THERMAL],
  powertrainRare: ['レア', POWERTRAIN],
  homeUncommon: ['アンコモン', 'ホーム'],
  homeRare: ['レア', 'ホーム'],
  homeCommon: ['コモン', 'ホーム'],
  superOther: ['超レア', null],
  a: ['コモン', 'ホーム'],
  b: ['コモン', 'ホーム'],
  c: ['コモン', 'ホーム'],
  d: ['コモン', 'ホーム'],
  e: ['コモン', 'ホーム'],
  u1: ['アンコモン', 'ホーム'],
  u2: ['アンコモン', 'ホーム'],
  u3: ['アンコモン', 'ホーム'],
  u4: ['アンコモン', 'ホーム'],
})
const id = ownedMobimonId

describe('Organization', () => {
  it('3分野のチームだけを持つ', () => {
    expect(Organization.create(PLAYER).teams.map((t) => t.field)).toEqual([
      THERMAL,
      POWERTRAIN,
      'セーフティ&コックピットシステム',
    ])
  })

  describe('リーダー', () => {
    it('そのチームの事業分野のアンコモン以上だけがなれる', () => {
      const org = Organization.create(PLAYER)
      expect(org.setLeader(THERMAL, r.info('thermalUncommon'), r.lookup).team(THERMAL).leader).toBe(
        'thermalUncommon',
      )
      expect(() => org.setLeader(THERMAL, r.info('thermalCommon'), r.lookup)).toThrow(DomainError)
      expect(() => org.setLeader(THERMAL, r.info('powertrainRare'), r.lookup)).toThrow(DomainError)
      expect(() => org.setLeader(THERMAL, r.info('superOther'), r.lookup)).toThrow(DomainError)
    })

    it('受注できるランクはリーダーのレア度で決まる', () => {
      expect(acceptableRanks('アンコモン')).toEqual(['C', 'B'])
      expect(acceptableRanks('レア')).toEqual(['B', 'A'])
      expect(acceptableRanks('超レア')).toEqual(['A', 'S'])
      expect(acceptableRanks(null)).toEqual([])
    })
  })

  describe('部下とサブリーダー', () => {
    it('部下は4体まで。事業分野・レア度は問わない', () => {
      let org = Organization.create(PLAYER).setLeader(THERMAL, r.info('thermalUncommon'), r.lookup)
      for (const m of ['a', 'superOther', 'homeRare', 'powertrainRare']) {
        org = org.addDirectReport(THERMAL, r.info(m))
      }
      expect(org.team(THERMAL).directReports).toHaveLength(4)
      expect(() => org.addDirectReport(THERMAL, r.info('b'))).toThrow('4体まで')
    })

    it('アンコモンのリーダーの下にサブリーダーは置けない', () => {
      const org = Organization.create(PLAYER)
        .setLeader(THERMAL, r.info('thermalUncommon'), r.lookup)
        .addDirectReport(THERMAL, r.info('homeUncommon'))
      expect(() => org.setSubLeader(THERMAL, id('homeUncommon'), true, r.lookup)).toThrow(
        'レア・超レア',
      )
    })

    it('レアのリーダーはサブリーダー1体まで(レアのサブリーダーも置ける)', () => {
      let org = Organization.create(PLAYER)
        .setLeader(THERMAL, r.info('thermalRare'), r.lookup)
        .addDirectReport(THERMAL, r.info('homeRare'))
        .addDirectReport(THERMAL, r.info('homeUncommon'))
      org = org.setSubLeader(THERMAL, id('homeRare'), true, r.lookup)
      expect(() => org.setSubLeader(THERMAL, id('homeUncommon'), true, r.lookup)).toThrow('1体まで')
    })

    it('超レアのリーダーはサブリーダー4体まで', () => {
      let org = Organization.create(PLAYER).setLeader(THERMAL, r.info('thermalSuper'), r.lookup)
      for (const m of ['u1', 'u2', 'u3', 'u4']) {
        org = org.addDirectReport(THERMAL, r.info(m)).setSubLeader(THERMAL, id(m), true, r.lookup)
      }
      expect(org.team(THERMAL).directReports.every((d) => d.isSubLeader)).toBe(true)
    })

    it('サブリーダーになれるのはアンコモン・レアだけ', () => {
      const org = Organization.create(PLAYER)
        .setLeader(THERMAL, r.info('thermalSuper'), r.lookup)
        .addDirectReport(THERMAL, r.info('homeCommon'))
        .addDirectReport(THERMAL, r.info('superOther'))
      expect(() => org.setSubLeader(THERMAL, id('homeCommon'), true, r.lookup)).toThrow(DomainError)
      expect(() => org.setSubLeader(THERMAL, id('superOther'), true, r.lookup)).toThrow(DomainError)
    })

    it('サブリーダーの下は4体まで。レア度・事業分野は問わない', () => {
      let org = Organization.create(PLAYER)
        .setLeader(THERMAL, r.info('thermalRare'), r.lookup)
        .addDirectReport(THERMAL, r.info('homeUncommon'))
        .setSubLeader(THERMAL, id('homeUncommon'), true, r.lookup)
      for (const m of ['a', 'b', 'c', 'superOther']) {
        org = org.addMemberUnder(THERMAL, id('homeUncommon'), r.info(m))
      }
      expect(() => org.addMemberUnder(THERMAL, id('homeUncommon'), r.info('d'))).toThrow('4体まで')
      expect(org.positionOf(id('a'))).toEqual({
        field: THERMAL,
        role: 'メンバー',
        subLeaderId: 'homeUncommon',
      })
    })

    it('サブリーダーをやめると、その下のメンバーはチームから外れる', () => {
      const org = Organization.create(PLAYER)
        .setLeader(THERMAL, r.info('thermalRare'), r.lookup)
        .addDirectReport(THERMAL, r.info('homeUncommon'))
        .setSubLeader(THERMAL, id('homeUncommon'), true, r.lookup)
        .addMemberUnder(THERMAL, id('homeUncommon'), r.info('a'))
        .setSubLeader(THERMAL, id('homeUncommon'), false, r.lookup)
      expect(org.positionOf(id('a'))).toBeUndefined()
      expect(org.positionOf(id('homeUncommon'))?.role).toBe('メンバー')
    })
  })

  it('1体が入れるのは1チームの1か所まで', () => {
    const org = Organization.create(PLAYER)
      .setLeader(THERMAL, r.info('thermalRare'), r.lookup)
      .addDirectReport(THERMAL, r.info('a'))
    expect(() => org.addDirectReport(POWERTRAIN, r.info('a'))).toThrow('すでにチーム')
    expect(() => org.setLeader(POWERTRAIN, r.info('thermalRare'), r.lookup)).toThrow('すでにチーム')
  })

  it('リーダーを外すと、置けるサブリーダーの数に合わせてサブリーダーが外れる', () => {
    let org = Organization.create(PLAYER)
      .setLeader(THERMAL, r.info('thermalRare'), r.lookup)
      .addDirectReport(THERMAL, r.info('homeUncommon'))
      .setSubLeader(THERMAL, id('homeUncommon'), true, r.lookup)
      .addMemberUnder(THERMAL, id('homeUncommon'), r.info('a'))
    org = org.remove(id('thermalRare'))
    const { organization, removed } = org.normalize(r.lookup)
    expect(organization.positionOf(id('homeUncommon'))?.role).toBe('メンバー')
    expect(removed).toEqual(['a'])
  })

  it('超レアからレアのリーダーに替えると、2体目以降のサブリーダーが外れる', () => {
    let org = Organization.create(PLAYER).setLeader(THERMAL, r.info('thermalSuper'), r.lookup)
    for (const m of ['u1', 'u2']) {
      org = org.addDirectReport(THERMAL, r.info(m)).setSubLeader(THERMAL, id(m), true, r.lookup)
    }
    org = org.remove(id('thermalSuper')).setLeader(THERMAL, r.info('thermalRare'), r.lookup)
    expect(org.team(THERMAL).directReports.map((d) => d.isSubLeader)).toEqual([true, false])
  })

  it('持っていないモビモンの配置は整えるときに外れる', () => {
    const local = roster({ leader: ['レア', THERMAL], gone: ['コモン', 'ホーム'] })
    const org = Organization.create(PLAYER)
      .setLeader(THERMAL, local.info('leader'), local.lookup)
      .addDirectReport(THERMAL, local.info('gone'))
    local.remove('gone')
    const { organization, removed } = org.normalize(local.lookup)
    expect(organization.team(THERMAL).directReports).toEqual([])
    expect(removed).toEqual(['gone'])
  })
})
