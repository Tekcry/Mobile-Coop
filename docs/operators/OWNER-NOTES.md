# Operators run - owner notes (Michael)

Keep this file current to the end of the run. Modelled on docs/archive/locomotion/OWNER-NOTES.md.

## Rule
Project knowledge lives in git, never only in Claude memory or chat: Michael swaps Claude accounts. Every decision,
plan, prompt and follow-up Michael gives goes into this branch's docs (DECISIONS.md for decisions, this file for
setup and prompts).

## Local setup (Michael's PC, RTX 4090)
- Worktree: `C:\NightShift\Mobile-Coop-operators`. Branch: `feature/operators`, tracking `origin/feature/operators`.
- `E2E_PORT=4189` on every Lab, sheet and render run; `E2E_GPU=1` for GPU renders. Port 4189 commands:
  RULES.md "Step loop" and steps/AGENT-PREAMBLE.md.
- Blender 5.2.2 LTS, headless, from `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`.
- Branch guard before every commit and push (and in every subagent before any git command):
  `cd /c/NightShift/Mobile-Coop-operators && test "$(git rev-parse --abbrev-ref HEAD)" = feature/operators && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-operators"`
- Push only with `git push -u origin feature/operators`.
- Do not touch the other worktrees (other sessions use them): `C:\NightShift\Mobile-Coop` (feature/training-bunker),
  `Mobile-Coop-kestrel`, `Mobile-Coop-locomotion`, `Mobile-Coop-music`, `Mobile-Coop-menu-ui`, `Mobile-Coop-menu-mock`.

## How the run is driven (D18)
One orchestrator session (Opus 5.5, High) runs steps 05-18 with subagents, exactly like the locomotion run:
implement, independent Opus checker, up to 3 fix rounds, then the orchestrator commits, pushes and sends the renders.
Rules: RULES.md "Step loop". Subagent rules: steps/AGENT-PREAMBLE.md. Earlier tries (history): session chaining
(retired: sessions cannot start sessions) and a scripted workflow (D17, stopped 2026-10-16 for this).

## Progress renders (Michael, 2026-10-16)
"show me any scratch renders as theyre made. also whenever renders are being reviewed. i like to see progress."
The orchestrator watches the scratchpad and `docs/operators/mockups/` for new renders (a Monitor, re-armed when it
expires) and sends each batch with SendUserFile as it lands (up to 6 per batch, the most telling views first), sends
the renders a checker is about to review when it starts that checker, and still sends the step's renders at commit.

## Locomotion coupling (Michael, 2026-10-16)
Both runs go in parallel on two machines. Locomotion step 25 (weapon / holster) and later (27 contact, 30 co-op
bodies, 32 metrics freeze) should be tuned against the real Wren model; it becomes a game asset at step 10, then a
short integration session (own branch, dev switch `?operator=wren`). The note was sent to the Locomotion Build session
(Remote Control) to record in docs/archive/locomotion; delivery is not confirmed.

## Hardware library helper (Michael, 2026-10-16)
A parallel session on the second machine, after the locomotion run completes, builds the rigid hardware generators
(new files only, branch feature/operators-hardware); the orchestrator merges it between steps. Prompt:
`docs/operators/HARDWARE-PROMPT.md` (also given in chat). If the run is past step 09, it serves Moth (step 14).
After D22-D24 Wren uses only the flush magnetic buckle (`garments/mag_buckle.py`, step 08b) and no side-release,
cam or ladder-lock hardware on the body, so the helper's parts serve Moth; HARDWARE-PROMPT.md still lists the old
Wren parts (radio and holster shell included) and is not updated yet.

## Wren into the game first (Michael, 2026-10-18, D30)
After the Wren block end the run pauses for Michael's merges, merges his base branch into feature/operators (11c),
then builds the runtime (11d) and puts Wren in the game behind `?operator=wren` (11e), all locally in this run. Moth
starts after that. The cloud runtime session is not needed.

## Prompts Michael uses
- Start prompt: the block below, in a new session in `C:\NightShift\Mobile-Coop-operators`, Opus 5.5, effort High.
- Resume line (new session or new account, after a stop): **Operators run: RESUME (local)**. The session runs the
  start prompt below from section 0; STATE.md says where to continue.

    Operators run: START (local orchestrator), Michael's PC with GPU (2026-10-16).

    # 0. Location and branch (hard rules for you and every subagent)
    - The only folder for this run is C:\NightShift\Mobile-Coop-operators (a git worktree). The only branch is feature/operators, tracking origin/feature/operators.
    - Never read from, write to or run commands in C:\NightShift\Mobile-Coop or any other worktree (Mobile-Coop-kestrel, Mobile-Coop-locomotion, Mobile-Coop-music, Mobile-Coop-menu-ui, Mobile-Coop-menu-mock). Other sessions use them.
    - Branch guard, run before every commit and every push (and every subagent runs it before any git command): `cd /c/NightShift/Mobile-Coop-operators && test "$(git rev-parse --abbrev-ref HEAD)" = feature/operators && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-operators"`. If it fails, stop and fix the location before doing anything else. Push only with `git push -u origin feature/operators`. Never checkout, merge into or push any other branch.
    - Start the session with: cd /c/NightShift/Mobile-Coop-operators, run the branch guard, confirm `git rev-parse --abbrev-ref --symbolic-full-name @{u}` is origin/feature/operators, `git fetch -q origin` and HEAD equals origin/feature/operators. Confirm node_modules exists (otherwise npm ci).
    - Call mcp__ccd_host__request_keep_awake (until: session_idle).

    # 1. Resume
    - Read CLAUDE.md, then docs/operators/RULES.md, STATE.md, PLAN.md and OWNER-NOTES.md. DECISIONS.md by grep only (D15-D24). Read nothing else yourself: subagents read the source, step files and renders.
    - Michael is asleep. Run unattended to the end: never ask questions, never wait for an answer, never start other sessions (the app refuses them). One exception (D24, "Decide at step 12"): before step 12's implementer, stop and ask Michael Moth's direction with the native multiple-choice UI (recommendation first), wait for the answer, record it in DECISIONS.md and, if it changes the plan, have a replan subagent update steps 12-16, PLAN.md and SPEC 5.2 before continuing.
    - Uncommitted files in git status are partial work for the step in STATE.md "Now" from a stopped agent: leave them; the first implementer reviews and continues it.

    # 2. The step loop (RULES.md "Step loop", exactly like the locomotion run)
    For each step from STATE.md "Now" to 18, in PLAN.md order (Wren after D22-D24: 08a, 08b, 09, 09b, 10, 11; step 08 is superseded and never run or retried):
    1. Implementer subagent: Agent tool, model and effort from PLAN.md, in the background. Prompt: "Read docs/operators/steps/AGENT-PREAMBLE.md first. Role: implementer. Step NN: <title>, docs/operators/steps/<file>. Handover from the previous step: <its handover, verbatim>."
    2. Checker subagent: fresh, model opus, effort high. Prompt: "Read docs/operators/steps/AGENT-PREAMBLE.md first. Role: checker, round R. Step NN: <title>, docs/operators/steps/<file>. Implementer report: <its report, verbatim>."
    3. FAIL: fixer subagent (the step's model and effort): "Read docs/operators/steps/AGENT-PREAMBLE.md first. Role: fixer, round R of 3. Step NN: <title>. Fix list: docs/operators/steps/NN-fixes-rR.md." Then a fresh checker. At most 3 fix rounds; still failing means OPEN.
    4. Finish yourself: branch guard; LOG.md status line ("Status: passed the independent check (fix rounds: N)." or "Status: OPEN after 3 fix rounds; evidence: <fix list>; remaining: <items>."); STATE.md "Now" = the next step (OPEN items under "Open questions for Michael"); free port 4189; path-limited git add of the step's files; commit "operators: step NN - <title>" (add " (OPEN)" when open) ending with your Co-Authored-By line; push; confirm clean and not ahead. Send Michael up to 6 of the step's render PNGs with SendUserFile (status proactive, display render) and a three-line caption: built, passed or OPEN, open items. Then start the next implementer at once.
    - One code-changing agent at a time. Never end your turn without a subagent running, except at the end of the run. Keep your own context small: read reports, not source or renders.
    - Block ends after step 11 (Wren) and step 16 (Moth): retry each OPEN step of the block once through the same loop, then continue (Wren: step 08 is not retried; step 07's cable item is fixed and re-checked inside step 09, so retry 07 only if step 09's checker did not confirm it).

    # 3. Finish (after step 18)
    - Write docs/operators/RUN-SUMMARY.md: per step passed / OPEN, fix rounds, commit, open items, where the renders are; the open questions for Michael; what he does next (the review page from step 17, the final spec from step 18). Commit, push, and send it with SendUserFile (status proactive).
    - Final message: 15 lines or fewer, with Michael's next steps.
    - If you must stop early (context, crash, a hard blocker): commit and push what is done, make STATE.md exact, and end with the resume line "Operators run: RESUME (local)".
