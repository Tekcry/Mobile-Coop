# Spare jobs (orchestrator triage, 2026-10-23 ~01:25; audited against master 6b44efb8 on 2026-10-24 by Marlow Build)

Ranked list for idle agent slots. Each job is its own branch from master and one PR (trains). Protocol: tests read
`PROTOCOL_VERSION` (48 on master at the audit); the train bumps it once for any wire change. Before a co-op job check
the open PRs touching `src/net/coopHost.ts` / `teamController.ts`.

## Open
| # | Job | Why | Files / area (master 6b44efb8) | Tests | Size | Session |
|---|---|---|---|---|---|---|
| 9 | Joint interrogation (G148): two players question one captive, host flags. Master has the interrogation-intel feed and a single client interrogating alone; nothing joint (`docs/marlow-final/COOP-INVENTORY.md:94` "Not built"; SPEC.md:1255 plans it as CR-S32, the A8 officer) | co-op move | src/net/coopHost.ts:125-126 (`interPh`), :1539-1546 (client interrogation); src/game/intel.ts:100; src/game/grabMenu.ts:16-31; src/ai/guardInfo.ts | slice, protocol bump | M | Marlow Build (2026-10-24) |
| 14 | Co-op body carry on the client: bodies are not in the item mirror (`ITEM_KINDS` has no 'body'; host `items()` never emits them); needs an item kind, host-authoritative pickup, carry state on the wire | co-op move | src/net/coopHost.ts:1356-1385 (`items()`); src/net/protocol.ts:189-203 (NetItem, ITEM_KINDS), :391-399 (`netItem`); src/game/stealthSystems.ts:70, 237, 365; src/net/coopClient.ts | slice, protocol bump | L | unowned |
| 15 | Optic cable, the rest: PR #239 (f1864d3f, train 31) built it at closed doors, local view only. Left: the partner's kneel pose (MoveState `optic`, wire), hatches / panels / grilles, polish (camera ease, `releaseAll` on exit, gap sphere cast, `Door.seal` from map data; docs/archive/optic-cable/CHECK.md) | CT tool | src/player/opticCable.ts, src/game/opticSystem.ts, src/game/doorMenu.ts:34, src/game/gameState.ts:1519 | slice, protocol bump | M-L | unowned |
| 12 | Report: gameplay reads the rig pose (backlog 28): written on feature/rig-pose-audit 4d7b1125 (docs/rig-pose-audit/REPORT.md) but NOT on master; the 8 fix slices (ROADMAP.md:36) are open PR #308 feature/rig-pose-fix | rule risk | docs/rig-pose-audit, PR #308 | docs | S (merge the report with #308) | #308's owner |

## Done
| # | Job | Done in | Evidence |
|---|---|---|---|
| 1 | sw-reload: a deploy never reloads a match (update at the menu) | PR #176 (45c9ebf0) | vite.config.ts:56 `registerType: 'prompt'`; src/pwa/updatePolicy.ts |
| 2 | Hang-down: sidearm, grab, neck-snap for the hanging player | PR #207 (7d8f6459), train 28 #235, 4.77.0 | src/game/teamController.ts:580 `runHang`; takedownController.ts:368, 521; src/net/hangHold.ts |
| 3 | Throw the partner onto a guard knocks him out | PR #186 (ec90d286), train 20 #192 | src/net/throwKo.ts; coopHost.ts:969-976, 1038 |
| 4 | G44 guards see poorly above them | PR #169 (c6775028, f24e1adc), train 16 #178, 4.65.0 | src/ai/perception.ts:147 `pitchFactor` |
| 5 | Hand-swap and strike pops (n4c 1, n4c 9, n4d 1) | PR #207 strike-pops, train 28 #235 | docs/archive/strike-pops/REPORT.md; the wrist step is 27.0 cm (was 31.4), kept by the arc |
| 6 | Partner pose parity (aim side, remote melee -1, baked sections) | train 30 #241 (4f6db420; feature/pose-parity, PR #223 left open: close it) | src/net/netShared.ts:21 `PF.aimLeft`; remoteAvatar.ts:504, 618-626 |
| 7 | Crouch pops 9.6 / 8.3 cm | PR #227 (25cb87e0), 4.77.0 | tests/crouchPops.test.ts; residual: mocap-off holstered running crouch-down wristR 9.47 cm |
| 8 | Traversal: ledge-end hands, climb-up hands, rifle draw | PR #189 (dd421b0a) + PR #207 traverse-fix-2 | src/player/attachGrips.ts:46; tests/climbHands.test.ts; e2e-clip still has no gun-vs-arm check |
| 10 | Host view of a joiner's hostage gait below 60 fps | PR #194 (a583aa81), train 21 #197 | src/net/holdFeed.ts |
| 11 | Keyboard vent: Space then an unseen E hold counts as a kick | PR #141 (b2de9bfc), 4.59.0 | src/player/ventOpen.ts:30 `ventStep` |
| 13 | Test chores: client strike denied, role-swapped co-op pass, streamed KILLED line | PR #175 + 02461a96, df0e2775, 7557d806 | scripts/e2e-coop, e2e-netmove, run-e2e.mjs |
| 16 | Partner rig first seen walking plays a start | PR #190 (4d8623a3), train 21 #197 | src/net/remoteSeed.ts |
