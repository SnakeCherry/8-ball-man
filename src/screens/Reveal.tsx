import { useEffect, useRef, useState } from 'react'
import { PixelArt } from '../components/PixelArt'
import { CountUp } from '../components/CountUp'
import { Podium } from '../components/Podium'
import { PixelButton, PixelCard, PixelIcon, Label } from '../components/ui'
import { TripRace } from '../components/TripRace'
import { WarmupTrack } from '../components/WarmupTrack'
import { HOST_LINE, PRIORITY_NAME } from '../data/copy'
import { getDecision } from '../data/decisions'
import { recommendationSentence } from '../lib/explain'
import { gbp } from '../lib/format'
import { reducedMotion } from '../lib/fx'
import { BAND_LABEL, CLOSE, band, closeness, guessError, monthlyCost } from '../lib/guess'
import { nextStreak } from '../lib/gut'
import { bestSwitch, habitLine } from '../lib/hook'
import { AXES } from '../lib/scoring'
import { isMuted, play, setMuted } from '../lib/sound'
import { speak, stopSpeaking } from '../lib/speech'
import { suggestFor } from '../lib/suggest'
import { moneyRatio, useAppStore } from '../store/useAppStore'

const AXIS_GAP = 1.0 // seconds between podiums

/** Results: our suggestion first, how your guess did, then a podium per axis. */
export function Reveal() {
  const decisionId = useAppStore((s) => s.decisionId)
  const guess = useAppStore((s) => s.guess)
  const goal = useAppStore((s) => s.goal)
  const usual = useAppStore((s) => s.usual)
  const priority = useAppStore((s) => s.priority)
  const vibeHistory = useAppStore((s) => s.vibeHistory)
  const moneyLeft = useAppStore((s) => s.moneyLeft)
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
  // once the score lands, the host reads out the result (if you guessed) and then our suggestion
  const announced = useRef(false)
  useEffect(() => {
    if (!scored || announced.current || !decisionId) return
    announced.current = true
    const dd = getDecision(decisionId)
    const u = dd.options.find((o) => o.id === (usual[dd.id] ?? dd.usualId))!
    const sug = suggestFor(dd, priority, vibeHistory, moneyRatio(moneyLeft))
    const line = `We suggest ${sug.suggested.name}. ${recommendationSentence(sug.ranking)}`
    if (guess === null) {
      play('bullseye')
      void speak(line)
    } else {
      const bnd = band(guessError(guess, monthlyCost(u, dd)))
      play(bnd === 'bullseye' || bnd === 'close' ? 'bullseye' : 'miss')
      void speak(`${HOST_LINE[bnd](gbp(monthlyCost(u, dd)))} ${line}`)
    }
  }, [scored, decisionId, guess, usual, priority, vibeHistory, moneyLeft])
  // leaving the screen stops the voice
  useEffect(() => () => stopSpeaking(), [])
  if (!decisionId) return null

  const d = getDecision(decisionId)
  const usualOpt = d.options.find((o) => o.id === (usual[d.id] ?? d.usualId))!
  const truth = monthlyCost(usualOpt, d)
  // a decision made from speech has no guess: its "truth" is Qwen's estimate
  const err = guess === null ? 0 : guessError(guess, truth)
  const sw = bestSwitch(d, usualOpt.id)
  const isClose = err <= CLOSE
  const b = band(err)
  const { suggested, ranking } = suggestFor(d, priority, vibeHistory, moneyRatio(moneyLeft))
  const spoken = `We suggest ${suggested.name}. ${recommendationSentence(ranking)}`
  const gap = skipped ? 0 : AXIS_GAP
  const base = skipped ? 0 : 0.9
  const streakNow = scored ? nextStreak(streakStart, [isClose]) : streakStart
  const basis =
    priority === 'balanced'
      ? 'Based on a bit of everything.'
      : `Based on putting ${PRIORITY_NAME[priority]} first${vibeHistory.length ? ', as you did last time' : ''}.`

  return (
    <div className="space-y-6" onClick={skipped ? undefined : () => setSkipped(true)}>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="space-y-6">
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
          {usualOpt.name}, about {d.timesPerMonth} times a month
        </p>
        <p className="num text-[44px] font-semibold leading-none">
          <CountUp value={truth} format={gbp} delayMs={skipped ? 0 : 300} /> <span className="text-[20px] font-normal">a month</span>
        </p>
        {scored && (
          <div className="anim-pop mt-3 space-y-2">
            <p className="text-[18px] leading-snug">{habitLine(d, usualOpt, goal)}</p>
            {sw && (
              <p className="text-[18px] leading-snug">
                <PixelArt name={sw.option.icon} size={2} /> {sw.option.name} would save about <b className="num">{gbp(sw.monthlyGBP)}</b> a month.
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
            <p className="text-[18px] leading-snug">{habitLine(d, usualOpt, goal)}</p>
          </div>
        )}

        <WarmupTrack
          pos={scored ? closeness(err) : 0}
          goalIcon={goal?.icon ?? 'flag'}
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
        <p className="text-[17px] leading-snug">{recommendationSentence(ranking)}</p>
        <p className="text-[14px] text-ink/70">{basis} You can change that on the next screen.</p>
        <PixelButton className="w-full" data-fx="star" onClick={() => go('priority')}>
          Next: what matters this week?
        </PixelButton>
      </PixelCard>
      </div>
      <PixelCard>
        <TripRace options={d.options} destination="flag" autoStart={scored} />
      </PixelCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {AXES.map((axis, i) => (
          <Podium key={axis} options={d.options} axis={axis} delay={base + i * gap} />
        ))}
      </div>
    </div>
  )
}
