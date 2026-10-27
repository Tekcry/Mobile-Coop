# coop4 N1 - net core: slots on the wire, Sector cap 4, refs by slot - build report

Branch `feature/coop4-n1` off `08267f27` (N0). Builder: Opus. Files (own): `src/net/protocol.ts`, `session.ts`,
`coopHost.ts`, `coopClient.ts`, `remotePlayer.ts`, `remoteAvatar.ts` (the setBeacon line), `src/game/gameState.ts`,
`tests/net.test.ts`, `tests/coopRejoin.test.ts`, `tests/snapBudget.test.ts` (new). Lead-approved extras:
`src/game/modes/gameMode.ts` (`onRemoteJam` `slot?` param), `src/net/holdPulse.ts` (comment only).

## Merged in
- `origin/feature/coop4-tm` 41eeeb93 (TM: `TeamRequest.bBusy`, denial `taken`).
- `origin/feature/coop4-ui-h1` c8711ff2, then `origin/feature/coop4-ui` 062fbc53 and 5f58e2d4 (H1 + L1: `setBeacon(1-4)`,
  `Blip.slot`, lobby by `capacity`). No setBeacon cast was needed.
- `origin/feature/coop4-d1` c9867b7f (step 1), then 8c00b6af (final: per-slot jam state, `CtHooks.slot`,
  `onRemoteJam(tgt, eye, slot)`).
- Not merged (lead integrates): `feature/coop4-sm`, `feature/guard-ai-coop4`.

## Built
- **protocol.ts**: `SECTOR_MAX` 4; `capacity`: course 2, sector 4, others `COOP_MAX` 4. `PlayerInfo.slot` (lobby parse:
  a finite number rounds and clamps to 0..3; missing / junk -> `slotFromList` list order). `secWire` parses `j / ch / cd`
  as one entry per slot: the longest of the three, padded to 2, cut at `MAX_PLAYERS`; junk entries idle. `bye.mode`
  (optional): a full room's refusal names its mode. Snapshot rounding helpers `wireNum`, `snapPlayerState`,
  `snapEnemyState`, `snapItem` (1 mm / 1 mrad; a living body never rounds to 0 hp). No `PROTOCOL_VERSION` edit.
- **session.ts**: owns a `SlotTable` (host 0; `assign` on a new hello; `unhold` on rejoin; `hold` on a mid-match drop;
  `release` on drop / hold end / lobby leave / a fresh connection replaced by its held slot; `compact` in `startMatch`
  in slot order). The lobby list goes in slot order with `slot` set. `slotOf(id)`, `selfSlot`. The refusal carries
  `mode`, and a refused client sets `session.mode` from it before `full` fires, so coopUi's existing
  `capacity(session.mode)` text shows the room's cap with no coopUi change.
  - Found and fixed: with two or more slots held in a full room, a held player could not rejoin by token. A page's first
    hello is tokenless (the token goes only to a host it knows), and that hello was refused, so the page gave up. Now
    that first tokenless hello gets the lobby once (`probed`), the page learns the host and sends its token; a second
    tokenless hello from that connection is refused "Room is full" (A18).
- **coopHost.ts**: `slotOf` from the session table; spawn, respawn timers, `reviveAll`, `onRespawn` (remotes sorted
  by slot, each placed clear of the earlier ones), `joinSpot` and the goggle glow by slot; `remoteRefs` kept in slot
  order; `ref.slot` set at add and on lobby change; ally blips carry `slot`; `teamSize()` = 1 + remotes (held
  included). Revive cap: `syringesFor(difficulty, s.players.size)` through a cast (SM's 2-arg signature is not on this
  branch; the extra arg is ignored until SM lands). Team moves: `teamActive` (id -> mate, until): set for both at
  `tstart` (boost `TEAM.boostTime`, relay `TEAM.relayClimb`, throw `TEAM.throwTime`, + 0.5 s; hang / rope until their
  end), cleared on `tend` / `hangEnd` / hold / leave; `bBusy` passed, so a second claimant gets `taken`. The jam goes
  to the mode with the sender's slot (`onRemoteJam(id, tgt, eye, slot)`). Guard AI: `intruderLeft?.(id)` in
  `removeRemote` (optional call; compiles without the AI branch); the hold-noise pulse names its holder
  (`em.hear(..., 'noise', null, r.ref.id)`, A172). Sector Ops snapshots go rounded (course and legacy modes unchanged,
  A27).
- **coopClient.ts**: `slot()` = `session.selfSlot`; own beacon and glow by slot (`g.setLocalSlot`); avatars' glow by
  slot; client `CtDevices` gets `slot: () => this.slot()`; ally blips carry `slot`; `teamSize()`; the start places the
  lower slots' spots first so slots 2-3 keep clear of slot 1 (as the host does).
- **remotePlayer.ts**: `ref: TeamRef` (`slot`, `mv` from each accepted `pstate`).
- **remoteAvatar.ts:199**: `setBeacon(slot + 1)`, fallback `host ? 1 : 2`.
- **gameState.ts**: `localRef: TeamRef` (`slot` 0, `mv`); `localSlot`, `setLocalSlot(slot)` (also the own beacon);
  `teamSize()` (`net.teamSize?.() ?? 1`); `playerRefsInto` in slot order (insertion sort, no allocation); `teamRefsInto`;
  `aiRefs: TeamRef[]` (AI and security read `teamRefsInto`); host and solo fill `localRef.mv` once per fixed step
  before the AI (`localMoveState` into a reused buffer); a client leaves it null. The stealth-start
  `slotFor(localRef.id)` block (~:2690) is untouched.

## Snapshot sizes (tests/snapBudget.test.ts, synthetic, JSON characters)
| Case | Unrounded | Rounded (Sector Ops) | Budget |
| --- | --- | --- | --- |
| Steady, 4 players x 32 guards, every optional field, committed move + grips on all 4 | 9012 | 5953 | 6144 |
| Typical, 4 players walking x 32 guards | - | 5305 | - |
| Worst, + 128 items, 64 doors, 32 bodies | 43298 | 29381 | 32768 |
| Host upload, steady, 15 Hz x 3 clients | 3.24 Mbit/s | 2.14 Mbit/s | ~2.2 |

Unrounded doubles (~18 characters each) failed both budgets; rounding to 1 mm / 1 mrad (as `packMoveState` already
does for the move state) passes them without interest filtering.

## Open TODOs
- `coopHost.ts` constructor: drop the `syringesFor` cast once SM is merged (`TODO(coop4 SM)`).
- Guard AI team-size hook (AI5): SM calls it at section load; nothing in N1.
- No setBeacon cast (H1 was merged).

## Notes for other slices
- coopUi (L1): the refusal field is `bye.mode`; `NetSession` sets `session.mode` from it before `full`, so the "Room
  full" line is right as it is. `renderPlayers` still sorts by host only; the session list is now in slot order, so it
  can drop that sort or sort by `p.slot`.
- e2e-coop "lobby caps": `capacity('sector')` is 4 now, so the 4-slot step takes its run branch, not the SKIP.

## Checks
- `npx tsc --noEmit`: clean. `npm run lint`: 0 errors (42 warnings, none in N1 files).
- vitest (`--maxWorkers=2`, slot lock): 48 files, 654 tests pass: net, coopRejoin, snapBudget, netSim, protocolConst,
  visionIsolation, rejoin, every `coop*`, playerSlots, teamMovesTaken, beaconSlots, ctDevicesSlots and every test
  importing session / coopHost / coopClient / protocol / gameState / remotePlayer / holdPulse / gameMode.
- Course guard: `git diff 08267f27 -- src/game/course src/game/modes/courseMode.ts src/world/maps/ctcourse* src/ai`
  is empty. No static `src/net` import from single player.
- Not run (as briefed): e2e, build, GPU. Suggested laptop runs: `e2e-coop`, `e2e-netmove`, `e2e-ctcourse`,
  `e2e-course`, `e2e-sectorops` 1-6.
