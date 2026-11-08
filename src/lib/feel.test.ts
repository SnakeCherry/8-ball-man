import { describe, expect, it } from 'vitest'
import { DECISIONS, getDecision, registerDecision } from '../data/decisions'
import { matchPreset, parseEstimate, sanitiseDecision } from './estimate'
import { bestSwitch } from './hook'
import { forSpeech } from './speech'
import { ICON_NAMES, PALETTE, frameCount, framesOf, iconForText } from './pixelart'
import { parseSpokenAmount } from './speech'
import { suggestFor } from './suggest'
import { VERTS, nearestPriority, pointToWeights, weightsToPoint } from './triangle'
import { TRIP_SECONDS, TRIP_TICK_MS, maxMinutes, medals, minutesPerTick, heartChance, tripProgress } from './trip'

describe('trade-off triangle', () => {
  it('maps each corner to mostly that axis', () => {
    expect(pointToWeights(VERTS.cost).cost).toBeGreaterThan(0.85)
    expect(pointToWeights(VERTS.time).time).toBeGreaterThan(0.85)
    expect(pointToWeights(VERTS.health).health).toBeGreaterThan(0.85)
  })
  it('weights always sum to 1 and never fall below the floor, even outside the triangle', () => {
    for (const p of [{ x: -50, y: -50 }, { x: 400, y: 400 }, { x: 150, y: 150 }, { x: 0, y: 260 }]) {
      const w = pointToWeights(p)
      expect(w.cost + w.time + w.health).toBeCloseTo(1, 6)
      expect(Math.min(w.cost, w.time, w.health)).toBeGreaterThanOrEqual(0.04)
    }
  })
  it('round-trips a point inside the triangle exactly', () => {
    const p = { x: 140, y: 150 }
    const back = weightsToPoint(pointToWeights(p))
    expect(back.x).toBeCloseTo(p.x, 6)
    expect(back.y).toBeCloseTo(p.y, 6)
  })
  it('names the nearest priority, balanced in the middle', () => {
    expect(nearestPriority({ cost: 1 / 3, time: 1 / 3, health: 1 / 3 })).toBe('balanced')
    expect(nearestPriority({ cost: 0.7, time: 0.15, health: 0.15 })).toBe('money')
    expect(nearestPriority({ cost: 0.15, time: 0.7, health: 0.15 })).toBe('time')
    expect(nearestPriority({ cost: 0.15, time: 0.15, health: 0.7 })).toBe('health')
  })
  it('suggestFor uses dragged weights over the blend', () => {
    const d = DECISIONS.find((x) => x.id === 'commute')!
    const money = suggestFor(d, 'time', [], 1, { cost: 0.9, time: 0.05, health: 0.05 }).suggested.id
    const time = suggestFor(d, 'money', [], 1, { cost: 0.05, time: 0.9, health: 0.05 }).suggested.id
    expect(money).toBe('walk')
    expect(time).toBe('uber')
  })
})

describe('spoken amounts', () => {
  const cases: [string, number | null][] = [
    ['52', 52], ['£40', 40], ['40 pounds', 40], ['about 60 quid', 60], ['1,200', 1200],
    ['forty quid', 40], ['about sixty', 60], ['fifty-two', 52], ['fifty two pounds', 52],
    ['a hundred and twenty', 120], ['one hundred', 100], ['two fifty', 250], ['nineteen', 19],
    ['three hundred and five', 305], ['zero', 0], ['hello there', null], ['', null],
  ]
  it.each(cases)('%s -> %s', (text, want) => expect(parseSpokenAmount(text)).toBe(want))
})

describe('trip race', () => {
  const commute = DECISIONS.find((x) => x.id === 'commute')!.options
  it('the slowest option takes the whole race and the quickest arrives first', () => {
    expect(maxMinutes(commute)).toBe(40)
    const half = 14 // minutes in
    const [bus, uber, walk] = commute
    expect(tripProgress(uber, half)).toBe(1)
    expect(tripProgress(bus, half)).toBeCloseTo(0.5, 5)
    expect(tripProgress(walk, half)).toBeCloseTo(0.35, 5)
  })
  it('clamps progress to 0..1', () => {
    expect(tripProgress(commute[0], -5)).toBe(0)
    expect(tripProgress(commute[0], 999)).toBe(1)
  })
  it('steps so the whole race lasts about TRIP_SECONDS', () => {
    const ticks = maxMinutes(commute) / minutesPerTick(commute)
    expect(ticks * TRIP_TICK_MS).toBeCloseTo(TRIP_SECONDS * 1000, 0)
  })
  it('hands out the three medals', () => {
    expect(medals(commute)).toEqual({ fastest: 'uber', cheapest: 'walk', healthiest: 'walk' })
  })
  it('healthy ways give off more hearts than unhealthy ones', () => {
    expect(heartChance(commute[2])).toBeGreaterThan(heartChance(commute[0]))
    expect(heartChance(commute[0])).toBeGreaterThan(heartChance(commute[1]))
  })
})

const goodRaw = {
  activity: 'Commute to Uni',
  icon: 'car',
  timesPerMonth: 20,
  usualIndex: 0,
  options: [
    { name: 'Uber to Uni', icon: 'car', costGBP: 12.5, timeMin: 25, health: 2 },
    { name: 'Lothian Bus', icon: 'bus', costGBP: 2, timeMin: 40, health: 5 },
    { name: 'Walk to Uni', icon: 'walk', costGBP: 0, timeMin: 50, health: 9 },
  ],
}

describe('estimate from speech', () => {
  it('builds a decision from a good reply', () => {
    const d = sanitiseDecision(goodRaw, 'Uber to uni every morning')!
    expect(d.options).toHaveLength(3)
    expect(d.usualId).toBe('o1')
    expect(d.timesPerMonth).toBe(20)
    expect(d.blurb).toContain('Uber to uni')
    expect(d.id.startsWith('custom-commute-to-uni')).toBe(true)
  })
  it('clamps silly numbers instead of trusting them', () => {
    const d = sanitiseDecision({ ...goodRaw, timesPerMonth: 9999, options: goodRaw.options.map((o) => ({ ...o, costGBP: 1e9, timeMin: -5, health: 99 })) })!
    expect(d.timesPerMonth).toBe(60)
    expect(d.options[0].costGBP).toBe(1000)
    expect(d.options[0].timeMin).toBe(0)
    expect(d.options[0].health).toBe(10)
  })
  it('rejects shapes it cannot use', () => {
    expect(sanitiseDecision(null)).toBeNull()
    expect(sanitiseDecision({ ...goodRaw, options: goodRaw.options.slice(0, 2) })).toBeNull()
    expect(sanitiseDecision({ ...goodRaw, activity: '' })).toBeNull()
    expect(sanitiseDecision({ ...goodRaw, options: [{ name: 'x', icon: 'bus', costGBP: 'free', timeMin: 1, health: 5 }, ...goodRaw.options.slice(1)] })).toBeNull()
  })
  it('falls back to a sensible usual index and an icon from the name', () => {
    const d = sanitiseDecision({ ...goodRaw, usualIndex: 7, icon: 'nonsense', options: goodRaw.options.map((o) => ({ ...o, icon: 'nonsense' })) })!
    expect(d.usualId).toBe('o1')
    expect(d.options.map((o) => o.icon)).toEqual(['car', 'bus', 'walk'])
    expect(d.icon).toBe('car')
  })
  it('a registered custom decision can be found by id', () => {
    const d = sanitiseDecision(goodRaw)!
    registerDecision(d)
    expect(getDecision(d.id)).toBe(d)
    expect(() => getDecision('nope')).toThrow()
  })
  it('matches words to a preset, or to nothing', () => {
    expect(matchPreset('I get an Uber to uni every morning')?.id).toBe('commute')
    expect(matchPreset('Greggs for lunch most days')?.id).toBe('lunch')
    expect(matchPreset('my latte habit')?.id).toBe('coffee')
    expect(matchPreset('quantum chromodynamics')).toBeNull()
  })
  it('finds the biggest monthly saving against the usual', () => {
    const d = sanitiseDecision(goodRaw)!
    const s = bestSwitch(d)!
    expect(s.option.name).toBe('Walk to Uni')
    expect(s.monthlyGBP).toBe(250)
    expect(bestSwitch({ ...d, options: [d.options[2], d.options[1], d.options[0]] as typeof d.options, usualId: 'o3' })).toBeNull()
  })
})

describe('parsing the streamed reply', () => {
  const reply = '20|Uber to Uni\nUber|car|12.00|25|2\nBus|bus|1.70|45|5\nWalk|walk|0.00|35|9'
  it('reads a full reply', () => {
    const p = parseEstimate(reply)
    expect(p.timesPerMonth).toBe(20)
    expect(p.activity).toBe('Uber to Uni')
    expect(p.options).toHaveLength(3)
    expect(p.options[1]).toEqual({ name: 'Bus', icon: 'bus', costGBP: 1.7, timeMin: 45, health: 5 })
  })
  it('while streaming only finished lines count', () => {
    const p = parseEstimate('20|Uber to Uni\nUber|car|12.00|25|2\nBus|bus|1.70|4', false)
    expect(p.activity).toBe('Uber to Uni')
    expect(p.options).toHaveLength(1)
    // even at the end, a cut-off line without all three numbers is dropped
    expect(parseEstimate('20|Uber to Uni\nUber|car|12.00|25|2\nBus|bus|1.70|4', true).options).toHaveLength(1)
    expect(parseEstimate('20|Uber to Uni\nUber|car|12.00|25|2\nBus|bus|1.70|45|5', true).options).toHaveLength(2)
  })
  it('copes with bullets, units, a missing icon and a stray header line', () => {
    const p = parseEstimate('```\n1. 4|Dinner out\n- Pub meal | £16.50 | 60 min | 1.5 kg\n* Cook|cook|£3|40|0.7\nTakeaway|bag|11|30|2.6\n```')
    expect(p.timesPerMonth).toBe(4)
    expect(p.options.map((o) => [o.name, o.icon, o.costGBP])).toEqual([['Pub meal', 'plate', 16.5], ['Cook', 'cook', 3], ['Takeaway', 'bag', 11]])
  })
  it('turns a full reply into a usable decision', () => {
    const p = parseEstimate(reply)
    const d = sanitiseDecision({ activity: p.activity, icon: p.options[0].icon, timesPerMonth: p.timesPerMonth, usualIndex: 0, options: p.options })!
    expect(d.options[0].costGBP).toBe(12)
    expect(d.usualId).toBe('o1')
  })
  it('gives nothing for chatter', () => {
    expect(parseEstimate('Sure! Here are some options.').options).toHaveLength(0)
  })
})

describe('pixel art', () => {
  it('every sprite is 12 x 12 and only uses palette colours', () => {
    for (const name of ICON_NAMES) {
      framesOf(name).forEach((rows, f) => {
        expect(rows, `${name} frame ${f} rows`).toHaveLength(12)
        rows.forEach((row, y) => {
          expect(row.length, `${name} frame ${f} row ${y}: "${row}"`).toBe(12)
          for (const ch of row) expect(ch === '.' || ch in PALETTE, `${name} uses unknown colour "${ch}"`).toBe(true)
        })
      })
    }
  })
  it('the walker has two frames', () => {
    expect(frameCount('walk')).toBe(2)
  })
  it('picks icons from words', () => {
    expect(iconForText('Walk to Uni')).toBe('walk')
    expect(iconForText('Lothian Bus')).toBe('bus')
    expect(iconForText('Uber')).toBe('car')
    expect(iconForText('Deliveroo')).toBe('bag')
    expect(iconForText('Greggs sausage roll')).toBe('sandwich')
    expect(iconForText('Home brew')).toBe('mug')
    expect(iconForText('quantum chromodynamics')).toBe('coin')
  })
})

describe('reading amounts aloud', () => {
  it('says pounds, pence, minutes and scores the way a person would', () => {
    expect(forSpeech('£7.50')).toBe('7 pounds 50')
    expect(forSpeech('£12')).toBe('12 pounds')
    expect(forSpeech('£1')).toBe('1 pound')
    expect(forSpeech('£0.40')).toBe('40 pence')
    expect(forSpeech('14 min faster')).toBe('14 minutes faster')
    expect(forSpeech('1 min')).toBe('1 minute')
    expect(forSpeech('1 h 20 min')).toBe('1 hour 20 minutes')
    expect(forSpeech('2 h')).toBe('2 hours')
    expect(forSpeech('8/10')).toBe('8 out of 10')
  })
  it('reads a whole suggestion sentence', () => {
    expect(forSpeech('Walk is £1.85 less, 10 min faster and 5 points healthier than Bus.')).toBe(
      'Walk is 1 pound 85 less, 10 minutes faster and 5 points healthier than Bus.',
    )
  })
})
