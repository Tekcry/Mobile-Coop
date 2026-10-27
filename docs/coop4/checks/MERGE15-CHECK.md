# coop4 check: merge 15 (cf385d438 + d2bbf7104, origin/master a7853bed4)

**FIX** (one item, fixed by the checker in its own commit b5fbf0322, `coop4 merge 15 check fix: a scene map's room holds 2`;
with it the merge is a PASS)

Checker: fresh Opus. Head checked 82abc23d7 (merge cf385d438: parents e3fa3909f coop4, a7853bed4 master; test
stand-ins d2bbf7104; build notes `merge15-build.md`). origin/master is fully contained (`merge-base --is-ancestor`).
Conflict hunks were read from `git show --remerge-diff cf385d438` and compared against both parents; master's side
from `git diff 4a22a0de7 a7853bed4 -- src/net src/game`.

## FIX

1. **The piano scene (Thornbeck Mill) takes 3-4 players after the merge; its design is 1-2.**
   `src/net/session.ts` `cap` (was `:473-476`): `thornbeckMill` is `modes: ['sector']` with no `missions`, so the
   room is not `campaign` and its cap is `capacity('sector')`. On master that is `COURSE_MAX` (2); under coop4 it is
   `SECTOR_MAX` (4, `protocol.ts:50`). The piano PLAN A2 (job doc) says "1-2 players. Built and tuned for 2"; G426
   makes it a standalone scene, not a Sector Ops op (G308's 4 players). Scenario (`/preview/`, `flags.pianoEscape`
   on): host picks Thornbeck Mill in the co-op lobby, 3 friends join, start is allowed. What then goes wrong:
   - Slots 2 and 3 run `PianoIntro(1)` (`pianoScene.ts:488`, `askEmp ? 1 : 0`): their intro camera, hero shot and
     `PLAY_YAW` frame slot 1's operator spot (`OPERATOR_SPOTS[1]`), so they watch slot 1's body, not their own.
   - They spawn beside the checkpoint (coop4 `slotSpawn` rings, 0.9-2.3 m), not on an operator spot; the intro pose
     is 'mirror' wherever they stand. Only the two EMP items exist (`checkpoint` / `checkpoint2`).
   - The opening four's stop spots are 4-6 m from the two operator spots (`SCENE_SPAWN_MIN` 4). A slot 2/3 player
     nearer than 4 m holds that guard back until he walks off past the normal 7 m rule (`sectorMode.ts` `fill`), so
     the scripted reveal loses guards and the G1 + G2 search can start late.
   - 12 guards and the revive cap (`REVIVES_PER_MISSION` 2, `coopHost.ts:279`) are tuned for two.
   Nothing crashes; it is off-intent, not unplayable.
   **Fix applied:** `NetSession.sceneRoom` (Sector Ops on a map with `MapDef.scene`) and `cap` takes `CAMPAIGN_ROOM`
   (2) for it (`session.ts:476`, `:482`). No start block, so one player can still run it for testing (A2). The lobby
   texts name "This scene" / "this scene" when over the cap (`coopUi.ts:521`, `:659`). Every other Sector Ops map
   keeps 4. New case in `tests/net.test.ts` ("a scene map ... holds a Sector Ops room at 2": the third hello is
   refused, another map gives 4 again); it fails with the fix reverted (1 failed / 93 passed). If the lead wants the
   scene open to 4 instead, revert that commit and adapt the intro (slots 2-3), spawn spots and revives first.

## 1. Conflict hunks: both sides kept
- `src/game/modes/sectorMode.ts` `netExtra` (`:1704-1711`): coop4's `ot` (only while someone is out) and master's
  `ep` (`scene.t0 >= 0`) are independent keys; both parse in `protocol.ts` `sectorExtra`, both are read by the client
  (`onSector`: coop4's OUT mask, master's `this.piano?.hostEmp(msg.ep)`).
- `src/game/teamMoves.ts` `TeamRequest` (`:138`, `:141`): `bBusy` and `spot` both kept. `checkTeamRequest` still
  returns `taken` first (`:159`), before master's per-id kit gate and `KIT_CHECKS`.
- `src/net/coopClient.ts` `fixedUpdate` (`:1306-1308`): `followStep()` then master's `piano?.step(dt, true)`. Neither
  reads the other's state.
- `src/net/coopHost.ts`:
  - Imports: coop4's `inOpenMove`, `OPEN_MOVE_GRACE`, `TeamKind`; master's `KitKind`, `kitDone`; `kitPairS` replaces
    coop4's `PULL_PAIR_S` / `SHUTTER_PAIR_S` (no other src reader of those two outside `kitNet.ts`).
  - Revives (`:277-279`): coop4's `matchRevives(..., s.players.size)`, then master's piano line. Order is right: the
    piano cap must win on that map (master's design), the scaled pool everywhere else.
  - Kit request (`:1381-1385`): master's `kitSpotAt` / `spot` / `target: at` plus coop4's
    `bBusy: this.teamBusy(partner, by)`; the busy check still runs before `unpairOf(partner)`.
  - Kit start (`:1398-1399`): coop4's `teamMark(kind, by, partner)` and master's start shape (`target: at`, `s: ss`).
  - Nothing else dropped: the remerge diff shows only these hunks; master's knife gate, `knifeHold`, `aliveEnemy`,
    `knifeRigOf`, the per-remote victim pose, `kitDone` in `kitHangEnd`, `kitSpotAt` and the strike / throw knife
    refusals are all present.

## 2. Builder's risky spots
(a) Knife kills vs the busy rule. A knife kill is a `td` seize on a guard (`seized` keyed by guard id), never a
`teamActive` entry, so it cannot unpair or mark anyone. Double claim with 3-4 players: the start is denied when
another remote holds him (`held && held.by !== r.id`) or the host's own takedown has him (`!held && e.taken`,
`coopHost.ts:1078`); `done` / `abort` need `held.by === r.id`. The host poses a victim only for its seizer
(`:2288`). A team-move player may still start a takedown, exactly as before the merge (not merge work). No finding.

(b) Piano scene room: Sector Ops, the map is not a campaign map (no `missions`), so the cap was 4 under coop4. See
FIX 1 (now 2).

(c) Piano revive cap over coop4's pool: right for the scene (master's PLAN "Downed": the scene keeps the campaign
cap), and coop4's per-player extra never applies there once the room is 2 (FIX 1). Other maps keep coop4's scaling
(`matchRevives` unchanged).

(d) `knifePuppets` / `knifeNow` (`coopClient.ts:127-128`, `:1398-1414`): reused arrays, `length = 0` and swap; no
allocation (`includes` is a scan). A puppet in last frame's list and not posed this frame is released
(`knifeVictim(null, 0, 0)`) under master's own guard (alive, not ours). A puppet two avatars claim is posed by the
first only (the host's seize rule makes that a ~0.13 s wire overlap at most). `clear` empties both (`:1635-1636`),
as master's `knifePuppet = null` did. No stale pose.

(e) `teamMark` (`:1288`): `kitPairS` returns `PULL_PAIR_S` / `SHUTTER_PAIR_S` for pull / shutter (both `paired`), so
today's lengths are unchanged. A future paired part 2 kind gets `KIT_PAIR[kind].pairS` (or the shutter fallback),
the same value `newKitPair` uses for its `until`, so busy always covers the pair's life. Unpaired kinds keep
`Infinity` plus the open-move grace, as before.

## 3. Other 2-player / list-index reads in master's new code
- `pianoScene.ts:488` `PianoIntro(askEmp ? 1 : 0)` and `OPERATOR_SPOTS` / `HERO_CAMS` (two rows): a client is slot 1.
  Fine with the room at 2 (FIX 1).
- `sectorMode.ts:1055` `spots()` = `[checkpoint, checkpoint2]`: EMP item indices, not player slots.
- `nearestEmpItem`, `operatorAt` (by id), `porchStep` / reveals (`playerRefsInto`, all players), `endNet` / `toLobby`
  (every page), `kitDone` (ids), `kitSpotAt` (device index), `knifeHold` (by remote): no slot from a list place.
- `teamController` / `takedownController` / `localMoveState` changes: per page, no player count.

## 4. Protocol version
`PROTOCOL_VERSION = 78` on origin/master and head (`protocol.ts:25`). No test asserts the number (tests read the
constant; `coopCarry.test.ts:22` checks only that it is an integer; `mergeTrain.test.ts` uses its own text fixtures).

## 5. Tests
d2bbf7104 adds stand-in fields only (`teamActive: new Map()` in `tests/kit/kitApi.test.ts`, `knifePuppets: []` /
`knifeNow: []` in `tests/missionNet.test.ts`). No `expect` line changed.

## Polish
1. `coopClient.ts` `frameUpdate`: the knife loop iterates `this.avatars.values()` (an iterator per frame). It was
   master's loop and the frame already had such loops; a reused avatar array (as `mateOrder`) would remove it.
2. `pianoScene.ts:487-488`: the comment "the partner (slot 1)" and `askEmp ? 1 : 0` now rest on the room cap of 2;
   passing the real slot clamped to 1 would keep it right if the scene ever opens to more.
3. The refused page's "Room full" text (merge 10 Polish 1) still uses `capacity(mode)`: a full scene room reads "4".

## Commands and results
- `git show --remerge-diff --format= cf385d438 -- src/net src/game`: 4 conflicted files, all hunks read.
- `git diff 4a22a0de7 a7853bed4 -- src/net src/game` (master's side) and `git diff origin/master 82abc23d7 --stat
  -- src/net src/game`: read.
- `npm run typecheck:fast`: clean at 82abc23d7 and after the fix.
- `npx vitest run` on the 151 test files under tests/ naming net/, playerSlots, teamMoves, sectorMode, knife, kit/,
  kitNet, kitApi, pianoScene or pianoNet (150 ran as test files): at 82abc23d7 150 passed, 3034 tests passed,
  3 skipped, 1 todo. After the fix: 150 passed, 3035 tests passed (the new case), 3 skipped, 1 todo.
- Mutation: the fix's `cap` line reverted: `tests/net.test.ts` 1 failed / 93 passed; restored.
- Not run (brief): npm run dev, e2e, full `npm run check`.
