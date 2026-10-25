# tuner-camera - check (fresh checker, 2026-10-21)

Reviewed: `git diff origin/master...HEAD` on `feature/tuner-camera` (78456c9d registry + Camera, 13dc9996 pass 2).
Ran: `npx tsc --noEmit -p .` clean; `npx eslint` on the changed `src` files clean; `npx vitest run` on
`tests/animTuneCamera.test.ts`, `tests/animTunePad.test.ts`, `tests/animTunePass2.test.ts`, `tests/freeView.test.ts`:
27 / 27 pass. No e2e or build run (the job lead runs them).

## Verdict: FIX

Two small blockers, each a few lines. Everything else holds:
- **Identity at default.** Every camera hook is `+ 0`, `* 1` or `/ 1` in the same association order, so it is exact.
  `max(0, castPad + 0)` is `castPad`. The ease never touches a value equal to its target. The Speed hooks return exactly
  1 at identity (`speedPaceMul` returns `ma` when `ma === mb`; `speedGlideMul` short-circuits).
- **Loop and defaults.** `realDt * timeScale` equals the old expression. `FREE_VIEW.mode` is `'off'`, `frozen` is false
  and `timeScale` is 1 by default. `hide()` and `GameState.exit` reset all of them.
- **Time scale 0.** It runs the same `frameUpdate(0)` path as the pause menu. `acc += 0`, so there are no steps and no
  spiral. `timeScale || 1` guards the beat clock. `tuneSectionEase` with dt 0 applies at once, and NaN dt fails
  `dt > 0`.
- **Free view.** It only overrides the rendered camera after `gamePos` is written. Look is consumed before
  `addLook`. Perception, noise and the light meter never read the camera. Off restores the view on the next `update`
  (position, rotation, `minZ`, body fade).
- **Speed.** Only the one local `PlayerController`, `WallCore` and `AttachMachine` read it, and nothing in `src/net`
  does.
- **Hard rules.** No hot-path allocation (camera step, ease, free frame, `freeInput`, pad poll; the marker allocates
  only in its 500 ms rect refresh). Babylon comes only through `core/babylon`. `import type` is used. There is no
  `localStorage`, no main save change and no `src/net` import.
- **Saves.** Body and gun groups and keys are unchanged, so 4.20.x saves load. Import refuses a wrong magic, version or
  shape. Late sections get their pending values on register and keep them in the next snapshot.
- **Pad map.** Coherent: no button does two things in one mode, B backs out of an edit, the menu and the free view, and
  Start always closes.

## BLOCKERS

### B1. `gamePos` is not `camera.position` during the sticky-cam remote view (game change with the panel never opened)
- `src/game/gadgetSystem.ts:603` (`frameUpdate`, `remote === 'cam'`) moves the shoulder camera to the sticky cam
  after `ShoulderCamera.update`. Before this branch, every gameplay read in the next fixed steps saw the sticky cam's
  position:
  - the flashbang white-out (`gadgetSystem.ts:359`);
  - the jammer pick (`ctDevices.ts:397`);
  - the crosshair's `onTarget` (`gameState.ts:3076`, which runs after `gadgets.frameUpdate`).
- They now read `gamePos`, the operator's follow view. Result: while watching a sticky cam, a flash near the cam no
  longer whites out the screen the same way, and the jammer pick and on-target come from another point. This happens
  in normal play (a partner's flash while you watch your cam). It also contradicts the `gamePos` doc ("equal to
  `camera.position` unless the free view is on").
- Fix (restores the old reads exactly): in that branch, after the camera is placed, add
  `g.player.cam.gamePos.copyFrom(camera.position);`. Update the `gamePos` comment to say "the remote view writes it
  too".

### B2. The co-op lock on freeze can be stale: View can freeze a co-op session
- `src/ui/animTunePanel.ts:1298`: `setCoop(this.coop())` runs only inside the 250 ms info tick, which is gated by
  `!this.folded`. `show()` (:712) never refreshes it, and `folded` survives close and reopen.
- Sequence that breaks: fold the panel, close it, start or join co-op, open the panel (still folded), press View, then
  View again. `onPadToggled` (:824) unfolds and calls `setFrozen(true, true)` with the stale `coopOn === false`. Time
  scale 0 then stops the local sim in a co-op session.
- Fix: read co-op live where it matters. Call `this.setCoop(this.coop?.() ?? false)` at the start of `setFrozen` (on),
  `stepFrame`, `setTimeScale` and `onPadToggled`. Or call it in `show()` and every frame, outside the `!this.folded`
  gate. It is cheap: one property read.

### Fix in the same round (cheap; not a blocker on its own)
- **Wide ranges make `mul` sliders negative.** `tuneMin` / `clampWide` (`src/anim/tuneRegistry.ts:175`, `clampWide`)
  double the range below the default too. That gives `camBlendMul` -0.6, `camFollowMul` and `camBoomRateMul` -1.8,
  `camZoomMul` -0.4, every speed multiplier -0.4 and body multipliers -1. A negative boom rate makes the boom spring
  diverge (the camera flies off and goes non-finite). A negative zoom gives a negative FOV, and a negative speed walks
  backwards.
- Saves keep wide values (P10), so a stray drag stays broken in normal play after a reload, with the panel closed.
- Fix: for `kind === 'mul'`, floor the wide minimum at the slider's own `min / 2` (or 0.05). Use the same floor in
  `clampWide`.

## Polish list
1. **Stuck free-view input after a pad disconnect.** `FREE_IN` keeps its last stick values when the pad disconnects
   while the free view has it, because `padPoll` stops being called. The player keeps walking in orbit, or the view
   keeps flying. Clear `FREE_IN` on `gamepaddisconnected`, or when no poll has run for 0.25 s.
2. **The aim and crouch demos stop working after a free view off and on.** `GameState.freeFrame`
   (`gameState.ts:1816`) calls `freeInp.releaseAll()`, which marks the held `ads` / `crouch` as `blocked`. Fly with the
   aimStrafe demo (or crouchWalk with hold-crouch) then never aims or crouches, because `set(true)` on a blocked action
   is ignored until a false. Use `set('free', 'ads', false)`, `set('free', 'crouch', false)` and zero `move` instead.
3. **A slow beat overrides the tuner's game speed.** `slowBeat` sets 0.6 and then 1. The panel's `frame()` adopts 1,
   so the slider jumps back to 1x after a takedown beat.
4. **The Speed note is wrong about co-op.** The note says co-op uses the defaults. In a session the local player moves
   at the tuned speed while the host clamps the steps (`src/net/remotePlayer.ts:123`), so the partner sees
   rubber-banding. Either read x1 when `GameState.net` is set, or reword the note.
5. **`tuneImport` can write onto `Object.prototype`.** `(pending[group] ??= {})[id] = value` (`tuneRegistry.ts:431`)
   does so for `group: "__proto__"`. The risk is low because the file is local and user-picked. Skip `__proto__` and
   `constructor`, or make `pending` with `Object.create(null)`. The same applies to `tuneLoad`'s `pending[g] = keep`.
6. **e2e-menus marker check.** It compares `scene.meshes.length` across 10 frames, so any lazily created mesh (a
   pooled effect, a guard prop) would flake it. Assert instead that no mesh named like the old marker exists, or compare
   within one frame of the toggle. The rest of the new e2e block looks robust: it uses state hooks, not pixels, the
   margins are wide, and it closes the panel and restores state at the end.
7. **Import cycles.** `attach.ts` and `wallController.ts` each import `speedTune.ts`, which imports them back. This is
   safe today because nothing is used at the top level. It is fragile, though: `import '../anim/tune'` cannot guarantee
   the section order inside a cycle. Consider passing `ATTACH` / `WALL` lazily, or moving the "today" text to the
   panel.
8. **Keyboard bypass key.** Backquote is still bindable in `keyBindings.ts:129`. A player who binds an action to it
   gets the bypass as well while the panel is open. This is minor because the bypass only works with the panel open.
9. **The barrel marker ignores roll.** The projection ignores the camera roll (the shake). This is accepted in the doc.
   A 1-2 px offset while shaking is fine.
