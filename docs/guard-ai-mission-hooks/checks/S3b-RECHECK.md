# guard-ai-mission-hooks S3b: fix re-check (check B FIX 1)
Owner: Guard AI Build. Status: current.
Verdict: PASS

Checker: fresh Opus 5.5, fix round only. Head checked: b6ec17ab6 (fix 718651533..b6ec17ab6, merge f149673b7..718651533).

Runs: `node --check scripts/e2e-stealth-ai.mjs` OK. `npm run typecheck:fast` clean. `npx vitest run
tests/areaAlarmsManager.test.ts tests/areaAlarms.test.ts`: 2 files, 36 tests, all pass (CPU 40%). No e2e run.

## FIX 1: area-1 player spot (`scripts/e2e-stealth-ai.mjs` ~3905-3910): done

Candidates are now `[[11.2, 4.5], [8.8, 4.5], [10, 6.5]]`, the first walkable one is used. Spotter at (10, 9), yaw PI
(facing -z).

- **Sight model** (`src/ai/perception.ts`, `enemy.ts` ~2690-2705). Focus half-angle is 27.5 deg and focus range 25 m.
  The rays run from the eye to the chest, head and hips (`losClear`, `MASK.SIGHT`). All three share the player's x / z,
  so one plan-view line covers them.
- **(11.2, 4.5)**: 4.66 m away, 14.9 deg off his facing (in focus). The line passes 1.03 m from the pillar (10, 5)
  axis, 0.68 m clear of its r 0.35 surface. The closest point is at t 0.83, inside the segment. The player stands
  1.30 m from the pillar's axis and 1.3 m from the steel block (14, 3.5) (x 12.5-15.5, z 2.7-4.3). Walkable with
  margin.
- **(8.8, 4.5)**: the mirror image: 1.03 m off the pillar's axis. It passes the counter `block(4, 8.6, 10, 1.0, 0.9)`
  (x -1..9, z 8.15..9.05) at x >= 9.77, 0.77 m clear.
- **(10, 6.5)**: 2.5 m dead ahead. The pillar lies 1.5 m beyond him, so it is not on the ray.
- **Nothing else lies between**:
  - No interior wall: the z 12 wall is behind him.
  - The press (6, 1), the steel blocks (14, -2.5 / 3.5) and the zipline at x 12 are all off the lines.
  - The lamp at (9, 3.8) and the beam at (10, y 5, 2) are overhead.
- **Rest of the scenario**:
  - Part (a) is unchanged at (0, 5) -> (-0.5, 0).
  - Part (b) is unaffected: `t.reset()` runs `em.clear()`, so the area-0 spotter is gone.
  - Area attribution is the spotter's (`e.area` from his feet, `enemyManager.ts` 1094 / 2311), not the player's. So the
    pick at z 4.5 (outside area 1's box) does not matter, as before.
  - In (d2), the alerted area-0 guard from (d) is still alive, 10+ m west. It cannot reach the eye line in the ~1-2 s
    the spot takes. This setup was unchanged from before the fix.
- The (b) assert message now names `alerted` and the pick, which is the optional part of check B's "done looks like".

## Merge of feature/guard-ai-mission-hooks-s1b (718651533)

The merge is clean: `git show --cc` is empty, so no conflict was resolved by hand. It touches only
`docs/guard-ai-mission-hooks/checks/S1a2-e2e-triage.md` (new) and one hunk in `scripts/e2e-stealth-ai.mjs` ~3524.
That hunk sets `kb2.hidden = false` before `em.ctx.revive`, in the S1a-2 scenario. It touches no S3b logic, and the
'area alarm' scenario is separate.

## Polish

None new. Check B's polish list stands.
