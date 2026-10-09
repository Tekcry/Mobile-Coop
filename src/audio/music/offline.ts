/**
 * Offline render for the lab's "Export 60 s WAV": the same conductor and engine as the live score, run on an
 * `OfflineAudioContext`, so what Michael hears in the file is what the game plays.
 */
import { Conductor, type MusicState, type Stem } from './conductor';
import { MusicEngine } from './engine';
import type { Library } from './library';
import { STATE_LEVEL_DB } from './mix';
import { levels } from './wav';

export type ExportKind = MusicState | 'motif';

export interface OfflineOptions {
  kind: ExportKind;
  seed: number;
  seconds: number;
  bpmNudge?: number;
  muted?: readonly Stem[];
}

export interface OfflineResult {
  left: Float32Array;
  right: Float32Array;
  rate: number;
  peakDb: number;
  rmsDb: number;
  /** Most voices sounding at once. */
  peakVoices: number;
}

export async function renderOffline(lib: Library, o: OfflineOptions): Promise<OfflineResult> {
  const rate = lib.rate;
  const frames = Math.round(o.seconds * rate);
  const ctx = new OfflineAudioContext(2, frames, rate);
  const engine = new MusicEngine(ctx, ctx.destination, lib);
  for (const s of o.muted ?? []) engine.setStemMuted(s, true);
  const cond = new Conductor(o.seed, lib, (e) => engine.handle(e));
  cond.setBpmNudge(o.bpmNudge ?? 0);
  if (o.kind === 'motif') {
    engine.setLevelDb(-6, 0, 0.001);
    cond.playMotif(0.1, 'all');
  } else {
    engine.setLevelDb(STATE_LEVEL_DB[o.kind], 0, 0.001);
    cond.setState(o.kind, 0.05);
    cond.advance(0, o.seconds);
  }
  const buf = await ctx.startRendering();
  const left = buf.getChannelData(0).slice();
  const right = buf.getChannelData(1).slice();
  const { peakDb, rmsDb } = levels([left, right]);
  return { left, right, rate, peakDb, rmsDb, peakVoices: engine.pool.peak };
}
