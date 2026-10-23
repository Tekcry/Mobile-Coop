# Campus perf fix check: the guard render freeze (2026-10-23, fresh Opus checker)

Branch feature/sector-redesign-perf, head 47dba252. Reviewed: the commit's own change (`git show 47dba252`) and
`git diff eb6d63c4..HEAD`. Note: the branch is cut from 8521bcbf, which is an ancestor of eb6d63c4, so the diff against
eb6d63c4 shows a revert of the s6-c1-fix (`scripts/e2e-sectorops.mjs` manual loop, `checks/s6-c1-fix.md`) that this
commit does not contain. A merge keeps eb6d63c4's change (the branch never touched those files); do not cherry-pick by diff.

## Verdict: FAIL (2 blocking items, both "guard frozen while plainly in view"; one shared fix shape)

The rules, the wiring, gameplay isolation, light parity and co-op are sound. The occlusion ray treats every `G.STATIC`
body as opaque, but two see-through things in play are `G.STATIC`.

### Blocking
1. **Door peek: guards seen through a cracked door are frozen.** The peek cracks the drawn leaf (~10.5 deg,
   `DOOR_CRACK.crack` 0.12 of `openAngle` 1.53; a stick-driven open up to `driveShut` 0.15) and frames the camera at the
   crack, but the door keeps its `G.STATIC` body (`src/world/doors.ts:292-303`, `src/world/doorPeek.ts:7`). The freeze
   ray (`src/game/modes/sectorMode.ts:226`, `G.STATIC`) hits the closed-leaf box, so every guard past the near radius
   (2 m + 1.3 m + h/2, about 4.2 m) is frozen: the peek shows an empty room. The peek exists to see guards.
   Fix: make a door whose drawn leaf is not shut (`d.cracked || d.ajar > 0`) transparent to the freeze ray only. Either
   (a) a query-membership bit, e.g. `G.VIEW = 1 << 15`: the freeze ray's query has membership `G.VIEW`, collideWith
   `G.STATIC`, and `Doors.crack` / the drive clear `G.VIEW` from that leaf's `filterCollideMask` while cracked (restore on
   close); check in a NullEngine/Havok test that Babylon's Havok raycast honours query membership vs shape collide mask;
   or (b) simplest: the freeze takes a `seeThroughNear(x, z, r)` predicate from `Doors` (allocation-free loop over
   `list`), and while the camera is within ~3 m of a cracked / ajar door every occlusion verdict is "seen" (frustum
   rule only).
   Done looks like: a `sectorGuardFreezeView` test with a door body between camera and guard: closed -> frozen, cracked
   -> drawn on the next evaluation; on the laptop a door peek at a patrolled room shows the guards with the flag on.
2. **See-through panes that are `G.STATIC`: breakable window glass and the warehouse roof sheets.** Breakable glass
   panels are `G.STATIC` bodies drawn at alpha 0.3 (`src/world/breakables.ts:71-80, :111`); campusOps has a closed one
   (`src/world/maps/campusS1.ts:206`), warehouseOps several (`warehouse.ts:221/249`, `warehouseS1.ts:223`). The roof
   sheets are collision-only `G.STATIC` boxes drawn at alpha 0.55 (`src/world/levelBuilder.ts:521, :703`,
   `warehouseDress.ts:208`). A guard seen through either is frozen. The flag applies to warehouseOps too (the build
   report says so).
   Fix: the same mechanism as item 1 (a) - the unbroken breakable glass and the sheet boxes leave `G.VIEW` out of their
   `filterCollideMask` (the sheets are inside the level's static container: give them their own body, as the glass
   panes, or move them out), or (b) the ray callback recasts past a hit whose body is in a see-through set (`Breakables`
   glass panels not yet broken, sheet bodies). Gameplay masks must not change (guard sight and bullets keep them).
   Done looks like: a view test with a breakable glass panel between camera and guard -> drawn; laptop: the campus S1
   window at (14, 1.5, -76) with a guard behind it is drawn with the flag on.

### Answers to the brief's questions
1. Gameplay reading a frozen rig: none found. Every gameplay reader of guard rig nodes forces the matrix
   (`computeWorldMatrix(true)` / `getAbsolutePosition`, which recomputes up the parent chain via `isSynchronized`,
   regardless of enabled state): takedown hands `takedownController.ts:547-595`, bodies / carry `ai/body.ts:102-180`,
   `ai/carryPose.ts:114-262`, ragdoll `ai/ragdoll.ts:42-83`, puppets `net/enemyPuppet.ts:312`. Guard head / eye is pure
   (`guardHead`, `enemy.ts:2736`), hit volumes are separate nodes synced from it (`enemy.ts:2738`, `ai/hitboxes.ts`),
   shots start at `eye()` (`enemy.ts:2500`), torches at the sim position (`world/torches.ts:44`), host snapshots and
   lag-comp history are sim position only (`net/coopHost.ts:1121-1126, :1171-1175`). No `pick` / `isEnabled` read of guard
   meshes in gameplay. The rig keeps animating (`enemy.ts:2799`); the brief's "rig not animated" is not what the code
   does (the report's estimate already counts the anim).
2. Light parity: holds. Guard torches are light-rig pool spots placed from the sim, not parented to the rig
   (`world/lightRig.ts:394-423`); freezing a body never changes a beam or the light field. A shadow-casting spot / lamp
   whose reach sphere is in view forces DRAW for every guard in its reach (`sectorGuardFreeze.ts:116-121`), so a torch
   whose shadow can show keeps nearby guards drawn. Non-shadow torches do not depend on the guard mesh at all.
3. Co-op: holds. The freeze toggles only `em.enemies[i].bodyRig.root` on the machine that renders, from its own camera;
   sim, brains, snapshots untouched. A client's guards are `EnemyPuppet`s, never touched (so a client laptop gets no
   saving: worth a line in STATE).
4. Occlusion correctness: blocking items 1 and 2. Fences, clear / frosted / armoured `b.glass` panes, open doors (body
   removed at `open`, `doors.ts:216`) are fine. Floors, stairwells, atrium edges: fine for anything above a balustrade
   (the over-the-head point); see polish 2 for the legs-only view.
5. Hot path: no per-frame allocation in the freeze (typed arrays, two kept vectors, module helpers, one bound arrow);
   `hyp2` / `hyp3`; Babylon via `src/core/babylon.ts`. Havok's raycast wrapper allocates small arrays per call (library,
   as every gameplay ray). Ray count is bounded by guards x 6, but not per frame: a camera cut re-tests every hidden
   guard at once (24 x 6 = 144 rays in one frame, ~0.5-0.7 ms; polish 3).
6. Tests: `npx tsc --noEmit -p .` clean; vitest single files under sr-slot-1: sectorGuardFreeze 11/11,
   sectorGuardFreezeView 4/4, sectors 27/27, sectorRestart 8/8, sectorGuardTags 20/20, smoothBody 4/4, smoothBodyMerge
   3/3. Meaningful for the rules; none covers a see-through static body (items 1-2) or the gameplay invariant (polish 5).

### Polish (not blocking)
1. Stale hidden verdict on re-entering the frustum: while `bits === 0` the memo is kept, so a guard who was occlusion-
   hidden, left the frustum and walked into the open shows up to `memoWait` (<= 4) evaluations late when the view turns
   back (`sectorGuardFreezeView.ts:285-293`). Reset `memoWait[i] = 0` when `bits` goes from 0 to > 0 with `memoHidden`.
2. No leg sample: points are over the head and at chest height only (`sectorGuardFreeze.ts:149-159`). A guard at the lip
   of a floor gap / atrium seen from below, or under a raised shutter / low overhang, can show legs while all four rays
   are blocked. Add a knee point (y + 0.4) on the body.
3. Ray budget per frame: cap tests per evaluation (e.g. 8 guards); the rest keep their verdict (or stay drawn) a frame
   longer.
4. Leak: `Enemy.dispose` does not clear `alive` (`enemy.ts:2828-2835`), so a guard frozen when his section unloads or
   the run restarts stays in `frozen` for the run (`sectorGuardFreezeView.ts:258-261`). Thaw-and-drop also when
   `e.bodyRig.root.isDisposed()`.
5. Moon shadow off a roof edge: shadow samples sit on his own floor (`occlusionPoints` y + 0.1), so a guard on a roof
   (S5 8.4 m) hidden by the parapet whose shadow falls on visible ground below stays frozen: shadow missing on the
   ground. Render only, but a stealth tell; sample where the shadow line meets `y - shadowDrop` as well, or skip
   occlusion for the shadow bit on roofs.
6. Tests: add a NullEngine check that a frozen guard's forced neck / head world position equals the unfrozen one
   after `animate` (the hard rule as a test), and the item 1-2 cases.

## Laptop checks (after the fix; `npm run build` on the head, 4189, GPU slot alone)
- The perf A/B from the build report (`MAP=campusOps MODE=sector`, `EXTRA=guardfreeze=0`, once perf.mjs has MODE) and
  guard-cap campus 24; log `__sector.debug().guardFreeze / guardFreezeOccluded / guardFreezeRays`. Pass: S5-worst CPU
  p95 <= ~11-12 ms, S3 / S4 under 12.
- Visual, flag on vs `?guardfreeze=0`: door peek into a patrolled room; the S1 window (14, 1.5, -76) with a guard
  behind; S2 L1 gallery guards seen from the atrium floor below; an S5 roof guard's moon shadow on the ground; a quick
  180 deg turn back onto a guard who walked into the open (pop-in); a sticky-cam view of a guard.
