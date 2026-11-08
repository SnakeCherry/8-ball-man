/** How 8-Ball Man feels about a result, and the one human line he says about it. */
export type ManMood = 'happy' | 'sad' | 'calm'

/** Money kept (+) or spent (-) against your usual. Under 50p either way is "about the same". */
export const moodFor = (delta: number): ManMood => (delta >= 0.5 ? 'happy' : delta <= -0.5 ? 'sad' : 'calm')

const BIG = ["Now that's a proper swap!", 'Ka-ching! Your wallet is doing a happy dance.', "Told you. That's the one to take."]
const MID = ['Nice one, that adds up.', 'Easy win. Go on, take it.', 'Your future self says thanks.']
const SMALL = ['A small win, and small wins add up.', "Not huge, but it's free money.", 'Every pound counts.']
const SAME = ["Same as your usual. No harm done.", "It's about even. Pick what you fancy."]
const MORE = ["Costs a bit more. Worth it if you love it.", 'Pricier this time. Eyes open!', "That one's on the expensive side."]

/** Pick one by the amount, so the same result always gets the same line (no dice). */
const pick = (lines: string[], delta: number): string => lines[Math.floor(Math.abs(delta)) % lines.length]

/** The line to say for a saving of `delta` pounds (a month on the ball page, a week on the result screen). */
export function reactionLine(delta: number): string {
  const mood = moodFor(delta)
  if (mood === 'sad') return pick(MORE, delta)
  if (mood === 'calm') return pick(SAME, delta)
  return pick(delta >= 100 ? BIG : delta >= 20 ? MID : SMALL, delta)
}
