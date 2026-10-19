# CT core feel job - rules (2026-10-18)

How this job runs. Brief: `FEEL-BRIEF.md`. Method: `docs/systems/session-method.md`.

## Current goal (Michael, 2026-10-19; master CLAUDE.md "Current goal", PR #6) - overrides slower wording below
A fully functional 2-player co-op training level, playable end to end, as soon as possible:
- Wren as the character for both players, with basic animations.
- Basic weapons: Blender scratch builds, realistic at a glance but quick (feature/weapons, laptop session; the
  existing weapon carry stands in until they merge, do not wait for them).
- All co-op moves and the required CT moves; lights and shadows working (light parity).
- Pure CT (G1, `docs/ct-research`, G124-G160) except Michael's recorded decisions, including the Blacklist-style
  selection wheel for weapons, gadgets and vision modes, no time slow (G181).
- A visual pass comes last, to make it prettier.

No refining (feel tuning, animation polish, perf tuning, detail art) until Michael has playtested the core loop.
Checkers block only on broken or unplayable work; cosmetic notes go on `POLISH.md`. At most 1 fix round per slice
unless broken. Quick e2e per slice (`npm run e2e:quick`, one test run at a time on this PC: a timing failure under
load is load first), the full e2e at the PR. The Opus leg fix only if it breaks play or looks obviously broken.

## Overnight run (Michael, 2026-10-19, "no stop until told")
- Per slice: build, an independent check (blocks only on broken / unplayable), at most 1 fix round, `npm run check`,
  `npm run e2e:quick`, commit, push, `git push origin feature/ct-prototype:ct-movement`. Time box about 90 min.
- A decision that is genuinely Michael's: write it as a question in `WALKTHROUGH.md`, take the simplest reversible
  option, carry on.
- By 09:30 Sydney: the best playable state on ct-movement, with `WALKTHROUGH.md` (how to start, what to try, known
  broken, open questions, polish list). From 09:30 until Michael says otherwise: do NOT push ct-movement; push
  feature/ct-prototype only.

## Location and guard
- Folder `C:\NightShift\Mobile-Coop-ct-prototype`, branch `feature/ct-prototype`, upstream `origin/feature/ct-prototype`.
- Start of every session: `git pull --ff-only`. Before every write:
  `test "$(git rev-parse --abbrev-ref HEAD)" = feature/ct-prototype && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-ct-prototype"`
- Push `feature/ct-prototype`, and after every slice also `git push origin feature/ct-prototype:ct-movement` (the `/ct/`
  preview; Michael, 2026-10-18, "Yes, push to ct-movement", G179). Never merge into master; only Michael merges. Never
  touch other folders or branches.
- Off limits (other jobs own them): `src/editor/**`, `src/world/maps/kestrel*`, `src/security/**`, `docs/kestrel/**`,
  `docs/DECISIONS.md` (orchestrator only: G179 onward), `src/world/menuScene.ts`, menu screens in `src/ui/screens/`.

## Roles
- Orchestrator (Opus, medium effort, local): plans, decides, asks Michael, commits and pushes. Reads reports, not source.
- Reviewer / implementers: Sonnet, medium effort (Michael, 2026-10-18: "I want a quicker prototype so we aren't wasting
  time"); Opus for network-sync-heavy slices (light and door sync, two-key sync, revive) and anything stuck twice
  (G179). Every subagent starts from `AGENT-PREAMBLE.md`.
- One code-changing agent at a time. Read-only agents may run in parallel.
- Prototype pass (Michael, 2026-10-18, "Prototype pass now"; G179): each slice is built once; checks per slice are lint, unit tests,
  build, smoke and the slice's own e2e suite on port 4193, plus one two-player e2e (scripts/e2e-net-lib.mjs) for co-op
  slices. The full e2e run, the anim audit and the perf trend run once at the
  end of the pass. GPU checks run on Michael's PC (`E2E_GPU=1`). Fine tuning is a second pass once the co-op bunker plays start to finish.

## Area loop
1. Implementer builds the area (or the next tuning round), writes `docs/ct-prototype/<AREA>.md`.
2. Orchestrator reads the report, commits, pushes, STOPS and tells Michael what to try (URL params, two tabs for co-op:
   `?net=local`).
3. Michael plays, compares with his footage, gives notes (recorded verbatim in `LOG.md`).
4. Prototype pass: Michael says keep, change or drop; small changes are folded into the next round, the rest wait for
   the tuning pass. Then the next area. Nothing starts past a stop without his answer.

## Questions
- Ask Michael with native multiple choice, only when something is genuinely unclear or a rewrite is proposed.
- Michael's words are quoted verbatim in `DECISIONS.md` (this folder) and move to `docs/DECISIONS.md` as G entries at
  merge.

## Writing
- No em dashes. No reference-game character, gear or organisation names (G6, G114).
- Every number is a starting value (G10) until the tuning pass.

## Overnight runs (later, when Michael says; G179)
Not yet: Michael, 2026-10-18, "It can run overnight but not yet. I'm still awake." When he starts one: unattended, as
many slices as fit; a piece that fails twice is stubbed so the build stays playable end to end, logged, and the run
moves on; every slice is checked, committed, pushed and sent to `/ct/`; a morning report gives what is playable, the
`/ct/` link with URL params, what was stubbed, and at most 4 decisions as native multiple choice.
