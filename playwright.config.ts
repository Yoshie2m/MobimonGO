import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const ocr = Boolean(process.env.OCR)

/**
 * 画面の自動テスト(E2E)。本番用のビルドを vite preview で配信し、Chromium で通しに動かす。
 * 画面キャプチャの読み取り(@ocr)は CDN から学習データを取得して遅いため、`npm run e2e:ocr` で別に実行する。
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  grep: ocr ? /@ocr/ : undefined,
  grepInvert: ocr ? undefined : /@ocr/,
  timeout: ocr ? 120_000 : 30_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
