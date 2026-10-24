# rig-pose-fix: plan

Slices from REPORT.md "Ranked fix list". Waves avoid two agents on one file.

| Wave | Slice | Report items | Files (main) | Model |
| --- | --- | --- | --- | --- |
| 1 | S1 player body model (+ S4 wall head) | G1-G5, G11, G12, G14, P12 | new src/player/playerVolumes.ts; src/game/playerTarget.ts, src/net/remotePlayer.ts, src/net/coopHost.ts (followPose / partnerBoxes / wall head), src/net/partnerTarget.ts, src/game/gameState.ts (light sample, HUD exposure), src/player/wallController.ts | Opus |
| 1 | S2 shot origin | G6 | new src/weapons/shotOrigin.ts; src/weapons/playerWeapons.ts (origin + wall-poke) | Opus |
| 1 | S5 body position | G8, G9, P13 | src/ai/body.ts, src/ai/ragdoll.ts, src/game/stealthSystems.ts, src/net/coopClient.ts (client ragdoll placement) | Opus |
| 1 | S6 dog head | G10 | new src/ai/dogHead.ts; src/ai/dogModel.ts, src/ai/enemy.ts (dog head step) | Opus |
| 2 | S3 one guard head | G7, G20 | src/net/enemyPuppet.ts, src/net/coopHost.ts (recordHistory / judge) | Opus |
| 2 | S7 small batch | G15-G18 | src/weapons/playerWeapons.ts (hand-switch timer), src/game/trainingDummy.ts, src/player/playerController.ts + src/anim/motion.ts, src/physics/groups.ts | Opus |
| - | S8 review | G13, G19 | none (note for the orchestrator) | lead |

Per slice: Babylon-free pure module + Vitest (parity against a NullEngine rig where it is fitted), single test files and
tsc on the desktop only. After each wave: one fresh Opus checker for the batch (two on the src/net parts), then the laptop
suites the slices name (e2e-combat, e2e-wall, e2e-netmove, e2e-coop, e2e-stealth, e2e-guard-carry, e2e-ctcourse,
e2e-weapons-carry; e2e-enemies is legacy). One batch PR per train. A wire change bumps nothing here: the train build sets
PROTOCOL_VERSION; tests read the constant.
