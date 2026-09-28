/**
 * 保存データを読み込めなかったときの、書き出しと初期化。
 * このアプリのキー(mobimongo: で始まるもの。移行前のバックアップを含む)だけを対象にする。
 */
const PREFIX = 'mobimongo:'

function appKeys(storage: Storage): string[] {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key?.startsWith(PREFIX)) keys.push(key)
  }
  return keys.sort()
}

/** このアプリの保存データをすべて、1つの JSON にまとめる(そのままの文字列で残す)。 */
export function exportAppData(storage: Storage, now = new Date()): string {
  const entries = Object.fromEntries(appKeys(storage).map((key) => [key, storage.getItem(key)]))
  return JSON.stringify({ exportedAt: now.toISOString(), entries }, null, 2)
}

/** このアプリの保存データをすべて消す(ほかのサイト・アプリのデータには触れない)。 */
export function resetAppData(storage: Storage): void {
  for (const key of appKeys(storage)) storage.removeItem(key)
}

/** 書き出した JSON をファイルとしてダウンロードさせる。 */
export function downloadAppData(storage: Storage, now = new Date()): void {
  const blob = new Blob([exportAppData(storage, now)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  // ファイル名は端末のローカル日付にする(UTC だと日本の朝は前日の日付になる)
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  a.href = url
  a.download = `mobimongo-data-${stamp}.json`
  a.click()
  URL.revokeObjectURL(url)
}
