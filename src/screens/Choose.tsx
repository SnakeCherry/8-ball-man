import { useState } from 'react'
import { createPortal } from 'react-dom'
import { OptionStats } from '../components/parts'
import { PixelButton, PixelCard, Label, Title } from '../components/ui'
import type { SpriteName } from '../components/ui'
import { PRIORITY_CHIPS, PRIORITY_NAME } from '../data/copy'
import { getDecision } from '../data/decisions'
import { recommendationSentence } from '../lib/explain'
import { gbp, mins } from '../lib/format'
import { blendWeights, rank } from '../lib/scoring'
import type { Option, Priority } from '../lib/types'
import { moneyRatio, useAppStore } from '../store/useAppStore'

const CHIPS = PRIORITY_CHIPS.filter((c) => c.id !== 'balanced')
const CHIP_FX: Record<string, SpriteName> = { money: 'pound', time: 'clock', footprint: 'leaf' }

/** `delay` (seconds) holds the bar until the numbers above have finished revealing. */
export function Choose({ delay = 0, ready = true }: { delay?: number; ready?: boolean }) {
  const { decisionId, priority, vibeHistory, moneyLeft, usual } = useAppStore()
  const setPriority = useAppStore((s) => s.setPriority)
  const setUsual = useAppStore((s) => s.setUsual)
  const commit = useAppStore((s) => s.commitChoice)
  const [manual, setManual] = useState<string | null>(null)
  const [showOthers, setShowOthers] = useState(false)
  if (!decisionId) return null

  const d = getDecision(decisionId)
  const usualId = usual[d.id] ?? d.usualId
  const usualOpt = d.options.find((o) => o.id === usualId)!
  const blend = blendWeights(priority, vibeHistory, moneyRatio(moneyLeft))
  const ranking = rank(d.options, blend.weights)
  const suggested = ranking.ranked[0].option
  const others = ranking.ranked.slice(1).map((r) => r.option)
  // the suggestion is preselected until the user picks something else themselves
  const selected = d.options.find((o) => o.id === (manual ?? suggested.id)) ?? suggested
  const last = vibeHistory.at(-1)

  const notes: string[] = []
  if (last) notes.push(`Last time you chose ${PRIORITY_NAME[last]}.`)
  if (blend.historyShifted) notes.push("Your past choices lean that way a little, so we've weighed it in.")
  if (blend.moneyNudged) notes.push('Money left is low, so cost counts for a bit more.')

  const changePriority = (p: Priority) => {
    // tapping the active chip again means "a bit of everything"
    setPriority(priority === p ? 'balanced' : p)
    setManual(null)
  }

  const card = (o: Option, badge?: string) => {
    const delta = usualOpt.costGBP - o.costGBP
    const dTime = usualOpt.timeMin - o.timeMin
    return (
      <button
        key={o.id}
        type="button"
        aria-pressed={selected.id === o.id}
        data-fx="pound"
        data-emoji={o.emoji}
        onClick={() => setManual(o.id)}
        className="pbox pselect p-3"
      >
        <div className="flex items-start justify-between gap-2 pr-5">
          <p className="text-[20px] leading-tight">
            <span className="emoji-drive" aria-hidden="true">
              {o.emoji}
            </span>{' '}
            {o.name}
          </p>
          {badge && (
            <span className="shrink-0 border-4 border-ink bg-white px-1 font-pixel text-[9px] uppercase">{badge}</span>
          )}
        </div>
        <OptionStats option={o} />
        <p className="num mt-2 text-[14px]">
          {o.id === usualId
            ? 'Your usual'
            : `vs your usual: ${delta >= 0 ? '−' : '+'}${gbp(delta)}, ${mins(dTime)} ${dTime >= 0 ? 'faster' : 'slower'}`}
        </p>
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="step-priority">
        <Title className="mb-1">
          <span id="step-priority">What matters this week?</span>
        </Title>
        <p className="mb-3 text-[15px] text-ink/70">Tap one. Tap it again for a bit of everything.</p>
        <div className="grid grid-cols-3 gap-3" role="group" aria-label="What matters this week">
          {CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={priority === c.id}
              data-fx={CHIP_FX[c.id]}
              onClick={() => changePriority(c.id)}
              className="pbox-flat pselect px-1 py-3 text-center text-[15px] leading-tight"
            >
              {c.id === 'money' ? 'Money' : c.id === 'time' ? 'Time' : 'Footprint'}
            </button>
          ))}
        </div>
        {notes.length > 0 && <p className="mt-3 text-[15px] text-ink/80">{notes.join(' ')}</p>}
      </section>

      <section aria-label="Our suggestion" className="space-y-3">
        <PixelCard>
          <Label>Our suggestion</Label>
          <p className="mt-2 text-[19px] leading-snug">{recommendationSentence(ranking)}</p>
        </PixelCard>
        {card(suggested, ranking.close ? 'Close call' : 'Best fit')}
      </section>

      <div>
        <button
          type="button"
          aria-expanded={showOthers}
          onClick={() => setShowOthers((v) => !v)}
          className="pbtn pbtn-white w-full"
        >
          {showOthers ? 'Hide other options' : 'See other options'}
        </button>

        {showOthers && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4">{others.map((o) => card(o))}</div>
            <div className="text-[15px]">
              <p>
                Your usual for this: <b>{usualOpt.name}</b>. We measure your savings against it.
              </p>
              <div className="mt-2 grid grid-cols-3 gap-3" role="group" aria-label="Change your usual option">
                {d.options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={usualId === o.id}
                    onClick={() => setUsual(d.id, o.id)}
                    className="pbox-flat pselect px-1 py-2 text-center text-[13px] leading-tight"
                  >
                    {o.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* portalled: the screen wrapper animates a transform, which would trap a fixed child */}
      {createPortal(
        <div
          className="anim-slide fixed inset-x-0 bottom-0 z-10 border-t-4 border-ink bg-white p-3"
          style={{ animationDelay: `${delay}s` }}
        >
          <div className="mx-auto max-w-md">
            <PixelButton className="w-full" data-fx="pound" disabled={!ready} onClick={() => commit(selected.id)}>
              {selected.id === suggested.id ? `Take ${selected.name}` : `Choose ${selected.name}`}
            </PixelButton>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
