import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { FormEvent } from 'react'
import { AudioLines } from '../components/AudioLines'
import { EightBall } from '../components/EightBall'
import type { BallMood } from '../components/EightBall'
import { PlanPanel } from '../components/PlanPanel'
import { SavingBig } from '../components/SavingBig'
import { PixelArt } from '../components/PixelArt'
import { PixelButton, PixelIcon } from '../components/ui'
import { Typed } from '../components/VoiceBits'
import { estimateDecisions, matchPreset } from '../lib/estimate'
import type { ParsedEstimate } from '../lib/estimate'
import { fortuneLine, savingSummary } from '../lib/fortune'
import { gbp } from '../lib/format'
import { monthlyCost } from '../lib/guess'
import { isOneOff } from '../lib/habit'
import { bestSwitch } from '../lib/hook'
import { isMuted, play, setMuted, subscribeMuted } from '../lib/sound'
import { speak, stopSpeaking } from '../lib/speech'
import type { Decision } from '../lib/types'
import { useSpeechInput } from '../lib/useSpeechInput'
import { useAppStore } from '../store/useAppStore'

const THINKING = ['Consulting the mists…', 'Stirring the cauldron…', 'Asking the stars…', 'Polishing the crystal…']

type Stage = 'idle' | 'pricing' | 'asking' | 'ready' | 'fallback' | 'error'

/** The ball's thinking lines, changing every second or so. */
function ThinkingLine() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % THINKING.length), 1200)
    return () => window.clearInterval(id)
  }, [])
  return <p className="font-pixel text-[12px] uppercase leading-relaxed text-white">{THINKING[i]}</p>
}

/** A sky of little twinkling pixel stars, placed the same way every time. */
function Stars() {
  const stars = useMemo(() => {
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    return Array.from({ length: 46 }, () => ({ x: rnd() * 100, y: rnd() * 100, s: rnd() < 0.2 ? 6 : 4, d: rnd() * 3 }))
  }, [])
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {stars.map((s, i) => (
        <i key={i} className="star" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
      ))}
      <i className="shooting" />
    </div>
  )
}

/**
 * The 8-ball's own page: a night sky, the ball in the middle, lines that move with the sound, and the answer. It
 * starts listening as soon as it opens (or prices the example you tapped).
 */
export function Oracle() {
  const go = useAppStore((s) => s.go)
  const seed = useAppStore((s) => s.ballSeed)
  const startQueue = useAppStore((s) => s.startQueue)
  const addCustoms = useAppStore((s) => s.addCustoms)
  const startDecision = useAppStore((s) => s.startDecision)
  const muted = useSyncExternalStore(subscribeMuted, isMuted)
  const [said, setSaid] = useState('')
  const [typed, setTyped] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [plans, setPlans] = useState<Decision[]>([])
  const [preset, setPreset] = useState<Decision | null>(null)
  const [partial, setPartial] = useState<ParsedEstimate[]>([])
  const [ask, setAsk] = useState<{ question: string; choices: string[] } | null>(null)
  const started = useRef(false)

  useEffect(() => () => stopSpeaking(), [])

  /** Price `text`. The first time the ball may ask one question; the answer is priced straight away. */
  const run = async (text: string, shown: string, canAsk: boolean) => {
    setSaid(shown)
    setStage('pricing')
    setPlans([])
    setPreset(null)
    setPartial([])
    setAsk(null)
    try {
      const res = await estimateDecisions(text, setPartial, canAsk)
      if (res.kind === 'ask') {
        setAsk({ question: res.question, choices: res.choices })
        setStage('asking')
        play('nudge')
        void speak(res.question)
        return
      }
      addCustoms(res.decisions) // every habit found waits on the belt, even the ones you don't start right now
      setPlans(res.decisions)
      setStage('ready')
      play('magic')
      void speak(fortuneLine(res.decisions))
    } catch {
      const m = matchPreset(text)
      setPreset(m)
      setStage(m ? 'fallback' : 'error')
    }
  }

  // while the ball is asking, whatever you say or type is the answer
  const onText = (t: string) => (stage === 'asking' && said ? void run(`${said}. ${t}`, said, false) : void run(t, t, true))
  const speech = useSpeechInput(onText)
  const { engine, phase } = speech
  const listening = phase === 'recording' || phase === 'listening'

  const listen = () => {
    if (phase === 'recording') return void speech.finish()
    if (phase === 'listening') return speech.toggleBrowser()
    if (phase !== 'idle' || stage === 'pricing') return
    stopSpeaking()
    if (engine === 'whisper') void speech.begin()
    else if (engine === 'browser') speech.toggleBrowser()
  }

  // opening the page is the "tap": start listening at once, or price the example that was tapped
  useEffect(() => {
    if (started.current || engine === 'checking') return
    started.current = true
    if (seed) void run(seed, seed, true)
    else listen()
    // run once, when the microphone engine is known
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine])

  const mood: BallMood = listening || phase === 'decoding' ? 'listening' : stage === 'pricing' ? 'thinking' : stage === 'idle' ? 'idle' : 'text'
  const ballText =
    stage === 'asking' && ask
      ? ask.question
      : stage === 'ready'
        ? fortuneLine(plans)
        : stage === 'fallback'
          ? 'Qwen is asleep. Here is the closest I can find.'
          : stage === 'error'
            ? 'The mist is cloudy. Try rewording.'
            : ''
  const status = listening ? 'Listening' : phase === 'decoding' ? 'Decoding' : stage === 'pricing' ? 'Thinking' : ballText || (engine === 'none' ? 'Type what you do' : 'Tap the ball to ask')

  const saving = stage === 'ready' ? savingSummary(plans) : null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (typed.trim()) {
      onText(typed.trim())
      setTyped('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto text-white" style={{ background: 'radial-gradient(ellipse at 50% 30%, #2a1470 0%, #140a3a 45%, #0b0620 100%)' }}>
      <Stars />
      <div className="relative mx-auto flex min-h-full max-w-3xl flex-col items-center gap-4 px-5 pb-10 pt-4">
        <div className="flex w-full items-center justify-between">
          <PixelButton variant="white" className="!min-h-[44px] !px-4 !py-1 text-[14px]" onClick={() => go('home')}>
            ← Back
          </PixelButton>
          <button
            type="button"
            aria-pressed={muted}
            aria-label={muted ? 'Sound off. Turn sound on' : 'Sound on. Turn sound off'}
            onClick={() => setMuted(!muted)}
            className="border-4 border-ink bg-white p-1 text-ink"
          >
            <PixelIcon name={muted ? 'mute' : 'volume'} size={3} />
          </button>
        </div>

        <button
          type="button"
          aria-label="Ask the ball by voice"
          disabled={phase === 'decoding' || stage === 'pricing' || engine === 'none' || engine === 'checking'}
          className="block w-full max-w-[400px] select-none"
          onClick={listen}
        >
          <EightBall mood={mood}>
            {mood === 'text' && <span className="px-1 text-[clamp(13px,3.2vw,20px)] leading-tight text-white">{ballText}</span>}
          </EightBall>
        </button>

        <div className="w-full max-w-[560px]">
          <AudioLines mood={mood} />
        </div>
        <p className="sr-only" role="status">
          {status}
        </p>
        <div className="min-h-[24px] text-center" aria-hidden="true">
          {stage === 'pricing' ? <ThinkingLine /> : !listening && stage === 'idle' && phase === 'idle' && <p className="font-pixel text-[12px] uppercase text-white/80">Tap the ball or type below</p>}
        </div>

        {stage === 'asking' && ask && (
          <div className="anim-pop w-full space-y-3 text-center">
            <ul className="flex flex-wrap justify-center gap-3" aria-label="Answers">
              {ask.choices.map((c) => (
                <li key={c}>
                  <PixelButton variant="white" onClick={() => void run(`${said}. ${c}`, said, false)}>
                    {c}
                  </PixelButton>
                </li>
              ))}
            </ul>
            <p className="text-[15px] text-white/70">Or say or type your own answer.</p>
          </div>
        )}

        <form onSubmit={submit} className="flex w-full max-w-[560px] gap-3">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={stage === 'asking' ? 'Your answer…' : 'Type it: "Uber to uni every morning"'}
            aria-label="Describe what you are doing"
            className="min-w-0 flex-1 border-4 border-ink bg-white px-4 py-3 text-[20px] text-ink"
          />
          <PixelButton variant="white" type="submit" className="!min-h-[60px] !px-6 !text-[16px]" disabled={!typed.trim() || stage === 'pricing'}>
            Go
          </PixelButton>
        </form>
        {speech.msg && <p className="text-[15px] text-white/80">{speech.msg}</p>}

        {said && stage !== 'idle' && (
          <p className="text-center text-[22px] leading-snug">
            “<Typed text={said} />”
          </p>
        )}

        {stage === 'pricing' && (
          <div className="w-full space-y-3 text-ink" aria-label="Pricing it">
            <div className={`grid gap-4 ${partial.length > 1 ? 'md:grid-cols-2' : ''}`}>
              {(partial.length ? partial : [{ timesPerMonth: null, activity: null, options: [] }]).map((g, gi) => (
                <PlanPanel key={gi} title={g.activity} icon={g.options[0]?.icon} options={g.options} />
              ))}
            </div>
          </div>
        )}

        {stage === 'ready' && plans.length > 0 && (
          <div className="anim-pop w-full space-y-3">
            {saving && (
              <div className="mx-auto w-full max-w-[560px] border-4 border-ink bg-lime p-4 text-center text-ink">
                <SavingBig delta={saving.amount} once={saving.once} />
                {plans.length > 1 && <p className="mt-2 text-[15px]">across {saving.count} {saving.count === 1 ? 'thing' : 'things'} we found</p>}
              </div>
            )}
            {plans.length > 1 && (
              <p className="text-[17px]">
                I found <b>{plans.length} things</b> in that. We'll go through them one after another.
              </p>
            )}
            <div className={`grid gap-4 text-ink ${plans.length > 1 ? 'md:grid-cols-2' : ''}`}>
              {plans.map((plan) => {
                const sw = bestSwitch(plan)
                return (
                  <PlanPanel
                    key={plan.id}
                    title={plan.title}
                    icon={plan.icon}
                    options={plan.options}
                    usualId={plan.usualId}
                    footer={
                      <p className="text-[20px] leading-snug">
                        ≈ <b>{gbp(monthlyCost(plan.options.find((o) => o.id === plan.usualId)!, plan))}</b>
                        {isOneOff(plan) ? ' once' : ' a month'}
                        {sw && (
                          <>
                            . {sw.option.name} would save about <b>{gbp(sw.monthlyGBP)}</b>.
                          </>
                        )}
                      </p>
                    }
                  />
                )
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <PixelButton data-fx="star" onClick={() => startQueue(plans)}>
                {plans.length > 1 ? `Start with ${plans[0].title}` : 'See the trade-offs'}
              </PixelButton>
              {plans.length > 1 && <span className="text-[15px]">The others follow straight after.</span>}
              <span className="text-[14px] text-white/70">Estimates from Qwen. Real prices vary.</span>
            </div>
          </div>
        )}

        {stage === 'fallback' && preset && (
          <div className="anim-pop flex flex-wrap items-center justify-center gap-3">
            <p className="text-[17px]">
              Qwen isn't answering, so here is the closest preset:{' '}
              <b>
                <PixelArt name={preset.icon} size={2} /> {preset.title}
              </b>
            </p>
            <PixelButton data-fx="star" onClick={() => startDecision(preset.id)}>
              Start it
            </PixelButton>
          </div>
        )}

        {stage === 'error' && <p className="text-[17px]">Couldn't price that one. Try rewording.</p>}
      </div>
    </div>
  )
}
