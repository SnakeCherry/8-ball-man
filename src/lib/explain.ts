import { gbp, mins } from './format'
import type { Ranking } from './scoring'
import type { Option, Verdict } from './types'

/** One plain sentence stating the trade-off between the winner and the runner-up. */
export function recommendationSentence(ranking: Ranking): string {
  const [a, b] = ranking.ranked.map((r) => r.option)
  if (ranking.close) {
    return `${a.name} and ${b.name} are very close. Either is a fine choice.`
  }
  const dCost = b.costGBP - a.costGBP
  const dTime = b.timeMin - a.timeMin
  const dHealth = Math.round(a.health - b.health)

  const parts: string[] = []
  if (Math.abs(dCost) >= 0.05) parts.push(`${gbp(dCost)} ${dCost > 0 ? 'less' : 'more'}`)
  if (Math.abs(dTime) >= 1) parts.push(`${mins(dTime)} ${dTime > 0 ? 'faster' : 'slower'}`)
  if (dHealth !== 0) parts.push(`${Math.abs(dHealth)} ${Math.abs(dHealth) === 1 ? 'point' : 'points'} ${dHealth > 0 ? 'healthier' : 'less healthy'}`)

  if (!parts.length) return `${a.name} comes out slightly ahead.`
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]
  return `${a.name} is ${joined} than ${b.name}.`
}

export interface TimePurchase {
  verdict: Verdict
  extraGBP: number
  minutesSaved: number
  perHour: number
}

/**
 * Paying more than your usual to save time is a purchase you can judge
 * against your own £/hour from the duels.
 */
export function timePurchase(chosen: Option, usual: Option, userRatePerHour: number): TimePurchase | null {
  const extra = chosen.costGBP - usual.costGBP
  const saved = usual.timeMin - chosen.timeMin
  if (extra <= 0 || saved <= 0) return null
  const perHour = extra / (saved / 60)
  const ratio = perHour / userRatePerHour
  const verdict: Verdict = ratio < 0.8 ? 'good' : ratio <= 1.25 ? 'fair' : 'steep'
  return { verdict, extraGBP: extra, minutesSaved: saved, perHour }
}
