# Step 02 - remove sonar

Block A. Deps: none. Bible 6 ("sonar goggles, replaced by thermal and electro"); audit d 1, AUDIT 1i V01.

## Model
Implementer: sonnet. Checker: sonnet (no src/net change; coopHost.ts:128 stays as is until step 04).

## Read
- docs/locomotion/audit/d-vision-weapons-input-net.md lines 6-10.
- src/game/vision.ts (all, 116); tests/vision.test.ts (all); tests/archetypes.test.ts (grep -n sonar).
- src/game/gameState.ts:400-430, 1670-1725, 1850-1862.
- src/ai/archetypes.ts:155-172; src/audio/sfx.ts:200-215; src/audio/gameAudio.ts:60-70; src/game/gameEvents.ts:20-26.
- src/ui/hud/hud.ts:380-390; src/styles.css:945-955; src/input/actions.ts:26-30; src/input/touchControls.ts:30-36.
- src/ui/screens/controlsScreen.ts:25-50; src/ui/screens/loadoutScreen.ts:470-480, 730-740.
- src/progression/suit.ts:35-90, 105-150 (parked); src/player/characterRig.ts:840-850; src/vfx/silhouettes.ts:1-20.
- scripts/e2e-enemies.mjs, scripts/e2e-stealth-ai.mjs (grep -n -i sonar).

## Task
1. vision.ts: `VisionMode = 'off' | 'night'`; delete `sonarPeriod`, `sonarShow`, `sonarRange`, `sonarMax`, `sonarCooldown`,
   `nextPulse`, `sonarT`, `cooldown`, `sincePulse`, `pulses`, `sonarAllowed`, `markAlpha`; `cycle()` toggles off <-> night; `step(dt)`
   returns void (flip only). Keep `VISION.flip` 0.2 s and the flip logic; update the file comment. Step 14 adds thermal / electro.
2. gameState.ts: delete :404-406 (`sonarAllowed`), `sonarMarks` / `sonarRing` (:421-429, :1676-1677), the pulse block in
   `updateVision` (:1686-1695), the marks / ring part of `renderVision` (:1712-1720+), `sonarMul` (:1852-1855); fix the doc comments
   at :1674, :1679, :1698, :1859. Keep night vision (gain, post, lens glow) exactly as is.
3. Keep `Silhouettes` (the LKP ghost uses it); fix comments in silhouettes.ts:11, voxelBody.ts:6, enemy.ts:396, dogModel.ts:24, characterRig.ts:847.
4. archetypes.ts: remove `DifficultyDef.sonar` (:164) and the four `sonar:` values; comment :162 updated. tests/archetypes.test.ts follows.
5. Audio: `sfx.sonar()` (sfx.ts:205-215+) and the `'sonar'` listener (gameAudio.ts:67) deleted; gameEvents.ts: `sonar` event removed,
   `vision.mode` type `'off' | 'night'`.
6. HUD: `setVision(mode)` loses the cooldown argument and the SONAR text (hud.ts:382-385); styles.css:949 rule removed.
7. Text: actions.ts:28 comment, touchControls.ts:33 label 'Night vision', controlsScreen.ts:29 and :47 'night vision' only.
8. Parked suit / HQ: `SuitStats.sonarRange` / `sonarRecharge` (suit.ts:64-66, 75, 84-85), goggles tier descs (:40-42, now 'Night vision'
   for all three tiers), `hqStats.sonarRange` (:136, :146) and loadoutScreen.ts:736 bar removed. KEEP `HqId 'sonar'` and `HQ.sonar`
   (desc 'Retired') for the save shape; step 04's v8 migration drops it.
9. tests/vision.test.ts rewritten: off -> night -> off; flip timing; no sonar export (`expect(Object.keys(VISION)).toEqual(['flip'])`).
10. e2e-enemies / e2e-stealth-ai: remove sonar references (they set `sonarAllowed` or read marks); keep the night vision checks.
11. Docs: docs/systems/ai.md:74-77, :86 (sonar text), gadgets.md:2 status line, graphics-quality.md:154, modes-and-progression.md
    sonar lines deleted; ai.md vision paragraph says "night vision only until step 14 (thermal / electro)".
12. The vision button = night vision only (PLAN). Nothing is sent over the net (vision stays local, D8).

## Checks
- `npm run check`; `npm run e2e:quick`; `node scripts/e2e-enemies.mjs`, `node scripts/e2e-stealth-ai.mjs`, `node scripts/e2e-darkness.mjs`
  (night vision unchanged); `node scripts/e2e-coop.mjs` (PLAN co-op check); `npm run e2e:legacy` report only.
- Grep proof: `git grep -il sonar -- src scripts tests` prints only src/progression/suit.ts (HqId / HQ entry, removed in 04) and
  src/net/coopHost.ts:128 (hq literal). After step 04 it prints nothing.
- `git grep -n "sonarAllowed\|sonarMarks\|sonarRing\|sonarMul" -- src tests scripts` prints nothing.

## Commit
`locomotion 02: remove sonar (pulse, marks, ring, audio, difficulty flag, suit hooks); vision = night only`

## Numbers
- Removed constants (vision.ts:14-19): period 6 s, show 2.5 s, range 30 m, max run 18 s, cooldown 12 s. Kept: flip 0.2 s (:21).
