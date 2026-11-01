/**
 * (section-bake) The per-section lamp bake (`world/sectionBake.ts`, `voxel/sectionJobs.ts`; brief
 * `docs/sector-redesign/briefs/SECTION-BAKE.md`). The parity proof on a small three-section strip: lamps inside each
 * section, one on a section border, one in the doorway between two sections, shut doors in both doorways. The light field
 * built at load (nothing landed yet) and fed landing by landing (a hand-run pool: one job finishes at a time) equals the
 * full bake's field EXACTLY at hundreds of random points of the live section, for the section that is live, then for a
 * section put live out of order (a late joiner), and everywhere once all have landed; the joined result is then
 * byte-identical to the full bake (the cache entry the next load reads).
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps, BOX_STRIDE, LAMP_STRIDE, type LampJob, type LampResult } from '../src/voxel/lampBake';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField, type FieldDoor } from '../src/world/lightField';
import { SectionBaker } from '../src/voxel/sectionJobs';
import type { WorkerPool } from '../src/voxel/workerPool';
import { inSectionRegion, joinBounce, lampInfluence, lampLayout, lampSectionMasks, sectionBakeFor, sectionOrder, SectionPlan, SECTION_MARGIN, slabDepth, type SectionBakeDef } from '../src/world/sectionBake';

/** Three sections along x (0..18, 18..36, 36..54), 12 m deep, walls 3 m high at x 18 and 36 with a 1.2 m doorway each. */
const DEF: SectionBakeDef = {
  regions: [[[0, 0, 18, 12]], [[18, 0, 36, 12]], [[36, 0, 54, 12]]],
};

function strip() {
  const b = new LevelBuilder();
  b.box(27, -0.1, 6, 56, 0.2, 14, '#888');
  // the end walls and the long walls
  b.box(-0.1, 1.5, 6, 0.2, 3, 12, '#888');
  b.box(54.1, 1.5, 6, 0.2, 3, 12, '#888');
  b.box(27, 1.5, -0.1, 54, 3, 0.2, '#888');
  b.box(27, 1.5, 12.1, 54, 3, 0.2, '#888');
  // the section walls, a doorway at z 5.4 .. 6.6 in each
  for (const x of [18, 36]) {
    b.box(x, 1.5, 2.7, 0.2, 3, 5.4, '#888');
    b.box(x, 1.5, 9.3, 0.2, 3, 5.4, '#888');
  }
  // a rack and a crate (shadows)
  b.box(8, 1, 4, 3, 2, 0.6, '#888');
  b.box(44, 0.5, 8, 1, 1, 1, '#888');
  const reg = b.lights;
  // section 0, a lamp on the 0 / 1 border (x 17.6, by the wall), section 1, a lamp in the 1 / 2 doorway, section 2
  for (const [x, z] of [[5, 6], [12, 9], [17.6, 3], [24, 6], [31, 4], [36, 6], [42, 6], [50, 5]] as const) reg.add({ x, y: 2.8, z, radius: 4, intensity: 1 });
  reg.ambient = 0.2;
  const set = canonicalLightSet(b.boxes, b.cylinders, 'section-strip', false);
  const baked = bakedLights(reg);
  const ambient = buildAmbientGrid(reg, set.lo, set.hi);
  const doors: FieldDoor[] = [18, 36].map((x) => ({ anchor: { hinge: { x, y: 0, z: 5.4 }, yaw: 0, width: 1.2, height: 2.1 }, open: 0 }));
  const bakeOf = (r: LampResult, sections: SectionBaker | null = null): LightBake => ({ lo: set.lo, hi: set.hi, lampKey: null, moonKey: 't', lamps: { baked, r }, moon: { origin: set.lo, n: [1, 1, 1], cell: 1, vis: new Uint8Array([0]), dir: [0, 1, 0] }, ambient, moonLight: 0, ms: 0, sections });
  return { reg, set, baked, doors, bakeOf };
}

/** A hand-run pool: jobs wait until the test finishes them (one at a time, in the order they started). */
function handPool(slots: number) {
  const q: { job: LampJob; resolve: (r: LampResult) => void }[] = [];
  const pool = {
    size: slots,
    cancel: () => false,
    lamps: (job: LampJob) => new Promise<LampResult>((resolve) => q.push({ job, resolve })),
    dispose: () => undefined,
  } as unknown as WorkerPool;
  const finishOne = async (): Promise<number> => {
    const p = q.shift();
    if (!p) return -1;
    p.resolve(bakeLamps(p.job));
    // (the landing runs in the promise callback)
    await Promise.resolve();
    await Promise.resolve();
    return p.job.id;
  };
  return { pool, q, finishOne };
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `n` random points of section k's region (its rects grown by the margin, clipped to the strip), 0.1 .. 2.9 m up. */
function points(k: number, n: number, seed: number): [number, number, number][] {
  const r = rng(seed);
  const out: [number, number, number][] = [];
  const rect = DEF.regions[k]![0]!;
  const m = SECTION_MARGIN;
  const x0 = Math.max(0.05, rect[0] - m);
  const x1 = Math.min(53.95, rect[2] + m);
  while (out.length < n) {
    const x = x0 + (x1 - x0) * r();
    const z = 0.05 + 11.9 * r();
    if (!inSectionRegion(DEF, k, x, z)) continue;
    out.push([x, 0.1 + 2.8 * r(), z]);
  }
  return out;
}

function expectSame(a: LightField, b: LightField, pts: [number, number, number][], tag: string): void {
  let bad = 0;
  let first = '';
  for (const [x, y, z] of pts) {
    const va = a.levelAt(x, y, z);
    const vb = b.levelAt(x, y, z);
    const ba = a.bounceAt(x, y, z);
    const bb = b.bounceAt(x, y, z);
    if (va !== vb || ba !== bb) {
      if (!bad) first = `(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}): level ${va} vs ${vb}, bounce ${ba} vs ${bb}`;
      bad++;
    }
  }
  expect(bad, `${tag}: ${bad} of ${pts.length} points differ, first ${first}`).toBe(0);
}

describe('section bake: membership and plan (pure)', () => {
  it('no map bakes per section today (Saltmarsh Park left in clean-up F); every id keeps the full bake', () => {
    for (const id of ['ctcourse', 'tallowWharf', 'provingGrounds', 'tallowWharf:fullbright', 'toString', '__proto__']) expect(sectionBakeFor(id)).toBeNull();
  });

  it('a lamp counts for every section its influence touches: the border and doorway lamps count for two', () => {
    const { baked } = strip();
    const m = lampSectionMasks(baked.lights, DEF);
    const L = baked.lights;
    for (let i = 0; i < m.length; i++) {
      const x = L[i * LAMP_STRIDE]!;
      const h = lampInfluence(L, i);
      for (let k = 0; k < 3; k++) {
        const r = DEF.regions[k]![0]!;
        const touch = x + h >= r[0] - SECTION_MARGIN && x - h <= r[2] + SECTION_MARGIN;
        expect(!!(m[i]! & (1 << k)), `lamp ${i} section ${k}`).toBe(touch);
      }
    }
    // the border lamp (x 17.6) and the doorway lamp (x 36): two sections at least
    expect(m[2]! & 3).toBe(3);
    expect(m[5]! & 6).toBe(6);
    // the far lamps never reach section 0
    expect(m[7]! & 1).toBe(0);
  });

  it('bake order: the live section, the ones after it, then the earlier ones', () => {
    expect(Array.from(sectionOrder(0, 5))).toEqual([0, 1, 2, 3, 4]);
    expect(Array.from(sectionOrder(2, 5))).toEqual([2, 3, 4, 0, 1]);
    expect(Array.from(sectionOrder(-1, 3))).toEqual([0, 1, 2]);
  });

  it('the plan takes the live section first, biggest first, and moves with setLive', () => {
    // lamps 0, 1 in section 0; 2 in 0 and 1; 3 in 1; 4 in 2; 5 in none
    const masks = Int32Array.from([1, 1, 3, 2, 4, 0]);
    const cost = [10, 30, 20, 50, 5, 1];
    const p = new SectionPlan(masks, cost, 3);
    expect(p.next()).toBe(1);
    expect(p.next()).toBe(2);
    p.setLive(2);
    expect(p.next()).toBe(4);
    p.setLive(0);
    expect(p.next()).toBe(0);
    expect(p.ready(0)).toBe(false);
    for (const i of [0, 1, 2]) p.land(i);
    expect(p.ready(0)).toBe(true);
    expect(p.ready(1)).toBe(false);
    expect(p.ready(7)).toBe(true);
    expect(p.next()).toBe(3);
    // the lamp of no section comes last
    expect(p.next()).toBe(5);
    expect(p.next()).toBe(-1);
    p.release(5);
    expect(p.next()).toBe(5);
    for (const i of [3, 4, 5]) p.land(i);
    expect(p.done).toBe(true);
    expect(p.liveMember(0)).toBe(true);
    expect(p.liveMember(3)).toBe(false);
  });

  it('the layout is the full bake\'s boxes; an empty join is all zero boxes', () => {
    const { baked, set } = strip();
    const full = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
    const lay = lampLayout(baked.lights, set.lo, set.hi);
    expect(Array.from(lay.boxes)).toEqual(Array.from(full.boxes));
    expect(lay.cells).toBe(full.vis.length);
    const j = joinBounce([null, null]);
    expect(Array.from(j.boxes)).toEqual(new Array(12).fill(0));
    expect(j.data.length).toBe(0);
  });

  it('atlas slabs stay within the byte budget, at least one slice', () => {
    expect(slabDepth(100, 50, 4 << 20)).toBe(838);
    expect(slabDepth(192, 97, 1 << 20)).toBe(56);
    expect(slabDepth(4000, 4000, 1000)).toBe(1);
  });
});

describe('section bake: parity with the full bake', () => {
  it('per-section landing equals the full bake at every point of the live section; the joined result is byte-identical', async () => {
    const { reg, set, baked, doors, bakeOf } = strip();
    const full = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
    const fFull = new LightField(bakeOf(full), reg, doors);
    const masks = lampSectionMasks(baked.lights, DEF);
    const hp = handPool(2);
    const sb = new SectionBaker({ shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi, masks, sections: 3, key: null, pool: hp.pool });
    sb.start();
    // the field is built before anything lands (as `World.create` builds it)
    const fSec = new LightField(bakeOf(sb.result, sb), reg, doors);
    let heard = 0;
    sb.onLand((_, k) => (heard += k));
    // section 0 live: land until it is ready, never more than it needs first (biggest of its lamps first)
    const first: number[] = [];
    while (!sb.ready(0)) first.push(await hp.finishOne());
    for (const i of first) expect(masks[i]! & 1, `lamp ${i} baked before section 0 was in`).toBe(1);
    expect(sb.plan.done).toBe(false);
    expectSame(fSec, fFull, points(0, 700, 1), 'section 0 live');
    // a late joiner's section: 2 goes first now
    sb.setLive(2);
    while (!sb.ready(2)) await hp.finishOne();
    expectSame(fSec, fFull, points(2, 700, 2), 'section 2 put live');
    expectSame(fSec, fFull, points(0, 300, 3), 'section 0 still');
    // a door opens and a lamp goes off between landings: the field follows as the full one does
    doors[0]!.open = 1;
    reg.setOn(baked.ids[2]!, false);
    while (!sb.ready(1)) await hp.finishOne();
    expectSame(fSec, fFull, points(1, 700, 4), 'section 1, a door open, a lamp off');
    reg.setOn(baked.ids[2]!, true);
    doors[0]!.open = 0;
    let last = 0;
    while (last >= 0) last = await hp.finishOne();
    await sb.finished;
    expect(sb.done).toBe(true);
    expect(heard).toBe(baked.ids.length);
    for (let k = 0; k < 3; k++) expectSame(fSec, fFull, points(k, 400, 10 + k), `all landed, section ${k}`);
    // the joined result: the full bake's bytes (the cache entry)
    const r = sb.result;
    expect(Array.from(r.boxes)).toEqual(Array.from(full.boxes));
    expect(Buffer.from(r.vis).equals(Buffer.from(full.vis))).toBe(true);
    expect(Array.from(r.bounce!.boxes)).toEqual(Array.from(full.bounce!.boxes));
    expect(Array.from(r.bounce!.data)).toEqual(Array.from(full.bounce!.data));
    expect(Array.from(r.bounce!.bits!)).toEqual(Array.from(full.bounce!.bits!));
    // the bounce grids hold the same bytes
    expect(Array.from(fSec.bounce.g)).toEqual(Array.from(fFull.bounce.g));
    expect(Array.from(fSec.bounce.bits)).toEqual(Array.from(fFull.bounce.bits));
  }, 120_000);

  it('a lamp baked alone gives the bytes it has in the full job', () => {
    const { set, baked } = strip();
    const full = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
    const lay = lampLayout(baked.lights, set.lo, set.hi);
    const i = 5;
    const one = bakeLamps({ kind: 'lamps', id: i, shapes: set.shapes, lights: baked.lights.slice(i * LAMP_STRIDE, (i + 1) * LAMP_STRIDE), lo: set.lo, hi: set.hi });
    const cells = full.boxes[i * BOX_STRIDE + 3]! * full.boxes[i * BOX_STRIDE + 4]! * full.boxes[i * BOX_STRIDE + 5]!;
    expect(Buffer.from(one.vis).equals(Buffer.from(full.vis.subarray(lay.at[i]!, lay.at[i]! + cells)))).toBe(true);
  }, 60_000);

  it('a disposed baker releases its waiters and lands nothing more', async () => {
    const { set, baked } = strip();
    const hp = handPool(1);
    const sb = new SectionBaker({ shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi, masks: lampSectionMasks(baked.lights, DEF), sections: 3, key: null, pool: hp.pool });
    sb.start();
    const wait = sb.whenReady(2);
    sb.dispose();
    await wait;
    await hp.finishOne();
    expect(sb.plan.remaining).toBe(baked.ids.length);
    expect(sb.done).toBe(false);
  });

  it('once playing, the cache write waits for a section change or the end (SB14)', async () => {
    const { set, baked } = strip();
    const hp = handPool(2);
    const sb = new SectionBaker({ shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi, masks: lampSectionMasks(baked.lights, DEF), sections: 3, key: 'lamps:test', pool: hp.pool });
    sb.start();
    sb.markPlaying();
    let last = 0;
    while (last >= 0) last = await hp.finishOne();
    await sb.finished;
    expect(sb.saveDue).toBe(true);
    // a restart (the same section) is not a quiet moment; the next section is
    sb.setLive(0);
    expect(sb.saveDue).toBe(true);
    sb.setLive(1);
    expect(sb.saveDue).toBe(false);
  }, 120_000);

  it('a failed worker job is baked inline (never a dark lamp)', async () => {
    const { set, baked } = strip();
    let calls = 0;
    const pool = { size: 1, cancel: () => false, lamps: () => (calls++ === 0 ? Promise.reject(new Error('worker died')) : Promise.resolve(null as unknown as LampResult).then(() => { throw new Error('again'); })), dispose: () => undefined } as unknown as WorkerPool;
    const sb = new SectionBaker({ shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi, masks: lampSectionMasks(baked.lights, DEF), sections: 3, key: null, pool });
    sb.start();
    await sb.finished;
    expect(sb.done).toBe(true);
    expect(sb.inlineRetries).toBe(baked.ids.length);
    const full = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
    expect(Buffer.from(sb.result.vis).equals(Buffer.from(full.vis))).toBe(true);
  }, 120_000);
});
