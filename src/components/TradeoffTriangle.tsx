import { useEffect, useMemo, useRef } from 'react'
import { PixelArt } from './PixelArt'
import type { KeyboardEvent, PointerEvent } from 'react'
import { rects } from '../lib/pixelart'
import { play } from '../lib/sound'
import { AXES, normalise, rank } from '../lib/scoring'
import { SPRITES } from '../lib/sprites'
import type { SpriteName } from '../lib/sprites'
import { OPTION_COLORS, TRI_H, TRI_W, VERTS, insideTriangle, mixToPoint, pointToWeights, weightsText, weightsToPoint } from '../lib/triangle'
import type { Pt } from '../lib/triangle'
import type { Axis, Option, Weights } from '../lib/types'

/** Label rows sit outside the corners: icon, then text. */
const CORNER: Record<Axis, { label: string; icon: SpriteName; ix: number; iy: number; tx: number; ty: number; anchor: 'start' | 'end' }> = {
  cost: { label: 'MONEY', icon: 'pound', ix: 106, iy: 6, tx: 132, ty: 22, anchor: 'start' },
  time: { label: 'TIME', icon: 'clock', ix: 4, iy: 238, tx: 28, ty: 254, anchor: 'start' },
  health: { label: 'HEALTH', icon: 'heart', ix: 170, iy: 238, tx: 296, ty: 254, anchor: 'end' },
}

const snap = (n: number) => Math.round(n / 4) * 4
const POLY = AXES.map((a) => `${VERTS[a].x},${VERTS[a].y}`).join(' ')

/** Where an option sits: pulled towards the corners it is good at, so dragging towards it favours it. */
function optionPoints(options: Option[]): Pt[] {
  const norm = AXES.map((a) => normalise(options, a))
  return options.map((_, i) => {
    const g = AXES.map((_a, k) => 1 - norm[k][i] + 0.4)
    const sum = g[0] + g[1] + g[2]
    return mixToPoint({ cost: g[0] / sum, time: g[1] / sum, health: g[2] / sum })
  })
}

const CELL = 10

/** A mosaic of the triangle: each cell is coloured by the option that would win for that mix. */
function territory(options: Option[]): { x: number; y: number; c: string }[] {
  const cells: { x: number; y: number; c: string }[] = []
  for (let y = 0; y < TRI_H; y += CELL) {
    for (let x = 0; x < TRI_W; x += CELL) {
      const centre = { x: x + CELL / 2, y: y + CELL / 2 }
      if (!insideTriangle(centre)) continue
      const winner = rank(options, pointToWeights(centre)).ranked[0].option
      cells.push({ x, y, c: OPTION_COLORS[options.indexOf(winner)] })
    }
  }
  return cells
}

/**
 * Drag the handle to say how much money, time and health matter. The three options sit inside the
 * triangle near what they are best at, and the one that currently fits best lights up.
 */
export function TradeoffTriangle({
  weights,
  onChange,
  options,
  bestId,
}: {
  weights: Weights
  onChange: (w: Weights) => void
  options: Option[]
  bestId: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const lastBest = useRef(bestId)
  const pts = optionPoints(options)
  const cells = useMemo(() => territory(options), [options])
  const handle = weightsToPoint(weights)

  // a soft blip each time the front-runner changes while dragging
  useEffect(() => {
    if (lastBest.current !== bestId) {
      lastBest.current = bestId
      play('nudge')
    }
  }, [bestId])

  const move = (e: PointerEvent) => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r || r.width === 0) return
    const x = snap(((e.clientX - r.left) / r.width) * TRI_W)
    const y = snap(((e.clientY - r.top) / r.height) * TRI_H)
    onChange(pointToWeights({ x, y }))
  }

  const onKey = (e: KeyboardEvent) => {
    const step = 8
    const d: Record<string, Pt> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } }
    const v = d[e.key]
    if (!v) return
    e.preventDefault()
    onChange(pointToWeights({ x: handle.x + v.x, y: handle.y + v.y }))
  }

  return (
    <div>
    <svg
      ref={svgRef}
      viewBox={`0 0 ${TRI_W} ${TRI_H}`}
      className="mx-auto block w-full touch-none select-none"
      style={{ maxWidth: 'min(100%, max(430px, 50dvh))' }}
      role="group"
      aria-label="Trade-off triangle: drag the handle towards what matters most"
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        move(e)
      }}
      onPointerMove={(e) => dragging.current && move(e)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <defs>
        <clipPath id="tri-clip">
          <polygon points={POLY} />
        </clipPath>
      </defs>
      <polygon points={POLY} fill="#ffffff" />
      <g clipPath="url(#tri-clip)" aria-hidden="true">
        {cells.map((c) => (
          <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={CELL} height={CELL} fill={c.c} fillOpacity={0.55} />
        ))}
      </g>
      <polygon points={POLY} fill="none" stroke="#0a0a0a" strokeWidth={4} strokeLinejoin="miter" />
      {/* dotted guides from each corner to the middle of the opposite side */}
      {AXES.map((a) => {
        const others = AXES.filter((o) => o !== a)
        const mid = { x: (VERTS[others[0]].x + VERTS[others[1]].x) / 2, y: (VERTS[others[0]].y + VERTS[others[1]].y) / 2 }
        return <line key={a} x1={VERTS[a].x} y1={VERTS[a].y} x2={mid.x} y2={mid.y} stroke="#0a0a0a" strokeOpacity={0.18} strokeWidth={2} strokeDasharray="4 6" />
      })}

      {AXES.map((a) => {
        const c = CORNER[a]
        return (
          <g key={a} aria-hidden="true">
            <g transform={`translate(${c.ix} ${c.iy}) scale(2.5)`}>
              {SPRITES[c.icon].flatMap((row, y) =>
                [...row].map((ch, x) => (ch === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#16b77d" /> : null)),
              )}
            </g>
            <text x={c.tx} y={c.ty} textAnchor={c.anchor} className="font-pixel" fontSize={10} fill="#0a0a0a">
              {c.label}
            </text>
          </g>
        )
      })}

      {options.map((o, i) => {
        const best = o.id === bestId
        return (
          <g key={o.id} transform={`translate(${pts[i].x} ${pts[i].y})`} aria-hidden="true">
            <rect x={-15} y={-15} width={30} height={30} fill={OPTION_COLORS[i]} stroke="#0a0a0a" strokeWidth={best ? 4 : 2} />
            <g transform="translate(-12 -12) scale(2)" className={best ? 'anim-bob' : ''}>
              {rects(o.icon).map((r, k) => (
                <rect key={k} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
              ))}
            </g>
          </g>
        )
      })}

      <g
        transform={`translate(${handle.x} ${handle.y})`}
        tabIndex={0}
        role="slider"
        aria-label="What matters most"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(weights.cost * 100)}
        aria-valuetext={weightsText(weights)}
        onKeyDown={onKey}
        className="cursor-grab outline-none focus-visible:[&>rect]:stroke-[#16b77d]"
      >
        <rect x={-10} y={-10} width={20} height={20} fill="#0a0a0a" stroke="#ffffff" strokeWidth={4} />
        <rect x={-3} y={-3} width={6} height={6} fill="#6ef07f" />
      </g>
    </svg>
    <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[15px]" aria-label="Which option wins where">
      {options.map((o, i) => (
        <li key={o.id} className="flex items-center gap-2">
          <i className="block h-4 w-4 border-2 border-ink" style={{ background: OPTION_COLORS[i] }} aria-hidden="true" />
          <PixelArt name={o.icon} size={2} />
          {o.name}
        </li>
      ))}
    </ul>
    </div>
  )
}
