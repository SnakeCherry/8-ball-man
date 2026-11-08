/** The next habit in a chain of several, and what is left after it. */
export function nextInQueue(queue: string[]): { next: string | null; rest: string[] } {
  return queue.length ? { next: queue[0], rest: queue.slice(1) } : { next: null, rest: [] }
}
