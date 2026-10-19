# Orchestrator - resume point (2026-10-19 13:45 Sydney)

Read CLAUDE.md "Orchestrator" and docs/ROADMAP.md first. Work folder for docs PRs: C:\NightShift\Mobile-Coop-menu
(branch feature/menu). Michael wants short, plain replies, and exact copy-paste prompts (with model and effort) plus an explicit "you can clear X now" for every handoff.

## In flight
1. **Done today:** PR #12 anim-cleanup merged (b08cc176), PR #13 phone launch merged (3ca352e4), dev (/preview/) =
   master. heavy.lock released to CT Core at 13:10. Master bd59f32 baseline: e2e-coop, e2e-netmove, e2e-ctcourse fail
   alone on master too (logs in this session's scratchpad: master-base.log, ac-solo.log; evidence sent to Character
   Build). Mobile-Coop-integrate worktree now holds feature/process-audit (was integrate/consolidate, merged).
1b. **Process audit** (feature/process-audit, docs/process-audit/BRIEF.md): Character Build writes REPORT.md (Phase 1,
   report only). Then Michael approves; then Phase 2; then a desktop fix job for the co-op suites.
2. **CT Core Build** (desktop, feature/ct-prototype): slice A is built and waits for the heavy slot to run its checks
   and push /ct/. One of its runs on port 4193 overlapped mine briefly (it started before the lock).
3. **Character Build** (laptop, light work only): planning the goggle surround redesign on feature/goggle
   (docs/goggle/BRIEF.md, PLAN.md). It's idle otherwise. Messages to it go over a bridge and delivery isn't confirmed.
3b. **Goggle plan** (feature/goggle 4c8e630, docs/goggle/): two questions on the dashboard (which surround; direction A/B/C). Screen-edge fix is laptop-safe; the device build is desktop work.
4. **PR #11** (docs: machine rule, heavy.lock, this file, the dashboard source): merge when GitHub's check passes.

## Dashboard
- Live page: https://claude.ai/artifact/4iaH3gvBbw8utN1uBgysVw. Source: docs/orchestrator/dashboard.html (publish
  with `url`). It declares the `db` capability.
- Michael answers the 8 open questions there. Read them with ArtifactData `list` on collection `answers`, forward each
  to its owner, then update ROADMAP.md and the page.
- Republish after every roadmap change.

## Sessions
- CT Core Build: uds pipe `cc-msg-634a9538f5d58626c944ac1d0b16f8cd` (local_59bb0859).
- Character Build: bridge `session_01DCPdGkue7Gyd8FyQCg3vut`.
- Morning brief: https://claude.ai/artifact/3TqyRbeREc63gmUTwR9YCC (done).
