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
// (forced) Before that, as the stall rarely times out in this lighter scene (master passed it), the same stall with the
// timeout forced: the body's first compile never completes and Babylon's poll gives up after 1 s (hooks in the setup);
// without the recovery the guard is never drawn ("material ready for its mesh (Error: Operation timed out ...)").
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const spotArg = process.argv.find((a) => a.startsWith('--spot='))?.slice(7).split(',').map(Number) ?? [0, -2.5];
const { browser, page, errors } = await launch({ url, params: 'autostart=warehouse&mode=infiltration&gfx=high', viewport: { width: 960, height: 720 } });
const G = (f, a) => page.evaluate(f, a);
const CALM_SEC = 16.5;
/** Rendering time a body may take to be ready after the one-block stall (a compile that never finishes is recompiled after 45 s, bodyEffectRecovery STUCK_MS; the loop ends as soon as the body is ready). */
const STALL_WAIT_MS = 60000;
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
    // (forced) The laptop's failure made deterministic. While armed, a guard body's pbr effect (SMOOTHBODY) that starts a
    // parallel compile gets a program that never reports done (`engine._isRenderingStateCompiled` false for its pipeline
    // contexts: no COMPLETION_STATUS_KHR) and Babylon's own poll (`Effect._checkIsReady`: 16 ms steps, onError on
    // timeout) is copied with its 120 s cut to FAULT_MS, then calls `_processCompilationErrors` with Babylon's timeout
    // error. So the effect runs Babylon's real failure path: its fallbacks (the first one switches the mesh to CPU
    // skinning, whose new variant compiles in the same stall and fails too) until all are used, the material keeping the
    // effect. The stall ends (disarmed) when a faulted effect is disposed (the fix's recompile); later compiles are normal.
    const Effect = eff?.constructor;
    const engine = g.scene.getEngine();
    const FAULT_MS = 1000;
    const fault = { armed: false, effects: new Set(), contexts: new WeakSet(), polls: new Set(), faulted: 0, timeouts: 0, disposed: 0, names: [], disposers: [] };
    const hooked = !!(Effect?.prototype?._checkIsReady && Effect.prototype._processCompilationErrors && Effect.prototype._isReadyInternal && Effect.prototype.dispose && engine._isRenderingStateCompiled);
    // (carry flake, diagnostic only) A faulted program can be flagged disposed under its effect before the cut poll
    // times out (Babylon's name-keyed resetCachedPipeline, or the gl-warning-fix delete in src/core/babylon.ts); the
    // recovery then drops it as "program disposed". Record who set `_isDisposed` (a few stack frames) for the log.
    const track = (pc) => {
      if (!pc || fault.contexts.has(pc)) return;
      fault.contexts.add(pc);
      let v = !!pc._isDisposed;
      try {
        Object.defineProperty(pc, '_isDisposed', {
          configurable: true,
          enumerable: true,
          get: () => v,
          set: (x) => {
            if (x && !v && fault.disposers.length < 4) fault.disposers.push(String(new Error().stack ?? '').split('\n').slice(2, 6).map((s) => s.trim()).join(' < '));
            v = x;
          },
        });
      } catch {
        // (diagnostic only)
      }
    };
    if (hooked) {
      const checkIsReady = Effect.prototype._checkIsReady;
      Effect.prototype._checkIsReady = function (prev) {
        if (fault.armed && !fault.effects.has(this) && /#define SMOOTHBODY\b/.test(this.defines ?? '')) {
          fault.effects.add(this);
          fault.faulted++;
          fault.names.push(/#define NUM_BONE_INFLUENCERS (\d+)/.exec(this.defines)?.[0].slice(8) ?? 'NUM_BONE_INFLUENCERS 0');
        }
        if (!fault.effects.has(this)) return checkIsReady.call(this, prev);
        track(this._pipelineContext);
        if (fault.polls.has(this)) return;
        fault.polls.add(this);
        let left = FAULT_MS;
        const int = setInterval(() => {
          track(this._pipelineContext);
          if (this._isReadyInternal() || this._isDisposed) {
            clearInterval(int);
            fault.polls.delete(this);
            return;
          }
          left -= 16;
          if (left >= 0) return;
          clearInterval(int);
          fault.polls.delete(this);
          fault.timeouts++;
          this._processCompilationErrors(new Error('Operation timed out after maximum retries. ' + ` - Effect: ${typeof this.name === 'string' ? this.name : this.key}`), prev);
        }, 16);
      };
      const compiled = engine._isRenderingStateCompiled;
      engine._isRenderingStateCompiled = function (pc) {
        return fault.contexts.has(pc) ? false : compiled.call(this, pc);
      };
      const dispose = Effect.prototype.dispose;
      Effect.prototype.dispose = function (force) {
        const r = dispose.call(this, force);
        if (this._isDisposed && fault.effects.delete(this)) {
          fault.disposed++;
          fault.armed = false;
        }
        return r;
      };
    }
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
      /** (forced) Flush the cached body effects no live mesh holds (the next body compiles afresh, a new variant), then arm. */
      arm() {
        const held = new Set();
        for (const m of g.scene.meshes) for (const sm of m.subMeshes ?? []) if (sm.effect) held.add(sm.effect);
        let flushed = 0;
        let kept = 0;
        for (const [k, e] of Object.entries(engine._compiledEffects ?? {})) {
          if (!/#define SMOOTHBODY\b/.test(k)) continue;
          if (held.has(e)) kept++;
          else {
            e.dispose(true);
            flushed++;
          }
        }
        fault.armed = hooked;
        return { hooked, flushed, kept };
      },
      /** (forced) Disarm; faulted effects no mesh holds any more are dropped (none left to fail a later pass). */
      disarm() {
        fault.armed = false;
        const held = new Set();
        for (const m of g.scene.meshes) for (const sm of m.subMeshes ?? []) if (sm.effect) held.add(sm.effect);
        const { faulted, timeouts, disposed, names } = fault;
        const disposers = fault.disposers.join(' | ');
        for (const e of [...fault.effects]) if (!held.has(e)) e.dispose(true);
        return { faulted, timeouts, disposed, names: names.join(', '), left: fault.effects.size, disposers };
      },
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
    return b;
  };

  // (forced) the one-block stall with the body's first compile timing out as on the laptop (the hook in the setup):
  // without the recovery the material keeps the timed-out effect and the body is never ready
  const FAULT_LOG = /Unable to compile effect:|Uniforms: |Attributes: |Defines:|Operation timed out after maximum retries|Trying next fallback/;
  const forcedLog = new Set();
  {
    const kind = 'grunt';
    console.log(`${kind} (forced): ${CALM_SEC} s calm in ONE block, his body's first compile forced to time out`);
    await G(() => window.__gc.reset());
    // (the cleared guards' effects are released at a frame's end)
    await frames(page, 3);
    const armed = await G(() => window.__gc.arm());
    assert(armed.hooked, "the forced fault's hooks are in place (Effect._checkIsReady, _processCompilationErrors, _isReadyInternal, dispose, engine._isRenderingStateCompiled)");
    console.log(`  forced: armed, ${armed.flushed} cached body effects flushed, ${armed.kept} held by live meshes`);
    const e0 = errors.length;
    assert(await G(([k, x, z]) => window.__gc.spawn(k, x, z), [kind, x, z]), `${kind} spawned (forced pass)`);
    await G((s) => window.__gc.step(s), CALM_SEC);
    let fail = null;
    let b = [];
    try {
      b = await check(`${kind} calm after the forced compile timeout`, true, STALL_WAIT_MS);
    } catch (e) {
      fail = e;
    }
    const f = await G(() => window.__gc.disarm());
    // (carry flake: which call flagged a faulted program disposed; the recovery's own drop is one of them)
    if (f.disposers) console.log(`  forced fault: faulted program flagged disposed by: ${f.disposers.slice(0, 1200)}`);
    const recompiled = errors.slice(e0).filter((e) => /smooth body .*recompiling/.test(e));
    console.log(`  forced fault: injected into ${f.faulted} body effect(s) [${f.names}], ${f.timeouts} poll timeout(s), ${f.disposed} dropped by the recovery; recovery logged "recompiling": ${recompiled.length ? `yes (${recompiled.length})` : 'no'}`);
    for (const r of recompiled.slice(0, 4)) console.log(`    ${r}`);
    // (the fixed build recovers the faulted effect before Babylon's cut poll gives up: a drop counts as well as a timeout)
    assert(f.faulted >= 1 && (f.timeouts >= 1 || f.disposed >= 1), `the forced fault fired (${f.faulted} effects faulted, ${f.timeouts} timeouts, ${f.disposed} dropped by the recovery): else Babylon's compile path changed (or no KHR_parallel_shader_compile) and this pass tests nothing`);
    if (fail) {
      console.log('  forced: the timed-out body effect was never recompiled, the guard stays invisible');
      throw fail;
    }
    assert(recompiled.length > 0 && f.disposed >= 1, `forced: the body recovered through the recompile (${recompiled.length} log lines, ${f.disposed} faulted effects dropped)`);
    // (Babylon's first fallback switched the mesh to CPU skinning before the recompile; the recovery turns it back)
    for (const e of b) for (const m of e.meshes) assert(m.gpuSkin, `forced: ${m.name} GPU skinned again after the recovery (Babylon's CPU-skinning fallback undone)`);
    await G(() => window.__gc.reset());
    for (let i = e0; i < errors.length; i++) if (FAULT_LOG.test(errors[i])) forcedLog.add(i);
  }

  // (stall) as the sheet: the whole calm in one block, no frame rendered before the first check
  const eStall = errors.length;
  for (const kind of ['grunt', 'officer']) {
    console.log(`${kind}: ${CALM_SEC} s calm in ONE block at ${x.toFixed(2)},${z.toFixed(2)}, no render before the check`);
    await G(() => window.__gc.reset());
    assert(await G(([k, x, z]) => window.__gc.spawn(k, x, z), [kind, x, z]), `${kind} spawned (stall pass)`);
    await G((s) => window.__gc.step(s), CALM_SEC);
    await check(`${kind} calm after the one-block stall`, true, STALL_WAIT_MS);
  }
  const recovered = errors.slice(eStall).filter((e) => /smooth body .*(recompil|left to Babylon)/.test(e));
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

  // (the forced pass's own compile-failure lines do not count)
  const kept = errors.filter((_, i) => !forcedLog.has(i));
  const compile = kept.filter((e) => /Unable to compile effect|^\[error\].*Error: /i.test(e));
  if (compile.length) console.log(compile.slice(0, 8).join('\n').slice(0, 6000));
  assert(compile.length === 0, `no effect failed to compile (${compile.length})`);
  const real = kept.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
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
