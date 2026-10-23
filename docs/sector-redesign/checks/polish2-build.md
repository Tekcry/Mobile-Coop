# Polish batch 2 build (feature/sector-redesign-polish2, from #226 eb6d63c4)

Sources: `checks/walk-472-check.md` "## Polish", `checks/art-check.md` "## Polish list".

| Item | State | Where |
| --- | --- | --- |
| Walk 1: soffit landing breaks the far-face wall lamp | done | `src/world/lights.ts:447-490` `lampReachProbe` (pure, no allocation): when the hit is through the mount reach only, it gives a probe start 0.05 m back along the round from the landing and its height up to the head's padded underside. Callers ray it against `G.STATIC` with preallocated vectors and refuse on a block: `src/game/stealthSystems.ts:524-533` (`shotRay`, host / solo), `src/net/coopClient.ts:516-519` (`lampRay`, never asks for a refused lamp), `src/net/coopHost.ts:1003-1008` (`onLampShot`, at the exact claimed landing). No wire change, PROTOCOL_VERSION unchanged. |
| Walk 2: near-face landing test | done | `tests/perception.test.ts:402` (near-face wall pack: hit, probe clear of the wall; box entry needs no probe; the S5 soffit case: `lightOnRay` still takes it, the probe runs into the lintel). |
| Walk 3 + 4: lighting notes | done | `docs/systems/lighting.md:61-67` (reach measured at the landing; the probe; the fixture box ignores `yaw`). |
| Art P3: K8 / K9 on skin hulls | done | `src/world/campusArt/keepouts.ts:740-780` `skinReach`, run from `checkDressing` (`:796`) for skins with a listed `overhang`; `tests/campusArtGameplay.test.ts:233-237` in item (6). First run flagged two hull-box false positives, so the check leaves out what the greybox piece already decides: S2 `receptionCounter` (-21.5, -27.1) vs a cam-turnstile ray ending on the counter's own face (the skin 1 cm proud), and S4 `basketRun` (18.0, 4.0, 40.27) vs `las-tray`, which crosses the cage basket's walk surface by design (the rods stand at the basket edges). No placement moved. |
| Art P4: split gaps before the loop | done | `src/world/maps/campusDress.ts:100-102`. |
| Art P7: A99 line | already done | `changes/feature-sector-redesign-art.md:17` (commit 9773c9c1); nothing to add. |
| Art P1, P2, P5, P6 | skipped | as briefed. |

Tests (single files under slot locks): `npx tsc --noEmit` clean; perception + sectorLampSync 44 pass; lights, enemyLightsOut,
campusArtKit, campusDressRules 52 pass; campusArtGameplay 53 pass; campusArtLight, campusArtRender with the above 100 pass.
No e2e run. `src/net` logic changed (client and host lamp checks), so e2e-coop belongs in the train.
