# guard-ai-mission-hooks S3: per-area alarm stages (slice brief)
Owner: Guard AI Build. Status: current.

Pinned on `origin/feature/guard-rules-pr4` b111c9aa1 (master 2148ec969 + all of J15 PR1-PR4: S5 repeat alarms, S1 the
helmet rule). S3 edits `enemy.ts` / `enemyManager.ts` after S1a-2 and S1b, which add order code there but no alarm code:
**re-pin every anchor on your real base before building.** Anchors are quoted by content; line numbers are "~N on
b111c9aa1" only.

Builder: Opus 5.5 (AI code). Ships DARK behind `flags.areaAlarms` (S1a-1 added it; `?areaalarms=1`). Rows: D6.
Assumptions: A9 (assumed and logged, G358; switch-on by Michael's Q1 on the walk card), A10, A14
(`docs/guard-ai-mission-hooks/BRIEF.md`). Source: `PLAN.md` "Slices" S3, Design section 2, "Order with J15" (the
per-area lock and count, the helmet rule), Coordination C5.

## Goal
With `?areaalarms=1` and areas set by the mission (`setAreas`, Campaign Build C5), each guard has an area (0 or 1; -1 =
site only) from the point he was placed. A guard's radio command call raises only his area: each area has its own lock
and count on J15's repeat rule (max 3 per area; the lock opens when that alarm's team searches or `rearm` 60 s after)
and its own command call, so one area's alarm never blocks the other's. A panel alarm stays site-wide on J15's lock.
`setAreaStage(area, stage)` gives that area's guards the stage gear (helmet rule `stage` only); a guard's gear and carry
rule read max(site, his area). `alarmArea` names the raiser's area before `onAlarm` fires. No areas, or the flag off:
J15's rule exactly.

## Location
- Worktree `C:/NightShift/Mobile-Coop-guard-ai-mission-hooks-s3`, branch `feature/guard-ai-mission-hooks-s3`, cut by the
  lead from S1b's merge head (master after the S1b PR; or S1b's passed head if the lead stacks). Start from
  `docs/systems/agent-preamble.md` (origin/master); branch guard before every write; commit and push each finished
  sub-step, `git add <your files>` only.
- If the lead takes the split (lead decision 1): **S3a** = Part 1 (pure, file-disjoint from every other slice: worktree
  `...-s3a`, branch `feature/guard-ai-mission-hooks-s3a`, cut from any master head after J15 PR4 and S1a-1, and it may
  run now, beside S1a-2 / S1b); **S3b** = Part 2 (worktree `...-s3b`, branch `feature/guard-ai-mission-hooks-s3b`, cut
  from S1b's merge head with S3a merged). Each its own PR.
- Slice order on the shared files: S1a-2 -> S1b -> **S3 (S3b)** -> S4.

## Files owned
- `src/ai/areaAlarms.ts` (new), `src/ai/enemyManager.ts`, `src/ai/enemy.ts`
- `tests/areaAlarms.test.ts` (new), `tests/areaAlarmsManager.test.ts` (new)
- `scripts/e2e-stealth-ai.mjs`
- No `docs/systems/ai.md` edit (not in the job's claims): write your ai.md lines in the report; the lead folds them.
- Read only: `src/ai/alarm.ts` (`CommandCall`, `ALARM_REPEAT`), `src/ai/gear.ts`, `src/ai/archetypes.ts`,
  `src/ai/radioNet.ts`, `src/ai/carryState.ts`, `src/game/modes/sectorMode.ts`, and J15's tests (keep them green,
  unedited).

## Steps
### Part 1 (S3a if split): the pure module and its tests
#### 1. `src/ai/areaAlarms.ts` (new, pure: no Babylon, no DOM, no flag, no `src/game` import; ~190 lines)
Imports: `ALARM_REPEAT` from `./alarm` (pure: it imports only `hyp2`). Header: per-area alarm stages (D6, A9, A10), the
site stage over two areas, one lock and count per area on J15 S5's rule, allocation-free.
1. Types and table:
   ```ts
   /** An alarm area (Campaign Build's track shape, C5): plan boxes [minX, minZ, maxX, maxZ] and an optional height
    *  band [lo, hi] (m). */
   export interface AreaBox {
     boxes: readonly (readonly [number, number, number, number])[];
     y?: readonly [number, number];
   }
   export const AREAS = { max: 2 } as const;
   /** The site (no area; a panel alarm). */
   export const SITE = -1;
   ```
2. `areaOf(areas: readonly AreaBox[] | null, x: number, z: number, y: number): number`: the first area `i <
   AREAS.max` with a box holding (x, z) (`minX <= x <= maxX`, same for z) and, when it has `y`, `lo <= y <= hi`; else
   -1. `null` / `[]` -> -1. A third area and later are ignored (S3-g). Placement time only.
3. `export class AreaStages` (fixed, typed arrays sized `AREAS.max`; no method allocates):
   - `site = 0` (the site stage, mirrored from `setAlarmStage`), `stage = new Int8Array(AREAS.max)`.
   - `stageFor(area: number): number`: area outside 0..max-1 -> `site`; else `max(site, stage[area])`.
   - The lock per area (J15 S5's rule, one per area): `raised`, `rearmed`, `count` (`Uint8Array`), `ago`
     (`Float32Array`), `team0`, `teamN` (`Int32Array`).
   - `open(a): boolean` = `raised[a] === 0 || rearmed[a] === 1`. `any(): boolean` (an area alarm raised since the
     load).
   - `raise(a, teams: number): void`: raised 1, rearmed 0, ago 0, count + 1, `team0 = teamN = teams` (the manager sets
     `teamN` after `onAlarm`, as J15 does for the site).
   - `waiting(a, repeatOn: boolean): boolean`: `repeatOn && ALARM_REPEAT.enabled && raised[a] === 1 && rearmed[a] ===
     0 && count[a] >= 1 && count[a] < ALARM_REPEAT.max`.
   - `tick(a, dt): boolean`: `ago[a] += dt`; true when `ago[a] >= ALARM_REPEAT.rearm`. `rearm(a)`: rearmed 1.
   - `resetLocks()` (every section load / restart, with J15's `resetAlarm`): every lock field 0. `clearStages()`:
     `site` and `stage` 0.

#### 2. `tests/areaAlarms.test.ts` (new; pure, node; ~230 lines)
1. `areaOf`: a point in box 0 -> 0; in a second box of area 0 -> 0; in area 1 -> 1; outside -> -1; in both -> 0 (the
   first); inside the boxes but outside area 0's height band -> area 1 if its box holds it, else -1; no band: any
   height; `null` / `[]` -> -1; a third area is ignored.
2. `stageFor`: site 0, area 1 at 2 -> 2 for area 1, 0 for area 0 and -1; site 3 over area 1 at 2 -> 3; area 5 -> site.
3. Locks: both open at first; `raise(0)` shuts 0 only, `count[0]` 1; `waiting` only with repeats on; `tick` true at
   `ALARM_REPEAT.rearm` (+-dt) not before; `rearm(0)` opens 0; after `ALARM_REPEAT.max` raises `waiting` is false
   (never a fourth); `resetLocks` clears lock and count, keeps the stages; `clearStages` clears the stages; the typed
   arrays keep their identity (`toBe`).

### Part 2 (S3b if split): wiring, its tests, the e2e
#### 3. `src/ai/enemy.ts` (~30 lines; tag `(guard-ai-mission-hooks S3)`)
1. Field after `zoneR = 0;` (~1720, the sector tags block): `/** (S3, A9, A10) His alarm area (0 or 1: the area box
   holding the point he was placed at; -1: site only). The manager sets it; a woken guard keeps it. */ area = -1;`
2. `inherit(o, downFor)` (~1087): after `this.zoneR = o.zoneR;` add `this.area = o.area;`.
3. `interface AiContext` (~131): after `alarmStage?(): number;` (~182):
   `/** (S3) His alarm stage: max(site, his area) with areas set, else the site stage (absent: `alarmStage`). */`
   `areaStage?(e: Enemy): number;`
   `/** (S3) An alarm raised for him: the site's, or his area's with areas set (absent: `alarmRaised`). */`
   `areaRaised?(e: Enemy): boolean;`
4. `carryCalm()` (~1759): `const alarm = this.ctx.alarmRaised() || (this.ctx.alarmStage?.() ?? 0) > 0;` becomes
   `const alarm = (this.ctx.areaRaised?.(this) ?? this.ctx.alarmRaised()) || (this.ctx.areaStage?.(this) ??
   this.ctx.alarmStage?.() ?? 0) > 0;` with a comment (A9: "a guard reads max(site, his area) for gear and calm rules").
   Test stubs without the new ctx methods keep today's reading.

#### 4. `src/ai/enemyManager.ts` (~280 lines; tag `(guard-ai-mission-hooks S3)`)
1. Import: `import { AREAS, areaOf, AreaStages, SITE, type AreaBox } from './areaAlarms';` (`CommandCall` ~19,
   `stageGear` / `GuardGear` ~41, `flags` ~52 are imported already).
2. Fields after `alarmBy: '' | 'panel' | 'radio' = '';` (~276), each with a doc line:
   - `private areas: readonly AreaBox[] | null = null;`
   - `readonly areaSt = new AreaStages();` (tests read it)
   - `alarmArea = -1;` (the area of the last guard alarm: 0 / 1, -1 site; set before `onAlarm` fires, C5 reads it)
   - `private readonly areaCmd: readonly CommandCall[] = [new CommandCall(), new CommandCall()];` and
     `private readonly areaCmdId = new Int32Array(AREAS.max);` (each area's command call and its net call id, 0 none)
   - `private siteCmdId = 0;` (the site command call's net id; read only with areas set, step 13)
   - `private readonly gearS: GuardGear = { helmet: false, armour: false };` (scratch)
   - `get alarmsRaised(): number` = `guardAlarms + areaSt.count[0] + areaSt.count[1]` (every guard alarm this load).
   - Doc of `guardAlarms` (~263): add "(S3) with areas: the site lock's count only; each area's is `areaSt.count`".
   - Doc of `alarmRaised` (~254): add "(S3) with areas: a site raise only (an area raise is `areaSt.raised`), so an area
     alarm never shuts the panels' lock".
3. Public API, after `useDifficultyHelmets` (~1125-1127):
   - `setAreas(areas: readonly AreaBox[] | null): void` (C5, at the bind): `this.areas = flags.areaAlarms && areas &&
     areas.length ? areas : null;` `areaSt.clearStages()` then `areaSt.site = this.alarmStage`; `areaSt.resetLocks()`;
     every living guard's `area` again from his placement point (`areaOf(this.areas, e.zoneX, e.zoneZ, e.pos.y)`;
     `placeSlot` sets `zoneX / zoneZ` to it) or -1. Kept through `clear()` (the mission's, as `setMissionMap`).
   - `setAreaStage(area: number, stage: number): void` (C5, each area rise): no areas or area outside 0..max-1: return.
     `areaSt.stage[area] = stage`; each living guard with `e.area === area` gets `giveStageGear(e)`. Later placements in
     that area read it in `placeSlot`.
   - `areaStageOf(e: Enemy): number`: areas ? `areaSt.stageFor(e.area)` : `alarmStage`.
   - `alarmOpenIn(area: number): boolean`: no areas or `area < 0` -> `alarmOpen()`; else `areaSt.open(area)`.
4. `setAlarmStage(stage, now)` (~1111): after `this.alarmStage = stage;` add `this.areaSt.site = stage;`.
5. `giveStageGear(e)` (~1143): `const g = this.alarmGear;` becomes
   `const g = this.areas && this.helmetRule === 'stage' ? stageGear(this.areaSt.stageFor(e.area), this.gearS) :
   this.alarmGear;` with the comment "(S3, PLAN 'Order with J15') area gear changes only the `stage` tier; `always` /
   `locked` keep the site stage's gear" (S3-b). `ruleHelmet` is untouched.
6. Areas at placement (A10):
   - `placeSlot` (~2126): first line of the body, before `this.giveStageGear(e)`: `e.area = this.areas ?
     areaOf(this.areas, e.pos.x, e.pos.z, e.pos.y) : -1;` (called right after `spawn`: his spawn point; Sector Ops'
     reinforcements are placed here at their entry point, `sectorMode.ts` ~923).
   - `spawnReinforcement` (~986): after `if (!e) return null;`: the same from `at` (StealthSystems' teams,
     `stealthSystems.ts` ~600).
   - `revive` (~1734): nothing (`inherit` copies `area`).
7. The ctx (~746-751), after `alarmStage: () => this.alarmStage,`: `areaStage: (e) => this.areaStageOf(e),` and
   `areaRaised: (e) => this.areaRaisedFor(e),` with a private `areaRaisedFor(e)`: no areas -> `this.alarmRaised`; else
   `this.alarmRaised || (e.area >= 0 && e.area < AREAS.max && this.areaSt.raised[e.area] === 1)`.
8. `resetAlarm()` (~829): add `this.alarmArea = -1; this.areaSt.resetLocks(); for each area: this.areaCmd[a].clear();
   this.areaCmdId.fill(0); this.siteCmdId = 0;` (the area stages stay: the mission sets them, S3-e).
9. `raiseAlarm(e, p)` (~889) -> `raiseAlarm(e: Enemy, p: AlarmPanel | null, area: number = SITE)` (J15's tests call it
   with two arguments: site, unchanged). First lines:
   `// (S3, A9) with areas, a radio alarm of an area raises that area only (its own lock and count); a panel and a`
   `// caller with no area raise the site (J15's lock)`
   `if (this.areas && !p && area >= 0 && area < AREAS.max) { this.raiseArea(e, area); return; }`
   then J15's body unchanged, plus `this.alarmArea = SITE;` right before `this.onAlarm?.(e, p);`.
   New `private raiseArea(e, a)`: `if (!this.areaSt.open(a)) return;` `this.areaSt.raise(a, this.teams.length);`
   `this.alarmBy = 'radio';` the alarm's intruder exactly as J15's lines (~900-903: `const ch = this.contactHunt;
   this.alarmHunt = ...`; move them into a small private `huntOf(e)` used by both), `this.alarmK = 0;`
   `this.areaCmd[a]!.raised();` `this.alarmArea = a;` `this.onAlarm?.(e, null);` then `this.areaSt.teamN[a] =
   this.teams.length;`. It does not set `alarmRaised`, `rearmed`, `guardAlarms` or `alarmRunner` (the site's), and it
   does not settle the site's command call (S3-c).
10. `contactThrough(caller)` (~919): with areas and a caller with an area, the area's command call:
    `const c = this.byNum(caller);` `const a = this.areas && c && c.area >= 0 ? c.area : SITE;`
    `const cmd = a >= 0 ? this.areaCmd[a]! : this.command;`; the gate `!this.alarmOpen()` -> `!this.alarmOpenIn(a)`;
    `this.command.owe()` -> `cmd.owe()`; `this.nextCaller()` -> `this.nextCaller(a)`; `this.startCommand(who)` ->
    `this.startCommand(who, a)`; `this.command.lapse()` -> `cmd.lapse()`. The officer-in-voice-range pick is unchanged.
11. `startCommand(e)` (~965) -> `startCommand(e: Enemy, area: number = SITE)`: `cmd` as above; `refused` / `start` on
    `cmd`; then `if (area >= 0) this.areaCmdId[area] = id; else this.siteCmdId = id;`.
12. `nextCaller()` (~947) -> `nextCaller(area: number = SITE)`: the score gains `(area >= 0 && e.area !== area ? 500 :
    0)` (out of sight first still wins: 1000; then his area; then the officer; then the key; A7 fixed order).
13. `radioStep(dt)` (~2703): J15's command tick (`if (this.command.tick(dt, this.radioNet.commandOpen)) {`, ~2715)
    reads `commandOpen`, which is true for any open command call in the section. With areas set it reads
    `this.radioNet.isOpen(this.siteCmdId)` instead (no areas: `commandOpen`, J15 exact). Then, with areas only, per area
    `a`: `const cm = this.areaCmd[a]!; if (cm.tick(dt, this.radioNet.isOpen(this.areaCmdId[a]!))) { const c =
    this.alarmOpenIn(a) ? this.nextCaller(a) : null; if (c) this.startCommand(c, a); else cm.lapse(); }`.
14. `radioAlarm(caller)` (~2751): the area of the call that completed: `a` = the area whose `areaCmd[a].caller ===
    caller` (areas set), else `SITE`. The gate `!this.alarmOpen()` -> `!this.alarmOpenIn(a)`; `this.raiseAlarm(e,
    null)` -> `this.raiseAlarm(e, null, a)`; the tally (`const n = this.guardAlarms; ... if (this.guardAlarms > n)`)
    compares `alarmsRaised` instead.
15. `repeatStep(dt)` (~860): before J15's early return (`if (!this.alarmRaised || this.rearmed || ...) return;`) add
    the area loop: `if (this.areas) for (let a = 0; a < AREAS.max; a++) if (this.areaSt.waiting(a, this.alarmRepeat))
    { if (this.areaSt.tick(a, dt) || this.teamSearching(this.areaSt.team0[a]!, this.areaSt.teamN[a]!))
    this.areaSt.rearm(a); }`. J15's site part is unchanged (it counts `guardAlarms`, the site's).
16. `sink.completed` (~458): `if (this.alarmRaised && this.alarmHunt < 0) this.alarmHunt = inc;` -> `if
    ((this.alarmRaised || this.areaSt.any()) && this.alarmHunt < 0) ...` (an area alarm raised with no intruder sends
    its reinforcements after the next one a contact names, as the site's does).
17. `clear()` (~3996): after `this.command.clear();` add the two area command calls' `clear()` and `areaCmdId.fill(0)`;
    `areas` and the area stages stay (S3-e).
18. Untouched: `alarmOpen()` (the site lock: panels, the Enemy's panel run through ctx `alarmOpen`, `assignAlarm`
    ~1636), `assignAlarm`, `useDifficultyHelmets`, `ruleHelmet`, `joinTeam`, J15's `teamSearching`.

#### 5. `tests/areaAlarmsManager.test.ts` (new; ~330 lines)
Copy (do not import across test files) the `fake(...)` guard, the manager harness and the `priv` cast of
`tests/alarmRepeat.test.ts` (~26-136: `Priv`, `fake`, `manager`, `teamOnAlarm`, `radioAlarm`), adding `area`, `zoneX`,
`zoneZ` to the fake. `flags.areaAlarms = true` in `beforeEach`, restored in `afterEach`. Two boxes: area 0 [-10, -10, 0, 10], area 1 [0.01, -10, 10, 10]. Cases (PLAN
"Unit", one `it` each):
1. Flag off: `setAreas(boxes)` stores nothing; an area-0 guard's radio alarm is J15's (`alarmArea` -1, `guardAlarms` 1,
   `alarmRaised`), a second from area 1 is shut.
2. A radio alarm in area 0 leaves area 1 free: `alarmArea` 0 read inside the `onAlarm` spy; `areaSt.count[0]` 1,
   `guardAlarms` 0, `alarmRaised` false, `alarmOpen()` true (panels free), `alarmOpenIn(0)` false, `alarmOpenIn(1)`
   true; then area 1's radio alarm raises (`alarmArea` 1).
3. Command calls per area: area 0's command call in flight (`priv(em).areaCmd[0].caller` set), area 1's contact gets
   through -> area 1 holds its own command call (two open on the net); area 0's raise leaves area 1 owed until its own
   call raises it.
4. Per-area repeat (with `alarmRepeat`): area 0 rearms when its own team searches (made by the `onAlarm` spy with
   `newTeam`) or after `ALARM_REPEAT.rearm`, area 1 unchanged; at most `ALARM_REPEAT.max` per area; `resetAlarm`
   clears both areas' locks, counts and command calls.
5. A panel stays site-wide: `raiseAlarm(e, panel)` from an area-0 guard -> `alarmArea` -1, `guardAlarms` 1, both area
   locks open; a caller with no area (-1) raises the site lock.
6. Gear (helmet rule `stage`): `setAreaStage(0, 2)` gives the area-0 guard helmet and armour (`setGear`), not the
   area-1 guard; a guard placed in area 0 later gets it, one in area 1 not; `setAlarmStage(2)` reaches both. Rule
   `always`: `setAreaStage(0, 2)` gives no area gear (site stage only) and `ruleHelmet`'s placement helmet is as J15's.
7. Areas at placement: `placeSlot` from the spawn point (a point inside area 0's boxes but outside its height band ->
   -1); `spawnReinforcement` from its entry point; `setAreas` recomputes living guards from `zoneX / zoneZ`; `clear()`
   keeps the areas.
8. The carry rule's reads: with areas, after an area-0 alarm `ctx.areaRaised` is true for an area-0 guard and false for
   an area-1 guard; `ctx.areaStage` = max(site, area); no areas: they equal `alarmRaised` / `alarmStage`. On the Enemy
   (a bare-prototype probe as `tests/postsWiring.test.ts` ~320-372 builds it): `inherit` copies `area`.
9. `nextCaller(area)`: of two guards in the fight, out of sight, the area's guard is picked over a lower key in the
   other area; a guard in sight loses to one out of sight whatever his area.
10. No areas = J15: `setAreas(null)`; one raise and the second shut as J15's rule (the J15 files below also run
    unchanged in the check command).
11. No allocation: `areaSt` arrays and `areaCmd` keep their identity over 200 `repeatStep` / `radioStep` calls.

#### 6. e2e (`scripts/e2e-stealth-ai.mjs`, written by you, run only by the lead)
The suite runs one page with URL-only flags: append `&areaalarms=1` to the launch params (~12, after S1a-2's
`&missionorders=1`) with a comment (S3-f: with no `setAreas` call the manager is J15's exactly, so no other scenario
changes). New `await scen('area alarm (guard-ai-mission-hooks S3)', async () => { ... })` after S1b's 'mission group'
scenario, before `const real = errors.filter(...)`. Copy the radio-only setup of 'alarm call' (~1685-1755: panels
`disabled`, `spot()`, `until()`, `t.light(1)`); `em.resetAlarm()` at the start; wrap `em.onAlarm` to record
`em.alarmArea` at each call (restore it in `finally`); `g.mode.pending.length = 0` after each alarm (Clear mode's own
reinforcements); `em.setAreas(null)` in `finally`.
- Boxes: area 0 round the 'alarm call' spotter (0, 5), area 1 round its mate's spot (10, 9) (e.g. [-4, 1, 4, 9] and
  [6, 5, 14, 13]; check the floor at each spawn as the 'dog release' scenario does).
- (a) A spotter at (0, 5) sees the player: his contact, then his command call raise the alarm with `alarmArea` 0;
  then `alarmOpenIn(0)` false, `alarmOpenIn(1)` true, `alarmOpen()` true.
- (b) A second spotter at (10, 9) sees the player (teleported in front of him): the second alarm raises with
  `alarmArea` 1 (Clear mode keeps `alarmRepeat` off: one alarm per area).
- (c) Gear: a calm guard in each box; `em.setAreaStage(0, 2)`: the area-0 guard has helmet and armour, the area-1
  guard neither.
- (d) `em.setAreas(null)`, `em.resetAlarm()`, `t.reset()`: the first spotter raises (`alarmArea` -1); a second sighting
  in the other box raises nothing within 15 s (J15: one guard alarm per load without `alarmRepeat`).
- The lead requests: the head's `affected-e2e` gate plus `e2e-guard-carry` and `e2e-sectorops --part=1` (PLAN "Done":
  green with the flag off); deciding suite `e2e-stealth-ai --only=area alarm`, plus `--only=alarm call` and
  `--only=alarm` (the radio and panel paths this slice reroutes).

## Docs
- No `docs/systems/ai.md` edit. In your report, an "Alarm areas (guard-ai-mission-hooks S3, flag `areaAlarms`)" bullet
  for the lead: `setAreas` / `setAreaStage` / `alarmArea` / `alarmOpenIn`; a guard's area from his placement point
  (kept when woken); a radio alarm raises the caller's area (own lock, count, command call, rearm), a panel the site;
  gear and the carry rule read max(site, area) (gear: helmet rule `stage` only); no areas = J15's rule.
- No changelog fragment (the lead's). No TESTING.md change.

## Rules
- Hot path: per step `repeatStep`'s two-area loop (typed-array reads), `radioStep`'s two area ticks at 10 Hz, the carry
  rule's two ctx reads (O(1)). `areaOf` runs at placement and `setAreas` only; `giveStageGear` at events. No closures,
  iterators, arrays, objects or strings per step (`areaCmd` is made once); `hyp2` / `hyp3`, never `Math.hypot`.
- Fixed and explainable (VISION 8, G143): no randomness; one lock per area; the area is where he was placed.
- Co-op: host / solo only (the manager simulates guards); no wire or save change; no `PROTOCOL_VERSION`.
- Must NOT touch: `src/ai/alarm.ts`, `src/ai/gear.ts`, `src/ai/missionOrders.ts`, `src/ai/hearing.ts`,
  `src/core/flags.ts`, `src/game/**`, `src/world/maps/**`, `docs/systems/ai.md`, J15's tests, any other test or script.

## Checks
`npm run typecheck:fast` and
`npx vitest run tests/areaAlarms.test.ts tests/areaAlarmsManager.test.ts tests/alarmRepeat.test.ts tests/alarmCall.test.ts tests/radioWiring.test.ts tests/helmetRule.test.ts tests/responseWiring.test.ts tests/sectionAlert.test.ts tests/guardGunCarry.test.ts tests/carryState.test.ts tests/responseTeam.test.ts tests/sectorStageActions.test.ts tests/laserAlarm.test.ts tests/campusGear.test.ts tests/missionOrdersManager.test.ts tests/missionGroups.test.ts`
(S3a alone: the first file only.) Never `npm run check`. Report: built, numbers used, files, commits, tests changed,
results, the ai.md lines, what Michael should try (nothing playable until C5: areas come from the mission; on the
warehouse the e2e calls by hand with `?areaalarms=1`).

## Done looks like (flag on, areas set)
- A contact call in area 0 raises area 0 only; area 1 raises its own later; a panel raises the site.
- `setAreaStage` gears only that area's guards (helmet rule `stage`); the carry rule follows max(site, area).
- Flag off or no areas: J15's rule; `alarmRepeat`, `alarmCall`, `radioWiring` unedited and green; `e2e-sectorops:1`
  green; tsc clean; ai.md lines reported.

## Est. lines (and the split: lead decision 1)
| File | PLAN | Re-estimate |
| --- | --- | --- |
| `src/ai/areaAlarms.ts` | ~170 | ~190 |
| `tests/areaAlarms.test.ts` | ~220 | ~230 |
| `src/ai/enemy.ts` | ~40 | ~30 |
| `src/ai/enemyManager.ts` | ~220 | ~280 (per-area command calls and the radio tick, not in PLAN; `huntOf`) |
| `tests/areaAlarmsManager.test.ts` | ~140 | ~330 (harness copy ~110; command calls, gear, carry, callers) |
| `scripts/e2e-stealth-ai.mjs` | ~120 | ~170 (four parts, alarm recorder) |
| Total | 910 | ~1,230 |

S1a-1 ran 1.6x its brief on its module and J15 PR4's slices ~1.5x on tests and e2e; at that rate S3 lands ~1,600, over
the ~1.4k flag. Proposed split (lead decision 1): **S3a** = Part 1 (`areaAlarms.ts` + `tests/areaAlarms.test.ts`, ~420,
pure, no runtime change, file-disjoint from every other slice, so it can run now beside S1a-2 / S1b) and **S3b** =
Part 2 (~810, ~1,150 at the overrun rate), cut from S1b's merge head with S3a merged. Without the split: one PR, and the
builder stops and reports if the diff passes 1,500 lines before step 6.

## Assumptions (logged here; closest to PLAN / BRIEF)
- S3-a: each area has its own command call (`CommandCall` per area, ticked by its own net call id), else a call in
  flight in one area swallows the other's debt (`owe()` refuses, `raised()` clears it): the "Ghost's alarm blocks
  Shadow's" case PLAN's decision rules out. Undo: one command call (`areaCmd` unused).
- S3-b: area gear only under the `stage` helmet rule (PLAN "Order with J15", read literally); on `always` / `locked`
  (Realistic / Perfectionist) the gear follows the site stage only, so an area at stage 2 adds no armour there. Undo:
  drop the `helmetRule === 'stage'` test in `giveStageGear`.
- S3-c: the site lock and the area locks are independent: a panel alarm does not shut an area's radio lock and an area
  alarm does not shut the panels; a panel raise settles only the site's command call. Up to 3 + 3 + 3 guard alarms per
  load can be raised; Sector Ops' stage cap (`alarmQuiet`) still bounds what they send. Undo: `alarmOpenIn(a)` also
  requires `alarmOpen()`.
- S3-d: an area raise does not set `alarmRaised` (J15's site lock reads `!alarmRaised || rearmed`, so setting it would
  shut the panels); its readers that mean "any alarm" read `areaSt.any()` too (`sink.completed`), and the carry rule
  reads `areaRaised`. Undo: set it (the panels then shut on any area alarm).
- S3-e: `setAreas` and the area stages are the mission's: kept through `clear()` and `resetAlarm()`; the locks, counts
  and command calls reset with J15's `resetAlarm` (every section load / restart). After a restart, Campaign Build sets
  the area stages again (C5). Undo: reset the stages in `resetAlarm`.
- S3-f: the e2e page runs the whole suite with `?areaalarms=1` (flags are URL-only, one page); nothing changes without
  a `setAreas` call. Undo: a second page.
- S3-g: two areas at most (PLAN `areaOf` -> 0..1); a third box set is ignored. Undo: `AREAS.max`.
- S3-h: "the alarm hunt prefers the caller's area" (PLAN) is met by the raiser's own intruder (J15's `alarmHunt` rule,
  the raiser being the area's caller); no extra code.

## PLAN pointer drift (PLAN says -> now, b111c9aa1)
- J15 S5 (PLAN "Order with J15"): the lock is `alarmOpen()` ~850 (`!alarmRaised || rearmed`), `repeatStep` ~860-866,
  `teamSearching` ~873, `raiseAlarm` ~889-910, `contactThrough` ~919-935, "the caller" = `nextCaller` ~947 and
  `startCommand` ~965, `assignAlarm` ~1636 (panels: site lock, unchanged), `radioAlarm` ~2751-2759, the command tick in
  `radioStep` ~2715-2719, `resetAlarm` ~829-844; `ALARM_REPEAT` (`max` 3, `rearm` 60) in `alarm.ts` ~68-74;
  `CommandCall` `alarm.ts` ~90 (one per section); `radioNet.commandOpen` `radioNet.ts` ~173 (any command call in the
  section).
- J15 S1 (helmets): `helmetRule` ~523 (`HelmetRule` `archetypes.ts` ~196: 'stage' | 'always' | 'locked'),
  `useDifficultyHelmets` ~1125, `ruleHelmet` ~1132, `giveStageGear` ~1143, `setAlarmStage` ~1111, `alarmGear` ~520;
  `GEAR_BY_STAGE` `gear.ts` ~40 (stage 2 and 3: helmet and armour), `stageGear` ~122.
- "Calm carry ... through ctx `areaStage(e)`": the carry rule is `carryCalm` (`enemy.ts` ~1759) and reads both the
  sticky `alarmRaised()` and `alarmStage?()` (ctx ~176-182); S3 adds `areaRaised` beside `areaStage`.
- "`Enemy.area` at `placeSlot` ..., a reinforcement from its entry": Sector Ops' reinforcements go through `placeSlot`
  at their entry point (`sectorMode.ts` ~923); StealthSystems' through `spawnReinforcement` (~986,
  `stealthSystems.ts` ~600). A woken guard is a new `Enemy`: `inherit` (`enemy.ts` ~1087) copies the area.
- `sectorMode.ts` `onAlarm` (~945) raises the site stage on every guard alarm (`run.raiseAlarm()`); until C5 routes it
  by `alarmArea`, an area alarm in Sector Ops still lifts the site stage (dark: only C5 calls `setAreas`).
- Master a28d18530 (no J15 yet) edits both files (alloc fixes): the real base moves lines by tens; quote by content.

## Open questions for the lead (PLAN facts that do not hold or are silent on the head; the design is not changed)
1. PLAN gives each area a lock and a count but says nothing of the command call, which is one per section
   (`CommandCall`; `radioNet.commandOpen` is section-wide). With one call, area 1's contact during area 0's call is
   lost when area 0's alarm raises (`command.raised()` clears the debt). This brief gives each area its own command
   call (S3-a). OK?
2. "Area gear changes only the `stage` tier": read literally (S3-b), Realistic / Perfectionist get no per-area armour.
   Keep literal, or let area gear apply under every helmet rule (the difficulty's own helmet untouched either way)?
3. Site and area locks independent (S3-c)? It allows up to 9 guard alarms a load (3 site + 3 per area); the stage cap
   bounds the reinforcements.
4. The size: split S3 into S3a / S3b (above)?

## Lead decisions (taken 2026-10-26 ~08:35, Guard AI Build: every proposal below adopted)
- 1 (split S3a / S3b): TAKEN, SPLIT (S3a can start now, in parallel).
- 2 (a command call per area, S3-a): TAKEN, YES.
- 3 (area gear under `stage` only, S3-b): TAKEN, literal PLAN.
- 4 (independent locks, S3-c): TAKEN, YES.
