# Spare jobs (orchestrator triage, 2026-10-23 ~01:25)

Ranked list for idle agent slots during the full burn (Michael 01:05). Each job is its own branch from master and one PR
(trains). Keep out of marlow-final's slice 0 files (courseDef / courseState / courseMode.ts, ctDevices.ts, scanners.ts,
protocol.ts, coopUi.ts, courseHud.ts, securityRoom.ts, ctcourse.ts, src/world/{kit,props,lighting}, src/game/course/*,
stealthSystems.ts; Menu Notes 01:30: slice 0 also edits src/net/coopHost.ts SecWire encode, not teamController.ts) and the mocap
files (animGraph, footPlanner, footGeom, keyed, tune, characterRig, animTunePanel, settings, flags, app.ts). Protocol:
marlow-final takes 30; the next wire change takes 31. Check sector-fixes-r2's files (teamController.ts, coopHost.ts)
before jobs 2, 3, 9.

| # | Job | Why | Files / area | Tests | Size | Session |
|---|---|---|---|---|---|---|
| 1 | sw-reload: the service worker (`registerType: 'autoUpdate'`, src/pwa/pwa.ts) reloads open windows mid-match after a deploy; defer to the menu | can drop a co-op walk; the e2e-netmove "Execution context was destroyed" entry | vite.config.ts, src/pwa | step + e2e-coop | S | Course Ready |
| 2 | Hang-down: sidearm, grab, neck-snap for the hanging player (`runHang` teamController.ts:497) | all co-op moves | teamController.ts, coopHost.ts, team_hang | slice | M | CT Core |
| 3 | Throw the partner onto a guard knocks him out (landing in coopHost / teamController) | co-op move | coopHost, teamController | slice | S | CT Core |
| 4 | G44 guards see poorly above them (~15 lines, src/ai/perception.ts) | hang / pipe / ledge play over live guards | perception.ts | unit + e2e-stealth-ai | S | Course Ready |
| 5 | Hand-swap and strike pops: n4c 1 (dip speed flip), n4c 9 (wrist 31 cm jump), n4d 1 (follow-through survives a bay restart; fix in the takedown / strike reset) | broken, not polish | anim strike / takedown | unit + e2e-anim | S | CT Core |
| 6 | Partner pose parity: aim side on the wire, remote melee -1 clamp, baked sections on the partner | co-op reads | net + anim | slice, protocol 31 | M-L | CT Core |
| 7 | Crouch pops 9.6 / 8.3 cm (anim-bake-targets) | broken | characterRig, footPlanner | unit + e2e-anim | S-M | CT Core, after mocap-trial-2 |
| 8 | Traversal: ledge-end hand fall-through, climb-up hands let go early, rifle draw -1.5 cm vs e2e-clip -2 cm | correctness | traversal | e2e-traverse + e2e-clip | S-M | CT Core |
| 9 | Joint interrogation (G148), host flags | co-op move | coopHost | slice | M | Course Ready (not with 2 / 3) |
| 10 | Host view of a joiner's hostage flickers gait below 60 fps (`holdAt` velocity per fixed step) | co-op read | net / anim | e2e-coop | S | CT Core |
| 11 | Keyboard vent: Space then an unseen E hold counts as a kick (T1) | input bug | traversal | e2e-traverse | S | CT Core |
| 12 | Report: gameplay reads the rig pose (backlog 28): guard eye from rig.headNode, mocap bob moves it | rule risk | docs | docs | M | CT Core |
| 13 | Test chores: e2e-coop "client strike denied" (wait until the strike can start, assert begin()); role-swapped co-op pass with the client as lead; run-e2e.mjs KILLED line in streamed mode | flake / coverage | tests, scripts | the suite | S | Character Build |
| 14 | Co-op body carry on the client (bodies not in the item mirror, coopHost.ts:998) | co-op move | net | slice, protocol bump | M-L | Course Ready |
| 15 | Optic cable (ct-toolkit 3.2, stub in the door menu) | CT tool | gadgets, net | slice, protocol bump | L | CT Core |

Could block a co-op run of Marlow Yard: job 1; e2e-coop "client strike denied" (never diagnosed, may be a real
refusal); e2e-coop stall when a match starts after Return to lobby (docs/marlow-bays/STATE.md; one solo GPU rerun on
the laptop settles it).
