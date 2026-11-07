import { gbp, kg, mins, round1 } from './format'
import { AXES, axisValue, bestOn } from './scoring'
import type { Ranking } from './scoring'
import type { Axis, Decision, Guesses, Option, Verdict } from './types'

/** One plain sentence stating the trade-off between the winner and the runner-up. */
export function recommendationSentence(ranking: Ranking): string {
  const [a, b] = ranking.ranked.map((r) => r.option)
  if (ranking.close) {
    return `${a.name} and ${b.name} are very close. Either is a fine choice.`
  }
  const dCost = b.costGBP - a.costGBP
  const dTime = b.timeMin - a.timeMin
  const dCo2 = b.co2Kg - a.co2Kg

  const parts: string[] = []
  if (Math.abs(dCost) >= 0.05) parts.push(`${gbp(dCost)} ${dCost > 0 ? 'less' : 'more'}`)
  if (Math.abs(dTime) >= 1) parts.push(`${mins(dTime)} ${dTime > 0 ? 'faster' : 'slower'}`)
  if (Math.abs(dCo2) >= 0.1) parts.push(`${kg(dCo2)} ${dCo2 > 0 ? 'less' : 'more'} CO₂`)

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

export interface Surprise {
  axis: Axis
  guessed: Option
  best: Option
  /** monthly effect of the gap, in the axis' own unit */
  perMonth: number
  text: string
}

const AXIS_WORD: Record<Axis, string> = { cost: 'cheapest', time: 'fastest', co2: 'greenest' }

/**
 * The wrong guess with the largest relative gap, phrased with the monthly effect.
 * Null when every guess was right.
 */
export function biggestSurprise(decision: Decision, guesses: Guesses): Surprise | null {
  let top: { axis: Axis; gap: number; guessed: Option; best: Option } | null = null
  for (const axis of AXES) {
    const best = bestOn(decision.options, axis)
    const guessed = decision.options.find((o) => o.id === guesses[axis])
    if (!guessed || guessed.id === best.id) continue
    const values = decision.options.map((o) => axisValue(o, axis))
    const range = Math.max(...values) - Math.min(...values) || 1
    const gap = (axisValue(guessed, axis) - axisValue(best, axis)) / range
    if (!top || gap > top.gap) top = { axis, gap, guessed, best }
  }
  if (!top) return null

  const { axis, guessed, best } = top
  const n = decision.timesPerMonth
  const diff = axisValue(guessed, axis) - axisValue(best, axis)
  const perMonth = diff * n
  let text: string
  if (axis === 'cost') {
    text = `${best.name} is the ${AXIS_WORD[axis]}, not ${guessed.name}. The gap is ${gbp(diff)} each time, about ${gbp(perMonth)} a month.`
  } else if (axis === 'time') {
    text = `${best.name} is the ${AXIS_WORD[axis]}, not ${guessed.name}. That is ${mins(diff)} each time, about ${round1(perMonth / 60)} hours a month.`
  } else {
    text = `${best.name} is the ${AXIS_WORD[axis]}, not ${guessed.name}. That is ${kg(diff)} of CO₂ each time, about ${kg(perMonth)} a month.`
  }
  return { axis, guessed, best, perMonth, text }
}

export function countCorrect(decision: Decision, guesses: Guesses): number {
  return AXES.filter((a) => guesses[a] === bestOn(decision.options, a).id).length
}
