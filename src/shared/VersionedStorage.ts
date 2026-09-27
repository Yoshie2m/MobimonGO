/**
 * 1つのキーに、版番号付きの JSON をまとめて保存する。
 * 1回の setItem は丸ごと成功するか失敗するかのどちらかなので、
 * 1つのコンテキストの状態を同じ保存単位で確定できる。
 */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface Envelope {
  version: number
  data: unknown
}

/** 旧い版のデータを1つ新しい版に変換する関数。キーは変換前の版番号。 */
export type Migrations = Record<number, (data: unknown) => unknown>

export class VersionedStorage<T> {
  private readonly storage: KeyValueStorage
  private readonly key: string
  private readonly version: number
  private readonly migrations: Migrations

  constructor(storage: KeyValueStorage, key: string, version: number, migrations: Migrations = {}) {
    this.storage = storage
    this.key = key
    this.version = version
    this.migrations = migrations
  }

  load(): T | undefined {
    const raw = this.storage.getItem(this.key)
    if (raw === null) return undefined
    const envelope = JSON.parse(raw) as Envelope
    let { version, data } = envelope
    while (version < this.version) {
      const migrate = this.migrations[version]
      if (!migrate) throw new Error(`${this.key}: 版 ${version} からの移行方法がありません`)
      data = migrate(data)
      version++
    }
    if (version > this.version) {
      throw new Error(`${this.key}: 版 ${version} はこのアプリより新しい形式です`)
    }
    return data as T
  }

  save(data: T): void {
    const envelope: Envelope = { version: this.version, data }
    this.storage.setItem(this.key, JSON.stringify(envelope))
  }
}
