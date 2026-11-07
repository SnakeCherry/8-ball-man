import { useState } from 'react'
import { PixelButton, PixelCard, Label } from './ui'
import { APP_NAME, AXIS_LABEL } from '../data/copy'
import { gutScore, gutShareText } from '../lib/gut'
import type { GutTally } from '../lib/gut'
import { AXES } from '../lib/scoring'
import { CountUp } from './CountUp'

/** The share-worthy stat: how well your gut reads real costs. */
export function GutCard({ gut }: { gut: GutTally }) {
  const score = gutScore(gut)
  const [note, setNote] = useState('')
  if (score.pct === null) return null

  const share = async () => {
    const text = gutShareText(APP_NAME, score, gut)
    try {
      if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(text)
        setNote('Copied. Paste it anywhere.')
      }
    } catch {
      // the share sheet was dismissed or clipboard blocked: nothing to do
    }
  }

  return (
    <PixelCard className="space-y-3 bg-lime">
      <Label className="[&>span]:bg-white">Your gut score</Label>
      <p className="num text-[56px] font-semibold leading-none">
        <CountUp value={score.pct} format={(n) => `${Math.round(n)}%`} delayMs={200} />
      </p>
      <p className="font-pixel text-[12px] uppercase">{score.tier}</p>
      <ul className="num grid grid-cols-3 gap-2 text-[15px]">
        {AXES.map((a) => (
          <li key={a} className="border-4 border-ink bg-white px-1 py-1 text-center leading-tight">
            {AXIS_LABEL[a].short}
            <br />
            <b>
              {gut[a].right}/{gut[a].total}
            </b>
          </li>
        ))}
      </ul>
      <p className="text-[14px]">From {score.guesses} guesses. Every one that missed taught you a number.</p>
      <PixelButton variant="white" data-fx="star" className="w-full" onClick={share}>
        Share my score
      </PixelButton>
      {note && (
        <p role="status" className="text-[14px]">
          {note}
        </p>
      )}
    </PixelCard>
  )
}
