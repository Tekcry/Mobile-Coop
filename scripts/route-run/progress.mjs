// WIP (route-runs R3): progress, stuck and steering math. Constants first; functions follow.
/**
 * A4 (docs/route-runs/BRIEF.md): tool tolerances, not level numbers. They live here as named constants and are
 * documented in docs/systems/testing-tools.md "Route-runs" (R8). Moving them into docs/level-design.md or scale-sheet
 * 8 as level numbers needs Michael's approval first.
 */
export const STUCK_MIN_PROGRESS_M = 0.5;
export const STUCK_WINDOW_S = 8;
