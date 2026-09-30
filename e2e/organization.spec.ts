import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, menu, prepare, test } from './fixtures.ts'

const FIXTURES = path.join(import.meta.dirname, '../tests/fixtures/storage')
const read = (file: string) => readFileSync(path.join(FIXTURES, file), 'utf8')
const THERMAL = 'サーマルマネジメント'

test('組織: 超レアのリーダーのチームで部下を加え、サブリーダーにし、再読み込みしても残る', async ({
  page,
}) => {
  // v2 の見本: サーマルのリーダーはゼンネツオウ(超レア)、サブリーダーはカイテキング(下にフウフウ)、部下にデンまる
  await prepare(page, {
    seed: {
      'mobimongo:app': read('mobimongo-app/v1.json'),
      'mobimongo:stepResource': read('mobimongo-stepResource/v1.json'),
      'mobimongo:mobimon': read('mobimongo-mobimon/v2.json'),
    },
  })
  await page.goto('/')
  await menu(page, '組織').click()

  const thermal = page.getByRole('region', { name: `${THERMAL}のチーム` })
  await expect(thermal.getByText('受けられる仕事: A・S ランク')).toBeVisible()
  await expect(thermal.getByText('4 / 21体')).toBeVisible()
  await expect(thermal.getByText('部下 2 / 4体(サブリーダー 1 / 4体)')).toBeVisible()

  // スズカゼン(スマートホーム・アンコモン)を部下に加えて、サブリーダーにする
  await thermal
    .getByLabel(`${THERMAL}の部下`)
    .selectOption({ label: 'スズカゼン(アンコモン・Lv1・スマートホーム)' })
  await thermal.getByRole('button', { name: '部下に加える' }).click()
  await expect(thermal.getByText('5 / 21体')).toBeVisible()
  const suzukazen = thermal.locator('.team-member').filter({ hasText: 'スズカゼン' })
  await suzukazen.getByRole('button', { name: 'サブリーダーにする' }).click()
  await expect(thermal.getByText('部下 3 / 4体(サブリーダー 2 / 4体)')).toBeVisible()

  // パワートレインにはリーダーになれるモビモンがいない
  const powertrain = page.getByRole('region', { name: 'パワートレインのチーム' })
  await expect(powertrain.getByText(/リーダーになれるモビモン/)).toBeVisible()

  // 再読み込みしても残り、なかまの一覧に所属が出る
  await page.reload()
  await menu(page, '組織').click()
  await expect(
    page
      .locator('.mm-card')
      .filter({ hasText: THERMAL })
      .getByText('部下 3 / 4体(サブリーダー 2 / 4体)'),
  ).toBeVisible()
  await menu(page, 'なかま').click()
  await expect(page.getByText(`${THERMAL}・リーダー`)).toBeVisible()
  await expect(page.getByText(`${THERMAL}・サブリーダー`)).toHaveCount(2)
})

test('組織: リーダーを外すと、サブリーダーは部下に戻り、その下のメンバーはチームから外れる', async ({
  page,
}) => {
  await prepare(page, {
    seed: {
      'mobimongo:app': read('mobimongo-app/v1.json'),
      'mobimongo:stepResource': read('mobimongo-stepResource/v1.json'),
      'mobimongo:mobimon': read('mobimongo-mobimon/v2.json'),
    },
  })
  await page.goto('/')
  await menu(page, '組織').click()
  const thermal = page.getByRole('region', { name: `${THERMAL}のチーム` })
  await thermal
    .locator('.team-member')
    .filter({ hasText: 'ゼンネツオウ' })
    .getByRole('button', { name: '外す' })
    .click()

  await expect(thermal.getByText('リーダーを置くと仕事を受けられます')).toBeVisible()
  await expect(thermal.getByText('2 / 5体')).toBeVisible()
  await expect(thermal.getByText('部下 2 / 4体')).toBeVisible()
  await expect(thermal.locator('.team-member').filter({ hasText: 'フウフウ' })).toHaveCount(0)
})
