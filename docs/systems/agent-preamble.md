# Subagent preamble (shared, every job)

The job lead copies this into a subagent's prompt with the `<job>`, `<branch>`, `<port>` and owned-file lines filled
in, then adds the subagent's role, its step or slice and the previous step's handover. Read this whole text first.

## Location and guard
- Work only in `C:/NightShift/Mobile-Coop-<job>` on `<branch>` (`feature/<job>`, or `feature/<job>-<slice>` when agents
  run in parallel). Before every write:
  `cd /c/NightShift/Mobile-Coop-<job> && test "$(git rev-parse --abbrev-ref HEAD)" = <branch> && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-<job>"`
- Commit and push each finished sub-step on your branch: `git add <your files>` (never `-A` or `.`), a short message,
  `git push origin <branch>`. A cut-off then loses only the step in flight.
- Never stash, reset, checkout another branch, rebase, force-push, merge master, or merge into master. Never touch
  other folders or branches, or files other jobs own (the job lead lists them).

## What to follow
- The rules: `git show origin/master:CLAUDE.md` (hard rules, "Sessions", test tiers), never a branch copy.
- `docs/DECISIONS.md` (the G entries your brief cites), then the job's `BRIEF.md` ("Michael said" is binding,
  "Michael picked" is the option he chose) and `PLAN.md`. Do not widen an assumption past what the brief says; an
  assumption that would loosen a Michael-only rule goes back to the job lead as a question.
- Unfinished work that would ship goes dark behind its flag in `src/core/flags.ts`.
- Co-op parity: remotes pose from `MoveState`; a wire change does not bump `PROTOCOL_VERSION` (the train build does;
  tests read the constant).
- Before changing a default, speed, timing or binding, grep `scripts/` and `tests/` for assertions on it and update
  them in the same change (read the number from the game's table where you can), never leave them failing.

## Checks
- Repeat runs: `npm run typecheck:fast` and `npx vitest run <files>`. Never a full `npm run check` (CI runs it).
- e2e only through the laptop queue: `node scripts/laptop-queue/request.mjs --sha <full sha> --pr <n> --suites "<suites>"
  --set <name> --requester "<lead title>"`; the verdict is the `laptop-e2e/<set>` commit status. Every e2e is `E2E_GPU=1`.
- A one-off GPU or Blender job on the desktop (only when the job lead says): take `C:/NightShift/heavy.lock` with
  `node scripts/heavy-lock.mjs take ...`, run, release in the same shell command; free the port before and after.
- A crash or timeout mid-suite is not a pass. A failure in a KNOWN FLAKY suite counts only if a solo rerun also fails.
- Never run `npm run dev`, `npm run preview` or a watch mode. Every shell command has a timeout. Logs: `tail` or `grep`.
  Nothing headed, no new windows, Blender only with `-b`.

## Checkers
- A checker reads the diff, reruns the checks, and returns PASS or a numbered fix list ranked by impact ("done looks
  like" per item). It blocks on broken, unplayable or off-intent work; cosmetic notes go on the polish list.
- It posts its verdict as a commit status on the head it checked:
  `gh api repos/Tekcry/Mobile-Coop/statuses/<sha> -f state=success -f context=checker -f description="<model> PASS"`
  (`state=failure`, `description="<model> FIX"` for a fix list).
- A plan checker reads BRIEF and PLAN only: intent against Michael's words, gates (walk cap, visual sign-off, level
  validator), and the claims (files, maps, wire and save paths, slice sizes under ~1.5k lines).

## Report
Write the step's report where the job lead says (built, numbers used, files, commits, skipped, tests changed, results,
what Michael should try). Final message, short: done / not done, check and e2e results, open items.
