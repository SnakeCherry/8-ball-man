import { gbp, mins } from './format'
import { isOneOff } from './habit'
import { streamChat } from './llm'
import { contributions, nearestPriority } from './mix'
import { AXES, axisValue } from './scoring'
import type { Axis, Decision, Option, Priority, Weights } from './types'

/**
 * The recommendation sentence. Qwen writes it in plain English from the real numbers; we then check every £, minute
 * and health score it mentions against those numbers (so it cannot invent one) and fall back to a plain template.
 */

export interface AdviceFacts {
  title: string
  oneOff: boolean
  priority: Priority
  best: Option
  options: Option[]
}

export function buildFacts(d: Decision, weights: Weights): AdviceFacts {
  const best = contributions(d.options, weights)[0].option
  return { title: d.title, oneOff: isOneOff(d), priority: nearestPriority(weights), best, options: d.options }
}

const PRIORITY_WORDS: Record<Priority, string> = { money: 'money', time: 'time', health: 'health', balanced: 'a bit of everything' }

const ago = (f: AdviceFacts, o: Option): string =>
  `${o.name}: ${o.costGBP === 0 ? 'free' : gbp(o.costGBP)}${f.oneOff ? '' : ' a time'}, ${f.oneOff ? 'ready in ' : ''}${mins(o.timeMin)}, health ${o.health} out of 10`

/** The facts as the lines Qwen is given. */
export function factsText(f: AdviceFacts): string {
  return [
    `Decision: ${f.title} (${f.oneOff ? 'a one-off purchase' : 'a repeated habit'}).`,
    `The person puts ${PRIORITY_WORDS[f.priority]} first.`,
    `Best fit: ${f.best.name}.`,
    `Options: ${f.options.map((o) => ago(f, o)).join('; ')}.`,
  ].join('\n')
}

/** Every number the advice is allowed to use: the options' own figures and the gaps between them. */
export function allowedNumbers(f: AdviceFacts): { gbp: number[]; minutes: number[]; health: number[]; healthGaps: number[] } {
  const g = new Set<number>()
  const m = new Set<number>()
  const h = new Set<number>() // a health SCORE out of 10
  const hg = new Set<number>() // a gap between two scores, for "4 points healthier"
  const os = f.options
  os.forEach((a, i) => {
    g.add(a.costGBP)
    m.add(a.timeMin)
    h.add(a.health)
    os.forEach((b, j) => {
      if (i === j) return
      g.add(Math.abs(a.costGBP - b.costGBP))
      m.add(Math.abs(a.timeMin - b.timeMin))
      hg.add(Math.abs(a.health - b.health))
    })
  })
  // "1 h 35 min" or "3 days" are the same minutes said another way
  for (const v of [...m]) {
    m.add(Math.floor(v / 60) * 60)
    m.add(v % 60)
    m.add(Math.round((v / 1440) * 10) / 10 * 1440)
    m.add(Math.round(v / 1440) * 1440)
  }
  return { gbp: [...g], minutes: [...m], health: [...h], healthGaps: [...hg] }
}

/** True when the sentence names the best option and every amount in it matches the facts. */
export function validateAdvice(text: string, f: AdviceFacts): boolean {
  const t = text.trim()
  if (t.length < 20 || t.length > 420) return false
  const lower = t.toLowerCase()
  const name = f.best.name.toLowerCase()
  if (!lower.includes(name) && !lower.includes(name.split(' ')[0])) return false

  const ok = allowedNumbers(f)
  const near = (v: number, set: number[], tol: number) => set.some((s) => Math.abs(s - v) <= tol)

  for (const m of t.matchAll(/£\s?(\d+(?:\.\d+)?)/g)) if (!near(parseFloat(m[1]), ok.gbp, 0.06)) return false
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s?(minutes?|mins?|hours?|hrs?|h|days?)\b/gi)) {
    const v = parseFloat(m[1])
    const unit = m[2].toLowerCase()
    const minutes = unit.startsWith('d') ? v * 1440 : unit.startsWith('h') ? v * 60 : v
    if (!near(minutes, ok.minutes, Math.max(1, minutes * 0.06))) return false
  }
  for (const m of t.matchAll(/(\d+)\s*(?:\/|out of)\s*10/gi)) if (!near(parseInt(m[1], 10), ok.health, 0.01)) return false
  for (const m of t.matchAll(/(\d+)\s*(?:health\s+)?points?\b/gi)) if (!near(parseInt(m[1], 10), ok.healthGaps, 0.01)) return false
  return true
}

const AXIS_WORD: Record<Axis, (f: AdviceFacts, other: Option, gap: number) => string> = {
  cost: (_f, o, gap) => `${o.name} would be ${gbp(gap)} cheaper`,
  time: (f, o, gap) => `${o.name} would be ${mins(gap)} ${f.oneOff ? 'sooner' : 'quicker'}`,
  health: (_f, o, gap) => `${o.name} would be ${Math.round(gap)} ${Math.round(gap) === 1 ? 'point' : 'points'} healthier`,
}

/** Plain English from the facts alone, for when Qwen is down or says something that doesn't check out. */
export function plainAdvice(f: AdviceFacts): string {
  const b = f.best
  const opener = f.priority === 'balanced' ? `${b.name} is the best all-round choice` : `${b.name} fits best because you put ${PRIORITY_WORDS[f.priority]} first`
  const cost = b.costGBP === 0 ? 'is free' : `costs ${gbp(b.costGBP)}${f.oneOff ? '' : ' a time'}`
  const time = f.oneOff ? `arrives in ${mins(b.timeMin)}` : `takes ${mins(b.timeMin)}`
  const body = `${opener}: it ${cost}, ${time} and scores ${b.health} out of 10 for health.`

  // the catch: the one thing another option does clearly better
  let catchLine = ''
  let biggest = 0
  for (const a of AXES) {
    for (const o of f.options) {
      if (o.id === b.id) continue
      const gap = axisValue(b, a) - axisValue(o, a) // positive when the other is better
      const rel = gap / Math.max(Math.abs(axisValue(b, a)), 1)
      if (gap > 0 && rel > biggest) {
        biggest = rel
        catchLine = `The catch: ${AXIS_WORD[a](f, o, gap)}.`
      }
    }
  }
  return catchLine ? `${body} ${catchLine}` : body
}

const SYSTEM = `You write a short, friendly recommendation for a UK student (at most 45 words, plain English, no lists, no emoji). Say which option fits best and why, using what the person says matters most, and mention one honest downside. Use ONLY the numbers given, written like £7.50, 12 minutes or 8 out of 10. Do not invent any other number. Do not call the person "the person".`

const cache = new Map<string, string>()
const keyOf = (f: AdviceFacts): string => JSON.stringify([f.title, f.priority, f.best.id, f.options.map((o) => [o.name, o.costGBP, o.timeMin, o.health])])

/**
 * The recommendation in real English. `onPartial` gets the text as Qwen writes it. The returned text has been
 * checked against the facts; if it fails (or Qwen is down) it is the plain template instead.
 */
export async function adviceFor(f: AdviceFacts, onPartial?: (text: string) => void): Promise<string> {
  const key = keyOf(f)
  const hit = cache.get(key)
  if (hit) return hit
  let text: string
  try {
    text = await streamChat(SYSTEM, factsText(f), { maxTokens: 110, onText: onPartial })
    if (!validateAdvice(text, f)) text = plainAdvice(f)
  } catch {
    text = plainAdvice(f)
  }
  cache.set(key, text)
  return text
}
