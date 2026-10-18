# CT core feel job - rules (2026-10-18)

How this job runs. Brief: `FEEL-BRIEF.md`. Method: `docs/systems/session-method.md`.

## Location and guard
- Folder `C:\NightShift\Mobile-Coop-ct-prototype`, branch `feature/ct-prototype`, upstream `origin/feature/ct-prototype`.
- Start of every session: `git pull --ff-only`. Before every write:
  `test "$(git rev-parse --abbrev-ref HEAD)" = feature/ct-prototype && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-ct-prototype"`
- Push only `feature/ct-prototype`. Never merge into master; only Michael merges. Never touch other folders or branches.
- Off limits (other jobs own them): `src/editor/**`, `src/world/maps/kestrel*`, `src/security/**`, `docs/kestrel/**`,
  `docs/DECISIONS.md` (until merge), `src/world/menuScene.ts`, menu screens in `src/ui/screens/`.

## Roles
- Orchestrator (Opus, medium effort, local): plans, decides, asks Michael, commits and pushes. Reads reports, not source.
- Reviewer / implementers: Sonnet, medium effort (Michael, 2026-10-18: "I want a quicker prototype so we aren't wasting
  time"); Opus only when a piece is stuck. Every subagent starts from `AGENT-PREAMBLE.md`.
- One code-changing agent at a time. Read-only agents may run in parallel.
- Checks are light: `npm run check`, the area's e2e suites on port 4193, one at a time. No anim-audit or perf polish
  rounds; the anim audit and perf trend are gates at area sign-off. GPU checks run on Michael's PC (`E2E_GPU=1`).

## Area loop
1. Implementer builds the area (or the next tuning round), writes `docs/ct-prototype/<AREA>.md`.
2. Orchestrator reads the report, commits, pushes, STOPS and tells Michael what to try (URL params, two tabs for co-op:
   `?net=local`).
3. Michael plays, compares with his footage, gives notes (recorded verbatim in `LOG.md`).
4. Repeat until Michael signs off the area. Then the next area. Nothing starts past a stop without his answer.

## Questions
- Ask Michael with native multiple choice, only when something is genuinely unclear or a rewrite is proposed.
- Michael's words are quoted verbatim in `DECISIONS.md` (this folder) and move to `docs/DECISIONS.md` as G entries at
  merge.

## Writing
- No em dashes. No reference-game character, gear or organisation names (G6, G114).
- Every number is a starting value (G10) until Michael signs off the area.
