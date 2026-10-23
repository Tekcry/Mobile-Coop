status: open

# LR16-W - every map passes its light gates by layout (Opus build briefs, 5 parallel parts + 1 integration step)

Planner: Opus 5.5, 2026-10-24 (plans only). Base: `origin/feature/sector-redesign-lr16l-a` @ `67f3661a` (lr16int + LR16g
re-levels + LR16-L part A, `LAMP_VERSION` 6). Every number below was measured on that head (vitest, slot lock, maxWorkers 2).
Michael (PLAN.md LR16): "Must be realistic depiction of light"; soft edges, no hard arcs; light parity (picture, meter and
guards agree); LR16-0: "emphasis the light/shadow system like chaos theory did, like a showcase no matter where you look".

## Lead decisions baked in
1. warehouseOps #34 / #53 exit signs are accepted as wall-mounted: they move from `KNOWN_EMBEDDED` to `ON_ITS_POST`
   (`tests/lampBoxAlign.test.ts`). Part T.
2. campusOps #81 cage downlight (18, 2.8, 37) inside the basket support post (`campusS4.ts:416`, `:493`): a real map bug,
   fixed here, cage stays lit. Part T.
3. The wall-guard cap stays <= 3.0 (`lampBoxAlign.test.ts`, I 0.4). Nobody edits it.
4. The new warehouseS3 "lit enough" red and the S2 moves of part A (strip #61) belong to this slice. Parts S2, S3.
5. `tests/torchOcclusion.test.ts:166` lint error (`consistent-type-imports`): Part T (the first part that touches tests).
6. A-lead (LR16g): `CAP` 0.55 stays; fix with layout, not the light model.

## Verdict in five lines
1. The red list on the base: 8 failing asserts, 191 failing points plus 3 pocket deltas (table "Red list" below). All of them are map data:
   route, decision and work points standing 0.4-1.3 m under the fitting that lights them. In the near field the photometric
   falloff (`10 / (d^2 + 1)`) gives 3-7x the level at the head, so one fitting at today's intensity reads 1.00 unclamped
   1.4-4.9 (the "unclamped" column). LR16g could not clear them because its brief capped moves at 0.5x; most points need
   0.1-0.5x of their dominant fitting, or the fitting off the walking line.
2. The fix is a night lighting state per room, done with realistic levers in this order: dim a fitting (LED night level),
   give a hall strip a beam (high-bay optic) so a rack-top / walkway / deck body beside it falls outside, swap a lit fitting
   with a dead one in the same grid (or move a row / column together), move a player route waypoint <= 1.0 m onto the
   pool rim, add a real occluder, move a guard's takedown spot (S3 pockets only).
3. Contrast, not a flat grey: routes in the 0.4-0.55 rim, work areas in their own pool (0.55-0.8), pockets dark. A room
   with off-route floor keeps a pool there (CT "clear pools, clear dark").
4. Parallel parts, file-disjoint by map file (the shared `warehouseSectors.ts` is split by section block: disjoint line
   ranges), with a fixed owner for each boundary point (C2 lobby -> S1, C3 office -> S3) and a +-0.02 budget on everyone
   else's points. A short integration step re-checks the two connector lobbies after the merge.
5. No red needs a light-model change on this reading. Two S2 rack-top points (W0N 0.38, R3[4] 0.39) are the hardest; if
   no lever reaches them, the builder reports a C-entry with the best measured value (lead / Michael call).

## Red list on 67f3661a (exact, from the tests' own failure lists)
| test | assert | failing points | owner |
| --- | --- | --- | --- |
| `warehouseS1Light` | stealth maxima (`:175`) | 68 | S1 |
| `warehouseS2Light` | lit enough (`:184`) | 4: R2[13] (-23.45, 11.4, 4) 0.38, A1 south mouth 0.31 (LR16g C3), east gangway middle 0.38, W0N rack top 0.38 | S2 |
| `warehouseS2Light` | stealth maxima (`:193`) | 49: 7 at the C2 lobby (R1[0] R2[0] R3[0] (-14.5, -7.2) 1.00; R1[1] R2[1] R3[1] and "entry: the C2 far door" (-14.5, -5.4) 0.57), 5 in the C3 office (R1[14] R2[20] R3[16] (-1, 15) 1.00, C3 checkpoint 1.00, C3 near door 0.87), 37 in the hall and cage | S1 7, S3 5, S2 37 |
| `warehouseS3Light` | lit enough (`:150`) | 1: connector C3 far doorway outside (-0.95, 0, 11.2) 0.42 < 0.45 (new with part A) | S3 |
| `warehouseS3Light` | stealth maxima (`:159`) | 67 | S3 |
| `warehouseS3Light` | pockets dark (`:175`) | 1: stores officer's spot (0.6, 0, -7.6) 0.39 > 0.3 (LR16g C4) | S3 |
| `warehouseS3Light` | pockets +0.05 (`:184`) | supervisor's spot (12, 15) +0.053 (fails first), crane operator (8, -6.8) +0.12, east bay (21, 1.5) +0.14 | S3 |
| `ctcourseLight` | must-see (`:163`) | S7 stair step 1 (142, 3.3, 1.0) 0.31 < 0.33 (LR16g C2) | C2 |
| `lampBoxAlign` | audit | green; lead decisions 1 and 2 change its lists | T |
| lint | `npm run lint` | `tests/torchOcclusion.test.ts:166` | T |
Every other assert in these files passes on the base and stays green (`lampBoxAlign` with its wall guard included).
The per-point tables (value now, unclamped total, the scale of all lamp light that would put it at 0.48, the top three
lamps by contribution) are in each part, grouped by dominant lamp. "edge" rows pass now but sit within 0.02-0.03 of a band
edge: watch them.

## Parts (all branch off `67f3661a`; Opus builds each)
| part | branch | files (only these) | fixes |
| --- | --- | --- | --- |
| S1 | `feature/sector-redesign-lr16w-s1` | `src/world/maps/warehouseS1.ts` `S1_LAMPS` (`:64-93`); `src/world/maps/warehouseSectors.ts` section 1 block (`:23-86`) | S1 68 + S2's 7 C2-lobby points |
| S2 | `feature/sector-redesign-lr16w-s2` | `src/world/maps/warehouseS2.ts` `S2_LAMPS` (`:135-146`); `warehouseSectors.ts` section 2 block (`:87-150`) | S2 37 + 4 low |
| S3 | `feature/sector-redesign-lr16w-s3` | `src/world/maps/warehouseS3.ts` `S3_LAMPS` (`:127-148`) and, for the occluder only, the stores-cage lines `:330-339`; `warehouseSectors.ts` section 3 block (`:151-208`); `tests/warehouseS3Light.test.ts` POCKETS (`:94-101`) only for a pocket that names a moved guard takedown spot | S3 67 + 1 low + 1 dark + 3 pocket deltas + S2's 5 C3-office points |
| C2 | `feature/sector-redesign-lr16w-c2` | `src/world/maps/ctcourse.ts` (S7 block `:589-600`); `tests/ctcourseLight.tuned.json` (S7 stair entries only) | ctcourse S7 stair step 1 |
| T | `feature/sector-redesign-lr16w-t` | `src/world/maps/campusS4.ts:416`; `tests/lampBoxAlign.test.ts:206-219`; `tests/torchOcclusion.test.ts` (imports, `:166`) | decisions 1, 2, 5 |
| INT | on the lead's merge branch `feature/sector-redesign-lr16w` | the connector lamps #32 / #33 (S1), #111-#114 / #88 (S3) and the connector route points only | the C2 / C3 boundary points after the merge |
Merge order for the lead: T, C2, S1, S2, S3 into `feature/sector-redesign-lr16w` (cut from `67f3661a`), then INT. The three
warehouse branches touch `warehouseSectors.ts` in disjoint blocks; never edit a line within 3 lines of another section's
block (`:86-87`, `:150-151`), so git merges them cleanly.

## Rules for every warehouse part (S1, S2, S3, INT)
Read `docs/systems/agent-preamble.md` first. Desktop build: `npx tsc --noEmit`, `npx eslint <your files>`, single vitest
files `--maxWorkers=2` under a slot lock (`( set -o noclobber; echo "<part> | <time>" > C:/NightShift/scratch/sr-slot-<n>.lock )`,
n 1..4, delete after; wait while `powershell -NoProfile -Command "(Get-CimInstance Win32_Processor).LoadPercentage"` > 90).
No e2e, no build, no `npm run dev`. Commit on your branch, push; the lead merges.

Levers, in this order (each is map data; say which one per point in the report and why it is realistic):
- L1 night level: lower a fitting's intensity (an LED fitting on its night setting). Positions unchanged. A lit fitting
  stays >= 0.03; below that make it dead (intensity 0: drawn, off, `group -1`), as the grids already do over pockets.
- L2 beam: the 5th tuple element `beam` (half angle, rad; `lampRooms.ts:58-60` makes it a downward spot) on a hall strip
  so a body on a rack top, walkway, deck or main grip to its side falls outside the cone while the floor under it keeps
  its pool (high-bay 60-90 degree optics). 0.45-1.0 rad. A beam also changes exp (a spot: `SPOT_EXP` 2, `SPOT_FEATHER`).
- L3 re-place inside the room's grid: swap a lit and a dead fitting of the same room, or move a whole row / column of
  the room by <= 1.5 m (Michael 2026-10-22, sector-fixes L: "one height and a regular layout per room"). Same height.
- L4 player route waypoint (`routes[].pts` in `warehouseSectors.ts`): <= 1.0 m, onto the pool rim or along the wall. Keep
  `obj` and `climbs` indices, keep the point on the same surface (y), every non-climb leg must still have a nav path with
  detour <= 2.5x + 6 m (`scripts/e2e-sectorops.mjs:620-640`), no two routes identical (`tests/sectors.test.ts:324-340`).
  Not for the tests' named spots (doors, checkpoints, openings, the objective, aisle samples): those are fixed features.
- L5 occluder: a real object only (a solid cage top, a shelf top, a lintel), a rendered `b.box` that is in the light bake
  (the canonical light set reads `b.boxes`); never an invisible light blocker. Mark it `overhead` / `noLedge` as the file
  does for roofs so it adds no nav surface.
- L6 guard spot (S3 pockets only): move a guard's post (`x`, `z`), its first route point and its `takedownSpot` together <= 1.0 m into real shadow (the takedown happens where he stands); `tests/sectors.test.ts`
  (M8 out-of-sight) must pass; the S3 test's POCKETS entry that names that guard follows to the same coordinate (the only
  test edit allowed, same name).

Never: change `CAP`, `READ`, `KEY`, `WORK`, `DARK`, `TOL`, `HANG`, `AISLE*`, any assert, band or named spot coordinate (but
L6); `PHOTO`, `BOUNCE`, `LIGHT_GAIN`, `LAMP_LEVEL_GAIN`, `darkCurve`, `lampMath`, `lampBake`, `lightField`, `LAMP_VERSION`;
add or remove a lamp in `warehouseS1.ts` / `warehouseS2.ts` (registry ids are keys: `lampBoxAlign` names `warehouseOps:34`
/ `:53`; turning a dead fitting on is fine); move #34 (-8, 2.4, -6.24) or #53 (11, 2.4, -17.76) (radius / intensity are
fine); put a lamp at y >= 5.9 (the roof reads the moon: `warehouseS1Light.test.ts:191`); touch another part's lamp table;
exceed `LAMP_GRID_SLOTS` in a 2 m column (the tests check it).

Contrast (Michael's showcase, CT): do not flatten a room to 0.45 everywhere when it has off-route floor (a desk, a machine,
a rack face, a bay): keep or make a pool there (floor >= 0.7) and put the route in its rim. Report each room's brightest
floor point after.

Budget on other sections: every point of the other two warehouse tests that you do not own must stay within +-0.02 of
the base (diff the print files). The boundary points have one owner (C2 lobby: S1; C3 office: S3); the other part keeps
its own lamps' change at those points within +-0.02.

### Step 0 (each warehouse part, before any edit): base prints and the probe
1. Base prints: `WH1LIGHT_PRINT=<scratch>/b1.txt WH2LIGHT_PRINT=<scratch>/b2.txt WH3LIGHT_PRINT=<scratch>/b3.txt npx vitest run
   tests/warehouseS1Light.test.ts tests/warehouseS2Light.test.ts tests/warehouseS3Light.test.ts --maxWorkers=2` (each file
   bakes warehouseOps once, ~20 s). After each change, the same into a1-a3 and diff:
   `node -e "const f=require('fs');for(const k of [1,2,3]){const b=f.readFileSync(process.argv[1]+'/b'+k+'.txt','utf8').split('\n').slice(1),a=f.readFileSync(process.argv[1]+'/a'+k+'.txt','utf8').split('\n').slice(1);b.forEach((l,i)=>{const p=l.split('\t'),q=(a[i]||'').split('\t');if(Math.abs(+p[2]-+q[2])>0.005)console.log('S'+k,p[0],p[2],'->',q[2],p[3])})}" <scratch>`
2. The probe (untracked, never committed; delete before the commit): copy `tests/warehouseS<n>Light.test.ts` to
   `tests/zzW<n>probe.test.ts` and append the block below. It writes, per point, the unclamped total (chest or head,
   whichever is higher), the ambient + moon, the bounce, the direct sum, the scale of (bounce + direct) that would read
   0.48, and the top four lamps (registry id, position, table radius, intensity, contribution). Run with `-t "zz probe"`.
```ts
describe('zz probe', () => {
  it('decomposes every point (unclamped)', () => {
    const lights = reg.lights;
    const ids = bake.lamps!.baked.ids;
    const wasOn = ids.map((id) => lights[id]!.on);
    const all = [...SPOTS.map((p) => ({ ...p, kind: 'spot' })), ...POCKETS.map((p) => ({ ...p, min: -1, max: DARK, shut: false, kind: 'pocket' }))];
    const cur = all.map((p) => read(p));
    const ys = (p: (typeof all)[number]): number[] => [p.y + 1.7 * 0.6, p.y + 1.7 * 0.95];
    for (const id of ids) reg.setOn(id, false);
    const amb = all.map((p) => ys(p).map((y) => (p.shut ? shut : open).totalAt(p.x, y, p.z)));
    ids.forEach((id, k) => reg.setOn(id, wasOn[k]!));
    const rows = all.map((p, j) => {
      const f = p.shut ? shut : open;
      let best = -1; let bi = 0; let bd: [number, number][] = []; let bb = 0;
      ys(p).forEach((y, s) => {
        const d: [number, number][] = [];
        for (let k = 0; k < ids.length; k++) { const v = f.lampAt(k, p.x, y, p.z); if (v > 0.003) d.push([k, v]); }
        const bo = f.bounceAt(p.x, y, p.z);
        const tot = amb[j]![s]! + bo + d.reduce((a, x) => a + x[1], 0);
        if (tot > best) { best = tot; bi = s; bd = d; bb = bo; }
      });
      const a = amb[j]![bi]!;
      const dsum = bd.reduce((q, x) => q + x[1], 0);
      const top = bd.sort((u, v) => v[1] - u[1]).slice(0, 4).map(([k, v]) => { const l = lights[ids[k]!]!; return `#${ids[k]}(${l.x},${l.y},${l.z} R${+(l.radius / 1.6).toFixed(2)} i${l.intensity})=${v.toFixed(2)}`; }).join(' ');
      return `${p.kind}\t${p.name}\t(${p.x},${p.y},${p.z})\t${p.min}-${p.max}\tnow ${cur[j]!.toFixed(2)}\tunclamped ${best.toFixed(2)}\tamb ${a.toFixed(2)}\tbounce ${bb.toFixed(2)}\tdirect ${dsum.toFixed(2)}\tscale ${((0.48 - a) / Math.max(1e-6, bb + dsum)).toFixed(2)}\t${top}`;
    });
    writeFileSync('<scratch>/probe-w<n>.tsv', rows.join('\n'));
  });
});
```
   Levels are linear in intensity (`lightField.ts:333`: `LAMP_LEVEL_GAIN * intensity * falloff * cone * vis`) until the
   clamp at 1, and the bounce follows the lit lamps (LR16-1), so the scale column predicts an L1 move well; beams, moves
   and occluders need a re-bake (one test run). The registry radius is the table radius x 1.6 (the probe prints the table
   value). Registry ids: S1 lamps are #0-#53 in `S1_LAMPS` order, S2 #54-#75, S3 #76-#132 (dead fittings count).

### Acceptance (each warehouse part)
- Its own test file: every assert green (no `.skip`, no band change). The two other warehouse files: its owned points
  green, every other point within +-0.02 of the base print.
- `tests/sectors.test.ts`, `tests/warehouseCoopS1.test.ts`, `warehouseCoopS2`, `warehouseCoopS3`, `warehouseLamps`,
  `lampAudit`, `lampBoxAlign`, `warehouseDress`, `sectorLampSync`, `rooms`, `detailPass`, `lampFlicker`, `lampAtlasFit` pass;
  `npx tsc --noEmit` clean; eslint clean on the touched files.
- Report `docs/sector-redesign/checks/lr16w-<part>-build.md` (the lead commits it): every changed line old -> new with its
  lever and the reason it is realistic; every red point base -> after with its band; the edge rows after; each room's
  brightest floor point; the print diff of the other two sections (must be empty but the owned boundary points); C-entries
  (a point no allowed lever fixes: the best value reached and what it would need).

## Part S1 - section 1 (goods-in and trade offices) at night
Branch `feature/sector-redesign-lr16w-s1` off `67f3661a`. Files: `src/world/maps/warehouseS1.ts:64-93` (`S1_LAMPS`) and
`src/world/maps/warehouseSectors.ts:23-86` (section 1: guards `:40-57`, routes `:63-85`). Owns: the 68 S1 reds, and the C2
fire lobby on both sides: S2's R1[0] R2[0] R3[0] (-14.5, -7.2) and R1[1] R2[1] R3[1] + "entry: the C2 far door" (-14.5,
-5.4). S2 keeps its lane lamps' change at (-14.5, -5.4) within +-0.02, so those four move only with your lobby lamps.
Do not touch: other sections' lamps; #34 / #53 positions; the roof (moon only).

Cluster plan (start here, measure, adjust; the lamp ids are the probe's):
- **C2 fire lobby** (#32 dead (-15.15, 2.95, -7.4), #33 (-13.85, 2.95, -7.4) i 0.313; `:82`; 9 S1 + 7 S2 points, all KEY
  0.45-0.55 or READ-CAP). Three points 1 m apart along x -14.5 (doors at z -8.4 / -6.4, checkpoint -7.2, route ends -7.4)
  need a flat profile, which one panel over the middle cannot give (centre 1.40 unclamped vs doors 0.97). L3: the lobby's
  two fittings become two lit panels on the door axis, x -14.5, one inside each door (z about -8.1 and -6.7), each at
  about 0.09-0.12 (a fire lobby with a light over each door). Estimated flat to +-10% (centre 2 x 0.9 m off, doors one
  overhead + one 1.4 m off). Targets: the KEY points 0.47-0.52; (-14.5, -5.4) 0.45-0.53 (it gets the north panel through
  the open far door plus S2's lane strip #56 0.10: tune the north panel's z / intensity for it).
- **Goods-in bay strips** (#6-#13 at 5.58, `:73`, HALL 45 degree cone): R1[4] R1[5] R1[15] R1[17] R1[18] R2[16] R3[19]
  R3[21] takedown 3, bay wrapper, bay east lane (scales 0.42-0.57). L1 the bay grid to about 0.45-0.5x (high-bays on night
  level). Keep R1[3] (0.57 now, #7) and R3[20] (0.57) in band, and the charger / skip pockets dark. Takedown 3 (-11.2,
  -15.4) is guard data: do not move it; dim #9 more if it alone stays over.
- **Reception** (#35 (-6.5, 2.95, -15.9) lit, #36 (-3.5, 2.95, -15.9) dead; `:85-86`): R1[6] 1.00 (unclamped 1.41), R1[7]
  0.79, R1[8] 0.67. L3 swap: #35 dead, #36 lit over the counter (the clerk's desk light) at about 0.3-0.4x of #35's level;
  the route along the room's west side then sits in the counter pool's rim. "reception: the counter" is WORK 0.45-0.8
  (0.78 now): keep it in band.
- **Office corridor** (#39-#42 at 2.75, #43 dead; `:88`; a 3 m wide corridor, no off-route floor): R1[9] R1[10] R1[13]
  R1[14] R3[13] R3[14] R3[17] R3[18], corridor west end (doors shut) and middle (unclamped 1.4-2.1: scale 0.18-0.29). L1 the
  corridor's night level: every lit panel to about 0.2x (i 0.06-0.13), tuned so the route points along it read 0.45-0.52
  and the level between panels stays >= 0.42. #43 (6.8) stays dead (takedown 8's pocket: +0.03 now, max +0.05).
  "security office door" (WORK 0.45-0.8) also gets #37's spill.
- **Security office** (#37 (4.3, 2.95, -15.9) i 0.706, #38 (6.7, 2.95, -15.9) i 0.45; `:87`, pass false): the DVR (WORK
  0.55-0.8) and its desk front, R1[12] / R2[8] / R3[16] (4.8, -16) WORK, R1[11] / R3[15] (4.4, -14.5), R2[7] (6.45, -16.3)
  and R2[9] (6.4, -16.5) at the deck hatch drop (unclamped 1.8-3.7). A CCTV room at night is lit by its screens and a desk
  light: L1 #38 dead; #37 L2 beam about 0.6 rad + L1 to about 0.1x (i about 0.07), so the desk reads 0.6-0.75 and the
  hatch drop 2 m east 0.4-0.55. If R1[11] / R3[15] then read under 0.4, L4: 0.4 m south toward the desk, inside the office.
- **Plant deck strips** (#20 (4.2, 5.58, -15.15) i 0.976, #21 (7, ...) i 0.726, #18 / #19 dead; `:75`; the deck top is 3.3,
  heads 0.7 m under the strips): R2[5] R2[6] R2[10] R2[11] and "plant deck: the middle" (KEY) (unclamped 3.5-4.1, scale
  0.09-0.11). L3 move the deck row (all four fittings) south over the plant side of the deck (z about -16.9; the route
  runs z -14.6 / -14.9) and L1 to reach KEY 0.47-0.52 at the middle: a pool over the plant, the walk line in its rim. If
  the move puts a fitting over the deck hatch (6.0-6.9, -15.85..-14.95) or under the 6.0 roof's hatch, pick z -17.2.
  Fallback: L1 alone (about 0.1x).
- **Crane walkway bulkheads** (#22-#24 at 5.0 on the z -8.8 wall, `:77`; walkway 3.0, heads 0.4 m under): R3[8] R3[9],
  walkway east / middle / west (scale 0.09-0.12). Spots sit at the bulkheads' x (named spots: fixed). L1 to about 0.1x (i
  about 0.035: maintained walkway lights), or L3 raise the row to 5.5 (still under the 6.0 roof, clear of the 5.9 roof
  rule: the light point stays < 5.9) and L1 less. Do not move them along x: a body level with a downward bulkhead 3.5 m
  away is outside its cone (the spot goes dark).
- **Office void panels** (#45 (-5.3, 4.55, -12.3), #51 (3.1, 4.55, -10), #52 (6.65, 4.55, -10) lit, #46-#50 dead; `:90`;
  heads at the panels' height): R3[10] R3[11], void openings h1 / h2 / catwalk (KEY) (scale 0.09-0.18); #51 also gives the
  mess 0.37. L3 swap lit / dead so no lit void panel is within 1.5 m plan of an opening, then L1 so each opening reads KEY.
  Measure; the void is a crawl space, so a low level is right.
- **Mess** (#44 (4.5, 2.75, -9.8) i 0.861, `:89`, pass false): R3[12] (2.6, -10.2), takedown 4 (2.6, -9.9), "mess: under the
  hatch" (KEY) (scale 0.22-0.23). L3 move #44 east along the mess (x 6.5-7, over the kitchenette end) and L1 so the hatch
  end (x 2.6, the kettle) is the pool's rim at 0.45-0.52. The CCTV operator's kettle stop stays where it is.
- **Lobby roof strips** (#14 (-22, 5.58, -7.4) i 0.567, #15 (-17, ...) i 0.608, `:74`): R2[14] R2[15], lobby roof storage /
  vent (scale 0.40-0.44). L1 to about 0.42x.
- **Facade doors** (#3 (-5, 3, -18.45) i 0.248 and #4 (11, 3, -18.45) i 0.159, WALL_S, `:69`; the yard's moon floor is
  0.30): entrance door (KEY), workshop door (KEY), R3[4] (scale 0.25-0.36). L1 #3 / #4 to about 0.3x. Watch R3[3] (9.5,
  -19.2) 0.54 and takedown 2 0.57 (they drop with it; READ 0.4 floor, moon 0.30 + bounce).
- **Workshop door exit sign #53** (11, 2.4, -17.76) radius 3.14, i 0.06, `:92`: gives R3[5] (11, -17.2) 0.30 of its 0.75. An
  exit sign's glow is local: L1 radius 0.6 (as S2's signs, `warehouseS2.ts:145`), i unchanged or lower. Position fixed.
- **Workshop strip #30** (21.3, 5.58, -11.8) i 1.123, `:78`: R3[6] (22.6, -12) 0.89 (scale 0.47). L1 about 0.5x, or L4 R3[6]
  1 m toward the wall. Watch "workshop: the lathe" 0.39 (READ 0.4 - TOL, #29) and the bench 0.57: do not dim #29 / #28.

Tests: Step 0, then the acceptance list (above). Its own file: `warehouseS1Light` all green. Owned S2 points (the 7) green
in `warehouseS2Light`'s print; all other S2 / S3 points within +-0.02.

Light parity (S1): map data only. Every change (intensity, radius, beam, position, route point) feeds the one bake and the
one registry that the picture (lamp shader, its cone and feather), the meter (`LightField.bodyLevel`) and the guards
(`fieldLight`) all read, so they move together by construction. A dead fitting is `on: false` for all three. No shader,
field or bake code changes.

Red and edge points, grouped by dominant lamp (base `67f3661a`):

Dominant lamp #0 (-19,5,-18.45) R 3.05 i 0.397:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | R1[2] (-19, -18.9) | 0.4-0.55 | 0.54 | 0.54 | 0.74 | #0 0.21 |
| edge | entry: shutter W crawl gap (-19,0,-18.4) | 0.45-0.55 | 0.54 | 0.54 | 0.76 | #0 0.21 |

Dominant lamp #7 (-18,5.58,-15.4) R 6.78 i 0.7:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | R1[3] (-19, -17) | 0.4-0.55 | 0.57 | 0.57 | 0.81 | #7 0.26, #6 0.07 |

Dominant lamp #8 (-14,5.58,-15.4) R 5.51 i 0.852:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[4] (-16, -16.2) | 0.4-0.55 | 0.83 | 0.82 | 0.51 | #8 0.31, #7 0.28 |

Dominant lamp #9 (-10,5.58,-15.4) R 5.05 i 1.022:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[5] (-9, -15.8) | 0.4-0.55 | 0.83 | 0.83 | 0.51 | #9 0.56 |
| **RED** | takedown 3 officer (-11.2,0,-15.4) | 0.4-0.55 | 0.92 | 0.92 | 0.45 | #9 0.54, #8 0.14 |

Dominant lamp #35 (-6.5,2.95,-15.9) R 6.93 i 0.347:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[6] (-7.3, -15.8) | 0.4-0.55 | 1.00 | 1.41 | 0.28 | #35 1.04 |
| **RED** | R1[7] (-7.2, -14.4) | 0.4-0.55 | 0.79 | 0.79 | 0.53 | #35 0.47 |
| **RED** | R1[8] (-4.5, -14.4) | 0.4-0.55 | 0.67 | 0.67 | 0.66 | #35 0.23, #40 0.21 |

Dominant lamp #40 (-3.4,2.75,-12.3) R 5.82 i 0.411:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[9] (-4.5, -13) | 0.4-0.55 | 1.00 | 1.37 | 0.29 | #40 0.81, #39 0.18 |

Dominant lamp #42 (3.4,2.75,-12.3) R 2.45 i 0.664:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[10] (4.4, -12.6) | 0.4-0.55 | 1.00 | 2.08 | 0.18 | #42 1.65 |
| **RED** | R1[13] (4.4, -12.6) | 0.4-0.55 | 1.00 | 2.08 | 0.18 | #42 1.65 |
| **RED** | R3[13] (2.5, -11.6) | 0.4-0.55 | 1.00 | 2.04 | 0.19 | #42 1.48, #41 0.12, #40 0.01 |
| **RED** | R3[14] (4.4, -12.6) | 0.4-0.55 | 1.00 | 2.08 | 0.18 | #42 1.65 |
| **RED** | R3[17] (4.4, -12.6) | 0.4-0.55 | 1.00 | 2.08 | 0.18 | #42 1.65 |
| **RED** | security office door (4.5,0,-13.4) | 0.45-0.8 | 1.00 | 1.51 | 0.26 | #42 0.71, #37 0.43 |

Dominant lamp #37 (4.3,2.95,-15.9) R 4.42 i 0.706:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[11] (4.4, -14.5) | 0.4-0.55 | 1.00 | 1.78 | 0.22 | #37 1.21, #38 0.05 |
| **RED** | R1[12] (4.8, -16) | 0.45-0.8 | 1.00 | 3.57 | 0.10 | #37 2.59, #38 0.31 |
| **RED** | R2[8] (4.8, -16) | 0.45-0.8 | 1.00 | 3.57 | 0.10 | #37 2.59, #38 0.31 |
| **RED** | R3[15] (4.4, -14.5) | 0.4-0.55 | 1.00 | 1.78 | 0.22 | #37 1.21, #38 0.05 |
| **RED** | R3[16] (4.8, -16) | 0.45-0.8 | 1.00 | 3.57 | 0.10 | #37 2.59, #38 0.31 |
| **RED** | objective: the DVR (3.95,0,-16) | 0.55-0.8 | 1.00 | 3.55 | 0.10 | #37 2.80, #38 0.04 |
| **RED** | objective: the DVR desk front (4.4,0,-15.6) | 0.45-0.8 | 1.00 | 3.69 | 0.10 | #37 2.85, #38 0.14 |

Dominant lamp #39 (-6.8,2.75,-12.3) R 3.46 i 0.321:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[14] (-7, -12.3) | 0.4-0.55 | 1.00 | 2.14 | 0.18 | #39 1.62, #40 0.07 |
| **RED** | R3[18] (-7, -12.3) | 0.4-0.55 | 1.00 | 2.14 | 0.18 | #39 1.62, #40 0.07 |
| **RED** | corridor: west end (door shut) (-7,0,-12.3) | 0.4-0.55 | 1.00 | 2.14 | 0.18 | #39 1.62, #40 0.07 |

Dominant lamp #13 (-10,5.58,-11.6) R 8.8 i 0.579:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[15] (-9.2, -12.3) | 0.4-0.55 | 0.75 | 0.75 | 0.57 | #13 0.28, #9 0.10, #39 0.06 |
| **RED** | R3[19] (-9.2, -12.3) | 0.4-0.55 | 0.75 | 0.75 | 0.57 | #13 0.28, #9 0.10, #39 0.06 |
| **RED** | R3[20] (-11, -10) | 0.4-0.55 | 0.57 | 0.57 | 0.79 | #13 0.23, #12 0.10 |
| **RED** | bay: the east lane (-11.4,0,-12.6) | 0.4-0.55 | 0.86 | 0.85 | 0.49 | #13 0.29, #12 0.22, #9 0.07 |

Dominant lamp #12 (-14,5.58,-11.6) R 5.55 i 1.278:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[17] (-14.5, -10) | 0.4-0.55 | 0.86 | 0.86 | 0.49 | #12 0.59 |
| **RED** | R1[18] (-14.5, -9.4) | 0.4-0.55 | 0.90 | 0.90 | 0.46 | #12 0.36, #33 0.24, #11 0.00 |
| **RED** | R2[16] (-14.5, -9.6) | 0.4-0.55 | 0.86 | 0.86 | 0.49 | #12 0.40, #33 0.17, #11 0.01 |
| **RED** | R3[21] (-14.5, -9.6) | 0.4-0.55 | 0.86 | 0.86 | 0.49 | #12 0.40, #33 0.17, #11 0.01 |
| **RED** | bay: the wrapper (-16,0,-13.3) | 0.4-0.55 | 0.97 | 0.97 | 0.42 | #12 0.29, #8 0.14, #7 0.14 |

Dominant lamp #33 (-13.85,2.95,-7.4) R 5.65 i 0.313:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[19] (-14.5, -7.4) | 0.4-0.55 | 1.00 | 1.43 | 0.27 | #33 1.05 |
| **RED** | R2[17] (-14.5, -7.4) | 0.4-0.55 | 1.00 | 1.43 | 0.27 | #33 1.05 |
| **RED** | R3[22] (-14.5, -7.4) | 0.4-0.55 | 1.00 | 1.43 | 0.27 | #33 1.05 |
| **RED** | connector: C2 near door (-14.5,0,-8.4) | 0.45-0.55 | 0.97 | 0.97 | 0.42 | #33 0.66 |
| **RED** | connector: C2 far door (-14.5,0,-6.4) | 0.45-0.55 | 0.97 | 0.97 | 0.42 | #33 0.66 |
| **RED** | connector: C2 checkpoint (-14.5,0,-7.2) | 0.45-0.55 | 1.00 | 1.40 | 0.28 | #33 1.03 |

Dominant lamp #20 (4.2,5.58,-15.15) R 5.19 i 0.976:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R2[5] (5, -14.9, 3.3) | 0.4-0.55 | 1.00 | 4.10 | 0.09 | #20 3.39, #21 0.06 |
| **RED** | R2[11] (5, -14.9, 3.3) | 0.4-0.55 | 1.00 | 4.10 | 0.09 | #20 3.39, #21 0.06 |
| **RED** | plant deck: the middle (5,3.3,-14.9) | 0.45-0.55 | 1.00 | 4.10 | 0.09 | #20 3.39, #21 0.06 |

Dominant lamp #21 (7,5.58,-15.15) R 1.5 i 0.726:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R2[6] (7.4, -14.6, 3.3) | 0.4-0.55 | 1.00 | 3.51 | 0.11 | #21 3.04, #20 0.07 |
| **RED** | R2[10] (7.4, -14.6, 3.3) | 0.4-0.55 | 1.00 | 3.51 | 0.11 | #21 3.04, #20 0.07 |

Dominant lamp #38 (6.7,2.95,-15.9) R 2.18 i 0.45:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R2[7] (6.45, -16.3) | 0.4-0.55 | 1.00 | 2.69 | 0.14 | #38 1.60, #37 0.56 |
| **RED** | R2[9] (6.4, -16.5) | 0.4-0.55 | 1.00 | 2.48 | 0.15 | #38 1.39, #37 0.57 |

Dominant lamp #14 (-22,5.58,-7.4) R 6.09 i 0.567:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R2[14] (-20, -7.4, 3.2) | 0.4-0.55 | 0.95 | 0.95 | 0.44 | #14 0.37, #15 0.25 |
| **RED** | lobby roof: the storage (-20,3.2,-7.4) | 0.4-0.55 | 0.95 | 0.95 | 0.44 | #14 0.37, #15 0.25 |

Dominant lamp #15 (-17,5.58,-7.4) R 6.49 i 0.608:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R2[15] (-15.5, -8.4, 3.2) | 0.4-0.55 | 1.00 | 1.01 | 0.40 | #15 0.72, #14 0.01 |
| **RED** | lobby roof: the vent (-15.5,3.2,-8.4) | 0.4-0.55 | 1.00 | 1.01 | 0.40 | #15 0.72, #14 0.01 |

Dominant lamp #4 (11,3,-18.45) R 5.97 i 0.159:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | R3[3] (9.5, -19.2) | 0.4-0.55 | 0.54 | 0.54 | 0.75 | #4 0.13, #5 0.05 |
| **RED** | R3[4] (11, -18.9) | 0.4-0.55 | 0.93 | 0.93 | 0.28 | #4 0.56, #5 0.01 |
| **RED** | entry: the workshop door (10.4,0,-18.9) | 0.45-0.55 | 0.80 | 0.80 | 0.36 | #4 0.43, #5 0.01 |

Dominant lamp #53 (11,2.4,-17.76) R 3.14 i 0.06:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R3[5] (11, -17.2) | 0.4-0.55 | 0.75 | 0.74 | 0.58 | #53 0.30, #25 0.25 |

Dominant lamp #30 (21.3,5.58,-11.8) R 6.3 i 1.123:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R3[6] (22.6, -12) | 0.4-0.55 | 0.89 | 0.89 | 0.47 | #30 0.62 |
| edge | R3[7] (23.3, -10.4) | 0.4-0.55 | 0.56 | 0.56 | 0.81 | #30 0.32 |

Dominant lamp #24 (22.6,5,-9.25) R 2.5 i 0.349:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R3[8] (22.6, -9.55, 3) | 0.4-0.55 | 1.00 | 3.58 | 0.10 | #24 3.37 |
| **RED** | crane walkway: east end (22.6,3,-9.55) | 0.45-0.55 | 1.00 | 3.58 | 0.10 | #24 3.37 |

Dominant lamp #22 (8.6,5,-9.25) R 2.12 i 0.365:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R3[9] (8.6, -9.55, 3) | 0.4-0.55 | 1.00 | 3.92 | 0.09 | #22 3.53 |
| **RED** | crane walkway: west end (8.6,3,-9.55) | 0.45-0.55 | 1.00 | 3.92 | 0.09 | #22 3.53 |

Dominant lamp #52 (6.65,4.55,-10) R 2 i 0.732:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R3[10] (7, -9.6, 3) | 0.4-0.55 | 1.00 | 4.89 | 0.09 | #52 3.94 |
| **RED** | void: the catwalk opening (7.6,3,-9.6) | 0.45-0.55 | 1.00 | 2.44 | 0.18 | #52 1.66, #22 0.01 |

Dominant lamp #51 (3.1,4.55,-10) R 2.89 i 0.623:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R3[11] (2.6, -9.95, 3) | 0.4-0.55 | 1.00 | 4.29 | 0.10 | #51 3.53 |
| **RED** | void: opening over the mess (h2) (2.6,3,-10) | 0.45-0.55 | 1.00 | 4.30 | 0.10 | #51 3.55 |

Dominant lamp #44 (4.5,2.75,-9.8) R 4.14 i 0.861:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R3[12] (2.6, -10.2) | 0.4-0.55 | 1.00 | 1.66 | 0.23 | #44 0.84, #42 0.24, #51 0.10 |
| **RED** | takedown 4 officer (2.6,0,-9.9) | 0.4-0.55 | 1.00 | 1.75 | 0.22 | #44 0.87, #51 0.37 |
| **RED** | mess: under the hatch (2.6,0,-10.3) | 0.45-0.55 | 1.00 | 1.68 | 0.23 | #44 0.83, #42 0.30, #51 0.08 |

Dominant lamp #5 (11.25,2.3,-22.3) R 5.76 i 0.242:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | takedown 1 officer (9,0,-22.4) | 0.4-0.55 | 0.56 | 0.56 | 0.68 | #5 0.18, #4 0.04 |

Dominant lamp #3 (-5,3,-18.45) R 5.59 i 0.248:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | takedown 2 grunt (-6.5,0,-19.9) | 0.4-0.55 | 0.57 | 0.57 | 0.69 | #3 0.23 |
| **RED** | entry: the entrance door (-5.6,0,-18.9) | 0.45-0.55 | 1.00 | 1.02 | 0.25 | #3 0.67 |

Dominant lamp #41 (0,2.75,-12.3) R 2.84 i 0.314:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | corridor: middle (0,0,-12.3) | 0.4-0.55 | 1.00 | 2.14 | 0.18 | #41 1.63, #40 0.09, #42 0.01 |

Dominant lamp #28 (10.7,5.58,-11.8) R 5.43 i 0.921:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | workshop: the bench (12.5,0,-13.2) | 0.4-0.55 | 0.57 | 0.57 | 0.81 | #28 0.25, #25 0.06, #29 0.03 |

Dominant lamp #29 (16,5.58,-11.8) R 6.83 i 1.376:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | workshop: the lathe (17,0,-10.8) | 0.4-0.55 | 0.39 | 0.39 | 1.32 | #29 0.25 |

Dominant lamp #23 (15.6,5,-9.25) R 2.31 i 0.303:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | crane walkway: middle (15.6,3,-9.55) | 0.4-0.55 | 1.00 | 3.10 | 0.12 | #23 2.93 |

Dominant lamp #45 (-5.3,4.55,-12.3) R 2.53 i 0.513:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | void: opening over the corridor (h1) (-5.6,3,-12.3) | 0.45-0.55 | 1.00 | 4.48 | 0.10 | #45 3.90 |

## Part S2 - section 2 (storage hall) at night
Branch `feature/sector-redesign-lr16w-s2` off `67f3661a`. Files: `src/world/maps/warehouseS2.ts:135-146` (`S2_LAMPS`) and
`src/world/maps/warehouseSectors.ts:87-150` (section 2: guards `:104-121`, routes `:127-149`). Owns: S2's 37 hall / cage
stealth reds and the 4 lit-enough lows. Not yours: the C2-lobby points (S1) and the C3-office points (S3) in the table;
keep your lamps' change at them within +-0.02, in particular #55 / #56 at (-14.5, -5.4) and #70 at the C3 near door (-3.6,
14.55) (#70 gives it 0.09 now). Do not touch: other sections' lamps; the exit sign positions.

Cluster plan (start here, measure, adjust):
- **Strip #61** (-21.4, 5.8, 6.9) i 1.166, northA `:139` (lead decision 4: part A freed it; it lit through a 0.12 m rail
  before): R1[9] 0.92, A1 north end 0.93, cross aisle west 0.90 / middle 0.62, A2 middle 0.61, R2[14] (-23.45, 7.4, 4)
  1.00, R2[15] (-23.45, 6.4, 5 -> feet 3) 1.00. L1 alone to about 0.33x (i about 0.39) predicts 0.47-0.52 at all seven
  from the decomposition (R2[14] scale 0.37, R2[15] 0.31, R1[9] 0.45 with #61 0.59 of its 0.68 direct). Prefer L1 here: a
  beam would take R2[14] / R2[15] (the W0 rack top and the main's west end) out of its cone and leave them dark.
- **The cage and A1's north strip** (#71 (-22.2, 5.8, 14.4) i 0.653, #72 (-22.2, 5.8, 16.2) i 0.452 `:143`; #63 (-21.4,
  5.8, 13.5) i 0.572 `:139`): the case (WORK 0.55-0.8), the e2e stand, the cage floor (WORK), issue gate (KEY 0.45-0.55),
  south gate, R1[4]-R1[8], R2[9]-R2[12], R3[7]-R3[11], takedown 3 (-21.4, 11) 0.87, ladder foot of the cage stock ladder
  (KEY) (scale 0.29-0.68). The cage is the high-value store: lit at the issue shelf, dim elsewhere. #71: the shelf light,
  L3 over the case shelf (about (-22.8, 15.0)) with L2 beam about 0.45 rad and L1 so the case reads 0.6-0.7 and the stand
  0.5-0.75; #72 L1 to about 0.3x or dead; #63 L1 to about 0.4x. Then the gates and route points sit in the shelf pool's rim.
- **The W0 / R1N rack tops (hard)**: R2[13] = "rack top: W0N" (-23.45, 11.4, 4) 0.38 (low now), R3[4] (-18.2, 13.4, 4) 0.39
  (edge). They get 0.10 / 0.07 from #63 / #71 at a grazing angle (the chest is 0.8 m under the strips) and lose it when the
  cage dims. Find them a source that does not light the cage floor: a dead northB fitting turned on (#67 (-16.2, 12.9),
  `:140`) at low intensity, or #63's L3 position nudged west (it must keep the cage south gate <= 0.55). If neither reaches
  0.38-0.55 without breaking a passing point, report a C-entry with the best value (lead / Michael call).
- **Strip #62** (-12, 5.8, 6.9) i 0.638 (northA): R1[10] 0.58, R2[3] 0.59, cross aisle east 0.58 (scale 0.77); low edges
  beside it: "ladder foot: R2N" (-14.65, 6.4) 0.44 (KEY), takedown 6 (-14.6, 5.5) 0.42, east gangway middle 0.38 (low).
  L3 shift the x -12 column of northA (#62 and #64 together) about 1 m west, toward the R2N ladder, then L1: the A3 points
  drop, the ladder foot and takedown 6 rise. Measure against L1 alone (0.8x), which drops the ladder foot under KEY.
- **Strip #65** (-16.2, 5.8, 9.6) i 0.474 (northB `:140`): R2[6] (-14.9, 10, 4) 1.00 (the R2N rack top, 1.36 m plan from the
  strip) while R2[7] (-18.3, 10, 4) reads 0.56 (2.1 m). L3 move the x -16.2 column (#65, #67, #69) to x -16.6 / -16.7 (over
  aisle A2's centre line, where the south rows already sit at -16.7): the two rack tops become equidistant (about 1.75 m)
  and both land near 0.5 at about 0.5x. A beam does not work here (it would also cut R2[7] to about 0.29).
- **#64 / #69 / #70 (north strips)**: R1[11] / R3[13] (-12, 15.5) 0.68, R3[12] (-17, 15.6) 0.68, R3[7] / R3[11] (-19.2, 16.5)
  0.80, R2[17] (-6, 15.2, 5 -> feet 3) 0.88. L1 #69 to about 0.55x, #64 to about 0.65x (after the column moves above).
  R2[17] is the main's north grip over the drop to (-6, 15.2), 1.6 m from #70: L4 move the drop (R2[16]'s main ends at the
  grip: R2[17] and R2[18] together) about 1 m south along the main (z about 14.2) instead of dimming #70 (the C3 near door
  depends on #70). Watch north gangway middle 0.42, A3 north half 0.55, takedown 2 0.54, R*[13] / R*[15] / R*[19] (-4.8,
  14.55) 0.54, takedown 8 0.55, A2 north half 0.55.
- **A1 / lane** (#54 (-21.5, 5.8, -4.6) i 0.577 LANE 30 degree cone `:137`; #57 (-21.4, 5.8, 1.9) i 0.693 SOUTH 50 degree
  `:138`): "A1: the south mouth" (-21.4, -2.5) 0.31 (LR16g C3; the mouth is 27 degrees off #54's axis, at its feathered edge)
  and A1 middle 0.74. L2 widen #54's beam to about 0.6 rad (the 5th tuple element) so the mouth is inside it; R1[2] (-22.1,
  -5.4) and the lane west end are 13 degrees off axis and barely move; then L1 #57 to about 0.6x for A1 middle. Do not
  move the lane row (#56 lights the C2 far door, S1's point). Watch lane west end 0.53, lane middle 0.54, takedown 1 0.55,
  R1[2] 0.52, A2 south mouth 0.39 (#55).
- **East gangway middle** (-6, 5.5) 0.38 low: #66 (-7.2, 5.8, 9.6) gives 0.13, #60 (-7.2, 5.8, 1.9) is a near-dead 0.073
  over takedown 5's pocket (+0.05 now: at its limit, do not raise #60). Raise #66 (L1 about 1.3x) once R*[13] / R*[19] have
  room (they take 0.09 from #66), or L2 a wide beam on #66; measure.

Tests: Step 0, then the acceptance list. Own file: `warehouseS2Light` green except the 12 points S1 / S3 own (they must not
move by more than +-0.02 from your lamps: check the print diff). All S1 / S3 points within +-0.02.

Light parity (S2): map data only (intensity, beam, row / column positions, the R2 drop point); the picture, the meter and
the guards read the same bake and registry. A beam is the same `cone` for the lamp shader and the field (`coneParams`).

Red and edge points, grouped by dominant lamp (base `67f3661a`; rows owned by S1 are the C2-lobby rows under #33, rows
owned by S3 are the office rows under #111 / #112):

Dominant lamp #33 (-13.85,2.95,-7.4) R 5.65 i 0.313:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[0] (-14.5, -7.2) | 0.4-0.55 | 1.00 | 1.40 | 0.28 | #33 1.03 |
| **RED** | R1[1] (-14.5, -5.4) | 0.4-0.55 | 0.57 | 0.57 | 0.79 | #33 0.24, #56 0.10, #55 0.01 |
| **RED** | R2[0] (-14.5, -7.2) | 0.4-0.55 | 1.00 | 1.40 | 0.28 | #33 1.03 |
| **RED** | R2[1] (-14.5, -5.4) | 0.4-0.55 | 0.57 | 0.57 | 0.79 | #33 0.24, #56 0.10, #55 0.01 |
| **RED** | R3[0] (-14.5, -7.2) | 0.4-0.55 | 1.00 | 1.40 | 0.28 | #33 1.03 |
| **RED** | R3[1] (-14.5, -5.4) | 0.4-0.55 | 0.57 | 0.57 | 0.79 | #33 0.24, #56 0.10, #55 0.01 |
| **RED** | entry: the C2 far door (from the lobby) (-14.5,0,-5.4) | 0.45-0.55 | 0.57 | 0.57 | 0.79 | #33 0.24, #56 0.10, #55 0.01 |

Dominant lamp #63 (-21.4,5.8,13.5) R 7.64 i 0.572:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[4] (-22.4, 11.2) | 0.4-0.55 | 0.65 | 0.65 | 0.68 | #63 0.23, #61 0.19 |
| **RED** | R1[5] (-22.4, 12.7) | 0.4-0.55 | 1.00 | 1.07 | 0.38 | #63 0.32, #71 0.28, #72 0.09 |
| **RED** | R1[7] (-22.4, 12.7) | 0.4-0.55 | 1.00 | 1.07 | 0.38 | #63 0.32, #71 0.28, #72 0.09 |
| **RED** | R1[8] (-22.4, 11.2) | 0.4-0.55 | 0.65 | 0.65 | 0.68 | #63 0.23, #61 0.19 |
| **RED** | R2[9] (-20.4, 13.5) | 0.4-0.55 | 1.00 | 1.08 | 0.35 | #63 0.33, #71 0.26, #72 0.11 |
| **RED** | R2[11] (-22.6, 12.8) | 0.4-0.55 | 1.00 | 1.03 | 0.39 | #63 0.31, #71 0.29, #72 0.10 |
| **RED** | R2[12] (-23.45, 12.7) | 0.4-0.55 | 0.72 | 0.72 | 0.60 | #63 0.25, #71 0.25, #72 0.05 |
| **RED low** | R2[13] (-23.45, 11.4, 4) | 0.4-0.55 | 0.38 | 0.38 | 1.39 | #63 0.10, #71 0.07, #61 0.01 |
| edge | R3[4] (-18.2, 13.4, 4) | 0.4-0.55 | 0.39 | 0.39 | 1.36 | #63 0.07, #69 0.05, #71 0.02 |
| **RED** | takedown 3 officer (-21.4,0,11) | 0.4-0.55 | 0.87 | 0.87 | 0.48 | #63 0.23, #61 0.23, #71 0.13 |
| **RED** | ladder foot: the cage stock ladder (-23.45,0,12.6) | 0.45-0.55 | 0.72 | 0.72 | 0.60 | #63 0.25, #71 0.24, #72 0.06 |
| **RED** | the cage: the floor (-21.4,0,14) | 0.45-0.8 | 1.00 | 1.28 | 0.29 | #63 0.35, #71 0.34, #72 0.16 |
| **RED** | the cage: the south gate (-21.4,0,12.6) | 0.4-0.55 | 1.00 | 1.10 | 0.37 | #63 0.34, #71 0.26, #61 0.10 |
| **RED low** | rack top: W0N (the cage stock ladder) (-23.45,4,11.4) | 0.4-0.55 | 0.38 | 0.38 | 1.39 | #63 0.10, #71 0.07, #61 0.01 |

Dominant lamp #71 (-22.2,5.8,14.4) R 5.2 i 0.653:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[6] (-22.1, 15) | 0.45-0.8 | 1.00 | 1.30 | 0.30 | #71 0.36, #63 0.29, #72 0.23 |
| **RED** | R2[10] (-22.1, 15) | 0.45-0.8 | 1.00 | 1.30 | 0.30 | #71 0.36, #63 0.29, #72 0.23 |
| **RED** | R3[9] (-22.1, 15) | 0.45-0.8 | 1.00 | 1.30 | 0.30 | #71 0.36, #63 0.29, #72 0.23 |
| **RED** | objective: the case (-23,0,15) | 0.55-0.8 | 1.00 | 1.23 | 0.32 | #71 0.34, #63 0.25, #72 0.21 |
| **RED** | objective: the e2e stand point (-22.1,0,15) | 0.45-0.8 | 1.00 | 1.30 | 0.30 | #71 0.36, #63 0.29, #72 0.23 |

Dominant lamp #61 (-21.4,5.8,6.9) R 6.4 i 1.166:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[9] (-21.6, 5.5) | 0.4-0.55 | 0.92 | 0.92 | 0.45 | #61 0.59, #57 0.06, #63 0.02 |
| **RED** | R2[14] (-23.45, 7.4, 4) | 0.4-0.55 | 1.00 | 1.09 | 0.37 | #61 0.70 |
| **RED** | R2[15] (-23.45, 6.4, 5) | 0.4-0.55 | 1.00 | 1.28 | 0.31 | #61 1.04, #63 0.01, #65 0.01 |
| **RED** | A1: the north end (-21.4,0,9) | 0.4-0.55 | 0.93 | 0.93 | 0.44 | #61 0.50, #63 0.11, #71 0.03 |
| **RED** | cross aisle: west (-21,0,5.5) | 0.4-0.55 | 0.90 | 0.90 | 0.46 | #61 0.59, #57 0.06, #63 0.02 |
| **RED** | cross aisle: middle (-17,0,5.5) | 0.4-0.55 | 0.62 | 0.62 | 0.72 | #61 0.15, #65 0.09, #62 0.09 |
| **RED** | A2: the middle (-16.7,0,5.5) | 0.4-0.55 | 0.61 | 0.61 | 0.73 | #61 0.13, #62 0.10, #65 0.09 |

Dominant lamp #62 (-12,5.8,6.9) R 9 i 0.638:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[10] (-12, 5.5) | 0.4-0.55 | 0.58 | 0.58 | 0.78 | #62 0.34, #59 0.05 |
| **RED** | R2[3] (-12, 5.8) | 0.4-0.55 | 0.59 | 0.59 | 0.77 | #62 0.37, #59 0.03 |
| edge | takedown 2 grunt (-11.6,0,10.5) | 0.4-0.55 | 0.54 | 0.54 | 0.85 | #62 0.18, #64 0.15 |
| edge | takedown 6 grunt (-14.6,0,5.5) | 0.4-0.55 | 0.42 | 0.42 | 1.20 | #62 0.22, #61 0.04 |
| **RED** | cross aisle: east (-12,0,5.5) | 0.4-0.55 | 0.58 | 0.58 | 0.78 | #62 0.34, #59 0.05 |
| edge | ladder foot: R2N (cross aisle) (-14.65,0,6.4) | 0.45-0.55 | 0.44 | 0.44 | 1.11 | #62 0.24, #61 0.05 |

Dominant lamp #64 (-12,5.8,13.5) R 5.78 i 0.524:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[11] (-12, 15.5) | 0.4-0.55 | 0.68 | 0.68 | 0.64 | #64 0.22, #69 0.14, #70 0.08 |
| **RED** | R3[13] (-12, 15.5) | 0.4-0.55 | 0.68 | 0.68 | 0.64 | #64 0.22, #69 0.14, #70 0.08 |
| edge | A3: the north half (-12,0,11) | 0.4-0.55 | 0.55 | 0.55 | 0.83 | #64 0.19, #62 0.15 |

Dominant lamp #70 (-7.2,5.8,16.2) R 9 i 0.464:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | R1[13] (-4.8, 14.55) | 0.4-0.55 | 0.54 | 0.54 | 0.85 | #70 0.16, #66 0.09, #74 0.07 |
| **RED** | R2[17] (-6, 15.2, 5) | 0.4-0.55 | 0.88 | 0.87 | 0.48 | #70 0.63, #66 0.04, #64 0.01 |
| edge | R2[18] (-6, 15.2) | 0.4-0.55 | 0.55 | 0.55 | 0.84 | #70 0.24, #66 0.08, #69 0.01 |
| edge | R2[19] (-4.8, 14.55) | 0.4-0.55 | 0.54 | 0.54 | 0.85 | #70 0.16, #66 0.09, #74 0.07 |
| edge | R3[15] (-4.8, 14.55) | 0.4-0.55 | 0.54 | 0.54 | 0.85 | #70 0.16, #66 0.09, #74 0.07 |
| edge | takedown 8 grunt (-6,0,16.2) | 0.4-0.55 | 0.55 | 0.55 | 0.83 | #70 0.26, #66 0.05, #69 0.01 |
| edge | north gangway: the middle (-9,0,15.5) | 0.4-0.55 | 0.42 | 0.42 | 1.19 | #70 0.22, #69 0.04 |

Dominant lamp #112 (0.5,2.95,13.5) R 5.49 i 0.45:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[14] (-1, 15) | 0.4-0.55 | 1.00 | 1.24 | 0.32 | #112 0.39, #111 0.25, #114 0.21 |
| **RED** | R2[20] (-1, 15) | 0.4-0.55 | 1.00 | 1.24 | 0.32 | #112 0.39, #111 0.25, #114 0.21 |
| **RED** | R3[16] (-1, 15) | 0.4-0.55 | 1.00 | 1.24 | 0.32 | #112 0.39, #111 0.25, #114 0.21 |
| **RED** | connector: C3 checkpoint (-1.2,0,14.8) | 0.45-0.55 | 1.00 | 1.26 | 0.31 | #112 0.38, #111 0.34, #114 0.17 |

Dominant lamp #56 (-12.5,5.8,-4.6) R 6.04 i 0.646:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | R2[2] (-12, -5.4) | 0.4-0.55 | 0.54 | 0.54 | 0.87 | #56 0.35 |

Dominant lamp #65 (-16.2,5.8,9.6) R 7.91 i 0.474:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | R2[5] (-14.65, 7.6, 4) | 0.4-0.55 | 0.56 | 0.56 | 0.82 | #65 0.15, #62 0.15 |
| **RED** | R2[6] (-14.9, 10, 4) | 0.4-0.55 | 1.00 | 1.16 | 0.35 | #65 0.82, #62 0.02, #64 0.01 |
| edge | R2[7] (-18.3, 10, 4) | 0.4-0.55 | 0.56 | 0.56 | 0.82 | #65 0.27, #61 0.03, #63 0.01 |
| edge | A2: the north half (-16.7,0,10) | 0.4-0.55 | 0.55 | 0.55 | 0.84 | #65 0.29, #69 0.06 |

Dominant lamp #69 (-16.2,5.8,16.2) R 9 i 0.627:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | R3[6] (-18.75, 15.5) | 0.4-0.55 | 0.56 | 0.56 | 0.82 | #69 0.24, #72 0.09 |
| **RED** | R3[7] (-19.2, 16.5) | 0.4-0.55 | 0.80 | 0.80 | 0.53 | #69 0.21, #63 0.13, #72 0.12 |
| **RED** | R3[11] (-19.2, 16.5) | 0.4-0.55 | 0.80 | 0.80 | 0.53 | #69 0.21, #63 0.13, #72 0.12 |
| **RED** | R3[12] (-17, 15.6) | 0.4-0.55 | 0.68 | 0.68 | 0.64 | #69 0.37, #65 0.05, #72 0.03 |

Dominant lamp #72 (-22.2,5.8,16.2) R 5.3 i 0.452:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R3[8] (-20.6, 16.5) | 0.4-0.55 | 1.00 | 1.01 | 0.40 | #72 0.20, #71 0.20, #63 0.18 |
| **RED** | R3[10] (-20.6, 16.5) | 0.4-0.55 | 1.00 | 1.01 | 0.40 | #72 0.20, #71 0.20, #63 0.18 |
| **RED** | the cage: the issue gate (-20.6,0,16.5) | 0.45-0.55 | 1.00 | 1.01 | 0.40 | #72 0.20, #71 0.20, #63 0.18 |

Dominant lamp #54 (-21.5,5.8,-4.6) R 8.1 i 0.577:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | takedown 1 grunt (-21.6,0,-5) | 0.4-0.55 | 0.55 | 0.55 | 0.84 | #54 0.36 |
| **RED low** | A1: the south mouth (-21.4,0,-2.5) | 0.4-0.55 | 0.31 | 0.31 | 1.93 | #54 0.12, #57 0.03 |

Dominant lamp #111 (-2.5,2.95,13.5) R 4.25 i 0.307:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | connector: C3 near door (-3.6,0,14.55) | 0.45-0.55 | 0.87 | 0.87 | 0.48 | #111 0.40, #70 0.09, #112 0.08 |
| edge | connector: C3 far door (-0.5499999999999999,0,12) | 0.45-0.55 | 0.54 | 0.54 | 0.85 | #111 0.19, #88 0.14, #114 0.00 |

Dominant lamp #55 (-17,5.8,-4.6) R 5.89 i 0.609:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | lane: the middle (-16.5,0,-4.6) | 0.4-0.55 | 0.54 | 0.54 | 0.85 | #55 0.35 |
| edge | A2: the south mouth (-16.7,0,-3) | 0.4-0.55 | 0.39 | 0.39 | 1.31 | #55 0.23 |

Dominant lamp #57 (-21.4,5.8,1.9) R 6.61 i 0.693:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | A1: the middle (-21.4,0,3) | 0.4-0.55 | 0.74 | 0.74 | 0.58 | #57 0.37, #61 0.12, #65 0.01 |

Dominant lamp #59 (-12,5.8,1.9) R 5.56 i 0.618:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | A3: the middle (-12,0,0.5) | 0.4-0.55 | 0.55 | 0.55 | 0.84 | #59 0.29, #62 0.06 |

Dominant lamp #66 (-7.2,5.8,9.6) R 9 i 0.651:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED low** | east gangway: the middle (-6,0,5.5) | 0.4-0.55 | 0.38 | 0.38 | 1.39 | #66 0.13, #62 0.06, #70 0.00 |

## Part S3 - section 3 (assembly hall and mezzanine) at night
Branch `feature/sector-redesign-lr16w-s3` off `67f3661a`. Files: `src/world/maps/warehouseS3.ts:127-148` (`S3_LAMPS`), the
stores-cage lines `:330-339` (occluder only), `src/world/maps/warehouseSectors.ts:151-208` (section 3: guards `:161-180`,
routes `:185-207`), and `tests/warehouseS3Light.test.ts:94-101` only for a pocket that names a guard you moved (L6).
Owns: S3's 67 stealth reds, the C3 far doorway low, the stores officer's dark pocket, the three +0.05 pockets, and the C3
office on both sides: S2's R1[14] R2[20] R3[16] (-1, 15), S2's "connector: C3 checkpoint" (-1.2, 14.8) and "connector: C3
near door" (-3.6, 14.55) (S2 keeps #70's change there within +-0.02). A new lamp in S3 only at the end of `S3_LAMPS`' last
room (ids after #132; none of the `lampBoxAlign` keys move). Do not touch: other sections' lamps.

Cluster plan (start here, measure, adjust):
- **The C3 office** (#111 (-2.5, 2.95, 13.5) i 0.307, #112 (0.5, ...) i 0.45, #114 (0.5, 2.95, 16.5) i 0.278, #113 dead;
  `:134`): S3 R*[0] (-1.2, 14.8), R*[1] (-0.95, 12.6), R3[1] (1, 16.05), C3 checkpoint; S2's five (scale 0.25-0.48). L1 the
  office to its night level, about 0.3x, tuned so the checkpoint and the S2 points read 0.47-0.52 (band middle: INT
  re-checks them after S2's #70 change lands) and the near door (-3.6, 14.55) >= 0.47 (it has #70's 0.09).
- **The C3 far doorway** (-0.95, 0, 11.2) KEY, 0.42 (low, new with part A); R1[2] / R2[2] at the same spot 0.42 (READ):
  only hall strip #88 (-2.8, 5.8, 9.4) reaches it (0.22), and #88 also lights R2[3] (-3, 9) 0.54. Either L4 move R2[3]
  about 0.8 m west / south off #88 and L1 #88 about 1.2x, or a door light over the doorway on the hall side (appended
  lamp: a wall bulkhead about 2.4 m up on the office's south wall face (z about 12.4, the light point >= 0.12 m off the
  face: the `lampBoxAlign` audit), facing -z with a forward-down cone like S1's WALL_S (`makeCone(0, -0.819, -0.574, 0.96)`), radius about 1.5, low i): the
  wall keeps it off R*[1] inside. Target 0.47-0.52.
- **Deck strips** (#100 (14.5, 5.8, 13.2) i 0.521, #101 (17.25) i 0.287, #102 (20) i 0.216, the rest dead; `:130`; deck 3.3,
  heads 0.9 m under): R1[8]-R1[10], R1[16], R1[17], R2[13]-R2[15], R2[21]-R2[23], "the window, outside" (scale 0.20-0.36).
  L1 the deck row to about 0.25-0.3x. A beam barely helps (bodies are near level with the strips).
- **The production office on the deck** (#120 (17.85, 5.75, 15.7) i 0.278, #121 (20.4) 0.282, #122 (22.95) 0.25, #123
  (17.85, 5.75, 16.95) 0.578, #125 (22.95, 5.75, 16.95) 0.626, #124 dead; `:137`; floor 3.3, heads 0.85 m under): the clerk
  (WORK), the terminal (WORK), the objective R1[13] / R2[18] / R3[14] (23.3, 17.3, 3.3) (WORK), R1[11] R1[12] R1[14] R1[15]
  R2[16]-R2[20] R3[13] R3[15], the grille (KEY) (scale 0.08-0.21). An office at night: desk lights on the clerk's and the
  terminal's desks, the rest low. #123 and #125: L2 beam about 0.45 rad and L1 to about 0.1x (the clerk, the terminal and
  the objective 0.6-0.75); the z 15.7 row (#120-#122) L1 to about 0.1x as fill so the route points and the grille read
  0.45-0.52.
- **Plant room** (#126 (18, 3.55, -3.3) i 1.296, #127 (20) 1.143, #128 (22) 1.366; `:139`; ceiling 3.6): the engineer's panel
  (WORK), R3[11] R3[12] R3[16] R3[17], "plant room west door, inside", the grate (scale 0.08-0.15). L1 all three to about
  0.12-0.15x; #127 over the engineer's panel (19.4, -3) sets his WORK pool (0.6-0.75).
- **Fire lobby and extract** (#129 (18, 2.95, -7.2) i 1.184 radius 2; #130 (21, 2.95, -7.2) dead; exit sign #131 (23.7,
  2.4, -7.2) i 0.71 radius 3.69, `:140-142`; south-wall bulkheads #109 (17, 5, -8.35) i 0.895, #110 (21, 5, -8.35) 1.056
  `:132`): R1[22] / R3[20] / "the lobby" (17.8, -6.6) 4.23 unclamped, R1[23] / R2[29] / R3[21] (22.5, -7.2), the extract
  centre (KEY), the tour guard's spot, R2[9] / R2[27] (16.6, -6.6, 3.2) and R2[28] / the hatch edge (21.7, -7.2, 3.2) on the
  lobby roof. The exit sign is lit like a flood (0.71, reach 5.9 m): L1 it to a sign (radius 0.6, i about 0.15, as S2's).
  The lobby: L3 light the dead #130 and L1 both to about 0.07x, so the lobby, the extract and the tour guard's spot share
  one flat low level (0.47-0.52). #109 / #110 (over the lobby roof, heads 0.2 m under): L1 to about 0.1x.
- **South wall over the walkway** (#104 (-3, 5, -8.35) i 0.399; #106 (5) 0.337; #108 (13) 0.438; `:132`): R2[6] (-3.2, -8, 3)
  1.00 (scale 0.11), R2[8] (12, -8, 3) 0.57 (0.80), edge R2[7] (4, -8, 3) 0.55. L1 #104 about 0.11x, #108 about 0.8x. Watch
  the walkway ladder foot (-3.4, -6.9) 0.46 (KEY; #76).
- **#80** (18.26, 5.8, -2.6) i 0.294 (`:129`): R2[10] / R2[11] / R2[26] (17, -2.1, 3.8 / grip 5.8) 0.82, R2[25] (17, -1.6, 5.8)
  0.66 (the plant room roof and the main's header). L1 about 0.5x or L2 beam about 0.6 rad. Watch R1[20] (14.9, -0.3) 0.40.
- **Hall row z 3.4 / 9.4** (#84 (7.6, 5.8, 3.4) i 1.429; #90 (7.6, 9.4) 0.517; #91 (12.8, 9.4) 0.502): R3[7] (9.8, 4) 1.00,
  R1[4] (9.6, 7.6) 0.79, R3[6] (9.6, 10.4) 0.72, R1[7] (13.5, 10.8, 2.2) on the forklift 1.00; "the fitter (the press)" (7.6,
  1) WORK 0.79 needs >= 0.55. #84 is the press's pool: keep it (L1 about 0.75x) and L4 R3[7] about 1 m east / north off it.
  #91: L2 beam about 0.5 rad (the forklift top is 39 degrees off its axis, R1[6]'s floor 20). #90 / #91 L1 for R1[4] /
  R3[6].
- **Rooms under the deck**: parts store #115 (10, 2.95, 12.8) i 0.202 (`:135`): R1[5] (10.4, 12.6) 1.00 (scale 0.34) and the
  supervisor's pocket +0.053: L1 about 0.35x fixes both. Manager #119 (5, 2.95, 15) i 0.498 (`:136`): R3[2] 0.70, R3[4]
  0.63, edge R3[3] 0.55: L1 about 0.65x.
- **Pockets** (`warehouseS3Light.test.ts:94-101`): stores officer (0.6, -7.6) 0.39 > 0.30 (LR16g C4: #77 (2.4, 5.8, -2.6)
  0.14, #76 0.06; dimming them breaks the cage counter (WORK), R2[4], R2[5] and the walkway ladder foot). L5: a solid
  sheet-steel top over the stores cage's back half (x 0-3, z -8.65 to about -6.0, y 2.4, on the mesh walls `:331-334`; the
  crane walkway already covers z < -7.45 at 2.9): the strips' rays to the corner cross y 2.4 inside its footprint (from #77
  at about z -6.65), the counter (4.7, -5) is outside it. Realistic: a storage deck over the back racks under the crane.
  Mark it `overhead` / `noLedge`. Crane operator (8, -6.8) +0.12, named "under the walkway" but 0.65 m north of the
  walkway's edge (z -7.45): L6 move his post, route start and takedown spot to about (8, -7.6), under the walkway (clear of
  the die rack at x 10.2-11.8), and the test pocket with it. East bay (21, 1.5) +0.14: #86 (18, 5.8, 3.4) gives 0.08: L2 beam
  about 0.55 rad on #86 (the pocket is 40 degrees off its axis, R1[19] (18.6, 4) 11), keeping R1[19] >= 0.4.

Tests: Step 0, then the acceptance list. Own file: `warehouseS3Light` all green. Owned S2 points (the 5) green in
`warehouseS2Light`'s print; every other S1 / S2 point within +-0.02. `tests/sectors.test.ts` (M8) for the L6 move.

Light parity (S3): map data only. The occluder is a rendered box in the light set: the picture shadows the corner as the
meter and the guards do. The beams are the lamps' `cone` for shader and field alike. An appended door light is a normal
baked lamp (shader, meter and guards).

Red and edge points, grouped by dominant lamp (base `67f3661a`):

Dominant lamp #112 (0.5,2.95,13.5) R 5.49 i 0.45:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[0] (-1.2, 14.8) | 0.4-0.55 | 1.00 | 1.26 | 0.31 | #112 0.38, #111 0.34, #114 0.17 |
| **RED** | R1[1] (-0.95, 12.6) | 0.4-0.55 | 1.00 | 1.34 | 0.29 | #112 0.58, #111 0.36, #114 0.01 |
| **RED** | R2[0] (-1.2, 14.8) | 0.4-0.55 | 1.00 | 1.26 | 0.31 | #112 0.38, #111 0.34, #114 0.17 |
| **RED** | R2[1] (-0.95, 12.6) | 0.4-0.55 | 1.00 | 1.34 | 0.29 | #112 0.58, #111 0.36, #114 0.01 |
| **RED** | R3[0] (-1.2, 14.8) | 0.4-0.55 | 1.00 | 1.26 | 0.31 | #112 0.38, #111 0.34, #114 0.17 |
| **RED** | connector: C3 checkpoint (-1.2,0,14.8) | 0.45-0.55 | 1.00 | 1.26 | 0.31 | #112 0.38, #111 0.34, #114 0.17 |

Dominant lamp #88 (-2.8,5.8,9.4) R 9 i 0.552:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | R1[2] (-0.95, 11.2) | 0.4-0.55 | 0.42 | 0.42 | 1.19 | #88 0.22 |
| edge | R2[2] (-0.95, 11.2) | 0.4-0.55 | 0.42 | 0.42 | 1.19 | #88 0.22 |
| edge | R2[3] (-3, 9) | 0.4-0.55 | 0.54 | 0.54 | 0.85 | #88 0.35 |
| **RED low** | connector: C3 far doorway outside (-0.95,0,11.2) | 0.45-0.55 | 0.42 | 0.42 | 1.19 | #88 0.22 |

Dominant lamp #84 (7.6,5.8,3.4) R 6.39 i 1.429:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[4] (9.6, 7.6) | 0.4-0.55 | 0.79 | 0.79 | 0.50 | #84 0.21, #90 0.18, #91 0.13 |
| **RED** | R3[7] (9.8, 4) | 0.4-0.55 | 1.00 | 1.08 | 0.37 | #84 0.58, #85 0.14, #91 0.05 |
| edge | the fitter (the press) (7.6,0,1) | 0.55-0.8 | 0.79 | 0.78 | 0.54 | #84 0.55, #79 0.03, #78 0.02 |

Dominant lamp #115 (10,2.95,12.8) R 2.98 i 0.202:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[5] (10.4, 12.6) | 0.4-0.55 | 1.00 | 1.19 | 0.34 | #115 0.76, #91 0.11, #90 0.09 |

Dominant lamp #91 (12.8,5.8,9.4) R 8.3 i 0.502:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | R1[6] (12.4, 10.8) | 0.4-0.55 | 0.57 | 0.56 | 0.81 | #91 0.27, #90 0.06, #115 0.04 |
| **RED** | R1[7] (13.5, 10.8, 2.2) | 0.4-0.55 | 1.00 | 1.19 | 0.34 | #91 0.64, #100 0.22, #92 0.08 |

Dominant lamp #100 (14.5,5.8,13.2) R 3.15 i 0.521:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[8] (13.6, 12.3, 3.3) | 0.4-0.55 | 1.00 | 1.53 | 0.25 | #100 0.94, #91 0.22, #101 0.05 |

Dominant lamp #101 (17.25,5.8,13.2) R 4.04 i 0.287:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[9] (16.6, 12.4, 3.3) | 0.4-0.55 | 1.00 | 1.32 | 0.30 | #101 0.69, #100 0.28, #123 0.01 |
| **RED** | R1[10] (17, 13.8, 3.3) | 0.4-0.55 | 1.00 | 1.94 | 0.20 | #101 1.26, #100 0.17, #123 0.07 |
| **RED** | R1[16] (17, 13.8, 3.3) | 0.4-0.55 | 1.00 | 1.94 | 0.20 | #101 1.26, #100 0.17, #123 0.07 |
| **RED** | R2[13] (17, 12.4, 5) | 0.4-0.55 | 1.00 | 1.11 | 0.36 | #101 0.54, #100 0.15, #92 0.04 |
| **RED** | R2[14] (17, 12.4, 3.3) | 0.4-0.55 | 1.00 | 1.11 | 0.36 | #101 0.54, #100 0.15, #92 0.04 |
| **RED** | R2[22] (17, 12.4, 3.3) | 0.4-0.55 | 1.00 | 1.11 | 0.36 | #101 0.54, #100 0.15, #92 0.04 |
| **RED** | R2[23] (17, 12.4, 5) | 0.4-0.55 | 1.00 | 1.11 | 0.36 | #101 0.54, #100 0.15, #92 0.04 |

Dominant lamp #123 (17.85,5.75,16.95) R 5.28 i 0.578:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[11] (17, 15.3, 3.3) | 0.4-0.55 | 1.00 | 1.86 | 0.21 | #123 0.64, #120 0.39, #101 0.24 |
| **RED** | R1[15] (17, 15.3, 3.3) | 0.4-0.55 | 1.00 | 1.86 | 0.21 | #123 0.64, #120 0.39, #101 0.24 |
| **RED** | the clerk (18.6,3.3,17.1) | 0.55-0.8 | 1.00 | 3.24 | 0.11 | #123 2.24, #120 0.17, #121 0.14 |

Dominant lamp #122 (22.95,5.75,15.7) R 1.84 i 0.25:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[12] (22.9, 15.6, 3.3) | 0.4-0.55 | 1.00 | 3.69 | 0.10 | #122 1.72, #125 1.12, #121 0.10 |
| **RED** | R1[14] (22.9, 15.6, 3.3) | 0.4-0.55 | 1.00 | 3.69 | 0.10 | #122 1.72, #125 1.12, #121 0.10 |
| **RED** | R2[17] (22.9, 15.6, 3.3) | 0.4-0.55 | 1.00 | 3.69 | 0.10 | #122 1.72, #125 1.12, #121 0.10 |
| **RED** | R2[19] (22.9, 15.6, 3.3) | 0.4-0.55 | 1.00 | 3.69 | 0.10 | #122 1.72, #125 1.12, #121 0.10 |
| **RED** | R3[13] (23.65, 15.42, 3.3) | 0.4-0.55 | 1.00 | 2.44 | 0.15 | #122 0.94, #125 0.73, #121 0.03 |
| **RED** | R3[15] (23.65, 15.3, 3.3) | 0.4-0.55 | 1.00 | 2.23 | 0.17 | #122 0.88, #125 0.64, #121 0.03 |
| **RED** | the grille (23.65,3.3,15.3) | 0.45-0.55 | 1.00 | 2.23 | 0.17 | #122 0.88, #125 0.64, #121 0.03 |

Dominant lamp #125 (22.95,5.75,16.95) R 5.31 i 0.626:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[13] (23.3, 17.3, 3.3) | 0.45-0.8 | 1.00 | 4.48 | 0.08 | #125 3.33, #122 0.22, #121 0.03 |
| **RED** | R2[18] (23.3, 17.3, 3.3) | 0.45-0.8 | 1.00 | 4.48 | 0.08 | #125 3.33, #122 0.22, #121 0.03 |
| **RED** | R3[14] (23.3, 17.3, 3.3) | 0.45-0.8 | 1.00 | 4.48 | 0.08 | #125 3.33, #122 0.22, #121 0.03 |
| **RED** | the terminal (22.4,3.3,17.3) | 0.55-0.8 | 1.00 | 3.97 | 0.09 | #125 2.79, #122 0.20, #121 0.09 |

Dominant lamp #102 (20,5.8,13.2) R 3.4 i 0.216:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[17] (20, 12.3, 3.3) | 0.4-0.55 | 1.00 | 1.11 | 0.36 | #102 0.54, #92 0.18, #101 0.12 |
| **RED** | R2[15] (19.6, 13.9, 3.3) | 0.4-0.55 | 1.00 | 1.47 | 0.27 | #102 0.58, #121 0.20, #101 0.18 |
| **RED** | R2[21] (19.6, 13.9, 3.3) | 0.4-0.55 | 1.00 | 1.47 | 0.27 | #102 0.58, #121 0.20, #101 0.18 |
| **RED** | the window, outside (19.6,3.3,13.9) | 0.45-0.55 | 1.00 | 1.47 | 0.27 | #102 0.58, #121 0.20, #101 0.18 |

Dominant lamp #79 (12.8,5.8,-2.6) R 7.77 i 0.442:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | R1[20] (14.9, -0.3) | 0.4-0.55 | 0.40 | 0.40 | 1.29 | #79 0.14, #85 0.06, #86 0.02 |
| edge | R3[9] (14.9, -4.2) | 0.4-0.55 | 0.55 | 0.55 | 0.79 | #79 0.17, #108 0.09 |

Dominant lamp #129 (18,2.95,-7.2) R 2 i 1.184:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[22] (17.8, -6.6) | 0.4-0.55 | 1.00 | 4.23 | 0.09 | #129 3.68 |
| **RED** | R3[20] (17.8, -6.6) | 0.4-0.55 | 1.00 | 4.23 | 0.09 | #129 3.68 |
| **RED** | the lobby (17.8,0,-6.6) | 0.45-0.55 | 1.00 | 4.23 | 0.09 | #129 3.68 |

Dominant lamp #131 (23.7,2.4,-7.2) R 3.69 i 0.71:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R1[23] (22.5, -7.2) | 0.4-0.55 | 1.00 | 2.00 | 0.19 | #131 1.45 |
| **RED** | R2[29] (22.5, -7.2) | 0.4-0.55 | 1.00 | 2.00 | 0.19 | #131 1.45 |
| **RED** | R3[21] (22.5, -7.2) | 0.4-0.55 | 1.00 | 2.00 | 0.19 | #131 1.45 |
| **RED** | the extract centre (22.55,0,-7.2) | 0.45-0.55 | 1.00 | 2.10 | 0.18 | #131 1.62 |
| **RED** | the tour guard's spot (the lobby) (23,0,-7.9) | 0.4-0.55 | 1.00 | 2.46 | 0.15 | #131 2.03 |

Dominant lamp #104 (-3,5,-8.35) R 1.98 i 0.399:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R2[6] (-3.2, -8, 3) | 0.4-0.55 | 1.00 | 3.40 | 0.11 | #104 3.13, #76 0.03, #77 0.00 |

Dominant lamp #106 (5,5,-8.35) R 3.36 i 0.337:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | R2[7] (4, -8, 3) | 0.4-0.55 | 0.55 | 0.55 | 0.84 | #106 0.26, #77 0.09, #76 0.01 |

Dominant lamp #108 (13,5,-8.35) R 5.68 i 0.438:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R2[8] (12, -8, 3) | 0.4-0.55 | 0.57 | 0.57 | 0.80 | #108 0.34, #79 0.03 |

Dominant lamp #109 (17,5,-8.35) R 2.5 i 0.895:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R2[9] (16.6, -6.6, 3.2) | 0.4-0.55 | 1.00 | 1.86 | 0.19 | #109 1.39, #80 0.03, #79 0.03 |
| **RED** | R2[27] (16.6, -6.6, 3.2) | 0.4-0.55 | 1.00 | 1.86 | 0.19 | #109 1.39, #80 0.03, #79 0.03 |

Dominant lamp #80 (18.26,5.8,-2.6) R 4.5 i 0.294:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R2[10] (17, -2.1, 3.8) | 0.4-0.55 | 0.82 | 0.82 | 0.51 | #80 0.54, #79 0.03, #86 0.00 |
| **RED** | R2[11] (17, -2.1, 5.8) | 0.4-0.55 | 0.82 | 0.82 | 0.51 | #80 0.54, #79 0.03, #86 0.00 |
| **RED** | R2[25] (17, -1.6, 5.8) | 0.4-0.55 | 0.66 | 0.66 | 0.67 | #80 0.40, #79 0.02, #86 0.00 |
| **RED** | R2[26] (17, -2.1, 3.8) | 0.4-0.55 | 0.82 | 0.82 | 0.51 | #80 0.54, #79 0.03, #86 0.00 |

Dominant lamp #121 (20.4,5.75,15.7) R 4.22 i 0.282:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R2[16] (19.6, 15.2, 3.3) | 0.4-0.55 | 1.00 | 1.89 | 0.20 | #121 0.71, #123 0.37, #102 0.17 |
| **RED** | R2[20] (19.6, 15.2, 3.3) | 0.4-0.55 | 1.00 | 1.89 | 0.20 | #121 0.71, #123 0.37, #102 0.17 |

Dominant lamp #110 (21,5,-8.35) R 2.5 i 1.056:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R2[28] (21.7, -7.2, 3.2) | 0.4-0.55 | 1.00 | 2.92 | 0.13 | #110 2.44, #80 0.00 |
| **RED** | the hatch edge (lobby roof) (21.7,3.2,-7.2) | 0.45-0.55 | 1.00 | 2.92 | 0.13 | #110 2.44, #80 0.00 |

Dominant lamp #114 (0.5,2.95,16.5) R 3.45 i 0.278:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R3[1] (1, 16.05) | 0.4-0.55 | 1.00 | 1.57 | 0.25 | #114 0.91, #112 0.25, #111 0.02 |

Dominant lamp #119 (5,2.95,15) R 7 i 0.498:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R3[2] (3, 16.05) | 0.4-0.55 | 0.70 | 0.70 | 0.62 | #119 0.39, #114 0.05 |
| edge | R3[3] (3.2, 13) | 0.4-0.55 | 0.55 | 0.55 | 0.84 | #119 0.29 |
| **RED** | R3[4] (5.15, 12.6) | 0.4-0.55 | 0.63 | 0.63 | 0.71 | #119 0.35, #90 0.01 |

Dominant lamp #90 (7.6,5.8,9.4) R 6.34 i 0.517:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R3[6] (9.6, 10.4) | 0.4-0.55 | 0.72 | 0.72 | 0.60 | #90 0.21, #91 0.15, #115 0.10 |

Dominant lamp #126 (18,3.55,-3.3) R 2.96 i 1.296:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R3[11] (16.9, -3.3) | 0.4-0.55 | 1.00 | 2.73 | 0.14 | #126 2.05, #127 0.06 |
| **RED** | R3[17] (16.9, -3.3) | 0.4-0.55 | 1.00 | 2.73 | 0.14 | #126 2.05, #127 0.06 |
| **RED** | plant room west door, inside (16.9,0,-3.3) | 0.45-0.55 | 1.00 | 2.73 | 0.14 | #126 2.05, #127 0.06 |

Dominant lamp #128 (22,3.55,-3.3) R 3.36 i 1.366:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | R3[12] (22.4, -1.8) | 0.4-0.55 | 1.00 | 2.48 | 0.15 | #128 1.63, #127 0.15 |
| **RED** | R3[16] (22.4, -1.8) | 0.4-0.55 | 1.00 | 2.48 | 0.15 | #128 1.63, #127 0.15 |
| **RED** | the grate (22.4,0,-1.8) | 0.45-0.55 | 1.00 | 2.48 | 0.15 | #128 1.63, #127 0.15 |

Dominant lamp #76 (-2.8,5.8,-2.6) R 7.98 i 1.046:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| edge | walkway ladder foot (-3.4,0,-6.9) | 0.45-0.55 | 0.46 | 0.46 | 1.05 | #76 0.21, #77 0.05 |

Dominant lamp #127 (20,3.55,-3.3) R 2.54 i 1.143:

| | point (feet) | band | now | unclamped | scale to 0.48 | top lamps (contribution) |
| --- | --- | --- | --- | --- | --- | --- |
| **RED** | the engineer's panel (19.4,0,-3) | 0.55-0.8 | 1.00 | 4.85 | 0.08 | #127 2.18, #126 1.60, #128 0.63 |

## Part C2 - Marlow Yard S7 return stair (LR16g C2)
Branch `feature/sector-redesign-lr16w-c2` off `67f3661a`. Files: `src/world/maps/ctcourse.ts` (the S7 block `:589-600`,
one new light next to the stair loop `:597-600`) and `tests/ctcourseLight.tuned.json` (re-take only entries that move).
Red: `ctcourseLight.test.ts:163` "S7 stair step 1 (top)" (142, 3.3, 1.0) 0.31 < 0.33 (no TOL in this file). Steps 2 / 3 read
0.40 (min 0.40, at the edge) / 0.53 (min 0.45).
Why no lamp reaches it (LR16g): the S7 hall pendants hang at y 5 (`:422`, `pendant(x0 + 4 / x0 + 12.5, 5, ...)`), level
with a body on step 1 (head 4.9), so step 1 is at their hemisphere's edge; the S7 wall-top lamp (`S7_TOP_LAMP` `:84`, x0 + 9,
y 7.35, z MID) would need a 6.6 m reach, which lights the ground at (139.5 / 142.5, 1.6, MID) (`:184` asserts 0).
Layout change: a stair light, as any real stair has. One LED wall bulkhead on the south wall over the stair head: light
point about (142, 6.4, wall face + 0.15) (>= 0.12 m off the face for the `lampBoxAlign` audit), a forward-down cone facing
+z (`makeCone(0, -0.819, 0.574, 0.96)`, as the warehouse's WALL_N), radius about 2.5 (reach 4 m: it stops short of the S7
corners at x0 + 9.8 / 15.4, z 0.6 at chest height and of the wall-top test points at z MID), intensity tuned so step 1 reads
>= 0.36 (0.03 margin) and steps 2 / 3 stay in their bands. Fixture: the bulkhead box `{ sx: 0.3, sy: 0.16, sz: 0.07 }`,
`model: 'bulkhead'`, `base: 'wall'` (`lampRooms.ts:47`, `fixtureModels.ts`), colour WHITE, no `group` (as every ctcourse lamp; `flush` / `pendant` `:399-405` set none).
Not in `NEW_LAMPS` (the test's corner check covers only those; the corners must still read <
`LIGHT.lit + 0.05`). Do not move the pendants or the wall-top lamp, and do not change `S7_TOP_LAMP`.
Tuned table: `ctcourseLight.test.ts:259` holds every level within 0.08 of `tuned.json`; re-take only the S7 entries the
stair light moves (old -> new in the report), and add one line to `_note` ("LR16-W: S7 stair light").
Tests: `ctcourseLight`, `ctcourse`, `lampBoxAlign`, `lampAtlasFit`, `lampFlicker`, `lights`; `npx tsc --noEmit`; eslint on the
file. Laptop: `e2e-ctcourse` (`E2E_GPU=1`) and the GPU sheet row "S7 stair from the rope wall's far side" (base / after).
Merge note: `ctcourse.ts` is Marlow Build's map (marlow-final): the change is one additive block; tell the orchestrator so
the train orders it against marlow-final, and rebase over it if marlow-final touched `:585-600`.
Light parity (C2): one baked lamp, so the picture (a visible bulkhead and its pool on the stair), the meter and the guards
agree by construction.

## Part T - campus #81, the audit lists, the lint error
Branch `feature/sector-redesign-lr16w-t` off `67f3661a`. Files: `src/world/maps/campusS4.ts:416`, `tests/lampBoxAlign.test.ts:206-219`,
`tests/torchOcclusion.test.ts` (imports and `:166`).
1. Campus #81 (lead decision 2). The cage downlight (18, 2.8, 37) (`campusS4.ts:493`, group cold2, cone `down`) sits inside
   the visual basket support post at (18, 37): `campusS4.ts:416` boxes a 0.1 x 4.0 x 0.1 steel post from y 0 to 4.0 under
   cable basket B-cage (`S4_BOX.bCage` = x 17.5-18.5, z 34.4-40.8, `:105`), so the post runs through the lamp and down its
   beam. Move the post, not the lamp (the lamp lights the cage; its position is in the cold2 row x 18): in the `:416` list
   replace `[18, 37]` with `[17.55, 37]` (the basket's west rail: a support at the basket edge, as real trapeze hangers
   stand). The grown post (0.1 + 2 x 0.1) then clears the lamp's cell column (x 17.9-18.1). The post is non-colliding;
   the las-tray beams are at z 40.4 (`:150`), untouched.
2. The lists (lead decisions 1, 2): in `lampBoxAlign.test.ts` move `warehouseOps:34` and `warehouseOps:53` from
   `KNOWN_EMBEDDED` (`:217-218`) to `ON_ITS_POST` (`:206-209`) with the reason "exit sign, a wall bulkhead 0.09 m off the
   wall face (warehouseS1.ts:83 / :92): wall-mounted, accepted (lead, LR16-W)"; delete `campusOps:81` (fixed). Keep
   `campusOps:16`. The test's `known` check must then equal the remaining `KNOWN_EMBEDDED` keys.
3. Lint (lead decision 5): `torchOcclusion.test.ts:166` `type AiContext = import('../src/ai/enemy').AiContext;` breaks
   `consistent-type-imports`. Add `import type { AiContext } from '../src/ai/enemy';` to the imports (`:7-14`; a type import
   is erased, so the test's dynamic `await import('../src/ai/enemy')` still loads the module where it does now) and delete
   `:166`.
Tests: `lampBoxAlign` (the audit over every map, ~10 min: run it alone), `campusS4`, `torchOcclusion`, `lampAtlasFit`;
`npm run lint` (0 errors); `npx tsc --noEmit`. Laptop: `e2e-sectorops` campus part rides on the integrated head's run.
Light parity (T): the post is in the light bake, so removing it from under the lamp changes the picture, the meter and the
guards together (the cage floor under the lamp brightens where the post cut the cone). Report the cage floor level under
the lamp before / after (`LightField.bodyLevel` at (18, 0, 37.5), doors shut).

## INT - the connector lobbies after the merge
On `feature/sector-redesign-lr16w` after the lead merged T, C2, S1, S2, S3 (in that order). Opus, one round. Run the three
warehouse light tests. Only if a C2 or C3 boundary point is red (the 7 S1-owned S2 points, the 5 S3-owned S2 points, the
C2 / C3 points of the owning file): re-tune the connector lamps only (S1's lobby pair #32 / #33, S3's office #111-#114 and
#88 / the door light) and the connector route points, to the band middle. Every other point must stay where the parts left
it (+-0.01). Report in `checks/lr16w-int.md`. Then the laptop runs below on the head.

## Laptop (Test Runner's queue, `E2E_GPU=1`; on the integrated head after INT)
1. `e2e-sectorops` (route legs on nav, the walks over moved route points, the S2 cage grab, the S4 cage) and
   `e2e-ctcourse` (the S7 stair).
2. GPU sheet: `scripts/sector-lights-shots.mjs` before (`67f3661a`) / after, warehouseOps rows plus: the S1 corridor from
   the west door, the security office from its door, the S2 cage from the issue gate, the S3 production office from the
   stair head, the S3 fire lobby from the extract, the S7 stair; `--sheet` into `docs/sector-redesign/checks/lr16w/`. Pass:
   pools on work areas, the routes visibly in twilight, no room a flat grey, no hard arc.
3. Michael (TESTING.md line, lead): Sector Ops warehouse at night: walk each section's three routes; the meter sits under
   "lit" on the routes, the desks and the cage shelf are lit pools, the pockets dark.

## Light parity (all parts)
Every change is map data (fitting intensity, radius, beam, position, a dead fitting, one stair light, one optional door
light, one occluder box, route and guard points). There is one bake and one registry: the lamp shader (with the same cone
and feather), the meter (`LightField.bodyLevel`) and the guards (`fieldLight`) read them, so they move together. No shader,
field, bake or constant change. A route-point move changes where the test samples, not the light; it is honest only when
the route still takes the same way (same surfaces, climbs and cover) - the report says so per move.

## For Michael (none blocks the build)
1. Look: the warehouse goes to a night state (route lines 0.4-0.55, work pools 0.55-0.8). Many room fittings end at
   0.1-0.3x of today, because the photometric near field makes a panel 1.1-1.3 m over a head read 3-7x the level 3 m away.
   If the result looks too dark or flat on the sheet, the alternatives are light-model calls (a softer near field in
   `PHOTO`, or the `CAP`'s scope), Michael's, not this slice's.
2. Possible C-entries: S2 rack tops W0N (0.38) and R3[4] (0.39) if no layout lever lights them without the cage floor.

## Red list -> owner (summary)
| red | owner |
| --- | --- |
| S1 stealth maxima, 68 points | S1 |
| S2 stealth maxima: 7 C2-lobby points | S1 |
| S2 stealth maxima: 5 C3-office points | S3 |
| S2 stealth maxima: 37 hall / cage points (incl. part A's #61 moves) | S2 |
| S2 lit enough: R2[13], W0N, A1 south mouth (C3), east gangway middle | S2 |
| S3 stealth maxima, 67 points | S3 |
| S3 lit enough: C3 far doorway (new with part A) | S3 |
| S3 pockets dark: stores officer (C4) | S3 |
| S3 pockets +0.05: supervisor, crane operator, east bay (C4) | S3 |
| ctcourse must-see: S7 stair step 1 (C2) | C2 |
| lampBoxAlign lists (#34, #53, #81), campus #81 post, lint `torchOcclusion:166` | T |
| C2 / C3 boundary after the merge | INT |
| light-model change | none |
