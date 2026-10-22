# anim-natural N1 - state

## 2026-10-22 ~16:00: desktop runs on 2ea66da8 (/c/NightShift/ctb6.out)
- e2e-move ok: "stopping: planted feet stay planted at the contact (0.00 cm, ankle 1.87 cm, 2 plants)" (decision 5).
- e2e-clip --log: N1 FAILS "crouched holstered: arms / hands through the thighs" min -3.2 cm (limit -3.0?), the right
  wrist vs the right thigh, crouched and still from t 5 to 16 (/c/NightShift/ctb6-clip-n1.log). Master 6c2d50a4 passes
  at -2.7 (ctb6-clip-master.log). Row summary: N1 knees 11.6 / feet 10.8 cm vs master 11.2 / 9.7: N1's crouched
  feet stand 1.1 cm wider. Cause being traced by an agent (16:00).

## Now (2026-10-22 ~14:30, new account)
Fix round done (e3be8b36, REPORT-C.md: all 10 CHECK findings + Course Ready's two N4 inputs); master 4.53.0 merged
(49c4eca4: footPlanner keeps a guard's GUARD_STEP_ROWS via stepSelectRows under the turn rules; tsc + 12 test files
pass). Running at the save point: a fresh re-checker (finding 1 + REPORT-C's open items + PASS2 item 5, its verdict
comes back as text: write it to CHECK-2.md); the laptop runs check + 14 logic suites on 49c4eca4 (verdict by message
from Character Build); the desktop runs N1's anim-audit (/c/NightShift/ctb-c.log, compare with master's
/c/NightShift/ctb-b.log).

## 2026-10-22 ~14:55 (5-hour pause): the laptop's e2e regressions
Laptop solo on 79be5623: e2e-anim's footSlide TypeError (stale lib bundle; fixed 79be5623) and its turn-block snap
(1032 m/s: a foot airborne on the first frame read its distance from the origin; fixed fc15381f) were test bugs. Two
real failures, diagnosed headless by an agent (scratch repros C:/NightShift/scratch/n1-e2e/, no repo change):
- e2e-move "stopping: planted feet stay planted (3.93 cm)": HOLD_CONTACT (footPlanner.ts:320, anchorFeet :576-600)
  anchors a planted foot at its contact point, so the heel-first landing's roll (HEEL_ROLL.pitch 0.3 rad, land()
  :1509) and the late-stance heel lowering (:1012) move the ANKLE (0.3 rad alone 2.6 cm) while the contact stays put;
  e2e-move (scripts/e2e-move.mjs:120-169) reads the ankle. An exact trade with master: footTurnHarness stop sweep,
  ankle / contact cm, N1 0.6-2.6 / 0, master's planner 0 / 0.6-2.6 (master's pass depended on timing too: paces
  2.2-4.0 give ankle 4.6-4.8 N1 vs 3.9-4.5 master). Assumed decision 5 (job lead, undo: revert the metric): e2e-move's
  stop metric reads the contact point (metrics.ts contactSlide, as the e2e-anim foot lock and turn block do), the 2 cm
  bar kept, marked `(anim-natural-n1)` and listed in the PR's switched metrics (stricter: master's planner would read
  2.6 cm). Built 2026-10-22 ~15:35 (scripts/e2e-move.mjs: heel / ball per rendered frame, contactSlide 2 cm, the
  ankle travel printed alongside); not yet run.
- e2e-clip "crouched holstered: arms / hands through the thighs (min -3.2 cm)": not reproduced as N1's. A headless copy
  of the limb check (crouch 3 s, stick 0.4 / 0.8 / 1.0 crouched, stop, stand) reads -2.8 cm for N1 turnRule 1, turnRule
  0 and the base-master planner alike (S4 baseline -2.6). Next: run e2e-clip on master 5220f79c and on N1 with `--log`
  (the LIMB frames) to see whether it is in-game only (crouch toggle path, the controller's yaw rate) or the base.

## Next (from ~14:30)
1. CHECK-2.md from the re-checker. Blockers only get one targeted fix (the current goal); the rest go on the polish list.
2. Master 4.54.0 (#103 body base, #113) merge; the laptop / desktop results on the exact head.
3. GPU sheets before (master) / after on the desktop (E2E_GPU=1, port 4189): jog / run 90 / 180, sweeps, crouch 90,
   standstill and aimed spot turns (REPORT-B rows).
4. PR (minor), body from REPORT-C "Metrics switched" + harness tables; tell Course Ready (#113's re-measure).
5. After N1: route the Stepping code rules `step.idle lift` -> PLANNER.idleLift and `lock` -> TURN_FOLLOW to Wren's
   generic `sections.step` (anim-bake-all's table): since item 24 the tuner applies them to Wren only but a bake moves
   guards too (orchestrator OK, 14:05).

## Earlier (paused for the 5-hour reset, 2026-10-22 ~12:45)
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

## Resume prompt
```
anim-natural N1: RESUME. Night Shift | CT Core Build, Opus, effort high. Folder C:/NightShift/Mobile-Coop-anim-natural-n1,
branch feature/anim-natural-n1. Read CLAUDE.md, docs/ROADMAP.md, then docs/anim-natural-n1/BRIEF.md, STATE.md (Now /
Next), CHECK.md, REPORT-C.md (and CHECK-2.md if present). Carry on from "Next": heavy runs only under the atomic
C:/NightShift/heavy.lock (or the laptop runner "Night Shift | Character Build" when it is held); subagents Opus, no
full vitest / check / e2e in them; message "Night Shift | Orchestrator" at the PR.
```
