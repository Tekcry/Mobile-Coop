# Kestrel - engine facts
Status: APPROVED (Michael, 2026-10-10)

Read from the code on 2026-10-10 at commit e60c835. Only these numbers may be used by later stages.

## 1. Facts
All lengths in metres, speeds in m/s, times in seconds. `\|` in a quote stands for the pipe character.

| Id | Item | Value | Source (file:line) | Quoted line |
| --- | --- | --- | --- | --- |
| F01 | Player capsule: standing height, crouched height, radius | 1.75 stand, 1.15 crouch, 0.3 radius | src/config/movement.ts:70-72 (`MOVEMENT`) | `standHeight: 1.75, crouchHeight: 1.15, radius: 0.3,` (three lines) |
| F02 | Eye height standing, crouched | 1.6 stand, 1.05 crouch | src/player/playerController.ts:217 | `return this.crouched ? 1.05 : 1.6;` |
| F03 | Controller max step | 0.42 | src/config/movement.ts:73 (`MOVEMENT.maxStep`) | `maxStep: 0.42,` |
| F04 | Traversal limits by obstacle height (from the feet) | step up to 0.65 (top clear); vault up to 1.25 and depth up to 1.0 (landing clear); mantle up to 1.8 (top clear); under 0.2 nothing | src/player/movement.ts:183-186 (`pickTraversal`) | `if (p.height <= 1.25 && p.depth <= 1.0 && p.landingClear) return 'vault';` |
| F05 | Highest hand grab from the floor | grabMin 1.6, grabMax 2.7 | src/world/anchors.ts:214-215 (`REACH`) | `grabMax: 2.7,` |
| F06 | Jump: LEAP values; highest lip a jump grabs | vy 5.6, carry 1.0, maxSpeed 5.0, doubleTap 0.4, splitWait 0.22, cooldown 0.3, climbReach 0.75; the jump grabs lips up to about 3.1 m (doc) | src/config/movement.ts:370-381 (`LEAP`); docs/ct-movement-progress.md:219 | `vy: 5.6,` ; doc: `Jump height ~0.8 m: grabs lips up to ~3.1 m.` |
| F07 | Wall jump lip window | minUp 2.7, maxUp 3.8 (lip height over the feet); wallReach 1.0; cornerReach 1.4; time 0.6 | src/config/movement.ts:285-297 (`WALL_JUMP`) | `minUp: 2.7,` and `maxUp: 3.8,` |
| F08 | Split jump | width 1.2 to 1.95; both walls at least 3.6 tall; feet height 2.5; minLen 0.8; opposed faces dot -0.95; floorTol 0.3 | src/config/movement.ts:255-271 (`SPLIT`) | `minWidth: 1.2,` ; `maxWidth: 1.95,` ; `minHeight: 3.6,` ; `feetHeight: 2.5,` |
| F09 | Box top height that becomes a hangable lip automatically | box top at 1.9 or higher (`LEDGE.minDrop`); lip at least 0.6 long (`minLen`); 0.38 deep to climb up (`climbDepth`). No `1.9` literal in levelBuilder.ts (grep empty); the rule is in anchors.ts, called at levelBuilder.ts:528 | src/world/anchors.ts:190, 321 | `if (top < LEDGE.minDrop \|\| (h < LEDGE.minDrop && bottom < 0.05)) continue;` |
| F10 | Ledge hang drop | feet 1.9 below the lip; body centre 0.22 out from the face | src/world/anchors.ts:206-208 (`HANG`) | `drop: 1.9,` |
| F11 | Ladder width and standoff | builder width 0.5 (default), rung spacing 0.3, rails 0.06 off the wall; top point 0.45 out from the wall; ladder top entry reach 0.9. Nav standoff NOT FOUND (section 4) | src/world/levelBuilder.ts:226, 233, 236; src/world/anchors.ts:221 (`REACH.ladderTop`) | `ladder(x: number, z: number, y0: number, y1: number, facing: number, color = '#5b5f63', width = 0.5, rung = 0.3): Ladder {` |
| F12 | Drainpipe and horizontal pipe | builder: `pipeV(x, z, y0, y1, side, color, radius = 0.06)`, `pipeH(ax, az, bx, bz, y, color, radius = 0.06)`; `PIPE`: legs-up shimmy 0.5 m/s, toLegsUp 0.5 s, toInverted 0.55 s, toHands 0.45 s, legsUpLift 0.6 | src/world/levelBuilder.ts:240, 246; src/config/movement.ts:300-314 | `legsUpSpeed: 0.5,` |
| F13 | Rappel speeds and builder parameters | ascend 1.0, descend 1.6, descendSprint 3.0; swingOut 1.2; unhookHeight 2.0 (feet height); standoff 0.5; minOut 1.0; hookTime 0.8; reach 0.9; builder `rappel(x, y, z, yaw, length, color)` | src/config/movement.ts:318-343 (`RAPPEL`); src/world/levelBuilder.ts:277 | `descend: 1.6,` ; `rappel(x: number, y: number, z: number, yaw: number, length: number, color = '#3a3d40'): RappelPoint {` |
| F14 | Fence: climb speed, rattle noise | climb 0.9, shimmy 0.6, flipTime 0.9, rattle noise radius 4 (quiet at gears 1-3), reach 0.85, standoff 0.3, handReach 1.85; builder `fence(ax, az, bx, bz, height, y = 0, color)` | src/config/movement.ts:345-359 (`FENCE`); src/world/levelBuilder.ts:290 | `rattle: 4,` |
| F15 | Team moves | boostMax 4.5; boost lip window 3.75-4.5 (doc: lower lips are a wall jump alone); human ladder feet 1.45, grab 4.1, climb 0.8 s; partnerReach 1.2; brace needs a mate within 3 and a wall within 1.0 behind | src/config/movement.ts:384-403 (`TEAM`); docs/ct-movement-progress.md:167 | `boostMax: 4.5,` ; doc: `Boost targets are lips 3.75-4.5 m up` |
| F16 | Revive distance and height rule | the revive item's reach is 1.6; any interactable needs the feet within 1.5 m of height; hold time 2.5 s | src/net/coopHost.ts:332, 41; src/game/interactables.ts:128 | `it.reach = 1.6;` ; `Math.abs(it.pos.y - feet.y) < 1.5` |
| F17 | Takedown drop window and states | ground reach 1.8, dy 0.45; from above: victim 1.1 to 4.6 below, reach 2.2; anchor drop attack: 1.2 to 5 below, reach 1.0; below reach 1.4; window reach 1.7; attacker states: ground, lowCover, highCover, hang, climb, zipline, duct, window, split, pipe, inverted, rappel | src/game/takedown.ts:13, 17-44 (`TAKEDOWN`) | `aboveMin: 1.1,` ; `aboveMax: 4.6,` ; `dropMin: 1.2,` ; `dropMax: 5,` |
| F18 | Speed gears | standing 0.8, 1.3, 2.0, 2.8, 3.8, 5.0; crouched 0.5, 0.9, 1.3, 1.8, 2.3, 2.8; spawn gear 3 | src/config/movement.ts:155-160 (`GEARS`) | `stand: [0.8, 1.3, 2.0, 2.8, 3.8, 5.0],` |
| F19 | Noise | silent up to crouch 1.9 m/s and stand 1.45 m/s; sprint 9 m radius; roll noise 2; landing soft 1.2, roll 5, heavy 11; hold noise 4, pulse every 0.5 s; manhole lift 10; wall muffle share 0.45 | src/config/movement.ts:215-216, 186; src/player/movement.ts:215 (`noiseRadius`); src/config/noise.ts:7, 10, 16, 19, 22 | `export const HOLD_NOISE_RADIUS = 4;` ; `export const MANHOLE_LIFT_NOISE_RADIUS = 10;` |
| F20 | Guard kinds and walk speeds (run speeds in brackets) | grunt 0.9 (3.2), runner 1.3 (4.2), heavy 0.75 (2), sniper 0.85 (3.4), enforcer 0.8 (2.2), dog 1.1 (6), droneOp 0.85 (3), officer 0.85 (3.1) | src/config/enemies.json:7, 53, 94, 142, 189, 236, 278, 324 | `"walkSpeed": 0.9,` (grunt) |
| F21 | Squad cap and max alive | SQUAD_CAP 9 (src/game/modes/clearMode.ts:12 and infiltrationMode.ts:14); MAX_ALIVE 12 | src/ai/enemyManager.ts:25; src/game/modes/infiltrationMode.ts:14 | `export const MAX_ALIVE = 12;` ; `const SQUAD_CAP = 9;` |
| F22 | Nav grid | cell 0.5; agent radius 0.32; step height 0.45; headroom 1.7; default layers 3; `MapDef.navLayers` field (optional, default 3); sampler lowest depth: it samples surfaces down to a ray end of y = -2 and loops while y > -1.5, so no floor below y -2 is walkable for guards | src/ai/navBuild.ts:9, 14, 72-74, 84, 86; src/world/mapDef.ts:78 | `for (let k = 0; k < 8 && y > -1.5; k++) {` ; `to.set(x, -2, z);` ; `navLayers?: number;` |
| F23 | Camera | boom hip 2.2, ADS 1.5; shoulder hip 0.62, ADS 0.58; pivot stand 1.62, crouch 1.18; wall padding 0.16; minBoom 0.28; FOV 75 | src/config/camera.ts:9-13, 15-16, 26-27, 32 | `boomHip: 2.2,` ; `padding: 0.16,` ; `fov: 75,` |
| F24 | Light levels: shadow and lit | below 0.28 is shadow (meter dark, perception much slower); above 0.6 is lit; guards switch a torch on below 0.35 and keep it to 0.45. docs/systems/lighting.md names the constants but gives no numbers; the numbers are in the code | src/world/lights.ts:62-69 (`LIGHT`); src/ai/enemy.ts:42-43; docs/systems/lighting.md:25 | `shadow: 0.28,` ; `lit: 0.6,` ; `export const TORCH_DARK = 0.35;` |
| F25 | What a lamp needs (`LightInit`) | required `x`, `y`, `z`; all other `LightDef` fields optional: kind, radius, intensity, color (linear RGB 0-1), cone (cosOuter, cosInner, direction), on, destructible, electric, group, fixture (sx, sy, sz, oy), reach | src/world/lights.ts:21-59; src/world/levelBuilder.ts:383 (`light(init: LightInit)`) | `export type LightInit = Partial<Omit<LightDef, 'id' \| 'x' \| 'y' \| 'z'>> & { x: number; y: number; z: number };` |
| F26 | Door and window builder parameters | `door(hx, hy, hz, width, yaw, opts: height default 2.1, swing 1 or -1, locked default false, breachable default true)`; `windowAt(cx, cy, cz, w, h, yaw, opts: sill default cy - h/2, breakable default true, open default false)` | src/world/levelBuilder.ts:265, 269 | `door(hx: number, hy: number, hz: number, width: number, yaw: number, opts: { height?: number; swing?: 1 \| -1;` (cut at 120) |
| F27 | Interactable kinds | terminal, cache, extract, switch, alarm, hide, body, door, vip, intel, charge, revive; default reach 1.8 | src/game/interactables.ts:7, 121 | `export type InteractKind = 'terminal' \| 'cache' \| 'extract' \| 'switch' \| 'alarm' \| 'hide' \| 'body' \| 'door' \|` (cut at 120) |
| F28 | Objective kinds in missions | The JSON key is `"type"`, not `"kind"` (grep for `"kind"` is empty). Counts: extract 14, plant 8, download 5, intel 5, sabotage 3, rescue 2. Type: `ObjectiveType` | src/config/missions.json (grep count); src/game/missions.ts:10 | `export type ObjectiveType = 'download' \| 'plant' \| 'rescue' \| 'sabotage' \| 'intel' \| 'extract';` |
| F29 | Draw budgets | Desktop: at most 600 draw calls and 8 M triangles per frame over every pass; regression check at 520 draws and 1.7 M triangles (`perf.mjs --desktop`). Phone (iPhone 17 Pro Max target): draws Low 120, Medium 170, High 230, Ultra 250; main thread at most 4 ms of 8.33; at most 2 M triangles. Test path: at most 55 draws | docs/systems/performance.md:13, 19, 26-27, 57 (section "Performance budget") | `Medium 170 / High 230 / Ultra 250 (the iPhone 17 Pro Max target: main thread <= 4 ms of 8.33, <= 2 M triangles);` |
| F30 | Patrol cycle, stop and gap guidance | cycles 25-45 s; stops 3-6 s; gaps in coverage 3-8 s | docs/level-design.md:56 (section 4 item 3) | `3. **Clockwork.** Patrol cycles 25-45 s; stops 3-6 s; gaps in coverage 3-8 s. No randomness that defeats planning.` |
| F31 | Door, corridor, room, stair, ceiling and cover sizes | read docs/design/scale-sheet.md section 3 "Sizes this map uses" (lines 29-49); nav limits for doors and stairs in its section 4 | docs/design/scale-sheet.md section 3 | not copied (cite the section) |
| F32 | Crouch duct size and low-ceiling camera limits | crouch duct 1.5 high x 1.2 wide; 1.5 m ceiling works, 1.4 usable, 1.3 and 1.2 fail; walk-in tunnel 2.4 high x 2.6 wide with a 1.8 m walkway | docs/design/dead-line-v2-engine-check.md sections 1 and 5 | `Set crouch ducts to **1.5 m clear, 1.2 m wide**.` |
| F33 | Co-op lip height rule | a co-op lip is at least 0.5 m above the highest solo reach (`WALL_JUMP.maxUp` 3.8) and within `TEAM.boostMax` 4.5: build at 4.3-4.5 m | docs/level-design.md section 11 item 3 (line 117) | `build at 4.3-4.5 m.` |

## 2. Coordinates
North = +Z, East = +X, Up = +Y.
Evidence:
- scripts/g1v2-plan.mjs:3: `The plan is 1 m = 10 px with x 0..206 east and z 56..0 north up`. Line 54 parks a camera looking straight down (`cam.rotation.set(Math.PI / 2, 0, 0)`) over the map with x as the width and z as the height of the plan.
- src/world/maps/trunkAnnex.ts:11, 21: `levels (Ground 0, Upper 3.3, Roof 6.6)` and `TRUNK_Y = { ground: 0, upper: 3.3, roof: 6.6 }`: height is Y. The header says only that Cooper's Lane is "south of the yard"; it names no axis.
- src/world/levelBuilder.ts:227-228 (`ladder`): `const fx = Math.sin(facing); const fz = Math.cos(facing);`, so yaw 0 faces +Z (north) and yaw 90 degrees faces +X (east). Consistent with the plan comment.
- RULES section 6 sets the origin at the south-west corner, so X and Z are both 0 or more inside the site.

## 3. Quarantine scan
Output of `ls docs/design docs/prompts docs/archive/maps src/world/maps scripts | grep -i -E "exchange|dead|trunk|annex|fp-|g1"`:

```
dead-line-v2-area1.svg
dead-line-v2-engine-check.md
map-dead-line-core.mjs
map-dead-line-engine.mjs
map-dead-line-sim.mjs
map-dead-line-v2.json
map-dead-line.json
map-dead-line.png
map-trunk-annex.json
e2e-dead-line-menu.mjs
e2e-dead-line-v2-menu.mjs
e2e-dead-line-v2.mjs
e2e-dead-line.mjs
e2e-fp-map.mjs
e2e-fp-trunk.mjs
g1-floors.mjs
g1-perf.mjs
g1v2-perf.mjs
g1v2-plan.mjs
gen-dead-line-v2.mjs
gen-dead-line.mjs
deadLine.geo.json
deadLine.ts
deadLineV2.geo.json
deadLineV2.ts
exchange.ts
trunkAnnex.data.json
trunkAnnex.ts
```

Coverage by RULES section 4: the docs/design files (except dead-line-v2-engine-check.md) are covered; e2e-fp-*.mjs, g1*.mjs and gen-dead-line*.mjs are covered; the six src/world/maps files named there are covered; trunkAnnex.ts and e2e-dead-line-v2.mjs are the build-step exceptions; g1v2-plan.mjs is the P03 exception. `docs/gates/` and `docs/prompts/exchange-*` do not exist now (D0 moved them to docs/archive/).

Not in RULES section 4: none. Michael approved adding scripts/e2e-dead-line.mjs, scripts/e2e-dead-line-menu.mjs and scripts/e2e-dead-line-v2-menu.mjs to section 4 on 2026-10-10 (done).

(`scripts/e2e-dead-line-v2.mjs` is allowed only as a build-step exception, so it too is open to B1-B7 only.) RULES.md was not edited.

## 4. NOT FOUND
- F11 nav ladder standoff: three greps (`ladder`, `standoff\|offset`, `0.5` in src/ai/navBuild.ts) show the ladder link at navBuild.ts:106-112 with no standoff number. The ladder's own numbers are in F11.
- F12 drainpipe climb speed: `PIPE` holds only the legs-up shimmy speed (0.5). No separate vertical drainpipe climb speed was found in src/config/movement.ts.
- F24 meter thresholds in docs/systems/lighting.md: the doc names `TORCH_DARK` and `TORCH_KEEP` but not the `LIGHT.shadow` and `LIGHT.lit` numbers; those were read from the code (src/world/lights.ts).
- F28 grep as written (`"kind"`) found nothing; the objective key is `"type"` (counts in F28).

## 5. Security facts
Added by S1 Part A (cameras). Values are the constants in `src/config/security.ts`; the SN ids are in `S0-security-spec.md` section 5. Desk rows (SN19-SN28) join in Part B.

| Id | Item | Value | Source (file:line) | Quoted line |
| --- | --- | --- | --- | --- |
| F40 | Camera horizontal field (SN01) | 70 deg | src/config/security.ts:11 (`CAMERA.hFov`) | `hFov: 70 * DEG,` |
| F41 | Camera vertical field (SN02); the camera looks level, so a head under the mount is out of frame | 45 deg | src/config/security.ts:13 (`CAMERA.vFov`) | `vFov: 45 * DEG,` |
| F42 | Camera range (SN03) | 18 m | src/config/security.ts:15 (`CAMERA.range`) | `range: 18,` |
| F43 | Camera mount height, lowest and highest (SN04) | 2.4 to 3.5 m | src/config/security.ts:17-18 (`CAMERA.mountMin`, `mountMax`) | `mountMin: 2.4,` ; `mountMax: 3.5,` |
| F44 | Camera housing, the shot target box (SN05) | 0.35 long x 0.15 wide x 0.15 high | src/config/security.ts:20 (`CAMERA.housing`) | `housing: { len: 0.35, w: 0.15, h: 0.15 },` |
| F45 | Status LED size (SN06) | 0.04 m | src/config/security.ts:22 (`CAMERA.ledSize`) | `ledSize: 0.04,` |
| F46 | Camera think rate (SN07) | 4 Hz | src/config/security.ts:24 (`CAMERA.thinkHz`) | `thinkHz: 4,` |
| F47 | Frame time after meter 1 before the operator gets `alert()` (SN11; used by the desk, Part B) | 2.0 s | src/config/security.ts:26 (`CAMERA.fullFrameTime`) | `fullFrameTime: 2.0,` |
| F48 | Body seen on a feed (SN12; used by the desk, Part B) | 2.0 s | src/config/security.ts:28 (`CAMERA.bodySeenTime`) | `bodySeenTime: 2.0,` |
| F49 | Widest sweep (SN13) | 120 deg | src/config/security.ts:30 (`CAMERA.sweepMaxDeg`) | `sweepMaxDeg: 120,` |
| F50 | Sweep speed (SN14) | 15 deg/s | src/config/security.ts:32 (`CAMERA.sweepSpeed`) | `sweepSpeed: 15 * DEG,` |
| F51 | Pause at each end of a sweep (SN15); a 90 deg sweep cycle is 16 s | 2.0 s | src/config/security.ts:34 (`CAMERA.sweepPause`) | `sweepPause: 2.0,` |
| F52 | Cameras per map (SN60) | 12 | src/config/security.ts:39 (`SECURITY_LIMITS.cameras`) | `cameras: 12,` |

Notes (S1 Part A):
- SN08 and SN10 hold only at the standing gear 2 speed, 1.3 m/s (F18): lit walking at 10 m fills in 1.30 s, shadow (light 0.28) at 4 m in 12.7 s, from `sightRate` and `stepMeter`. At 1.5 m/s or more the shadow time is 10.8 s (17 % under SN10). `tests/securityCamera.test.ts` uses 1.3 m/s.
- SN09 (crouched still lit at 10 m, about 9 s) matches the code (9.15 s).
- Camera vertical aim: S0 gives no tilt number, so the camera looks level (pitch 0). A head under the mount is out of frame closer than 3.4 m for a 3 m mount.
- Sight uses one ray from the lens to the head (S1 prompt step 4), full exposure; S0 section 2.1 names three rays (chest, head, hips). The derived times above assume full exposure.
