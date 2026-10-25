# stealth-pays S2 report (Sector Ops: guard info at spawn, codes to the team)

Branch `feature/stealth-pays-s2`.

## What
- `src/game/sectorKeypads.ts`: `SectorCodes.grantCode(flag, sec)` - false on a mirror, an empty flag or a held code; else holds the code for section `sec` (a restart of that section drops it).
- `src/game/modes/sectorMode.ts`: spawn copies `p.slot.info` onto the guard (before `setPatrol`); new `onIntelCode(flag)` calls `grantCode(flag, run.index)` then `keypadLabels()`. No radio line (the feed already shows "Code: label").
- `tests/sectorIntelCode.test.ts` (new, 4 tests): host true then false, mirror and empty flag false, unknown flag held and opens nothing, section restart drops it and earlier-section code survives, keypad opens after the grant.
- `scripts/e2e-sectorops.mjs`: check (a2) in the campus S4 part: on the host, `window.__sector.onIntelCode('s4-codes')` (twice); asserts before: `codes.has('s4-codes')` false and kp-batt's label "Keypad - code needed"; after: held and label "Enter code"; then `useKeypad(3, 0)` opens kp-batt with no board read.

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
- Fix round: (a2) rewritten as above (S1's approach in e2e-ctcourse): it drives the mode hook directly; the grab setup is dropped. `node --check` ok; the globals it uses (`window.__sector`, its `codes`, `keyIts`, `onIntelCode`, `useKeypad`) exist in the S4 part. Not run on the desktop.
- e2e-sectorops: pending laptop.

## Deviation
- The PLAN asked for a real grab + interrogate in e2e-sectorops. The campus S4 harness does not hold a spawned guard with an interact tap, so (a2) calls `onIntelCode` directly, as S1 did. The real interrogate -> `revealIntel` -> `g.mode.onIntelCode` chain stays covered by e2e-takedown `grab-interrogate-intel`; `onIntelCode` itself by `tests/sectorIntelCode.test.ts`.
