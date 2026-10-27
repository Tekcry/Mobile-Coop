/**
 * (char-shadow-meter S3b-2, J16) `GameState.shadowCues` (brief `docs/char-shadow-meter/briefs/S3b.md` S3b-2):
 * - `shadowCuesFor`: null with the flag off (no contract) and on a co-op client; built from the gameplay bake (the
 *   field, the registry's lights, the bake's moon direction) on solo / host;
 * - `updateLight` (GameState's own method on a stub, the real `LightField` under two lamps and the moon): each 10 Hz
 *   tick fills the cues right after the meter (version +1, `count[0] > 0` under a lamp, slot ids from `charRefs`), no
 *   tick no fill, and a ticking `updateLight` allocates nothing past the meter and the bare fill's own residual (the
 *   call site boxes nothing).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { GameState, shadowCuesFor } from '../src/game/gameState';
import { FILL, FILL_IN, fillPlayers } from '../src/game/charOccluderFill';
import { CharOccluders } from '../src/world/charOccluders';
import { LightField } from '../src/world/lightField';
import { LIGHT, LightRegistry } from '../src/world/lights';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { bakeLamps } from '../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { packShapes } from '../src/voxel/shapes';
import { bakedLights } from '../src/world/lightBake';
import { ShadowCues } from '../src/world/shadowCues';
import { bytesPerCall } from './helpers/allocPerCall';

// GameState's module graph reaches the PWA's Vite-only virtual module (the settings screen); nothing here uses it
vi.mock('virtual:pwa-register', () => ({ registerSW: () => async () => undefined }));

/** The s1-s3 check's scene (tests/shadowCues.test.ts): an open floor under two lamps and the moon, baked as the game does. */
function scene(): { reg: LightRegistry; field: LightField; dir: [number, number, number] } {
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
  return { reg, field, dir };
}

type Ref = { id: string; light: number };
/** The fields `updateLight`'s contract branch reads, on GameState's prototype (no constructor: no scene, no Babylon). */
interface Stub {
  world: unknown;
  net: null;
  time: number;
  lightT: number;
  flashWas: number;
  puppet: boolean;
  lightLevel: number;
  localRef: Ref;
  charOccluders: CharOccluders | null;
  shadowCues: ShadowCues | null;
  lightIn: Float64Array;
  charKeys: Int32Array;
  charRefs: Ref[];
  charN: number;
  lightOccluder: () => boolean;
  updateLight(dt: number): void;
}

/** gameState.ts `CUE_DT` (a module constant there too: no box per call). */
const CUE_DT = 1 / LIGHT.playerHz;

/** Players at their feet: slot 0 under the first lamp, the others spread under both. */
const FEET: readonly (readonly [number, number, number])[] = [[-2, 0, 0.5], [0.5, 0, 1.5], [1.5, 0, -0.5]];

function game(withCues: boolean): Stub {
  const { reg, field } = scene();
  const occ = new CharOccluders();
  const g = Object.create(GameState.prototype) as Stub;
  const refs: Ref[] = FEET.map((_, s) => ({ id: s === 0 ? 'local' : `peer${s}`, light: 0 }));
  const lightIn = new Float64Array(FILL.players * FILL_IN);
  FEET.forEach(([x, y, z], s) => lightIn.set([x, y, z, 1.3, 0, 0], s * FILL_IN));
  const keys = new Int32Array(FILL.players);
  fillPlayers(occ, lightIn, FEET.length, keys);
  Object.assign(g, {
    world: { level: { lights: reg }, lightField: field, lightning: null },
    net: null,
    time: 0,
    lightT: 0,
    flashWas: 0,
    puppet: false,
    lightLevel: 1,
    localRef: refs[0]!,
    charOccluders: occ,
    shadowCues: withCues ? shadowCuesFor({ lightField: field, level: { lights: reg } }, occ, false) : null,
    lightIn,
    charKeys: keys,
    charRefs: refs,
    // (coop4 merge 17) coop4's slot -> charRefs index map (`GameState.charRefAt`): slot s is refs[s] here
    charRefAt: Int8Array.from({ length: FILL.players }, (_, s) => (s < refs.length ? s : -1)),
    charN: FEET.length,
    lightOccluder: () => false,
  });
  return g;
}

describe('GameState.shadowCues (S3b-2)', () => {
  it('shadowCuesFor: null with the flag off (no contract) and on a client; solo / host gets cues', () => {
    const { reg, field } = scene();
    const w = { lightField: field, level: { lights: reg } };
    expect(shadowCuesFor(w, null, false)).toBeNull();
    expect(shadowCuesFor(w, null, true)).toBeNull();
    expect(shadowCuesFor(w, new CharOccluders(), true)).toBeNull();
    const cues = shadowCuesFor(w, new CharOccluders(), false);
    expect(cues).toBeInstanceOf(ShadowCues);
    expect(cues!.version).toBe(0);
  });

  it('the constructor builds it from the gameplay bake next to the contract, never from world.lamps', () => {
    const src = readFileSync('src/game/gameState.ts', 'utf8');
    expect(src).toMatch(/\n {4}this\.puppet = opts\.net\?\.role === 'client';\r?\n {4}this\.shadowCues = shadowCuesFor\(world, this\.charOccluders, this\.puppet\);/);
    expect(src).toMatch(/new ShadowCues\(f, world\.level\.lights\.lights, f\.bake\?\.moon\.dir \?\? null\)/);
    expect(src).toMatch(/\nconst CUE_DT = 1 \/ LIGHT\.playerHz;/);
    expect(src.match(/new ShadowCues\(/g)?.length).toBe(1);
  });

  it('each 10 Hz tick fills the cues right after the meter: version +1, footprints under a lamp, slots from charRefs', () => {
    const g = game(true);
    const cues = g.shadowCues!;
    g.updateLight(0.001);
    expect(cues.version).toBe(1);
    expect(g.lightLevel).toBeGreaterThan(0);
    expect(cues.count[0]).toBeGreaterThan(0);
    expect(cues.n).toBe(FEET.length);
    expect(cues.slotOf('local')).toBe(0);
    expect(cues.slotOf('peer2')).toBe(2);
    // between ticks: no fill
    g.updateLight(0.5 / LIGHT.playerHz);
    expect(cues.version).toBe(1);
    // the next tick
    g.updateLight(0.6 / LIGHT.playerHz);
    expect(cues.version).toBe(2);
    for (let k = 0; k < 10; k++) g.updateLight(1 / LIGHT.playerHz);
    expect(cues.version).toBe(12);
  });

  it('the flag-on meter without cues (a client) runs as before', () => {
    const a = game(false);
    const b = game(true);
    a.updateLight(0.001);
    b.updateLight(0.001);
    expect(b.lightLevel).toBe(a.lightLevel);
    expect(b.charRefs.map((r) => r.light)).toEqual(a.charRefs.map((r) => r.light));
  });

  it('the cue fill in a ticking updateLight allocates nothing past the fill itself (the call site boxes nothing)', async () => {
    // The fill's own residual with the real field (S3b-1: ~21 B a field call, 1616 B for 4 players in its scene; gate
    // 2432 B) is shadowCues.ts / lightField.ts's, measured here bare; GameState's call must add nothing to it.
    const off = game(false);
    const on = game(true);
    const bare = game(true);
    const dt = 1 / LIGHT.playerHz;
    const base = await bytesPerCall((k) => {
      for (let i = 0; i < k; i++) off.updateLight(dt);
    }, 0, { n: 200, warm: 4000 });
    const bc = bare.shadowCues!;
    const bo = bare.charOccluders!;
    const fill = await bytesPerCall((k) => {
      for (let i = 0; i < k; i++) bc.fill(bo, bare.charRefs, bare.charKeys, bare.charN, CUE_DT, bare.lightOccluder);
    }, 0, { n: 200, warm: 4000 });
    const v0 = on.shadowCues!.version;
    const per = await bytesPerCall((k) => {
      for (let i = 0; i < k; i++) on.updateLight(dt);
    }, base + fill, { n: 200, warm: 4000 });
    expect(on.shadowCues!.version).toBeGreaterThan(v0);
    console.info(`bytes per 10 Hz updateLight tick, 3 players: ${base.toFixed(1)} meter only, ${per.toFixed(1)} with the cue fill; the bare fill ${fill.toFixed(1)}`);
    expect(fill).toBeLessThanOrEqual(2432);
    expect(per).toBeLessThanOrEqual(base + fill + 8);
  });
});
