# sector-batch - plan

Owner: Night Shift | Sector Ops Build. Status: current.

Opus plan for `docs/sector-batch/BRIEF.md` (FOLDED-PLAN J18). B1 and B2 lines are on origin/master b81c4945 (train
96, PR A's base); B3 and B4 lines are on origin/master 01aa415c (train 99, the head they are cut from; B4's anchors are
the same on 94e72b1c); B5 lines on origin/feature/visual-gate 07eefea0. Fix round 1 (PLAN-CHECK.md) re-read every B3
and B4 anchor there. Five slices: B1-B2 make PR A (`feature/sector-batch`), B4 makes PR B (`feature/sector-batch-out`),
B3 makes PR C (`feature/sector-batch-light`, BRIEF A16, A23), B5 lands inside the visual-gate job (BRIEF A18).
Builders: Sonnet for B1, B2, B3 and B5 from `briefs/B<n>.md`; Opus for B4 (`src/net`, BRIEF A17).

## 1. Slices

| Slice | What | Model | Branch / worktree | Size (changed lines) | PR | Starts |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | Stars fill lower, Perfect, main-menu stars | Sonnet | `feature/sector-batch-b1`, `C:/NightShift/Mobile-Coop-sector-batch-b1` | ~190 | A | now |
| B2 | Solo-route data check (campusOps) | Sonnet | `feature/sector-batch-b2`, `-sector-batch-b2` | ~230 | A | now |
| B3 | One door light threshold at 15% | Sonnet | `feature/sector-batch-light` from origin/master, `-sector-batch-light` | ~60 | C | now |
| B4 | Out after 30 s, back at the next section door (dark) | Opus | `feature/sector-batch-out`, `-sector-batch-out` | ~260 | B | now |
| B5 | Visual-gate fixes V13 V14 V15 V17, fog re-shoot L18 | Sonnet + lead laptop runs | `feature/sector-batch-vg` from origin/feature/visual-gate, `-sector-batch-vg` | ~120 + proof docs | visual-gate's stacked PRs | after laptop run R1 |

B1 and B2 edit disjoint files and merge into `feature/sector-batch` (the lead merges, no conflicts). B3 and B4 are each
cut from origin/master, each its own PR: B3 because its `lighting.md` bullet sits next to #433's merged G45 change
(BRIEF A23); B4 shares four files with B1 at different lines (section 6). PR A ~420 lines, PR B ~260, PR C ~60: all
under the ~1.5k cap. B3 is small: the light constant, two tests and the doc lines that call it 0.05 (most of G41's 15%
is already built, BRIEF ask 5). CPU: the desktop is near 100%; B1-B3 are tsc / single-vitest slices and may go to
`cloud-queue` (RULES "Full burn"); B4 stays on the desktop (two-page co-op e2e is the laptop's).

## 2. What changes

### B1 - stars, Perfect, menu stars (PR A)
| # | File | Line(s) | Change |
| --- | --- | --- | --- |
| 1 | `src/save/sectorRecord.ts` | :60, :67-71 | `starsOf`: the hardest tier in `done` (index in `DIFFICULTIES`) fills every tier up to it (BRIEF A2); doc comments cite G331. `markCompletedIn` unchanged |
| 2 | `src/game/sectors.ts` | :846-854 `SectorTally`, :861-866 `sectorResult` | `alarms?: number` (the run's alarm stage; omitted: no Perfect); `sectorResult` returns `perfect` (alarms given, kills 0, alarms 0) and adds `  ·  PERFECT` before `  ·  GHOST`; new `resultBadge(r)` -> "PERFECT", "GHOST", "PERFECT  ·  GHOST" or "" (BRIEF A3, A4) |
| 3 | `src/game/modes/sectorMode.ts` | :1011, :1018-1021 | banner subtitle `resultBadge(this.result())`; `result()` passes `alarms: this.run.alarm`; :43 import |
| 4 | `src/main.ts` | :164, :257 | `starsFor('campusOps')`; the line names Saltmarsh Park and the fill (BRIEF A5) |
| 5 | `src/ui/screens/briefingScreen.ts` | :60 | "No kills and no alarm: Perfect. No kills and never spotted: Ghost." |
| 6 | `tests/sectorRecord.test.ts` | :50-53, add after :53 and :67 | the fill (normal + perfectionist -> 4 stars; realistic -> 3; old save shape) and kv round trip (perfectionist only -> 4 stars, best time perfectionist only) |
| 7 | `tests/sectors.test.ts` | :283 | the expected object gains `perfect: false` (no alarms given) |
| 8 | `tests/sectorPerfect.test.ts` | new | `sectorResult` Perfect cases and `resultBadge` |
| 9 | `scripts/e2e-sectorops.mjs` | :123, :151-153, :163 | the ghost run's line has PERFECT; every star up to the run's tier filled; an alarm leaves `perfect` false |
| 10 | `TESTING.md` | :46-47 | the stars item: the easier stars fill too, the main-menu counter is Saltmarsh Park's; one new item after :48 (Perfect; no door item, BRIEF A11) |
| 11 | `docs/systems/modes-and-progression.md` | :81-88 | stars built as G331 says; main menu reads campusOps; Perfect on the result line |
| 12 | `changes/feature-sector-batch.md` | new | the fragment for B1-B2, `kind: patch` (no door line: B3's own fragment) |

### B2 - solo-route data check (PR A)
| # | File | Line(s) | Change |
| --- | --- | --- | --- |
| 1 | `src/game/sectorSolo.ts` | new | pure, Babylon-free: `teamDoorPoints(d)` (pair gate `door`, every bolt `at`), `legCrossesDoor(...)`, `checkSoloRoutes(defs, doorAt)`: per section with team doors, at least one route whose legs (`pts[i] -> pts[i+1]`, y from `RoutePt`) cross no team door's leaf (door from `doorAt`, `StageDoorInfo`; leaf widened `SOLO_DOOR_PAD` 0.3 m each side; leg y within `ZONE_Y_TOL` of the leaf's floor); messages name the section, the doors and the routes (BRIEF A6) |
| 2 | `tests/sectorSolo.test.ts` | new | synthetic sections: a pair gate across a corridor, one route through it and one round it (pass), only the route through (fail), a leg on another floor (pass), a bolt (fail), no door at a team door point (an error), no team doors (pass) |
| 3 | `tests/campusSoloRoute.test.ts` | new | `checkSoloRoutes(CAMPUS_SECTORS, doorFinder(b.anchors.doors))` is `[]` on the built campus (as `tests/campusS4.test.ts:35-36` builds it); the rule bites (a copy of S4 with only its loud route fails) |

On master the team doors are S4's cage pair gate (`src/world/maps/campusS4Data.ts:203`) and S5's pair gate
(`src/world/maps/campusS5Data.ts:183`); S1-S3 have none (J17's v2 adds S2's). A failure stops the builder (BRIEF A8).

### B3 - one door light threshold at 15% (PR C, cut from origin/master 01aa415c)
Already built (not touched): `DOOR.driveShut` 0.15 (`src/world/doors.ts:51-53`, `drive()` :253) keeps a stick-driven
door under 15% at `open` 0, shut to body, light and sight; a peek crack never moves `open`
(`tests/doors.test.ts:23-31`). B3 changes only the light field's cut for a swinging leaf (BRIEF ask 5, A10).
| # | File | Line(s) | Change |
| --- | --- | --- | --- |
| 1 | `src/world/lightField.ts` | :22, :28-29 | `DOOR_SHUT = 0.15` with the G41 comment (the same number as `DOOR.driveShut`; a crack keeps `open` 0); `DOOR_SHUT` then sits on :34 |
| 2 | `tests/doorLight.test.ts` | new | `DOOR_SHUT` is 0.15 and `DOOR_SHUT === DOOR.driveShut` (one threshold) |
| 3 | `tests/lightField.test.ts` | :359, inside the door test (:347-363) | a leaf 12% into its swing still cuts the lamp; at 0.2 the level equals the door-free field (`tests/torchShadowSet.test.ts:207-213` already reads `DOOR_SHUT` symbolically) |
| 4 | `docs/systems/lighting.md` | :26-27 (the G41 bullet) | "Built (G41, sector-batch): one 15% door threshold ..."; sight and sound point to `ai.md`. :28-31 (#433's G45 bullet, merged) untouched |
| 5 | `docs/systems/ai.md` | :12-13 | the light field's cut is the same 15%; not at 15% yet: an ordinary open drops the body at once, so guard sight and hearing pass from 0% (J15, BRIEF A10) |
| 6 | `docs/systems/world-and-characters.md` | :41-42, :44-47 | `DOOR_SHUT` 0.15; the stale "Decided, not built yet" door sentence becomes what is built (CT door menu, one 15% threshold, guards close doors) |
| 7 | `docs/level-design.md` | :351-352 (Section 12, engine constraints) | the door fact at 0.15 with what sight and sound do; the builder lists the map and job docs that quote 0.05 (none relies on it) for the PR body and Marlow Build (CLAUDE.md engine-fact rule) |
| 8 | `changes/feature-sector-batch-light.md` | new | fragment, `kind: patch` |

### B4 - out after 30 s, back at the next section door, dark (PR B, cut from origin/master 01aa415c)
| # | File | Line(s) | Change |
| --- | --- | --- | --- |
| 1 | `src/core/flags.ts` | after :48 (interface) and :127 (object): just above `sectorGuards` (:49-50, :128) | `sectorOutWait: boolean`, `?sectoroutwait=1`, default false; comment with owner and switch-on (BRIEF A1). Not at the list ends nor after `sectorGuards` (section 7) |
| 2 | `src/game/modes/gameMode.ts` | :73 | `onPlayerOut?(id: string): void` (the out player's ref id) |
| 3 | `src/game/gameState.ts` | NetHooks, after :229 | `returnOut?(at: Vector3): void` (host: every player not up comes back on the checkpoint slots at `at`) |
| 4 | `src/net/coopHost.ts` | :580; :1894-1921 | `onPlayerOut?.(id === this.s.selfId ? this.g.localId : id)`; a private `checkpointArea(at)` taken out of `onRespawn` (its behaviour unchanged) and a public `returnOut(at)`: each player not alive (self, remotes) has its revive point dropped and window cleared, and comes back on its slot (`reviveOne`, `joins.respawned`); no `reviveClock.checkpoint()` |
| 5 | `src/net/coopClient.ts` | :618 | the "OUT - wait for the checkpoint" line also in `sector`: the one intended unflagged change (flag off, a client out reads it for the 2.5 s before the restart, as the host does in `goOut` :577) |
| 6 | `src/game/modes/sectorMode.ts` | new field near :272; :812-827 `exitStep`; :862-867 (after `beginSection()` in `CONN_UNLOCK_FAR`); :1158 `restartSection`; :1333-1338 `onPlayerOut` | `outIds` (a `Set<string>`, filled only with the flag on); `exitStep` skips refs in it (no allocation); after the far door unlocks, `g.net?.returnOut?.(this.checkpoint)` then clear; a restart clears it; `onPlayerOut(id)`: with the flag and someone still up, add the id and banner "OPERATOR OUT" / "Back at the next section door", else the restart as now |
| 7 | `src/ui/screens/briefingScreen.ts` | :57 | with the flag, the line says: a team-mate has 30 s to revive you, then you are out until the team reaches the next section door; everyone down, or solo, restarts the section |
| 8 | `tests/sectorOutWait.test.ts` | new | the flag defaults off; `SectorMode.prototype.onPlayerOut` on a stub: out set with the flag and someone up, the restart timer otherwise |
| 9 | `scripts/e2e-sectorops.mjs` | new block after :983 (end of the co-op mirror block) | two pages, `sectoroutwait=1`: the client goes down, 30 s of host clock, the section does not restart, the client reads OUT; the host takes the objective and cycles the connector alone; the client comes back on the checkpoint, no restart counted |
| 10 | `TESTING.md` | new item after :52 (the end of "Sector Ops restart", :50-52) | the flagged out-and-wait check (`?sectoroutwait=1` on the host) |
| 11 | `docs/systems/modes-and-progression.md` | :91-92 | the out rule as built with and without the flag |
| 12 | `changes/feature-sector-batch-out.md` | new | fragment, `kind: patch` (dark) |

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
- Perfect from the run's alarm stage (B1): `SectorRun.alarm` only rises (`sectors.ts:789`) or goes back to the
  section's start on a restart (`:812`), so 0 at the extraction means no alarm in the attempts that count. The line
  travels to the client in the `end` message's subtitle (`coopClient.ts:1063`); banners are relayed (`coopHost.ts:295`).
- Geometric solo check (B2): the routes are the declared ways (M8); a door leaf test needs no nav grid and no map data
  change, and J17's lanes can call it on v2 data.
- One constant (B3): `DOOR_SHUT` is the only light threshold (field `:443`, bake shut flags `bakedLamps.ts:584`, torch
  set `torchShadowSet.ts:191`; the shader reads the flags, `bakedLamps.ts:980`), so parity holds by construction. The
  stick-driven door's 15% (`DOOR.driveShut`) was built already and keeps `open` 0 under it, as a peek crack does, so
  0.05 -> 0.15 changes only the first 15% of an ordinary swing; a test pins the two numbers equal rather than one
  module importing the other (`doors.ts` pulls in Babylon, `lightField.ts` does not).
- Out set in the mode (B4): the mode owns the connector count (A20, `sectorMode.ts:815-827`), the net layer owns
  bodies and slots (`onRespawn`, `coopHost.ts:1896`). The hook `onPlayerOut(id)` carries the id across; `returnOut` reuses
  the respawn slots. No wire change: `revive` events already move a client (`coopHost.ts:637`).
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
  - PR B: `src/net/` (e2e-coop, e2e-netmove, e2e-ctcourse), `src/core/flags.ts` (CORE), `src/game/gameState.ts`
    (GAME), `src/game/modes/` (GAME, e2e-sectorops, e2e-section-rating), `src/ui/` (as above), the script. Expected:
    smoke, e2e-anim, e2e-combat, e2e-coop, e2e-ctcourse, e2e-desktop, e2e-feedback, e2e-gadgets, e2e-menus, e2e-move,
    e2e-netmove, e2e-pad, e2e-park, e2e-section-rating, e2e-sectorops, e2e-tactics, e2e-takedown.
  - B5: no master suite; its laptop runs are the proof.
- GPU: none for PR A, B or C (BRIEF A11); B5 is GPU work by nature (laptop alone runs).
- Checkers: PR A one Opus checker (B1-B2 together: data, a save read); PR C one Opus checker (a light constant and
  its docs); PR B two independent Opus checkers (`src/net`), passing only with `affected-e2e` green. B5: a Sonnet
  checker on the viewpoints diff, then the visual-gate job's own C1 covers the whole gate.

## 5. Done looks like
- A Perfectionist clear shows four stars on the main menu, the op list and the co-op lobby; an old save with only
  Perfectionist shows four; best times stay per tier cleared.
- A clean run's result line ends "PERFECT  ·  GHOST"; a run with an alarm and no kill shows neither; the banner agrees.
- The main-menu counter shows Saltmarsh Park's stars and its line names Saltmarsh Park.
- `tests/campusSoloRoute.test.ts` passes on the live campus and fails when S4 keeps only a route through its cage gate.
- `DOOR_SHUT` is 0.15 and equals `DOOR.driveShut` (unit test); a leaf 12% into its swing cuts the lamp in the field
  and the torch set reads the same constant (unit tests; e2e-lightbake). No doc under `docs/systems/` or
  `docs/level-design.md` calls the light cut 0.05 or the stick-driven door's 15% unbuilt.
- With `?sectoroutwait=1` on the host: a partner down 30 s is out, the section does not restart, and he comes back in
  the connector when the team cycles it; without the flag nothing changes. Two Opus checkers PASS.
- B5: the so-corner leak region reads red on master (P7), every campus section has a `wall` region, a non-error master
  record exists for the orchestrator's initial accept, the gate's wall time and the V17 step are recorded, fog-triage
  has its findings.
- PR A, PR B and PR C train-ready; the last to land carries `Job-done: sector-batch`.

## 6. Overlaps (claims-check and plan reads)
`node scripts/claims-check.mjs --plan docs/sector-batch/PLAN.md --name feature/sector-batch` output: section 7.
Line-level reads of the other open plans:
- `feature/sector-marks` (same lead, J5): `sectorMode.ts` no lines; `TESTING.md` after :28; modes doc after :74;
  `scripts/e2e-sectorops.mjs` after :91; `coopClient.ts:247`, `gameState.ts:728`. No shared line with B1-B4.
- `feature/guard-rules` (Guard AI, J15): `src/game/sectors.ts` (`shieldTeams` after :129; `checkSectorGuards`
  :581-597), `sectorMode.ts` (~:951, :548-552, the dog kill :1311-1318), `coopHost.ts:892`, `flags.ts` (a line),
  `scripts/e2e-sectorops.mjs`. Ours: sectors.ts :846-866, sectorMode.ts :1011-1021 / :812-867 / :1158 / :1333-1338,
  coopHost.ts :580 / :1894-1921. Different lines; a dead dog joins `kills`, which Perfect reads (wanted, Q9).
- `feature/hud-guidance` (Campaign, J3): `sectorMode.ts` `blips()` :1355-1359, `gameMode.ts` (blips), `coopHost.ts`
  blips ~:1943, `coopClient.ts`, TESTING. Ours avoids :1355-1359 and :1943; `gameMode.ts:73` vs its blips member.
- `feature/map-ready` (Marlow, Q31): `flags.ts`, `main.ts` (~:412), `bakedLamps.ts`, `coopHost.ts`, `coopClient.ts`,
  `lighting.md`, `TESTING.md`, e2e-sectorops. Ours: `main.ts` :164 / :257 only; `bakedLamps.ts` not edited.
- `feature/player-batch-j19`, `feature/coop-kit`, `feature/player-hygiene` (Player): `coopHost.ts`, `coopClient.ts`,
  `flags.ts`; one new flag line each (no flags code pushed yet; their plans append). B4's flag goes above
  `sectorGuards`, away from the list ends (section 7).
- `feature/test-runner-j20*`: `scripts/e2e-sectorops.mjs` (other blocks).
- `feature/campus-greybox` (J17): `campusSectors.ts` and the campus data files; none edited here (BRIEF A6). Its lanes
  call `checkSoloRoutes` (its PLAN row 12). Shared: `flags.ts` (its `campusV2` at the list ends) and
  `e2e-sectorops.mjs` (its new parts 7 and 8); its PLAN :112 lists this job with no order.
- PR #433 (J1, `feature/sector-ops-docs`): merged in train 99 (01aa415c); it changed the G45 bullet,
  `docs/systems/lighting.md:28-31` on master, right under the G41 bullet B3 edits (:26-27). A branch from b81c4945
  editing :26-27 conflicts with master (`git merge-file`), so B3 is cut from origin/master (BRIEF A23).
- `feature/visual-gate` (same lead): B5 is cut from it and merges back; `viewpoints.mjs` is otherwise VG8's (`rules`,
  `known` only), so B5 runs before VG8.

```claims
files:
  - src/save/sectorRecord.ts
  - src/game/sectors.ts
  - src/game/sectorSolo.ts
  - src/game/modes/sectorMode.ts
  - src/game/modes/gameMode.ts
  - src/game/gameState.ts
  - src/main.ts
  - src/core/flags.ts
  - src/ui/screens/briefingScreen.ts
  - src/world/lightField.ts
  - src/net/coopHost.ts
  - src/net/coopClient.ts
  - tests/sectorRecord.test.ts
  - tests/sectors.test.ts
  - tests/sectorPerfect.test.ts
  - tests/sectorSolo.test.ts
  - tests/campusSoloRoute.test.ts
  - tests/doorLight.test.ts
  - tests/lightField.test.ts
  - tests/sectorOutWait.test.ts
  - tests/visualGateViewpoints.test.ts
  - scripts/e2e-sectorops.mjs
  - scripts/visual-gate/viewpoints.mjs
  - TESTING.md
  - docs/systems/modes-and-progression.md
  - docs/systems/lighting.md
  - docs/systems/ai.md
  - docs/systems/world-and-characters.md
  - docs/level-design.md
  - changes/feature-sector-batch.md
  - changes/feature-sector-batch-out.md
  - changes/feature-sector-batch-light.md
  - docs/sector-redesign/checks/fog-triage.md
  - docs/visual-gate/proofs/P1.md
  - docs/visual-gate/proofs/P7.md
  - docs/visual-gate/checks/sbvg-build.md
  - docs/sector-batch/**
maps: none
protocol: none
save: none
```
Maps: none changed (campusOps and warehouseOps are read by tests and the gate only). Protocol: none (the `revive`
event and the `end` subtitle carry B4 and B1; `PROTOCOL_VERSION` untouched). Save: none (the `sector:ops` record keeps
its shape; the fill is computed on read).

## 7. Claims check
`node scripts/claims-check.mjs --plan docs/sector-batch/PLAN.md --name feature/sector-batch` (fix round 1, 2026-10-25
after `git fetch`, origin/master 01aa415c, exit 1): 37 plans with claims, 36 overlaps, all file overlaps (no map,
protocol or save claim collides). Three warnings: the `changes/feature-sector-batch*.md` fragments are shared files the
script ignores (claimed anyway so the block lists every file a brief creates). The 36, grouped, each with its order
(line reads: section 6; "merge-file" = `git merge-file` of our edit against their pushed file, 0 conflicts):
- `feature/guard-rules`, `-s1`, `-s2` (J15): flags.ts, sectors.ts, sectorMode.ts, coopHost.ts, tests/sectors.test.ts
  (theirs: shield and helmet cases; ours :283 only), e2e-sectorops (theirs :3583-3707), ai.md (theirs :29-33, :216+;
  ours :12-13), world-and-characters.md (theirs :199, :204; ours :41-47). Different lines. Order: free.
- `feature/hud-guidance`, `-a1`..`-a3`, `-b`, `-b1`, `-b2` (J3): gameState.ts, gameMode.ts, sectorMode.ts, coopHost.ts,
  coopClient.ts, e2e-sectorops, TESTING.md. Different lines (blips: sectorMode ~:1355, coopHost ~:1943);
  `gameMode.ts:73` sits beside its removed blips member. Order: free; the second to land takes both lines there.
- `feature/map-ready`: flags (list end), main.ts (~:412 vs our :164 / :257), gameState, briefingScreen.ts (its loading
  gate, not :57 / :60), coopHost, coopClient, e2e-sectorops, lighting.md ("Per-section lamp bake" vs our :26-27),
  TESTING.md. Order: free.
- `feature/char-shadow-meter` (J16, same lead): lightField.ts (theirs: imports after :13 and :19, then :119+; ours :22,
  :28-29; merge-file 0), tests/lightField.test.ts (its new cases; ours 5 lines inside the door test at :359), flags.ts
  (list ends; merge-file 0 with ours above `sectorGuards`), gameState (:618, :907-914, :1659-1701; ours NetHooks after
  :229), lighting.md (character-shadow section :222-249). Order: free.
- `feature/light-realism`, `-l0` (J10, same lead): lighting.md (band lines), level-design.md (5.5; ours 12, :351-352).
  Order: free.
- `feature/coop-kit` (Player): flags.ts (its plan appends), gameState.ts, coopHost.ts, coopClient.ts at its own lines,
  level-design.md (12.1 the Reach bullet, :346-347 on master; ours the Doors bullet :351-352, the speeds bullet
  :348-350 between).
  Order: free.
- `feature/route-runs-2` (Marlow): level-design.md (sections 14 (2) and 15; ours 12). Order: free.
- `feature/player-batch-j19`, `feature/player-hygiene`, `feature/guard-ai-mission-hooks`: flags.ts (append at the
  ends; nothing pushed yet), gameState.ts, coopHost.ts, coopClient.ts at their own lines. Order: free.
- `feature/campus-greybox` (J17): flags.ts (`campusV2` at the list ends, pushed; merge-file 0), e2e-sectorops (new
  parts 7, 8). Order: free (its PLAN :112 says the same).
- `feature/sector-marks`, `-b1` (J5, same lead): gameState.ts :728, coopClient.ts :247, e2e-sectorops after :91,
  TESTING.md after :28, modes doc after :74. No shared line. Order: free.
- `feature/test-runner-j20`, `-pra`, `-prb`, `-prc`, `-s1`, `-s2`, `-s3a`, `-s3b`, `-s4`, `-s5`, `-s6a`, `-s6b`, `-s6c`,
  `-s7` (14): e2e-sectorops (S6c's alive-at-start checks, part 6). B1 edits :123, :151-153, :163; B4 inserts after
  :983. Order: free.
- flags.ts placement (plan check fix 3): `sectorOutWait` goes just above `sectorGuards` (after `weaponLab`, :48 and
  :127 on 01aa415c), not at the list ends (campus-greybox, char-shadow-meter, mission-engine*, mission-flg append
  there; guard-rules, map-ready, coop-kit, player-batch-j19, guard-ai-mission-hooks plan to) and not right after
  `sectorGuards` (`feature/coop4*`, no claims block, adds `players` there: merge-file 2 conflicts). merge-file of that
  spot against every open branch with a flags.ts change (campus-greybox, char-shadow-meter, coop4 and 8 coop4 slices,
  gm-flip, gm-look, gm-polish, gm-polish-p2, guard-ai-g327, guard-ai-t1-anim-tier, mission-engine,
  mission-engine-flg-gb6, mission-flg): 0 conflicts; no open branch edits :48-49 or :127-128.
- Not in the script (no claims block): `feature/visual-gate*` (B5's base; the lead merges B5 back before VG8),
  `feature/coop4*` (#317: flags.ts above; its sector and net edits are on master's lines it rebases; J4 carries it).
Order: none forced. PR A, PR B and PR C may land in any order: PR B and PR C are cut from master 01aa415c, PR A from
b81c4945 with no master change next to its lines (B3, the one that had one, moved to PR C, BRIEF A23).

## 8. Flags
| Flag | Default | Owner | Switch-on | Removes |
| --- | --- | --- | --- | --- |
| `sectorOutWait` (`?sectoroutwait=1`) | off | Night Shift \| Sector Ops Build | at Michael's next co-op Sector Ops walk, target 2026-10-28 (the area is at the walk cap) | the `else` restart in `onPlayerOut` and the old briefing line, after switch-on |

## 9. Risks
- B2 may fail on S4 or S5 (the S4 objective sits behind the cage pair gate; its high route drops in by the basket
  hang-down `campusS4Data.ts:147`). A fail is a G280 finding, not a builder fix (BRIEF A8).
- B3 changes light only for a leaf 5-15% into an ordinary swing: no test or script sets `open` between 0.05 and 0.15
  (grep on 01aa415c), but e2e-lightbake may catch a swing mid-step; the brief stops on any such failure. A failing
  light e2e on the PR head goes to an Opus triage (RULES G319).
- B4: `g.localId` must equal the host's own ref id in `playerRefsInto` (`gameState.ts:522-526`, `:1057`); the brief
  makes the builder check it first. The e2e uses warehouseOps (frozen: read only, A21) like the co-op mirror block.
- B5 R1-R4 wait behind trains and PR runs; V15 and V17 cannot close before R4.
