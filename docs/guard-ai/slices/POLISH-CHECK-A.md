VERDICT: PASS (no blocking items)

# Guard AI polish - fresh check, group A (A1-A17) and C1

Checker: fresh Opus, 2026-10-24. Branch `feature/guard-ai-polish`, head 4ea3f562, change `git diff origin/master...HEAD`.
Scope: `src/ai/enemy.ts` (A1-A17), `src/ai/targetPick.ts` (C1), tests `guardPolishA`, `twoIntruders`, `coopPerception`,
`squadWiring`, `targetPick`. Line numbers are from 4ea3f562.

## Runs
- Branch: `guardPolishA twoIntruders coopPerception squadWiring targetPick deviceTrip`: 6 files, 102 tests pass.
- Neighbours on the branch: `searchAreaWiring combatHearing s6CloseOn armourFireWiring squadRoles loneGuardEngage
  fourIntruders coopGuardAi guardSpacing responseWiring deviceTrip sectionAlert`: 12 files, 200 tests pass.
- eslint on `enemy.ts`, `targetPick.ts` and the 5 test files: clean.
- Do the tests fail on master's code? I used a scratch vitest config (outside the repo) whose `load` hook swaps in master's
  `enemy.ts` / `targetPick.ts`, plus the two consts the test file imports. I also ran a second pass with every undo
  const flipped.
  - Master code: every A1-A14 test in `guardPolishA` fails (18). So do A4 in `twoIntruders` (2 calls, not 3), A9 and A10
    in `coopPerception`, and C1 in `targetPick` (`expected 1 to be +0`, a behaviour failure, not the const assert).
    A2 fails 5 ways: "false to be true", "3 to be -1", "blockCover not called", "chase not seekCover", "3 not to be 3".
    A3 returns `[9, 9]` (the field). A5 goes to `attack`.
  - Undo consts flipped: the same tests fail (21), so every switch really turns its fix off. A14 has no switch and
    passes, as it should. With `SLOTLESS_FIELD`, `COVER_TRIES 1 / k Infinity / COVER_RETRY false` and
    `RECALL_SWITCH false`, the code paths read back to the 4.97.1 code.
  - `squadWiring` passes on master's code too. That is expected: its only change is the tightened A16 assert of today's
    R_NONE steps, plus the B2 fixture line. The A5-A8 tests live in `guardPolishA` instead.

## Evidence per item

| Id | Verdict | Evidence |
| --- | --- | --- |
| A1 | OK | `joinAsResponder` keeps `devX/devZ/devRoom` (enemy.ts:1743-1745). In `onLevel`, a responder going investigating -> cooldown / unaware gets `searchAt(dev, SEARCH_DEVICE)`, then `aware.set('searching')` and a nested `onLevel(to, 'searching')`, with `searchRoom` restored after it (enemy.ts:2080-2085). The nested call keeps the room (`to` searching, `from` cooldown: enemy.ts:2070), resets `searchK` / `spotSet` (enemy.ts:2054-2057) and never calms (`i.hunting`: responder + aggressive, enemy.ts:2530, alertState.ts:197). Both callers are safe with the nested change. `updateAwareness` passed `aware.level` before the call (enemy.ts:2536), and only an `alert` check follows. `searchReq` is cleared at enemy.ts:2549 after the level is already set. `standDown` (enemy.ts:2798-2802) has nothing after it. Guarded by `alive` / `!taken`. Switch `RESPONDER_RESUME`. |
| A2 | OK | Top-3 insertion into fixed `CV_IDX` / `CV_SCORE` (enemy.ts:296-297, 3482-3501). The try loop (enemy.ts:3502-3519) skips a refused `reserveCover` with no release, so the old reservation is kept as before, and releases on no path or a detour (as master did on no path). `detour` makes no allocation and uses `hyp2` (enemy.ts:3427-3438). `boundTo` handles a detour like no path: `blockCover` and false (enemy.ts:2967-2970), and roleStep drops `roleCover` so there is no A* every frame (enemy.ts:2918). The open wait retries once per `openWait` (enemy.ts:2939-2940, `openT` reset at :2941, counted at :2954). While held, the open wait skips his role cover (enemy.ts:2944). Switches `COVER_DETOUR`, `COVER_TRIES`, `COVER_RETRY`. Cost: at most 3 A* per pick, and only at pick time (seekCover entry, once per `openWait`). |
| A3 | OK | In stealth with `hunt < 0`, `chasePoint` uses `goTo(tp)` (enemy.ts:3373): an A* replan at most every 1 s or when the goal or grid changes (enemy.ts:2572), the same cost as the calm walks. No field read for a slotless guard, so G139 holds. With a slot it is unchanged (enemy.ts:3374-3376). Zigzag does not mutate a route waypoint (it builds `cand`, enemy.ts:3382). Switch `SLOTLESS_FIELD`. |
| A4 | OK (one gap, polish 1) | `takeSighting` calls once per slot per fight when the slot changes (enemy.ts:1522). `calledMask` is set by `callContact` (:1542), `tell` (:1465), `retell` (:1474) and the alert entry (:2022). It is cleared in `forget` (:1486) and at cooldown / unaware (:2011). It is a separate open call per incident (radioNet.ts:201), so his A call is not cut. `noteCaller` gives B a reporter (enemyManager.ts:3431-3437). G139: he saw B. Switch `RECALL_SWITCH`. |
| A5 | OK (edge, polish 2) | Out of sight in stealth, the protect vector and the too-close test read `knownPt` (enemy.ts:3252-3267). `knownPt` is this step's `knownSpot` (enemy.ts:3043-3046), never the feet. In sight, or by smell, it is today's rule. Switch `COVER_KNOWN`. |
| A6 | OK | `advancing = false` beside the open-wait pick (enemy.ts:2949). Switch `OPEN_PICK_HOLDS`. |
| A7 | OK | `suppressGap` is counted in `update` before `decide` (enemy.ts:2223, :2284). A lapse (> 1.5 dt) or a moved spot (> 0.5 m, `hyp3`) zeroes `suppressCheckT`, so the next round waits for a new cast (enemy.ts:2991-2993). Switch `SUPPRESS_FRESH`. |
| A8 | OK | The cast mask is `G.STATIC \| G.PROP` (enemy.ts:2999). `ENEMY_SHOT` includes `G.PROP` (groups.ts:43). Switch `SUPPRESS_LINE`. |
| A9 | OK | `losT = 0` on a changed target (enemy.ts:2418). The null-target case is already 0 through `!los` (enemy.ts:2273). Switch `SETTLE_NEW_TARGET`. |
| A10 | OK | `P_SEEN = los \|\| smell` is module scratch, filled per player (enemy.ts:2399). A dog in combat passes it to `pickTarget` (enemy.ts:2413-2414). He sensed B, so G139 holds (`takeSighting` still needs `los`, enemy.ts:2462). Switch `DOG_SMELL_PICK`. |
| A11 | OK | `snapSpot(y)` uses `nearestWalkable(.., 4, y)` with the centre inlined (enemy.ts:1128-1135 in the diff, now :1173-1182). The `nav.center` array is gone from the search snap (enemy.ts:2708). Hunt position `y` (lkp feet), else his own. Switch `SNAP_STOREY`. |
| A12 | OK | A heard spot sets `heardSpot` (enemy.ts:1162). Its look end and its unreachable skip keep `searchK` (enemy.ts:2738, :2750). It is reset on a new pick and in `onLevel` (enemy.ts:2695, :2067). Switch `HEARD_KEEPS_K`. |
| A13 | OK | A high-security post never asks `searchPoint` (enemy.ts:2698-2701). A hold-room or device-room clamp marks `spotClamped` (enemy.ts:2714, :2720), and the plan point then finishes with `reached` false (enemy.ts:2736). Switch `PLAN_CLAMP`. |
| A14 | OK | `CQ_SPOT` / `CQ_THREAT` / `CQ_THREATS` module scratch (enemy.ts:300-303, :3470-3478). The alloc test measures under 64 B a call, against about 1440 B on master's code. |
| A15 | OK | Real `Enemy.alert()` on a told calm guard, and the -1 -> slot re-call (twoIntruders.test.ts, describe "guard-ai polish A4 / A15"). |
| A16 | OK | Exact S8 chase goal, `wantCrouch` false, `reserveCover` once / never (squadWiring.test.ts:599-621). |
| A17 | OK | `searchDone` doc line (enemy.ts:213-214). |
| C1 | OK | Calm hysteresis: `cur` (alive, rate > 0) is kept unless the best rate is more than 1.25x his (targetPick.ts:73). It is a separate const, so `TARGETS` is unchanged (targetPick.ts:23). Alerted branch untouched. Undo `CALM_KEEP = 1`. |

Hot paths: the only new allocations are module-level (`CV_IDX`, `CV_SCORE`, `CQ_*`, `P_SEEN`: enemy.ts:296-304).
Nothing new per step, no `Math.hypot`. The `nav.center` array per search point is removed. The A3 `goTo` allocates a
path only on a replan (at most 1 a second), as every calm walk already does.

## Polish list (non-blocking)
1. A4 gap at the alert step (master behaviour, narrow). A calm guard told of A (`pendingHunt` A) goes alert on that
   call in a step where he sees B. `takeSighting(B, recall false)` hunts B with no call (enemy.ts:2018), and
   enemy.ts:2022 then marks B in `calledMask` though nobody called B in. B's fight has no reporter from him. Smallest
   fix: in `onLevel('alert')`, keep `told = pendingHunt` before the sighting. Mark only `told`. If `RECALL_SWITCH &&
   alertIn.called && netOn && told >= 0 && hunt !== told`, call `callContact()`.
2. A5 fallback. With no hunt position, no sighting and no stimulus, `knownSpot` is his own position (enemy.ts:1505), so
   `near` is 0 and he leaves cover (`attack`, enemy.ts:3267). Not reachable today: roles need `hunt >= 0`
   (enemyManager.ts:3284, :3310), and a lone guard reaches cover only from a sighting. A cheap guard: only use
   `blindCover` when `huntPos() || sawOnce || hasStimulus`.
3. A2 `boundTo` detour on flank covers. A flank walk bends by design, and a flank through a doorway may pass 1.5x + 3 m,
   so the flanker is blocked (`TACTICS.blockS`). It is not wrong (re-picked next tick), but watch flank starts in
   e2e-stealth-ai S27.
4. A2 armour casts are now spent on any candidate that enters the top 3 (enemy.ts:3484-3490), not only on a new best.
   This can use up `ARMOUR_FIRE.coverCasts` earlier on a dense cover set.
5. A1: he says "clear" / "standDown" (enemy.ts:1991-1994) and goes straight back to searching. Cosmetic.
6. A3: a slotless guard who reaches his own known spot does not start the search there (that needs `huntPos`,
   enemy.ts:2538-2543). He stands until `ALERT.lostSight`. No freeze.
7. A14 scope: `coverQuality` still loops `for...of` (tactics.ts:86, not a group-A file). V8 optimises it away (the test
   reads under 64 B).
8. Older per-step allocations remain in `decide` / `chasePoint` (`tp` enemy.ts:3044, `me` :3371, goal literals). They
   are not new, and are outside this batch.
9. The A1 test lives in `guardPolishA` rather than `deviceTrip` as the plan said. Fine; `deviceTrip` is still green.
10. Not run here: `npm run typecheck:fast` (CPU rule, the lead's check).
