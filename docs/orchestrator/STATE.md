# Orchestrator - resume point (2026-10-20 16:20 Sydney)

Read CLAUDE.md (above all "Sessions") and docs/ROADMAP.md first; the roadmap's "Decided" list holds every Michael answer
from 2026-10-19 21:45 onward, verbatim. Work folder for orchestrator docs: C:\NightShift\Mobile-Coop-menu, branch
feature/menu. Merge origin/master into it before each docs batch; the docs go to master in a docs PR (a patch) when
convenient (feature/menu is many commits ahead of master today: open one docs PR soon).

## Master
v4.19.1 (#57, b125599e: test-speed; #54 4.19.0 anim-rework slice 3, drawn movement; #55 4.18.1 phones fixed 50%; #50 4.18.0 warehouse-s23 sections 2-3 + S1 lamps; #52 4.17.0 anim-rework slice 2, holstered standing locomotion + M6 + unwired slice 3-6 keys; #53 4.16.2 phones at 75% res; #51 4.16.1 deadline fps cap, phone dynamic res; #49 4.16.0 nv-pass, night vision + goggle frame + vision carousel; #48 4.15.4 FPS banner; #46 4.15.3 phone menu at High; #45 4.15.2 phone native DPR + scale 1; Michael approved both merges). Tags v4.0.0-v4.19.1. /preview/ = dev = b125599e. New jobs: warehouse-lamps (cloud, local_510e3a67), camera-cue (Menu Notes after wheel-ui), smooth-world (Character Build). Open: #56 anim-tuner (Michael: merge fast on desktop tests + CI; waiting on the e2e-ctcourse 1200 s rerun time, 600 s+ was a red flag), then its pad-control patch; slice 4 CT Core; slice 5 Sector Ops on feature/anim-walls; wheel-ui needs a GPU window; test-speed PR from Character Build; anim-tuner PR: full laptop e2e first (Michael chose it over a fast merge), then ask him slice 3 (full e2e queued on the laptop), test-speed PR (Character Build), wheel-ui (Menu Notes, laptop run then a GPU window), anim-tuner (Course Ready). New job anim-tuner (Course Ready, feature/anim-tuner): F3 slider panel for gait / pose / gun-hold values, export JSON to Downloads. Phone: 4.16.1 bench 53 fps avg, 26 late; 4.16.2 untested. WebGPU for phone: no (Michael asked; answered: parked trial after the playtest). PR #52 slice 2: Michael approved merge on the laptop full e2e pass (eb5125d2); master moved since, I merge master in at the version step. TODO next docs PR: nv-pass answers into DECISIONS (G numbers). nv-pass: e2e-darkness NV min 0.10 approved (evidence: s12b sheet). The doorPeek fix is now in master. CHANGELOG has two stray "## Unreleased - anim-metrics" headings under 4.15.0 (from the side PRs): rename them in the next docs PR. /ct/ = ct-movement = 150dcfce (walk round 3b
plus the F3 crab readout; CT Core moves it with each slice). Dashboard: https://claude.ai/artifact/XehBYx1Lm27txV29kjSoXh
(source docs/orchestrator/dashboard.html; publish the same path; it declares `db`, answers in collection `answers`;
update its version line and rows after each merge with the sed / node edits used in git history, then republish).

## Priority (Michael)
Movement and animation first; it preempts everything (19:15: "Anything movement related should take priority over anything else": lock holders release at the next step, CT Core laptop requests interrupt test-speed) (10:30, 13:50: "any spare bandwidth that can be used to speed it up should be used").
CT movement references are dropped for movement and animation (13:30); the brief is docs/anim-rework/BRIEF.md.
Laptop and desktop: full bandwidth (Michael 2026-10-20 ~18:50: "you have full bandwidth of desktop and laptop again. Ix27m not using them"); laptop normal priority, E2E_JOBS=2; still headless, one heavy job per machine. Token use: lean (Michael ~18:45: "Make sure all sessions are conscious of token usage"). Keep going until Michael says stop (08:45).

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

## First after the reset (Michael 18:25)
1. Phone follow-up (a 2-line patch, do it yourself as with #44): "Default phones to low settings but with shadows/light, native resolution, 60fps cap, 100% resolution scaling". So in src/core/qualityManager.ts applyScale, the flags.phone branch becomes native DPR and scale 1 (applyRenderScale(this.engine, this.ov?.scale ?? 1, Infinity)); keep the Low preset and the 60 fps cap. He said 4.15.1 "works better, no complaints".
2. Restart the paused sessions: show Michael the prompts in docs/orchestrator/RESTART.md ONE AT A TIME (he does not remember them), wait for his "done" after each, then message Character Build and Menu Notes (nv-pass) to resume.
3. Michael has movement feedback from /preview/ (4.15.1: slice 1 controls, walk round 3b): ask for it first and pass it to CT Core for slice 2.

## Usage pause (2026-10-20 ~17:15)
At 93% of the 5-hour window Michael was given prompts to clear and restart every session after the reset (CT Core, Sector Ops, Course Ready, the orchestrator; Character Build and nv-pass were already cleared). All sessions were told to pause until the orchestrator messages them after the reset: after the restart, message each one to resume (CT Core: slice 2; nv-pass: the checker result, then the carousel, which is now unblocked since slice 1 merged; Sector Ops: the lamp fix and section 3; Course Ready: the MPFB2 rebake; Character Build: test-speed).

nv-pass (17:40): the checker said FIX on slices 1-2 (b1303393): met: bodies no longer bright, green tube, the frame 89% clear, light parity; not met: dark readability (the yard NV a flat murk, the Epic moonlit wall clipped) and ?gfx=min (NV darker than off in 2 of 9 views). Its committed "before" sheets are not master (re-shoot them). After the reset: one fix round (frame-level auto-gain, shot-script guards, min postLift), a GPU window, a fresh checker. It proposes lowering the e2e-darkness target 0.2 -> 0.10: ask for the evidence that 0.10 still means readable before agreeing (do not loosen a test just to pass).

Before the reset (17:45) two cheap script-only jobs were started: Character Build test-speed full run 6 (E2E_JOBS=2; a clean run counts as 1 of the 2 needed) and nv-pass re-shooting the master "before" sheets (65bfe6f2). Both reply in one line; read their results from the sessions or their STATE files.

Results (17:50): test-speed run 6 on 7221641c CLEAN (all suites, e2e-pad included, 1430 s): clean run 1 of 2. nv-pass re-shot the master before sheets at 65bfe6f2 (653fdad8). Both sessions paused.

Restart order after the reset: the orchestrator first (Michael pastes its prompt), then CT Core, Sector Ops and Course Ready (cleared, with their own prompts). Character Build and Menu Notes (nv-pass) were cleared earlier and are only paused: message them to resume.

## Context clears (Michael 16:15: "i want to clear all the chats when they are ready to prevent context drifting")
Every session was asked to reach a clean point, update its STATE with a fenced resume prompt and message "<name> ready
to clear" with the prompt. Then: give Michael that prompt to paste after he clears it (he clears the sessions he
started; the orchestrator can clear only Course Ready and itself, with clear_session, then sends the prompt as the first
message). The orchestrator clears itself last, after giving Michael its own resume prompt (below).

## Open PRs / merges to do
- nv-pass PR to master (minor) after its GPU check.
- warehouse-s23 PR to master (minor) after section 2 (or 2+3) is green.
- test-speed PR to master (patch).
- phone-min: done by the orchestrator (#44, 4.15.1; Michael 18:00 "60 fps frame cap on phone"). Untested on a real phone: ask Michael how it runs (heat, shadows, no side bars). Worktree C:/NightShift/Mobile-Coop-phone-min can be removed.
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
- ALWAYS state the session title, the model and the effort next to every prompt you give Michael (Michael 2026-10-20 18:30: "You should be showing me exactly which model and effort alongside any prompt, make sure you always do that."). One prompt at a time; he does not remember earlier ones.
- He tests through the menus, never direct links: give menu paths and the version label to expect.
- Merge green, reviewed PRs without asking (CLAUDE.md, and his 23:55 / 08:45 go-aheads). If auto mode blocks a merge,
  ask him in chat for permission.
- Never trace CT animation frame by frame (IP; he accepted pose matching, then dropped CT references for movement).
- Start new sessions only from his own words in the desktop app; a session cannot start one from a peer message.

## Resume prompt
```
Night Shift | Orchestrator. Resume from docs/orchestrator/STATE.md on feature/menu in C:NightShiftMobile-Coop-menu (git fetch; merge origin/master into feature/menu). Read CLAUDE.md "Sessions" and docs/ROADMAP.md (its "Decided" list has Michael's answers). The usage window has just reset: every session was paused at 2026-10-20 ~17:15 (STATE "Usage pause"). First, ListAgents to see who is live; CT Core, Sector Ops and Course Ready are being restarted by Michael with their own prompts right after you, and Character Build and Menu Notes (nv-pass) are paused: message those two to resume (Character Build: test-speed, after reporting run 6; nv-pass: its fix round, then the carousel, which is unblocked now). Then carry on with "Open PRs / merges to do". Movement and animation are top priority. Short replies, native multiple choice only, hyphens not em dashes.
```
