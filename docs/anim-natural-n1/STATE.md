# anim-natural N1 - state

## Now (paused for the 5-hour reset, 2026-10-22 ~12:45)
Implementer A: REPORT-A.md (harness, master table, causes, rule, decisions). Implementer B built N1 (REPORT-B.md):
aimClock, the turn step on the clock strike, the ball pivot, no band scrub, the aimed spot turn, turnRule, 5 Stepping
sliders that bake, HOLD_CONTACT (cause 6), the e2e-anim turn feet block, contact-point metrics. Harness: contact slide
0.0 in every row (master 3.8-14.8 cm), twist at lift <= 26 deg, gap >= 6.8 cm. Committed as WIP; not yet run: full
vitest / check, e2e, GPU sheets, the checker.

## Next (after the account switch)
0. Checker FAIL on ccc1a14d (CHECK.md): one blocker (a heel scrub in the heel-first roll at 60 Hz that the new
   contact metrics cannot see; a backstop-valued unit bound hid it) and 6 should-fix. The ONE fix round: an implementer
   with CHECK.md findings 1-9 (all), then the same checker style re-check of finding 1 by the job lead or a fresh checker.
1. Under the lock: npm run check; e2e-anim (turn feet block, foot lock, crab slide), e2e-studio, e2e-netmove, e2e-clip
   (a run on ccc1a14d was queued before the switch: /c/NightShift/ann1-check.log, ann1-e2e.log, if it ran).
2. GPU sheets before (master) / after on the desktop (E2E_GPU=1): the rows REPORT-B lists.
4. Course Ready N4 inputs (orchestrator ~12:40; feature/anim-n4 082be068, hooks marked "(anim-n4, track A)" in
   animGraph.ts / characterRig.ts): carry-walk slides 8.7 cm, all from the planner. (a) Slow-walk late stance: the toe
   slides 5-7.5 cm back while the heel rises (free walk at 0.75 m/s: 5.2 cm): check HOLD_CONTACT covers it at slow pace.
   (b) The carry-walk start turn (73 deg body, the lift 50 deg): the planted foot winds 13-20 deg and moves 9-10 cm: the
   ball pivot should cover it. Measure both (harness rows) before the PR.
5. PR (minor) after check + area suites (merge trains: no per-PR full e2e); the PR body lists every metric switched to
   the contact point with old and new values.

## Carried for N2 (orchestrator, 2026-10-22 ~10:40)
Michael approved lifting SWAY_MAX to ~5 cm (realistic side sway; he fine-tunes in the tuner).
Test tier: PRs touching only the tuner / Anim Studio or tests merge on CI + the suites they touch (CLAUDE.md on feature/menu).

## Assumed decisions (job lead 2026-10-22 ~11:05; orchestrator: no objections ~11:20)
Undo for each: revert the named part of the N1 PR.
1. Turn metrics measure the contact point (min heel / ball travel, the audit's definition); existing ankle metrics stay
   on straight gaits; a turn-state metric that switches to the contact point is marked `(anim-natural-n1)` and the PR
   body lists every switched metric with old and new values (so it cannot read as a loosening).
2. The straight-gait heel-raise ball slip (cause 6, 2.8 cm) is N1's last step.
3. The run pelvis lag (keyed trunk) is N2's.
4. Guards get the turn rule (shared planner), with `PlannerInput.turnRule` to opt out only if their rows get worse.
