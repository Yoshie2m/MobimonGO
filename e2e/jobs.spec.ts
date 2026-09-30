import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, importManually, menu, prepare, test, TODAY } from './fixtures.ts'

const FIXTURES = path.join(import.meta.dirname, '../tests/fixtures/storage')
const read = (file: string) => readFileSync(path.join(FIXTURES, file), 'utf8')
const THERMAL = 'サーマルマネジメント'

const seed = (mobimon: string) => ({
  'mobimongo:app': read('mobimongo-app/v1.json'),
  'mobimongo:stepResource': read('mobimongo-stepResource/v1.json'),
  'mobimongo:mobimon': read(mobimon),
})

test('仕事: 超レアのリーダーのチームで A ランクを受注し、歩数で進み、辞退するとチームが空く', async ({
  page,
}) => {
  // v2 の見本: サーマルのリーダーはゼンネツオウ(超レア・Lv20)、サブリーダー1体、メンバー2体
  await prepare(page, { seed: seed('mobimongo-mobimon/v2.json') })
  await page.goto('/')
  await menu(page, '仕事').click()

  const board = page.getByRole('region', { name: `${THERMAL}の仕事` })
  const rankA = board.locator('.team-member').filter({ hasText: 'A ランク' })
  await expect(rankA).toContainText('7日で 70,000歩・成功の確率 75%')
  await expect(board.locator('.team-member').filter({ hasText: 'C ランク' })).toContainText(
    'C ランクの仕事を受けられません',
  )
  // リーダーのいないチームの仕事は受けられない
  await expect(
    page.getByRole('region', { name: 'パワートレインの仕事' }).getByRole('button'),
  ).toHaveCount(0)

  await rankA.getByRole('button', { name: '受注する' }).click()
  await expect(page.getByText(/を受注しました/)).toBeVisible()
  const job = page.getByRole('region', { name: /^受けている仕事: / })
  await expect(job).toContainText('0 / 70,000歩')
  await expect(job).toContainText('残り 70,000歩・あと 7日(1日あたり約 10,000歩)')
  await expect(board.getByRole('button', { name: '受注する' })).toHaveCount(0)

  // 受注した日の歩数を取り込むと進む
  await importManually(page, TODAY, '12,000')
  await menu(page, '仕事').click()
  await expect(job).toContainText('12,000 / 70,000歩')

  // 受けている間は組み替えられない
  await menu(page, '組織').click()
  const thermal = page.getByRole('region', { name: `${THERMAL}のチーム` })
  await expect(thermal.getByText('仕事を受けているため、組み替えられません')).toBeVisible()
  await expect(thermal.getByRole('button')).toHaveCount(0)

  // 辞退するとチームが空き、7日間はもう辞退できない。再読み込みしても残る
  await menu(page, '仕事').click()
  await job.getByRole('button', { name: '辞退する' }).click()
  await expect(page.getByText('受けている仕事はありません')).toBeVisible()
  await page.reload()
  await menu(page, '仕事').click()
  await expect(page.getByText('直近7日間に辞退したため、今は辞退できません')).toBeVisible()
  await expect(rankA.getByRole('button', { name: '受注する' })).toBeVisible()
  await menu(page, '組織').click()
  await expect(thermal.getByRole('button', { name: '部下に加える' })).toBeVisible()
})

test('仕事: 数日前に受けた仕事の進み具合を示す(24時間を過ぎると辞退できない)', async ({ page }) => {
  // v3 の見本: 9月25日に受けた A ランク(9月25日 12,000歩・26日 8,000歩)
  await prepare(page, { seed: seed('mobimongo-mobimon/v3.json') })
  await page.goto('/')
  await menu(page, '仕事').click()
  const job = page.getByRole('region', { name: '受けている仕事: 電気自動車の熱をまとめて管理する' })
  await expect(job).toContainText('20,000 / 70,000歩')
  await expect(job).toContainText('9月25日から10月1日までの歩数を数えます')
  await expect(job).toContainText('残り 50,000歩・あと 4日(1日あたり約 12,500歩)')
  await expect(job).toContainText('辞退できるのは、受注から24時間以内です')
  await expect(job.getByRole('button')).toHaveCount(0)
})

test('仕事: 受注 → 歩数の取り込み → 結果 → ヘッドハンティング(乱数と日時を固定)', async ({
  page,
}) => {
  await prepare(page, { seed: seed('mobimongo-mobimon/v2.json'), seededRandom: 1 })
  await page.goto('/')
  await menu(page, '仕事').click()
  const board = page.getByRole('region', { name: `${THERMAL}の仕事` })
  await board
    .locator('.team-member')
    .filter({ hasText: 'A ランク' })
    .getByRole('button', { name: '受注する' })
    .click()

  // 4日後の夜に、それまでの歩数を取り込む(1日 20,000歩 × 4日 = 80,000歩)
  await page.clock.setFixedTime(new Date('2026-10-01T20:00:00+09:00'))
  for (const date of [TODAY, '2026-09-29', '2026-09-30', '2026-10-01']) {
    await importManually(page, date, '20,000')
  }
  await menu(page, '仕事').click()
  const job = page.getByRole('region', { name: /^受けている仕事: / })
  await expect(job).toContainText('歩き切りました')
  await job.getByRole('button', { name: '結果を見る' }).click()

  const result = page.getByRole('region', { name: '仕事の結果' })
  await expect(result).toContainText('仕事に成功しました')
  await expect(result).toContainText('ゼンネツオウ: 経験値 ▲ 300')
  await expect(result).toContainText('ヘッドハンティングの権利を 2件')
  await expect(page.getByText('受けている仕事はありません')).toBeVisible()

  await expect(page.getByText('ヘッドハンティングの権利 2件')).toBeVisible()
  await page.getByRole('button', { name: '迎える' }).first().click()
  await expect(page.getByText(/を迎えました/)).toBeVisible()
  await expect(page.getByText('ヘッドハンティングの権利 1件')).toBeVisible()

  // 迎えたモビモンはなかまに加わる(見本は6体)
  await menu(page, 'なかま').click()
  await expect(page.getByRole('button', { name: '育てる' })).toHaveCount(7)
})

test('仕事: 見本(v4)の歩き切った仕事の結果を見られ、休養中のなかまは育成できない', async ({
  page,
}) => {
  await prepare(page, { seed: seed('mobimongo-mobimon/v4.json'), seededRandom: 1 })
  await page.goto('/')
  await menu(page, '仕事').click()
  await expect(page.getByText('ヘッドハンティングの権利 1件')).toBeVisible()
  const job = page.getByRole('region', { name: '受けている仕事: 電気自動車の熱をまとめて管理する' })
  await expect(job).toContainText('70,000 / 70,000歩')
  await job.getByRole('button', { name: '結果を見る' }).click()
  await expect(page.getByRole('region', { name: '仕事の結果' })).toBeVisible()

  await menu(page, 'なかま').click()
  const resting = page.locator('.mm-card').filter({ hasText: 'スズカゼン' })
  await expect(resting).toContainText('休養中(あと 3日)')
  await expect(resting.getByRole('button', { name: '育てる' })).toBeDisabled()
})
