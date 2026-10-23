# Gear and sweep points (lane D, S4 / S5)

Stealth-over-shooting decisions (2) helmets, (13) heavier late guards, (4) / (11) sweep. Data only; guard-ai reads it.

## Gear
- S1-S3: unset everywhere (test asserts it).
- S4 (`S4_SECTOR.gear = 'helmet'`): per-slot `'both'` on #6 (security room supervisor) and #14, #15 (NOC pair). The mobile supervisor (#20) stays helmet only.
- S5 (`S5_SECTOR.gear = 'helmet'`): per-slot `'both'` on #1-#4 (response team, role `response`) and #9, #10 (token room officers).
- Dogs (#2 S4; #6, #8 S5): no tag. `validateGuardAi` only rejects bad tag values and kind 'enforcer', it does not reject gear on a dog; the section default still applies to the section, so the engine must skip `kind: 'dog'` (guard-ai, `placeSlot`).
- Type gap: `SquadSlot` / `SectorGuard` have no `gear` field on this branch (only `SectorDef.gear` and `GuardSlotTags.gear` exist). The per-slot tag is carried by `GearGuard = SectorGuard & { gear?: GearTag }` (exported from `campusS4Data.ts`, local copy in `campusS5Data.ts`); once guard-ai adds `gear?` to `SquadSlot` the alias can go.

## Sweep points (`SectorDef.sweep`, x, z, ground storey)
- S4: [12.8, 17.0] service corridor; [-5.4, 17.0] kp-batt keypad door approach; [-7.0, 22.0] battery room; [6.4, 23.0] hall west aisle; [16.6, 33.2] cage front; [19.3, 36.6] hang-down landing in the cage (arm-noc bypass).
- S5: [-36.5, 33.5] vestibule; [-41.0, 33.4] anteroom side door (arm-ante bypass); [-43.0, 35.6] anteroom; [-43.0, 42.2] strongroom / token approach; [-42.0, 30.8] hall-door side; [-54.0, 45.4] terrace landing under the north parapet rappel (arm-front bypass).
- All are route points of the existing routes, so they sit on the verified nav grid.

## Tests (`tests/campusGear.test.ts`, 10)
S1-S3 no gear or sweep; S4 / S5 defaults and exact per-slot overrides; no dog has gear; `validateGuardAi` clean for all 5 sections; each sweep point (4-6 of them) walkable at storey 0 on the runtime nav grid and reachable (budget 200000) from every section reinforce point.
`npx tsc --noEmit` clean; vitest campusGear, campusS4, campusS5, campusS1, campusPosts: 132 / 132.
