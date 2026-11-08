import type { Decision, Option } from './types'

/** Within this fraction of the truth counts as a close call. */
export const CLOSE = 0.25
export const BULLSEYE = 0.1

/** What the habit costs a month; for a one-off purchase (0 uses a month) that is simply the price, once. */
export const monthlyCost = (o: Option, d: Decision): number => o.costGBP * (d.timesPerMonth > 0 ? d.timesPerMonth : 1)

/** How far off a guess is, as a fraction. A free habit is judged against £5 so the maths stays sane. */
export function guessError(guess: number, truth: number): number {
  return Math.abs(guess - truth) / Math.max(truth, 5)
}

/** 1 is spot on, 0 is off by 100% or more. */
export const closeness = (err: number): number => Math.max(0, 1 - err)

export type Band = 'bullseye' | 'close' | 'near' | 'off'
export function band(err: number): Band {
  return err <= BULLSEYE ? 'bullseye' : err <= CLOSE ? 'close' : err <= 0.5 ? 'near' : 'off'
}
export const BAND_LABEL: Record<Band, string> = {
  bullseye: 'Bullseye',
  close: 'Close',
  near: 'Not far',
  off: 'Way off',
}

const niceUp = (n: number): number => {
  const unit = n <= 100 ? 10 : n <= 500 ? 50 : 100
  return Math.max(unit, Math.ceil(n / unit) * unit)
}

/** Slider range: up to a bit over the dearest option's monthly cost, so it never gives the answer away. */
export const sliderMax = (d: Decision): number => niceUp(Math.max(...d.options.map((o) => monthlyCost(o, d))) * 1.4)
export const sliderStep = (max: number): number => (max <= 100 ? 1 : max <= 500 ? 5 : 10)
