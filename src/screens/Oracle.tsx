import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { FormEvent } from 'react'
import { AudioLines } from '../components/AudioLines'
import { EightBall } from '../components/EightBall'
import type { BallMood } from '../components/EightBall'
import { PlanPanel } from '../components/PlanPanel'
import { SavingBig } from '../components/SavingBig'
import { PixelArt } from '../components/PixelArt'
import { PixelButton, PixelIcon } from '../components/ui'
import { Typed } from '../components/VoiceBits'
import { TOO_BIG_GBP, estimateDecisions, matchPreset } from '../lib/estimate'
import type { ParsedEstimate } from '../lib/estimate'
import { fortuneLine, savingParts, savingSummary, switchLife } from '../lib/fortune'
import { buysLine } from '../lib/buys'
import { formatSpan } from '../lib/life'
import { burstAtElement } from '../lib/fx'
import { NextBar } from '../components/NextBar'
import { PixelSky } from '../components/PixelSky'
import { isMuted, play, setMuted, subscribeMuted } from '../lib/sound'
import { speak, stopSpeaking } from '../lib/speech'
import type { Decision } from '../lib/types'
import { useSpeechInput } from '../lib/useSpeechInput'
import { useAppStore } from '../store/useAppStore'

const TOO_BIG_LINE = `That is too big for me to price properly, it is over £${TOO_BIG_GBP.toLocaleString('en-GB')}. Try something smaller.`

const THINKING = ['Consulting the mists…', 'Stirring the cauldron…', 'Asking the stars…', 'Polishing the crystal…']

type Stage = 'idle' | 'pricing' | 'asking' | 'ready' | 'toobig' | 'fallback' | 'error'

/** The ball's thinking lines, changing every second or so. */
function ThinkingLine() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % THINKING.length), 1200)
    return () => window.clearInterval(id)
  }, [])
  return <p className="font-pixel text-[12px] uppercase leading-relaxed text-white">{THINKING[i]}</p>
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
  const muted = useSyncExternalStore(subscribeMuted, isMuted)
  const [said, setSaid] = useState('')
  const [typed, setTyped] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [plans, setPlans] = useState<Decision[]>([])
  const [partial, setPartial] = useState<ParsedEstimate[]>([])
  const [ask, setAsk] = useState<{ question: string; choices: string[] } | null>(null)
  const started = useRef(false)

  useEffect(() => () => stopSpeaking(), [])

  /** Price `text`. The first time the ball may ask one question; the answer is priced straight away. */
  const run = async (text: string, shown: string, canAsk: boolean) => {
    setSaid(shown)
    setStage('pricing')
    setPlans([])
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
      if (res.kind === 'toobig') {
        setStage('toobig')
        play('nudge')
        void speak(TOO_BIG_LINE)
        return
      }
      addCustoms(res.decisions) // every habit found waits on the belt, even the ones you don't start right now
      setPlans(res.decisions)
      setStage('ready')
      play(savingSummary(res.decisions) ? 'sparkle' : 'magic') // a saving is good news
      void speak(fortuneLine(res.decisions))
    } catch {
      // Qwen is down: answer from the closest preset habit, looking exactly like a normal answer
      const m = matchPreset(text)
      if (m) {
        setPlans([m])
        setStage('ready')
        play('magic')
        void speak(fortuneLine([m]))
      } else {
        setStage('error')
      }
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
        : stage === 'toobig'
          ? TOO_BIG_LINE
          : stage === 'error'
            ? 'The mist is cloudy. Try rewording.'
            : ''
  const status = listening ? 'Listening' : phase === 'decoding' ? 'Decoding' : stage === 'pricing' ? 'Thinking' : ballText || (engine === 'none' ? 'Type what you do' : 'Tap the ball to ask')

  const saving = stage === 'ready' ? savingSummary(plans) : null
  const cardRef = useRef<HTMLDivElement>(null)
  const buys = saving ? buysLine(saving.amount, saving.once) : null
  // the life twist, for a single habit: what the switch could add over ten years
  const lifeMin = stage === 'ready' && plans.length === 1 ? switchLife(plans[0], 10) : null
  // the payoff: coins fly out of the saving the moment the answer is there
  useEffect(() => {
    if (!saving) return
    const t = window.setTimeout(() => burstAtElement(cardRef.current, { icon: 'pound', count: 12, spread: 96 }), 450)
    return () => window.clearTimeout(t)
    // once per answer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage === 'ready' && plans.length > 0 ? plans[0].id : ''])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (typed.trim()) {
      onText(typed.trim())
      setTyped('')
    }
  }

  return (
    <div className="night night-sky fixed inset-0 z-50 overflow-y-auto text-white">
      <PixelSky />
      <div className="relative mx-auto flex min-h-full max-w-3xl flex-col items-center gap-4 px-5 pb-32 pt-4">
        <div className="flex w-full items-center justify-between">
          <PixelButton variant="white" className="!min-h-[44px] !px-4 !py-1 text-[14px]" onClick={() => go('home')}>
            ← Back
          </PixelButton>
          <button
            type="button"
            aria-pressed={muted}
            aria-label={muted ? 'Sound off. Turn sound on' : 'Sound on. Turn sound off'}
            onClick={() => setMuted(!muted)}
            className="grid min-h-[44px] min-w-[44px] place-items-center border-4 border-ink bg-white p-1 text-ink"
          >
            <PixelIcon name={muted ? 'mute' : 'volume'} size={3} />
          </button>
        </div>

        <button
          type="button"
          aria-label="Ask the ball by voice"
          disabled={phase === 'decoding' || stage === 'pricing' || engine === 'none' || engine === 'checking'}
          className={`block w-full select-none ${stage === 'ready' || stage === 'toobig' ? 'max-w-[250px]' : 'max-w-[400px]'}`}
          onClick={listen}
        >
          <EightBall mood={mood}>
            {mood === 'text' && <span className="px-1 text-[clamp(13px,3.2vw,20px)] leading-tight text-white">{ballText}</span>}
          </EightBall>
        </button>

        <div className="w-full max-w-[560px]">
          <AudioLines mood={mood} compact={stage === 'ready' || stage === 'toobig'} />
        </div>
        <p className="sr-only" role="status">
          {status}
        </p>
        <div className={`text-center ${stage === 'ready' ? '' : 'min-h-[24px]'}`} aria-hidden="true">
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

        {stage === 'ready' && plans.length > 0 && (
          <div className="anim-pop flex w-full max-w-[720px] flex-col items-center gap-5">
            {saving && (
              <div ref={cardRef} className="w-full space-y-6 border-4 border-ink bg-lime p-6 text-center text-ink sm:p-8">
                <SavingBig delta={saving.amount} once={saving.once} />
                {saving.count > 1 && (
                  <p className="text-[16px]">
                    across {saving.count} {saving.count === 1 ? 'thing' : 'things'}
                  </p>
                )}
                {buys && <p className="text-[19px] leading-relaxed">{buys}</p>}
                {lifeMin !== null && (
                  <p className="flex items-center justify-center gap-2 text-[17px] leading-relaxed">
                    <PixelArt name="heart" size={2} />
                    <span>
                      And about <b>{formatSpan(lifeMin)}</b> of {lifeMin >= 0 ? 'extra ' : 'less '}life over 10 years, based on your actions.
                    </span>
                  </p>
                )}
                <ul className="divide-y-2 divide-ink/20 border-t-2 border-ink/20 text-left">
                  {plans.map((p) => {
                    const parts = savingParts(p)
                    return parts ? (
                      <li key={p.id} className="space-y-1 py-4">
                        <p className="text-[19px] leading-snug">
                          <b>{parts.title}</b>
                        </p>
                        <p className="text-[16px] leading-relaxed text-muted">{parts.detail}</p>
                      </li>
                    ) : null
                  })}
                </ul>
              </div>
            )}
            <p className="text-[14px] text-white/70">Estimates only. Real prices vary.</p>
          </div>
        )}

        <form onSubmit={submit} className="flex w-full max-w-[560px] gap-3">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={stage === 'asking' ? 'Your answer…' : 'Try: Uber to uni every morning and a Lidl shop'}
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

        {stage === 'toobig' && <p className="text-center text-[17px]">{TOO_BIG_LINE}</p>}

        {stage === 'error' && <p className="text-[17px]">Couldn't price that one. Try rewording.</p>}
      </div>

      {stage === 'ready' && plans.length > 0 && (
        <NextBar above>
          <PixelButton className="w-full" data-fx="star" onClick={() => startQueue(plans)}>
            Open the full answer
          </PixelButton>
        </NextBar>
      )}
    </div>
  )
}
