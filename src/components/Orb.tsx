import { useEffect, useRef } from 'react'
import { getLevel } from '../lib/level'
import type { BallMood } from './EightBall'

const COLOURS = [
  [140, 80, 255],
  [60, 140, 255],
  [255, 90, 200],
  [40, 210, 190],
]
// how lively each mood is when nothing is making a sound
const BASE: Record<BallMood, number> = { idle: 0.1, listening: 0.18, thinking: 0.55, text: 0.2 }

const reduced = (): boolean => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A glowing voice orb: soft coloured blobs drift and swell with the live loudness (your voice while you talk, the
 * ball's while it answers), a bit like a voice-assistant orb. Draws into a canvas, one frame at a time, reading the
 * level straight from the store so React never re-renders for it.
 */
export function Orb({ mood }: { mood: BallMood }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const moodRef = useRef(mood)
  moodRef.current = mood

  useEffect(() => {
    const canvas = ref.current
    const g = canvas?.getContext('2d')
    if (!canvas || !g) return
    let raf = 0
    let smooth = 0.1
    const still = reduced()

    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      if (canvas.width !== w) canvas.width = canvas.height = w
    }

    const draw = (ms: number) => {
      fit()
      const S = canvas.width
      const c = S / 2
      const t = still ? 0 : ms / 1000
      const target = Math.max(getLevel(), BASE[moodRef.current])
      smooth += (target - smooth) * 0.18
      const s = smooth
      const fast = 1 + (moodRef.current === 'thinking' ? 2.2 : 0) + s * 2

      g.globalCompositeOperation = 'source-over'
      g.clearRect(0, 0, S, S)
      const bg = g.createRadialGradient(c, c, 0, c, c, c)
      bg.addColorStop(0, '#2a1470')
      bg.addColorStop(1, '#0d0626')
      g.fillStyle = bg
      g.fillRect(0, 0, S, S)

      g.globalCompositeOperation = 'lighter'
      COLOURS.forEach(([r, gr, b], i) => {
        const a = t * 0.5 * fast + i * 1.57
        const dist = c * (0.18 + 0.28 * s)
        const x = c + Math.cos(a) * dist
        const y = c + Math.sin(a * 1.3 + i) * dist
        const rad = c * (0.55 + 0.4 * s)
        const grad = g.createRadialGradient(x, y, 0, x, y, rad)
        grad.addColorStop(0, `rgba(${r},${gr},${b},${0.55 + 0.35 * s})`)
        grad.addColorStop(1, `rgba(${r},${gr},${b},0)`)
        g.fillStyle = grad
        g.fillRect(0, 0, S, S)
      })
      // a bright core that swells with the voice, and a ring that ripples out from it
      const core = g.createRadialGradient(c, c, 0, c, c, c * (0.2 + 0.45 * s))
      core.addColorStop(0, `rgba(255,255,255,${0.25 + 0.6 * s})`)
      core.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = core
      g.fillRect(0, 0, S, S)
      g.strokeStyle = `rgba(255,255,255,${0.15 + 0.35 * s})`
      g.lineWidth = Math.max(1, S / 60)
      g.beginPath()
      g.arc(c, c, c * (0.45 + 0.4 * s + 0.04 * Math.sin(t * 5)), 0, Math.PI * 2)
      g.stroke()

      if (!still) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    // when motion is reduced there is no loop, so repaint when the size or mood changes
    const ro = still ? new ResizeObserver(() => draw(0)) : null
    ro?.observe(canvas)
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [])

  return <canvas ref={ref} className="block h-full w-full" aria-hidden="true" />
}
