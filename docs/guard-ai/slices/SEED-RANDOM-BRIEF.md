# guard-ai seed-random: no Math.random left in src/ai (slice brief)
Owner: Guard AI Build. Status: current.

Pinned on origin/master 29f03b6c0. Line numbers are "~N on 29f03b6c0"; re-find every anchor by content before editing.

Builder: Opus 5.5 (AI code, G302). Two independent Opus checkers (an AI PR). Ships ON: a fix to a shipped rule (VISION
hard rule 8, G143: "every detection explainable", fixed patrols, no randomness that defeats planning), so no flag and no
walk cap (G355). No wire change, no save change, no `PROTOCOL_VERSION` touch.

## Goal
Test Runner's J20 S6b (`tests/replayDeterminism.test.ts`, on master) allowlists the last five `Math.random` calls in
`src/ai` and asks Guard AI to seed them (`docs/archive/test-runner-j20/PLAN.md` S6b step 4):
- `src/ai/enemy.ts` ~424 `private thinkT = Math.random() * 0.25;` (think-cadence start) and ~2402
  `this.thinkT = 0.22 + Math.random() * 0.08;` (think cadence).
- `src/ai/enemyManager.ts` ~656 (`callAlert`: radio delay jitter `Math.random() * 0.3`) and ~669 (`shout`, the parked
  modes' 8 m shout: `0.3 + Math.random() * 0.3`).
- `src/ai/reconDrone.ts` ~34 `private angle = Math.random() * Math.PI * 2;` (orbit start angle).

After this slice the same spawn order and match seed give the same think cadence, radio delays and drone orbit, so a
replay of the same inputs gives the same detections. The distributions stay exactly as they are (same ranges), only
the source changes.

## Location
- Worktree `C:/NightShift/Mobile-Coop-guard-ai-seed-random`, branch `feature/guard-ai-seed-random` (cut from
  origin/master 29f03b6c0). `node_modules` is a junction: never commit it.
- Read first: `git show origin/master:docs/systems/agent-preamble.md`, `git show origin/master:CLAUDE.md`.
- Branch guard before every write:
  `cd /c/NightShift/Mobile-Coop-guard-ai-seed-random && test "$(git rev-parse --abbrev-ref HEAD)" = feature/guard-ai-seed-random && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-guard-ai-seed-random"`
- Commit and push each finished step: `git add <your files>` only (never `-A` or `.`), subject prefix
  `guard-ai seed-random:`, trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`,
  `git push origin feature/guard-ai-seed-random`.

## Files owned
- `src/ai/squadRoles.ts` (one pure helper next to `combatSeed`, ~681)
- `src/ai/enemy.ts` (the `rng` doc ~377-381, a perception stream field, the two `thinkT` draws)
- `src/ai/enemyManager.ts` (the two radio-delay draws only)
- `src/ai/reconDrone.ts` (the start angle)
- `tests/replayDeterminism.test.ts` (the allowlist and the `it.todo` only; Test Runner's file, its PLAN says the
  allowlist shrinks as Guard AI's fixes land)
- `tests/aiSeeded.test.ts` (new)
- `changes/feature-guard-ai-seed-random.md` (new)

## Must NOT touch
`src/net/**`, `src/save/**`, `src/player/**`, `src/game/**`, any other `src/ai` file or line, `src/config/**`,
`docs/systems/ai.md` (report lines instead), `CHANGELOG.md`, `package.json`, `src/core/flags.ts`. Do not change the
combat `rng` stream or its seeding (`rng`, `seedFor`, `combatSeed`'s body): combat dice sequences must not shift.

## Steps
### 1. `src/ai/squadRoles.ts`: a pure unit draw
Below `combatSeed` add:
```ts
/** (guard-ai seed-random, hard rule 8) A replayable draw in [0, 1) for one-off jitters (radio delays, a drone's start
 *  angle): `combatSeed` of the same three keys over 2^32. Pure, allocates nothing. */
export function seeded01(matchSeed: number, stream: number, key: number): number {
  return combatSeed(matchSeed, stream, key) / 4294967296;
}
```
and three exported stream salts (plain `const` numbers, negative so they never collide with a real engagement id,
which counts up from 0): `SEED_SENSE = -1` (think cadence), `SEED_RADIO = -2` (radio delays), `SEED_DRONE = -3` (drone
start angle). Doc each in one line.

### 2. `src/ai/enemy.ts`: the think cadence draws from a per-guard perception stream
- Add a field `private readonly senseRng = new Rng(combatSeed(0x5eed, SEED_SENSE, this.num));` declared BEFORE `thinkT`
  (field initialisers run in order; `thinkT` draws from it), with a doc: "(guard-ai seed-random) Perception dice (the
  think cadence only), apart from the combat `rng` so a think never shifts a combat sequence; seeded by `num` at spawn,
  as `rng` is. Hard rule 8: the same spawn order gives the same cadence." `0x5eed` is `EnemyManager.matchSeed`'s
  default (~469): import nothing from enemyManager; a literal with a comment naming it is fine.
- ~424 `Math.random() * 0.25` -> `this.senseRng.next() * 0.25`; ~2402 `0.22 + Math.random() * 0.08` ->
  `0.22 + this.senseRng.next() * 0.08`.
- Update the `rng` doc (~377-381): its last sentence "The think cadence (`thinkT`) stays on `Math.random`: it is
  perception, not combat." -> "The think cadence draws from `senseRng`: perception, not combat."
- Add `combatSeed`, `SEED_SENSE` to the existing `./squadRoles` import (~47).

### 3. `src/ai/enemyManager.ts`: the radio delays
- ~656 (`callAlert`): `Math.random() * 0.3` -> `seeded01(this.matchSeed, SEED_RADIO ^ Math.imul(this.engagement, 2654435761), o.num) * 0.3`.
  Comment: `// (guard-ai seed-random) replayable jitter per listener per engagement (hard rule 8)`.
- ~669 (`shout`, parked modes): `0.3 + Math.random() * 0.3` -> the same draw with `0.3 +` (same comment, shortened).
- Import `seeded01`, `SEED_RADIO` through the existing `./squadRoles` import (~48). No closure, no temporary: a pure
  function call per listener.
- If `engagement` is not the right counter at that point (read `seedFor` ~3531 and where `engagement` moves), use
  whatever `seedFor` uses and log the choice (A1).

### 4. `src/ai/reconDrone.ts`: the start angle
`private angle = Math.random() * Math.PI * 2;` runs before the constructor's `operator` parameter property may be
readable, so: keep the field `private angle = 0;` and set it first thing in the constructor body:
`this.angle = seeded01(0x5eed, SEED_DRONE, operator.num) * Math.PI * 2;` (comment: replayable, one per operator,
hard rule 8). Import `seeded01`, `SEED_DRONE` from `./squadRoles`.

### 5. Tests
1. `tests/replayDeterminism.test.ts`: `ALLOW` -> `{}` with its doc "(guard-ai seed-random) none left: a new
   Math.random in src/ai fails"; the `it.todo` text -> `'full guard replay (an Enemy scene harness; the five draws are
   seeded since guard-ai seed-random)'`. Nothing else in that file.
2. `tests/aiSeeded.test.ts` (new, ~60 lines, pure):
   - `seeded01` is in [0, 1), the same for the same keys, different across the three streams and across neighbouring
     keys (sample 1000 keys: no two equal, mean within 0.45-0.55).
   - The salts are distinct negatives.
   - `Math.random` is never called by the seeded paths: `vi.spyOn(Math, 'random')` then call `seeded01` and drive an
     `Rng` (`new Rng(combatSeed(0x5eed, SEED_SENSE, 7))`) 100 times: the spy is not called; two such streams with the
     same seed give equal sequences; a think cadence built from it stays in [0.22, 0.30).
   - No allocation: `bytesPerCall` (`tests/helpers/allocPerCall.ts`, as `tests/guardPolishA.test.ts` uses it) on 1000
     `seeded01` calls within that test's bound.
### 6. Changelog fragment `changes/feature-guard-ai-seed-random.md`
```
# Guard AI: replayable guard timing
kind: patch
- Guards: their reaction timing, radio delays and recon drone orbits now come from the match seed instead of chance,
  so the same play gives the same guard behaviour every time (hard rule 8: every detection explainable).
```

## Report lines for `docs/systems/ai.md` (the lead folds them)
- Next to the combat RNG lines: "Perception and one-off jitters are seeded too (guard-ai seed-random): `senseRng` per
  guard (think cadence), `seeded01(matchSeed, SEED_RADIO ^ engagement, num)` (radio delays), `seeded01(.., SEED_DRONE,
  operator num)` (drone start angle). No `Math.random` in `src/ai` (`tests/replayDeterminism.test.ts`)."

## Checks
- `npm run typecheck:fast`
- `npx eslint src/ai/squadRoles.ts src/ai/enemy.ts src/ai/enemyManager.ts src/ai/reconDrone.ts tests/replayDeterminism.test.ts tests/aiSeeded.test.ts`
- `npx vitest run tests/replayDeterminism.test.ts tests/aiSeeded.test.ts tests/squadRoles.test.ts tests/guardPolishA.test.ts tests/guardAiAlloc.test.ts tests/alarmCall.test.ts tests/squadWiring.test.ts tests/changesFragments.test.ts` (drop a name that does not exist; add any test that `grep -l "thinkT\|callAlert\|ReconDrone\|seedFor" tests/` finds).
- e2e (laptop queue; the PR head's `affected-e2e` runs by itself). Deciding suites the lead requests by name:
  `e2e-stealth-ai e2e-sectorops e2e-enemies` (`--set seed-random`). A changed think phase can move an e2e timing by a
  fraction of a second: a red there gets an Opus triage; never widen a margin without the triage saying why.

## Done looks like
`grep -rn "Math.random(" src/ai` prints only comments; the replay allowlist is empty and green; the vitest list,
tsc and eslint green; the three deciding suites green on the laptop.

## Size
About 120 changed lines.

## Assumptions (assumed and logged)
- A1 Radio jitter keys: (matchSeed, SEED_RADIO ^ engagement, listener num). Undo: any other key; the range stays.
- A2 The perception stream is seeded by `num` at spawn like the combat `rng`'s spawn seed (not reseeded per
  engagement): the cadence is a guard's own rhythm. Undo: reseed it in `seedFor`'s caller.
- A3 The drone and the think stream use the literal default seed `0x5eed` (EnemyManager's `matchSeed` default) rather
  than plumbing the match seed into `Enemy` / `ReconDrone` constructors (a wider change). Undo: pass the match seed in.
