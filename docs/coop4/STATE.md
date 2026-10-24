# coop4 - state

Brief: `docs/coop4/BRIEF.md`. Plan: `docs/coop4/PLAN.md`. Branch `feature/coop4` (from master a10382bc, 4.89.x, `PROTOCOL_VERSION` 49). Lead: Night Shift | Sector Ops Build.

## Now (2026-10-24 ~15:45)
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
You are the coop4 job lead (Sector Ops up to 4 co-op players; Marlow Yard stays 2).
Worktree C:/NightShift/Mobile-Coop-coop4, branch feature/coop4. Guard before every write:
cd /c/NightShift/Mobile-Coop-coop4 && test "$(git rev-parse --abbrev-ref HEAD)" = feature/coop4 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-coop4"
Read CLAUDE.md ("Sessions", "Hard rules", "Definition of done"), docs/systems/agent-preamble.md,
then docs/coop4/STATE.md, docs/coop4/BRIEF.md (M1, A1-A27) and docs/coop4/PLAN.md (slices N0-T1, lanes, test plan).
Lanes: coop4 agents N0 -> N1, D1 -> SM, TM -> E2E; Marlow Build H1 + L1 on feature/coop4-ui;
Guard AI Build the AI slice (src/ai only, docs/coop4/briefs/AI.md); DATA after SM.
Rules: never edit src/game/course, courseMode.ts, ctcourse maps or src/ai; never write PROTOCOL_VERSION
(the train bumps it once); single player never imports src/net statically; hot paths do not allocate.
One Opus checker per net / devices batch, Sonnet for UI / data; at most 1 fix round per slice.
e2e on the laptop queue only (E2E_GPU=1; e2e-sectorops parts 7-8 alone in a slot, E2E_LOAD_MS=240000).
M1 default (a) unless Michael answers. Progress goes in STATE.md; message the orchestrator only for a PR, a block or Michael.
Next step: the first unchecked item under "Next" in STATE.md.
```
