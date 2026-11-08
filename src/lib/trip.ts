import { bestOn } from './scoring'
import type { Option } from './types'

/** How long the whole replay lasts, in seconds, whatever the real times are. */
export const TRIP_SECONDS = 7
export const TRIP_TICK_MS = 85

/** Virtual minutes that pass per animation tick: the slowest option takes TRIP_SECONDS. */
export const minutesPerTick = (options: Option[]): number => maxMinutes(options) / ((TRIP_SECONDS * 1000) / TRIP_TICK_MS)

export const maxMinutes = (options: Option[]): number => Math.max(1, ...options.map((o) => o.timeMin))

/** 0..1 along the road after `minutes` of virtual time. Anything that takes no time is already there. */
export function tripProgress(o: Option, minutes: number): number {
  return o.timeMin <= 0 ? 1 : Math.min(1, Math.max(0, minutes / o.timeMin))
}

export interface Medals {
  fastest: string
  cheapest: string
  healthiest: string
}

/** Who wins each axis, for the badges that appear when the race ends. */
export function medals(options: Option[]): Medals {
  return { fastest: bestOn(options, 'time').id, cheapest: bestOn(options, 'cost').id, healthiest: bestOn(options, 'health').id }
}

/** Chance per tick that an option gives off a little heart: healthy ways of doing it feel good as you go. */
export const heartChance = (o: Option): number => Math.min(0.6, Math.max(0, o.health) * 0.03)
