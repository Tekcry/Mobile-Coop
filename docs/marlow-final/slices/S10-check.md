# S10 check (fresh checker, WIP dfee91c3)

Verdict: **PASS**

Checks: `npx tsc --noEmit` clean. `npx vitest run tests/marlowWalkS10.test.ts tests/ctcourse`: 13 files, 577 passed, 1 skipped.
PROTOCOL_VERSION still 33; no `src/net` wire change (coopClient.ts only reads an existing banner title). e2e not run (per brief).

## W1 camera bulletproof - delivered
`securitySystem.shotRay` skips `destroy()` for `def.armoured`, counts a ricochet, calls `onRicochet` (sparks + impact sound in gameState). Jam / loop / off use `setMode`/`applyJam` and never go through `shotRay`, so they still work. Rule `ARMOURED_FROM_SET = 3` applied in `ctcourse.ts` to every Marlow camera (A3, A4, A7, A8; A1/A2 have none). Host decides; client camera state mirrors the host's `dn` list, so host and client agree. Camera damage has no other path (only `shotRay` destroys). Tests updated (a7, a8) and new.

## W2/W3 full reset - delivered
`bayRestart` -> `dropSquad(true)` (release holds, `EnemyManager.resetMemory`: all guards, bodies, drones, incidents, calls, caution, alarm, LKP) -> respawn squad -> `checkpointReset` (carried body, gadgets, noise) -> `clearBodyReports` -> `ct.repair(-1)` (Marlow cameras have no `section`, so all are repaired and meters cleared) -> lamps -> doors. Doors: snapshot on `bayStarted`, `applyDoors(..., locked=true)` after `applyLocks`; cracked doors uncracked; Sector Ops `apply` behaviour unchanged. Client: runs `checkpointReset` on the new `COURSE_RESTART_TITLE` banner; guards, bodies and doors follow the host snapshot. Ordering via `doorStep` is correct (take/apply after locks in the same `handle`).

## W4 - confirmed
No work needed; no code touched for it.

## W5 - delivered as "not reproducible on the rebuilt A2"
The old fitting (`S2_TOP_LAMP`) is gone from the rebuilt map (`grep` empty); A2's only locked doors carry emissive status bars, not lamps. Reasoning holds; no data change is acceptable. Michael must re-walk A2 to confirm.

## Must-fix
None.

## Should-fix
- `src/game/gameState.ts:720`: `Vector3.Down()` allocates a vector on every ricochet (per shot on an armoured camera). CLAUDE.md hot-path rule: hoist one `private readonly` down vector. Low frequency, so not blocking.
- `scripts/e2e-ctcourse/a4GoodsShed.mjs:153-156`: the builder's `S10-DIAG (temporary)` logging is still in the diff. Remove before merge unless the master-merge regression agent wants it.

## Polish
- A client's own rounds give no ricochet sparks on an armoured camera (builder noted; cosmetic).
- `lastDoors`/`restarts` are test-only public fields on `CourseMode`; fine.
- Assumed decision S10-A2 (restart shuts locked doors, player in doorway is respawned anyway) is sound; Michael to confirm.
