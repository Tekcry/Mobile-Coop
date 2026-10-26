# Piano GA6a (pure sweep) - report
Owner: Night Shift | Guard AI Build. Status: current. Builder: Opus 5.5, 2026-10-26.

Branch `feature/guard-ai-piano-sweep`. Code head `f83a74a25` (this report is the commit after it). Spec:
`PIANO-GA6-PLAN.md` section 4 GA6a, with section 8 (N1-N4) over sections 2-5. Done; GA6b (enemy.ts, enemyManager.ts,
ai.md, pianoGuards, guardAiAllocManager) not started.

## Commits
- `ce5f2a254` guard-ai piano GA6a: sceneSweep (pure sweep plan, pan, turn time, rejoin pick)
- `f83a74a25` guard-ai piano GA6a: walker sweep mode (setSweep, clearSweep, pan, rejoin) and steerFrom skip

## Files (added / removed lines against 4e9e542ae)
| File | +/- |
| --- | --- |
| `src/ai/sceneSweep.ts` (new, pure) | +225 |
| `src/ai/patrol.ts` | +168 / -2 |
| `src/ai/separation.ts` | +15 / -3 |
| `tests/sceneSweep.test.ts` (new) | +211 |
| `tests/patrolSweep.test.ts` (new) | +397 |

Code ~400, tests ~600 (over the plan's ~480: the N2 / N3 / N4 cases and the face-pan / post cases).
Not touched: `tests/sweep.test.ts`, `src/ai/gear.ts`, `enemy.ts`, `enemyManager.ts`.

## Exported API (GA6b codes against this)
`src/ai/sceneSweep.ts`:
```ts
export const SCENE_SWEEP: {
  pace: 0.7; panTime: 3; panYaw: 0.7; postPan: 8; slack: 0.8;
  panGate: 0.15;   // N2: pan cycle starts once the body is within this of the pan's start yaw (rad)
  still: 0.01;     // a leg shorter than this (m) is not walked (a post's two points on one spot)
};
export interface SweepPlan {
  readonly pts: readonly Pt[];        // the route's points (same indices), or [[postX, postZ]]
  readonly wait: Float64Array;        // nominal wait = pan cycle D (s); 0 = corner
  readonly centre: Float64Array;      // pan centre; for a face pan the yaw it pans to
  readonly from: Float64Array;        // face pan start yaw, NaN otherwise
  readonly leave: Float64Array;       // loop time each stop is left (0 = arriving at stop 0)
  readonly period: number;
  readonly phase: number;             // loop time at the epoch (start, else N1)
  readonly startIdx: number;
}
export function sweepPlan(route: PatrolRoute | null, postX: number, postZ: number, postYaw: number): SweepPlan; // allocates: placement only
export function sweepPeriod(route: PatrolRoute): number;
export function panYaw(centre: number, side: number, D: number, t: number): number;
export function facePanYaw(from: number, to: number, D: number, t: number): number;
export function rejoinStop(plan: SweepPlan, x: number, z: number, now: number): number; // N3
export function nearestStop(plan: SweepPlan, x: number, z: number): number;           // plain nearest (N3 fallback)
export function sweepTurnTime(angle: number): number; // N2: calm turn (60 deg/s + turnAccel ramp)
export function wrapAng(a: number): number;           // [-pi, pi)
export function wrapTime(t: number, p: number): number; // [0, p)
```
`src/ai/patrol.ts` `PatrolWalker` (new members; everything else unchanged):
```ts
setSweep(plan: SweepPlan, side: number, t0: number): void; // side +1 left first, -1 right first; t0 = plan.phase + sweep clock now
clearSweep(): void;                                         // N4: off the sweep, idx restored; caller then rejoin()s as built
get sweeping(): boolean;
get sweepPlan(): SweepPlan | null;
sweepTime(): number;                                        // loop time now (0..period), NaN off the sweep
step(dt: number, x: number, z: number, bodyYaw = NaN): Pt | null; // bodyYaw: the N2 gate (NaN: pan starts at once)
rejoin(x: number, z: number): void;                         // on a sweep: rejoinStop, hold until back in step
```
`waiting` returns the sweep hold left while sweeping. The walker's own `clock` (`tick`) drives the sweep: GA6b keeps
calling `tick` every tick as now.

`src/ai/separation.ts`:
```ts
export function steerFrom(self: SepBody, gx: number, gz: number, speed: number, list: readonly SepBody[], out: SepOut, skip: SepBody | null = null): void;
```
`skip` drops that guard from the soft push and sidestep only; `stepApart` / `tooClose` (the 0.65 m floor) are unchanged.

## What GA6b has to do with it
- At placement / on `sceneDark = true`: `plan = sweepPlan(route, postX, postZ, postYaw)` once per guard (cache it per guard;
  it allocates), `walker.setSweep(plan, side, plan.phase + sweepClock)`, then `walker.rejoin(x, z)` for a guard not standing
  at `plan.startIdx` (setSweep heads for the start stop; a guard already placed mid-route should rejoin).
- Pass the body yaw: `walker.step(dt, x, z, this.motion.yaw)` (without it the pan starts on arrival, before the body has
  turned: the N2 gate is off).
- Pace `min(SCENE_SWEEP.pace, walkSpeed)`; `steerFrom(..., sweepMate)` while calm and sweeping.
- `sceneDark = false`: `walker.clearSweep()` then `walker.rejoin(x, z)`.

## Tests
- `tests/sceneSweep.test.ts` 18: constants; `sweepTurnTime` (both branches, continuity); lane leg / leave / period by
  hand; centres (arrival heading, `faces`); turn onto an off-heading face in the leg (N2); default 3 s and `route.wait`;
  corner adds no hold; a G4-shaped lap tuned to 40 s with its end wait; phase from `start` and N1; plain post (8 s);
  face pan on the shortest arc through pi and back; `panYaw` left / centre / right at D/4, D/2, 3D/4, held, repeats past D,
  mirrored for side -1, peak rate 53 deg/s < 60, wraps round pi; `rejoinStop` picks the soonest stop not the one just
  left, ties the nearest, corners never targets, no pan stop -> nearest.
- `tests/patrolSweep.test.ts` 17: set / clear / `sweepTime`; departures at `leave` over 5 laps, two runs identical;
  corners never held; pan left then right every hold every lap (and mirrored for side -1); the N2 gate (look holds the
  centre until the body is within 0.15 rad, the cycle then starts, still leaves at `leave`); `start` phase; plain post
  pans and never walks; two-point post face-pans 8 s each way; rejoin from off the route -> the `rejoinStop` stop, leaves at
  its `leave`, every later stop on time, abreast with an undisturbed walker; a rejoin hold <= one lap; two walkers rejoined
  at different stops abreast (< 0.05 m) after; N4 set then clear behaves as never swept (route, timed loop, post);
  non-sweep `step` ignores `bodyYaw`; `steerFrom` skip (no push from the skipped mate, others still push, the 0.65 m floor
  still cuts a step into him; default null = old push).
- Regression: `npx vitest run` sceneSweep, patrolSweep, pairs, pairsWiring, sweep, replayDeterminism, guardSpacing,
  perception: 8 files, 171 passed, 1 todo. `npm run typecheck:fast` clean. No e2e (none in this slice).

## Assumptions (GA6a-A entries)
- **GA6a-A1 Turn off a pan stop uses the worse pan extreme.** N2's "last pan yaw" depends on the side, which would give
  two partners different schedules; the leg uses the larger of the turns from `centre - panYaw` and `centre + panYaw`,
  so one plan serves both sides. Undo: compute it per side (partners then drift by the difference).
- **GA6a-A2 The turn onto a pan stop's centre is also in the leg into it** (with `slack`), so a full D of pan fits
  before `leave` once the body faces the centre. Undo: drop the turn-in term in `sweepPlan` (the pan is then cut at
  `leave` by that turn).
- **GA6a-A3 The schedule hold's half-lap window is centred on the planned arrival (`leave - wait`), not on `leave`.**
  Needed for a one-stop post (wait = period: centred on `leave` he re-arrived "late" and never held). Same as the timed
  loop's rule within one wait. Undo: centre on `leave` and special-case a one-stop plan.
- **GA6a-A4 Rejoin holds until the back-in-step time worked out at the rejoin** (`now + travel + wrap(leave - now -
  travel)`); arriving after it he leaves at once and catches up at the next stops, instead of a full-lap wrap on arrival.
  Undo: re-wrap on arrival (`wrapTime(leave - now)`).
- **GA6a-A5 The N2 gate is fed by an optional `bodyYaw` on `step`**; NaN starts the pan at once (stand-ins, old callers).
  Undo: drop the argument (pan starts on arrival).
- **GA6a-A6 `clearSweep` restores the `idx` from before `setSweep`** and clears the hold; the walker's clock, glance timer,
  ping-pong direction and `waitMul` are never touched by the sweep. Undo: leave `idx` as the sweep left it.
- **GA6a-A7 `rejoinStop` replaces the plan's `nearestStop` as the rejoin pick (N3, GA6-A11)**; `nearestStop` stays as
  the plain nearest (the fallback when a plan has no pan stop). Undo: call `nearestStop` in `sweepRejoin`.

## Open items
- An early arrival (slack, the 0.45 m arrival radius, about 1.4 s at 0.7 m/s) makes the hold longer than D, so by the
  plan's rule the pan repeats from 0 and is cut at `leave`: he leaves part way into a second cycle (left side), not from
  the right extreme. Deterministic and the same every lap; GA6b's real-class 5-lap case will show it. If it reads badly,
  start the cycle at `leave - D` (look at the centre until then) - a one-line change in `swPan`.
- The guard's real turn on leaving is the motion driver's stepped / moving turn (faster than 60 deg/s), so the N2 turn
  time over-estimates: he arrives early and holds longer (the item above), never late.
- Per-guard plan caching, pace cap, mate skip, `sceneDark` set / clear wiring and the allocation test are GA6b.
