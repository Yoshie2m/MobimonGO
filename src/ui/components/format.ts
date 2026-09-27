/** 数値を 3桁区切りで表示する。 */
export const formatNumber = (n: number) => n.toLocaleString('ja-JP')

/** 例外から画面に表示するメッセージを取り出す。 */
export function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
