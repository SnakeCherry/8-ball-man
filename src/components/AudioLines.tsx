import { useEffect, useRef } from 'react'
import { getLevel } from '../lib/level'
import type { BallMood } from './EightBall'

type Rgb = [number, number, number]
// cyan, blue, violet, pink, red, orange, yellow: the colours run along the bar like a spectrum
const SPECTRUM: Rgb[] = [
  [34, 211, 238],
  [37, 99, 235],
  [124, 58, 237],
  [236, 40, 190],
  [239, 43, 43],
  [255, 138, 31],
  [246, 232, 59],
]
const CELL = 5 // canvas pixels per cell: 4 of colour and a 1 pixel gap
const reduced = (): boolean => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const colourAt = (t: number): Rgb => {
  const p = Math.min(0.9999, Math.max(0, t)) * (SPECTRUM.length - 1)
  const i = Math.floor(p)
  const f = p - i
  const a = SPECTRUM[i]
  const b = SPECTRUM[i + 1]
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
}

/**
 * The sound as a grid of little squares, like a pixel spectrum analyser: columns run from cyan through violet and red
 * to yellow and rise with how loud it is (your voice, or the ball's). While the ball thinks they ripple on their
 * own; at rest only the dim bottom row of cells is lit.
 */
export function AudioLines({ mood, compact = false }: { mood: BallMood; compact?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const moodRef = useRef(mood)
  moodRef.current = mood
  const rows = compact ? 5 : 9

  useEffect(() => {
    const canvas = ref.current
    const g = canvas?.getContext('2d')
    if (!canvas || !g) return
    const still = reduced()
    let cols = 0
    let heights: number[] = []
    let raf = 0
    let last = -1000
    const t0 = performance.now()

    const layout = () => {
      cols = (canvas.parentElement?.clientWidth ?? 560) < 420 ? 28 : 48
      canvas.width = cols * CELL
      canvas.height = rows * CELL
      heights = Array.from({ length: cols }, () => 0)
    }

    const draw = (now: number) => {
      const t = still ? 0 : (now - t0) / 1000
      const m = moodRef.current
      const level = m === 'idle' ? 0 : m === 'thinking' ? 0.45 + 0.25 * Math.sin(t * 4.5) : getLevel()
      g.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < cols; i++) {
        const shape = 0.5 + 0.5 * Math.sin(t * 3.1 + i * 0.55) * Math.cos(t * 1.7 + i * 0.23)
        const target = level <= 0.02 ? 0 : Math.min(rows, Math.round(rows * level * (0.3 + 0.95 * shape * shape)))
        // rise quickly, fall back gently
        heights[i] += (target - heights[i]) * (target > heights[i] ? 0.7 : 0.35)
        const h = Math.round(heights[i])
        const [r, gr, b] = colourAt(i / (cols - 1))
        for (let row = 0; row < rows; row++) {
          const y = (rows - 1 - row) * CELL
          const lit = row < h || row === 0 // the bottom row always glows a little so the bar never vanishes
          if (row < h) {
            // a few cells a shade lighter, so it twinkles like the reference
            const spark = (i * 7 + row * 13) % 11 === 0
            g.fillStyle = spark ? `rgb(${Math.min(255, r + 60)},${Math.min(255, gr + 60)},${Math.min(255, b + 60)})` : `rgb(${r | 0},${gr | 0},${b | 0})`
          } else {
            if (!lit && level <= 0.02) continue // at rest only the bottom row of cells shows
            g.fillStyle = lit ? `rgba(${r | 0},${gr | 0},${b | 0},0.4)` : 'rgba(255,255,255,0.05)'
          }
          g.fillRect(i * CELL, y, CELL - 1, CELL - 1)
        }
      }
    }

    const loop = (n: number) => {
      raf = requestAnimationFrame(loop)
      if (n - last > 55) {
        last = n
        draw(n)
      }
    }
    layout()
    draw(performance.now())
    raf = requestAnimationFrame(loop)
    const ro = new ResizeObserver(() => {
      layout()
      draw(performance.now())
    })
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [rows])

  return <canvas ref={ref} className="block w-full" style={{ imageRendering: 'pixelated', aspectRatio: compact ? '48 / 5' : '48 / 9' }} aria-hidden="true" />
}
