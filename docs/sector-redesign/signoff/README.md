# Campus S1-S5 sign-off pages (overnight 2026-10-24)

Orchestrator ~22:50: plan the campus S1-S5 fixes and the S3 re-plan against
`docs/orchestrator/MISSION-DESIGN-AUDIT-2026-10-24.md` section 4 and the #346 validator errors
(`docs/level-validator/campus-run/REPORT.md`, `S1.md`..`S5.md`). One page per section for Michael's one-click
sign-off (template `docs/templates/signoff.md` on feature/intake-gates). No greybox before he approves.

- `before/S<N>-<y>.svg`: the map as built, per storey (`node scripts/plan-svg.mjs campusOps --floors ... --bounds ...`,
  1 m = 10 px, north up).
- `S<N>.md` + `S<N>-plan-<y>.svg`: the proposed plan and its intent check.
- `../graph/plan/campusOps-S<N>.json`: the proposed graph (one file per section, owned by that section's planner).
  Validate all five together: `node scripts/level-validate.mjs docs/sector-redesign/graph/plan/campusOps-S{1,2,3,4,5}.json`.
  Players [1, 2, 3, 4] (assumed overnight, orchestrator).
- `SYNC.md`: the sync nodes per section, agreed with Marlow Build (mission-framework) 2026-10-24 ~22:55.

## Sync-node contract (agreed with Marlow Build ~22:55)
1. Marlow owns the mission specs (objectives, rules, teams); Sector Ops owns the layout and reserves hooks.
2. Each section: 2 parallel tracks (A high / upstairs, B ground / service) meeting at the exit, and 2+ sync nodes, each a
   real device. Graph node fields: `"id": "sync-s<N>-<name>"`, `"kind"` (power_cut | camera_loop | code_source |
   code_sink | pair_door), `"space"` (space id), `"src"` (device code file:line, or "planned"), `"lead"` (space id of its
   in-world lead: a readable document / terminal or a guard post with an overheard line, near the node).
3. Split Shift on S2 (L1-L2 offices = Team Ghost, G plant / breaker = Team Shadow power cut). Code Relay on S4 or S5
   (code from a named officer, vault keypad, 30 s window named in the briefing).
4. Solo: every sync node can be done by one player in sequence (a pair press has a solo timer fallback, named in the
   briefing).
5. No markers or stripes: guidance by room function, the light language (white cone patrolled, warm lamp objective,
   dark route) and one landmark per section.
