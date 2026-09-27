import type { RewardView } from '../../mobimon/application/mobimonUseCases.ts'
import { Tag } from '../components/parts.tsx'

/** 図鑑のコンプリート・節目で受け取った報酬。 */
export function RewardList({ rewards }: { rewards: RewardView[] }) {
  if (rewards.length === 0) return null
  return (
    <div className="stack" aria-label="受け取った報酬">
      {rewards.map((r) => (
        <div key={r.reason} className="stack">
          <p className="body-strong">{r.reason}</p>
          <div className="row">
            {r.title && <Tag>称号「{r.title}」</Tag>}
            {r.items.map((i) => (
              <Tag key={i.name}>
                {i.name} ×{i.quantity}
              </Tag>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
