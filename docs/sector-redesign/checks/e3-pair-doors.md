# E3 - pair bolt (EW3) and pair gate (EW4) in Sector Ops

Builder, feature/sector-redesign-e3 (base 95097957), 2026-10-23. Engine + data shape + unit tests. No map data, no
campus files, no protocol change (`PROTOCOL_VERSION` untouched).

## Built
- **EW3 pair bolt** (R2-PATHS design 2): `SectorBolt.pair: true`. The bolt draws only while another living player stands
  pushing the leaf on the near side: depth 0..`BOLT_PAIR_DEPTH` 1.5 m out from the plane on the side opposite `side`,
  within `boltHalfSpan` along it, feet within `BOLT_PAIR_RISE` 1.0 m of the user's height (`partnerAtDoor`). The user
  still needs `inBoltReach` on the bolt side. One player alone is refused from either side; `SectorBolts.use` (the old
  one-player path) always refuses a pair bolt. Plain bolts (the Warehouse's three) behave as before.
- **EW4 pair gate**: `SectorDef.pairGates`. The door starts locked; two "Turn key" switch items (`kind: 'switch'`,
  reach 1.4, the course devices'); both turned by two different players within the window (default the course's
  `PAIR_WINDOW` 1.0 s, either order) unlock it for both and put both switches off. Same rule as the course: the
  course's `CourseState.pressPair` now calls the shared `pressPairHalf` (`src/game/pairPress.ts`), Sector calls it with
  `solo = false` (no dev solo flag in Sector).
- Both host-authoritative: the host resolves the user from `by` (local / client peer id), takes the feet from
  `playerRefsInto`, decides, then unlocks the door (`lockDoor`) and sets `secT = 0` so the client's `lk` goes at once.
  The client mirrors the items through the existing snapshot `items` (ids `c-...`, kept by the item cap) and its use
  comes back as the existing `use` message (the host's `onUse` reach check applies). No wire change.
- **Nav closure** follows the door state for both kinds: shut at build, open when the bolt draws / the gate opens, shut
  again on a restart (same closure size as r2-nav: width + 0.5 along, 0.35 across).
- **Restart (A50 / M9)**: `SectorTeamDoors.reset(sec)` re-bolts the section's bolts and locks its pair gates (keys
  forgotten, switches back on, doors locked, nav shut), called where `rebolt` was.
- The mode's bolt code moved out of `sectorMode.ts` into `src/game/sectorTeamDoors.ts` (Babylon-light, a narrow
  `TeamDoorHost`), so the wiring and the nav closure are unit-tested against a real `NavGrid`. `useBolt`, `boltInfo`
  and `debug().bolts` stay; added `turnKey`, `pairGateInfo`, `debug().pairGates`, `boltInfo()[i].pair` / `.nav`.

## Data shapes (paste-ready)
```ts
// in a SectorDef: a pair bolt (the team door is worked from +x; the partner pushes from -x, within 1.5 m)
bolts: [{ at: [12.0, -6.4], side: [1, 0], w: 1.2, pair: true }],

// in a SectorDef: S4 CR5 dual-custody rear gate (two key switches 8 m apart), default 1.0 s window
pairGates: [
  {
    door: [31.2, 18.6],                                   // the gate's plan centre (found by Doors.nearest, 1.2 m)
    a: { at: [27.0, 15.0], y: 1.1, yaw: Math.PI / 2, label: 'Turn key (west post)' },
    b: { at: [33.0, 22.4], y: 1.1, yaw: 0, label: 'Turn key (north post)' },
    // window: 1.0,                                       // optional, s; default PAIR_WINDOW (course, 1.0)
  },
],
```
The coordinates above are placeholders: the map slice sets the real ones. `y` defaults to the door's hinge height,
`yaw` to 0, `label` to `PAIR_SWITCH_LABEL` ('Turn key'). The door itself must be built `locked: true` in the map like
the bolt doors (the mode locks it anyway at start). `checkSectors` refuses both keys in one place and a window <= 0.

## Files
- New: `src/game/pairPress.ts`, `src/game/sectorTeamDoors.ts`, `tests/sectorBoltPair.test.ts`,
  `tests/sectorPairGate.test.ts`, `tests/helpers/teamDoorRig.ts`.
- Changed: `src/game/sectors.ts` (`SectorBolt.pair`, `BOLT_PAIR_DEPTH`, `BOLT_PAIR_RISE`, `partnerAtDoor`,
  `SectorBolts.press`, `SectorKeySwitch`, `SectorPairGate`, `SectorDef.pairGates`, `SectorPairGates`, `pairSwitchId`,
  `pairGateById`, checks), `src/game/modes/sectorMode.ts` (delegates to `SectorTeamDoors`),
  `src/game/course/courseState.ts` (`pressPair` uses `pressPairHalf`; same behaviour, course tests pass).
- Not touched: `src/net/*` (the client mirror needs nothing new: switch items are generic, a pair bolt keeps its side
  from the client's own map data), `src/ai/*`, security, ctDevices, warehouse / campus files, BRIEF / SPEC / PLAN /
  STATE, CHANGELOG, package.json.

## Assumptions
- P1 The pair gate only unlocks its door (the course `PairGate` rule); a player still opens the leaf. Undo: add
  `setOpen(door, true)` in `SectorTeamDoors.openDoor` for gates.
- P2 The partner must be alive (`target.alive`); a downed player cannot turn a key or push the leaf.
- P3 Player identity for the gate is the index in `playerRefsInto` (0 = host); stable within a 1 s window.
- P4 Feed lines go to the host's own player only. A client refused at a pair bolt, or turning the first key, gets no
  line (no host-to-client feed message; R2-PATHS "Open"). Its prompt still says "Unbolt" / "Turn key".
- P5 The pair bolt's user check is the bolt side reach (`inBoltReach`, 1.2 m deep); the partner's is 1.5 m on the
  near side, the door span, and the same floor (1.0 m rise), as R2-PATHS specified.
- P6 No minimum key-switch spacing in `checkSectors` (the two-player rule already stops one player); the 8 m / 9 m
  spacing is the map's design data.
- P7 Gates and bolts of any section can be worked once built (as the bolts before); a restart resets the current
  section's only.

## Tests
- `tests/sectorBoltPair.test.ts` (12): `partnerAtDoor` geometry; alone refused by `use` and `press` from either side;
  partner on the bolt side / another floor / too far refused; near side draws once; plain bolt unchanged; rebolt;
  world wiring (locked, nav shut, item side), solo refused with the feed, downed partner refused, client use with the
  host pushing opens door + nav + item, restart re-bolts and needs both again, unknown user refused.
- `tests/sectorPairGate.test.ts` (15): window = course `PAIR_WINDOW` 1.0; shared rule (either order, same player
  refused, solo flag); one player never opens; two players open; window edges and forgetting; data window override;
  restart forgets a pending key; ids round trip; `checkSectors`; world wiring (switch items, labels, heights), one player
  refused, host + client open door + nav, keys off, restart shuts all, mode clock `now`, downed player refused.
- Results: `npx tsc --noEmit -p .` clean; vitest `sectorBoltPair`, `sectorPairGate`, `sectorBolt`, `navClosure`,
  `sectorRestart`, `sectors`, `course`, `ctcourse`, `courselab`, `courseTutorial`: 10 files, 171 tests pass; eslint
  clean on every changed file.
- e2e: none added. No map has a pair bolt or gate yet, so an appended e2e block would have nothing to run on without
  mutating map data at runtime; add it with the S4 / S5 map slice (host + client: client alone refused, host pushing
  on the near side accepted; two key turns within 1 s). Not run (no build).
