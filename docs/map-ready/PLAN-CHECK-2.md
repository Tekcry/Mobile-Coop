# map-ready: plan check 2
Checker: Opus 5.5, 2026-10-25 19:14, PLAN at 9035880bb (BRIEF and PLAN on origin/feature/map-ready).
Verdict: FIX

## Check 1 items
- 1 (fold the ~18:50 pick): fixed. BRIEF:14-15 quotes his question verbatim with time (matches ROADMAP:84); BRIEF:18-23
  has "Yes, add them (Recommended)" and the four fixes. PLAN:8-11 maps each fix to slices: (1) S2 + S3, (2) S4,
  (3) S11 (+ S5), (4) S9 + S10; each has files, checks, size and "done looks like". A12 (BRIEF:76-80) and the S7 line
  (PLAN:278-279) carry "repeat loads near-instant"; A2 / Q1 (BRIEF:39-46, 117-122) refreshed for shipped bakes.
- 2 (hud-guidance, j19 overlaps): fixed. PLAN:421-427 list both with files and wire; order in S2 (PLAN:157-161) and S5
  (PLAN:239-242); the start objective popup deferred to the release (PLAN:102-106, 142-143).
- 3 (warehouse line): fixed. A14 (BRIEF:84-88) keeps performance.md:25-26 word for word and routes a miss to Q2; S7
  done-line checks it byte-identical (PLAN:268-269).
- 4 (S7 / S8 complete): fixed. S7 Files / Checks / Done (PLAN:263-270); S8 Files / Checks / Done (PLAN:286-290).
- 5 (walk bookkeeping): fixed. BRIEF:62-67 lists Lighting 3 and Guard AI 5; the flag row (PLAN:370) needs the Sector
  Ops and Marlow Yard walks.

## Intent
- Fix (1) settings first, bodies warmed behind the loading screen: S2 `quality` before the warm-up (PLAN:92, 137-138),
  `bodies` / `shaders` / `warm` steps; S3 warms late-spawned guard kinds, helmets, shields. ok.
- Fix (2) "ship the campus lamp bakes pre-built": S4 / A15. A17 (BRIEF:109-111) ships campusOps only; that is exactly
  his words ("the campus lamp bakes"), not narrower. Marlow Yard and warehouse keep the PC bake, cached after A16. ok.
- Fix (3) "start loading the map in the lobby once it is picked": S11 / A19 preloads files, shipped bakes, LODs,
  weapons, guard kinds and audio, but A19 (BRIEF:121-123) starts "the scene build and a first-ever shader compile"
  only at Start. That is narrower than "start loading the map": building the level (`World.create`, Havok, nav grid,
  Marlow / warehouse full bake) is part of loading the map and is not started in the lobby. Its reason "(they need
  the match scene)" is a design choice (a second, unrendered Scene can be built while the menu stage lives), not a
  hard limit. Not routed to Michael (see Fix 1).
- Fix (4) "keep characters, guards, weapons and compiled shaders between maps and swap only the level": A18
  (BRIEF:112-120) keeps files, textures and compiled shaders but rebuilds the scene, rigs and meshes each match, and
  BRIEF Limits (BRIEF:54) puts "a single persistent scene with the level swapped in place (A18)" out of scope. The
  PLAN declines the literal option text he clicked. The reasons (3.1.7 leak, measured fallback) are sound, but
  narrowing a picked option is a scope change: RULES "Intake" step 2 makes it a one-click question by day or an A
  entry logged and sent to the orchestrator; BRIEF has only Q1 / Q2 (BRIEF:117-125) and A18 / A19 are not flagged as
  narrowing his pick. FIX 1.
- Target ("first-ever load seconds, repeat near-instant"): A12, walk items (PLAN:376-387), S8 shortening plan. ok.
- Q31 (BRIEF:11-12), Q32 (BRIEF:24-25), Q4 (BRIEF:26-28) match ROADMAP:88 / :87 and FOLDED-PLAN:182 (J21: Q4, Q31,
  Q32). Nothing built that he did not ask for; the 2 Hz hold snapshot and `mr` / `go` (A6) are the start handshake
  fix (3) needs in co-op. ok.

## Gates
- Hard rules ok: no runtime network (bakes same-origin in the build, A15); `src/net` only reached as today (S2 adds
  optional `NetAttachment` hooks in `gameState.ts:177`); gameplay reads no graphics state (the gate only delays the
  sim); flag `mapReady` dark; no new package (Node `zlib`, `DecompressionStream`; CI already uses `actions/cache@v4`,
  `deploy.yml:54`).
- A16 live and unflagged (seed out of the lamp / moon keys, `lightBake.ts:91`, `:95`): verified the keys already hash
  shapes and lights; a fix to a shipped feature, allowed at the cap (ROADMAP:91 (9)). ok.
- A2 (45 s cap, loosens `WARMUP_MAX_MS` 6 s) is Q1 by day with the overnight log. ok.
- Checker gate: S3 edits `src/ai/guardWarm.ts`, `guardHelmet.ts`, `guardShield.ts` (PLAN:170) but names no checker;
  RULES "A job" requires "two independent Opus checkers on AI and `src/net` PRs". FIX 2.
- Test gate: S1 edits `src/game/gameState.ts` (PLAN:126) but its checks (PLAN:129) are "affected e2e" only; RULES "Test
  tiers" makes the checker require `e2e-coop` + `e2e-netmove` for `src/game`. FIX 2.
- S5 and S11 (src/net) name two independent Opus checkers (PLAN:225, 340). ok. No map / look sign-off needed. ok.

## Claims
- Fenced block present (PLAN:14-75). Missing: S10's audit may edit `world/surfacePlugin.ts`, `world/levelMaterialPlugin.ts`,
  `player/smoothBodyPlugin.ts`, `operators/runtime/guardFigurePlugin.ts`, `cosmetics/patternPlugin.ts` "in this slice"
  (PLAN:326-329); none is claimed (a probe claims-check shows 0 overlaps on them today). FIX 3.
- claims-check (`node scripts/claims-check.mjs --plan docs/map-ready/PLAN.md --name feature/map-ready`, 19:12):
  31 overlaps. Listed in PLAN section 7: char-shadow-meter, coop-kit, guard-ai-mission-hooks, guard-rules (+ s1, s2),
  hud-guidance (+ a1-a3, b, b1), light-realism, player-batch-j19, player-hygiene, route-runs-2, sector-marks,
  test-runner-j20 (+ 12 slice branches).
- NOT LISTED: `feature/sector-batch` (same lead, PLAN 19:08): `gameState.ts`, `main.ts`, `flags.ts`,
  `ui/screens/briefingScreen.ts`, `coopHost.ts`, `coopClient.ts`, `e2e-sectorops.mjs`, `TESTING.md`, `lighting.md`.
  PLAN:418-419 says no other plan claims `briefingScreen.ts`; sector-batch edits its :57 / :60 text where S11 adds the
  progress line. FIX 4.

## Slices
- S1 ~480 lines, ~3 h: ok but the co-op gate (FIX 2).
- S2 ~900 lines, ~4 h: ok.
- S3 ~600 lines, ~3 h: ok but checkers (FIX 2).
- S4 ~1,000 lines, ~4 h: ok (at the hour limit: prebake, vite plugin, runtime, PWA, CI, parity test).
- S5 ~650 lines, ~4 h: ok.
- S6 ~450 lines, ~2 h: ok.
- S7 ~150 lines (docs): ok.
- S8 ~150 lines (doc): ok.
- S9 ~800 lines, ~4 h: ok.
- S10 ~550 lines, ~3 h: ok but claims (FIX 3).
- S11 ~750 lines, ~4 h: ok.
- Flag `mapReady`: owner, switch-on date 2026-11-01 and condition (PLAN:370). ok.

## Walk pacing
- Sector Ops 3, Marlow Yard 3, Player / animation 3, Lighting 3, Guard AI 5 (all at cap, ROADMAP unwalked table). Every
  slice is dark behind `mapReady`; the only live change is A16 (a cache-key fix, same bytes). ok.

## Fix list (FIX only, ranked)
1. Route A18 and A19's narrowing of the ~18:50 pick to Michael - done looks like: BRIEF has a one-click Q3 (for
   example "Between maps: keep the costly parts and rebuild the scene (Recommended)" / "Keep one scene, swap only the
   level") with its decision pack (the 3.1.7 leak, what a repeat load still rebuilds, the after-S11 measure), and the
   same question or a line in it covers A19 building the level only at Start; until answered A18 / A19 are logged as
   "narrows Michael's ~18:50 pick (4) / (3)" and sent to the orchestrator; BRIEF:54's out-of-scope line cites Q3.
2. Checker and test gates - done looks like: S3 names two independent Opus checkers (Guard AI reviews `src/ai`); S1's
   checks add `e2e-coop` + `e2e-netmove` (requested, `src/game`).
3. Claim S10's possible plugin files - done looks like: the claims block lists the five plugin files, or S10 says a
   per-map value keeps that material out of the budget (no plugin edit in this job).
4. List the sector-batch overlap - done looks like: PLAN section 7 names `feature/sector-batch` with its files, the
   order for S2 / S11 (`main.ts`, `briefingScreen.ts`, `gameState.ts`, `coopHost.ts`, `coopClient.ts`), and the
   "no other plan claims `briefingScreen.ts`" line (PLAN:418-419) is corrected.

## Polish (does not change the verdict)
- S4 CI cache key `hashFiles('src/world/**', 'src/voxel/**')` (PLAN:203) misses lamp-key inputs elsewhere (e.g.
  `src/config`): an exact-key restore then re-bakes on every build until `src/world` changes. Key on the lamp key, or
  add `restore-keys`.
- S4 step 4's "`bake-all` waits for every campus section" (PLAN:199) is S2's step (`mapGate.ts`, not in S4's files) and
  S4 runs in W1 before S2; say S4 owns only the `markPlaying` write.
- The prebake runs in every `npm run build` with the flag off (~90 s per lamp change on the laptop and desktop builds);
  note it in PLAN section 6 against the desktop CPU target.
- Walk item 3 (PLAN:382) shows "Waiting for partner"; neither S2's step texts (PLAN:143) nor S5 names that text.
- S4 runtime may need `voxel/lampJobs.ts` (the cache write skipped on a shipped hit); claim it if so.
- The shipped campus download (up to 48 MB) belongs in Q1's decision pack beside the cap.
