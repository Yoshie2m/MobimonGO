import { expect, header, menu, prepare, test, TODAY } from './fixtures.ts'

test.beforeEach(async ({ page }) => {
  await prepare(page)
  await page.goto('/')
})

test('初回の起動: ホームを表示し、エネルギー 0・利用開始日は今日', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '今日のようす' })).toBeVisible()
  await expect(header(page)).toContainText('エネルギー0')
  await expect(header(page)).toContainText('ポイント0pt')
  await expect(header(page)).toContainText('時間帯昼')

  await menu(page, '歩数').click()
  await expect(page.getByText(`利用開始日 ${TODAY}`)).toBeVisible()
})

test('キーボード操作: Tab でメニューに移動でき、フォーカスの枠(ink の 2px)が見える', async ({
  page,
}) => {
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toHaveText('ホーム')
  await expect(focused).toHaveCSS('outline-style', 'solid')
  await expect(focused).toHaveCSS('outline-width', '2px')
  await expect(focused).toHaveCSS('outline-color', 'rgb(58, 47, 34)')
})
