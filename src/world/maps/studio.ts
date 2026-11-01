import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import { STUDIO_MID as C, STUDIO_PROPS as P, STUDIO_SIZE as SIZE } from '../../anim/studioProps';

/**
 * (anim-studio) The Test Chamber (was the Anim Studio; the map id stays `studio`): a dev scene, not a level (it is not in
 * `MAPS`, no map list shows it; its `modes` (Free Roam, and (G2a) `test`: guards by test, revives) are for the URL boot
 * and the room; `getMap('studio')` finds it in `DEV_MAPS`, `?autostart=studio` boots it in Free Roam (`&mode=test` in the
 * test mode), the main menu's Test Chamber row starts it alone and the co-op lobby's Test Chamber mode hosts it for
 * two in `test`: the studio stage and its loop player run in the single player match only). The level design
 * standard (`docs/level-design.md`) binds playable maps; this is a plain room to look at the animation in, like the old
 * menu void: a dark floor with a 1 m grid (visual only: thin boxes that never collide), dark walls all round as the
 * backdrop, a warm key lamp front left, a cool rim lamp behind and a soft fill. Wren stands in the middle facing +z.
 * x east, z north, floor at 0.
 *
 * (anim-studio-2) A 28 m room (was 16) with the traversal props round the walls, clear of the middle (the loop player's
 * 2 m circle): real level pieces and anchors from the builder (`STUDIO_PROPS` in `anim/studioProps.ts` has every
 * number), so the game's own probes, attach states and moves play on them: the co-op team block (the pairs' 4.4 m lip and
 * a rappel point), a wall with a 2.4 m ledge, a low wall to vault, a platform with a ladder and a drainpipe (its south
 * face the back-to-wall wall), a horizontal pipe, a hang bar, a vent duct, a window and a door.
 *
 * (G2b, `docs/plan/TEST-CHAMBER-SPEC.md`) The test bed: pieces for the movement, traversal and combat suites in the same
 * room and colours (a step row, a crouch tunnel, 35 and 55 degree stairs / ramp, a fence, hang block B, a split fin,
 * a zipline, a rappel booth with a glazed window and a roof vent, crates, barrels, two training dummies). The animation
 * stage (loop player, tuner) is opt-in: the main menu row or `?stage=1`; the plain `?autostart=studio` is the normal game.
 */
export const studio: MapDef = {
  id: 'studio',
  name: 'Test Chamber',
  description: 'A plain room to test everything: the animation tuner, the loop player and the traversal props. One or two players.',
  modes: ['sandbox', 'test'],
  // no dressing (nothing on the walls): a plain stage
  detail: false,
  theme: {
    sky: '#121418',
    horizon: '#181b20',
    ground: '#22262b',
    fogStart: 60,
    fogEnd: 160,
    sunDir: [-0.3, -1, 0.2],
    sunIntensity: 0.2,
    // (marlow-bays item 14) a brighter stage (was 0.45); the stage lights that follow her add to it
    ambient: 0.6,
    lightLevel: 0.6,
  },
  build(b: LevelBuilder): MapLayout {
    const FLOOR = '#3a3e44';
    const LINE = '#5c636b';
    const AXIS = '#7d8792';
    const WALL = '#26292e';
    const PROP = '#59606a';
    const PROP_DARK = '#454b53';
    const METAL = '#6d7378';
    const H = 8;
    b.floor(C, C, SIZE, SIZE, FLOOR, 0, 0.4);
    b.perimeter(0, SIZE, 0, SIZE, H, WALL);
    b.box(C, H + 0.15, C, SIZE + 0.6, 0.3, SIZE + 0.6, WALL);
    // the grid: 1 m lines, the centre lines brighter (visual only, never collide)
    for (let i = 1; i < SIZE; i++) {
      const col = i === C ? AXIS : LINE;
      const w = i === C ? 0.03 : 0.015;
      b.box(i, 0.004, C, w, 0.008, SIZE - 0.4, col, 0, 0, false);
      b.box(C, 0.004, i, SIZE - 0.4, 0.008, w, col, 0, 0, false);
    }

    // the co-op team block (north): its lip is generated from the box top (>= LEDGE.minDrop), a rappel point on it
    const t = P.team;
    b.box((t.x0 + t.x1) / 2, t.top / 2, (t.z0 + t.z1) / 2, t.x1 - t.x0, t.top, t.z1 - t.z0, PROP);
    b.rappel(P.rappel.x, P.rappel.top, P.rappel.z, Math.PI, P.rappel.top);
    // a wall with a ledge (north west): the lip from the box top
    const l = P.ledge;
    b.box((l.x0 + l.x1) / 2, l.top / 2, (l.z0 + l.z1) / 2, l.x1 - l.x0, l.top, l.z1 - l.z0, PROP);
    // a low wall to vault (west)
    const lw = P.lowWall;
    b.lowWall(lw.x, (lw.z0 + lw.z1) / 2, lw.z1 - lw.z0, PROP, 0, lw.h, lw.thick);
    // the platform (west): a ladder and a drainpipe up its east face; its south face is a plain high wall
    const pf = P.platform;
    b.box((pf.x0 + pf.x1) / 2, pf.top / 2, (pf.z0 + pf.z1) / 2, pf.x1 - pf.x0, pf.top, pf.z1 - pf.z0, PROP_DARK);
    b.ladder(P.ladder.x, P.ladder.z, 0, pf.top, -Math.PI / 2, METAL, P.ladder.width);
    b.pipeV(P.pipeV.x, P.pipeV.z, 0, pf.top, -Math.PI / 2);
    // a horizontal pipe (east) between two posts
    const ph = P.pipeH;
    b.pillar(ph.x, ph.z0 - 0.15, 0.1, ph.y + 0.1, METAL);
    b.pillar(ph.x, ph.z1 + 0.15, 0.1, ph.y + 0.1, METAL);
    b.pipeH(ph.x, ph.z0, ph.x, ph.z1, ph.y);
    // a hang bar (north east) between two posts
    const br = P.bar;
    b.pillar(br.x0 - 0.15, br.z, 0.1, br.y + 0.1, METAL);
    b.pillar(br.x1 + 0.15, br.z, 0.1, br.y + 0.1, METAL);
    b.pipeH(br.x0, br.z, br.x1, br.z, br.y);
    // a vent (east): a block with a 1.0 x 1.1 m crawl duct through it along x, grates at both ends
    const v = P.vent;
    const vx = (v.x0 + v.x1) / 2;
    const vl = v.x1 - v.x0;
    const duct0 = b.boxes.length;
    b.box(vx, (v.h + v.top) / 2, (v.z0 + v.z1) / 2, vl, v.top - v.h, v.z1 - v.z0, PROP_DARK);
    b.box(vx, v.h / 2, (v.z0 + v.z - v.w / 2) / 2, vl, v.h, v.z - v.w / 2 - v.z0, PROP_DARK);
    b.box(vx, v.h / 2, (v.z + v.w / 2 + v.z1) / 2, vl, v.h, v.z1 - v.z - v.w / 2, PROP_DARK);
    b.mark(duct0, { noLedge: true });
    b.duct(
      [
        { x: v.x0 + 0.25, y: 0, z: v.z },
        { x: v.x1 - 0.25, y: 0, z: v.z },
      ],
      { pos: { x: v.x0, y: v.h / 2, z: v.z }, nx: -1, ny: 0, nz: 0, where: 'wall' },
      { pos: { x: v.x1, y: v.h / 2, z: v.z }, nx: 1, ny: 0, nz: 0, where: 'wall' },
    );
    // a window (south): a 3 m wall along x with a 1.2 x 1.2 m opening at a 0.9 m sill, open (no glass to break each loop)
    const w = P.window;
    const wx0 = w.x - w.w / 2;
    const wx1 = w.x + w.w / 2;
    const head = w.sill + w.h;
    b.wall(w.wall0, w.z, wx0, w.z, w.wallH, WALL, 0.3);
    b.wall(wx1, w.z, w.wall1, w.z, w.wallH, WALL, 0.3);
    b.box(w.x, w.sill / 2, w.z, w.w, w.sill, 0.3, WALL);
    b.box(w.x, (head + w.wallH) / 2, w.z, w.w, w.wallH - head, 0.3, WALL);
    b.windowAt(w.x, w.sill + w.h / 2, w.z, w.w, w.h, 0, { sill: w.sill, open: true });
    // a door (south west): a 3 m wall along x with a 1.2 x 2.1 m doorway, the door hinged at its west side
    const d = P.door;
    b.wall(d.wall0, d.z, d.hinge, d.z, d.wallH, WALL, 0.3);
    b.wall(d.hinge + d.w, d.z, d.wall1, d.z, d.wallH, WALL, 0.3);
    b.box(d.hinge + d.w / 2, (d.h + d.wallH) / 2, d.z, d.w, d.wallH - d.h, 0.3, WALL);
    b.door(d.hinge, 0, d.z, d.w, Math.PI / 2, { swing: 1, height: d.h });

    // (G2b) the test pieces (spec 1.3): plain greybox in the room's own colours, clear of the animation lane (x 8-26, z 18-24)
    // and the loop walk-ins. A step row (south wall): 0.42 walks up, 0.6 is the step move, 0.9 a mantle
    const sp = P.steps;
    for (let i = 0; i < sp.rows.length; i++) b.block(sp.rows[i]!.x, sp.z, sp.w, sp.rows[i]!.h, sp.d, i === 2 ? PROP_DARK : PROP);
    // a crouch tunnel (west wall): a side wall and a roof 1.4 m up (the perimeter is its west side)
    const tn = P.tunnel;
    const tl = tn.z1 - tn.z0;
    b.block(tn.x1 - tn.wallW / 2, (tn.z0 + tn.z1) / 2, tn.wallW, tn.under, tl, PROP_DARK);
    b.block((tn.x0 + tn.x1) / 2, (tn.z0 + tn.z1) / 2, tn.x1 - tn.x0, tn.roof, tl, PROP, tn.under);
    // 35 degree stairs and a 55 degree ramp (a ramp over 50 degrees is a wall to walk)
    const st = P.stairs;
    b.stairs(st.x, st.z, st.w, st.len, st.rise, st.steps, PROP, 0);
    const r5 = P.ramp55;
    b.ramp(r5.x, r5.z, r5.w, r5.len, r5.rise, PROP_DARK, 0);
    // a 2.6 m chain-link fence (the climb case)
    const fn = P.fence;
    b.fence(fn.x0, fn.z, fn.x1, fn.z, fn.h);
    // hang block B beside the ledge wall (jump-across, corner wrap) and a split fin beside the team block (a 1.65 m gap)
    const bb = P.blockB;
    b.block((bb.x0 + bb.x1) / 2, (bb.z0 + bb.z1) / 2, bb.x1 - bb.x0, bb.top, bb.z1 - bb.z0, PROP);
    const fi = P.fin;
    b.box((fi.x0 + fi.x1) / 2, fi.top / 2, (fi.z0 + fi.z1) / 2, fi.x1 - fi.x0, fi.top, fi.z1 - fi.z0, PROP_DARK);
    // a zipline from the ledge wall's top (a post and a bar carry the high end)
    const zp = P.zip;
    b.pillar(zp.x, zp.post.z, 0.06, zp.post.h, METAL, zp.post.y);
    b.box(zp.x, zp.a.y + 0.05, zp.a.z + 0.2, 0.05, 0.05, 0.3, METAL, 0, 0, false);
    b.zipline({ x: zp.x, y: zp.a.y, z: zp.a.z }, { x: zp.x, y: zp.b.y, z: zp.b.z });

    // the rappel booth (north east corner; decision N10): walls with a glazed window, a roof with a vent hole, a rope over
    // the window and a duct over the hole. The team block above stays exactly as it was.
    const bo = P.booth;
    const booth0 = b.boxes.length;
    b.box(25.45, 2.1, 25.15, 0.9, 4.2, 0.3, PROP);
    b.box(27.55, 2.1, 25.15, 0.9, 4.2, 0.3, PROP);
    b.box(bo.window.x, bo.window.sill / 2, 25.15, bo.window.w, bo.window.sill, 0.3, PROP);
    b.box(bo.window.x, 3.2, 25.15, bo.window.w, 2.0, 0.3, PROP);
    b.box(25.15, 2.1, 26.5, 0.3, 4.2, 3.0, PROP);
    b.box(26.65, 2.1, 27.75, 2.7, 4.2, 0.5, PROP);
    b.mark(booth0, { noLedge: true });
    // the roof slab, top 4.4, round the vent hole
    b.box(26.5, 4.3, 25.65, 3.0, 0.2, 1.3, PROP);
    b.box(26.5, 4.3, 27.55, 3.0, 0.2, 0.9, PROP);
    b.box(25.25, 4.3, 26.7, 0.5, 0.2, 0.8, PROP);
    b.box(27.15, 4.3, 26.7, 1.7, 0.2, 0.8, PROP);
    b.noLedge(25.9, 26.7, 0.7);
    b.windowAt(bo.window.x, bo.window.sill + bo.window.h / 2, 25.15, bo.window.w, bo.window.h, 0, { sill: bo.window.sill, open: false, breakable: true });
    b.rappel(bo.rope.x, bo.rope.top, bo.rope.z, Math.PI, bo.rope.top);
    // the roof duct over the hole: a ceiling vent, drop into the booth
    const duct1 = b.boxes.length;
    b.box(25.95, 4.95, 26.15, 1.9, 1.1, 0.1, METAL);
    b.box(25.95, 4.95, 27.25, 1.9, 1.1, 0.1, METAL);
    b.box(25.95, 5.55, 26.7, 1.9, 0.1, 1.2, METAL);
    b.box(25.05, 4.95, 26.7, 0.1, 1.1, 1.0, METAL);
    b.mark(duct1, { noLedge: true });
    // a 1.0 m block under the hole (spec risk 3): the drop is then 3.4 m, a roll; the attach controller's floor probe is 3 m deep, so a bare 4.4 m drop finds no floor
    b.duct(
      [
        { x: 26.65, y: 4.4, z: 26.7 },
        { x: 25.9, y: 4.4, z: 26.7 },
      ],
      { pos: { x: 26.9, y: 4.95, z: 26.7 }, nx: 1, ny: 0, nz: 0, where: 'wall' },
      { pos: { x: 25.9, y: 4.2, z: 26.7 }, nx: 0, ny: -1, nz: 0, where: 'ceiling' },
    );
    const bv = bo.vent;
    b.block((bv.x0 + bv.x1) / 2, (bv.z0 + bv.z1) / 2, bv.x1 - bv.x0, 1.0, bv.z1 - bv.z0, PROP_DARK);

    // key (warm, front left, high), rim (cool, behind right), fill (soft, front right), and a lamp over each prop side
    b.light({ kind: 'lamp', x: C - 3, y: 6, z: C + 3, radius: 14, intensity: 1, color: [1, 0.93, 0.82] });
    b.light({ kind: 'lamp', x: C + 2.5, y: 5.5, z: C - 3.5, radius: 12, intensity: 0.8, color: [0.75, 0.85, 1] });
    b.light({ kind: 'lamp', x: C + 3.5, y: 5, z: C + 2.5, radius: 10, intensity: 0.45, color: [0.95, 0.95, 1] });
    b.light({ kind: 'lamp', x: C, y: 7, z: SIZE - 5, radius: 12, intensity: 0.7, color: [1, 0.96, 0.9] });
    b.light({ kind: 'lamp', x: 5, y: 6, z: C, radius: 11, intensity: 0.6, color: [1, 0.96, 0.9] });
    b.light({ kind: 'lamp', x: SIZE - 5, y: 6, z: C, radius: 11, intensity: 0.6, color: [1, 0.96, 0.9] });
    b.light({ kind: 'lamp', x: C, y: 6, z: 5, radius: 11, intensity: 0.6, color: [1, 0.96, 0.9] });
    return {
      // (G1) the partner's slot in a co-op room: 2 m east of the first, clear of the props (all round the walls)
      playerSpawns: [
        { pos: new Vector3(C, 0, C), yaw: 0 },
        { pos: new Vector3(C + 2, 0, C), yaw: 0 },
      ],
      // (G2b) e2e-tactics' five grunts: all in the open room, 9-21 m from its player at (2.7, 17)
      enemySpawns: [new Vector3(12, 0, 22), new Vector3(18, 0, 22.5), new Vector3(24, 0, 22), new Vector3(19.5, 0, 11), new Vector3(23, 0, 6.5)],
      // (G2b) the push test (a crate, a small crate and a barrel off the lane) and two explosive barrels for the chain shot
      props: [
        { kind: 'smallCrate', pos: new Vector3(10, 0, 16.8) },
        { kind: 'crate', pos: new Vector3(11, 0, 16.4) },
        { kind: 'barrel', pos: new Vector3(9, 0, 16.4) },
        { kind: 'explosiveBarrel', pos: new Vector3(26.9, 0, 11.3) },
        { kind: 'explosiveBarrel', pos: new Vector3(25.7, 0, 11.3) },
      ],
      // (G2b) two training targets, one still and one strafing; the stage has none (it would stand in the loop player's room)
      dummies: [
        { pos: new Vector3(8, 0, 12.5), yaw: Math.PI / 2 },
        { pos: new Vector3(8, 0, 15), yaw: Math.PI / 2, strafe: 2.5 },
      ],
      objectives: [],
      pickups: [],
      // (G2b) the ledge wall's top is reached only by a climb, so the nav keeps it walkable (takedown "below", hang-down)
      navSeeds: [new Vector3(4, 2.4, 26.5)],
      // (G2b) the booth and the tunnel frame tight
      camSpaces: [
        { box: [P.booth.inner.x0, P.booth.inner.z0, P.booth.inner.x1, P.booth.inner.z1], size: 'tight' },
        { box: [P.tunnel.x0, P.tunnel.z0, 2.5, P.tunnel.z1], y: [0, P.tunnel.under], size: 'tight' },
      ],
      debugPoints: [
        { group: 'moves', id: 'steps', label: 'Step row', pos: new Vector3(3, 0, 2.2), yaw: Math.PI },
        { group: 'moves', id: 'tunnel', label: 'Crouch tunnel', pos: new Vector3(1.2, 0, 15.6), yaw: Math.PI },
        { group: 'moves', id: 'split', label: 'Split fin', pos: new Vector3(17.8, 0, 24.5), yaw: 0 },
        { group: 'moves', id: 'fence', label: 'Fence', pos: new Vector3(7.5, 0, 5.8), yaw: 0 },
        { group: 'moves', id: 'zip', label: 'Zipline top', pos: new Vector3(5.3, 2.42, 26.4), yaw: Math.PI },
        { group: 'moves', id: 'booth-rope', label: 'Booth rope', pos: new Vector3(26.5, 4.45, 25.4), yaw: Math.PI },
        { group: 'moves', id: 'booth-vent', label: 'Booth roof vent', pos: new Vector3(27.5, 4.42, 26.7), yaw: -Math.PI / 2 },
      ],
      camSize: 'open',
    };
  },
};
