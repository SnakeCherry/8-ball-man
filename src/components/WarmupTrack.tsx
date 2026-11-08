import { PixelIcon } from './ui'
import { PixelArt } from './PixelArt'
import type { IconName } from '../lib/pixelart'

/**
 * A short three-notch track: your runner warms up towards your goal while you guess,
 * then steps forward (or stumbles) as each answer is revealed.
 */
export function WarmupTrack({
  pos,
  goalIcon,
  mood = null,
  moodKey = 0,
}: {
  /** 0..1 along the track */
  pos: number
  goalIcon: IconName
  mood?: 'hop' | 'shake' | null
  /** change this to replay the hop/shake */
  moodKey?: number
}) {
  const p = Math.min(1, Math.max(0, pos))
  const arrived = p >= 1
  return (
    <div className="relative mt-3 h-[68px]" aria-hidden="true">
      <div
        className="absolute top-0"
        style={{ left: `calc(${p} * (100% - 40px - 32px))`, transition: 'left 0.4s steps(4)' }}
      >
        <div key={moodKey} className={mood === 'hop' ? 'anim-hop' : mood === 'shake' ? 'anim-shake' : ''}>
          <PixelIcon name={p > 0 && !arrived ? 'runB' : 'runA'} size={5} color="#16b77d" />
        </div>
      </div>
      <span className={`absolute right-0 top-1 leading-none ${arrived ? 'anim-hop' : ''}`}>
        <PixelArt name={goalIcon} size={3} />
      </span>
      <div className="absolute inset-x-0 bottom-0 flex h-5 border-4 border-ink bg-white">
        {[0, 1, 2].map((i) => (
          <i
            key={i}
            className="h-full flex-1 border-r-4 border-ink last:border-r-0"
            style={{ background: p >= (i + 1) / 3 - 0.001 ? '#16b77d' : undefined }}
          />
        ))}
      </div>
    </div>
  )
}
