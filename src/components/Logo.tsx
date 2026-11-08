import { PixelArt } from './PixelArt'
import { APP_NAME } from '../data/copy'

/**
 * The Trade-Off Check logo: a balance scale (a coin on one side, a heart on the other) beside a chunky pixel
 * wordmark with a two-tone offset shadow. Clickable (takes you home) when `onClick` is given.
 */
export function Logo({ onClick }: { onClick?: () => void }) {
  const inner = (
    <>
      <PixelArt name="logo" size={3} natural className="logo-icon" />
      <span className="logo-word font-pixel uppercase leading-[1.15]">
        <span className="block text-[16px]">Trade-Off</span>
        <span className="block text-[16px]">Check</span>
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
