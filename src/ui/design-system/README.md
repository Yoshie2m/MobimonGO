# デザインシステム「Mobimon」

Claude Design で作成したデザインシステム「Mobimon」を、このアプリに取り込んだもの。

- 取り込み元: https://claude.ai/artifact/4xXzSCFCdnSnDcA5xr1G25(版 1790640944-d1c7、2026-09-29 取り込み)
- 見た目のルール(色の使い分け、余白、角丸、書き方)は取り込み元の README に従う。
  例: 丁寧語で書き、絵文字は使わない / 増減は色だけでなく矢印や言葉を添える / primary ボタンは1画面・1カードにつき1つまで

| ファイル | 内容 | 作り方 |
|---|---|---|
| `tokens.json` | 色・文字・余白・角丸・影のトークン | 取り込み元の `project/tokens.json` をそのまま複製 |
| `tokens.css` | トークンの CSS 変数と文字スタイルのクラス(`.display` `.heading` `.body` `.body-strong` `.caption` `.label`) | `npm run design:tokens` で `tokens.json` から生成(直接編集しない) |
| `bundle.css` | Button / Card のスタイル(`mm-` で始まるクラス) | 取り込み元の `project/components/bundle.css` をそのまま複製 |
| `components.tsx` | Button / Card | 取り込み元の `bundle.js` を React(TypeScript)に移したもの。props は `index.d.ts` と同じ |
| `icons/*.svg` | 駆動モード2つ・事業領域7つのアイコン | 取り込み元のアセットをそのまま複製 |
| `icons.ts` | 事業分野 → アイコンの対応 | このアプリで決めたもの |

事業分野とアイコンの対応(`icons.ts`): サーマル → thermal-system、パワートレイン → motor-control、
セーフティ&コックピット → mobility、半導体 → advanced-device、補修・修理 → repair、
インダストリー → factory-automation、フードバリューチェーン → food-value-chain、ホーム → home。
全8分野にアイコンが揃っている。

タグ・進み具合のバー・お知らせなど、デザインシステムにない部品は `src/ui/components/` にトークンだけを使って作っている。

## 取り込み元が更新されたとき

1. 取り込み元の `tokens.json`・`bundle.css`・アイコンを、このフォルダに上書きで複製する。
2. `npm run design:tokens` で `tokens.css` を作り直す。
3. `bundle.js` や `index.d.ts` が変わっていれば、`components.tsx` に同じ変更を入れる。
