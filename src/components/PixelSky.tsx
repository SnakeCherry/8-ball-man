import { useEffect, useRef } from 'react'

/**
 * A pixel-art night sky, drawn live on a tiny canvas and scaled up with hard edges: stepped colour bands, twinkling
 * stars (dots, plus and cross shapes), a glowing crescent moon, three-tone drifting clouds in violet and blue, two
 * layers of hills, and now and then a shooting star. Everything is generated from a fixed seed, so it looks the
 * same every time. With reduced motion it is one still picture.
 */

type Rgb = [number, number, number]
const hex = (s: string): Rgb => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]
const css = ([r, g, b]: Rgb, a = 1): string => `rgba(${r},${g},${b},${a})`
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

const TOP = hex('#070626')
const MID = hex('#15124d')
const HORIZON = hex('#33267a')
const BANDS = 14

const CLOUD = { light: '#9a8be0', mid: '#6f5fc0', dark: '#4b3f98' }
const STAR = ['#ffffff', '#cfd8ff', '#ffe9a8']

function rng(seed: number): () => number {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

interface Cloud {
  x: number
  y: number
  w: number
  speed: number
  alpha: number
  rows: { off: number; len: number }[]
}

interface Star {
  x: number
  y: number
  kind: number
  phase: number
  colour: string
}

function makeCloud(r: () => number, y: number, w: number, speed: number, alpha: number): Cloud {
  const h = Math.max(5, Math.round(w * 0.36))
  // wide at the bottom with a flat base, bumpy and narrow on top, like the clouds in the references
  const profile = Array.from({ length: h }, (_, i) => {
    const f = (i + 0.5) / h
    const bump = f < 0.7 ? 0.35 + f * 0.9 : 1 - (f - 0.7) * 0.25
    return Math.min(1, bump + (r() - 0.5) * 0.18)
  })
  const rows = profile.map((p) => {
    const len = Math.max(3, Math.round(w * p))
    return { off: Math.round((w - len) * (0.35 + r() * 0.3)), len }
  })
  return { x: r() * 200, y, w, speed, alpha, rows }
}

export function PixelSky() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const g = canvas?.getContext('2d')
    if (!canvas || !g) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0
    let H = 0
    let stars: Star[] = []
    let clouds: Cloud[] = []
    let raf = 0
    let last = -1000
    const t0 = performance.now()

    const layout = () => {
      const cw = canvas.clientWidth || window.innerWidth
      const ch = canvas.clientHeight || window.innerHeight
      const px = cw < 700 ? 4 : 6 // css pixels per art pixel
      W = Math.ceil(cw / px)
      H = Math.ceil(ch / px)
      canvas.width = W
      canvas.height = H
      const r = rng(11)
      stars = Array.from({ length: Math.round((W * H) / 140) }, () => {
        const k = r()
        return { x: Math.floor(r() * W), y: Math.floor(r() * H * 0.7), kind: k < 0.06 ? 2 : k < 0.18 ? 1 : 0, phase: r() * 6.28, colour: STAR[Math.floor(r() * (r() < 0.8 ? 2 : 3))] }
      })
      const count = Math.max(5, Math.round(W / 22))
      clouds = Array.from({ length: count }, (_, i) => {
        const far = i % 2 === 0
        const w = far ? 16 + Math.floor(r() * 12) : 28 + Math.floor(r() * 22)
        return makeCloud(r, Math.floor(H * (0.1 + r() * 0.55)), w, far ? 0.8 + r() * 0.8 : 1.6 + r() * 1.6, far ? 0.55 : 0.85)
      })
    }

    const skyAt = (y: number): Rgb => {
      const band = Math.floor((y / H) * BANDS) / BANDS // stepped, never a smooth fade
      return band < 0.6 ? mix(TOP, MID, band / 0.6) : mix(MID, HORIZON, (band - 0.6) / 0.4)
    }

    const disc = (cx: number, cy: number, rad: number, fill: string) => {
      g.fillStyle = fill
      for (let y = -rad; y <= rad; y++) {
        const half = Math.round(Math.sqrt(rad * rad - y * y))
        g.fillRect(cx - half, cy + y, half * 2 + 1, 1)
      }
    }

    const draw = (now: number) => {
      const t = still ? 0 : (now - t0) / 1000

      for (let y = 0; y < H; y++) {
        g.fillStyle = css(skyAt(y))
        g.fillRect(0, y, W, 1)
      }

      // stars
      for (const s of stars) {
        const on = Math.sin(t * 1.4 + s.phase) > -0.55
        if (!on && !still) continue
        g.fillStyle = s.colour
        g.fillRect(s.x, s.y, 1, 1)
        if (s.kind === 1) {
          g.fillRect(s.x - 1, s.y, 1, 1)
          g.fillRect(s.x + 1, s.y, 1, 1)
          g.fillRect(s.x, s.y - 1, 1, 1)
          g.fillRect(s.x, s.y + 1, 1, 1)
        } else if (s.kind === 2) {
          g.fillRect(s.x - 1, s.y - 1, 1, 1)
          g.fillRect(s.x + 1, s.y - 1, 1, 1)
          g.fillRect(s.x - 1, s.y + 1, 1, 1)
          g.fillRect(s.x + 1, s.y + 1, 1, 1)
        }
      }

      // a shooting star every so often
      const k = (t % 13) / 0.9
      if (!still && k < 1) {
        const x = Math.floor(W * 0.15 + k * W * 0.3)
        const y = Math.floor(H * 0.08 + k * H * 0.18)
        for (let i = 0; i < 6; i++) {
          g.fillStyle = css([255, 255, 255], 1 - i / 6)
          g.fillRect(x - i, y - Math.floor(i / 2), 1, 1)
        }
      }

      // the moon: a glow in steps, then a crescent
      const R = Math.max(6, Math.min(14, Math.round(Math.min(W, H) * 0.075)))
      const mx = Math.round(W * 0.74)
      const my = Math.round(H * 0.2)
      disc(mx, my, R + 8, css([90, 110, 230], 0.07))
      disc(mx, my, R + 5, css([110, 130, 245], 0.1))
      disc(mx, my, R + 2, css([140, 160, 255], 0.16))
      disc(mx, my, R, '#e8efff')
      disc(mx + Math.round(R * 0.5), my - Math.round(R * 0.15), Math.round(R * 0.88), css(skyAt(my), 1))
      // stars the cut-out hid are not missed; a rim of light keeps the crescent crisp
      g.fillStyle = '#ffffff'
      g.fillRect(mx - R + 1, my - 1, 1, 2)

      // clouds, far ones first, drifting right and wrapping around
      const order = [...clouds].sort((a, b) => a.alpha - b.alpha)
      for (const c of order) {
        const span = W + c.w + 20
        const cx = Math.floor(((c.x + t * c.speed) % span) - c.w)
        for (let i = 0; i < c.rows.length; i++) {
          const f = i / c.rows.length
          const tone = f < 0.3 ? CLOUD.light : f < 0.68 ? CLOUD.mid : CLOUD.dark
          g.fillStyle = css(hex(tone), c.alpha)
          const row = c.rows[i]
          g.fillRect(cx + row.off, c.y + i, row.len, 1)
        }
      }

      // two layers of hills along the bottom
      const hill = (col: string, base: number, amp: number, seed: number) => {
        g.fillStyle = col
        for (let x = 0; x < W; x++) {
          const h = Math.round(base + Math.sin(x * 0.045 + seed) * amp + Math.sin(x * 0.11 + seed * 2) * (amp * 0.35))
          g.fillRect(x, H - h, 1, h)
        }
      }
      hill('#1a1458', H * 0.13, H * 0.045, 1.3)
      hill('#0d0a33', H * 0.07, H * 0.03, 4.1)

    }

    // redraw about ten times a second, which is plenty for a retro sky
    const loop = (n: number) => {
      raf = requestAnimationFrame(loop)
      if (n - last > 90) {
        last = n
        draw(n)
      }
    }

    layout()
    draw(performance.now())
    if (!still) raf = requestAnimationFrame(loop)
    const ro = new ResizeObserver(() => {
      layout()
      draw(performance.now())
    })
    ro.observe(canvas)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <canvas ref={ref} className="absolute inset-0 h-full w-full" style={{ imageRendering: 'pixelated' }} />
      {/* a light wash so white text on top of the clouds stays easy to read */}
      <div className="absolute inset-0" style={{ background: 'rgba(5, 4, 30, 0.22)' }} />
    </div>
  )
}
