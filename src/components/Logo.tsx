import { PixelArt } from './PixelArt'
import { APP_NAME } from '../data/copy'

/**
 * The Magical 8-Ball logo: a pixel 8-ball beside a chunky pixel
 * wordmark with a two-tone offset shadow. Clickable (takes you home) when `onClick` is given.
 */
export function Logo({ onClick }: { onClick?: () => void }) {
  const inner = (
    <>
      <PixelArt name="logo" size={3} natural className="logo-icon" />
      <span className="logo-word font-pixel uppercase leading-[1.15]">
        <span className="block text-[16px]">Magical</span>
        <span className="block text-[16px]">8-Ball</span>
      </span>
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} aria-label={`${APP_NAME}, back to home`} className="logo-btn flex items-center gap-3 text-left">
      {inner}
    </button>
  ) : (
    <div className="flex items-center gap-3" aria-label={APP_NAME}>
      {inner}
    </div>
  )
}
