import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // 実際に文字認識を行うテスト(通信が必要で遅い)は `npm run test:ocr` で別に実行する
    exclude: process.env.OCR ? ['**/node_modules/**'] : ['**/node_modules/**', '**/*.ocr.test.ts'],
  },
})
