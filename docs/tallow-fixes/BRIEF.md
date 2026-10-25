# tallow-fixes (J8): brief
Owner: Night Shift | Campaign Build. Status: current (job doc).

Lead: Night Shift | Campaign Build. Started: 2026-10-25 ~19:00 (plan), fix round 1 ~20:30, fix round 2 ~21:30. Base: `feature/mission-engine`
(stacked on #372; reaches master through the PR C split), after B0 at J7 R0. Plan: `docs/missions/slices/J8-J9-PLAN.md`
(the draft for `docs/tallow-fixes/PLAN.md`; J8 shares the plan and its check with J9, `docs/tallow-shutters/`).

## Michael said
- 2026-10-18 (G98 directive, wall medkit stations in every map): "Anything that isn't a part of the original chaos
  theory shouldn't exist."
- 2026-10-24 ~22:45 (G292): "All campaign missions are strictly coop and cannot be completed solo, must have forced coop
  traversal to proceed (help player climb a wall, throw coop player over a gap to open a locked pathway for the other
  player, and any suggestions you have)."
- 2026-10-25 ~09:05 (G329): "On the current build the s1 car park is still very dark which is unrealistic, car parks are
  generally well lit".
- 2026-10-25 ~11:20-11:35 (G359, re-audit 13): "32 alive, but also research how many guards are normally active in
  splinter cell series missions and tell me".
- 2026-10-25 ~18:05 (Tallow Wharf map sign-off page): "approve as drawn, id rather physically walk the map once built and
  confirm changes".

## Michael picked
- 2026-10-25 ~16:40 Q1 Tallow and the 12 level-rule changes -> "Review all 12 first"; then ~18:05 the Tallow hold ->
  "Build now, walk later (Recommended)"; ~18:20 the 12 level-rule changes -> "Adopt all as recommended (Recommended)".
- 2026-10-25 ~16:40 Q2 dark spots from lights left off -> "Never" (FOLDED-PLAN option text: "every light works;
  darkness only from cover, cut circuits and shot lamps"; ROADMAP paraphrase "cut power").
- 2026-10-25 ~16:40 Q3 light levels -> "Australian standards (Recommended)".
- 2026-10-25 ~16:40 Q7 robot route-runs -> "Never stuck (Recommended)". Q8 civilians -> "None on Mission 1
  (Recommended)".
- 2026-10-25 ~16:50 Q12 campaign riot shields -> "No, armed only (Recommended)". Q19 campaign rewards -> "None
  (Recommended)". Q22 Tallow sign-off pages -> shown and signed ~18:05 (above). Q23 Tallow throw gaps -> "Force co-op".
  Q27 meter-vs-picture -> "Yes, every release (Recommended)".
- G285 (c) 2+ independent routes per section; G333 hardened lit chokes -> "Everywhere"; G335 lookouts and pairs -> "Add
  both".
- ROADMAP "Decided" ~19:00 (relayed by the lead): free assets allowed when the licence permits commercial sale, credited.
- 2026-10-25 ~20:45 (native multiple choice, relayed by the orchestrator) Tallow throw gaps -> "Mix of both": per spot,
  the plank bridge (G403, waits for Player Build's kit moves) or a longer throw at that spot (5.8 m over a 4.9 m gap;
  Marlow updates the validator's throw-gap row only for the spots that use it); at least one spot buildable now. The
  lead's picks: M2.
- 2026-10-25 ~20:45 closed rooms at night -> "Yes, night lights only (Recommended)" (A1 confirmed): M1.
- 2026-10-25 ~20:25 Teale knocked out before he talks -> "Restart the section (Recommended)": a section restart with
  Teale at his table, not a rule break (#372 `docs/missions/BRIEF.md` M6, framework 67464e03).

## Goal
Tallow Wharf (campaign Mission 1) becomes a greybox that meets the level standard and the hard rules: every throw needs
both players, every forced gate has a quick way back for a downed partner, every light works (lit to Australian bands,
darkness from cover, cut circuits and shot lamps), medkits and hide spots are in, and the map's pages tell the truth,
so the greybox exit (measured validator, bot route-runs, Michael's walk) can run.

## Limits
- Out of scope: shutters (J9, `docs/tallow-shutters/`), mission rules (J7), lookouts and pairs (G6, after Guard AI's
  J15), new co-op kit moves on Tallow (A13), external assets (A23), the measured validator pass and the walk card (J23).
- Rules that hold: CLAUDE.md hard rules (light parity, hot paths, no runtime network); level-design and the G157 12
  changes as adopted; G2 / G48 (exactly two players), G285, G292, G329, G333, G359; Q2, Q3, Q19, Q23.
- Areas touched and their unwalked count: Tallow is dark behind `missions` (no switch-on; walk cap counts at switch-on).
- Flag: `missions` (`?missions=1`), owner Night Shift | Campaign Build, switch-on date 2026-10-27 (A26).

## Answers (M) and assumptions (A)
- M1 (~20:45, was A1) Closed spaces (pie shop, clock loft, lane-window loft, strongroom, partners' office, shed two)
  are lit only by night and emergency fittings; every fitting works.
- M2 (~20:45 "Mix of both"; spots picked by the lead) C4 pawn loft -> reading room (Three Grey Coats' main route) and C5
  arcade roof -> W3 roof (both missions pass it): a longer throw, 5.8 m over 4.9 m (built now, TD). C4 pie loft -> clock
  loft (only on the route after a broken rule): the plank bridge (G403), built when Player Build's plank move lands;
  until then that gap stays 2.5 m with today's throw, flagged as not yet forced. Why: the two routes every run needs
  are buildable now; the realistic plank goes where a loft-to-loft lightwell suits it. Undo: swap a spot's kind (data
  per throw site).
Assumptions (full text and numbers in the plan, section 3):
- A1 Answered: M1.
- A2 Provisional bands from light-realism's draft table. Undo: data re-tune when Michael's table differs.
- A3 Night floors as the campus. Undo: restore `ambient 0.3` / `lightLevel 0.3`.
- A4 Forced throws (M2): the two long-throw spots (C4 pawn loft -> reading room, C5 arcade roof -> W3 roof) carry a
  5.8 m throw over a 4.9 m gap (beats both solo-jump models by over 0.2 m, at every take-off height near the stage:
  plan A28), landing edges `noLedge`. The pie loft -> clock loft throw stays a standard 2.5 m throw, not yet forced,
  until the plank bridge (A13). Undo: drop the site lengths and restore 2.5 m gaps (throws solo-jumpable again).
- A5 Way backs: enclosed bridges along the lightwell ends, gate at the south end bolted on the bridge side. Undo: a drop
  or a kicked-down ladder.
- A6 Jetty way back: a one-way drop from the jetty to the canal ledge. Undo: move the quay ladder closer.
- A7 Roof access through a plant room (the arcade lofts are not a secure building under 16.2.5). Undo: a stair bulkhead.
- A8 One medkit station per section with a real reason. Undo: one per map.
- A9 Hide spots by every takedown spot. Undo: none needed.
- A10 The build is the truth for guard counts; no guard added. Undo: n/a.
- A11 Splits declared from the BEATs, each ending in a joint action. Undo: drop a split and its BEAT line.
- A12 No new one-click for J8's geometry: the changes go on the walk card ("confirm changes"). Undo: a one-click on the
  corrected drawing before J23.
- A13 No new kit moves on Tallow in J8 / J9; the plank bridge at the pie loft comes later as slice PB (Campaign Build,
  after Player Build's plank move, with Marlow's `plank_bridge` validator kind and Guard AI's notice hook). Undo: a
  later Tallow pass.
- A14 Lookouts and pairs wait for Guard AI (J15). Undo: n/a.
- A20 B0 at J7 R0 (with the Q19 reward commit; done: 925fa3784, e4eace3bd), B0b after TW23; the graph stays in `campaign-map/`. Undo: J8 docs on a
  branch off master after #372 merges.
- A21 J8's PRs stack on `feature/mission-engine` and reach master through PR C. Undo: retarget after PR C merges.
- A22 Validator gate: 0 ERR on master's validator, except two named throw-gap lines (graph links 28 and 33, the two
  long-throw spots) until J12's long-throw exception lands (validator-port A27, S7a / S7b: `exception: "long_throw"`,
  a 4.9 m gap cap); the pie link is a plain 2.5 m throw with no exception. Undo: J12's ported validator once on master.
- A23 Free assets only after the greybox gates, each download with the lead's go. Undo: in-repo props.
- A24 ("tallow-fixes A24") Answered: M2 approves the longer throw at the two named spots only (per-site throw length;
  default 3.2 m everywhere else). The scale-sheet row's new wording ("Long throw (named spots only)", Marlow, J12 A27)
  goes to Michael with the walk card. Marlow's validator work is unblocked.
- A25 The reading room's stair-head door opens from inside only (forces C4; exits open from inside). Undo: unbolt it and
  drop the bridges (the gate-reach errors return).
- A26 `missions` switch-on date 2026-10-27 (as `flags.ts:68` and J7), after Michael's Tallow walk; on only when he
  accepts. If the walk moves, J7's owner (Campaign Build, the R1-R2 PR) edits `flags.ts:68` and the orchestrator the
  ROADMAP row. Undo: move the date.
- A28 The lightwell's west half widens by shortening the pawn loft (the pie loft keeps its depth until the plank); the
  C5 lane gap widens on one side; no solo-standable top within its own reach + 0.2 m of a forced stage, by height (the
  arcade roof edge over the pawn loft steps back; the lane's fire-escape deck becomes a cage); heights unchanged. Undo:
  per A4.
- A29 The clock-mender's door is locked from both sides until the plank bridge (he is out tonight), so the jumpable pie
  gap leads nowhere: `W2_BOLTS` and the graph say so, and a test proves the pie loft cannot reach the reading room
  alone. Undo: the plank slice restores its bolt.

## Questions for Michael (one click each, asked by day)
- None open (Q-A1 and Q-A24 answered ~20:45: M1, M2). The long-throw row's wording goes to Michael on the walk card,
  with the changes since the drawing (the plan's section 12).

## Sign-off needed
No new page: Michael approved the drawing (~18:05) and confirms the changes on his walk (A12); the changes list goes on
the walk card.
