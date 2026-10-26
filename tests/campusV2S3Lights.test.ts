/**
 * (campus-greybox S3 R4) The v2 lab block's lights and security devices (`docs/campus-greybox/briefs/S3.md` section 4 "R4";
 * pattern `tests/campusS3.test.ts`). With section 3's v2 flag on: every lamp from the one block, on, destructible and
 * electric; the five high bays; a switch by a door of each circuit's space (J17 circuits within 1.5 m, one each, each
 * darkening only its room); dark by reason; the isolator board; the lasers and panels; the cameras, desk, keypads, intel
 * and alarms.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { LevelBuilder } from '../src/world/levelBuilder';
import { hyp2 } from '../src/core/mathx';
import { checkPanels } from '../src/game/laserPanels';
import { lampReach } from '../src/world/lampMath';
import { validateSecurity } from '../src/security/data';
import { INTEL_LINE_MAX, checkSectorCodes, type SectorDef } from '../src/game/sectors';
import type * as KitM from '../src/world/maps/campusV2/s3Kit';
import type * as LightsM from '../src/world/maps/campusV2/s3Lights';
import type * as DevM from '../src/world/maps/campusV2/s3Devices';
import type * as S3M from '../src/world/maps/campusV2/s3';

type Kit = typeof KitM;
let kit: Kit;
let lt: typeof LightsM;
let dev: typeof DevM;
let s3: typeof S3M;
/** The whole campus with S3 v2 on (undressed). */
let bAll: LevelBuilder;
/** The lights alone (this lane's build). */
let bLt: LevelBuilder;
let sectors: readonly SectorDef[];

const PI = Math.PI;
const inBox = (r: readonly number[], x: number, z: number, m = 0): boolean => x >= r[0]! - m && x <= r[2]! + m && z >= r[1]! - m && z <= r[3]! + m;

beforeAll(async () => {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = [3];
  kit = await import('../src/world/maps/campusV2/s3Kit');
  lt = await import('../src/world/maps/campusV2/s3Lights');
  dev = await import('../src/world/maps/campusV2/s3Devices');
  s3 = await import('../src/world/maps/campusV2/s3');
  const { buildCampus } = await import('../src/world/maps/campusOps');
  ({ CAMPUS_SECTORS: sectors } = await import('../src/world/maps/campusSectors'));
  const lb = await import('../src/world/levelBuilder');
  bAll = new lb.LevelBuilder();
  buildCampus(bAll, { dress: false });
  bLt = new lb.LevelBuilder();
  lt.buildS3Lights(bLt);
}, 120_000);

/**
 * Each circuit's space and the door(s) of that space its switch sits by (S3_DOORS ids; brief R4 "Switches"): the
 * high-bay bank at the hall's new entry (wStairG), view at the landing's fire door, burn at the control-room door, the
 * rooms at their main doors, the J17 circuits at their room's door (the EMC room's planned door at (45, -16), #17's post).
 */
function switchDoors(k: Kit): Record<number, { space: string; doors: readonly (readonly [number, number, number, number, number])[] }> {
  const G = k.S3_GROUPS;
  /** A door's opening as a plan segment and its floor: [x0, z0, x1, z1, y]. */
  const seg = (id: keyof Kit['S3_DOORS'], w = 1.2): [number, number, number, number, number] => {
    const [x, z, y] = k.S3_DOORS[id];
    // the doors on walls along x (a z line, brief 3.2 "Wall"); the rest are on x lines
    const alongX = ['c3Near', 'roller', 'ctlHall', 'nStairL1', 'eStairG', 'landingFire', 'hoist', 'writeup', 'gown', 'storeHatch', 'eStairL1', 'gallery', 'sec'].includes(id);
    return alongX ? [x - w / 2, z, x + w / 2, z, y] : [x, z - w / 2, x, z + w / 2, y];
  };
  return {
    [G.hb1]: { space: 'hall', doors: [seg('wStairG')] },
    [G.hb2]: { space: 'hall', doors: [seg('wStairG')] },
    [G.hb3]: { space: 'hall', doors: [seg('wStairG')] },
    [G.view]: { space: 'view', doors: [seg('landingFire', 1.8)] },
    [G.burn]: { space: 'hall', doors: [seg('ctlHall')] },
    [G.dock]: { space: 'dock', doors: [seg('roller', 3.0)] },
    [G.office]: { space: 'writeup', doors: [seg('writeup')] },
    [G.sec]: { space: 'sec', doors: [seg('sec')] },
    [G.ctl]: { space: 'control', doors: [seg('ctlHall')] },
    [G.plant]: { space: 'plant', doors: [seg('plantHall')] },
    [G.emc]: { space: 'emc', doors: [[44.4, -16, 45.6, -16, 0]] },
    [G.clean]: { space: 'clean', doors: [seg('passThrough')] },
    [G.hoist]: { space: 'hoist', doors: [seg('hoist')] },
    [G.wStair]: { space: 'wCore', doors: [seg('wStairG')] },
    [G.nStair]: { space: 'nCore', doors: [seg('nStairW')] },
    [G.eStair]: { space: 'eCore', doors: [seg('eStairG')] },
  };
}

/** Plan distance from (x, z) to a segment. */
function segDist(x: number, z: number, s: readonly number[]): number {
  const [ax, az, bx, bz] = s as [number, number, number, number];
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return hyp2(x - (ax + dx * t), z - (az + dz * t));
}

describe('campus v2 S3 lights (R4)', () => {
  it('every S3 lamp comes from the one block: on, intensity > 0, destructible, electric; the campus build carries exactly them in the footprint', () => {
    const ls = bLt.lights.lights;
    expect(ls.length).toBe(lt.S3_LIGHTS.length);
    lt.S3_LIGHTS.forEach((d, k) => {
      const l = ls[k]!;
      // the registry stores a fixed lamp's photometric reach (`lampReach` of the given radius, LR13)
      expect([l.x, l.y, l.z, l.group, l.radius, l.intensity], d.role).toEqual([d.x, d.y, d.z, d.group, lampReach(d.r), d.i]);
      expect(l.on && l.intensity > 0 && l.destructible && l.electric, d.role).toBe(true);
    });
    const foot = bAll.lights.lights.filter((l) => l.x >= 10 && l.x <= 64 && l.z >= -30 && l.z <= 0);
    expect(foot.length).toBe(lt.S3_LIGHTS.length);
    for (const l of foot) expect(lt.S3_LIGHTS.some((d) => d.x === l.x && d.y === l.y && d.z === l.z && d.group === l.group), `lamp at ${l.x}, ${l.y}, ${l.z}`).toBe(true);
    // every circuit of S3_GROUPS has at least one lamp
    for (const [name, g] of Object.entries(kit.S3_GROUPS)) expect(lt.S3_LIGHTS.some((d) => d.group === g), name).toBe(true);
  });

  it('the five high bays at the 3.3 points, y 8.5, on three groups (hb1 south pair, hb2 crane bay, hb3 north pair)', () => {
    const hb = lt.S3_LIGHTS.filter((d) => d.role === 'high-bay');
    expect(hb.map((d) => [d.x, d.z, d.group])).toEqual([
      [27, -25, 60], [39, -25, 60], [20, -20, 61], [27, -12, 62], [39, -12, 62],
    ]);
    for (const d of hb) {
      expect(d.y).toBe(8.5);
      expect([d.r, d.i, d.w]).toEqual([12, 0.9, 0.7]);
      expect(d.cone).toEqual([0, -1, 0, 1.15]);
    }
  });

  it('every S3 circuit has a switch within 2.0 m of a door of its space (on that floor); the J17 circuits 160-165 one each, within 1.5 m', () => {
    const sw = s3.S3_SWITCHES;
    const map = switchDoors(kit);
    for (const [g, want] of Object.entries(map)) {
      const mine = sw.filter((q) => q.group === Number(g));
      expect(mine.length, `switches of ${g}`).toBeGreaterThan(0);
      const j17 = Number(g) >= 160;
      if (j17) expect(mine.length, `J17 ${g}`).toBe(1);
      for (const q of mine) {
        const d = Math.min(...want.doors.filter((s) => Math.abs(s[4] - q.pos.y) < 0.5).map((s) => segDist(q.pos.x, q.pos.z, s)));
        // the corridor's second switch is at the east lobby's end wall (as built two), not at a door
        if (Number(g) === kit.S3_GROUPS.view && q.pos.x > 60) continue;
        expect(d, `switch of ${g} at ${q.pos.x}, ${q.pos.z}`).toBeLessThanOrEqual(j17 ? 1.5 : 2.0);
      }
    }
    expect(Object.keys(map).map(Number).sort((a, c) => a - c)).toEqual(Object.values(kit.S3_GROUPS).slice().sort((a, c) => a - c));
    // the high-bay bank: three, 0.4 apart, on the west core's west face (x 13.85) north of wStairG, facing the low aisle
    const bank = [kit.S3_GROUPS.hb1, kit.S3_GROUPS.hb2, kit.S3_GROUPS.hb3].map((g) => sw.find((q) => q.group === g)!);
    for (const q of bank) {
      expect(q.pos.x).toBe(13.85);
      expect(q.pos.y).toBe(0);
      expect(q.yaw).toBeCloseTo(-PI / 2, 9);
      expect(q.pos.z).toBeGreaterThan(kit.S3_DOORS.wStairG[1] + 0.6);
    }
    expect(bank[1]!.pos.z - bank[0]!.pos.z).toBeCloseTo(0.4, 9);
    expect(bank[2]!.pos.z - bank[1]!.pos.z).toBeCloseTo(0.4, 9);
    expect(sw.filter((q) => q.group === kit.S3_GROUPS.view).length).toBe(2);
  });

  it('switching a J17 circuit off darkens only its room: its lamps all inside the room, its switch faces into it (the EMC room: from the hall)', () => {
    const G = kit.S3_GROUPS;
    const B = kit.S3_BOX;
    const rooms: readonly [number, readonly number[], number, number][] = [
      [G.emc, B.emc, 0, B.emcTop],
      [G.clean, B.clean, kit.S3_L1, kit.S3_CEIL_TOP],
      [G.hoist, B.hoist, kit.S3_L1, kit.S3_CEIL_TOP],
      [G.wStair, B.wCore, 0, kit.S3_ROOF],
      [G.nStair, B.nCore, 0, kit.S3_CEIL_TOP],
      [G.eStair, B.eCore, 0, kit.S3_ROOF],
    ];
    for (const [g, box, y0, y1] of rooms) {
      const ls = lt.S3_LIGHTS.filter((d) => d.group === g);
      expect(ls.length, `lamps of ${g}`).toBeGreaterThan(0);
      for (const d of ls) {
        expect(inBox(box, d.x, d.z), `${d.role} in its room`).toBe(true);
        expect(d.y > y0 && d.y < y1, `${d.role} y ${d.y}`).toBe(true);
      }
      const q = s3.S3_SWITCHES.find((s) => s.group === g)!;
      // the stand point 0.5 m in front of the switch (along its yaw) is in the room, on its floor (the hall for the EMC room)
      const sx = q.pos.x + Math.sin(q.yaw) * 0.5;
      const sz = q.pos.z + Math.cos(q.yaw) * 0.5;
      if (g === G.emc) expect(inBox(B.hall, sx, sz) && !inBox(B.emc, sx, sz), 'emc switch from the hall').toBe(true);
      else expect(inBox(box, sx, sz), `switch of ${g} faces into its room`).toBe(true);
    }
    // the fire stairs: a fitting over each half landing (4.4) and each L1 landing (6.9)
    for (const g of [G.wStair, G.nStair, G.eStair]) expect(lt.S3_LIGHTS.filter((d) => d.group === g).map((d) => d.y)).toEqual([4.4, 6.9]);
  });

  it('dark by reason: no fitting over the chamber or EMC roofs, the clean room\'s void, the low aisle or the walkway; the gas cage holds only its bulkhead (J17 B9); the block fill 0.14', () => {
    const B = kit.S3_BOX;
    const over = (box: readonly number[], above: number, below = Infinity) => lt.S3_LIGHTS.filter((d) => inBox(box, d.x, d.z) && d.y > above && d.y < below);
    expect(over(B.chamber, -1).length).toBe(0);
    expect(over(B.emc, B.emcTop).length).toBe(0);
    expect(over(B.emc, -1).map((d) => d.role)).toEqual(['emc']);
    expect(over(B.clean, kit.S3_CEIL_TOP).length).toBe(0);
    expect(over(B.hallAisle, -1, kit.L1_UNDER).length).toBe(0);
    expect(over(B.walkway, -1).length).toBe(0);
    expect(over(B.voidDeck, kit.S3_CEIL_TOP).length).toBe(0);
    expect(over(B.gasCage, -1).map((d) => d.role)).toEqual(['gas-cage']);
    expect(lt.S3_LIGHTS.filter((d) => d.x > 64).length).toBe(0);
    expect(bLt.lights.zoneAt(26, 1, -20)).toBe(0.14);
    expect(bLt.lights.zoneAt(30, kit.S3_L1 + 1, -9)).toBe(0.14);
  });

  it('the isolator board (sync-s3-isolator): (56, 0, -7.3) facing the plant, cuts `view` only for 45 s; `view` is the corridor, the goal lamp and the gowning room (B2)', () => {
    expect(s3.S3_BOARDS.length).toBe(1);
    const bd = s3.S3_BOARDS[0]!;
    expect([bd.pos.x, bd.pos.y, bd.pos.z]).toEqual([56, 0, -7.3]);
    expect(bd.yaw).toBeCloseTo(PI, 9);
    expect(bd.groups).toEqual([kit.S3_GROUPS.view]);
    expect(bd.window).toBe(45);
    expect(bd.section).toBe(2);
    expect(lt.S3_LIGHTS.filter((d) => d.group === kit.S3_GROUPS.view).map((d) => d.role)).toEqual(['corridor', 'corridor', 'corridor', 'goal', 'gown-night']);
  });

  it('the lasers and panels as listed, one panel each (checkPanels), emitter boxes drawn only; las-store spans the store\'s aisle gap', () => {
    expect(s3.S3_LASERS.map((l) => [l.id, l.x1, l.z1, l.x2, l.z2, l.ys, l.floorY, l.section])).toEqual([
      ['las-gown', 37.5, -3.6, 37.5, -2.4, [0.35, 0.9, 1.45], 4.5, 2],
      ['las-store', 53, -4, 53, -2.8, [0.5, 1.1], 4.5, 2],
    ]);
    expect(checkPanels(s3.S3_LASERS, s3.S3_PANELS)).toEqual([]);
    expect(s3.S3_PANELS.map((p) => [p.id, p.x, p.y, p.z, p.yaw, p.section])).toEqual([
      ['panel-gown', 35.5, 5.9, -0.15, PI, 2],
      ['panel-store', 52.85, 5.9, -4.6, -PI / 2, 2],
    ]);
    expect(s3.S3_PANEL_NEAR['panel-gown']).toEqual([[35.5, 4.5, -8], [35.7, 4.5, -6], [35.3, 4.5, -4]]);
    expect(s3.S3_PANEL_NEAR['panel-store']).toEqual([[49.6, 4.5, -6.2], [47.8, 4.5, -3], [49.5, 4.5, -3]]);
    // the near side: west of each band
    for (const p of s3.S3_PANELS) {
      const l = s3.S3_LASERS.find((q) => q.id === p.lasers[0])!;
      for (const [x] of s3.S3_PANEL_NEAR[p.id]!) expect(x, p.id).toBeLessThan(l.x1);
    }
    const emitters = bLt.boxes.filter((p) => !p.collide && p.color === '#3a3d40');
    expect(emitters.length).toBe(4);
    // the beams cross the full aisle gap z -4..-2.8 (D:70) and the full pass-through door (1.2)
    const st = s3.S3_LASERS[1]!;
    expect([Math.min(st.z1, st.z2), Math.max(st.z1, st.z2)]).toEqual([-4, -2.8]);
    const gw = s3.S3_LASERS[0]!;
    expect(Math.abs(gw.z2 - gw.z1)).toBeCloseTo(1.2, 9);
    expect((gw.z1 + gw.z2) / 2).toBeCloseTo(kit.S3_DOORS.passThrough[1], 9);
  });
});

describe('campus v2 S3 security devices (R4)', () => {
  it('cam-view and cam-dock: valid security data with the desk, range 8-12, an aim, a reason, section 2; cam-view on L1 bulletproof facing west; cam-dock over C3', () => {
    const cams = dev.S3_CAMERAS;
    expect(cams.map((c) => c.id)).toEqual(['cam-view', 'cam-dock']);
    expect(validateSecurity({ devices: cams, levels: { 's3-l1': kit.S3_L1 }, desks: dev.S3_DESKS })).toEqual([]);
    for (const c of cams) {
      expect(c.kind).toBe('camera');
      if (c.kind !== 'camera') continue;
      expect(c.range!).toBeGreaterThanOrEqual(8);
      expect(c.range!).toBeLessThanOrEqual(12);
      expect(c.aim).toBeDefined();
      expect(c.reason.length).toBeGreaterThan(8);
      expect(c.section).toBe(2);
    }
    const [v, d] = cams as [Extract<(typeof cams)[number], { kind: 'camera' }>, Extract<(typeof cams)[number], { kind: 'camera' }>];
    expect([v.level, v.at, v.y, v.facing, v.bulletproof]).toEqual(['s3-l1', [51.7, -7.3], 2.8, 270, true]);
    expect([d.level, d.at, d.y, d.facing]).toEqual(['ground', [24, -0.4], 3.2, 180]);
    expect(hyp2(d.at[0] - kit.S3_DOORS.c3Near[0], d.at[1] - kit.S3_DOORS.c3Near[1])).toBeLessThan(1);
  });

  it('the desk (sync-s3-camloop): 0.3 m in front of #12\'s monitor stop along his facing, on L1, loops cam-view and cam-dock, operator index 11', () => {
    expect(dev.S3_DESKS.length).toBe(1);
    const k = dev.S3_DESKS[0]!;
    expect(k.id).toBe('desk-sec3');
    expect(k.section).toBe(2);
    expect(k.at[0]).toBeCloseTo(58.3, 9);
    expect(k.at[1]).toBeCloseTo(-15, 9);
    expect(k.yaw).toBeCloseTo(PI / 2, 9);
    expect(k.y).toBe(kit.S3_L1);
    expect(k.cameras).toEqual(['cam-view', 'cam-dock']);
    expect(k.operator).toBe(11);
    expect(k.loop).toBeUndefined();
    for (const id of k.cameras) expect(dev.S3_CAMERAS.find((c) => c.id === id)?.section, id).toBe(2);
    expect(inBox(kit.S3_BOX.sec, k.at[0], k.at[1])).toBe(true);
    expect(s3.S3_DESKS).toBe(dev.S3_DESKS);
  });

  it('kp-store and kp-sec share s3-codes, found on the sign-out board in the same section (checkSectorCodes with this lane\'s keypads and intel)', () => {
    expect(dev.S3_KEYPADS).toEqual([
      { at: [58, -6], code: 's3-codes' },
      { at: [58.6, -11], code: 's3-codes' },
    ]);
    expect(dev.S3_INTEL.length).toBe(1);
    const n = dev.S3_INTEL[0]!;
    expect(n.kind).toBe('board');
    expect(n.grants).toBe('s3-codes');
    expect(n.line.length).toBeLessThanOrEqual(INTEL_LINE_MAX);
    expect(/\d/.test(n.line)).toBe(false);
    if (n.kind === 'board') {
      expect(n.at).toEqual([44, 1.5, -0.3]);
      expect(n.yaw).toBeCloseTo(PI, 9);
    }
    // R5 adds the sector; until then the campus sectors with S3's keypads and intel swapped in
    const with3 = sectors.map((s, i) => (i === 2 ? { ...s, keypads: dev.S3_KEYPADS, intel: dev.S3_INTEL } : s));
    expect(checkSectorCodes(with3)).toEqual([]);
    expect(checkSectorCodes([{ ...sectors[2]!, keypads: dev.S3_KEYPADS, intel: [] }])).not.toEqual([]);
  });

  it('alarm-dock (G, 0.3 east of the dock desk) and alarm-sec (L1, the sec room\'s west wall midpoint), section 2', () => {
    expect(dev.S3_ALARMS).toEqual([
      { at: [25.8, -0.2], yaw: PI, section: 2 },
      { at: [53.2, -14.5], yaw: PI / 2, section: 2, y: kit.S3_L1 },
    ]);
    expect(dev.S3_ALARMS[0]!.at[0] - kit.S3_BOX.dockDesk[2]).toBeCloseTo(0.3, 9);
    const [sx0, sz0, , sz1] = kit.S3_BOX.sec;
    expect(dev.S3_ALARMS[1]!.at[1]).toBeCloseTo((sz0 + sz1) / 2, 9);
    expect(dev.S3_ALARMS[1]!.at[0]).toBeCloseTo(sx0 + 0.2, 9);
  });
});
