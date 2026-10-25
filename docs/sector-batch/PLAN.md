# sector-batch - plan

Owner: Night Shift | Sector Ops Build. Status: current.

Opus plan for `docs/sector-batch/BRIEF.md` (FOLDED-PLAN J18). B1 and B2 lines are on origin/master b81c4945 (train
96, PR A's base; every B1 / B2 code line is unchanged on 9ad370a9, train 101); B3 code lines on origin/master 01aa415c
(train 99) and its doc lines on 9ad370a9 (the J2 fold moved them; fix round 2 re-read them); B4 lines on
origin/feature/coop4 3100d035 (#317's head: B4 is cut from master after #317 merges, BRIEF A24); B5 lines on
origin/feature/visual-gate 07eefea0. Five slices: B1-B2 make PR A (`feature/sector-batch`), B4 makes PR B
(`feature/sector-batch-out`), B3 makes PR C (`feature/sector-batch-light`, BRIEF A16, A23), B5 lands inside the
visual-gate job (BRIEF A18). Builders: Sonnet for every slice from `briefs/B<n>.md` (B4 no longer touches `src/net`,
BRIEF A17).

## 1. Slices

| Slice | What | Model | Branch / worktree | Size (changed lines) | PR | Starts |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | Stars fill lower, Perfect, main-menu stars | Sonnet | `feature/sector-batch-b1`, `C:/NightShift/Mobile-Coop-sector-batch-b1` | ~200 | A | now |
| B2 | Solo-route data check (campusOps) | Sonnet | `feature/sector-batch-b2`, `-sector-batch-b2` | ~230 | A | now |
| B3 | One door light threshold at 15% | Sonnet | `feature/sector-batch-light` from origin/master, `-sector-batch-light` | ~60 | C | now |
| B4 | Q20 at 2 players: coop4's OUT rule behind `sectorOutWait` (dark) | Sonnet | `feature/sector-batch-out` from origin/master after #317, `-sector-batch-out` | ~190 | B | when #317 (J4) is on master |
| B5 | Visual-gate fixes V13 V14 V15 V17, fog re-shoot L18 | Sonnet + lead laptop runs | `feature/sector-batch-vg` from origin/feature/visual-gate, `-sector-batch-vg` | ~120 + proof docs | visual-gate's stacked PRs | after laptop run R1 |

B1 and B2 edit disjoint files and merge into `feature/sector-batch` (the lead merges, no conflicts). B3 and B4 are each
cut from origin/master, each its own PR: B3 because its `lighting.md` bullet sits next to #433's merged G45 change
(BRIEF A23); B4 because it edits coop4's lines and waits for #317 (BRIEF A24). PR A ~430 lines, PR B ~190, PR C ~70:
all under the ~1.5k cap. B3 is small: the light constant, two tests and the doc lines that call it 0.05 (most of G41's
15% is already built, BRIEF ask 5). CPU: the desktop is near 100%; B1-B4 are tsc / single-vitest slices and may go to
`cloud-queue` (RULES "Full burn"); the two-page co-op e2e is the laptop's.

## 2. What changes

### B1 - stars, Perfect, menu stars (PR A)
| # | File | Line(s) | Change |
| --- | --- | --- | --- |
| 1 | `src/save/sectorRecord.ts` | :60, :67-71 | `starsOf`: the hardest tier in `done` (index in `DIFFICULTIES`) fills every tier up to it (BRIEF A2); doc comments cite G331. `markCompletedIn` unchanged |
| 2 | `src/game/sectors.ts` | after :711 (`SectorRun.alarmAtStart`), after :789 (`raiseAlarm`), :846-854 `SectorTally`, :861-866 `sectorResult` | `SectorRun.alarmsRaised` (every `raiseAlarm`; a restart does not put it back); `alarms?: number` (alarms raised; omitted: no Perfect); `sectorResult` returns `perfect` (alarms given, kills 0, alarms 0) and adds `  ·  PERFECT` before `  ·  GHOST`; new `resultBadge(r)` -> "PERFECT", "GHOST", "PERFECT  ·  GHOST" or "" (BRIEF A3, A4) |
| 3 | `src/game/modes/sectorMode.ts` | :1011, :1017-1021 | banner subtitle `resultBadge(this.result())`; `result()` passes `alarms: this.run.alarmsRaised`; :39 import |
| 4 | `src/main.ts` | :164, :257 | `starsFor('campusOps')`; the line names Saltmarsh Park and the fill (BRIEF A5) |
| 5 | `src/ui/screens/briefingScreen.ts` | :60 | "No kills and no alarm: Perfect. No kills and never spotted: Ghost." |
| 6 | `tests/sectorRecord.test.ts` | :50-53, add after :53 and :67 | the fill (normal + perfectionist -> 4 stars; realistic -> 3; old save shape) and kv round trip (perfectionist only -> 4 stars, best time perfectionist only) |
| 7 | `tests/sectors.test.ts` | :183, :283 | the restart test: `alarmsRaised` 3 after the restart (the stage goes back, the count does not); the expected object gains `perfect: false` (no alarms given) |
| 8 | `tests/sectorPerfect.test.ts` | new | `sectorResult` Perfect cases and `resultBadge` |
| 9 | `scripts/e2e-sectorops.mjs` | :123, :151-153, :163 | the ghost run's line has PERFECT; every star up to the run's tier filled; an alarm leaves `perfect` false |
| 10 | `TESTING.md` | :46-47 | the stars item: the easier stars fill too, the main-menu counter is Saltmarsh Park's; one new item after :48 (Perfect; no door item, BRIEF A11) |
| 11 | `docs/systems/modes-and-progression.md` | :81-88 | stars built as G331 says; main menu reads campusOps; Perfect on the result line |
| 12 | `changes/feature-sector-batch.md` | new | the fragment for B1-B2, `kind: patch` (no door line: B3's own fragment; a shared file, not in the claims block) |

### B2 - solo-route data check (PR A)
| # | File | Line(s) | Change |
| --- | --- | --- | --- |
| 1 | `src/game/sectorSolo.ts` | new | pure, Babylon-free: `teamDoorPoints(d)` (pair gate `door`, every bolt `at`), `legCrossesDoor(...)`, `checkSoloRoutes(defs, doorAt)`: per section with team doors, at least one route whose legs (`pts[i] -> pts[i+1]`, y from `RoutePt`) cross no team door's leaf (door from `doorAt`, `StageDoorInfo`; leaf widened `SOLO_DOOR_PAD` 0.3 m each side; leg y within `ZONE_Y_TOL` of the leaf's floor); messages name the section, the doors and the routes (BRIEF A6) |
| 2 | `tests/sectorSolo.test.ts` | new | synthetic sections: a pair gate across a corridor, one route through it and one round it (pass), only the route through (fail), a leg on another floor (pass), a bolt (fail), no door at a team door point (an error), no team doors (pass) |
| 3 | `tests/campusSoloRoute.test.ts` | new | `checkSoloRoutes(CAMPUS_SECTORS, doorFinder(b.anchors.doors))` is `[]` on the built campus (as `tests/campusS4.test.ts:35-36` builds it); the rule bites (per section with team doors, one route straight across its first team door at the leaf floor fails alone and passes beside the real routes; no live route crosses a gate at its floor, fix round 2026-10-25 ~23:30) |

On master the team doors are S4's cage pair gate (`src/world/maps/campusS4Data.ts:203`) and S5's pair gate
(`src/world/maps/campusS5Data.ts:183`); S1-S3 have none (J17's v2 adds S2's). A failure stops the builder (BRIEF A8).

### B3 - one door light threshold at 15% (PR C, cut from origin/master; code lines 01aa415c, doc lines 9ad370a9)
Already built (not touched): `DOOR.driveShut` 0.15 (`src/world/doors.ts:51-53`, `drive()` :253) keeps a stick-driven
door under 15% at `open` 0, shut to body, light and sight; a peek crack never moves `open`
(`tests/doors.test.ts:23-31`). B3 changes only the light field's cut for a swinging leaf (BRIEF ask 5, A10).
| # | File | Line(s) | Change |
| --- | --- | --- | --- |
| 1 | `src/world/lightField.ts` | :22, :28-29 | `DOOR_SHUT = 0.15` with the G41 comment (the same number as `DOOR.driveShut`; a crack keeps `open` 0); `DOOR_SHUT` then sits on :34 |
| 2 | `tests/doorLight.test.ts` | new | `DOOR_SHUT` is 0.15 and `DOOR_SHUT === DOOR.driveShut` (one threshold) |
| 3 | `tests/lightField.test.ts` | :359, inside the door test (:347-363) | a leaf 12% into its swing still cuts the lamp; at 0.2 the level equals the door-free field (`tests/torchShadowSet.test.ts:207-213` already reads `DOOR_SHUT` symbolically) |
| 4 | `docs/systems/lighting.md` | :29-30 (the G41 bullet) | "Built (G41, sector-batch): one 15% door threshold ..."; sight and sound point to `ai.md`. :31+ (#433's G45 bullet, merged) untouched |
| 5 | `docs/systems/ai.md` | :12-13 | the light field's cut is the same 15%; not at 15% yet: an ordinary open drops the body at once, so guard sight and hearing pass from 0% (J15, BRIEF A10) |
| 6 | `docs/systems/world-and-characters.md` | :41-42, :44-47 | `DOOR_SHUT` 0.15; the stale "Decided, not built yet" door sentence becomes what is built (CT door menu, one 15% threshold, guards close doors) |
| 7 | `docs/level-design.md` | :359-360 (12.1), :377-378 (12.2's G41 bracket "the code: 5%"), end of 12.3 (:390) | the door fact at 0.15 with what sight and sound do; 12.2's bracket says light is at 15%; a 12.3 bullet lists the map decisions that relied on 0.05 (the builder's grep; expected none), also for the PR body and Marlow Build (CLAUDE.md engine-fact rule) |
| 8 | `changes/feature-sector-batch-light.md` | new | fragment, `kind: patch` (shared file, not claimed) |

### B4 - Q20 at 2 players: coop4's OUT rule behind `sectorOutWait`, dark (PR B, cut from origin/master after #317)
Gate: #317 (coop4, J4) merged on origin/master. coop4 already builds the rule for 3-4 players and B4 reuses all of it
(BRIEF A12-A15, A24): `SectorMode.onPlayerOut(id?)` (coop4 `sectorMode.ts:1429`), `SECTOR.outWaitsMin` 3
(`sectors.ts:541`), `outWaits` / `OUT_LINE` / `OutFollow` (`src/game/sectorOut.ts`), `GameState.outIds`
(`gameState.ts:474`), `NetHooks.returnOut?(ids)` (:236), `CoopHost.goOut` -> `onPlayerOut?.(id === selfId ? 'local' :
id)` (`coopHost.ts:647`) and `returnOut(ids)` (:652), the host follow view (`followStep` :1845), the client's `outSelf`
and OUT line (`coopClient.ts:147`, :651), the `sector` wire's `ot` mask, the return at the connector
(`connEvents` :921) and the extraction (`complete()` :1085). Lines on coop4 3100d035.
| # | File | Line(s) (coop4 3100d035) | Change |
| --- | --- | --- | --- |
| 1 | `src/core/flags.ts` | after :48 (interface) and :129 (object): just above `sectorGuards` (:49-50, :130; :127-128 on master 9ad370a9) | `sectorOutWait: boolean`, `?sectoroutwait=1`, default false; comment with owner and switch-on (BRIEF A1). Not at the list ends nor after `sectorGuards` (coop4's `players`; section 7) |
| 2 | `src/game/sectorOut.ts` | after :12-15 (`outWaits`) | `outWaitsFor(team, twoUp)`: `outWaits(team)` or, with `twoUp`, team >= 2 (solo never). `outWaits` keeps its signature (`tests/sectorOut.test.ts:25` maps it) |
| 3 | `src/game/modes/sectorMode.ts` | :59 import; :1424-1428 comment; :1432 gate | `outWaitsFor(teamSizeOf(g, this.refs), flags.sectorOutWait)` in place of `outWaits(...)`; the comment names the flag. Nothing else |
| 4 | `src/ui/screens/briefingScreen.ts` | :57 (master 9ad370a9) | with the flag, the paragraph says a team-mate has 30 s to revive you, then you are out until the team reaches the next section door; everyone down, or solo, restarts. Off: unchanged |
| 5 | `tests/sectorOut.test.ts` | new `describe` at the end (coop4 file, 449 lines) | flag off by default; `outWaitsFor` table; with the flag at team 2: out, no restart, off the list, the connector cycles with the one up and `returnOut(['b'])`; the host out (OUT line, loadout back); both out restarts; solo restarts; flag off at team 2 restarts (coop4's case) |
| 6 | `scripts/e2e-sectorops.mjs` | header :17-18; new block after part 9's end (:4718) | part 9 also runs two pages with `sectoroutwait=1`: the client down 30 s (the real window), OUT with no restart and the follow view; the host alone cycles the connector and the client is back beside him; out plus the host down restarts |
| 7 | `TESTING.md` | new item after :52 (master 9ad370a9, end of "Sector Ops restart") | the flagged 2-player check (`?sectoroutwait=1` on the host) |
| 8 | `docs/systems/coop.md` | :175 (OUT bullet), :249-251, :581 (coop4 text) | the flag starts the same rule at 2 players |
| 9 | `docs/systems/modes-and-progression.md` | :91-97 (master 9ad370a9, the "Revive syringes" bullet's out sentences) | the out rule as built: 1-2 restart, 3-4 OUT (coop4), 2 OUT with the flag; replaces the fold's "Decided, not built yet (G385)" sentence |
| 10 | `changes/feature-sector-batch-out.md` | new | fragment, `kind: patch` (dark; shared file, not claimed) |
No `src/net`, `gameState.ts`, `gameMode.ts`, `sectors.ts` or wire edit. Size ~190 (tests ~90, e2e ~70).

### B5 - visual-gate fixes (visual-gate job, branch from origin/feature/visual-gate 07eefea0)
| # | File | Line(s) on 07eefea0 | Change |
| --- | --- | --- | --- |
| 1 | `scripts/visual-gate/viewpoints.mjs` | :671-693 (`so-corner`) | `regions.leak` moved onto the haze wedge seen in run R1's so-corner PNGs (V13); `known` kept |
| 2 | `scripts/visual-gate/viewpoints.mjs` | campus views :256-452 | a `wall` region (>= 60 x 60 px at 960 x 540, inside the frame) on one view per section, metrics `['blotch', 'arc']`, no rule bound (V14; VG8 sets bounds) |
| 3 | `tests/visualGateViewpoints.test.ts` | its region-size and shape cases | the new regions pass the existing size test; a case that every campus section has a view with a `wall` region |
| 4 | `docs/visual-gate/proofs/P7.md`, `P1.md` | new | P7 (so-corner on master after the move: red) and P1 (F8 at v4.96.0 vs v4.97.0) tables from runs R2-R3 |
| 5 | `docs/visual-gate/checks/sbvg-build.md` | new | the builder's report |
| 6 | lead: `docs/visual-gate/STATE.md`; `docs/sector-redesign/checks/fog-triage.md:52` (on `feature/sector-batch`, PR A) | | the V15 record run, its wall time and the V17 decision (BRIEF A20); the fog "Findings" line (L18) |

Laptop runs for B5 (the lead sends them, alone requests on port 4189, "when the PR queue is empty"; commands in
`briefs/B5.md`): R1 master `--only so-corner,cp-s1-b,cp-s1-f,cp-s2-b,cp-s2-d,cp-s3-a,cp-s3-c,cp-s4-a,cp-s4-e,cp-s5-a,cp-s5-d --png` (PNGs
for V13 and V14); R2 master after B5 merges, `--only so-corner` (P7 red) and the F8 views (L18 after-shots); R3 P1 at
v4.96.0 and v4.97.0; R4 master full `--rules-only --record` (V15, its `summary.wallS` decides V17).

## 3. Why this shape
- Stars on read (B1): `done` is the truth of what was cleared and keeps per-tier best times honest; the fill is a view
  (G331 "considers the lower tiers completed"). Every star reader goes through `starsOf` (`main.ts:164` via
  `starsFor`, `missionsScreen.ts:100`, `coopUi.ts:612`), so one function changes and `src/net` is untouched.
- Perfect from the alarms raised (B1): every stage rise goes through `SectorRun.raiseAlarm` (`sectors.ts:789`; guard
  alarms `onAlarm`, cameras and lasers `cameraAlarm`, `sectorMode.ts:915`, :926), so a counter there that a restart
  does not reset and nothing lowers is the op's "no alarms" (G146) and cannot be won back by a restart or by a reward
  that lowers the stage (`sectorMode.ts:1045-1047` notes one is coming). The line travels to the client in the `end`
  message's subtitle (`coopClient.ts:1063`); banners are relayed (`coopHost.ts:295`).
- Geometric solo check (B2): the routes are the declared ways (M8); a door leaf test needs no nav grid and no map data
  change, and J17's lanes can call it on v2 data.
- One constant (B3): `DOOR_SHUT` is the only light threshold (field `:443`, bake shut flags `bakedLamps.ts:584`, torch
  set `torchShadowSet.ts:191`; the shader reads the flags, `bakedLamps.ts:980`), so parity holds by construction. The
  stick-driven door's 15% (`DOOR.driveShut`) was built already and keeps `open` 0 under it, as a peek crack does, so
  0.05 -> 0.15 changes only the first 15% of an ordinary swing; a test pins the two numbers equal rather than one
  module importing the other (`doors.ts` pulls in Babylon, `lightField.ts` does not).
- coop4's OUT at 2 players (B4): Q20 / G385 is the rule #317 builds for 3-4 players (Q16 "Live now"); a second
  out set, hook or return would give 2 and 3-4 players different rules and collide with coop4's lines (plan check 2).
  One gate line and a flag let it start at 2; the out set, the return, the follow view, the client line and the wire
  are coop4's as reviewed by its checkers. After switch-on the flag goes and `SECTOR.outWaitsMin` becomes 2.
- B5 inside visual-gate: its files exist only there (45 commits ahead of master, A33 stacked PRs).

## 4. Tests and checks
- Builder repeat runs (each brief lists its vitest files): `npm run typecheck:fast`, `npx vitest run <files>`,
  `node --check scripts/e2e-sectorops.mjs` (B1, B4).
- e2e (the PR head's `affected-e2e`, DIRECT_COVERS in `scripts/e2e-affected.mjs:230-339`). `node scripts/run-e2e.mjs
  --affected origin/master --list` on this docs-only head lists 0 suites (0 changed files); the lead reruns it on each
  PR head. From the file lists (first matching prefix, docs / tests / changes need no browser):
  - PR A: `src/save/sectorRecord` (e2e-sectorops, e2e-menus, e2e-coop, e2e-netmove, e2e-ctcourse), `src/game/sectors`
    and `src/game/` (e2e-gadgets, e2e-tactics, e2e-takedown, e2e-park, e2e-sectorops), `src/game/modes/sectorMode.ts`
    (+ e2e-section-rating), `src/main.ts` (CORE: e2e-move, e2e-combat, e2e-anim), `src/ui/` (e2e-pad, e2e-desktop,
    e2e-feedback, e2e-park, e2e-menus), `scripts/e2e-sectorops.mjs`. Expected: smoke, e2e-anim, e2e-combat, e2e-coop,
    e2e-ctcourse, e2e-desktop, e2e-feedback, e2e-gadgets, e2e-menus, e2e-move, e2e-netmove, e2e-pad, e2e-park,
    e2e-section-rating, e2e-sectorops, e2e-tactics, e2e-takedown. The co-op pair the RULES checker gate asks for with
    `src/game` (e2e-coop, e2e-netmove) is already in through `src/save/sectorRecord`.
  - PR C: `src/world/light` (LIGHT: e2e-lightbake, e2e-desktop; e2e-darkness is GPU, left out of the affected set);
    docs and tests need no browser. Expected: smoke, e2e-desktop, e2e-lightbake.
  - PR B: `src/core/flags.ts` (CORE), `src/game/sectorOut.ts` (`src/game/`: GAME, unless #317 adds a closer prefix),
    `src/game/modes/sectorMode.ts` (GAME, e2e-sectorops, e2e-section-rating), `src/ui/` (as above), the script.
    Expected: smoke, e2e-anim, e2e-combat, e2e-desktop, e2e-feedback, e2e-gadgets, e2e-menus, e2e-move, e2e-pad,
    e2e-park, e2e-section-rating, e2e-sectorops, e2e-tactics, e2e-takedown. No `src/net` file, so the lead requests
    e2e-coop and e2e-netmove (RULES checker gate for `src/game`) and makes sure e2e-sectorops part 9 (coop4's
    alone-slot part, which holds B4's block) runs on the head.
  - B5: no master suite; its laptop runs are the proof.
- GPU: none for PR A, B or C (BRIEF A11); B5 is GPU work by nature (laptop alone runs).
- Checkers: PR A one Opus checker (B1-B2 together: data, a save read); PR C one Opus checker (a light constant and
  its docs); PR B one Opus checker (no `src/net`, BRIEF A17), passing only with `affected-e2e`, e2e-coop, e2e-netmove
  and e2e-sectorops part 9 green. B5: a Sonnet checker on the viewpoints diff, then the visual-gate job's own C1 covers
  the whole gate.

## 5. Done looks like
- A Perfectionist clear shows four stars on the main menu, the op list and the co-op lobby; an old save with only
  Perfectionist shows four; best times stay per tier cleared.
- A clean run's result line ends "PERFECT  ·  GHOST"; a run with an alarm and no kill shows neither, even when the
  alarm was in an attempt a restart undid; the banner agrees.
- The main-menu counter shows Saltmarsh Park's stars and its line names Saltmarsh Park.
- `tests/campusSoloRoute.test.ts` passes on the live campus and fails when S4 keeps only a route through its cage gate.
- `DOOR_SHUT` is 0.15 and equals `DOOR.driveShut` (unit test); a leaf 12% into its swing cuts the lamp in the field
  and the torch set reads the same constant (unit tests; e2e-lightbake). No doc under `docs/systems/` or
  `docs/level-design.md` calls the light cut 0.05 or the stick-driven door's 15% unbuilt.
- With `?sectoroutwait=1` on the host and 2 players: a partner down 30 s is OUT (coop4's line and follow view), the
  section does not restart, and he comes back beside the host when the host cycles the next connector alone; without
  the flag 2 players restart as on master after #317. B4 adds no out set, hook, net or wire code. One Opus checker
  PASS.
- B5: the so-corner leak region reads red on master (P7), every campus section has a `wall` region, a non-error master
  record exists for the orchestrator's initial accept, the gate's wall time and the V17 step are recorded, fog-triage
  has its findings.
- PR A, PR B and PR C train-ready; the last to land carries `Job-done: sector-batch`.

## 6. Overlaps (claims-check and plan reads)
`node scripts/claims-check.mjs --plan docs/sector-batch/PLAN.md --name feature/sector-batch` output: section 7.
Line-level reads of the other open plans and branches ("merge-file" = `git merge-file` of our planned edit against
their pushed file; for B1 the base is b81c4945 and for docs the base is master with B1 applied against their own
merge-base):
- `feature/coop4` (#317, J4; no claims block): B4's base and gate (BRIEF A24): B4 edits coop4's own lines after #317
  merges (one gate line in `onPlayerOut`, a new `outWaitsFor` in `sectorOut.ts`, its OUT docs). B1 against coop4:
  merge-file 0 on `sectors.ts` (coop4's `teamSize` after :721 and the `raiseAlarm` comment / `alarmStep` line
  :786-789; ours after :711, after :789 and :846-866), `sectorMode.ts`, `tests/sectors.test.ts`, TESTING.md and the
  modes doc. `flags.ts`: ours above `sectorGuards`, coop4's `players` after it (merge-file 0).
- `feature/mission-engine` (Campaign Build; its POL1 / EN2 code is also on `mission-rules` and `mission-rules-r1`):
  `sectors.ts` `SectorTally.skipped` (after `marks`, :853) and the `sectorResult` line (:864, `marksText(t.marks,
  t.skipped ?? 0)`), `sectorMode.ts` `result()` (:1020, `skipped: this.mission?.startIndex ?? 0`). B1 edits the same
  two lines: merge-file 1 conflict in each file, nothing else (tests, TESTING, modes doc 0). Order and merged lines:
  section 7.
- `feature/sector-marks` (#457, same lead, J5): `sectorMode.ts` no lines; `TESTING.md` after :28; modes doc after :74;
  `scripts/e2e-sectorops.mjs` after :91; `coopClient.ts:247`, `gameState.ts:728`. merge-file 0 with B1's docs.
- `feature/guard-rules` (#450), `-s1`, `-s2`, `-s5` (Guard AI, J15): `src/game/sectors.ts` (`shieldTeams` after :129;
  `checkSectorGuards` :581-597), `sectorMode.ts` (~:951, :548-552, the dog kill :1311-1318), `coopHost.ts:892`,
  `flags.ts` (a line), `scripts/e2e-sectorops.mjs`. Ours: sectors.ts :711 / :789 / :846-866, sectorMode.ts :39 /
  :1011-1021. merge-file 0 (guard-rules and -s5 pushed); a dead dog joins `kills`, which Perfect reads (wanted, Q9).
- `feature/hud-guidance` (#447, Campaign, J3, and its slices): `sectorMode.ts` `blips()` :1355-1359, `gameMode.ts`,
  `coopHost.ts`, `coopClient.ts`, `gameState.ts`, TESTING. B4 no longer edits `gameMode.ts`, `gameState.ts` or
  `src/net`; B1 merge-file 0.
- `feature/map-ready` (Marlow, Q31): `flags.ts`, `main.ts` (~:412), `bakedLamps.ts`, `briefingScreen.ts` (its loading
  gate), `coopHost.ts`, `coopClient.ts`, `lighting.md`, `TESTING.md`, e2e-sectorops. Ours: `main.ts` :164 / :257,
  `briefingScreen.ts` :57 / :60. merge-file 0 (B1 files, B4's flag and briefing lines).
- `feature/char-shadow-meter`, `-s3` (J16, same lead): `lightField.ts` (imports after :13 and :19, then :119+ and
  :229+; ours :22, :28-29), `tests/lightField.test.ts` (its new cases; ours inside the door test at :359), `flags.ts`
  (list ends), `gameState.ts` (not ours any more), `lighting.md` (character-shadow section; ours the G41 bullet :29-30).
  merge-file 0 on `lightField.ts` and `flags.ts`.
- `feature/validator-port` (Marlow): `docs/level-design.md` 11.9 and 14; ours 12.1-12.3 (:359-360, :377-378, :390).
- `feature/marlow-replan` (Marlow): plan only (claims `flags.ts`, `coopHost.ts`); no code pushed; ours no longer
  touches `coopHost.ts`, and our flag sits above `sectorGuards`, not at the ends where plans append.
- `feature/player-batch-j19`, `feature/coop-kit`, `feature/player-hygiene`, `feature/guard-ai-mission-hooks`
  (Player, Guard AI): `flags.ts` (appends at the list ends), `gameState.ts`, `coopHost.ts`, `coopClient.ts`,
  level-design 12.1 (coop-kit: the Reach bullet; ours the Doors bullet). Only `flags.ts` and level-design are still
  shared.
- `feature/test-runner-j20*` (14 branches): `scripts/e2e-sectorops.mjs` (S6c's alive-at-start checks, part 6). B1
  edits :123, :151-153, :163; B4 adds a block after part 9's end.
- `feature/campus-greybox` (J17): `campusSectors.ts` and the campus data files; none edited here (BRIEF A6). Its lanes
  call `checkSoloRoutes` (its PLAN row 12). Shared: `flags.ts` (its `campusV2` at the list ends; merge-file 0) and
  `e2e-sectorops.mjs` (its new parts 7 and 8); its PLAN :112 lists this job with no order.
- `feature/light-realism`, `-l0` (J10, same lead): `lighting.md` (band lines), level-design 5.5. `feature/route-runs-2`
  (Marlow): level-design 14 (2) and 15. Ours: lighting.md :29-30, level-design 12.
- PR #433 (J1): merged in train 99; its G45 bullet sits right under the G41 bullet B3 edits, so B3 is cut from
  origin/master (BRIEF A23). The J2 fold (#442, train 101, master 9ad370a9) moved B3's doc lines (lighting.md :29-30,
  level-design :359-360) and added level-design 12.2's G41 bracket (:377-378) and the modes doc's G385 sentence
  (:95-96), which B3 and B4 now edit.
- `feature/visual-gate` (same lead): B5 is cut from it and merges back; `viewpoints.mjs` is otherwise VG8's (`rules`,
  `known` only), so B5 runs before VG8.

```claims
files:
  - src/save/sectorRecord.ts
  - src/game/sectors.ts
  - src/game/sectorSolo.ts
  - src/game/sectorOut.ts
  - src/game/modes/sectorMode.ts
  - src/main.ts
  - src/core/flags.ts
  - src/ui/screens/briefingScreen.ts
  - src/world/lightField.ts
  - tests/sectorRecord.test.ts
  - tests/sectors.test.ts
  - tests/sectorPerfect.test.ts
  - tests/sectorSolo.test.ts
  - tests/campusSoloRoute.test.ts
  - tests/doorLight.test.ts
  - tests/lightField.test.ts
  - tests/sectorOut.test.ts
  - tests/visualGateViewpoints.test.ts
  - scripts/e2e-sectorops.mjs
  - scripts/visual-gate/viewpoints.mjs
  - TESTING.md
  - docs/systems/modes-and-progression.md
  - docs/systems/lighting.md
  - docs/systems/ai.md
  - docs/systems/world-and-characters.md
  - docs/systems/coop.md
  - docs/level-design.md
  - docs/sector-redesign/checks/fog-triage.md
  - docs/visual-gate/proofs/P1.md
  - docs/visual-gate/proofs/P7.md
  - docs/visual-gate/checks/sbvg-build.md
  - docs/sector-batch/**
maps: none
protocol: none
save: none
```
Maps: none changed (campusOps and warehouseOps are read by tests and the gate only). Protocol: none (the `end` subtitle
carries B1; B4 uses coop4's `ot` mask as merged; `PROTOCOL_VERSION` untouched). Save: none (the `sector:ops` record
keeps its shape; the fill is computed on read). The `changes/feature-sector-batch*.md` fragments are shared files
(claims-check ignores them; the slice tables list them).

## 7. Claims check
`node scripts/claims-check.mjs --plan docs/sector-batch/PLAN.md --name feature/sector-batch` (fix round 2, 2026-10-25
~21:20 after `git fetch`, origin/master 9ad370a9, exit 1): 51 plans with claims, 49 overlaps, all file overlaps (no
map, protocol or save claim collides). No warning on this plan (the fragments left the claims block). The 49, grouped,
each with its order (line reads and merge-file: section 6):
- `feature/mission-rules`, `-r1`, `-r2`, `-r3` (4; J7, Campaign Build; their code is `feature/mission-engine`'s POL1 /
  EN2): sectorMode.ts, sectors.ts, main.ts (its autostart branch :445+ and an import; ours :164 / :257; merge-file 0),
  coop.md (its campaign start line; ours coop4's OUT bullet), TESTING.md (merge-file 0). **The line conflict:**
  B1 and mission-engine rewrite the same `sectorResult` line (`sectors.ts:864` on b81c4945) and `result()` line
  (`sectorMode.ts:1020`); merge-file of B1's edits against mission-engine / -r1: 1 conflict in each file, nothing
  else. **Order: PR A first** (B1 builds now, ~430 lines; mission-engine is PR C of the mission-framework stack, which
  lands once its PRs D-F have merged into it, mission-rules PLAN :332). The second to land keeps both changes (BRIEF
  A25); whoever merges it (the train's forward merge into mission-engine, or PR A's train merge if mission-engine wins
  after all) writes:
```ts
  const line = `Time ${fmtTime(t.time)}  ·  Kills ${t.kills}  ·  Spotted ${t.spotted}${perfect ? '  ·  PERFECT' : ''}${ghost ? '  ·  GHOST' : ''}${marksText(t.marks, t.skipped ?? 0)}`;
  // SectorTally keeps both `alarms?` (B1, after `spotted`) and `skipped?` (mission-engine, after `marks`);
  // sectorResult returns { ghost, perfect, line, marks }.
    return sectorResult({ time: this.t, kills: Math.max(0, g.stats.kills - g.stats.knockouts), spotted: g.style.detections + this.camAlarms, alarms: this.run.alarmsRaised, marks: this.run.marks, skipped: this.mission?.startIndex ?? 0 });
```
  The lead sends this to Campaign Build when PR A opens (STATE). A mission's skipped sections do not touch Perfect
  (`alarmsRaised` counts only alarms raised).
- `feature/guard-rules`, `-s1`, `-s2`, `-s5` (4; J15): flags.ts, sectors.ts, sectorMode.ts, tests/sectors.test.ts
  (theirs: shield and helmet cases; ours :183, :283), e2e-sectorops (theirs :3583-3707), ai.md (theirs :29-33, :216+;
  ours :12-13), world-and-characters.md (theirs :199, :204; ours :41-47). merge-file 0. Order: free.
- `feature/hud-guidance`, `-a1`..`-a3`, `-b`, `-b1`..`-b4` (9; J3): sectorMode.ts (blips :1355-1359), e2e-sectorops,
  TESTING.md. merge-file 0 with B1. Order: free.
- `feature/map-ready` (1): flags (list end), main.ts (~:412), briefingScreen.ts (its loading gate; ours :57 / :60),
  e2e-sectorops, lighting.md ("Per-section lamp bake"; ours :29-30), TESTING.md. merge-file 0. Order: free.
- `feature/char-shadow-meter`, `-s3` (2; J16, same lead): lightField.ts, flags.ts (merge-file 0 for both against B3's
  constant and B4's flag), tests/lightField.test.ts, lighting.md (character-shadow section). Order: free.
- `feature/light-realism`, `-l0` (2; J10, same lead): lighting.md (band lines), level-design.md (5.5; ours 12). Free.
- `feature/coop-kit` (1; Player): flags.ts (its plan appends), level-design.md (12.1 the Reach bullet; ours the Doors
  bullet :359-360), coop.md (its rope paragraph; ours the OUT bullet, after #317). Order: free.
- `feature/guard-ai-mission-hooks`, `feature/marlow-replan`, `feature/player-batch-j19` (3): flags.ts only (they append
  at the list ends; ours above `sectorGuards`). Order: free.
- `feature/campus-greybox`, `-s1`, `-s2`, `-s3-r1` (4; J17): flags.ts (`campusV2` at the list ends, merge-file 0),
  e2e-sectorops (its new parts 7, 8). Order: free (its PLAN :112 says the same).
- `feature/sector-marks`, `-b1` (2; J5, #457, same lead): e2e-sectorops after :91, TESTING.md after :28, modes doc
  after :74. merge-file 0. Order: free.
- `feature/test-runner-j20`, `-pra`, `-prb`, `-prc`, `-s1`, `-s2`, `-s3a`, `-s3b`, `-s4`, `-s5`, `-s6a`, `-s6b`,
  `-s6c`, `-s7` (14): e2e-sectorops (S6c's alive-at-start checks, part 6). B1 edits :123, :151-153, :163; B4 adds a
  block after part 9. Order: free.
- `feature/route-runs-2`, `feature/validator-port`, `-s0` (3; Marlow): level-design.md (14 (2), 15, 11.9, 14; ours
  12). Order: free.
- flags.ts placement (plan check 1 fix 3, re-checked): `sectorOutWait` goes just above `sectorGuards` (after
  `weaponLab`, :48 and :127 on master 9ad370a9), not at the list ends (campus-greybox, char-shadow-meter, mission-engine,
  mission-flg append there; guard-rules, map-ready, coop-kit, player-batch-j19, guard-ai-mission-hooks plan to) and not
  right after `sectorGuards` (coop4's `players`). merge-file of that spot against coop4, map-ready, guard-rules,
  campus-greybox, char-shadow-meter, -s3, mission-engine, coop-kit, player-batch-j19, marlow-replan,
  guard-ai-mission-hooks and hud-guidance: 0 conflicts.
- Not in the script (no claims block): `feature/coop4*` (#317, J4): B4's gate; B4 edits coop4's lines after #317
  merges, and B1 is merge-file 0 against it (section 6). `feature/visual-gate*`: B5's base; the lead merges B5 back
  before VG8. Of the other branches with no claims block, `feature/mixamo-retarget` (#452, draft: TESTING.md, its own items)
  is the only one with an open PR that touches a claimed file; `gm-bake-abort`, `player-batch-25`, `doc-polish`,
  `sector-ops-docfix` and `sector-fixes-r2-jump` touch some of our files but have no open PR.
Order: PR A before mission-engine (above). PR C any time. PR B after #317. PR A, PR B and PR C otherwise land in any
order: PR B and PR C are cut from master, PR A from b81c4945 with no master change next to its lines (merge-file 0
against master 9ad370a9 on every PR A file).

## 8. Flags
| Flag | Default | Owner | Switch-on | Removes |
| --- | --- | --- | --- | --- |
| `sectorOutWait` (`?sectoroutwait=1`) | off | Night Shift \| Sector Ops Build | at Michael's next co-op Sector Ops walk, target 2026-10-28 (the area is at the walk cap; needs #317 on master) | the flag, `outWaitsFor` (back to `outWaits`) and the old briefing line, with `SECTOR.outWaitsMin` set to 2, after switch-on |

## 9. Risks
- B2 may fail on S4 or S5 (the S4 objective sits behind the cage pair gate; its high route drops in by the basket
  hang-down `campusS4Data.ts:147`). A fail is a G280 finding, not a builder fix (BRIEF A8).
- B3 changes light only for a leaf 5-15% into an ordinary swing: no test or script sets `open` between 0.05 and 0.15
  (grep on 01aa415c), but e2e-lightbake may catch a swing mid-step; the brief stops on any such failure. A failing
  light e2e on the PR head goes to an Opus triage (RULES G319).
- B4 waits on #317 (open, CONFLICTING with master at fix round 2): if it slips past 2026-10-28 the switch-on slips
  with it (BRIEF A24); B1-B3 do not wait. If #317 changes its OUT names before it merges, the lead re-reads brief B4's
  quoted lines on the merged master before cutting the branch (the brief's step 0 stops otherwise).
- Perfect (B1) is stricter than before: an alarm in an attempt a restart undid still costs it (BRIEF A3). The e2e's
  ghost run (`e2e-sectorops.mjs:123`) must raise no alarm at all; it is spotted 0, so no guard or camera alarm is
  expected.
- B5 R1-R4 wait behind trains and PR runs; V15 and V17 cannot close before R4.
