/**
 * (LR16-P F1) The lamp data texture re-sends only its dynamic rows each frame: every per-frame write (lamp colours and
 * flicker, capsule ids and character shadow slots, the pendants' t0, the capsules, the doors' shut flags) sits at or
 * after `lampBase`, so `frame()` uploads from the row holding it to the end (`texSubImage2D`); the static grid above it
 * goes up whole only at load, on a registry change and on a restored context. Same texels, same GLSL. Also driven here:
 * a swinging pendant's t0 (`writeSway`, from the registry's `tickSway`) and a character shadow slot id (a stub link).
 */
import { describe, expect, it, vi } from 'vitest';
import { bakeLamps, LAMP_GRID_TEXELS, lampGrid } from '../src/voxel/lampBake';
import { packShapes, type VoxelShape } from '../src/voxel/shapes';
import { LightRegistry } from '../src/world/lights';
import { claimHangers, SwaySet } from '../src/world/lampSway';
import type { BoxPiece } from '../src/world/levelBuilder';
import type { CharShadowLink } from '../src/world/charShadows';
import { bakedLights } from '../src/world/lightBake';
import { DOORS_PER_LAMP_ACCURATE, type FieldDoor } from '../src/world/lightField';
import { LevelBuilder } from '../src/world/levelBuilder';
import { tallowWharf } from '../src/world/maps/tallowWharf';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { dressingOn } from '../src/world/detailPass';

const box = (c: [number, number, number], s: [number, number, number]): VoxelShape => ({ kind: 'box', c, s, yaw: 0, pitch: 0, mat: 1 });

describe('(LR16-P F1) lampDataRows', () => {
  it('the rows from the one holding lampBase to the last', async () => {
    const { lampDataRows } = await import('../src/world/bakedLamps');
    expect(lampDataRows(600, 60, 14)).toEqual({ y0: 10, rows: 4 });
    expect(lampDataRows(610, 60, 14)).toEqual({ y0: 10, rows: 4 });
    expect(lampDataRows(659, 60, 14)).toEqual({ y0: 10, rows: 4 });
    expect(lampDataRows(660, 60, 14)).toEqual({ y0: 11, rows: 3 });
    // (no grid: everything is dynamic)
    expect(lampDataRows(0, 32, 5)).toEqual({ y0: 0, rows: 5 });
  });
});

describe('(LR16-P F1) BakedLamps uploads the dynamic rows only', () => {
  it('every per-frame write lands at or after y0; frame() sends (0, y0, w, h - y0); a registry change one whole upload', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { BakedLamps, lampDataRows } = await import('../src/world/bakedLamps');
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const reg = new LightRegistry();
    const a = reg.add({ x: -3, y: 3, z: 0, radius: 6, intensity: 1 }).id;
    const b = reg.add({ x: 3, y: 3, z: 0, radius: 6, intensity: 1 }).id;
    const c = reg.add({ x: 0, y: 3, z: 6, radius: 5, intensity: 0.8 });
    const baked = bakedLights(reg);
    const lo: [number, number, number] = [-10, -0.5, -10];
    const hi: [number, number, number] = [10, 6, 10];
    const r = bakeLamps({ kind: 'lamps', id: 0, shapes: packShapes([box([0, -0.25, 0], [20, 0.5, 20])]), lights: baked.lights, lo, hi });
    const door: FieldDoor = { anchor: { hinge: { x: 0, y: 0, z: -1 }, yaw: 0, width: 1, height: 2.2 }, open: 1 };
    const subs: { view: ArrayBufferView; x: number; y: number; w: number; h: number }[] = [];
    const sub = vi.spyOn(engine as unknown as { updateTextureData: (...a: unknown[]) => void }, 'updateTextureData').mockImplementation((_t: unknown, view: unknown, x: unknown, y: unknown, w: unknown, h: unknown) => {
      subs.push({ view: view as ArrayBufferView, x: x as number, y: y as number, w: w as number, h: h as number });
    });
    // (NullEngine has no 3D textures: the atlas is a bare internal texture, never read here)
    const { InternalTexture, InternalTextureSource } = await import('@babylonjs/core/Materials/Textures/internalTexture');
    vi.spyOn(engine as unknown as { createRawTexture3D: () => unknown }, 'createRawTexture3D').mockImplementation(() => new InternalTexture(engine, InternalTextureSource.Raw3D));
    const lamps = new BakedLamps(scene, reg, baked, r, lo, hi, null, { doors: [door] });
    const buf = (lamps as unknown as { buf: Float32Array }).buf;
    const w = lamps.width;
    const h = lamps.data.getSize().height;
    const { y0, rows } = lampDataRows(lamps.lampBase, w, h);
    expect(lamps.dynY0).toBe(y0);
    expect(lamps.dynRows).toBe(rows);
    // (the grid holds whole rows here: 10 x 10 columns of LAMP_GRID_TEXELS texels)
    expect(y0).toBeGreaterThan(0);
    expect(y0 * w).toBeLessThanOrEqual(lamps.lampBase);
    expect(lamps.lampBase).toBe(10 * 10 * LAMP_GRID_TEXELS);
    const full = vi.spyOn(lamps.data, 'update');

    // a capsule near lamp a, a shut door, a flicker step
    let cx = -2;
    lamps.capsules = (ca, cb) => {
      ca.set([cx, 0.3, 0, 0.3], 0);
      cb.set([cx, 1.7, 0], 0);
      return 1;
    };
    lamps.frame();
    let snap = buf.slice();
    cx = -1;
    door.open = 0;
    reg.setFlicker(a, 2);
    reg.lights[a]!.flicker = 0.5;
    subs.length = 0;
    lamps.frame();
    let changed = 0;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] === snap[i]) continue;
      changed++;
      expect(i, `texel ${Math.floor(i / 4)}`).toBeGreaterThanOrEqual(y0 * w * 4);
    }
    // (the capsule's texels, the door's shut flag, the flickering lamp's colour)
    expect(changed).toBeGreaterThanOrEqual(3);
    expect(buf[(lamps.doorBase + 0) * 4 + 7]).toBe(1);
    expect(full).not.toHaveBeenCalled();
    expect(subs.length).toBe(1);
    const s = subs[0]!;
    expect([s.x, s.y, s.w, s.h]).toEqual([0, y0, w, h - y0]);
    expect(s.view.buffer).toBe(buf.buffer);
    expect(s.view.byteOffset).toBe(y0 * w * 4 * 4);
    expect(s.view.byteLength).toBe(rows * w * 4 * 4);

    // a registry change (a switch): one whole upload of the colours
    snap = buf.slice();
    const fulls = lamps.fullUploads;
    reg.setOn(b, false);
    lamps.frame();
    expect(full).toHaveBeenCalledTimes(1);
    expect(lamps.fullUploads).toBe(fulls + 1);
    for (let i = 0; i < buf.length; i++) if (buf[i] !== snap[i]) expect(i).toBeGreaterThanOrEqual(y0 * w * 4);

    // (the pendant t0 step) lamp c hangs on two rods, kicked: its t0 xyz move, in the same one sub upload
    // (the fixture is set after the bake so the bake itself is unchanged; `World.frame` calls `writeSway` before `frame`)
    c.fixture = { sx: 1.2, sy: 0.08, sz: 0.22, oy: 0.08 };
    const top = c.y + c.fixture.oy + c.fixture.sy / 2;
    const rods: BoxPiece[] = [-0.5, 0.5].map((dx) => ({ c: [c.x + dx, top + 1.2, c.z], s: [0.04, 2.4, 0.04], yaw: 0, pitch: 0, color: '#888', collide: false, visible: true }));
    reg.sway = new SwaySet([{ light: c, hangers: claimHangers(rods, c) }]);
    const t0c = (lamps.lampBase + 2 * lamps.lampTexels) * 4;
    snap = buf.slice();
    subs.length = 0;
    full.mockClear();
    reg.swayImpulse(c.id, 1, 0.2, 0);
    reg.tickSway(1.1);
    expect(reg.swayVersion).toBeGreaterThan(0);
    lamps.writeSway();
    lamps.frame();
    let swayChanged = 0;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] === snap[i]) continue;
      swayChanged++;
      expect(i, `texel ${Math.floor(i / 4)}`).toBeGreaterThanOrEqual(y0 * w * 4);
    }
    expect(swayChanged).toBeGreaterThanOrEqual(1);
    expect([0, 1, 2].some((k) => buf[t0c + k] !== snap[t0c + k])).toBe(true);
    expect(buf[t0c]).toBeCloseTo(c.x + c.swx, 5);
    expect(buf[t0c + 1]).toBeCloseTo(c.y + c.swy, 5);
    expect(buf[t0c + 2]).toBeCloseTo(c.z + c.swz, 5);
    expect(full).not.toHaveBeenCalled();
    expect(subs.length).toBe(1);
    expect(subs[0]!.y).toBe(y0);

    // (the character shadow slot id) lamp a holds slot 0: its t7.x = slot + 1, in the dynamic rows
    const slots = new Int8Array(3).fill(-1);
    slots[0] = 0;
    lamps.charShadows = { on: true, lampSlot: slots, covers: () => false } as unknown as CharShadowLink;
    const aLo = (lamps.lampBase + 0 * lamps.lampTexels) * 4;
    expect(buf[aLo + 28]).toBe(0);
    snap = buf.slice();
    subs.length = 0;
    lamps.frame();
    expect(buf[aLo + 28]).toBe(1);
    expect(aLo + 28).toBeGreaterThanOrEqual(y0 * w * 4);
    for (let i = 0; i < buf.length; i++) if (buf[i] !== snap[i]) expect(i).toBeGreaterThanOrEqual(y0 * w * 4);
    expect(full).not.toHaveBeenCalled();
    expect(subs.length).toBe(1);
    lamps.charShadows = null;

    // a restored context re-sends the whole texture
    full.mockClear();
    engine.onContextRestoredObservable.notifyObservers(engine);
    expect(full).toHaveBeenCalledTimes(1);
    lamps.dispose();
    full.mockClear();
    engine.onContextRestoredObservable.notifyObservers(engine);
    expect(full).not.toHaveBeenCalled();
    sub.mockRestore();
    scene.dispose();
    engine.dispose();
  });
});

describe('(LR16-P F1) tallowWharf', () => {
  it('the per-frame upload is at most 64 KB', async () => {
    const { lampDataLayout, lampDataRows } = await import('../src/world/bakedLamps');
    const b = new LevelBuilder();
    tallowWharf.build(b, 0);
    const set = canonicalLightSet(b.boxes, b.cylinders, tallowWharf.id, dressingOn(tallowWharf));
    const baked = bakedLights(b.lights);
    const grid = lampGrid(baked.lights, set.lo, set.hi);
    const lay = lampDataLayout(grid.cols, grid.rows, baked.ids.length, b.anchors.doors.length, DOORS_PER_LAMP_ACCURATE);
    const { rows } = lampDataRows(lay.lampBase, lay.w, lay.h);
    const bytes = rows * lay.w * 16;
    const whole = lay.h * lay.w * 16;
    console.info(`tallowWharf lamp data ${lay.w} x ${lay.h}: whole ${(whole / 1024).toFixed(0)} KB, per frame ${rows} rows ${(bytes / 1024).toFixed(1)} KB`);
    expect(bytes).toBeLessThanOrEqual(64 * 1024);
    expect(bytes).toBeLessThan(whole / 4);
  }, 60_000);
});
