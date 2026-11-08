import { AXES } from './scoring'
import type { Axis, Priority, Weights } from './types'

export interface Pt {
  x: number
  y: number
}

/** Corners in a 300 x 270 box: cost on top, time bottom left, health bottom right. */
export const TRI_W = 300
export const TRI_H = 270
export const VERTS: Record<Axis, Pt> = {
  cost: { x: 150, y: 44 },
  time: { x: 30, y: 226 },
  health: { x: 270, y: 226 },
}

/** One colour per option, shared by the triangle's territory, its dots, the legend and the trip race. */
export const OPTION_COLORS = ['#6ef07f', '#ffd54a', '#8ecbff']

const FLOOR = 0.05
const AXIS_PRIORITY: Record<Axis, Priority> = { cost: 'money', time: 'time', health: 'health' }

/** Barycentric coordinates of a point against the three corners (they sum to 1). */
function barycentric(p: Pt): Weights {
  const a = VERTS.cost
  const b = VERTS.time
  const c = VERTS.health
  const det = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y)
  const cost = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) / det
  const time = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) / det
  return { cost, time, health: 1 - cost - time }
}

/** Weights for a point. Outside the triangle it is pulled to the edge; no weight drops below 5%. */
export function pointToWeights(p: Pt): Weights {
  const raw = barycentric(p)
  const pos = AXES.map((a) => Math.max(raw[a], 0))
  const sum = pos.reduce((t, n) => t + n, 0) || 1
  // squeeze into [FLOOR, 1 - 2*FLOOR] so nothing is ever ignored and the weights still sum to 1
  const k = 1 - 3 * FLOOR
  const [cost, time, health] = pos.map((n) => FLOOR + (n / sum) * k)
  return { cost, time, health }
}

/** Point for an unsqueezed mix of the three corners (used for option dots). */
export function mixToPoint(w: Weights): Pt {
  const sum = w.cost + w.time + w.health || 1
  return {
    x: (w.cost * VERTS.cost.x + w.time * VERTS.time.x + w.health * VERTS.health.x) / sum,
    y: (w.cost * VERTS.cost.y + w.time * VERTS.time.y + w.health * VERTS.health.y) / sum,
  }
}

/** Exact inverse of pointToWeights for points inside the triangle, so the handle sits under the pointer. */
export function weightsToPoint(w: Weights): Pt {
  const k = 1 - 3 * FLOOR
  return mixToPoint({ cost: (w.cost - FLOOR) / k, time: (w.time - FLOOR) / k, health: (w.health - FLOOR) / k })
}

export function insideTriangle(p: Pt): boolean {
  const b = barycentric(p)
  return b.cost >= 0 && b.time >= 0 && b.health >= 0
}

/** The named priority a set of weights is closest to, or "a bit of everything" near the middle. */
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
