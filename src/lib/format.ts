/** £ formatting: pennies for small amounts, whole pounds for big ones. */
export function gbp(n: number): string {
  const abs = Math.abs(n)
  const body = abs >= 20 ? Math.round(abs).toString() : abs.toFixed(2)
  return `£${body.replace(/\.00$/, '')}`
}

export function mins(n: number): string {
  const m = Math.round(Math.abs(n))
  if (m >= 1440) {
    // a delivery or a wait: say it in days
    const d = round1(m / 1440)
    return `${d} ${plural(d, 'day')}`
  }
  if (m >= 90) {
    const h = Math.floor(m / 60)
    const r = m % 60
    return r === 0 ? `${h} h` : `${h} h ${r} min`
  }
  return `${m} min`
}

/** "12 min saved" when it is faster than your usual, "12 min longer" when it is slower. Never a minus sign. */
export function timeSavedText(minutes: number): string {
  return `${mins(minutes)} ${minutes >= 0 ? 'saved' : 'longer'}`
}

/** A health score out of 10. */
export function score(n: number): string {
  return `${Math.round(n)}/10`
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}
