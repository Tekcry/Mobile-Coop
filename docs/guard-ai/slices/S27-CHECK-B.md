# S27 checker B (adversarial) - feature/guard-ai-s27 fe567fd6 (diff 7fe4f6a2..fe567fd6)

Verdict: PASS

Checker B, fresh Opus, 2026-10-23. Read: agent-preamble, CLAUDE.md hard rules, `slices/S27.md` (origin/feature/guard-ai),
the cloud builder report (origin/cloud-queue `briefs/guard-ai-S27.md`), the full src + test diff, and the lead's e2e
commit on top (f7b4d3c7: 'squad roles (guard-ai S27)' in e2e-stealth-ai, the S13 carry assert in e2e-sectorops).

Runs: `npx tsc --noEmit -p .` exit 0. Vitest (affected only): squadWiring, guardGunCarry, squadRoles, carryState,
twoIntruders, armourFireWiring, radioWiring, coopGuardCarry: 8 files, 114 / 114 pass. No e2e (as instructed).

Hard rules: no breach. Hot paths allocate nothing new (`suppressAim` made once, counters are numbers,
`ballistics.clear` reuses its result object, `alarmStage?.()` is a plain call); no `Math.hypot` added in src. No
protocol or save change (the co-op puppet already follows the host's carry phase over the wire, A126 protocol 38, so
the stage draw shows on the client too).

## Blockers

None.

## What I tried to break, and what held

- **Role guard with no cover near:** overwatch / reporter / flank with role cover -1 crouch at once, one `pickCover` on
  the second think; it fails -> `openNoCover`, crouched where he stands, no re-pick every think (test (a) covers it), the
  12 s `ALERT.lostSight` still ends it. A point with no cover keeps `closing` (unchanged). No freeze upright.
- **Ray storm:** one `G.STATIC` ray per 0.25 s per suppressing overwatch, only past the `lastSeenT >= 2.5` gate. No
  allocation in `clear`.
- **Through a teammate / glass:** the ray ignores guards, and `ENEMY_SHOT` has no enemy hitbox, so no friendly fire
  either way. Clear and frosted glass are not `G.STATIC`: he suppresses through them, and so do the bullets (G45).
  Armoured glass passes the ray, then `tryFire`'s armour gate holds the round. Consistent.
- **Reporter's call cut:** `onRadio` = `radioNet.pendingFor > 0` at the 2 Hz roles tick. Downed -> the call is cut and
  he is out of the group. Grabbed -> `taken` takes him out of the group, so `R_NONE` clears `onRadio`. Stagger / blind ->
  `decide` returns before any of this. Nothing gets stuck "on radio".
- **Alarm-stage draw:** `carry.step` runs after the takedown early-out, so a guard in a takedown or carried as a body
  is never drawn mid-takedown. Secure posts already never holster. `em.alarmStage` is set only by `sectorMode`, so
  Warehouse (`e2e-guard-carry` GPU body checks) stays at stage 0 and is unaffected.
- **Posted / high-security guards:** `pickCover` filters `inLeash` / `hold`, so the open-wait pick never leaves the
  leash. Hold-room guards are not in the group.
- **Two intruders (S24):** `suppressAim` and `pickCover`'s `knownPt` both come from his own hunt slot.
- **Parked modes:** `coordinated` false (mission / clear) means no roles. `e2e-tactics` runs mission mode, so it has
  no roles and is unaffected.

## Polish (ranked)

1. **The open-wait pick and the one-mover rule.** `rolesFor` counts a point or flank as "going" from `state ===
   'seekCover'`, so a held point whose 3 s open wait sends him to cover lifts the hold on the flank, and the reverse.
   Role covers are not reserved until `boundTo`, so the open-wait `pickCover` can land on his own role cover. The lead's
   e2e counts that as a bound (`e.coverIdx === e.roleCover`), so `movers <= 1` can flake. It can also land on a mate's
   next role cover, so his `boundTo` fails and the cover goes dark until the next tick. Done looks like: `ptGoing` /
   `flGoing` count only a trip to the role cover (`coverIdx === roleCover`, or an `openPick` flag), and the open-wait
   pick skips covers the current roles name.
2. **Stale suppress verdict.** `suppressCheckT` keeps its value through a lapse. After a stop (mate stopped, or he
   moved to new cover), the first up to 0.25 s of the next suppress uses the old position's verdict. That can be 2-3
   rounds into a wall. The lead's e2e is safe here: `viol` needs 3 blocked samples in a row. Done looks like:
   `suppressCheckT = 0` when the suppression lapses (in `setState`, or when the last call was more than one step ago).
3. **`advancing` leaks into the open-wait pick.** The open-wait pick clears `armourPick` but not `advancing`. A guard
   who advanced (`pickAdvance`) before he got a role reaches the inCover advancing branch, goes back to chase after
   2.5 s, waits 3 s and picks again. That repeats every ~5.5 s, with a `pickCover` + A* each time. Done looks like:
   `this.advancing = false` beside `armourPick = false` in the open-wait pick.
4. **Cover churn after the pick.** `pickCover` scores covers from `knownPt`, but inCover's exits (`protects < 0.2`,
   `dist < engageMin * 0.7`) read the real `t.feet`. If the player has moved out of sight, the guard arrives, pops to
   `attack` (an upright strafe for 2.6 s), goes back to chase, then re-picks after 3 s. The logic predates S27, but
   open-waiters now reach it. Done looks like: out of sight, inCover's protect / distance tests read `knownPt`.
5. **No retry after a failed pick.** `openNoCover` stays set until he sees the target, reaches cover or changes role.
   Covers freed by mates, or a hunt re-aimed by S26 hearing, never trigger a retry. Done looks like: one retry per
   `openWait` while waiting.
6. **Low-cover overwatch suppresses only while peeking.** In the hide phase the crouched muzzle (eye 1.0 - 0.2 = 0.8 m)
   is below a ~1 m low cover. He holds fire for about 57% of the 4.2 s cycle and never stands up to suppress, though
   `SQUAD.lowOverwatch` says he "can fire over it". This is correct physically; it is a feel issue. Done looks like: a
   suppressing overwatch on low cover stands while his line is clear (cast from the standing muzzle).
7. **High-cover overwatch never suppresses.** His muzzle sits behind his own wall. `rolesFor`'s view check runs only
   for low covers (unchanged, per the brief). Done looks like: `coverSees` for high covers too, or suppress from the
   peek edge.
8. **Line mask vs bullet mask.** The line check uses `G.STATIC`, but `ENEMY_SHOT` also hits `G.PROP`, so rounds can
   still go into prop crates. Done looks like: cast `G.STATIC | G.PROP`.
9. **Course mode is not fed the stage.** `CourseMode` raises CtDevices camera / laser stages but never calls
   `em.setAlarmStage`, so a calm guard there (station 3's duty guard) stays holstered. This is outside the brief (Sector
   Ops only); noted for a later slice.
10. **`pickCover` allocates.** It builds an object and an array literal for `coverQuality` per candidate, plus its
    `findPath`. The code predates S27, and it now also runs from the open wait (at most once per 3 s per guard), not
    every frame.
11. **Doc wording.** The `suppressHeld` doc says "thinks"; it counts frames (steps). Cosmetic.

## Likely e2e retunes / watch (HEAD f7b4d3c7)

- `scripts/e2e-stealth-ai.mjs` 'squad roles (guard-ai S27)', `movers <= 1` assert (near the scenario's end, ~:2060):
  flake risk from polish 1 when the open-wait pick equals the role cover.
- `scripts/e2e-sectorops.mjs:3331` S6 "they close on it along the route": watch. Open-waiting role guards now take
  cover after 3 s; the assert needs only one guard to close (aggressive points bound as before).
- `scripts/e2e-coop.mjs:1348-1350` S24 two intruders, "each pair moves toward its own spot": watch, for the same
  reason.
- New S13 carry assert (`e2e-sectorops.mjs` ~:3406-3409, lead's): sound. `GuardCarry` goes HOLSTERED -> DRAWING on the
  first non-calm step, and the longest draw is 0.7 s.
- No other existing assert reads the holster after `onAlarm` or a stage. `e2e-guard-carry` runs on Warehouse at stage
  0. `e2e-ctcourse` runs in course mode (no `setAlarmStage`). `e2e-tactics` runs mission mode (no roles). The
  'lkp' / 'search area' scenarios use lone guards (below `minGroup`, so no roles).

## Merge with S25 / S26

`git merge-tree` of HEAD (f7b4d3c7) and of fe567fd6 against origin/feature/guard-ai-s25 (8bd13e0c) and
origin/feature/guard-ai-s26 (1fcab6e3, which contains S25) is clean: no conflicted files, src, docs and e2e scripts
included. The regions do not overlap: S25 touches the search branch, `onPlan` and `planOver`; S26 touches
`hearSearch`, the heard throttles and the manager's `hear`.

Semantically, S25's search plan reads the intruder board, not `lastKnown`, so the suppress no longer writing
`lastKnown` costs it nothing. An S26 combat-hearing re-aim moves `huntPos`, so the suppress aim follows the noise
(intended). Expect only append-order churn near the end of `e2e-stealth-ai.mjs` and `docs/systems/ai.md` if those tips
move again.
