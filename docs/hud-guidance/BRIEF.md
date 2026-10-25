# hud-guidance: brief
Owner: Campaign Build. Status: current.

Lead: Night Shift | Campaign Build. Started: 2026-10-25 18:15. Base: master 2148ec969.
Jobs: FOLDED-PLAN J3 (PR A, break 1) and J3b (PR B); ROADMAP Now row 9. Rule fixes to shipped features, allowed at
the walk cap (G355).

## Michael said
- 2026-10-18, D-12 research session (G135): "Follow the original: partner beacon (distinct light colour per player) +
  world pings."
- G108 directive: "Anything that isn't a part of the original chaos theory shouldn't exist."
- 2026-10-25 ~09:45, native multiple choice (G336): "Objectives must name what and where, but no map, level design must
  flow naturally towards each objective." and "No maps at all".
- 2026-10-25 ~10:20, docs audit follow-ups (G339), on the minimap: "Remove it too".
- 2026-10-25 ~10:45, native multiple choice (G343): "Objectives can fade in/out in game, must be a short, plain English
  objective. Can we bind to a button to show temporarily? Should also should up when updating objective".
- 2026-10-25 ~11:20-11:35, re-audit (9) (G355): "What do you recommend? All current maps/features should be revised
  once documentation work has been completed".
- 2026-10-25 ~11:20-11:35, re-audit (10) (G356): "Starting values".

## Michael picked
- 2026-10-25 ~10:45 (G343) Q: the objective button -> picked: "View (Select) + O".
- 2026-10-25 ~11:20-11:35 (G351) Q: (5) what the objective popup shows -> picked: "What and where".
- 2026-10-25 ~11:20-11:35 (G355) Q: (9) the walk cap -> picked: "Yes (Recommended)" (rule fixes such as G339's compass
  and blip are fixes, allowed at the cap).
- 2026-10-25 ~16:50 (FOLDED-PLAN Q18, ROADMAP "Decided", not yet in DECISIONS) Q: Marlow drill pointer -> picked:
  "Keep as built (Recommended)".
- 2026-10-25 ~17:00 Q: the folded plan -> picked: "Sign off, start (Recommended)".

## Goal
No minimap, compass, objective / pickup / partner / enemy blip or HQ radar in any mode (PR A). The current objective is
a short line that fades in for about 5 s on every update and on a tap of View / Select (pad) or O (keyboard); the field
menu keeps the full list and the interrogation notes; the co-op connection notice no longer rides the objective line
(PR B).

## Limits
- Out of scope: the mission engine's always-on list and its popup feed and pause list (HG7, HG8 engine part: J7); the
  Sector Ops "where" text (HG10: J5); the doc strikes in the menu SPEC and the stale-term list (HG12: J1); the ROADMAP
  G134 citation (HG13: orchestrator); a radio log (bible 5.10 lists it; not in J3b, see A15); the Kestrel editor's own
  plan view (a dev tool, G15).
- Rules that hold: G86 authority order; G135, G336, G339, G343, G351 (bible 5.10 owns the popup and no-maps rules);
  G108 as narrowed by G343; G292 (Marlow keeps its guidance marks and always-on list); G290 (no markers); G355; G356
  (the 5 s is a starting value); CLAUDE.md hard rules (hot paths allocate nothing, `src/net` behind `flags.coop`, pad
  first, desktop only).
- Areas touched and their unwalked count: the HUD is no walk-cap area; these are rule fixes, allowed at the cap (G355).

## Answers (M) and assumptions (A)
- A1: Two PRs. PR A on `feature/hud-guidance` (removal). PR B on `feature/hud-guidance-b`, cut from PR A's head so its
  slices can start at once; it stays a draft until PR A is released (the train merges, so PR B's diff then shrinks to
  its own commits; no rebase). Undo: cut PR B from master after PR A lands.
- A2: The HQ "Minimap radar" goes with a save bump: `SAVE_VERSION` 9 -> 10, the migration drops `hq.radar`, spent
  credits are not refunded (the v7 -> v8 sonar / marks precedent, `src/save/migrations.ts`). Undo: refund
  `HQ.radar.prices` up to the saved level in the v9 migration, or keep the key.
- A3: The popup ships ON, no flag: the always-on line is itself the G343 break, and G355 allows rule fixes at the cap.
  Undo: revert slice B1 (the line is always on again) or set `OBJECTIVE_POPUP.holdS` to `Infinity`.
- A4: Popup timing: hold 5 s (G343 "~5 s", a starting value, G356), 0.4 s fade. Any change of the line shows it and
  restarts the hold, so the Sector Ops download percent stays visible while it climbs and fades 5 s after it stops; the
  fade-in only plays when the line was hidden. Undo: key the trigger on the line with the trailing percent stripped
  (CONFORMANCE HG9) in `src/ui/hud/objectivePopup.ts`.
- A5: View / O fires on the press; holding does nothing more (G24). An empty line (Marlow Yard, Clear) shows nothing.
  The animation tuner keeps View while it is open (dev only) and its consumed press never reaches the game. Undo: n/a.
- A6: The pad verb `device` ("Mission device (not in yet)") is renamed `objective`; a saved `device` bind carries over
  in `sanitizePadBinds`. Undo: keep the id `device` with the new action.
- A7: The co-op connection notice ("Connecting to host…", "Waiting for host…") moves to its own small line under the
  objective (`.hud-net-status`), shown while set. Not CT HUD: a system notice. Undo: route it back to `setObjective` in
  `src/net/coopClient.ts`.
- A8: The field menu's full list in Sector Ops: every section's objective and exit, in order, done / current / to do. A
  co-op client whose mode has no section state keeps today's one current line. Undo: drop `SectorMode.objectiveLines`.
- A9: Interrogation notes: a "Notes" row in the field menu lists this match's interrogation lines (solo / host from the
  `intel` event; the client from the host's `feed` events, which also carry Sector Ops keypad radio lines: no wire
  change). Undo: drop the row; a later wire flag can tag intel lines.
- A10: The context menu moves up to CT's 10.7 % H now nothing sits above it (`docs/systems/ui.md` HUD). Undo: restore the
  `max(...)` in the `.hud-ctx` `top` rule.
- A11: The Marlow drill pointer stays as built (Q18 "Keep as built"; G292): `courseMode.ts` marker, `pings.ts`,
  `courseMarkers` setting untouched. It is not a minimap, compass or blip.
- A12: Comment-only mentions of the minimap in `src/world/levelBuilder.ts`, `src/world/kit/facilityKit.ts` and
  `src/ui/animTunePanel.ts` stay (the editor's plan view still exists; editing them pulls extra e2e suites for comment
  text). Undo: tidy them in J6.
- A13: No campaign mode on master: the campaign's no-minimap check lands with J7 (the engine shares the HUD). Undo: n/a.
- A14: The engine parts of HG7 / HG8 (its always-on list becomes popup content and a pause list) stay in J7; this job
  gives it the HUD calls (`Hud.setObjective`, `Hud.showObjective`). Undo: n/a.
- A15: The bible's field-menu "radio log" is not built and not in J3b; flagged to the orchestrator, not built here.

## Questions for Michael (one click each, asked by day)
- None. Every open point is an assumption above.

## Sign-off needed
No (removal and a popup at the existing objective spot; no map, layout or look change).
