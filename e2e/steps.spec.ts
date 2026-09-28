import path from 'node:path'
import {
  expect,
  header,
  importManually,
  menu,
  prepare,
  test,
  TODAY,
  walkerStartingOn,
} from './fixtures.ts'

test('手入力で歩数を取り込むと、エネルギー・ポイントが増え、目標の達成が表示される', async ({
  page,
}) => {
  await prepare(page)
  await page.goto('/')
  await importManually(page, TODAY, '12,000')

  await expect(page.getByText(`${TODAY}: 12,000歩(エネルギー +120、ポイント +50pt)`)).toBeVisible()
  await expect(header(page)).toContainText('エネルギー120')
  await expect(header(page)).toContainText('ポイント50pt')

  await menu(page, 'ホーム').click()
  await expect(page.getByText('▲ 目標を達成しました')).toBeVisible()
})

test('利用開始日より前の日は、確認リストで知らせ、取り込まない', async ({ page }) => {
  await prepare(page)
  await page.goto('/')
  await menu(page, '歩数').click()
  await page.getByLabel('日付').fill('2026-09-27')
  await page.getByLabel('歩数', { exact: true }).fill('9000')
  await page.getByRole('button', { name: '確認リストに追加' }).click()
  await expect(page.getByText('利用開始日より前のため取り込まれません')).toBeVisible()

  await page.getByRole('button', { name: '取り込む' }).click()
  await expect(page.getByText('2026-09-27: 利用開始日より前の日です')).toBeVisible()
  await expect(header(page)).toContainText('エネルギー0')
})

test('画面キャプチャから 2026年9月の16日分を読み取って取り込む @ocr', async ({ page }) => {
  await prepare(page, { seed: walkerStartingOn('2026-09-01') })
  await page.goto('/')
  await menu(page, '歩数').click()
  await page.getByRole('tab', { name: '画面キャプチャ' }).click()
  await page
    .getByLabel('歩数画面のキャプチャ画像')
    .setInputFiles(path.join(import.meta.dirname, '../tests/fixtures/step-calendar-sample.png'))

  await expect(page.getByText('2026年9月: 16日分の歩数を読み取りました')).toBeVisible({
    timeout: 90_000,
  })
  await expect(page.getByLabel('2026-09-04 の歩数')).toHaveValue('13186')
  await expect(page.getByLabel('2026-09-19 の歩数')).toHaveValue('10')

  await page.getByRole('button', { name: '取り込む' }).click()
  await expect(page.getByText('16日分を取り込みました')).toBeVisible()
  await expect(header(page)).toContainText('エネルギー1,836')
  await expect(header(page)).toContainText('ポイント775pt')
})
