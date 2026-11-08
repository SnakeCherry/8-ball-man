/** Things a student can picture, biggest first. Rough UK prices. */
const THINGS: { price: number; one: string; many: string }[] = [
  { price: 1000, one: 'holiday abroad', many: 'holidays abroad' },
  { price: 250, one: 'weekend away', many: 'weekends away' },
  { price: 120, one: 'return flight home', many: 'return flights home' },
  { price: 40, one: 'weekly food shop', many: 'weekly food shops' },
  { price: 15, one: 'takeaway', many: 'takeaways' },
  { price: 10, one: 'cinema trip', many: 'cinema trips' },
  { price: 3, one: 'coffee', many: 'coffees' },
]

/**
 * Turn a saving into something you can picture: the biggest thing you could afford at least twice. A monthly saving
 * is looked at over a year; a one-off is taken as it is. Null when the amount is too small or silly to bother with.
 */
export function buysLine(amount: number, once: boolean): string | null {
  const total = once ? amount : amount * 12
  if (total < 6) return null
  const thing = THINGS.find((t) => total / t.price >= 2)
  if (!thing) return null
  const n = Math.round(total / thing.price)
  if (n > 99) return null
  const what = `about ${n} ${n === 1 ? thing.one : thing.many}`
  return once ? `That's ${what}.` : `That's £${Math.round(total).toLocaleString('en-GB')} a year: ${what}.`
}
