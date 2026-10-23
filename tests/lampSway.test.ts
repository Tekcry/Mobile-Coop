/**
 * (LR16-5b, Michael M14) Swinging pendants on Marlow Yard (`src/world/lampSway.ts`): a damped bifilar pendulum, a pure
 * function of its kicks and the sim time; never past `SWAY.maxAmp`; the host's kicks applied verbatim on a client give
 * the same offsets; shots, blasts and bumps kick as specified; `tickSway` moves `swayVersion`, never `version`; the light
 * field reads the swung lamp exactly (light parity); Marlow Yard's table claims its hangers; the character-shadow picker
 * holds a swinging lamp; the hot calls allocate nothing; the `sway` event and the `sw-` shot target parse safely.
 */
import { describe, expect, it } from 'vitest';
import { applyMapSway, claimHangers, HANGER_STRIDE, SWAY, SWAY_PENDANTS, SwaySet, type SwayKick } from '../src/world/lampSway';
import { applyMapFlicker } from '../src/world/lampFlicker';
import { contribution, LightRegistry, type LightDef } from '../src/world/lights';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { ctcourse } from '../src/world/maps/ctcourse';
import { campusOps } from '../src/world/maps/campusOps';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { warehouse } from '../src/world/maps/warehouse';
import { dressingOn } from '../src/world/detailPass';
import { canonicalLightSet, CANON_MIN_THICK } from '../src/voxel/lightShapes';
import { LampSlotPicker, CHAR_SHADOW } from '../src/world/charShadowSet';
import { parseMessage, type NetEvent } from '../src/net/protocol';
import { swayShotOk, swayTargetId, SWAY_TARGET } from '../src/net/lampSync';
import { bytesPerCall, inputs, sink } from './helpers/allocPerCall';

const PENDANT = { sx: 1.2, sy: 0.08, sz: 0.22, oy: 0.08 };

/** A registry with one pendant at (x, 5, z) hung on two rods of length `L` (as ctcourse's `pendantRods`). */
function hung(L = 2.38, x = 0, z = 0, other = true): { reg: LightRegistry; s: SwaySet; l: LightDef; boxes: BoxPiece[] } {
  const reg = new LightRegistry();
  // (a steady lamp first, so the pendant's registry id is not its pendant index)
  if (other) reg.add({ x: 50, y: 3, z: 50, radius: 6 });
  const l = reg.add({ x, y: 5, z, radius: 13, intensity: 0.9, fixture: { ...PENDANT } });
  const top = l.y + PENDANT.oy + PENDANT.sy / 2;
  const boxes: BoxPiece[] = [-0.5, 0.5].map((dx) => ({ c: [x + dx, top + L / 2, z], s: [0.04, L, 0.04], yaw: 0, pitch: 0, color: '#888', collide: false, visible: true }));
  const hangers = claimHangers(boxes, l);
  const s = new SwaySet([{ light: l, hangers }]);
  reg.sway = s;
  return { reg, s, l, boxes };
}

/** Tick a set at `t` (unsnapped: the tests step finer than the game's 60 Hz). */
function at(s: SwaySet, reg: LightRegistry, t: number): void {
  s.time[0] = t;
  s.tick(reg.lights);
}

describe('pendulum', () => {
  it('period 2 pi / wd, envelope e^-1 at tau, swy = (swx^2 + swz^2) / 2L', () => {
    const { reg, s, l } = hung(2);
    expect(s.len[0]).toBeCloseTo(2, 9);
    const w = Math.sqrt(9.81 / 2);
    expect(s.w[0]).toBeCloseTo(w, 12);
    const wd = Math.sqrt(w * w - 1 / (SWAY.tau * SWAY.tau));
    const A = 0.2;
    s.apply(l.id, 0, A, 0);
    let prev = 0;
    const cross: number[] = [];
    for (let i = 1; i <= 12000; i++) {
      const t = i / 1000;
      at(s, reg, t);
      if (prev > 0 && l.swx <= 0) cross.push(t);
      if (prev < 0 && l.swx >= 0) cross.push(t);
      prev = l.swx;
      expect(l.swz).toBeCloseTo(0, 12);
      expect(l.swy).toBeCloseTo((l.swx * l.swx + l.swz * l.swz) / (2 * 2), 14);
    }
    expect(cross.length).toBeGreaterThanOrEqual(6);
    for (let k = 1; k < cross.length; k++) expect(Math.abs(cross[k]! - cross[k - 1]! - Math.PI / wd) / (Math.PI / wd)).toBeLessThan(0.02);
    expect(Math.abs(s.envelopeAt(0, SWAY.tau) - A / Math.E) / (A / Math.E)).toBeLessThan(0.03);
    // a peak a quarter period after tau sits on the envelope
    const tp = Math.round((SWAY.tau * wd) / (2 * Math.PI)) * ((2 * Math.PI) / wd) + Math.PI / (2 * wd);
    at(s, reg, tp);
    expect(Math.abs(Math.abs(l.swx) - A * Math.exp(-tp / SWAY.tau)) / (A * Math.exp(-tp / SWAY.tau))).toBeLessThan(0.03);
  });
});

describe('cap', () => {
  it('never above maxAmp: 30 kicks (shots through it, blasts at 0 m) in 2 s, read over 20 s at 1 ms', () => {
    const { reg, s, l } = hung(1.13);
    let seed = 11;
    const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const kicks: [number, number][] = [];
    for (let i = 0; i < 30; i++) kicks.push([rnd() * 2, rnd()]);
    kicks.sort((a, b) => a[0] - b[0]);
    let n = 0;
    let max = 0;
    for (let i = 0; i <= 20000; i++) {
      const t = i / 1000;
      while (n < kicks.length && kicks[n]![0] <= t) {
        const [tk, r] = kicks[n++]!;
        const c = 5 + PENDANT.oy;
        if (r < 0.5) {
          const h = r * 4 * Math.PI;
          s.shotKick(l.x - Math.cos(h) * 5, c, l.z - Math.sin(h) * 5, l.x + Math.cos(h) * 5, c, l.z + Math.sin(h) * 5, tk);
        } else s.blastKick(l.x + l.swx, c + l.swy, l.z + l.swz, tk);
      }
      at(s, reg, t);
      const m = Math.sqrt(l.swx * l.swx + l.swz * l.swz);
      if (m > max) max = m;
      expect(s.envelopeAt(0, t)).toBeLessThanOrEqual(SWAY.maxAmp + 1e-12);
    }
    expect(max).toBeGreaterThan(0.15);
    expect(max).toBeLessThanOrEqual(SWAY.maxAmp + 1e-12);
  });
});

describe('determinism', () => {
  it('host kicks -> events -> client registry: the same offsets at 200 times; 1/60 and 1/30 ticks agree at shared times', () => {
    const host = hung(1.83);
    const cli = hung(1.83);
    const cli30 = hung(1.83);
    const ev: [number, number, number, number][] = [];
    const onKick: SwayKick = (id, t, a, h) => ev.push([id, t, a, h]);
    host.s.onKick = onKick;
    const c = 5 + PENDANT.oy;
    host.s.shotKick(-3, c, 0.1, 3, c, -0.2, 0.513);
    host.s.blastKick(2, 1, 1, 1.237);
    host.s.shotKick(0.3, 0, -4, 0.2, c, 0, 2.001);
    const pts = new Float32Array([0.2, c + 0.1, 0]);
    host.s.time[0] = 3.3;
    host.s.bumpKick(pts, 1);
    host.s.blastKick(-1, 2, 0, 3.71);
    host.s.shotKick(-3, c, 0, 3, c, 0, 4.4);
    expect(ev.length).toBeGreaterThanOrEqual(4);
    // the wire: JSON round trip through the parser, applied in order
    const wire = parseMessage(JSON.parse(JSON.stringify({ t: 'ev', events: ev.map(([id, t, a, h]) => ({ e: 'sway', id, t, a, h })) })));
    expect(wire && wire.t === 'ev' ? wire.events.length : 0).toBe(ev.length);
    for (const e of (wire as { events: NetEvent[] }).events) if (e.e === 'sway') {
      cli.reg.swayImpulse(e.id, e.t, e.a, e.h);
      cli30.reg.swayImpulse(e.id, e.t, e.a, e.h);
    }
    for (let i = 0; i < 200; i++) {
      const t = 0.4 + i * 0.0731;
      at(host.s, host.reg, t);
      at(cli.s, cli.reg, t);
      expect(cli.l.swx).toBe(host.l.swx);
      expect(cli.l.swy).toBe(host.l.swy);
      expect(cli.l.swz).toBe(host.l.swz);
    }
    // the registry tick: 60 Hz on one page, 30 Hz on the other, equal at the shared steps
    const a = hung(1.83);
    const b = hung(1.83);
    for (const [id, t, am, h] of ev) {
      a.reg.swayImpulse(id, t, am, h);
      b.reg.swayImpulse(id, t, am, h);
    }
    for (let k = 0; k < 600; k++) {
      a.reg.tickSway(k / 60);
      if (k % 2 === 0) {
        b.reg.tickSway(k / 60);
        expect(b.l.swx).toBe(a.l.swx);
        expect(b.l.swz).toBe(a.l.swz);
      }
    }
  });
});

describe('kicks', () => {
  it('shotKick: through the fitting A = kickShot / w along the heading; a miss does nothing; an impact 1 m away pushes away; minGap', () => {
    const { s, l } = hung(2.38);
    const got: number[][] = [];
    s.onKick = (id, t, a, h) => got.push([id, t, a, h]);
    const c = 5 + PENDANT.oy;
    expect(s.shotKick(-5, c, 0, 5, c, 0, 1)).toBe(1);
    expect(got[0]![0]).toBe(l.id);
    expect(got[0]![2]).toBeCloseTo(SWAY.kickShot / s.w[0]!, 12);
    expect(got[0]![3]).toBeCloseTo(0, 12);
    // a second round inside minGap: dropped
    expect(s.shotKick(-5, c, 0, 5, c, 0, 1 + SWAY.minGap / 2)).toBe(0);
    // 0.7 m away (past graze), the impact 2 m away (past near): nothing
    const q = hung(2.38);
    q.s.onKick = (id, t, a, h) => got.push([id, t, a, h]);
    const n0 = got.length;
    expect(q.s.shotKick(-5, c, 0.7, -2, c, 0.7, 1)).toBe(0);
    expect(got.length).toBe(n0);
    // a round that stops on the ceiling 1 m from the fitting (along +z): kicked away from the impact (-z)
    expect(q.s.shotKick(0, 0, 4, 0, c, 1, 2)).toBe(1);
    const k = got[got.length - 1]!;
    expect(k[2]).toBeCloseTo((SWAY.kickShot * (1 - 1 / SWAY.near)) / q.s.w[0]!, 12);
    expect(k[3]).toBeCloseTo(-Math.PI / 2, 12);
    // a client asks only when the host would kick
    expect(q.s.shotKicks(0, -5, c, 0.7, -2, c, 0.7)).toBe(false);
    expect(q.s.shotKicks(0, -5, c, 0.3, 5, c, 0.3)).toBe(true);
  });

  it('blastKick and bumpKick: scaled by distance, capped, away from the source', () => {
    const { s } = hung(2.38);
    const got: number[][] = [];
    s.onKick = (id, t, a, h) => got.push([id, t, a, h]);
    const c = 5 + PENDANT.oy;
    // 3 m to the -x side: half speed, pushed +x
    expect(s.blastKick(-3, c, 0, 1)).toBe(1);
    expect(got[0]![2]).toBeCloseTo((SWAY.kickBlast * 0.5) / s.w[0]!, 12);
    expect(got[0]![3]).toBeCloseTo(0, 12);
    // past blastReach: nothing
    expect(s.blastKick(-SWAY.blastReach - 0.1, c, 0, 2)).toBe(0);
    // at the fitting itself: capped at what is left under maxAmp
    const e = s.envelopeAt(0, 3);
    expect(s.blastKick(0, c, 0, 3)).toBe(1);
    expect(got[1]![2]).toBeCloseTo(SWAY.maxAmp - e, 12);
    expect(s.envelopeAt(0, 3)).toBeCloseTo(SWAY.maxAmp, 12);
    // inside minGap: dropped; after it, only what has decayed since is added (never past the cap)
    expect(s.blastKick(0, c, 0, 3 + SWAY.minGap / 2)).toBe(0);
    const e2 = s.envelopeAt(0, 3 + SWAY.minGap);
    expect(s.blastKick(0, c, 0, 3 + SWAY.minGap)).toBe(1);
    expect(got[2]![2]).toBeCloseTo(SWAY.maxAmp - e2, 12);
    expect(s.envelopeAt(0, 3 + SWAY.minGap)).toBeCloseTo(SWAY.maxAmp, 12);
    // a head inside the box: kickBump / w, away from the head (+z); 0.5 m below the box: nothing
    const b = hung(2.38);
    b.s.onKick = (id, t, a, h) => got.push([id, t, a, h]);
    const n0 = got.length;
    b.s.time[0] = 1;
    expect(b.s.bumpKick(new Float32Array([0, c - PENDANT.sy / 2 - 0.5, 0]), 1)).toBe(0);
    expect(got.length).toBe(n0);
    expect(b.s.bumpKick(new Float32Array([5, 1, 5, 0, c, -0.05]), 2)).toBe(1);
    expect(got[n0]![2]).toBeCloseTo(SWAY.kickBump / b.s.w[0]!, 12);
    expect(got[n0]![3]).toBeCloseTo(Math.PI / 2, 12);
  });
});

describe('versions', () => {
  it('tickSway moves swayVersion, never version; a settled pendant writes nothing more', () => {
    const { reg, l } = hung(2.38);
    const v = reg.version;
    reg.swayImpulse(l.id, 0.5, 0.2, 1);
    let sv = reg.swayVersion;
    let moves = 0;
    for (let k = 0; k < 60 * 60; k++) {
      reg.tickSway(k / 60);
      if (reg.swayVersion !== sv) moves++;
      sv = reg.swayVersion;
    }
    expect(reg.version).toBe(v);
    expect(moves).toBeGreaterThan(500);
    // settled after a minute: offset 0, and no more writes
    expect(l.swx).toBe(0);
    expect(l.swy).toBe(0);
    expect(l.swz).toBe(0);
    for (let k = 0; k < 600; k++) reg.tickSway(60 + k / 60);
    expect(reg.swayVersion).toBe(sv);
    // a registry without pendants: nothing at all
    const plain = new LightRegistry();
    plain.add({ x: 0, y: 3, z: 0 });
    plain.tickSway(1);
    plain.swayImpulse(0, 1, 0.1, 0);
    expect(plain.swayVersion).toBe(0);
    expect(plain.lights[0]!.swx).toBe(0);
  });
});

describe('light parity', async () => {
  const { LightField } = await import('../src/world/lightField');
  const { bakeLamps } = await import('../src/voxel/lampBake');
  const { bakedLights } = await import('../src/world/lightBake');
  const { buildAmbientGrid } = await import('../src/world/ambientGrid');
  const { bakeMoon, MOON_CELL } = await import('../src/voxel/skyBake');
  const { packShapes } = await import('../src/voxel/shapes');

  /** An open room (a floor only) under one pendant: baked as the game does, no bounce, no moon level. */
  function room(): { reg: LightRegistry; f: InstanceType<typeof LightField>; l: LightDef } {
    const { reg, l } = hung(2.38, 0, 0, false);
    // (dim, so no point saturates at 1)
    l.intensity = 0.05;
    reg.ambient = 0.1;
    const shapes = packShapes([{ kind: 'box', c: [0, -0.25, 0], s: [30, 0.5, 30], yaw: 0, pitch: 0, mat: 1 }]);
    const lo: [number, number, number] = [-14, -1, -14];
    const hi: [number, number, number] = [14, 9, 14];
    const baked = bakedLights(reg);
    const r = bakeLamps({ kind: 'lamps', id: 0, shapes, lights: baked.lights, lo, hi });
    const n: [number, number, number] = [56, 20, 56];
    const m = bakeMoon({ kind: 'moon', id: 0, origin: lo, n, shapes, dir: [0, -1, 0] });
    const ambient = buildAmbientGrid({ ambientAt: () => reg.ambient }, lo, hi);
    const bake = { lo, hi, lampKey: 'k', moonKey: 'm', lamps: { baked, r: { ...r, bounce: undefined } }, moon: { origin: lo, n, cell: MOON_CELL, vis: m.vis, dir: [0, -1, 0] as [number, number, number] }, ambient, moonLight: 0, ms: 0 };
    return { reg, f: new LightField(bake, reg), l };
  }

  it('the level at P + offset with the lamp swung equals the level at P at rest; contribution agrees with the field', () => {
    const { reg, f, l } = room();
    const pts = [
      [1, 1, 0.5],
      [-2, 1.1, 1.5],
      [0.4, 2.5, -1],
      [3, 1.2, 2],
    ];
    // (the fill alone: the lamp off; the open room's fill is the same everywhere)
    l.on = false;
    const fill = f.levelAt(1, 1, 0.5);
    l.on = true;
    const rest = pts.map(([x, y, z]) => f.levelAt(x!, y!, z!));
    const restC = pts.map(([x, y, z]) => contribution(l, x!, y!, z!));
    reg.swayImpulse(l.id, 0, 0.2, 0.7);
    reg.tickSway(0.6);
    expect(Math.sqrt(l.swx * l.swx + l.swz * l.swz)).toBeGreaterThan(0.05);
    pts.forEach(([x, y, z], k) => {
      const swung = f.levelAt(x! + l.swx, y! + l.swy, z! + l.swz);
      expect(Math.abs(swung - rest[k]!)).toBeLessThan(1e-9);
      // the field's lamp term (level less the fill) is `contribution` at the swung position
      expect(rest[k]!).toBeLessThan(1);
      expect(rest[k]! - fill).toBeGreaterThan(1e-3);
      expect(Math.abs(swung - fill - contribution(l, x! + l.swx, y! + l.swy, z! + l.swz))).toBeLessThan(1e-5);
      expect(Math.abs(contribution(l, x! + l.swx, y! + l.swy, z! + l.swz) - restC[k]!)).toBeLessThan(1e-12);
    });
    // and the swing moves the light where it lands
    expect(Math.abs(f.levelAt(1, 1, 0.5) - rest[0]!)).toBeGreaterThan(1e-4);
  });
});

describe('ctcourse table', () => {
  it('Marlow Yard: 4+ pendants, 2 hangers each, hidden; the canonical light set is unchanged; other maps have none', () => {
    const plain = new LevelBuilder();
    ctcourse.build(plain, 0);
    const before = canonicalLightSet(plain.boxes, plain.cylinders, 'ctcourse', dressingOn(ctcourse)).hash;
    const b = new LevelBuilder();
    ctcourse.build(b, 0);
    applyMapFlicker(b.lights, 'ctcourse', 1);
    const vis0 = b.boxes.map((x) => x.visible !== false);
    const s = applyMapSway(b, 'ctcourse');
    expect(s).not.toBeNull();
    expect(b.lights.sway).toBe(s);
    expect(s!.n).toBeGreaterThanOrEqual(4);
    expect(s!.n).toBeLessThanOrEqual(SWAY_PENDANTS.ctcourse!.length);
    expect(s!.hangerCount).toBe(2 * s!.n);
    for (let k = 0; k < s!.n; k++) {
      let c = 0;
      for (let j = 0; j < s!.hangerCount; j++) if (s!.hangers[j * HANGER_STRIDE] === k) c++;
      expect(c).toBe(2);
      const l = b.lights.lights[s!.ids[k]!]!;
      expect(l.fixture && !l.fixture.model).toBeTruthy();
      expect(s!.len[k]).toBeGreaterThan(0.5);
    }
    const hidden = b.boxes.filter((x, i) => vis0[i] && x.visible === false);
    expect(hidden.length).toBe(2 * s!.n);
    for (const h of hidden) expect(Math.min(...h.s)).toBeLessThan(CANON_MIN_THICK);
    expect(canonicalLightSet(b.boxes, b.cylinders, 'ctcourse', dressingOn(ctcourse)).hash).toBe(before);
    for (const [id, m] of [['campusOps', campusOps], ['warehouseOps', warehouseOps], ['warehouse', warehouse]] as const) {
      const o = new LevelBuilder();
      m.build(o, 0);
      const v = o.boxes.map((x) => x.visible);
      expect(applyMapSway(o, id)).toBeNull();
      expect(o.lights.sway).toBeNull();
      expect(o.boxes.map((x) => x.visible)).toEqual(v);
    }
  });

  it('a pendant with fewer than two hangers is dropped (never a lamp swinging under static cables)', () => {
    const reg = new LightRegistry();
    const l = reg.add({ x: 0, y: 5, z: 0, radius: 13, fixture: { ...PENDANT } });
    const boxes: BoxPiece[] = [{ c: [0.5, 6.3, 0], s: [0.04, 2.36, 0.04], yaw: 0, pitch: 0, color: '#888', collide: false, visible: true }];
    expect(claimHangers(boxes, l)).toEqual([]);
    expect(boxes[0]!.visible).toBe(true);
  });
});

describe('picker', () => {
  it('a held swinging lamp keeps its slot against a nearer still lamp past minHold; refreshEvery 1 while it swings, 2 when still', () => {
    const p = new LampSlotPicker(4);
    p.setSlots(1);
    const lamps = new Float32Array([0, 3, 0, 20, 6, 3, 0, 10]);
    const focus = new Float32Array([10, 1, 0]);
    const lit = new Uint8Array([1, 0]);
    const moving = new Uint8Array([1, 0]);
    p.update(lamps, lit, 2, focus, 1, 0.2, moving);
    expect(p.slotLamp[0]).toBe(0);
    lit[1] = 1;
    for (let i = 0; i < 20; i++) p.update(lamps, lit, 2, focus, 1, CHAR_SHADOW.pickEvery, moving);
    expect(p.slotLamp[0]).toBe(0);
    expect(p.refreshEvery(0)).toBe(1);
    moving[0] = 0;
    expect(p.refreshEvery(0)).toBe(2);
    for (let i = 0; i < 3; i++) p.update(lamps, lit, 2, focus, 1, CHAR_SHADOW.pickEvery, moving);
    expect(p.slotLamp[0]).toBe(1);
  });
});

describe('alloc', () => {
  it('tickSway, shotKick, blastKick and bumpKick allocate nothing (0 B a call: doubles in and out through typed slots)', async () => {
    const { reg, s, l } = hung(1.83);
    const c = 5 + PENDANT.oy;
    const T = inputs(2000, (k) => 10 + (k % 40) * 0.05);
    const pts = new Float32Array([0, c, 0.05, 3, 1, 3]);
    reg.swayImpulse(l.id, 9, 0.1, 0.3);
    const tick = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) {
        reg.tickSway(T[i]!);
        sink[0] = l.swx;
      }
    }, 0);
    const shot = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) sink[0] = s.shotKick(-4, c, 0.1, 4, c, -0.1, T[i]!);
    }, 0);
    const blast = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) sink[0] = s.blastKick(1, 1, 1, T[i]!);
    }, 0);
    const bump = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) {
        s.time[0] = T[i]!;
        sink[0] = s.bumpKick(pts, 2);
      }
    }, 0);
    console.info(`bytes per call: tickSway ${tick.toFixed(1)}, shotKick ${shot.toFixed(1)}, blastKick ${blast.toFixed(1)}, bumpKick ${bump.toFixed(1)}`);
    expect(tick).toBeLessThan(1);
    expect(shot).toBeLessThan(1);
    expect(blast).toBeLessThan(1);
    expect(bump).toBeLessThan(1);
  });
});

describe('protocol 39', () => {
  const evs = (events: unknown[]): unknown[] => {
    const m = parseMessage(JSON.parse(JSON.stringify({ t: 'ev', events })));
    return m && m.t === 'ev' ? m.events : [];
  };

  it('the sway event round-trips, clamps and rejects garbage', () => {
    const e = { e: 'sway', id: 7, t: 123.4567, a: 0.1234, h: -2.5 };
    expect(evs([e])).toEqual([e]);
    expect(evs([{ e: 'sway', id: 7, t: -3, a: 9, h: 10 }])).toEqual([{ e: 'sway', id: 7, t: 0, a: SWAY.maxAmp, h: Math.PI }]);
    for (const bad of [
      { e: 'sway', id: 'x', t: 1, a: 0.1, h: 0 },
      { e: 'sway', id: 1.5, t: 1, a: 0.1, h: 0 },
      { e: 'sway', id: -1, t: 1, a: 0.1, h: 0 },
      { e: 'sway', id: 5000, t: 1, a: 0.1, h: 0 },
      { e: 'sway', id: 3, t: 'soon', a: 0.1, h: 0 },
      { e: 'sway', id: 3, t: 1, a: null, h: 0 },
      { e: 'sway', id: 3, t: 1, a: 0.1 },
      { e: 'sway', id: 3, t: 1, a: 0.1, h: Number.NaN },
    ])
      expect(evs([bad])).toEqual([]);
  });

  it('a client shot at sw-<id> parses; the target names a pendant only; the host checks the round left from the body', () => {
    const m = parseMessage({ t: 'shot', w: 'pistolSd', ox: 1, oy: 1.5, oz: 1, dx: 1, dy: 0, dz: 0, target: SWAY_TARGET + 12, part: 'body', rt: 1, dist: 10, dmg: 0 });
    expect(m && m.t === 'shot' ? m.target : null).toBe('sw-12');
    expect(swayTargetId('sw-12')).toBe(12);
    expect(swayTargetId('sw-x')).toBe(-1);
    expect(swayTargetId('sw-99999')).toBe(-1);
    expect(swayTargetId('lt-3')).toBe(-1);
    const { reg, l } = hung(2.38);
    const feet = { x: 0, y: 0, z: -4 };
    expect(swayShotOk(reg, l.id, { x: 0, y: 1.4, z: -4 }, feet)).toBe(0);
    expect(swayShotOk(reg, l.id, { x: 0, y: 5, z: 0 }, feet)).toBe(-1);
    expect(swayShotOk(reg, 0, { x: 0, y: 1.4, z: -4 }, feet)).toBe(-1);
    expect(swayShotOk(new LightRegistry(), 0, { x: 0, y: 1.4, z: -4 }, feet)).toBe(-1);
  });
});
