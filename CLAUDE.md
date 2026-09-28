# CLAUDE.md

このファイルは、このリポジトリで作業する際にClaude Code(claude.ai/code)へ向けたガイダンスを提供します。

## プロジェクトの状態

プロジェクト基盤(git、Vite + React + TypeScript、Vitest、ESLint、Prettier)を導入済みで、ドメインの実装はこれから始める段階です。フォルダ構成と選定技術は `README.md` を参照してください。

- ドメイン用語やモデルを扱う際は `domain_design.md` の定義に従い、変更があれば同ファイルも更新してください。
- モビモン種のマスターデータは `MOBIMON_LIST.md`(確定版)に従ってください。
- タスクは `TASKS.md`、承認待ちの提案は `PROPOSAL.md` にあります。承認されて反映した提案は `PROPOSAL.md` から削除します。
- `tmp/` は git の管理対象外です(既存作品のデータや社内資料を含むため)。テストで使う画像は `tests/fixtures/` に置きます。

## コマンド

```bash
npm install          # 依存パッケージのインストール
npm run dev          # 開発サーバーの起動
npm run build        # 型チェック(tsc -b)と本番用ビルド
npm test             # テストの実行(Vitest)
npm run test:watch   # テストの監視実行
npm run test:ocr     # 実際の文字認識で画面キャプチャのサンプルを読み取るテスト(初回は通信が必要、*.ocr.test.ts)
npx vitest run src/mobimon/domain/TimeOfDay.test.ts   # 1ファイルだけテストする
npm run lint         # ESLint(依存の向きのルールを含む)
npm run format       # Prettier で整形(*.md は対象外)
npm run format:check # 整形の確認のみ
npm run design:tokens # デザインシステムの tokens.json から tokens.css を生成
```

## 実装の構成

- `src/composition.ts` がアプリの組み立て(依存の注入)を行い、`ui/` にはユースケースだけを渡す。ユーザーの ID は初回起動時に `mobimongo:userId` に発行し、`WalkerId`(将来は `PlayerId` も)に同じ値を使う。
- 歩数リソース変換 → Mobimon は `composition.ts` で Published Language のイベント(`EnergyGranted` / `PointsGranted` / `CumulativeStepsUpdated`)を購読してつなぐ。
- 画面の見た目はデザインシステム「Mobimon」(`src/ui/design-system/`)に従う。色・余白・角丸・影はトークン(CSS 変数)だけを使い、文章は丁寧語・絵文字なし、増減は矢印や言葉を添える。`tokens.css` は生成物なので直接編集しない。
- 各コンテキストの状態は localStorage の1つのキー(例: `mobimongo:stepResource`)に版番号付きでまとめて保存する(`src/shared/VersionedStorage.ts`)。
- tsconfig の `erasableSyntaxOnly` が有効なため、コンストラクタ引数でのプロパティ宣言(`constructor(private readonly x: X)`)や enum は使えない。フィールドは明示的に宣言する。

## 保存データの形式を変えるとき(マイグレーション)

保存データ(localStorage の `mobimongo:stepResource` / `mobimongo:mobimon` / `mobimongo:app`)の形式を変えるときは、利用者のデータを引き継げるよう、必ず次の手順で行う。詳しい決まりは `domain_design.md` の「4. データの変更と移行」。

1. 変更前の版の保存データの見本が `tests/fixtures/storage/<キー>/v<今の版>.json` にあることを確かめる(なければ先に作る)。
2. 保存形式の型(各リポジトリの `Stored`)を変え、`src/<コンテキスト>/infrastructure/migrations/index.ts` の `CURRENT_VERSION` を1つ上げる。
3. 同じファイルの `MIGRATIONS` に、1つ前の版から変換する関数を追加する。保存された JSON を受け取り JSON を返す純粋な関数にし、ドメインのクラスは使わない。公開した変換関数は書き換えない。
4. 新しい版の見本 `v<新しい版>.json` を追加する(古い版の見本は消さない)。
5. `npm test` で、すべての版の見本が最新まで移行して読み込めることを確かめる(`src/storageMigrations.test.ts`)。

マスターデータ(種・アイテム・称号)の ID は変えず、使い回さない。種をなくすときは `MOBIMON_LIST.md` の出現時間帯を「出現しない」にする。種・アイテム・称号を追加したら `tests/fixtures/master/published-ids.json` にも追加する。

## 依存の向きのルール

`eslint.config.js` の `no-restricted-imports` で検査しています。違反すると `npm run lint` がエラーになります。

- `src/mobimon/` と `src/stepResource/` はお互いを import しない。やり取りは `src/publishedLanguage/` のイベント型だけで行う。
- `domain/` は `application/`・`infrastructure/`・`acl/`・`ui/`・React を import しない。
- `src/ui/` は各コンテキストの `application/` だけを呼ぶ。

## プロダクトコンセプト

MobimonGOは、ヘルスケアアプリのコンセプトです。ユーザーの日々の歩数情報を利用して「モビモン」(キャラクター)を収集します。歩数トラッキングとキャラクター収集を組み合わせた点で、Pokémon GOのようなアプリと近い方向性を持ちます。

## ドメイン分解

READMEでは、以下の2つのサブドメインが定義されています(DDD的にCore/Supportingで整理):

- **Mobimon**(Core) — モビモン(キャラクター)の出現ロジック、捕獲、育成、図鑑コンプリートなど。これがサービス独自の強みであり、設計・実装において最も注力すべき領域です。
- **歩数リソース変換**(Supporting) — スマホ等から取得した歩数を、ゲーム内で使える「エネルギー」や「ポイント」に変換・クランチする部分。Mobimonのコアドメインへ供給する役割を担いますが、それ自体がサービスの差別化要因ではありません。

機能実装の際は、この境界を意識してください。歩数の取り込み・変換はMobimonのコアゲームプレイループ(出現・捕獲・育成・収集)を支えるインフラ/サポート的な位置づけであり、コアドメインそのものではありません。
