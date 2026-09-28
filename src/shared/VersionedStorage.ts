/**
 * 1つのキーに、版番号付きの JSON をまとめて保存する。
 * 1回の setItem は丸ごと成功するか失敗するかのどちらかなので、
 * 1つのコンテキストの状態を同じ保存単位で確定できる。
 *
 * 保存形式を変えたときは版を1つ上げ、1つ前の版から変換する関数を migrations に追加する。
 * 読み込み時に古い版なら、元のデータをバックアップしてから最新の版まで変換し、すぐに保存し直す
 * (移行は1回だけ走る)。
 */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface Envelope {
  version: number
  data: unknown
}

/**
 * 旧い版のデータを1つ新しい版に変換する関数。キーは変換前の版番号。
 * 保存された JSON を受け取り JSON を返す純粋な関数にし、ドメインのクラスは使わない
 * (ドメインが変わっても古い変換関数が壊れないようにするため)。公開した変換関数は書き換えない。
 */
export type Migrations = Readonly<Record<number, (data: unknown) => unknown>>

/** 移行前の元のデータを残すキー(1世代だけ)。 */
export const backupKeyOf = (key: string) => `${key}:backup`

export type StorageErrorKind =
  /** 保存データを JSON として読めない、または形式が壊れている。 */
  | 'corrupt'
  /** 移行の途中で失敗した(変換関数がない・変換関数が例外を投げた)。 */
  | 'migrationFailed'
  /** このアプリより新しい版のデータ(古いアプリで開いた)。 */
  | 'tooNew'

/** 保存データを読み込めなかった。元のデータは書き換えずに残っている。 */
export class StorageError extends Error {
  readonly kind: StorageErrorKind
  readonly key: string

  constructor(kind: StorageErrorKind, key: string, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StorageError'
    this.kind = kind
    this.key = key
  }
}

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

    const envelope = parseEnvelope(raw, this.key)
    if (envelope.version > this.version) {
      throw new StorageError(
        'tooNew',
        this.key,
        `${this.key}: 版 ${envelope.version} はこのアプリ(版 ${this.version})より新しい形式です`,
      )
    }
    if (envelope.version === this.version) return envelope.data as T

    // 移行に失敗しても元のデータが残るよう、変換する前にバックアップしておく
    this.storage.setItem(backupKeyOf(this.key), raw)
    const data = migrate(envelope, this.version, this.migrations, this.key)
    this.save(data as T)
    return data as T
  }

  save(data: T): void {
    const envelope: Envelope = { version: this.version, data }
    this.storage.setItem(this.key, JSON.stringify(envelope))
  }
}

/** 保存データを最新の版まで変換する(保存はしない)。テストや引き継ぎでも使う。 */
export function migrate(
  envelope: Envelope,
  targetVersion: number,
  migrations: Migrations,
  key = '(key)',
): unknown {
  let { version, data } = envelope
  while (version < targetVersion) {
    const step = migrations[version]
    if (!step) {
      throw new StorageError(
        'migrationFailed',
        key,
        `${key}: 版 ${version} からの移行方法がありません`,
      )
    }
    try {
      data = step(data)
    } catch (cause) {
      throw new StorageError(
        'migrationFailed',
        key,
        `${key}: 版 ${version} からの移行に失敗しました`,
        {
          cause,
        },
      )
    }
    version++
  }
  return data
}

function parseEnvelope(raw: string, key: string): Envelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (cause) {
    throw new StorageError('corrupt', key, `${key}: 保存データを読み取れません`, { cause })
  }
  const envelope = parsed as Partial<Envelope> | null
  if (
    typeof envelope !== 'object' ||
    envelope === null ||
    !Number.isInteger(envelope.version) ||
    (envelope.version as number) < 1 ||
    !('data' in envelope)
  ) {
    throw new StorageError('corrupt', key, `${key}: 保存データの形式が正しくありません`)
  }
  return envelope as Envelope
}
