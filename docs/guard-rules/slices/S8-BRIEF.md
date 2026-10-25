# guard-rules S8: dog release (slice brief)
Owner: Guard AI Build. Status: current.

Re-anchor on the wave 3 merge head before building: S4 changed enemy.ts, S6 changed enemyManager.ts and e2e-sectorops.mjs.

Builder: Opus 5.5 (AI code). Ships DARK behind `flags.dogRelease` (F0). Rows: B6. Assumption: A12
(`docs/guard-rules/BRIEF.md`). Source: `docs/guard-rules/PLAN.md` "PR4" S8. Every anchor below is quoted by content
and checked on 452e23035 (PR2 + F0); line numbers are "~N on 452e23035" only. S4 adds ~20 lines to `enemy.ts` above
the anchors here (fields ~475-486, `onLevel`), so re-find each by its quote.

## Goal
With the flag on, when a live raise reaches a stage whose `SectorStageAction` has `releaseDogs` (campus S4 stage 2,
S5 stage 1), every living, free dog of the live section leaves its handler's heel, runs to the shared last known
position (none: its handler's spot) and searches there, then heels again on its handler (today's heel rule). Flag off:
the stage records it, as today.

## Location
- Worktree `C:/NightShift/Mobile-Coop-guard-rules-s8`, branch `feature/guard-rules-s8`, cut from the wave 3 merge head
  (`feature/guard-rules` once S4 and S6 are merged into it). Start from `docs/systems/agent-preamble.md` (origin/master);
  branch guard before every write; commit and push each finished sub-step, `git add <your files>` only.

## Files owned (wave 4, file-disjoint from S7 and S9)
- `src/ai/enemy.ts` (S8 alone edits it in wave 4), `src/game/sectorStage.ts`, `src/game/modes/sectorMode.ts`
- `tests/dogRelease.test.ts` (new), `tests/sectorStageActions.test.ts`
- `scripts/e2e-stealth-ai.mjs`
- No ai.md edit: write your ai.md lines in your final report; S7 (PR4's ai.md editor) or the lead folds them in.

## Steps
### 1. `src/game/sectorStage.ts`
1. `SectorStageAction.releaseDogs` doc (~34-38, "Stub: the section's dogs are let off the heel at this stage. The mode
   only records it ... the release behaviour (the dog runs to the last seen spot) is guard-ai's."): replace with the
   built rule: the stage's raise returns `dogs` (`raise`); with `flags.dogRelease` the mode releases the live section's
   dogs (`Enemy.releaseHeel`, guard-rules S8, A12); flag off it is recorded only.
2. `dogsReleased` (~261-262, "Stub (EW9 dog release) ... guard-ai reads it."): keep the field and its two writes (~293,
   ~342 in `release()`); doc becomes "a stage with `releaseDogs` was reached in the live section (tests, debug)".
3. `raise` (~286-302, `raise(sec: number, from: number, to: number): { lights: number; doors: number } {`):
   - return type `{ lights: number; doors: number; dogs: boolean }`; doc: `dogs` = this raise reached a `releaseDogs`
     stage (an edge: a later raise that reaches no new such stage returns false).
   - early return `return { lights, doors: 0 };` -> `return { lights, doors: 0, dogs: false };`
   - `let dogs = false;` beside `let lights = 0;`; `if (a.releaseDogs) this.dogsReleased = true;` ->
     `if (a.releaseDogs) { this.dogsReleased = true; dogs = true; }`
   - `return { lights, doors: this.step() };` -> `return { lights, doors: this.step(), dogs };`

### 2. `src/game/modes/sectorMode.ts`
1. `stageActions` (~551-555):
   ```ts
   private stageActions(from: number, to: number): void {
     const r = this.stageRun?.raise(this.run.index, from, to);
     if (r?.lights) this.g.stealth?.syncSwitches();
     if (r?.doors) this.secT = 0;
   }
   ```
   becomes `stageActions(from: number, to: number, live = true)` with, after the doors line,
   `// (guard-rules S8, A12) dark: the stage lets the live section's dogs off the heel`
   `if (live && r?.dogs && flags.dogRelease) this.releaseDogs();` (`flags` is already imported, ~12).
2. New private method next to it:
   ```ts
   /** (guard-rules S8, A12) Every living, free dog of the live section runs to the last known position and searches
    *  it (`Enemy.releaseHeel` decides who is free). Host / solo; event time only. */
   private releaseDogs(): void {
     const em = this.g.enemyMgr;
     if (!em) return;
     const list = em.enemies;
     const sec = this.run.index;
     for (let i = 0; i < list.length; i++) {
       const e = list[i]!;
       if (e.dog && e.section === sec) e.releaseHeel();
     }
   }
   ```
   `e.section` is the `SectorDef` index (`em.placeSlot(e, p.slot, this.run.index, ...)`, ~905).
3. `beginSection` (~743-750): `this.stageActions(0, this.run.alarm);` -> `this.stageActions(0, this.run.alarm, false);`
   with a short comment (S8-a: a section start replays the stage's doors and lights, not the release; its guards are
   still in the fill queue). The live caller in `raised` (~956, `if (s && stage > from) this.stageActions(from, stage);`)
   is unchanged (live = true).
4. Do not change the strings `tests/sectorStageActions.test.ts` asserts in `sectorMode.ts` (~236-238, ~303-305:
   `canShut: (d) => doorwayClear(...)`, `if (this.stageRun?.step()) this.secT = 0;`, `reinforceSlot(s, stage, i, ...)`,
   `if (p.slot.route) e.setPatrol({ points: p.slot.route`).

### 3. `src/ai/enemy.ts`
New public method right after `notice(x, z, level)` (~1633-1639, below `searchAt` ~1616):
```ts
/**
 * (guard-rules S8, A12) The alarm stage lets a dog off its handler's heel: it hurries (`rush`) to the shared last known
 * position (none: its handler, else where it stands) and searches there the plain way; once the search ends and it
 * calms, the heel rule (`calmDecide`, `findLeader`) brings it back to a living handler (a downed one: it stays by him,
 * as today). A dog that is down, held, passive or already alerted is left alone. Returns whether it went. Event time.
 */
releaseHeel(): boolean {
  if (!this.dog || !this.alive || this.alerted || this.passive || this.taken) return false;
  const c = this.ctx;
  let x = this.pos.x;
  let z = this.pos.z;
  if (c.lkpValid()) {
    x = c.lkp.x;
    z = c.lkp.z;
  } else {
    const h = this.handler ?? this.leader;
    if (h) {
      x = h.pos.x;
      z = h.pos.z;
    }
  }
  this.searchAt(x, z, null);
  this.rush = true;
  return true;
}
```
- `ctx.lkp` / `ctx.lkpValid()` are the shared (freshest intruder's) position (`AiContext` ~193-196; the manager wires
  them ~659-660). `handler` (~1720) is public, `leader` (~618) too.
- `searchAt` (~1616-1631) sets the stimulus, `searchReq`, `searchOwn` and clears `rush`, so `rush = true` comes after it,
  as `bodySearch` does (~1124-1138). The search step then walks at `paceSpeed(rush, ...)` (`src/ai/response.ts` ~62:
  `run * PACE.rush` while `URGENT.enabled`) until it is there (`this.rush = false` on arrival, ~2836), then searches at
  the search pace; nothing per step is added.
- No new field, no per-step code, no allocation; the heel-back is today's code (unaware / cooldown branch of
  `calmDecide`, "the dog heels beside its handler" ~2697-2708).

### 4. Tests (vitest)
- `tests/dogRelease.test.ts` (new).
  - Enemy part: the bare-prototype probe of `tests/postsWiring.test.ts` (`probe`, ~304-345; copy it, do not import
    across test files) with `dog: {}` (a truthy stand-in), `handler`, `leader`, and a `ctx` whose `lkp` / `lkpValid`
    the case sets (`alerted` and `level` are getters over `aware`, ~951-957: set the `AlertMachine`'s state, not a
    field). Cases:
    1. LKP valid: `releaseHeel()` true; stimulus = the LKP (x, z), `searchReq` true, `rushing` true, `aware.level`
       unchanged until the next think.
    2. No LKP: the handler's position; no handler: the leader's; neither: its own.
    3. Not a dog, dead (`health.alive` false), alerted, passive or taken: false and nothing set.
    4. Heel-back: after the search, `aware` at `cooldown` with a living handler: `calmDecide` returns the heel spot
       (today's rule, checked so a later change cannot break the return).
  - Mode part: `SectorMode` on its prototype (as `tests/killScore.test.ts` `sector()`), with `stageRun` = a real
    `SectorStageRun` over one section `{ stageActions: [{ stage: 2, releaseDogs: true }] }` (the `rig` /
    `section` helpers of `tests/sectorStageActions.test.ts` ~20-60, copied minimal), `run = { index: 0 }`, `g = {
    enemyMgr: { enemies: [...] }, stealth: null }` and stand-in enemies with `releaseHeel: vi.fn()`:
    5. flag on, `stageActions(1, 2)`: each dog of section 0 released once; a dog of section 1 and a human not.
    6. flag off: none; flag on but a raise that reaches no `releaseDogs` stage (1 -> 1, or a section without it): none.
    7. `stageActions(0, 2, false)` (the section start): none.
  `import { flags } from '../src/core/flags'`; restore `flags.dogRelease` in `afterEach`.
- `tests/sectorStageActions.test.ts`: the `toEqual` raise results gain `dogs: false` (~245, ~248, ~253 and the Warehouse
  Ops loop ~350); the stub case "releaseDogs is a stub flag (guard-ai owns the release)" (~281-289) becomes "a
  releaseDogs stage is an edge": `raise(0, 0, 1).dogs` false, `raise(0, 1, 2).dogs` true, `raise(0, 2, 3).dogs` false,
  `dogsReleased` true after it, false after `release()`.
- Command (only these): `npm run typecheck:fast` and
  `npx vitest run tests/dogRelease.test.ts tests/sectorStageActions.test.ts tests/killScore.test.ts tests/postsWiring.test.ts tests/barkCause.test.ts tests/guardPolish2.test.ts tests/guardPolishA.test.ts tests/campusS4.test.ts tests/campusS5.test.ts`
  (the bare-prototype `Enemy` suites and the campus data with `releaseDogs` must stay green). Never `npm run check`.

### 5. e2e (`scripts/e2e-stealth-ai.mjs`, written by you, run only by the lead)
The suite runs one page (Clear mode on warehouse, `em.coordinated = true`, the `window.__t` helpers ~34-140), so the
flag cannot be set per scenario; the scenario calls `releaseHeel()` directly (the flag gates only the mode's call,
tested in vitest). New `await scen('dog release (guard-rules S8)', ...)` placed before the closing console-error assert
(after the last scenario, 'four intruders (coop4)' ~2812):
- `t.light(0)`; handler `h = t.spawn('grunt', x, z, yaw)` and dog `d = t.spawn('dog', x + 1, z, yaw)` on an open spot
  of the warehouse floor (reuse a spot an earlier scenario proved open, e.g. the 'noise' scenario's), `d.handler = h`;
  player far off and unlit. Step 2 s: the dog heels within 1.5 m of `h`.
- A known position 12-15 m off on the same floor: `em['reportIntruder'](0, kx, 0, kz, true)` (the manager's wrapper:
  intruder board + `mirror`, ~3155-3159); assert `em.lkpValid`. Then `d.releaseHeel()` returns true.
- Over 15 s: the dog's distance from `h` passes 3 m, `d.rushing` is true on the way, it gets within 1.5 m of (kx, kz),
  and `d.level === 'searching'` there. The handler does not move (`h.level` stays calm).
- Over the search (`ALERT.searchTime` 60 s, `src/ai/alertState.ts` ~33) plus 20 s more: the dog ends within 1.5 m of
  its heel spot by `h`. Step at 0.1 s (`t.step`); at most ~900 steps.
- A second dog with `alerted` forced by a sighting is out of scope; `releaseHeel` on a grunt returns false (one line).
- The lead requests (builder runs no e2e): PR4 gate e2e-anchors, e2e-gadgets, e2e-guard-carry, e2e-levels, e2e-park,
  e2e-section-rating, e2e-sectorops, e2e-stealth-ai, e2e-tactics, e2e-takedown, smoke; plus e2e-coop, e2e-netmove.
  S8's own files map to e2e-gadgets, e2e-guard-carry, e2e-park, e2e-section-rating, e2e-sectorops, e2e-stealth-ai,
  e2e-tactics, e2e-takedown, smoke; the deciding suite is `e2e-stealth-ai --only=dog release`.

## ai.md lines for the report (S7 or the lead folds them)
- Sector tags bullet, `handler` (~176-179, "`handler`: the dog is bound (`Enemy.handler` ...) and heels on him only"):
  add "(guard-rules S8, A12, flag `dogRelease`) a stage with `releaseDogs` (campus S4 stage 2, S5 stage 1) lets the
  live section's free dogs off the heel (`SectorStageRun.raise` -> `dogs`, `SectorMode.releaseDogs`,
  `Enemy.releaseHeel`): each hurries to the shared last known position (none: its handler) and searches it, then heels
  again; a section start at a carried stage does not release (S8-a). Host only."

## Rules
- Hot path: nothing added per step. `releaseHeel` and `releaseDogs` run once per qualifying raise; index loops only.
- Flag: `flags.dogRelease` is read only in `stageActions` (event time). Off: `raise` still records `dogsReleased` and
  returns `dogs`; nobody acts on it.
- Wire: none. Host / solo only (`raised` runs where the stage rises; the co-op client mirrors the sector state and the
  dogs' snapshot). No `PROTOCOL_VERSION`, no `src/net` edit.
- Must NOT touch: `src/ai/enemyManager.ts`, `src/ai/posts.ts`, `src/ai/guardAiData.ts`, `src/ai/barks.ts` (S7),
  `scripts/e2e-sectorops.mjs` (S7), map data (`src/world/maps/**`), `src/core/flags.ts`, `docs/systems/ai.md`, any
  other test.

## Checks
`npm run typecheck:fast` and the vitest command above, green. No e2e (the lead queues them). Report: built, files,
commits, tests changed, results, the ai.md lines above, what Michael should try (walk item 7: `?dogrelease=1`, raise
campus S4 to stage 2).

## Done looks like (flag on)
- At campus S4 stage 2 and S5 stage 1 (a live raise), each living, calm dog of the section runs to where the players
  were last known (or round its handler) and searches, then returns to heel.
- Flag off: no behaviour change; `dogsReleased` and the new `dogs` edge are recorded only.
- The vitest files above green; tsc clean; ai.md lines in the report.

## Est. lines
~270 (sectorStage ~10, sectorMode ~20, enemy ~25, tests ~150, e2e ~65; docs not counted). PLAN said ~250.

## Assumptions (logged here; closest to PLAN / BRIEF)
- S8-a: a section start at a carried stage (`beginSection` -> `stageActions(0, alarm)`) does not release: the guards
  are still queued (`pending` / `fill`, the screen cap), so most dogs are not placed yet, and there is no last known
  position in a fresh section. Undo: pass `live` true there.
- S8-b: "free" = alive, not alerted, not passive, not held (`taken`); a dog already hunting is left to its hunt.
- S8-c: "run pace" (A12) is the existing hurry (`rush` -> `paceSpeed`, `runSpeed x PACE.rush`) until it is there, then
  the search pace; no new speed constant.
- S8-d: the target is fixed at release time. The shared position is forgotten 2 s after nobody sees or hunts the
  intruder (`INTRUDERS.forget`, `src/ai/intruders.ts` ~18), so a stage raised with nobody hunting sends the dogs round
  their handlers (A12's "none" case).
- S8-e: a dog whose position is on another storey searches the nearest spot on its own storey (`snapSpot` with no hunt
  slot uses its own y): no storey change for dogs.

## PLAN pointer drift (PLAN says -> now, 452e23035)
- `sectorStage.ts` `raise` 286-300 -> 286-302; `dogsReleased` 262 / 293 / 342 and the stub comment 34-38: unchanged.
- `sectorMode.ts` `stageActions` 548-552 -> 551-555; it has two callers PLAN does not name: `beginSection` (~750, the
  section start replay) and `raised` (~956).
- `tests/sectorStageActions.test.ts`: four `toEqual` raise results (~245, 248, 253, 350) break with the new field;
  PLAN names only "the edge".
- `ai.md` Sector tags `handler` 172-175 -> 176-179.
- PLAN's e2e "a handler and a dog, a known position, release" fits `e2e-stealth-ai` only by calling `releaseHeel`
  directly (one page, no per-scenario flag); the flag wiring is a vitest case.

## Lead decisions (2026-10-25 ~23:30)
- S8-a CONFIRMED: no release on a section start at a carried stage (no last known position exists yet; most dogs are
  still waiting to spawn).
