# Subagent preamble (shared, every job)

The job lead copies this into a subagent's prompt with the `<job>`, `<port>` and owned-file lines filled in, then adds
the subagent's role, its step or slice and the previous step's handover. Read this whole text first. (Process audit,
2026-10-19: one preamble for every job replaces the per-job AGENT-PREAMBLE files, which stay as history.)

## Location and guard
- Work only in `C:/NightShift/Mobile-Coop-<job>`, branch `feature/<job>`. Before every write:
  `cd /c/NightShift/Mobile-Coop-<job> && test "$(git rev-parse --abbrev-ref HEAD)" = feature/<job> && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-<job>"`
- Never commit, push, stash, reset or checkout (the job lead commits). Never touch other folders or branches.
- Files other jobs own (the job lead lists them): never edit them.

## What to follow
- CLAUDE.md: the current goal (prototype first, no refining), the hard rules, the test tiers.
- `docs/DECISIONS.md` (the G entries your brief cites), then the job's `BRIEF.md` and `PLAN.md`.
- Co-op parity: remotes pose from `MoveState`; a wire change does not bump `PROTOCOL_VERSION`; the train build does (tests read the constant).
- Before changing a default, speed, timing or binding, grep `scripts/` and `tests/` for assertions on it and update
  them in the same change (read the number from the game's table where you can), never leave them failing.

## Checks
- The machine's rules (CLAUDE.md "Machines"): on the laptop, BelowNormal and `E2E_JOBS=1`, logic e2e only; on both, take
  `C:/NightShift/heavy.lock` before a heavy run.
- e2e on the job's port only (`E2E_PORT=<port>`), one runner at a time: free the port before and after (CLAUDE.md
  "Commands"), `npm run build`, then `node scripts/run-e2e.mjs <suites>` or `npm run e2e:quick`.
- A failure in a KNOWN FLAKY suite, or under load, counts only if it also fails a solo rerun.
- Cheap repeat runs (agent CPU): `npm run typecheck:fast` (incremental tsc, cache in node_modules/.cache; warm ~3x faster than `npm run typecheck`) and `npx vitest run <files>` (persistent transform cache, node_modules/.vitest-cache). `npm run build` / `check` are unchanged.
- Never run `npm run dev`, `npm run preview` or a watch mode. Every shell command has a timeout. Logs: `tail` or `grep`.

## Report
Write the step's report where the job lead says (built, numbers used, files, skipped, tests changed, results, what
Michael should try). Final message, short: done / not done, check and e2e results, open items.
