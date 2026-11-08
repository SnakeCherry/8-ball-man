import { AXES, normalise } from './scoring'
import type { Axis, Option, Priority, Weights } from './types'

/** What each slider says, 0 (not at all) to 10 (lots). */
export type Mix = Record<Axis, number>

const FLOOR = 0.05
export const MIX_MAX = 10

/** Every slider in the middle: money, time and health matter equally until the student says otherwise. */
export const EVEN_MIX: Mix = { cost: MIX_MAX / 2, time: MIX_MAX / 2, health: MIX_MAX / 2 }

/** Rank the three priorities (most important first) as slider values: 1st = 9, 2nd = 5, 3rd = 2. Any left out share the rest evenly. */
export function rankToMix(order: Axis[]): Mix {
  const steps = [9, 5, 2]
  const mix: Mix = { ...EVEN_MIX }
  const placed = order.slice(0, 3)
  placed.forEach((a, i) => (mix[a] = steps[i]))
  const left = AXES.filter((a) => !placed.includes(a))
  left.forEach((a) => (mix[a] = left.length === 3 ? EVEN_MIX[a] : Math.round(left.reduce((s, _x, i) => s + steps[placed.length + i], 0) / left.length)))
  return mix
}

/** Slider values to weights that sum to 1. No priority is ever ignored completely (5% floor). All zero means an even split. */
export function valuesToWeights(v: Mix): Weights {
  const raw = AXES.map((a) => Math.max(0, v[a]))
  const sum = raw.reduce((s, n) => s + n, 0)
  if (sum === 0) return { cost: 1 / 3, time: 1 / 3, health: 1 / 3 }
  const k = 1 - 3 * FLOOR
  const [cost, time, health] = raw.map((n) => FLOOR + (n / sum) * k)
  return { cost, time, health }
}

/** Weights back to slider values (the biggest becomes 10), so the sliders start where the current blend is. */
export function weightsToValues(w: Weights): Mix {
  const top = Math.max(w.cost, w.time, w.health, 0.0001)
  const to = (n: number) => Math.round((n / top) * MIX_MAX)
  return { cost: to(w.cost), time: to(w.time), health: to(w.health) }
}

const AXIS_PRIORITY: Record<Axis, Priority> = { cost: 'money', time: 'time', health: 'health' }

/** The named priority a set of weights is closest to, or "a bit of everything" when they are about even. */
export function nearestPriority(w: Weights): Priority {
  if (AXES.every((a) => Math.abs(w[a] - 1 / 3) <= 0.12)) return 'balanced'
  const top = AXES.reduce((best, a) => (w[a] > w[best] ? a : best), AXES[0])
  return AXIS_PRIORITY[top]
}

/** "Money 50%, Time 30%, Health 20%" for screen readers. */
export function weightsText(w: Weights): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`
  return `Money ${pct(w.cost)}, Time ${pct(w.time)}, Health ${pct(w.health)}`
}

export interface Contribution {
  option: Option
  /** how well it fits, 0..1: the three parts added up */
  fit: number
  /** how much of the fit comes from each priority */
  parts: Record<Axis, number>
}

/**
 * For the leaderboard: each option's fit split into what money, time and health each add. An option is better on
 * an axis the nearer it is to the best, and an axis counts as much as its weight. Best fit first (the same order
 * as rank() in scoring.ts).
 */
export function contributions(options: Option[], weights: Weights): Contribution[] {
  const norm = AXES.map((a) => normalise(options, a))
  return options
    .map((option, i) => {
      const parts = { cost: 0, time: 0, health: 0 } as Record<Axis, number>
      AXES.forEach((a, k) => {
        parts[a] = weights[a] * (1 - norm[k][i])
      })
      return { option, fit: parts.cost + parts.time + parts.health, parts }
    })
    .sort((a, b) => b.fit - a.fit)
}

/** An even split, the starting point for ranking. */
export const EVEN_WEIGHTS: Weights = valuesToWeights(EVEN_MIX)
