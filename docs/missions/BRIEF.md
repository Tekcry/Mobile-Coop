# mission-framework - BRIEF

Lead: Night Shift | Marlow Build. Branch `feature/mission-framework` (from master 92d0205d, 4.97.x), folder
`C:/NightShift/Mobile-Coop-mission-framework`. Started 2026-10-24 ~22:45 by the orchestrator from Michael's decisions.

## The ask
Michael's mission decisions (2026-10-24 ~22:12, ROADMAP Decided, native multiple choice on
`docs/orchestrator/MISSION-DESIGN-AUDIT-2026-10-24.md` on feature/menu):
1. Breaking a mission rule = SECTION RESTART (the team goes back to that section's checkpoint; the mission continues).
2. Up to 2 strict rules per mission, signposted in briefing + objective list; "ghost" counts as one (lifts G125's
   one-fail-rule cap).
3. Guidance: no markers + an optional hint layer (off by default); in-world guidance only (objective text names places,
   leads, light language, landmarks); Marlow's stripes go.
4. First prototypes: Three Grey Coats + Two-Key Ledger (campaign, 2p) and Split Shift + Code Relay (Sector Ops, 4p).
Earlier the same evening (~21:45 / ~21:52): campaign 2-player co-op only with strict rules; Sector Ops 4-player co-op,
parallel objectives for two teams or a solo player doing them all, strict rules allowed too (global / per team / split).

Orchestrator brief (~22:45): engine (branching / parallel objective chains per team, intel -> exploit,
interrogate-a-named-target, up to 2 rules per mission / team with ghost = one, section restart on a broken rule,
optional hint layer off by default, extraction step); validator objective / rule / sync nodes; remove Marlow's stripes /
guidance marks; prototype specs for the four missions (beat chart + connectivity graph + one-page to-scale plan each)
for Michael's one-click sign-off in the morning; NO greybox before he approves. Engine slices: Opus build, two checkers
on anything touching `src/net`. Coordinate rule / scoring overlap with section-rating.

Research: `docs/missions/research/1-current-docs.md`, `2-ld-craft.md`, `3-popular-missions.md` (copied from
C:/NightShift/scratch/mission-audit/); the synthesis is the audit doc above (sections 4 and 7).

## Assumed decisions (overnight, orchestrator ROADMAP "Now: mission-framework"; each undoable)
- A1 Sector Ops validator `players: [1,2,3,4]`. Undo: back to [2].
- A2 Campaign maps co-op only per G253 (LD 11 solo-first dropped for them). Undo: restore LD 11 wording for campaign.
- A3 A mission's no-kill rule overrides LD 7.3 (lethal viable) for that mission. Undo: rule limited to "no alarms".
- A4 Device windows allowed only when named in the briefing. Undo: held isolators only.
- A5 (lead) Prototype specs are docs only (beat chart, graph JSON, plan SVG); the graphs use the level-validator schema
  from PR #346 / V6 (train 67), plus this job's new node types. Undo: none needed (docs).

## Michael's answers (relayed by the lead from ROADMAP Decided, origin/feature/menu, 2026-10-24 ~22:45-22:50)
These override the brief where they differ (decision 3's "Marlow's stripes go" is withdrawn by M1).
- M1 (~22:45) Marlow Yard is the TRAINING course: heavily guided, it teaches co-op basics, very linear with 1 route;
  split paths and multiple objectives appear only in its later sections, as teaching. Marlow keeps its stripes and
  guidance marks (no stripes-removal slice).
- M2 (~22:45) The no-markers and 3-routes rules apply to campaign missions and Sector Ops only. The validator gets a
  `training` map profile for Marlow (1 route allowed, guidance marks allowed, co-op gates still checked).
- M3 (~22:45) Campaign missions are strictly co-op: every section forces a co-op traversal move to proceed, with no solo
  bypass (examples: boost up a wall; throw your partner over a gap to open a locked path for the other).
- M4 (~22:50) Three Grey Coats + Two-Key Ledger go on a NEW small campaign map: "If it's ready before I'm awake, continue
  to make progress". Order: graph -> spec + sign-off page -> greybox overnight; the greybox exit includes the V6
  measured pass (`level-measure --write`, then `level-validate --require-measured` 0 ERR). Michael reviews in the morning.
- M5 (~22:50) Co-op traversal kit, all approved: boost up a wall, throw over a gap, human ladder / pull-up, hold shutter /
  door, rope brace / descent, vent unlock for the partner; plus "Any other creative coop ideas" (PLAN 4b, marked
  proposed). Every campaign section forces at least one; the new map uses several.
- M6 (2026-10-25 ~20:25, native multiple choice, relayed by the orchestrator) Three Grey Coats, a knock-out before Teale
  talks: Michael picked "Restart the section (Recommended)": the section restarts from its checkpoint with Teale at his
  table; not a rule break. A kill before he talks stays a rule break and he moves (signed page ~18:05).

## Assumed decisions (planner, PLAN.md 2026-10-24 ~23:30; each undoable)
- A6 Campaign maps run on Sector Ops' runtime (`SectorMode`, `mode=sector`) with `players: [2]`; Marlow and Course mode are
  not touched. Undo: a Course-mode adapter for campaign maps.
- A7 Existing objectives are adapted, not migrated: a mission attaches as optional `MapDef.missions`; without one Sector
  Ops runs as today. Undo: migrate `SectorDef.objective` into one-step missions.
- A8 Ghost / no kills / no alarms / no bodies found are read from section-rating's marks (`rateSection`), with its
  defaults (a knock-out is not a kill, a camera alarm breaks ghost). Undo: separate rule counters.
- A9 Teams: slots 0 and 2 = Team A, 1 and 3 = Team B; with 2-3 players one each (the third joins A); solo carries both.
  Attribution: kills, knock-outs, gadgets, interrogations by player slot; ghost by the alerted guard's track zone;
  alarms and found bodies by position in a track's boxes, else against both teams. Undo: mission-scope rules only.
- A10 The hint layer is text only (`gameplay.hints`, default off, Settings > Gameplay). The minimap, compass and
  objective blip are removed in every mode (G339, which voids the rest of A10), hints on or not. Marlow's course
  markers are unchanged.
- A11 Spook: a decoy's interrogation despawns the real target and respawns him unalerted at an authored bolt point with
  his info (no Guard AI change); with the named-target rule it also breaks the rule. Undo: spook = alerted search.
- A12 Replaced (G339): there is no one-chance rule and no window rule. Every strict-rule break restarts the section
  (G290), and time windows are soft only, with no countdown that closes a route (G334).
- A13 Three branches: `feature/mission-framework` (docs, specs, graph-svg; PR A), `feature/mission-validator` stacked on
  `feature/level-validator-v6` (PR B, same train as V6), `feature/mission-engine` (engine, kit, wharf greybox; PR C).
  Undo: one branch and one PR.
- A14 Code Relay goes on S4 (data hall: NOC officer = code source, cage keypad = code sink), final with Sector Ops' S4
  sign-off page. Undo: S5 archive cage.
- A15 Plan SVGs come from a new `scripts/graph-svg.mjs` (graph `area` boxes to scale; `--base` overlays Sector Ops' plan
  SVG), because `plan-svg.mjs` needs built geometry. Undo: hand-written SVGs.
- A16 (lead and Sector Ops Build, ~22:55) Sector Ops owns the campus layout and its fix pages
  (feature/sector-redesign-signoff, `docs/sector-redesign/signoff/S<N>.md`); this job owns the mission specs (objectives,
  rules, teams). Each campus section gives 2 parallel tracks (A high / upstairs, B ground / service) meeting at the
  section exit and 2+ sync nodes, each a real device in `campusOps-S<N>.json` with `id` "sync-s<N>-<name>", `kind`
  (power_cut | camera_loop | code_source | code_sink | pair_door), `space`, `src` (file:line or "planned"), `lead`.
  Split Shift = S2; Code Relay = S4 or S5. Solo: every sync node is doable by one player in sequence; a simultaneous
  pair has a solo timer fallback named in the briefing. The validator adopts these fields. Undo: mission-side nodes.
- A17 Mission graph nodes are top-level `mission`, `objectives[]`, `rules[]`, `syncs[]` in the graph JSON, concatenated
  across merged files; new co-op link kinds `team_throw`, `team_hang`, `team_pull`, `shutter`; a `mark` field (guidance
  mark) is an ERR outside the training profile. Undo: docs only, no validator change.
- A18 The campaign map is "Tallow Wharf" (original name), 4 sections W1-W4, about 120 x 80 m; Three Grey Coats runs
  W1 -> W2 -> W4, Two-Key Ledger W2 -> W3 -> W4. Undo: rename or re-cut at the spec sign-off.
- A19 (lead, 2026-10-25 ~05:00, greybox briefs `slices/GB-briefs.md` 0.1) The three 2.5 m throw gaps can be jumped solo,
  so the loft-side doors are bolted from the far side and the W2 walkway boost keeps W2 forced. Undo: narrow the gaps
  below a solo jump, or drop the bolts.
- A20 There is no fall damage, so the roof drops that would skip the coal chute and jetty moves get 2.2 m drop guards
  (a W3 roof-edge parapet, a caged gantry). Undo: remove the guards once a fall-damage rule exists.
- A21 The W3 restart point is the head of the roof bulkhead stair, shared by both missions. Undo: one point per mission.
- A22 Shutters are reserved as data (a closed stand-in panel) until the kit `tick` hook, world wiring and NET land; until
  then W1's shutter exit and TKL's shed two way are closed, and playtests use debug teleports. Undo: none (temporary).
- A23 Two engine follow-ups before GB6 (slice EN4): a mission may start at a later section (TKL starts at W2; the sector
  run always starts at section 0 today), and per-mission guard lists (one map, two missions). Undo: one mission per map.
- A24 Three Grey Coats: killing Teale before he talks breaks the rule and he moves, as on the page Michael signed
  (~18:05, "He moves"). Knocking him out before he talks restarts the section with Teale still at his table: answered
  by Michael, M6.

## Orchestrator calls (PR C split, 2026-10-26 ~12:55; plan `docs/missions/slices/PRC-split.md`, refresh at engine a2822ab7a)
- A25 The engine reaches master as 16 stacked members C1-C16; only C4 (kit + shutter device, ~1.87k counted lines)
  carries `big-pr`, because S1's late hunk ties `teamController.ts` to the shutter files. Undo: re-cut C4 smaller.
- A26 Tallow Wharf ships as C9-C16, each under the 1.5k cap (map files by file, tests after the built map), not one
  big-pr member. Undo: one wharf member with `big-pr`.
- A27 Members are stacked for review only; each is retargeted to master just before it is labelled `train-ready`, so a
  train never pulls unreviewed base commits. Undo: none needed (train rule).
- A28 NET3 `firstPlace` (a joining client placed at the checkpoint in a Sector Ops co-op match) ships dark behind
  `missions`; if Sector Ops wants it live as a fix, Sector Ops brings it to the orchestrator. Undo: drop the gate.

## Orchestrator calls (prototype mode, 2026-10-26 ~16:20; ROADMAP Decided ~16:05)
- A29 The engine reaches master as 4 members, each `big-pr` with one closest test set, replacing A25-A26's 16 members:
  (a) C1 + C2 core and rules (~2.9k), first, so `missions` / `coopKit` can go on in /preview/ through #560's darkFlag;
  (b) C3-C6 sector, kit, pull-up, shutter AI (~5.9k); (c) C7-C8 net (~2.1k; two Opus src/net checkers and the co-op
  set); (d) C9-C16 Tallow Wharf map, tests and wharf e2e (~8k, mostly tests). Members still follow A27 (retargeted to
  master just before `train-ready`). Undo: back to the 16 members of `docs/missions/slices/PRC-split.md`.
- A30 G5 (the TGC split fix, `docs/tallow-fixes/G5-plan.md`) builds after (d), unless it is small enough to ride in
  it; Tallow W1 joins Michael's playthrough when (d) lands, the uneven split noted. Undo: build G5 before (d).
