/** Value at tick i of n when counting from one number to another in discrete steps. */
export function stepValue(from: number, to: number, i: number, n: number): number {
  if (n <= 0 || i >= n) return to
  if (i <= 0) return from
  return from + ((to - from) * i) / n
}
