# Spare jobs (orchestrator triage, 2026-10-23 ~01:25; audited against master 6b44efb8 on 2026-10-24 by Marlow Build; shipped rows moved to Done 2026-10-25)

Ranked list for idle agent slots. Each job is its own branch from master and one PR (trains). Protocol: tests read
`PROTOCOL_VERSION`; the train bumps it once for any wire change. Before a co-op job check the open PRs touching
`src/net/coopHost.ts` / `teamController.ts`. Docs first (G346): no spare game job starts until Michael signs off the
folded plan (ROADMAP Now row 6).

## Open
| # | Job | Why | Files / area | Tests | Size | Session |
|---|---|---|---|---|---|---|
| 15 | Optic cable, the rest: PR #239 built doors (local view); PR #314 (4.95.0) added the partner pose and cable on the wire, gaps other than doors (hatches, panels, grilles, shaft tops) and the action menu at gaps. Left: no map places an optic gap yet (map leads); polish (camera ease, `releaseAll` on exit, gap sphere cast, `Door.seal` from map data; docs/archive/optic-cable/CHECK.md once #407 lands); the pad R3 Zoom / ping shared button (Michael's call, #314 M2) | CT tool | src/player/opticCable.ts, src/game/opticSystem.ts, src/game/doorMenu.ts, `LevelBuilder.opticGap` | slice | S-M | unowned |

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
| 9 | Joint interrogation (G148): two players question one captive (BLUFF + INTERROGATE in co-op) | PR #310 (911af6a5), train 52, 4.90.0 | src/net/coopHost.ts; src/game/intel.ts |
| 10 | Host view of a joiner's hostage gait below 60 fps | PR #194 (a583aa81), train 21 #197 | src/net/holdFeed.ts |
| 11 | Keyboard vent: Space then an unseen E hold counts as a kick | PR #141 (b2de9bfc), 4.59.0 | src/player/ventOpen.ts:30 `ventStep` |
| 12 | Gameplay reads the rig pose (backlog 28): report and fix slices (hit volumes, shot origin, guard / dog heads and bodies from game state) | PR #308 (ec59aaa8), train 55, 4.92.0 | gameplay reads game state, not the animated body |
| 13 | Test chores: client strike denied, role-swapped co-op pass, streamed KILLED line | PR #175 + 02461a96, df0e2775, 7557d806 | scripts/e2e-coop, e2e-netmove, run-e2e.mjs |
| 14 | Co-op body carry on the client (pick up, carry, put down, hide; host-authoritative) | PR #313 (4086e8ae), train 59, 4.95.0 | src/net/clientCarry.ts |
| 15a | Optic cable: co-op pose and cable, gaps other than doors, action menu at gaps, ping on middle mouse / R3 | PR #314 (fe498449), train 59, 4.95.0 | docs/optic-coop/ (docs/archive/optic-coop/ once #407 lands) |
| 16 | Partner rig first seen walking plays a start | PR #190 (4d8623a3), train 21 #197 | src/net/remoteSeed.ts |
