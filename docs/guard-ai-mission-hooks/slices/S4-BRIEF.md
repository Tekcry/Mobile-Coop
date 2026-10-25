# guard-ai-mission-hooks S4: noise wiring and the meter read (slice brief)
Owner: Guard AI Build. Status: current.

Pinned on `origin/feature/guard-rules-pr4` b111c9aa1 for `enemyManager.ts` and on
`origin/feature/guard-ai-mission-hooks-s2` 77d6f45b2 for `hearing.ts` (S2, checks A + B PASS: `NoisySource.group` / `on`, `sourceLive`, `ambientDb(src, x, z, y?,
live?)`) and `guardAiData.ts` (`validateNoisy`). S4 edits `enemyManager.ts` after S1a-2, S1b and S3: **re-pin every
anchor on your real base before building.** Anchors are quoted by content; line numbers are "~N on b111c9aa1" only.

Builder: Opus 5.5 (or Sonnet from this brief). Ships DARK behind `flags.noiseZones` (S1a-1 added it; `?noisezones=1`).
Rows: D8 (the manager half), D9 (the read the HUD owner uses). Assumptions: A11, A12, A14
(`docs/guard-ai-mission-hooks/BRIEF.md`). Source: `PLAN.md` "Slices" S4, Design section 3, PLAN-CHECK fix 10 and its
re-check polish (console groups), S2 check B polish 4 (a `Uint8Array` sized to the list).

## Goal
With `?noisezones=1` the noisy sources mask hearing as today, and a power-linked source (S2: `group`, `on`) masks only
while live. The manager keeps one live mask (a `Uint8Array` sized to the source list), refreshed once per AI tick from
the switch state (`BreakerHost.isOff`; a console group through the console faults, as `ctx.breakerOff` reads it; no
breaker host = the circuit reads on). Every listener's masking (`tierOf`, the shout) passes the mask. `ambientAt(x, y,
z)` gives the HUD meter the same sum the guards use and refreshes the mask itself when no AI tick ran since its last
read. Flag off: the map's and the sections' noisy data are ignored (no masking at all; no live map has any today).

## Location
- Worktree `C:/NightShift/Mobile-Coop-guard-ai-mission-hooks-s4`, branch `feature/guard-ai-mission-hooks-s4`, cut by the
  lead from S3's merge head (S3b's if split), which must also hold S2 (merge S2 first if it has not landed). Start from
  `docs/systems/agent-preamble.md` (origin/master); branch guard before every write; commit and push each finished
  sub-step, `git add <your files>` only.
- Slice order on the shared files: S1a-2 -> S1b -> S3 (S3b) -> **S4**. S4 needs nothing from S1b / S3 but shares
  `enemyManager.ts` and `e2e-stealth-ai.mjs` with them; the lead may run it before S3 (then cut it from S1b's head
  with S2 merged).

## Files owned
- `src/ai/enemyManager.ts`
- `tests/noiseZones.test.ts` (new)
- `tests/hearing.test.ts` (one case turns the flag on), `tests/missionOrdersManager.test.ts` (S1a-2's generator bell
  case turns the flag on), `tests/postsWiring.test.ts` (two cases turn the flag on; **not in the job's claims: open
  question 3, wait for the lead's answer before editing it**)
- `scripts/e2e-stealth-ai.mjs`
- No `docs/systems/ai.md` edit (not in the job's claims): write your ai.md lines in the report; the lead folds them.
- Read only: `src/ai/hearing.ts`, `src/ai/guardAiData.ts`, `src/ai/consoleFault.ts`, `src/ai/breaker.ts`,
  `src/game/stealthSystems.ts`, `src/game/modes/sectorMode.ts`.

## Steps
### 1. `src/ai/enemyManager.ts` (~70 lines; tag `(guard-ai-mission-hooks S4)`)
1. Imports: add `sourceLive` to the `./hearing` import (~24: `import { COMBAT_HEAR, HEARING, ambientDb, ... type
   NoisySource } from './hearing';`). `isConsoleGroup` (~68) and `flags` (~52) are imported already. A module constant
   near the top: `/** (S4, A14) The active list with noise zones off: none. */ const NO_NOISE: readonly NoisySource[] =
   [];`
2. Fields after `readonly mapNoisy: readonly NoisySource[];` (~334), each with a doc line:
   - `private noiseLive = new Uint8Array(0);` (1 live / 0 off per source of `noisy`; sized at `setNoisy`, refreshed per
     AI tick)
   - `private noisePower = false;` (any source of `noisy` names a `group`: else the refresh is skipped)
   - `private aiTicks = 0;` and `private hudTick = 0;` (AI ticks run; the tick count at `ambientAt`'s last read)
3. Constructor (~588-591): keep `this.mapNoisy = gai?.noisy ?? [];` (the data: Sector Ops' fallback,
   `sectorMode.ts` ~723 `em.setNoisy(s?.noisy ?? em.mapNoisy)`) and replace `this.noisy = this.mapNoisy;` with
   `this.setNoisy(this.mapNoisy);` (the flag gate is in `setNoisy`, S4-a). The dev validation below it is unchanged
   (data owners may add sources before switch-on, A14). Field initialisers (`consoles`, `breakers` null, the mask) run
   before the constructor body, so the call is safe.
4. `setNoisy(list)` (~2532, `setNoisy(list: readonly NoisySource[]): void { this.noisy = list; }`) becomes:
   - `// (S4, A14) noise zones off: map and section data are ignored (no masking)` `const l = flags.noiseZones ? list
     : NO_NOISE;` `this.noisy = l;`
   - `if (this.noiseLive.length !== l.length) this.noiseLive = new Uint8Array(l.length);` (section load only) then
     `this.noiseLive.fill(1);`
   - `noisePower` = any `l[i].group !== undefined` (index loop); `this.refreshNoise();`
   - Its doc: the flag gate, the mask, "a `Uint8Array` sized to the list (S2 check B: reading past a typed array's end
     is V8's slow path)".
5. `private powerOff(group: number): boolean` (next to `setNoisy`; doc: "the circuit reads off; no breaker host: on
   (A11), unlike `ctx.breakerOff` (~707), which reads 'off' then"):
   `isConsoleGroup(group) ? this.consoles.isOff(this.consoles.ofGroup(group)) : this.breakers !== null &&
   this.breakers.isOff(group)`. (`ConsoleFaults.isOff(-1)` is false: an unknown console reads on.)
6. `private refreshNoise(): void`: `if (!this.noisePower) return;` then for each source `i`: `const s =
   this.noisy[i]!; this.noiseLive[i] = s.group === undefined || sourceLive(s, this.powerOff(s.group)) ? 1 : 0;` (index
   loop, no allocation).
7. `private noiseStep(): void { this.aiTicks++; this.refreshNoise(); }` and in `update(dt)` (~3744) right after
   `this.raysThisStep = 0;`: `// (S4, A11) the noise mask, once per AI tick (the switch state: a gameplay state, never
   per listener)` `this.noiseStep();`.
8. The two listeners' calls pass the mask (the fifth argument S2 added):
   - `tierOf` (~2932): `const amb = this.noisy.length ? ambientDb(this.noisy, e.pos.x, e.pos.z, e.pos.y) : 0;` ->
     `..., e.pos.y, this.noiseLive) : 0;`
   - `hearsShout` (~2670, the voice model): `const amb = this.noisy.length ? ambientDb(this.noisy, o.pos.x, o.pos.z,
     o.pos.y) : 0;` -> `..., o.pos.y, this.noiseLive) : 0;`
   - grep `ambientDb(` in `enemyManager.ts` on your base: any other call (S1a-2's bell goes through `tierOf`) passes the
     mask too.
9. Public `ambientAt(x: number, y: number, z: number): number` after `setNoisy` (doc: "(S4, D9) The masking (dB) a
   guard standing at (x, y, z) would have: the same sum the guards use, for the HUD meter marker (the HUD owner reads it
   at the player). Refreshes the mask itself when no AI tick ran since its last read (a paused game). No allocation."):
   `if (this.hudTick === this.aiTicks) this.refreshNoise(); this.hudTick = this.aiTicks; return this.noisy.length ?
   ambientDb(this.noisy, x, z, y, this.noiseLive) : 0;` (S4-c). `hudTick` starts at 0 = `aiTicks`, so the very first
   read refreshes too.
10. Untouched: `ctx.breakerOff` (~707, the breaker walk's), `mapNoisy` (public data), `checkMissionOrders` (pure, data
    time: plans with every source live).

### 2. Tests
#### `tests/noiseZones.test.ts` (new; ~190 lines)
Copy (do not import across test files) the stand-in guard, `manager(wall)` and `cast` of `tests/hearing.test.ts`
(~98-163). A fake `BreakerHost` `{ switchOf: vi.fn(() => false), isOff: vi.fn((g) => off.has(g)), reset: vi.fn() }`
assigned to `em.breakers`; consoles through `em.consoleState(id, x, y, z, on)` (as `tests/consoleFault.test.ts`
does). The tick: `(em as unknown as { noiseStep(): void }).noiseStep()`. `flags.noiseZones = true` in `beforeEach`
(restored in `afterEach`) except where a case says off. One `it` each (PLAN "Unit"):
1. Flag off: a manager built with `layout.guardAi.noisy` and a `setNoisy([...])` both mask nothing: a guard beside a
   12 dB source hears the footstep 3 m off (`hearTurn` called), `ambientAt` 0; `mapNoisy` still holds the data.
2. Flag on, no power link: today's masking exactly (the 12 dB footstep case of `hearing.test.ts` ~213-225: no
   `hearTurn` beside it, `hearTurn` away from it); `isOff` never called (no grouped source).
3. No breaker host (`em.breakers` null): a source on circuit 55 is live (masks); an `on: 'off'` source is not (S4-b).
4. The mask follows a toggle on the next tick: circuit 55 on -> masked; `off.add(55)` -> still masked until
   `noiseStep`, then the footstep is heard; back on + `noiseStep` -> masked again. An `on: 'off'` source inverts it.
5. A console group (`CONSOLE_GROUP + i`): live while the console reports on, not after `consoleState(..., false)` and a
   tick; an unknown console index reads on (live).
6. `ambientAt` equals the listener sum (`ambientDb` with the same mask at that point: 12 at the centre, 6 at half the
   radius) and refreshes without an AI tick: toggle the host, two reads with no `noiseStep` between: the second reads 0
   (and the first already does when no tick ran since the previous read).
7. The voice: two guards 4 m apart beside a live 12 dB source: `hearsShout` (private, by cast) is -1; the source's
   circuit off + a tick: it returns the distance.
8. The mask is a `Uint8Array` of the list's length; it keeps its identity over 200 ticks and over a second `setNoisy`
   of the same length; a longer list gets a new one (load time).
9. `update` calls it: if `em.update(1 / 60)` runs on the harness, assert `aiTicks` grows by one per update; if the stub
   world cannot run `update`, copy the world of `tests/consoleNoticeA4.test.ts` (it drives `em.update`) for this one
   case, or say in the report that the e2e covers it.

#### Existing tests that rely on masking with no flag (preamble: update assertions in the same change)
- `tests/hearing.test.ts` (~213-225, 'a guard by a 12 dB generator does not hear a footstep 3 m off; one away from it
  does'): set `flags.noiseZones = true` for that case (try / finally restore). Its numbers stay.
- `tests/missionOrdersManager.test.ts` (S1a-2's bell case "beside a 12 dB generator (`em.setNoisy`) -> unheard"): the
  same. grep `setNoisy\|noisy:` over `tests/` on your base for any other case and do the same.
- `tests/postsWiring.test.ts` (~269-290): 'the map's noisy things load as the masking ...' (`expect((em as ...).noisy)
  .toBe(noisy)`) and 'masking from the map data ...': the same flag lines, **only once the lead answers open question
  3** (the file is not in the job's claims). Until then, report them as the two expected failures.

### 3. e2e (`scripts/e2e-stealth-ai.mjs`, written by you, run only by the lead)
Append `&noisezones=1` to the launch params (~12, after S3's `&areaalarms=1`) with a comment (S4-d: the warehouse has no
noisy data, so no other scenario changes). New `await scen('noise zone (guard-ai-mission-hooks S4)', async () => { ...
})` after S3's 'area alarm' scenario, before `const real = errors.filter(...)`. Seeded `Math.random`, `t.light(0)`, the
player hidden at (-22, -24) crouched (as S1a-2's scenario); the circuit from the 'breaker' scenario (~1483-1510:
`switch-4`, `grp = g.world.layout.switches[4].group`, `sw.onUse(sw, 'local')` cuts or restores it); in `finally`
`em.setNoisy(em.mapNoisy)` and the switch back on.
- Pick a source point S on open floor at least 12 m from switch-4's lamps (the `floor(x, z)` check of the 'dog
  release' scenario ~3300-3325) and a control point C 12+ m from S. `em.setNoisy([{ id: 'e2e-gen', x: S.x, z: S.z,
  radius: 8, db: 12, group: grp }])`; step 0.1 s.
- (a) `em.ambientAt(S.x, 0, S.z)` is 12 (+-0.01), 0 at C. A guard G 3 m from S and H 3 m from C (spawned, calm): a
  footstep (`em.hear(new t.V(...), 4)`) 3 m from each: H turns (`turning` within 0.3 s, as S1a-2's bystander check), G
  does not.
- (b) Cut the circuit: with no step, two `ambientAt` reads: the second is 0 (the HUD read refreshes itself); step one
  tick: `ambientAt(S)` 0. Spawn a fresh G2 where G stood (so the dark fixtures are not his news) and the same footstep
  in the next step: G2 turns.
- (c) Restore the circuit, step one tick: `ambientAt(S)` 12 again.
- The lead requests: the head's `affected-e2e` gate plus `e2e-guard-carry` and `e2e-sectorops --part=1`; deciding
  suite `e2e-stealth-ai --only=noise zone`, plus `--only=noise` and `--only=walls` (hearing paths this slice touches).

## Docs
- No `docs/systems/ai.md` edit. In your report, the line for the lead to add to the hearing bullet (~66-72, after S2's
  power-linked sentence): with `noiseZones` on the manager keeps a live mask per source, refreshed once per AI tick from
  the switches (`BreakerHost.isOff`; consoles as the breaker walk reads them; no breaker host: on); off, map and
  section `noisy` data are ignored; `EnemyManager.ambientAt(x, y, z)` is the masking at a point for the HUD meter (D9).
- No changelog fragment (the lead's). No TESTING.md change.

## Rules
- Hot path: per AI tick one `refreshNoise` (skipped when no source has a group; N sources x one `isOff`, which loops
  the switches and the circuit's lamps, no allocation); per listener one extra mask read in `ambientDb`. The mask is
  made at `setNoisy` only (section load). `ambientAt` allocates nothing. `hyp2` / `hyp3`, never `Math.hypot`.
- Gameplay never reads graphics: the switch state (`BreakerHost`), the console faults and the noise model only.
- Co-op: host / solo only (the manager simulates guards); no wire or save change; no `PROTOCOL_VERSION`.
- Must NOT touch: `src/ai/hearing.ts`, `src/ai/guardAiData.ts` (S2, done), `src/ai/enemy.ts`, `src/core/flags.ts`,
  `src/game/**`, `src/world/maps/**`, `docs/systems/ai.md`, any other test or script.

## Checks
`npm run typecheck:fast` and
`npx vitest run tests/noiseZones.test.ts tests/hearing.test.ts tests/combatHearing.test.ts tests/marlowHoldNoise.test.ts tests/guardAiData.test.ts tests/postsWiring.test.ts tests/consoleFault.test.ts tests/consoleNoticeA4.test.ts tests/breaker.test.ts tests/alarmCall.test.ts tests/radioWiring.test.ts tests/missionOrdersManager.test.ts tests/missionGroups.test.ts`
(`alarmCall` / `radioWiring` drive `hearsShout`.) Never `npm run check`. Before changing the masking default, grep
`tests/` and `scripts/` for `setNoisy`, `mapNoisy`, `noisy:` (preamble). Report: built, numbers used, files, commits,
tests changed, results, the ai.md line, what Michael should try (nothing until a map's sources land: D8 data owners).

## Done looks like (flag on)
- A source on a circuit masks while the circuit is on and stops on the next AI tick after it is cut (`on: 'off'`
  inverted; a console group as the breaker walk reads it; no breaker host: on).
- `ambientAt` reads the guards' own masking, fresh even with no AI tick.
- Flag off: no masking from any data; the edited tests green with the flag on; tsc clean; ai.md line reported.

## Est. lines
| File | PLAN | Re-estimate |
| --- | --- | --- |
| `src/ai/enemyManager.ts` | ~80 | ~70 |
| `tests/noiseZones.test.ts` | ~120 | ~190 (harness copy ~70, console and voice cases) |
| `tests/hearing.test.ts`, `tests/missionOrdersManager.test.ts`, `tests/postsWiring.test.ts` | 0 | ~15 (flag lines) |
| `scripts/e2e-stealth-ai.mjs` | ~100 | ~110 |
| Total | 300 | ~385 |

At J15 PR4's ~1.5x test overrun S4 lands ~520: far under the cap, no split.

## Assumptions (logged here; closest to PLAN / BRIEF)
- S4-a: "flag off: both the constructor's `mapNoisy` and `setNoisy` store []" is built as one gate in `setNoisy`, which
  the constructor now calls: the active list is empty; `mapNoisy` keeps the map's data (public, Sector Ops' fallback,
  the dev validation). Same effect on hearing. Undo: also empty `mapNoisy` with the flag off.
- S4-b: no breaker host = every circuit reads on: a plain power-linked source is live (A11 "no breaker system = live");
  an `on: 'off'` source (a standby) is silent. Undo: treat every grouped source as live with no host.
- S4-c: `ambientAt` refreshes the mask when no AI tick ran since its own last read (`hudTick === aiTicks`); on a host
  each frame's tick already did. Undo: refresh on every read (cheap).
- S4-d: the e2e page runs the suite with `?noisezones=1`; the warehouse has no noisy data, so nothing else changes.
  Undo: a second page.
- S4-e: a console group is read through `consoles.isOff(consoles.ofGroup(g))`, as `ctx.breakerOff` does (PLAN Design 3,
  re-check polish); `validateNoisy` accepts it (S2-e).

## PLAN pointer drift (PLAN says -> now, b111c9aa1)
- The constructor's `mapNoisy` 559-560 -> 590-591; `setNoisy` 2356 -> 2532; `ctx.breakerOff` 676 -> 707; `tierOf` 2728
  -> 2931 (its `ambientDb` call 2932); "the voice call" is `hearsShout` 2667-2680 (its `ambientDb` call 2670), used by
  `voice` ~2650 and `contactThrough` ~928; `update` 3744.
- `hearing.ts` (S2, 77d6f45b2): `ambientDb(src, x, z, y?, live?: ArrayLike<number>)` skips `live[i] === 0`;
  `sourceLive(s, off)` holds the `on` inversion; `NoisySource.group` / `on`. S2's `guardAiData.ts` `validateNoisy`
  keeps `NOISY_LIMITS` 0-30 dB / 1-20 m (lead decision on S2), not PLAN's 0-24 / 1-40.
- `BreakerHost.isOff` (`breaker.ts` ~18) is implemented in `stealthSystems.ts` ~387-399; `em.breakers` is set at
  ~125 and cleared on dispose ~733. `ConsoleFaults.isOff` / `ofGroup` `consoleFault.ts` ~91-99, ~164.
- Tests that read masking with no flag today: `hearing.test.ts` ~213-225, `postsWiring.test.ts` ~269-290 (and S1a-2's
  bell case). PLAN does not list them.
- Master a28d18530 (no J15 yet) edits `enemyManager.ts` (alloc fixes): the real base moves lines by tens; quote by
  content.

## Open questions for the lead (PLAN facts that do not hold on the head; the design is not changed here)
1. D9 / Design 3: "`ambientAt` ... refreshes the mask itself ... (a co-op client does not tick the AI)" and the HUD
   owner's `g.enemyMgr.ambientAt(x, y, z)`: a co-op client has **no** `EnemyManager` at all (`gameState.ts` ~697-705:
   `enemyMgr` is made only when not `puppet`). So on a client the HUD cannot read it through the manager. S4 still
   builds the self-refresh (paused host, frames with no tick). The client path is the HUD owner's call (for example
   `ambientDb` + `sourceLive` from `hearing.ts` with the client's own switch state). Pass to the HUD owner as is?
2. `BreakerHost.isOff` means "a cut a guard puts right", not "the power is off": it reads false while a timed isolator
   window runs (`boards.holding`), for a course mains gate's circuit, and when a lamp of the circuit is lit by other
   means (`stealthSystems.ts` ~387-399). A source on such a circuit keeps masking while its power is out. PLAN (A11)
   names `isOff`; this brief follows it. Split Shift's 55 / 56 are an untimed board (`campusS2.ts` ~188), so the D8
   twist is not affected. Accept, or ask for a power read on `BreakerHost` (a `stealthSystems.ts` change, not this
   job's file)?
3. The flag-off gate changes two tested behaviours in `tests/postsWiring.test.ts` (~269-290), a file not in the job's
   claims: add it to the claims for two flag lines (proposed), or move those cases into `tests/noiseZones.test.ts` and
   let the J15 owner drop them?
4. `on: 'off'` with no breaker host reads silent (S4-b). OK?

## Lead decisions (pending)
- 1 (client meter path): proposed pass to the HUD owner (D9 note), no S4 change.
- 2 (`isOff` as the power read): proposed accept for the prototypes.
- 3 (`postsWiring.test.ts`): proposed add to the claims (two flag lines).
- 4 (`on: 'off'` with no host): proposed silent.
- No split.
