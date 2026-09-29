import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, importManually, menu, prepare, test, TODAY } from './fixtures.ts'

const FIXTURES = path.join(import.meta.dirname, '../tests/fixtures/storage')
const read = (file: string) => readFileSync(path.join(FIXTURES, file), 'utf8')
const THERMAL = 'サーマルマネジメント&エアコンシステム'

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
    page.getByRole('region', { name: 'パワートレインシステムの仕事' }).getByRole('button'),
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
