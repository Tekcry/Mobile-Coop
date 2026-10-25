# Menu UI - slice 3 (dialogs, toasts, on-screen keyboard, co-op screens)

Branch `feature/menu`, 2026-10-18. Prototype first (G87). Desktop only (G12). Covers steps 06 (dialogs, toasts, on-screen
keyboard) and 09 (co-op root, connecting, lobby, errors); the step files stay the full plan.

## Built
- **Dialog band (SPEC 7.23, MD18)**: `Dialog` restyled in `src/styles.css` (slice 3 block): full-width band at y 230,
  title, message, buttons in a row, screen dimmed to 72 %, legend hidden underneath (`.under`), old hint footer hidden.
  One style for confirm, error and info. A dialog with a `safe` button opens on it; Back / B / Esc now run the safe
  button's action (`Dialog.onBack`) and then `onCancel`. Slice 2 already made Cancel / Stay first where destructive.
- **Toasts (7.24)**: menu font, `--ctx-bg` panel, 3 px edge: green (`ok`, `info`) or amber (`warn`, was red). Max 3,
  2.6 s were already so.
- **On-screen keyboard `src/ui/osk.ts` (MD3)**: `Osk({ chars, cols, maxLen, space, doneLabel, get, onChange, onDone,
  onCancel, onReject })` builds a `data-grid` of key buttons (`data-key` `k-A` ..., `space`, `delete`, `done`; grids never
  wrap). Pad: A types the focused key, X deletes (`onX`), Menu / Start done (`onStart`), B cancels. Keyboard (capture
  phase, so the action map never sees these keys): letters and digits type, Backspace deletes, Enter done, Esc cancels,
  arrows move. Mouse: click keys. Rejected characters and over-length toast the reason. Pure parts `oskType` /
  `oskDelete` in `tests/osk.test.ts`. Space key is built (`space: true`) for a future name entry.
- **Co-op screens (`src/net/coopUi.ts`, still behind the dynamic import)** on `MenuScreen`:
  - Co-op root (ghost CO-OP / LOBBY): Host a room, Join with code (`data-key` `host`, `join`), context text each.
    Offline state: amber "Offline" note and Retry focused (`.coop-offline`, key `retry`).
  - Join (ghost JOIN / ROOM): five code slots (`.code-slot`, pulsing cursor on the next), the code Osk (31 keys, 8
    columns, Delete, Join), "Room codes have 5 characters". Legend: Back, Type "A-Z", X Delete "Bksp", Start Join "Enter".
  - Connecting: loading line and a focused Cancel (Back cancels too, as before).
  - Lobby for TWO players (G2): header "Room CODE · you host" / "host: NAME", two slots (colour dot, callsign, tag, Host /
    Ready / Not ready, "Open slot"; a third joiner still shows, the wire cap is unchanged), status line, then the rows.
    Host: Mode, Mission or Map, Difficulty (the fixed levels, G106), Weather where offered, Start at (course) as cyclers
    with context text. Client: the same rows as locked rows "Set by the host." (focusable, toast on confirm). Actions:
    Start mission (host; blocked with the status as the reason until the partner is ready; `data-key` `start`), Ready /
    Not ready (client, `ready`), Share code (Y), Leave. Legend: Leave, Select, Y Share code. Toast when a player joins
    (green) and leaves. Back opens "Leave room?" with Stay first and focused (safe).
  - Error dialogs (OK, cause and fix text): Could not connect, No host found (15 s), Room full ("two players"), Host left
    (also covers a dropped connection).
- Kept unchanged for the suites: `.lobby-screen`, `.lobby-actions`, `.lobby-opts .row-choice`, `.code-slot`,
  `.coop-offline`, `[data-diff]` (absent for clients), `.dialog-title`, labels "Host a room", "Join with code", "Retry".

## Files
- New: `src/ui/osk.ts`, `tests/osk.test.ts`, `docs/menu-ui/SLICE3.md`, `docs/menu-ui/shots/slice3-*.png`.
- Changed: `src/net/coopUi.ts`, `src/ui/widgets.ts` (`Dialog` Back = safe option), `src/styles.css` (slice 3 block),
  `scripts/e2e-coop.mjs` ("Start match" -> "Start mission"), `scripts/menu-shots.mjs` (slice 3 shots).

## Skipped
- Room cap 4 -> 2: not a one-line change. `COOP_MAX` is in `src/net/protocol.ts`, and `e2e-coop` has a "a third player
  joins" block (door peek, three-page checks) that needs it. Left at 4; the lobby only shows two slots.
- Version mismatch error dialog: the host silently drops a hello with another protocol version, so the client cannot
  tell it from "No host found". Needs a protocol change (a `bye` reason), which step 09 forbids.
- Player name entry: no name setting exists in Settings (the callsign lives on the legacy Tag form). The Osk has a Space
  key ready.
- Feedback note and legacy Tag form on the Osk (step 06 items 6 and 7), `?menuDemo=1`.
- Spoiler line (amber) and the Mission 8 twist warning in the lobby (needs the local solo progress API), Custom
  difficulty values (no Custom, G106), the "link copied" toast stays "Invite link copied".
- `tests/prompts.test.ts`, e2e-menus additions for Join / lobby / dialogs; docs the step files list for the commit
  (LOG, STATE, CHANGELOG, TESTING, `docs/systems/ui.md`, `coop.md`): left to the orchestrator.
- Joining mid-match toasts and the connecting-screen error states beyond the ones above.

## Open items
- Michael: look at the slice 3 shots (layout only, software GL).
- GPU check on the PC (`E2E_GPU=1`): pending PC run.
- Two-device co-op check (real WebRTC): pending a PC run.
- The Back = safe action change affects every `safe` dialog: Cancel actions are all no-ops today.

## Results
- `npm run check`: lint 0 errors, tests and build pass (new `tests/osk.test.ts`).
- e2e on port 4191 (software GL, machine heavily loaded; the first parallel run timed out on page loads): smoke, e2e-park pass; e2e-coop, e2e-menus (hold-right timing failed only under load) and e2e-course pass rerun alone. e2e-netmove and e2e-bunker (KNOWN FLAKY) get past the lobby and join flow and fail inside the match (host braces; partner teleport solidity), which the menu change does not touch; not rerun further.
- Shots: `docs/menu-ui/shots/slice3-coop-root.png`, `slice3-join-osk.png`, `slice3-lobby-host.png`, `slice3-lobby-client.png`, `slice3-error-dialog.png` (`scripts/archive/menu-shots3.mjs` runs only these; `menu-shots.mjs` also has the block).
