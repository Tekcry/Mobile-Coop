# Orchestrator - resume point (2026-10-21 ~01:10 Sydney)

Read CLAUDE.md (above all "Sessions") and docs/ROADMAP.md first; the roadmap's "Decided" list holds Michael's answers
verbatim. Work folder: C:\NightShift\Mobile-Coop-menu, branch feature/menu (orchestrator docs). Merge origin/master into
it before each docs batch; the docs go to master in a docs PR (patch) when convenient: feature/menu is many commits
ahead (open one docs PR soon; also rename the two stray "## Unreleased - anim-metrics" headings, fold the nv-pass and
later job answers into DECISIONS with G numbers, and record G68's voxel clause replaced by smooth-world).
Scratch worktree for version / merge steps: C:/NightShift/Mobile-Coop-phone-native (detached checkouts; reset --hard
there is safe, it holds only the orchestrator's merges).

## Master
v4.20.1 (#60, 6a4fb07f). Tags v4.0.0-v4.20.1. /preview/ = dev = 6a4fb07f. Merged since the 2026-10-20 reset, in order:
4.15.2-4.15.4 (phone native, phone menu High, FPS banner), 4.16.0 nv-pass (#49), 4.16.1-4.16.2 (fps cap, phone 75%),
4.17.0 anim-rework slice 2 (#52), 4.18.0 warehouse-s23 (#50), 4.18.1 phones fixed 50% (#55), 4.19.0 slice 3 (#54),
4.19.1 test-speed (#57), 4.20.0 anim tuner (#56), 4.20.1 tuner pad control (#60). /ct/ = ct-movement (CT Core).
Dashboard: https://claude.ai/artifact/XehBYx1Lm27txV29kjSoXh (source docs/orchestrator/dashboard.html; stale since
2026-10-20, update when convenient).

## Priority (Michael, 2026-10-21 ~00:40)
"Priority overnight is the animation system. Movement has become less important as I will manually fine tune
everything as needed." / "Turn off movement slices and any research." Then: finish the co-op training bunker (Marlow
Yard), then the campaign level. Warehouse rebuild deferred (docs/reviews/warehouse-layout-review.md). Token use lean.
Usage rule: "Auto trim when the 5 hour session reaches 90% and focus on tools only": at 5-hour >= 90% pause everything
except the animation tools (Course Ready, Menu Notes tuner-v2) and the laptop runs they need. At 00:55: 5-hour 33%
(reset ~05:00), weekly all models 73% (reset 2026-10-22 ~23:00).
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
Night Shift | Orchestrator. Resume from docs/orchestrator/STATE.md on feature/menu in C:\NightShift\Mobile-Coop-menu (git fetch; merge origin/master into feature/menu). Read CLAUDE.md "Sessions" and docs/ROADMAP.md (its "Decided" list has Michael's answers). It is overnight 2026-10-21: the animation tools are the priority (Course Ready: tuner-camera, then Anim Studio; Menu Notes: tuner-v2); movement slices and research are off. Michael approved merging green PRs overnight on their test tiers. Check the usage meter (get_usage) on each wake: at 5-hour >= 90% pause everything except the animation tools. ListAgents, then carry on from "Sessions and jobs" and the open PRs using "Merge procedure". Short replies, native multiple choice only, hyphens not em dashes; every paste-in prompt states session title, model and effort and is the turn's last message.
```
