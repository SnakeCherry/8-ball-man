import type { Decision } from './types'

/** A one-off purchase (a console, a laptop) has no "times a month": Qwen marks it with 0. */
export const isOneOff = (d: Decision): boolean => d.timesPerMonth <= 0

/** How many times a typical week you do this. A one-off counts once. */
export const usesPerWeek = (d: Decision): number => (isOneOff(d) ? 1 : (d.timesPerMonth * 12) / 52)

/**
 * What a choice is worth towards your goal, from the difference for a single use (£ or minutes):
 * a habit counts a week of it, a one-off counts the whole difference once.
 */
export const creditFor = (d: Decision, perUse: number): number => perUse * usesPerWeek(d)

/** "a month" for a habit, nothing for a one-off ("£450 once"). */
export const perMonth = (d: Decision): string => (isOneOff(d) ? '' : ' a month')

/** How a credit is counted, for the sentence that explains it. */
export const creditBasis = (d: Decision, name: string): string => (isOneOff(d) ? 'once' : `over a week of ${name}`)
