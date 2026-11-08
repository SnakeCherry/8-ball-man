import { useEffect, useState } from 'react'
import { PixelArt } from './PixelArt'
import { PixelTitle } from './PixelTitle'
import { Typed } from './VoiceBits'
import { llmAvailable, warmUpLlm } from '../lib/estimate'
import { useAppStore } from '../store/useAppStore'

/** What you could say: shown typing itself out, so people see it handles several things in one sentence. */
const EXAMPLES = [
    'Uber to uni every morning and a Lidl shop',
    'Greggs for lunch most days',
    'I want to buy a games console',
    'Cooking vs takeaway most nights',
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
            <Typed key={i} text={EXAMPLES[i]} />
        </span>
    )
}

/** A white pixel heart for the window's title bar. */
function WindowHeart() {
  const rows = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000']
  return (
    <svg viewBox="0 0 7 6" width={28} height={24} shapeRendering="crispEdges">
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === '1' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#fffdf2" /> : null)))}
    </svg>
  )
}

/** The white X inside the red close box. */
function WindowX() {
  const rows = ['1000001', '0100010', '0010100', '0001000', '0010100', '0100010', '1000001']
  return (
    <svg viewBox="0 0 7 7" width={16} height={16} shapeRendering="crispEdges">
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === '1' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#ffffff" /> : null)))}
    </svg>
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
        <button type="button" aria-label="Ask 8-Ball Man something" data-fx="sparkle" className="hero group relative block w-full select-none text-center" onClick={() => askBall()}>
            <span className="pxwin-bar" aria-hidden="true">
                <WindowHeart />
                <span className="pxwin-x">
                    <WindowX />
                </span>
            </span>
            <span className="pxwin-screen relative block overflow-hidden px-5 py-8 sm:py-10">
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
                    <PixelTitle className="mx-auto mt-5 block w-[min(88%,520px)]" />
                    <span className="mt-5 block w-full text-[clamp(20px,2.4vw,30px)] leading-snug text-white/95">Tell me what you spend your money on and I'll find you a better way.</span>
                    <span className="mx-auto mt-2 block min-h-[1.6em] text-[15px] text-white/60">
                        Try: <Rotating />
                    </span>
                    <span className="anim-blink mt-4 inline-block border-4 border-ink bg-lime px-5 py-3 font-pixel text-[13px] uppercase text-ink">Tap to ask</span>
                </span>
            </span>
        </button>
    )
}
