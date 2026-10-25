# map-ready: state
Owner: Night Shift | Sector Ops Build. Status: current.

## Resume
- Folder `C:/NightShift/Mobile-Coop-map-ready`, branch `feature/map-ready` (from master 2148ec96; src unchanged to
  b81c4945). Guard before every write: `cd /c/NightShift/Mobile-Coop-map-ready && test "$(git rev-parse
  --abbrev-ref HEAD)" = feature/map-ready && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-map-ready"`.
- Phase: plan revised after plan check 2 (FIX, `PLAN-CHECK-2.md`; check 1 `PLAN-CHECK.md`; both kept as history).
  Check 3 not run yet. No code on the branch.
- Check 2 fixes: (1) A18 / A19 flagged as narrowing Michael's ~18:50 pick (4) / (3) and routed to Q3 (BRIEF:130-154,
  :165-184; Limits :45-48); Q3 options 2 / 3 add S12 / S13 (PLAN:385-405). (2) S3 two Opus checkers (PLAN:176); S1
  adds `e2e-coop` + `e2e-netmove` (PLAN:138). (3) the five S10 plugin files and `lampJobs.ts` claimed (PLAN:36-41,
  S10 :351-354). (4) `feature/sector-batch` overlap and order (PLAN:476-487, S2 :172, S11 :380). Polish items folded.
- Docs: `BRIEF.md` (A1-A19 :63-154, Q1-Q3 :156-184), `PLAN.md` (claims :16-84, gate :93-119, slices :120-410 with
  S4 :191, S9 :310, S10 :334, S11 :361, S12 / S13 :385, order :407, flag :412-417, walk items :419-433, risks :434,
  overlaps :467-513), `research/start-path.md` (rows 1-13 :68-80, rows 14-15 and pick points :87-106).
- Slices: S1 measure (Sonnet), S2 gate + settings first (Opus), S3 warm later arrivals (Opus, two Opus checkers), S4
  shipped campus bake (Opus), S5 co-op ready (Opus, two Opus checkers), S6 e2e (Sonnet), S7 docs (Haiku), S8 shorten
  plan (Opus), S9 kept files + textures (Opus), S10 kept shaders (Opus), S11 lobby preload (Opus, two Opus checkers);
  S12 one scene + S13 level built in the lobby only if Q3 picks them. W1 = S1, S4, S9.
- claims-check (~20:00): 33 overlaps across 13 jobs, all listed in PLAN section 7 with an order; wire shared with
  coop-kit, guard-rules, j19 (the train bumps once). Sector-batch PRs land before S2 / S5 / S6 / S7 / S11.
- Key facts:
  - Settings apply after the warm-up: `src/game/gameState.ts:970-975` vs `src/core/app.ts:386`.
  - Every load rebuilds shared parts: `src/core/app.ts:376` `releaseEffects()`; `src/operators/runtime/figure.ts:230`
    blob URL per texture; kit / props / art fetch per load (`src/world/kit/kitRender.ts:68`,
    `src/world/props/propRender.ts:89`, `src/world/campusArt/campusArtRender.ts:132`).
  - Bake keys carry the seed (`src/world/lightBake.ts:91`, `:95`): co-op (`src/net/session.ts:353`) and solo restarts
    (`src/main.ts:397`) bake again every start (A16 fixes it live).
  - Map picked before Start: `src/ui/screens/briefingScreen.ts:33`, co-op `lobby` event `src/net/coopUi.ts:88`, `:448`.
  - Co-op has no load handshake: host clock starts at once (`src/net/coopHost.ts:1701`).
- Open for Michael (by day, native multiple choice): Q1 the cap (default 45 s, A2). Q3 how far fixes (3) / (4) go
  (default option 1, A18 / A19; blocks nothing in W1-W4, only switch-on). Q2 after the after-S11 run (A12, A14).
- Logged for his next look (to the orchestrator): A14, A15 (48 MB cap), A16 (live), A17, A18 and A19 (both narrow his
  ~18:50 pick until Q3 is answered).

Next: fresh Opus plan checker (check 3)

## Done
- 2026-10-25: worktree and branch; research `research/start-path.md` (93c63a70); BRIEF (adaa8274); PLAN (cd4eb116);
  plan check 1 FIX (7b0ad5ae); BRIEF revised (5e8a5e64); research rows 14-15 (49ce2de0); PLAN revised (7394cf82);
  plan check 2 FIX (66cceedc); BRIEF / PLAN revised for it (Q3, checker and test gates, claims, sector-batch).

## History
- 2026-10-25: job opened by Night Shift | Sector Ops Build from ROADMAP row 17 (J21: Q31, Q32).
- 2026-10-25 ~19:30: Michael's ~18:50 near-instant-loads pick folded (fixes 1-4: S2 / S3, S4, S11, S9 / S10).
- 2026-10-25 ~20:00: plan check 2 fixes folded; A18 / A19 routed to Michael as Q3 (S12 / S13 if he picks the full
  version).
