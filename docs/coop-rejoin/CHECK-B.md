# coop-rejoin - check B (fresh Opus, spawn placement and game modes)

Head 28d4e4c1 vs master 33fff449. Read-only review of my focus: `spawnSlots.ts`, `spawnPlace.ts`, `courseMode.ts`
(courseSlotPoints, courseStartCheckpoint, checkpointSpawns, checkpointPos), `sectorMode.ts` / `sectors.ts` (start2,
checkpoint2, SectorRun.checkpoint2), `courseDef.ts` (AirlockDef.spawns), and the host / client call sites in `src/net`.
Independent of check A (CHECK-A.md arrived on pull, after this review; not read).

## Verdict: PASS (my focus area)
No broken or wrong behaviour found in spawn placement or the game modes.

## What was checked
- **courseStartPos removed:** its only former caller was `coopClient.ts:151` (master). Now replaced by
  `placeStart` -> `startSlotPoints` -> `courseSlotPoints(courseStartCheckpoint(...))`. No other caller in src, tests or scripts.
- **Bay-1 start:** host on playerSpawns[0] (unchanged), client on playerSpawns[1] = (2, 12), 2 m apart. Other maps with
  several player spawns (dustDepot, embassy, mansion, port, provingGrounds, refinery, warehouse, S1 spawns, courselab)
  all have spawns[1] within 2 m of spawns[0], same floor.
- **Set restart:** `onRespawn` (coopHost.ts:1610) uses the checkpoint slots when the host respawned on slot 0
  (course: checkpointPos = areaSlotPoints[0], sector: run.checkpoint), else the host's point. At bay 1 that gives
  playerSpawns[1]; in an airlock a checked spot beside its middle.
- **Start at A3:** host respawns at the A3 entry airlock middle (courseMode.ts:278-282, unchanged); the client puts
  itself on its slot of the same airlock (placeStart); the host's onRespawn revive also sends its slot spot. Both are
  clear of slot 0.
- **Rejoin:** `late` -> joinPending -> first pstate -> `joinSpawn`. Course / Sector Ops go to the current checkpoint
  only when `canWalk` says a player there reaches the host, else beside the host (open line, floor, clear of bodies).
  The rejoiner itself and held bodies are excluded from `others`. Sequencing with R2 hold / resume is right
  (resume runs before placeJoiner on the same pstate; the new restore replaces the held one).
- **Walls, floors, storeys (real data):** a scratch run (not committed) of `slotSpawn` with a box probe
  (SightWorld.blocked, SightWorld.clear at 0.5 m and 1.3 m, floor = a box top within the step band or ground at y 0)
  on all 22 spawn areas: ctcourse start + 7 airlocks, warehouse 5, campus 9 (including the C2_FLOOR 4.4 m checkpoint).
  All find a strict spot (floor + open line). The physics-not-ready loose try picks the same first spot in every area,
  with a floor and an open line, so it cannot drop a player or cross a wall on current maps.
- **canWalk and doors:** the leaf segment `hinge + (sin yaw, cos yaw) * width` matches the door anchor convention
  (anchors.ts:111, doors.ts:129). Any smoothed nav path through a doorway crosses its leaf, so a locked closed door
  cannot be walked past. Locked doors a player could open (keypad, breach) count as shut, so the fallback is beside the
  host: the safe direction. The cost is one A* of up to 40000 expansions per join on the host only. The client has no
  nav, and `canWalk` is never called there.
- **Determinism:** the host decides every placement it sends (respawn, join). The client decides only its own start
  spot, and it is clear of slot 0 on both sides. See polish 2 for the camera-yaw dependency.
- **Single player:** `checkpointPos` returns the same box middle when a map gives no `spawns`. SectorRun only gains a
  field. Modes run on the host only (gameState.ts:697-707). spawnPlace is imported only from src/net and tests.
  No static src/net import was added.
- **Marlow Build's branch:** this PR's hunks are courseMode.ts 33, 98-117, 850-875 (fixedUpdate starts at 554) and
  courseDef.ts 7, 32-36, 340-346 (AirlockDef and validateCourse; BayDef at 162 untouched).
  `git merge-tree 28d4e4c1 origin/feature/marlow-walk482` is clean.
- **Hot paths and strict TS:** new code runs on rare events only (start, respawn, join). Per pstate it adds only a
  `Map.has`. It uses hyp2; there is no Math.hypot, no `any` and no ts-ignore.

## Tests (single files, desktop at ~97% CPU)
spawnSlots, coopRejoin, rejoin, sectors, ctcourse: 5 files, 96/96 pass. tsc and eslint were not rerun (CI covers).

## Note outside my focus (net sequencing, check A's area)
A client that lost the host keeps its match running while `waiting` (coopUi.ts:167-176). It reloads on `start` only in
that state (coopUi.ts:194). Its old match can therefore still send a pstate after `late` is set. If one does,
`placeJoiner` sees no jump and does not place it, and the reload then lands at lateBay's airlock (Course) or at
section 1 (Sector Ops) with no correction. I did not trace whether such a pstate really reaches the host on the new
connection. CHECK-A's commit title names this case; I defer to A.

## Polish (non-blocking)
1. `besideLoose` (spawnSlots.ts:119, 129) runs whenever the strict search fails, not only while physics is down. On a
   future cramped area it could place the partner across a thin wall or off a ledge. Suggest gating it on
   `!probe.floor(base)` (physics not up). Today's areas never reach it (scratch run above).
2. `courseSlotPoints` takes the airlock facing from the local camera (`g.player.cam.yaw`, courseMode.ts:110). The
   computed slot-1 spot rotates with whoever's camera, so the host and client can compute different spots at a bay-N
   start. The host's spot then wins via revive, and both are safe. A map yaw (toward the far door) would make it
   deterministic and face both players into the bay.
3. AirlockDef.spawns validation (courseDef.ts:344) accepts a point on the box edge, which is in the wall. Suggest an
   inset of at least the body radius (0.3 m).
4. The map-data tests use a probe with `open` / `floor` always true (spawnSlots.test.ts:191), so they cover only the
   loose path. A box-floor + SightWorld.clear probe (as in this check) would cover the strict path too.
5. `joinSpawn`'s last resort is the host's own spot (spawnSlots.ts:234). With the host in a vent, on a ladder or mid-jump
   (no floor beside it) and the checkpoint unreachable, the client lands standing inside the host. Rare.
6. The comment at spawnSlots.ts:53 still names `courseStartPos`.
7. Client `slot()` (coopClient.ts:338) counts the session lobby order and host `slotOf` (coopHost.ts:384) counts the
   remotes' insertion order. They are the same for 2 players; they matter only if 3+ ever return (G2 says no).
