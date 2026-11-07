import type { Axis, Option, Priority, Weights } from './types'

export const AXES: Axis[] = ['cost', 'time', 'co2']

export const PRIORITY_WEIGHTS: Record<Priority, Weights> = {
  money: { cost: 0.7, time: 0.15, co2: 0.15 },
  time: { cost: 0.15, time: 0.7, co2: 0.15 },
  footprint: { cost: 0.15, time: 0.15, co2: 0.7 },
  balanced: { cost: 1 / 3, time: 1 / 3, co2: 1 / 3 },
}

export function axisValue(o: Option, axis: Axis): number {
  return axis === 'cost' ? o.costGBP : axis === 'time' ? o.timeMin : o.co2Kg
}

/**
 * 0 (best) to 1 (worst) per option. Blends min-max with value/worst so the
 * score is less jumpy when the options are all close together.
 */
export function normalise(options: Option[], axis: Axis): number[] {
  const values = options.map((o) => axisValue(o, axis))
  const min = Math.min(...values)
  const max = Math.max(...values)
  return values.map((v) => {
    const minMax = max === min ? 0 : (v - min) / (max - min)
    const share = max === 0 ? 0 : v / max
    return 0.5 * minMax + 0.5 * share
  })
}

function renormalise(w: Weights, floor = 0.05): Weights {
  const c = Math.max(w.cost, floor)
  const t = Math.max(w.time, floor)
  const e = Math.max(w.co2, floor)
  const sum = c + t + e
  return { cost: c / sum, time: t / sum, co2: e / sum }
}

export interface BlendResult {
  weights: Weights
  /** true when a tight budget pushed the money weight up */
  moneyNudged: boolean
  /** true when past priorities changed the weights noticeably */
  historyShifted: boolean
}

/**
 * 70% this week's priority, 30% the average of past priorities.
 * A tight budget (moneyLeftRatio below 0.3) nudges the cost weight up.
 * Weights never drop to zero.
 */
export function blendWeights(
  priority: Priority,
  history: Priority[],
  moneyLeftRatio = 1,
): BlendResult {
  const current = PRIORITY_WEIGHTS[priority]
  const past = history.length
    ? AXES.reduce(
        (acc, a) => ({
          ...acc,
          [a]: history.reduce((s, p) => s + PRIORITY_WEIGHTS[p][a], 0) / history.length,
        }),
        { cost: 0, time: 0, co2: 0 } as Weights,
      )
    : current

  let blended: Weights = {
    cost: 0.7 * current.cost + 0.3 * past.cost,
    time: 0.7 * current.time + 0.3 * past.time,
    co2: 0.7 * current.co2 + 0.3 * past.co2,
  }

  const moneyNudged = moneyLeftRatio < 0.3
  if (moneyNudged) {
    const bump = 0.15 * (1 - moneyLeftRatio / 0.3)
    blended = { ...blended, cost: blended.cost + bump }
  }

  const weights = renormalise(blended)
  const historyShifted = history.length > 0 && AXES.some((a) => Math.abs(weights[a] - current[a]) > 0.04)
  return { weights, moneyNudged, historyShifted }
}

export interface RankedOption {
  option: Option
  score: number
}

export interface Ranking {
  ranked: RankedOption[]
  /** top two are within 0.05, so call it a tie */
  close: boolean
}

export function rank(options: Option[], weights: Weights): Ranking {
  const norm = AXES.map((a) => normalise(options, a))
  const ranked = options
    .map((option, i) => ({
      option,
      score: weights.cost * norm[0][i] + weights.time * norm[1][i] + weights.co2 * norm[2][i],
    }))
    .sort((a, b) => a.score - b.score)
  const close = ranked.length > 1 && ranked[1].score - ranked[0].score < 0.05
  return { ranked, close }
}

/** The option with the lowest value on an axis. */
export function bestOn(options: Option[], axis: Axis): Option {
  return options.reduce((best, o) => (axisValue(o, axis) < axisValue(best, axis) ? o : best))
}
