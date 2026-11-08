import { useEffect, useState } from 'react'
import { PixelArt } from './PixelArt'
import { Typed } from './VoiceBits'
import { llmAvailable, warmUpLlm } from '../lib/estimate'
import { useAppStore } from '../store/useAppStore'

/** What you could say: shown typing itself out, so people see it handles several things in one sentence. */
const EXAMPLES = [
  'Uber to uni every morning and a Lidl shop…',
  'Greggs for lunch most days…',
  'I want to buy a games console…',
  'Cooking vs takeaway most nights…',
]

/** The line under the name: types an example, holds it, then moves to the next. */
function Rotating() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % EXAMPLES.length), 3800)
    return () => window.clearInterval(id)
  }, [])
  return (
    <span aria-hidden="true">
      “<Typed key={i} text={EXAMPLES[i]} />”
    </span>
  )
}

/**
 * The Home hero: 8-Ball Man glowing on a night sky. The WHOLE card is one button; tap anywhere on it and the
 * magic ball page opens.
 */
export function BallCard() {
  const askBall = useAppStore((s) => s.askBall)
  // read the instructions into Qwen's cache now so the first real question starts faster
  useEffect(() => {
    void llmAvailable().then((ok) => ok && warmUpLlm())
  }, [])
  return (
    <button type="button" aria-label="Ask 8-Ball Man something" data-fx="sparkle" className="hero group relative block w-full select-none overflow-hidden border-4 border-ink px-5 py-8 text-center sm:py-10" onClick={() => askBall()}>
      <span className="hero-aura" aria-hidden="true" />
      <i className="twinkle" style={{ left: '18%', top: '22%' }} aria-hidden="true" />
      <i className="twinkle" style={{ left: '80%', top: '30%', animationDelay: '0.3s' }} aria-hidden="true" />
      <i className="twinkle" style={{ left: '70%', top: '68%', animationDelay: '0.6s' }} aria-hidden="true" />
      <i className="twinkle" style={{ left: '26%', top: '72%', animationDelay: '0.9s' }} aria-hidden="true" />
      <span className="relative block">
        <span className="hero-man mx-auto grid w-fit place-items-center">
          <PixelArt name="logo" size={13} natural animate />
        </span>
        <span className="hero-shadow mx-auto block" aria-hidden="true" />
        <span className="hero-title mt-4 block font-pixel text-[clamp(24px,4.4vw,44px)] uppercase leading-tight text-white">8-Ball Man</span>
        <span className="mx-auto mt-3 block min-h-[2.6em] max-w-[34ch] text-[clamp(18px,2.2vw,26px)] leading-snug text-white/90">
          <Rotating />
        </span>
        <span className="anim-blink mt-4 inline-block border-4 border-ink bg-lime px-5 py-3 font-pixel text-[13px] uppercase text-ink">Tap to ask</span>
      </span>
    </button>
  )
}
