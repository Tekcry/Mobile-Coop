// (guard-ai carry fix) Calm guards are drawn. On 4.77.0 (Warehouse Infiltration, stealth rules, GPU, gfx=high) a guard in
// the S21 holstered carry showed only his slung rifle / holstered pistol: the merged smooth body's PBR effect
// (`partSkinMat`, GPU skinned) failed to compile ("Unable to compile effect", attributes ... vox ppos pnrm, LIGHTCOUNT 5,
// CLUSTLIGHT4), and the engine's cached effect for that define set was its CPU-skinning fallback, which later guards'
// GPU-skinned bodies drew unskinned (nothing visible, though "ready"). Train 29's lamp plugin changes (#232) gave the
// body a new effect that compiles. This suite holds it: a grunt (rifle on the back) and an officer (pistol on the thigh)
// stand calm 16.5 s (holstered), then each body's material must be ready, its effect GPU skinned as the mesh is (never a
// CPU fallback served to a GPU-skinned mesh), the body in the camera's active meshes, and no effect may fail to compile;
// then both draw (suspicious) and the same holds. Run with E2E_GPU=1 (the failure was on the hardware GPU; SwiftShader
// compiles what it compiles). `node scripts/e2e-guard-carry.mjs [url]`
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=warehouse&mode=infiltration&mission=warehouse-courier&insertion=lot&gfx=high' });
const G = (f, a) => page.evaluate(f, a);
const CALM_SEC = 16.5;
let failed = false;
try {
  await frames(page, 10);
  const setup = await G(() => {
    const a = window.__app;
    const g = a.current;
    a.loop.manual = true;
    const hp = g.target?.health ?? g.player.health;
    if (hp) hp.invulnerable = true;
    if (g.mode?.pending) g.mode.pending.length = 0;
    // a failed compile prints its error line, not ~400 kB of shader source (the GPU logs cut it)
    const eff = g.scene.meshes.map((m) => m.subMeshes?.[0]?.effect).find((e) => e);
    if (eff) eff.constructor.LogShaderCodeOnCompilationError = false;
    const em = g.enemyMgr;
    em.clear();
    const V = g.player.position.constructor;
    const nav = em.nav;
    const walk = (x, z) => nav.nearestWalkable(x, z, 0.3, 0) >= 0;
    // (the open floor under the lamp at 0, -3 the calm sheets used; else the nearest walkable point round it)
    let spot = null;
    for (let r = 0; r <= 6 && !spot; r += 0.5) {
      for (let k = 0; k < 16 && !spot; k++) {
        const t = (k / 16) * Math.PI * 2;
        const x = 0.25 + Math.cos(t) * r;
        const z = -2.25 + Math.sin(t) * r;
        if (walk(x, z) && walk(x + 1.6, z)) spot = [x, z];
      }
    }
    const FAR = [-22, -24];
    window.__gc = {
      park() {
        g.photoFreeze(false);
        g.player.controller.teleport(new V(FAR[0], 0, FAR[1]), 0);
      },
      spawn(kind, x, z) {
        const e = em.spawn(kind, new V(x, 0, z), false, 0);
        if (!e) return false;
        e.passive = false;
        e.setPatrol(null);
        return true;
      },
      step(s) {
        this.park();
        a.loop.stepHeadless(s);
      },
      /** The photo camera 3 m in front of the pair, at chest height, the world held still. */
      look(x, z) {
        g.photoFreeze(true);
        g.player.controller.teleport(new V(x + 0.8, 0, z + 4.5), Math.PI);
        const pc = g.photoCamera();
        pc.position.set(x + 0.8, 1.4, z + 3);
        pc.setTarget(new V(x + 0.8, 1.1, z));
      },
      notice(x, z) {
        for (const e of em.enemies) {
          e.notice(x, z, 0.9);
          if (e.level === 'unaware') e.aware.set('suspicious');
        }
      },
      /** Per guard: the carry, and each body mesh's draw state. */
      bodies() {
        const active = g.scene.getActiveMeshes();
        const isActive = (m) => {
          for (let i = 0; i < active.length; i++) if (active.data[i] === m) return true;
          return false;
        };
        return em.enemies.map((e) => {
          const ms = e.rig?.voxel?.meshes ?? [];
          return {
            id: e.id,
            kind: e.def.kind,
            level: e.level,
            holstered: !!e.carry?.holstered,
            phase: e.carry?.phase ?? -1,
            drawn: ms.some(isActive),
            meshes: ms.map((m) => {
              const sm = m.subMeshes?.[0];
              const ef = sm?.effect ?? null;
              const defs = ef?.defines ?? '';
              const inf = /#define NUM_BONE_INFLUENCERS (\d+)/.exec(defs);
              return {
                name: m.name,
                vis: m.isVisible && m.isEnabled(),
                ready: !!(sm && m.material?.isReadyForSubMesh(m, sm, false)),
                effectReady: !!ef?.isReady(),
                gpuSkin: m.computeBonesUsingShaders,
                shaderInfluencers: inf ? +inf[1] : 0,
                forcedCpu: !!ef?._bonesComputationForcedToCPU,
                error: ef?.getCompilationError?.() || ef?._compilationError || '',
              };
            }),
          };
        });
      },
    };
    return { stealth: !!em.stealth, spot };
  });
  assert(setup.stealth, 'Warehouse Infiltration runs the stealth rules (guards holster when calm)');
  assert(!!setup.spot, 'a walkable spot for the pair');
  const [x, z] = setup.spot;
  assert(await G(([x, z]) => window.__gc.spawn('grunt', x, z) && window.__gc.spawn('officer', x + 1.6, z), [x, z]), 'grunt and officer spawned');

  /** Render until both bodies are ready (shaders compile over a few frames), then check what is drawn. */
  const check = async (label, holstered) => {
    await G(([x, z]) => window.__gc.look(x, z), [x, z]);
    let b = [];
    for (let i = 0; i < 40; i++) {
      await frames(page, 5);
      b = await G(() => window.__gc.bodies());
      if (b.length === 2 && b.every((e) => e.drawn && e.meshes.every((m) => m.ready && m.effectReady))) break;
    }
    console.log(`  ${label}: ${JSON.stringify(b.map((e) => ({ k: e.kind, lvl: e.level, hol: e.holstered, ph: e.phase, drawn: e.drawn, m: e.meshes.map((m) => [m.name, m.ready, m.effectReady, m.gpuSkin, m.shaderInfluencers, m.forcedCpu]) })))}`);
    assert(b.length === 2, `${label}: both guards alive (${b.length})`);
    for (const e of b) {
      if (holstered !== null) assert(e.holstered === holstered, `${label}: ${e.kind} ${holstered ? 'holstered' : 'not holstered'} (phase ${e.phase}, ${e.level})`);
      for (const m of e.meshes) {
        assert(m.vis, `${label}: ${m.name} visible and enabled`);
        assert(m.ready && m.effectReady, `${label}: ${m.name} material ready for its mesh (${m.error ? m.error.slice(0, 400) : 'no compile error recorded'})`);
        // a GPU-skinned mesh must draw with a skinning shader: the engine's cached CPU-skinning fallback draws it unskinned
        assert(!m.gpuSkin || (m.shaderInfluencers > 0 && !m.forcedCpu), `${label}: ${m.name} GPU skinned and its effect skins it (influencers ${m.shaderInfluencers}, CPU fallback ${m.forcedCpu})`);
      }
      assert(e.drawn, `${label}: ${e.kind}'s body is among the camera's active meshes`);
    }
  };

  console.log('calm: 16.5 s unaware, then the holstered pair is drawn');
  await G((s) => window.__gc.step(s), CALM_SEC);
  await check('calm', true);

  console.log('suspicious: both draw, the bodies stay drawn');
  await G(([x, z]) => window.__gc.notice(x + 6, z), [x, z]);
  await G(() => window.__gc.step(0.4));
  await check('drawing', null);
  await G(() => window.__gc.step(1.6));
  await check('drawn', false);

  const compile = errors.filter((e) => /Unable to compile effect|^\[error\].*Error: /i.test(e));
  if (compile.length) console.log(compile.slice(0, 6).join('\n').slice(0, 4000));
  assert(compile.length === 0, `no effect failed to compile (${compile.length})`);
  const real = errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
  assert(real.length === 0, `no console errors (${real.slice(0, 3).join(' | ').slice(0, 600)})`);
  console.log('guard carry: calm and drawn guards are drawn');
} catch (e) {
  failed = true;
  console.error(String(e?.stack ?? e));
}
await browser.close();
process.exit(failed ? 1 : 0);
