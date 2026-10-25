/**
 * (map-ready S10 step 2) Kept compiled shaders are only right if an equal cache key (shader name + defines) always
 * means equal code. Babylon puts a plugin's code into the effect without putting it into the key, so every plugin's
 * `getCustomCode` / `getUniforms` / `getSamplers` must depend only on its defines and module constants, never on the
 * map it was made for (the step 1 audit, `docs/map-ready/checks/s10-build.md`). Two instances made on two scenes with
 * different map inputs (lamp counts, door lists, atlas sizes, grids) give the same code; compiled on two engines, the
 * same key carries the same final shader source.
 */
import { describe, expect, it, vi } from 'vitest';
import type { Material, Scene } from '../src/core/babylon';

type Lamps = ConstructorParameters<typeof import('../src/world/bakedLamps').LampPlugin>[1];
type Atlas = ConstructorParameters<typeof import('../src/world/surfacePlugin').SurfacePlugin>[1];

/** A map's baked lamps as the plugin sees them: the per-map values differ, the define inputs (no volume, moon, fill,
 *  sky, character or torch shadows; at most 4 doors a lamp; one atlas page) are the same. */
function lamps(n: number): Lamps {
  return {
    volume: null,
    moonTex: null,
    fillTex: null,
    skyTex: null,
    level: null,
    charShadows: null,
    torchShadows: null,
    torchDraw: null,
    doorSlots: n % 2 ? 2 : 4,
    atlasPages: 1,
    lampBase: 10 * n,
    capBase: 7 * n,
    doorBase: 3 * n,
    width: 256 * n,
    gridInfo: { cols: 4 * n, rows: 9 * n, lox: -n, loz: 2 * n },
    atlasDims: [64 * n, 32, 64 * n],
    lamps: Array.from({ length: 5 * n }, (_, i) => ({ id: i })),
    doors: Array.from({ length: 3 * n }, (_, i) => ({ id: i })),
  } as unknown as Lamps;
}

/** A map's surface atlas: its tile size (the quality preset's) differs. */
function atlas(tile: number): Atlas {
  return { detail: { name: `d${tile}` }, normal: { name: `n${tile}` }, tileSize: tile } as unknown as Atlas;
}

async function load() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { LampPlugin } = await import('../src/world/bakedLamps');
  const { SurfacePlugin } = await import('../src/world/surfacePlugin');
  const { LevelMaterialPlugin } = await import('../src/world/levelMaterialPlugin');
  const { SmoothBodyPlugin } = await import('../src/player/smoothBodyPlugin');
  const { GuardFigurePlugin } = await import('../src/operators/runtime/guardFigurePlugin');
  const { PatternPlugin } = await import('../src/cosmetics/patternPlugin');
  return { NullEngine, B, LampPlugin, SurfacePlugin, LevelMaterialPlugin, SmoothBodyPlugin, GuardFigurePlugin, PatternPlugin };
}

interface CodeSource {
  getCustomCode(shaderType: string, shaderLanguage?: number): { [pointName: string]: string } | null;
  getUniforms(shaderLanguage?: number): unknown;
  getSamplers(samplers: string[]): void;
}

/** Everything a plugin puts into the effect's code. */
function codeOf(p: CodeSource): unknown {
  const samplers: string[] = [];
  p.getSamplers(samplers);
  return { vertex: p.getCustomCode('vertex', 0), fragment: p.getCustomCode('fragment', 0), uniforms: p.getUniforms(0), samplers };
}

describe('map-ready S10: plugin code depends on defines and constants only', () => {
  it('each of the six plugins: two instances on two scenes with different map inputs give the same code', async () => {
    const L = await load();
    const { B } = L;
    const make: Record<string, (m: Material, map: number) => CodeSource> = {
      LampPlugin: (m, map) => new L.LampPlugin(m, lamps(map)),
      SurfacePlugin: (m, map) => new L.SurfacePlugin(m, atlas(map === 1 ? 256 : 512), 'world'),
      LevelMaterialPlugin: (m) => new L.LevelMaterialPlugin(m),
      SmoothBodyPlugin: (m) => new L.SmoothBodyPlugin(m),
      GuardFigurePlugin: (m) => new L.GuardFigurePlugin(m),
      PatternPlugin: (m) => new L.PatternPlugin(m),
    };
    const scenes: Scene[] = [];
    for (const [name, fn] of Object.entries(make)) {
      // the material class each plugin rides on in the game (Level and the editor's lamp view: StandardMaterial)
      for (const cls of name === 'LevelMaterialPlugin' ? ['std'] : name === 'LampPlugin' || name === 'PatternPlugin' ? ['pbr', 'std'] : ['pbr']) {
        const codes = [1, 2].map((map) => {
          const scene = new B.Scene(new L.NullEngine());
          scenes.push(scene);
          const m = cls === 'pbr' ? new B.PBRMaterial(`${name}-${map}`, scene) : new B.StandardMaterial(`${name}-${map}`, scene);
          return codeOf(fn(m, map));
        });
        expect(codes[1], `${name} on ${cls}`).toEqual(codes[0]);
        expect(JSON.stringify(codes[0]).length, `${name} has code`).toBeGreaterThan(100);
      }
    }
    for (const s of scenes) s.dispose();
  });

  it('compiled on two engines for two maps: the same key carries the same final shader source', async () => {
    const L = await load();
    const { B } = L;
    const { markLampLevel } = await import('../src/world/bakedLamps');
    async function compile(map: number) {
      const engine = new L.NullEngine();
      const scene = new B.Scene(engine);
      new B.HemisphericLight('h', new B.Vector3(0, 1, 0), scene);
      // a body / weapon material: every plugin but the level's
      const body = new B.PBRMaterial('body', scene);
      new L.SurfacePlugin(body, atlas(map === 1 ? 256 : 512), 'object');
      new L.PatternPlugin(body);
      new L.SmoothBodyPlugin(body);
      new L.GuardFigurePlugin(body);
      new L.LampPlugin(body, lamps(map));
      // the level's own PBR material (sky fill, world-space surfaces) and the editor's standard material
      const level = new B.PBRMaterial('level', scene);
      markLampLevel(level);
      new L.SurfacePlugin(level, atlas(map === 1 ? 256 : 512), 'world');
      new L.LampPlugin(level, lamps(map));
      const std = new B.StandardMaterial('std', scene);
      new L.LevelMaterialPlugin(std);
      new L.PatternPlugin(std);
      new L.LampPlugin(std, lamps(map));
      const out: { key: string; vertex: string; fragment: string }[] = [];
      for (const m of [body, level, std]) {
        const mesh = B.CreateBox(`b-${m.name}`, {}, scene);
        mesh.material = m;
        const sm = mesh.subMeshes[0]!;
        await vi.waitFor(() => expect(m.isReadyForSubMesh(mesh, sm)).toBe(true));
        const e = sm.effect as unknown as { _key: string; _vertexSourceCode: string; _fragmentSourceCode: string };
        out.push({ key: e._key, vertex: e._vertexSourceCode, fragment: e._fragmentSourceCode });
      }
      return { out, dispose: () => { scene.dispose(); engine.dispose(); } };
    }
    const a = await compile(1);
    const b = await compile(2);
    try {
      expect(a.out.map((e) => e.key)).toEqual(b.out.map((e) => e.key));
      for (let i = 0; i < a.out.length; i++) {
        expect(b.out[i]!.vertex, a.out[i]!.key).toBe(a.out[i]!.vertex);
        expect(b.out[i]!.fragment, a.out[i]!.key).toBe(a.out[i]!.fragment);
      }
      // the plugins' code is really in there (body: pattern, surfaces, lamps; std: level)
      expect(a.out[0]!.vertex).toContain('vPatPos = position * vec3(');
      expect(a.out[0]!.fragment).toContain('nsLampFalloff');
      expect(a.out[0]!.fragment).toContain('SURF_P[');
      expect(a.out[2]!.fragment).toContain('baseColor.rgb *= shade * ao * face * speck;');
      // three different keys (the classes and the plugin sets differ)
      expect(new Set(a.out.map((e) => e.key)).size).toBe(3);
    } finally {
      a.dispose();
      b.dispose();
    }
  });
});
