import type { ReactNode } from 'react'
import { Orb } from './Orb'

export type BallMood = 'idle' | 'listening' | 'thinking' | 'text'

const CX = 32
const CY = 28
// the picture is 64 wide and 72 tall: 8 extra rows on top for the wizard hat
const TOP = -8
const H = 72

/** A filled circle on the pixel grid, one rectangle per row. */
function disc(cx: number, cy: number, r: number): { x: number; y: number; w: number }[] {
  const rows: { x: number; y: number; w: number }[] = []
  for (let y = Math.floor(cy - r); y < Math.ceil(cy + r); y++) {
    const dy = y + 0.5 - cy
    const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)))
    if (half > 0) rows.push({ x: cx - half, y, w: half * 2 })
  }
  return rows
}

const BALL = disc(CX, CY, 26)
const WINDOW_R: Record<BallMood, number> = { idle: 11, listening: 15, thinking: 15, text: 21 }
const WINDOWS = { idle: disc(CX, CY, 11), listening: disc(CX, CY, 15), thinking: disc(CX, CY, 15), text: disc(CX, CY, 21) }
const SPARKS = [
  [4, 10],
  [58, 8],
  [60, 34],
  [2, 36],
  [12, -4],
  [50, -3],
]

/** Where the window sits, as percentages of the whole picture. */
const pctX = (x: number): number => (x / 64) * 100
const pctY = (y: number): number => ((y - TOP) / H) * 100

/**
 * The magic 8-ball in a wizard hat. Its "8" window becomes a glowing voice orb when it listens, thinks or
 * answers. `children` is the text shown in the window.
 */
export function EightBall({ mood, children }: { mood: BallMood; children?: ReactNode }) {
  const win = WINDOWS[mood]
  const r = WINDOW_R[mood]
  const box = { left: `${pctX(CX - r)}%`, top: `${pctY(CY - r)}%`, width: `${pctX(r * 2)}%`, height: `${(r * 2 * 100) / H}%` }
  const words = { left: `${pctX(CX - r * 0.72)}%`, top: `${pctY(CY - r * 0.72)}%`, width: `${pctX(r * 1.44)}%`, height: `${(r * 1.44 * 100) / H}%` }
  return (
    <div className={`ball ball-${mood} relative mx-auto aspect-[64/72] w-full max-w-[340px]`}>
      <svg viewBox={`0 ${TOP} 64 ${H}`} shapeRendering="crispEdges" className="ball-body absolute inset-0 h-full w-full" aria-hidden="true">
        {/* stand */}
        <rect x="20" y="53" width="24" height="3" fill="#2b2b38" />
        <rect x="16" y="56" width="32" height="4" fill="#1a1a24" />
        <rect x="22" y="57" width="3" height="1" fill="#55556e" />
        <rect x="30" y="57" width="4" height="1" fill="#55556e" />
        <rect x="39" y="57" width="3" height="1" fill="#55556e" />
        {/* the ball */}
        <g className="ball-sphere">
          {BALL.map((b) => (
            <rect key={b.y} x={b.x} y={b.y} width={b.w} height={1} fill="#0e0e14" />
          ))}
          <rect x="46" y="40" width="3" height="2" fill="#2a2a44" />
          <rect x="43" y="46" width="4" height="2" fill="#2a2a44" />
          <rect x="14" y="14" width="6" height="2" fill="#fff" />
          <rect x="12" y="16" width="2" height="4" fill="#fff" />
          <rect x="20" y="16" width="2" height="1" fill="#cfd2ff" />
          {/* the window: cream "8" when asleep, a dark well for the orb otherwise */}
          {win.map((b) => (
            <rect key={`${mood}${b.y}`} className="ball-win" x={b.x} y={b.y} width={b.w} height={1} />
          ))}
        </g>
        {/* wizard hat */}
        <g className="ball-hat">
          <rect x="16" y="0" width="32" height="2" fill="var(--color-orb)" />
          <rect x="22" y="-1" width="20" height="1" fill="var(--color-orb)" />
          <rect x="23" y="-2" width="18" height="1" fill="#ffd54a" />
          <rect x="24" y="-3" width="16" height="1" fill="var(--color-orb)" />
          <rect x="25" y="-4" width="13" height="1" fill="var(--color-orb)" />
          <rect x="27" y="-5" width="10" height="1" fill="var(--color-orb)" />
          <rect x="28" y="-6" width="7" height="1" fill="var(--color-orb)" />
          <rect x="30" y="-7" width="5" height="1" fill="var(--color-orb)" />
          <rect x="33" y="-8" width="3" height="1" fill="var(--color-orb)" />
          <rect x="29" y="-5" width="2" height="1" fill="var(--color-spark)" />
          <rect x="34" y="-3" width="1" height="1" fill="var(--color-spark)" />
        </g>
        {mood !== 'idle' &&
          SPARKS.map(([x, y], i) => (
            <g key={i} className="ball-spark" style={{ animationDelay: `${i * 0.3}s` }} fill="var(--color-spark)">
              <rect x={x} y={y + 1} width={3} height={1} />
              <rect x={x + 1} y={y} width={1} height={3} />
            </g>
          ))}
      </svg>
      {mood !== 'idle' && (
        <div className="pointer-events-none absolute overflow-hidden" style={{ ...box, opacity: mood === 'text' ? 0.6 : 1 }}>
          <Orb mood={mood} />
        </div>
      )}
      {/* words live in the page, not the picture, so they scale and read aloud properly */}
      <div className="pointer-events-none absolute grid place-items-center text-center" style={words}>
        {mood === 'idle' ? <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[56%] text-[clamp(44px,13vw,96px)] font-bold leading-none text-ink">8</span> : children}
      </div>
    </div>
  )
}
