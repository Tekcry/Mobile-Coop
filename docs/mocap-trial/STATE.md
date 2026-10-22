# mocap-trial - state

## 2026-10-22 ~23:20: fix round in (30c8ee3c), master 4.60.0 (44d7c2a7), six GPU suites running
- Fix round (docs/mocap-trial/FIX-1.md): CHECK 1, 1b, 2, start-slot arms 0.5, note 5, plus two planner fixes for clip feet
  (no turn-rule step while the other foot is about to lift; the planner swing's side pass fades in / out). Walk 1.4 / 2.0 x
  turn 1.5-4 rad/s: pelvis beyond speed x dt 0.8-1.7 cm (2.0 x 4: 2.005, left out of the assert), bone step 19-24 deg;
  start toe 26.0 -> 14.6 deg. Switch OFF byte-identical to master 4.59.0. mocapSwitch 12 / 12 (new pelvis-step assert).
- Michael M1 (~22:55, BRIEF): "Mocap, as captured": old limits are notes. Sheets: feature/mocap-sheets-real 04598e9a (on
  82f43716); Menu Notes reruns turn / start rows on 44d7c2a7.
- Running: /c/NightShift/mt-e2e.sh (desktop heavy.lock, 23:19): /c/NightShift/mt-e2e.out + mt-e2e.log.
- Next: six pass -> REPORT.md -> PR (minor; suites, sheets, A4 / M1 notes) -> orchestrator. Then the gap takes.

## 2026-10-22 ~22:50 SAVE: checker FIX (CHECK.md), suites 5 / 6 (studio = master timing)
- Next: (1) merge origin/master 4.58.3 (clean expected); (2) one Opus fix round on CHECK.md required 1, 1b, 2, decide 3
  (cap start-slot arm weight 0.5), note 5 (gate the pitch < 0 branch on clip feet); (3) rerun the six suites on the GPU
  (/c/NightShift/mt-e2e.sh, detached); (4) REPORT.md, PR (minor; suites + Menu Notes sheets in the body).

## 2026-10-22 ~22:35: real CMU clips in (a05bdde7); six GPU suites running
- Integration done: subject 16 walk / jog / run, walk turns 16_18 / 16_19, start 16_31, stop 16_34, turn in place 69_13;
  MOCAP_LAYERS tuned (the capture's own arms, twist, lean, follow); headless slide 0, stride 1.000; mocapSwitch 12 / 12.
  Open (REPORT to write): walk bob 5.5-6.6 cm (bible D2 4 cm), walk knee-out at the 3.5 limit, run arms 24 vs 85 cm.
- Desktop GPU suites (switch off) started 22:16, detached: /c/NightShift/mt-e2e.out + mt-e2e.log (anim, clip, move,
  studio, coop, netmove). Menu Notes runs the side-by-side on a05bdde7 (feature/mocap-sheets).
- Next: suites pass -> fresh checker -> PR (minor, suites listed, sheets linked) -> orchestrator; then the gap takes.

## 2026-10-22 ~22:25: gap takes downloaded (standing OK), not yet in SOURCES.md
- `.mocap-cache/`: 104.asf + 104_06, 104_08 (StartJog), 104_53, 104_54, 104_55 (StartRun), 104_09, 104_10 (JogStop);
  69_16, 69_17, 69_18 (turn in place); 127.asf + 127_15, 127_16 (Run Turn L / R); 143.asf + 143_03 (Start to Run);
  78.asf + 78_31 (Pivoting). Add them to SOURCES.md (the integration agent edits it: after its hand-back), then run them
  through scripts/mocap (analyze, retarget, emit) for the start / turn / stop slots.
- Side-by-side: Menu Notes Build builds the GPU sheet script on feature/mocap-sheets (spec in its message); merge it, rerun
  on the clip commit.

## 2026-10-22 ~21:50: switch + clip feet (7ac3b80e) and CMU pipeline (05c1ef15) in; integration agent running
- If the integration is not committed past 6c0e3320, redo it (resume prompt in docs/orchestrator/resume-ct-core.md on
  feature/menu, item 1). Standing OK for more CMU takes (BRIEF approval log).

## 2026-10-22 ~21:05: data in, two agents running
- Download approved in the CT Core session (native question, "Yes, download"): 39 named takes from
  mocap.cs.cmu.edu (subjects 16, 35, 69; ASF/AMC, ~10 MB) in `.mocap-cache/` (gitignored), fetched one at a time
  (the site asks not to be crawled). 69_13 / 69_14 (3.8 MB each) re-fetching with a longer timeout.
- A3 (BRIEF): the keyed clips' leg channels are preview-only today (the foot planner places the feet), so the mocap set
  gets a "clip feet" mode: legs posed from the capture on the gait phase, foot IK only for ground contact and pinning;
  the planner does not choose steps in that mode. Switch off = bit-identical.
- Agent 1 (wiring): `src/anim/clips/mocap/` placeholders, `?mocap=0/1` + Settings "Mocap locomotion" (default off),
  clip-feet mode, MOCAP_LAYERS scales, tests/mocapSwitch.test.ts, CLIP-FORMAT.md, fragment.
- Agent 2 (pipeline): `scripts/mocap/` ASF/AMC reader, take analysis (TAKES.md), intermediates and stick sheets in
  `build/mocap/`; phase 2 emits clips in CLIP-FORMAT.md's shape.

## Next
Commit both agents' work -> move emitted clips into src/anim/clips/mocap/ -> tune MOCAP_LAYERS -> proof sheets (GPU,
current vs mocap) -> fresh checker -> PR (minor) -> message the orchestrator.

## Resume prompt
```
mocap-trial: RESUME. Night Shift | CT Core Build. Folder C:/NightShift/Mobile-Coop-mocap-trial, branch
feature/mocap-trial. Read CLAUDE.md, docs/ROADMAP.md, docs/mocap-trial/BRIEF.md, SOURCES.md and this STATE; carry on
from "Next". Raw data: .mocap-cache/ (gitignored; re-fetch the takes in SOURCES.md if missing, one at a time).
```
