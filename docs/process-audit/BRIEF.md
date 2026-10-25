# Process audit - brief

Set by the orchestrator, 2026-10-19, on Michael's request. Branch `feature/process-audit` (off master b08cc17),
folder `C:/NightShift/Mobile-Coop-audit`. Runs on the laptop (light work: reading, docs, small script edits). Any
e2e run it needs goes through the orchestrator on the desktop.

## Michael's words
"is it worth running a git-wide clean up and audit of documentation, testing procedures, prompting procedures etc.
there have been quite a few revisions, and i want to make sure everything is clear and we arent wasting time on
redundant testing for no reason. focus is fully playable 2 player coop training level prototype, with working
animations, weapons etc. must be fully functional."
On the flaky suites: fix the co-op ones, move the rest out of the way (park them, don't fix them).

## Goal
Everything a session reads is clear, current and agrees with itself, and every test that runs earns its time
against the goal: a fully functional 2-player co-op training level (Wren, animations, weapons, every co-op move,
lights and shadows).

## Phase 1 - report only (no changes)
Write `docs/process-audit/REPORT.md` and stop. Michael approves it, through the orchestrator, before any change.
1. **e2e inventory.** Every suite in `scripts/run-e2e.mjs` (REQUIRED, REPORT, LEGACY, KNOWN_FLAKY): its time in the
   desktop full run of 2026-10-19 (wall 3720 s, 2 at a time; times are in that run's summary, which the orchestrator
   can send), what it checks, and whether that covers the training level. A verdict for each suite:
   keep / merge into another suite / move to legacy / fix. Name suites that check the same thing twice. The targets:
   - The full run should be well under an hour.
   - `e2e:quick` should be the right size for a step.
2. **Known flaky and failing suites.** Find the cause of each one, by reading the code and the logs only, with no
   runs:
   - e2e-coop, e2e-netmove and e2e-ctcourse all fail alone on master bd59f32. Evidence: in
     `docs/archive/anim-cleanup/STATE.md` and PR #12's body; the orchestrator can send the logs.
   - Plus e2e-darkness, e2e-weapons-carry, e2e-pad, e2e-foley and e2e-bunker, and e2e-kestrel and e2e-camera-bounds
     (they fail on master).
   Co-op suites get a fix plan (the fix job runs on the desktop after Phase 2). Suites outside the training level
   move to legacy.
3. **Test tiers.** One rule for what each kind of change runs: a docs-only change, a step, a slice, a merge to
   master. Include stale budgets like the holster one (400 ms against a 550 ms HOLSTER_TIME). List any other
   assert limits that a tuning table can make stale.
4. **Session and prompting rules.** Today they're spread across:
   - `CLAUDE.md`
   - `docs/systems/session-method.md`
   - `docs/ROADMAP.md` (the machines and merge rules)
   - `docs/orchestrator/STATE.md`
   - per-job RULES / STATE / BRIEF files (`docs/archive/locomotion`, `docs/kestrel`, `docs/archive/anim-cleanup`, `docs/ct-prototype`,
     `docs/archive/goggle`, `docs/operators`, `docs/menu-ui`)

   Propose one set of rules and one per-job file format, and say what to retire. Name every contradiction. The known
   ones:
   - CLAUDE.md names `ct-movement` as the working branch and the old `ct-movement -> dev -> master` flow, while
     deploy.md says that flow is retired (G83).
   - CLAUDE.md says "Claude never merges"; Michael now has the orchestrator merge green PRs (ROADMAP).
   - CLAUDE.md M21 says phones are dropped; G182 lets a phone launch for testing only.
   - CLAUDE.md lists `npm run dev` as LAN-exposed for phone testing.
   - The plain `C:/NightShift/Mobile-Coop` folder is on feature/training-bunker, not master.
5. **Docs.** Docs that describe parked, retired or finished work but read as current: archive them, or mark them as
   history. Stale branches and worktrees: list them, with the evidence that each one is merged or kept by a tag.
   Don't delete anything; branch deletion is Michael's.

## Phase 2 - apply (after approval)
Apply only the approved items: doc edits, `run-e2e.mjs` lists, CLAUDE.md wording. A CLAUDE.md change needs Michael's
approval, so quote the approved wording. The co-op suite fixes are their own job on the desktop, after this one. One PR
to master; the orchestrator merges it.

## Rules
- The prototype comes first: no game feature or refining work.
- No GPU or heavy runs on the laptop.
- Authority order: Michael > bible > specs > docs > code (CLAUDE.md).
- Keep every decision record (DECISIONS.md, G numbers). Retire them by marking, never by deleting.
- Commit messages end with: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
