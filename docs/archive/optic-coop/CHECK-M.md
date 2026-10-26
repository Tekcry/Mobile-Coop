# optic-coop: check M (fresh Opus, the M1 / M2 follow-up)

Verdict: **FAIL** (one blocker, latent: no map or caller sets a trap yet). Delta checked: `f32aaf17..f96633aa`
(feature/optic-coop, merge of feature/optic-coop-2).

## Runs (one at a time)
- `tests/opticCoop.test.ts` 22/22, `tests/conflicts.test.ts` 5/5, `tests/padBinds.test.ts` 5/5,
  `tests/settings.test.ts` 17/17, `tests/input.test.ts` 26/26, `tests/keybinds.test.ts` 5/5.
- `npx tsc --noEmit -p .`: clean. No e2e run (e2e-pad remap section read, not run).

## Blocker
**B1. OPEN TRAP changes collision on one peer only (co-op mismatch).**
`src/game/gameState.ts:1511` calls `world.breakables.open(pt.trap, 'unscrew')` locally. `Breakables.open`
(`src/world/breakables.ts:150-158`) disposes the panel's physics body, and that body is `G.STATIC` colliding with
everything (`breakables.ts:116-117`): it blocks movement, shots and the STATIC rays perception casts. Nothing in
`src/net` carries a breakable open (no `breakable` / `grate` / `glass` anywhere in the protocol), so after a client opens a
trap the host still has the panel: the client can drop through a hatch the host thinks is shut, and host-side guards
still see the panel as closed (and the reverse when the host opens it). Not purely visual, so it must go through the host
like doors. A7 cites the duct grates as precedent; they share this desync (pre-existing, not this job's), but this job adds
a new path into it.
Latent: `LevelBuilder.opticGap(..., trap)` (`src/world/levelBuilder.ts:332`) has no caller, so no shipped map lists OPEN
TRAP today.
Fix (pick one):
- Proper: a host-relayed panel open, the door pattern (`protocol.ts:269` `{ t: 'door' }`, `coopClient.ts:595`,
  `coopHost.ts:695`): e.g. `{ t: 'panel'; g: <gap index> }` (bound by `OPTIC_POINT_MAX`, validated against the level's
  `opticPoints[g].trap`); the client sends it instead of opening; the host opens and broadcasts; peers apply with
  `breakables.open(key, 'unscrew')` (idempotent: returns false when open). Wire change, so the train bumps
  `PROTOCOL_VERSION`; add a protocol parse test.
- Stopgap (no wire change): in `gapOpenable` (`gameState.ts:1500`) return false while `this.net` is set, so co-op lists
  OPTIC CABLE only until the panel message exists; log it as an assumed decision in BRIEF.md.

## Focus points (no blocker)
- **M1 menu.** `gapMenu.ts` rows go in the one context menu (door menu's prompt, latch, highlight, pick); OPEN TRAP only
  when `trap` names a closed panel, else OPTIC CABLE only. The door set wins: gap rows only in the `else` of a faced door
  (`gameState.ts:1390-1397`). OPTIC CABLE goes through `OpticSystem.pickPoint`, whose refusals ("Too far", "No gap") use
  the same `refuse` -> `hud.feedItem(why, 'warn')` as the door pick. `gapMenuCandidate` is allocation-free and uses
  `hyp2`. The optic itself stays co-op-correct (view local, kneel / cable on MoveState, as checks A / B).
- **M2 binding.** `BINDS.ping` = `Mouse1` (middle; `keyboardMouseSource.ts:117-121` maps it to actions while locked; the
  tuner's free-mouse drag returns before that), `PAD_BINDS.ping` = R3, `GAME_BINDINGS [RS, ping]`. Nothing else rebound:
  Zoom keeps R3, middle mouse had no bind. The R3 clash is reported, not hidden: `findConflicts` returns
  `{zoom, ping, RS}` on the defaults, the controls screen marks both rows and the summary, REPORT.md and the docs name it
  for Michael. Single player never pings (`this.net` gate, `gameState.ts` ping line), so solo R3 is Zoom only.
- **Save migration.** `sanitizePadBinds` / `sanitizeBinds` start from the defaults and overwrite only the verbs the save
  stores; an old save has no `ping` key, so ping gets its default and every stored verb is kept as saved. A player who put
  another verb on R3 (or middle mouse) keeps it; ping joins it as a reported conflict. No binding is lost or moved.
- **Ping from the tip.** `opticTipRay` reads `OpticCore` (place, yaw, pitch) only, never the camera, so `sendPing` casts
  from the tip on the first viewing step; `frameUpdate` places the camera from the same ray. Tested.
- **Cap.** `addOpticPoint` refuses past 256, `opticGap` warns; no crash.
- **e2e-pad.** Consistent with the defaults: the remap section clears Ping off R3 after Zoom (`e2e-pad.mjs:776-778`)
  before the `rows === ''` assert at 787; the `crouch,draw` assert at 898 runs with ping still cleared; the reset assert
  at 910 expects `ping [11]`, `zoom [11]` and rows `ping,zoom` (row ids are the bind ids, `controlsScreen.ts:181`). The
  PADV sweep (657) accepts any listed action, so R3 raising zoom + ping passes.

## Polish
1. The migration toast (`controlsMigrationNotes`) only runs for saves older than pad layout 3 / key layout 1
   (`settings.ts:284-286`). A current save (most players) gains ping on R3 with no toast; the conflict shows only when the
   controls screen is opened. REPORT.md's "and in the old-save migration toast" is true only for pre-S1 saves. Optional:
   a one-off note keyed on a new `padV` (would need the layout bump and a literal-old-save test).
2. `opticGap` returns the refused point past the cap (`levelBuilder.ts:336`), though it is in no list; harmless, but a
   caller could keep using it. Return `null` or document it.
3. With a trap closed, `pickPoint`'s `gapClear` sweep starts 0.02 m off the gap point; a panel body sitting on the gap
   (0.04 m thick) may make OPTIC CABLE refuse "No gap" until the trap is opened. Unverifiable without a placed gap; check
   when a map lead places the first trap gap.
4. Pre-existing (not this job): duct grates and window glass also open locally only (no wire). Worth a backlog item
   alongside B1's panel message.
