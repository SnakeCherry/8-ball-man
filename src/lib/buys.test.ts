import { describe, expect, it } from 'vitest'
import { buysLine } from './buys'

describe('buysLine', () => {
  it('turns a monthly saving into something you can picture', () => {
    expect(buysLine(240, false)).toBe("That's £2,880 a year: about 3 holidays abroad.")
    expect(buysLine(12, false)).toContain('a year')
  })
  it('takes a one-off as it is', () => {
    expect(buysLine(200, true)).toBe("That's about 5 weekly food shops.")
  })
  it('says nothing for tiny amounts', () => {
    expect(buysLine(0.2, false)).toBeNull()
  })
})
