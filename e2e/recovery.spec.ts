import { readFileSync } from 'node:fs'
import { expect, prepare, test } from './fixtures.ts'

test('読み取れないデータ: 案内 → 書き出し → 確認してから初期化 → 新しい状態で起動', async ({
  page,
}) => {
  await prepare(page, {
    seed: { 'mobimongo:stepResource': '{壊れた', 'other-site': 'keep' },
  })
  await page.goto('/')
  await expect(page.getByText('データの更新に失敗しました')).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'データを書き出す' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('mobimongo-data-20260928.json')
  const exported = JSON.parse(readFileSync((await file.path())!, 'utf8'))
  expect(exported.entries['mobimongo:stepResource']).toBe('{壊れた')

  await page.getByRole('button', { name: '初期化する' }).click()
  await expect(page.getByRole('alert')).toContainText('すべてのデータが消えます')
  await page.getByRole('button', { name: 'すべて消して初期化する' }).click()

  await expect(page.getByRole('heading', { name: '今日のようす' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('other-site'))).toBe('keep')
})

test('アプリより新しい版のデータ: 更新を案内し、初期化は出さない', async ({ page }) => {
  await prepare(page, {
    seed: { 'mobimongo:mobimon': JSON.stringify({ version: 99, data: {} }) },
  })
  await page.goto('/')
  await expect(page.getByText('アプリを最新の状態に更新してください')).toBeVisible()
  await expect(page.getByRole('button', { name: '再読み込みする' })).toBeVisible()
  await expect(page.getByRole('button', { name: '初期化する' })).toHaveCount(0)
  // データには触れない
  expect(await page.evaluate(() => localStorage.getItem('mobimongo:mobimon'))).toBe(
    JSON.stringify({ version: 99, data: {} }),
  )
})
