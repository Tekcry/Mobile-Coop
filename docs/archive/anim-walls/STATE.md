# anim-walls (anim-rework slice 5, wire the wall keys) - state

Set by the orchestrator, 2026-10-20 ~22:10, from CT Core's brief (Michael: movement first). Job lead: "Night Shift |
Sector Ops Build". Branch `feature/anim-walls` from `origin/feature/ct-prototype` f46426a5, folder
`C:/NightShift/Mobile-Coop-anim-walls` (node_modules a junction to Mobile-Coop-ct-prototype's; same lock). Push it; never
merge it: CT Core merges it into `feature/ct-prototype`. Brief: docs/anim-rework/BRIEF.md 3 "Walls and corners" + M6,
S5-KEYS.md; the scope (may / must not touch) and "done" are in the orchestrator's message, copied into the implementer
prompt (summary: the six wall clips wired standing and crouched, both sides, within METRICS ranges, wall gates in
e2e-anim, `npm run check` + e2e-wall + e2e-anim pass, before / after sheets in docs/anim-rework/shots/s5/,
docs/anim-rework/S5-REPORT.md). Opus implementer, Opus checker, one fix round max, prototype quality.

**Now:** 23:20. Implementer done, code at 5b91485d (pushed): `src/anim/wallKeyed.ts`, `keyedWallSet` in animGraph,
`tests/wallKeyed.test.ts`, the e2e-anim wall block, `docs/anim-rework/S5-REPORT.md` (results pending). Light checks green
(tsc, eslint, 8 vitest files 106 tests). CT Core held the desktop lock 22:07 onward, so no check / e2e / sheets yet.
- Laptop: `npm run check` + e2e-wall + e2e-anim on 5b91485d requested from Character Build (23:19).
- Laptop on 5b91485d: check ok, e2e-wall ok (30), e2e-anim FAIL "wall recording: slide right: not on the wall (off)" (new wall block).
- Checker PASS (`docs/anim-rework/check-s5.md`); polish there. Fix round done: the block's enter() leaves the wall first (test setup only; no game code, no asserts changed). e2e-anim + e2e-wall on the fix commit sent to the laptop. Orchestrator (overnight): hand the head to CT Core, then stop unless CT Core gives another movement piece.
**Next:** 1. Handed to CT Core 2026-10-21 after round 2 (orchestrator-authorised): only the standing wall idle passes in play; the other 9 wall rows are REPORT-ONLY (open, CT Core; numbers in S5-REPORT "Round 2"): slide feet cross and reach out (footPlanner), knee-out 7.6 cm, peeks run at keyed weight 0, crouched idle track 10.9 cm. Laptop confirm run of e2e-anim on the head requested. Then stop unless CT Core gives another movement piece.
on the desktop GPU (port 4189) under the lock when free; "before" from f46426a5's animGraph. 3. Push; message CT Core Build
with the head (and the open items for its rig), copy the orchestrator.
**Open (for CT Core, S5-REPORT):** 1. rig gate: `characterRig` applies keyed poses only in free gait or drawn; workaround
`keyDrawn` >= 0.02 at the wall; clean fix `|| this.input.wall` in the rig's keyed gate (CT Core's file). 2. No carrier flag at
the wall, so drawn at the wall stays procedural. 3. `wallHeadYaw` kept (the rig holds the head world-stable, cancelling the
keyed neck turn). 4. The knee-hand path ignores the crouched wrist frames.

## Resume prompt
```
Night Shift | Sector Ops Build. You are the job lead for anim-walls (anim-rework slice 5, wire the wall keys). Work only in
C:\NightShift\Mobile-Coop-anim-walls on feature/anim-walls (git pull --ff-only first; node_modules is a junction, never
npm ci). Read CLAUDE.md "Sessions", docs/anim-walls/STATE.md, then docs/anim-rework/S5-KEYS.md and S5-REPORT.md if it
exists. Carry on from STATE "Now / Next": Opus implementer, fresh Opus checker, one fix round max. Desktop heavy.lock
with noclobber, CT Core first; else send e2e-wall / e2e-anim to the laptop with the exact commit. Done: push, message CT
Core Build with the head, copy the orchestrator. Lean tokens.
```
