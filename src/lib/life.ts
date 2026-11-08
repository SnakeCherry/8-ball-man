import { isOneOff, usesPerWeek } from './habit'
import type { Decision, Option } from './types'

/**
 * A rough, illustrative "time vs life" estimate. The app only has its own 1 to 10 health score, so this is NOT
 * medical data. It assumes one health point, each time you do something, is worth about 30 minutes of life
 * expectancy. That number is calibrated to the "microlife" rule of thumb that about 20 minutes of moderate exercise
 * adds roughly an hour to average life expectancy (walking instead of the bus is about 4 points, so about 2 hours).
 */
export const LIFE_MIN_PER_POINT = 30
export const MAX_YEARS = 50

const WEEKS_PER_YEAR = 52
const MIN_PER_DAY = 24 * 60
const MIN_PER_YEAR = MIN_PER_DAY * 365

export interface LifeItem {
  decision: Decision
  usual: Option
  chosen: Option
}

export interface WeeklyEffect {
  /** minutes of free time saved (+) or spent (-) a week against your usual */
  timeMin: number
  /** minutes of life expectancy gained (+) or lost (-) a week, from the health difference */
  lifeMin: number
}

/**
 * What a habit does in a typical week. One-off purchases are not an ongoing habit, so they have no weekly effect.
 */
export function weeklyEffect(item: LifeItem): WeeklyEffect {
  if (isOneOff(item.decision)) return { timeMin: 0, lifeMin: 0 }
  const uses = usesPerWeek(item.decision)
  return {
    timeMin: uses * (item.usual.timeMin - item.chosen.timeMin),
    lifeMin: uses * (item.chosen.health - item.usual.health) * LIFE_MIN_PER_POINT,
  }
}

export const totalWeekly = (items: LifeItem[]): WeeklyEffect =>
  items.reduce<WeeklyEffect>((s, i) => {
    const w = weeklyEffect(i)
    return { timeMin: s.timeMin + w.timeMin, lifeMin: s.lifeMin + w.lifeMin }
  }, { timeMin: 0, lifeMin: 0 })

export interface Projection {
  /** year 0 to `years` */
  years: number[]
  /** cumulative minutes of free time at the end of each year */
  time: number[]
  /** cumulative minutes of life at the end of each year */
  life: number[]
}

/** Keep doing these every week for `years` years: where do free time and life end up? */
export function projectLife(items: LifeItem[], years: number): Projection {
  const n = Math.min(MAX_YEARS, Math.max(1, Math.round(years)))
  const w = totalWeekly(items)
  const ys = Array.from({ length: n + 1 }, (_, i) => i)
  // + 0 turns a negative zero at year 0 into a plain zero
  return { years: ys, time: ys.map((y) => w.timeMin * WEEKS_PER_YEAR * y + 0), life: ys.map((y) => w.lifeMin * WEEKS_PER_YEAR * y + 0) }
}

const round1 = (n: number): number => Math.round(n * 10) / 10

/** Minutes said as a person would: "40 min", "5 h", "12 days", "1.4 years". Always positive; the sign is shown elsewhere. */
export function formatSpan(minutes: number): string {
  const m = Math.abs(minutes)
  if (m < 60) return `${Math.round(m)} min`
  if (m < MIN_PER_DAY) {
    const h = round1(m / 60)
    return `${h} ${h === 1 ? 'hour' : 'hours'}`
  }
  if (m < MIN_PER_YEAR) {
    const d = Math.round(m / MIN_PER_DAY)
    return `${d} ${d === 1 ? 'day' : 'days'}`
  }
  const y = round1(m / MIN_PER_YEAR)
  return `${y} ${y === 1 ? 'year' : 'years'}`
}

/** "+34 days" or "-34 days". */
export const signedSpan = (minutes: number): string => `${minutes < 0 ? '−' : '+'}${formatSpan(minutes)}`

/** How many minutes of life a minute of free time buys (or costs), in a sentence. Null when there is no trade-off to talk about. */
export function exchangeLine(w: WeeklyEffect): string | null {
  const { timeMin, lifeMin } = w
  if (Math.abs(timeMin) < 1 || Math.abs(lifeMin) < 1) return null
  const per = Math.abs(lifeMin / timeMin)
  const ratio = per >= 1 ? `about ${round1(per)} hours of life for every hour` : `about ${Math.max(1, Math.round(per * 60))} minutes of life for every hour`
  if (timeMin < 0 && lifeMin > 0) return `Every hour of free time you give up could buy ${ratio}.`
  if (timeMin > 0 && lifeMin < 0) return `Every hour of free time you save could cost ${ratio}.`
  return null
}

/** One sentence for the whole projection. */
export function lifeHeadline(timeMin: number, lifeMin: number, years: number): string {
  const span = `${years} ${years === 1 ? 'year' : 'years'}`
  if (Math.abs(timeMin) < 1 && Math.abs(lifeMin) < 1) return `Over ${span} your choices come out the same as your usual.`
  const time = timeMin >= 0 ? `bank ${formatSpan(timeMin)} of free time` : `give up ${formatSpan(timeMin)} of free time`
  const life = Math.abs(lifeMin) < 1 ? 'change nothing for your health' : lifeMin > 0 ? `could add about ${formatSpan(lifeMin)} of life` : `could cost about ${formatSpan(lifeMin)} of life`
  return `Over ${span} you'd ${time} and ${life}.`
}
