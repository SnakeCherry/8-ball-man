import { useState } from 'react'
import { PixelBar, PixelButton, PixelCard, PixelIcon, Label, Title } from '../components/ui'
import { APP_NAME, TAGLINE } from '../data/copy'
import {
  HEALTH_DUEL_POINTS,
  HEALTH_START,
  TIME_DUEL_MINUTES,
  TIME_START,
  healthDuelPrice,
  midpoint,
  refine,
  timeDuelPrice,
} from '../lib/exchangeRates'
import type { Bounds } from '../lib/exchangeRates'
import { gbp } from '../lib/format'
import { useAppStore } from '../store/useAppStore'

const TIME_ROUNDS = 3
const HEALTH_ROUNDS = 2
const DUELS = TIME_ROUNDS + HEALTH_ROUNDS
const MONEY_STEP = DUELS + 1

/** Replays yes/no answers into a narrowed range, so Back can simply drop an answer. */
function replay(start: Bounds, answers: boolean[]): Bounds {
  return answers.reduce((b, yes) => refine(b, midpoint(b), yes), start)
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="pbtn pbtn-white !min-h-[44px] !px-3 !py-2" aria-label={label}>
      <PixelIcon name="back" size={2} />
      Back
    </button>
  )
}

export function Onboarding() {
  const finish = useAppStore((s) => s.finishOnboarding)
  const loadDemo = useAppStore((s) => s.loadDemo)

  // 0 welcome, 1..DUELS duels, MONEY_STEP money left
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [money, setMoney] = useState(25)

  const timeAnswers = answers.slice(0, TIME_ROUNDS)
  const healthAnswers = answers.slice(TIME_ROUNDS, DUELS)
  const timeB = replay(TIME_START, timeAnswers)
  const healthB = replay(HEALTH_START, healthAnswers)
  const timeRate = midpoint(timeB)
  const healthRate = midpoint(healthB)

  const goBack = () => {
    // going back to duel n forgets duel n's answer, so you can re-answer it
    if (step <= MONEY_STEP) setAnswers((a) => a.slice(0, Math.max(0, step - 2)))
    setStep((s) => s - 1)
  }

  if (step === 0) {
    return (
      <div className="space-y-6">
        <PixelCard className="anim-slide">
          <Title>{APP_NAME}</Title>
          <p className="mt-3 text-[19px]">{TAGLINE}</p>
          <p className="mt-3">
            Pick an everyday choice, guess the numbers, then see the real cost, time and CO₂. Along the way you'll
            find out what matters to you.
          </p>
        </PixelCard>
        <PixelCard>
          <Label>First, five quick questions</Label>
          <p className="mt-2">They work out what your time and your health are worth to you. It takes about 30 seconds.</p>
          <PixelButton className="mt-4 w-full" onClick={() => setStep(1)}>
            Start (30 sec)
          </PixelButton>
        </PixelCard>
        <PixelButton variant="white" className="w-full" onClick={loadDemo}>
          Skip setup with a demo profile
        </PixelButton>
      </div>
    )
  }

  if (step <= DUELS) {
    const isTime = step <= TIME_ROUNDS
    const answer = (yes: boolean) => {
      setAnswers((a) => [...a.slice(0, step - 1), yes])
      setStep(step + 1)
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BackButton onClick={goBack} label="Back to the previous question" />
          <PixelBar value={(step - 1) / DUELS} className="flex-1" />
        </div>
        <PixelCard key={step} className="anim-slide">
          <Label>
            Question {step} of {DUELS}
          </Label>
          {isTime ? (
            <>
              <p className="mt-3 text-[22px] leading-tight">
                Would you pay <b className="num">{gbp(timeDuelPrice(timeB))}</b> to get {TIME_DUEL_MINUTES} minutes back?
              </p>
              <p className="mt-2 text-ink/70">Say, taking the quicker way home when you're tired.</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-[22px] leading-tight">
                Would you pay <b className="num">{gbp(healthDuelPrice(healthB))}</b> extra for a choice that is {HEALTH_DUEL_POINTS} points healthier?
              </p>
              <p className="mt-2 text-ink/70">Say, cooking a proper meal instead of ordering a takeaway.</p>
            </>
          )}
          <div className="mt-5 grid gap-3">
            <PixelButton onClick={() => answer(true)}>Yes, I'd pay that</PixelButton>
            <PixelButton variant="white" onClick={() => answer(false)}>
              No, not worth it
            </PixelButton>
          </div>
        </PixelCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BackButton onClick={goBack} label="Back to the last question" />
      <PixelCard className="anim-pop">
        <Label>What we learned</Label>
        <p className="mt-2 text-[19px] leading-snug">
          Your time is worth about <b className="num">{gbp(timeRate)}</b> an hour to you.
        </p>
        <p className="mt-2">We'll use that to judge whether paying more to save time is good value. You can always overrule it.</p>
      </PixelCard>
      <PixelCard>
        <Label>One last thing</Label>
        <p className="mt-2 text-[22px] leading-tight">About how much money have you got left this week?</p>
        <p className="mt-2 text-ink/70">Only you see this. It helps us weigh cost properly when things are tight.</p>
        <div className="mt-5 grid grid-cols-4 gap-3" role="group" aria-label="Money left this week">
          {[10, 25, 50, 100].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={money === n}
              onClick={() => setMoney(n)}
              className="pbox-flat pselect py-3 text-center font-pixel text-[11px]"
            >
              {n === 100 ? '£100+' : `£${n}`}
            </button>
          ))}
        </div>
      </PixelCard>
      <PixelButton
        className="w-full"
        onClick={() => finish({ timeRate, healthRate, moneyLeft: money })}
      >
        Let's go
      </PixelButton>
    </div>
  )
}
