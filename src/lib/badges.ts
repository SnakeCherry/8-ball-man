import { winWin } from './recap'
import type { Entry } from './recap'
import type { SpriteName } from './sprites'
import type { ChoiceRecord } from './types'

/**
 * Badges have three medal levels, bronze, silver and gold (the same colours as the podiums). Each counts something
 * you do, never how little you spend, and shows how far you are from the next level.
 */

export type BadgeStat = 'money' | 'time' | 'health' | 'winwin' | 'switch' | 'saved' | 'tried' | 'chains'

export interface BadgeDef {
  id: string
  name: string
  /** what it counts, finishing "…" e.g. "Choices where you put money first" */
  line: string
  icon: SpriteName
  stat: BadgeStat
  /** the amount for bronze, silver and gold */
  tiers: [number, number, number]
  /** show the numbers as pounds */
  gbp?: boolean
}

export const BADGES: BadgeDef[] = [
  { id: 'penny', name: 'Penny Pincher', line: 'Choices where you put money first', icon: 'pound', stat: 'money', tiers: [3, 8, 20] },
  { id: 'timesaver', name: 'Time Saver', line: 'Choices where you put time first', icon: 'clock', stat: 'time', tiers: [3, 8, 20] },
  { id: 'health', name: 'Health Kick', line: 'Choices where you put health first', icon: 'heart', stat: 'health', tiers: [3, 8, 20] },
  { id: 'winwin', name: 'Better Swaps', line: 'Choices that beat your usual on two or more things', icon: 'star', stat: 'winwin', tiers: [2, 6, 15] },
  { id: 'switcher', name: 'Switcher', line: 'Times you chose something other than your usual', icon: 'arrow', stat: 'switch', tiers: [3, 10, 25] },
  { id: 'saver', name: 'Saver', line: 'Pounds saved against your usual', icon: 'chart', stat: 'saved', tiers: [10, 50, 200], gbp: true },
  { id: 'explorer', name: 'Explorer', line: 'Different habits you have looked at', icon: 'eye', stat: 'tried', tiers: [3, 6, 12] },
  { id: 'chain', name: 'Chain Master', line: 'Runs of several habits you finished', icon: 'flag', stat: 'chains', tiers: [1, 3, 6] },
]

export const TIER_NAME = ['Locked', 'Bronze', 'Silver', 'Gold'] as const
export const TIER_COLOR = ['#e8e8e8', '#d28a4c', '#c9d0d8', '#f7c948'] as const

export function badgeById(id: string): BadgeDef {
  const b = BADGES.find((x) => x.id === id)
  if (!b) throw new Error(`Unknown badge ${id}`)
  return b
}

export type BadgeStats = Record<BadgeStat, number>

/** The numbers badges are made from. Saved only counts the pounds you kept, so a costly choice never takes a badge away. */
export function badgeStats(history: ChoiceRecord[], entries: Entry[], chains: number): BadgeStats {
  const count = (p: ChoiceRecord['priority']) => history.filter((h) => h.priority === p).length
  return {
    money: count('money'),
    time: count('time'),
    health: count('health'),
    winwin: entries.filter((e) => winWin(e).win).length,
    switch: entries.filter((e) => e.chosen.id !== e.usual.id).length,
    saved: history.reduce((s, h) => s + Math.max(0, h.savedGBP), 0),
    tried: new Set(history.map((h) => h.decisionId)).size,
    chains,
  }
}

export type Tier = 0 | 1 | 2 | 3

export function tierOf(value: number, tiers: [number, number, number]): Tier {
  return value >= tiers[2] ? 3 : value >= tiers[1] ? 2 : value >= tiers[0] ? 1 : 0
}

export interface BadgeLevel {
  def: BadgeDef
  value: number
  tier: Tier
  /** the amount needed for the next medal, or null at gold */
  next: number | null
}

export function badgeLevels(stats: BadgeStats): BadgeLevel[] {
  return BADGES.map((def) => {
    const value = stats[def.stat]
    const tier = tierOf(value, def.tiers)
    return { def, value, tier, next: tier === 3 ? null : def.tiers[tier] }
  })
}

/** Badge id to medal level, for remembering what has already been celebrated. */
export const tiersById = (levels: BadgeLevel[]): Record<string, number> => Object.fromEntries(levels.map((l) => [l.def.id, l.tier]))

/** Medals that went up since `before`: new badges and new levels. */
export function newMedals(before: Record<string, number>, levels: BadgeLevel[]): { id: string; tier: number }[] {
  return levels.filter((l) => l.tier > (before[l.def.id] ?? 0)).map((l) => ({ id: l.def.id, tier: l.tier }))
}
