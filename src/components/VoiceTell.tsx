import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { PixelButton, PixelCard, PixelIcon, Label } from './ui'
import { PixelArt } from './PixelArt'
import { Equaliser, Typed } from './VoiceBits'
import { estimateDecisions, llmAvailable, matchPreset, warmUpLlm } from '../lib/estimate'
import type { ParsedEstimate } from '../lib/estimate'
import type { IconName } from '../lib/pixelart'
import { gbp, mins, score } from '../lib/format'
import { monthlyCost } from '../lib/guess'
import { isOneOff } from '../lib/habit'
import { bestSwitch } from '../lib/hook'
import { play } from '../lib/sound'
import { useSpeechInput } from '../lib/useSpeechInput'
import type { Decision } from '../lib/types'
import { useAppStore } from '../store/useAppStore'

type Stage = 'idle' | 'pricing' | 'ready' | 'fallback' | 'error'

interface PanelOption {
  name: string
  icon: IconName
  costGBP: number
  timeMin: number
  health: number
}

/** One habit: its title, its (up to three) options, and whatever goes underneath. Missing options show as placeholders. */
function PlanPanel({
  title,
  icon,
  options,
  usualId,
  footer,
}: {
  title: string | null
  icon?: IconName
  options: (PanelOption & { id?: string })[]
  usualId?: string
  footer?: React.ReactNode
}) {
  return (
    <div className="space-y-3 border-4 border-ink bg-white p-3">
      <p className="flex items-center gap-2 text-[19px] leading-tight">
        {icon ? <PixelArt name={icon} size={2} /> : <PixelArt name="coin" size={2} className="anim-blink" />}
        <b>{title ?? '…'}</b>
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => {
          const o = options[i]
          const usual = o ? (usualId ? o.id === usualId : i === 0) : false
          return o ? (
            <div key={i} className={`anim-pop border-4 border-ink p-3 ${usual ? 'bg-lime' : 'bg-white'}`}>
              <p className="text-[17px] leading-tight">
                <PixelArt name={o.icon} size={2} /> {o.name}
              </p>
              <p className="num mt-1 text-[15px]">
                {gbp(o.costGBP)} · {mins(o.timeMin)} · <PixelArt name="heart" size={1} /> {score(o.health)}
              </p>
              {usual && <p className="mt-1 font-pixel text-[9px] uppercase">Your usual</p>}
            </div>
          ) : (
            <div key={i} className="anim-blink flex h-[72px] items-center justify-center border-4 border-dashed border-ink/40" aria-hidden="true">
              <PixelArt name={(['coin', 'dumbbell', 'heart'] as const)[i]} size={3} />
            </div>
          )
        })}
      </div>
      {footer}
    </div>
  )
}

/** The Home hero: say what you do, and Qwen prices it and finds a cheaper way. */
export function VoiceTell() {
  const startQueue = useAppStore((s) => s.startQueue)
  const addCustoms = useAppStore((s) => s.addCustoms)
  const startDecision = useAppStore((s) => s.startDecision)
  const [said, setSaid] = useState('')
  const [typed, setTyped] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [plans, setPlans] = useState<Decision[]>([])
  const [preset, setPreset] = useState<Decision | null>(null)
  const [partial, setPartial] = useState<ParsedEstimate[]>([])

  // read the instructions into Qwen's cache now so the first real question starts faster
  useEffect(() => {
    void llmAvailable().then((ok) => ok && warmUpLlm())
  }, [])

  const price = async (text: string) => {
    setSaid(text)
    setStage('pricing')
    setPlans([])
    setPreset(null)
    setPartial([])
    try {
      const found = await estimateDecisions(text, setPartial)
      addCustoms(found) // every habit found waits on the belt, even the ones you don't start right now
      setPlans(found)
      setStage('ready')
      play('bullseye')
    } catch {
      const m = matchPreset(text)
      setPreset(m)
      setStage(m ? 'fallback' : 'error')
    }
  }

  const speech = useSpeechInput(price)
  const { engine, phase } = speech
  const busy = phase === 'recording' || phase === 'listening'
  const hold = engine === 'whisper'
  const label =
    phase === 'recording' ? 'Listening… let go when done' : phase === 'decoding' ? 'Decoding…' : phase === 'listening' ? 'Listening…' : hold ? 'Hold and say what you do' : 'Tap and say what you do'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (typed.trim()) {
      void price(typed.trim())
      setTyped('')
    }
  }

  return (
    <PixelCard className="space-y-4 bg-white">
      <Label>Say what you're doing</Label>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-2">
          {engine !== 'none' && engine !== 'checking' && (
            <PixelButton
              className="w-full touch-none select-none !min-h-[64px] !text-[18px]"
              data-fx="sparkle"
              aria-pressed={busy}
              disabled={phase === 'decoding' || stage === 'pricing'}
              {...(hold
                ? {
                    onPointerDown: (e) => {
                      e.currentTarget.setPointerCapture(e.pointerId)
                      void speech.begin()
                    },
                    onPointerUp: () => void speech.finish(),
                    onPointerCancel: () => void speech.finish(),
                    onKeyDown: (e) => {
                      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                        e.preventDefault()
                        void speech.begin()
                      }
                    },
                    onKeyUp: (e) => {
                      if (e.key === ' ' || e.key === 'Enter') void speech.finish()
                    },
                  }
                : { onClick: speech.toggleBrowser })}
            >
              <span className="flex items-center justify-center gap-3">
                <PixelIcon name="mic" size={4} className={busy ? 'anim-blink' : ''} />
                {label}
              </span>
            </PixelButton>
          )}
          {hold && (phase === 'recording' || phase === 'decoding') && <Equaliser levels={speech.levels} active={phase === 'recording'} />}
          <form onSubmit={submit} className="flex gap-2">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder='…or type it: "Uber to uni every morning"'
              aria-label="Describe what you are doing"
              className="min-w-0 flex-1 border-4 border-ink bg-white px-3 py-2 text-[16px]"
            />
            <PixelButton variant="white" type="submit" className="!min-h-[44px] !px-4" disabled={!typed.trim() || stage === 'pricing'}>
              Go
            </PixelButton>
          </form>
          {speech.msg && <p className="text-[15px] text-ink/70">{speech.msg}</p>}
        </div>

        <div className="hidden lg:block" aria-hidden="true">
          <PixelArt name="walk" size={6} animate />
        </div>
      </div>

      {said && stage !== 'idle' && (
        <p className="text-[20px] leading-snug">
          “<Typed text={said} />”
        </p>
      )}

      {stage === 'pricing' && (
        <div className="space-y-3" role="status" aria-label="Pricing it">
          <div className={`grid gap-4 ${partial.length > 1 ? 'lg:grid-cols-2' : ''}`}>
            {(partial.length ? partial : [{ timesPerMonth: null, activity: null, options: [] }]).map((g, gi) => (
              <PlanPanel key={gi} title={g.activity} icon={g.options[0]?.icon} options={g.options} />
            ))}
          </div>
          <p className="font-pixel text-[11px] uppercase">Pricing it…</p>
        </div>
      )}

      {stage === 'ready' && plans.length > 0 && (
        <div className="anim-pop space-y-3">
          {plans.length > 1 && (
            <p className="text-[17px]">
              I found <b>{plans.length} things</b> in that. We'll go through them one after another.
            </p>
          )}
          <div className={`grid gap-4 ${plans.length > 1 ? 'lg:grid-cols-2' : ''}`}>
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
            <span className="text-[14px] text-ink/70">Estimates from Qwen. Real prices vary.</span>
          </div>
        </div>
      )}

      {stage === 'fallback' && preset && (
        <div className="anim-pop flex flex-wrap items-center gap-3">
          <p className="text-[17px]">
            Qwen isn't answering, so here is the closest preset: <b><PixelArt name={preset.icon} size={2} /> {preset.title}</b>
          </p>
          <PixelButton data-fx="star" onClick={() => startDecision(preset.id)}>
            Start it
          </PixelButton>
        </div>
      )}

      {stage === 'error' && <p className="text-[17px]">Couldn't price that one. Try rewording, or pick a preset below.</p>}
    </PixelCard>
  )
}
