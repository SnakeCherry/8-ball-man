import { useEffect, useState } from 'react'

export const BARS = 14

/** Pixel equaliser: newest level on the right, older ones scroll left. */
export function Equaliser({ levels, active }: { levels: number[]; active: boolean }) {
  return (
    <div className="flex h-12 items-end justify-center gap-1" aria-hidden="true">
      {Array.from({ length: BARS }, (_, i) => {
        const l = levels[levels.length - BARS + i] ?? 0
        const h = active ? Math.max(1, Math.round(l * 6)) : 1
        return (
          <div key={i} className="flex w-3 flex-col-reverse gap-[2px]">
            {Array.from({ length: 6 }, (_, k) => (
              <i key={k} className="block h-[6px] w-full" style={{ background: k < h ? (k >= 4 ? '#ff6b6b' : '#16b77d') : '#0a0a0a14' }} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

/** Types a string out a few characters at a time. */
export function Typed({ text }: { text: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    const id = window.setInterval(() => setN((c) => (c >= text.length ? c : c + 1)), 28)
    return () => window.clearInterval(id)
  }, [text])
  return <>{text.slice(0, n)}</>
}

