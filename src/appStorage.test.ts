import { APP_STORAGE_KEY, LEGACY_USER_ID_KEY, loadOrCreateUserId } from './appStorage.ts'
import { sequentialIdGenerator } from './shared/IdGenerator.ts'

describe('loadOrCreateUserId', () => {
  beforeEach(() => localStorage.clear())

  it('初回は ID を発行して版番号付きで保存し、次回も同じ ID を返す', () => {
    const id = loadOrCreateUserId(localStorage, sequentialIdGenerator('u'))
    expect(id).toBe('u-1')
    expect(JSON.parse(localStorage.getItem(APP_STORAGE_KEY)!)).toEqual({
      version: 1,
      data: { userId: 'u-1' },
    })
    expect(loadOrCreateUserId(localStorage, sequentialIdGenerator('other'))).toBe('u-1')
  })

  it('版番号のない旧キー(mobimongo:userId)の ID を引き継ぎ、旧キーを消す', () => {
    localStorage.setItem(LEGACY_USER_ID_KEY, 'legacy-user')
    expect(loadOrCreateUserId(localStorage, sequentialIdGenerator('u'))).toBe('legacy-user')
    expect(localStorage.getItem(LEGACY_USER_ID_KEY)).toBeNull()
    expect(loadOrCreateUserId(localStorage, sequentialIdGenerator('u'))).toBe('legacy-user')
  })
})
