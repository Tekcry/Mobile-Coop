import { getStateObject, type Effect, type Mesh, type Scene } from '../core/babylon';

/**
 * (guard-ai carry fix) A smooth body's PBR effect that will not finish compiling is dropped and compiled afresh.
 *
 * Babylon (9.29) polls a parallel-compiled effect every 16 ms (`Effect._checkIsReady`, 7500 polls); when the program
 * never reports complete it fails with "Operation timed out after maximum retries. - Effect: pbr", falls back to
 * reduced defines or gives up, and the material keeps that effect: `isReadyForSubMesh` stays false, so the body is
 * not drawn for two minutes or for good (its weapons, other effects, still are). Seen on the laptop GPU after a long
 * stall (16.5 s of headless sim in one block) while a new body variant compiled. The watch below, run once per
 * render for each body mesh (no allocation), recompiles the body's effect at once when it can never become ready:
 * Babylon's own poll timed out (its onError), the compile failed for good, or its program context was disposed under
 * it; at most `MAX_RECOMPILES` times per shader variant, with a log line.
 * (body watchdog) A compile that is merely still running (KHR_parallel_shader_compile not done) is NOT stuck: a cold
 * D3D11 compile of a big Epic body variant (LR16's lamp code, three browsers at once) takes well over 8 s, and the old
 * 8 s cap restarted it and warned (e2e-lightbake's no-console-errors assert). Only a last-resort cap, `STUCK_MS` and
 * `STUCK_FRAMES` together (still ahead of Babylon's own 120 s timeout), drops one that never finishes; nothing is
 * logged before then. A recompile's own drop of the old program no longer reads as the new effect's program disposed:
 * `src/core/babylon.ts` (`unlinkCachedPipeline`) keeps a late delete of the old context off the successor cached under
 * the same key. Render side only: nothing in gameplay reads it.
 */

/** Last resort: wall time (ms) and rendered frames a body effect may stay unready (compiling) before it is recompiled.
 *  90 s (was 45 s): Sector Ops measured LR16 Epic body compiles at 36.7 / 43.5 / 38.8 s with three browsers at once on
 *  the campus (2026-10-24, laptop RTX 4090, D3D11, cold), 1.5 s under the old cap under e2e-lightbake's own load; real
 *  failures recover at once, so the cap only bounds a compile that never finishes (Babylon's own timeout is 120 s). */
export const STUCK_MS = 90000;
export const STUCK_FRAMES = 30;
/** Recompiles per shader variant (effect key) before the body is left to Babylon. */
export const MAX_RECOMPILES = 3;

/** Per mesh: the unready effect being timed. */
export interface EffectWatch {
  effect: Effect | null;
  since: number;
  frames: number;
}

export function newEffectWatch(): EffectWatch {
  return { effect: null, since: 0, frames: 0 };
}

/** Recompiles done per effect key (failing variants only: a handful at most). */
const RECOMPILES = new Map<string, number>();

/** Test hook: forget the recompile counts. */
export function resetEffectRecovery(): void {
  RECOMPILES.clear();
}

/**
 * Why `effect` (unready) will not become ready by itself, or null while it may still (a compile still running is timed
 * against the last-resort cap only).
 */
export function stuckReason(effect: Effect, w: EffectWatch, now: number): string | null {
  const err = effect.getCompilationError();
  if (err.includes('timed out')) return 'compile timed out';
  if (err && effect.allFallbacksProcessed()) return 'compile failed';
  const pc = effect.getPipelineContext() as { _isDisposed?: boolean } | null;
  if (pc?._isDisposed) return 'program disposed';
  if (w.effect !== effect) {
    w.effect = effect;
    w.since = now;
    w.frames = 0;
    return null;
  }
  return ++w.frames >= STUCK_FRAMES && now - w.since >= STUCK_MS ? 'compile stuck' : null;
}

/**
 * Once per render for a body mesh: nothing while its main effect is ready (or it has none yet); else time it and,
 * when it is stuck, recompile it. Returns true when it recompiled.
 */
export function watchBodyEffect(mesh: Mesh, w: EffectWatch, now: number): boolean {
  const effect = mesh.subMeshes?.[0]?.effect ?? null;
  if (!effect || effect.isDisposed || effect.isReady()) {
    w.effect = null;
    return false;
  }
  const reason = stuckReason(effect, w, now);
  if (!reason) return false;
  w.effect = null;
  return recompileEffect(mesh.getScene(), effect, reason, mesh.name);
}

/**
 * Drop `effect` everywhere it is cached (the engine's compiled effects, the GL state's cached pipeline, every
 * sub-mesh that holds it) so the next readiness check builds a new one. False (and no change) past the cap.
 */
export function recompileEffect(scene: Scene, effect: Effect, reason: string, label: string): boolean {
  const key = effect.key;
  const n = RECOMPILES.get(key) ?? 0;
  if (n >= MAX_RECOMPILES) {
    if (n === MAX_RECOMPILES) {
      RECOMPILES.set(key, n + 1);
      console.warn(`smooth body ${label}: body shader ${reason}, ${MAX_RECOMPILES} recompiles done, left to Babylon`);
    }
    return false;
  }
  RECOMPILES.set(key, n + 1);
  console.warn(`smooth body ${label}: body shader ${reason}, recompiling (${n + 1}/${MAX_RECOMPILES})`);
  // the sub-meshes holding it (other guards of the same variant too) get fresh defines: the material re-prepares.
  // Babylon's first fallback on a failed compile switched those meshes to CPU skinning (`computeBonesUsingShaders`
  // false, NUM_BONE_INFLUENCERS 0), which draws a GPU-buffer body unskinned: bodies are always GPU skinned, so back on
  for (const m of scene.meshes) {
    const sms = m.subMeshes;
    if (!sms) continue;
    let held = false;
    for (let i = 0; i < sms.length; i++) {
      if (sms[i]!.effect !== effect) continue;
      sms[i]!.setEffect(null);
      held = true;
    }
    if (held && m.skeleton && m.numBoneInfluencers > 0 && !m.computeBonesUsingShaders) m.computeBonesUsingShaders = true;
  }
  // out of the engine's compiled effects (`createEffect` would hand it back) and its program released; the poll stops.
  // (body watchdog) Its program's delete may run seconds later (still linking): `src/core/babylon.ts` unlinks it from
  // the GL cache first, so that late delete can no longer dispose the new effect's program cached under the same key.
  effect.dispose(true);
  // a pipeline left cached under the key (the last fallback's, when the effect gave up) would be reused as compiled
  const engine = scene.getEngine() as unknown as { _gl?: WebGL2RenderingContext; _deletePipelineContext(p: unknown): void };
  if (engine._gl) {
    const cached = getStateObject(engine._gl).cachedPipelines as Record<string, unknown>;
    const name = key.replace(/\r/g, '').replace(/\n/g, '|');
    const left = cached[name];
    if (left) {
      delete cached[name];
      engine._deletePipelineContext(left);
    }
  }
  return true;
}
