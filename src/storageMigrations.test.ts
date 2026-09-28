/**
 * 保存データの移行のテスト。tests/fixtures/storage/<キー>/v<版>.json にある、すべての版の見本について
 * 最新の版まで移行でき、リポジトリで読み込めることを確かめる。
 * 保存形式を変えて版を上げたときは、1つ前の版の見本を残したまま、新しい版の見本を追加する。
 */
import { loadOrCreateUserId } from './appStorage.ts'
import { MOBIMON_STORAGE_KEY } from './mobimon/infrastructure/LocalStorageMobimonRepository.ts'
import { LocalStorageMobimonRepository } from './mobimon/infrastructure/LocalStorageMobimonRepository.ts'
import * as mobimonMigrations from './mobimon/infrastructure/migrations/index.ts'
import { ITEMS } from './mobimon/masterData/items.ts'
import { SPECIES } from './mobimon/masterData/species.ts'
import { TITLES } from './mobimon/masterData/titles.ts'
import { sequentialIdGenerator } from './shared/IdGenerator.ts'
import { migrate, type Envelope, type Migrations } from './shared/VersionedStorage.ts'
import {
  LocalStorageStepResourceRepository,
  STEP_RESOURCE_STORAGE_KEY,
} from './stepResource/infrastructure/LocalStorageStepResourceRepository.ts'
import * as stepResourceMigrations from './stepResource/infrastructure/migrations/index.ts'

const fixtures = import.meta.glob<Envelope>('../tests/fixtures/storage/*/v*.json', {
  eager: true,
  import: 'default',
})

/** 見本のフォルダ名(キーの : を - にしたもの)ごとの、版・移行・読み込み方法。 */
const TARGETS: Record<
  string,
  { key: string; current: number; migrations: Migrations; load: () => unknown }
> = {
  'mobimongo-stepResource': {
    key: STEP_RESOURCE_STORAGE_KEY,
    current: stepResourceMigrations.CURRENT_VERSION,
    migrations: stepResourceMigrations.MIGRATIONS,
    load: () => new LocalStorageStepResourceRepository(localStorage).load(),
  },
  'mobimongo-mobimon': {
    key: MOBIMON_STORAGE_KEY,
    current: mobimonMigrations.CURRENT_VERSION,
    migrations: mobimonMigrations.MIGRATIONS,
    load: () => new LocalStorageMobimonRepository(localStorage).load(),
  },
  'mobimongo-app': {
    key: 'mobimongo:app',
    current: 1,
    migrations: {},
    load: () => loadOrCreateUserId(localStorage, sequentialIdGenerator()),
  },
}

const samples = Object.entries(fixtures).map(([path, envelope]) => {
  const [, folder, version] = /storage\/([^/]+)\/v(\d+)\.json$/.exec(path)!
  return { folder, version: Number(version), envelope }
})

describe('保存データの移行(すべての版の見本)', () => {
  beforeEach(() => localStorage.clear())

  it.each(Object.entries(TARGETS))(
    '%s: 1 から最新の版まで、すべての版の見本がある',
    (folder, t) => {
      const versions = samples.filter((s) => s.folder === folder).map((s) => s.version)
      expect(versions.sort((a, b) => a - b)).toEqual(
        Array.from({ length: t.current }, (_, i) => i + 1),
      )
    },
  )

  it.each(samples.map((s) => [`${s.folder} v${s.version}`, s] as const))(
    '%s を最新の版まで移行して読み込める',
    (_, sample) => {
      const target = TARGETS[sample.folder]
      expect(target, `見本のフォルダ ${sample.folder} に対応する保存先がありません`).toBeDefined()
      localStorage.setItem(target.key, JSON.stringify(sample.envelope))

      expect(() => target.load()).not.toThrow()
      expect(JSON.parse(localStorage.getItem(target.key)!).version).toBe(target.current)
      // 2回目の読み込みでも同じように読める(移行は1回だけ)
      expect(() => target.load()).not.toThrow()
    },
  )

  it.each(samples.map((s) => [`${s.folder} v${s.version}`, s] as const))(
    '%s の移行は何度実行しても同じ結果になる',
    (_, sample) => {
      const target = TARGETS[sample.folder]
      const once = migrate(structuredClone(sample.envelope), target.current, target.migrations)
      const twice = migrate(structuredClone(sample.envelope), target.current, target.migrations)
      expect(twice).toEqual(once)
    },
  )
})

describe('保存データにある ID が、すべてマスターデータに存在する', () => {
  const speciesIds = new Set<string>(SPECIES.map((s) => s.id))
  const itemIds = new Set<string>(ITEMS.map((i) => i.id))
  const titleIds = new Set<string>(TITLES.map((t) => t.id))

  it.each(
    samples
      .filter((s) => s.folder === 'mobimongo-mobimon')
      .map((s) => [`v${s.version}`, s] as const),
  )('mobimongo-mobimon %s', (_, sample) => {
    const data = migrate(
      structuredClone(sample.envelope),
      mobimonMigrations.CURRENT_VERSION,
      mobimonMigrations.MIGRATIONS,
    ) as {
      players: { titles: string[] }[]
      inventories: { counts: [string, number][]; pending: [string, number][] }[]
      mobidexes: { registered: string[] }[]
      encounters: { speciesId: string }[]
      ownedMobimons: { speciesId: string }[]
    }
    const species = [
      ...data.mobidexes.flatMap((m) => m.registered),
      ...data.encounters.map((e) => e.speciesId),
      ...data.ownedMobimons.map((o) => o.speciesId),
    ]
    const items = data.inventories.flatMap((i) => [...i.counts, ...i.pending].map(([id]) => id))
    const titles = data.players.flatMap((p) => p.titles)
    expect(species.filter((id) => !speciesIds.has(id))).toEqual([])
    expect(items.filter((id) => !itemIds.has(id))).toEqual([])
    expect(titles.filter((id) => !titleIds.has(id))).toEqual([])
  })
})
