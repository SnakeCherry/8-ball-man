import { describe, expect, it } from 'vitest'
import { createSilenceTracker } from './vad'

describe('silence tracker', () => {
  it('keeps listening while someone talks', () => {
    const t = createSilenceTracker()
    for (let ms = 0; ms < 5000; ms += 50) expect(t.push(0.5, ms)).toBe(false)
  })
  it('stops after speech then a pause, not before', () => {
    const t = createSilenceTracker()
    expect(t.push(0.5, 0)).toBe(false)
    expect(t.push(0.01, 600)).toBe(false)
    expect(t.push(0.01, 1100)).toBe(false)
    expect(t.push(0.01, 1300)).toBe(true)
  })
  it('a quiet room waits for the no-speech limit', () => {
    const t = createSilenceTracker()
    expect(t.push(0, 0)).toBe(false)
    expect(t.push(0.02, 5900)).toBe(false)
    expect(t.push(0.02, 6000)).toBe(true)
  })
  it('never runs past the maximum', () => {
    const t = createSilenceTracker()
    expect(t.push(0.9, 0)).toBe(false)
    expect(t.push(0.9, 15000)).toBe(true)
  })
})
