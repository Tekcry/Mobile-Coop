# frzpol build: guard-freeze polish (2026-10-23, Opus builder)

Branch feature/sector-redesign-frzpol off #226 head 2276483a. Answers the polish list in `campus-perf-check.md` and the
known visual edges in `campus-perf-fix.md`. Render only: no gameplay ray mask, `src/ai`, `src/net`, PROTOCOL or save
change; light parity unchanged (guard shadows are read by neither the meter nor perception); nothing allocated per
frame (typed arrays, kept vectors, module helpers); `hyp3` only; Babylon via `src/core/babylon.ts`.

## Items
1. Door / pane opens: drawn at the next evaluation (was <= `RETEST` = 4).
   - View epoch: `Doors.viewVersion()` (`src/world/doors.ts:350`) grows each time a door's leaf stops hiding the view
     (cracked, eased / driven ajar, swung, body removed); a per-door `Uint8Array` remembers the last state, a leaf going
     shut again does not count. `Breakables.viewVersion()` (`src/world/breakables.ts:135`) counts opened panels
     (`:154`, glass and grates: the body goes).
   - Wired as `views` (`src/game/modes/sectorMode.ts:235`, the sum; made once at start) into `SectorGuardFreeze`
     (4th constructor arg, `FreezeViews`, `src/game/sectorGuardFreezeView.ts:52`). Read once per evaluation
     (`:172-174`); when it moved, every hidden verdict is due now and urgent (`:206`).
   - Budget: urgent re-tests share `TESTS_PER_EVAL` = 8 guards per evaluation; over it an urgent guard is drawn until
     his test (as after a cut), so nothing shows late and the ray count stays bounded.
2. No late show on return to view.
   - Re-entry: per-guard last frustum bits (`memoBits`); a hidden verdict whose bits gain a part (back into the frustum,
     or the body joining a shadow-only verdict) is re-tested at once, urgent (`:206`). Answers checker polish 1.
   - Near the edge: a hidden verdict where any blocker stops within `EDGE` = 0.75 m of its sample point (`:47`, marked
     in `seen`, `:274`) is re-tested every evaluation (`:222`) instead of every 4: a guard hugging the far side of a
     wall, a door frame or a corner.
   - Fair budget: the guard walk starts at a rotating index each evaluation (`:179-184`), so the 8-test cap never
     starves the same guards. Over the cap, a non-urgent hidden verdict at most `STALE` = 8 evaluations old is kept
     (`:225`), older or urgent ones are drawn.
   - Ray bound per evaluation: 8 tests x `FREEZE_TEST_RAYS` = 11 (`src/game/sectorGuardFreeze.ts:145`: 7 points + 2
     probes + 2 landings), plus one recast per see-through hit; typical test 5-7 rays (no probe landing on flat
     ground: 1 probe). Was 8 x 6.
3. Checker polish.
   - Knee sample (`FREEZE_KNEE` 0.4 m, `src/game/sectorGuardFreeze.ts:138, :170`): the 5th body point. Answers polish 2.
   - Moon shadow off a roof edge (polish 5): `shadowProbe` (`:195`) is the ray from his head (then his middle) along
     the moon down to `shadowDrop` below his feet; the freeze casts it (render-only static ray, `occluded3`,
     `sectorGuardFreezeView.ts:251`) and `shadowLanding` (`:214`) turns a stop more than `FREEZE_LEDGE` 0.5 m below his
     feet into a sample point (backed 0.2 m toward the light). The middle probe runs only when the head's lands below.
     A probe that finds no ground within the drop adds nothing (the frustum capsule's reach is the same).
4. Frozen guard's per-frame cosmetic work in sector code: none exists. `src/game/modes/sectorMode.ts` and the
   `src/game/sector*.ts` modules hold no per-frame loop over guards' meshes (grep of `enemies`, `bodyRig`, `.rig`);
   everything cosmetic per guard is in `src/ai` / guard-render's rig. Proposals below, not done.

## Proposals for the orchestrator (src/ai, guard-render; not touched here)
(in addition to `campus-perf-fix.md` "Proposals" 1-3: the frozen anim tier, the baked guard weapon, the dog's hidden
humanoid rig)
4. `Enemy.frame` (`src/ai/enemy.ts:2748`): while `bodyRig.root.isEnabled(false)` is false, skip `rig.setFlash` (the
   muzzle flash fade on a hidden body) and the pose packing into `rp` (only `rig.animate` reads it). Pure cosmetic;
   keep `r.position` / `r.rotation.y` (the thaw shows him in place) and the dog branch (its head feeds `this.head`).
5. `sniperFx` (`enemy.ts:2805`): a frozen sniper's glint can be skipped, but NOT the laser: the beam is a stealth tell
   drawn apart from the body and must stay while he is hidden behind cover.
6. guard-render's `CharacterRig.animate` with a frozen tier: carry `dt` and solve once at the thaw (as proposal 1),
   so a thawed guard shows his current pose on the first drawn frame.

## Tests (desktop, single files under sr-slot locks)
- `npx tsc --noEmit -p .` clean; eslint on the changed files clean.
- `tests/sectorGuardFreeze.test.ts` 13/13 (new: knee point; shadow probe / landing on the roof, on the ground, no
  ground).
- `tests/sectorGuardFreezeView.test.ts` 8/8 (new, NullEngine, box-world rays: epoch move -> drawn next evaluation, no
  move -> waits; re-entry into the frustum re-tested at once; near-wall guard re-tested every evaluation, far guard
  every `RETEST`; roof guard behind a parapet drawn while his shadow lands on open ground, frozen in the roof's middle.
  Mutation check: with the probe loop off the roof case fails).
- `tests/sectorGuardFreezeSeeThrough.test.ts` 6/6 (Havok door test now asserts drawn at the next evaluation through
  `Doors.viewVersion`; cut budget now `TESTS_PER_EVAL x FREEZE_TEST_RAYS`).
- Kept green: sectors 27, sectorRestart 8, doors 9, doorPeek 15. No e2e (as ordered).

## GPU / laptop checks needed (Test Runner, 4189, flag on vs `?guardfreeze=0`)
- Door peek into a patrolled room: guards visible from the first cracked frame (no 1-4 frame pop).
- Shoot / break the campus S1 window (14, 1.5, -76) with a guard behind: drawn on the break frame.
- Quick 180 deg turn back onto a guard who walked into the open while out of view: no pop-in.
- A guard stepping out of a doorway / corner toward the camera: no late show.
- S5 roof guard (8.4 m) behind the parapet: his moon shadow on the ground below is drawn.
- Perf A/B as in `campus-perf-fix.md` ("Laptop rerun"): S5-worst CPU p95 at 24 guards; log
  `__sector.debug().guardFreezeRays` (expect a few more rays than before: knee point, probes, edge re-tests; bounded at
  8 x 11 per evaluation).
