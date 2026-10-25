# anim-gear - checker report (HEAD 06a0a8a6)

Verdict: PASS. No fix list. Nothing is broken or unplayable.

## Findings by check item
1. Correctness. Every `place` branch sets the pivot to the point its own position formula puts on the slot origin:
   - thighMount: `h.centre`
   - generic thigh: the extents' centre
   - back mount: the stud
   - generic back: `(0, e.y1, e.z0)`
   - backC: the grip
   - placeSling: `(e.x1, yc, e.z0)`

   `gearCompose` p' = p + R(d + v - r v), q' = q r keeps the pivot fixed under the turn and moves it by R d in the
   gun's slot frame. The unit test and e2e (holster: 3 cm along WREN_HOLSTER.x, miss 1.7e-17) confirm it. The crouched
   rows give standing + clamp(crouch) x crouched. The holster travel's ghost goes through `place`, so it aims at the
   moved slot, and the draw starts from the moved node. Gameplay is unchanged (G-A3): only the transforms of carried
   gun nodes and of the slingBack / slingHip nodes change.
2. Per rig and hot path.
   - Each rig has its own `TuneRigState.gear`, built in `tuneRigBegin` from its own pose. `gearRes` is used and read
     at once, so nothing leaks between rigs.
   - Guards (`tuneSt` null) return at once. Guards never call `WeaponModel.holster`, so they gain no onPosed entry.
   - Nothing allocates per frame.
   - With nothing live, `gearRigUpdate` returns, ver stays 0, nothing is re-placed and `gearCompose` returns false.
   - The sling nodes are restored from their captured places. The reset is bit-identical (unit test and e2e).
3. `weaponModel.ts`. With identity gear, `track(rig, true)` on non-sling slots adds one closure call per carried gun
   per Wren frame: a getter and an integer compare, nothing else. Other effects:
   - `this.rig` is now set for non-sling slots. It is read only by `follow` and dispose (dispose now unhooks it
     properly).
   - The carried-gear spring is safe. `onWeightGear` runs after `animate`, so a re-place followed by `gearOn = false`
     only makes the spring retake its base.
   - The re-place is skipped while `rig.gliding === node`. The glide's P1 is captured at holster time, and a later
     change re-places once the glide ends.
   - During a travel the gun is untracked (beginTravel calls `track(false)`), so the `travelNode` test is only a guard.
   - The `return` after the sling branch changes nothing (it was the last branch).
4. Bake.
   - `gear` is in `BAKE_BASE_SECTIONS`. Targets are validated against GEAR_ROWS / GP. Offsets add and angles wrap.
   - The key prints only when a row is non-zero, and the current table prints identically (test).
   - The J1 / J2 bake tests pass unchanged, so old exports bake as before. A re-run is a no-op through the ledger
     (test).
5. Panel. Gear has its own tab `sec:gear` after Co-op, with no UI change (e2e-studio asserts the tab and the rows).

## Polish (non-blocking)
1. `gear.slingBack` (and `.crouch`) moves nothing visible. Nothing in src reads `rig.slingBack` (D24: no sling is
   modelled; the backC diagonal uses `backMount.backC`, not the node). This is the reason pouches was dropped. Hide or
   drop it the same way, or label it "no visible effect yet".
2. While any gear offset is live, each crouch-amount change bumps `ver` even when no `.crouch` row is set. Every
   carried gun then re-places and the sling nodes restore and re-place each frame of a crouch blend. The cost is
   small, but bumping only when `out` or `live` actually changes would avoid it.
3. If `tuneRows` were switched off while a sling-node offset is on, the node keeps its offset. Nothing toggles it at
   run time today.
4. Docs are stale after 06a0a8a6:
   - REPORT.md still lists the `pouches` socket and "14 groups" (now 12).
   - STATE "Now" still says to drop pouches before the checker.
5. e2e-studio covers holster and slingHip only. The back slots are covered by the unit pivot maths only.
6. A gun holstered on rig A and then held by rig B leaves a no-op closure in A's onPosed. This already happened for
   the sling, and now applies to every slot. No caller does this today.

## Commands (desktop, 2026-10-22)
- `npm run lint`: 0 errors, 41 warnings (none new), 66 s.
- `npx vitest run`: 224 files, 2482 passed, 5 skipped, 44 s.
- `npm run build` under heavy.lock: ok, 54 s.

  These three are the parts of `npm run check`, run separately.
- Lock 00:49-00:53, port 4191 freed before and after:
  `E2E_PORT=4191 E2E_JOBS=1 node scripts/run-e2e.mjs e2e-studio e2e-weapons-carry e2e-anim` passed. e2e-studio ok
  105 s, e2e-anim ok 32 s, e2e-weapons-carry ok 18 s, wall 156 s, no console errors.
- e2e-menus not run. No GPU checks.
