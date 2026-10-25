status: done feature/char-shadow-meter-s2 2a175335de514d18e342b073f075115ca828261e
# char-shadow-meter s2 (cloud): character shadows count in the light (J16), slice S2 (the character fill, PR A2)

Lead: Night Shift | Sector Ops Build. Job char-shadow-meter (FOLDED-PLAN J16, ROADMAP Now row 13; Michael Q6 "Meter
and guards read them", Q14 "A faint cue"; G352, G379). Plan checked; S1 / S3 built (A1 = PR #459). Opus builds.

- Base: `origin/feature/char-shadow-meter` @ c9b14bf1c08f900fbe1c2bf73d8a3422aa3b62ce. New branch: `feature/char-shadow-meter-s2` (create it from that commit and push it; never
  push to feature/char-shadow-meter, feature/char-shadow-meter-a1 or master).
- The strict brief is `docs/char-shadow-meter/briefs/S2.md` on that base, with BRIEF.md, PLAN.md, PLAN-CHECK.md and
  checks/s1-s3-check.md. Its owned-file and never-touch lists are exact; its departures from the PLAN are accepted by
  the lead.
S2.md
- Cloud changes to the brief:
  - Ignore its desktop worktree path and toplevel guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/char-shadow-meter-s2`.
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files with
    `--maxWorkers=2`. Allocation tests (tests/helpers/allocPerCall.ts) read V8 per process: report every
    bytes-per-call line you see. Every e2e / GPU leg is "pending PC run": list it.
  - Commit and push each step, path-limited, never `git add -A`. Where the brief says STOP or ask the lead:
    `status: blocked <reason>`.
- Done: every step pushed; report `docs/char-shadow-meter/checks/s2-build.md` (per step: files, tests with
  counts, bytes-per-call lines, deviations, pending PC runs); then `status: done feature/char-shadow-meter-s2 <sha>` here.

## Report (Night Shift | Cloud Builder 3, 2026-10-25 ~23:58)
Full report: `docs/char-shadow-meter/checks/s2-build.md` on `feature/char-shadow-meter-s2` @ 2a175335d. Steps 1-5 pushed
(dc14a1bb fill + tests, 46640987 gameState wiring, 1096aefe lighting.md, then the report).
- Tests: tsc clean; eslint clean; doc lint exit 0; charOccluderFill + charOccluders 20 passed; with lightField +
  coopPerception 56 passed, 1 failed - lightField "allocation-free with a contract" (sourcesInto 90.4 B > 72 B): the
  pre-existing Node 22 reading of `briefs/char-shadow-meter-a1-node22.md`, untouched by S2. gameState-reading tests 48
  passed.
- Bytes per call: fillPlayers(4) + fillVictims(32) 0.0, pictureInto(16) 0.0, control 96.0; lightField with a contract
  totalAt 58.4-66.8, bodyLevel 113.2-128.4, sourcesInto 90.4-98.8, sourceAt 23.2-25.6.
- Deviations: ties in pictureInto by lower contract slot; debug-only timing members; the lighting.md cue line cites Q14
  (G379 is not in this base's DECISIONS, doc lint); the field test pins the chest as the shaded sample (the head is
  above the scene's downward lamp).
- Pending PC run: affected-e2e + e2e-coop / e2e-netmove (flag off), the flag-on Warehouse probe, A11 meter p95 on
  campus S5 with 4 players.
