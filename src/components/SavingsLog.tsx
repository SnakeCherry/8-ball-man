import { PixelArt } from './PixelArt'
import { PixelCard, Label } from './ui'
import { gbp, timeSavedText } from '../lib/format'
import { ago } from '../lib/recap'
import type { Entry } from '../lib/recap'

/** The choices that moved the goal, newest first. */
export function SavingsLog({ entries, limit = 6 }: { entries: Entry[]; limit?: number }) {
  const rows = [...entries].reverse().slice(0, limit)
  return (
    <PixelCard>
      <Label>What moved the goal</Label>
      {rows.length === 0 ? (
        <p className="mt-3 text-[16px] text-ink/70">Nothing yet. Your first choice will show up here.</p>
      ) : (
        <ul className="mt-3 divide-y-2 divide-ink/15">
          {rows.map((e) => {
            const saved = e.record.savedGBP
            return (
              <li key={`${e.record.at}-${e.record.decisionId}`} className="flex items-center gap-3 py-2">
                <span className="grid h-[44px] w-[44px] shrink-0 place-items-center border-4 border-ink bg-white" aria-hidden="true">
                  <PixelArt name={e.chosen.icon} size={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] leading-tight">{e.chosen.name}</span>
                  <span className="block truncate text-[13px] text-ink/70">
                    {e.chosen.id === e.usual.id ? 'Your usual' : `instead of ${e.usual.name}`} · {ago(e.record.at)}
                  </span>
                </span>
                <span className="num hidden text-right text-[14px] leading-tight sm:block">
                  <span className="block">{timeSavedText(e.record.minutesSaved)}</span>
                  <span className="block text-ink/70">
                    {e.healthDelta >= 0 ? '+' : '−'}
                    {Math.abs(e.healthDelta)} health
                  </span>
                </span>
                <span
                  className={`num min-w-[74px] border-4 border-ink px-1 py-1 text-center text-[16px] font-semibold ${
                    saved > 0.005 ? 'bg-lime' : saved < -0.005 ? 'bg-red' : 'bg-white'
                  }`}
                >
                  {saved > 0.005 ? '+' : saved < -0.005 ? '−' : ''}
                  {gbp(saved)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </PixelCard>
  )
}
