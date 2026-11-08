import { getDecision } from '../data/decisions'
import { plural, timeSavedText } from './format'
import type { IconName } from './pixelart'
import type { ChoiceRecord, Decision, Option, Priority } from './types'

const DAY = 86_400_000

/** A past choice joined up with what was chosen and what the usual was. */
export interface Entry {
  record: ChoiceRecord
  decision: Decision
  chosen: Option
  usual: Option
  /** health points gained (or lost) against your usual */
  healthDelta: number
}

/** Pair every record with its decision and options. Records whose decision is no longer known are skipped. */
export function resolveHistory(history: ChoiceRecord[], usualByDecision: Record<string, string> = {}): Entry[] {
  const out: Entry[] = []
  for (const record of history) {
    let decision: Decision
    try {
      decision = getDecision(record.decisionId)
    } catch {
      continue
    }
    const chosen = decision.options.find((o) => o.id === record.optionId)
    const usual = decision.options.find((o) => o.id === (usualByDecision[decision.id] ?? decision.usualId))
    if (!chosen || !usual) continue
    out.push({ record, decision, chosen, usual, healthDelta: chosen.health - usual.health })
  }
  return out
}

export interface Totals {
  savedGBP: number
  minutes: number
  health: number
  choices: number
}

export function totals(history: ChoiceRecord[], entries: Entry[]): Totals {
  return {
    savedGBP: history.reduce((s, h) => s + h.savedGBP, 0),
    minutes: history.reduce((s, h) => s + h.minutesSaved, 0),
    health: entries.reduce((s, e) => s + e.healthDelta, 0),
    choices: history.length,
  }
}

export interface Personality {
  title: string
  line: string
  icon: IconName
}

const PERSONALITY: Record<Priority, Personality> = {
  money: { title: 'The Penny Pincher', line: 'You keep a close eye on every pound.', icon: 'coin' },
  time: { title: 'The Time Saver', line: 'Your minutes matter more than your money.', icon: 'bus' },
  health: { title: 'The Health Kicker', line: 'You look after your body first.', icon: 'dumbbell' },
  balanced: { title: 'The Balancer', line: 'You give money, time and health a turn.', icon: 'cart' },
}

/** Who you are, from what you put first most often. A tie, or an even spread, is the Balancer. */
export function personality(history: ChoiceRecord[]): Personality | null {
  if (!history.length) return null
  const count = (p: Priority) => history.filter((h) => h.priority === p).length
  const ranked = (['money', 'time', 'health'] as const).map((p) => ({ p, n: count(p) })).sort((a, b) => b.n - a.n)
  const top = ranked[0]
  if (top.n === 0 || top.n === ranked[1].n) return PERSONALITY.balanced
  return PERSONALITY[top.p]
}

/* ---- the win-win score: how often you beat your usual on at least two of money, time and health ---- */

export interface WinWin {
  /** how many of money, time and health the choice beats your usual on (0-3) */
  axes: number
  /** two or more */
  win: boolean
}

/** Better means at least 1p cheaper, 1 minute quicker, or 1 health point higher. */
export function winWin(e: Entry): WinWin {
  const axes = [e.usual.costGBP - e.chosen.costGBP >= 0.01, e.usual.timeMin - e.chosen.timeMin >= 1, e.chosen.health - e.usual.health >= 1].filter(Boolean).length
  return { axes, win: axes >= 2 }
}

export interface WinWinScore {
  /** null until there are three choices to judge */
  pct: number | null
  wins: number
  of: number
  tier: string
}

export const WIN_WIN_MIN = 3

export function winWinScore(entries: Entry[]): WinWinScore {
  const wins = entries.filter((e) => winWin(e).win).length
  const of = entries.length
  if (of < WIN_WIN_MIN) return { pct: null, wins, of, tier: 'Keep going' }
  const pct = Math.round((wins / of) * 100)
  return { pct, wins, of, tier: pct < 25 ? 'Rookie' : pct < 50 ? 'Switcher' : pct < 75 ? 'Optimiser' : 'Ball Master' }
}

/* ---- the quadrant map ---- */

export type Quadrant = 'win' | 'healthier' | 'cheaper' | 'neither' | 'same'

export interface QuadPoint {
  entry: Entry
  /** money saved as a percentage of the usual price, -100 (costs far more) to 100 (free) */
  x: number
  /** health points gained (+) or lost (-) against your usual */
  y: number
  /** where to draw it across the chart, -0.9 to 0.9: a soft curve, so big wins get close to the edge but never sit on it */
  xn: number
  /** where to draw it up the chart, -0.9 to 0.9 */
  yn: number
  /** time saved (+) or extra (-) as a percentage of the usual time, -100 to 100 */
  timePct: number
  quadrant: Quadrant
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

/** A soft limit: small changes move you a fair way, huge ones only creep towards the edge (never past 0.9). */
const soft = (v: number, scale: number): number => 0.9 * Math.tanh(v / scale)

/**
 * Where each choice sits against your usual. Money is a percentage of the usual price, so a £450 console and a
 * £1.80 coffee share one scale, and positions use a soft curve so they rarely crowd the edges. Top right (cheaper and
 * healthier) is the sweet spot.
 */
export function quadrantPoints(entries: Entry[], limit = 12): QuadPoint[] {
  return entries.slice(-limit).map((entry) => {
    const { usual, chosen } = entry
    const x = usual.costGBP > 0 ? clamp(((usual.costGBP - chosen.costGBP) / usual.costGBP) * 100, -100, 100) : chosen.costGBP > 0 ? -100 : 0
    const y = clamp(chosen.health - usual.health, -9, 9)
    const xn = soft(x, 80)
    const yn = soft(y, 6)
    const timePct = usual.timeMin > 0 ? clamp(((usual.timeMin - chosen.timeMin) / usual.timeMin) * 100, -100, 100) : 0
    const quadrant: Quadrant = x === 0 && y === 0 ? 'same' : x > 0 && y > 0 ? 'win' : y > 0 ? 'healthier' : x > 0 ? 'cheaper' : 'neither'
    return { entry, x, y, xn, yn, timePct, quadrant }
  })
}

/** "today", "yesterday", "3 days ago", "2 weeks ago". */
export function ago(ts: number, now = Date.now()): string {
  const d = Math.floor((now - ts) / DAY)
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 14) return `${d} days ago`
  const w = Math.floor(d / 7)
  return `${w} ${plural(w, 'week')} ago`
}

/** What the "Share" button copies. */
export function wrappedText(appName: string, p: Personality | null, t: Totals, score?: WinWinScore): string {
  const bits = [
    `${t.savedGBP >= 0 ? 'saved' : 'spent'} £${Math.abs(t.savedGBP).toFixed(2)} vs my usual`,
    timeSavedText(t.minutes),
    `${t.health >= 0 ? '+' : '-'}${Math.abs(t.health)} health points`,
    ...(score && score.pct !== null ? [`${score.pct}% of my choices were better than my usual`] : []),
  ]
  return `My ${appName} wrapped${p ? `: ${p.title}` : ''}. ${bits.join(', ')} over ${t.choices} ${plural(t.choices, 'choice')}.`
}
