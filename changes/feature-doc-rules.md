# Rules in one place
kind: patch
- Process rules move from `CLAUDE.md` into `docs/RULES.md`, read from origin/master at every session start; `CLAUDE.md`
  is now a short, stable stub (what Night Shift is, read RULES.md and VISION.md from master, the authority order, the
  code hard rules). The module map and doc index move to `docs/INDEX.md`.
- One owner per rule: one train-ready definition (CI `check` + `checker` + `affected-e2e`, labelled by the watchdog),
  desktop CPU gates as the queue really runs them, a 1-minute auto-train tick, swaps (a save, fresh sessions at a swap,
  resume after a same-account reset); testing-tools owns the flaky rule; session-method, agent-preamble and auto-train
  point to RULES.md instead of restating it.
- The laptop queue's first build plan is archived (`docs/archive/laptop-queue-PLAN-2026-10-23.md`).
