status: done feature/validator-port-s6 6b23e13087f775d4a1f50849b8eac982a4be09af
# J12 validator-port, slice S6 (Opus-grade brief): perfect.mjs + no-forced-kill test

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3, PASS on 10b613dd3).

- Base: `dae93b996661f38cb45518bc293fd8bbc133d42e` (origin/feature/validator-port = PR A head with S0's lib split
  merged; `perfectPaths` as fixed by S0 is in the lib). New branch: `feature/validator-port-s6`. Push every sub-step.
- Read first: `docs/systems/agent-preamble.md` (origin/master), then the spec:
  `git show origin/feature/validator-port:docs/validator-port/PLAN.md` slice **S6** (search `**S6 (Opus).**`, ~line
  225) - build it word for word - and the BRIEF entries it cites (`docs/validator-port/BRIEF.md` A10, A11). Game rule
  behind it: a perfect rating is always possible and no mission forces a kill (VISION hard rules 3 and 4).
- Only files to edit: the `perfect.mjs` profile check file (S0's profile folder), new `tests/noForcedKill.test.ts`, the
  test cases for `perfect.mjs` (new `tests/levelPerfect.test.ts`, or new cases in `tests/levelProfiles.test.ts` if S0
  put perfect cases there), and `changes/feature-validator-port-s6.md` (kind: patch). Do not change `perfectPaths`
  in the lib unless a test proves it wrong (then log it as a deviation). Other slices edit the validator and other
  profile files in parallel: stay out of them.
- `tests/noForcedKill.test.ts` reads game code (`src/game/sectors.ts`, the course defs): trace each Marlow
  `CourseObjective.done` flag's setter and list them in the test, as the PLAN says. No game code edits.
- Tests to run (unit only, no e2e, no GPU, no npm run check): `npx vitest run tests/noForcedKill.test.ts` plus your
  perfect test file and `tests/levelProfiles.test.ts tests/levelValidate.test.ts`; `npx tsc --noEmit -p .` if
  feasible; the validator on campus S1-S5 + example graphs: counts unchanged.
- Done: the S6 "Done" line in the PLAN holds, every fixture case listed there present.
- Report: append what changed, tests with counts, the flag setters you traced, deviations; set
  `status: done feature/validator-port-s6 <sha>`.

## Report (Night Shift | Cloud Builder 3, Opus builder, 2026-10-25 ~23:45)
Branch `feature/validator-port-s6` @ 6b23e1308 (3 commits on dae93b996: 89c910d3 perfect.mjs + levelPerfect test,
ea6469ea noForcedKill test, 6b23e130 fragment). 4 files, +465 / -7. `perfectPaths` unchanged.
- `scripts/level-checks/perfect.mjs`: `checkPerfect` (still 2 declared arguments, as S0's test expects): `requires_kill`
  not a bool: ERR (:35-41); `mark` (any value, presence counts) one line per marked space / link at `PROFILES.marks`
  (ERR campaign / sector; training one INFO count) (:43-53); the run ends at the `exfil` spaces when
  `profile.needsExfil` (campaign), else the last section's `exit` (sector, training) (:55-59); two runs (:60-85): the
  no-kill path (no `requires_kill: true` link) ERR on every mode, the ghost path (also no `loud` link, A11) at
  `PROFILES.ghostPath`; each reports unreached objectives, objectives with no way on, an unreachable end; a target
  with a no-kill ERR gets no second ghost line. `runPaths` (:88-99) calls `perfectPaths` once per end (any end will do).
- `tests/levelPerfect.test.ts` (new, 12 cases): every PLAN Done fixture - loud-only objective ERR on a campaign, INFO on
  training; `requires_kill`-only objective ERR on all three modes; `mark` ERR on campaign and sector, one INFO count on
  training - plus clean on every mode, a kill link with a quiet way round, a stranded objective, run ends (2-section
  sector), `validate()` wiring, example + merged campus give an empty report, `requires_kill` must be a bool.
- `tests/noForcedKill.test.ts` (new, 5 cases): `SectorObjectiveKind` is exactly `'hack' | 'grab' | 'download'` and
  every `MAPS` sector objective is one; Marlow: a `TRACE` table (:62-92) checked against the setters derived from the
  built course, each a player action; source pins: `CourseMode.onEnemyKilled` touches no flag or gate, the only
  `.setFlag(` calls under src/ are `courseMode.ts:304` (device hook) and `:520` (`onIntelCode`), the only
  `hooks.flag?.(` calls in `ctDevices.ts` are the scanner (:572) and the pass zone (:903).
- `changes/feature-validator-port-s6.md` (kind: patch).

Flag setters traced (objective step: condition <- setter): A1 a1-over: gate `g-a1-wicket` (bolt gate, a1Gate.ts:142)
or flag `a1-yard` (pass zone a1-p-yard, :222). A2 a2-neck `a2-east1` (zone a2-p-east1, :306); a2-back `a2-east` (zone
a2-p-east, :307). A3 a3-in `a3-far1` (zone, :315); a3-swap `a3-far` (zone, :316). A4 a4-room `a4-loop` (switch on
a4-console, :327); a4-floor `a4-west` (zone, :386); a4-dock gate `g-a4-wicket` (push bar a4-pushbar, :324). A5 a5-throw
`a5-in1` (zone, :354); a5-kiosk `a5-release` (switch sw-a5-release, :268). A6 a6-up `a6-gal` (zone, :330); a6-hang
`a6-drive` (switch sw-a6-panel, :297). A7 a7-split `a7-pod` (zone, :381); a7-sync `a7-sync` (scanner pair sc-a7, :332).
A8 a8-split `a8-gal1` (zone, :546); a8-office `a8-loop` (switch a8-console, :497); a8-grille `a8-lobby` (zone, :547);
a8-beams `a8-inner1` (zone, :548); a8-sync `a8-sync` (scanner pair sc-a8, :467). A guard's death only records kills /
knockouts; a console's guard only clears its loop flag (`consoleBack`), never sets it.

Tests: vitest noForcedKill 5, levelPerfect 12, levelProfiles 19, levelValidate 90 = 126 passed (re-run by the lead
session: 126 passed); changesFragments 1 passed; `npx tsc --noEmit -p .` clean; eslint on both new tests clean. S0's
"modules start empty" probe still gets an empty `checkPerfect` report.
Validator, base vs head (identical output): campus S1-S5 merged 127 errors / 174 warnings / 21 INFO; example 0 / 0.
Readings taken (none loosens a rule): "objective space" = a space tagged `objective` (as `checkReach`); the end by
`profile.needsExfil` (training ends at the last section's exit, as Sector Ops); only `requires_kill: true` blocks a path
(a non-bool ERRs but does not block); a `mark` of any value, `false` / `0` included, counts.
Deviation: no `docs/validator-port/fragments/S6.md` (this brief names the `changes/` fragment); D-C needs the schema text
for `requires_kill` (link, bool) and `mark` (space or link, any value). Pending PC run: none beyond CI `check`.
