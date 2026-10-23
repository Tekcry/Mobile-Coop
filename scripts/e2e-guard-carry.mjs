// (guard-ai carry fix) Calm guards are drawn. On 4.77.0 (Warehouse Infiltration, stealth rules, GPU, gfx=high) a guard in
// the S21 holstered carry showed only his slung rifle / holstered pistol: the merged smooth body's PBR effect
// (`partSkinMat`, GPU skinned) failed to compile ("Unable to compile effect", attributes ... vox ppos pnrm, LIGHTCOUNT 5,
// SPOTLIGHT2 / 3, CLUSTLIGHT4), and a "ready" body could still draw nothing (Babylon's cached CPU-skinning fallback
// served to a GPU-skinned mesh draws it unskinned). This suite replays the failing calm sheet (scratch
// guard-calm-shots.mjs): the same URL (no mission), vision off, one guard at a time on the sheet's spot under the lit
// strip lamp at (0, -3), 16.5 s calm in 1 s steps with frames rendered between them, the camera 2 m in front of his
// chest with the player 1.5 m behind it (the lights follow him). Then each body mesh must be in the camera's active
// meshes with its material and effect ready, its effect GPU skinned as the mesh is, and no effect may fail to compile;
// then he draws (suspicious) and the same holds. Each check logs the body effect's light defines. Run with E2E_GPU=1
// (the failure was on the hardware GPU). `node scripts/e2e-guard-carry.mjs [url] [--spot=x,z]`
// (stall) First, as the sheet ran it on the laptop GPU (master f16600f5): the 16.5 s calm stepped in ONE block with no
// frame rendered, then the body must be ready and drawn within STALL_WAIT_MS of rendering. There the body's PBR
// effect never finished compiling (Babylon's poll then times out, "Operation timed out after maximum retries. -
// Effect: pbr") and the guard stayed invisible; the fix (src/player/bodyEffectRecovery.ts) recompiles a stuck body
// effect and logs "smooth body ... recompiling" (printed here). Then the 1 s-step pass as before.
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const spotArg = process.argv.find((a) => a.startsWith('--spot='))?.slice(7).split(',').map(Number) ?? [0, -2.5];
const { browser, page, errors } = await launch({ url, params: 'autostart=warehouse&mode=infiltration&gfx=high', viewport: { width: 960, height: 720 } });
const G = (f, a) => page.evaluate(f, a);
const CALM_SEC = 16.5;
/** Rendering time a body may take to be ready after the one-block stall (the fix recompiles a stuck one after 8 s). */
const STALL_WAIT_MS = 30000;
let failed = false;
try {
  await frames(page, 10);
  const setup = await G((spotIn) => {
    const a = window.__app;
    const g = a.current;
    a.loop.manual = true;
    const hp = g.target?.health ?? g.player.health;
    if (hp) hp.invulnerable = true;
    if (g.mode?.pending) g.mode.pending.length = 0;
    // a failed compile prints its error line, not ~400 kB of shader source (the GPU logs cut it)
    const eff = g.scene.meshes.map((m) => m.subMeshes?.[0]?.effect).find((e) => e);
    if (eff) eff.constructor.LogShaderCodeOnCompilationError = false;
    g.vision?.set?.('off');
    const em = g.enemyMgr;
    em.clear();
    const V = g.player.position.constructor;
    const nav = em.nav;
    const walk = (x, z) => nav.nearestWalkable(x, z, 0.3, 0) >= 0;
    // (the sheet's spot under the lamp at 0, -3; else the nearest walkable point round it)
    let spot = null;
    for (let r = 0; r <= 4 && !spot; r += 0.25) {
      for (let k = 0; k < (r ? 16 : 1) && !spot; k++) {
        const t = (k / 16) * Math.PI * 2;
        const x = spotIn[0] + Math.cos(t) * r;
        const z = spotIn[1] + Math.sin(t) * r;
        if (walk(x, z)) spot = [x, z];
      }
    }
    const FAR = [-22, -24];
    const defOf = (defs, re) => {
      const out = [];
      for (const m of defs.matchAll(re)) out.push(m[1] ? `${m[0].replace('#define ', '')}` : m[0]);
      return out;
    };
    window.__gc = {
      reset() {
        g.photoFreeze(false);
        em.clear();
        if (g.mode?.pending) g.mode.pending.length = 0;
        const doors = g.world.doors;
        for (const d of doors.list) {
          d.open = 0;
          d.target = 0;
          doors['write']?.(d);
          doors['addBody']?.(d);
        }
        doors['mesh']?.thinInstanceBufferUpdated?.('matrix');
      },
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
      /** As the sheet's front view: the camera 2 m in front of his chest (1.4 m up, aimed at 1.25 m), the player 1.5 m behind it, the world held still. */
      look() {
        const e = em.enemies[0];
        if (!e) return false;
        g.photoFreeze(true);
        const rp = e.rig.root.getAbsolutePosition();
        const fx = Math.sin(e.yaw);
        const fz = Math.cos(e.yaw);
        const cx = rp.x + fx * 2;
        const cz = rp.z + fz * 2;
        g.player.controller.teleport(new V(cx + fx * 1.5, rp.y, cz + fz * 1.5), Math.atan2(-fx, -fz));
        const pc = g.photoCamera();
        pc.position.set(cx, rp.y + 1.4, cz);
        pc.setTarget(new V(rp.x, rp.y + 1.25, rp.z));
        return true;
      },
      notice() {
        for (const e of em.enemies) {
          e.notice(e.pos.x - Math.sin(e.yaw) * 6, e.pos.z - Math.cos(e.yaw) * 6, 0.9);
          if (e.level === 'unaware') e.aware.set('suspicious');
        }
      },
      /** Per guard: the carry, and each body mesh's draw state and light defines. */
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
            pos: [+e.pos.x.toFixed(2), +e.pos.z.toFixed(2)],
            holstered: !!e.carry?.holstered,
            phase: e.carry?.phase ?? -1,
            drawn: ms.some(isActive),
            meshes: ms.map((m) => {
              const sm = m.subMeshes?.[0];
              const ready = !!(sm && m.material?.isReadyForSubMesh(m, sm, false));
              const ef = sm?.effect ?? null;
              const defs = ef?.defines ?? sm?.materialDefines?.toString?.() ?? '';
              const inf = /#define NUM_BONE_INFLUENCERS (\d+)/.exec(defs);
              return {
                name: m.name,
                vis: m.isVisible && m.isEnabled(),
                ready,
                effectReady: !!ef?.isReady(),
                gpuSkin: m.computeBonesUsingShaders,
                shaderInfluencers: inf ? +inf[1] : 0,
                forcedCpu: !!ef?._bonesComputationForcedToCPU,
                lights: defOf(defs, /#define (LIGHTCOUNT \d+|MAXLIGHTCOUNT \d+|(?:HEMI|DIR|SPOT|POINT|CLUST|AREA)LIGHT\d+|SHADOW\d+|SHADOWCSM\d+|SHADOWS\b|LAMP_\w+|BAKED_LAMPS)/g).join(' '),
                lightSources: m.lightSources?.map((l) => l.name).join(','),
                error: ef?.getCompilationError?.() || ef?._compilationError || '',
              };
            }),
          };
        });
      },
    };
    return { stealth: !!em.stealth, spot };
  }, spotArg);
  assert(setup.stealth, 'Warehouse Infiltration runs the stealth rules (guards holster when calm)');
  assert(!!setup.spot, `a walkable spot near ${spotArg}`);
  const [x, z] = setup.spot;

  /** Render until his body is ready (shaders compile over a few frames, at most `waitMs`), then check what is drawn. */
  const check = async (label, holstered, waitMs = 0) => {
    await G(() => window.__gc.look());
    let b = [];
    const t0 = Date.now();
    let n = 0;
    for (let i = 0; i < 40 || Date.now() - t0 < waitMs; i++) {
      await frames(page, 5);
      n += 5;
      b = await G(() => window.__gc.bodies());
      if (b.length === 1 && b.every((e) => e.drawn && e.meshes.every((m) => m.ready && m.effectReady))) break;
    }
    console.log(`  ${label}: ${n} frames / ${((Date.now() - t0) / 1000).toFixed(1)} s rendered until the check`);
    for (const e of b) {
      console.log(`  ${label}: ${e.kind} ${e.id} @${e.pos} ${e.level} hol ${e.holstered} ph ${e.phase} drawn ${e.drawn}`);
      for (const m of e.meshes) console.log(`    ${m.name}: ready ${m.ready}/${m.effectReady} gpuSkin ${m.gpuSkin} infl ${m.shaderInfluencers} cpuFallback ${m.forcedCpu} | ${m.lights} | lights ${m.lightSources}`);
    }
    assert(b.length === 1, `${label}: the guard is alive (${b.length})`);
    for (const e of b) {
      if (holstered !== null) assert(e.holstered === holstered, `${label}: ${e.kind} ${holstered ? 'holstered' : 'not holstered'} (phase ${e.phase}, ${e.level})`);
      for (const m of e.meshes) {
        assert(m.vis, `${label}: ${m.name} visible and enabled`);
        assert(m.ready && m.effectReady, `${label}: ${m.name} material ready for its mesh (${m.error ? m.error.slice(0, 600) : 'no compile error recorded'})`);
        // a GPU-skinned mesh must draw with a skinning shader: the engine's cached CPU-skinning fallback draws it unskinned
        assert(!m.gpuSkin || (m.shaderInfluencers > 0 && !m.forcedCpu), `${label}: ${m.name} GPU skinned and its effect skins it (influencers ${m.shaderInfluencers}, CPU fallback ${m.forcedCpu})`);
      }
      assert(e.drawn, `${label}: ${e.kind}'s body is among the camera's active meshes`);
    }
  };

  // (stall) as the sheet: the whole calm in one block, no frame rendered before the first check
  for (const kind of ['grunt', 'officer']) {
    console.log(`${kind}: ${CALM_SEC} s calm in ONE block at ${x.toFixed(2)},${z.toFixed(2)}, no render before the check`);
    await G(() => window.__gc.reset());
    assert(await G(([k, x, z]) => window.__gc.spawn(k, x, z), [kind, x, z]), `${kind} spawned (stall pass)`);
    await G((s) => window.__gc.step(s), CALM_SEC);
    await check(`${kind} calm after the one-block stall`, true, STALL_WAIT_MS);
  }
  const recovered = errors.filter((e) => /smooth body .*(recompil|left to Babylon)/.test(e));
  if (recovered.length) console.log(`  body effect recoveries:\n  ${recovered.slice(0, 8).join('\n  ')}`);
  else console.log('  body effect recoveries: none');

  for (const kind of ['grunt', 'officer']) {
    console.log(`${kind}: ${CALM_SEC} s calm at ${x.toFixed(2)},${z.toFixed(2)} (holstered), then the draw`);
    await G(() => window.__gc.reset());
    assert(await G(([k, x, z]) => window.__gc.spawn(k, x, z), [kind, x, z]), `${kind} spawned`);
    // (as the sheet: 1 s sim steps, the page renders between them)
    for (let t = 0; t < CALM_SEC; t += 1) {
      await G((s) => window.__gc.step(s), Math.min(1, CALM_SEC - t));
      await frames(page, 1);
    }
    await check(`${kind} calm`, true);
    await G(() => window.__gc.notice());
    await G(() => window.__gc.step(0.12));
    await check(`${kind} drawing`, null);
    await G(() => window.__gc.step(1.6));
    await check(`${kind} drawn`, false);
  }

  const compile = errors.filter((e) => /Unable to compile effect|^\[error\].*Error: /i.test(e));
  if (compile.length) console.log(compile.slice(0, 8).join('\n').slice(0, 6000));
  assert(compile.length === 0, `no effect failed to compile (${compile.length})`);
  const real = errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
  assert(real.length === 0, `no console errors (${real.slice(0, 3).join(' | ').slice(0, 600)})`);
  console.log('guard carry: calm and drawn guards are drawn');
} catch (e) {
  failed = true;
  console.error(String(e?.stack ?? e));
  // the compile errors, if any, for the record (a failing assert above may have come first)
  const compile = errors.filter((x) => /Unable to compile effect|Error: |Defines:/i.test(x));
  if (compile.length) console.log(compile.slice(0, 8).join('\n').slice(0, 6000));
}
await browser.close();
process.exit(failed ? 1 : 0);
