status: claimed Night Shift | Cloud Builder 1 2026-10-24T08:26Z

# Brief: gm-look-seeds - distinct guard looks within a section, same look after a restart (Player Build)

Lead: Night Shift | Player Build, 2026-10-24. G6n polish (STATE.md ~:40, "posLook modes (Course, Infiltration) can
repeat a seed within a section, ~77% for 20 guards; slot and team seeds may clash"). Host-side seed assignment only.
**No wire change**: the per-guard look seed is already on the wire (`Enemy.look` 0-127 packed into the enemy `al` bits,
`src/net/coopHost.ts:90` `packAlert(..., e.look)`, read by `EnemyPuppet` via `alertLook`, `src/net/enemyPuppet.ts:429`).
The client builds whatever seed the host sends, so choosing seeds differently on the host needs no protocol change and
no `PROTOCOL_VERSION` bump. Unit tests only.

## The gap, verified at 979a02b3
- Seeds: `src/ai/guardLook.ts` `lookSeed` `:30-32` (hash(key) + index x 79, a permutation per key), `slotLook` `:35-37`,
  `teamLook` `:43-45`, `posLook` `:48-50` (each point its own key, index 0: independent hashes, so 20 points in 128 seeds
  repeat with 1 - prod(1 - i/128) = 77.5%).
- `EnemyManager.spawn` `src/ai/enemyManager.ts:1862-1870`: explicit `look` or `posLook(this.lookMap, pos)`. Callers
  without a look: Course `src/game/modes/courseMode.ts:940` (`spawnSquad` `:934-956`), Infiltration
  `src/game/modes/infiltrationMode.ts:90` (`fill`, nearest-first, so the spawn ORDER depends on the player), Hunter
  `clearMode.ts:96` and Mission (parked), `spawnReinforcement` `:872`, `reinforce` `:1081`, and Sector Ops
  reinforcements (`sectorMode.ts:960` pushes no `look`; several lone reinforcements at one entry point all get the SAME
  `posLook`).
- `joinTeam` `enemyManager.ts:1030-1036`: `e.look = teamLook(...)` after `spawn` already set one. Team keys differ from
  the slot key (`lookOfSlot` `:1823-1827`, used at `sectorMode.ts:702`) and from each other: team vs slot and team vs
  team can clash.
- Section boundaries: Sector Ops unload `sectorMode.ts:708-714` -> `despawnAll` (`enemyManager.ts:1759`) -> `clear()`
  (`:3616`); restart `sectorMode.ts:1172` / Course `bayRestart` `courseMode.ts:695-705` -> `resetMemory` -> `despawnAll`.
  Course's next set is `dropSquad(false)` (`:911-931`): per-guard `despawn`, no `clear()`.
- A woken guard keeps his seed (`revive` `enemyManager.ts:1516-1532`: `new Enemy` + `inherit`, team `swap`, no
  `joinTeam`, no `spawn`): nothing to do there.

## Design (host only, deterministic, no `Math.random`)
"Same look always" (Michael): an authored guard (Sector slot, Course squad slot, Infiltration room slot) gets the same
seed on every load and restart of his section, whatever the spawn order. Runtime spawns (response teams,
reinforcements, Mission) get seeds distinct from everyone already assigned in the section, deterministic for the same
event order (as today: they are not "the same guard" across restarts).
1. `guardLook.ts` (pure, no Babylon):
   - `freeLook(preferred: number, use: ArrayLike<number>): number`: the first `s = (preferred + k) & LOOK_MAX`,
     k = 0..127, with `use[s] === 0`; none free: `preferred & LOOK_MAX` (a repeat only past 128). No allocation.
   - `distinctLooks(seeds: number[]): number[]`: in place, in list order, each seed -> `freeLook` against the seeds
     already given in this list (a local 128 mask; when 128 are given the mask starts again, so repeats spread evenly
     past 128). The first claimer of a seed keeps it, so most guards keep their G6n look. Returns `seeds`.
2. `EnemyManager` (`enemyManager.ts`):
   - `private readonly lookUse = new Uint16Array(LOOK_MAX + 1)`: guards given each seed this section (never decreased
     on death or despawn: a body still shows its look and a woken guard keeps it).
   - `beginLooks(seeds: ArrayLike<number>): void`: a section's authored seeds: `lookUse.fill(0)`, then count each
     (`& LOOK_MAX`). Replace semantics.
   - `pointLooks(pts: readonly { x: number; z: number }[]): number[]`: `posLook(this.lookMap, x, z)` per point,
     `distinctLooks`, then `beginLooks(result)`; returns it (load time only, allocation fine). Doc beside `lookOfSlot`.
   - `spawn` `:1870`: explicit `look >= 0`: `look & LOOK_MAX`, counted (`lookUse[s]++`), not moved (Sector slot seeds stay
     exactly `slotLook`); `look < 0`: `freeLook(posLook(...), lookUse)`, counted.
   - `joinTeam` `:1036`: un-count the seed `spawn` gave (`if (lookUse[e.look] > 0) lookUse[e.look]--`), then
     `freeLook(teamLook(...), lookUse)`, counted. Still in the same step as `spawn` (unchanged contract).
   - `clear()` `:3616`: `lookUse.fill(0)` (covers `despawnAll`, `resetMemory`, a Sector section load / restart).
   - Hot path: none of this runs per step; `freeLook` is a <= 128 loop at spawn time, no allocation.
3. Modes (authored seeds up front, in DATA order, so the spawn order cannot move them):
   - Sector Ops `sectorMode.ts:702`: collect the slot seeds it already computes (`em.lookOfSlot(s.id, k)`) and call
     `em.beginLooks(those)` before `this.fill()` (`:703`), so reinforcements / teams spawned before a staggered slot
     guard never take his seed. Slot seeds are distinct already (permutation); keep them as they are.
   - Course `spawnSquad` `courseMode.ts:934-956`: per set (the `ids` list, its order), seeds = `em.pointLooks(slots)`
     over the slots that exist (keep the `!s` skip and the `break`-on-null warning logic intact; keep ids / seeds
     aligned), then `em.spawn(..., s.yaw, seed)`. A set restart spawns the same ids in the same order -> same seeds.
     Note in the report if any squad slot id appears in two sets (its look could differ between those sets).
   - Infiltration `infiltrationMode.ts:63-66`: after the pending list is built (rooms, then slots: data order), seeds =
     `em.pointLooks(pending slots)`, store each on its entry (`look?: number` on the pending type `:41`), spawn with
     `q.look` at `:90`.
   - Hunter (`clearMode.ts`) and Mission: no change (parked; the manager's `freeLook` already makes them distinct).
4. `stealthSystems.ts:771` (live-mode team) and `sectorMode.ts:896` keep calling `joinTeam` as today: no edit.

If anything here turns out to need a new wire field after all, STOP: `status: blocked needs wire change` with the
evidence (that would need a PROTOCOL bump through the train).

## Base and branch
- Base `origin/feature/gm-flip` at `979a02b3`. New branch `feature/gm-look-seeds`; push there only. No master merge,
  no rebase. `npm ci` once if needed.

## Files (only these)
- `src/ai/guardLook.ts`, `src/ai/enemyManager.ts`
- `src/game/modes/sectorMode.ts` (the `:702` block only), `src/game/modes/courseMode.ts` (`spawnSquad` only),
  `src/game/modes/infiltrationMode.ts` (pending type, start, `fill` spawn line)
- `tests/guardLook.test.ts` (update the G6n asserts below), `tests/guardLookDistinct.test.ts` (new)
- `changes/feature-gm-look-seeds.md` (new fragment, see `changes/README.md`)
Not yours (another builder owns them, do not touch): `scripts/operators/**`, `src/operators/assets/**`,
`src/lab/guardSheet.ts`, `scripts/guard*.mjs`, guards.json kit data. No `src/net/**` edit, no `PROTOCOL_VERSION` edit.

## Tests
- `tests/guardLook.test.ts` `:207-262`: `load()` spawns slot seeds, then the same points without a look, then a team.
  The restart / reload / spawn-order equalities stay as they are. Replace the exact-key asserts `:240-242` and `:269`
  with the new rule: slot seeds still equal `slotLook` exactly; every point / team seed equals its preferred key seed
  (`posLook` / `teamLook`) when that was free at its turn, else `freeLook` of it (mirror the rule with the exported
  `freeLook` over a local mask in spawn order); all seeds of one `load()` distinct. `:285` (map-less stub) unchanged.
- New `tests/guardLookDistinct.test.ts` (the `manager()` stub of `guardLook.test.ts:78-87`):
  - `distinctLooks`: 20 points -> 20 distinct; same input -> same output; the first claimer keeps its preferred seed;
    200 seeds -> every seed used at most twice, no throw. `freeLook`: all taken -> preferred.
  - Course-style: two points chosen (search a small grid in the test) to share one `posLook`, plus 18 more:
    `pointLooks` gives 20 distinct; spawning them in reverse order with those seeds gives the same per point; after
    `resetMemory()` (a restart) the same seeds again.
  - Sector-style: `beginLooks` with 12 `lookOfSlot` seeds, spawn 4 of them, then a team of 4 (`newTeam` + `joinTeam`)
    and 3 lone `spawnReinforcement`s at ONE entry point, then the other 8 slot guards: all 19 seeds distinct, slot seeds
    exactly `slotLook`, a second team distinct from everything; `despawnAll` + the same sequence -> identical seeds.
  - `joinTeam` frees the seed `spawn` gave: with the mask nearly full (beginLooks 126 seeds), a team member still gets
    a free seed, and the freed one is reusable.
  - Over 128 in a section: 140 spawns, no throw, every seed used, none more than twice.
  - (If cheap with the harness of `tests/marlowN4Hold.test.ts` / `tests/courseConsole.test.ts`: a Course set's guards
    distinct and equal after a `bayRestart`. Else skip and say so in the report.)

## Run (unit tests only: no e2e, no GPU, no `npm run check`)
`npx tsc --noEmit -p .`; `npx eslint` on the 7 changed src / test files;
`npx vitest run tests/guardLook.test.ts tests/guardLookDistinct.test.ts tests/sectorRestart.test.ts tests/enemyManagerDespawn.test.ts tests/responseWiring.test.ts tests/coopGuardAi.test.ts tests/sectorDesk.test.ts tests/sectorKeypad.test.ts tests/courseConsole.test.ts tests/marlowN4Hold.test.ts tests/changesFragments.test.ts`
(single files; `--maxWorkers=2` if the box is small). Never the full suite.

## Rules
- No hot-path allocation (spawn / join / load only; `freeLook` allocates nothing). `hyp2` / `hyp3`, never `Math.hypot`.
- No `Math.random` in seed choice. Babylon only through `src/core/babylon.ts` (`guardLook.ts` stays Babylon-free).
- Strict TS, no `any`. `src/net` is never imported by single player (nothing here needs it).
- Changelog: new `changes/feature-gm-look-seeds.md`: line 1 `# Distinct guard looks`, line 2 `kind: patch`, then `- `
  bullets as for `CHANGELOG.md` (no two guards in a section share a look seed: Marlow Yard sets, Infiltration, Sector
  Ops slots, response teams and reinforcements; a guard keeps his look after a section restart; no wire change).
  Never edit `CHANGELOG.md`, `changes/feature-gm-flip.md` or `package.json`'s version.

## Done when
tsc / eslint clean, the 11 vitest files pass, `git diff --stat 979a02b3` = only the files above. Report at the end of
this brief (what changed, any squad id in two sets, test counts, deviations), commit trailer
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, then `status: done feature/gm-look-seeds <sha>`.
