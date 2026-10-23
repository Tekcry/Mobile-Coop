# marlow-final - plan for Michael's walk of 4.82.0 (PLAN 4c, X2-X6)

Planner: Opus (read-only), 2026-10-23. Source: `docs/orchestrator/WALK-4.82-REPORT.md` on feature/menu (Michael's
words, items 2-6). Code read at feature/marlow-polish 842c4140 (#257 head, worktree `Mobile-Coop-marlow-polish`).
Branch for every slice: `feature/marlow-walk482` off feature/marlow-polish ee24c65f (842c4140 + master 33fff449; lead
~22:55, the merge landed after the planner read the code); worktree `C:/NightShift/Mobile-Coop-marlow-walk482`. One batch
PR after #257. Current goal holds: prototype, no refining; detail art allowed for marlow-final (G278). Builders edit only
the files named in their brief; never commit, push, stash, reset or checkout.

Status: planned 2026-10-23 ~22:50. Photos: `C:/NightShift/scratch/walk-4.82/` holds only item 8's, so every cause below
is from the code. "s2" / "s3" = A2 / A3.

## X2 - A2: spotted fails the set, more guards, fewer lanes, overwatch above the lit neck
Michael: "being spotted on s2 should be a failure. Theres not enough guards in that section and too many lanes. Needs to
be more linear. Guards watching from above that will see you if you try cross through the light"

Cause:
- No spotted rule. `CourseMode.fixedUpdate` (src/game/modes/courseMode.ts:545-620) only tallies detections (:562-565). A
  set ends only when everyone is down (`onPlayerDeath` :1024-1030) or by the pause restart (`restartCheckpoint` :385-392).
- One guard: the shunter is the bay's only squad slot (src/world/maps/ctcourseSets/a2CarriageShed.ts:264-265), pinned by
  tests/ctcourse/a2CarriageShed.test.ts:566-568. Cap 3 (`SET_GUARDS_MAX`, types.ts:191).
- Lanes: two rakes of three 10 m vans with 2.4 m gaps (A2-1 :180-182) give four floor lanes into the neck: south cess
  z 0.25-3.7, gap 1/2 z 6.3-8.7, gap 2/3 z 11.3-13.7, north walkway z 16.3-17.5 (A2-11 :192). The staging (route 2) is a fifth.
- Nobody above: the staging deck (x 30-62, z 17.5-20, y 4.4; :226-238) is empty. The taught crossing is the north walkway
  z 16.9 (lightSpots :314-317, e2e `CROSS`), in dead ground from the deck (a standing head is hidden north of z ~14.6).

X2a (game, Opus, slice S2): a per-set "spotted fails the set" rule.
- `BayDef.spotFail?: string`: LANTERN's line, at most 90 characters (courseDef.ts:156-173).
- New pure file src/game/course/spotFail.ts, `spotFailed(bay, squad)`: true when `bay.spotFail` is set and a live,
  non-passive squad guard is `alerted` (combat; enemy.ts:691).
- ctcourse.ts bays (:49-61): `SPOT_FAIL: Partial<Record<SetId, string>> = { a2CarriageShed: 'Spotted. Back to the start
  of the set.' }`, spread into the bay (here, so the A2 slice never touches this file).
- courseMode.ts fixedUpdate, after :565, host only: `if (!st.over && this.restartT < 0 && spotFailed(st.currentBay,
  this.squad)) { this.say(line); this.restartCheckpoint(); }`.
- The restart is the existing full reset (bayRestart :661-684): squad dropped and respawned fresh, doors and lights back
  to the set start, both players back to L1 (the client through `CoopHost.onRespawn`). A set restart, not an A3-style
  per-player send-back, because a send-back would leave an alerted guard in the set. No wire or protocol change.

X2b (map, Sonnet, slice S3): A2 layout and guards.
- Lanes 4 -> 2: four noLedge closures at the rakes' neck ends (x 45.5-46.0 and 56.0-56.5): south cess (z 0.25-3.7) 2.5 m
  tall; north walkway (z 16.3-17.5) up to the deck underside at 4.4 (staging support boarding). Kept: gap 1/2 (the
  shunter's beat and his lured walk to cabinet one) and gap 2/3 (the new taught crossing). Closures dressed with skins in
  the set's own `skin` idiom.
- Two overwatch guards on the deck: `a2-watch-w` (48.0, y 4.4, 17.9) and `a2-watch-e` (54.0, 4.4, 17.9); kind grunt, yaw
  pi (facing south over the neck); `post: { leash: 0, highSecurity: true, guards: 'a2-neck' }` (posts.ts:20-29). The board
  never sends them; the neck going dark only lures them to their leash edge (enemyManager.ts:957-959). The shunter stays
  first in the squad (the e2e helpers read the first live guard).
- Taught crossing z 16.9 -> z 12.5 (gap 2/3): move lightSpots 'A2 neck crossing', '... cut', '... west cut', '... east cut'
  to z 12.5, names kept; regenerate the baseline `CTLIGHT_WRITE=a2CarriageShed npx vitest run tests/ctcourseLight.test.ts`;
  move the dressing crossing line (test :931) to z 12.5; step lines unchanged.
- One more enter radio line: "Two spotters on the staging. Seen in the neck lights and we start again." Route 2 (leg-up)
  stays and now passes behind the watchers.

Tests:
- tests/spotFail.test.ts (new): no rule never fails; calm squad false; one alerted guard true; a dead or passive alerted
  guard false.
- tests/ctcourse.test.ts: only A2 has `spotFail`, text at most COURSE_TEXT_MAX.
- tests/ctcourse/a2CarriageShed.test.ts: squad [shunter, watch-w, watch-e]; watchers on walkable deck behind the screens,
  highSecurity, leash 0, facing south; closures solid and noLedge, no lane from a rake into the neck's cess or north strip
  (`walkBlocked`); static sight rays: lane mouths (x 46 / 56 at z 7.5 / 12.5) and the z 12.5 crossing at head heights
  1.05 and 1.7 in clear view of a watcher's eye (y 6.0); taught waits out of view (west gap 2/3 at x <= 43, cabin corner,
  cabinet 2's spot); `soloJumpThreats` still empty.
- e2e-ctcourse:1 (scripts/e2e-ctcourse/a2CarriageShed.mjs): step 2 `fresh.n === 1` -> 3, all calm, watchers on the deck.
  New step 2b spotted: noDamage, teleport the client standing into the lit neck at (51, 12.5); host `g.mode.restarts` +1;
  client back in L1 on both pages; the "Spotted" line in wire `rl` on both pages; three fresh calm guards. Steps 3-6:
  `CROSS` -> [51, 12.5], the B wait moves into the west gap 2/3; each dark crossing asserts restarts unchanged and no
  watcher alerted. Check `e.secure` on spawn.

Owner split: Marlow everything above. Guard AI (feature/guard-ai-walk482, src/ai only): "report, then attack, keep the
last known position"; they also confirm a posted highSecurity guard on the 4.4 m deck holds his post and does not see a
player crossing the dark neck at 5-8 m. Risk medium-high: watchers may see a crouched player in the dark at 5-8 m
(fallback: posts 1 m back, or yaw); the rule keys on `alerted`, which Guard AI's report-first flow may delay a beat (ok).

## X3 - A2: obstacle in front of the airlock exit door
Michael: "s2 door leading to airlock exit has an obstacle on the floor in the way. Can get past but not good design"

Cause: road 2's east wheel stop (0.3 m steel slab, x 68.6-69.4, z 9.2-10.8, A2-10, a2CarriageShed.ts:189-191) stands in
the L2 near door's approach (door x 70, z 10, 1.8 m wide: z 9.1-10.9, types.ts HOLD_DOORS L2); its buffer skins A2-12
:426-436 sit on it. Change: drop that stop and its skins (5 stops left); nothing else in x 66-70, z 9.1-10.9 (cabinet 2
is at z 12.95-13.85). Slice S3.
Tests: :149-162 "six 0.3 m stops" -> five, none at x > 66 in z 9.1-10.9; the :970 skin loop skips road 2 east; new:
`walkBlocked` null for (66, z) -> (69.7, z) at z 9.4, 10, 10.6 with the greybox in. e2e none. Risk low.

## X4 - Spawn points (Player Build)
Michael: "players should spawn in different spawn points in the same area so there's no overlap."

Cause: the map has two points 2 m apart, (2, 10) and (2, 12) (types.ts:180-185), but every page builds its player at
playerSpawns[0] (gameState.ts:517); at bay 1 `courseStartPos` returns null (courseMode.ts:105-108, `n <= 1`), so CoopClient
(coopClient.ts:139-142) leaves the client on the host. `CoopHost.spawnPoint` (coopHost.ts:317-320) moves only the host's
copy until the client's first state. Restarts are fine (`onRespawn` 1.2 m off, coopHost.ts:1510-1525).
Change: Player Build's coop-rejoin WIP d9fcb6be (src/game/spawnSlots.ts, `courseSlotPoints`, `AirlockDef.spawns`) still
needs the client's bay-1 start on slot 1 and a (re)joining client on a free slot. Marlow writes no code (a Marlow patch to
`courseStartPos` would collide); S4 keeps both points clear (facility.test.ts:204, a1Gate.test.ts:360-365).

## X5 - Start room as armoury / locker room
Michael: "starting room looks like a reception, and the bench is hard up against the wall. It should look like an
armory/locker room with a weapons display cabinet on one side or something."

Cause: `dressLounge` (facility.ts:538-549) furnishes the lounge (x 0-6, z 8-14) as a reception: a 3.6 m reception desk at
(1.0, 10.2) on the west wall, three green-wall modules, one kit case, two club armchairs at (4.2, 9.1) and (4.2, 12.9)
close to the south and north flats.
Change (slice S4, detail art allowed, G278):
- West wall: a weapons display cabinet of four `kitCaseWall` modules in a row at x 0.25, z 8.6-13.4, group 10; drop
  `receptionDesk` and `greenWall`.
- South and north flats: two hand-built locker banks, each 8 doors of 0.45 m, 1.9 m tall, 0.5 m deep, at x 1.0-4.6 on
  z 8.25-8.75 and z 13.25-13.75; one solid noLedge box plus thin skins (doors, vents, handles, number plates);
  `dressLounge` takes `b`.
- Benches: drop the armchairs; two `holdingBench` props free along x at (3.4, 9.45) and (3.4, 12.55) (0.7 m off the
  lockers; the aisle z 9.7-12.3 from the spawns to the door stays clear).
- Text: facility header (:17-19), the F8 row (:661) and a1Gate.ts:7-8 say armoury (a1Gate.ts is a comment-only touch).
Tests: facility.test.ts :60-66 shell pin -> SHELL.boxes + propBoxes + the lockers' exported box count; :171-174 lounge:
receptionDesk 0, greenWall 0, kitCaseWall 4, loungeSeat 0, holdingBench 2; new: every lounge bench >= 0.5 m from every
wall and locker face, lockers noLedge and >= 1.8 m tall; facility.test.ts:204 and a1Gate.test.ts:365 still pass. The
lounge light spot (3, 11) may shift: then `CTLIGHT_WRITE=a1Gate` regenerate. Risk low.

## X6 - A3: the camera sends you back, the guard does not respond
Michael: "s3 camera finding you pushes you back to the start, but the guard comes to attack you. It's a training
exercise, the guard should be non hostile and not respond to you being detected on the camera"

Cause: at stage 2 `CtDevices.onCamera` (ctDevices.ts:1105-1123) treats A3's hall camera like any camera: `hooks.alertAt`
(:1116-1120 -> courseMode.ts:292 -> `EnemyManager.deviceAlert`, enemyManager.ts:813-821) sends the cleaner on a 60 s
device search; `raiseAlarm` (:1122) gives the ALARM STAGE banner, the alarms stat and breaks the Undetected mark. The
send-back itself is `stepHall` (:909-955) and needs neither.
Change (slice S1, agreed with Guard AI ~22:25): a pure helper in passZones.ts `hallCameras(zones): Set<string>`; the
CtDevices constructor builds the set next to `hallCam` (:373), host only; `onCamera` returns before `alertAt` and
`raiseAlarm` when `e.camera` is in the set (the stage-1 radio line stays). No src/ai change; only A3 has hall rules
(a3OfficeRange.ts:315-316). Changes fragment: A3's camera no longer breaks Undetected or adds an alarm; the send-back is
the only cost.
Tests: jammer.test.ts: `hallCameras` over A3's zones is {cam-a3-hall}; a zone without a hall adds nothing.
e2e-ctcourse:2 (scripts/e2e-ctcourse/a3OfficeRange.mjs, header :1-22 too): step 2 (:297-306) after the send-back assert
`enemyMgr.deviceAlerts` unchanged, `__ctdev.debug().alarm === 0`, cleaner calm on his loop; step 3
`calmOnLoop('A3 calm before the cut')` (:346) -> a 5 s assert he stays calm in the offices; step 3's dark send-back
(:357-359) no alert, no alarm; step 4 `calmOnLoop('A3 calm')` (:371) stays (light lure), its comment drops the
camera-alarm line; step 4's third send-back no alarm. Keep the 6a168e74 helper. Risk low.

## Slices (one branch feature/marlow-walk482, disjoint files, all start at once)
| Slice | Items | Model | Files |
|---|---|---|---|
| S1 | X6 | Opus | src/game/ctDevices.ts, src/game/passZones.ts, tests/jammer.test.ts, scripts/e2e-ctcourse/a3OfficeRange.mjs |
| S2 | X2a | Opus | src/game/course/courseDef.ts, src/game/course/spotFail.ts (new), src/world/maps/ctcourse.ts, src/game/modes/courseMode.ts, tests/spotFail.test.ts (new), tests/ctcourse.test.ts |
| S3 | X2b + X3 | Sonnet | src/world/maps/ctcourseSets/a2CarriageShed.ts, tests/ctcourse/a2CarriageShed.test.ts, tests/ctcourse/a2CarriageShed.light.json, scripts/e2e-ctcourse/a2CarriageShed.mjs, docs/marlow-final/sets/a2CarriageShed.md |
| S4 | X5 | Sonnet | src/world/maps/ctcourseSets/facility.ts, src/world/maps/ctcourseSets/a1Gate.ts (comment only), tests/ctcourse/facility.test.ts, tests/ctcourse/a1Gate.test.ts, tests/ctcourse/a1Gate.light.json, docs/marlow-final/PROPS.md |

- X4: no Marlow slice. Lead only: changes/feature-marlow-walk482.md, STATE, PLAN 4c ticks.
- e2e-ctcourse:1 runs only once S2 and S3 have both landed (step 2b needs S2's rule).
- `CTLIGHT_WRITE` one set at a time (a2 in S3, a1 in S4), never bare.
- Builders run tsc and only their own vitest files; a tsc error in another slice's file is not theirs.
- Checkers: one Opus checker for S1 + S2, one Sonnet checker for S3 + S4.
- Cross-branch: coop-rejoin d9fcb6be edits courseMode.ts (`courseStartPos`, `checkpointPos`) and courseDef.ts
  (`AirlockDef`, `validateCourse`); S2 keeps to `BayDef`, `fixedUpdate` and a new file; whichever merges second resolves.
  guard-ai-walk482 is src/ai only.

## e2e request (laptop, after S1-S4 land and CI check is green)
e2e-ctcourse:1 (X2, X3, X5), e2e-ctcourse:2 (X6), e2e-course; GPU. Not needed: :3, :4, e2e-coop, e2e-netmove (no
src/net). Optional GPU shots on 4189: shots-ctcourse a1-lounge-door, a2-vantage, a2-stair-head.

For Michael to try: A2 get seen in the lit neck (set restarts, both back in L1); cross in the dark under the watchers; the
L2 door approach is clear; the lounge reads as an armoury; A3 camera still sends back with no alarm banner and the
cleaner keeps his loop; spawn overlap waits on Player Build's coop-rejoin.
