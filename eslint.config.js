import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// 依存の向きのルール(domain_design.md の境界の原則をコードで守る)
const CONTEXTS = ['mobimon', 'stepResource']

const otherContext = (context) =>
  CONTEXTS.filter((c) => c !== context).map((c) => ({
    group: [`**/${c}/**`, `**/${c}`],
    message: `コンテキスト間は直接 import しない。publishedLanguage/ のイベント型を使うこと。`,
  }))

const domainPurity = [
  {
    group: ['**/application/**', '**/infrastructure/**', '**/acl/**', '**/ui/**'],
    message: 'domain/ は application / infrastructure / acl / ui に依存しない。',
  },
  {
    group: ['react', 'react-dom', 'react/**', 'react-dom/**'],
    message: 'domain/ は React に依存しない。',
  },
]

const restrict = (patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
})

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'tmp']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // 同じルールを複数の設定で書くと後のものが上書きするため、組み合わせごとに1つの設定にまとめる
  ...CONTEXTS.flatMap((context) => [
    {
      files: [`src/${context}/**/*.{ts,tsx}`],
      ignores: [`src/${context}/domain/**`],
      rules: restrict(otherContext(context)),
    },
    {
      files: [`src/${context}/domain/**/*.{ts,tsx}`],
      rules: restrict([...otherContext(context), ...domainPurity]),
    },
  ]),
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: restrict([
      {
        group: ['**/domain/**', '**/infrastructure/**', '**/acl/**'],
        message: 'ui/ は各コンテキストの application/ だけを呼ぶ。',
      },
    ]),
  },
  prettier,
])
