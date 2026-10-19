# course-ready - brief

Job lead: "Night Shift | Course Ready Build" (desktop). Branch `feature/course-ready`, folder
`C:/NightShift/Mobile-Coop-course-ready`, cut from master 4.7.5 (3a07eee9) on 2026-10-19.

## The ask
Michael (2026-10-19 23:45, verbatim): "I also want coop bunker/training fully prepared for a coop walkthrough test,
including prototype/light visual pass over it to ensure theres sufficient lighting where required."

"Coop bunker/training" is the co-op training course: Marlow Yard (map `ctcourse`, Course mode; Fallow, the old bunker,
stays parked behind `?legacy=1`).

## Goal
Marlow Yard ready for Michael's 2-player co-op walkthrough in the morning on /ct/:
1. Every station 1-8 completable by host and client, with clear prompts, objective text, resets and team moves; no
   dead ends or unclear direction.
2. A prototype light pass: enough light where the players must see (routes, prompts, team-move spots, objectives),
   while dark hiding spots stay dark (CT) and light parity holds (meter, guards and the camera agree with the picture).
   Light registry and baked lamps only; no new art beyond quick prototype dressing. GPU shots on Michael's PC
   (port 4189, `E2E_GPU=1`, headless) in `docs/course-ready/shots/`.
3. `WALKTHROUGH.md`: the menu path from the main menu (no direct links), the version label, station by station what
   both players do.

## Limits
- Files: `src/world` (ctcourse, lights), `src/game/course` and their tests. CT Core Build owns `src/player`,
  `src/anim`, `src/input`, `src/ui` (feature/ct-prototype): a fix there goes to the orchestrator as a request.
- The runner-owned e2e scripts' waits (e2e-ctcourse, e2e-coop, e2e-netmove, e2e-net-lib) change only after telling the
  orchestrator.
- Desktop heavy lock: CT Core has first claim. Logic suites go to Character Build (laptop) when the lock is held.
- Current goal: prototype only, no refining; at most 1 fix round per slice.
- CT Core merges this branch into feature/ct-prototype so /ct/ carries both.

## Michael's answers
(none yet)

## Assumed decisions
- A1. "Coop bunker/training" means Marlow Yard (`ctcourse`), the co-op training level named in CLAUDE.md, not the
  parked Fallow bunker. Undo: run the same pass on `bunker` under `?legacy=1`.
- A2. `src/game/modes/courseMode.ts` counts as this job's file (course mode; no open branch touches it). Undo: hand
  its changes to whoever the orchestrator names.
- A3. The station 2 wall top gets a lamp too (the boosted player climbs and drops there; the survey had it at 0.30,
  near black). Undo: delete that `b.light` call in `ctcourse.ts`.
