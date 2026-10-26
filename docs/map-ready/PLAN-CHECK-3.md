# map-ready: plan check 3
Checker: Opus 5.5, 2026-10-25 20:02, PLAN at 004d39ea3 (BRIEF, PLAN, STATE on origin/feature/map-ready).
Verdict: FIX

## Check 2 items
- 1 (A18 / A19 to Michael): fixed. BRIEF:165-183 is a one-click Q3, recommended first, with its decision pack (3.1.7
  leak, what option 1 still rebuilds, memory, S12 / S13 sketch) and "Default until answered: option 1 (A18, A19),
  logged overnight as 'narrows Michael's ~18:50 pick (3) and (4)' and sent to the orchestrator" (:182-183). A18
  (:130-142) and A19 (:143-153) each open with "narrows Michael's ~18:50 pick"; Goal (:37-39) and Limits (:45-48) say
  the build is narrower than his words; PLAN:11-14 and :462-465 repeat it; STATE:32-35 logs both. Honest: option 1's
  text says the level and the bodies are rebuilt at Start, and A19 calls building at Start "a design choice, not a
  hard limit" (:149-150).
- 2 (checker and test gates): fixed. S3 names two independent Opus checkers, Guard AI on `src/ai` (PLAN:176-177); S1
  adds `e2e-coop` + `e2e-netmove` by hand (PLAN:138-139); S2 (:163), S3 (:185), S9 (:328), S11 (:374) carry them too.
  One gap left in S10 (Fix 3).
- 3 (S10 plugin claims): fixed. The five plugin files and `voxel/lampJobs.ts` are in the claims block (PLAN:36-41) and
  in S10's / S4's files (:220, :351-354).
- 4 (sector-batch overlap): fixed. PLAN:476-486 lists `feature/sector-batch` with files, lines and order; the
  `briefingScreen.ts` line is corrected (:471-473); S2 (:172-173) and S11 (:380-381) carry the order.
- Polish: CI cache key now `hashFiles('src/**', 'scripts/prebake/**')` plus `restore-keys` (:216-219); S4 owns only
  the `markPlaying` write, `bake-all` is S2's (:211-215); local prebake cost and `PREBAKE=0` (:447-451); "Waiting for
  partner" named in S2 (:154-155) and S5 (:246-247); `lampJobs.ts` claimed (:36); Q1's pack has the 48 MB download
  (BRIEF:159-160). All addressed.

## Intent
- Quotes: BRIEF:10-14 (Q31, ~16:50; the ~18:50 question) and :17-27 (the ~18:50 pick, Q32, Q4) match ROADMAP "Decided"
  (origin/feature/menu ROADMAP:84, :87, :88) word for word with times. No Decided entry after ~19:00 touches this job.
- Fix (1): S2 `quality` / `bodies` / `shaders` / `warm` + S3. ok. Fix (2): S4 / A15, campus only as he said (A17). ok,
  except the over-cap contingency (Fix 2). Fix (3) / (4): S11, S9, S10 build Q3 option 1; the narrowing is stated and
  routed (above). Target: A12, walk items (PLAN:419-432), S8. ok.
- Q16 not carried: Michael's "4-player Sector Ops: Live now" (ROADMAP:88 Q16; VISION section 2: Sector Ops 1-4,
  G308) ships with #317 `feature/coop4` (ROADMAP:35 row 10, before this job's row 17), which sets
  `capacity('sector')` to `SECTOR_MAX` 4 (coop4 `protocol.ts`). A5 (BRIEF:81-82) still says "2 in course / sector,
  `protocol.ts:39-41`" (master today), and S5's checks (PLAN:251-253) and done line (:254-255) only prove a 2-page
  start. A 3-4 player Sector Ops start held for every `mr` is part of what Michael picked live. Fix 1.
- Nothing built that he did not ask for; nothing else narrows his pick silently apart from Fix 2's contingency.

## Gates
- Hard rules ok: no runtime network (bakes same-origin in the build); `src/net` reached as today (S2 adds optional
  `NetAttachment` hooks, `gameState.ts:177` checked); gameplay reads no graphics state; flag `mapReady` dark; no new
  package. A16 live: `lightBake.ts:91` / `:95` carry `${inp.seed}` and the shapes hash and lights are already in both
  keys (checked on origin/master); a cache-key fix to a shipped feature, allowed at the cap. ok.
- A2 / Q1 (cap), A18 / A19 / Q3 (scope) are one-click questions with overnight logs. ok.
- Checkers: `src/ai` (S3) and `src/net` (S5, S11; S12, S13 sketched) each name two independent Opus checkers with
  Guard AI. ok.
- Test tiers: `src/game` slices (S1, S2, S3, S11) and `src/net` slices request the co-op group. S10 may edit
  `src/player/smoothBodyPlugin.ts` (PLAN:352-353) but its checks (:355-356) have no `e2e-coop` + `e2e-netmove`: the
  RULES "Test tiers" checker gate for `src/player`. Fix 3.
- No map or look sign-off needed (same bytes, A15; BRIEF:185-187). ok.

## Claims
- claims-check (`node scripts/claims-check.mjs --plan docs/map-ready/PLAN.md --name feature/map-ready`, 20:00, after
  `git fetch`): 35 plans with claims, 34 overlaps, exit 1. Every job in it is listed with an order in PLAN section 7:
  char-shadow-meter, coop-kit (wire `tmove`, `tstart`), guard-ai-mission-hooks, guard-rules (+ s1, s2; wire `bark`,
  `td`; map campusOps), hud-guidance (+ a1, a2, a3, b, b1), light-realism (+ l0; maps campusOps, warehouse),
  player-batch-j19 (wire `cmove`, `revive`, `lobby`, `start`, `use`), player-hygiene, route-runs-2, sector-batch,
  sector-marks (+ b1; map campusOps), test-runner-j20 (+ 13 slice branches). No unordered overlap.
- Not visible to claims-check (no claims block), found by diffing the open PR branches against the claimed files:
  - `feature/coop4` (#317, open, same lead, ships live per Q16): `gameState.ts`, `flags.ts`, `net/protocol.ts`,
    `net/session.ts` (+101, the start / lobby handling S5 holds), `net/coopHost.ts` (+268), `net/coopClient.ts`,
    `net/coopUi.ts` (S11's hook), `scripts/e2e-sectorops.mjs` (+1017, S6). Not in PLAN section 7. Fix 1.
  - `feature/coop-real` (#388, draft): `scripts/e2e-lib.mjs` launch options (S2 edits `openPage`, different
    function). Polish.
- Code anchors spot-checked on origin/master, all hold: `app.ts:364-377` (`releaseState`, `releaseEffects` :376),
  `:386`; `gameState.ts:177`, `:268` (`NetHooks`), `:970-975`; `main.ts:397`, `:412`; `lightBake.ts:91`, `:95`,
  `:104-106`; `session.ts:205`, `:353`; `sectorMode.ts:127`; `figure.ts:131`, `:226-240`, `:230`; `kitRender.ts:68`;
  `propRender.ts:89`; `campusArtRender.ts:132`; `coopUi.ts:88`, `:448`, `:518-526`; `coopHost.ts:892`, `:1701`;
  `e2e-lib.mjs:223-236`; `e2e-affected.mjs:297-315` (no campusOps entry, as PLAN:459 says); `sectionJobs.ts:30-35`;
  `menuScene.ts:332-345`; `bakedLamps.ts:1387`; `e2e-sectorops.mjs:1946-1957`; `performance.md:25-26`, `:81`.

## Slices
- S1 ~480 lines, ~3 h: ok.
- S2 ~900 lines, ~4 h: ok (order also after #317, Fix 1).
- S3 ~600 lines, ~3 h: ok.
- S4 ~1,000 lines, ~4 h: ok but the over-cap re-plan (Fix 2).
- S5 ~650 lines, ~4 h: ok in size; 3-4 player start and #317 order (Fix 1).
- S6 ~450 lines, ~2 h: ok (order also after #317's `e2e-sectorops.mjs`, Fix 1).
- S7 ~150 lines (docs), S8 ~150 lines (doc): ok.
- S9 ~800 lines, ~4 h: ok.
- S10 ~550 lines (+ ~20 a plugin), ~3 h: ok but the co-op gate (Fix 3).
- S11 ~750 lines, ~4 h: ok (`coopUi.ts` also #317's, Fix 1).
- S12 ~1,400 in two PRs, S13 ~700: sketches only, planned and plan-checked before any build if Q3 picks them. ok.
- Flag `mapReady`: owner, target 2026-11-01, switch-on conditions incl. Q1 and Q3 (PLAN:415). ok.

## Walk pacing
- Sector Ops 3, Marlow Yard 3, Player / animation 3, Lighting 3, Guard AI 5 (BRIEF:56-60; all at cap). Every slice is
  dark behind `mapReady`; the only live change is A16 (same bytes, a rule fix). ok.

## Fix list (FIX only, ranked)
1. Carry Q16 (4-player Sector Ops, live) and order against #317 `feature/coop4` - done looks like: A5 says a Sector Ops
   start holds for up to 4 players (`capacity('sector')`, `SECTOR_MAX` 4 once #317 lands; Q16, G308), counted from the
   session's start players, never a constant 2; S5's checks add a 3- or 4-player sector start in
   `tests/mapReadyNet.test.ts` (host waits for every start player's `mr`, then one `go`) and, with `mapready=1`, the
   4-player part of `e2e-coop` / `e2e-sectorops` that #317 adds; PLAN section 7 lists `feature/coop4` (#317, no claims
   block, so claims-check cannot see it) with its files (`gameState.ts`, `flags.ts`, `protocol.ts`, `session.ts`,
   `coopHost.ts`, `coopClient.ts`, `coopUi.ts`, `e2e-sectorops.mjs`) and the order: S2, S5, S6 and S11 cut from the
   master that carries #317 (ROADMAP row 10 before row 17), or rebase if it slips.
2. Route S4's over-cap re-plan like A18 / A19 - done looks like: PLAN:237-238 and A15 (BRIEF:119-120) say that if the
   prebake is over 16 / 48 MB, either re-plan is logged as an A-line marked "narrows Michael's ~18:50 pick (2)" (ship
   fewer campus sections) or "changes Q1's decision pack" (raise the 48 MB download), sent to the orchestrator for
   Michael's next look (one click by day), and the re-planned S4 gets a fresh plan checker before its runtime part.
3. S10's co-op gate - done looks like: S10's checks add `e2e-coop` + `e2e-netmove`, requested by hand, whenever the
   audit edits `src/player/smoothBodyPlugin.ts` (RULES "Test tiers"; simplest: always, since `releaseState` runs on
   every co-op restart).

## Polish (does not change the verdict)
- PLAN:469-470 / :509 counts: the rerun gives 34 overlaps across 12 jobs, test-runner-j20 with 13 slice branches (not
  33 / 13 / 14). Refresh with the next claims-check.
- Name `feature/coop-real` (#388, draft; `e2e-lib.mjs` launch options) in section 7: different function from S2's
  `openPage`.
- S4 CI cache: `node_modules` is itself restored and saved by `actions/cache` (`deploy.yml:54-58`, key on
  `package-lock.json`), so `node_modules/.cache/prebake` nests inside it and rides the next lockfile save; and with
  `restore-keys: prebake-` every lamp key's folder accumulates. Prune to the newest key in `prebake.mjs`, or move the
  folder outside `node_modules` (gitignored).
- S2 and S9 do not name their checker (S1, S4, S10 say "Opus checker"); say it.
- A19 lists the Marlow Yard / warehouse PC lamp bake as a Start-time cost, but S4's prebake shows the map's shapes
  build in Node with no scene: starting that worker bake in the lobby needs no second scene. Worth a line in Q3's
  pack or an S8 candidate.
- STATE:34-35 says A14-A19 are "logged ... to the orchestrator"; record when the message went.
