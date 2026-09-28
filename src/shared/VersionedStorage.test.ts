import { backupKeyOf, StorageError, VersionedStorage } from './VersionedStorage.ts'

type V2 = { name: string; count: number }

const migrations = { 1: (data: unknown) => ({ ...(data as object), count: 0 }) }
const v1 = JSON.stringify({ version: 1, data: { name: 'a' } })

function errorOf(fn: () => unknown): StorageError {
  try {
    fn()
  } catch (e) {
    if (e instanceof StorageError) return e
    throw e
  }
  throw new Error('StorageError が投げられませんでした')
}

describe('VersionedStorage', () => {
  beforeEach(() => localStorage.clear())

  it('旧い版のデータを移行して読み込み、すぐに新しい版で保存し直す', () => {
    localStorage.setItem('k', v1)
    const storage = new VersionedStorage<V2>(localStorage, 'k', 2, migrations)
    expect(storage.load()).toEqual({ name: 'a', count: 0 })
    expect(JSON.parse(localStorage.getItem('k')!)).toEqual({
      version: 2,
      data: { name: 'a', count: 0 },
    })
  })

  it('移行は1回だけ走る(2回目の読み込みでは変換関数を呼ばない)', () => {
    localStorage.setItem('k', v1)
    const step = vi.fn(migrations[1])
    const storage = new VersionedStorage<V2>(localStorage, 'k', 2, { 1: step })
    storage.load()
    storage.load()
    expect(step).toHaveBeenCalledTimes(1)
  })

  it('移行の前に元のデータをバックアップする', () => {
    localStorage.setItem('k', v1)
    new VersionedStorage<V2>(localStorage, 'k', 2, migrations).load()
    expect(localStorage.getItem(backupKeyOf('k'))).toBe(v1)
  })

  it('1版ずつ順に変換する', () => {
    localStorage.setItem('k', v1)
    const storage = new VersionedStorage<{ name: string; count: number; tag: string }>(
      localStorage,
      'k',
      3,
      { ...migrations, 2: (data) => ({ ...(data as object), tag: 'x' }) },
    )
    expect(storage.load()).toEqual({ name: 'a', count: 0, tag: 'x' })
  })

  it('移行に失敗しても元のデータを書き換えない', () => {
    localStorage.setItem('k', v1)
    const storage = new VersionedStorage<V2>(localStorage, 'k', 2, {
      1: () => {
        throw new Error('変換の誤り')
      },
    })
    expect(errorOf(() => storage.load())).toMatchObject({ kind: 'migrationFailed', key: 'k' })
    expect(localStorage.getItem('k')).toBe(v1)
  })

  it('変換関数がない版からは移行できない', () => {
    localStorage.setItem('k', v1)
    const storage = new VersionedStorage<V2>(localStorage, 'k', 2)
    expect(errorOf(() => storage.load()).kind).toBe('migrationFailed')
  })

  it('このアプリより新しい版のデータには触れない', () => {
    const newer = JSON.stringify({ version: 3, data: {} })
    localStorage.setItem('k', newer)
    const storage = new VersionedStorage(localStorage, 'k', 2)
    expect(errorOf(() => storage.load()).kind).toBe('tooNew')
    expect(localStorage.getItem('k')).toBe(newer)
    expect(localStorage.getItem(backupKeyOf('k'))).toBeNull()
  })

  it.each(['{壊れた', 'null', '{"data":{}}', '{"version":0,"data":{}}'])(
    '読めないデータ(%s)は corrupt',
    (raw) => {
      localStorage.setItem('k', raw)
      expect(errorOf(() => new VersionedStorage(localStorage, 'k', 1).load()).kind).toBe('corrupt')
    },
  )

  it('同じ版のデータはそのまま読み、保存し直さない', () => {
    localStorage.setItem('k', JSON.stringify({ version: 2, data: { name: 'a', count: 1 } }))
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    expect(new VersionedStorage<V2>(localStorage, 'k', 2, migrations).load()).toEqual({
      name: 'a',
      count: 1,
    })
    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })
})
