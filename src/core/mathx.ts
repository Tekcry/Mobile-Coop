/**
 * Allocation-free length helpers. V8's variadic `Math.hypot` builtin allocates an argument array on
 * every call (it showed up as a top allocator in the 120 Hz profile), so hot paths use these.
 */
export function hyp2(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function hyp3(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}
