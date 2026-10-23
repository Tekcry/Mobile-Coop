# stealth-pays S2 report (Sector Ops: guard info at spawn, codes to the team)

Branch `feature/stealth-pays-s2`.

## What
- `src/game/sectorKeypads.ts`: `SectorCodes.grantCode(flag, sec)` - false on a mirror, an empty flag or a held code; else holds the code for section `sec` (a restart of that section drops it).
- `src/game/modes/sectorMode.ts`: spawn copies `p.slot.info` onto the guard (before `setPatrol`); new `onIntelCode(flag)` calls `grantCode(flag, run.index)` then `keypadLabels()`. No radio line (the feed already shows "Code: label").
- `tests/sectorIntelCode.test.ts` (new, 4 tests): host true then false, mirror and empty flag false, unknown flag held and opens nothing, section restart drops it and earlier-section code survives, keypad opens after the grant.
- `scripts/e2e-sectorops.mjs`: check (a2) in the campus S4 part: a spawned guard with `info.codes` = `s4-codes` is grabbed and interrogated; `kp-batt` opens with no board read.

## Why
Interrogation codes were text only in Sector Ops (BRIEF A4, interrogation-intel part B).

## Tests
- Vitest: sectorIntelCode, sectorKeypad, intel, sectorRestart: 48 passed. tsc clean. eslint clean on the three touched src/test files.
- e2e-sectorops: see the result line below (desktop run started under heavy.lock before the no-desktop-e2e rule; the new check (a2) lives in the campus S4 part, run as `--part=6`).

## Open items
- No Sector map authors `info` yet; play is unchanged until a map owner adds one.
- Hang-down client interrogation gap stays parked (P1).

## Changelog
"Sector Ops: interrogation door codes open keypads." (`changes/feature-stealth-pays-s2.md`)

## e2e-sectorops result
- Desktop GPU run (lane 1, 673 s): parts 1, 2, 3, 4, 5 ok; part 6 FAIL at the new check (a2): `{"spawned":true,"held":false,"before":false,"after":false,"open":false}`. The guard was never grabbed: the check's grab setup (interact tap at 1.2 m behind the spawned guard at the S3 connector checkpoint) does not hold him in the campus S4 harness. This is a test-harness problem, not a verdict on `onIntelCode` (covered by the Vitest file). Not rerun (no more desktop e2e).
- e2e-sectorops: pending laptop. Fix (a2) there first: take the grab as `scripts/e2e-takedown.mjs:269-299` does (find the spawn spot with a clear floor; check `g.takedown.hostage` before picking), or drop the check.
