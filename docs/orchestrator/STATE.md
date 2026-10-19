# Orchestrator - resume point (2026-10-19 11:45 Sydney)

Read CLAUDE.md "Orchestrator" and docs/ROADMAP.md first. Work folder for docs PRs: C:\NightShift\Mobile-Coop-menu
(branch feature/menu). Michael wants short, plain replies.

## In flight
1. **anim-cleanup full e2e on the desktop** (orchestrator holds C:/NightShift/heavy.lock).
   - Worktree: C:\NightShift\Mobile-Coop-anim-cleanup at 228d78e (the branch head 2cf0ae8 adds docs only).
   - `check` passed (1,746 tests). Log: C:\Users\Micha\AppData\Local\Temp\claude\C--NightShift-Mobile-Coop-locomotion\0dac9d41-f4d0-42c9-8e39-315f7046d243\scratchpad\ac2-e2e.log
   - e2e-netmove has already FAILED once. On the laptop, its holstered stow took 766 ms against a 650 ms limit.
   - Expected end about 12:45. If the run died with the old session, rerun:
     `E2E_PORT=4192 E2E_JOBS=2 E2E_SUITE_TIMEOUT=1700 node scripts/run-e2e.mjs`
   - Then:
     - rerun failures alone; send branch-caused failures (traverse, netmove) to Character Build for light fixes;
     - fill the e2e line in docs/anim-cleanup/PR-BODY.md;
     - `gh pr create --base master --head feature/anim-cleanup --title "Animation clean-up: weapon handling, reloads, shoulder swap, traversal grips, hand shapes" --body-file docs/anim-cleanup/PR-BODY.md`;
     - merge when green;
     - delete heavy.lock and tell CT Core the slot is free;
     - tell CT Core to merge master before B+C;
     - move dev (/preview/) to master.
2. **CT Core Build** (desktop, feature/ct-prototype): slice A is built and waits for the heavy slot to run its checks
   and push /ct/. One of its runs on port 4193 overlapped mine briefly (it started before the lock).
3. **Character Build** (laptop, light work only): planning the goggle surround redesign on feature/goggle
   (docs/goggle/BRIEF.md, PLAN.md). It's idle otherwise. Messages to it go over a bridge and delivery isn't confirmed.
5. **Goggle plan** (feature/goggle 4c8e630, docs/goggle/): two questions on the dashboard (which surround; direction A/B/C). Screen-edge fix is laptop-safe; the device build is desktop work.
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
