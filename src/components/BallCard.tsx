import { useEffect } from 'react'
import { EightBall } from './EightBall'
import { PixelCard } from './ui'
import { llmAvailable, warmUpLlm } from '../lib/estimate'
import { useAppStore } from '../store/useAppStore'

/** One tap to try it, so nobody has to think of something to say. */
const EXAMPLES = [
  { label: 'Uber to uni', text: 'I get an Uber to uni every morning' },
  { label: 'Cooking vs takeaway', text: 'Cooking vs takeaway most nights' },
  { label: 'A games console', text: 'I want to buy a games console' },
]

/** The Home hero: a small 8-ball. Tap it (or an example) and it opens its own page. */
export function BallCard() {
  const askBall = useAppStore((s) => s.askBall)
  // read the instructions into Qwen's cache now so the first real question starts faster
  useEffect(() => {
    void llmAvailable().then((ok) => ok && warmUpLlm())
  }, [])
  return (
    <PixelCard className="bg-white p-5 sm:p-7">
      <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[minmax(0,260px)_1fr]">
        <div className="min-w-0 space-y-2">
          <button type="button" aria-label="Open the magic 8-ball and ask it something" className="block w-full select-none" data-fx="sparkle" onClick={() => askBall()}>
            <EightBall mood="idle" />
          </button>
          <p className="text-center font-pixel text-[11px] uppercase leading-relaxed">Tap the ball and ask</p>
        </div>
        <div className="min-w-0 space-y-4">
          <p className="text-[clamp(22px,2.6vw,30px)] leading-snug">Tell me what you spend on and I'll find you a cheaper way.</p>
          <ul className="flex flex-wrap gap-2" aria-label="Try one of these">
            {EXAMPLES.map((e) => (
              <li key={e.label}>
                <button type="button" className="pbox-flat pselect px-3 py-2 text-[16px] leading-tight" onClick={() => askBall(e.text)}>
                  {e.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PixelCard>
  )
}
