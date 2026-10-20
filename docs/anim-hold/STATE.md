# anim-hold (anim-rework slice 6, close quarters: Wren's side of the hold) - state

Given by CT Core Build, 2026-10-21 (Michael: movement first; the orchestrator: take further movement pieces from CT Core).
Job lead: "Night Shift | Sector Ops Build". Branch `feature/anim-hold` from origin/master 6a4fb07f (4.20.1), folder
`C:/NightShift/Mobile-Coop-anim-hold` (node_modules a junction to Mobile-Coop-phone-native's; same lock). Push it; never
merge it: CT Core merges it. Brief: docs/anim-rework/BRIEF.md M5 + section 3 "Holding a guard", S6-KEYS.md, RIG.md,
docs/systems/takedowns.md; guard clips guard_held_* / guard_choke_sag / guard_knife_collapse (#41) wired in phase. Scope
(may / must not touch) and "done" are in CT Core's message, copied into the implementer prompt (summary: six hold clips +
the guard's in sync, M5 hold movement and turn cap, no clipping in e2e-clip, `npm run check` + e2e-takedown + e2e-clip
pass, docs/anim-rework/S6-REPORT.md; logic e2e on port 4193). Opus implementer, Opus checker, one fix round max.

**Now:** STOPPED 2026-10-21 ~00:15 on Michael's word ("Turn off movement slices and any research", via the orchestrator
and CT Core). The implementer was stopped while reading; it had written no file, so no WIP code exists
(`docs/anim-rework/S6-REPORT.md`). Not merged anywhere.
**Next:** only if Michael turns movement slices back on: restart the implementer from the brief above, then the checker,
one fix round, hand the head to CT Core.
**Open:** -

## Resume prompt
```
Night Shift | Sector Ops Build. You are the job lead for anim-hold (anim-rework slice 6, the hold). Work only in
C:\NightShift\Mobile-Coop-anim-hold on feature/anim-hold (git pull --ff-only first; node_modules is a junction, never
npm ci). Read CLAUDE.md "Sessions", docs/anim-hold/STATE.md, then docs/anim-rework/S6-KEYS.md and S6-REPORT.md if it
exists. Carry on from STATE "Now / Next": Opus implementer, fresh Opus checker, one fix round max. Desktop heavy.lock
with noclobber, CT Core first, logic e2e on 4193; else the laptop with the exact commit. Done: push, message CT Core
Build with the head, copy the orchestrator. Lean tokens.
```
