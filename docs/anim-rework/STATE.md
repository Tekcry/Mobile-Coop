# Animation and controls rework - state

Updated 2026-10-20 18:40 Sydney. Branch feature/ct-prototype (folder C:/NightShift/Mobile-Coop-ct-prototype), merged
with master 4.14.1 and the side branches #38 / #40 (anim-metrics), #39 (anim-rig), #41 (anim-guard). Brief `BRIEF.md`
(Michael 13:30-13:40, M1-M5, A1-A3), plan `PLAN.md` (slices 1-6 and the wide-stance findings), metrics `METRICS.md`,
rig `RIG.md`.

## Resume
New local session, Opus. Paste:
```
CT Core Build: RESUME anim-rework. Work only in C:\NightShift\Mobile-Coop-ct-prototype on feature/ct-prototype (git pull --ff-only). Read CLAUDE.md ("Sessions"), docs/ROADMAP.md, docs/anim-rework/BRIEF.md, PLAN.md and STATE.md (this file), then carry on from STATE "Now". CT Core has first claim on the desktop lock; before any heavy run check C:/NightShift/heavy.lock, write your line while you run, delete it after; send long logic suites (e2e-ctcourse, e2e-coop, e2e-netmove, full e2e) with the exact commit to "Night Shift | Character Build" (laptop). Each slice: Opus implementer from the brief, Opus independent check, one fix round, npm run check, desktop e2e:quick + laptop co-op suites solo, a contact sheet for Michael, /ct/, a small PR to master the orchestrator merges. Report to "Night Shift | Orchestrator". No em dashes.
```

## Now
- Slice 1 merged to master (#43, 4.15.0). Branch fast-forwarded to master 89f061e7 (4.15.1, #44 phone-min) at 18:35.
- Slice 2 started 18:40: an Opus implementer on standing holstered locomotion (scope A4 below), report `S2-REPORT.md`.
  Then an independent Opus check, one fix round, npm run check, desktop e2e:quick + laptop e2e-ctcourse / e2e-coop /
  e2e-netmove solo, a contact sheet for Michael, /ct/, the slice 2 PR to master.
- A4 (assumed, CT Core 18:40): slice 2 is the standing holstered set (idle, walk, jog, run as one speed blend, starts,
  stops, turns on the spot, 90 / 180 direction changes) and gates walk / jog / run. The crouched holstered set (crouch
  walk and run, sneak, crouched idle) moves to slice 4, which already owns those clips. Undo: add them back to slice 2.

## Next
- Slice 2 (holstered locomotion standing and crouched, idles, starts / stops / turns on the spot / direction changes,
  continuous speed and direction blends) from `PLAN.md` and the #40 findings: Michael 14:45 still sees a wide stance in
  the walk; starts (knees 1.5x hips, 16 cm off, 8-9 cm slides), turns from a standstill (1.43x, 14-15 cm), 90 / 180
  changes (knees 7-12 cm outside the ankles, 4-10 cm slides), idle / stops (elbows 9 cm out). Keyed clips via the G8
  pipeline (scripts/anim-keys, src/anim/keyed.ts, src/anim/clips/keyed/), real-world operator reference, never traced.
  Switch each gait's CRAB_GATES flag (src/anim/audit/limits.ts) on as it passes. Contact sheets for Michael.
- Then slices 3-6 (`PLAN.md`). Slice 3 owns the aimed strafe crab (knees 2-2.8x hips, feet 45-53 cm off the line) and
  aimed backwards. Slice 4: the knee-hand clip needs its own path (the keyed wrist frame applies in keyedArm, which is
  off while the knee hand runs, characterRig.ts ~2053). Slice 6 wires #41's guard clips.

## Open items
- Slice 1 polish not done: `player.ts`: while the gun is suspended (team move, carry, strike) with LT held, `ads` stays
  true and the aim camera stays up (as before the slice).
- Vision mode carousel in the selection wheel (Michael): given to the night-vision job, not ours.
- e2e-menus' title fade check and e2e-stealth's look-input check are wall-clock sensitive on a loaded desktop.
- H1 (park/ct-h1-wip, local branch, unverified): the crouch-run roll may still be wanted in slice 4.

## Michael's answers in this job (docs/ct-prototype/DECISIONS.md rows dated 2026-10-20)
- 13:30-13:40 the brief (M1 X tap holster / draw; M2 LT from holstered draws to aim slower, a sling draw; M3 RT tap
  knockout / hold kill; M4 traversal auto-holsters and returns; M5 the guard hold: slow, backward-first, limited turning,
  knife at the throat, choke / knife).
- 14:45 "The character definitely had a wide stance in the previous walk test".
- 14:55 jammer: "Another button - what makes sense? RF?" (RB / F held while aiming the pistol); A: "Interact always"
  (reload is X hold).
- 15:25 Toggle aim: "Remove it".
- Assumed A1 (KBM Shift run, Alt creep), A2 (reload on X hold; A no longer reloads after 14:55), A3 (no fire from low
  ready).
