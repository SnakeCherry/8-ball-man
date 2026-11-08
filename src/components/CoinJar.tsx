import { useEffect, useState } from 'react'
import { PixelArt } from './PixelArt'
import type { IconName } from '../lib/pixelart'
import { PixelIcon } from './ui'

const MAX_COINS = 8

/**
 * A pixel jar that fills towards the goal. Coins drop in for the money this choice moved
 * (more saved: coins go in; spent more: the level steps back), then the level rises in blocks.
 */
export function CoinJar({ from, to, deltaGBP, goalIcon }: { from: number; to: number; deltaGBP: number; goalIcon: IconName }) {
  const [level, setLevel] = useState(from)
  const coins = deltaGBP > 0 ? Math.min(MAX_COINS, Math.max(1, Math.round(deltaGBP))) : 0
  const full = to >= 1

  useEffect(() => {
    const t = window.setTimeout(() => setLevel(to), 250 + coins * 90)
    return () => window.clearTimeout(t)
  }, [to, coins])

  return (
    <div className="relative mx-auto h-[170px] w-[132px]" aria-hidden="true">
      <div className={`absolute left-1/2 top-0 -translate-x-1/2 leading-none ${full ? 'anim-hop' : 'anim-bob'}`} style={{ opacity: 0.35 + to * 0.65 }}>
        <PixelArt name={goalIcon} size={3} />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[118px] overflow-hidden border-4 border-ink bg-white">
        <div
          className="absolute inset-x-0 bottom-0 bg-lime"
          style={{ height: `${Math.round(level * 100)}%`, transition: 'height 0.8s steps(8)' }}
        />
        {Array.from({ length: 6 }, (_, i) => (
          <i key={i} className="absolute inset-x-0 border-t-2 border-ink/15" style={{ bottom: `${(i + 1) * 14}%` }} />
        ))}
        {Array.from({ length: coins }, (_, i) => (
          <span
            key={i}
            className="coin absolute block h-4 w-4 border-2 border-ink"
            style={{ left: `${12 + ((i * 37) % 70)}%`, animationDelay: `${i * 0.09}s`, background: '#ffd54a' }}
          />
        ))}
      </div>
      <PixelIcon name="pound" size={2} className="absolute -right-1 bottom-1 opacity-60" />
    </div>
  )
}
