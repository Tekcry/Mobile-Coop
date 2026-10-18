# Deleted emotes and the old solo Training mode - log (integrate/consolidate, 2026-10-18)

Michael's decisions: docs/DECISIONS.md G24, G111, G116 ("Delete both", in this merge). Two separate deletions, logged in
two sections (A emotes, B Training) so each can be committed on its own. Nothing committed.

Files that carry hunks of both deletions (stage by hunk, or commit them with whichever goes second):
- `src/game/gameState.ts`: A = the `playEmote` import, `GameOptions.emotes`, `emote()`, `onEmote`, `emoteBar()`, the
  quick-emote input lines and the pause-screen emote bar argument; B = the `TrainingMode` import and its branch in the
  mode choice.
- `src/main.ts`: A = `emotes: sv.emotes` in the match options; B = the Play card subtitle ("Infiltration · Free roam").
- `scripts/e2e-mouse.mjs`: A = the J / K / L rows of the KBM verb table; B = the Custom-difficulty match now boots
  `autostart=proving&mode=mission` (was `mode=training`).
- `scripts/e2e-park.mjs`: A = the legacy Loadout row label `Tag` (was `Tag & emotes`); B = the Play-screen mode lists.

## A. Emotes

### Files deleted
- `src/cosmetics/emotes.ts` (`EMOTE_POSES` wave / salute / point / dance / flex / clap / laugh FK poses, `playEmote`)

### Files added or renamed
None.

### Ids / settings / bindings removed
- Bindings: pad View held (was emote slot 1), keys J / K / L (`BindId` `emote1` / `emote2` / `emote3`). All free; nothing
  rebound. View tap is still goggles (on release, the tap / hold detector stays; a hold now does nothing). Stored key
  binds with the old ids are dropped by `sanitizeBinds` (it reads only known ids).
- Actions `quick1`..`quick4` (`BUTTON_ACTIONS`; `quick1` was already unused).
- `padBinds` goggles label "Goggles (tap) / emote (hold)" -> "Goggles".
- `GameState`: `emote()`, `onEmote`, `emoteBar()`, `GameOptions.emotes`, the quick-emote input and the cancel-on-move
  line. `PauseScreen`'s `extra` parameter (only the emote bar used it).
- `GameEvents.emote`.
- `RemoteAvatar.emote()` and its cancel-on-move line; `MenuState.emote()` (the menu operator preview).
- Cosmetics: `EMOTES` catalogue and its `emote:*` unlock items; `UnlockKind` `'emote'`.
- Loadout (legacy): the "Tag & emotes" page is now "Tag" (callsign, title, emblem, colour); emote slot rows and the
  "Try an emote" grid removed. CSS `.emote-grid`, `.emote-bar`.
- `core/legacy.ts` comment.

### Wire (PROTOCOL_VERSION 12 -> 13)
- Message `{ t: 'emote', id }` (client -> host) and event `{ e: 'emote', player, id }` removed (types, parsers, the
  session's game-message forward list, host / client handlers).
- `tests/net.test.ts` (3 asserts, join test now refuses v12 and admits v13) and `tests/moveState.test.ts` assert 13.

### Save (SAVE_VERSION 8 -> 9)
- `SaveData.emotes` removed (default and sanitizer); default unlocks no longer grant `emote:wave` / `emote:salute`.
- Migration v8 -> v9: drops `emotes` and every `emote:*` unlock (spent credits are not refunded).
- `tests/save.test.ts`: new literal v8 save test; v1 test asserts no `emotes`; the v7 -> v8 tests now expect the
  migration to run on to the current version.

### Unit tests changed
- `tests/input.test.ts`: the pad-mapping test no longer checks `quick2` / `quick4`; the binding-table row floor is 21
  (was 24, the three emote rows).
- `tests/cosmetics.test.ts`: no `emote:wave` starter unlock; asserts no `emote:*` unlock.
- `tests/save.test.ts`, `tests/net.test.ts`, `tests/moveState.test.ts`: above.

### Docs edited (outside the log)
- `docs/systems/input-and-loop.md`: the three Emote rows of the binding table deleted, because `tests/input.test.ts`
  checks that table against `BINDS` both ways. The prose at line 44 ("emote 1 with `TapHold`") is left for the docs
  rewrite.

### E2E suites changed
- `e2e-pad`: "View held: an emote" -> "View held: goggles untouched" (the hold stays tested as doing nothing to vision;
  it waits for the source's View tap / hold detector to fire, `input.gamepad.viewBtn.fired`, since there is no emote
  to wait on and under software GL a 500 ms hold could otherwise read as a tap).
- `e2e-mouse`: J / K / L rows removed from the KBM verb table.
- `e2e-park`: legacy Loadout row label `Tag`.
- `e2e-cosmetics` (legacy): emote slot assignment, preview emote and in-game View-held emote checks removed; it still
  opens the Tag page and tests the random callsign.
- No suite deleted; no list in `scripts/run-e2e.mjs` changed for emotes.

### Lost coverage
- Emote playback (menu preview, in game, co-op broadcast). Nothing that stays depended on it.

### Kept on purpose
- `CharacterRig.emote` / `emoteTime` (the FK pose override slot): it is shared infrastructure, also driven by grabbed and
  hostage guards (`ai/enemy.ts`), the VIP (`game/vip.ts`), the co-op enemy puppet, bodies and ragdolls. Only its
  comments changed. Renaming it (for example to `fkPose`) is a possible later cleanup.
- Tags and emblems (cosmetics, legacy).

## B. The old solo Training mode

### Files deleted
- `src/game/modes/trainingMode.ts` (`TrainingMode`, Play > Training on Proving Grounds)
- `src/game/training.ts` (`TrainingCourse`, `TRAINING_STEPS`, `TrainingStatus`; only the mode and its test used it)
- `tests/training.test.ts`
- `scripts/e2e-training.mjs`

### Files added or renamed
None.

### Ids / settings removed
- Mode id `'training'`: `ModeId`, `MapDef.modes` union, `flags.mode` (`?mode=training` now falls back to the autostart
  default), the Play screen entry, the mode branch in `GameState`.
- Proving Grounds `modes`: `['sandbox']` (was `['sandbox', 'training']`). The map stays (Free Roam range, tests).
- `rewards.ts`: the Training XP / credits line. `profile.ts`: the two `'training'` exclusions (stats, challenges).
- Main-menu Play subtitle "Infiltration · Training · Free roam" -> "Infiltration · Free roam".
- Comments: `ai/enemy.ts` `passive` (still used by the benchmark flight and e2e suites), `world/maps/index.ts`,
  `playScreen.ts`.

### Wire / save
Neither changed: Training was solo only (not in `NetMode`) and stored no progress.

### Unit tests changed
- `tests/training.test.ts` deleted. `tests/legacy.test.ts`: Play list without Training (4 with legacy). `tests/rooms.test.ts`:
  no Training default-map assert.

### E2E suites changed
- `e2e-training` deleted; removed from `scripts/run-e2e.mjs` REQUIRED and the `src/ui/` and `src/game/` COVERS lists,
  and from `scripts/e2e-times.json`.
- `e2e-mouse`: the Custom-difficulty match boots `proving&mode=mission` (guards on) instead of Training.
- `e2e-park`: the Play screen lists Infiltration and Free Roam (legacy: 4 modes).
- `e2e-clear` (legacy): the Training default-map assert is replaced by "no Training mode"; comment.

### Lost coverage
- The step-by-step solo tutorial (move, sneak, vault, ladder, goggles, takedown, gadget, with device hints). The Fallow
  course (`e2e-course`, `e2e-bunker`) is now the only training.

### Kept on purpose
- `src/game/trainingDummy.ts` (`TrainingDummy`): Free Roam targets on Proving Grounds and the course's padded strike post.
- The co-op Fallow training course (`course` mode, `courselab`, the bunker maps), `config/course.ts`, `game/course/**`,
  `save/courseRecord.ts`, `e2e-course`, `e2e-bunker`, and the "training course" wording that refers to it.
- `progression/suit.ts` "Field medic training" (an HQ upgrade name, not the mode).
