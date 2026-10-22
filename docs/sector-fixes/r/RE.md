# RE - e2e coverage of slice R (`scripts/e2e-sectorops.mjs`)

The suite runs as five parts (`--part=N`; `run-e2e.mjs` expands `e2e-sectorops` to `:1`-`:5`, one job each).

| Part | Pages | Covers |
| --- | --- | --- |
| 1 | 1, then 2 | The suite before slice R: the three sections (objective, connector cycle, extraction, Ghost result), an alarm and its reinforcements, a kill breaking the Ghost, everyone down restarting at the checkpoint (M7), the M8 nav check, the co-op mirror |
| 2 | 1 (solo) | The leg-up search finds each planned lip from its spot, and nothing at R3N's east face or R3's A3 faces (the removed C1a / C2). Solo refusal at every co-op lip: the traverse button under it, and a top-gear (5, 4.0 m/s) run-up and jump at it. Solo running jumps off the nearest solo tops at the top gear: R2N -> R3N, R2S -> R3S, the S1 east lane's single pallet (1.0) over the 2.0 stacks at the monorail, and from the floor at the stacks; take-offs 0.6 / 0.3 / 0.05 m before the edge and a plain run off, no grip at 4.25+ held, no stack stood on. The engine links: monorail -> bay main -> deck; the sill climb-up, crouch-walk onto the deck and the way back; R3S's climb-up from the east lip and walk-off; the S3 platforms' climb-ups (crouched), let-go ways down, lip -> main and back, lip -> branch -> main. Every team door: bolted at the start, the near side refused, the far side's Unbolt, the partner through, re-bolted by a restart |
| 3 | 2 (`?net=local`) | Section 1 co-op: the sill (leg-up, relay, both onto the deck), the monorail (leg-up, hand over hand, let go), the mess door unbolted by the client |
| 4 | 2 | Section 2 co-op: R3S's C1b by the rope, then by the relay; the VNA gate |
| 5 | 2 | Section 3 co-op: the valve platform by the relay, the drive platform by the rope; the lobby door |

## Results (fix round head d85ce219)

Not run. The orchestrator's rule (2026-10-22 20:05) was the full R suites on the desktop
(`E2E_JOBS=2 E2E_PORT=4191 node scripts/run-e2e.mjs e2e-sectorops e2e-coop e2e-netmove`), only with the desktop's
`heavy.lock` free and CPU under ~60%. At the check the lock was held ("Night Shift | Orchestrator | gpu-desk | 20:15")
and CPU was at 71%, so the run was skipped (no wait, no retry).

- e2e-sectorops parts 1-5: pending (laptop test runner or the desktop once free), on d85ce219 or later.
- e2e-coop, e2e-netmove: pending, same.

Unit checks on d85ce219: `npx tsc --noEmit -p .` clean; eslint clean on the changed src / tests files;
`npx vitest run tests/warehouse tests/sector tests/attach tests/anchors.test.ts`: 16 files, 184 passed, 3 skipped.

## Checker notes (accepted)

- 6: `tests/sectorBolt.test.ts` does not cover the SectorMode / CoopHost wiring; e2e parts 2-5 do.
- 8: a client unbolting gets no feed line (only the local user does), per RT.md.
- 10: alarm / search nav vs bolted doors: the same exposure as the existing locked connectors; M8 is the backstop.
