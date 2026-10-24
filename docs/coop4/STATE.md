# coop4 - state

Brief: `docs/coop4/BRIEF.md`. Plan: `docs/coop4/PLAN.md`. Branch `feature/coop4` (from master a10382bc, 4.89.x, `PROTOCOL_VERSION` 49). Lead: Night Shift | Sector Ops Build.

## Now (2026-10-24 ~15:45)
- Plan bed2a37c. N0 DONE 08267f27 (src/game/playerSlots.ts, 19 tests). RUNNING: TM (-coop4-tm, Sonnet), D1 (-coop4-d1, Opus; SecWire step pushed early), SM (-coop4-sm, Opus), N1 (-coop4-n1, Opus; merges d1 / tm / ui as they push). Marlow Build asked for H1 + L1 (feature/coop4-ui). Guard AI Build building AI1 (feature/guard-ai-coop4) on N0's types; owes hook names (intruder-left, hold-noise owner, team-size). Guard cap stays 32 (extra reinforcements clamped).

## Next
- coop4 agents: N0 (slot model + TeamRef, Opus), D1 (devices per slot; SecWire widening first, Opus), TM (team-move `taken`, Sonnet). Then N1 (net core, Opus), SM (sector rules, Opus), E2E (Sonnet), DATA, DOC.
- Marlow Build on `feature/coop4-ui`: H1 (beacon / minimap colours), then L1 (lobby caps, `?players=N`); the lead merges that branch after its checker.
- Guard AI Build: AI slice from `docs/coop4/briefs/AI.md` on `feature/guard-ai-coop4` (src/ai only), coded against N0's types.

## Open
- M1 asked of Michael (operator out at 3-4 players). Default (a): one out restarts the section; the job carries on with it.
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
