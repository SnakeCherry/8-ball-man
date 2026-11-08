import { useEffect, useRef } from 'react'
import { getLevel } from '../lib/level'
import type { BallMood } from './EightBall'

const BARS = 28 // each side of the middle
const reduced = (): boolean => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Lines that show the sound: thick pixel bars radiate out from the middle, the newest loudness in the centre and
 * older ones further out, purple through pink to teal. While the ball thinks they ripple on their own; when nothing
 * is happening they rest as dots.
 */
export function AudioLines({ mood, compact = false }: { mood: BallMood; compact?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const moodRef = useRef(mood)
  moodRef.current = mood

  useEffect(() => {
    const canvas = ref.current
    const g = canvas?.getContext('2d')
    if (!canvas || !g) return
    const hist: number[] = Array.from({ length: BARS }, () => 0)
    let last = 0
    let raf = 0
    const still = reduced()

    const draw = (ms: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      if (ms - last > 55) {
        last = ms
        const m = moodRef.current
        const level = m === 'idle' ? 0 : m === 'thinking' ? 0.3 + 0.25 * Math.sin(ms / 220) : getLevel()
        hist.unshift(level)
        hist.length = BARS
      }
      g.clearRect(0, 0, w, h)
      const slot = w / (BARS * 2)
      const bar = Math.max(2, Math.floor(slot * 0.62))
      const mid = h / 2
      for (let i = 0; i < BARS; i++) {
        const v = hist[i]
        const bh = Math.max(Math.round(dpr * 3), Math.round(v * h * 0.95 * (1 - i / (BARS * 1.5))))
        const t = i / (BARS - 1)
        // purple -> pink -> teal, going outwards
        const r = Math.round(150 + 105 * Math.sin(t * Math.PI * 0.5) - 120 * t * t)
        const gr = Math.round(90 + 130 * t)
        const b = Math.round(255 - 60 * t)
        g.fillStyle = `rgb(${Math.max(0, Math.min(255, r))},${gr},${b})`
        for (const side of [-1, 1]) {
          const x = Math.round(w / 2 + side * (i * slot + slot / 2) - bar / 2)
          g.fillRect(x, Math.round(mid - bh / 2), bar, bh)
        }
      }
      if (!still) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={ref} className={`block w-full ${compact ? 'h-8' : 'h-16'}`} aria-hidden="true" />
}
