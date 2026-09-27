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
```

## 実装の構成

- `src/composition.ts` がアプリの組み立て(依存の注入)を行い、`ui/` にはユースケースだけを渡す。ユーザーの ID は初回起動時に `mobimongo:userId` に発行し、`WalkerId`(将来は `PlayerId` も)に同じ値を使う。
- 各コンテキストの状態は localStorage の1つのキー(例: `mobimongo:stepResource`)に版番号付きでまとめて保存する(`src/shared/VersionedStorage.ts`)。
- tsconfig の `erasableSyntaxOnly` が有効なため、コンストラクタ引数でのプロパティ宣言(`constructor(private readonly x: X)`)や enum は使えない。フィールドは明示的に宣言する。

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
