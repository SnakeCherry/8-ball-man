import { DECISIONS } from '../data/decisions'
import { CHOOSABLE, iconForText, isIconName } from './pixelart'
import type { IconName } from './pixelart'
import type { Decision, Option } from './types'

/**
 * Turn a sentence ("I get an Uber to uni every morning") into a Decision the whole app can use.
 * Qwen on the Spark does the pricing; everything it says is clamped before use, and a keyword
 * match over the preset decisions is the fallback when it is down.
 */

const SYSTEM = `Turn a UK student's habit into prices for a money-saving app. GBP, Edinburgh prices.
Option 1 is exactly what they described (their usual); options 2 and 3 are realistic alternatives for the same need.
Per single use give cost in pounds, time in minutes and a health score from 1 to 10: how good it is for their body and mind (movement, nutrition, sleep, stress). Walking or cycling 8-10, a home-cooked meal 8, a takeaway or sugary drink 2-3, a taxi or sitting still 3.
Uses per month: weekday habit 20, 'most days' 20, weekly 4, monthly 1. Names max 3 words.
Reply with exactly 4 lines and nothing else, fields separated by |
Line 1: uses per month|activity name
Lines 2-4: option name|icon|cost|minutes|health score
icon is one word from: ${CHOOSABLE.join(', ')}
Name each option by what it is (Uber, Bus, Walk). Never use the word usual.`

// A short pipe-separated reply is about a quarter of the tokens of JSON, and it streams line by line:
// at ~28 tokens a second on the Spark that took the wait from ~9 s to ~3 s, with the first option showing at ~1.3 s.

const clamp = (n: unknown, lo: number, hi: number): number | null =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null
const text = (s: unknown, max: number): string | null => (typeof s === 'string' && s.trim() ? s.trim().slice(0, max) : null)

/** Build a safe Decision from whatever the model returned, or null if it is unusable. */
export function sanitiseDecision(raw: unknown, said = ''): Decision | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const title = text(r.activity, 40)
  const times = clamp(r.timesPerMonth, 1, 60)
  if (!title || times === null || !Array.isArray(r.options) || r.options.length < 3) return null

  const options: Option[] = []
  for (const [i, o] of r.options.slice(0, 3).entries()) {
    const x = (o ?? {}) as Record<string, unknown>
    const name = text(x.name, 40)
    const cost = clamp(x.costGBP, 0, 1000)
    const time = clamp(x.timeMin, 0, 900)
    const health = clamp(x.health, 1, 10)
    if (!name || cost === null || time === null || health === null) return null
    options.push({ id: `o${i + 1}`, name, icon: isIconName(x.icon) ? x.icon : iconForText(name), costGBP: round2(cost), timeMin: Math.round(time), health: Math.round(health) })
  }
  const usual = typeof r.usualIndex === 'number' && r.usualIndex >= 0 && r.usualIndex < 3 ? Math.floor(r.usualIndex) : 0
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'habit'
  return {
    id: `custom-${slug}-${Date.now().toString(36)}`,
    title,
    icon: isIconName(r.icon) ? r.icon : options[0].icon,
    blurb: said ? `You said: "${said.slice(0, 80)}"` : 'Estimated from what you told us.',
    timesPerMonth: Math.round(times),
    options: options as [Option, Option, Option],
    usualId: options[usual].id,
  }
}

const round2 = (n: number): number => Math.round(n * 100) / 100

/** True when Qwen answers its health check through the proxy. */
export async function llmAvailable(): Promise<boolean> {
  try {
    const r = await fetch('/api/llm/health', { signal: AbortSignal.timeout(1500) })
    return r.ok
  } catch {
    return false
  }
}

export interface ParsedOption {
  name: string
  icon: IconName
  costGBP: number
  timeMin: number
  health: number
}
export interface ParsedEstimate {
  timesPerMonth: number | null
  activity: string | null
  options: ParsedOption[]
}

const num = (s: string | undefined): number | null => {
  const m = s?.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

/**
 * Read the pipe-separated reply. While streaming only finished lines count (`final` false); at the
 * end the last line counts even without a newline. Tolerant of bullets, backticks and stray spaces.
 */
export function parseEstimate(text: string, final = true): ParsedEstimate {
  const raw = text.split('\n')
  const strip = (l: string) => l.replace(/^[\s`>*-]+/, '').replace(/^\d+[.)]\s+/, '').trim()
  const lines = (final ? raw : raw.slice(0, -1)).map(strip).filter((l) => l.includes('|'))
  const out: ParsedEstimate = { timesPerMonth: null, activity: null, options: [] }
  for (const line of lines) {
    const parts = line.split('|').map((x) => x.trim())
    if (parts.length >= 4) {
      const e = parts.findIndex((x, i) => i > 0 && isIconName(x.toLowerCase()))
      const nums = parts.filter((_, i) => i > 0 && i !== e).map(num).filter((n): n is number => n !== null)
      if (nums.length >= 3 && out.options.length < 3) {
        out.options.push({ name: parts[0], icon: e > 0 ? (parts[e].toLowerCase() as IconName) : iconForText(parts[0]), costGBP: nums[0], timeMin: nums[1], health: nums[2] })
      }
    } else if (out.activity === null && parts.length >= 2) {
      out.timesPerMonth = num(parts[0])
      out.activity = parts[1] || null
    }
  }
  return out
}

/** Shape the parsed reply for sanitiseDecision. */
const toRaw = (p: ParsedEstimate) => ({
  activity: p.activity,
  icon: p.options[0]?.icon,
  timesPerMonth: p.timesPerMonth ?? 20,
  usualIndex: 0,
  options: p.options,
})

const cache = new Map<string, Decision>()
const request = (said: string, stream: boolean, maxTokens: number): Promise<Response> =>
  fetch('/api/llm/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: said },
      ],
      temperature: 0,
      max_tokens: maxTokens,
      stream,
      chat_template_kwargs: { enable_thinking: false },
    }),
  })

/** Prime the server's prompt cache so the first real question skips reading the instructions (about 0.4 s). */
export function warmUpLlm(): void {
  void request('hi', false, 1).catch(() => undefined)
}

/**
 * Ask Qwen to price what the person said. `onPartial` fires as each line streams in, so the
 * screen can fill in option by option. Throws on any failure so the caller can fall back.
 */
export async function estimateDecision(said: string, onPartial?: (p: ParsedEstimate) => void): Promise<Decision> {
  const key = said.trim().toLowerCase()
  const hit = cache.get(key)
  if (hit) return hit

  const res = await request(said, true, 120)
  if (!res.ok || !res.body) throw new Error(`llm ${res.status}`)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let sse = ''
  let reply = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    sse += dec.decode(value, { stream: true })
    const events = sse.split('\n')
    sse = events.pop() ?? ''
    for (const ev of events) {
      if (!ev.startsWith('data:') || ev.includes('[DONE]')) continue
      try {
        const delta = (JSON.parse(ev.slice(5)) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content
        if (delta) reply += delta
      } catch {
        /* a partial event: the rest arrives in the next chunk */
      }
    }
    onPartial?.(parseEstimate(reply, false))
  }
  const parsed = parseEstimate(reply, true)
  onPartial?.(parsed)
  const d = sanitiseDecision(toRaw(parsed), said)
  if (!d) throw new Error('unusable estimate')
  cache.set(key, d)
  return d
}

/* ---- fallback: match the words to one of the preset decisions ---- */

const SYNONYMS: Record<string, string> = {
  commute: 'uni university lecture commute uber taxi bus walk cycle bike travel campus',
  dinner: 'dinner deliveroo takeaway delivery cook cooking tea supper',
  lunch: 'lunch greggs sandwich canteen meal deal packed',
  coffee: 'coffee latte cafe starbucks espresso brew',
  foodshop: 'shop shopping groceries supermarket tesco aldi lidl food',
  laundry: 'laundry washing clothes dryer',
}
const STOP = new Set(['the', 'and', 'for', 'to', 'a', 'an', 'my', 'i', 'in', 'on', 'every', 'each', 'most', 'days', 'get', 'got', 'have', 'about', 'times', 'week', 'day', 'with', 'from', 'then', 'that', 'this'])
const words = (s: string): string[] => s.toLowerCase().match(/[a-z]+/g)?.filter((w) => w.length > 2 && !STOP.has(w)) ?? []

/** The preset that best fits the sentence, or null when nothing in it matches. */
export function matchPreset(said: string): Decision | null {
  const heard = new Set(words(said))
  let best: { d: Decision; score: number } | null = null
  for (const d of DECISIONS) {
    const bag = new Set(words(`${d.title} ${d.blurb} ${d.options.map((o) => o.name).join(' ')} ${SYNONYMS[d.id] ?? ''}`))
    const score = [...heard].filter((w) => bag.has(w)).length
    if (score > 0 && (!best || score > best.score)) best = { d, score }
  }
  return best?.d ?? null
}
