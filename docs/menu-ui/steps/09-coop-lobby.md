# Step 09 - coop-lobby (Block B)
Co-op root, offline, connecting and the lobby (host and client) with every state and error. Deps: 06. Model: Opus 5.5 /
Opus 5.5. Net: all code stays in `src/net` behind the dynamic import; no protocol change.

## Read
- SPEC.md 5, 7.15-7.18; DECISIONS MD18; bible 5.8 lines on co-op lobby and spoilers (grep "Story spoilers").
- `src/net/coopUi.ts` (`CoopScreen`, `ConnectingScreen`, `LobbyScreen`, error dialogs, `openJoinLink`, DIFF_OPTS and
  step 19 `dc` rows), `src/net/session.ts` events used by the UI. Prototype `SCR.coop`, `SCR.connecting`, `SCR.lobby`.

## Task
1. Co-op root (CO-OP / LOBBY): Host a room, Join with code; offline state with Retry focused.
2. Connecting: loading line + Cancel (focused); errors become OK dialogs with cause and fix text: Could not connect,
   No host found (15 s), Room full, Host left.
3. Lobby: "ROOM <code> · you host / host: <name>", four player rows (operator colour dot, callsign, Host / Ready /
   Not ready, Open slot), status line. Actions: Start mission (host; locked with the status as reason until ready),
   Ready / Not ready (client), Share code, Leave. Options column: Mission and Difficulty cyclers (host) or locked rows
   "Set by the host." (client); Custom difficulty values read-only for clients. Spoiler line in amber for missions
   past the local player's solo progress; Mission 8 adds the twist warning. Weather row when the mission offers it.
4. Back = Leave dialog (Stay first). Legend: Leave, Select, Y Share code. Toasts: joined, left, link copied.
5. Legacy modes (TDM etc.) keep working in the same layout; no new work.

## Tests
- e2e-coop (two pages, `?net=local`): host and client lobby by pad and keyboard; client rows locked with reason;
  ready -> host Start unlocks; Leave dialog safe default; host leaves -> client dialog; offline root.
- e2e-menus: co-op root, offline state, Connecting cancel.

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-coop e2e-menus e2e-offline
  e2e-netmove`.
- Grep proof: no static import of `src/net` outside it.

## Commit
"menu-ui 09: co-op root, connecting, lobby states and errors on the menu template"
Then LOG, STATE, CHANGELOG, TESTING (co-op two-device check), docs/systems/coop.md, ui.md.
