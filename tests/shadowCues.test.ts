/**
 * (char-shadow-meter S3) ShadowCues against a small fake of the field's set contract (`sourcesInto` / `sourceAt` /
 * `totalAt`, PLAN section 2): point lamps with an inverse-square-ish term, a moon, an ambient floor and walls that
 * cut a source's term. Expectations are computed from the fake, never literal levels (A12).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAPSULE, CHAR_LIGHT, CharOccluders, OCC_KIND, occKey } from '../src/world/charOccluders';
import { LightField } from '../src/world/lightField';
import { LightRegistry, type LightDef } from '../src/world/lights';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { bakeLamps } from '../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { packShapes } from '../src/voxel/shapes';
import { bakedLights } from '../src/world/lightBake';
import { CUE, CUE_AT, CUE_LEVEL_FLOOR, CUE_NONE, ShadowCues, type CueField, type CueLight, type CuePlayer } from '../src/world/shadowCues';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';

// the real field and registry light fit the cue's inputs (a compile-time check)
const fieldFits = (f: LightField): CueField => f;
const lightFits = (l: LightDef): CueLight => l;
void fieldFits;
void lightFits;

/** A wall: the plane x = `x` between z0..z1, up to `top`; it cuts a source whose segment to the point crosses it. */
interface Wall {
  x: number;
  z0: number;
  z1: number;
  top: number;
}

/** Point lamps (term I / (1 + d^2)), a moon (`moon` everywhere it is not walled), `ambient`; registry ids = index. */
class FakeField implements CueField {
  readonly lamps: (CueLight & { i: number })[] = [];
  walls: Wall[] = [];
  moon = 0;
  moonDir: [number, number, number] | null = null;
  ambient = 0.01;
  lamp(x: number, y: number, z: number, i: number): number {
    this.lamps.push({ x, y, z, swx: 0, swy: 0, swz: 0, i });
    return this.lamps.length - 1;
  }
  private blocked(sx: number, sy: number, sz: number, x: number, y: number, z: number): boolean {
    for (let w = 0; w < this.walls.length; w++) {
      const W = this.walls[w]!;
      if ((sx - W.x) * (x - W.x) >= 0) continue;
      const t = (W.x - sx) / (x - sx);
      const cy = sy + (y - sy) * t;
      const cz = sz + (z - sz) * t;
      if (cy <= W.top && cz >= W.z0 && cz <= W.z1) return true;
    }
    return false;
  }
  sourceAt(id: number, x: number, y: number, z: number): number {
    if (id === -1) {
      const d = this.moonDir;
      if (!d || this.moon <= 0) return 0;
      return this.blocked(x + d[0] * CHAR_LIGHT.moonFar, y + d[1] * CHAR_LIGHT.moonFar, z + d[2] * CHAR_LIGHT.moonFar, x, y, z) ? 0 : this.moon;
    }
    const L = this.lamps[id];
    if (!L) return 0;
    if (this.blocked(L.x, L.y, L.z, x, y, z)) return 0;
    const dx = x - L.x;
    const dy = y - L.y;
    const dz = z - L.z;
    return L.i / (1 + dx * dx + dy * dy + dz * dz);
  }
  sourcesInto(x: number, y: number, z: number, ids: Int32Array, lv: Float32Array, max: number): number {
    let n = 0;
    for (let id = -1; id < this.lamps.length; id++) {
      const v = this.sourceAt(id, x, y, z);
      if (v < CHAR_LIGHT.minLevel) continue;
      // insertion, strongest first
      let k: number;
      if (n < max) k = n++;
      else if (lv[max - 1]! >= v) continue;
      else k = max - 1;
      while (k > 0 && lv[k - 1]! < v) {
        ids[k] = ids[k - 1]!;
        lv[k] = lv[k - 1]!;
        k--;
      }
      ids[k] = id;
      lv[k] = v;
    }
    return n;
  }
  totalAt(x: number, y: number, z: number): number {
    let v = this.ambient + this.sourceAt(-1, x, y, z);
    for (let id = 0; id < this.lamps.length; id++) v += this.sourceAt(id, x, y, z);
    return v > 1 ? 1 : v;
  }
  // (S3b) the typed point input over the same maths
  readonly qp = new Float64Array(3);
  readonly qr = new Float64Array(1);
  sourcesQ(ids: Int32Array, lv: Float32Array, max: number): number {
    return this.sourcesInto(this.qp[0]!, this.qp[1]!, this.qp[2]!, ids, lv, max);
  }
  sourceQ(id: number): void {
    this.qr[0] = this.sourceAt(id, this.qp[0]!, this.qp[1]!, this.qp[2]!);
  }
  totalQ(): void {
    this.qr[0] = this.totalAt(this.qp[0]!, this.qp[1]!, this.qp[2]!);
  }
}

/** An upright player capsule standing at (x, y, z): feet plane y, radius r, top y + 1.75. */
const R = 0.25;
const TOP = 1.75;
function stand(occ: CharOccluders, index: number, x: number, y: number, z: number): number {
  return occ.add(OCC_KIND.player, index, x, y + R, z, x, y + TOP - R, z, R);
}
const KEYS = new Int32Array([occKey(OCC_KIND.player, 0), occKey(OCC_KIND.player, 1), occKey(OCC_KIND.player, 2), occKey(OCC_KIND.player, 3)]);
const PLAYERS: CuePlayer[] = [{ id: 'local' }, { id: 'peerA' }, { id: 'peerB' }, { id: 'peerC' }];

function setup(): { f: FakeField; occ: CharOccluders; cues: ShadowCues } {
  const f = new FakeField();
  const occ = new CharOccluders();
  const cues = new ShadowCues(f, f.lamps, null);
  return { f, occ, cues };
}
/** Point p of footprint c of slot s: x, y, z, contrast. */
function pt(cues: ShadowCues, s: number, c: number, p: number): [number, number, number, number] {
  const o = ((s * CUE.sources + c) * CUE.points + p) * 4;
  return [cues.pts[o]!, cues.pts[o + 1]!, cues.pts[o + 2]!, cues.pts[o + 3]!];
}

describe('ShadowCues footprints (S3)', () => {
  it('an overhead lamp gives a footprint under the feet', () => {
    const { f, occ, cues } = setup();
    const id = f.lamp(2, 4, 3, 2);
    stand(occ, 0, 2, 0, 3);
    cues.fill(occ, PLAYERS, KEYS, 1, 0.1);
    expect(cues.count[0]).toBe(1);
    expect(cues.source[0]).toBe(id);
    for (let p = 0; p < CUE.points; p++) {
      const [x, y, z, c] = pt(cues, 0, 0, p);
      // within the capsule radius of the feet: the shadow under the body
      expect(Math.sqrt((x - 2) ** 2 + (z - 3) ** 2)).toBeCloseTo(R * CUE_AT[p]!, 5);
      expect(y).toBeCloseTo(CUE.floorLift, 6);
      expect(c).toBeGreaterThan(0);
    }
  });

  it('a side lamp gives one pointing away from it with the projected length', () => {
    const { f, occ, cues } = setup();
    f.lamp(3, 4, 0, 3);
    stand(occ, 0, 0, 0, 0);
    cues.fill(occ, PLAYERS, KEYS, 1, 0.1);
    expect(cues.count[0]).toBe(1);
    // similar triangles: d x H / (h_lamp - H)
    const len = (3 * TOP) / (4 - TOP);
    for (let p = 0; p < CUE.points; p++) {
      const [x, , z] = pt(cues, 0, 0, p);
      expect(x).toBeCloseTo(-len * CUE_AT[p]!, 4);
      expect(z).toBeCloseTo(0, 5);
    }
    // a diagonal lamp: direction away from it, same rule
    const g = setup();
    g.f.lamp(2, 5, 0, 3);
    stand(g.occ, 0, 1, 0, 1);
    g.cues.fill(g.occ, PLAYERS, KEYS, 1, 0.1);
    const [x, , z] = pt(g.cues, 0, 0, 2);
    const d = Math.SQRT2;
    const L = (d * TOP) / (5 - TOP);
    expect(x).toBeCloseTo(1 - L / Math.SQRT2, 4);
    expect(z).toBeCloseTo(1 + L / Math.SQRT2, 4);
  });

  it('a lamp at or below the top clamps the length to maxLen; one below the feet casts none', () => {
    const { f, occ, cues } = setup();
    f.lamp(2, 1.2, 0, 2);
    stand(occ, 0, 0, 0, 0);
    cues.fill(occ, PLAYERS, KEYS, 1, 0.1);
    expect(cues.count[0]).toBe(1);
    expect(pt(cues, 0, 0, 2)[0]).toBeCloseTo(-CUE.maxLen, 5);
    // a long but finite projection is clamped too
    const g = setup();
    g.f.lamp(3, TOP + 0.1, 0, 3);
    stand(g.occ, 0, 0, 0, 0);
    g.cues.fill(g.occ, PLAYERS, KEYS, 1, 0.1);
    expect(pt(g.cues, 0, 0, 2)[0]).toBeCloseTo(-CUE.maxLen, 5);
    // a lamp under the floor the player stands on (a walkway over it)
    const b = setup();
    b.f.lamp(1, 1, 0, 3);
    stand(b.occ, 0, 0, 1.5, 0);
    b.cues.fill(b.occ, PLAYERS, KEYS, 1, 0.1);
    expect(b.cues.count[0]).toBe(0);
  });

  it('a wall cuts the far points to contrast 0', () => {
    const { f, occ, cues } = setup();
    f.lamp(3, 4, 0, 3);
    stand(occ, 0, 0, 0, 0);
    const len = (3 * TOP) / (4 - TOP);
    // a wall between the near point and the far ones (the chest is on the lamp's side of it)
    f.walls.push({ x: -len * 0.5, z0: -5, z1: 5, top: 1.2 });
    cues.fill(occ, PLAYERS, KEYS, 1, 0.1);
    expect(cues.count[0]).toBe(1);
    expect(pt(cues, 0, 0, 0)[3]).toBeGreaterThan(0);
    expect(pt(cues, 0, 0, 1)[3]).toBe(0);
    expect(pt(cues, 0, 0, 2)[3]).toBe(0);
  });

  it('contrast = L_s x (1 - floor) / max(level, 0.02) at each point', () => {
    const { f, occ, cues } = setup();
    f.lamp(3, 4, 0, 3);
    f.lamp(-4, 3, 4, 1);
    f.ambient = 0.05;
    stand(occ, 0, 0, 0, 0);
    cues.fill(occ, PLAYERS, KEYS, 1, 0.1);
    for (let c = 0; c < cues.count[0]!; c++) {
      for (let p = 0; p < CUE.points; p++) {
        const [x, y, z, con] = pt(cues, 0, c, p);
        const ls = f.sourceAt(cues.source[c]!, x, y, z);
        const want = Math.min(1 - CAPSULE.floor, (ls * (1 - CAPSULE.floor)) / Math.max(f.totalAt(x, y, z), CUE_LEVEL_FLOOR));
        expect(con).toBeCloseTo(want, 5);
      }
    }
    // a weak point in deep dark: the denominator floor keeps it finite and under 1 - floor
    const g = setup();
    g.f.ambient = 0;
    g.f.lamp(0, 8, 0, 6);
    stand(g.occ, 0, 0, 0, 0);
    g.cues.fill(g.occ, PLAYERS, KEYS, 1, 0.1);
    expect(pt(g.cues, 0, 0, 0)[3]).toBeLessThanOrEqual(1 - CAPSULE.floor + 1e-6);
  });

  it('the moon footprint follows its elevation', () => {
    for (const elev of [60, 45, 30, 12]) {
      const f = new FakeField();
      const e = (elev * Math.PI) / 180;
      // the moon to the +x side: shadows fall towards -x
      f.moonDir = [Math.cos(e), Math.sin(e), 0];
      f.moon = 0.2;
      const occ = new CharOccluders();
      const cues = new ShadowCues(f, f.lamps, f.moonDir);
      stand(occ, 0, 0, 0, 0);
      cues.fill(occ, PLAYERS, KEYS, 1, 0.1);
      expect(cues.count[0]).toBe(1);
      expect(cues.source[0]).toBe(-1);
      const want = Math.min(CUE.maxLen, TOP / Math.tan(e));
      expect(pt(cues, 0, 0, 2)[0]).toBeCloseTo(-want, 4);
      expect(pt(cues, 0, 0, 2)[2]).toBeCloseTo(0, 5);
      expect(pt(cues, 0, 0, 2)[3]).toBeGreaterThan(0);
    }
    // no moon given: the moon is never a footprint
    const f = new FakeField();
    f.moonDir = [0, 1, 0];
    f.moon = 0.2;
    const occ = new CharOccluders();
    stand(occ, 0, 0, 0, 0);
    const cues = new ShadowCues(f, f.lamps, null);
    cues.fill(occ, PLAYERS, KEYS, 1, 0.1);
    expect(cues.count[0]).toBe(0);
  });

  it('speed from two fills', () => {
    const { f, occ, cues } = setup();
    f.lamp(3, 4, 0, 3);
    stand(occ, 0, 0, 0, 0);
    cues.fill(occ, PLAYERS, KEYS, 1, 0.1);
    expect(cues.speed[0]).toBe(0); // first fill: nothing to compare
    const far0 = pt(cues, 0, 0, 2);
    occ.clear();
    stand(occ, 0, 0, 0, 0.4);
    cues.fill(occ, PLAYERS, KEYS, 1, 0.1);
    const far1 = pt(cues, 0, 0, 2);
    expect(cues.speed[0]).toBeCloseTo(Math.sqrt((far1[0] - far0[0]) ** 2 + (far1[2] - far0[2]) ** 2) / 0.1, 3);
    expect(cues.speed[0]).toBeGreaterThan(3);
    // standing still: 0
    cues.fill(occ, PLAYERS, KEYS, 1, 0.1);
    expect(cues.speed[0]).toBe(0);
    // a different player in the slot: no speed carried over
    occ.clear();
    stand(occ, 0, 1, 0, 1);
    cues.fill(occ, [{ id: 'other' }], KEYS, 1, 0.1);
    expect(cues.speed[0]).toBe(0);
    // dt 0: 0
    cues.fill(occ, [{ id: 'other' }], KEYS, 1, 0);
    expect(cues.speed[0]).toBe(0);
  });

  it('a footprint keeps its speed when its strength order changes (matched by source id)', () => {
    const { f, occ, cues } = setup();
    const a = f.lamp(3, 4, 0, 3);
    const b = f.lamp(-3, 4, 0, 2);
    stand(occ, 0, 0, 0, 0);
    cues.fill(occ, PLAYERS, KEYS, 1, 0.1);
    expect([cues.source[0], cues.source[1]]).toEqual([a, b]);
    const farB = pt(cues, 0, 1, 2);
    occ.clear();
    stand(occ, 0, -1.6, 0, 0); // now nearer b: b is the stronger
    cues.fill(occ, PLAYERS, KEYS, 1, 0.1);
    expect([cues.source[0], cues.source[1]]).toEqual([b, a]);
    const farB1 = pt(cues, 0, 0, 2);
    expect(cues.speed[0]).toBeCloseTo(Math.abs(farB1[0] - farB[0]) / 0.1, 3);
  });

  it('the 3 strongest sources at the chest giving at least minLevel are picked', () => {
    const { f, occ, cues } = setup();
    const ids = [f.lamp(3, 4, 0, 1), f.lamp(-3, 4, 0, 4), f.lamp(0, 4, 3, 2), f.lamp(0, 4, -3, 3), f.lamp(9, 4, 9, 2)];
    stand(occ, 0, 0, 0, 0);
    cues.fill(occ, PLAYERS, KEYS, 1, 0.1);
    expect(cues.count[0]).toBe(3);
    expect([cues.source[0], cues.source[1], cues.source[2]]).toEqual([ids[1], ids[3], ids[2]]);
    // under CUE.minLevel at the chest: not a source (the far lamp reads ~0.01; a weak near one too)
    const g = setup();
    g.f.lamp(3, 4, 0, 3);
    const weak = g.f.lamp(-3, 4, 0, 0.9); // ~0.06 at the chest: in the light set (>= 0.04), under 0.08
    stand(g.occ, 0, 0, 0, 0);
    g.cues.fill(g.occ, PLAYERS, KEYS, 1, 0.1);
    const chest = g.f.sourceAt(weak, 0, TOP * 0.6, 0);
    expect(chest).toBeGreaterThanOrEqual(CHAR_LIGHT.minLevel);
    expect(chest).toBeLessThan(CUE.minLevel);
    expect(g.cues.count[0]).toBe(1);
    expect(g.cues.source[1]).toBe(CUE_NONE);
  });

  it('a light the player holds casts no footprint and the next one takes its place', () => {
    const { f, occ, cues } = setup();
    const torch = f.lamp(0.4, 1.3, 0, 5); // held at the chest, in front
    const lamp = f.lamp(3, 4, 0, 2);
    stand(occ, 0, 0, 0, 0);
    cues.fill(occ, PLAYERS, KEYS, 1, 0.1);
    expect(cues.count[0]).toBe(1);
    expect(cues.source[0]).toBe(lamp);
    expect(cues.source[0]).not.toBe(torch);
  });

  it('zero contrast and no footprints in darkness', () => {
    const { f, occ, cues } = setup();
    f.ambient = 0;
    f.lamp(30, 4, 0, 2); // out of reach (under minLevel at the chest)
    stand(occ, 0, 0, 0, 0);
    cues.fill(occ, PLAYERS, KEYS, 1, 0.1);
    expect(cues.count[0]).toBe(0);
    for (let i = 3; i < cues.pts.length; i += 4) expect(cues.pts[i]).toBe(0);
    expect(cues.source[0]).toBe(CUE_NONE);
    // a lamp that reaches the chest but a wall cuts the whole floor: footprint kept, every contrast 0
    const g = setup();
    g.f.lamp(3, 4, 0, 3);
    g.f.walls.push({ x: -0.01, z0: -5, z1: 5, top: 1.7 });
    stand(g.occ, 0, 0.2, 0, 0);
    g.cues.fill(g.occ, PLAYERS, KEYS, 1, 0.1);
    expect(g.cues.count[0]).toBe(1);
    expect(pt(g.cues, 0, 0, 0)[3]).toBe(0);
    expect(pt(g.cues, 0, 0, 1)[3]).toBe(0);
    expect(pt(g.cues, 0, 0, 2)[3]).toBe(0);
  });
});

describe('ShadowCues slots (S3)', () => {
  it('slots follow the players in order; slotOf is the id lookup; unused slots are cleared', () => {
    const { f, occ, cues } = setup();
    f.lamp(0, 4, 0, 4);
    stand(occ, 1, 1, 0, 0);
    stand(occ, 0, -1, 0, 0);
    // player 2 has no capsule in the contract
    cues.fill(occ, PLAYERS, KEYS, 3, 0.1);
    expect(cues.n).toBe(3);
    expect(cues.slotOf('local')).toBe(0);
    expect(cues.slotOf('peerA')).toBe(1);
    expect(cues.slotOf('peerB')).toBe(2);
    expect(cues.slotOf('peerC')).toBe(-1);
    expect(cues.slotOf('nobody')).toBe(-1);
    // slot 0 is the capsule keyed player 0 (x = -1), slot 1 player 1 (x = 1)
    expect(pt(cues, 0, 0, 2)[0]).toBeLessThan(-1);
    expect(pt(cues, 1, 0, 2)[0]).toBeGreaterThan(1);
    expect(cues.count[2]).toBe(0);
    expect(cues.count[3]).toBe(0);
    // fewer players next fill: the old slots empty
    cues.fill(occ, PLAYERS, KEYS, 1, 0.1);
    expect(cues.slotOf('peerA')).toBe(-1);
    expect(cues.count[1]).toBe(0);
    for (let i = 3 + CUE.sources * CUE.points * 4; i < cues.pts.length; i += 4) expect(cues.pts[i]).toBe(0);
    // more players than slots: the first CUE.players
    const many = [...PLAYERS, { id: 'extra' }];
    cues.fill(occ, many, new Int32Array([...KEYS, occKey(OCC_KIND.player, 4)]), 5, 0.1);
    expect(cues.n).toBe(CUE.players);
    expect(cues.slotOf('extra')).toBe(-1);
  });

  it('the shadow on a player from someone else is in the level, its own capsule skipped (owner key passed)', () => {
    const { f, occ, cues } = setup();
    f.lamp(3, 4, 0, 3);
    stand(occ, 0, 0, 0, 0);
    const seen: number[] = [];
    const qp = new Float64Array(3);
    const qr = new Float64Array(1);
    const spy: CueField = {
      qp,
      qr,
      sourcesQ: (ids, lv, max) => f.sourcesInto(qp[0]!, qp[1]!, qp[2]!, ids, lv, max),
      sourceQ: (id) => {
        qr[0] = f.sourceAt(id, qp[0]!, qp[1]!, qp[2]!);
      },
      totalQ: (_o, chars, skip) => {
        expect(chars).toBe(occ);
        seen.push(skip);
        qr[0] = f.totalAt(qp[0]!, qp[1]!, qp[2]!);
      },
    };
    const c2 = new ShadowCues(spy, f.lamps, null);
    c2.fill(occ, PLAYERS, KEYS, 1, 0.1);
    expect(seen.length).toBeGreaterThan(0);
    expect(new Set(seen)).toEqual(new Set([KEYS[0]]));
    void cues;
  });

  it('version rises by one each fill', () => {
    const { occ, cues } = setup();
    expect(cues.version).toBe(0);
    cues.fill(occ, PLAYERS, KEYS, 0, 0.1);
    cues.fill(occ, PLAYERS, KEYS, 0, 0.1);
    expect(cues.version).toBe(2);
  });
});

describe('ShadowCues purity (S3)', () => {
  it('a fill allocates nothing', async () => {
    // A field whose calls V8 inlines, so what is measured is the fill itself. A call V8 does not inline boxes each
    // double argument and result (HEAP_NUMBER, tests/helpers/allocPerCall.ts): the scene fake above reads thousands of
    // bytes a fill that way, all at its own call boundaries; the real field's boxing is LightField's cost (S1's checks).
    const lights: CueLight[] = [
      { x: 3, y: 4, z: 0, swx: 0, swy: 0, swz: 0 },
      { x: -3, y: 4, z: 1, swx: 0, swy: 0, swz: 0 },
      { x: 0, y: 4.5, z: -3, swx: 0, swy: 0, swz: 0 },
    ];
    const set = new Int32Array([0, -1, 1, 2]);
    const lvl = new Float32Array([0.5, 0.3, 0.2, 0.1]);
    class FlatField implements CueField {
      readonly qp = new Float64Array(3);
      readonly qr = new Float64Array(1);
      sourcesQ(ids: Int32Array, lv: Float32Array, max: number): number {
        const n = max < 4 ? max : 4;
        for (let i = 0; i < n; i++) {
          ids[i] = set[i]!;
          lv[i] = lvl[i]!;
        }
        return n;
      }
      sourceQ(id: number): void {
        this.qr[0] = id === 1 ? 0 : 0.25;
      }
      totalQ(): void {
        this.qr[0] = 0.6;
      }
    }
    const occ = new CharOccluders();
    for (let k = 0; k < 4; k++) stand(occ, k, k * 0.7 - 1, 0, k * 0.3);
    const cues = new ShadowCues(new FlatField(), lights, [0.6, 0.8, 0]);
    // a control that makes one small object per fill: what a real allocation reads
    const ring: unknown[] = new Array<unknown>(64);
    const ctl = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) {
        cues.fill(occ, PLAYERS, KEYS, 4, 0.1);
        ring[i & 63] = { v: cues.version };
      }
    }, -Infinity, { n: 500, warm: 20000 });
    const per = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) cues.fill(occ, PLAYERS, KEYS, 4, 0.1);
    }, 0, { n: 500, warm: 20000 });
    console.info(`bytes per ShadowCues.fill (4 players, 3 footprints each): ${per.toFixed(1)}, control with an object ${ctl.toFixed(1)}`);
    // every branch ran: lamps, the moon, a source that does not reach the floor (contrast 0)
    expect(cues.count[0]).toBe(3);
    expect([cues.source[0], cues.source[1], cues.source[2]]).toEqual([0, -1, 1]);
    expect(pt(cues, 0, 0, 2)[3]).toBeGreaterThan(0);
    expect(pt(cues, 0, 2, 2)[3]).toBe(0);
    expect(per).toBeLessThan(HEAP_NUMBER);
    expect(ctl).toBeGreaterThan(per + 8);
  });

  it('(S3b, F57) the real LightField (2 lamps and the moon, 4 players): 2-3 footprints each, near points contrasted; one fill allocates 0 B', async () => {
    // the s1-s3 check's scene, baked as the game does: an open floor under two lamps and the moon
    const reg = new LightRegistry();
    reg.ambient = 0.18;
    reg.add({ x: -2.5, y: 3.5, z: 0, radius: 8, intensity: 0.9 });
    reg.add({ x: 3, y: 3.2, z: 1.5, radius: 8, intensity: 0.8 });
    const shapes = packShapes([{ kind: 'box', c: [0, -0.25, 0], s: [24, 0.5, 24], yaw: 0, pitch: 0, mat: 1 }]);
    const lo: [number, number, number] = [-12, -1, -12];
    const hi: [number, number, number] = [12, 6, 12];
    const baked = bakedLights(reg);
    const r = bakeLamps({ kind: 'lamps', id: 0, shapes, lights: baked.lights, lo, hi });
    const dir: [number, number, number] = [0.6, 0.8, 0];
    const n: [number, number, number] = [48, 14, 48];
    const m = bakeMoon({ kind: 'moon', id: 0, origin: lo, n, shapes, dir });
    const moonL = 0.12;
    const sky = reg.ambient - moonL;
    const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, lo, hi);
    const field = new LightField({ lo, hi, lampKey: 'k', moonKey: 'm', lamps: { baked, r }, moon: { origin: lo, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: moonL, ms: 0 }, reg);
    const occ = new CharOccluders();
    for (const [k, x, z] of [[0, -1, -1], [1, 0.5, 1.5], [2, 1.5, -0.5], [3, -0.5, 2.5]] as const) stand(occ, k, x, 0, z);
    const cues = new ShadowCues(field, reg.lights, dir);
    cues.fill(occ, PLAYERS, KEYS, 4, 0.1);
    for (let s = 0; s < 4; s++) {
      expect(cues.count[s], `slot ${s}`).toBeGreaterThanOrEqual(2);
      expect(cues.count[s], `slot ${s}`).toBeLessThanOrEqual(3);
      for (let c = 0; c < cues.count[s]!; c++) expect(pt(cues, s, c, 0)[3], `slot ${s} footprint ${c} near point`).toBeGreaterThan(0);
    }
    const ring: unknown[] = new Array<unknown>(64);
    const ctl = await bytesPerCall((k) => {
      for (let i = 0; i < k; i++) {
        cues.fill(occ, PLAYERS, KEYS, 4, 0.1);
        ring[i & 63] = { v: cues.version };
      }
    }, -Infinity, { n: 200, warm: 10000 });
    const per = await bytesPerCall((k) => {
      for (let i = 0; i < k; i++) cues.fill(occ, PLAYERS, KEYS, 4, 0.1);
    }, 0, { n: 200, warm: 10000 });
    const near: string[] = [];
    for (let s = 0; s < 4; s++) for (let c = 0; c < cues.count[s]!; c++) near.push(pt(cues, s, c, 0)[3].toFixed(2));
    console.info(`bytes per ShadowCues.fill with the real LightField (4 players, ${cues.count.join(' / ')} footprints): ${per.toFixed(1)} (before S3b: 5264, s1-s3 check; before F57: 1296 for 3 players, the bounce read's boxed point), control with an object ${ctl.toFixed(1)}; near-point contrast ${near.join(' ')}`);
    // (F57) 0 B: the bounce grid's point goes through `BounceGrid.q`, the field's through `pt` (tests/lightFieldAlloc.test.ts)
    expect(per).toBe(0);
    expect(ctl).toBeGreaterThan(per + 8);
  });

  it('imports nothing from src/game, src/ai, src/net or graphics, and knows nothing about guards', () => {
    const src = readFileSync('src/world/shadowCues.ts', 'utf8');
    const imports = src.split('\n').filter((l) => /^\s*import\b/.test(l));
    expect(imports.length).toBeGreaterThan(0);
    for (const l of imports) {
      expect(l).not.toMatch(/\/(game|ai|net|ui|render|player)\//);
      expect(l).not.toMatch(/babylon|quality|governor|charShadowSet|bakedLamps|lightRig|torchShadow|lampSlot/i);
      expect(l).toMatch(/from '(\.\/(charOccluders|lights)|\.\.\/core\/mathx)'/);
    }
    // graphics and preset names never appear in the code
    expect(src).not.toMatch(/CHAR_SHADOW_PRESET|LampSlotPicker|charShadowSpec|quality\.|governor/);
    // no guard, enemy or perception code: Guard AI decides the cue
    const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).not.toMatch(/guard|enemy|perception|suspic/i);
  });
});
