/**
 * (sector-redesign ART-KIT step 8, A120 / A123b) The campus art renderer on a NullEngine: static opaque pieces merged
 * per (section, material), the rest one thin-instanced mesh per (catalogue, section, piece, material); a cut circuit
 * dims a grouped screen (allocation-free repaint); `counts()` per section agrees with `artCounts`; no shadow caster but
 * the box-hidden skins, whose boxes it hides; and `BuiltLevel.hidePieces` is render-only (physics, light hash, cover and
 * boxes unchanged; the hidden instances draw nothing).
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import type { Scene } from '../src/core/babylon';
import { parseGlb } from '../src/operators/lab/glb';
import { LevelBuilder } from '../src/world/levelBuilder';
import { LightRegistry } from '../src/world/lights';
import { PROP_DARK } from '../src/world/props/facilityProps';
import { artCounts, artDrawKey, facilityCatalogue, mergedLook, type ArtPlacement, type CatReport } from '../src/world/campusArt/catalogue';
import { CAMPUS_KIT, CAMPUS_LOOK } from '../src/world/campusArt/campusKit';
import { bytesPerCall } from './helpers/allocPerCall';

const ASSETS = path.resolve(__dirname, '../src/world/campusArt/assets');
const glb = (file: string): ArrayBuffer => {
  const b = readFileSync(file);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const kReport = JSON.parse(readFileSync(path.join(ASSETS, 'campus-kit.json'), 'utf8')) as CatReport;
const fReport = JSON.parse(readFileSync(path.resolve(__dirname, '../src/world/props/assets/facility-props.json'), 'utf8')) as CatReport;

const P = (o: Partial<ArtPlacement> & Pick<ArtPlacement, 'cat' | 'prop' | 'section' | 'cls'>): ArtPlacement => ({ x: 0, y: 0, z: 0, yaw: 0, why: 't', ...o });

async function physicsScene(): Promise<{ engine: NullEngine; scene: Scene }> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const HavokPhysics = (await import('@babylonjs/havok')).default;
  const wasm = readFileSync(path.resolve(__dirname, '../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm'));
  const hk = await HavokPhysics({ wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) } as never);
  const engine = new NullEngine();
  const scene = new B.Scene(engine);
  scene.enablePhysics(new B.Vector3(0, -9.8, 0), new B.HavokPlugin(true, hk));
  return { engine, scene };
}

describe('CampusArtRender (NullEngine)', () => {
  it('merges statics per (section, material), thin-instances the rest; circuits dim screens; counts per section; only box-hidden skins cast, and their boxes hide', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { CampusArtRender } = await import('../src/world/campusArt/campusArtRender');
    const reg = new LightRegistry();
    reg.add({ x: 0, y: 3, z: 0, group: 70 });
    const placements: ArtPlacement[] = [
      P({ cat: 'K', prop: 'printerMfd', x: 0, section: 1, cls: 'solid' }),
      P({ cat: 'K', prop: 'printerMfd', x: 2, section: 1, cls: 'solid' }),
      P({ cat: 'K', prop: 'vendingMachine', x: 4, section: 1, cls: 'solid', group: 70 }),
      P({ cat: 'K', prop: 'vendingMachine', x: 6, section: 1, cls: 'solid' }),
      P({ cat: 'K', prop: 'exitSign', x: 8, y: 2.5, section: 1, cls: 'visual', group: 70 }),
      P({ cat: 'K', prop: 'carBlue', x: 12, section: 1, cls: 'skin-hide', skinOf: 3 }),
      P({ cat: 'F', prop: 'filingCabinet', x: 16, section: 1, cls: 'solid' }),
      P({ cat: 'K', prop: 'printerMfd', z: 20, section: 2, cls: 'solid' }),
    ];
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const models = { K: parseGlb(glb(path.join(ASSETS, 'campus-kit.glb'))), F: parseGlb(glb(path.resolve(__dirname, '../src/world/props/assets/facility-props.glb'))) };
    const casters: string[] = [];
    const hidden: number[][] = [];
    const cats = { F: facilityCatalogue(), K: CAMPUS_KIT };
    const r = CampusArtRender.fromModels(scene, { placements, catalogues: ['F', 'K'] }, models, reg, { hidePieces: (ids) => hidden.push([...ids]) }, (m) => casters.push(m.name), cats);
    const names = r.meshes().map((m) => m.name);
    // (perfa) merged per (section, material): the static opaque meshes, the emissives (vertex colours), the car's opaque
    // parts (casters); the alpha meshes thin-instanced per piece (`artDrawKey`)
    const want = new Set<string>();
    const reports: Record<string, CatReport> = { K: kReport, F: fReport };
    for (const p of placements) {
      const rp = reports[p.cat]!.pieces[p.prop]!;
      const cat = cats[p.cat as 'K' | 'F'];
      for (const m of Object.keys(rp.meshes)) {
        const k = artDrawKey(p, m, cat.looks[m]!);
        if (k[0] === 'm') want.add(`campus-static.${p.section}.${m}`);
        else if (k[0] === 'e') want.add(`campus-emissive.${p.section}.${m}`);
        else if (k[0] === 'c') want.add(`campus-static.${p.section}.${m}.c`);
        else want.add(`campus-${p.cat}.${p.section}.${p.prop}.${m}${p.cls === 'skin-hide' ? '.c' : ''}`);
      }
    }
    expect(names.sort()).toEqual([...want].sort());
    expect(names).toContain('campus-static.1.white');
    expect(names).toContain('campus-static.2.white');
    expect(names).toContain('campus-emissive.1.screen');
    expect(names).toContain('campus-emissive.1.exitGreen');
    expect(names).toContain('campus-static.1.tyre.c');
    expect(mergedLook(CAMPUS_LOOK.tyre)).toBe(true);
    expect(names).toContain('campus-K.1.vendingMachine.glass');
    // only the box-hidden skin casts, and the box it stands in for is hidden once the art is ready
    expect(casters.length).toBeGreaterThan(0);
    expect(casters.every((n) => n.endsWith('.c') && (n.startsWith('campus-static.1.') || n.includes('carBlue')))).toBe(true);
    expect(hidden).toEqual([[3]]);
    // counts per section = artCounts (the pure draw rule)
    const c = r.counts();
    for (const s of [1, 2]) {
      const a = artCounts(cats, reports, placements, s);
      expect(c.perSection[s]!.draws, `S${s} draws`).toBe(a.draws);
      expect(c.perSection[s]!.tris, `S${s} tris`).toBe(a.tris);
    }
    // a cut circuit dims the grouped screen (and the exit sign, on its own supply, stays lit)
    // (perfa: merged emissives, colours per vertex; placement 2 is on circuit 70, 3 is not, 4 is the exit sign)
    const screens = (): number[] => [r.colorOf(2, 'screen')![0], 0, 0, 0, r.colorOf(3, 'screen')![0]];
    const lit = screens()[0]!;
    expect(lit).toBeGreaterThan(0.1);
    expect(screens()[4]!).toBeCloseTo(lit, 6);
    const exit = r.colorOf(4, 'exitGreen')!;
    const green = exit[1]!;
    expect(green).toBeCloseTo(CAMPUS_KIT.ownSupply!.exitGreen!.tint[1] * CAMPUS_KIT.ownSupply!.exitGreen!.gain, 6);
    reg.setGroup(70, false);
    r.frame();
    expect(screens()[0]!).toBeCloseTo(lit * PROP_DARK, 6);
    expect(screens()[4]!).toBeCloseTo(lit, 6);
    expect(r.colorOf(4, 'exitGreen')![1]!).toBeCloseTo(green, 6);
    reg.setGroup(70, true);
    r.frame();
    expect(screens()[0]!).toBeCloseTo(lit, 6);
    // the repaint path allocates nothing (a registry change each call)
    const regv = reg as unknown as { version: number };
    const bytes = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) {
        regv.version++;
        r.frame();
      }
    }, 0.5, { n: 500 });
    expect(bytes).toBeLessThanOrEqual(0.5);
    // nothing is pickable or always active
    for (const m of r.meshes()) {
      expect(m.isPickable).toBe(false);
      expect(m.alwaysSelectAsActiveMesh).toBe(false);
    }
    expect(CAMPUS_LOOK.screen).toBeDefined();
    r.dispose();
    expect(r.meshes().length).toBe(0);
    // (artpol, art-kit P8) a build that throws part-way (here the caster hook, after some draws exist) leaks no mesh or material
    const meshes0 = scene.meshes.length;
    const mats0 = scene.materials.length;
    expect(() =>
      CampusArtRender.fromModels(scene, { placements, catalogues: ['F', 'K'] }, models, reg, { hidePieces: (ids) => hidden.push([...ids]) }, () => {
        throw new Error('caster hook failed');
      }, cats),
    ).toThrow('caster hook failed');
    expect(scene.meshes.length).toBe(meshes0);
    expect(scene.materials.length).toBe(mats0);
    expect(hidden).toEqual([[3]]);
    scene.dispose();
    engine.dispose();
  });
});

describe('CampusArtRender far cull (perfa)', () => {
  it('stops drawing an all-indoor draw past ART_FAR (hysteresis), never an outdoor or caster draw; allocation-free', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { CampusArtRender, ART_FAR } = await import('../src/world/campusArt/campusArtRender');
    const placements: ArtPlacement[] = [
      P({ cat: 'K', prop: 'printerMfd', x: 0, section: 1, cls: 'solid', indoor: true }),
      P({ cat: 'K', prop: 'exitSign', x: 2, y: 2.5, section: 1, cls: 'visual', indoor: true }),
      P({ cat: 'K', prop: 'printerMfd', x: 0, section: 2, cls: 'solid', indoor: true }),
      P({ cat: 'K', prop: 'printerMfd', x: 4, section: 2, cls: 'solid' }),
      P({ cat: 'K', prop: 'carBlue', x: 12, section: 1, cls: 'skin-hide', skinOf: 3, indoor: true }),
    ];
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const models = { K: parseGlb(glb(path.join(ASSETS, 'campus-kit.glb'))) };
    const r = CampusArtRender.fromModels(scene, { placements, catalogues: ['K'] }, models, null, null, () => {}, { K: CAMPUS_KIT });
    const on = (name: string): boolean => r.meshes().find((m) => m.name === name)!.isEnabled();
    const culled = r.probe().filter((x) => x.indoor).map((x) => x.name);
    // section 1's opaque and emissive draws are all indoor; section 2's mixes an outdoor printer; the car never culls
    expect(culled.length).toBeGreaterThan(0);
    expect(culled.every((n) => n.includes('.1.') && n.endsWith('.i'))).toBe(true);
    expect(culled).toContain('campus-emissive.1.exitGreen.i');
    r.farCullAt(0, ART_FAR + 20, true);
    for (const n of culled) expect(on(n)).toBe(false);
    expect(on('campus-static.2.white')).toBe(true);
    expect(on('campus-static.1.tyre.c')).toBe(true);
    // hysteresis: just inside ART_FAR stays off, inside ART_FAR - 2 comes back
    r.farCullAt(0, ART_FAR - 1 + 3, true);
    for (const n of culled) expect(on(n)).toBe(false);
    r.farCullAt(0, 10, true);
    for (const n of culled) expect(on(n)).toBe(true);
    let z = 0;
    const bytes = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) r.farCullAt(0, (z = (z + 37) % 200), false);
    }, 0.5, { n: 500 });
    expect(bytes).toBeLessThanOrEqual(0.5);
    r.dispose();
    scene.dispose();
    engine.dispose();
  });
});

describe('gameplay never reads the art (A121)', () => {
  it('only the World hook imports the renderer: no game, AI, player, cover, security or net module does', () => {
    const root = path.resolve(__dirname, '../src');
    const users: string[] = [];
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) walk(f);
        else if (e.name.endsWith('.ts') && /from '[^']*campusArtRender'/.test(readFileSync(f, 'utf8'))) users.push(path.relative(root, f).split(path.sep).join('/'));
      }
    };
    walk(root);
    expect(users).toEqual(['world/world.ts']);
  });
});

describe('BuiltLevel.hidePieces (A123b)', () => {
  it('is render-only: the hidden instances draw nothing; physics, the light hash, cover and the boxes are the same', async () => {
    const { engine, scene } = await physicsScene();
    const b = new LevelBuilder();
    b.floor(0, 0, 20, 20, '#777777', 0, 0.3);
    b.box(0, 0.75, 0, 1.8, 1.5, 4.2, '#a9adb1');
    b.box(4, 0.75, 0, 1.8, 1.5, 4.2, '#16181a');
    b.box(8, 1, 0, 0.3, 2, 3, '#a9a496');
    const lvl = b.build(scene, 'hide-test');
    const boxMesh = lvl.meshes.find((m) => m.name === 'lvl-box')!;
    const data = (): Float32Array => (boxMesh as unknown as { _thinInstanceDataStorage: { matrixData: Float32Array } })._thinInstanceDataStorage.matrixData;
    const before = Float32Array.from(data());
    const shapes = (lvl.body.shape as unknown as { getNumChildren(): number }).getNumChildren();
    const hash = lvl.light.hash;
    const cover = JSON.stringify(lvl.coverSegments);
    const boxes = JSON.stringify(lvl.boxes);
    lvl.hidePieces([1, 2]);
    const after = data();
    // instances 1 and 2 (boxes 1 and 2) are zero matrices; 0 and 3 unchanged
    for (let k = 0; k < 16; k++) {
      expect(after[16 + k]).toBe(0);
      expect(after[32 + k]).toBe(0);
      expect(after[k]).toBe(before[k]);
      expect(after[48 + k]).toBe(before[48 + k]);
    }
    expect((lvl.body.shape as unknown as { getNumChildren(): number }).getNumChildren()).toBe(shapes);
    expect(lvl.light.hash).toBe(hash);
    expect(JSON.stringify(lvl.coverSegments)).toBe(cover);
    expect(JSON.stringify(lvl.boxes)).toBe(boxes);
    // an index past the drawn boxes (or a collision-only one) is skipped
    lvl.hidePieces([99, -1]);
    lvl.dispose();
    scene.dispose();
    engine.dispose();
  });
});
