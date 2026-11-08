import { PixelArt } from './PixelArt'
import { moodFor } from '../lib/reaction'

/**
 * 8-Ball Man with a speech bubble. Happy: he hops and sparkles. Sad: he slumps and sweats. Calm: he just stands.
 * `delta` is money kept (+) or spent (-) against your usual; `line` is what he says.
 */
export function ManReaction({ delta, line, size = 6, className = '' }: { delta: number; line: string; size?: number; className?: string }) {
  const mood = moodFor(delta)
  return (
    <div className={`flex items-center gap-4 text-left ${className}`}>
      <div className={`man-${mood === 'calm' ? 'calm' : mood} relative shrink-0`} aria-hidden="true">
        <div className="man-body">
          <PixelArt name="logo" size={size} natural frame={mood === 'sad' ? 1 : 0} animate={mood === 'happy'} />
        </div>
        {mood === 'happy' && (
          <>
            <i className="twinkle" style={{ left: -6, top: 2 }} />
            <i className="twinkle" style={{ right: -6, top: 10, animationDelay: '0.3s' }} />
            <i className="twinkle" style={{ right: 2, top: -8, animationDelay: '0.6s' }} />
          </>
        )}
        {mood === 'sad' && <i className="sweat" />}
      </div>
      {/* the speech bubble, with a stepped little tail pointing at him */}
      <p className="relative border-4 border-ink bg-white px-4 py-3 text-[18px] leading-snug text-ink">
        <i className="absolute -left-[10px] top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b-4 border-l-4 border-ink bg-white" aria-hidden="true" />
        {line}
      </p>
    </div>
  )
}
