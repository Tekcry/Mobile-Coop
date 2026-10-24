# Slice 0 - devices and wire (N6, N1 pass zone)

Implementer report, 2026-10-23. Job marlow-final, branch `feature/marlow-final`. Nothing committed (the job lead commits).

## Built
- **N6, several scanner pairs.** `CtDevices` builds every `lay.scanners` entry whose two course devices exist (was only
  `[0]`), as `readonly scans: ScanRt[]` in the map's order. Each pair steps on its own (`stepScans` -> `stepScan(sc)`),
  has its own radio throttle, and `scanPress(cid, p)` finds the pair by device id. `scan` stays as a getter for the
  first pair (`scans[0] ?? null`), and `debug().scan` is still the first pair (the e2e-ctcourse station 6 checks read
  it); `debug().scans` lists every pair (now with `id` and `flag`).
- **Glow placement from the device.** The state glow and the ready glow sit on the panel face: `SCAN_GLOW.back` (0.1 m)
  behind the device point along its facing (sin yaw, cos yaw; yaw 0 faces +z, the `buildPanel` convention), at the
  device's `y` + 1.95 / + 2.25. Marlow's station 6 (z 0.4 yaw 0, z 13.6 yaw pi) gives exactly the old hard-coded
  z 0.3 / 13.7 (tested).
- **Panel floor.** `atPanel` checks the player's feet within 1.5 m of the device's `y` (was the ground, y 0): a time lock
  on a raised floor works. Marlow's devices are at y 0: unchanged. The failed-hack damage point is at the device floor
  + 1.4.
- **Wire (protocol 30).** `SecWire.sc` is `number[][]`, one entry per pair in the map's order: `[phase A, phase B,
  occupied bits, progress A, B (tenths of s)]` (`packScan` / `unpackScan` in `scanners.ts`). The parser caps it at 8
  pairs, clamps each number as before and reads a non-array entry as idle in its slot (the order is kept).
- **N1, `PassZone.any`.** `PassZone` moved to the new pure `src/game/passZones.ts` (re-exported from `ctDevices.ts`, so
  `mapDef.ts` and `ctcourse.ts` imports are unchanged) with a new optional `any?: boolean`. `passZoneNeed(any, n, solo)`:
  any or the dev solo flag -> 1 player, otherwise every player (at least 2), as before. Floor, alive, hallway rule and the
  bay-restart re-arm are unchanged and apply to `any` zones too.

## Files
- `src/game/ctDevices.ts` (pairs, glows, wire, apply, debug, dispose, pass zone rule)
- `src/game/scanners.ts` (`SCAN_GLOW`, `scanGlowAt`, `SCAN_WIRE_LEN`, `packScan`, `unpackScan`)
- `src/game/passZones.ts` (new: `PassZone`, `passZoneNeed`)
- `src/net/protocol.ts` (`PROTOCOL_VERSION` 30, `SEC_SCANS` 8, `scanEntry`)
- Tests: new `tests/marlowN6Scanners.test.ts`, `tests/marlowPassAny.test.ts`; version asserts in `tests/jammer.test.ts`,
  `jammerFixes.test.ts`, `moveState.test.ts`, `net.test.ts` (also the refusal test: 29 refused, 30 joins),
  `rejoin.test.ts`, `sectorStep3.test.ts`. No script asserts the version (grep of `scripts/`).

## Protocol bump
29 -> 30 (master was at 29). Reason in the `PROTOCOL_VERSION` comment: `sec.sc` is one entry per pair; a 29 peer sent
one flat entry, so a mixed pair would misread it (the host refuses a 29 `hello`).

## Assumptions (Michael asleep, logged)
- A1: device `yaw` is the panel's facing (out of the wall, towards the player), as in `buildPanel` and Marlow's data. Undo:
  flip the sign in `scanGlowAt`.
- A2: `PassZone.any` counts any player, no role check (the step's line says who goes; N1 "B past x"). Undo: add a role
  field later and filter in the zone loop.
- A3: a `lay.scanners` entry whose device is missing is skipped on both pages (same layout, same list: the wire stays
  aligned).

## For the job lead
- `PassZone` (with `any`) lives in `src/game/passZones.ts`, not `courseDef.ts`. A course step's `done` can use the zone's
  flag like any other course flag; list it (and each scanner pair's flag) in `def.externalFlags`, as station 3's `S3_FLAG`
  is (`validateCourse` fails on a step flag nothing sets).
- `docs/systems/coop.md` line 24 still says `PROTOCOL_VERSION` 29; I did not edit docs beyond this report. Suggested text:
  "30: `sec.sc` is one entry per scanner pair (marlow-final N6)".
- `npx tsc --noEmit` briefly showed errors in `src/game/course/courseState.ts` (the other agent's work in progress); the
  rerun was clean.

## API for set builders (course data)
Two scanner pairs (A7 and A8) and one-player pass zones, in the map's layout:

```ts
import type { ScannerDef } from '../../game/scanners';
import type { PassZone } from '../../game/ctDevices'; // or '../../game/passZones'

// course devices: x, y (floor), z, yaw (the panel faces along (sin yaw, cos yaw)); the panel's mesh is the map's
devices['a7-t1'] = { x: 85.6, y: 0, z: 63, yaw: -Math.PI / 2, label: 'Terminal one (hack)' };
devices['a7-t2'] = { x: 96.4, y: 0, z: 63, yaw: Math.PI / 2, label: 'Terminal two (hack)' };
devices['a8-t1'] = { x: 136, y: 0, z: 67.6, yaw: Math.PI, label: 'Time lock one (hack)' };
devices['a8-t2'] = { x: 145.6, y: 0, z: 62, yaw: -Math.PI / 2, label: 'Time lock two (hack)' };

const scanners: ScannerDef[] = [
  { id: 'sc-a7', a: 'a7-t1', b: 'a7-t2', flag: 'a7-sync' },
  { id: 'sc-a8', a: 'a8-t1', b: 'a8-t2', flag: 'a8-sync' },
];
// layout: { ..., scanners, passZones, course: { def, devices, ... } }; def.externalFlags lists 'a7-sync', 'a8-sync',
// 'a8-beams', 'a8-gallery', 'a8-lobby'
// gates: { kind: 'flag', id: 'g-a7', flag: 'a7-sync', doorId: 'A7-east' } (as station 6's g-s6)

const passZones: PassZone[] = [
  // "B east of x 140": one player is enough
  { id: 'p-a8-beams', box: [140, 56, 146, 68], flag: 'a8-beams', any: true },
  // "A on the gallery": a floor height for a raised zone
  { id: 'p-a8-gallery', box: [106, 75, 134, 78], flag: 'a8-gallery', floorY: 4.4, any: true },
  // "both in the vault lobby": the plain zone (both players)
  { id: 'p-a8-lobby', box: [134, 56, 146, 68], flag: 'a8-lobby' },
];
```

CourseMode already makes both panels of every `lay.scanners` entry a "Hack scanner" device (`courseMode.ts` 189), so no
mode change is needed for a second pair. Panels 2 m reach (`SCANNER.reach`), the player within 1.5 m of the device's `y`.

## Tests
- `npx tsc --noEmit`: clean (after the other agent's courseState edits settled).
- `npx eslint` on the 4 source files and 8 test files: clean.
- `npx vitest run tests/marlowN6Scanners.test.ts tests/marlowPassAny.test.ts`: 2 files, 15 tests passed.
- `npx vitest run tests/scanners.test.ts tests/jammer.test.ts tests/jammerFixes.test.ts tests/moveState.test.ts
  tests/net.test.ts tests/rejoin.test.ts tests/sectorStep3.test.ts tests/laserAlarm.test.ts tests/laserPanels.test.ts
  tests/ctcourse.test.ts`: 10 files, 226 tests passed.
- e2e not run (job lead sends them to the laptop): `e2e-coop`, `e2e-netmove` (wire change) and `e2e-ctcourse` (station
  6 scanners, station 3 pass zone).
