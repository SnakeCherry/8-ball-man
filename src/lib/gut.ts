import type { Axis } from './types'

export type GutTally = Record<Axis, { right: number; total: number }>

export interface GutScore {
  /** whole-number percentage across every guess, or null before the first one */
  pct: number | null
  tier: string
  guesses: number
}

/** Tiers are descriptive and a little playful, never a ranking against other people. */
export function gutScore(gut: GutTally): GutScore {
  const total = gut.cost.total + gut.time.total + gut.co2.total
  const right = gut.cost.right + gut.time.right + gut.co2.right
  if (total === 0) return { pct: null, tier: 'Not played yet', guesses: 0 }
  const pct = Math.round((right / total) * 100)
  const tier = pct >= 80 ? 'Price wizard' : pct >= 60 ? 'Sharp eye' : pct >= 40 ? 'Getting warm' : 'Still guessing'
  return { pct, tier, guesses: total }
}

export function gutShareText(appName: string, score: GutScore, gut: GutTally): string {
  const axis = (a: Axis, label: string) => (gut[a].total ? `${label} ${gut[a].right}/${gut[a].total}` : `${label} -`)
  return `My Gut Score on ${appName}: ${score.pct}% (${score.tier}). ${axis('cost', 'Cost')}, ${axis('time', 'Time')}, ${axis('co2', 'CO₂')}. Can you beat it?`
}
