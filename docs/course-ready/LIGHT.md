# course-ready S2 - Marlow Yard light survey and lamp plan

Read-only survey (2026-10-19) for Michael's ask: "prototype/light visual pass over it to ensure theres sufficient lighting
where required." Map `src/world/maps/ctcourse.ts`, spec `docs/ct-prototype/CTCOURSE-SPEC.md`. Rules used: light parity
(bible 5.1), gameplay reads only the light field, CT pools of sodium light with dark between, registry + baked lamps only.

## 0. Method and assumptions
- Formula (`world/lampMath.ts`, `world/lightField.ts`): level = ambient grid + moon x moon visibility + sum of lamps
  `LAMP_LEVEL_GAIN` 1.2 x intensity x (1 - d / radius) x cos(angle from straight down) x baked visibility, clamped 0..1.
  A lamp without a cone lights only the hemisphere below it (cut at 87 deg; `lampBox` stops a cell above the bulb), so
  **nothing above a lamp's height gets any of its light**.
- Theme: `lightLevel` 0.3, `ambient` 0.25, `sunIntensity` 0.05 -> `moonLight` = 0.3 x 0.05 / 0.30 = **0.05**; the
  ambient grid (no `ambientZone` in this map) is 0.3 - 0.05 = **0.25 everywhere**, indoors too. So with no lamp a point
  reads 0.30 under open sky and 0.25 in the moon's shadow (moon from +x +z, 70 deg up: a 6 m fence shades about 1 m of
  floor on its -x / -z side; roofs, airlocks with their 6 m walls are partly shaded).
- Body level = `bodyLevel`: the brighter of chest (feet + 1.02) and head (feet + 1.6) for a 1.7 m body.
- Visibility: estimated with a box ray test over the map's blockout (walls grown by the bake's half cell, 0.1 m),
  doors open (gaps clear) unless stated. Expect +-0.05 against the real bake near walls (trilinear 0.2 m cells,
  conservative occupancy). Numbers came from a throwaway node model of the map boxes and the same formula.
- Bands (`LIGHT`, bible L6): dark < 0.28, mid 0.28-0.6, lit >= 0.6.
- Screen (`darkCurve.ts`, `DARK_DESKTOP` centre 0.37, steep 12): rendered light = curve(s) x 1.33. It is a cliff around
  0.33-0.40:

  | summed level s | 0.25 | 0.30 | 0.33 | 0.36 | 0.40 | 0.45 | 0.50 | 0.60 | 0.80 |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | rendered | 0.10 | 0.16 | 0.24 | 0.40 | 0.64 | 0.87 | 1.01 | 1.24 | 1.65 |

  So **"readable" on screen means s >= ~0.40**; s 0.30 (the open sky level) renders near black although the meter calls
  it mid (0.30 > 0.28). That gap is the existing calibration, not changed here (see parity risks).
- Text: every panel, switch and station instruction is read from the HUD (interactable label, radio line, course
  marker), not from the panel surface. Light is needed to find things and line up moves, not to read text.

## 1. How the level is lit now
Lights (19, all `kind: 'lamp'`, no cone, destructible, group -1; plus the 8 world flashlight slots, off and not baked):

| Lamp | Position (x, y, z) | Radius | Intensity | Lights |
| --- | --- | --- | --- | --- |
| Bay lamp A x 8 | (22 i + 4, 5, 7) | 13 | 0.9 | each bay's west half (blocked by the obstacle wall for points behind it) |
| Bay lamp B x 8 | (22 i + 12.5, 5, 7) | 13 | 0.9 | each bay's east half; at station 5 it sits 0.6 m over the annex roof and lights nothing below it |
| S3 lamp | (50, 3.0, 7) | 7 | 0.9 | the camera approach and pocket |
| S5 front room | (99, 3.4, 7) | 8 | 0.9 | annex front room (under the 4.0 roof) |
| S5 back room | (102.2, 3.4, 7) | 8 | 0.9 | back room centre only |

Predicted levels, current -> after the plan in section 3 (bay origin x0 = 22 (n - 1); body = standing player at that
spot; surf = a point on the surface).

| Place | Point | Now | Plan | Screen now |
| --- | --- | --- | --- | --- |
| Every bay, route centre line z 7, x0+0.6 .. x0+15.4 | body | 0.64-1.00 lit (x0+8.4 behind the 4.4 m walls of S2 / S7: 0.64) | same; x0+0.6 and x0+15.4 rise to 0.91-0.96 | bright |
| Every bay, yard corners (x0+0.6 / 8.3 / 15.4, z 0.6 / 13.4) | body | 0.41-0.63 mid | unchanged (S5 back room corners excepted) | readable, dimmer than the pools |
| Panel sw-pN (x0+3.5, 1.4, 13.6), all 8 | surf | 0.47-0.50 mid | same (S5 0.49) | readable |
| Panel reader (x0+3.5, z 12.8) | body | 0.56-0.62 mid / lit | same | readable |
| Panel floor square (x0+3.5, z 12) | surf | 0.65-0.71 lit | same | bright |
| **Airlock A1-A7 centre (x0+19, z 7)** | body | **0.30 mid** | 0.64 lit | **near black** -> bright |
| **Airlock green pad (x0+19, z 7)** | surf | **0.30** | 0.53 mid | **near black** -> readable |
| **Airlock corner (x0+16.6, z 4.6)** | body | **0.30** | 0.44 mid | **near black** -> readable |
| Airlock far door (x0+21.6) | body | 0.64 open far door / ~0.30 shut | 0.82 open / ~0.45 shut | -> readable |
| S2 near square (x0+7.4) / bolt far side (31.9, 1.2, 7) | body / surf | 0.78 / 0.88 lit | same | bright |
| S2 wall top (31, 4.4, 7) | body | 0.30 (above both lamps) | same (not changed, polish list) | near black |
| S3 approach x0+5 / pocket (52, z 7) | body | 1.00 / 1.00 lit | same | bright |
| S4 throw square (73.4) / landing (77.2) | body | 1.00 / 1.00 | same | bright |
| S4 release switch (78, 1.3, 13.6) / its reader (78, z 12.8) | surf / body | 0.47 / 0.56 mid | same | readable |
| S5 front room centre (99, z 7) | body | 1.00 | same | bright |
| S5 front room NW corner (97.8, z 13.4) | body | 0.30 | same (stays the annex's dark corner) | near black |
| S5 back room centre (102.3, z 7) | body | 1.00 | 0.56 mid | readable |
| **S5 hack panel (102.4, 1.4, 0.45)** | surf | **0.30** (back lamp 6.6 m away: 0.04) | 0.65 lit | **near black** -> bright |
| **S5 hanging partner's head (102.4, 2.3, 1.3)** | surf | **0.30** | 0.67 lit | **near black** -> bright |
| S5 floor under the panel (102.4, z 0.8) | body | 0.32 | 0.72 lit | -> bright |
| **S5 medkit (103, 1.2, 13.5) / its user (103, z 12.8)** | surf / body | **0.30 / 0.34** | 0.65 / 0.79 lit | **near black** -> bright |
| **S5 roof plate A / B body (99, 4.4, 3.6 / 10.4)** | body | **0.30** (chest above every lamp) | 0.62 lit | **near black** -> bright |
| S5 roof plate surface (99, 4.7, 3.6) | surf | 0.36 (grazing) | 0.74 lit | dim -> bright |
| **S5 hatch holder square body (102.4, 4.4, 2.3)** | body | **0.30** | 0.51 mid | **near black** -> readable |
| S5 hatch frame surface (102.4, 4.7, 1.8) | surf | 0.33 | 0.55 mid | dark -> readable |
| S5 roof front lip, after the relay (97.5, 4.4, 7) | body | 0.30 | 0.71 lit | -> bright |
| S6 scanner A face (115, 1.4, 0.3) / user (z 1.0) | surf / body | 0.51 / 0.62 | same | readable |
| S6 scanner B face (115, 1.4, 13.7) / user (z 13.0) | surf / body | 0.46 / 0.57 | same | readable |
| **S7 rope holder on the strip (141, 4.4, 7)** | body | **0.30** | 0.94 lit | **near black** -> bright |
| S7 strip surface (141, 4.7, 7) | surf | 0.41 (grazing) | 0.85 lit | -> bright |
| S7 climber mid-rope (140.2, 2.5, 7) | surf | 0.59 | same | bright |
| S7 return stair steps top / mid / low / foot (z 1) | body | 0.36 / 0.45 / 0.53 / 0.56 | same | dim top step, rest readable |
| S7 wall foot, far side (142, z 7) | body | 0.89 | same | bright |
| S8 exit zone centre / corners (169.4, 3.1) (165.6, 10.9) | body | 1.00 / 0.60 / 0.73 lit | same | bright |
| S8 medkit user (156, z 12.8) / doorway (163) | body | 0.55 / 1.00 | same | readable / bright |

## 2. Where light is short, and where dark must stay
Short (must-see, now near black on screen):
1. **All 7 airlocks** (0.30): the station 1 panel sends both players to "the green pad at the end", which is the A1
   floor square; every regroup happens there. The bay lamps sit behind 6 m walls and lintels; only a sliver of floor at
   an open door sees them.
2. **Station 5 roof** (bodies 0.30): plates A / B, the hatch holder square and the relay lip are all above the bay
   lamps (y 5); the bay's lamp B floats 0.6 m over the roof and lights only grazing surface.
3. **Station 5 back room south end** (0.30): the hack panel, the hanging partner and the floor under the hatch; the
   back lamp at z 7 is 6.6 m away. **Station 5 medkit** (0.30-0.34) at the back room's north wall.
4. **Station 7 wall top** (0.30): the rope holder stands above both bay lamps.
Fine now: every bay's route, panels, squares, the S2 bolt, the S3 drill, the S4 laser and release, the S6 scanners,
the S7 climb and far side, the S8 exit zone (already the brightest spot, as the brief wants).

Dark that must stay (CT pools with dark between):
- No guards exist here, so no hiding spot is required by a drill. The dark the course has: the yard corners and fence
  lines (0.41-0.49, the gaps between pools), the annex front room's corners (0.30), the station 2 wall top (0.30). The
  plan changes none of them except the station 5 back room (lit for the hack). A unit test pins the corners.
- Station 3 camera (`security/securitySystem.ts`): the rate is `sightRate` x `lightFactor(bodyLevel)`;
  `visibilityFromLight` saturates at `LIGHT.lit` 0.6, and the whole S3 bay already reads 0.87-1.0 at body height, so
  the camera sees the unjammed walk at full rate today. The blind spot (`S3_POCKET`, `ctDevices.ts` pass-zone loop) is
  pure geometry: feet inside the box, the camera's level 45 deg vertical field from 2.4 m leaves a head within ~1.9 m of
  the lens out of frame. Neither depends on darkness. The plan adds no lamp within 9 m of the S3 bay; the A2 / A3 lamps
  sit behind 6 m airlock walls and shut doors (the only open-door spill, x 44 doorway, is already 0.87 -> saturated).
  The camera drill is unaffected.

## 3. Lamp plan - BUILT (10 new, 2 changed; 19 -> 29 baked lights)
All downward lamps (`kind` default `'lamp'`, no cone). A spot (`kind: 'spot'`, `cone: makeCone(...)`) is not needed:
a downward lamp bakes a box that stops a cell above the bulb, half a spot's cube. Exact edits in `ctcourse.ts`
`build()`:

```ts
// the bay lamp helper gains a height and an intensity (defaults as now)
const lamp = (x: number, y = 5, intensity = 0.9): void => void b.light({ x, y, z: MID, radius: 13, intensity });

for (let i = 0; i < 8; i++) {
  const n = i + 1;
  const x0 = bayX(i);
  lamp(x0 + 4);
  // (course-ready S2) station 5: lamp B is a mast over the annex roof, so bodies on the roof (plates, relay lip, hatch) read lit
  if (n === 5) lamp(x0 + 12.5, 6.8, 1.1);
  else lamp(x0 + 12.5);
  if (i < 7) {
    // ... the airlock walls and pad as now, then:
    // (course-ready S2) the airlock's utility lamp: the green pad and both doors readable; its 6 m walls and shut doors keep it in
    b.light({ x: x0 + CT_BAY + 3, y: 4.6, z: MID, radius: 7, intensity: 0.5 });
  }
  // ...
}

// 5 Annex (replace the back-room lamp at z MID):
b.light({ x: x0 + 11, y: 3.4, z: MID, radius: 8, intensity: 0.9 });          // front room, unchanged
b.light({ x: x0 + 14.2, y: 3.4, z: 3.0, radius: 8, intensity: 0.9 });        // back room, moved south over the hack panel
b.light({ x: x0 + 14.6, y: 3.4, z: 11.5, radius: 6, intensity: 0.9 });       // new: back room north, the medkit

// 7 Rope wall: new, over the holder strip, above a standing holder's head
b.light({ x: x0 + CT_OBST, y: 6.6, z: MID, radius: 5, intensity: 0.6 });
```

| # | Change | Numbers | Why | Predicted after |
| --- | --- | --- | --- | --- |
| L1-L7 | new, one per airlock A1-A7 | (22 i + 19, 4.6, 7), r 7, i 0.5 | green pad and both doors readable; regroup spot | centre 0.64, pad 0.53, corners 0.44, shut far door ~0.45 |
| L8 | changed: S5 bay lamp B | (100.5, 5 -> 6.8, 7), r 13, i 0.9 -> 1.1 | the roof team-move spots sit above y 5 | plates 0.62, lip 0.71, holder 0.51, hatch frame 0.55 |
| L9 | changed: S5 back-room lamp | (102.2, 3.4, 7 -> 3.0), r 8, i 0.9 | hack panel and hanging partner | panel 0.65, head 0.67, back room centre 1.0 -> 0.56 |
| L10 | new: S5 medkit lamp | (102.6, 3.4, 11.5), r 6, i 0.9 | medkit station and the back room's north half | medkit 0.65, user 0.79 |
| L11 | new: S7 wall-top lamp | (141, 6.6, 7), r 5, i 0.6 | the rope holder (above both bay lamps) | holder 0.94, strip 0.85; 0 at the ground (reach ends at y 1.6) |

Containment (the look keeps its dark between pools):
- L1-L7: below the 6 m airlock walls; the door gaps (2.1 m lintel) pass light only to floor near the door, and closed
  doors cut it through the lamp's door list. Yard corners unchanged.
- L8: the roof slab hides everything under the annex; over the 6 m fences is outside the map; the A5 near wall stops
  it (a line to the airlock floor crosses x 104 at y 2.5); a little spills over the annex front edge onto the S5 yard
  (x0+4 z 1: 0.57 -> 0.61).
- L11: r 5 from y 6.6 ends at y 1.6 directly below: no ground light, no change for anyone at the wall foot.

Limits the plan respects:
- `LAMP_GRID_SLOTS` 8 lamps per 2 m column (nearest first, the rest silently dropped from both the field and the
  shader): worst column after the plan is **7**, x 101-103 z 5-7 (station 5 back room). Any further lamp near station 5
  must re-check this.
- `DOORS_PER_LAMP` 4: L8 has 5 doors in reach (S5-door, S5-grid, A5-near, A5-far, A4-far); A4-far, the farthest, is
  dropped. Harmless: L8 cannot reach that plane past the annex walls. L1-L7 list only their own two doors.
- Canonical bake bounds: `hi` y = 7 (6 m fences + 1). Keep every lamp at y <= 6.8 (box top = y + 0.2).
- Bake cost: about +1.2 M visibility cells (+~20%, ~1.2 MB R8 atlas) over ~6.4 M now; the `lamps:` cache key changes,
  so the first load after the change bakes cold. `MAX_REAL_LIGHTS` 48 is not involved (baked lamps skip the pool;
  `BAKED_POOL` holds the flashlights). GI: all lamps stay in group -1.
- Light ids shift (airlock lamps are added inside the bay loop); nothing in the course keeps a light id.
- All new lamps are destructible like the yard's (CT); a shot-out lamp comes back on a bay restart (`restore`).
- Hot paths: untouched (map build only).

### Built (course-ready S2, vitest-measured)
All of the plan above is in `ctcourse.ts`, plus (assumed decision A3: the boosted player stands on the station 2 wall top
and drops on the far side to unbolt the door) **L12, station 2 wall-top lamp: (31.9, 6.6, 5.0), r 7, i 0.5**. It sits over
the far side, so the 4.4 m wall shades the near approach (vitest: near-side lamp contribution <= 0.05). The leg-up squares
used are (30, 3.5), (96, 3.5), (140, 3.5). Column cap and bake bounds hold (test). `tests/ctcourseLight.test.ts` bakes in about 4 s.
Camera drill: A2's far door (x 44) spills into the S3 bay with doors open; the camera reads `visibilityFromLight`, which
saturates at 0.6 and that spot is above it, so the test compares levels clamped to `LIGHT.lit` (delta <= 0.005).

| Point | Before (survey) | After (vitest) |
| --- | --- | --- |
| Airlock centre / pad / corner / far door (shut) | 0.30 / 0.30 / 0.30 / ~0.30 | 0.65 / 0.53 / 0.44 / 0.45 |
| S2 wall top body z 3.5 / z 7 | 0.30 | 0.54 / 0.48 |
| S2 wall top surface z 4 | ~0.30 | 0.65 |
| S2 far drop (32, 3.5) / door side (32, 6.4) / bolt | - / - / 0.88 | 0.83 / 1.00 / 0.98 |
| S2 / S5 / S7 leg-up square body | - | 0.57 / 0.58 / 0.57 |
| S5 plate A / B body | 0.30 | 0.61 / 0.61 |
| S5 plate A surface | 0.36 | 0.74 |
| S5 hatch holder / frame | 0.30 / 0.33 | 0.50 / 0.56 |
| S5 roof lip | 0.30 | 0.70 |
| S5 hanging head | 0.30 | 0.69 |
| S5 medkit user / face | 0.34 / 0.30 | 0.79 / 0.67 |
| S5 back room centre | 1.00 | 0.56 |
| S7 rope holder / strip | 0.30 / 0.41 | 0.94 / 0.85 |
| S7 stair steps top / mid / low | 0.36 / 0.45 / 0.53 | same (unchanged) |
| S4 release reader / face | 0.56 / 0.47 | 0.56 / 0.50 |
| S6 scanner A / B user | 0.62 / 0.57 | 0.56 / 0.53 |
| S8 exit centre / corners | 1.00 / 0.60 / 0.73 | 1.00 / 0.62 / 0.73 |

Shots: `E2E_GPU=1 E2E_PORT=4189 timeout 900 node scripts/shots-ctcourse.mjs docs/course-ready/shots after` (desktop, after
`npm run build`; run once with master's lamps and suffix `before`). Not run in S2 (heavy lock).

Polish list (not in the plan; only if Michael finds them dark in the walkthrough):
- (done: L12 covers the S2 wall top.)
- S7 return stair top step 0.36: a lamp at (144.5, 6.6, 2.6), r 6, i 0.6 lifts the steps to 0.52-0.69.
- Parity calibration: the open-sky level 0.30 reads "mid" on the meter but renders near black (curve centre 0.37).
  Unchanged here; worth a bible note when the visual pass comes.

## 4. Test plan
### 4a. Vitest: `tests/ctcourseLight.test.ts` (node, no Babylon scene, no workers)
Build the field exactly as `World.create` + `bakeLevelLight` do, with the pure bakers called directly (as
`tests/lightField.test.ts` does):

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { ctcourse, bayX } from '../src/world/maps/ctcourse';
import { dressingOn } from '../src/world/detailPass';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps, LAMP_GRID, LAMP_GRID_SLOTS, LAMP_STRIDE } from '../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField, type FieldDoor } from '../src/world/lightField';
import { moonLight } from '../src/world/lampMath';

const b = new LevelBuilder();
ctcourse.build(b, 0);
const reg = b.lights;
let bake: LightBake;
beforeAll(() => {
  const set = canonicalLightSet(b.boxes, b.cylinders, 'ctcourse', dressingOn(ctcourse));
  reg.ambient = ctcourse.theme.lightLevel ?? 0.75;            // 0.3
  const mL = moonLight(ctcourse.theme);                        // 0.05
  const sky = Math.max(0, reg.ambient - mL);
  const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, set.lo, set.hi);
  const s = ctcourse.theme.sunDir; const l = Math.hypot(s[0], s[1], s[2]);
  const dir: [number, number, number] = [-s[0] / l, -s[1] / l, -s[2] / l];
  const n: [number, number, number] = [0, 1, 2].map((k) => Math.max(1, Math.ceil((set.hi[k]! - set.lo[k]!) / MOON_CELL))) as [number, number, number];
  const m = bakeMoon({ kind: 'moon', id: 0, origin: set.lo, n, shapes: set.shapes, dir });
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
  bake = { lo: set.lo, hi: set.hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon: { origin: set.lo, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: mL, ms: 0 };
}, 120_000);
const doors = (open: number): FieldDoor[] => b.anchors.doors.map((anchor) => ({ anchor, open }));
const fieldOf = (open: number) => new LightField(bake, reg, doors(open));
const body = (f: LightField, x: number, y: number, z: number) => f.bodyLevel(x, y, z, 1.7);
/** Bake index of the lamp at (x, y, z) (for `lampAt`). */
const lampIdx = (x: number, y: number, z: number) => bake.lamps!.baked.ids.findIndex((id) => { const l = reg.lights[id]!; return Math.abs(l.x - x) < 0.01 && Math.abs(l.y - y) < 0.01 && Math.abs(l.z - z) < 0.01; });
```

Assertions (minimums sit ~0.05-0.1 under the predictions in section 1; bodies with `body(f, x, feetY, z)`, surfaces with
`f.levelAt`; `f = fieldOf(1)` unless stated):
1. Routes: every bay, z 7, x0 + [0.6, 4, 7, 9.8, 12.5, 15.4] body >= 0.6; x0 + 8.4 >= 0.55.
2. Panels (n 1-8): reader (x0+3.5, 0, 12.8) body >= 0.45; face `levelAt(x0+3.5, 1.4, 13.55)` >= 0.40.
3. Airlocks A1-A7 with doors shut (`fieldOf(0)`): centre body >= 0.55; pad `levelAt(x0+19, 0.3, 7)` >= 0.45; corner
   (x0+16.6, 0, 4.6) body >= 0.38; far door (x0+21.6, 0, 7) body >= 0.42.
4. Station spots: S2 bolt `levelAt(31.9, 1.2, 7)` >= 0.6; S4 release reader (78, 0, 12.8) >= 0.45 and face
   `levelAt(78, 1.3, 13.55)` >= 0.40; S5 plates (99, 4.45, 3.6 / 10.4) body >= 0.55, plate surface
   `levelAt(99, 4.7, 3.6)` >= 0.6, holder (102.4, 4.45, 2.3) body >= 0.45, hatch frame `levelAt(102.4, 4.7, 1.8)`
   >= 0.45, lip (97.5, 4.45, 7) body >= 0.6; hack panel `levelAt(S5_PANEL.x, 1.4, 0.45)` >= 0.55, hanging head
   `levelAt(102.4, 2.3, 1.3)` >= 0.55, medkit user (103, 0, 12.8) body >= 0.6, back room centre (102.3, 0, 7) >= 0.45;
   S6 users (115, 0, 1.0) >= 0.5 and (115, 0, 13.0) >= 0.45; S7 holder (141, 4.45, 7) body >= 0.75, strip
   `levelAt(141, 4.7, 7)` >= 0.7, stair steps (142 / 143 / 144, step top, 1.0) bodies >= 0.33 / 0.4 / 0.45; S8 exit
   centre (167.5, 0, 7) >= 0.9, corners (169.4, 0, 3.1) and (165.6, 0, 10.9) >= 0.55.
5. Pools with dark between unchanged: for bays 1-4 and 6-8 the seven corner points (x0 + 0.6 / 8.3 / 15.4 / 9.8,
   z 0.6 / 13.4) and the S5 corners x0 + 0.6 / 8.3: body with L1-L7, L10, L11 switched off (`reg.setOn(id, false)`)
   vs on differs by <= 0.02 (restore with `setOn(id, true)` after). And every such corner stays < LIGHT.lit + 0.05
   (no new lit pool).
6. Containment with doors shut (`fieldOf(0)`): for each airlock lamp i, `lampAt(i, ...)` is 0 at (x0+15.4, 1.0, 7),
   (x0+22.6, 1.0, 7) and (x0+15.4, 1.0, 4.6); the S7 wall-top lamp: `lampAt` is 0 at (139.5, 1.6, 7) and (142.5, 1.6, 7).
7. Camera drill untouched: every S3 point (44.6-59.4 on z 7, the pocket (52, 0, 7), the corners) reads the same with
   L1-L7 off and on (delta <= 0.005).
8. Column cap: for every `LAMP_GRID` column over [lo, hi], the lamps whose reach touches it (the `lampGrid` rule:
   horizontal distance from the column box < reach) number <= `LAMP_GRID_SLOTS`.
Cost: one full bake (28 lamps, ~7.6 M cells, moon at 0.5 m) in `beforeAll`; expect seconds on the desktop. If it runs
past ~20 s, bake per station window (pass `lo` / `hi` clipped to x0 - 8 .. x0 + 30; lamps outside clip to 1-cell
boxes).

### 4b. GPU shots (Michael's PC only, `E2E_GPU=1`, port 4189, headless; desktop heavy lock)
How: autostart the course single player (`autostart=ctcourse&mode=course&gfx=epic`; the course cannot finish solo but
the world, devices and baked lamps load), teleport the player to the spot (body light visible), read the meter and the
field, then freeze and fly the photo camera: `g.photoFreeze(true)` (the frame update then only follows the camera),
`document.body.classList.add('photo-mode')` (hides `.hud`, `.hud-world`, toasts, debug overlay and other screens),
`cam = g.photoCamera(); cam.position.set(...); cam.setTarget(...)`, wait for `g.scene.isReady()` plus ~2.5 s (TAA and
shader compiles; see `e2e-darkness.mjs` `measure`), screenshot. Check `!!g.world.lamps` (baked lamps drawn). Night
vision off. Parity read per shot: `meter = g.lightLevel` (after >= 0.5 s at the spot, 10 Hz sampler) against
`g.world.lightField.bodyLevel(px, py, pz, 1.7)`: within 0.02, and in the band of the table above.

Shot list (player feet / camera position -> target):

| File | Player (x, y, z) | Camera | Target |
| --- | --- | --- | --- |
| s1-bay.png | 3.5, 0, 12.8 | 0.8, 2.2, 1.5 | 9, 0.8, 9 |
| a1-airlock.png | 19.5, 0, 7 | 16.7, 1.8, 4.5 | 21.8, 0.6, 8 |
| s2-wall.png | 29.4, 0, 7 | 26, 2.4, 2.5 | 31, 2.6, 7 |
| s2-top.png | 31, 4.5, 7 | 27.5, 6.0, 9.5 | 31.5, 4.8, 7 |
| s3-camera.png | 52, 0, 7 | 46.5, 1.9, 3 | 52.6, 1.8, 7 |
| s4-laser.png | 73.4, 0, 7 | 70, 2.0, 2 | 75, 0.9, 7 |
| s4-release.png | 78, 0, 12.8 | 75.8, 1.9, 9 | 78, 1.3, 13.8 |
| s5-roof.png | 99, 4.5, 3.6 | 97.2, 6.6, 1.0 | 100.5, 4.4, 7 |
| s5-hatch.png | 102.4, 4.5, 2.3 | 101, 6.2, 4.6 | 102.4, 4.4, 1.3 |
| s5-backroom.png | 102.4, 0, 1.0 | 103.6, 2.6, 5.5 | 102.4, 1.2, 0.3 |
| s5-medkit.png | 103, 0, 12.8 | 101.2, 1.8, 9 | 103, 1.2, 13.6 |
| s6-scanner-a.png | 115, 0, 1.0 | 112.5, 1.8, 4.5 | 115, 1.4, 0.2 |
| s6-scanner-b.png | 115, 0, 13.0 | 112.5, 1.8, 9.5 | 115, 1.4, 13.8 |
| s7-rope.png | 141, 4.5, 7 | 137, 3.6, 3.2 | 141, 4.6, 7 |
| s7-stair.png | 145, 0, 1 | 146, 2.6, 5 | 142.5, 1.6, 1 |
| s8-exit.png | 167.5, 0, 7 | 164, 2.2, 2.5 | 167.5, 0.4, 7 |
| yard-look.png | 64, 0, 7 | 60, 5.5, 13 | 75, 0, 3 |

Take the set before (master's lamps) and after the lamp change, same names with `-before` / `-after`, into
`docs/course-ready/shots/`.

Commands (bash, desktop, in `C:/NightShift/Mobile-Coop-course-ready`, heavy lock taken first, `npm run build` done):
```bash
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4189 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
netstat -ano | grep ":4189 .*LISTENING"    # must print nothing
# server: a background Bash task (no window), as docs/locomotion/RULES.md M9 step 2
node node_modules/vite/bin/vite.js preview --port 4189 --strictPort --host 127.0.0.1
# one shot (repeat per row; JS below with the row's numbers)
E2E_GPU=1 URL=http://127.0.0.1:4189/ timeout 300 node scripts/shot.mjs docs/course-ready/shots/s5-roof-after.png "autostart=ctcourse&mode=course&gfx=epic" 120 "$JS"
# afterwards: free the port again and re-check netstat
```
`$JS` for a row (player px, py, pz; camera cx, cy, cz; target tx, ty, tz):
```js
(async () => {
  const g = __app.current; const V = g.player.position.constructor;
  g.team?.end?.(true);
  g.player.controller.teleport(new V(px, py, pz), Math.PI / 2);
  await new Promise((r) => setTimeout(r, 800));
  const meter = g.lightLevel, field = g.world.lightField.bodyLevel(px, py, pz, 1.7);
  g.photoFreeze(true); document.body.classList.add('photo-mode');
  const cam = g.photoCamera(); cam.position.set(cx, cy, cz); cam.setTarget(new V(tx, ty, tz));
  for (let i = 0; i < 40 && !g.scene.isReady(); i++) await new Promise((r) => setTimeout(r, 250));
  await new Promise((r) => setTimeout(r, 2500));
  return JSON.stringify({ meter, field, lamps: !!g.world.lamps, bake: g.world.lightInfo() });
})()
```
Seventeen `shot.mjs` runs each launch a browser and bake cold (a new profile each time). Cheaper: a job-owned
`scripts/shots-ctcourse.mjs` that serves `dist/` itself like `perf-trend.mjs` (`vite preview` spawned with
`windowsHide: true`, `E2E_PORT` 4189, `127.0.0.1`), launches once (`e2e-lib.mjs` `launch`), loops the table above with
the same JS per row (`photoFreeze(false)` and removing `photo-mode` between rows), writes the PNGs, prints
`name meter field band` per row, fails a row when |meter - field| > 0.02, and stops its server:
`E2E_GPU=1 E2E_PORT=4189 timeout 900 node scripts/shots-ctcourse.mjs docs/course-ready/shots after`.
