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
