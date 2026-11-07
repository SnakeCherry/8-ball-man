import { GutCard } from '../components/GutCard'
import { VibeChips } from '../components/parts'
import { PixelButton, PixelCard, PixelIcon, Label, Title } from '../components/ui'
import { AXIS_LABEL, EMPTY_HISTORY, PRIORITY_CHIPS } from '../data/copy'
import { BADGES } from '../lib/badges'
import { gbp, mins, round1 } from '../lib/format'
import { AXES } from '../lib/scoring'
import { useAppStore } from '../store/useAppStore'

export function Recap() {
  const { history, badges, gut, priority } = useAppStore()
  const setPriority = useAppStore((s) => s.setPriority)
  const go = useAppStore((s) => s.go)

  const saved = history.reduce((s, h) => s + h.savedGBP, 0)
  const minutes = history.reduce((s, h) => s + h.minutesSaved, 0)
  const split = PRIORITY_CHIPS.map((c) => ({ ...c, n: history.filter((h) => h.priority === c.id).length }))
  const maxSplit = Math.max(1, ...split.map((s) => s.n))

  if (!history.length) {
    return (
      <PixelCard className="space-y-4">
        <Title>Your recap</Title>
        <p>{EMPTY_HISTORY}</p>
        <PixelButton onClick={() => go('home')}>Pick a decision</PixelButton>
      </PixelCard>
    )
  }

  return (
    <div className="space-y-6">
      <Title>Your recap</Title>

      <GutCard gut={gut} />

      <div className="grid grid-cols-2 gap-3">
        <PixelCard>
          <Label>vs your usual</Label>
          <p className="num mt-2 text-[24px]">
            {saved >= 0 ? '+' : '−'}
            {gbp(saved)}
          </p>
        </PixelCard>
        <PixelCard>
          <Label>Time</Label>
          <p className="num mt-2 text-[24px]">
            {minutes >= 0 ? '+' : '−'}
            {mins(minutes)}
          </p>
          <p className="text-[13px]">{minutes >= 0 ? 'bought back' : 'spent'}</p>
        </PixelCard>
      </div>
      <p className="-mt-3 text-[14px] text-ink/70">
        Across {history.length} choices, measured against your usual option for each.
      </p>

      <PixelCard>
        <Label>What you put first</Label>
        <ul className="mt-3 space-y-2">
          {split.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-[15px]">
              <span className="w-28 shrink-0 leading-tight">{s.label.replace(' this week', '')}</span>
              <span className="h-4 border-2 border-ink bg-white" style={{ width: `${(s.n / maxSplit) * 100}%`, minWidth: s.n ? 8 : 0 }}>
                <span className="block h-full bg-jade" />
              </span>
              <span className="num">{s.n}</span>
            </li>
          ))}
        </ul>
      </PixelCard>

      <PixelCard>
        <Label>Your gut, by axis</Label>
        <ul className="mt-3 space-y-1 text-[16px]">
          {AXES.map((a) => (
            <li key={a} className="num flex justify-between">
              <span>{AXIS_LABEL[a].short}</span>
              <span>
                {gut[a].right} / {gut[a].total}
                {gut[a].total ? ` (${round1((gut[a].right / gut[a].total) * 100)}%)` : ''}
              </span>
            </li>
          ))}
        </ul>
      </PixelCard>

      <div>
        <Title className="mb-3">Badges</Title>
        <div className="grid grid-cols-2 gap-3">
          {BADGES.map((b) => {
            const got = badges.includes(b.id)
            return (
              <PixelCard key={b.id} className={got ? 'bg-lime' : 'bg-white opacity-60'}>
                <PixelIcon name={got ? b.icon : 'lock'} size={4} color={got ? '#0a0a0a' : '#555'} />
                <p className="mt-2 text-[16px] leading-tight">{b.name}</p>
                <p className="mt-1 text-[13px] leading-tight">{b.line}</p>
              </PixelCard>
            )
          })}
        </div>
      </div>

      <PixelCard>
        <Label className="mb-2">Next week's vibe</Label>
        <p className="mb-4 text-[14px] text-ink/70">Your next decision starts with this selected. You can still change it.</p>
        <VibeChips value={priority} onChange={setPriority} />
      </PixelCard>

      <PixelButton className="w-full" onClick={() => go('home')}>
        Pick a decision
      </PixelButton>
    </div>
  )
}
