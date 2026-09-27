import type { PlayerId, TitleId } from './ids.ts'
import { cumulativeSteps, type CumulativeSteps } from './quantities.ts'

/**
 * アプリ利用者のゲーム内での表現。1人のユーザーにつき1つ(PlayerId は WalkerId と同じ値)。
 * 所持モビモンの一覧は持たず、OwnedMobimon を PlayerId で検索して得る。
 */
export class Player {
  readonly id: PlayerId
  readonly cumulativeSteps: CumulativeSteps
  readonly titles: readonly TitleId[]

  private constructor(id: PlayerId, steps: CumulativeSteps, titles: readonly TitleId[]) {
    this.id = id
    this.cumulativeSteps = steps
    this.titles = titles
  }

  static create(id: PlayerId): Player {
    return new Player(id, cumulativeSteps(0), [])
  }

  static reconstruct(id: PlayerId, steps: number, titles: readonly TitleId[]): Player {
    return new Player(id, cumulativeSteps(steps), [...new Set(titles)])
  }

  /** 累計歩数を更新する。今より小さい値(古いイベントの遅れての到着など)は無視する。 */
  updateCumulativeSteps(steps: number): Player {
    if (steps <= this.cumulativeSteps) return this
    return new Player(this.id, cumulativeSteps(steps), this.titles)
  }

  /** 称号を与える。獲得済みなら何もしない。 */
  grantTitle(title: TitleId): Player {
    if (this.titles.includes(title)) return this
    return new Player(this.id, this.cumulativeSteps, [...this.titles, title])
  }
}
