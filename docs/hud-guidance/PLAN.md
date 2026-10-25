# hud-guidance: plan
Owner: Campaign Build. Status: current.

Lead: Night Shift | Campaign Build. Planner: Opus 5.5, master 2148ec969. Brief: `docs/hud-guidance/BRIEF.md`.
Sources: FOLDED-PLAN J3 / J3b (origin/feature/menu), `docs/conformance-campaign/CONFORMANCE.md` Part C (HG1-HG9, the
removal inventory, "Tests that assert the old behaviour"), Player R12 / R24 / H9, Sector Ops M1 / M2 / M5 / M6, Marlow
H2, Test Runner T2. Every file:line below was re-read on master 2148ec969 (the review read 829a9332; most lines held,
`coopHost.ts` blips moved to :1943).

## Claims
```claims
files:
  - src/ui/hud/minimap.ts
  - src/ui/hud/hud.ts
  - src/ui/hud/wheelLayout.ts
  - src/ui/hud/objectivePopup.ts
  - src/game/gameState.ts
  - src/game/pickups.ts
  - src/game/fieldNotes.ts
  - src/game/sectorObjectives.ts
  - src/game/modes/gameMode.ts
  - src/game/modes/sectorMode.ts
  - src/game/modes/infiltrationMode.ts
  - src/game/modes/missionMode.ts
  - src/game/modes/clearMode.ts
  - src/game/modes/courseMode.ts
  - src/net/coopHost.ts
  - src/net/coopClient.ts
  - src/net/objectiveMirror.ts
  - src/progression/suit.ts
  - src/save/schema.ts
  - src/save/migrations.ts
  - src/ui/screens/loadoutScreen.ts
  - src/ui/screens/pauseScreen.ts
  - src/input/actions.ts
  - src/input/padBinds.ts
  - src/input/gamepadMapping.ts
  - src/input/keyBindings.ts
  - src/styles.css
  - tests/minimap.test.ts
  - tests/economy.test.ts
  - tests/save.test.ts
  - tests/objectivePopup.test.ts
  - tests/fieldNotes.test.ts
  - tests/sectorObjectives.test.ts
  - tests/input.test.ts
  - tests/padBinds.test.ts
  - tests/keybinds.test.ts
  - tests/animTunePad.test.ts
  - tests/settings.test.ts
  - tests/coopFix.test.ts
  - scripts/e2e-desktop.mjs
  - scripts/e2e-clear.mjs
  - scripts/e2e-sectorops.mjs
  - scripts/e2e-ctcourse.mjs
  - scripts/e2e-coop.mjs
  - scripts/e2e-takedown.mjs
  - scripts/e2e-menus.mjs
  - scripts/e2e-coop-gpu.mjs
  - scripts/e2e-pad.mjs
  - scripts/e2e-mouse.mjs
  - docs/systems/ui.md
  - docs/systems/coop.md
  - docs/systems/input-and-loop.md
  - docs/systems/testing-tools.md
  - TESTING.md
maps: none
protocol: none
save: hq.radar (removed; SAVE_VERSION 9 -> 10)
```
- Wire: no message, field or parser changes (`src/net/protocol.ts` untouched). PR A (slice A1) and PR B (slices B3, B4,
  B5) edit files under `src/net/`, which `scripts/merge-train.mjs` `wirePaths` counts as wire paths: the train bumps
  `PROTOCOL_VERSION` once by itself (RULES "Definition of done"); no manual bump, no test asserts the number. Both PRs
  get two independent Opus checkers (RULES "A job": `src/net` PRs).
- Save: `hq.radar` leaves `HqLevels`; `SAVE_VERSION` 9 -> 10 with a migration and a literal v9 save test (A2). No other
  open branch changes `SAVE_VERSION` (checked 2026-10-25 18:10, 80 newest `origin/feature/*`).
- Overlaps found (2026-10-25 18:10): `origin/feature/mission-engine-flg-gb6` and `origin/feature/tallow-design-docs`
  (Campaign's own engine line) touch `gameState.ts`, `sectorMode.ts`, `coopClient.ts`, `coopHost.ts`;
  `origin/feature/player-docs-j1` touches `docs/systems/input-and-loop.md` in other hunks (row 139 is not in it). Order:
  master lands first (CONFORMANCE 1d item 1); the engine rebase cost is below.
- `node scripts/claims-check.mjs --plan docs/hud-guidance/PLAN.md --name feature/hud-guidance` (18:20): 4 file-level
  overlaps, all in other hunks of shared files, for the orchestrator to order:
  - `feature/guard-rules`: `sectorMode.ts` (helmets at start, ~:951), `coopHost.ts` (`start` deny ~:892),
    `e2e-sectorops.mjs` (S13 block :3583-3660). Ours: `blips()` :1355, B4's new method; A3 / B4 add lines near the
    first match boot.
  - `feature/map-ready`: `gameState.ts`, `courseMode.ts`, `coopHost.ts`, `coopClient.ts`, `e2e-sectorops.mjs`,
    `e2e-ctcourse.mjs`, `TESTING.md` (map load). Ours: blip deletions, one assert per suite, one TESTING line.
  - `feature/player-hygiene` (J6): `gamepadMapping.ts` `mapPad` :136-171 (ours: `GAME_BINDINGS` :63-79 in B2),
    `coopHost.ts` / `coopClient.ts` `teamMates()` (ours: `blips()`, the notice routing).
  - `feature/test-runner-j20`: `e2e-sectorops.mjs`, `e2e-ctcourse.mjs` (S6c alive-at-start). Ours: one assert each.
  Expected conflicts: none or one-line textual ones; whichever lands second fixes them on its branch.

## PR split
- **PR A (J3, `feature/hud-guidance`, ~520 changed lines):** HG1 minimap, HG2 compass and its marks, HG3 every blip
  producer and the `Blip` type, HG4 HQ radar (+ save v10), the test flips, a no-minimap / no-compass check per mode,
  the context menu up to 10.7 % H, `docs/systems/ui.md` and `TESTING.md`. Slices A1, A2, A3.
- **PR B (J3b, `feature/hud-guidance-b`, cut from PR A's head, draft until PR A is released, ~950 changed lines):** HG5
  the popup, HG6 View / O, HG9 the co-op notice off the objective line, Sector Ops M6 the full list in the field menu
  (host and co-op clients), Player R12 the interrogation notes there. Slices B1-B5.
- Changelog: PR A `changes/feature-hud-guidance.md` `kind: patch` (a rule fix, G355). PR B
  `changes/feature-hud-guidance-b.md` `kind: minor` (new player-facing UI: the popup and its button). The train takes
  minor if any member is minor.

## e2e each PR runs
Computed with `selectSuites` / `affectedGateSuites` from `scripts/e2e-affected.mjs` on the claimed file lists (what
`node scripts/run-e2e.mjs --affected origin/master --list` prints on the PR head).
- **PR A gate:** smoke, e2e-anim, e2e-combat, e2e-move (CORE: `src/styles.css` is an unlisted src path), e2e-coop,
  e2e-netmove, e2e-ctcourse (`src/net`, `src/save`), e2e-course, e2e-section-rating, e2e-sectorops, e2e-gadgets,
  e2e-tactics, e2e-takedown, e2e-park (`src/game`), e2e-desktop, e2e-feedback, e2e-menus, e2e-pad (`src/ui`).
  Report only (legacy): e2e-clear, e2e-modes, e2e-missions, e2e-progression; `e2e-clear` must still pass when run (it
  is flipped in A3). GPU: `e2e-desktop:3` (laptop 4189, `E2E_GPU=1`).
- **PR B gate:** smoke, e2e-anim, e2e-combat, e2e-move, e2e-mouse, e2e-pad, e2e-menus (`src/input`), e2e-coop,
  e2e-netmove, e2e-ctcourse (`src/net`), e2e-sectorops, e2e-section-rating, e2e-gadgets, e2e-tactics, e2e-takedown,
  e2e-park, e2e-desktop, e2e-feedback. GPU (look, not gate): `e2e-coop-gpu` still passes (it waits for "Connecting to
  host" to leave the objective; after B3 it never shows there).
- `e2e-coop` + `e2e-netmove` are already in both lists through `src/net` (the RULES checker gate for `src/game` /
  `src/player` is met by the affected run itself).
- PR B's new e2e checks (RULES "Definition of done": a new player-facing system extends the suite that owns its area):
  - `e2e-sectorops:1` (B1): the popup shows on a new objective, is gone ~5 s later with the text kept, O brings it back.
    (B4): the field menu's full list on the host and on the co-op client page.
  - `e2e-pad` (B2): `[8, 'objective']` in the pad verb table; a View tap shows the popup and leaves the goggles alone.
  - `e2e-mouse` (B2): `['KeyO', 'objective']` in the keyboard verb table.
  - All three are already in the PR B gate (`src/input`, `src/game`, `src/ui`).

## Slices
Sizes are changed lines (code + tests), docs not counted. Builders follow RULES "A job" (G302): Opus for engine,
`src/net` and UI logic with state; Sonnet for test flips and data from these strict briefs.

**A1 Remove the minimap, compass and blips (Opus).** HG1-HG3 in `src`: delete the minimap, the compass strip and marks,
every `blips()` producer and consumer, the HQ radar read, the per-frame blip build; move the context menu up.
- Files: `src/ui/hud/minimap.ts` (delete), `src/ui/hud/hud.ts`, `src/ui/hud/wheelLayout.ts` (comment),
  `src/game/gameState.ts`, `src/game/modes/{gameMode,sectorMode,infiltrationMode,missionMode,clearMode,courseMode}.ts`,
  `src/game/pickups.ts`, `src/net/coopHost.ts`, `src/net/coopClient.ts`, `src/styles.css`. Est. 330 lines (nearly all
  deletions). Touches `src/net` (wire path by the train's rule, no message change).
- Checks: `npm run typecheck:fast`; `npx vitest run tests/coopFix.test.ts tests/wheelLayout.test.ts`.
- Done looks like: no `Minimap`, `Blip`, `blips(`, `compass`, `extraBlips`, `enemyBlips` left in `src/` outside
  `src/editor`; tsc clean; a Sector Ops, Marlow Yard, free roam and co-op match draws no minimap or compass.
- Flag: none (rule fix, G355).

**A2 HQ radar out, save v10 (Sonnet).** HG4: drop the `radar` HQ upgrade; `SAVE_VERSION` 10 with a migration.
- Files: `src/progression/suit.ts`, `src/save/schema.ts`, `src/save/migrations.ts`, `src/ui/screens/loadoutScreen.ts`
  (one note line), `tests/economy.test.ts`, `tests/save.test.ts`. Est. 90 lines. Starts from A1's pushed head (A1 removes
  the only `hq.radar` reader, `gameState.ts:3619`).
- Checks: `npm run typecheck:fast`; `npx vitest run tests/economy.test.ts tests/save.test.ts`.
- Done looks like: the legacy HQ page lists Supply drops and Field medic training only; a literal v9 save with
  `hq.radar: 2` loads as v10 with `hq` `{ restock, revive }` and nothing else changed.
- Flag: none.

**A3 Test flips and the no-minimap check per mode (Sonnet).** The tests that assert the old HUD, plus one hard-rule
line per mode suite, the docs.
- Files: `tests/minimap.test.ts` (delete), `scripts/e2e-desktop.mjs`, `scripts/e2e-clear.mjs`,
  `scripts/e2e-sectorops.mjs`, `scripts/e2e-ctcourse.mjs`, `scripts/e2e-coop.mjs`, `docs/systems/ui.md`, `TESTING.md`.
  Est. 60 lines. Parallel with A1 (no shared files).
- Checks: `node --check` on each edited script; the e2e run on the PR head (laptop queue).
- Done looks like: e2e-desktop measures the weapon panel for the 32:9 inset and asserts no minimap / compass; e2e-clear
  has no `blips()` call; Sector Ops, Marlow Yard (co-op), free roam and the co-op client each assert no `.hud-minimap`,
  `.minimap`, `.hud-compass`.
- Flag: none.

**B1 The objective popup and the View / O hook (Opus).** HG5: the always-on line becomes a popup; the `objective`
action and its read in the game loop; a net-status line for B3.
- Files: `src/ui/hud/objectivePopup.ts` (new, Babylon-free), `src/ui/hud/hud.ts`, `src/styles.css`,
  `src/input/actions.ts` (add `'objective'` to `BUTTON_ACTIONS`), `src/game/gameState.ts` (the tap read),
  `tests/objectivePopup.test.ts` (new), `scripts/e2e-sectorops.mjs` (part 1: the popup check). Est. 260 lines.
- Checks: `npm run typecheck:fast`; `npx vitest run tests/objectivePopup.test.ts tests/input.test.ts`; `node --check
  scripts/e2e-sectorops.mjs`; e2e-sectorops:1 on the PR head (laptop queue).
- Done looks like: in Sector Ops the line fades in on each new objective and on a press of `objective`, holds 5 s,
  fades out; its text stays in the DOM (`hud.objectiveText` unchanged); no allocation added to `Hud.update`; a press
  while a menu is open does nothing; e2e-sectorops:1 proves show, fade and O.
- Flag: none (A3).

**B2 Bind View and O (Sonnet).** HG6: the pad verb and the key, the binding table.
- Files: `src/input/padBinds.ts`, `src/input/gamepadMapping.ts`, `src/input/keyBindings.ts`, `tests/input.test.ts`,
  `tests/padBinds.test.ts`, `tests/keybinds.test.ts`, `tests/animTunePad.test.ts`, `tests/settings.test.ts` (the
  `device` alias), `scripts/e2e-pad.mjs`, `scripts/e2e-mouse.mjs`, `docs/systems/input-and-loop.md` (row 139, `:16`
  header comment if it names the device), `docs/systems/testing-tools.md` (`:155`, `:161`). Est. 140 lines. Parallel
  with B1 (B1 owns `actions.ts`; B2 compiles once B1's one-line action lands: branch B2 from B1's first commit, or the
  lead adds the action line first). The e2e-pad View check needs B1's popup: it runs on the PR head.
- Checks: `npm run typecheck:fast`; `npx vitest run tests/input.test.ts tests/padBinds.test.ts tests/keybinds.test.ts
  tests/animTunePad.test.ts tests/settings.test.ts`; `node --check` on both scripts; e2e-pad and e2e-mouse on the PR
  head (laptop queue).
- Done looks like: Settings > Controls lists "Show objective (tap)" on View and on O; no conflict warning on either; a
  stored `device` bind carries over; the binding table test is green; e2e-pad shows a View tap brings the popup up and
  leaves the goggles alone (D-pad left / N keep the goggles); both verb tables carry the new verb;
  `docs/systems/testing-tools.md` no longer says View toggles the goggles.

**B3 Co-op notice off the objective line (Opus, `src/net`).** HG9: "Connecting to host…" / "Waiting for host…" go to
the net-status line; the objective line only ever holds the host's objective.
- Files: `src/net/objectiveMirror.ts`, `src/net/coopClient.ts` (`:102`, `:254`, `:504-507`, `:1072-1075`),
  `tests/coopFix.test.ts`, `scripts/e2e-coop.mjs` (`:224-225`, `:1848-1850`), `scripts/e2e-ctcourse.mjs` (`:324-325`).
  Est. 80 lines. After B1 (uses `Hud.setNetStatus` / `netStatusText`).
- Checks: `npm run typecheck:fast`; `npx vitest run tests/coopFix.test.ts`; e2e-coop, e2e-ctcourse, e2e-netmove.
- Done looks like: a joining client shows the notice on its own line until the first snapshot, then the host's
  objective pops up; a stalled host shows "Waiting for host…" on that line while the objective keeps its text.

**B4 Sector Ops full list in the field menu (Opus, `src/net`).** M6 / HG8 (master part): Field Terminal > Objectives
lists every section's objective and exit, done / current / to do, for every player: solo, the host and each co-op
client (G343 "the menu keeps the full list"; Sector Ops is 1-4 players, G308).
- Files: `src/game/sectorObjectives.ts` (new, pure, Babylon-free: the row builder and the client's list mirror),
  `src/game/modes/gameMode.ts` (optional `objectiveLines?(): ObjectiveLine[] | null`), `src/game/modes/sectorMode.ts`,
  `src/game/gameState.ts` (`NetAttachment` `:176` gets `objectiveLines?(): ObjectiveLine[] | null`; `objectiveLines`
  `:1243` asks the mode, then the net attachment), `src/net/coopClient.ts` (feeds the mirror from `msg.ls` `:988-995` and the host's objective
  text), `src/ui/screens/pauseScreen.ts` (comment `:11` cites G343), `tests/sectorObjectives.test.ts` (new),
  `scripts/e2e-sectorops.mjs` (part 1: host and client list checks), `docs/systems/testing-tools.md` (the
  e2e-sectorops line `:235`). Est. 210 lines. After B1 and B3 (shares `gameState.ts` with B1 and the client's objective
  write with B3): merge order B1 -> B3 -> B4.
- The hook is the merge point with the mission engine (J7 PR F, R6; "Engine rebase cost" below): B4 writes the three
  declarations exactly as the strict brief B4 gives them (the same text is in the engine's J7 PLAN section 7, so the
  two branches add identical hunks), and puts `SectorMode.objectiveLines()` and `CoopClient.objectiveLines()`
  immediately above each class's `dispose()`. B4 lands on this branch before J7's R6 starts, or R6 builds against
  these names as this branch writes them.
- Checks: `npm run typecheck:fast`; `npx vitest run tests/sectorObjectives.test.ts tests/coopFix.test.ts`; `node --check
  scripts/e2e-sectorops.mjs`; e2e-sectorops:1, e2e-coop on the PR head. Two independent Opus checkers (`src/net`).
- Done looks like: in section 2 the list shows section 1's objective and exit Done, section 2's objective Current, the
  rest To do, on the host page and on the client page alike (A8); no wire change (`protocol.ts` untouched).

**B5 Interrogation notes in the field menu (Opus, `src/net`).** R12: a Notes row lists this match's interrogation lines.
- Files: `src/game/fieldNotes.ts` (new, pure: capped list, dedupe), `src/game/gameState.ts` (subscribe to `intel`; hand
  notes to the pause menu), `src/ui/screens/pauseScreen.ts` (Notes row + read-only screen), `src/net/coopClient.ts`
  (`case 'feed'` `:861-865` adds the text), `tests/fieldNotes.test.ts` (new), `scripts/e2e-takedown.mjs` or
  `scripts/e2e-sectorops.mjs` (one check after an existing interrogation; add the file to the claims when picked).
  Picked: `e2e-takedown` `grab-interrogate-intel` (the real interrogation, solo: Pause > Notes lists its lines); neither
  suite interrogates on a client, so `e2e-coop`'s intel relay (`:985`) asserts the notes on host and client, and
  `e2e-menus` gets the new pause row list and "No notes yet". Est. 220 lines. After B1 and B4 (shares `gameState.ts`, `pauseScreen.ts`).
- Checks: `npm run typecheck:fast`; `npx vitest run tests/fieldNotes.test.ts`; e2e-coop (client notes), the suite
  picked.
- Done looks like: after an interrogation, Field Terminal > Notes lists its lines on both screens; a new match starts
  empty (A9).

PR B total ~900-1000 lines. If it passes ~1.4k after B4, B5 moves to its own PR C on `feature/hud-guidance-c`.

## Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| none | - | Night Shift \| Campaign Build | - | Both PRs are rule fixes, allowed at the cap (G355); the popup ships on (A3) |

## Acceptance lines
- PR A: in Sector Ops (Saltmarsh Park), Marlow Yard (co-op) and free roam there is no minimap, compass or objective /
  partner / enemy dot anywhere on screen; the context menu sits at CT's spot (top right, about a tenth down); the legacy
  HQ page has no radar; an old save loads. The world pings, the partner's goggle colour and the Marlow drill pointer
  are still there.
- PR B: each new objective fades in at the top for about 5 s, then fades; a tap of View (pad) or O (keyboard) brings it
  back for about 5 s; holding does nothing more; the goggles stay on D-pad left / N; Field Terminal > Objectives shows
  the whole list in Sector Ops for every player, co-op clients too; Field
  Terminal > Notes shows what guards told you; a joining co-op player sees "Connecting to host…" on its own small line,
  never as the objective.

## Walk items
- Play > Sector Ops > Saltmarsh Park: no minimap, compass or dots; each new objective fades in for about 5 s; View / O
  shows it again - accept when it reads well and never stays stuck on.
- Play > Co-op > Marlow Yard (two tabs): no minimap or partner dot; the drill pointer still shows - accept when nothing
  else marks the way.
- Pause > Field Terminal > Objectives / Notes in Sector Ops (solo, then two tabs): the full list on both tabs, and the
  lines from an interrogation - accept when both are readable by pad.

## Engine rebase cost (HG3, master first)
- `origin/feature/mission-engine` @00b6cde9 and `mission-engine-flg-gb6` @302b70af8 edit `sectorMode.ts` `blips()`
  (the mission gate, hunk at :1353 -> :1389) and add imports near `:72`: after PR A lands the engine deletes its
  `blips()` and the `Blip` import (one conflict, ~15 min). `coopHost.ts` / `coopClient.ts` engine hunks do not touch the
  ally `blips()` methods (no conflict expected; recheck at the rebase). `gameState.ts` engine hunks are the `TeamKind`
  rename at :70 / :200 (no overlap).
- After PR B the engine's HG7 work feeds `Hud.setObjective` (its viewer's current row) and calls nothing new for the
  tap (B1's read covers every mode); its always-on `missionHud` goes and its rows go to the field menu through the B4
  hook. That is J7's work (engine J7 PLAN on `feature/mission-engine`, `docs/missions/slices/J7-PLAN.md` section 7,
  slice R6 in its PR F):
  - **B4's hook is the merge point.** J7 adds the mission's lines only through `GameMode.objectiveLines` (host:
    `SectorMode.objectiveLines()`) and `NetAttachment.objectiveLines` (client: `CoopClient.objectiveLines()`), with B4's
    exact declarations; it never names a `missionLines()` and never edits `GameState.objectiveLines()` its own way. In
    both methods the mission branch comes first, then B4's Sector Ops rows, so a mission run shows mission rows, never
    sector rows (HG8). When PR B and the engine's PR C meet on master, the declarations are identical hunks; the two
    method bodies (both written immediately above `dispose()`) are joined by hand as "mission lines while a mission
    runs, else B4's rows".
  - **J7 adds `Hud.setObjectiveHint(text: string | null)`** (a small line right after the objective, class
    `hud-objective hud-objective-hint`, created on first use, so this job's `:144` / `:159` edits are untouched) and
    **the rules-line and hint rows of Field Terminal > Objectives** (`ObjectiveLine` gains `note?: true` and `hint?:
    string` after `current`; `ObjectivesScreen` shows a note row with the counter "Rule" and adds the hint to the row's
    desc). This job adds neither. B4 edits only the `:11` comment of `pauseScreen.ts` and B5 adds the Notes row further
    down: separate hunks. At the PR B / PR C merge the hint fades with the popup by one line beside B1's visibility
    toggle in `Hud.frame` (`this.objHint?.classList.toggle('show', vis)`); without it the hint stays hidden under
    B1's `.hud-objective` CSS, never stuck on.
  - **Order.** B4 lands on `feature/hud-guidance-b` before J7's R6 starts, or R6 builds against B4's names as written
    in the strict brief B4 here. If B4's code has to differ from that text, B4's code wins and the Campaign Build lead
    fixes R6 to match before PR F's checkers.
- The engine adds its own no-minimap line to `e2e-sectorops-mission.mjs` when it lands (A13).

## Strict slice briefs (first three)
Each brief is self-contained. Prepend `docs/systems/agent-preamble.md` with job `hud-guidance`, worktree
`C:/NightShift/Mobile-Coop-hud-guidance` (or the slice worktree the lead names), and the branch.

### Brief A1: remove the minimap, compass and blips (Opus 5.5)
Branch `feature/hud-guidance-a1` (worktree `C:/NightShift/Mobile-Coop-hud-guidance-a1`, from `feature/hud-guidance`).
Rules: G339 (no minimap, compass or objective blip in any mode), G135 (no live partner position), G355 (a rule fix, no
flag), CLAUDE.md hot-path rule. Do not touch the Marlow drill marker (`courseMode.ts:86-99`, `src/ui/hud/pings.ts`,
`settings.courseMarkers`: Michael "Keep as built"), world pings (`hud.pings`), or anything in `src/editor/`.
1. `src/ui/hud/minimap.ts`: delete the file.
2. `src/ui/hud/hud.ts`: delete the `Minimap` import (:5); `HudFrame.yaw` and `HudFrame.markers` with their comments
   (:32-35); `COMPASS_PX_PER_RAD` (:38); fields `compassStrip`, `compassMarks` (:57-58) and `minimapSlot` (:86); the
   compass build (:131-143, the `ticks` / `labels` loop and the three elements); `minimapSlot` creation (:152); in the
   `.hud-top` children drop `compass` (:159) and drop `this.minimapSlot` from the root list (:160); `setMinimap`
   (:175-177); the compass scroll and markers block in `update` (:257-271). Reword the `setRoom` comment (:306) to
   "Room tag at the top (close-quarters maps)". Keep `.hud-top`, `roomEl`, `objective`, `modeInfo`.
3. `src/ui/hud/wheelLayout.ts:10`: comment to "(the top HUD: area label, objective)".
4. `src/game/gameState.ts`: delete the `Minimap, type Blip` import (:31); `blips?(): Blip[];` in `NetAttachment`
   (:260); `readonly minimap: Minimap;` (:352); `extraBlips` and its comment (:399-400); `new Minimap` and
   `hud.setMinimap` (:639-640); the `extraBlips` assignments (:750 and the block :766-768); `enemyBlips` and its comment
   (:2139-2140); in the HUD frame drop `yaw` and `markers` (:3613-3614); delete the blip build through the objective
   bearings (:3616-3635), `const p = ...renderPos` (:3638) and `this.minimap.draw(...)` (:3639). Keep
   `this.hud.update(f)` and `this.updateCoverHud()`. Remove imports this leaves unused (tsc `noUnusedLocals`), but check
   `ClearMode`, `InfiltrationMode`, `SectorMode`, `hyp2` are still used elsewhere before removing any.
5. `src/game/modes/gameMode.ts`: delete the `Blip` import (:5) and `blips(): Blip[];` (:106).
6. Delete each `blips()` method and its `Blip` import: `sectorMode.ts` (:9, :1355-1359), `infiltrationMode.ts` (:7,
   :299-303), `missionMode.ts` (:8, :156-160), `clearMode.ts` (:6, :221-223), `courseMode.ts` (:6, :1122-1124; leave
   `drawMarker` and the course HUD alone).
7. `src/game/pickups.ts:96-98`: delete `blips()`.
8. `src/net/coopHost.ts`: delete the `Blip` import (:7) and `blips()` (:1943-1949). `src/net/coopClient.ts`: delete the
   `Blip` import (:4) and `blips()` (:1320-1324). No other `src/net` change; `protocol.ts` untouched.
9. `src/styles.css`: delete `.hud-compass` through `.compass-caret` (:956-1006) and `.hud-minimap` / `.minimap`
   (:1045-1055); delete the `.hud > .hud-minimap,` line (:2341) and `:root .hud > .hud-minimap,` (:3292); `.hud-ctx`
   `top` (:1291) becomes `calc(10.7 * var(--vh))` and the comment (:1280) drops "(pushed under the minimap when it would
   overlap)"; the `.debug-overlay.compact` comment (:207) drops "the compass and".
10. `grep -rn -i "minimap\|blip\|compass" src --include=*.ts | grep -v src/editor` must leave only the comments named in
    BRIEF A12, the Kestrel map compass-letter comments and unrelated words (sfx "blip", menuShots "blips"). Commit:
    `hud-guidance A1: remove the minimap, compass and blips (G339, G135)` and push.
- Tests: `npm run typecheck:fast`; `npx vitest run tests/coopFix.test.ts tests/wheelLayout.test.ts`. Do not run e2e (the PR head runs them; A3 flips the e2e that read the minimap).
- Done: tsc clean, the grep above clean, net diff about -330 lines, report the final line counts and any line number
  that moved.

### Brief A2: HQ radar out, save v10 (Sonnet 5.5)
Branch `feature/hud-guidance-a2` from A1's pushed head (worktree `C:/NightShift/Mobile-Coop-hud-guidance-a2`). Rules:
G339 (the radar only fed the minimap), RULES "Definition of done" (a save-shape change bumps `SAVE_VERSION` with a
migration and a test using a literal old save).
1. `src/progression/suit.ts`: `HqId = 'restock' | 'revive'`; `HQ_IDS = ['restock', 'revive']`; delete the `radar` row
   of `HQ` (:115); `defaultHq` returns `{ restock: 0, revive: 0 }` (:123); delete `radar: number;` from `HqStats` (:127)
   and the `radar:` line of `hqStats` (:135).
2. `src/save/schema.ts:11`: `SAVE_VERSION = 10`. The sanitiser loop (:167-169) needs no change.
3. `src/save/migrations.ts`: add step `9: (s) => ...` after step 8, with the comment "v9 -> v10: the minimap is gone
   (G339): HQ loses the Minimap radar (spent credits are not refunded)": copy `s.hq` without `radar` (the
   `const { radar: _r, ...rest } = hq` pattern of step 7, :126-130), return `{ ...s, version: 10, hq }`. Follow the
   file's existing step shape exactly (how step 8 returns and is keyed).
4. `src/ui/screens/loadoutScreen.ts:502`: the HQ note becomes `'Supply drops and field medic training.'`.
5. `tests/economy.test.ts`: :75-80 re-point the `canBuyHq` / max / `hqStats` checks to `revive` (prices [800, 1600],
   levels [2, 6]: level 1 player blocked by level, level 10 buys, level 2 maxed, `hqStats` `reviveSpeed` 1.6 and
   `restock`); :131-134 the sanitiser case uses `hq: { revive: 7, radar: 7 }` and expects `bad.hq.revive` 2 and
   `'radar' in bad.hq` false.
6. `tests/save.test.ts`: :238 and :241 now expect `{ restock: 0, revive: 0 }` (v7 saves run through step 9 too); check
   the literal at :130 for any equality assertion on `hq` and update it the same way. Add
   `describe('v9 -> v10')`: a literal v9 save (`{ ...defaultSave(), version: 9, hq: { radar: 2, restock: 1, revive: 1 } }`
   with `profile.credits` set) migrates with `from` 9, `steps` 1, `data.hq` `{ restock: 1, revive: 1 }`, credits
   unchanged, and `sanitizeSave(data).hq` equal to the same.
7. Grep `scripts/` for `radar` (none expected; `e2e-progression` buys `hq-restock` only).
- Tests: `npm run typecheck:fast`; `npx vitest run tests/economy.test.ts tests/save.test.ts`.
- Done: both files green, tsc clean; commit `hud-guidance A2: HQ radar out, save v10 (G339)`; push.

### Brief A3: test flips and the no-minimap check per mode (Sonnet 5.5)
Branch `feature/hud-guidance-a3` from `feature/hud-guidance` (worktree `C:/NightShift/Mobile-Coop-hud-guidance-a3`),
parallel with A1. Rules: G339 (VISION rule 5 had no assertion: Test Runner T2), RULES "Test tiers". The check, used
verbatim in each suite through that suite's page-eval helper:
`!document.querySelector('.hud-minimap, .minimap, .hud-compass')` with the message
`no minimap or compass (G339)`.
1. `tests/minimap.test.ts`: delete (it tests a copied matrix of the deleted minimap).
2. `scripts/e2e-desktop.mjs:274-286`: in the eval drop `mm` (:280) and return `wp: document.querySelector('.hud-weapon')
   .getBoundingClientRect().right` and `nomap:` the check; the 32:9 assert (:286) becomes
   `v.inset === 640 && v.vit >= 640 && v.wp <= v.W - 640 + 1` with message "... weapon panel right ..."; add
   `assert(v.nomap, 'no minimap or compass (G339)')` for every aspect (outside the `if`). This is the free roam check.
3. `scripts/e2e-clear.mjs`: delete `blips:` (:80) and the `s0.blips` assert (:91); add `nomap:` the check to `s0` and
   `assert(s0.nomap, 'no minimap or compass (G339)')`. Update the header comment (:2) "objective or enemy blips" to
   "objective, minimap or compass".
4. `scripts/e2e-sectorops.mjs`: once, right after the first warehouseOps match boots (the first wait on
   `PARAMS` near :10), assert the check. Pick the earliest point where the HUD exists; do not add a new match load.
5. `scripts/e2e-ctcourse.mjs`: after both tabs are in the course (the host and the joiner, near the existing
   "connecting label gone" check :318-325), assert the check on both pages (Marlow Yard).
6. `scripts/e2e-coop.mjs`: next to `connecting label gone once in game` (:224-225), assert the check on the client
   page (the old partner dot lived on the minimap).
7. `docs/systems/ui.md`: line 22 drop "(as built it is pushed under the minimap where they would overlap; the minimap
   goes, below)"; replace the "Decided, not built yet (G339)" bullet (:35-37) with "Built (G339, hud-guidance PR A): no
   minimap, compass or blip in any mode; the Marlow drill marker and world pings stay (G292, G135)." Keep the popup
   bullet (:32-34) for PR B.
8. `TESTING.md`: add one checklist line in the HUD / desktop part: "No minimap, compass or objective dots in Sector Ops,
   Marlow Yard (co-op) or free roam; the Marlow drill pointer and pings still show."
- Tests: `node --check` on each edited `.mjs`. e2e runs on the PR head (laptop queue); do not run e2e locally.
- Done: commit `hud-guidance A3: e2e flips and a no-minimap check per mode (G339)`; push; report the exact line numbers
  where each check went.

## Brief outlines (PR B, strict briefs written before each starts)
- **B1 (Opus).** `objectivePopup.ts`: `export const OBJECTIVE_POPUP = { holdS: 5, fadeS: 0.4 }` (G343 "~5 s", starting
  values G356) and `class ObjectivePopup { show(nowS) ; hide() ; visible(nowS): boolean }` holding one number (no
  allocation). `Hud`: `setObjective(text)` on a real change calls `popup.show(now)` when the text is non-empty and
  `hide()` when empty (A4); `showObjective()` shows the current non-empty line; `update(f)` toggles `.show` on the
  objective element only when `visible` flips (a field compare, no `this.set` closure); add `.hud-net-status` with
  `setNetStatus(text)` / `get netStatusText()`. CSS: `.hud-objective` opacity 0 with `transition: opacity
  var(--obj-fade)`, `.hud-objective.show` opacity 1; `.hud-net-status` small, under the objective, `:empty` hidden.
  `actions.ts`: `'objective'` with the doc comment "(G343) View / Select tap or O: show the current objective ~5 s".
  `gameState.fixedUpdate` after the pause read (:1834-1838): `if (!this.paused && !this.menuOpen &&
  realIn.pressed('objective')) this.hud.showObjective();` (every mode, solo and both co-op sides; in co-op the sim runs
  under the field menu, so without the guard a press there would pop the line up behind the menu). vitest: show on
  update, on tap, re-tap restarts the hold, hidden after `holdS`, empty line never shows.
  e2e `scripts/e2e-sectorops.mjs`, part 1 (`if (want(1))` `:56`, the first `run` `:58`; it must run under
  `--part=1`): once, when section 1's objective is done and the exit label replaces it (the loop `:73-113`), assert
  `.hud-objective.show` is on within 1 s; wait real time (`page.waitForFunction`, up to 8 s, not `sim`: the popup reads
  `performance.now()`) for `.show` off, with `hud.objectiveText` unchanged and non-empty; press O (key down, a step,
  key up) and assert `.show` on again within 1 s. Read the class after a step so `Hud.update` has run. Messages cite
  G343. Section 1 only (each wait costs real seconds).
- **B2 (Sonnet).** `padBinds.ts`: id `device` -> `objective`, label "Show objective (tap)", `actions: ['objective']`,
  default `PAD.SELECT`; header comment "View show objective (tap)"; `sanitizePadBinds` reads `r.objective ?? r.device`
  for the new id (A6). `gamepadMapping.ts`: `[PAD.SELECT, 'objective']` in `GAME_BINDINGS`, comment updated.
  `keyBindings.ts`: `BindId` + `{ id: 'objective', label: 'Show objective (tap)', actions: ['objective'], defaults:
  ['KeyO'] }` before `pause`. Doc row 139: "Show objective | `objective` | View (tap) | Create / Minus | `objective` (O) |
  G343, G351: shows the current objective, what and where, for about 5 s; held does nothing more (G24)". Tests: the
  table test, `KeyO` / View raise no conflict, and in `animTunePad.test.ts` a View press the tuner consumes does not
  reach the game actions. The `device` alias test goes in `tests/settings.test.ts`, whose old pad saves at `:165` and
  `:193` store `device: [8]`: assert the loaded binds have `objective: [8]` and no `device`.
  The binding (G343): View tap = show the objective; the goggles stay on D-pad left (`[PAD.LEFT, 'vision']`
  `gamepadMapping.ts:79`) and N; View held does nothing (G24). Only docs disagree: `docs/systems/testing-tools.md:155`
  "View tap goggles / View held leaves the goggles untouched" becomes "D-pad left toggles the goggles; View tap shows
  the objective and leaves the goggles untouched (G343)"; `:161` (e2e-mouse) adds "O raises the objective verb".
  e2e: `scripts/e2e-pad.mjs` `PADV` (`:657`) gets `[8, 'objective']`; after the D-pad left goggles check (`:278`, the
  warehouse sandbox match: its line is the free roam one, `gameState.ts:853`; if `hud.objectiveText` is empty, set one
  with `hud.setObjective`), wait real time (up to 8 s) for `.hud-objective.show` off, tap View (`__pad.set(8, 1)`, ~150 ms, `set(8, 0)`), then assert
  `.show` on within 1 s and `vision.mode` unchanged: "View tap shows the objective, goggles untouched (G343)".
  `scripts/e2e-mouse.mjs` `KBM` (`:171-175`) gets `['KeyO', 'objective']`.
  Doc lint: any new docs line that names the minimap, compass or blips keeps a "no" / "removed" word beside it
  (`docs/stale-terms.json` `allowLine`), or `tests/docLint.test.ts` fails.
- **B3 (Opus, `src/net`).** `objectiveMirror.ts`: `export function isNetNotice(t: string): boolean` (the two notices).
  `coopClient.ts`: keep `private obj = OBJ_CONNECTING;` (coopFix.test.ts:80 reads it); every display write goes through
  one private method: a notice -> `hud.setNetStatus(t)`; a host objective -> `hud.setNetStatus('')` then
  `hud.setObjective(t)`. e2e: the "connecting label gone" checks also assert `hud.netStatusText === ''`.
- **B4 (Opus, `src/net`).** `src/game/sectorObjectives.ts` (pure; type imports `SectorDef`, `SectorPhase`,
  `ObjectiveLine`; `exitZone` from `sectors.ts:539`):
  - `sectorObjectiveLines(defs, index, phase)`: two rows per section (the objective label, then `exitZone(def).label`);
    `phase` `'objective'` makes the objective row Current, `'connector'` / `'extract'` the exit row, `'done'` marks every
    row Done; rows before Current are Done, after it To do. `SectorMode.objectiveLines()` calls it with `run.index`,
    `run.phase`.
  - `class SectorListMirror` (the client; four fields, no wire change): `live = -1`; `sawObj`, `exit`, `done` false.
    - `onLive(ls)`: from `msg.ls` beside `ct.setLive` (`coopClient.ts:995`). `ls < 0` (between a connector's unload and
      load) is ignored; a new `ls` sets `live`, clears `sawObj`, `exit` and `done`. `msg.ls` is the host's `ct.liveSection`
      (`sectorMode.ts:1347`), set in `loadSection` (`:678-684`).
    - `onText(t)`: only the host's objective text (B3's display method; never a notice). Strip a trailing ` NN%` (the
      download, `sectorMode.ts:1292`). `t` = the live section's objective label: `sawObj = true`, `exit = false` (this
      also covers a checkpoint restart from the exit step). Else `t` = its exit label and `sawObj`: `exit = true`.
      Else `t === ''` while `exit` on the last section: `done = true` (the op ended, `sectorMode.ts:1002`). Anything
      else: no change.
    - `lines(defs)`: `null` while `live < 0` or `defs` is empty (GameState then shows today's line); else
      `sectorObjectiveLines(defs, live, done ? 'done' : exit ? 'connector' : 'objective')`.
    - Why `sawObj`: from the connector's load to its far door (`sectorMode.ts:854-866`) `ls` is already the next section
      while the host's line still names the old exit; two sections can share an exit label, so the exit row only goes
      Current after the new section's objective has been seen. In that few-second window the new section's objective
      row is Current, which is right enough (the section is loaded).
  - `coopClient.ts`: in Sector Ops (`g.opts.mode === 'sector'`, `:188`) one `SectorListMirror`; `onText` from the one
    host-objective write B3 adds; `objectiveLines()` on the attachment returns
    `this.list?.lines(this.g.world.map.sectors ?? []) ?? null`. Order rule: the section number (`sector` message, every 0.5 s or on change) and the host objective (snapshot,
    applied only on change) arrive in either order, so the mirror keeps the last host objective it saw and re-applies
    it whenever a new section number arrives (keeping the guard for two sections that share an exit label); a late join
    or rejoin past section 1 then lands on the right row.
  - `GameState.objectiveLines()`: `this.mode?.objectiveLines?.()`, then `this.net?.objectiveLines?.()` when non-null,
    then the Infiltration chain, then the current line. Pause menu only, not a hot path.
  - The hook's exact text (the engine's J7 R6 adds the same lines, so the hunks are identical; change them only with
    the Campaign Build lead):
    - `gameMode.ts`, after `import type { SlotPoint } from '../spawnSlots';` (:7):
      `import type { ObjectiveLine } from '../../ui/screens/pauseScreen';`; in `GameMode`, after
      `restartCheckpoint?(): boolean;` (:97):
      `/** (hud-guidance B4, G343 / HG8) Field Terminal > Objectives rows; null: none here (GameState asks the net layer). */`
      `objectiveLines?(): ObjectiveLine[] | null;`
    - `gameState.ts` `NetAttachment`, after `onEnd?(won: boolean, subtitle: string): void;` (:188):
      `/** (hud-guidance B4, HG8) Client: Field Terminal > Objectives rows; null: none (GameState shows its own). */`
      `objectiveLines?(): ObjectiveLine[] | null;`
    - `GameState.objectiveLines()` (:1243), its first two lines:
      `const own = this.mode?.objectiveLines?.() ?? this.net?.objectiveLines?.();` `if (own) return own;`, then
      today's branches unchanged.
    - `SectorMode.objectiveLines()` and `CoopClient.objectiveLines()` sit immediately above each class's `dispose()`
      (sectorMode.ts:1393, coopClient.ts:1319), so the engine's mission branch meets them as a visible conflict, never
      a silent second method; the joined body is "mission lines while a mission runs, else these rows".
  - vitest `tests/sectorObjectives.test.ts`: host rows per phase; client late join at section 2; the connector window
    with two sections sharing an exit label (no false exit row); the download percent; a restart from the exit step;
    `ls` -1 ignored; the op end (all Done); no sector data -> `null`; the objective arriving before the first section
    number in section 1; a late join during section 2's exit step (lands on the exit row).
  - e2e `scripts/e2e-sectorops.mjs` part 1, the co-op block "co-op client mirrors the live section" (`:751-`): after the
    connector (section 2 live on the client), `window.__app.current.objectiveLines()` on the client page lists section
    1's objective and exit Done and section 2's objective Current, and matches the host page's labels and states.
  - `docs/systems/testing-tools.md:235` (e2e-sectorops) adds "the objective popup (shows on a new objective, gone after
    ~5 s, O brings it back) and the field menu's full list on host and client".
- **B5 (Opus, `src/net`).** `FieldNotes` (cap 24 lines, a repeat line kept once); `GameState.notes`, filled from the
  `intel` event (solo / host) and from `case 'feed'` on the client; `PauseOpts.notes?: () => readonly string[]` and a
  "Notes" row after Objectives with a read-only screen ("No notes yet" when empty).

## Risks and open questions
- Popup timing reads `performance.now()` (wall clock, like the ammo fade); the B1 and B2 e2e checks wait up to 8 s
  real time for the fade. Suites that fast-forward with `sim()` assert `.show` on and wait for it off by real time.
- `.hud-top` gets shorter without the compass; the gadget wheel measures it (`gadgetWheel.ts:107`, `:200-201`). e2e-pad
  covers the wheel; a moved wheel is expected and fine.
- Sector Ops section start shows the banner (2.6 s, objective as its subtitle) and the popup together: polish list.
- Two of the three Sector Ops lines without "where" (HG10) are on the old warehouse, frozen by Q26; J5 lists Marlow and
  campus only, so those two popups may never name a place: flagged to the orchestrator.
- The HUD frame object is still built per frame (`gameState.ts:3597`); PR A removes the per-frame blip arrays, spreads
  and the compass `forEach` closure, but the frame literal is J6 hygiene.

## Polish list (plan check 2026-10-25, not blocking)
A1 / A3 are already being built from their briefs, so these go to their checkers and the PR A fix round, not the briefs.
- A3, `e2e-desktop`: `.hud-weapon` may be hidden or zero-width when holstered, so `wp <= W - 640 + 1` can pass
  trivially. Also assert `wp > inset`, or measure `.hud-vitals` and `.hud-weapon` together.
- A1: `Grenades.positions()` (`grenades.ts:80`) has no caller after A1 (its only user was `gameState.ts:3631`). Delete it
  (one more file in the claims).
- A4: the download percent keeps the popup on while it climbs, unlike CONFORMANCE HG9's strip-the-suffix idea. A
  starting value; the walk line "never stays stuck on" judges it.
- The section-start banner and the popup together (Risks above).
- e2e-sectorops runs on warehouseOps, not Saltmarsh Park: fine, the HUD is shared; the walk item covers Saltmarsh.
