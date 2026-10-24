# COOP-CARRY merge check A (wire / authority)

Merge commit `1d2f3e1d` = origin/master `6e8a450b` (4.93.0, PROTOCOL 52) into PR #313 `b1daa9a1`. Merge base `6b44efb8`.
Read-only check; this file is the only write.

## Verdict: PASS

Nothing lost or broken on the wire / authority side.

## Method
- Per file, the sorted +/- lines of master's change (`6b44efb8..6e8a450b`) against what the merge brought onto the
  branch (`b1daa9a1..1d2f3e1d`), and the branch's change (`6b44efb8..b1daa9a1`) against what the branch adds over
  master (`6e8a450b..1d2f3e1d`).
- `git show --cc 1d2f3e1d -- src/net/` for the hand-resolved hunks, read in full.
- Targeted vitest (BelowNormal): coopCarry, protocolConst, thermalThroughDoor, jointInterrogation, coopGuardCarry, net,
  coopGuardAi: 7 files, 142 tests passed. `npm run typecheck:fast`: clean.

## Findings
1. **coopHost.ts, protocol.ts, clientCarry.ts, bodyCarryNet.ts: identical on both sides.** Master's lines and the
   branch's lines are byte-for-byte the same after the merge (clean auto-merge; the only `--cc` hunk in coopHost is the
   import block, which keeps both sides).
   - Master survived: shot history rewind (`shotHistory` import coopHost.ts:68, `judgeRewound` :1249, `pushHist` :1619),
     joint bluff (`bluffs.delete` on drop-out :523, `jointFor` before `takeInfo` :1708, `onBluff` / `jointBluff` /
     `jointLive`), rig-pose-fix S1 partner body volumes.
   - Branch survived: host-authoritative body items (`bodyItems`, `carrierOf`), `use` routing for `drop-body` / `body-` /
     `hide-` ahead of the generic item path, `pickupDenied` denial + `violations++` on `far`, `remoteDrop` on
     disconnect / drop-out / death, `carryStep`, `isig` including `by`. `NetItem.k 'body'`, `e`, `by`, `DROP_BODY_ID`,
     `netItem` parsing unchanged.
2. **PROTOCOL_VERSION = 52** (protocol.ts:21), the single definition. Tests import the constant (coopCarry.test.ts:8,22;
   protocolConst, net, rejoin, ratingWire, coopRejoin, mergeTrain); no hard-coded version found.
3. **coopClient.ts (hand-resolved): correct.**
   - Kill (:781-808): master's S5 lie kept in full (`p.buf.latest()` feet / yaw, fall away from the killer `e.by`,
     `deathLieOn` into the `deathLie` scratch) and handed to the branch's `new Body(..., this.canRagdoll(), lie)`;
     `Body` copies the scratch (`setLie`) and snaps the ragdoll to it, or lays the rig on it over budget. `keptAt` set.
   - Eviction at `BODY.max` (:781) skips a carried body, then `dropBody`.
   - `dropBody` (:1250): `carry.lost`, view cleared, carrier forgotten, `kept` and `keptAt` deleted, `Body.dispose`.
   - `dispose`: `carry.dispose`, views cleared, every kept `Body` disposed (:1315), `kept` / `keptAt` cleared.
   - Master's `jointBluff`, `bodyStamp` hook (:236-237) and `stampBodies` present. The old `ragdolls` array and its
     `BUDGET.maxRagdolls` filter are replaced by `canRagdoll()` over kept bodies (same budget, no per-kill `filter`).
4. **carryView.ts (hand-resolved): correct.** Side from `Body.lieChest` + `carrySide` (identical formula to the
   branch's former `carrySideOf`); put down heads `a.yaw + Math.PI` (:65), matching solo `BodyCarry.handOver`;
   `letGo` (:72) drops at the floor under the lie pelvis (`pos.y - lieLift`) with the lie's `headYaw`, so `dropLie`
   re-adds the lift and the body stays where it lay.
5. **Assumption A2 (keptBodies reads `view`, null skipped): sound.** Same field the host's `paintHeat` stamps from
   `EnemyManager.bodies` (gameState.ts:2617); `view` is null only after hide / dispose, and a body hidden through the
   mirror stays in `kept` until the next `bodies` sweep, so the null guard (keptBodies.ts:19) is needed. Carried bodies
   are stamped on both pages (host's `em.bodies` includes them): parity holds.
6. **Assumption A3 (client Body lethal=false on a kill): sound.** `Body.lethal` is read only in `enemy.ts` /
   `enemyManager.ts` (host sim: found, wake, board report); the client has no enemy manager, so nothing reads it there.
   Same value the branch passed before the merge.
7. **Single-player boundary:** no static import of `src/net` outside it; only `main.ts:326` dynamic `import('./net/coopUi')`.
8. **Allocation:** the merge adds none on a hot path. `stampOne` adds a local only; `letGo` / kill `Vector3`s are per
   event. The client's `kept.values()` / `views.values()` frame loops (:1142) predate the merge (accepted in
   COOP-CARRY-CHECK-A); the old `ragdolls.filter` per kill is gone.

## Polish list (non-blocking)
- `keptAt` now duplicates `Body.age` (the client's kept `Body.update` advances it): `stampKeptBodies` could read
  `b.age` as the host does and `keptAt` go. Not a bug.
- keptBodies.ts header still says "each kept rig"; it is now a `Body`'s `view`.
- coopClient.ts:781: when every kept body is carried, nothing is evicted and `kept` can sit above `BODY.max` by the
  carried count (at most 3). Harmless.
- coopClient.ts:489 `[...this.kept.keys()]` per snapshot with `bodies` (pre-existing master code).
- The frame loops at coopClient.ts:1142 use Map iterators (CLAUDE.md names iterators in AI / nav / anim loops; this is
  the net frame loop, already accepted).
