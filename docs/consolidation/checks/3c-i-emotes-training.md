# Check 3c batch (i): emotes (A) and the old solo Training mode (B) - 2026-10-18

Verdict: **PASS** (no fix items). Non-blocking notes below.

## Results
1. Diff review.
   - Emotes: no `emote` / `Emote` / `EMOTE` / `quick1-4` / `emote1-3` / `playEmote` left in `src/`, `tests/`, `scripts/`
     except the kept `CharacterRig.emote` / `emoteTime` pose slot (grabs, hostages, VIP, bodies, ragdolls, enemy
     puppet), the v8 -> v9 migration, the save / cosmetics tests asserting absence, and comments. `sanitizeBinds` reads
     only known `BINDS` ids, so stored `emote1-3` key binds drop out.
   - Training: no `'training'` mode id, `TrainingMode`, `trainingMode`, `TrainingCourse`, `TRAINING_STEPS`,
     `e2e-training` left. Kept intact: `src/game/trainingDummy.ts`, `src/game/course/**`, `src/config/course.ts`,
     `src/save/courseRecord.ts`, `e2e-course`, `e2e-bunker`, Proving Grounds (`modes: ['sandbox']`, Free Roam).
2. Save: `SAVE_VERSION` 9; migration 8 drops `emotes` and every `emote:*` unlock, keeps the rest. Literal v8 save test
   present (`tests/save.test.ts`, "v8 -> v9 ..."). v1-v5 and v7 tests now run through to `SAVE_VERSION`. The sanitizer
   keeps any string unlock under 64 chars and ignores unknown fields; the only v8 data it no longer reads is `emotes`.
3. Protocol 13: `src/net/protocol.ts` (single constant, used by `session.ts` hello and the version check). All 5 asserts
   in `tests/net.test.ts` and 1 in `tests/moveState.test.ts` expect 13; the join test refuses v12 and admits v13.
   `emote` message / event removed from types, parsers, the session forward list, host and client.
4. Protected paths (`src/editor/**`, `src/world/maps/kestrel*`, `src/security/**`, `docs/kestrel/**`): unchanged.
5. `npm run check`: pass (lint 0 errors / 41 warnings, 129 files / 1494 tests, build ok).
6. E2E, port 4191, `E2E_JOBS=2`: smoke, e2e-modes, e2e-park, e2e-anim, e2e-ct, e2e-bunker ok. e2e-coop FAIL (known
   flaky, "host sees the client holstered" timeout). e2e-pad FAIL (known flaky, "elbow strike" 60 s timeout under
   load). e2e-mouse KILLED at 900 s under load. e2e-course FAIL (mains lamp 1517 ms > 500 ms).
   Solo (`E2E_JOBS=1`): e2e-mouse ok (385 s; its Custom-difficulty step on `proving&mode=mission` passes). e2e-course
   failed once (lever lock 1440 ms > 500 ms, a different latency assert) then passed alone (232 s): load timing.
   e2e-pad failed at "B held 1 s cancels the capture" (see 7). Port 4191 freed and checked.
7. e2e-pad "B held 1 s cancels the capture": **(a) pre-existing, not this change.**
   - This change does not reach the capture path. `GamepadSource.poll` returns into `pollCapture` before any button
     handling; the only edit in `gamepadSource.ts` is the View tap / hold branch after that return.
     `controlsScreen.ts` is untouched.
   - The failure JSON shows the capture ended as a bind, not a cancel: `cap: false`, conflict "Crouch and Reload ...
     share B". So B was released before `CAPTURE_CANCEL_HOLD` (1 s) had passed on the app clock. The app clock advances
     by `min(frame, 0.1 s)` per frame (`src/core/loop.ts:113`). Under software GL at the desktop viewport (since
     11dfad9), menu frames slower than 100 ms make a 1.5 s wall-clock hold last less than 1 s of app time. Earlier
     runs (3b) stopped before this step, so it had not been reached since 11dfad9.
   - The step also tests the pre-G22 behaviour. G22 / MD13: cancel with Menu / Start or Esc, and B stays bindable. The
     code still has B held 1 s (A69). G22 is not built yet.
   - Test fix (report only, not made):
     - Now: hold B until the source reports the cancel, not for a fixed time. Replace
       `waitForTimeout(1500)` with
       `waitForFunction(() => !window.__app.input.gamepad.capturing, null, { timeout: 8000 })`
       before `__pad.set(1, 0)`. This is the same pattern the View-held step now uses.
     - When G22 is built: replace the step. Press Start (`BTN.START`) during a capture, then expect `!cap`, the screen
       stays and `reload` is still `[11]`. Add a check that A then B binds B to the slot (B is bindable).
8. Log: accurate against the diff (files deleted, ids, wire / save, unit and e2e changes, REQUIRED / COVERS /
   e2e-times edits, kept-on-purpose list). The shared-file list (`gameState.ts`, `main.ts`, `e2e-mouse.mjs`,
   `e2e-park.mjs`) is correct. The log names every other changed file only through its content, not as a
   per-section list. The split below is checked against the diff. Either commit order compiles, because neither
   section's non-shared files reference the other's.

## Commit split (modified / deleted files by deletion)
- A (emotes): `src/cosmetics/emotes.ts` (D), `src/cosmetics/catalog.ts`, `src/core/legacy.ts`,
  `src/game/gameEvents.ts`, `src/input/actions.ts`, `src/input/gamepadMapping.ts`, `src/input/gamepadSource.ts`,
  `src/input/keyBindings.ts`, `src/input/padBinds.ts`, `src/net/coopClient.ts`, `src/net/coopHost.ts`,
  `src/net/protocol.ts`, `src/net/remoteAvatar.ts`, `src/net/session.ts`, `src/player/characterRig.ts`,
  `src/progression/unlocks.ts`, `src/save/migrations.ts`, `src/save/schema.ts`, `src/styles.css`,
  `src/ui/screens/loadoutScreen.ts`, `src/ui/screens/pauseScreen.ts`, `src/world/menuScene.ts`,
  `tests/cosmetics.test.ts`, `tests/input.test.ts`, `tests/moveState.test.ts`, `tests/net.test.ts`,
  `tests/save.test.ts`, `docs/systems/input-and-loop.md`, `scripts/e2e-cosmetics.mjs`, `scripts/e2e-pad.mjs`.
- B (Training): `src/game/modes/trainingMode.ts` (D), `src/game/training.ts` (D), `tests/training.test.ts` (D),
  `scripts/e2e-training.mjs` (D), `src/ai/enemy.ts`, `src/core/flags.ts`, `src/game/modes/gameMode.ts`,
  `src/progression/profile.ts`, `src/progression/rewards.ts`, `src/ui/screens/playScreen.ts`, `src/world/mapDef.ts`,
  `src/world/maps/index.ts`, `src/world/maps/provingGrounds.ts`, `tests/legacy.test.ts`, `tests/rooms.test.ts`,
  `scripts/e2e-clear.mjs`, `scripts/run-e2e.mjs`, `scripts/e2e-times.json`.
- Both (stage by hunk): `src/game/gameState.ts`, `src/main.ts`, `scripts/e2e-mouse.mjs`, `scripts/e2e-park.mjs`.
- The log itself (`docs/consolidation/deleted-emotes-training.md`) goes with whichever commit is second.

## Non-blocking notes
1. e2e-pad capture step: pre-existing timing failure plus a pre-G22 expectation. Fix per item 7, in the G22 / controls
   work or as its own test fix. It is not this batch's fix.
2. `docs/systems/input-and-loop.md` line 44 prose ("emote 1 with `TapHold`") is left for the docs rewrite, as the log says.
