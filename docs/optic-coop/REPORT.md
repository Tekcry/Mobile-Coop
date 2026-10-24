# optic-coop: report (spare job #15, ct-toolkit 3.2)

From the builder's commit ffd2a3c2 (the agent could not write this file).

optic-coop: partner sees the optic cable (MoveState optic), gaps engine side

ct-toolkit 3.2, the rest of the optic cable after PR #239.

- Wire: MoveState mode `optic` appended to MOVE_MODES. sub = OPTIC_SUBS
  (0 door, 1 hatch, 2 panel, 3 grille), a = door index (sub 0) or the
  level's optic gap index (OPTIC_POINT_MAX 256 on the wire), ph = cable
  fed out 0..1. sanitizeMoveState refuses unknown subs / bad indices;
  dropBadDoorMove covers optic sub 0, dropBadOpticMove drops a gap the
  level lacks (host accept and client snap). PROTOCOL_VERSION untouched.
- Partner pose: remoteAvatar kneels from the crouch bit (moveKneels),
  settles the feet (poseFromMoveState), right hand on the feed point,
  thin cable hand -> tip as far as ph (opticPlaceOf / opticCableEnd, the
  same code as the owner's new local hand and cable; world.ropes radius).
- Pings from the view: confirmed unchanged (sendPing casts from
  cam.gamePos = the tip; message to host, event to all). No ping input
  is bound anywhere yet (open item).
- Gaps other than doors (map field optic): OpticPoint,
  LevelBuilder.opticGap -> BuiltLevel.opticPoints, opticPointPlace,
  opticPointRefusal ('Too far', 'No gap'), OpticSystem.pickPoint with a
  3-D gap check; look pitch limits around a centre pitch.
- Skipped: the F / pad entry (F is the co-op action; spec says ask) and
  any map placement (no spec names a spot).

Assumed decisions (undo):
A1 shaft top sends sub grille (undo: append 'shaft', OPTIC_SUB_MAX 4).
A2 ceiling panel fed standing, 0.3 m off (undo: crouch true).
A3 floor / ceiling gaps look 50 deg down / up at centre, CT trap view
   (undo: OPTIC.vertPitch 0).
A4 cable = one straight segment on the rope instancer, 6 mm, 85 % in the
   owner's view (undo: drop handFrame and the remote block).
A5 host does not holster a client on the cable (hostHandsFree as is).
A6 gaps reachable from code / tests only (pickPoint) until bound.

Tests: tests/opticCoop.test.ts (15); mocks in animN4dKill / poseParity
gain `optic`; 43 related files pass one at a time; tsc and eslint clean.
e2e-netmove gains an "optic cable" section (not run here). Laptop: run
e2e-netmove, e2e-coop, e2e-stealth-ai, e2e-ctcourse.

## Follow-up (M1, M2)

feature/optic-coop-2, Michael's answers 2026-10-24 ~14:10 (`BRIEF.md`) and checker A's polish 2 and 5.

- M1: `game/gapMenu.ts` (Babylon-free): `GAP_KIND` rows in the one context menu, so the door menu's prompt, highlight
  and pick on pad and keyboard. OPEN TRAP is listed only where `OpticPoint.trap` names a breakable panel still closed
  (`LevelBuilder.opticGap(..., tip, trap)`), else OPTIC CABLE only. `gapMenuCandidate`: nearest gap within 1.6 m (the
  door set's reach) and the cable's height band, in front of the camera unless within 0.5 m; a faced door's set wins.
  `GameState.gapMenuPick`: OPEN TRAP -> `breakables.open(trap, 'unscrew')` (quiet, local); OPTIC CABLE ->
  `OpticSystem.pickPoint` ("Too far" / "No gap" on the HUD as at a door). `g.gapMenuOpts` / `g.gapMenuGap` for tests.
- M2: `BINDS` `ping` (Middle mouse, `Mouse1`), `PAD_BINDS` `ping` (R3) and `GAME_BINDINGS` `[R3, ping]`.
  Conflicts: middle mouse was free (no keyboard bind, only the tuner's free-mouse drag, which never maps game
  actions). **R3 was taken by Zoom**: kept on both as Michael set it, nothing moved; `findConflicts` reports
  Zoom / Ping on R3 on the controls screen and in the old-save migration toast. In play R3 while aiming a scoped
  weapon in co-op zooms and pings. Open for Michael: keep, make them contextual (allowed pair), or move one.
- Polish 2: `OPTIC_POINT_MAX` (256) moved to `opticCable.ts` (moveState re-exports it); `addOpticPoint` refuses past it
  and `opticGap` warns.
- Polish 5: `opticTipRay` (pure) / `OpticSystem.tipRay`: `sendPing` casts from the tip whenever the view is on, from
  its first step (before `frameUpdate` moved the camera); `frameUpdate` places the camera from the same ray.
- Tests: `tests/opticCoop.test.ts` 22 (gap menu rows openable / not, candidate, cap, tip ray, `OpticSystem.tipRay`,
  ping defaults, conflicts); updated `conflicts`, `padBinds`, `settings` (the R3 conflict), `input` (the doc table's
  ping row). One at a time: opticCoop, conflicts, padBinds, keybinds, input, settings, tunerMouse, opticCable,
  moveState, doorPeek pass; tsc and eslint clean. `scripts/e2e-pad.mjs` remap section clears Ping off R3 too and
  expects the Ping / Zoom conflict after the reset (not run here). Laptop: e2e-pad, e2e-mouse, e2e-netmove, e2e-coop.

## Fix round (CHECK-M B1)

Opus fix round on feature/optic-coop. B1: OPEN TRAP opened its panel (collision: movement, shots, perception rays) on
one page only. Fixed the proper way (the door pattern), not the stopgap.

- Wire (no `PROTOCOL_VERSION` change; the train bumps it): client -> host `{ t: 'panel'; g }` (`g` the optic gap index,
  integer 0..`OPTIC_POINT_MAX` - 1, else the parser drops it; relayed by `NetSession` with the other gameplay messages),
  and the snapshot's `trp?: number[]` (gaps whose trap is open; out-of-range entries dropped, duplicates removed), sent
  with `doors` (on a change, every `ITEMS_EVERY`, at a rejoin's resync: late joiners and rejoins get it).
- Client: `GameState.gapMenuPick` -> `pickOpenTrap` (`game/gapMenu.ts`): with `NetAttachment.panelOpen` (client only)
  it sends `panel` and opens nothing itself (no prediction: the host's world decides collision). Snapshots' `trp` ->
  `applyOpenTraps` -> `breakables.open(key, 'unscrew')` (idempotent, a gap the level lacks skipped).
- Host: `case 'panel'` -> `onPanel`: `hostTrapKey` (gap in range, `trap` names a panel still closed, client alive and its
  feet within `GAP_MENU.reach` 1.6 m and the height band plus `GAP_HOST_SLACK` 0.5 m, no facing test), else dropped; then
  `breakables.open` in the host's world. The host's own pick opens directly; `openTrapGaps` fills a reused buffer per
  snapshot (a copy goes on the wire only when the doors block is sent and the list is not empty).
- Single player: unchanged (no hook, opens locally).
- Tests (`tests/net.test.ts`, 6 new): `panel` parse bounds; `trp` parse bounds; the host check (reach and slack,
  height band, bad / out-of-level index, no-trap gap, unknown key, already open); request -> host validates -> snapshot
  -> both open over `NetSession` (far and bad requests change nothing on either page, a repeat is refused); a joiner's
  snapshot opens a trap; single player and host open locally. One at a time: net 81, opticCoop 22, doorPeek 15,
  doorPeekParity 1, joinWatch 14, ventOpen 15, sectorGuardFreezeSeeThrough 7, coopFix 13, protocolConst 3 pass;
  `npx tsc --noEmit -p .` and eslint on the changed files clean. No e2e run.
- Not done: duct grates and window glass still open locally only (pre-existing, CHECK-M polish 4; backlog item).
  Laptop: e2e-coop, e2e-netmove (no map places a trap gap yet, so no e2e reaches OPEN TRAP).
