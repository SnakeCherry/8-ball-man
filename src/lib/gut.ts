export interface GutTally {
  /** sum of closeness (0..1) over every guess */
  points: number
  weight: number
  /** guesses made, and how many were within 25% */
  n: number
  close: number
}

export const EMPTY_GUT: GutTally = { points: 0, weight: 0, n: 0, close: 0 }

export interface GutScore {
  /** whole-number percentage, or null before the first guess */
  pct: number | null
  tier: string
  guesses: number
}

/** Tiers are descriptive and a little playful, never a ranking against other people. */
export function gutScore(g: GutTally): GutScore {
  if (g.n === 0 || g.weight === 0) return { pct: null, tier: 'Not played yet', guesses: 0 }
  const pct = Math.round((g.points / g.weight) * 100)
  const tier = pct >= 80 ? 'Price wizard' : pct >= 60 ? 'Sharp eye' : pct >= 40 ? 'Getting warm' : 'Still guessing'
  return { pct, tier, guesses: g.n }
}

/** Add one guess. */
export function addGuess(g: GutTally, closenessValue: number, isClose: boolean): GutTally {
  return { points: g.points + closenessValue, weight: g.weight + 1, n: g.n + 1, close: g.close + (isClose ? 1 : 0) }
}

/** Close guesses in a row, carried over from the last choice. */
export function nextStreak(start: number, results: boolean[]): number {
  return results.reduce((s, ok) => (ok ? s + 1 : 0), start)
}

export function gutShareText(appName: string, score: GutScore, g: GutTally, bestStreak: number): string {
  const bits = [`close on ${g.close} of ${g.n} guesses`]
  if (bestStreak) bits.push(`best run ${bestStreak}`)
  return `My Gut Score on ${appName}: ${score.pct}% (${score.tier}), ${bits.join(', ')}. Can you beat it?`
}
