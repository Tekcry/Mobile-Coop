# coop4 - plan

Brief: `docs/coop4/BRIEF.md` (M1, A1-A27). Master a10382bc (4.89.x, `PROTOCOL_VERSION` 49). One PR `feature/coop4` to master; Marlow Build's slices come in on `feature/coop4-ui` and the lead merges that branch into `feature/coop4` (the files do not overlap); Guard AI Build's slice is its own PR `feature/guard-ai-coop4` in the same train.

## 1. Single-partner audit (grep results, verified 2026-10-24)
`grep -il partner src` matches 110 files; the roadmap's "69" counted every mention. Most are not two-player limits: animation roles (`anim/clips/team.ts`, the tuner), course-only code, or code already keyed by player id. The files with a real 1-partner / 2-slot assumption on the Sector Ops path are these 20:

**Wire, session, lobby (src/net)**
- `src/net/protocol.ts:38-41`: `capacity('sector')` = `COURSE_MAX` 2. `:45-56`: `PlayerInfo` has no slot. `:588-620`: `secWire` parses `j / ch / cd` as 2-tuples. `:771`: lobby player parse.
- `src/net/session.ts:144-154`: `heldFor` (one held slot in a full room). `:176-180`: the join gate follows `capacity`. `:291-306`: away hold and drop (a slot must be kept, then freed). `:315-320`: `broadcastLobby`.
- `src/net/coopHost.ts:193`: syringes not scaled by team. `:240-245`: recolour by list order. `:364`: `spawnPoint(remotes.size + 1)`. `:395-404`: `slotOf` uses join order, so it shifts when someone leaves. `:1566, :1714`: revive spawn by key index. `:1686-1711`: `onRespawn` slot by iteration order. `:995-1047`: team moves have no busy check on `b`. `:1735`: ally blips have no slot.
- `src/net/coopClient.ts:156-160, :369-378`: `slot()` from list order. `:395`: glow. `:1167`: ally blips. `:173`: `CtDevices` client has no slot.
- `src/net/remoteAvatar.ts:199`: `setBeacon(info.host ? 1 : 2)`.
- `src/net/remotePlayer.ts:78`: `ref` has no slot or MoveState.
- `src/net/coopUi.ts:87`: "already has its two players". `:481-485`: `slots = Math.max(2, ...)`. `:504`: "invite your partner". `:628, :877`: local autostart starts at 2 players.

**Game**
- `src/game/gameState.ts:527-528`: own beacon `puppet ? 2 : 1`. `:1008-1016`: `playerRefsInto` in join order, not slot. `:502-503, :676, :771`: the AI player list.
- `src/game/ctDevices.ts:89-105`: `SecWire.j / ch / cd` 2-tuples. `:273-300`: `jam`, `jamId`, `want`, `wantAt`, `cool` 2-tuples. `:357-363`: `me = role === 'host' ? 0 : 1`. `:801-818`: `onRemoteJam` reads `refs[1]`. `:840-862`: `n = Math.min(2, refs.length)`. `:1136-1146` wire, `:1152-1160` apply, `:1198-1206` frame, `:1258-1260` debug all assume 2.
- `src/game/modes/sectorMode.ts:1313`: attacker `'local' ? 0 : 1`. `:1343`: `onRemoteJam` drops the id. `:698-700`: guard spawn has no team filter. `:925-935` and `src/game/sectors.ts:788, :840-843`: alarm send has no team scale. `:1201-1210`: checkpoint slots 0 and 1 only (fine: slots 2-3 go beside).
- `src/game/sectors.ts:491-510, :877`: `syringesFor` has no team size. `:59-62, :109-110`: `start2` / `checkpoint2` slot 1 only (kept, A14).
- `src/game/rating/sectionRating.ts:191-224`: `SyncedDetector` has 2 slots; shared with `course/courseMarks.ts:83, :112`.
- `src/game/teamMoves.ts:55-59`: `checkTeamRequest` has no "partner already taken".
- `src/game/teamController.ts:1003`: denial text table.
- `src/world/rooms.ts:22`: `SquadSlot` has no `minPlayers`.

**Render and HUD**
- `src/player/goggleGlow.ts:14-18`: `BEACON` has 2 colours. `src/player/characterRig.ts:1744-1757`: `setBeacon(player: 1 | 2)`.
- `src/ui/hud/minimap.ts:6, :86`: one ally colour.
- `src/core/flags.ts:49-50, :124`: no `?players=N` for the local autostart.

**Guard AI (Guard AI Build's slice, src/ai only):** `src/ai/enemy.ts:93-122` (`PlayerRef`), `:63-83` (`MAX_INTRUDERS` buffers, already 4), `src/ai/targetPick.ts:11-12`, `src/ai/enemyManager.ts:159-198, :600` (intruder slots keyed by `p.id`); `src/game/gameState.ts:2676` (the host's arcs read player 0 only; stays).

**Course only, stays 2 (not touched):** `src/game/course/courseDef.ts:11-20`, `course/courseState.ts:195, :1061, :1146, :1170`, `modes/courseMode.ts:412, :609, :1297`, `ui/hud/courseHud.ts:75`, `ui/screens/resultsScreen.ts:23-25`, `net/coopHost.ts:561-566` (`courseRecordRevive`), `world/maps/ctcourseSets/*`.

**Already N-ready (verified, no change):** team-move pairing by id (`coopHost.teamPairs`, `teamController.mates()`), `SectorBolts.press` (`mates[]`), `SectorPairGates` / `pairPress`, `CrateLedger` / `weaponCrates`, `ReviveClock`, `itemScope`, `lampSync`, `torchMirror`, `objectiveMirror`, `PartnerBlocker`, `joinWatch`, `spawnSlots.slotSpawn / besideSpot`, `sectorReset`, `SectorMode.exitStep`, session rejoin per id, snapshot `players[]` (`MAX_PLAYERS` 4), `dualTakedown`, pings, gadgets, `throwKo`, `releaseHolds`, the server browser cap (reads `capacity`).

## 2. Net model (N players)
- **Authority:** the host runs sim, AI, mode and devices. Clients send `pstate` at 20 Hz plus requests (`use`, `td`, `tmove`, `cmove`, `shot`, `jam`, `ping`, `gadget`) to the host only (`session.toHost`).
- **Topology:** logically a star through the host; Trystero keeps full-mesh signalling; client-to-client channels carry only hello / presence. A client accepts authoritative messages only from the host (session.ts:220-226); the host accepts gameplay messages only from lobby members.
- **Slots (A19):** `PlayerInfo.slot` 0-3 in the `lobby` message; every peer reads slots from it, never from list order. Host = 0; a joiner takes the lowest free slot; a held player keeps theirs until rejoin or hold end (`REJOIN_HOLD_S` 600 s); a lobby leave frees it; compacted at `startMatch`, never moved during a match. Pure rules: `SlotTable` in `src/game/playerSlots.ts`; `NetSession` owns one.
- **Snapshots:** one broadcast `snap` at 15 Hz, unchanged shape; `players[]` up to 4; items / doors on change or 2 s, `sector` on change or 0.5 s, `lamps` on change or 2 s. No per-client snapshot. Per-client messages stay targeted (`you`, `start` to a late / returning joiner, `restore` / `back` / `revive` / `crate` by id).
- **Bandwidth (A24), enforced by a unit test (N1):** steady snapshot at 4 players and 32 guards <= 6 KB JSON; worst case with 128 items <= 32 KB (Trystero cap 64 KB); host upload 3 x 15 x 6 KB ~ 2.2 Mbit/s max.
- **Join / leave / late join / rejoin per slot:** hello -> slot -> `you`; in a running match `start` + `late`, then `joinWatch` places the player at the checkpoint on their slot. Lobby leave frees the slot. Drop mid-match: held (`away`) with slot and spot; token hello gets the same slot, colour and spot. Tokenless hello in a full room takes the only held slot; with two or more held: "Room is full". Host drop: no migration.
- **Protocol (one bump, at the train):** (1) `PlayerInfo.slot` (missing -> list-order fallback); (2) `SecWire.j / ch / cd` arrays, one entry per slot, length 1..`MAX_PLAYERS` (course always sends 2 with identical values); (3) `capacity('sector')` = `SECTOR_MAX` 4. No `PROTOCOL_VERSION` edit in any slice.

### Interface for Guard AI (N0 / N1; read by the AI slice)
`src/game/playerSlots.ts` (new, pure, no Babylon, no `src/net`; single player uses it):
```ts
import type { PlayerRef } from '../ai/enemy';
import type { MoveState } from '../player/moveState';
/** Players a match can have (= MAX_PLAYERS in net/protocol.ts = MAX_INTRUDERS in ai/targetPick.ts; a test keeps them equal). */
export const PLAYER_SLOTS = 4;
export type PlayerSlot = 0 | 1 | 2 | 3;
/** A player as the game and the guards see it: its fixed slot this match (0 = the host / solo) and its movement state. */
export interface TeamFields { slot: PlayerSlot; mv: MoveState | null }
export type TeamRef = PlayerRef & TeamFields;
export class SlotTable { /* assign(id), host(id), hold(id), unhold(id), release(id), slotOf(id), compact(order), entries() */ }
```
`GameState` (N1): `playerRefsInto(out)` keeps its signature and pushes `TeamRef`s in slot order (connected players, downed included, held left out); `teamRefsInto(out: TeamRef[])` the same list typed; `teamSize()` = connected + held; `localSlot: PlayerSlot`. `mv` is filled on the host for every player once per fixed step before the AI thinks (local via `localMoveState(g, out)`, game/localMoveState.ts:15, reused buffer; remote from its last accepted `pstate.mv` in `RemotePlayer.ref`); on a client `mv` is null. The AI slice may switch `AiContext.players()` to `readonly TeamRef[]` (`import type` from `src/game/playerSlots`). Until N1 lands, `slot` reads as the list index and `mv` as null.

## 3. Slices
| ID | Slice | Model | Who | Depends on | Files (exclusive) |
| --- | --- | --- | --- | --- | --- |
| N0 | Slot model + TeamRef interface | Opus | coop4 | - | `src/game/playerSlots.ts` (new), `tests/playerSlots.test.ts` (new) |
| D1 | Devices per slot (jammer wire) | Opus | coop4 | N0 | `src/game/ctDevices.ts`, `tests/ctDevicesSlots.test.ts` (new) |
| H1 | Beacon and minimap colours for 4 | Sonnet | Marlow Build | - | `src/player/goggleGlow.ts`, `src/player/characterRig.ts` (setBeacon only), `src/ui/hud/minimap.ts`, `tests/beaconSlots.test.ts` (new) |
| TM | Team-move arbitration | Sonnet | coop4 | - | `src/game/teamMoves.ts`, `src/game/teamController.ts` (denial text only), `tests/teamMovesTaken.test.ts` (new) |
| N1 | Net core: slots on the wire, Sector cap 4, refs by slot | Opus | coop4 | N0, D1 (SecWire type), H1 (setBeacon signature), TM (`bBusy`) | `src/net/protocol.ts`, `src/net/session.ts`, `src/net/coopHost.ts`, `src/net/coopClient.ts`, `src/net/remotePlayer.ts`, `src/net/remoteAvatar.ts` (:199 only), `src/game/gameState.ts`, `tests/net.test.ts`, `tests/coopRejoin.test.ts`, `tests/snapBudget.test.ts` (new) |
| SM | Sector rules for 3-4 | Opus | coop4 | N0; N1 at integration | `src/game/modes/sectorMode.ts`, `src/game/sectors.ts`, `src/game/rating/sectionRating.ts`, `src/world/rooms.ts` (field only), `tests/sectorTeamScale.test.ts` (new), `tests/sectionRating.test.ts` |
| L1 | Lobby cap 4 / Marlow 2, texts, local autostart N | Sonnet | Marlow Build | - (reads `capacity`) | `src/net/coopUi.ts`, `src/core/flags.ts`, `scripts/e2e-coop.mjs` (new lobby block) |
| AI | Guard AI over up to 4 players | Opus | Guard AI Build, brief `docs/coop4/briefs/AI.md` | N0 (types); N1 (live values, e2e) | `src/ai/**` only |
| DATA | Campus / Warehouse rebalance tags | Sonnet | coop4 | SM (`minPlayers`) | `src/world/maps/campusSectors.ts`, `campusS4Data.ts`, `campusS5Data.ts`, `warehouseSectors.ts`, `tests/sectorGuardTags.test.ts` |
| E2E | 4-page harness + Sector Ops suites | Sonnet (Opus fix round) | coop4 | N1, D1, SM, TM, H1, L1 (DATA, AI for the full pass) | `scripts/e2e-sectorops.mjs` (parts 7-8), `scripts/e2e-net-lib.mjs`, `scripts/run-e2e.mjs` (`PARTS`) |
| DOC | Docs, changelog fragment, checklist | Sonnet | coop4 | all | `docs/systems/coop.md`, `TESTING.md`, `changes/feature-coop4.md`, `docs/systems/testing-tools.md`, `docs/coop4/STATE.md` |
| T1 | (optional, after the playtest) observer pose of a third-party team move | Opus | coop4 or Player Build | N1 | `src/anim/clips/team.ts`, `src/net/remoteAvatar.ts` |

Rules for every slice: never edit `src/game/course/`, `src/game/modes/courseMode.ts`, `src/world/maps/ctcourse*` (checker: `git diff --stat master -- src/game/course src/game/modes/courseMode.ts src/world/maps/ctcourse*` is empty). Never edit `src/ai/**` outside AI. Never write `PROTOCOL_VERSION`. Hot paths do not allocate.

## 4. Slice detail

### N0 - Slot model + TeamRef (Opus, ~1 h, first)
`src/game/playerSlots.ts` as in section 2. `SlotTable`: `assign(id)` lowest free 1..cap-1 or -1 when full; `host(id)` slot 0; `hold(id)` / `unhold(id)` keep the slot; `release(id)` frees it; `slotOf(id)` -1 when none; `compact(order: string[])` renumbers by order, host stays 0; `entries()`. Also `slotFromList(players, id)`, the list-order fallback matching `goggleSlot`. Tests `tests/playerSlots.test.ts`: assign 1, 2, 3 then full; a leave frees and the next joiner takes the lowest; hold keeps across rejoin, release frees; compact keeps relative order and host at 0; `PLAYER_SLOTS === MAX_PLAYERS === MAX_INTRUDERS` (the test may import all three). Pure: no Babylon, no `src/net` import.

### D1 - Devices per slot (Opus, ~2.5 h)
1. First (so N1 compiles): `SecWire.j: string[]`, `ch: number[]`, `cd: number[]` (ctDevices.ts:89-105).
2. Jam state slot-indexed: `jam`, `jamId`, `want`, `wantAt`, `cool` become `PLAYER_SLOTS`-long arrays (:273-300).
3. `CtHooks.slot?: () => number` (client's own slot, default 1; courseMode.ts:1178 passes nothing).
4. `me`: host 0; client `hooks.slot?.() ?? 1`, read each use.
5. `onRemoteJam(tgt, eye, slot = 1)` finds the ref whose `slot` matches (:801-818; `(r as Partial<TeamFields>).slot ?? index`); courseMode.ts:321 keeps its 2 args.
6. `fixedUpdate` (:840-862) loops every ref by slot; slots with no ref idle.
7. `wire()` sends `max(2, highest slot in use + 1)` entries, so the course output is byte-identical (:1136-1146).
8. `apply()` / `frame()` loop the received length (:1152-1160, :1198-1206); debug follows (:1258-1260).
Tests `tests/ctDevicesSlots.test.ts` (pure parts or a fake `GameState` as in `tests/jammer*.test.ts`): 4 slots jam 4 devices at once; slot 3's claim lands in entry 3; a 2-player course host gives exactly 2 entries with master's values for a scripted jam; a client with slot 2 shows its HUD line from entry 2; a held slot idles. e2e: `e2e-ctcourse` unchanged; `e2e-sectorops` part 7.

### H1 - Beacon and minimap colours (Sonnet, Marlow Build, ~1 h)
`BEACON` (goggleGlow.ts:14-18) gets 4 entries: blue, red (unchanged values), amber (idle ~1, 0.55, 0.05; on ~1, 0.75, 0.3), violet (idle ~0.6, 0.2, 1; on ~0.8, 0.5, 1). `CharacterRig.setBeacon(player: number)` takes 1-4, clamped (characterRig.ts:1744-1757; keep the hunk to setBeacon, Player Build also edits this file). `MinimapBlip.slot?: number`; ally dots use the beacon idle colour by slot, else `#3fc1ff` (minimap.ts:6, :86). Test `tests/beaconSlots.test.ts`: 4 distinct colours; entries 0 and 1 equal master. No call-site changes (N1 passes `slot + 1` and fills `blip.slot`).

### TM - Team-move arbitration (Sonnet, ~1.5 h)
`TeamRequest.bBusy?: boolean` (teamMoves.ts:55-59): when true `checkTeamRequest` returns the new denial `'taken'` before the mode checks; add `'taken'` to `TeamDenial`. teamController.ts:1003 text "Your partner is busy with someone else". Test `tests/teamMovesTaken.test.ts`: a braced b with `bBusy` gives `taken`; without it every existing case unchanged (table-driven). N1 passes `bBusy` from the host's active-move map.

### N1 - Net core (Opus, ~5 h, critical path)
- `protocol.ts`: `SECTOR_MAX = 4`; `capacity` returns `COURSE_MAX` for `course`, `SECTOR_MAX` for `sector`, else `COOP_MAX` (:38-41, fix the comment). `PlayerInfo.slot: number` (:45-56); the lobby parse (:771) clamps 0..MAX_PLAYERS-1, missing -> `slotFromList`. `secWire` (:588-620) parses `j / ch / cd` as arrays of 1..MAX_PLAYERS entries, padded to 2 with ''/0, truncated past 4.
- `session.ts`: owns a `SlotTable` (host 0; `assign` on a new player's hello :176-185; `hold` on away :291; `release` on drop or hold end :301-306 and lobby leave; `compact` in `startMatch` :354 in list order); `broadcastLobby` (:315-320) writes `slot`; `heldFor` unchanged; add `slotOf(id)` and `selfSlot`.
- `coopHost.ts`: `slotOf` (:395-404) reads `session.slotOf`; `spawnPoint` / `reviveOne` / `reviveAll` / `onRespawn` / `joinSpot` place by slot (:364, :1566, :1686-1711, :1714, :432-448); `remoteRefs` in slot order; `RemotePlayer.ref.slot` set at add and on lobby change; `ref.mv` from each accepted `pstate` (remotePlayer.ts:78, :140-165); recolour by slot (:240-245); ally blips carry `slot` (:1735); `reviveClock.cap = syringesFor(difficulty, teamSize at start)` (:193; default 2 until SM); `onTeamMove` (:995-1047) keeps `teamActive: Map<id, until>` (set for a and b at `tstart`, cleared on `tend`, denial or drop; timed moves: move length + 0.5 s), passes `bBusy`, denies `taken`.
- `coopClient.ts`: `slot()` (:369-378) reads `session.selfSlot`; own beacon `slot + 1`, glow by slot (:395); `CtDevices` client `slot: () => this.slot()` (:173); ally blips carry `slot` (:1167).
- `remoteAvatar.ts:199`: `setBeacon(slot + 1)` from `PlayerInfo.slot`, fallback `info.host ? 1 : 2`.
- `gameState.ts`: `localRef` gets `slot` and `mv`; `localSlot`; own beacon (:527-528) at `localSlot + 1` (re-set when `net` attaches); `playerRefsInto` (:1008-1016) in slot order; `teamRefsInto`, `teamSize()`; `aiRefs: TeamRef[]` (:502-503); host and solo fill `localRef.mv` once per fixed step before the AI.
- Tests: `tests/net.test.ts` (`capacity('sector') === 4`, `capacity('course') === 2`; slot parse clamp / missing / junk; `secWire` with 1, 2, 4, 6 entries; 4-player lobby round trip); `tests/coopRejoin.test.ts` (4 players; slots 2 and 3 drop and rejoin with tokens into the same slots; tokenless hello with two held refused; a lobby leave frees slot 1 for the next joiner; compact at start); `tests/snapBudget.test.ts` (synthetic 4-player 32-guard snap <= 6 KB; with 128 items <= 32 KB); course regression (2-player course lobby gives slots 0 and 1; a third hello is refused).
- e2e: `e2e-coop`, `e2e-netmove`, `e2e-ctcourse`, `e2e-course`, `e2e-sectorops` 1-6 (2 players, unchanged).
- Acceptance: typecheck; single player boots with no static `src/net` import; no allocation added on per-step paths (reused arrays; insertion pass over <= 4).

### SM - Sector rules for 3-4 (Opus, ~3 h)
- `sectors.ts`: `SECTOR.syringeExtra` 1, `SECTOR.reinforcePerExtra` 1; `syringesFor(preset, players = 2)` = preset + `syringeExtra` x max(0, players - 2) (:877); `SectorRun.teamSize` (set by the mode); `raiseAlarm` sends `perStage + reinforcePerExtra x max(0, teamSize - 2)` (:788, :840-843).
- `rooms.ts:22`: `SquadSlot.minPlayers?: number`.
- `sectorMode.ts`: at section load (:698-700) and restart set `run.teamSize = g.teamSize()` and skip slots with `minPlayers > teamSize`; live cap (:314) keeps `SECTOR.maxAlive`; `onEnemyKilled` (:1313) maps `attackerId` to a slot through `g.teamRefsInto` ('local' = local slot); `onRemoteJam` (:1343) passes the sender's slot; `checkpointSpawns` (:1201-1210) comment only; after the AI slice lands, call its team-size hook at section load (one line).
- `sectionRating.ts:191-224`: `SyncedDetector` over `PLAYER_SLOTS`: a takedown by slot p pairs with the most recent unused one by any other slot within `SYNC_WINDOW`; both consumed; 2-slot results identical (courseMarks).
- Tests: `tests/sectorTeamScale.test.ts` (syringes for 1-4 by preset; reinforcements per stage for 2, 3, 4; `minPlayers` filter; `maxAlive` holds); `tests/sectionRating.test.ts` (pairs across 4 slots: 0+2, 1+3, a triple counts once; old 2-slot cases unchanged). Until N1, `g.teamSize()` may be a local helper reading `playerRefsInto().length`.
- e2e: `e2e-sectorops` 1-6, `e2e-section-rating`.

### L1 - Lobby (Sonnet, Marlow Build, ~1.5 h)
`coopUi.ts`: slots shown = `capacity(s.mode)` (:481-485; Sector Ops 4 rows, Campaign 2); "Room full" text takes the cap (:87); host status "Share the code to invite your teammates." (:504); local autostart (:851-880) waits for `flags.players ?? 2`. `flags.ts:49-50, :124`: `players` (`?players=2..4`, dev and tests). e2e (`scripts/e2e-coop.mjs`, block "lobby caps"): a 3-page Sector Ops room shows 4 slots and starts; switching it to Campaign blocks Start with "Too many players for this mode (2)"; a 3rd page joining a Campaign room gets Room full. Marlow's lobby for 2 looks as today.

### AI - Guard AI over N players (Guard AI Build; `docs/coop4/briefs/AI.md`)
Intruder slots and last known positions up to 4 by `TeamRef.slot` (G139 generalised), target pick and perception over N, hearing and partner logic to teammates, alarm draw and radio, response teams sized for 4 through a team-size hook with a default. Depends on N0 types (code at once) and N1 live values (e2e). No other slice edits `src/ai`; SM calls the hook.

### DATA - Rebalance tags (Sonnet)
In `campusSectors.ts` (S1-S3), `campusS4Data.ts`, `campusS5Data.ts`, `warehouseSectors.ts`: at most 2 guards per section tagged `minPlayers: 3` or `4`, from extra posts on the team-door and split routes (or existing posts doubled), each with a `reason`; optional per-section `perStage` overrides only where the default exceeds `maxAlive`. Test: extend `tests/sectorGuardTags.test.ts` (<= 2 tagged per section; every tagged slot passes post / route validation; a team of 2 spawns exactly today's list). e2e: part 6 unchanged, part 7 sees the tagged guards.

### E2E - 4-page harness and suites (Sonnet, Opus fix round, ~5 h)
- `e2e-net-lib.mjs`: `hostAndJoin(url, 4, ...)` already takes n; add `slotsOf(pages)`, `eachPage(pages, fn)`, `LOAD_MS_4` (reads `E2E_LOAD_MS`, default 240000).
- `e2e-sectorops.mjs` part 7 "four operators" (campusOps, `net=local`, 4 pages): all load; slots 0-3 distinct on every page; beacon slot per page; spawns >= 0.9 m apart at start and after a checkpoint restart; each page sees 3 avatars; a switch press by slot 2 turns the lamp off on all 4 (light parity); a door lock mirrored on all; slot 3 jams a camera and all 4 show it with `sec.j[3]`; a pair bolt by slots 2+3 while 0+1 stand elsewhere; slot 1 down and revived by slot 3 (syringes left = scaled count - 1); each slot uses the crate once (second use refused); connector does not cycle with 3 inside, cycles with 4; tagged guards present (after DATA).
- Part 8 "drop, late join, team moves" (warehouseOps, 4 pages): slot 2 closes and reopens with its token and gets slot 2, its colour and its spot; a 4th page joins late into a 3-player op and is placed at the checkpoint on its slot; pairs 0-1 (leg-up) and 2-3 (throw) run at once, both approved; a second climber on a busy brace is denied `taken`.
- `run-e2e.mjs` `PARTS['e2e-sectorops']` adds '7' and '8' (run alone in a laptop slot). Acceptance: both parts pass twice in a row on the laptop GPU.

### DOC (Sonnet, ~1 h)
`docs/systems/coop.md` (cap table, slots / `PlayerInfo.slot`, `SecWire` arrays, team-move `taken`, bandwidth, protocol history "the train after 49"); `docs/systems/testing-tools.md` (parts 7-8, `?players=N`); `TESTING.md` (4-tab Sector Ops check); `changes/feature-coop4.md`; `docs/coop4/STATE.md` polish list; note for the orchestrator: CLAUDE.md line 8, bible 5.9 and DECISIONS at the merge.

### T1 - Observer team pose (optional, after Michael's playtest)
`teamPoseOfWire` (anim/clips/team.ts:419-454) links two remote avatars of one pair from `tstart` / `tend`, as `TEAM_LINK` links our own. Visual only, no wire change. Polish list until then (A21).

## 5. Order and parallel lanes
Day 0 (gates met):
- Lane A (coop4, Opus): N0, then N1 (start against N0; integrate when D1 step 1, H1 and TM are in).
- Lane B (coop4, Opus): D1 (SecWire widening first), then SM.
- Lane C (coop4, Sonnet): TM, then the E2E harness helpers, then parts 7-8 as features land.
- Lane D (Marlow Build, Sonnet, branch `feature/coop4-ui`): H1, then L1; the coop4 lead merges after its checker.
- Lane E (Guard AI Build): AI from N0's types.

Day 1: integrate N1 + D1 + SM + TM + H1 + L1; typecheck, unit tests; one Opus checker (net and devices) and one Sonnet checker (UI and data); laptop slice tier: `e2e:quick` + `e2e-coop` + `e2e-netmove` + `e2e-ctcourse` + `e2e-course` + `e2e-section-rating` + `e2e-sectorops` 1-8. DATA after SM; AI merges in the same train (SM adds the hook call). Then DOC, the PR, the train (one `PROTOCOL_VERSION` bump), Michael's 4-tab playtest; T1 only if the playtest asks.

Critical path: N0 (1 h), N1 (5 h), integration + checker (2 h), laptop (~1.5 h with 4-page parts), fix round (2 h), train: about 1.5 days wall at full burn.

## 6. Test plan
- Unit: `playerSlots`, `ctDevicesSlots`, `beaconSlots`, `teamMovesTaken`, `net`, `coopRejoin`, `snapBudget`, `sectorTeamScale`, `sectionRating`, `sectorGuardTags`; existing course, jammer, rating and sector tests unchanged.
- Marlow guard: `capacity('course') === 2`; course `SecWire` 2 entries with identical values; `SyncedDetector` 2-slot cases unchanged; empty diff in course files; `e2e-ctcourse` (1-4), `e2e-course`, `e2e-section-rating` on every integration.
- e2e on the laptop queue (`E2E_GPU=1`; 4-page parts alone in a slot, `E2E_LOAD_MS=240000`): `e2e-sectorops` 1-8, `e2e-coop` (with the lobby caps block), `e2e-netmove`, `e2e-ctcourse`, `e2e-course`, `e2e-section-rating`, `e2e:quick`; the train's full run covers the rest.
- GPU (laptop, 4189): one Sector Ops perf look with 4 operators and the tagged guards against the guard-render budget (report only).
- Manual (TESTING.md): 4 tabs with `?net=local&autostart=campusOps&mode=sector&players=4`.

## 7. Estimate
N0 1 h, N1 5 h, D1 2.5 h, SM 3 h, TM 1.5 h, H1 1 h, L1 1.5 h, DATA 2 h, E2E 5 h, DOC 1 h, checkers and fix rounds ~4 h; AI by Guard AI Build; T1 (optional) 2-3 h. Wall about 1.5 days with 4-5 lanes in parallel.
