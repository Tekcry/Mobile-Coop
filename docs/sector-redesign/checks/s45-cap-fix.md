# S4 + S5 fix round: the interactable cap

Branch `feature/sector-redesign-s45`, on 3fc36d79. Failure: GPU e2e-sectorops part 6, "the interactables stay under 128
(196)" (S4 block) and "the interactable list stays under the cap (196)" (S5 block).

## Diagnosis

The 128 is `MAX_ITEMS` (`src/net/protocol.ts`): the cap on the co-op `items` list the host mirrors to its clients
(`coopHost.items()`, resent on any change and every 2 s). The client also slices any received list to it
(`protocol.ts` parse), so raising it is a protocol change. The E6 check (Polish 1) asked S4 to assert the map's count
stays under it; the E9 brief (A107) puts crates in the first `items()` pass so the cap never drops one.

Every Sector Ops item is registered at the mode's start for every section (doors, switches, boards, hide spots and
alarms by `StealthSystems`; keypads, intel, desks and pair switches by the mode), and `items()` walked the whole list.
With S4 and S5 built the campus registers 196, so the list was cut at 128 in build order: the later sections' items
(S4 / S5 keypads, desks, boards) were the ones dropped, i.e. a client in S4 or S5 lost prompts.

Registered at 3fc36d79 (by the section file that builds / owns it):

| Kind | S1 | S2 | S3 | S4 | S5 | Total |
| --- | --- | --- | --- | --- | --- | --- |
| Doors (`door-*`) | 4 | 32 | 16 | 31 | 26 | 109 |
| Light switches | 5 | 7 | 9 | 8 | 9 | 38 |
| Isolator boards | 0 | 0 | 0 | 1 | 1 | 2 |
| Hide spots (never on the wire) | 5 | 4 | 5 | 5 | 6 | 25 |
| Alarm panels | 1 | 2 | 2 | 3 | 3 | 11 |
| Security desks | 0 | 0 | 0 | 1 | 0 | 1 |
| Keypads | 0 | 0 | 0 | 2 | 1 | 3 |
| Intel boards ("Read") | 0 | 0 | 0 | 1 | 1 | 2 |
| Pair-gate key switches | 0 | 0 | 0 | 2 | 2 | 4 |
| Team-door bolts | 0 | 0 | 0 | 0 | 0 | 0 |
| **Section total** | **15** | **45** | **32** | **54** | **49** | **195** |
| Objective / exit (current section only) | | | | | | 1 |
| **Registered** | | | | | | **196** |

No lockers or crates at this head (E9 adds one crate per section). 9 of the doors are connector doors (4 near, 4 far,
1 seal: the S1 dock door).

## Fix: mirror the live section only

Raising the cap was rejected: the client caps on parse (a protocol bump), the whole list grows with every section, and
a client has no use for another section's prompts (the sections are sealed behind locked connector doors, the S4
sealing test; guards and devices are already per section).

- `src/game/itemScope.ts` (new, pure): `itemInScope(section, scope)`; `ITEM_SCOPE_OFF` (-2) mirrors everything.
- `Interactable.section?` and `Interactables.scope` (default off), `inScope(it)`, `scopedCount()` (no allocation).
- Tags: `campusOps.build` tags each section file's door anchors (`Door.section`, set from the anchors that file's build
  added) and its switches, hide spots and boards (`section` on the layout entries); `StealthSystems` copies them and the
  alarms' existing `section` onto the items; the mode tags keypads, intel boards, desks; `SectorTeamDoors` tags bolts
  and pair switches.
- `SectorMode`: `scope` = the live section on `loadSection`, -1 on `unloadSection` (only untagged between sections),
  off on `dispose`. The connector doors (near, far, seal) are untagged at the start (`untagDoor`): always mirrored.
- `coopHost.items()` skips items out of scope. Untagged items (objective / exit, connector doors, revives, `c-` course
  devices, E9's crates unless they get a `section`) are always mirrored. Other modes leave the scope off: unchanged.
- No wire change (the same item shape, fewer items), `PROTOCOL_VERSION` untouched. The client already removes items
  that leave the list (`syncItems`), so a section change swaps the mirrored set in the next items snapshot.

Mirrored set per live section (wire kinds; plus 9 connector doors, the objective, 2 revives and 5 crates of headroom):
S1 24, S2 57, S3 42, S4 64, S5 59. The largest is half the cap.

## Tests

- `tests/sectorItemScope.test.ts` (new): the scope rule; every campus door, switch, hide spot, board, alarm and desk
  carries a section; every non-connector door stands in its own section's rooms only (a mis-tag would hide a reachable
  door from the client); each section's mirrored set with headroom is <= 100 and under `MAX_ITEMS`, while the whole map
  is over it.
- `tests/campusS5.test.ts`: the board check expects the layout's tagged copy (`section: 4`).
- `scripts/e2e-sectorops.mjs` S4 / S5 asserts now check the mirrored set: `scope` is the live section, `scopedCount()`
  < the registered total and <= 100 (the cap with headroom for E9 and the revives).
- `npx tsc --noEmit -p .` clean; `npm run lint` 0 errors; vitest on the 33 files matching interact / sector / campus /
  net / coop / security / desk: 605 passed (plus `detailPass`, `rooms`: 16 passed). No build, no e2e (the lead reruns
  GPU part 6).

## Risks / follow-ups

- A door, switch or board a player can reach from another section than its file's would lose its client prompt. The
  room check in the new test guards doors; switches and boards follow their section file's arrays.
- E9 (crates, protocol 35): crates can stay untagged (5 always mirrored) or take their section; either fits.
- Warehouse and other Sector Ops maps tag only the mode's own items (keypads, intel, bolts, pair switches, desks,
  alarms with a `section`); their world items stay untagged and are always mirrored, as before.
