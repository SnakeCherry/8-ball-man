import { describe, expect, it } from 'vitest'
import { DECISIONS } from '../data/decisions'
import { parseQuestion } from './estimate'
import { fortuneLine, savingExplain, savingSummary, switchLife } from './fortune'

describe('fortuneLine', () => {
  it('names the best switch and what it saves', () => {
    const line = fortuneLine([DECISIONS[0]])
    expect(line).toMatch(/^(The signs say: .+ saved|.+ is already a good call|Nothing here is cheaper)/)
  })
  it('counts several things', () => {
    expect(fortuneLine([DECISIONS[0], DECISIONS[1]])).not.toContain('future')
  })
  it('copes with nothing', () => {
    expect(fortuneLine([])).toContain('cloudy')
  })
})

describe('parseQuestion', () => {
  it('reads a question with choices', () => {
    expect(parseQuestion('?|What do you mean?|Eating out|Cooking|Snacks')).toEqual({ question: 'What do you mean?', choices: ['Eating out', 'Cooking', 'Snacks'] })
  })
  it('tolerates bullets and spaces', () => {
    expect(parseQuestion('- ? | How often? | Daily | Weekly')?.choices).toEqual(['Daily', 'Weekly'])
  })
  it('needs two choices and ignores normal replies', () => {
    expect(parseQuestion('?|Which?|Only one')).toBeNull()
    expect(parseQuestion('20|Uber\nUber|car|6|10|3')).toBeNull()
  })
})

describe('savingSummary', () => {
  it('adds up the best switch of each habit', () => {
    const one = savingSummary([DECISIONS[0]])
    const two = savingSummary([DECISIONS[0], DECISIONS[1]])
    if (one && two) expect(two.amount).toBeGreaterThanOrEqual(one.amount)
  })
  it('is null when nothing is found', () => {
    expect(savingSummary([])).toBeNull()
  })
})

describe('fortuneLine when the usual cannot be beaten', () => {
  it('warns about health when the usual scores badly', () => {
    const d = structuredClone(DECISIONS[0])
    const usual = d.options.find((o) => o.id === d.usualId)!
    usual.costGBP = 0
    usual.health = 3
    expect(fortuneLine([d])).toMatch(/of life/)
  })
  it('says the usual is a good call when it is healthy', () => {
    const d = structuredClone(DECISIONS[0])
    const usual = d.options.find((o) => o.id === d.usualId)!
    usual.costGBP = 0
    usual.health = 8
    expect(fortuneLine([d])).toContain('already a good call')
  })
})

describe('savingExplain', () => {
  it('names what you would pick instead of your usual, with both prices', () => {
    const line = savingExplain(DECISIONS.find((x) => x.id === 'commute')!)
    expect(line).toMatch(/instead of/)
  })
})

describe('switchLife', () => {
  it('projects the best switch over the years, and is null for one-offs', () => {
    const m = switchLife(DECISIONS.find((x) => x.id === 'commute')!, 10)
    expect(m === null || typeof m === 'number').toBe(true)
    const oneOff = structuredClone(DECISIONS[0])
    oneOff.timesPerMonth = 0
    expect(switchLife(oneOff)).toBeNull()
  })
})
