/** £ formatting: pennies for small amounts, whole pounds for big ones. */
export function gbp(n: number): string {
  const abs = Math.abs(n)
  const body = abs >= 20 ? Math.round(abs).toString() : abs.toFixed(2)
  return `£${body.replace(/\.00$/, '')}`
}

export function mins(n: number): string {
  const m = Math.round(Math.abs(n))
  if (m >= 90) {
    const h = Math.floor(m / 60)
    const r = m % 60
    return r === 0 ? `${h} h` : `${h} h ${r} min`
  }
  return `${m} min`
}

export function kg(n: number): string {
  return `${Math.abs(n).toFixed(1)} kg`
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}
