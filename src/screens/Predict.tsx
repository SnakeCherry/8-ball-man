import { useEffect, useRef, useState } from 'react'
import { AXIS_ICON } from '../components/parts'
import { PixelCard, PixelIcon, Label } from '../components/ui'
import { AXIS_LABEL, PREDICT_PROMPT } from '../data/copy'
import { getDecision } from '../data/decisions'
import { AXES } from '../lib/scoring'
import { useAppStore } from '../store/useAppStore'

/** One question per screen: tap an answer and it moves on by itself. */
export function Predict() {
  const decisionId = useAppStore((s) => s.decisionId)
  const guesses = useAppStore((s) => s.guesses)
  const step = useAppStore((s) => s.guessStep)
  const setGuess = useAppStore((s) => s.setGuess)
  const setGuessStep = useAppStore((s) => s.setGuessStep)
  const go = useAppStore((s) => s.go)
  const [locked, setLocked] = useState(false)
  const timer = useRef<number>(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => setLocked(false), [step])

  if (!decisionId) return null
  const d = getDecision(decisionId)
  const axis = AXES[step]

  const pick = (optionId: string) => {
    if (locked) return
    setLocked(true)
    setGuess(axis, optionId)
    // let the tile's effect play, then move on
    timer.current = window.setTimeout(() => {
      if (step < AXES.length - 1) setGuessStep(step + 1)
      else go('reveal')
    }, 420)
  }

  return (
    <div className="space-y-6">
      <PixelCard>
        <Label>
          Question {step + 1} of {AXES.length}
        </Label>
        <p className="mt-2 text-[20px] leading-tight">
          {d.emoji} {d.title}
        </p>
        <p className="mt-1 text-[15px] text-ink/70">{d.blurb}</p>
        <div className="mt-3 flex gap-2" aria-hidden="true">
          {AXES.map((a, i) => (
            <span key={a} className={`h-3 flex-1 border-2 border-ink ${i < step ? 'bg-jade' : i === step ? 'bg-lime' : 'bg-white'}`} />
          ))}
        </div>
      </PixelCard>

      <section aria-label={AXIS_LABEL[axis].ask}>
        <p className="mb-4 flex items-center gap-3 font-pixel text-[14px] uppercase leading-6">
          <PixelIcon name={AXIS_ICON[axis]} size={4} />
          {AXIS_LABEL[axis].ask}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {d.options.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={guesses[axis] === o.id}
              data-fx={AXIS_ICON[axis]}
              data-emoji={o.emoji}
              disabled={locked && guesses[axis] !== o.id}
              onClick={() => pick(o.id)}
              className="pbox pselect flex min-h-[116px] flex-col items-center justify-center gap-2 px-1 py-4 text-center"
            >
              <span className="emoji-drive text-[34px] leading-none" aria-hidden="true">
                {o.emoji}
              </span>
              <span className="text-[15px] leading-tight">{o.name}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-[15px] text-ink/70">{PREDICT_PROMPT}</p>
      </section>
    </div>
  )
}
