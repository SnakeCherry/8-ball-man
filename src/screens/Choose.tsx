import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PixelArt } from '../components/PixelArt'
import { PriorityMixer } from '../components/PriorityMixer'
import { PixelButton, PixelCard, Label, Title } from '../components/ui'
import { PRIORITY_NAME } from '../data/copy'
import { getDecision } from '../data/decisions'
import { adviceFor, buildFacts, plainAdvice } from '../lib/advice'
import { suggestFor } from '../lib/suggest'
import { moneyRatio, useAppStore } from '../store/useAppStore'

/** The priority screen: slide money, time and health to say what matters, watch the options re-rank, then take one. */
export function Choose() {
  const decisionId = useAppStore((s) => s.decisionId)
  const priority = useAppStore((s) => s.priority)
  const weights = useAppStore((s) => s.weights)
  const vibeHistory = useAppStore((s) => s.vibeHistory)
  const moneyLeft = useAppStore((s) => s.moneyLeft)
  const usual = useAppStore((s) => s.usual)
  const setWeights = useAppStore((s) => s.setWeights)
  const setUsual = useAppStore((s) => s.setUsual)
  const commit = useAppStore((s) => s.commitChoice)
  const [manual, setManual] = useState<string | null>(null)
  const [showUsual, setShowUsual] = useState(false)
  const [advice, setAdvice] = useState('')

  const d = decisionId ? getDecision(decisionId) : null
  const sug = d ? suggestFor(d, priority, vibeHistory, moneyRatio(moneyLeft), weights) : null
  const effective = weights ?? sug?.blend.weights ?? null
  const adviceKey = d && effective ? `${d.id}|${effective.cost.toFixed(2)}|${effective.time.toFixed(2)}|${effective.health.toFixed(2)}` : ''

  // the plain-English line is instant and always right; Qwen's wording replaces it a moment after you stop sliding
  useEffect(() => {
    if (!d || !effective) return
    const facts = buildFacts(d, effective)
    setAdvice(plainAdvice(facts))
    let live = true
    const t = window.setTimeout(() => void adviceFor(facts).then((text) => live && setAdvice(text)), 650)
    return () => {
      live = false
      window.clearTimeout(t)
    }
    // adviceKey captures everything the facts depend on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adviceKey])

  if (!d || !sug || !effective) return null
  const { blend, suggested } = sug
  const usualId = usual[d.id] ?? d.usualId
  const usualOpt = d.options.find((o) => o.id === usualId)!
  // the best fit is preselected until the student picks something else themselves
  const selected = d.options.find((o) => o.id === (manual ?? suggested.id)) ?? suggested
  const last = vibeHistory.at(-1)

  const notes: string[] = []
  if (last) notes.push(`Last time you put ${PRIORITY_NAME[last]} first.`)
  if (blend.historyShifted) notes.push("Your past choices lean that way a little, so we've started the sliders there.")
  if (blend.moneyNudged) notes.push('Money left is low, so money starts a bit higher.')

  return (
    <div className="page-fill-flow lg:grid lg:grid-cols-[3fr_2fr] lg:items-start lg:gap-12">
      <section aria-labelledby="step-priority" className="min-w-0">
        <Title className="mb-1">
          <span id="step-priority">What matters most to you this week?</span>
        </Title>
        <p className="mb-4 text-[15px] text-ink/70">Slide each one. The options re-rank as you go.</p>
        <PriorityMixer
          key={d.id}
          options={d.options}
          weights={effective}
          selectedId={selected.id}
          onSelect={setManual}
          onChange={(w) => {
            setWeights(w)
            setManual(null)
          }}
        />
      </section>

      <div className="min-w-0 space-y-6 lg:sticky lg:top-6">
        <PixelCard className="space-y-3 bg-white">
          <Label>Our suggestion</Label>
          <p className="flex items-center gap-3 text-[24px] leading-tight">
            <PixelArt name={suggested.icon} size={3} />
            {suggested.name}
          </p>
          <p className="text-[18px] leading-snug" aria-live="polite">
            {advice}
          </p>
          {notes.length > 0 && <p className="text-[14px] text-ink/70">{notes.join(' ')}</p>}
        </PixelCard>

        <div>
          <button type="button" aria-expanded={showUsual} onClick={() => setShowUsual((v) => !v)} className="pbtn pbtn-white w-full">
            {showUsual ? 'Hide usual' : `Your usual: ${usualOpt.name}`}
          </button>
          {showUsual && (
            <div className="mt-3 text-[15px]">
              <p>We measure your savings against your usual. Change it if it isn't right.</p>
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
          )}
        </div>
      </div>

      {/* portalled: the screen wrapper animates a transform, which would trap a fixed child */}
      {createPortal(
        <div className="fixed inset-x-0 bottom-0 z-10 border-t-4 border-ink bg-white p-3">
          <div className="mx-auto max-w-md">
            <PixelButton className="w-full" data-fx="pound" onClick={() => commit(selected.id)}>
              {selected.id === suggested.id ? `Take ${selected.name}` : `Choose ${selected.name}`}
            </PixelButton>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
