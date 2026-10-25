# optic-coop: re-check (fresh Opus, CHECK-M B1 fix round)

Verdict: **PASS**. Delta checked: `ee3dd662..52258028` (feature/optic-coop, PR #314). No blocker.

## Runs (one at a time)
- `tests/net.test.ts` 81/81, `tests/opticCoop.test.ts` 22/22, `tests/doorPeek.test.ts` 15/15,
  `tests/joinWatch.test.ts` 14/14, `tests/coopFix.test.ts` 13/13, `tests/protocolConst.test.ts` 3/3.
- `npx tsc --noEmit -p .`: clean. No e2e, no full vitest, no `npm run check` (as briefed).

## B1: closed
- **Client sends, opens nothing.** `gameState.ts` `gapMenuPick` -> `pickOpenTrap` (`gapMenu.ts:127-133`): with
  `net.panelOpen` (only `CoopClient` defines it, `coopClient.ts:603-605`) it sends `{ t: 'panel', g }` and returns
  without touching `Breakables`. No prediction, so nothing to roll back.
- **Host validates.** `NetSession` relays `panel` (`session.ts:205`); `coopHost.ts:701` -> `onPanel` (`:831-836`):
  `r.alive`, then `hostTrapKey` (`gapMenu.ts:91-99`): integer in `0..points.length-1`, `trap` set, `has` and not
  `isOpen`, height band `OPTIC.reachDown/reachUp` + 0.5 m, horizontal `hyp2 <= 1.6 + 0.5`. Feet frame matches the menu
  (`player.position` = `controller.pos`, the same frame the host puts on the wire and `RemotePlayer.feet` holds).
  Bad input: the parser drops non-integer / out-of-`OPTIC_POINT_MAX` `g` (`protocol.ts:801-804`); an in-range index
  the level lacks returns null; no throw path.
- **Snapshot.** `openTrapGaps` into the reused `trpBuf`; `trp.join()` joins `dsig`, so a new open forces the doors
  block on the next snapshot; the block also goes every `ITEMS_EVERY` and at a rejoin (`joinStep` sets `itemsT = 0`,
  `coopHost.ts:425`). `snap.trp` is a copy, set only with the doors block and only when non-empty. Parser drops
  out-of-range entries and duplicates, never clamps (`protocol.ts:973-981`).
- **Both sides apply the same open.** Host: `breakables.open(key, 'unscrew')` in its world (collision, shots and
  perception rays follow). Client: `applyOpenTraps` (`coopClient.ts:460`) -> the same `breakables.open(key, 'unscrew')`;
  idempotent (`breakables.ts:150-153` returns false when open or missing); a missing gap or a gap with no trap skipped.
- **Door pattern, cannot desync.** Host opens before any snapshot lists it (the list is derived from host state, not
  from the request); a client that predicted nothing waits for `trp`; the host's own pick (`CoopHost` has no
  `panelOpen`) opens locally and reaches every client through the same `trp`; a second client sees a first client's
  open the same way. Traps never close, so a lost or late snapshot only delays, never contradicts.
- **Single player.** `this.net` null -> `panels.open` at once, as before.
- **Hard rules.** No `src/net` import in `src/game` (`gapMenu.ts` imports `contextMenu` type, `opticCable` type,
  `config/tools`, `core/mathx`); `src/net` imports from `src/game` only (allowed direction). `PROTOCOL_VERSION`
  untouched. Snapshot path: no new per-tick array (`trpBuf` reused; `slice()` only on a doors-block send with traps
  open). `hostTrapKey` / `openTrapGaps` / `applyOpenTraps` allocation-free, `hyp2` used.
- **No new break found.** The protocol tests bound `panel` and `trp`; the session round trip (far, bad, repeat, in
  reach) and the joiner path are covered.

## Polish
1. `onPanel` drops a refused request silently; `onDoorCrack` counts `r.violations++` for a request on a closed door
   (`coopHost.ts:818-821`). Optional: count a far / already-open `panel` the same way for parity.
2. `dsig` adds one `trp.join()` string per snapshot (`coopHost.ts:1437`). Same as the existing `doors.join()` /
   `dcr.join()` (snapshot rate, not an AI / nav / anim loop), so within the current pattern; a cheaper key would be
   `breakables.viewVersion()` (grows on each open) if the snapshot path is ever trimmed.
3. The client gets no feedback when the host refuses (for example a "Too far" from the host's slack edge is impossible,
   but a race with the host's own open is): the menu keeps OPEN TRAP until the next `trp`, and repeat picks re-send.
   Harmless (host no-ops); the door crack behaves the same.
4. `tests/net.test.ts` adds its imports mid-file (`:854-856`); move them to the top with the others.
5. Still open from CHECK-M polish 4 (pre-existing, not this job): duct grates and window glass open on one page only;
   the same `trp`-style list (by breakable key or index) would close it. Backlog item.
