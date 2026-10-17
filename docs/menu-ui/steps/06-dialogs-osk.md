# Step 06 - dialogs-osk (Block B)
The dialog band, toasts, the on-screen keyboard (MD3) with the Join screen, player name entry and the feedback note on a
pad. Deps: 05. Model: Opus 5.5 / Opus 5.5. Net: the Join screen lives in `src/net` (dynamic import only).

## Read
- SPEC.md 4.3 (text entry, dialogs), 7.16, 7.22, 7.23, 7.24; DECISIONS MD3, MD18; prototype `oskGrid()`, `SCR.join`,
  `SCR.name`, `dialog()`, `toast()`, the keydown typing branch.
- `src/ui/widgets.ts` `Dialog`, `src/ui/toast.ts`, `src/net/coopUi.ts` `JoinScreen` (`CODE_ALPHABET`, capture-phase
  keys), `src/ui/screens/feedbackScreen.ts` (`FeedbackFormScreen`, textarea), legacy Tag form (grep "Random").

## Task
1. `Dialog` on the template: full-width band at y 230, title, message, buttons in a row; the safe option is first and
   focused (callers pass `safe` index; default 0); Back / B / Esc / the legend Back pick the safe option; screen legend
   hidden underneath; screen dimmed to 72 %. Update every caller so the safe option is first (grep `new Dialog`).
2. Toasts per SPEC 7.24 (green or amber edge, max 3, 2.6 s).
3. New `src/ui/osk.ts`: `Osk({ chars, cols, extra, maxLen, onType, onDelete, onDone, onCancel })`; a `data-grid`
   (no wrap); pad: A type, X delete, Y space (when allowed), Menu done, B cancel; keyboard: letters / digits type
   directly, Backspace deletes, Enter done, Esc cancels, arrows move; mouse / touch tap keys. Invalid characters toast
   the reason. Legend keyboard glyphs: Type "A-Z", Delete "Bksp", Done / Join "Enter".
4. Join screen (JOIN / ROOM): five slots with a pulsing cursor plus the code Osk (31 keys, 8 columns, Delete, Join).
   Keep the capture-phase keyboard path for typing but route it through the Osk. "Room codes have 5 characters".
5. Player name (PLAYER / NAME) from Settings > Gameplay: full Osk (A-Z 0-9 - . Space Delete Done), 12 characters.
   Removes step 05's temporary field. Stored in `profile.name`.
6. Feedback note: on pad, confirming the note field opens the full Osk as a modal over the form (multi-line not
   needed: Done returns); keyboard focuses the textarea as today; touch uses the OS keyboard.
7. Legacy Tag form: its callsign input becomes the name Osk (parked, but the template change is free).

## Tests
- `tests/osk.test.ts` (pure parts: char filtering, max length, delete).
- e2e-menus: Join by pad (d-pad + A + Menu), by keyboard typing (with a Backspace), by mouse clicks; invalid char
  toast; name entry by pad and keyboard; every dialog in the suite opens on its safe option.
- e2e-coop: join path through the new screen (`data-key` keys); e2e-feedback: note by keyboard, Osk by pad.

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-menus e2e-coop e2e-feedback
  e2e-pad e2e-park`.
- Grep proof: `grep -rn "from '../net\|from \"../net" src --include=*.ts | grep -v "import("` empty outside src/net.

## Commit
"menu-ui 06: dialog band, toasts, on-screen keyboard for codes, names and notes"
Then LOG, STATE, CHANGELOG, TESTING (pad text entry), docs/systems/ui.md, coop.md (join screen).
