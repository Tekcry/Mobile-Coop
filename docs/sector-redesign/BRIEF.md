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

## Michael's answers (2026-10-23, through the orchestrator; M2-M5 above are his 01:40 answers)
- M6 (Q1 setting): "Corporate research campus".
- M7 (Q2 run length): "30-45 min" (one co-op run).
- M8 (Q3 guards): "up to 24, each section should gradually get harder with more guards and more security." S1 low,
  rising to 24 in S5. Read the guard-cap report (12 / 16 / 24 awake) and flag perf risk; do not cut the count.
- M9 (Q4 lighting, not asked; the orchestrator took it from M1 "there shouldnt always be shadows, the player may have
  to make shadows (disabling lights etc)"): lit like a real site, players cut lights, dark zones only where believable.
- M10 (Q5 security tools): "Include guard dogs": cameras, lasers, alarm panels, keypads, then dogs and armed response.

## Questions sent to Michael (~01:50, through the orchestrator)
Q1 setting, Q2 run length, Q3 guards per section, Q4 lighting default, Q5 security tools. Answers land here as M6+;
unanswered by ~02:05 -> assumed decisions below.

## Assumed decisions
(A1, A2, ... with how to undo; added as the job goes.)
Spec writer, 2026-10-23 ~03:00 (SPEC.md / PLAN.md; A1-A7 adopt CONCEPT.md section 6, refined):
- A1 Names are new (Orrin Systems, Saltmarsh Park, Larchmont Guarding, Tidewater): a Sector Ops site, not a campaign
  mission. Undo: rename, or move the site into a story district.
- A2 Dogs in S4 (1) and S5 (2), each at an armed handler's heel; dogs stay melee (an animal: M1 "all armed" read as
  every human guard). Against DEC G155 for Sector Ops only (M10 newer; Sector is not the campaign). Undo: each dog
  becomes a grunt patrol.
- A3 No runners, heavies, snipers or droneOps; armour only on enforcers (response team, supervisors). Undo: swap kinds.
- A4 Keypad codes are found in the level (overheard, a handover board, the S2 BMS hack), never typed. Undo: keys.
- A5 Every co-op lip meets SPEC "Co-op-only reach" rules 1-8 (tables, benches, cars kept >= 4 m off). Undo: none.
- A6 No motion-sensor (PIR) lights in the first build; "PIR off" rooms are simply unlit. Undo: add PIR later.
- A7 Guards 8 / 12 / 16 / 20 / 24, `perStage` 2, `alarmMax` 3 (S5 peak 30 <= 32). Undo: data.
- A8 One map `campusOps` (new id, new stars record; main-menu stars at `src/main.ts:151` to point at it). Why: sections
  are native data, one live at a time (ENGINE fact 1); per-section maps need an L-size swap system. Undo: chunks (EW-L1).
- A9 Warehouse Ops stays listed until campusOps S1-S3 plays (PLAN slice 3), then is delisted from the Sector selector
  and parked as the regression map (files and tests kept). Undo: keep both listed.
- A10 Encounter spaces use a 0.14 standby fill (LR7's number), connectors / transit 0.30: a map choice, not an LS
  change. Undo: ambient 0.30 (cut circuits then never read dark).
- A11 Breakers and boards are `MapDef.switches` at the real board until EW8 builds an isolator device. Undo: n/a.
- A12 The S5 roof marksman is a grunt with a rifle, not a sniper (no G155 / test exception needed). Undo: sniper kind.
- A13 The element register (LS 16.9) is in SPEC for S1; S2-S5 registers are written in each slice's build sheet before
  that slice builds. Undo: write them all now.
- A14 SPEC fixes S2-S5 footprints, heights, rooms, guards and devices; exact coordinates go in each slice's build sheet.
- A15 No lifts, hatches or roller doors (not in the engine): the S5 document lift is a shaft with a plant ladder,
  roller doors are static dressing beside a plain door. Undo: build EG17-EG19.
- A16 Talking pairs are two guards whose `PatrolRoute.loop` clocks meet and `faces` turn them together, until guard-ai
  GA2 provides conversations. Undo: n/a (GA2 replaces it).
- A17 The S1 co-op route (CR1) pays off as overwatch + a drop takedown at the exit pinch, not an entry into C1 (a player
  inside the connector before the objective would break the connector cycle). Undo: a vent into C1 with an engine guard.
- A18 Co-op routes that use the rope, hang-down, jam-and-pass or pair gates (CR4-CR7) depend on loosening P7 / P8;
  SPEC names each fallback if Michael refuses. Undo: approve P7 / P8.
- A19 Section times (6 / 7 / 8 / 9 / 10 min) are design targets, measured at the slice 5 full run.
- A20 Map-size budget: campusOps load (build + nav + bake) under 2x Warehouse Ops on the laptop; over it -> EW-L1
  chunks or the compact campus. Undo: change the budget.
- A21 Plain `SectorBolt` team doors are not used (one player unbolts them); only pair bolts / pair gates. Undo: n/a.
- A22 The lighting proposal is read from origin/feature/marlow-final (it exists there: LR1-LR12); the SPEC's P1-P6 and
  P11 cite LR items; nothing applied. Undo: n/a.
