import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, header, menu, prepare, test } from './fixtures.ts'

const FIXTURES = path.join(import.meta.dirname, '../tests/fixtures/storage')

/** tests/fixtures/storage/<キー(: を - にしたもの)>/v<版>.json */
const samples = readdirSync(FIXTURES).flatMap((folder) =>
  readdirSync(path.join(FIXTURES, folder)).map((file) => ({
    key: folder.replace('-', ':'),
    name: `${folder}/${file}`,
    raw: readFileSync(path.join(FIXTURES, folder, file), 'utf8'),
  })),
)

const latest = (folder: string) => {
  const files = readdirSync(path.join(FIXTURES, folder)).sort(
    (a, b) => Number(a.slice(1, -5)) - Number(b.slice(1, -5)),
  )
  return readFileSync(path.join(FIXTURES, folder, files.at(-1)!), 'utf8')
}

test('最新の版の見本データをすべて入れて開くと、そのデータで遊べる', async ({ page }) => {
  await prepare(page, {
    seed: {
      'mobimongo:app': latest('mobimongo-app'),
      'mobimongo:stepResource': latest('mobimongo-stepResource'),
      'mobimongo:mobimon': latest('mobimongo-mobimon'),
    },
  })
  await page.goto('/')
  await expect(header(page)).toContainText('エネルギー196')
  await expect(header(page)).toContainText('ポイント55pt')
  await expect(page.getByText('Dワールドの覇者')).toBeVisible()
  await menu(page, 'なかま').click()
  await expect(page.getByText('デンまる', { exact: true })).toBeVisible()
})

for (const sample of samples) {
  test(`見本データ ${sample.name} を入れて開くと、移行して普通に起動する`, async ({ page }) => {
    await prepare(page, {
      seed: { 'mobimongo:app': latest('mobimongo-app'), [sample.key]: sample.raw },
    })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: '今日のようす' })).toBeVisible()
  })
}

test('旧キー(mobimongo:userId)の ID を新しいキーに移す', async ({ page }) => {
  await prepare(page, { seed: { 'mobimongo:userId': 'legacy-user' } })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '今日のようす' })).toBeVisible()
  const stored = await page.evaluate(() => ({
    app: localStorage.getItem('mobimongo:app'),
    legacy: localStorage.getItem('mobimongo:userId'),
  }))
  expect(JSON.parse(stored.app!)).toEqual({ version: 1, data: { userId: 'legacy-user' } })
  expect(stored.legacy).toBeNull()
})
