import { expect, header, importManually, menu, prepare, test, TODAY } from './fixtures.ts'

test('さがす → 捕まえる → 図鑑 → 育てる → 購入して使う、再読み込みしても残る', async ({ page }) => {
  await prepare(page)
  await page.goto('/')
  await importManually(page, TODAY, '20,000')
  await expect(header(page)).toContainText('エネルギー200')
  await expect(header(page)).toContainText('ポイント130pt')

  // さがす → 捕まえる(どの種が出ても成り立つ確認にする)
  await menu(page, 'さがす').click()
  await page.getByRole('button', { name: 'モビモンをさがす' }).click()
  await expect(page.getByText(/があらわれました$/)).toBeVisible()
  await page.getByRole('button', { name: '捕まえる' }).click()
  await expect(page.getByText(/を捕まえました$/)).toBeVisible()
  await expect(page.getByText('図鑑に新しく登録しました')).toBeVisible()
  await expect(header(page)).toContainText('エネルギー190')

  // 図鑑の登録数が増える
  await menu(page, '図鑑').click()
  await expect(page.getByText('1種', { exact: true })).toBeVisible()

  // 育てる → レベルが上がる
  await menu(page, 'なかま').click()
  await page.getByRole('button', { name: '育てる' }).click()
  await expect(page.getByText(/経験値 \+100、Lv2 に上がりました/)).toBeVisible()
  await expect(page.getByText('Lv 2')).toBeVisible()
  await expect(header(page)).toContainText('エネルギー180')

  // 購入して使う → 効果が表示される
  await menu(page, 'ショップ').click()
  await page
    .locator('.mm-card')
    .filter({ has: page.getByText('はちみつアロマ', { exact: true }) })
    .getByRole('button', { name: '購入する' })
    .click()
  await expect(page.getByText('はちみつアロマを購入しました')).toBeVisible()
  await expect(header(page)).toContainText('ポイント100pt')
  await page
    .locator('.mm-card')
    .filter({ has: page.getByText('はちみつアロマ', { exact: true }) })
    .getByRole('button', { name: '使う' })
    .click()
  await expect(page.getByText('はちみつアロマを使いました')).toBeVisible()

  await menu(page, 'ホーム').click()
  await expect(page.getByText('はちみつアロマ(×2、あと 3回)')).toBeVisible()

  // 再読み込みしても残る
  await page.reload()
  await expect(header(page)).toContainText('エネルギー180')
  await expect(header(page)).toContainText('ポイント100pt')
  await menu(page, 'なかま').click()
  await expect(page.getByText('Lv 2')).toBeVisible()
  await menu(page, '図鑑').click()
  await expect(page.getByText('1種', { exact: true })).toBeVisible()
})
