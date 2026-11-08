import { describe, expect, it } from 'vitest'
import { moodFor, reactionLine } from './reaction'

describe('8-Ball Man reacts', () => {
  it('is happy about a saving, sad about spending more, calm when level', () => {
    expect(moodFor(12)).toBe('happy')
    expect(moodFor(-3)).toBe('sad')
    expect(moodFor(0.2)).toBe('calm')
    expect(moodFor(-0.2)).toBe('calm')
  })
  it('says something fitting and always the same thing for the same amount', () => {
    expect(reactionLine(240)).toBe(reactionLine(240))
    expect(reactionLine(240).length).toBeGreaterThan(10)
    expect(reactionLine(-30)).toMatch(/cost|pricier|expensive/i)
    expect(reactionLine(0)).toMatch(/same|even/i)
  })
})
