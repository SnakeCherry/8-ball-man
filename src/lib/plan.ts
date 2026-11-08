import { getDecision } from '../data/decisions'
import { creditFor } from './habit'
import { streamChat } from './llm'
import type { ChoiceRecord, Decision, Option } from './types'

/** One swap worth trying next week: an option that would beat what you chose last time. */
export interface PlanItem {
  decision: Decision
  usual: Option
  /** what you chose last time */
  last: Option
  option: Option
  /** £ a week saved against your usual (a habit counts a week of itself, a one-off counts once) */
  weeklyGBP: number
  /** health points against your usual */
  healthDelta: number
  /** minutes saved (+) or extra (-) a week against your usual */
  minutes: number
}

/**
 * For each habit you have chosen on, the option that would save the most a week and is better than what you picked
 * last time. Top few by saving. Every figure comes from the numbers, nothing from the model.
 */
export function buildPlan(history: ChoiceRecord[], usualByDecision: Record<string, string> = {}, limit = 3): PlanItem[] {
  const lastByDecision = new Map<string, ChoiceRecord>()
  for (const h of history) lastByDecision.set(h.decisionId, h)

  const items: PlanItem[] = []
  for (const [id, rec] of lastByDecision) {
    let d: Decision
    try {
      d = getDecision(id)
    } catch {
      continue
    }
    const usual = d.options.find((o) => o.id === (usualByDecision[d.id] ?? d.usualId))
    const last = d.options.find((o) => o.id === rec.optionId)
    if (!usual || !last) continue
    const weekly = (o: Option) => creditFor(d, usual.costGBP - o.costGBP)
    const best = d.options
      .filter((o) => o.id !== last.id && o.id !== usual.id)
      .map((o) => ({ o, w: weekly(o) }))
      .filter((x) => x.w >= 1 && x.w > weekly(last) + 0.5)
      .sort((a, b) => b.w - a.w)[0]
    if (!best) continue
    items.push({
      decision: d,
      usual,
      last,
      option: best.o,
      weeklyGBP: Math.round(best.w * 100) / 100,
      healthDelta: best.o.health - usual.health,
      minutes: Math.round(creditFor(d, usual.timeMin - best.o.timeMin)),
    })
  }
  return items.sort((a, b) => b.weeklyGBP - a.weeklyGBP).slice(0, limit)
}

/** A friendly line with no figures in it (those sit in the rows below), used when Qwen is down or says something odd. */
export const plainHeadline = (n: number): string => (n > 1 ? 'A few small swaps could go a long way.' : 'One small swap could go a long way.')

/** True for a short line with no digits or £ signs, so the model can never put a wrong number in the headline. */
export function validHeadline(text: string): boolean {
  const t = text.trim()
  return t.length >= 8 && t.length <= 90 && !/[0-9£$€]/.test(t)
}

const SYSTEM = `You write one short, friendly headline (at most 10 words) encouraging a UK student to try some small swaps next week. Plain English, no emoji, and NO numbers and no money amounts at all.`

const cache = new Map<string, string>()

/** The plan's headline from Qwen, kept only if it passes validHeadline. */
export async function planHeadline(items: PlanItem[]): Promise<string> {
  const fallback = plainHeadline(items.length)
  if (!items.length) return fallback
  const key = items.map((i) => `${i.decision.id}:${i.option.id}`).join('|')
  const hit = cache.get(key)
  if (hit) return hit
  let text = fallback
  try {
    const said = await streamChat(SYSTEM, `Swaps: ${items.map((i) => `${i.option.name} instead of ${i.last.name} (${i.decision.title})`).join('; ')}`, { maxTokens: 40 })
    const clean = said.replace(/^["'\s]+|["'\s]+$/g, '').split('\n')[0]
    if (validHeadline(clean)) text = clean
  } catch {
    /* the plain line is fine */
  }
  cache.set(key, text)
  return text
}
