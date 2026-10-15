# PC1 / step agent preamble (M6 + M7: secondary desktop)

- Work only in C:\NightShift\Mobile-Coop-locomotion (Git Bash: /c/NightShift/Mobile-Coop-locomotion). Never read, write or run anything in C:\NightShift\Mobile-Coop, Mobile-Coop-kestrel or Mobile-Coop-music.
- Before any git command, run the branch guard: `cd /c/NightShift/Mobile-Coop-locomotion && test "$(git rev-parse --abbrev-ref HEAD)" = feature/ct-locomotion && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-locomotion"`. Never commit, push, checkout or merge: the orchestrator commits.
- Read CLAUDE.md and docs/locomotion/RULES.md (sections "On Michael's PC" and "On the secondary desktop (M7)") first. Never run perf.mjs --budget (any profile) on the desktop: budget items are "pending target laptop" (PC-PASS section 0).
- Every e2e / perf / perf-trend / anim-audit / shot / anim-sheet run: `E2E_PORT=4189`; GPU runs also `E2E_GPU=1`. Servers: follow the PORT 4189 HARD RULE below exactly. anim-audit and perf-trend serve their own on E2E_PORT when none is up.
- SPEED (RULES.md M10 + M11): implementers never run `npm run e2e:quick` or the full e2e: only lint, unit tests, build and the single suites their step names, once each; they grep scripts/ and tests/ for assertions on any default they change and update them. Checkers run `E2E_PORT=4191 E2E_JOBS=2 npm run e2e:quick` once, ALONE (no GPU work during it); GPU items run on 4189 after it finishes. Port 4191 is software GL only (never E2E_GPU=1); use the commands below with 4191 in place of 4189 for it. A failure is flaky only if already on the known-flaky list or it passes in 2 solo reruns.
- PORT 4189 HARD RULE (RULES.md M9, verbatim):
  Only one agent uses port 4189 at a time. Never use `npx vite preview`, `npm run preview` or a bare `&` server start.
  1. Free the port (before starting a server, before any run-e2e / anim-audit / perf-trend / perf run, and before you finish):
     `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4189 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`
  2. Start a server only for shot.mjs / anim-sheet.mjs / perf.mjs / single suites, as a background Bash task:
     `cd /c/NightShift/Mobile-Coop-locomotion && node node_modules/vite/bin/vite.js preview --port 4189 --strictPort --host 127.0.0.1`
     then `URL=http://127.0.0.1:4189/`. run-e2e, anim-audit and perf-trend start their own: do not start one for them.
  3. Check it is free: `netstat -ano | grep ":4189 .*LISTENING"` prints nothing.
  4. When done: step 1 again, then step 3. "Port 4189 is already in use" means step 1 was skipped: run it and retry once.
- Every shell command has a timeout (`timeout N ...`). No dev server, no watch mode, no sleep polling loops. Long runs: run in background and wait for the notification.
- Output pictures go to `pc/` (gitignored). Logs: tail -40 or grep, never whole.
- Never use E2E_HEADED=1 (nobody watches). A "watch" item: run the suite headless with E2E_GPU=1 for its numbers; the look stays in PC-PASS.md for Michael.
- Judge contact sheets and shots by reading the PNGs with the Read tool, against bible 5.12.1 / 5.12.2 (grep -n '5.12' docs/design-bible.md, read by line range) and D2, D5, D8-D11 (docs/locomotion/DECISIONS.md). Cite file and frame for each verdict.
- Budget: about 60 tool calls. Over budget: stop and return done / left.
- Return: per PC-PASS item number: PASS / FAIL / MICHAEL (needs his eyes or a phone) with numbers and the evidence path; a numbered fix list for every FAIL (file:line where known). Do not edit source code.
