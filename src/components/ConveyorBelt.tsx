import { useState } from 'react'
import { PixelArt } from './PixelArt'
import { PixelIcon } from './ui'
import { gbp } from '../lib/format'
import type { Decision } from '../lib/types'

/** Card width plus its gap, in CSS pixels, and how fast the belt runs: the stripes in index.css use the same numbers. */
const PITCH = 256
const SPEED = 40

export interface BeltItem {
  decision: Decision
  /** how many times this has been tried before */
  tried: number
  /** one of today's top picks */
  pick: boolean
  /** a habit you described yourself (by voice or typing) */
  mine?: boolean
}

function BeltCard({ item, onPick, clone }: { item: BeltItem; onPick: (id: string) => void; clone: boolean }) {
  const { decision: d, tried, pick, mine } = item
  const costs = d.options.map((o) => o.costGBP)
  const spread = (Math.max(...costs) - Math.min(...costs)) * d.timesPerMonth
  return (
    // the second copy keeps the loop seamless. It stays clickable (half the visible cards are copies) but is
    // hidden from screen readers and skipped by the Tab key, so keyboard users only meet each card once.
    <div className="belt-item" aria-hidden={clone || undefined}>
      <button
        type="button"
        data-art={d.icon}
        tabIndex={clone ? -1 : undefined}
        onClick={() => onPick(d.id)}
        className="pbox pselect flex h-full w-full flex-col gap-2 p-3"
      >
        <span className="flex items-start justify-between gap-2">
          <span className="belt-plate" aria-hidden="true">
            <PixelArt name={d.icon} size={4} />
          </span>
          {mine ? (
            <span className="border-4 border-ink bg-white px-1 font-pixel text-[9px] uppercase">Yours</span>
          ) : (
            pick && <span className="border-4 border-ink bg-lime px-1 font-pixel text-[9px] uppercase">Pick</span>
          )}
        </span>
        <span className="block text-[19px] leading-tight">{d.title}</span>
        <span className="block text-[15px] leading-snug text-ink/70">{d.blurb}</span>
        <span className="num mt-auto block text-[14px]">
          Up to {gbp(spread)} a month between options
          {tried > 0 ? ` · Tried ${tried}×` : ''}
        </span>
      </button>
    </div>
  )
}

/**
 * The day's decisions riding a pixel conveyor belt, moving right (the way the vehicles face). It pauses while you
 * hover or focus it, has a pause button, and sits still as a scrollable row if you prefer reduced motion.
 */
export function ConveyorBelt({ items, onPick }: { items: BeltItem[]; onPick: (id: string) => void }) {
  const [paused, setPaused] = useState(false)
  const duration = (items.length * PITCH) / SPEED

  return (
    <section aria-label="Today's picks">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-pixel text-[14px] uppercase leading-5">Today's picks</h2>
          <p className="mt-1 text-[15px] text-ink/70">Grab one off the belt to start. It stops while you hover.</p>
        </div>
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
          className="pbtn pbtn-white !min-h-[40px] !px-3 !py-1 text-[13px]"
        >
          <PixelIcon name={paused ? 'arrow' : 'clock'} size={2} />
          {paused ? 'Run belt' : 'Pause belt'}
        </button>
      </div>

      <div className={`belt ${paused ? 'belt-paused' : ''}`} style={{ ['--belt-duration' as string]: `${duration}s` }}>
        <div className="belt-window">
          <div className="belt-track">
            {items.map((it) => (
              <BeltCard key={it.decision.id} item={it} onPick={onPick} clone={false} />
            ))}
            <div className="belt-clone contents">
              {items.map((it) => (
                <BeltCard key={`clone-${it.decision.id}`} item={it} onPick={onPick} clone />
              ))}
            </div>
          </div>
        </div>
        <div className="belt-bar" aria-hidden="true">
          <i className="belt-roller left-[-12px]" />
          <div className="belt-surface" />
          <i className="belt-roller right-[-12px]" />
          <i className="belt-leg left-[10%]" />
          <i className="belt-leg right-[10%]" />
        </div>
      </div>
    </section>
  )
}
