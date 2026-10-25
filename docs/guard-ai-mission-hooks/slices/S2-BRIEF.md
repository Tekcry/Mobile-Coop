# guard-ai-mission-hooks S2: noise data shape (slice brief)
Owner: Guard AI Build. Status: current.

Pinned on `origin/feature/guard-rules-pr4` b111c9aa1 (master 2148ec969 + all of J15 PR1-PR4). S2 starts after J15 PR4
merges: **re-pin every anchor on your real base before building.** Anchors are quoted by content; line numbers are
"~N on b111c9aa1" only. Master a28d18530 touches neither `hearing.ts` nor `guardAiData.ts` (J15 S7 adds its lookout
lines to `validatePosts`), so the anchors here should hold.

Builder: Opus 5.5 (AI code; Sonnet can take it from this brief). No flag of its own: S2 adds optional data fields and
an optional parameter that nothing passes yet (S4 wires them behind `flags.noiseZones`, which S1a adds). Rows: D8
(the pure half). Assumptions: A11, A12, A14 (`docs/guard-ai-mission-hooks/BRIEF.md`). Source: `docs/guard-ai-mission-
hooks/PLAN.md` "Slices" S2, Design section 3 (first two bullets).

## Goal
A noisy source can name a power circuit: `NoisySource.group` (a `BreakerHost` group) and `on` ('on' default: live while
the circuit is on; 'off': live while it is off, a standby generator). `ambientDb` takes an optional live mask and skips
a source whose `live[i]` is 0; no mask = today's numbers exactly. `validateNoisy` checks a list of sources (ranges, an
integer group, `on` values) for the data owners' tests. Nothing in the game changes until S4.

## Location
- Worktree `C:/NightShift/Mobile-Coop-guard-ai-mission-hooks-s2`, branch `feature/guard-ai-mission-hooks-s2`, cut by the
  lead from master once J15 PR4 has merged (S2 is file-disjoint from S1a and S1b and may run beside S1b). Start from
  `docs/systems/agent-preamble.md` (origin/master); branch guard before every write; commit and push each finished
  sub-step, `git add <your files>` only.

## Files owned (file-disjoint from S1a / S1b)
- `src/ai/hearing.ts`, `src/ai/guardAiData.ts`
- `tests/hearing.test.ts`, `tests/guardAiData.test.ts`
- No `docs/systems/ai.md` edit (not in the job's claims): write your ai.md lines in the report; the lead folds them.

## Steps
### 1. `src/ai/hearing.ts` (~30 lines; new code tagged `(guard-ai-mission-hooks S2)`)
1. `interface NoisySource` (~38-52), after `label?: string;` (its doc: "'generator' | 'vent' | 'press' ... for barks /
   debug."):
   ```ts
   /** (guard-ai-mission-hooks S2, A11) Its power circuit (a `BreakerHost` group, an integer >= 0): the source masks only
    *  while it is live (`sourceLive`). None = always live. Read from the switch state once per AI tick (S4). */
   group?: number;
   /** (S2, A11) 'on' (default): live while its circuit is on. 'off': live while its circuit is OFF (a standby generator,
    *  a pump that starts when the power goes). Only with `group` (`validateNoisy`). */
   on?: 'on' | 'off';
   ```
2. After `export const WALL_FACTOR = K_WALL;` (~65), a pure helper (assumption S2-a):
   ```ts
   /** (guard-ai-mission-hooks S2, A11) Is source `s` live when its circuit's switch reads `off`? No `group`: always.
    *  The caller (S4) fills a live mask with it once per tick. No allocation. */
   export function sourceLive(s: NoisySource, off: boolean): boolean {
     if (s.group === undefined) return true;
     return s.on === 'off' ? off : !off;
   }
   ```
3. `ambientDb` (~67-80): signature `ambientDb(src: readonly NoisySource[], x: number, z: number, y?: number, live?:
   ArrayLike<number>): number`; first line in the loop after `const s = src[i]!;`:
   `if (live !== undefined && live[i] === 0) continue;` (a mask shorter than the list reads the rest live, S2-c). Doc:
   add "`live` (S2, A11): per source, 0 = off (skipped); absent = every source live (today)". Every existing caller
   (`enemyManager.ts` `tierOf` ~2932 and the voice ~2670) passes four arguments: unchanged.
4. Header comment (~1-17): one sentence: a noisy source may be power-linked (`group`, `on`, `sourceLive`, the `live`
   mask of `ambientDb`; wired by S4 behind `noiseZones`).

### 2. `src/ai/guardAiData.ts` (~45 lines)
1. `NOISY_LIMITS` (~115-116, `export const NOISY_LIMITS = { dbMin: 0, dbMax: 30, radiusMin: 1, radiusMax: 20 } as
   const;`): PLAN S2 says "radius 1-40 m, db 0-24". The code already enforces 0..30 / 1..20 (see "Open questions").
   Default until the lead decides: set PLAN's ranges, `{ dbMin: 0, dbMax: 24, radiusMin: 1, radiusMax: 40 }` (no map
   defines `noisy` yet, D8, so no data breaks), and update the doc line. If the lead keeps the code's ranges, leave this
   line alone and write the tests against 0..30 / 1..20.
2. New export, placed after `validatePosts` (it ends `return errs; }` ~236) and before `reportGuardAi`:
   ```ts
   /**
    * (guard-ai-mission-hooks S2, A11) Check a list of noisy sources (`MapLayout.guardAi.noisy`, `SectorDef.noisy`): a
    * unique id, a finite position (and `y` when set), `db` and `radius` inside `NOISY_LIMITS`, a `group` that is an
    * integer >= 0, `on` only 'on' / 'off' and only with a `group`. The messages name the source id, as
    * `validateGuardAi` always did. Returns the errors (empty when fine).
    */
   export function validateNoisy(list: readonly NoisySource[]): string[]
   ```
   Messages (keep the existing texts so `validateGuardAi`'s tests still match): `noisy ${id}: duplicate id`,
   `noisy ${id}: db ${db} outside ${dbMin}..${dbMax}`, `noisy ${id}: radius ${r} outside ${radiusMin}..${radiusMax}`,
   `noisy ${id}: position is not finite`; new: `noisy ${id}: group ${g} must be an integer >= 0`,
   `noisy ${id}: on '${on}' must be 'on' or 'off'`, `noisy ${id}: on without a group`.
   A console group (`consoleFault.ts` `CONSOLE_GROUP` and up) is allowed: S4 reads it the way `breakerOff` does
   (PLAN Design 3, re-check polish), so the validator does not reject it (S2-e).
3. `validateGuardAi` (~262): replace the body of the noisy loop (`const noisyIds = new Set<string>(); for (const n of
   layout.noisy ?? []) { ... }`, ~285-294) by `errs.push(...validateNoisy(layout.noisy ?? []));` plus a loop that keeps
   only its own two checks: `bounds && finite(n.x) && finite(n.z) && !inRect(bounds, n.x, n.z)` -> `noisy ${id}: outside
   the map bounds`, and `n.section !== undefined && !sectionOk(n.section)` -> `noisy ${id}: section ${s} does not exist`.
   Update its doc (~254-261: "noisy sources (`db` 0..30, `radius` 1..20, ...") to point at `validateNoisy` and the
   limits by name, not by number.

### 3. Tests (vitest)
- `tests/hearing.test.ts`: new `describe('noise zones data (guard-ai-mission-hooks S2)', ...)` after the 'hearing
  maths' describe (it ends after the `wallMatters` case, ~91), importing `sourceLive`:
  1. No mask = today: the existing `ambientDb` numbers (generator 12 at its centre, 6 at 4 m, the generator + vent
     mixes 4.5 / 9, the 3D case) are the same with `live` undefined and with `new Uint8Array([1, 1])`.
  2. A source off by its circuit masks nothing: `{ ...gen, group: 55 }` with `live` [0] -> 0 at its centre; with [1]
     -> 12; the generator and the vent with mask [0, 1]: at x 9 still 4.5 (the vent), at x 2 0 (was 9).
  3. A mask shorter than the list: the rest live (S2-c).
  4. `sourceLive`: no group -> true for `off` true and false; group, default `on` -> live when `off` false only;
     `on: 'off'` -> live when `off` true only (inverts).
  5. The masking effect end to end: a footstep (4 m) 3 m from a 12 dB generator on circuit 55 is not heard with the
     mask [1] (`hearTier` 0, as the existing generator case) and heard with [0].
- `tests/guardAiData.test.ts`: import `validateNoisy` and `NOISY_LIMITS`.
  1. The existing case 'noisy: db 0..30, radius 1..20, ...' (~96-108): rename to read the limits from `NOISY_LIMITS`
     and use them in its numbers (db `dbMax + 1` rejected, `dbMax` accepted, radius `radiusMax + 5` rejected,
     `radiusMax` accepted, 0.5 rejected); the bounds, section and duplicate checks unchanged.
  2. New `describe('validateNoisy (guard-ai-mission-hooks S2)', ...)`: a good list (one source with `group: 55`, `on:
     'off'`, one with none) -> `[]`; radius 0 rejected; db over `NOISY_LIMITS.dbMax` (25 with PLAN's limits) rejected;
     group 55.5 rejected; group -1 rejected; `on: 'maybe'` rejected; `on: 'off'` without `group` rejected; a duplicate
     id rejected; `validateGuardAi` reports a bad group through `validateNoisy` (one error, the same text).
- Command (only these): `npm run typecheck:fast` and
  `npx vitest run tests/hearing.test.ts tests/guardAiData.test.ts tests/combatHearing.test.ts tests/postsWiring.test.ts tests/barkCause.test.ts tests/campusGear.test.ts`
  (every other test importing `hearing.ts` or `guardAiData.ts`; `postsWiring` validates every live map's guard-ai data
  and must stay green). If S1a has merged into your base, add `tests/missionOrders.test.ts` (it calls `ambientDb`).
  Never `npm run check`. Before changing `NOISY_LIMITS`, grep `tests/` and `scripts/` for the old numbers (preamble).

### 4. e2e
None of its own (no runtime change). The lead requests the head's `affected-e2e` gate (the `src/ai` row:
`e2e-guard-carry`, `e2e-sectorops --part=1`, PLAN).

## Docs
- No `docs/systems/ai.md` edit (not claimed). In your report, the line for the lead to fold into the hearing bullet
  (~68, "a noisy thing near the guard (`NoisySource`, ..."): a source may be power-linked (`group`, `on`), masked only
  while live (`sourceLive`, `ambientDb`'s `live` mask, wired by S4 behind `noiseZones`); `validateNoisy` checks the
  data; the limits are `NOISY_LIMITS`.

## Rules
- Pure: no Babylon, no DOM, no flag import in either file. `ambientDb` and `sourceLive` allocate nothing (index loop,
  number reads); `hyp2` / `hyp3`, never `Math.hypot`.
- No wire, save or map data change; no `PROTOCOL_VERSION`.
- Must NOT touch: `src/ai/enemyManager.ts`, `src/ai/enemy.ts`, `src/ai/missionOrders.ts`, `src/core/flags.ts`,
  `src/game/sectors.ts`, `src/world/maps/**`, `scripts/**`, any other test.

## Checks
`npm run typecheck:fast` and the vitest command above, green. No e2e. Report: built, numbers used (the limits), files,
commits, tests changed, results, the ai.md line, what Michael should try (nothing yet: S4 makes it playable).

## Done looks like
- `NoisySource` has `group` / `on`; `ambientDb(..., live)` skips a dead source; no mask gives today's numbers exactly.
- `validateNoisy` rejects a 0 radius, db over the limit, a fractional group, a bad `on`; `validateGuardAi` uses it.
- The vitest files above green; tsc clean; the ai.md line in the report.

## Est. lines
~280 (hearing ~30, guardAiData ~45, `hearing.test.ts` ~120, `guardAiData.test.ts` ~85; docs not counted). PLAN said
270. Far under the cap.

## Assumptions (logged here; closest to PLAN / BRIEF)
- S2-a: `sourceLive(s, off)` (not in PLAN) holds the `on` inversion in the pure file, so "`on: 'off'` inverts" is
  tested here and S4 only reads the switches and fills the mask.
- S2-b: `on` without `group` is a data error (it would mean nothing).
- S2-c: a `live` mask shorter than the list reads the rest live ("absent = all live" per source).
- S2-d: `validateNoisy` keeps `validateGuardAi`'s message texts and takes over its per-source checks; bounds and
  section stay in `validateGuardAi` (they need its options).
- S2-e: a console group is a valid `group` (S4 routes it as `breakerOff` does; PLAN Design 3).

## PLAN pointer drift (PLAN says -> now, b111c9aa1)
- `hearing.ts` `NoisySource` 38-52: unchanged (`label?` 51); `ambientDb` 67-80; `WALL_FACTOR` 65.
- `guardAiData.ts`: PLAN does not say the file already validates noisy sources: `NOISY_LIMITS` (~116) and the
  `validateGuardAi` loop (~285-294) check db 0..30, radius 1..20, ids, bounds and section, and
  `tests/guardAiData.test.ts` ~96-108 asserts those numbers.
- For S4 (not this slice): `enemyManager.ts` constructor `mapNoisy` 559-560 -> 590-591, `setNoisy` 2356 -> 2532,
  `ctx.breakerOff` 676 -> 707; `sectorMode.ts` `loadSection` calls `em.setNoisy(s?.noisy ?? em.mapNoisy)` (~723).

## Open questions for the lead (PLAN facts that do not hold on the head; the design is not changed here)
1. Noisy limits: PLAN S2 says radius 1-40 m and db 0-24; the code's `NOISY_LIMITS` is db 0..30, radius 1..20 (guard-ai
   S5, tested). This brief's default is PLAN's ranges in the one table (no map has `noisy` data yet). Keep PLAN's, or
   keep the code's?

## Lead decisions (pending)
- 1 (noisy limits): _pending_
