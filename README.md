# プロジェクト概要

[![CI](https://github.com/Yoshie2m/MobimonGO/actions/workflows/ci.yml/badge.svg)](https://github.com/Yoshie2m/MobimonGO/actions/workflows/ci.yml)

ヘルスケアのアプリとして日々の歩数情報を利用して、モビモンを収集する


## 使い方

Node.js v26 が必要。

```bash
npm install     # 依存パッケージのインストール(最初に1回)
npm run dev     # 開発サーバーを起動し、表示された URL(http://localhost:5173 など)をブラウザで開く
npm test        # テストの実行
npm run e2e     # 画面の自動テスト(本番用のビルドを Chromium で通しに動かす。初回は npx playwright install --only-shell chromium)
npm run lint    # コードの検査
npm run build   # 本番用ビルド(dist/ に出力)
```


## フォルダ構成

```
src/
  mobimon/              # Mobimon コンテキスト(Core)
    domain/             #   集約・値オブジェクト・ドメインサービス・ドメインイベント
    application/        #   ユースケース(出現、捕獲、育成、進化、購入、初回作成 など)
    infrastructure/     #   リポジトリの実装(localStorage)、マスターデータの読み込み
    masterData/         #   種・アイテム・称号のマスターデータ(MOBIMON_LIST.md から作成)
  stepResource/         # 歩数リソース変換コンテキスト(Supporting)
    domain/             #   Walker, StepRecord, DailyGrant, StepConverter, StepGoalEvaluator など
    application/        #   ユースケース(歩数の取り込み、付与)
    infrastructure/     #   リポジトリの実装(localStorage)
    acl/                #   腐敗防止層: 手入力、画面キャプチャの読み取り(OCR)
  publishedLanguage/    # コンテキスト間でやり取りするイベントの型
  shared/               # 両コンテキストが使う基盤(イベントバス、ID の発行、時計)
  ui/                   # React の画面・コンポーネント
    design-system/      #   デザインシステム「Mobimon」(Claude Design)の取り込み
    components/         #   デザインシステムのトークンで作ったアプリ用の部品
    pages/              #   ホーム・さがす・なかま・ショップ・図鑑の画面
  composition.ts        # アプリの組み立て(依存の注入、コンテキスト間のイベントの接続)
tests/
  setup.ts              # テストの共通設定
  fixtures/             # テスト用のデータ(画面キャプチャのサンプル画像など)
```

依存の向きのルール(ESLint で検査する):

- `mobimon/` と `stepResource/` はお互いを import しない。やり取りは `publishedLanguage/` のイベント型だけで行う。
- `domain/` は `application/`・`infrastructure/`・`acl/`・`ui/`・React を import しない。
- `ui/` は各コンテキストの `application/` だけを呼ぶ。

テストは対象のファイルと同じ場所に `*.test.ts(x)` として置く。

設計ドキュメント:

| ファイル | 内容 |
|---|---|
| `domain_design.md` | ユビキタス言語・コンテキストマップ・ドメインモデル |
| `MOBIMON_LIST.md` | モビモン種リスト(151種、確定版) |
| `TASKS.md` | タスク一覧 |
| `PROPOSAL.md` | 承認待ちの提案 |


## 選定技術
フロントエンドとしてReactで動作させる
将来的にはデータベースと連携させるが、現状はフロントエンドのみで動作させる

| 項目 | 採用 |
|---|---|
| 言語 | TypeScript(strict モード) |
| UI | React |
| ビルドツール | Vite |
| パッケージマネージャ | npm(Node.js v26。`.nvmrc` で固定) |
| テスト | Vitest + React Testing Library |
| lint / formatter | ESLint(typescript-eslint、React Hooks) / Prettier |
| デザインシステム | Claude Design で作成した「Mobimon」(`src/ui/design-system/README.md`) |
| 永続化 | localStorage(コンテキストごとに1つのキーにまとめて保存。DB 連携時はリポジトリの実装を差し替える) |
| 文字認識(画面キャプチャの取り込み) | Tesseract.js(英語の学習データ。画像はブラウザ内で読み取り、初回に学習データだけを取得する) |
