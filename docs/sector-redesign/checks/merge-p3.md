# PR 3 integration (feature/sector-redesign-p3)

Base: origin/feature/sector-redesign @ f29a43da (PR 2 head, master 4.71.0, 098b3f47). Merged origin/feature/sector-redesign-s45
@ 5bee8eff, then origin/feature/sector-redesign-e9 @ 1bb9516c.

## Conflicts
- `scripts/e2e-sectorops.mjs` (s45 merge): both sides appended at the same spot after the S3 part. Rebuilt as PR 2's
  guard-ai blocks (posts, camera body report) then s45's S4 / S5 parts, each `if` closed. `node --check` passes.
- `changes/feature-sector-redesign.md` (e9 merge): both lines sets kept (S4 / S5 greybox, then the crate lines).
- `docs/sector-redesign/briefs/E9-CRATE.md` (add/add): e9's version (protocol 35 assigned).
- `src/game/interactables.ts`: both fields kept (`section` from the cap fix, `spent` from E9).
- `src/net/coopHost.ts` `items()`: one loop with both rules: course devices and crates in the first pass (E9, A107), and
  only in-scope items (`Interactables.inScope`, cap fix).
- `campusSectors.ts` / `campusOps.ts` merged clean.

## Join items
- (a) E9 crates for S4 / S5 from the e9-build.md table: `S4_AMMO_CRATE` (25.2, 0, 6.8) yaw -PI/2 and `S5_AMMO_CRATE`
  (-17.2, 0, 27.0) yaw 0 now feed `S4_SECTOR.crate` / `S5_SECTOR.crate`. `checkSectorCrates` and the nav cell / facing
  test pass; `weaponsCrate.test.ts` campus count 5, stub filter dropped. `sectorMode.findCrates` now tags each crate with
  its section index, so a co-op host mirrors only the live section's crate (`itemScope.ts` comment updated).
- (b) No enforcer in a campus section guard list: S4 #6 and #20 (supervisors) are officers, S5 #1-#4 (response team)
  grunts; roles, reasons and the counts (S4 20, S5 24) unchanged. `campusS4/S5.test.ts` kind lists updated. SPEC tables
  (S3 row 15, S4 rows 5-6 and 20, S5 rows 1-4), the escalation lines (S4 stage 3, S5 stage 2-3, the general
  reinforcement note) and EW1 now say officer / grunt, matching the SPEC Guards note.
- (c) `tests/sectorItemScope.test.ts`: every section-tagged switch, board, hide spot, alarm, desk, keypad, intel board,
  bolt and pair switch stands in its own section's rooms only (the door test's rule). Crates are the exception by design:
  each stands at its section's start, which from S2 on is inside the previous section's connector; the test asserts that
  (within 3 m of the start, inside the connector box), and they are enabled and mirrored only while their section is live.
  No other tag failed.

## Checks
- `npx tsc --noEmit -p .` clean; `npm run lint` 0 errors (41 pre-existing warnings).
- Vitest, 52 files (campus, sector, warehouse, security, laser, isolator, keypad, pair, desk, crate, weapon, interact,
  net, coop, protocol, wire, noAmmo, enemyLights, incidents): 810 passed, 3 skipped.
- No build, no e2e (GPU lane).

## For the GPU runs
- sectorops part 6: S4 / S5 crates are new; the S4 crate is 1.7 m from the C3 checkpoint, the S5 one 2.2 m from C4's.
  S4 #6 / #20 and S5 #1-#4 changed kind (walk speed 0.88 -> 0.935 / 0.99 m/s: route timings shift slightly; no shields).
- coop / netmove: crates now drop off the wire outside their section (tagged); the E9 co-op crate leg (warehouse
  `racking-crate`, section 2 live) is unaffected. Watch the client prompt at each section start.
- warehouseSectors.ts still has three enforcers (one each in the service, racking and floor sections, lines 56 / 106 / 163); not in this PR's scope. If guard-ai's
  `validateGuardAi` reports them, they need the same officer swap.
