status: blocked S3b-1 step 2 allocation gate fails: real-field fill 8544 B vs <= 2432 (field's private steps box; Q path cannot reach it additively) - report on the branch
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
