# Slice 0 check (engine prerequisites)

Checker: fresh read-only review, 2026-10-23. Scope: `git diff 0293a793 b0b7bc24 -- src tests` (commits 327ed8be,
4d09bcf2; docs commits and slice L ignored). Worktree HEAD at check time: 082cb7f2 (slice L merged on top).

## Verdict: PASS

No blocking findings.

## Items

- EW1 armed guards: the three Warehouse runners are grunts (`warehouseSectors.ts` S1 g2, S2 g6, S3 g4); reinforcements
  spawn `SECTOR_REINFORCE_KIND` ('grunt', `sectorMode.ts` raised); `checkSectorGuards` (`sectors.ts`) fails heavies and
  gunless humans and runs inside `checkSectors`. OK.
- EW2 camera cap: `liveCameraPeak` (untagged + busiest section) against 12, total against `WIRE_CAMERAS` 16; a test
  reads `SEC_CAMS` from `net/protocol.ts` as text, so no static `src/net` import. Warehouse peak 3. OK.
- EW11 dogs: `dogs` cap (default 0), handler must exist, not itself, human and armed. `strikeTargetable` skips dogs in
  target pick (`strikeController.ts:93`) and in the host-side resolve (`:232`, covers client requests). OK.
- EW12 restart reset: `SectionStartState.take` at every `beginSection(kit)` (match start and after each connector
  cycle, after the far door is unlocked and opened), `apply` on restart after the connector / team door re-locks;
  locked doors and flashlights skipped; restart during a cycle re-takes instead. `LightRegistry.resetTo` clears EMP,
  restores shot lamps, sets a jammed lamp's base. `syncSwitches` re-reads switch labels. OK.
- Guard tags: optional data fields only; no `src/ai` changes in the diff. OK.
- Warehouse Ops: only the runner->grunt swap and the S2 tour guard's last wait 7 -> 12 (A46). OK.
- Hot paths: none touched per frame. `syncSwitches` / `apply` / `take` run on restart or section start only;
  `liveCameraPeak` is validation only. Strike pick adds a boolean call, no allocation.
- Single player / `src/net`: no new static import (`sectorReset.ts`, `sectors.ts`, `security/data.ts`, `sectorMode.ts`).

## Tests run

- `npx vitest run tests/sectors.test.ts tests/sectorSlice0.test.ts tests/sectorRestart.test.ts tests/sectorBolt.test.ts`:
  4 files, 54 tests passed (all four files exist).
- `npx tsc --noEmit -p .`: exit 0, no errors.
- No full suite, e2e or build (as instructed).

## Polish (non-blocking)

1. EMP edge (`sectorReset.ts` apply): a lamp off at section start, switched on, then EMP'd when the restart lands, reads
   `was` 0 = start 0, so it is skipped and its `outFor` stays; when the EMP times out the lamp comes on (should stay
   off). Clearing `outFor` for every recorded lamp, or comparing `l.on`-with-EMP, would fix it. Seconds-long window.
2. `apply` closing a crack calls `doors.crack(d, false)`, which plays the crack sound on restart (cosmetic).
3. `apply` shuts unlocked doors while a pause-menu restart may have a live player in the doorway; the respawn 0.3 s later
   moves them, so no stuck state expected, not verified in e2e.
4. `lastReset` allocates a new object per restart and `debug()` spreads it (restart / debug only; fine).
5. `checkSectorGuards` uses `forEach` with a closure (validation only; fine).
6. Restart during a cycle unlocks the far door but does not open it, unlike the normal cycle (pre-existing behaviour;
   the new `take` then records it shut, consistent).
