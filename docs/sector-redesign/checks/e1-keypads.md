# E1 build report - EW5 keypads with codes found in intel (builder: Opus 5.5, 2026-10-23)

Branch `feature/sector-redesign-e1` (base 95097957). Nothing committed. Engine, data shape and unit tests only: no map
data, no campus files, no e2e edits, no build, no e2e run. Assumptions are numbered K1.. for the lead to renumber.

## Result
Done. A Sector section can list keypad doors and the intel that gives their codes. A keypad door stays locked until the team
holds its code flag; the flag comes from an overheard talking pair (stand in a zone N s), a readable board ("Read"), or the
section's objective (the S2 BMS hack). Host-authoritative; the co-op client sees the door unlock through the existing door
locks (`lk`) in the `sector` message and the line as the existing `feed` event. No protocol change, `PROTOCOL_VERSION`
untouched. A section restart drops the codes found in it and locks its keypads again (A50).

## Data shape (`src/game/sectors.ts`, optional fields on `SectorDef`)
```ts
keypads?: readonly { at: [x, z]; code: string }[];        // door found by position (Doors.nearest 1.2 m), as bolts
intel?: readonly (
  | { kind: 'overhear'; grants: string; line: string; box: PlanBox; floorY?: number; hold?: number } // hold default 4 s
  | { kind: 'board'; grants: string; line: string; at: [x, y, z]; yaw?: number }                    // "Read", 1 s hold
  | { kind: 'objective'; grants: string; line: string }                                             // on the section objective
)[];
```
Example the map builders can paste (S2 kp-fac, and the S2 hack giving the lab block's codes; coordinates are placeholders):
```ts
// in the S2 SectorDef
keypads: [{ at: [-4.0, -12.0], code: 'kp-fac' }],
intel: [
  // the coffee pair #5-6 at the L1 kitchen: stand in earshot 4 s
  { kind: 'overhear', grants: 'kp-fac', line: 'They said it: the facilities code. Keypad is yours.', box: [-14, -10, -10, -6], floorY: 4.4 },
  // the comms-room handover board
  { kind: 'board', grants: 'kp-fac', line: 'Handover board. Facilities door code, top line.', at: [-20.0, 5.6, -2.0], yaw: Math.PI / 2 },
  // the BMS hack: one flag for every lab-block keypad
  { kind: 'objective', grants: 'labs', line: 'Building controls are ours. Lab door codes logged.' },
],
// in S3 / S4 / S5
keypads: [{ at: [/* kp-store */ 0, 0], code: 'labs' }, { at: [/* kp-sec */ 0, 0], code: 'labs' }],
```
`checkSectors` (via `checkSectorCodes`) refuses: a keypad whose code is not found in an earlier section or by an overhear /
board intel in its own section (its own objective may sit behind it), a line over 60 characters, an overhear hold <= 0.

## Files
- New: `src/game/sectorKeypads.ts` (`SectorCodes`: pure state, grant / hear / objectiveDone / useKeypad / restart;
  `inOverhear`), `tests/sectorKeypad.test.ts` (17 tests).
- Edited: `src/game/sectors.ts` (types `SectorKeypad`, `SectorIntel`, constants `KEYPAD_REACH` 1.6, `KEYPAD_HOLD` 1,
  `OVERHEAR_HOLD` 4, `BOARD_READ` 1, `INTEL_LINE_MAX` 60, ids `keypadItemId` / `intelItemId`, `checkSectorCodes` called
  from `checkSectors`), `src/game/modes/sectorMode.ts` (`findKeypads`, `enterCode`, `learned`, `rekey`, `overhearStep`,
  the bolts' nav closure factored into `navClose`, test hook `useKeypad`, `debug()` gains `codes`, `keypads`,
  `keypadLocked`), `src/game/gameState.ts` (`NetHooks.radioLine?`), `src/net/coopHost.ts` (`radioLine`: pushes the
  existing `feed` event), `changes/feature-sector-redesign.md` (one line).

## Assumptions
- K1 Keypad use: a keypad item at the door centre (kind `door`, 1 s hold, reach 1.6, either side). With the code it reads
  "Enter code" and unlocks the door for both (the door is not opened); without it "Keypad - code needed" and the use is
  refused with "Locked - find the code". Undo: auto-unlock on the grant instead of the item.
- K2 One flag per intel (`grants: string`); several keypads share a flag (the BMS hack's `labs`). Undo: `grants: string[]`.
- K3 Overhear is a zone only: any living player in the box for `hold` s in a row (leaving resets). The talking pair being
  alive / calm is not checked (guard-ai owns pairs; the map places the zone at the pair). Undo: gate `hear` on the pair.
- K4 Restart (A50): the restarted section's codes are dropped (a code first found in an earlier section stays), its intel
  can be found again (boards back on) and its keypad doors lock again, even when the code is still held from earlier.
- K5 The subtitle: host / solo `hud.barks.say('lantern', line, true)` (the radio subtitle line); the co-op client gets the
  line as the existing `feed` event (a HUD feed line, not the subtitle box). Making the client show it as a subtitle is a
  one-line change in `coopClient`'s `feed` case (nothing else sends `feed`). Lines are capped at 60 characters (the feed
  text cap) by the data check. The line text is map data, so G82 / no reference-game names are the map writer's.
- K6 A locked keypad door is a nav closure (the team doors' sizes), opened when the keypad takes the code.
- K7 Every keypad and board item is live for the whole run (devices in other sections are behind locked connectors).

## Tests
`npx tsc --noEmit -p .` clean; eslint on the changed files clean; vitest sectorKeypad + sectors + sectorRestart + sectorSlice0 + sectorBolt: 5 files, 71 tests pass. `tests/sectorKeypad.test.ts` covers: locked until the flag; each intel kind
grants (overhear hold and reset, board once, objective); restart drops the section's codes and shuts its keypads, earlier
codes stay; a host-false mirror never grants; bad indices; the data checks; and the mode wiring on a stub game (doors
locked at the start, a door without a keypad untouched, refuse without the code, board grants with one line to the HUD and
the client, unlock, restart re-locks and puts the board back, a section without keypads adds nothing).

## Not done / for the lead
- No e2e (the e2e suite owner adds a keypad part with the campus data).
- `docs/systems/*` and `TESTING.md` not updated (engine only, no playable map data yet).

## Fix round (checker K3, K5)
- K3 fixed: overhear intel takes an optional `talkers?: number[]` (indices into the section's `guards`). `SectorMode`
  keeps `slotEnemy` (guard index -> enemy, filled when the guard spawns, cleared on load / unload); the hold only runs
  while every talker is alive and not knocked out (not spawned yet counts as not talking), and resets otherwise.
  `checkSectorCodes` refuses a talker index outside `guards`. Reinforcements are never talkers. Omitting `talkers`
  keeps the zone-only behaviour. Paste-ready example (the coffee pair is guards 5 and 6 of the section):
  `{ kind: 'overhear', grants: 'fac', line: 'Kitchen talk: facilities code is still the old one.', box: [20, 20, 24, 24], floorY: 4.4, talkers: [5, 6] }`
- K5 fixed: `coopClient` `feed` case now calls `g.hud.barks.say('lantern', e.text, true)`, so the client sees the radio
  subtitle like the host. `radioLine` (coopHost) is the only sender of `feed`.
- Tests: `tests/sectorKeypad.test.ts` adds the talker range check and the mode-level overhear (KO talker no grant, missing
  talker no grant, both alive grant after `hold`).
