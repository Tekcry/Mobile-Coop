# Orchestrator - resume point (2026-10-20 16:20 Sydney)

Read CLAUDE.md (above all "Sessions") and docs/ROADMAP.md first; the roadmap's "Decided" list holds every Michael answer
from 2026-10-19 21:45 onward, verbatim. Work folder for orchestrator docs: C:\NightShift\Mobile-Coop-menu, branch
feature/menu. Merge origin/master into it before each docs batch; the docs go to master in a docs PR (a patch) when
convenient (feature/menu is many commits ahead of master today: open one docs PR soon).

## Master
v4.15.0 (#43, 65bfe6f2: anim-rework slice 1). Tags v4.0.0-v4.15.0. /preview/ = dev = 65bfe6f2. The doorPeek fix is now in master. CHANGELOG has two stray "## Unreleased - anim-metrics" headings under 4.15.0 (from the side PRs): rename them in the next docs PR. /ct/ = ct-movement = 150dcfce (walk round 3b
plus the F3 crab readout; CT Core moves it with each slice). Dashboard: https://claude.ai/artifact/XehBYx1Lm27txV29kjSoXh
(source docs/orchestrator/dashboard.html; publish the same path; it declares `db`, answers in collection `answers`;
update its version line and rows after each merge with the sed / node edits used in git history, then republish).

## Priority (Michael)
Movement and animation first (10:30, 13:50: "any spare bandwidth that can be used to speed it up should be used").
CT movement references are dropped for movement and animation (13:30); the brief is docs/anim-rework/BRIEF.md.
Laptop: low priority (BelowNormal, E2E_JOBS=1) until Michael says otherwise. Keep going until Michael says stop (08:45).

## Sessions now (titles are the message addresses)
| Session | Job(s), branch, folder | State (16:20) |
| --- | --- | --- |
| Night Shift \| CT Core Build | anim-rework slices 1-6 on feature/ct-prototype (C:/NightShift/Mobile-Coop-ct-prototype) | slice 1 (controls) round 3 ef3a3c01 + the station 3/4 test fix approved; laptop co-op run next, then /ct/ and a PR to master; slice 2 (holstered locomotion: starts, stops, turns, idles, the narrow walk) after |
| Night Shift \| Course Ready Build (local_4d5454d2, I started it, I can clear it) | anim-guard (feature/anim-guard, PR base feature/ct-prototype), then the MPFB2 rebake on feature/anim-rig | guard clips 90d1c8bf, check running; MPFB2 approved by Michael 14:40 |
| Night Shift \| Menu Notes Build | nv-pass (feature/nv-pass, C:/NightShift/Mobile-Coop-nv-pass) | slices 1-2 (look, wide goggle frame) 75c37d42 waiting for GPU shots; slice 3 the wheel carousel only after anim-rework slice 1 merges to master (give it the go) |
| Night Shift \| Sector Ops Build | warehouse-s23 (feature/warehouse-s23, C:/NightShift/Mobile-Coop-warehouse-s23) | section 1 lamp pass + section 2 greybox f4facc1d; laptop run queued last; section 3 next; lowest priority |
| Night Shift \| Character Build (laptop, Remote Control; it drops off sometimes, ListAgents shows it) | laptop test runner + test-speed (feature/test-speed) | test-speed done when two clean laptop full runs at E2E_JOBS=2; then PR to master |

Relay rule: desktop job leads often cannot reach Character Build; the orchestrator relays runner requests with the full
commit hash, and forwards results back.

## Usage pause (2026-10-20 ~17:15)
At 93% of the 5-hour window Michael was given prompts to clear and restart every session after the reset (CT Core, Sector Ops, Course Ready, the orchestrator; Character Build and nv-pass were already cleared). All sessions were told to pause until the orchestrator messages them after the reset: after the restart, message each one to resume (CT Core: slice 2; nv-pass: the checker result, then the carousel, which is now unblocked since slice 1 merged; Sector Ops: the lamp fix and section 3; Course Ready: the MPFB2 rebake; Character Build: test-speed).

## Context clears (Michael 16:15: "i want to clear all the chats when they are ready to prevent context drifting")
Every session was asked to reach a clean point, update its STATE with a fenced resume prompt and message "<name> ready
to clear" with the prompt. Then: give Michael that prompt to paste after he clears it (he clears the sessions he
started; the orchestrator can clear only Course Ready and itself, with clear_session, then sends the prompt as the first
message). The orchestrator clears itself last, after giving Michael its own resume prompt (below).

## Open PRs / merges to do
- nv-pass PR to master (minor) after its GPU check.
- warehouse-s23 PR to master (minor) after section 2 (or 2+3) is green.
- test-speed PR to master (patch).
Merge procedure: scripts kept in the scratchpad were ad hoc; the steps are: check the PR head equals the tested commit
(or the delta is docs only), merge origin/master into the branch in a temp worktree resolving only CHANGELOG / package
conflicts (stop on any src conflict and check both-sides src files), `npm version <v> --no-git-tag-version`, rename the
top "## Unreleased" heading to "## <v> - <title> (<date>, PR #<n>)", commit "<v>: version at merge (G183)", push, wait
for CI (`gh run watch <id> --exit-status` in the background), `gh pr merge <n> --merge`, then tag and push `dev` as
separate commands.

## Known
- e2e-netmove doorPeek fails on master-based branches until CT Core's remote-feet fix (e4d85253, on ct-prototype)
  reaches master with the anim-rework PR: count it as known.
- Co-op suites time out under load; accept a full run where the load failures pass solo on the same commit (test-speed
  fixes this).
- The co-op client never draws guards' flashlights (torch state not on the wire): later, a protocol bump.

## How Michael works with the orchestrator
- Short, plain replies. Native multiple-choice questions only. Hyphens, not em dashes.
- One step at a time when he asks for it. For every handoff: the exact paste-in prompt, the model and the effort.
- He tests through the menus, never direct links: give menu paths and the version label to expect.
- Merge green, reviewed PRs without asking (CLAUDE.md, and his 23:55 / 08:45 go-aheads). If auto mode blocks a merge,
  ask him in chat for permission.
- Never trace CT animation frame by frame (IP; he accepted pose matching, then dropped CT references for movement).
- Start new sessions only from his own words in the desktop app; a session cannot start one from a peer message.

## Resume prompt
```
Night Shift | Orchestrator. Resume from docs/orchestrator/STATE.md on feature/menu in C:\NightShift\Mobile-Coop-menu (git fetch; merge origin/master into feature/menu). Read CLAUDE.md "Sessions" and docs/ROADMAP.md (its "Decided" list has Michael's answers). Check what each session has reported (ListAgents for who is live; the job branches' STATE files), then carry on with "Open PRs / merges to do" and the context clears. Movement and animation are top priority. Short replies, native multiple choice only.
```
