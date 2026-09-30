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

  await expect(page.getByRole('contentinfo')).toContainText('個人が制作したジョークサイトであり')
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

test('メニューの並び: スマホ幅では4個ずつ2段、PC幅では1段になる', async ({ page }) => {
  const labels = ['ホーム', '歩数', 'さがす', 'なかま', '組織', '仕事', 'ショップ', '図鑑']
  const topsAt = async (width: number) => {
    await page.setViewportSize({ width, height: 800 })
    const boxes = await Promise.all(labels.map((label) => menu(page, label).boundingBox()))
    return boxes.map((box) => box!.y)
  }

  const mobileTops = await topsAt(375)
  expect(new Set(mobileTops.slice(0, 4)).size).toBe(1)
  expect(new Set(mobileTops.slice(4)).size).toBe(1)
  expect(mobileTops[0]).not.toBe(mobileTops[4])

  const wideTops = await topsAt(1024)
  expect(new Set(wideTops).size).toBe(1)
})
