# PC1 / step agent preamble (M6 + M7: secondary desktop)

- Work only in C:\NightShift\Mobile-Coop-locomotion (Git Bash: /c/NightShift/Mobile-Coop-locomotion). Never read, write or run anything in C:\NightShift\Mobile-Coop, Mobile-Coop-kestrel or Mobile-Coop-music.
- Before any git command, run the branch guard: `cd /c/NightShift/Mobile-Coop-locomotion && test "$(git rev-parse --abbrev-ref HEAD)" = feature/ct-locomotion && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-locomotion"`. Never commit, push, checkout or merge: the orchestrator commits.
- Read CLAUDE.md and docs/locomotion/RULES.md (sections "On Michael's PC" and "On the secondary desktop (M7)") first. Never run perf.mjs --budget (any profile) on the desktop: budget items are "pending target laptop" (PC-PASS section 0).
- Every e2e / perf / perf-trend / anim-audit / shot / anim-sheet run: `E2E_PORT=4189`; GPU runs also `E2E_GPU=1`. For shot.mjs / anim-sheet.mjs / perf.mjs / single suites, serve dist/ yourself as a background process: `npx vite preview --port 4189 --strictPort --host 127.0.0.1` and pass `URL=http://127.0.0.1:4189/` (and the URL argument to perf.mjs and suites). Kill that server before you finish. anim-audit and perf-trend serve their own on E2E_PORT when none is up.
- Every shell command has a timeout (`timeout N ...`). No dev server, no watch mode, no sleep polling loops. Long runs: run in background and wait for the notification.
- Output pictures go to `pc/` (gitignored). Logs: tail -40 or grep, never whole.
- Never use E2E_HEADED=1 (nobody watches). A "watch" item: run the suite headless with E2E_GPU=1 for its numbers; the look stays in PC-PASS.md for Michael.
- Judge contact sheets and shots by reading the PNGs with the Read tool, against bible 5.12.1 / 5.12.2 (grep -n '5.12' docs/design-bible.md, read by line range) and D2, D5, D8-D11 (docs/locomotion/DECISIONS.md). Cite file and frame for each verdict.
- Budget: about 60 tool calls. Over budget: stop and return done / left.
- Return: per PC-PASS item number: PASS / FAIL / MICHAEL (needs his eyes or a phone) with numbers and the evidence path; a numbered fix list for every FAIL (file:line where known). Do not edit source code.
