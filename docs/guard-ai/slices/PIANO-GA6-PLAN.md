# Piano escape GA6 (+ the PLAN's GA7): the slow methodical sweep - plan
Owner: Night Shift | Guard AI Build. Status: current. Planner: Opus 5.5, 2026-10-26.
Branch `feature/guard-ai-piano-sweep`, cut from `feature/guard-ai-piano` (PR #603: `sceneDark`, `blackoutSearch*`,
`mapWideNoise`). Spec: `docs/piano-escape/PLAN.md` on origin/feature/piano-escape, "Guard AI Build asks" GA5-GA7, the
section 3 guards table ("Fixed sweep") and the section 2 EMP beat. Naming: here GA7 = the PLAN's "a player seen in a
flash"; #603's code comments call the rain noise "GA7".

**Michael said** (ROADMAP Decided 2026-10-26): ~20:10 "The guards must move slowly and methodically to find both
players"; ~20:16 "Must be very cinematic, Not meant to be open world or explored. Must force stealth, stalking, kills,
coop kills. I want it to showcase a tense, coop gameplay".

**Hard rules held:** fixed patrols, every detection explainable, no randomness (VISION 8); light parity (sight is the
meter: a flash or a torch cone, no extra sight rule); no allocation in AI hot paths, `hyp2` only. Scene-only: every
change is gated on `em.sceneDark` (set only by the scene, behind `flags.pianoEscape`); off the scene nothing changes.

## 1. What exists (found in code)
- **Patrol walker** `src/ai/patrol.ts:51` `PatrolWalker`: `step` (:108) pauses at a point for `waits[i] ?? wait ??
  PATROL.wait` (9 s, :37) x `waitMul` (:118); a timed loop (`PatrolRoute.loop`, :30) pauses until `leave[i]` within half
  a period (:119-125); a wait of 0 passes straight through (:126-133); paused, `lookYaw` = `faces[i]` or along the next
  leg (:135-136), set once on arrival. Posts (no route) glance either side (:163-173). `rejoin` (:176) goes to the
  nearest point, or on a timed loop to the schedule's next departure (:180-193). `start {idx, wait}` (:24) sets the phase.
  The walker's clock runs every tick (`enemy.ts:2402`). No `pingPong` on map slots: a 3+ point route loops.
- **Speeds:** patrol `walkSpeed x 1` on a timed loop, else `PATROL_PACE` 1.1 / `PACE.cautious` 0.95 (`enemy.ts:2842`,
  `response.ts:30-39`); investigating / searching `paceSpeed(rush, investigatePace 0.85 | searchPace 0.75, ...)`
  (`enemy.ts:2985`, :2997, :3002); grunt `walkSpeed` 0.9 (`src/config/enemies.json:7`). A sighting's investigation is not
  a rush (rush is set only by `sendTo` shots, missing, bodies, devices: `enemy.ts:1364-1907`).
- **Torch aim:** `torchWanted` (`enemy.ts:2112`; `sceneDark` on: always on, :2118). `placeTorch` (`enemy.ts:2130`,
  `world/torches.ts:44`) follows the **body yaw** at a fixed pitch (`TORCH.pitch` 0.16, `torches.ts:25`); the co-op client
  mirrors it from the guard's yaw (`net/torchMirror.ts`). Body yaw = the goal's `face` through the motion driver
  (`enemy.ts:3970-3977`), turned at the calm rate 60 deg/s (`ENEMY_CALM_MOTION`, `config/movement.ts:137-141`). So aiming
  the torch = feeding a face yaw; sight and torch turn together (parity).
- **Look at a stop:** `walker.lookYaw` becomes the goal face in `calmDecide` (`enemy.ts:2838-2842`).
- **Pairs:** `SectorGuard.pair` (`game/sectors.ts:100`) -> `Enemy.pairSlot` (`enemy.ts:1753`) in `placeSlot`
  (`enemyManager.ts:2162`), then `buildPair` (:2243): a talking pair needs both on timed loops of one period
  (`pairWhyNot` :2312); `pairStep` (:2362, run at :3888) holds them facing each other at a meeting (`pairFace`) and says
  lines. G335 "paired patrols" are this plus the `flags.guardPairs` watch (`flags.ts:86`). There is no side-by-side walk
  code: the campus pair walks two parallel timed loops 1.0 m apart (`world/maps/campusS1Data.ts:23-53`). Separation:
  soft push inside `reach` 1.05 m at 3 m/s per m, hard floor `min` 0.65 m (`ai/separation.ts:21-34`, `steerOff` :63,
  `steerFrom` :90, called `enemy.ts:3953`).
- **States:** `alertState.ts:12` unaware -> suspicious (stands, faces the stimulus: `enemy.ts:2844-2851`) ->
  investigating (walks over, looks round) -> searching -> cooldown. Back to calm: `walker.rejoin` (`enemy.ts:2257-2260`;
  also :1176, :1542, :2074). `riseCause` / `riseN` (:521-524, `RISE_SIGHT` :280) and `stimX` / `stimZ` (:526) are public.
  `sendTo(x, z, incident, calm)` (:1358) is the calm "go and look" (looks `ALERT.hearLook`, then walks over).
- **#603:** `sceneDark` (`enemyManager.ts:330`, ctx :665); `blackoutSearch` (:1251) / `blackoutSearchSlots` (:1264):
  `searchAt(..., SEARCH_BLACKOUT)` then calm, then `rejoin`; `lightsOut` returns while dark (:1289). Board tick: :3823-3828.
- **Data:** `SquadSlot` (`world/rooms.ts:22-49`): `route`, `wait`, `waits`, `faces`, `start`, `loop`; `SectorGuard`
  (`sectors.ts:81-106`) adds `pair`, `role`, `takedownSpot`. `SectorDef.sweep` (:132) is taken (response teams).
  SectorMode calls `setPatrol` (`sectorMode.ts:938`) then `placeSlot` (:944). `thornbeckMill.ts` is a stub (no guards).

## 2. Design
**Gate.** `sceneDark` becomes a get / set accessor (same API). Set true: the sweep clock restarts at 0 (the EMP; a
restart sets it again, so every run has the same lap timing), talking pairs are cleared, and every guard already placed
is put on his sweep. While true, `placeSlot` puts each new guard on his sweep before pairs are built, and `buildPair` is
skipped (the scene's `pair` tag means sweep partner: no meetings, no lines, no pair warnings).

**The sweep plan** (new pure `src/ai/sweep.ts`, built once per guard at placement, load-time allocation only).
`sweepPlan(route, postX, postZ, postYaw)` returns the stops and a timed schedule at `SWEEP.pace`:
- Stops = the route's points as a loop. No route (a plain post): one stop at the post, wait `SWEEP.postPan`, face the
  post yaw.
- A stop's wait = `waits[i]`, else `wait`, else `SWEEP.panTime` (3 s; not `PATROL.wait`). Wait 0 = a corner: pass
  through, no pan, never held.
- Leg time = straight-line length / `SWEEP.pace`, plus `SWEEP.slack` on each walked leg into a pan stop (starts, stops,
  turns). `leave[]`, `period` follow; loop time 0 = arriving at stop 0. The phase at the epoch comes from `start`:
  loop time = `leave[idx] - wait`. An authored `loop` is not used on the scene (A3).
- Each pan stop's **centre** = `faces[i]`, else the heading of the leg into it. A stop reached by a zero-length leg with
  `faces` on both ends is a **face pan** (posts): the aim moves on the shortest arc from the last face to this one over
  the wait.
- `sweepPeriod(route)` and `sweepPlan` are exported for Campaign's S1b tests.

**The walker** (`PatrolWalker.setSweep(plan, side, t0)`; `t0` = the guard's phase + the sweep clock now). In sweep mode
`step` walks the plan's stops: at a pan stop it holds until the schedule's `leave` (half-period rule as now) and sets
`lookYaw` every step from `panYaw(...)`: a pure piecewise-linear offset on the stop's cycle `D` (= its nominal wait):
0 to D/4 centre to `-side x SWEEP.panYaw` (left), D/4 to 3D/4 across to the right, then hold right; a hold longer than D
repeats the cycle from 0, a shorter one is cut. At 3 s and 0.7 rad that is 53 deg/s, under the 60 deg/s calm turn, so
the body (torch and sight) tracks it; same order every lap. Yaw grows towards +x (`atan2(dx, dz)`), so "left" is a
negative offset.
**Rejoin** (any calm return: blackout search, investigation, glimpse, lure, revive; also at spawn): to the nearest stop
(by straight distance; ties: the soonest `leave`), then hold there, panning, until that stop's next `leave` (full-period
wrap, at most one lap), then on with the schedule. So a guard is always back in step with his own clock, and two guards
with one schedule (a pair) end up abreast again whatever order they came back in.

**Pace.** A sweeping guard walks at `SWEEP.pace` (0.7 m/s, capped at his `walkSpeed`) unaware or cooldown
(`enemy.ts:2842`). While `sceneDark`, investigating at the calm pace is `SWEEP.pace` too (`enemy.ts:2985`); a rush
(bodies, shots, missing man) and the search pace (0.675 m/s for a grunt) stay as built.

**Pairs.** Data gives each partner his own lane route with the same stops, waits and `start`, and `pair` both ways, so
one schedule walks them side by side. Pan side: the lower slot `+1` (left first), his partner `-1`: they always pan to
opposite sides. A sweeping guard's soft push skips his partner (`steerFrom` gets an optional skip; the hard 0.65 m floor
stays): G1 + G2's lanes can only be 0.7 m apart (W1 and the sack wall), where the soft push would shove them 1 m/s apart.

**GA7, a player seen in a flash.** No new sight rule: a flash lights the player in the field (SO5) and the meter rises
as for any lit player: suspicious (faces the spot: torch onto it), investigating (walks there at sweep pace, looks
round), seen again -> alert as built, else cooldown and rejoin. The partner: at the board tick, while `sceneDark`, a
guard whose `riseN` moved with `riseCause === RISE_SIGHT` and is suspicious or investigating sends his partner, if calm,
up and within `PAIRS.togetherR` (4 m, walking with him: explainable), to the same spot with a calm `sendTo(stimX,
stimZ, -1, true)` (the builder checks incident -1 is safe; if not, a thin `followGlimpse(x, z)` setting the same fields).
A per-slot `Int32Array` of the last seen `riseN`, sized at section load: no allocation per tick.

**Survivable (level-design 4.8).** GA6 adds no new search: the blackout search is GA3's 6 m ring, a glimpse is one spot
and one look round, the partner only joins within 4 m. Campaign's S4 e2e checks the start (both players reach the low
sacks within 4 s, no guard past suspicious); the walk judges the rest.

## 3. Files
| File | Change |
| --- | --- |
| `src/ai/sweep.ts` (new, pure) | `SWEEP` {pace 0.7, panTime 3, panYaw 0.7, postPan 8, slack 0.8}; `SweepPlan`; `sweepPlan`, `sweepPeriod`, `panYaw`, `nearestStop`. |
| `src/ai/patrol.ts` | `PatrolWalker.setSweep`, `sweeping`; sweep branch in `step` (pan each step, corners pass, schedule holds) and `rejoin` (nearest stop, catch-up hold). Non-sweep paths untouched. |
| `src/ai/separation.ts` | `steerFrom(..., skip: SepBody | null = null)`. |
| `src/ai/enemy.ts` | Sweep pace (:2842), scene investigate pace (:2985), `sweepMate` passed to `steerFrom` (:3953) while calm and sweeping. |
| `src/ai/enemyManager.ts` | `sceneDark` accessor + sweep clock (ticks in `update` while dark); `sweepify(e)` (plan, side, mate, `t0`) from `placeSlot` and the setter; `buildPair` skipped while dark; GA7 partner follow at the board tick. |
| `tests/sweep.test.ts`, `tests/patrolSweep.test.ts` (new) | Pure tests (below). |
| `tests/pianoGuards.test.ts`, `tests/guardAiAllocManager.test.ts` | Wiring and no-allocation cases. |
| `docs/systems/ai.md` | A short "Scene sweep" section. |

**No new data field.** Existing fields carry it all (A2). What Campaign's S1b fills per `SectorGuard` (GA5 reviews it):
- `route`: every route written out as a loop, the way back listed (G3: (9.5, 2)-(20.5, 2)-(20.5, 7)-(22.8, 7)-(20.5,
  7)-(20.5, 2); G4, G5 likewise; two-point lanes as they are). Every leg a clear straight line (timing uses straight
  lengths). Posts G6, G10: two points on the same spot.
- `waits`: 0 at corners; pan stops in seconds (omitted: 3 s): G3 6 at (22.8, 7); G4 / G5 4 at the door; G11 + G12 5 at
  each end; G6 and G10 `[8, 8]`. Lap lengths are tuned with the end waits (G4 and G5 both 40 s: `sweepPeriod` in the test).
- `faces` (rad, 0 = +z, `atan2(dx, dz)`): the pan centre where the arrival heading is wrong: G4 / G5 at the door (+x,
  pi/2), G8 + G9 at both ends (the crane well, pi), G6 the east window and the west door, G10 two aims over the hall.
- `start {idx, wait}`: the phase at the EMP. Partners identical; G4 and G5 so their door stops' `leave` coincide.
- `pair` both ways on G1/G2, G4/G5, G8/G9, G11/G12 (G4/G5 meet only at the door: the follow's 4 m keeps them apart
  otherwise). No `loop` (A3).
- Lanes: G8 + G9 and G11 + G12 1.1 m apart (z 15.5-16.6 by GS2; 15.9 / 17.0); G1 + G2 0.7 m (z 8.0 / 8.7 is all W1
  and the sack wall leave).

## Claims
```claims
files:
  - src/ai/sweep.ts
  - src/ai/patrol.ts
  - src/ai/separation.ts
  - src/ai/enemy.ts
  - src/ai/enemyManager.ts
  - tests/sweep.test.ts
  - tests/patrolSweep.test.ts
  - tests/pianoGuards.test.ts
  - tests/guardAiAllocManager.test.ts
  - docs/systems/ai.md
  - docs/guard-ai/slices/PIANO-GA6-*.md
  - docs/guard-ai/checks/PIANO-GA6-*.md
maps: none (S1b fills thornbeckMill.ts; GA5 reviews it)
protocol: none (host-run AI; the client's torches follow the guard yaw already)
save: none
flags: none new (gated on sceneDark, set only by the scene behind pianoEscape)
```
`enemy.ts` and `enemyManager.ts` are shared with GA4 (GuardActor, next): seams only, rebase before merge.

## 4. Slices (Opus builds both: AI code; one PR, two independent Opus checkers)
**GA6a Pure sweep (~480 lines).** `sweep.ts`, the walker's sweep mode, `separation.ts` skip; `tests/sweep.test.ts`,
`tests/patrolSweep.test.ts`. Code ~230, tests ~250. Needs nothing.
**GA6b Wiring + GA7 (~420 lines).** `enemy.ts`, `enemyManager.ts`, `docs/systems/ai.md`; `pianoGuards`,
`guardAiAllocManager` cases. Code ~150, tests ~270. After GA6a.
Checks per slice: `npm run typecheck:fast`; vitest the named files plus `pairs`, `pairsWiring`, `replayDeterminism`,
`awarenessWiring`, `guardAiAlloc` (unchanged off the scene). No e2e here: the scene runs end to end only in Campaign's
`e2e-piano` (S4), which waits for GA6.

## 5. Tests (vitest, pure first)
- `sweep.test.ts`: `leave` / `period` from lengths, waits, slack (a G4-shaped 40 s lap); corners add no hold; default
  3 s stop; `start` phase; centre = face or arrival heading; face pan on the shortest arc; `panYaw` left, centre, right
  at D/4, D/2, 3D/4, repeat past D, mirrored for side -1, rate under 60 deg/s at 3 s; `nearestStop` ties.
- `patrolSweep.test.ts` (walker on a straight-line stand-in): lap times identical over 5 laps and across two runs; the
  pan order every lap; corners pass; rejoin from off-route holds until the stop's `leave`, then back in step; two
  walkers on one schedule abreast after rejoining at different stops; non-sweep walkers unchanged (existing cases).
- `pianoGuards.test.ts` (stand-ins on the real class): off the scene placement, pace, pairs as before; `sceneDark` on:
  sweep pace 0.7, pan stops drive the face, a post face-pans 8 s each way, `blackoutSearchSlots` then rejoin to the
  nearest stop and in step, a pair pans opposite, no talking pair built, the partner skipped by the soft push but never
  under 0.65 m; GA7: a lit sighting -> suspicious facing the spot, investigates at 0.7, the partner within 4 m follows,
  one 6 m away does not, seen again -> alert, not seen -> back to the route; same clock after a re-set (restart).
- `guardAiAllocManager.test.ts`: 600 steps with 4 sweeping guards (pans, a rejoin, a follow): zero allocation.

## 6. Risks
- No scene data yet: GA6 builds and tests on fixtures shaped like the guards table; GA5 runs when S1b lands.
- Torch pitch is fixed (0.16 rad): gallery guards (G8 + G9 into the crane well, G10 over the hall) pan in yaw only, and
  their cones do not reach the floor 4.2 m below; players there are seen by flashes. PLAN wording vs build (A5).
- G1 + G2 at 0.7 m conflicts with PB4's "1-1.5 m apart" for co-op kills (Campaign's PLAN): a GA5 note for Campaign.
- Straight-line timing: a leg the nav routes round something arrives late; the next pan stop absorbs up to its wait,
  more drifts a pair apart for a lap. GA5 checks every leg is a clear straight line.
- A rejoin hold can last a lap (G3 ~70 s standing and panning): methodical, but a walk note if it reads as stuck.
- Partner follow could bring two torches onto one hide: S4's start check and the walk judge it (4.8).

## 7. Assumed decisions (logged for Michael's next look)
- **GA6-A1** Sweep pace 0.7 m/s, pan 3 s, +-0.7 rad (40 deg), posts 8 s, all in `SWEEP`. Undo: change the constants.
- **GA6-A2** No new data field: pan stops are `waits` > 0, centres `faces`, phase `start`, posts two points on one spot.
  Undo: add an optional `pan` per point to `SquadSlot` and read it in `sweepPlan`.
- **GA6-A3** On the scene every route runs on a schedule derived at sweep pace; an authored `loop` is ignored there.
  Undo: keep an authored `loop` in `sweepPlan` (check it fits the pace).
- **GA6-A4** Rejoin = nearest stop, then hold until the schedule comes round (at most one lap). Undo: the timed loop's
  own rejoin (the schedule's next point, `patrol.ts:180-193`).
- **GA6-A5** Yaw-only pan at the fixed torch pitch. Undo: a per-stop pitch is a later ask (torch pitch is mirrored to
  the client: a `src/net` change).
- **GA6-A6** Scene pairs never meet or talk (no `PairMeet`): the pan wins. Undo: stop skipping `buildPair` while dark.
- **GA6-A7** Lower slot pans left first, partner right first. Undo: a per-guard side from the lanes (outer first).
- **GA6-A8** The partner follows a glimpse only within 4 m (`PAIRS.togetherR`). Undo: drop the distance test.
- **GA6-A9** Searching pace and rushes stay as built; only patrol and calm investigation use the sweep pace. Undo: apply
  `SWEEP.pace` in the search branch too.
