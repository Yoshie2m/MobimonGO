# 提案

承認待ちの提案を記載する。承認されて `domain_design.md` / `TASKS.md` などに反映した提案は、このファイルから削除する。

---
---

# 提案: プロジェクト基盤

- 状態: 提案中(未承認)
- 対象: `TASKS.md`「2. プロジェクト基盤」の6タスク
  - git リポジトリを初期化する
  - React プロジェクトを作成する(ビルドツール・言語(TS/JS)・パッケージマネージャを選定)
  - lint / formatter / テストフレームワークを導入する
  - フォルダ構成を決め、`README.md` の「フォルダ構成」に記載する
  - ビルド・lint・テストの実行コマンドを `CLAUDE.md` に追記する
  - 永続化の方針を決める

## 1. 前提

| 項目 | 内容 |
|---|---|
| README の選定技術 | フロントエンドは React。将来は DB と連携するが、当面はフロントエンドのみで動かす |
| 開発環境(確認済み) | Node.js v26.5.0 / npm 12.1.0 / git 2.50.1。pnpm・yarn は入っていない |
| 設計上の要件 | Mobimon(Core)は歩数リソース変換(Supporting)に依存しない。消費と行動は同じ保存単位で確定する。画面キャプチャの文字認識はブラウザ内で行う |

## 2. 推奨の構成

| 項目 | 推奨 | 主な理由 |
|---|---|---|
| 言語 | **TypeScript**(strict モード) | 値オブジェクトや ID の型(`PlayerId` と `WalkerId` など)を区別でき、不変条件の破れをコンパイル時に見つけやすい |
| ビルドツール | **Vite**(React + TypeScript テンプレート) | React の公式ドキュメントが案内する構成の1つ。起動と再読み込みが速い。Create React App は開発が終了している |
| パッケージマネージャ | **npm** | 追加のインストールが要らない。この規模なら pnpm の利点は小さい |
| テスト | **Vitest** + React Testing Library | Vite と設定を共有でき、ドメインの単体テストを高速に回せる。画面は React Testing Library でテストする |
| lint | **ESLint**(typescript-eslint、React Hooks のルール) | React Hooks の誤用を検出できる。**コンテキスト間の依存禁止も lint で機械的に守らせる**(2.2) |
| formatter | **Prettier** | 標準的で、エディタとの連携が容易 |
| 文字認識(OCR) | **Tesseract.js**(日本語と英数字の学習データ) | ブラウザ内で動き、キャプチャ画像を外部に送らない。フロントのみの構成に合う |
| Node.js のバージョン | **v26**(`.nvmrc` と `package.json` の `engines` で固定) | 今の開発環境に合わせる |

各ライブラリのバージョンは、導入する時点の最新の安定版を使う。

### 2.1 比較した案

| 項目 | 推奨 | 他の案 | 他の案を選ばない理由 |
|---|---|---|---|
| 言語 | TypeScript | JavaScript | 型がないと、ID の取り違えや値オブジェクトの不変条件の破れに気づきにくい |
| ビルドツール | Vite | Next.js | サーバー機能は当面使わない。DB 連携の段階で改めて検討する |
| lint / formatter | ESLint + Prettier | Biome(1つで両方こなす) | 高速で設定も簡単だが、React Hooks のルールや依存方向のルールを ESLint ほど細かく書けない |
| パッケージマネージャ | npm | pnpm | 追加のインストールが要り、得られる利点も小さい |

### 2.2 フォルダ構成

コンテキストごとにフォルダを分け、その中をレイヤー(ドメイン / アプリケーション / インフラ)で分ける。

```
src/
  mobimon/                  # Mobimon コンテキスト(Core)
    domain/                 #   集約・値オブジェクト・ドメインサービス・ドメインイベント
    application/            #   ユースケース(出現、捕獲、育成、進化、購入、初回作成 など)
    infrastructure/         #   リポジトリの実装(localStorage)、マスターデータの読み込み
    masterData/             #   種・アイテム・称号のマスターデータ(MOBIMON_LIST.md から作成)
  stepResource/             # 歩数リソース変換コンテキスト(Supporting)
    domain/                 #   Walker, StepRecord, DailyGrant, StepConverter, StepGoalEvaluator など
    application/            #   ユースケース(歩数の取り込み、付与)
    infrastructure/         #   リポジトリの実装(localStorage)
    acl/                    #   腐敗防止層: 手入力、画面キャプチャの読み取り(OCR)
  publishedLanguage/        # コンテキスト間でやり取りするイベントの型
                            #   (EnergyGranted, PointsGranted, CumulativeStepsUpdated)
  shared/                   # 両コンテキストが使う基盤(イベントバス、ID の発行、時計)
  ui/                       # React の画面・コンポーネント
tests/fixtures/             # テスト用のデータ(画面キャプチャのサンプル画像など)
```

依存の向きのルール(ESLint の import 制限で機械的に守らせる):

| ルール | 理由 |
|---|---|
| `mobimon/` と `stepResource/` は、お互いを import しない。やり取りは `publishedLanguage/` のイベント型だけで行う | 「Mobimon は歩数を知らない」という境界の原則をコードでも守る |
| `domain/` は、`application/`・`infrastructure/`・`ui/`・React を import しない | ドメインのロジックを画面や保存方法から切り離し、単体テストしやすくする |
| `ui/` は、各コンテキストの `application/` だけを呼ぶ | 画面からリポジトリやドメインを直接いじらない |

テストファイルは、対象のファイルと同じ場所に `*.test.ts(x)` として置く。

### 2.3 永続化の方針(フロントのみの段階)

| 項目 | 方針 |
|---|---|
| 保存先 | **localStorage** |
| 保存の単位 | **1つのコンテキストの状態を、1つのキーにまとめて保存する**(例: `mobimongo:mobimon`、`mobimongo:stepResource`)。localStorage の1回の書き込みは途中で失敗しないため、「消費と行動を同じ保存単位で確定する」という要件をそのまま満たせる |
| リポジトリ | ドメイン層にリポジトリのインターフェースを置き、`infrastructure/` に localStorage 版を実装する。DB 連携時は実装だけを差し替える |
| 形式の版管理 | 保存するデータに版番号を持たせ、形式を変えるときは読み込み時に移行する |
| コンテキスト間のイベント | アプリ内の同期的なイベントバスで配送する。途中で失敗しても、`GrantId` による重複排除と、累計歩数は減らないルールにより、再送すれば整合する |
| 時刻と ID | 時計(現在時刻)と ID の発行を差し替えられるようにし、時間帯の境目などをテストで固定できるようにする |

保存量の見積もり: 所持モビモン1体あたり約 100バイト。1日 20体を1年続けても 1MB 未満で、localStorage の一般的な上限(約 5MB)に収まる。

| 比較した案 | 評価 |
|---|---|
| localStorage・コンテキストごとに1キー(推奨) | 単純で、保存単位の要件を満たせる。容量は当面十分 |
| localStorage・集約ごとに1キー | 複数のキーへの書き込みがまとめて成功する保証がなく、保存単位の要件を満たせない |
| IndexedDB | トランザクションがあり容量も大きいが、実装が複雑。DB 連携までのつなぎとしては重い |

### 2.4 git

| 項目 | 方針 |
|---|---|
| 初期化 | このフォルダで `git init`。既定のブランチ名は `main` |
| `.gitignore` | `node_modules/`、`dist/`、`coverage/`、`.DS_Store`、`tmp/` |
| `tmp/` の扱い | コミットしない。`pokemon_list.csv` は既存作品のデータで、種リストはすでに作り直し済みのため不要。`business_products.csv` は社内資料の扱い。`画面sample.png` はテストで使うので `tests/fixtures/` に写して管理する |
| 最初のコミット | 今あるドキュメント(`README.md`、`CLAUDE.md`、`domain_design.md`、`TASKS.md`、`MOBIMON_LIST.md`、`PROPOSAL.md`)と、プロジェクトのひな形 |

### 2.5 npm スクリプト(`CLAUDE.md` に追記する内容)

| コマンド | 内容 |
|---|---|
| `npm install` | 依存パッケージのインストール |
| `npm run dev` | 開発サーバーの起動 |
| `npm run build` | 型チェックと本番用ビルド |
| `npm test` | テストの実行(Vitest) |
| `npm run lint` | ESLint による検査(依存方向のルールを含む) |
| `npm run format` | Prettier による整形 |

## 3. 進め方

1. git を初期化し、`.gitignore` を置いて、今のドキュメントを最初のコミットにする。
2. Vite で React + TypeScript のひな形を作り、2.2 のフォルダ構成に整える。
3. Vitest・ESLint・Prettier を導入し、依存方向のルールを設定する。ルール違反の import がエラーになることを確かめる。
4. サンプルのテストを1つ書き、`npm test` / `npm run lint` / `npm run build` が通ることを確かめる。
5. `README.md` のフォルダ構成と選定技術、`CLAUDE.md` のコマンドとプロジェクトの状態を更新する。

Tesseract.js は、画面キャプチャの取り込みタスクに着手するときに導入する(基盤の段階では入れない)。

## 4. 確認したいこと

- `tests/fixtures/` に置く画面キャプチャのサンプル画像(他のヘルスケアアプリの画面)を、リポジトリにコミットしてよいか。
- GitHub などのリモートリポジトリと、自動テスト(CI)は今回は対象外としている。必要なら追加する。
