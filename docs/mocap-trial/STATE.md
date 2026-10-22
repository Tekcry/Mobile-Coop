# mocap-trial - state

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
