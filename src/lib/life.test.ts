import { describe, expect, it } from 'vitest'
import { DECISIONS } from '../data/decisions'
import { sanitiseDecision } from './estimate'
import { LIFE_MIN_PER_POINT, MAX_YEARS, exchangeLine, formatSpan, lifeHeadline, projectLife, signedSpan, totalWeekly, weeklyEffect } from './life'
import type { LifeItem } from './life'

const commute = DECISIONS.find((d) => d.id === 'commute')! // 20 a month; bus £1.80 28 min health 5; walk £0 40 min health 9; uber 14 min health 2
const item = (chosenId: string, d = commute): LifeItem => ({ decision: d, usual: d.options.find((o) => o.id === d.usualId)!, chosen: d.options.find((o) => o.id === chosenId)! })
const perWeek = (20 * 12) / 52

describe('time vs life', () => {
  it('walking instead of the bus costs free time but could add life', () => {
    const w = weeklyEffect(item('walk'))
    expect(w.timeMin).toBeCloseTo(perWeek * (28 - 40), 6) // 12 minutes extra each time
    expect(w.lifeMin).toBeCloseTo(perWeek * 4 * LIFE_MIN_PER_POINT, 6) // +4 health points
    expect(w.timeMin).toBeLessThan(0)
    expect(w.lifeMin).toBeGreaterThan(0)
  })
  it('a quick taxi banks time but could cost life', () => {
    const w = weeklyEffect(item('uber'))
    expect(w.timeMin).toBeGreaterThan(0)
    expect(w.lifeMin).toBeCloseTo(perWeek * -3 * LIFE_MIN_PER_POINT, 6)
  })
  it('the usual itself changes nothing', () => {
    expect(weeklyEffect(item('bus'))).toEqual({ timeMin: 0, lifeMin: 0 })
  })
  it('the anchor: skipping a 20-minute walk is worth about an hour of life, so 4 points is about 2 hours', () => {
    expect(4 * LIFE_MIN_PER_POINT).toBe(120)
  })
  it('a one-off purchase is not an ongoing habit, so it has no weekly effect', () => {
    const console_ = sanitiseDecision({
      activity: 'Console', icon: 'plate', timesPerMonth: 0, usualIndex: 0,
      options: [
        { name: 'New', icon: 'parcel', costGBP: 450, timeMin: 1440, health: 4 },
        { name: 'Used', icon: 'store', costGBP: 200, timeMin: 4320, health: 6 },
        { name: 'Lite', icon: 'parcel', costGBP: 180, timeMin: 2880, health: 5 },
      ],
    })!
    expect(weeklyEffect(item('o2', console_))).toEqual({ timeMin: 0, lifeMin: 0 })
  })
  it('adds habits up and scales with the years', () => {
    const items = [item('walk'), item('uber')]
    const sum = totalWeekly(items)
    expect(sum.timeMin).toBeCloseTo(weeklyEffect(items[0]).timeMin + weeklyEffect(items[1]).timeMin, 6)
    const p = projectLife([item('walk')], 10)
    expect(p.years).toHaveLength(11)
    expect(p.years[0]).toBe(0)
    expect(p.time[0]).toBe(0)
    expect(p.life[10]).toBeCloseTo(weeklyEffect(item('walk')).lifeMin * 52 * 10, 4)
    expect(p.life[10]).toBeCloseTo(p.life[5] * 2, 4) // straight line over the years
  })
  it('keeps the years between 1 and 50', () => {
    expect(projectLife([item('walk')], 0).years).toHaveLength(2)
    expect(projectLife([item('walk')], 500).years).toHaveLength(MAX_YEARS + 1)
  })
  it('says spans the way a person would', () => {
    expect(formatSpan(40)).toBe('40 min')
    expect(formatSpan(60)).toBe('1 hour')
    expect(formatSpan(150)).toBe('2.5 hours')
    expect(formatSpan(1440)).toBe('1 day')
    expect(formatSpan(-3 * 1440)).toBe('3 days')
    expect(formatSpan(365 * 1440)).toBe('1 year')
    expect(formatSpan(365 * 1440 * 1.44)).toBe('1.4 years')
    expect(signedSpan(-120)).toBe('−2 hours')
    expect(signedSpan(120)).toBe('+2 hours')
  })
  it('puts the trade-off in a sentence', () => {
    expect(exchangeLine(weeklyEffect(item('walk')))).toMatch(/give up could buy about .* of life for every hour/)
    expect(exchangeLine(weeklyEffect(item('uber')))).toMatch(/save could cost/)
    expect(exchangeLine({ timeMin: 0, lifeMin: 0 })).toBeNull()
    expect(exchangeLine({ timeMin: 10, lifeMin: 10 })).toBeNull() // both good: no trade-off to talk about
  })
  it('writes a headline with hedged wording', () => {
    const w = weeklyEffect(item('walk'))
    const p = projectLife([item('walk')], 10)
    const text = lifeHeadline(p.time[10], p.life[10], 10)
    expect(text).toContain('Over 10 years')
    expect(text).toContain('give up')
    expect(text).toContain('could add about')
    expect(lifeHeadline(0, 0, 1)).toContain('same as your usual')
    expect(w.lifeMin).toBeGreaterThan(0)
  })
})
