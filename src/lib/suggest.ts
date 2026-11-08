import { blendWeights, rank } from './scoring'
import type { BlendResult, Ranking } from './scoring'
import type { Decision, Option, Priority, Weights } from './types'

export interface Suggestion {
  blend: BlendResult
  ranking: Ranking
  suggested: Option
  others: Option[]
}

/** One place that decides "our suggestion", so the Results and Priority screens never disagree. */
export function suggestFor(d: Decision, priority: Priority, vibeHistory: Priority[], moneyRatioValue: number, override?: Weights | null): Suggestion {
  const blend = blendWeights(priority, vibeHistory, moneyRatioValue)
  // weights dragged on the triangle are the student's own mix, so they replace the blend
  const ranking = rank(d.options, override ?? blend.weights)
  return { blend, ranking, suggested: ranking.ranked[0].option, others: ranking.ranked.slice(1).map((r) => r.option) }
}
