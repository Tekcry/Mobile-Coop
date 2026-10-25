# anim-tuner - check (2026-10-20)

Fresh checker, read-only review of the uncommitted tree on `feature/anim-tuner`.
Ran: `npx tsc --noEmit -p .` clean; `npx eslint` on all 12 changed / new source and test files clean; `npx vitest run
tests/animTune.test.ts` 16 / 16. Not run (job lead): `npm run check`, smoke / e2e.

## Verdict: PASS

## Blockers
None.

## What was verified
1. **Identity at defaults.** Every hook is `x * 1` or `x + 0` appended to the existing expression, with no regrouping
   (`0.55 * 1 * (1 - TUCK * 1 * aimK)`, `(w.yaw + 0) * mirror`, `fz * (sw + (GRAB.side + 0))` and the others all give
   the same result to the bit). The only difference is a possible `-0` becoming `+0` (`pe.y`, `spine.pitch`,
   the keyed elbow x), which nothing can observe.
   - `tuneKeyedLean` and `tuneRoot` return early at 0.
   - `p.lookYaw *= 1` is exact. The `p.lean` clamp of ±1.5 never bites: the lean is at most `WALL.peekLean` 0.2.
   - `rp.lookYaw` and `rp.lean` are reassigned every frame, so the scaling never compounds.
   - The root position is re-copied from `renderPos` every frame, so `tuneRoot` never accumulates.
2. **Local only.**
   - `TUNE_CUR` is identity outside `tuneBegin` .. `tuneEnd` (player.ts:507-509) and outside `tuneSim`
     (playerController.ts:516-518).
   - `Player` and `PlayerController` have exactly one instance each: the local player (`gameState.ts:445`).
   - The remote avatar, guards, the VIP, the training dummy, the menu rig and the lab rig all animate outside the window.
   - The rig only reads `reachL/R` and `plantL/R` during `animate`, so the save and restore is exact. The unit test runs
     10,000 frames.
   - A6 (`guardGapAdd`): the host is authoritative for its own grabs, and the partner sees the moved guard through the
     normal enemy sync, so nothing desyncs. A client's grab is held on the host by `coopHost.ts:1072` with plain
     `GRAB.hold`, so the host's slider never moves the client's victim.
3. **Hard rules.**
   - No allocation in `tuneBegin`, `tuneEnd`, `tuneSim`, `tuneRoot`, `selectBodyGroup`, `selectGunGroup` or the hooks:
     indexed loops over const arrays, a preallocated `Float64Array`, no closures and no `Math.hypot`.
   - Babylon comes only through `core/babylon.ts`. The line and sphere builders and `StandardMaterial` are already
     exported there, and the line shaders are already imported.
   - Type-only imports use `import type`.
   - No localStorage. The values live in their own IndexedDB database (`<DB_NAME>-animtune`), and the save schema is
     untouched.
   - Nothing imports `src/net`.
4. **Brief.**
   - Every state in the brief is in the picker, with follow on by default.
   - The sliders map to real code values and apply live. Reset works per slider, per group and for all.
   - Values persist through IndexedDB.
   - Export produces `anim-tune-YYYY-MM-DD.json` containing the changed values with their defaults and a timestamped log.
   - The barrel marker works, and the crab readout stays top left.
   - Hook directions spot-checked as claimed:
     - `trackMul` above 1 widens `half`.
     - `pelvisYAdd` below 0 lowers the pelvis.
     - `wallGapAdd` above 0 shrinks the push onto the face, which opens the gap.
     - `headDropMul` above 1 flexes the neck more.
     - The keyed lean post-multiplies the spine quaternion (offset 4 = `KQ.spine`).
5. **Smoke.** It will pass:
   - The selectors exist: `.debug-tools button` with the text "Anim", `.anim-tune`, `.anim-tune-pick-body`, and
     `input[data-group][data-id]`.
   - `window.__app.debug.toggle` exists in every build.
   - The check runs in one synchronous `evaluate`, so a follow sync in `frame()` cannot switch the group mid-check.
   - The boot-time IndexedDB load cannot overwrite the change, because it skips once the log is not empty.
   - The value is put back afterwards.
6. **Merge friendliness.**
   - `animGraph.ts`: 1 import line and 5 one-line edits.
   - `characterRig.ts`: 1 import line and 9 edits, each on an existing line.

## Non-blocking (polish list)
1. **Exception safety.** Wrap `this.rig.animate(dt, rp)` and `this.motion.step(...)` in `try { } finally { tuneEnd / tuneSim(false) }`.
   - A `try / finally` allocates nothing.
   - Today, if `animate` throws with a reach or foot slider moved, the grip targets are re-saved already shifted, so they
     drift.
   - For the rest of that frame, other rigs would also read the tuned `TUNE_CUR`.
   - This only matters after a crash, and only with sliders moved.
2. **The "nothing on the wire" claim is a little strong.** `strideMul` changes the local motion driver's gait phase.
   That phase sets the footfall timing (the noise guards hear) and any phase the partner's copy follows.
   `guardGapAdd` on the host moves the real hostage, and with it the shield.
   - All of this is dev-only and only happens with a slider moved.
   - A client's own `guardGapAdd` moves only its local puppet. The host still holds the guard at the default gap, so
     the slider is only reliable on the host or in solo.
3. **Saved values apply with F3 closed.** Values load at boot and stay applied even when F3 is closed. That is by
   design, but TESTING.md should remind Michael to use Reset all before judging the defaults.
4. **Formatting.** `characterRig.ts:1858` is missing a space after the comma (`TUNE_CUR.headDropMul,t.head.roll`).
5. **Marker allocation.** The barrel marker calls `CreateLineSystem(..., { instance })` every frame, which allocates
   inside Babylon. It is dev-only, while the marker is ticked.
6. **Boot cost.** `AnimTunePanel` is built at every boot, which adds a hidden DOM tree and opens a second IndexedDB
   for every player. It is harmless, but it could be built lazily on the first Anim click.
