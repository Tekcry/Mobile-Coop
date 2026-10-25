# laptop-queue-8 - brief (seed)
Owner: Test Runner. Status: current.

Seed scope, collected while laptop-queue-7 builds. The Opus PLAN comes after laptop-queue-7 opens its PR. Branch
feature/laptop-queue-8, worktree C:/NightShift/Mobile-Coop-laptop-queue-8, cut from origin/master 34b96b9c.

## Michael said / picked
- 2026-10-26 ~10:12, ROADMAP "Decided" (origin/feature/menu) "Fixes go first in the test queue": Michael asked "if
  bugs/error are found in the process, are the fixes prioritied for implementation first, or do they wait at the back
  of the line?" and picked "Fixes go first (Recommended)".

## Scope
1. Fixes first (Michael ~10:12): a request is a fix when its PR carries the `fix` label or request.mjs gets a new
   `--fix` flag (automatic affected requests read the PR label). Fix requests rank ahead of new-feature PR requests,
   behind trains and train reruns. A fix = a train failure fix, a red affected-e2e or checker fix round, a fix to a
   shipped feature or a backlog bug. Create the `fix` label if missing. Same PR updates the RULES "Machines" pick
   order line.
2. A request for a new head of the same PR keeps the old request's queue place (Orchestrator 09:48 audit; Michael
   ~10:12 item 1).
3. A running request is stopped when its PR gets a new head (same branch, new head contains the old one, suites
   overlap): today service.mjs:1363 never supersedes runs or open claims.
4. Desktop worker (Orchestrator 09:48 audit): takes the smallest waiting request; skips runs estimated over ~15 min;
   keeps finished suites when a train preempts a run.
5. Docs-only verdict carry for PR heads (laptop-queue-7 carries train heads only): a new PR head whose delta from a
   green head is *.md / changes/ / CHANGELOG only (no non-.md file under docs/) carries the verdict.
6. Knob `LQ_DESKTOP_CPU_MODE=total|normal`, default normal (Orchestrator ~10:00: the Blender case wins).

## Assumptions
- A1: PR work order is fixes, then the laptop-queue-7 front tier (`LQ_FRONT_BRANCHES`, Mixamo), then green
  smallest-first, then arrival (Orchestrator ~10:20: Michael's ~10:12 choice is newer than Mixamo-first, ~00:15; a
  Mixamo fix is a fix anyway). Undo: swap the fix and front tiers.
