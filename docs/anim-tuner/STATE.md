# anim-tuner - state

## Now
anim-tuner merged as 4.20.0 (PR #56). tuner-pad (pad control) PR open from feature/tuner-pad.

## Next
1. The orchestrator merges tuner-pad on its tests + CI.
2. Michael tunes and exports `anim-tune-<date>.json`; a later job folds the values into the defaults.

## Open (polish list, CHECK.md)
- The barrel marker allocates inside Babylon each frame while ticked; the panel and its DB are built at every boot.
- e2e-ctcourse ran past 600 s on the desktop during the e2e:quick (laptop runs 240 s): watch the next full run.

## Done
- 2026-10-20/21: implementer pass 1-3, check PASS, review fixes, master 4.19.1 merge (hooks re-applied, glideTwistMul), merged as 4.20.0 (#56); tuner-pad: pad control (D-pad pick / nudge, LB / RB state, Y reset, A export, B close, View hands the pad to the game), check + e2e-menus green.
- 2026-10-20: worktree and branch from dedcfcc5; BRIEF.

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for anim-tuner. Folder C:/NightShift/Mobile-Coop-anim-tuner, branch
feature/anim-tuner (PR to master). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-anim-tuner && test "$(git rev-parse --abbrev-ref HEAD)" = feature/anim-tuner && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-anim-tuner"
Read CLAUDE.md, docs/anim-tuner/BRIEF.md and this STATE.md; carry on from "Next". Report to "Night Shift | Orchestrator", then STOP.
```
