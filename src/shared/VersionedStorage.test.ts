import { VersionedStorage } from './VersionedStorage.ts'

describe('VersionedStorage', () => {
  beforeEach(() => localStorage.clear())

  it('旧い版のデータを移行して読み込む', () => {
    localStorage.setItem('k', JSON.stringify({ version: 1, data: { name: 'a' } }))
    const storage = new VersionedStorage<{ name: string; count: number }>(localStorage, 'k', 2, {
      1: (data) => ({ ...(data as object), count: 0 }),
    })
    expect(storage.load()).toEqual({ name: 'a', count: 0 })
  })

  it('このアプリより新しい版のデータは読み込まない', () => {
    localStorage.setItem('k', JSON.stringify({ version: 3, data: {} }))
    expect(() => new VersionedStorage(localStorage, 'k', 2).load()).toThrow('新しい形式')
  })
})
