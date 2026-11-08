import { useEffect, useState } from 'react'
import { PixelArt } from './PixelArt'
import { PixelCard, PixelIcon, Label } from './ui'
import { defaultInfo, fetchInfo, isSafeUrl } from '../lib/info'
import type { OptionInfo } from '../lib/info'
import type { Decision } from '../lib/types'

/**
 * Useful info for each option instead of a race: the shop's own website, three recipes, a route, where to look,
 * or a tip. Qwen picks what to look up; the links themselves are built in lib/info.ts from real, listed sites.
 */
export function InfoPanel({ decision }: { decision: Decision }) {
  const [infos, setInfos] = useState<OptionInfo[]>(() => decision.options.map(defaultInfo))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    setLoading(true)
    setInfos(decision.options.map(defaultInfo))
    void fetchInfo(decision, (i) => live && setInfos(i)).then((i) => {
      if (live) {
        setInfos(i)
        setLoading(false)
      }
    })
    return () => {
      live = false
    }
  }, [decision])

  return (
    <PixelCard className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Label>Useful info</Label>
        {loading && <span className="anim-blink font-pixel text-[9px] uppercase">Looking it up…</span>}
      </div>
      <ul className="space-y-4">
        {decision.options.map((o, i) => {
          const info = infos[i] ?? defaultInfo(o)
          const links = info.links.filter((l) => isSafeUrl(l.url))
          return (
            <li key={o.id} className="space-y-2 border-b-2 border-ink/15 pb-4 last:border-b-0 last:pb-0">
              <p className="flex flex-wrap items-center gap-2 text-[18px] leading-tight">
                <PixelArt name={o.icon} size={2} />
                <b>{o.name}</b>
                <span className="border-4 border-ink bg-white px-1 font-pixel text-[9px] uppercase">{info.label}</span>
              </p>
              {info.tip && <p className="text-[16px] leading-snug">{info.tip}</p>}
              {links.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {links.map((l) => (
                    <li key={l.url}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="pbox-flat pselect inline-flex items-center gap-2 px-2 py-1 text-[15px] leading-tight"
                      >
                        {l.title}
                        <PixelIcon name="arrow" size={2} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-[13px] text-ink/60">Links open in a new tab. Prices and times can change, so check before you go.</p>
    </PixelCard>
  )
}
