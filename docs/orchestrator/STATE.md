# Orchestrator - resume point (2026-10-21 ~01:10 Sydney)

Read CLAUDE.md (above all "Sessions") and docs/ROADMAP.md first; the roadmap's "Decided" list holds Michael's answers
verbatim. Work folder: C:\NightShift\Mobile-Coop-menu, branch feature/menu (orchestrator docs). Merge origin/master into
it before each docs batch; the docs go to master in a docs PR (patch) when convenient: feature/menu is many commits
ahead (open one docs PR soon; also rename the two stray "## Unreleased - anim-metrics" headings, fold the nv-pass and
later job answers into DECISIONS with G numbers, and record G68's voxel clause replaced by smooth-world).
Scratch worktree for version / merge steps: C:/NightShift/Mobile-Coop-phone-native (detached checkouts; reset --hard
there is safe, it holds only the orchestrator's merges).

## Master
v4.43.2 (#94, b0670ed5). Tags v4.0.0-v4.43.2. /preview/ = dev = b0670ed5 (02:05, 10-22). Open: #90 J2 (laptop solo reruns), sector-fixes queued (spare capacity), bake-1022 (CT Core, Michael chose bake all + widen run limits), anim-gear (after #90), tuner v3 (A), S4 (C, after #90), slice J (paused after checker), Bays Cloud R (paused). #90 J2 fixing e2e-studio; tuner v3 (A), S3b (C), havok-stall + anim-gear (B), slice J checker, Bays Cloud R building. Open: S3b after the reset (feature/anim-skeleton-s3), havok-stall (CT Core, after J2), J2 (e2e-menus stall fix), item 25 (checker). Paused to 23:00: slice J (f89c94f7, needs a fresh checker), Bays Cloud R / S. Open: #67 parked. Bays Cloud: slice R (rejoin) then S (server browser). Building: phone tuner (A), J2 (B), skeleton (C), slice J (laptop). GPU look of the camera cue grid owed. Tracks (docs/marlow-bays/BRIEF.md): A Course Ready T2 phase 2 (feature/marlow-tuner-t2, layout OK'd); B CT Core T1b (feature/anim-joints); C Menu Notes T3 skeleton (feature/anim-skeleton, prototype OK'd + smooth fingers); bays B + M in a cloud session; slice J later. Open: marlow-bays (Course Ready: slice T on feature/marlow-tuner, then T2 tuner UI redesign, then bays B, J, M; docs/marlow-bays/BRIEF.md on feature/marlow-bays). Plan with Michael (13:45): one focus at a time, three sessions (Orchestrator, Course Ready, Character Build); Dev tools menu + general level editor discussed, not actioned. Merged since the 2026-10-20 reset, in order:
4.15.2-4.15.4 (phone native, phone menu High, FPS banner), 4.16.0 nv-pass (#49), 4.16.1-4.16.2 (fps cap, phone 75%),
4.17.0 anim-rework slice 2 (#52), 4.18.0 warehouse-s23 (#50), 4.18.1 phones fixed 50% (#55), 4.19.0 slice 3 (#54),
4.19.1 test-speed (#57), 4.20.0 anim tuner (#56), 4.20.1 tuner pad control (#60), 4.21.0 wheel-ui (#61), 4.21.1 e2e-pad-fix (#64), 4.22.0 warehouse-lamps (#59), 4.23.0 tuner-camera (#65), 4.24.0 slices 4+5 (#66), 4.25.0 tuner-v2 (#68), 4.26.0 Anim Studio PR 1 (#69), 4.27.0 Weight (#70), 4.28.0 smooth-world (#58), 4.28.1 shots-simwait (#72), 4.29.0 Anim Studio PR 2 (#71), 4.30.0 bake script (#73): the animation tools are done. /ct/ = ct-movement (CT Core).
Dashboard: https://claude.ai/artifact/XehBYx1Lm27txV29kjSoXh (source docs/orchestrator/dashboard.html; stale since
2026-10-20, update when convenient).

## Priority (Michael, 2026-10-21 ~00:40)
"Priority overnight is the animation system. Movement has become less important as I will manually fine tune
everything as needed." / "Turn off movement slices and any research." Then: finish the co-op training bunker (Marlow
Yard), then the campaign level. Warehouse rebuild deferred (docs/reviews/warehouse-layout-review.md). Token use lean.
Usage rule (updated ~07:00, replaces the lines below): use the weekly budget as normal, no 5-hour trim; at weekly >= 98%
pause everything and run docs/orchestrator/HANDOFF.md (switch to the other account, prompts one at a time).
Older rule (00:58): "Change nothing, reduce token usage at 85% 5 hour window (unless within 30 mins of reset),
top priority is animation work." At 5-hour >= 85%, unless the reset is under 30 min away, pause everything except the
animation work (Course Ready, Menu Notes tuner-v2, CT Core Weight group) and the laptop runs it needs. Checkers stay
per slice. At 00:55: 5-hour 41% (reset ~04:30), weekly all models 74% (reset 2026-10-22 ~23:00).
Overnight merges approved: "Yes, merge green PRs", each on its test tier; anything unsure waits for him.

## Sessions and jobs (titles are the message addresses)
| Session | Job, branch @ head | State (01:10) |
| --- | --- | --- |
| Night Shift \| Course Ready Build (local_4d5454d2) | tuner-camera (feature/tuner-camera, not pushed yet): camera sliders per state + live free view (orbit, fly with demo loop, slow motion, hide HUD) + the tuner section registry (registerTuneSection; API in docs/anim-tuner/STATE.md); then Anim Studio PR(s): stage like the old menu void, loop player, viewing aids (skeleton, foot markers / trails, onion skin, F3 readout, camera snaps), undo / A-B / copy-paste / presets; then co-op pairs (both Wrens, guard) and traversal props | building |
| (Course Ready, added 01:40) | Michael: speed sliders per state (gameplay, local only, identity), freeze the game when View hands the pad to the tuner (+ pause / step frame), every tuner / Studio control usable by pad, slider edit mode (press A to edit, A confirm, B cancel), a reviewed streamlined pad map written in docs/anim-tuner/STATE.md and shown as a hint strip | queued in tuner-camera / Studio PR 1 |
| Night Shift \| Menu Notes Build | tuner-v2 (feature/tuner-v2 @ d09b32ec): per-joint offsets with mirror lock, hand / foot placement, stepping controls (stuck feet), per-key editing exported as clip keys, Weapon group (gun scale visual only, grip, support hand, fingers); wire panels only via the registry once Course Ready sends its head. Also camera-cue (feature/camera-cue @ efa734d1): laptop run queued, GPU shots, fresh checker, PR | building |
| Night Shift \| CT Core Build | lands built work only: S2b walk fix (feature/anim-s2b, PR soon) and slice 4 crouch + walls merge on feature/ct-prototype (@ d2ffd4a4, merge agent running) -> PRs; then tool support (footPlanner hooks for tuner-v2) and the Weight tuner group (momentum ramps, lean into accel / turns, plant and landing compression, critically damped springs on chest / head / arms / gear, anticipation; identity defaults; via the registry; starts from master once the registry head is pushed) | finishing |
| Night Shift \| Sector Ops Build | stopped (slice 6 not started; feature/anim-hold has STATE only) | idle |
| Night Shift \| Character Build (laptop, Remote Control) | the test runner; queue: camera-cue efa734d1 (check + smoke stealth ctcourse sectorops coop netmove), wheel-ui 938393bf full e2e, smooth-world after its fix, warehouse-lamps after its fix | running |
| Night Shift \| Character Build: smooth-world job (laptop, Remote Control) | smooth-world #58 (feature/smooth-world @ 67e4ccd8): voxels off by default; fix round 2 matched the level fill to the voxel formula (tests/levelFillParity.test.ts within 10%); laptop check + full e2e requested; reshoot annex and rain-roof walls default vs ?voxels=1 in Menu Notes' GPU window; watch e2e-desktop's 16-texture count at Epic | testing |
| Warehouse lights: ceiling fix + quick fittings (local_510e3a67) | warehouse-lamps #59 (@ a5b99613): e2e-sectorops failed, a hex colour undefined in a build loop (Color3.FromHexString in AO.build): fix round asked, then laptop rerun + a GPU look | fixing |
| Marlow Yard bunker pass (local_37c97872, cloud) | marlow-bunker (feature/marlow-bunker @ 54fa3dbf): the full shortlist of docs/reviews/marlow-yard-audit.md, floor kept at 0.30; PR, then a GPU look | building |

Laptop: camera-cue efa734d1 PASS (all suites); queue wheel-ui #61 full, smooth-world 67e4ccd8, tuner-v2 c32e7c26, warehouse-lamps 0fb59235 (colour-index fix). Open PRs: #58 smooth-world, #59 warehouse-lamps, #61 wheel-ui (checker PASS, laptop PASS on d8c69347; full e2e on
938393bf queued). Not yet PRs: camera-cue, S2b, slice 4+5, tuner-camera, tuner-v2, marlow-bunker.
Waiting on Michael: the guard AI job runs on his second account when it resets (prompt: docs/orchestrator/guard-ai-prompt.md;
plan docs/reviews/guards-review.md); A5 aimed strafe 0.7 m/s is his call; his walk tests with the tuner.
Reviews (suggestions only): docs/reviews/marlow-yard-audit.md, warehouse-layout-review.md, guards-review.md.

Resumed 00:55 after a clear. #61 CI failed on tests/analogGear.test.ts
"allocates nothing per update" (3.6 MB vs 2 MB heap; wheel-ui touches no gear / anim code: CI noise); rerun PASS.
01:25 Michael chose "Pause non-anim" (weekly 75%, ~2.4%/h) and went to sleep: Marlow (pause message queued, not yet
delivered) and warehouse-lamps hold (merge #59 on a laptop + CI pass, no fix round tonight, GPU look later); Menu Notes
skips the camera-cue GPU shots. Tuner additions queued: Course Ready = barrel marker fix (half screen grey), smooth
state changes, Import JSON, wider ranges, bypass, slow motion, slider search, then the bake script after Studio PR 1;
Menu Notes = per-limb targeting strength with item 2. Laptop: tuner-v2 0e73c3b2 PASS (check, smoke, e2e-anim,
e2e-menus); #61 full PASS (e2e-levels ok solo; e2e-pad "focus Quit" is a stale step after the tuner pause item:
Character Build fixes it on feature/e2e-pad-fix). #61 merged as 4.21.0 (CI needed 2 reruns: analogGear heap test flaky; Character Build hardens it in the e2e-pad-fix patch). tuner-v2 item 2 b8bc1846 queued on the laptop.
camera-cue: draft PR #63 (master merged; fix-round check + GPU shots pending, the shader never ran on a GPU: do not
merge as is). The GPU window never ran: #58 smooth-world also waits for its GPU reshoot (after the pause lifts); laptop full e2e PASS on 67e4ccd8 (1297 s),
so only the reshoot remains. e2e-pad fix merged as 4.21.1 (#64). #59 warehouse-lamps 0fb59235: build, smoke, e2e-sectorops PASS; full e2e asked on the idle laptop (tuner-v2 wired head goes first), then merge (GPU look later).
marlow-bunker paused at 80d49dd3; PR #62 open (CI pending; full e2e and GPU look not run; e2e-ctcourse passes solo but
hits 600 s at E2E_JOBS=2). Not on the laptop queue while paused. warehouse-lamps holding (laptop run queued).
tuner-v2: item 2 checker PASS (fingers partial: one curl per hand + trigger on / off, the rig has no finger joints);
registry merged in (532adb2b), so the PR order is tuner-camera first, then tuner-v2. Wiring step running; laptop tests
the wired head (b8bc1846 dropped if not started).
02:50 usage: 5-hour 64% (reset ~04:30), weekly 78% (+3% in ~40 min with only animation work + merges): at this pace
the weekly window runs out around 06:30-08:00. Only animation work is running; checkers stay per slice (Michael 00:58).
tuner-v2: wired head a8aef532 laptop PASS; item 3 Stepping at ebb5ae57 (13 hooks in footPlanner.ts, CT Core told).
For Michael in the morning: the stuck running foot is the replant rule firing at full leg stretch; Stepping > run /
crouchRun replant 0.8 lifts it ~9 cm sooner with no slide. Defaults left at identity (his call). Course Ready pass 2
fix round at 826a01d7, check + solo reruns going.
#59 merged as 4.22.0 (full e2e PASS on 0fb59235; GPU look still owed). tuner-camera PR #65 @ 2287d5b7 (minor):
laptop full e2e next (e2e-menus hit 600 s on the desktop at 664 s); Course Ready starts Anim Studio PR 1 on
feature/anim-studio from 2287d5b7 meanwhile. tuner-v2 f2dabf8d laptop PASS; its PR merges after #65.
CT Core slices 4+5 PR #66 @ 515b1f07 (/ct/ there): desktop check + anim / wall / clip / move pass; laptop full e2e
after #65's. e2e-mouse remap section times out on master 6a4fb07f too (laptop checks it solo on 04ec4cd6). Merge
order: #65, #66, then tuner-v2 (Menu Notes resolves the footPlanner conflict after #66). Anim Studio PR 1 building on
feature/anim-studio (from 2287d5b7).
04:30 the 5-hour window reset (0%), weekly 84%. #68 tuner-v2 merged as 4.25.0 (laptop full PASS, CI); Menu Notes idle. ~05:10: #65 merged as 4.23.0, #66 as 4.24.0 (CHANGELOG-only
conflicts). Next: Menu Notes merges master into tuner-v2 (footPlanner, keep both), laptop check + e2e-anim, PR, full
e2e; CT Core merges master into #67 (S2b; laptop full e2e on 468fa2c7 running) and builds the Weight group
(feature/anim-weight); Course Ready finishing Anim Studio PR 1 checks (989ba439 + fixes), then PR 2 (co-op pairs, guard
for holds, traversal prop rig), then the bake script. Laptop after #67: tuner-v2 PR head, then e2e-mouse solo on master.
~06:00 open: #69 Anim Studio PR 1 @ c55adaec (master 4.25.0 merged; laptop full running); #70 Weight (CT Core,
merging master only, then laptop full); #67 S2b FAILED full e2e on 3eaf3509 (auto-merge put the pre-slice-4 crouch
numbers back: knees 1.6x, wristR pop 9.2 cm > 7.5) - Opus fixer on feature/anim-s2b, then a fresh full. Merge order:
#69, #70, #67. e2e-stealth-ai peek assert fails in full runs, passes solo (rerun queued; flaky candidate).
Course Ready building Anim Studio PR 2 on feature/anim-studio-2 (from c55adaec).
#69 merged as 4.26.0 (d537cbd8). ~06:40 Michael: tools first, spare capacity on jobs smallest to largest, warehouse
rebuild parked (see ROADMAP Decided). Menu Notes: #58 GPU reshoot -> lamps GPU look -> camera-cue #63 (GPU only when the
desktop lock is free). Laptop: #70 full, tool heads, #67 fixed head, master e2e-mouse, #62 full, #63.
~09:30 the animation tools are DONE (4.23.0-4.30.0). Michael approved spare jobs: decisions-fold (Sector Ops: ROADMAP
Decided -> DECISIONS G192+, docs PR; the orchestrator swaps ROADMAP pointers), stealth-peek-wait (Character Build, test
only), shots-rows + gl-warning-fix (Menu Notes), no-aim-assist (CT Core, G16), coop-torches (Course Ready,
feature/coop-torches, protocol bump; may not finish before 98%). Laptop: #62 99349d64 full, then #63 81deebfb full, then
the spare-job PRs. Docs PR #74 merged as 4.30.1.
~11:40 ACCOUNT SWITCH (Michael): every session paused; what was in flight and each session's new-account prompt are in
docs/orchestrator/HANDOFF.md. Merged since 10:00: #75 4.32.1, #77 4.32.2 (no aim assist), #78 4.32.3 (stealth-ai test).
~10:00 merged: #76 4.30.2 (decisions G192-G228), #63 4.31.0 (camera-cue), #62 4.32.0 (Marlow bunker + variety).
#75 shots-rows versioning as 4.32.1. Open: tuner-ui (Course Ready, building), gl-warning-fix (Menu Notes, building),
#77 no-aim-assist (laptop full running; e2e-pad likely needs step fixes after the Controls row went), stealth-peek
investigation (Character Build: a rendered frame changes the guard's head / chest sight: possible "gameplay reads
graphics state" bug), coop-torches parked (de13c05b), #67 parked, campaign-spec parked. Weekly 96% at 10:00.
(Old) #62 at 5ef3a1c4 (master 4.30.1 merged, versioned 4.31.0) FAILED CI: smooth-world's tests assume the open-roofed yard
(smoothWorldLight x2) plus levelFillParity's annex rain-roof sample (check for a shared-code regression). Back to the
Marlow session (one fix round). Then merge as 4.31.0, then #75 shots-rows (4.31.1). tuner-ui (Michael 09:15, Course
Ready, coop-torches parked behind it).
#67 S2b PARKED (feature/anim-s2b 6c96715f): wrist pop fixed; e2e-stealth-ai wall peek open (S2b's step line ends the
peek 15.9 cm past the edge vs 13.8 on master, so no spot sees the head alone; restoring stepLen0 / stepLenK / WALK_STEP
gives master's pose). Findings: S2B-REPORT.md "## #67 parked"; not yet merged with master 4.27+, tuneStep patch pending.
CT Core idle. Anim-rework STATE docs on feature/ct-prototype 5bcaa228 (docs PR later).
Registry head pushed 01:00: feature/tuner-camera @ df00a947 (tsc clean, heavy checks pending); relayed to Menu Notes
(tuner-v2) and CT Core (Weight group on feature/anim-weight, after S2b + slice 4+5 PRs). 01:00: 5-hour 44%.
#59 head 0fb59235 has no CI run yet. Laptop: #61 full e2e running (done ~01:06), then tuner-v2 0e73c3b2 (retargeted), smooth-world, warehouse-lamps.

## Merge procedure
Check the PR head equals the tested commit (or the delta is docs only). In the scratch worktree: checkout --detach the
branch, merge origin/master resolving only CHANGELOG / package conflicts (on any src conflict abort and send it back to
the job lead), npm version <v> --no-git-tag-version, rename the top "## Unreleased - <job>" heading to
"## <v> - <title> (<date>, PR #<n>)", commit "<v>: version at merge (G183)", push HEAD:<branch>, watch CI in the
background (gh run watch <id> --exit-status), gh pr merge <n> --merge, then tag v<v> and push <merge>:refs/heads/dev as
separate commands; update this file's Master line and the ROADMAP Done table.

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
- Start new sessions only from his own words in the desktop app; a session cannot start one from a peer message. When the app refuses a start (an answer from a question dialog does not count as his words), propose a card (own_initiative) and tell him to click it.
- A paste-in prompt is the turn's LAST message, never paired with a question dialog in the same turn.
- Check the usage meter (mcp__ccd_session_mgmt__get_usage) when pacing.

## Resume prompt
```
Night Shift | Orchestrator (new account). Resume from docs/orchestrator/STATE.md and docs/orchestrator/HANDOFF.md on feature/menu in C:/NightShift/Mobile-Coop-menu (git fetch; merge origin/master into feature/menu). Read CLAUDE.md "Sessions" and docs/ROADMAP.md. Sessions from the old account are gone: start each job's session by giving Michael its prompt from HANDOFF.md "In the new account", one at a time, with session title, model and effort, as the last thing in the message. First: read the desktop's #79 result and get the laptop's #80 result through Character Build; merge what passed using "Merge procedure". Check get_usage on each wake. Short replies, native multiple choice only, hyphens not em dashes.
```
