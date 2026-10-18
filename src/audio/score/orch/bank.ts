/**
 * The orchestral sample bank for the V4 round 6 sketches (node only, offline): the CC0 VSCO 2 CE recordings listed in
 * `scripts/music/orch-samples.json`, fetched into `.music-cache/orch/`. Zones are loaded lazily (only the notes a piece
 * uses are decoded). `midi` is the sounding pitch; the organ's pitch comes from its key number, the timpani's is
 * measured.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectPitch, makeSrc, type Src } from '../../music/render/canvas';
import { readWav } from '../../music/render/wavRead';

export interface SampleEntry {
  id: string;
  inst: string;
  path: string;
  midi: number | null;
}

export interface Zone {
  id: string;
  inst: string;
  midi: number;
  /** Dynamic layer from the file name (v1 soft .. v4 loud); 0 when the name has none. */
  vel: number;
  /** Round robin (alternate take) number. */
  rr: number;
  /** Raw peak before normalisation: how loud the player actually played. */
  rawPeak?: number;
}

/** The organ files are numbered by key: manual keys start at C2, pedal keys at C1 (verified by pitch detection). */
function organMidi(path: string): number | null {
  const m = /_(Man3Open|Pedal|Man3Quiet|PedalQuiet)_(\d+)/.exec(path);
  if (!m) return null;
  const n = Number(m[2]);
  switch (m[1]) {
    case 'Man3Open':
      return 35 + n;
    case 'Pedal':
      return 23 + n;
    case 'Man3Quiet':
      return n - 86;
    default:
      return n - 40;
  }
}

export class Bank {
  private readonly zonesBy = new Map<string, Zone[]>();
  private readonly srcs = new Map<string, Src>();
  private readonly rrCount = new Map<string, number>();

  constructor(
    private readonly dir: string,
    entries: SampleEntry[],
  ) {
    for (const e of entries) {
      const base = e.path.split('/').pop()!;
      const vel = Number(/_v(\d)/.exec(base)?.[1] ?? /_(ppp|pp|p|mp|mf|f|ff|fff)_/.exec(`${base}_`)?.[1]?.length ?? 0);
      const rr = Number(/(?:rr|RR)(\d)/.exec(base)?.[1] ?? 1);
      let midi = e.midi ?? (e.inst.startsWith('organ') ? organMidi(e.path) : null);
      if (midi === null) midi = 0; // unpitched, or measured on load (timpani)
      const z: Zone = { id: e.id, inst: e.inst, midi, vel, rr };
      const list = this.zonesBy.get(e.inst) ?? [];
      list.push(z);
      this.zonesBy.set(e.inst, list);
    }
  }

  static load(root: string, manifestPath: string): Bank {
    const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as { samples: SampleEntry[] };
    return new Bank(join(root, '.music-cache', 'orch'), m.samples);
  }

  zones(inst: string): Zone[] {
    const z = this.zonesBy.get(inst);
    if (!z || !z.length) throw new Error(`no samples for ${inst}`);
    return z;
  }

  src(z: Zone): Src {
    let s = this.srcs.get(z.id);
    if (!s) {
      const w = readWav(readFileSync(join(this.dir, `${z.id}.wav`)));
      let p = 0;
      for (const ch of w.channels) for (let i = 0; i < ch.length; i++) p = Math.max(p, Math.abs(ch[i]!));
      z.rawPeak = p;
      s = makeSrc(z.id, w.channels, w.rate, z.midi ? 440 * Math.pow(2, (z.midi - 69) / 12) : 0);
      this.srcs.set(z.id, s);
    }
    return s;
  }

  /** Measure unpitched zones' pitch (timpani) so they can be tuned to the chord. */
  tune(inst: string): void {
    for (const z of this.zones(inst)) {
      const s = this.src(z);
      const hz = detectPitch(s.mono.subarray(Math.round(s.mono.length * 0.05), Math.round(s.mono.length * 0.5)), 50, 400);
      if (hz > 0) {
        z.midi = 69 + 12 * Math.log2(hz / 440);
        s.rootHz = hz;
      }
    }
  }

  /**
   * The zone for a note: the closest recorded pitch (a sample above is preferred, shifting down sounds more natural),
   * from the loud or soft layer, alternating round robins.
   */
  pick(inst: string, midi: number, loud: boolean): Zone {
    const all = this.zones(inst);
    const vels = [...new Set(all.map((z) => z.vel))].sort((a, b) => a - b);
    const want = loud ? vels[vels.length - 1]! : vels[0]!;
    const layer = all.filter((z) => z.vel === want);
    let best = Infinity;
    for (const z of layer) {
      const d = Math.abs(z.midi - midi) + (z.midi < midi ? 0.4 : 0);
      if (d < best) best = d;
    }
    const near = layer.filter((z) => Math.abs(Math.abs(z.midi - midi) + (z.midi < midi ? 0.4 : 0) - best) < 1e-6);
    const key = `${inst}-${want}-${near[0]!.midi}`;
    const k = this.rrCount.get(key) ?? 0;
    this.rrCount.set(key, k + 1);
    return near[k % near.length]!;
  }

  /** A percussion zone by index in its (file-name sorted) list. */
  pickHit(inst: string, which: number): Zone {
    const all = [...this.zones(inst)].sort((a, b) => a.id.localeCompare(b.id));
    return all[Math.max(0, Math.min(all.length - 1, which))]!;
  }
}
