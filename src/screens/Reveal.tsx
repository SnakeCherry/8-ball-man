import { useEffect, useRef, useState } from 'react'
import { PixelArt } from '../components/PixelArt'
import { CountUp } from '../components/CountUp'
import { Podium } from '../components/Podium'
import { PixelButton, PixelCard, PixelIcon, Label } from '../components/ui'
import { InfoPanel } from '../components/InfoPanel'
import { NextBar } from '../components/NextBar'
import { SavingBig } from '../components/SavingBig'
import { WarmupTrack } from '../components/WarmupTrack'
import { HOST_LINE } from '../data/copy'
import { getDecision } from '../data/decisions'
import { adviceFor, buildFacts, plainAdvice } from '../lib/advice'
import { gbp } from '../lib/format'
import { reducedMotion } from '../lib/fx'
import { BAND_LABEL, CLOSE, band, closeness, guessError, monthlyCost } from '../lib/guess'
import { nextStreak } from '../lib/gut'
import { isOneOff } from '../lib/habit'
import { habitLine } from '../lib/hook'
import { AXES } from '../lib/scoring'
import { isMuted, play, setMuted } from '../lib/sound'
import { speak, stopSpeaking } from '../lib/speech'
import { weightsText } from '../lib/mix'
import { suggestWith } from '../lib/suggest'
import { useAppStore } from '../store/useAppStore'

const AXIS_GAP = 0.8 // seconds between podiums

/** Results: our suggestion first, how your guess did, then a podium per axis. */
export function Reveal() {
  const decisionId = useAppStore((s) => s.decisionId)
  const guess = useAppStore((s) => s.guess)
  const session = useAppStore((s) => s.session)
  const usual = useAppStore((s) => s.usual)
  const weights = useAppStore((s) => s.weights)
  const streakStart = useAppStore((s) => s.streak)
  const go = useAppStore((s) => s.go)
  // tap anywhere to skip the staged reveal: every delay drops to zero
  const [skipped, setSkipped] = useState(false)
  const [compare, setCompare] = useState(false)
  const [scored, setScored] = useState(false)
  useEffect(() => {
    if (skipped || reducedMotion()) {
      setScored(true)
      return
    }
    const t = window.setTimeout(() => setScored(true), 900)
    return () => window.clearTimeout(t)
  }, [skipped])
  // the recommendation in plain English: instant from the numbers, then Qwen's wording once it has been checked against them
  const [advice, setAdvice] = useState('')
  useEffect(() => {
    if (!decisionId) return
    const dd = getDecision(decisionId)
    const facts = buildFacts(dd, suggestWith(dd, weights).weights, usual[dd.id] ?? dd.usualId)
    setAdvice(plainAdvice(facts))
    let live = true
    void adviceFor(facts).then((text) => live && setAdvice(text))
    return () => {
      live = false
    }
  }, [decisionId, weights, usual])

  // once the score lands, the host reads out the result (if you guessed) and then our suggestion
  const announced = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    if (!scored || announced.current || !decisionId) return
    announced.current = true
    const dd = getDecision(decisionId)
    const u = dd.options.find((o) => o.id === (usual[dd.id] ?? dd.usualId))!
    const sug = suggestWith(dd, weights)
    const facts = buildFacts(dd, sug.weights, usual[dd.id] ?? dd.usualId)
    const bnd = guess === null ? null : band(guessError(guess, monthlyCost(u, dd)))
    play(bnd === null || bnd === 'bullseye' || bnd === 'close' ? 'bullseye' : 'miss')
    void adviceFor(facts).then((text) => {
      if (!mounted.current) return
      const line = `We suggest ${sug.suggested.name}. ${text}`
      if (monthlyCost(u, dd) - monthlyCost(sug.suggested, dd) >= 0.5) play('sparkle') // good news first
      void speak(bnd === null ? line : `${HOST_LINE[bnd](gbp(monthlyCost(u, dd)))} ${line}`)
    })
  }, [scored, decisionId, guess, usual, weights])
  // leaving the screen stops the voice
  useEffect(
    () => () => {
      mounted.current = false
      stopSpeaking()
    },
    [],
  )
  if (!decisionId) return null

  const d = getDecision(decisionId)
  const usualOpt = d.options.find((o) => o.id === (usual[d.id] ?? d.usualId))!
  const truth = monthlyCost(usualOpt, d)
  // a decision made from speech has no guess: its "truth" is Qwen's estimate
  const err = guess === null ? 0 : guessError(guess, truth)
  const isClose = err <= CLOSE
  const b = band(err)
  const { suggested } = suggestWith(d, weights)
  const spoken = `We suggest ${suggested.name}. ${advice}`
  const gap = skipped ? 0 : AXIS_GAP
  const base = skipped ? 0 : 0.2
  const streakNow = scored ? nextStreak(streakStart, [isClose]) : streakStart
  const basis = weights ? `Based on your mix: ${weightsText(weights)}.` : 'Based on money, time and health counting equally.'
  // what the suggestion saves (or costs) against your usual
  const keep = suggested.id === usualOpt.id
  const delta = monthlyCost(usualOpt, d) - monthlyCost(suggested, d)

  return (
    <div className="space-y-8" onClick={skipped ? undefined : () => setSkipped(true)}>
      {session.length > 0 && (
        <p className="pcard bg-lime px-3 py-2 text-[17px] leading-snug">
          Done with <b>{getDecision(session.at(-1)!.decisionId).title}</b>: you chose{' '}
          <b>{getDecision(session.at(-1)!.decisionId).options.find((o) => o.id === session.at(-1)!.optionId)?.name}</b>. Now <b>{d.title}</b>.
        </p>
      )}

      {/* 1. the answer: the one thing to read first */}
      <PixelCard className="space-y-6 bg-lime p-6 sm:p-8">
        <div className="flex items-center justify-between gap-2">
          <Label className="[&>span]:bg-white">1 · The answer</Label>
          <PixelButton
            variant="white"
            className="!min-h-[44px] !px-3 !py-1 text-[14px]"
            aria-label="Hear our suggestion"
            onClick={(e) => {
              e.stopPropagation()
              if (isMuted()) setMuted(false)
              if (delta >= 0.5) play('sparkle')
              void speak(spoken)
            }}
          >
            <span className="flex items-center gap-2">
              <PixelIcon name="volume" size={2} />
              Hear it
            </span>
          </PixelButton>
        </div>
        <div className="grid items-start gap-6 md:grid-cols-[1fr_auto]">
          <div className="max-w-[62ch] space-y-4">
            <p className="flex items-center gap-3 text-[clamp(26px,3.2vw,36px)] leading-tight">
              <PixelArt name={suggested.icon} size={5} />
              <b>{suggested.name}</b>
            </p>
            <p className="text-[18px] leading-relaxed" aria-live="polite">
              {advice}
            </p>
            <p className="text-[14px] text-muted">{basis} You can change that on the next screen.</p>
          </div>
          <div className="border-4 border-ink bg-white p-4 md:min-w-[280px]">
            <SavingBig delta={delta} once={isOneOff(d)} keep={keep} />
          </div>
        </div>
      </PixelCard>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        {/* 2. your habit: what it costs now */}
        {guess === null ? (
          <PixelCard className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>2 · Your habit</Label>
              <span className="border-4 border-ink bg-white px-1 font-pixel text-[12px] uppercase">Estimate</span>
            </div>
            <p className="text-[20px]">
              <PixelArt name={d.icon} size={2} /> {d.title}
            </p>
            <p className="num text-[44px] font-semibold leading-none">
              <CountUp value={truth} format={gbp} delayMs={skipped ? 0 : 300} /> <span className="text-[20px] font-normal">{isOneOff(d) ? 'once' : 'a month'}</span>
            </p>
            <p className="text-[14px] text-muted">
              {isOneOff(d) ? `${usualOpt.name}, a one-off` : `${usualOpt.name}, about ${d.timesPerMonth} times a month`}
            </p>
            {scored && <p className="anim-pop text-[16px] leading-snug">{habitLine(d, usualOpt)}</p>}
          </PixelCard>
        ) : (
          <PixelCard className="space-y-2">
            <Label>2 · Your guess vs the real number</Label>
            <p className="text-[20px]">
              <PixelArt name={d.icon} size={2} /> {d.title}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[14px] text-muted">You guessed</p>
                <p className="num text-[32px] leading-none">{gbp(guess)}</p>
              </div>
              <div>
                <p className="text-[14px] text-muted">Real, a month</p>
                <p className="num text-[32px] font-semibold leading-none">
                  <CountUp value={truth} format={gbp} delayMs={skipped ? 0 : 300} />
                </p>
              </div>
            </div>
            {scored && (
              <p className="anim-pop flex flex-wrap items-center gap-2 text-[16px]">
                <span
                  className={`flex items-center gap-1 border-4 border-ink px-1 font-pixel text-[12px] uppercase ${
                    isClose ? 'bg-lime' : b === 'near' ? 'bg-white' : 'bg-red'
                  }`}
                >
                  <PixelIcon name={isClose ? 'check' : 'cross'} size={2} />
                  {BAND_LABEL[b]}
                </span>
                <span className="num">{err === 0 ? 'Spot on.' : `${gbp(Math.abs(guess - truth))} too ${guess > truth ? 'high' : 'low'}.`}</span>
              </p>
            )}
            <WarmupTrack pos={scored ? closeness(err) : 0} goalIcon="flag" mood={scored ? (isClose ? 'hop' : 'shake') : null} moodKey={scored ? 1 : 0} />
            <p className="num text-[14px]">Close guesses in a row: {streakNow}</p>
          </PixelCard>
        )}

        {/* 3. where to look: links for the suggested option first */}
        <InfoPanel decision={d} focusId={suggested.id} />
      </div>

      {/* 4. the full comparison, tucked away until you want it */}
      <section aria-label="Compare everything">
        <button
          type="button"
          aria-expanded={compare}
          onClick={(e) => {
            e.stopPropagation()
            setCompare((v) => !v)
          }}
          className="pbtn pbtn-white w-full"
        >
          {compare ? 'Hide the comparison' : '4 · Compare every option'}
        </button>
        {compare && (
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {AXES.map((axis, i) => (
              <Podium key={axis} options={d.options} axis={axis} usual={usualOpt} delay={base + i * gap} oneOff={isOneOff(d)} />
            ))}
          </div>
        )}
      </section>
      <NextBar>
        <PixelButton className="w-full" data-fx="star" onClick={() => go('priority')}>
          Next: what matters this week?
        </PixelButton>
      </NextBar>
    </div>
  )
}
