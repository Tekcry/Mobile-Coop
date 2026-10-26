/**
 * (piano SO2) After the EMP the Thornbeck Mill's baked lamps read as off in all three: the picture (`BakedLamps`' lamp
 * colours and its bounce fill), the light field (the meter and guard sight: `LightField`) and the client (the `lamps`
 * snapshot). The mill is built and baked as `World.create` builds it (`buildMapLights`, the game's own call: the
 * builder, the flicker pass, the lightning openings' flash lights, the sway pass; `bakeLevelLight` under the map's own
 * id, then the torch slots), with its lightning on (the map sets `lightning` from #604; until then the test supplies
 * `THORNBECK_LIGHTNING`); `mainsOff` (SO1) at the start bay. Before it the 16 lamps and the exit sign (the electric
 * lights) are lit; 0.8 s after it every one is dark, the openings' flash lights are untouched (not electric: still on,
 * dark only between strikes), and the meter-height field (floor + 1 m: the ground floor, the gallery deck, the hoist
 * platform) reads under 1 lx everywhere with no torch lit and no lightning flash.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import type { LightRegistry } from '../src/world/lights';
import { LightField } from '../src/world/lightField';
import { addTorchSlots } from '../src/world/torches';
import { buildMapLights } from '../src/world/mapLights';
import type { MapDef } from '../src/world/mapDef';
import type { LightningData } from '../src/world/lightning';
import { dressingOn } from '../src/world/detailPass';
import { bakeLevelLight, type LightBake } from '../src/world/lightBake';
import { moonLight } from '../src/world/lampMath';
import { levelToLux } from '../src/world/lux';
import { LampMirror, LampSender, LAMP_OFF, LAMP_ON, readLamps } from '../src/net/lampSync';
import type * as LampJobs from '../src/voxel/lampJobs';
import { DECK_Y, THORNBECK_DECK, THORNBECK_LAMPS, THORNBECK_LIGHTNING, THORNBECK_OPENINGS, THORNBECK_PLATFORM, thornbeckMill } from '../src/world/maps/thornbeckMill';

// (no IndexedDB in Node: the cache write is a no-op)
vi.mock('../src/voxel/lampJobs', async (orig) => ({ ...(await orig<typeof LampJobs>()), saveLamps: vi.fn(async () => undefined) }));

const DT = 1 / 60;
/** The EMP's burst: the start bay, where the scene opens (the player's spawn). */
const EMP: [number, number, number] = [4, 1, 4.6];
/** The 16 lamps and the exit sign: the electric lights (bake ids 0..16). */
const FIXED = 17;
/** The openings' flash lights (bake ids 17.., kind window, not electric); the torch slots follow. */
const OPEN = THORNBECK_OPENINGS.length;
/** The mill with its lightning on it (the map sets `lightning` from #604; until then the test supplies it). */
const MAP: MapDef = { ...thornbeckMill, lightning: thornbeckMill.lightning ?? (THORNBECK_LIGHTNING as LightningData) };

/** The mill's registry as `World.create` leaves it, and its bake. */
async function mill(withBake: boolean): Promise<{ reg: LightRegistry; bake: LightBake | null }> {
  const b = new LevelBuilder();
  buildMapLights(b, MAP, 1);
  const { light } = b.prepare(MAP.id, { dressing: dressingOn(MAP) });
  const reg = b.lights;
  const th = MAP.theme;
  reg.ambient = th.lightLevel ?? 0.75;
  const bake = withBake ? await bakeLevelLight({ mapId: MAP.id, seed: 1, shapes: light.shapes, shapesHash: light.hash, lo: light.lo, hi: light.hi, reg, sunDir: th.sunDir, moonLight: moonLight(th) }) : null;
  addTorchSlots(reg);
  return { reg, bake };
}

/** The meter-height points (floor + 1 m) on a 1 m grid: the ground floor, the gallery deck and the hoist platform. */
function meterPoints(): Float64Array {
  const pts: number[] = [];
  for (let x = 0.5; x < 32; x += 1) for (let z = 0.5; z < 18; z += 1) pts.push(x, 1, z);
  for (const r of [THORNBECK_DECK, THORNBECK_PLATFORM]) {
    for (let x = r[0] + 0.5; x < r[2]; x += 1) for (let z = r[1] + 0.5; z < r[3]; z += 1) pts.push(x, DECK_Y + 1, z);
  }
  return Float64Array.from(pts);
}

/** Step the registry `s` seconds at 60 Hz. */
function run(reg: LightRegistry, s: number): void {
  const n = Math.round(s / DT);
  for (let k = 0; k < n; k++) reg.update(DT);
}

/** The electric lights lit ("lit" counts only these: the flash lights stay on, dark between strikes). */
const fixedOn = (reg: LightRegistry): number => reg.lights.filter((l) => l.electric && l.on && !l.destroyed).length;

/** The openings' flash lights as `addOpeningLights` left them: on, not cut, flicker 0 (no strike). */
function flashUntouched(reg: LightRegistry): void {
  const fl = reg.lights.slice(FIXED, FIXED + OPEN);
  for (const l of fl) {
    expect(l.flash && l.kind === 'window' && !l.electric, `light ${l.id} is a flash light`).toBe(true);
    expect(l.on && !l.destroyed && !reg.mainsCut(l.id), `flash light ${l.id} untouched`).toBe(true);
    expect(l.flicker).toBe(0);
  }
}

describe('Thornbeck Mill: after the EMP the baked lamps read as off (piano SO2)', () => {
  let M: { reg: LightRegistry; bake: LightBake | null };
  beforeAll(async () => {
    M = await mill(true);
  }, 300_000);

  it('the mill bakes its 17 fixed lights under its own id; every one lit before the EMP, every one dark 0.8 s after', async () => {
    const { reg, bake } = M;
    expect(THORNBECK_LAMPS).toHaveLength(16);
    expect(OPEN).toBe(10);
    expect(bake!.lamps!.baked.ids).toEqual(Array.from({ length: FIXED + OPEN }, (_, i) => i));
    expect(bake!.lampKey).toMatch(/^lamps:thornbeckMill:/);
    expect(reg.lights.filter((l) => l.electric).map((l) => l.id)).toEqual(Array.from({ length: FIXED }, (_, i) => i));
    flashUntouched(reg);
    for (const l of reg.lights.slice(FIXED + OPEN)) expect(l.kind).toBe('flashlight');
    expect(fixedOn(reg)).toBe(FIXED);
    expect(reg.lights.slice(FIXED + OPEN).every((l) => !l.on)).toBe(true);
    const fresh = (await mill(false)).reg;
    expect(fresh.mainsOff(...EMP)).toBe(FIXED);
    run(fresh, 0.4);
    // mid-ripple: the near lamps gone, the far ones still lit
    expect(fixedOn(fresh)).toBeGreaterThan(0);
    expect(fixedOn(fresh)).toBeLessThan(FIXED);
    run(fresh, 0.4);
    expect(fixedOn(fresh)).toBe(0);
    for (let id = 0; id < FIXED; id++) expect(fresh.mainsCut(id), `light ${id} cut`).toBe(true);
    // the window lights: mains off never touches them
    flashUntouched(fresh);
  });

  it('the light field (meter, guard sight): lamp light before; under 1 lx at meter height everywhere after, no torch, no flash', () => {
    const { reg, bake } = M;
    const f = new LightField(bake, reg);
    f.setFlash(0);
    reg.setSkyFlash(0);
    const P = meterPoints();
    let maxBefore = 0;
    let litBefore = 0;
    for (let i = 0; i < P.length; i += 3) {
      const v = f.totalAt(P[i]!, P[i + 1]!, P[i + 2]!);
      if (v > maxBefore) maxBefore = v;
      if (levelToLux(v) >= 1) litBefore++;
    }
    // the lamps light the mill before the EMP (over 10 lx somewhere; over a quarter of the meter points over 1 lx)
    expect(levelToLux(maxBefore)).toBeGreaterThan(10);
    expect(litBefore).toBeGreaterThan(P.length / 3 / 4);
    reg.mainsOff(...EMP);
    run(reg, 0.8);
    expect(fixedOn(reg)).toBe(0);
    expect(reg.lights.some((l) => l.on && l.electric)).toBe(false);
    expect(reg.lights.some((l) => l.on && l.kind === 'flashlight')).toBe(false);
    flashUntouched(reg);
    let maxAfter = 0;
    let worst = '';
    for (let i = 0; i < P.length; i += 3) {
      // the point, and a body standing there (the guards' read: feet on the floor, 1.8 m tall)
      const v = Math.max(f.totalAt(P[i]!, P[i + 1]!, P[i + 2]!), f.bodyLevel(P[i]!, P[i + 1]! - 1, P[i + 2]!, 1.8));
      if (v > maxAfter) {
        maxAfter = v;
        worst = `${P[i]}, ${P[i + 1]}, ${P[i + 2]}`;
      }
    }
    expect(levelToLux(maxAfter), `brightest meter point after the EMP at ${worst}`).toBeLessThan(1);
  });

  it('the client: the lamps snapshot carries every cut, mid-ripple and done', async () => {
    const host = (await mill(false)).reg;
    const client = (await mill(false)).reg;
    const tx = new LampSender();
    const rx = new LampMirror();
    rx.apply(client, JSON.parse(JSON.stringify(tx.step(host, DT, true)!)));
    const st = new Uint8Array(64);
    readLamps(client, st);
    for (let id = 0; id < FIXED; id++) expect(st[id], `light ${id} on at the client before`).toBe(LAMP_ON);
    host.mainsOff(...EMP);
    for (let k = 0; k < 60; k++) {
      host.update(DT);
      const w = tx.step(host, DT);
      if (!w) continue;
      rx.apply(client, JSON.parse(JSON.stringify(w)));
      for (let id = 0; id < FIXED; id++) expect(client.lights[id]!.on).toBe(host.lights[id]!.on);
    }
    expect(fixedOn(client)).toBe(0);
    readLamps(client, st);
    for (let id = 0; id < FIXED; id++) expect(st[id], `light ${id} off at the client`).toBe(LAMP_OFF);
  }, 120_000);

  it('the picture: BakedLamps draws every lamp colour and the bounce fill at 0 after the EMP', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { BakedLamps } = await import('../src/world/bakedLamps');
    const { InternalTexture, InternalTextureSource } = await import('@babylonjs/core/Materials/Textures/internalTexture');
    const engine = new NullEngine();
    // (NullEngine has no 3D textures: the atlas and the fill are bare internal textures; their uploads go nowhere)
    vi.spyOn(engine as unknown as { createRawTexture3D: () => unknown }, 'createRawTexture3D').mockImplementation(() => new InternalTexture(engine, InternalTextureSource.Raw3D));
    vi.spyOn(engine as unknown as { updateRawTexture3D: () => void }, 'updateRawTexture3D').mockImplementation(() => undefined);
    // (the flash lights flicker: the per-frame row upload runs; NullEngine has no GL to send it to)
    vi.spyOn(engine as unknown as { updateTextureData: () => void }, 'updateTextureData').mockImplementation(() => undefined);
    const scene = new Scene(engine);
    // a fresh registry of the same build (the field test cut M's lamps), lit, on M's bake
    const { reg } = await mill(false);
    const bake = M.bake;
    const field = new LightField(bake, reg);
    const lamps = new BakedLamps(scene, reg, bake!.lamps!.baked, bake!.lamps!.r, bake!.lo, bake!.hi, null, { moon: bake!.moon, doors: [], fill: { grid: bake!.ambient, color: [1, 1, 1] }, bounce: field.bounce, moonLight: bake!.moonLight });
    const colours = (): Float32Array => (lamps as unknown as { lastColors: Float32Array }).lastColors;
    lamps.frame();
    for (let i = 0; i < FIXED; i++) expect(colours()[i * 3]! + colours()[i * 3 + 1]! + colours()[i * 3 + 2]!, `lamp ${i} drawn before`).toBeGreaterThan(0);
    const bounce = field.bounce;
    bounce.sync(reg);
    expect(bounce.g.some((v) => v > 0)).toBe(true);
    reg.mainsOff(...EMP);
    run(reg, 0.8);
    lamps.frame();
    // every baked light dark: the lamps cut, the flash lights between strikes
    for (let i = 0; i < FIXED + OPEN; i++) expect([colours()[i * 3], colours()[i * 3 + 1], colours()[i * 3 + 2]], `lamp ${i} drawn after`).toEqual([0, 0, 0]);
    flashUntouched(reg);
    // the bounce fill the picture uploads (the field's own grid): every cell 0
    expect(bounce.g.every((v) => v === 0)).toBe(true);
    lamps.dispose();
    scene.dispose();
    engine.dispose();
  }, 300_000);
});
