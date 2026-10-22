# sector-redesign - brief

Job lead: Night Shift | Course Ready Build. Branch `feature/sector-redesign`, folder `C:/NightShift/Mobile-Coop-sector-redesign`,
cut from `feature/sector-fixes-r2` 5bfbf85d (the r2-nav bolted-door nav closures and the r2-bolt unbolt reach cap) merged
with master 4.63.1 (d21f4eda). Started 2026-10-23 ~01:45. Report to "Night Shift | Orchestrator".

## Michael's words
- M1 (2026-10-23 ~01:35, verbatim): "regarding sector ops, i want to make it larger and with more sections (5 max),
  accomodate more guards in each section, more security that gradually gets harder, cameras need to have less range
  (they currently pick the player up well outside of the intended area), should have coop only pathways but still able
  to complete solo if someone wanted to. doesnt have to keep the same layout or warehouse map. level design must be well
  flowing, no random lasers or cameras for the sake of having them, why would they be there in that location, what are
  they protecting, why would there be melee only guards they should all have weapons, guards should interact with
  eachother and have reason to what they are doing or protecting. must take careful planning and observation to pass.
  review lighting also, i think the rules may be too strict and the levels are very dark and unrealistic. there
  shouldnt always be shadows, the player may have to make shadows (disabling lights etc). ask me questions as needed"
- M2 (~01:40): "Stop r2, fold into redesign": r2-nav / r2-bolt engine fixes kept; the r2 warehouse geometry work
  (r2-paths, r2-jump) stopped, its findings kept as spec notes (docs/sector-fixes/r/R2-PATHS.md, R2-JUMP.md).
- M3 (~01:40): "Parallel, own session": Course Ready leads this job and drops the marlow-final second-builder role;
  Marlow Yard and mocap keep first claim on the laptop.
- M4 (~01:40): "Plan, then build": research, then SPEC.md (from docs/templates/map-spec.md) and PLAN.md for up to 5
  sections, then greybox slices straight on. Michael reviews both in the morning.
- M5 (~01:40): camera-range cut and lighting rule review on "All maps": the range cut is one engine change (its own
  small PR, `feature/camera-range`; keep off ctDevices.ts / securityRoom.ts, owned by Menu Notes tonight); the lighting
  review is one proposal for Michael, shared with Menu Notes' lighting agent in `docs/lighting-review/PROPOSAL.md`
  (on origin/feature/marlow-final): loosenings proposed, never applied without his approval.
- Earlier, kept: 2026-10-23 ~00:45 "true 2-player pathways that cannot be used solo, but doesnt break solo play".

## Goal
A larger Sector Ops level of up to 5 sections: security that ramps section by section, more guards, all armed, each
guard, camera and laser with a stated reason (what it protects, why there), guards that interact, co-op-only pathways
that a solo player can bypass by a normal route, flowing layouts that reward planning and observation, believable
lighting where players make their own shadows. Prototype first (CLAUDE.md current goal): greybox, basics only.

## Limits
- docs/level-design.md and docs/templates/map-spec.md change only with Michael's approval: proposals go in
  docs/lighting-review/PROPOSAL.md or a "Proposed loosenings" list in SPEC.md.
- Hard rules (CLAUDE.md): no runtime network, light parity, gameplay never reads graphics state, hot paths allocate nothing.
- Sector Ops stays low priority for the laptop behind Marlow Yard and mocap.

## Questions sent to Michael (~01:50, through the orchestrator)
Q1 setting, Q2 run length, Q3 guards per section, Q4 lighting default, Q5 security tools. Answers land here as M6+;
unanswered by ~02:05 -> assumed decisions below.

## Assumed decisions
(A1, A2, ... with how to undo; added as the job goes.)
