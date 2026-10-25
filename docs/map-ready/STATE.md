# map-ready: state
Owner: Night Shift | Sector Ops Build. Status: current.

## Resume
- Folder `C:/NightShift/Mobile-Coop-map-ready`, branch `feature/map-ready` (from master 2148ec96; src unchanged to
  b81c4945). Guard before every write: `cd /c/NightShift/Mobile-Coop-map-ready && test "$(git rev-parse
  --abbrev-ref HEAD)" = feature/map-ready && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-map-ready"`.
- Phase: plan revised after plan check 1 (FIX, `docs/map-ready/PLAN-CHECK.md`, kept as history); check 2 not run yet.
  No code on the branch.
- Michael's ~18:50 question and pick (BRIEF.md:10-20) add four fixes; where each is built: PLAN.md:8-11.
- Docs: `BRIEF.md` (A1-A19 :58-142, Q1 / Q2 :143-151), `PLAN.md` (claims :14-74, gate :84-110, slices :111-362 with
  S4 :179, S9 :292, S10 :316, S11 :340, order :363-366, flag :367-373, walk items :374-388, overlaps :415-447),
  `research/start-path.md` (rows 1-13 :68-80, rows 14-15 and pick points :87-106).
- Slices: S1 measure (Sonnet), S2 gate + settings first (Opus), S3 warm later arrivals (Opus), S4 shipped campus bake
  (Opus), S5 co-op ready (Opus, two Opus checkers), S6 e2e (Sonnet), S7 docs (Haiku), S8 shorten plan (Opus), S9 kept
  files + textures (Opus), S10 kept shaders (Opus), S11 lobby preload (Opus, two Opus checkers). W1 = S1, S4, S9.
- Key facts:
  - Settings apply after the warm-up: `src/game/gameState.ts:970-975` vs `src/core/app.ts:386`.
  - Every load rebuilds shared parts: `src/core/app.ts:376` `releaseEffects()`; `src/operators/runtime/figure.ts:230`
    blob URL per texture; kit / props / art fetch per load (`src/world/kit/kitRender.ts:68`,
    `src/world/props/propRender.ts:89`, `src/world/campusArt/campusArtRender.ts:132`).
  - Bake keys carry the seed (`src/world/lightBake.ts:91`, `:95`): co-op (`src/net/session.ts:353`) and solo restarts
    (`src/main.ts:397`) bake again every start (A16 fixes it live).
  - Map picked before Start: `src/ui/screens/briefingScreen.ts:33`, co-op `lobby` event `src/net/coopUi.ts:88`, `:448`.
  - Co-op has no load handshake: host clock starts at once (`src/net/coopHost.ts:1701`).
- Open for Michael: Q1 the cap (default 45 s, A2; blocks only S7 and switch-on). Q2 after the after-S11 run (A12, A14).
- Logged assumptions for his next look: A14 (warehouse line kept), A15 (bake built at build time, 48 MB cap), A16
  (seed-free key, live), A17 (campus only), A18 (kept parts, fresh scene each match), A19 (lobby preload scope).

Next: a fresh Opus plan checker on BRIEF + PLAN (`docs/templates/plan-check.md`), verdict in `docs/map-ready/PLAN-CHECK-2.md` (check 1 stays as history); on PASS brief W1 (S1 Sonnet, S4 and S9 Opus).

## Done
- 2026-10-25: worktree and branch; research `research/start-path.md` (93c63a70); BRIEF (adaa8274); PLAN (cd4eb116);
  plan check 1 FIX (7b0ad5ae); BRIEF revised (5e8a5e64); research rows 14-15 (49ce2de0); PLAN revised (7394cf82).

## History
- 2026-10-25: job opened by Night Shift | Sector Ops Build from ROADMAP row 17 (J21: Q31, Q32).
- 2026-10-25 ~19:30: Michael's ~18:50 near-instant-loads pick folded (fixes 1-4: S2 / S3, S4, S11, S9 / S10).
