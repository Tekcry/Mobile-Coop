# map-ready: plan check 1
Checker: Opus 5.5, 2026-10-25 18:41, PLAN at cd4eb116 (branch head cb51b96e).
Verdict: FIX

## Intent
- Q31 quote (BRIEF:11-12) and Q32 pick (BRIEF:15-16) match ROADMAP "Decided" (origin/feature/menu ROADMAP:85) verbatim;
  Q4 (BRIEF:17-18) matches ROADMAP:84. The gate (PLAN S2-S5) serves "ensure map is fully loaded"; the written cap
  (A2, Q1) and S8 serve "Yes, up to a written cap, plus a job to shorten it" (FOLDED-PLAN:101). Co-op ready (S5) is
  in scope: Q31's "builds while in game" covers the client's late puppets and partner (research row 10).
- MISSING: Michael's later decision is not in the BRIEF or PLAN. ROADMAP:82 (Decided, 2026-10-25 ~18:50, commit
  c6669413 at 18:37, after the PLAN at 18:21): Michael asked "how does ratchet and clank/spiderman etc achieve instant
  load times between levels? what would make us instantly load into maps?" and picked "Yes, add them (Recommended)":
  "the map-ready job (Sector Ops) adds four fixes": (1) settings before the warm-up, warm characters / guards /
  weapons behind the loading screen; (2) ship the campus lamp bakes pre-built instead of baking on the player's PC;
  (3) start loading the map in the lobby once it is picked; (4) keep characters, guards, weapons and compiled shaders
  between maps and swap only the level. Target: first-ever load seconds, repeat loads near-instant. ROADMAP:42 row 17
  now carries it.
  - (1) is covered (S2 `quality`, S3).
  - (2) conflicts with S4 (PLAN:140-149), which makes the player's PC bake every campus section before play, and with
    A2 / Q1's decision pack (BRIEF:30-33, 89-90: "campus S1 lamps 22 s at 4 workers").
  - (3) is only an S8 "candidate" (PLAN:196-198); Michael picked it as a fix to build.
  - (4) has no slice and no claim; it changes `main.ts:394` "never two matches in memory" / `app.releaseState`.
  - The target makes A12 (BRIEF:66-68) and S7's "Load-time goals: after Michael's review" (PLAN:191-192) partly
    stale: repeat loads near-instant is now his stated aim (numbers still for review).
## Gates
- Hard rules ok: the gate only delays the sim's start (A4); nothing in the sim branches on graphics state; bundled
  files only; `src/net` stays behind the dynamic import (S2 adds only a `NetAttachment` hook pair); flag dark.
- Michael-only perf line: `WARMUP_MAX_MS` 6 s -> 45 s is Q1 by day with A2 logged (BRIEF:28-31, 84-90): ok.
- Not addressed: the written warehouse load line "<= 4 s cold, <= 1.5 s cached" (`docs/systems/performance.md:25-26`,
  research:94-95). With the flag on, the reveal includes compiles and the bake, so that line may be loosened without a
  question or A entry. S7 (PLAN:179-192) only rewrites line 81.
- Sign-off: no map, layout or look change: none needed. Pre-built bakes (fix 2) must keep light parity (the shipped
  bake equals the runtime bake; gameplay reads the bake): needs a parity check in its slice.
- Wire: S5 has two independent Opus checkers and no `PROTOCOL_VERSION` bump: ok.
## Claims
- Fenced `claims` block present (PLAN:8-48) and covers every file S1-S7 name (boot text and `feedbackContext()` are in
  `main.ts` / `gameState.ts`, both claimed). Not covered: the files fixes (2)-(4) will need.
- claims-check (`node scripts/claims-check.mjs --plan docs/map-ready/PLAN.md --name feature/map-ready`, 18:40): 7 overlaps.
  - `feature/coop-kit`: `gameState.ts`, `flags.ts`, `protocol.ts`, `coopHost.ts`, `coopClient.ts`; wire `tmove`,
    `tstart`. Listed (PLAN:50).
  - `feature/guard-rules`: `flags.ts`, `coopHost.ts`, `e2e-sectorops.mjs`; map campusOps; wire `bark`, `td`. Listed.
  - `feature/player-hygiene`: `coopHost.ts`, `coopClient.ts`, `protocol.ts`. Listed.
  - `feature/test-runner-j20`: `e2e-sectorops.mjs`, `e2e-ctcourse.mjs`, `testing-tools.md`. Listed.
  - `feature/route-runs-2`: `testing-tools.md`. Listed.
  - NOT LISTED: `feature/hud-guidance` (plan 18:20): `gameState.ts`, `courseMode.ts`, `coopHost.ts`, `coopClient.ts`,
    `e2e-sectorops.mjs`, `e2e-ctcourse.mjs`, `TESTING.md`. It edits `NetAttachment` (deletes `blips?()`, its
    PLAN:249) where S2 adds hooks, and the objective fade-in at start, which S2 defers to the release.
  - NOT LISTED: `feature/player-batch-j19` (plan 18:21): `gameState.ts`, `protocol.ts`, `coopHost.ts`,
    `coopClient.ts`, `session.ts`, `flags.ts`, `gameAudio.ts`; wire `cmove`, `revive`, `lobby`, `start`, `use`. It
    changes `start` (adds `ff`, its R38) and `session.ts`, the exact start path S5 holds.
## Slices
- S1 ~450 lines, ~3 h: ok.
- S2 ~900 lines, ~4 h: ok (at the hour limit; busiest shared file `gameState.ts`).
- S3 ~600 lines, ~3 h: ok.
- S4 ~250 lines, ~2 h: needs a re-plan for pre-built bakes (Intent fix 2).
- S5 ~650 lines, ~4 h: ok; overlaps j19's `start` change.
- S6 ~400 lines, ~2 h: ok.
- S7 ~120 lines (docs), ~1 h: no "Done looks like" and no Files line (PLAN:179-183); misses the warehouse line.
- S8 plan only: no Files / Checks / "Done looks like" (PLAN:194-199).
- Flag `mapReady`: owner and switch-on date listed (PLAN:205-207): ok.
## Walk pacing
- Sector Ops 3 (at cap), Marlow Yard 3 (at cap), Player / animation 3 (at cap) per ROADMAP:73-75; also touched and not
  listed in BRIEF:43-44: Lighting 3 (at cap; S4 bake, `bakedLamps.ts`) and Guard AI 5 (at cap; S3 `guardWarm`,
  helmet, shield). No slice switches anything on (flag dark until Michael's walk): ok. The switch-on row (PLAN:207)
  waits only on the Sector Ops walk, but walk item 3 (PLAN:214-215) is Marlow Yard, also at cap.

## Fix list (FIX only, ranked)
1. Fold the ~18:50 near-instant-loads decision (ROADMAP:82) into the BRIEF and PLAN - done looks like: BRIEF "Michael
   said" has his question verbatim with time and "Michael picked" has "Yes, add them (Recommended)"; the PLAN has
   slices (with files, checks, sizes and "done looks like") for (2) pre-built campus lamp bakes (S4 re-planned: ship
   the bake as baked data, parity test that it equals the runtime bake, a fallback when `LAMP_VERSION` or the level
   changes), (3) map loading from the lobby once picked (solo menu and co-op lobby), (4) characters, guards, weapons
   and compiled shaders kept between maps with only the level swapped (within the unchanged memory target, Q4); the
   claims block gains their files (e.g. `src/net/coopUi.ts`, the bake build script and data path, player / enemy /
   weapon owners); A12 and the S7 performance line carry "repeat loads near-instant" as the aim; Q1's decision pack
   and A2's 45 s reasoning are refreshed for shipped bakes.
2. List and settle the two missing overlaps - done looks like: PLAN section 1 names `feature/hud-guidance` and
   `feature/player-batch-j19` with files and wire, an order for S2 / S5 against them (j19's `start` + `ff` and
   `session.ts`; hud-guidance's `NetAttachment` edit), and S2 states that the start objective fade-in (G343 / G351)
   is deferred to the release with the letterbox and banners.
3. Cover the warehouse load line - done looks like: S7 (or an A entry with undo, plus Q1 or a second question) says
   what happens to `docs/systems/performance.md:25-26` "<= 4 s cold, <= 1.5 s cached" with the gate on.
4. Complete S7 and S8 - done looks like: S7 has Files and "Done looks like"; S8 has its file (`SHORTEN.md`), its check
   (who reviews it) and "Done looks like".
5. Walk pacing bookkeeping - done looks like: BRIEF areas list adds Lighting (3) and Guard AI (5); the flag's switch-on
   condition names every at-cap area the walk items cover (Sector Ops and Marlow Yard) or drops the Marlow item.
