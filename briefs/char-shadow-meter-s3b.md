status: open
# char-shadow-meter s3b (cloud): character shadows count in the light (J16), slice S3b-1 only (typed point-input light calls, no 4-player fill allocation)

Lead: Night Shift | Sector Ops Build. Job char-shadow-meter (FOLDED-PLAN J16, ROADMAP Now row 13; Michael Q6 "Meter
and guards read them", Q14 "A faint cue"; G352, G379). Plan checked; S1 / S3 built (A1 = PR #459). Opus builds.

- Base: `origin/feature/char-shadow-meter` @ c9b14bf1c08f900fbe1c2bf73d8a3422aa3b62ce. New branch: `feature/char-shadow-meter-s3b` (create it from that commit and push it; never
  push to feature/char-shadow-meter, feature/char-shadow-meter-a1 or master).
- The strict brief is `docs/char-shadow-meter/briefs/S3b.md` on that base, with BRIEF.md, PLAN.md, PLAN-CHECK.md and
  checks/s1-s3-check.md. Its owned-file and never-touch lists are exact; its departures from the PLAN are accepted by
  the lead.
S3b.md
- Cloud changes to the brief:
  - Ignore its desktop worktree path and toplevel guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/char-shadow-meter-s3b`.
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files with
    `--maxWorkers=2`. Allocation tests (tests/helpers/allocPerCall.ts) read V8 per process: report every
    bytes-per-call line you see. Every e2e / GPU leg is "pending PC run": list it.
  - Commit and push each step, path-limited, never `git add -A`. Where the brief says STOP or ask the lead:
    `status: blocked <reason>`.
- Done: every step pushed; report `docs/char-shadow-meter/checks/s3b-build.md` (per step: files, tests with
  counts, bytes-per-call lines, deviations, pending PC runs); then `status: done feature/char-shadow-meter-s3b <sha>` here.

## Report (Night Shift | Cloud Builder 1, 2026-10-25): BLOCKED at the step 2 gate
- Branch `feature/char-shadow-meter-s3b` head 9b906182846b15e45052b0488e8a6be54f2f3f78: step 1 a1619bac (LightField `qp` / `qr`, `sourcesQ`, `sourceQ`,
  `totalQ`, additive; bit-equal to the plain calls on 500 points; lightField 26 / 26); step 2 (ShadowCues through the Q
  path, FakeField / spy / FlatField on the Q members, every old case green) plus the real-LightField fill case.
- The gate: one 4-player fill with the real field (2 lamps + the moon, 3 footprints each, near points contrasted) reads
  **8544 B** (ALLOC_TRACE: every round 8544.0 at 0x51 Turbofan, no scavenge) against **<= 2432 B**. Not loosened; the
  failing case is committed as the evidence (shadowCues 16 / 17, the gate the only failure).
- Cause: inside LightField, not the cue boundary. Per call in this scene: sourcesInto 124.8 / sourcesQ 124.8, sourceAt
  68.8 / sourceQ 84.8, totalAt+contract 124.8 / totalQ 140.8. The private steps (moonInto, lampInto, columnInto,
  dynTermInto, totalInto, triInto...) take x, y, z doubles and box them; 76 field calls a fill x ~112 B.
- Question for the lead: (a) extend the typed point input into the private steps (rewrites existing lightField.ts lines,
  past "additive members only", every existing reading re-measured; overlaps char-shadow-meter-a1-node22), or (b) the
  check's first option: gate the fill at <= 19 x 4 x BOXED_BUDGET (5472 B) or a per-call budget x calls, and log it.
- Full readings: `docs/char-shadow-meter/checks/s3b-build.md` on the branch.

## Answer (lead, 2026-10-26 ~00:10): option (a), on top of the A1 Node 22 fix. Gate unchanged.
- `feature/char-shadow-meter-a1` @ df64c0fa458cf04203bc11c3bcf7bda693f0aa5f (PR #459, CI green) already moved the
  field's private steps off doubles: the query point (`pt`), the door segment (`seg`) and the trilinear grids (`LS`,
  `moonG` / `ambG`) live in typed-array slots (`docs/char-shadow-meter/checks/a1-node22-fix.md` on that branch).
  That is most of option (a).
- Do, on `feature/char-shadow-meter-s3b` (resume from its head 9b9061828; guard as above):
  1. `git merge --no-ff origin/feature/char-shadow-meter-a1` (rev-parse it: must be df64c0fa4; if it moved, merge the
     new head and say so). Resolve `lightField.ts` by keeping A1's slots and making the Q members use them: `qp` may
     become the same slot as `pt` (or the Q members copy `qp` into `pt` once per call); `qr` stays.
  2. Re-run the gate case. If over 2432 B, extend the typed slots into the private steps still taking doubles
     (`lampInto`, `levelInto`, `dynamicInto`, `totalInto`, `triInto`, `bounceInto`, and `res` into a typed slot). The
     lead lifts "additive members only" for `src/world/lightField.ts` for this: existing lines may change, behaviour
     bit-identical (the 500-point Q test and every existing lightField / charOccluders / shadowCues case unchanged).
     `src/world/lights.ts` stays untouched: if `lights.lightTerm`'s returned double is the last residual, report its
     bytes and stop there.
  3. Readings, Node 22 (as CI: `npx -y node@22 node_modules/vitest/vitest.mjs run ...`) and the default Node: every
     bytes-per-call line of lightField + shadowCues, before and after. BOXED_BUDGET and the 2432 B gate are not changed.
- Still over 2432 B after step 2 with only `lights.ts` left: `status: blocked <reading, residual>` (the lead then
  decides on option (b)). Done: as the Done line above, S3b-1 only.
