# ED3-pad1 - Michael's pad notes on the editor screen: overlaps, hint bar, quick walk L3, plain words
Model: Opus, medium effort.
Decisions: 8

Start message: `Run docs/kestrel/prompts/ED3-pad1.md`. Michael's first pad test (2026-10-12, iPhone landscape with a
controller, screenshot in the planner chat). One small session; runs before ED3-3a. The ED2 "Every part" rules
(`docs/kestrel/prompts/ED2-editor-v2.md` lines 26-68) still apply. Do not start ED3-3a.

## 0. Start
1. `git checkout feature/kestrel && git pull`. Confirm the branch and a clean tree.
2. Preconditions (stop and report if one fails): `timeout 300 npm run e2e:editor` passes (71 ok);
   `grep -n "Quick walk (L3" src/editor/main.ts` shows the walk note.
3. Print a plan of at most 8 lines.

## 1. Read (only these; files over 200 lines by line range or grep)
- `CLAUDE.md` hard rules; `docs/kestrel/RULES.md` sections 9-10; `docs/kestrel/editor.md` lines 85-180.
- `editor.html` lines 90-210 (pad screen CSS: `#hint` 102-104 and 153, `#toolBar` / `#selCard` 131-141, the narrow
  screen block about 165-183 with `#hint ... max-height: 3.2em` at 175, the markup).
- `src/editor/actions.ts` (all; `hintItems` line 172). `src/editor/ops.ts` lines 27-80 (`label`, wall change words).
- `src/editor/padControl.ts` lines 356-368 (`walkFrame`), 690-740 (tool bar, selection card), 800-820 (dot words),
  983-1005 (status strip). `src/editor/main.ts` lines 845-895 (quick walk), 1460-1480 (hint notes).
- `src/editor/controls.ts` lines 15-25 and 170-200 (walk speeds), `src/editor/hub.ts` lines 80-90 (Play rows).
- `src/input/gamepadMapping.ts` lines 50-60 (the game: L3 is sprint, B crouch).
- `scripts/e2e-editor.mjs`: grep for the quick walk and pad-screen steps.

## 2. What Michael saw
1. The selection card (bottom right) covers the right end of the tool bar ("Measure" cut off).
2. The hint bar wraps onto a second line and is cut off ("clear the"); it repeats long descriptions.
3. Quick walk: the note "Quick walk (L3, B or Shift+Tab goes back)" reads as "L3 to move quick", but L3 ends the walk.
   In the game L3 is sprint, so his thumb expects L3 to run.
4. The card says "interior wall (WG-NEW4, Ground)" and then "interior wall" again; the status strip says "Tool select"
   in lower case; the tool bar shows "door" under Door.
5. The change line "Moved its end 10.5 m north; moved its start 10.5 m south; now 10.5 m long" for a wall whose length
   did not change (a turn about its middle reads as two moves).

### Decisions
| # | Decision |
| --- | --- |
| 1 | **Quick walk on the pad**: L3 toggles run (the walk's existing RUN speed; crouched stays slow), as the game's sprint; B is the only pad way back. Shift+Tab still toggles the walk from the keyboard. The note reads "Quick walk - left stick walk, L3 run, B back". Hub Play row note and editor.md follow ("B comes back"). |
| 2 | **No overlaps**: the tool bar, selection card, status strip, dot words and hint bar never overlap at any window size from 1024 x 600 up and at iPhone landscape (932 x 430 CSS px). The card sits bottom right; the tool bar centres in the width left of the card when the card shows (or the card rises above the tool bar where that width is too small). Slots may shrink to their names; no slot name is cut. |
| 3 | **Hint bar on one line**: at most 5 prompts, each "button + one or two words" ("A Move", "RB Go to", "RB hold Selection wheel", "B Back", "Y hold Build"), current state only. Long descriptions stay in the Help tab and the wheels. Add a short `hint` word field to the action map entries the pad hint uses (`actions.ts`); `hintItems` uses it. Never wraps, never clipped (remove the narrow screen's `white-space: normal; max-height`). |
| 4 | **Selection card words**: first line the element in plain words, capitalised: its name if it has one, else its kind ("Interior wall"), then its id small and grey; no repeated kind line. Then size, then level. `label` (ops.ts 27) capitalises the kind and keeps the id in brackets for text lines (change list, status line). |
| 5 | **Strip and tool bar words**: the status strip shows the tool by its tool bar name ("Tool Select"); under Door the tool bar shows the door type's plain name from the Build wheel's door names ("Single", "Double", "Fire door"), never the raw type. |
| 6 | **Wall change words**: when a wall's length is unchanged and its direction changed, say "turned 90 degrees" (or "turned N degrees"), plus "and moved <words>" if its middle moved. "now N m long" only when the length changed. Vitest in `tests/editor/` for move, stretch, turn, turn and move. |
| 7 | **Dot words**: the readout separates its parts: "x 20, z 18.5 - On wall - A: Move". |
| 8 | **Tests**: e2e:editor gains: at 1280 x 720, 1024 x 600 and 932 x 430, with a wall selected and every tool on the bar, the bounding boxes of the tool bar, card, strip, dot words and hint bar do not intersect, and the hint bar is one line high with no text cut (scrollWidth <= clientWidth); quick walk: L3 changes speed and keeps walking, B ends it. Every existing step still passes. |

## 3. Out of scope
Anything in ED3-3a or later. No game code changes. No change to the save format.

## 4. Checks
1. `timeout 300 npm run lint`, `timeout 600 npm test` (only the known kestrelMap failure allowed: the old B0 copy of
   the block plan, refreshed only by the B0 rerun), `timeout 600 npm run build`; `dist/` has 0 hits for `padControl`.
2. `timeout 300 npm run e2e:editor` (with the new steps). Report the pass count. `git status --porcelain docs/kestrel`
   is empty after it.
3. Browser screenshots (`.claude/launch.json` server `editor`, fake pad as in the e2e): a wall selected at 932 x 430
   and at 1280 x 720 (card, tool bar and hint bar all readable, nothing covered); the quick walk note. View each once.
   Reset viewport emulation.

## 5. End (RULES 9)
1. Fix failures, at most two rounds; then BLOCKED per RULES 7 if still failing.
2. `docs/kestrel/editor.md` updated (quick walk buttons, screen rules); one log entry in `docs/kestrel/progress.md`
   (at most 6 lines); one line in `docs/kestrel/lessons.md`.
3. Commit `kestrel ED3-pad1: <summary>` (only files you changed), push `feature/kestrel`.
4. Report to Michael per RULES 9 4c: plain English, at most 8 lines, no bare ids or decision numbers. Then a "Try this"
   list of 4 steps: select a wall on the phone and check nothing is covered; read the hint bar; quick walk, L3 to
   run, B to come back; turn a wall with RB while grabbing and read the change line.
5. Last line before the Next step block: "Review chat: SKIP" (editor parts skip review; Michael, 2026-10-12,
   progress.md Decisions). The Next step block: "1. Type /clear." "2. Stay on Opus, medium." "3. Send the prompt
   below:" then a fenced code block holding `Planner: next` on its first line and the whole report under it.
6. STOP. Do not start ED3-3a.
