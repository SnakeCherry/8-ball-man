import { useEffect, useRef, useState } from 'react'
import { PixelArt } from '../components/PixelArt'
import { CountUp } from '../components/CountUp'
import { Podium } from '../components/Podium'
import { PixelButton, PixelCard, PixelIcon, Label } from '../components/ui'
import { InfoPanel } from '../components/InfoPanel'
import { WarmupTrack } from '../components/WarmupTrack'
import { HOST_LINE } from '../data/copy'
import { getDecision } from '../data/decisions'
import { adviceFor, buildFacts, plainAdvice } from '../lib/advice'
import { gbp } from '../lib/format'
import { reducedMotion } from '../lib/fx'
import { BAND_LABEL, CLOSE, band, closeness, guessError, monthlyCost } from '../lib/guess'
import { nextStreak } from '../lib/gut'
import { perMonth, isOneOff } from '../lib/habit'
import { bestSwitch, habitLine } from '../lib/hook'
import { AXES } from '../lib/scoring'
import { isMuted, play, setMuted } from '../lib/sound'
import { speak, stopSpeaking } from '../lib/speech'
import { weightsText } from '../lib/mix'
import { suggestWith } from '../lib/suggest'
import { useAppStore } from '../store/useAppStore'

const AXIS_GAP = 1.0 // seconds between podiums

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
    const facts = buildFacts(dd, suggestWith(dd, weights).weights)
    setAdvice(plainAdvice(facts))
    let live = true
    void adviceFor(facts).then((text) => live && setAdvice(text))
    return () => {
      live = false
    }
  }, [decisionId, weights])

  // once the score lands, the host reads out the result (if you guessed) and then our suggestion
  const announced = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    if (!scored || announced.current || !decisionId) return
    announced.current = true
    const dd = getDecision(decisionId)
    const u = dd.options.find((o) => o.id === (usual[dd.id] ?? dd.usualId))!
    const sug = suggestWith(dd, weights)
    const facts = buildFacts(dd, sug.weights)
    const bnd = guess === null ? null : band(guessError(guess, monthlyCost(u, dd)))
    play(bnd === null || bnd === 'bullseye' || bnd === 'close' ? 'bullseye' : 'miss')
    void adviceFor(facts).then((text) => {
      if (!mounted.current) return
      const line = `We suggest ${sug.suggested.name}. ${text}`
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
  const sw = bestSwitch(d, usualOpt.id)
  const isClose = err <= CLOSE
  const b = band(err)
  const { suggested } = suggestWith(d, weights)
  const spoken = `We suggest ${suggested.name}. ${advice}`
  const gap = skipped ? 0 : AXIS_GAP
  const base = skipped ? 0 : 0.9
  const streakNow = scored ? nextStreak(streakStart, [isClose]) : streakStart
  const basis = weights ? `Based on your mix: ${weightsText(weights)}.` : 'Based on money, time and health counting equally.'

  return (
    <div className="page-fill-flow justify-between" onClick={skipped ? undefined : () => setSkipped(true)}>
      {session.length > 0 && (
        <PixelCard className="bg-lime">
          <p className="text-[19px] leading-snug">
            Done with <b>{getDecision(session.at(-1)!.decisionId).title}</b>: you chose{' '}
            <b>{getDecision(session.at(-1)!.decisionId).options.find((o) => o.id === session.at(-1)!.optionId)?.name}</b>. Now{' '}
            <b>{d.title}</b>.
          </p>
        </PixelCard>
      )}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
      <div className="flex flex-col gap-6 [&>:last-child]:flex-1">
      {guess === null ? (
      <PixelCard>
        <div className="flex items-center justify-between gap-2">
          <Label>Your habit</Label>
          <span className="border-4 border-ink bg-white px-1 font-pixel text-[9px] uppercase">Estimate</span>
        </div>
        <p className="mt-2 text-[20px]">
          <PixelArt name={d.icon} size={2} /> {d.title}
        </p>
        <p className="mt-3 text-[14px] text-ink/70">
          {isOneOff(d) ? `${usualOpt.name}, a one-off` : `${usualOpt.name}, about ${d.timesPerMonth} times a month`}
        </p>
        <p className="num text-[44px] font-semibold leading-none">
          <CountUp value={truth} format={gbp} delayMs={skipped ? 0 : 300} /> <span className="text-[20px] font-normal">{isOneOff(d) ? 'once' : 'a month'}</span>
        </p>
        {scored && (
          <div className="anim-pop mt-3 space-y-2">
            <p className="text-[18px] leading-snug">{habitLine(d, usualOpt)}</p>
            {sw && (
              <p className="text-[18px] leading-snug">
                <PixelArt name={sw.option.icon} size={2} /> {sw.option.name} would save about <b className="num">{gbp(sw.monthlyGBP)}</b>{perMonth(d)}.
              </p>
            )}
          </div>
        )}
      </PixelCard>
      ) : (
      <PixelCard>
        <Label>Your guess vs the real number</Label>
        <p className="mt-2 text-[20px]">
          <PixelArt name={d.icon} size={2} /> {d.title}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[14px] text-ink/70">You guessed</p>
            <p className="num text-[32px] leading-none">{gbp(guess)}</p>
          </div>
          <div>
            <p className="text-[14px] text-ink/70">Real, a month</p>
            <p className="num text-[32px] font-semibold leading-none">
              <CountUp value={truth} format={gbp} delayMs={skipped ? 0 : 300} />
            </p>
          </div>
        </div>

        {scored && (
          <div className="anim-pop mt-3 space-y-2">
            <p className="flex flex-wrap items-center gap-2 text-[16px]">
              <span
                className={`flex items-center gap-1 border-4 border-ink px-1 font-pixel text-[10px] uppercase ${
                  isClose ? 'bg-lime' : b === 'near' ? 'bg-white' : 'bg-red'
                }`}
              >
                <PixelIcon name={isClose ? 'check' : 'cross'} size={2} />
                {BAND_LABEL[b]}
              </span>
              <span className="num">
                {err === 0 ? 'Spot on.' : `${gbp(Math.abs(guess - truth))} too ${guess > truth ? 'high' : 'low'}.`}
              </span>
            </p>
            <p className="text-[18px] leading-snug">{habitLine(d, usualOpt)}</p>
          </div>
        )}

        <WarmupTrack
          pos={scored ? closeness(err) : 0}
          goalIcon="flag"
          mood={scored ? (isClose ? 'hop' : 'shake') : null}
          moodKey={scored ? 1 : 0}
        />
        <p className="num mt-2 text-[15px]">Close guesses in a row: {streakNow}</p>
      </PixelCard>
      )}
      <PixelCard className="space-y-3 bg-white">
        <div className="flex items-center justify-between gap-2">
          <Label>Our suggestion</Label>
          <PixelButton
            variant="white"
            className="!min-h-[36px] !px-3 !py-1 text-[13px]"
            aria-label="Hear our suggestion"
            onClick={(e) => {
              e.stopPropagation()
              if (isMuted()) setMuted(false)
              void speak(spoken)
            }}
          >
            <span className="flex items-center gap-2">
              <PixelIcon name="volume" size={2} />
              Hear it
            </span>
          </PixelButton>
        </div>
        <p className="flex items-center gap-3 text-[26px] leading-tight">
          <PixelArt name={suggested.icon} size={4} />
          {suggested.name}
        </p>
        <p className="text-[17px] leading-snug" aria-live="polite">
          {advice}
        </p>
        <p className="text-[14px] text-ink/70">{basis} You can change that on the next screen.</p>
        <PixelButton className="w-full" data-fx="star" onClick={() => go('priority')}>
          Next: what matters this week?
        </PixelButton>
      </PixelCard>
      </div>
      <InfoPanel decision={d} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {AXES.map((axis, i) => (
          <Podium key={axis} options={d.options} axis={axis} delay={base + i * gap} oneOff={isOneOff(d)} />
        ))}
      </div>
    </div>
  )
}
