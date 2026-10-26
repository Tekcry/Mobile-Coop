/**
 * (piano-escape S6) The storm's sound for the piano scene: rain on the roof and thunder, all WebAudio synthesis on the
 * `sfx` bus (no audio files, no downloads; a real recording is a walk-card question).
 *
 * - Rain: a looping noise bed with a light patter layer, from the scene's first intro frame. Louder on the gallery
 *   (nearer the roof): `rainGain(y)` of the local operator's feet height, smooth and clamped, set once per sim step.
 * - Thunder: one low roll `THUNDER_DELAY` s after each flash, driven only from the scene clock (`simTime - t0`, the
 *   clock SO5's `Lightning.flashAt` reads; never a music time or a page timer). A double flash gives ONE roll, 2.0 s
 *   after its first entry. Before the EMP (`t0` = +Infinity) there is none. The variation of each roll (its length and
 *   pitch) comes from the flash index, so it is the same every run.
 *
 * The schedule (`thunderRolls`, `ThunderClock`) is pure and tested without an audio context. The per-frame step keeps
 * an index against the clock and allocates nothing; on a big clock jump (restart of the clock, seek, a late join) it
 * re-seeks the index without firing the missed rolls.
 */
import type { AudioEngine } from './audioEngine';
import { DECK_Y } from '../world/maps/thornbeckMill';
import type { Flash } from '../world/lightning';

/** Seconds from a flash to its thunder (sound only). */
export const THUNDER_DELAY = 2.0;
/** Flashes closer than this (s) to the group's first entry are the same strike (a double is 0.45 s apart). */
export const DOUBLE_GAP = 0.5;
/** A clock step bigger than this (s) is a jump (a seek, a late join, a stalled page): re-seek, fire nothing. */
export const JUMP_S = 1;

/** The rain's level on the ground floor and on the gallery (nearer the roof). Michael 2026-10-27 ~09:10: "the rain is defening": cut to about a fifth (-14 dB). */
export const RAIN_GROUND = 0.02;
export const RAIN_GALLERY = 0.035;
/** The two heights the level runs between (m): the floor and the gallery deck (thornbeckMill.ts). */
export const RAIN_GROUND_Y = 0;
export const RAIN_GALLERY_Y = DECK_Y;

/** The rain's gain at feet height `y`: a smooth step between the floor and the gallery deck, clamped at both ends. */
export function rainGain(y: number): number {
  if (!(y > RAIN_GROUND_Y)) return RAIN_GROUND;
  if (y >= RAIN_GALLERY_Y) return RAIN_GALLERY;
  const u = (y - RAIN_GROUND_Y) / (RAIN_GALLERY_Y - RAIN_GROUND_Y);
  return RAIN_GROUND + (RAIN_GALLERY - RAIN_GROUND) * u * u * (3 - 2 * u);
}

/** One thunder roll: `t` s on the scene clock (within one period), `peak` its loudness 0..1, `i` its group's index. */
export interface Roll {
  t: number;
  peak: number;
  i: number;
  /** The flash was in the previous period (the loop seam): there is no such flash in the first period. */
  wrapped: boolean;
}

/**
 * The thunder rolls of one period, sorted by time. A flash within `DOUBLE_GAP` of its group's first entry joins that
 * group (one roll, 2.0 s after the first entry, loudness of the group's strongest strike). A roll that falls past
 * `period` wraps to the start of the next one (`wrapped`). `period` 0: no loop, nothing wraps.
 */
export function thunderRolls(flashes: readonly Flash[], period: number, delay = THUNDER_DELAY): Roll[] {
  const fs = flashes.filter((f) => f.peak > 0 && Number.isFinite(f.t)).sort((a, b) => a.t - b.t);
  const rolls: Roll[] = [];
  let first = Number.NEGATIVE_INFINITY;
  let gi = -1;
  for (const f of fs) {
    if (f.t - first <= DOUBLE_GAP) {
      const r = rolls[gi]!;
      r.peak = Math.max(r.peak, f.peak > 1 ? 1 : f.peak);
      continue;
    }
    first = f.t;
    gi++;
    const at = f.t + delay;
    const wrap = period > 0 && at >= period;
    rolls.push({ t: wrap ? at - period : at, peak: f.peak > 1 ? 1 : f.peak, i: gi, wrapped: wrap });
  }
  return rolls.sort((a, b) => a.t - b.t);
}

/** The roll times of one period (see `thunderRolls`). */
export function thunderTimes(flashes: readonly Flash[], period: number, delay = THUNDER_DELAY): number[] {
  return thunderRolls(flashes, period, delay).map((r) => r.t);
}

/**
 * The per-step schedule: `step(t)` takes the scene clock (s since the EMP, `simTime - t0`) and returns the index into
 * `rolls` of the roll that falls due since the last call, or -1. No allocation. A clock before 0 or not finite (the
 * intro: t0 = +Infinity) idles; a backward step or one longer than `JUMP_S` re-seeks the index and fires nothing.
 */
export class ThunderClock {
  private idx = 0;
  private cycle = 0;
  private last = Number.NaN;

  constructor(
    readonly rolls: readonly Roll[],
    readonly period: number,
  ) {}

  private due(): number {
    return this.idx < this.rolls.length ? this.cycle * this.period + this.rolls[this.idx]!.t : Number.POSITIVE_INFINITY;
  }

  /** Move past the rolls of a flash that never happened (a wrapped roll in the first period). */
  private skip(): void {
    while (this.idx < this.rolls.length && this.cycle === 0 && this.rolls[this.idx]!.wrapped) this.idx++;
    if (this.idx >= this.rolls.length && this.period > 0 && this.rolls.length > 0) {
      this.idx = 0;
      this.cycle++;
      this.skip();
    }
  }

  private seek(t: number): void {
    const n = this.rolls.length;
    this.cycle = this.period > 0 ? Math.floor(t / this.period) : 0;
    const pos = t - this.cycle * this.period;
    this.idx = 0;
    while (this.idx < n && this.rolls[this.idx]!.t <= pos) this.idx++;
    this.skip();
  }

  step(t: number): number {
    if (!(t >= 0) || !Number.isFinite(t)) {
      this.last = Number.NaN;
      return -1;
    }
    if (!(t >= this.last) || t - this.last > JUMP_S) {
      this.last = t;
      this.seek(t);
      return -1;
    }
    this.last = t;
    let fired = -1;
    while (this.due() <= t) {
      fired = this.idx;
      this.idx++;
      this.skip();
    }
    return fired;
  }
}

/** What the scene drives (`PianoWorld.storm`). */
export interface PianoStorm {
  /** The rain begins (once; later calls do nothing: a restart keeps it going). */
  start(): void;
  /** Every sim step: the thunder from the scene clock, the rain from the operator's feet height. No allocation. */
  step(simTime: number, t0: number, listenerY: number): void;
  /** The scene's end: everything fades to nothing over `s`. */
  fadeOut(s: number): void;
  /** Stop and disconnect every node. */
  dispose(): void;
}

/** The deterministic 0..1 variation of roll `i` and `salt` (no random: the same every run). */
export function rollVar(i: number, salt: number): number {
  let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(salt + 7, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

/** Seconds of noise in the storm's own buffer (long enough that the rain bed's loop does not read as a loop). */
const NOISE_S = 6;
/** The rain's gain moves toward its target with this time constant (s). */
const RAIN_TC = 0.25;

/** Build the storm for `engine` with the map's lightning `data` (null: rain only). Nodes are made at `start()`. */
export function createSceneStorm(engine: AudioEngine, data: { readonly flashes: readonly Flash[]; readonly period?: number } | null): PianoStorm {
  const period = data?.period && data.period > 0 ? data.period : 0;
  const clock = new ThunderClock(thunderRolls(data?.flashes ?? [], period), period);
  let started = false;
  let dead = false;
  let fading = false;
  let ctx: AudioContext | null = null;
  let rainOut: GainNode | null = null;
  let buf: AudioBuffer | null = null;
  let nodes: AudioScheduledSourceNode[] = [];
  let lastGain = -1;
  /** Every roll plays through this one gain, so the end fade and dispose reach a roll in flight. */
  let thunderOut: GainNode | null = null;
  /** The live rolls' sources (a ring: a roll lasts at most ~6.4 s, so 8 slots never wrap onto a live one). */
  const live: (AudioScheduledSourceNode | null)[] = [null, null, null, null, null, null, null, null];
  let liveAt = 0;
  const keep = (n: AudioScheduledSourceNode): void => {
    live[liveAt] = n;
    liveAt = (liveAt + 1) % live.length;
  };

  /** A noise buffer shaped like rain (pink-ish: a running average of white noise) from a fixed seed. */
  const makeNoise = (c: AudioContext): AudioBuffer => {
    const b = c.createBuffer(1, Math.floor(c.sampleRate * NOISE_S), c.sampleRate);
    const d = b.getChannelData(0);
    let s = 0x1234567;
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const w = s / 2147483648 - 1;
      lp += 0.35 * (w - lp);
      d[i] = w * 0.6 + lp * 1.4;
    }
    return b;
  };

  const source = (c: AudioContext, offset: number, loop: boolean): AudioBufferSourceNode => {
    const n = c.createBufferSource();
    n.buffer = buf;
    n.loop = loop;
    n.loopStart = 0;
    n.start(c.currentTime, offset);
    return n;
  };

  const build = (): void => {
    if (dead || rainOut) return;
    ctx = engine.ctx;
    if (!ctx) return;
    const out = engine.out('sfx', 0, 0, Number.POSITIVE_INFINITY);
    if (!out) return;
    rainOut = out;
    thunderOut = engine.out('sfx', 1, 0, Number.POSITIVE_INFINITY);
    buf = makeNoise(ctx);
    out.gain.value = rainGain(0);
    lastGain = rainGain(0);
    // the bed: a broad hiss, the roof's wash
    const bed = source(ctx, 0, true);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 600;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 7000;
    const bedG = ctx.createGain();
    bedG.gain.value = 0.55;
    bed.connect(hp).connect(lp).connect(bedG).connect(out);
    // a slow gust on the bed
    const gust = ctx.createOscillator();
    gust.frequency.value = 0.13;
    const gustD = ctx.createGain();
    gustD.gain.value = 0.15;
    gust.connect(gustD).connect(bedG.gain);
    // the roof's body: low, close
    const body = source(ctx, 2.1, true);
    const bl = ctx.createBiquadFilter();
    bl.type = 'lowpass';
    bl.frequency.value = 420;
    const bodyG = ctx.createGain();
    bodyG.gain.value = 0.5;
    body.connect(bl).connect(bodyG).connect(out);
    // the patter: drops on the boards, a band of noise chopped by a fast tremolo
    const pat = source(ctx, 4.3, true);
    const pb = ctx.createBiquadFilter();
    pb.type = 'bandpass';
    pb.frequency.value = 3200;
    pb.Q.value = 1.1;
    const patG = ctx.createGain();
    patG.gain.value = 0.3;
    pat.connect(pb).connect(patG).connect(out);
    const trem = ctx.createOscillator();
    trem.type = 'triangle';
    trem.frequency.value = 11;
    const tremD = ctx.createGain();
    tremD.gain.value = 0.25;
    trem.connect(tremD).connect(patG.gain);
    nodes = [bed, gust, body, pat, trem];
    gust.start();
    trem.start();
    if (fading) {
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
      thunderOut?.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
    }
  };

  /** One roll: a slow-attack low body with a long tail, and a short mid growl; the variation from the roll's index. */
  const roll = (r: Roll): void => {
    const c = ctx;
    if (!c || c.state !== 'running' || !buf || !thunderOut || fading || dead) return;
    const t = c.currentTime;
    const tail = 3.6 + rollVar(r.i, 1) * 2.4;
    const att = 0.35 + rollVar(r.i, 2) * 0.3;
    const level = (0.55 + 0.35 * r.peak) * (0.85 + 0.3 * rollVar(r.i, 3));
    const dur = att + tail;
    const out = c.createGain();
    out.gain.value = level;
    out.connect(thunderOut);
    const lowF = 150 + rollVar(r.i, 4) * 120;
    const off = rollVar(r.i, 5) * (NOISE_S - 1);
    const body = c.createBufferSource();
    body.buffer = buf;
    body.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(lowF, t);
    f.frequency.exponentialRampToValueAtTime(55, t + dur);
    f.Q.value = 0.7;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    body.connect(f).connect(g).connect(out);
    body.start(t, off, dur + 0.05);
    keep(body);
    const mid = c.createBufferSource();
    mid.buffer = buf;
    mid.loop = true;
    const bf = c.createBiquadFilter();
    bf.type = 'bandpass';
    bf.frequency.value = 320 + rollVar(r.i, 6) * 200;
    bf.Q.value = 0.8;
    const mg = c.createGain();
    mg.gain.setValueAtTime(0.0001, t);
    mg.gain.exponentialRampToValueAtTime(0.3, t + att * 0.7);
    mg.gain.exponentialRampToValueAtTime(0.0001, t + att + tail * 0.5);
    mid.connect(bf).connect(mg).connect(out);
    mid.start(t, (off + 2.5) % (NOISE_S - 1), att + tail * 0.5 + 0.05);
    keep(mid);
    // the roll's own gain leaves the graph once its sources end
    body.onended = () => out.disconnect();
  };

  return {
    start() {
      if (started || dead) return;
      started = true;
      engine.whenReady(build);
    },
    step(simTime, t0, listenerY) {
      if (dead) return;
      const i = clock.step(simTime - t0);
      if (i >= 0) roll(clock.rolls[i]!);
      if (rainOut && ctx && !fading) {
        const g = rainGain(listenerY);
        if (Math.abs(g - lastGain) > 0.002) {
          lastGain = g;
          rainOut.gain.setTargetAtTime(g, ctx.currentTime, RAIN_TC);
        }
      }
    },
    fadeOut(s) {
      if (fading || dead) return;
      fading = true;
      if (rainOut && ctx) {
        const t = ctx.currentTime;
        rainOut.gain.cancelScheduledValues(t);
        rainOut.gain.setValueAtTime(rainOut.gain.value, t);
        rainOut.gain.linearRampToValueAtTime(0, t + Math.max(0.05, s));
      }
      if (thunderOut && ctx) {
        const t = ctx.currentTime;
        thunderOut.gain.cancelScheduledValues(t);
        thunderOut.gain.setValueAtTime(thunderOut.gain.value, t);
        thunderOut.gain.linearRampToValueAtTime(0, t + Math.max(0.05, s));
      }
    },
    dispose() {
      if (dead) return;
      dead = true;
      for (const n of nodes) {
        try {
          n.stop();
        } catch {
          // already stopped
        }
      }
      nodes = [];
      for (let i = 0; i < live.length; i++) {
        try {
          live[i]?.stop();
        } catch {
          // already stopped
        }
        live[i] = null;
      }
      rainOut?.disconnect();
      rainOut = null;
      thunderOut?.disconnect();
      thunderOut = null;
      buf = null;
    },
  };
}
