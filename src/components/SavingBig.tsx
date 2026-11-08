import { CountUp } from './CountUp'
import { gbp } from '../lib/format'

/**
 * The loudest number on an answer: what switching saves. `delta` is money kept (+) or extra spent (-) against the
 * usual, per month (or once for a one-off). `keep` means the best answer is the usual itself.
 */
export function SavingBig({ delta, once, keep = false, className = '' }: { delta: number; once: boolean; keep?: boolean; className?: string }) {
  const unit = once ? ' once' : ' a month'
  if (keep) return <p className={`text-[30px] font-semibold leading-tight ${className}`}>Keep your usual</p>
  if (Math.abs(delta) < 0.5) return <p className={`text-[28px] font-semibold leading-tight ${className}`}>About the same price</p>
  const saves = delta > 0
  return (
    <p className={`num leading-none ${className}`} aria-label={`${saves ? 'Save' : 'Costs'} about ${gbp(Math.abs(delta))}${unit}${saves ? '' : ' more'}`}>
      <span className="block text-[18px] font-normal">{saves ? 'Save about' : 'Costs about'}</span>
      <span className="text-[clamp(44px,6vw,68px)] font-semibold">
        <CountUp value={Math.abs(delta)} format={gbp} delayMs={200} />
      </span>
      <span className="ml-2 text-[20px] font-normal">
        {unit.trim()}
        {saves ? '' : ' more'}
      </span>
    </p>
  )
}
