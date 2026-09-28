import { test as base, expect, type Page } from '@playwright/test'

/** E2E の「今」。利用開始日・時間帯(昼)が毎回同じになるよう固定する。 */
export const NOW = new Date('2026-09-28T12:00:00+09:00')
export const TODAY = '2026-09-28'

interface Options {
  /** 保存データを事前に入れる(キー → そのまま保存する文字列)。最初の読み込みのときだけ入れる。 */
  seed?: Record<string, string>
  /** 乱数を決まった順の値にする(どのモビモンが出るかを固定したい場面だけ使う)。 */
  seededRandom?: number
}

/**
 * ページを開く前の準備: 時計の固定・乱数の固定・保存データの事前投入。
 * 保存データの投入は同じタブで1回だけ行い、再読み込みでは入れ直さない(保存の確認ができるように)。
 */
export async function prepare(page: Page, { seed, seededRandom }: Options = {}) {
  await page.clock.setFixedTime(NOW)
  await page.addInitScript(
    ({ seed, seededRandom }) => {
      if (seededRandom !== undefined) {
        // mulberry32: 決まった種から決まった順の値を返す
        let a = seededRandom >>> 0
        Math.random = () => {
          a = (a + 0x6d2b79f5) >>> 0
          let t = a
          t = Math.imul(t ^ (t >>> 15), t | 1)
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296
        }
      }
      if (seed && !sessionStorage.getItem('e2e:seeded')) {
        sessionStorage.setItem('e2e:seeded', '1')
        localStorage.clear()
        for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, value)
      }
    },
    { seed, seededRandom },
  )
}

/** 利用開始日を指定したウォーカーを事前に入れる(利用開始日より前の歩数を取り込む場面用)。 */
export function walkerStartingOn(startDate: string, userId = 'e2e-user'): Record<string, string> {
  return {
    'mobimongo:app': JSON.stringify({ version: 1, data: { userId } }),
    'mobimongo:stepResource': JSON.stringify({
      version: 1,
      data: { walkers: [{ id: userId, startDate }], stepRecords: [], dailyGrants: [] },
    }),
  }
}

/** ヘッダーのエネルギー・ポイント・時間帯。 */
export function header(page: Page) {
  return page.getByLabel('いまの状態')
}

export function menu(page: Page, label: string) {
  return page.getByRole('navigation', { name: 'メニュー' }).getByRole('button', { name: label })
}

/** 手入力で歩数を取り込む。 */
export async function importManually(page: Page, date: string, steps: string) {
  await menu(page, '歩数').click()
  await page.getByLabel('日付').fill(date)
  await page.getByLabel('歩数', { exact: true }).fill(steps)
  await page.getByRole('button', { name: '確認リストに追加' }).click()
  await page.getByRole('button', { name: '取り込む' }).click()
  await expect(page.getByText('取り込み結果')).toBeVisible()
}

export const test = base
export { expect }
