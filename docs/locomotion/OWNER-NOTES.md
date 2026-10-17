# Locomotion run - owner notes (Michael)

Keep this file current to the end of the run.

## Rule
Project knowledge lives in git, never only in Claude memory or chat: Michael swaps Claude accounts. Every decision, plan, prompt and follow-up Michael gives goes into this branch's docs (DECISIONS.md for decisions, this file for setup, prompts, merge plan and follow-ups).

## Local setup (Michael's PC, M6)
- Worktree: `C:\NightShift\Mobile-Coop-locomotion`. Branch: `feature/ct-locomotion`, tracking `origin/feature/ct-locomotion`.
- If missing: `git -C C:/NightShift/Mobile-Coop fetch origin`, then `git -C C:/NightShift/Mobile-Coop worktree add --track -b feature/ct-locomotion C:/NightShift/Mobile-Coop-locomotion origin/feature/ct-locomotion`, then `npm ci` in it.
- `E2E_PORT=4189` on every e2e, perf, perf-trend, anim-audit, shot and anim-sheet run. `E2E_GPU=1` for GPU checks (perf, anim-sheet, shot, visual suites).
- Port 4189 "already in use": an orphan `vite preview` left by `npx ... &` on Windows. Free it: `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4189 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`; start servers with `node node_modules/vite/bin/vite.js preview` (steps/PC1-preamble.md).
- Branch guard before every commit and push (and in every subagent before any git command):
  `cd /c/NightShift/Mobile-Coop-locomotion && test "$(git rev-parse --abbrev-ref HEAD)" = feature/ct-locomotion && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-locomotion"`
- Push only with `git push origin feature/ct-locomotion`.
- Do not touch the other worktrees (other sessions use them): `C:\NightShift\Mobile-Coop` (feature/training-bunker), `C:\NightShift\Mobile-Coop-kestrel` (feature/kestrel), `C:\NightShift\Mobile-Coop-music` (feature/music).

## Secondary desktop setup (M7)
1. On the crashed PC, if it boots: `cd /c/NightShift/Mobile-Coop-locomotion && git status && git log origin/feature/ct-locomotion..HEAD --oneline`; push anything listed (`git push origin feature/ct-locomotion`), then close its Claude sessions.
2. Desktop: pause Windows Update, set active hours, sleep Never, mains power. Install Node 22, Git for Windows, Claude Code; sign in with the other Claude account. Git credentials need push access: `git ls-remote https://github.com/tekcry/mobile-coop`.
3. `mkdir -p /c/NightShift && cd /c/NightShift && git clone -b feature/ct-locomotion https://github.com/tekcry/mobile-coop Mobile-Coop-locomotion && cd Mobile-Coop-locomotion && npm ci && npx playwright-core install chromium && npm run build && npm test && E2E_PORT=4189 node scripts/run-e2e.mjs smoke`
4. Start Claude Code in that folder with: **Locomotion run: RESUME (local)**.
5. At "Ready for the Block D laptop check" and "Ready for the target laptop pass": on the RTX 4090 laptop pull, `npm ci && npm run build`, run PC-PASS section 0, then reply "Locomotion: go" on the desktop (with notes for any failure).

- M12: the bot partner (step 20) was dropped; the play check and co-op checks use two browser tabs with `?net=local`. The verbatim prompts below still mention it.

## Prompts Michael uses
- Resume line (new session or new account): **Locomotion run: RESUME (local)**. The session runs the branch guard and resumes from STATE.md "RESUME HERE" (2026-10-17: first the consolidation per CONSOLIDATE.md, then the CT prototype per PROTOTYPE-PLAN.md on a fresh branch from master).
- After the play-check pause: **Locomotion: go** (with or without notes).
- The standby prompt and its addition, verbatim:

    # Standby prompt (2026-10-15)
    
    Locomotion run: LOCAL STANDBY, then RESUME on Michael's PC with GPU (2026-10-15).
    
    # 0. Location and branch (hard rules for you and every subagent)
    - The only folder for this run is C:\NightShift\Mobile-Coop-locomotion (a git worktree). The only branch is feature/ct-locomotion, tracking origin/feature/ct-locomotion.
    - Never read from, write to or run commands in C:\NightShift\Mobile-Coop (feature/training-bunker), C:\NightShift\Mobile-Coop-kestrel (feature/kestrel) or C:\NightShift\Mobile-Coop-music (feature/music). Other sessions use them.
    - CLAUDE.md lines about feature/training-bunker and feature/kestrel do not apply here; follow docs/locomotion/RULES.md.
    - Branch guard, run before every commit and every push (and tell every subagent to run it before any git command): `cd /c/NightShift/Mobile-Coop-locomotion && test "$(git rev-parse --abbrev-ref HEAD)" = feature/ct-locomotion && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-locomotion"`. If it fails, stop and fix the location before doing anything else. Push only with `git push origin feature/ct-locomotion`. Never checkout, merge into or push any other branch; merges INTO this branch from origin/feature/kestrel and origin/master happen only where BRIEF.md says.
    - Start the session with: cd /c/NightShift/Mobile-Coop-locomotion, run the branch guard, and confirm `git rev-parse --abbrev-ref --symbolic-full-name @{u}` is origin/feature/ct-locomotion. If the folder or branch is missing, create it: `git -C C:/NightShift/Mobile-Coop fetch origin` then `git -C C:/NightShift/Mobile-Coop worktree add --track -b feature/ct-locomotion C:/NightShift/Mobile-Coop-locomotion origin/feature/ct-locomotion`, then npm ci in it. Confirm node_modules exists (otherwise npm ci).
    
    # 1. Wait for the cloud handover
    - Do not edit or commit anything while the cloud session is still working on this branch.
    - Use the Monitor tool with an until-loop script (Bash, in the worktree) that every 10 minutes runs `git fetch -q origin` and stops when either:
      (a) `git log origin/feature/ct-locomotion -1 --format=%s` starts with "locomotion: handover to PC", or
      (b) `git show origin/feature/ct-locomotion:docs/locomotion/STATE.md` contains "Ready to move to the PC".
      Give up after 48 hours. Never use foreground sleep and never poll from your own turns.
    - When it fires: git pull --ff-only, run the branch guard, check `git status` is clean and HEAD equals origin/feature/ct-locomotion.
    
    # 2. Resume
    - Read CLAUDE.md (this worktree's copy), then docs/locomotion/RULES.md, STATE.md (start with "Handover to PC"), DECISIONS.md (D1-D11 and M1-M5) and BRIEF.md (sections 1-2 only unless STATE points elsewhere).
    - The handover is before step 15 (M5). Run unattended from here: no questions to Michael except the single pause in section 5; finish with the PR.
    
    # 3. Environment changes (record them in RULES.md and DECISIONS.md as M6, commit, push, then continue)
    - Windows PC with a hardware GPU. Use the Bash tool (Git Bash) for scripts, always inside the worktree. Set E2E_PORT=4189 on every e2e, perf, shot and anim-sheet run (other sessions may use 4179).
    - GPU checks are now allowed and expected: E2E_GPU=1 for perf.mjs, anim-sheet.mjs, shot.mjs and the visual suites. The "never claim GPU results" rule now applies only to software GL.
    - Re-baseline perf-trend on this PC first (record it in STATE.md; the cloud baseline is cloud-only). Block ends also run perf.mjs --budget and perf.mjs --phone --budget against docs/systems/performance.md.
    - Each step's checker runs that step's GPU items itself: contact sheets local and remote, and perf where the step touches anim, camera, vfx or render. An opus checker reads the sheets with the Read tool and judges them against bible 5.12.1, 5.12.2 and D2, D5, D8-D11. PC-PASS.md keeps only items that need Michael's eyes or a phone.
    - Run the full e2e with run_in_background and wait for its notification; never poll with sleep loops. Every shell command gets a timeout.
    - All subagents opus, one code-changing agent at a time, about 60 tool calls per subagent: unchanged.
    
    # 4. Order of work
    1. PC1 GPU catch-up: run every PC-PASS.md item for steps 01-14 with E2E_GPU=1, fix failures through the normal implement-and-check loop, mark each item PASS or FAIL with numbers, commit "locomotion PC1: GPU catch-up" and push. Do not pause after it.
    2. Steps 15-20 in PLAN.md order, then step 20b net-check (D11 lite), then the Block C end: full e2e, perf with --budget and --phone --budget, merge origin/feature/kestrel into this branch and verify, retry every Blocked item in STATE.md.
    3. Write the "Play check before step 21" checklist (D11 item 4) into STATE.md, commit and push.
    
    # 5. The single pause, then steps 21-34
    - Stop and show Michael, in 15 lines or fewer: the results of PC1, steps 15-20b and the Block C end, any Blocked items, and the play-check checklist (how to start the game and the bot partner on the pad, which map, which verbs to try). Wait for his reply.
    - When he replies "Locomotion: go" (with or without notes): turn each note into a change to the Block D step files or a new step (record them in DECISIONS.md as Michael's), commit and push, then continue from step 21 unattended to the end.
    
    # 6. Finish
    As BRIEF.md section 7, on this PC: the merges into this branch, versions, full e2e, GPU perf and contact sheets, REVIEW.md (PC-PASS.md now holds only phone and hands-on items), the PR feature/ct-locomotion -> master, then the final message. Run the branch guard before the final push.
    
    # Addition (Michael, 2026-10-15)
    
    Addition (Michael, 2026-10-15), do it in the same commit as M6, right after the handover (not before):
    
    1. Create docs/locomotion/OWNER-NOTES.md and keep it current to the end of the run:
       - Rule: project knowledge lives in git, never only in Claude memory or chat; Michael swaps Claude accounts. Every decision, plan, prompt and follow-up he gives goes into this branch's docs.
       - The local setup: worktree C:\NightShift\Mobile-Coop-locomotion, branch feature/ct-locomotion, E2E_PORT=4189, E2E_GPU=1, the branch guard, and the other worktrees that must not be touched (Mobile-Coop = feature/training-bunker, Mobile-Coop-kestrel, Mobile-Coop-music).
       - The prompts Michael uses: the full text of this session's standby prompt and of this message, plus the resume line "Locomotion run: RESUME (local)", so a new account can restart the run from git alone.
       - Merge plan (Michael, 2026-10-13): merge feature/kestrel to master first; then merge master into feature/ct-locomotion, re-run checks, and merge the locomotion PR; then clean up stale branches (ct-movement, dev, feature/exchange-map, character-model, claude/new-session-*) only with Michael's go-ahead, and from then on work from master plus one feature branch per job.
       - Follow-ups after the merge: kestrel security cameras, lasers and keypads (src/security) need electro-vision glow flags; the parked Phase 1 light steps 4c-9 (breaker, motion lights, mains-off) are the next lighting job; the untracked scripts/_tmp-rest.mjs in the main folder must not be committed; full network tuning (D11 full) is Phase 5; the nine modernisation proposals are in BIBLE-PROPOSALS.md.
    2. Add one line to CLAUDE.md under the title: "Project knowledge lives in git, never only in Claude memory: Michael swaps accounts. Record decisions, plans and follow-ups in the repo docs."
    3. At the finish (step 34), copy the merge plan and follow-ups into docs/progress.md so they reach master with the PR.

## Merge plan (Michael, 2026-10-13)
1. Merge feature/kestrel to master first.
2. Then merge master into feature/ct-locomotion, re-run the checks, and merge the locomotion PR.
3. Then clean up stale branches (ct-movement, dev, feature/exchange-map, character-model, claude/new-session-*), only with Michael's go-ahead.
4. From then on: work from master plus one feature branch per job.

## Follow-ups after the merge
- Kestrel security cameras, lasers and keypads (src/security) need electro-vision glow flags (A53 covers only the kinds that exist on this branch).
- The parked Phase 1 light steps 4c-9 (breaker, motion lights, mains-off) are the next lighting job.
- The untracked `scripts/_tmp-rest.mjs` in the main folder (C:\NightShift\Mobile-Coop) must not be committed.
- Full network tuning (D11 full) is Phase 5.
- The nine modernisation proposals are in BIBLE-PROPOSALS.md.
- At the finish (step 34), copy this merge plan and these follow-ups into docs/progress.md so they reach master with the PR.

## Session method (Michael, 2026-10-16)
CLAUDE.md has "How sessions are run" (the orchestrator method) and docs/systems/session-method.md, copied unchanged from origin/feature/operators b3a58ff so both branches carry identical text into master. Done.

## Playtest branch (2026-10-16, Michael asked to hear music and movement / weapon sounds with the new movement)
`playtest/combined` = feature/ct-locomotion + origin/feature/music + origin/feature/footsteps + origin/feature/weapon-audio, built in its own worktree C:\NightShift\Mobile-Coop-playtest (never in this folder). For laptop play only: nothing from it is merged back into feature/ct-locomotion; recreate it from the latest heads when a fresh combined build is wanted. The sound branches reach this run through master at the end (merge plan).

## Desktop only (M21, 2026-10-17)
Phones and touch are dropped project-wide (Michael). Follow-up when building restarts: move e2e-touch from REQUIRED / KNOWN_FLAKY to report-only in scripts/run-e2e.mjs; later cleanup (with Michael's go-ahead): remove the phone look, touch controls and mobile paths.
M21 relayed on 2026-10-17 to the live sessions Character Creation (operators), Music, Weapon Sounds and Movement Sounds (delivery not confirmed: they run on another machine). Not reachable (no live session): feature/kestrel, feature/training-bunker, feature/menu-ui-spec and master: tell them when their sessions next start.
- ffmpeg 9.0.2 installed on the secondary desktop (2026-10-17, winget Gyan.FFmpeg, Michael approved) for frame extraction from the CT footage: C:\Users\Micha\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe (on PATH in new shells). Footage goes in pc\ct-ref\ (gitignored, local only).

## Consolidation start prompt (M26 + M27, 2026-10-17; Opus 5.5, High effort; new conversation, folder C:NightShiftMobile-Coop-locomotion on branch feature/ct-locomotion)
    Consolidation run: START (local).
    You are the orchestrator (docs/systems/session-method.md). Michael's decisions M26 and M27 apply.

    0. Location and branch, check before anything else:
       - Start folder: C:\NightShift\Mobile-Coop-locomotion. It MUST be on branch feature/ct-locomotion tracking origin/feature/ct-locomotion: run `cd /c/NightShift/Mobile-Coop-locomotion && git rev-parse --abbrev-ref HEAD` (expect feature/ct-locomotion) and `git pull --ff-only`. This folder is only for reading the plan and for updating docs/locomotion/STATE.md at the end.
       - Work folder: a NEW worktree C:\NightShift\Mobile-Coop-integrate on a NEW branch integrate/consolidate made from origin/master (CONSOLIDATE.md step 1), then npm ci there.
       - Branch guard before every git write: in the work folder, branch integrate/consolidate and toplevel C:/NightShift/Mobile-Coop-integrate; in the start folder, branch feature/ct-locomotion and toplevel C:/NightShift/Mobile-Coop-locomotion. Push only `git push -u origin integrate/consolidate` (and `git push origin feature/ct-locomotion` for the STATE note). Never touch the Mobile-Coop, Mobile-Coop-kestrel, Mobile-Coop-music or operators folders. Never push, merge into or delete any other branch. Never merge into master.

    1. Read: CLAUDE.md, docs/locomotion/CONSOLIDATE.md (the plan: follow it exactly, including the "Documentation audit and vision questions" section), docs/locomotion/DECISIONS.md M12-M27, docs/locomotion/RULES.md sections "Port 4189", "Speed on the desktop", "Desktop tuning".

    2. Merges: in the CONSOLIDATE.md order, one merge commit each, conflicts resolved by its rules (subagents may do large resolutions, one code-changing agent at a time, all opus); npm run check after each merge.

    3. Documentation audit (M27): parallel read-only opus agents audit every branch's documentation as CONSOLIDATE.md describes and write docs/consolidation/AUDIT.md with file:line findings.

    4. Vision questions (M27): turn every finding and every unconfirmed (ASSUMED) decision into plain-English multiple-choice questions, recommended option first, grouped by area. Ask me with the native multiple-choice UI in rounds of 4, as many rounds as needed, and also publish them as a phone page (Artifact with a db) so I can answer away from the desk. Ask as many questions as it takes for my vision to be clear. Do not guess my answers.

    5. Write my answers into docs/DECISIONS.md (new, master-level, each entry quotes me) and rewrite CLAUDE.md, the design bible and the system docs on integrate/consolidate so master states one clear, current vision with no contradictions. Run-specific decision files stay as history and point to docs/DECISIONS.md.

    6. Full checks: npm run build, then the full npm run e2e in the background (E2E_PORT=4191, E2E_JOBS=2). Known flaky and kestrel-owned failures as RULES.md; fix only what the merges broke.

    7. Version bump and one CHANGELOG entry (CONSOLIDATE.md step 5). Open the PR integrate/consolidate -> master with gh. Do NOT merge it. Record the PR link and results in the PR body and in docs/locomotion/STATE.md on feature/ct-locomotion.

    8. Stop and tell me in plain English: the PR link, what merged, conflicts and how they were resolved, the audit summary, the decisions recorded, test results, anything unclear.

    Run unattended except for the questions in step 4. Plain English, no em dashes.

