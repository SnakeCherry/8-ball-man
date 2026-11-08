import { PixelIcon } from './ui'

const STEPS = ['Guess', 'Results', 'Pick']

/** Back button plus "where am I" for the three-step decision flow. */
export function FlowBar({ step, onBack, backLabel }: { step: 0 | 1 | 2; onBack: () => void; backLabel: string }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className="pbtn pbtn-white !min-h-[44px] !px-3 !py-2"
        aria-label={`Back to ${backLabel}`}
      >
        <PixelIcon name="back" size={2} />
        Back
      </button>
      <ol className="flex items-center gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? 'step' : undefined}
            className={`border-4 border-ink px-2 py-1 font-pixel text-[10px] uppercase ${
              i === step ? 'bg-ink text-white' : i < step ? 'bg-lime' : 'bg-white text-ink/60'
            }`}
          >
            {i + 1}
            <span className="sr-only"> {s}</span>
            <span className="hidden min-[400px]:inline"> {s}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
