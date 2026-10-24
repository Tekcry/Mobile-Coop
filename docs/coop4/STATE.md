# coop4 - state

Brief: `docs/coop4/BRIEF.md`. Plan: `docs/coop4/PLAN.md`. Branch `feature/coop4` (from master a10382bc, 4.89.x, `PROTOCOL_VERSION` 49). Lead: Night Shift | Sector Ops Build.

## Now (2026-10-24, round fix)
- Round checks A + B on f685cb21..aabc5a31: both FIX (one must-fix). Opus round fix DONE (`checks/round-fix.md`):
  - a held OUT player now comes back at the connector (`CoopHost.returnOut`, its hold re-pointed with `JoinWatch.rehold`);
  - an OUT leaver leaves `outs` / `ot` at once (`GameMode.onPlayerLeft`);
  - the last player up dropping with the rest OUT or down restarts the section;
  - the follow loops are allocation-free;
  - `ot` outside 1..15 is dropped.
  - Checks: tsc clean, lint 0 errors, 29 vitest files 920 pass.
- LAPTOP on the final head 3f1c946f (PR #317, results post there): 3f1c946f-a397 regular (coop, netmove, ctcourse, course, section-rating, sectorops 1-6) + 3f1c946f-fbd4 alone (sectorops 7, 8, 9; E2E_LOAD_MS=240000). The aabc5a31 regular run was already running (early signal only; src differs).
- E2E-AI MERGED 37ad39d1 (6398549a; scripts only, so the 3f1c946f laptop verdicts still count): e2e-coop gets a 4-page AI6 block (1)-(3), part 8 gets AI6 (4)-(6); SKIP without #319. RISK: on the train head (with #319) the 4-page block runs inside the regular e2e-coop suite - watch its 600 s cap in the train run. Guard AI answered: intruderLeft only at hold end or lobby leave (a held player is frozen and out of the guards' list; guards keep his LKP as memory; held slots are never reused); the adapted AI6 asserts and their deviations are approved. Marlow Build: slice UI2 (lobby rows by slot, coopUi.ts, feature/coop4-ui2).
- NEXT: both laptop runs green -> mark #317 ready, label train-ready, message the orchestrator (train with Guard AI #319). Red -> Opus triage. Merge -coop4-e2eai when it lands (scripts only).
- POLISH BATCH RUNNING (Opus, feature/coop4-pol, worktree -coop4-pol, head 55a13cef at the final save): A P5 rejoin loadout order, A P3 stuck taken holder, lobby before start, single-player localMoveState cost, dead glow code; report checks/pol-build.md on that branch; follow-up PR after #317 (rerun from this list if cut off). Look items stay held (S2 #14 doorway, S5 #26 start, follow-cam crouch height).
  - Next: laptop sectorops 7-9 alone (E2E_LOAD_MS=240000) + coop netmove ctcourse course section-rating, then the PR update.

## Earlier (2026-10-24 ~16:55)
- Opus builder round on the shared files DONE (pushed, feature/coop4): (1) net check M1 f685cb21 (open hang / rope busy entry ends with its climber: `inOpenMove` in teamMoves.ts, 1 s grace; teamClear drops the pair's teamPairs); (2) AI5 wiring fa9e7de9 (optional structural hooks, `SectorDef.responseShape`, setResponseShape on every load / restart, raised() shapes the UNSCALED base, one cap, one team per shape team, spread alarmMax x teams; fallback = today, never both; matches AI5-BUILT "Fix round" sketch except the size-0 return sits after the banner / stage gear); (3) data polish bf3a8441 (`sweepSourceOf` by team size, cached per size); (4) OUT b9d3a5f1 (`src/game/sectorOut.ts`, `SECTOR.outWaitsMin` 3, `GameState.outIds`, wire `ot` slot mask, follow view via `Player.followFeet` cycled by next weapon, `CoopHost.returnOut`, tests/sectorOut 14, e2e-sectorops part 9 + run-e2e PARTS '9' 1800 s). Checks: tsc clean, lint 0 errors, 37 vitest files 1088 pass. Not run: e2e, build. Next: Opus checker on f685cb21..HEAD (net + OUT), laptop sectorops 7-9 alone (E2E_LOAD_MS=240000) + coop netmove ctcourse course section-rating.
- DRAFT PR Tekcry/Mobile-Coop#317 on d7f934bc (+ DATA 39fd6469: 16 tagged guards; S5 at 4 players = 26 + 6 = the 32 cap). Laptop d7f934bc-41d8 (coop netmove ctcourse course section-rating sectorops 1-6) + d7f934bc-ef24 (alone: sectorops 7, 8). RUNNING: Opus net-batch checker, Sonnet data checker. Owed (after the net checker): wire Guard AI AI5 (feature/guard-ai-coop4 f1d517b2, docs/coop4/briefs/AI5-BUILT.md on that branch) in sectorMode.ts via optional calls with today's fallback: section load em.setResponseShape(s.responseShape ?? null) + SectorDef.responseShape?; raised(): em.shapeResponse(stage, perStage, out) then one responseTeam per team k (responseTeamSize(k, sh.size, sh.teams)) + em.newTeam(idx, s.sweep ?? null, ...sweepSource(s), alarmMax * sh.teams), members joined team after team. CORRECTION (Guard AI ~16:10): pass the UNSCALED base perStage to shapeResponse (its shape adds the per-player +1); return early on sh.size 0; capReinforce(sh.size, base, room - pending); our alarmStep / reinforcePerExtra scaling only as the fallback when em.shapeResponse is absent (never both); setResponseShape on EVERY load and restart. Was: INTEGRATED feature/coop4 77bbdd6f = N0 + TM + H1 / L1 + D1 + N1 2984ba25 + SM + E2E 06d16021 + integration fixes (26 files 513 pass, tsc clean). RUNNING: Opus net-batch checker (checks/net-batch-check.md); DATA (-coop4-data). Next: merge DATA, Sonnet UI / data checker, laptop (coop, netmove, ctcourse, course, section-rating, sectorops 1-8; parts 7-8 alone, E2E_LOAD_MS=240000). Earlier: N0 DONE 08267f27 (19 tests). TM DONE -coop4-tm 41eeeb93 (561 tests). SM DONE -coop4-sm 92d406ae (512 tests; helpers teamSizeOf / refSlot / slotOfId; reinforcements clamped to the live cap; TODO AI5 hook; DATA: never tag a desk operator). H1 + L1 DONE by Marlow on feature/coop4-ui 5f58e2d4 (check PASS; laptop e2e-coop + ctcourse running). D1 DONE -coop4-d1 8c00b6af (jammers + laser touches per slot; course wire byte-identical vs master; 233 tests; pass zones / hallway rule / scanners still count <= 2 players - check whether Sector Ops uses them). RUNNING: N1 (-coop4-n1, Opus; merges d1 / tm / ui; Guard AI hooks: enemyMgr.intruderLeft(id) in removeRemote, keep one slotFor(localRef.id) at stealth start; refusal carries the room cap), DATA (-coop4-data, Sonnet, off sm), E2E parts 7-8 (-coop4-e2e, Sonnet). Guard AI AI1 DONE (feature/guard-ai-coop4 d530ebe0). Marlow Build asked for H1 + L1 (feature/coop4-ui). Guard AI Build building AI1 (feature/guard-ai-coop4) on N0's types; owes hook names (intruder-left, hold-noise owner, team-size). Guard cap stays 32 (extra reinforcements clamped).

## Next
- coop4 agents: N0 (slot model + TeamRef, Opus), D1 (devices per slot; SecWire widening first, Opus), TM (team-move `taken`, Sonnet). Then N1 (net core, Opus), SM (sector rules, Opus), E2E (Sonnet), DATA, DOC.
- Marlow Build on `feature/coop4-ui`: H1 (beacon / minimap colours), then L1 (lobby caps, `?players=N`); the lead merges that branch after its checker.
- Guard AI Build: AI slice from `docs/coop4/briefs/AI.md` on `feature/guard-ai-coop4` (src/ai only), coded against N0's types.

## Open
- M1 ANSWERED (Michael ~15:35): (b) "Wait for connector" -> slice OUT (PLAN), after the net checker, in one sectorMode round with the AI5 wiring.
- Marlow guard on every checker: empty diff in `src/game/course`, `src/game/modes/courseMode.ts`, `src/world/maps/ctcourse*`; `e2e-ctcourse`, `e2e-course` and `e2e-section-rating` pass.
- Polish list: A21 observer pose of a third-party team move (T1, optional); client feed lines for team doors (host-only feed today).

## Done
- 2026-10-24: Opus plan (single-partner audit: ~20 files, not 69; N-player net model; A1-A27; M1; slices N0-T1).

## Resume prompt
```
You are the coop4 job lead (session "Night Shift | Sector Ops Build"; Sector Ops up to 4 co-op players; Marlow Yard stays 2).
Worktree C:/NightShift/Mobile-Coop-coop4, branch feature/coop4 (draft PR Tekcry/Mobile-Coop#317). Guard before every write:
cd /c/NightShift/Mobile-Coop-coop4 && test "$(git rev-parse --abbrev-ref HEAD)" = feature/coop4 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-coop4"
Read CLAUDE.md ("Sessions", "Hard rules"), then this file's "Now", docs/coop4/BRIEF.md (M1 answered b, A1-A27), PLAN.md.
Built and checked: N0, N1, D1, SM, TM, H1 + L1 (Marlow Build), DATA, E2E parts 7-9, DOC (Marlow Build), round (open-move fix,
AI5 wiring, sweepSource, OUT = M1 b) + round fix 3f1c946f (checks A + B FIX -> fixed). Guard AI's side is PR #319
(feature/guard-ai-coop4); both ride ONE train (the train bumps PROTOCOL once).
Laptop on 3f1c946f (verdicts as GitHub statuses / PR #317 comments): laptop-e2e/coop4 (regular 2-player suites incl.
Marlow guard) and laptop-e2e/alone-coop4-4p (sectorops 7, 8, 9). Laptop request CLI: copy scripts/laptop-queue/request.mjs
+ lib.mjs from origin/master to scratch; --sha --pr 317 --branch feature/coop4 --set <s> --suites "..." (4-page parts as
--alone --step "node scripts/run-e2e.mjs e2e-sectorops:7" ... --env E2E_GPU=1 --env E2E_LOAD_MS=240000 --env E2E_JOBS=1).
Next: both green -> merge feature/coop4-e2eai if done (Guard AI's AI6 asserts, SKIP without #319; scripts only), mark #317
ready (gh pr ready 317), add label train-ready, message the orchestrator (train with #319). Red -> one Opus triage + fix round.
If E2E-AI was cut off: rerun its builder from docs/coop4/checks (prompt: AI6-E2E-SPEC asserts on origin/feature/guard-ai-coop4,
each SKIP when a #319 hook is missing; files scripts/e2e-coop.mjs, e2e-sectorops.mjs, e2e-net-lib.mjs) off the branch head.
Rules: never edit src/game/course, courseMode.ts, ctcourse maps or src/ai; never write PROTOCOL_VERSION; single player never
imports src/net statically; hot paths never allocate; never merge master into feature/coop4 (the train resolves conflicts).
Message the orchestrator only for a PR, a block or Michael. Sector-redesign (the other job) is idle until Michael's playtest
(its STATE on feature/sector-redesign-polish).
```
