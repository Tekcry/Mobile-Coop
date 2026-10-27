# PLAY-B-CHECK - PR #585 (feature/guard-ai-play, c3db2c0e3), Slice B (P3-1, P3-2, P3-3)

Checker: fresh Opus, read-only. Prototype mode.

## Verdict: PASS

## Findings
1. **alarmQuiet (P3-1).** Only caller is the banner text in `stealthSystems.onAlarm` (`stealthSystems.ts:546`); nothing
   else reads it (sectorMode has its own). It matches `onAlarm`'s send logic: with no `layout.reinforce` and no
   `layout.guardAi.entries` neither the uncoordinated path (`!at` returns) nor the coordinated path (`!ent && !at`
   returns) sends anyone. No map sets `guardAi`, and no course map (ctcourse / ctcourseReplan, courselab, bunker,
   bunkerDeep) sets `reinforce` (bunkerDeep's `B9-REINF` is a course device mount, not `layout.reinforce`), so all
   return true. A course with reinforce points or entries returns false (tested). Conditional form is better than
   the brief's `return true`.
2. **spawnSquad continue (P3-2).** The four squad arrays are pushed in step by `addSquad` and every lookup goes through
   `squadIds.indexOf` (`squadOf`, `slotDown`, `resetStationGuards`, `respawnSlot`, `slotOfGuard`), all of which already
   handle a missing slot (-1). A station retry calls `respawnSlot`, which retries a missing slot (warn stays once via
   `squadWarned`). Synced takedowns are per player (`rating.takedown`), not slot pairs. `src/net` reads no slot ids:
   the client keys puppets by the host's enemy id and only uses `course.squads` positions for `infoAtSpawn`.
3. **sector fill (P3-3).** `EnemyManager.spawn` returns null only for the cap (`alive >= maxAlive`, the same test the
   fix uses, so the split is exact) or `nearestWalkable(..., 8)` < 0. Players do not block nav cells; nav is built once
   (`readonly nav`); runtime closures are door strips, which cannot empty a ring-8 search. So a non-cap failure is
   permanent and the old `break` was a whole-load stall, not a retry. Dropping is right. Section guards
   (`loadSection`) and reinforcements (`raised`) both go through `pending`/`fill`; no separate 3-4 player extras path
   exists. A dropped desk operator leaves the desk unmanned (usable) instead of locked forever: fine for play. No
   per-frame allocation (warn string and `alive` count only on failure).
4. **Tests.** `tests/guardPlaySpawns.test.ts` asserts what it claims (data faults on both maps, banner quiet / not
   quiet, skip-not-break with one warn, drop-vs-cap in fill). Deterministic stubs; 6 tests, about 5 s. Probe is
   `describe.runIf(GUARD_PROBE === '1')` and reports skipped otherwise. `npm run typecheck:fast` clean. `npx vitest run
   tests/guardPlaySpawns.test.ts tests/courseStation.test.ts tests/sectorDesk.test.ts tests/alarmRepeat.test.ts`:
   4 files, 79 passed (plus the probe file skipped). `tests/changesFragments.test.ts` passes.
5. **Changelog fragment** matches `changes/README.md`: right name, `# title`, `kind: patch`, one bullet.

## Polish
1. `courseMode.ts:1394-1407`: `alarmQuiet` was inserted between `onEnemyJoined`'s JSDoc and the method, so that doc now
   sits orphaned above `alarmQuiet`'s. Move `alarmQuiet` (with its doc) above the `(J14 R1 fix 1)` block.
2. `PLAY-PASS.md` Slice B still says `alarmQuiet(): boolean { return true; }`; say the conditional form that shipped.
3. The sector drop warn is once per section load (a restart re-pushes the slot and warns again), not once per run.
   Fine; the comment "said once" could say "once a load".
