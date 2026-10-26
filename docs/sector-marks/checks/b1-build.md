# sector-marks B1 - build report (cloud)
Owner: Night Shift | Sector Ops Build. Status: current.

Builder: Night Shift | Cloud Builder 1 (cloud-queue brief `briefs/sector-marks-B1.md`). Base `origin/feature/sector-marks`
@ 583f4c436, branch `feature/sector-marks-b1`.

## Built (per step)
1-2. `src/game/interactables.ts`: `import type { ModeId }`, `drawsExitBeacon(mode)` (false only for `'sector'`), the
   constructor's third parameter `exitBeacon = true`, and the `kind === 'extract' && !this.exitBeacon` branch (no parts,
   no light) before the beacon branch. `src/game/gameState.ts` (import, line 728) and `src/net/coopClient.ts` (import,
   line 247) pass `drawsExitBeacon(mode)`; free roam (gameState line 839) untouched. Commit f36a916c.
3. Labels: S1 "Download tonight's visitor list in the gatehouse", S3 "Take the Tidewater board from the prototype store",
   S4 "Download the signing logs in the server cage", S5 "Take the signing key token from the strongroom". Comments,
   S2 and the connector / extract labels unchanged. Commit 2db32eb8.
4. `tests/campusObjectivePlace.test.ts` and `tests/exitBeacon.test.ts` exactly as in the brief. Commit e6c637b9.
5. `src/world/maps/campusS4Dress.ts`: `import { hyp2 } from '../../core/mathx'` after the campusS4 import, `Math.hypot`
   -> `hyp2` (it sat on line 176, line 177 after the import). Commit 7cf3e2ab.
6. `scripts/e2e-sectorops.mjs`: the no-beacon assertion after the phase assert in the section loop. Commit c7b6716b.
7. `TESTING.md` checklist item, `docs/systems/modes-and-progression.md` bullet, `changes/feature-sector-marks.md`.
   Commit 06523eee.

## Checks
- `npm run typecheck:fast`: pass (exit 0).
- `npx vitest run` on the 13 brief files: 13 files, 287 tests passed (campusArtGameplay 54, campusObjectivePlace 12,
  campusS1 51, campusS3 32, campusS4 41, campusS4Dress 14, campusS5 29, changesFragments 1, exitBeacon 2,
  sectorItemScope 5, sectors 27, torchShadowSet 12, vision 7).
- `node --check scripts/e2e-sectorops.mjs`: pass.
- `git diff origin/master...HEAD --stat` (from the merge-base; master's tip has moved past the base, so a two-dot diff
  also lists master's own later changes): only the brief's files plus `docs/sector-marks/*`.

## S4LOG comparison (step 5)
Byte-identical: one `S4LOG` line of 1252 bytes before and after `hyp2`; `diff` printed nothing. The temporary
`console.log` was removed; `git diff tests/campusS4Dress.test.ts` prints nothing.

## Deviations
- Vitest 5 hides `console.log` output by default, so the brief's plain run printed no `S4LOG` line (an empty diff that
  proves nothing). I ran both runs again with `--silent=false` (before = `campusS4Dress.ts` restored from HEAD, after =
  the `hyp2` edit); the result above is from those runs.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5` (the cloud-queue README's trailer) in place of the brief's Sonnet line.
- Pushed to `feature/sector-marks-b1` (the cloud brief), not feature/sector-marks.

## Pending PC run
- `e2e-sectorops` (the new no-beacon assertion per section, plus the suite's existing legs) and the co-op group the
  test tiers name for a `src/net` change (`e2e-coop`, `e2e-netmove`, `e2e-ctcourse`). Not run in the cloud.

## What Michael should try
Start Sector Ops on Saltmarsh Park, finish S1's objective, walk to the staff entrance: no green disc or glowing pole.
Read each section's objective line: it says what and where (gatehouse, facilities office, prototype store, server cage,
strongroom).
