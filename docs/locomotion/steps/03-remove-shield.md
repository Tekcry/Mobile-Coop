# Step 03 - remove the regenerating shield

Block A. Deps: none. Bible 1.5 health numbers, 6; audit c 2c, AUDIT 1i V04.

## Model
Implementer: sonnet. Checker: opus (touches src/net).

## Read
- docs/locomotion/audit/c-removals.md 2c (lines 50-53).
- src/game/health.ts (all, 54); tests/weapons.test.ts:115-140.
- src/game/playerTarget.ts:30-38; src/net/remotePlayer.ts:24-30, 124-132.
- src/game/takedownController.ts:165-172, 272-280, 350-356.
- src/game/gameState.ts:696-704, 1228-1235, 2330-2345 (`shield: th.shield` at :2339 is the HUD bar; the hostage `localRef.shield` at :1162 STAYS).
- src/ui/hud/hud.ts:10-20, 88-96, 218-232; src/styles.css:1020-1030, 2275-2280.
- src/net/protocol.ts:55-75, 230-240; coopHost.ts:785-795, 828-836, 1080-1090; coopClient.ts:278-286, 470-480.
- scripts/e2e-coop.mjs (grep -n "\.sh\b\|shield\|downed\|revive").

## Task
1. health.ts: `Health(maxHp)` only: fields `hp`, `maxHp`; `damage(amount)` hits hp; `heal(amount)`; `reset()`. Delete `shield`,
   `maxShield`, `regenDelay`, `regenRate`, `sinceHit`, `update(dt)`. Comment: "Health, no regeneration (bible 6); medkits in step 15".
2. playerTarget.ts:34 and remotePlayer.ts:27 -> `new Health(100)`. Enemies (enemy.ts:271) and trainingDummy.ts:15 already use one arg.
3. Delete every `health.update(dt)` call (gameState.ts:~1232, remotePlayer.ts:~128).
4. takedownController.ts:170, :277, :353: `hp + shield` -> `hp`.
5. Health pickup (gameState.ts:702 `heal(50)`, coopHost.ts:1087) stays as is; step 15 turns it into the medkit.
6. HUD: `HudFrame.shield` / `maxShield` (hud.ts:16-17), `shFill` (:93), the shield bar update (:223-231) and its DOM removed;
   CSS `.bar-fill.sh` and `.hud.no-hbar .bar.shield` removed. gameState.ts:2339-2340 frame fields removed.
7. Net: `PlayerState.sh` (protocol.ts:65) and its sanitize (:237) removed; coopHost.ts:793 and :833 stop sending `sh`;
   coopClient.ts:283 (`h.shield = p.sh`) and :478 removed. Health stays host-authoritative (D8). No PROTOCOL_VERSION bump here (step 06).
8. Keep: enemy riot shields (enemy.ts `shield` mesh, `shieldBlocks`), the human-shield hostage (`localRef.shield`, coopHost.ts:933, :950).
9. Downed / revive unchanged: 0 hp downs the player in co-op exactly as before.
10. tests/weapons.test.ts:122-135: replace 'shield absorbs first and regenerates' with 'health has no regeneration: 10 s of update-free
    time after damage leaves hp unchanged' and 'damage clamps at 0, heal clamps at maxHp'. tests/net.test.ts / pvp.test.ts: drop `sh` literals.
11. Docs: docs/systems/combat.md and ui.md shield text deleted; coop.md snapshot field list loses `sh`; saves.md untouched (no save change).
12. Difficulty: Rookie damage 0.6 x (archetypes.ts:168) now hits hp directly; no rebalance here (step 15 adds medkits, step 19 sliders).
    Record in the step report: guard damage per hit at Normal, and hits to down (100 hp) for the pistol guard (grep weapons.json damage).

## Checks
- `npm run check`; `npm run e2e:quick`; `node scripts/e2e-coop.mjs` (downed / revive), `node scripts/e2e-netmove.mjs`,
  `node scripts/e2e-combat.mjs`; `npm run e2e:legacy` report only.
- Co-op check (PLAN): e2e-coop downed / revive passes.
- Grep proofs (print nothing): `git grep -n "maxShield\|regenDelay\|regenRate\|\.sh\b\|[ {,]sh: " -- src/game src/net src/ui`;
  `git grep -n "health.shield\|health.update" -- src`.

## Commit
`locomotion 03: remove the regenerating shield (Health(100), no regen, sh off the wire, HUD bar gone)`

## Numbers
- Old player health: `Health(100, 50, 4, 30)` = 100 hp + 50 shield, regen after 4 s at 30 / s (playerTarget.ts:34, remotePlayer.ts:27).
  New: 100 hp, no regen. Effective toughness drops from 150 to 100 (-33%): note it in CHANGELOG.
- `sh` sanitize range was 0..50 (protocol.ts:237).
