# map-ready: state
Owner: Night Shift | Sector Ops Build. Status: current.

## Resume
- Folder `C:/NightShift/Mobile-Coop-map-ready`, branch `feature/map-ready` (from master 2148ec96; src unchanged to
  b81c4945). Guard before every write: `cd /c/NightShift/Mobile-Coop-map-ready && test "$(git rev-parse
  --abbrev-ref HEAD)" = feature/map-ready && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-map-ready"`.
- Phase: plan revised after plan check 3 (FIX, `PLAN-CHECK-3.md`; checks 1-2 kept as history). Last fix round: the
  lead verifies the diff against check 3's fix list. No code on the branch.
- Michael answered ~20:05 (native multiple choice, via the orchestrator): Q3 option 1 "Keep the costly parts, build
  the level at Start (Recommended)" (A18 / A19 decided; S12 / S13 not built); Q1 "20 seconds" (cap 20 s, A2). Q3 was
  sent to the orchestrator 2026-10-25 ~20:05 by the lead. Switch-on no longer waits on Q1 / Q3, only on the walks.
- 20 s cap: cold Epic body compiles are 29-44 s (V12), so every first-ever Epic load hits the cap until S8 lands. S2
  compiles in priority order (player / partners / weapons, live section, near guards, rest); S8 re-planned to close
  the gap right after S1 + S2 (PLAN S8); S6 asserts `capHit` false only on shader-cached loads; co-op grace cut to 5 s
  (A5). Dev builds and a first-ever Marlow Yard / warehouse PC bake can outlast 20 s (live lamps never cut, A3).
- Check 3 fixes: (1) Q16 / #317: A5 (BRIEF:91-101) up to 4 start players from the session; S5 (PLAN:264-299) 3- and
  4-player `mapReadyNet` tests, #317's 4-player Sector Ops part with `mapready=1`, `e2e-net-lib.mjs` claimed; section 7
  lists coop4 with files and order (S2, S5, S6, S11 after #317). (2) S4 over-cap re-plan routed (PLAN S4 "Order",
  BRIEF A15). (3) S10 always requests `e2e-coop` + `e2e-netmove`. Polish: counts, coop-real #388, campus-greybox,
  `.prebake-cache/` outside `node_modules` with pruning, S2 / S9 checkers, Q3 pack lamp-bake line.
- Docs: `BRIEF.md` (picked :16-32, A1-A19 :68-176, Q1-Q3 :177-207), `PLAN.md` (claims :19-88, gate :97-125, slices
  :126-461 with S4 :205, S5 :264, S8 :342, S10 :384, S11 :414, S12 / S13 :439, order :462, flag :468, walk :475,
  risks :491, overlaps :528), `research/start-path.md`.
- Slices: S1 measure (Sonnet), S2 gate + settings first (Opus), S3 warm later arrivals (Opus, two Opus checkers), S4
  shipped campus bake (Opus), S5 co-op ready (Opus, two Opus checkers), S6 e2e (Sonnet), S7 docs (Haiku), S8 shorten
  plan to 20 s (Opus), S9 kept files + textures (Opus), S10 kept shaders (Opus), S11 lobby preload (Opus, two Opus
  checkers). W1 = S1, S4, S9.
- claims-check (~20:15): 37 plans, 36 overlaps across 13 jobs, all ordered in PLAN section 7; coop4 (#317) and
  coop-real (#388) have no claims block and are listed by diff.
- Key facts: settings apply after the warm-up (`gameState.ts:970-975` vs `app.ts:386`); `releaseEffects()` at
  `app.ts:376`; bake keys carry the seed (`lightBake.ts:91`, `:95`; A16 fixes it live); co-op has no load handshake
  (`coopHost.ts:1701`); #317 sets `capacity('sector')` to `SECTOR_MAX` 4 and `session.cap` / `startMatch` slots.
- Logged for Michael's next look: A14, A15 (48 MB cap; an over-cap re-plan is a new A-line), A16 (live), A17.

Next: lead verifies check-3 fixes; then W1 builder briefs

## Done
- 2026-10-25: worktree and branch; research `research/start-path.md` (93c63a70); BRIEF (adaa8274); PLAN (cd4eb116);
  plan check 1 FIX (7b0ad5ae); BRIEF revised (5e8a5e64); research rows 14-15 (49ce2de0); PLAN revised (7394cf82);
  plan check 2 FIX (66cceedc); fixes (004d39ea); plan check 3 FIX (2bed4b0b); check 3 fixes and Q1 / Q3 answers.

## History
- 2026-10-25: job opened by Night Shift | Sector Ops Build from ROADMAP row 17 (J21: Q31, Q32).
- 2026-10-25 ~19:30: Michael's ~18:50 near-instant-loads pick folded (fixes 1-4: S2 / S3, S4, S11, S9 / S10).
- 2026-10-25 ~20:00: plan check 2 fixes folded; A18 / A19 routed to Michael as Q3.
- 2026-10-25 ~20:05: Q3 sent to the orchestrator by the lead; Michael answered Q3 (option 1) and Q1 (20 s).
- 2026-10-25 ~20:15: plan check 3 fixes folded (Q16 / #317, S4 over-cap routing, S10 co-op gate, polish).
