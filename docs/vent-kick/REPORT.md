# vent-kick (T1) - report (implementer, 2026-10-22 ~21:10)

## Cause: a game bug
Pad and keyboard share one path: traversal's `useHeld` / `useHeldT` come from `interact` (A / E) and the `jump` press
(Y / Space) calls `attachFrom`, which creates the vent. The old `updateVent` kicked once the vent was older than 0.02 s
and interact was not down: the third fixed step, ~33 ms after the press. So E had to be down within 33 ms of Space (or
before it), otherwise it kicked, even with Space still held. A keyboard player pressing Space then holding E always got
a kick. In the harness's real-frame run Space and E reach different render frames (a frame runs up to 4 fixed steps),
so the kick lands inside the frame: no unscrew (`vent` null) and the grate kicked open (PR #22's flake).
Trace (real AttachController + InputState, 60 Hz frames, Space held, E 100 ms later): vent t0, t0.017, kick on step 3.

## Fix
- `src/player/ventOpen.ts` (new, pure): `UNSCREW_TIME`, `KICK_TAP`, `VentHold`, `ventStep(v, dt, useHeld, useHeldT,
  startHeld)`. `startHeld` false (pad, scripted taps) = the old rule exactly. Keyboard: while Space is held there is no
  kick and the hold carries into E with no gap (timed from the press, or from E's press when E went first).
- Keyboard result: Space tap = kick (on release, ~0.08 s); Space held, or Space then E held = unscrew; let go mid-unscrew
  = stop, no kick.
- `src/player/attachController.ts` (`AttachInput.startHeld`, `updateVent` via `ventStep`), `src/input/inputState.ts`
  (`KBM_SOURCE`, `downFrom(action, source)`), `src/input/keyboardMouseSource.ts`, `src/game/gameState.ts`
  (`ti.startHeld = inp.downFrom('jump', KBM_SOURCE)`, reset under `hangLock`).
- Co-op: no wire field (inputs drive each peer's sim; grates are local Breakables). No PROTOCOL_VERSION bump.
- Docs: `docs/systems/movement.md` (Ducts), `docs/systems/input-and-loop.md` (Jump row), `docs/ct-prototype/T1-TESTS.md`.

## Tests
- `tests/ventOpen.test.ts` (8): the pad path bit-identical to the old rule over a grid of hold patterns; keyboard tap
  kicks; Space held 0.9 s then released stops; Space into E unscrews with progress never dropping; Space then E 100 ms
  later unscrews (> 0.4, no kick); E released early stops; 100 ms frames with Space and E in different frames unscrew;
  E first then Space unscrews; pad Y + A unscrews, Y alone kicks on step 3, Y then A late kicks, scripted tap kicks.
  With the keyboard input switched off, 3 of them fail on the old behaviour.
- Also green: input, attach, holdToggle, handHold, attachGripsG4, drawState, moveState, n3DrawMotion; tsc, eslint,
  `npm run build`.
- `scripts/e2e-traverse.mjs`: the keyboard vent block's skip replaced by live asserts (prompt shown; Space then E held:
  progress > 0.2 and < 1; after letting E go: no vent, not attached, the grate still closed). #22's fresh-match guard
  before the pad kick removed (the keyboard section now asserts the grate stays closed, so the guard could only hide a
  failure).
- To run: e2e-traverse, e2e-mouse, e2e-pad (input code), e2e-netmove (src/game, src/player).

## Open
1. The pad has the same 33 ms window: Y, then A later, kicks (A must be down at the press or within 2 steps). Not
   changed (BRIEF: no pad change); Michael's call.
2. Duct grates' open state is not synced in co-op (each peer keeps its own; pre-existing).
3. The keyboard control "Space tap kicks, Space held (or into E) unscrews" may want a DECISIONS entry at the merge.
