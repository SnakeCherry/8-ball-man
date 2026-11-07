/**
 * "Would you rather" duels are a bisection search for how a student trades
 * money against time and against carbon. Each answer halves the range.
 */
export interface Bounds {
  lo: number
  hi: number
}

/** £ per hour of time */
export const TIME_START: Bounds = { lo: 2, hi: 24 }
/** £ per kg of CO₂ */
export const CARBON_START: Bounds = { lo: 0.05, hi: 2 }

export const TIME_DUEL_MINUTES = 30
export const CARBON_DUEL_KG = 2

export const midpoint = (b: Bounds): number => (b.lo + b.hi) / 2

/** yes = "I'd pay that", so the true rate is at least the midpoint. */
export function refine(b: Bounds, mid: number, yes: boolean): Bounds {
  return yes ? { lo: mid, hi: b.hi } : { lo: b.lo, hi: mid }
}

/** Price to put in the question: what the midpoint rate implies. */
export function timeDuelPrice(b: Bounds): number {
  return midpoint(b) * (TIME_DUEL_MINUTES / 60)
}

export function carbonDuelPrice(b: Bounds): number {
  return midpoint(b) * CARBON_DUEL_KG
}

export const DEFAULT_TIME_RATE = midpoint(TIME_START)
export const DEFAULT_CARBON_RATE = midpoint(CARBON_START)
