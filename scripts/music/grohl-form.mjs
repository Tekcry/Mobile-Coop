// Prototype scene music on the FORM of "Suspense Thriller" (Alex Grohl, Pixabay 552495), from Michael's beat / section
// breakdown (2026-10-26 ~21:20): 150 bpm, 4/4, first downbeat 2.69 s, section changes at 36.68 / 49.48 / 71.88 / 97.48 /
// 110.28 / 123.08 s, an instrumental outro from 139.08 s, fade out by ~162 s, steady loudness throughout.
// Original notes and sounds only (no samples, nothing taken from the track). node scripts/music/grohl-form.mjs [outDir] -> grohl-a/b/c .wav in outDir (default: the current folder)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SR = 44100, SPB = 0.4, BAR = 1.6, T0 = 1.48, END = 160.7, LEN = Math.ceil(163 * SR);
const here = resolve(process.argv[2] ?? '.');
mkdirSync(here, { recursive: true });
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const SECT = [1.48, 36.68, 49.48, 71.88, 97.48, 110.28, 123.08, 139.08]; // 8 = outro
const NBARS = Math.floor((END - T0) / BAR);
const tOf = (bar, beat = 0) => T0 + bar * BAR + beat * SPB;
const sectOf = (bar) => { const t = tOf(bar) + 0.01; let s = 0; for (let i = 0; i < SECT.length; i++) if (t >= SECT[i]) s = i; return s; };
const firstBar = (s) => Math.round((SECT[s] - T0) / BAR);

function make() {
  const L = new Float32Array(LEN), R = new Float32Array(LEN);
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 * 2 - 1;
  const put = (i, v, pan) => { if (i >= 0 && i < LEN) { L[i] += v * (1 - pan); R[i] += v * pan; } };
  return {
    L, R, rnd,
    pluck(t, m, amp, pan = 0.5, dec = 0.12, bright = 0.12) {
      const s = Math.floor(t * SR), f = hz(m); let ph = 0, lp = 0;
      for (let i = 0; i < dec * 5 * SR; i++) {
        ph += f / SR; if (ph >= 1) ph -= 1;
        lp += bright * ((2 * ph - 1) - lp);
        put(s + i, lp * Math.exp(-i / (dec * SR)) * amp * Math.min(1, i / 40), pan);
      }
    },
    pad(t0, t1, ms, amp, cut = 0.01, pan = 0.5) {
      const s = Math.floor(t0 * SR), n = Math.floor((t1 - t0) * SR), att = 0.6 * SR, rel = 0.8 * SR;
      for (const m of ms) for (const det of [-0.005, 0.004]) {
        const f = hz(m) * (1 + det); let ph = Math.random(), lp = 0;
        for (let i = 0; i < n + rel; i++) {
          ph += f / SR; if (ph >= 1) ph -= 1;
          lp += cut * ((2 * ph - 1) - lp);
          const env = Math.min(1, i / att) * (i > n ? Math.exp(-(i - n) / (0.25 * SR)) : 1);
          put(s + i, lp * env * amp, pan + det * 20);
        }
      }
    },
    thump(t, amp, f0 = 46) {
      const s = Math.floor(t * SR);
      for (let i = 0; i < 0.35 * SR; i++) {
        const x = i / SR, f = f0 * (1 + 2.5 * Math.exp(-x * 30));
        put(s + i, Math.sin(2 * Math.PI * f * x) * Math.exp(-x * 9) * amp, 0.5);
      }
    },
    hat(t, amp, pan = 0.5, len = 0.004) {
      const s = Math.floor(t * SR); let hp = 0, prev = 0;
      for (let i = 0; i < 0.04 * SR; i++) { const n = rnd(); hp = 0.9 * (hp + n - prev); prev = n; put(s + i, hp * Math.exp(-i / (len * SR)) * amp, pan); }
    },
    bell(t, m, amp, pan = 0.5) {
      const s = Math.floor(t * SR), f = hz(m);
      for (let i = 0; i < 2.5 * SR; i++) {
        const x = i / SR, e = Math.exp(-x * 1.6) * Math.min(1, i / 60);
        put(s + i, (Math.sin(2 * Math.PI * f * x) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * x) * Math.exp(-x * 3)) * e * amp, pan);
      }
    },
    piano(t, m, dur, vel, pan = 0.5) {
      const f0 = hz(m), s = Math.floor(t * SR), len = Math.floor(Math.min(dur + 0.5, 4) * SR), rel = dur * SR, br = 0.35 + 0.65 * vel;
      for (let n = 1; n <= 6; n++) {
        const fn = n * f0 * Math.sqrt(1 + 0.00035 * n * n); if (fn > 8000) break;
        const a = vel * Math.pow(n, -1.1) * Math.pow(br, n - 1) * 0.18, dec = (0.45 + 0.55 * n) * Math.pow(f0 / 220, 0.35);
        const w = 2 * Math.PI * fn / SR, cw = Math.cos(w), sw = Math.sin(w); let c = 1, sn = 0;
        for (let i = 0; i < len; i++) {
          let e = Math.exp(-dec * i / SR) * Math.min(1, i / 150); if (i > rel) e *= Math.exp(-(i - rel) / (0.15 * SR));
          put(s + i, a * e * sn, pan); const c2 = c * cw - sn * sw; sn = sn * cw + c * sw; c = c2;
        }
      }
    },
    riser(tEnd, dur, amp = 0.3) {
      const s = Math.floor((tEnd - dur) * SR), n = Math.floor(dur * SR); let lp = 0;
      for (let i = 0; i < n; i++) { const p = i / n; lp += (0.01 + 0.25 * p * p) * (rnd() - lp); put(s + i, lp * p * p * amp, 0.5); }
    },
  };
}

function write(name, g) {
  const { L, R } = g, d = Math.floor(SPB * 0.75 * SR);
  for (let i = d; i < LEN; i++) { L[i] += R[i - d] * 0.25; R[i] += L[i - d] * 0.25; }
  // Fade out over the end (the breakdown's fade 160.7 -> 162).
  for (let i = Math.floor(158.5 * SR); i < LEN; i++) { const k = Math.max(0, 1 - (i / SR - 158.5) / 3.5); L[i] *= k; R[i] *= k; }
  let peak = 0; for (let i = 0; i < LEN; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const gn = 0.89 / peak, out = Buffer.alloc(44 + LEN * 4);
  out.write('RIFF', 0); out.writeUInt32LE(36 + LEN * 4, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28);
  out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(LEN * 4, 40);
  for (let i = 0; i < LEN; i++) {
    out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * gn)) * 32767), 44 + i * 4);
    out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * gn)) * 32767), 46 + i * 4);
  }
  writeFileSync(join(here, name), out);
  console.log(name);
}

// Section energy (0 intro .. 7 outro), mirrored on the breakdown: build, lift, full, new colour, drop, rebuild, peak, outro.
const LAYERS = [
  { pulse: 1, low: 1, mid: 0, top: 0, perc: 0 }, // 1.48-36.68 (22 bars; mid joins at bar 8)
  { pulse: 1, low: 1, mid: 1, top: 0, perc: 0 }, // 36.68-49.48
  { pulse: 1, low: 1, mid: 1, top: 1, perc: 1 }, // 49.48-71.88
  { pulse: 1, low: 1, mid: 1, top: 2, perc: 1 }, // 71.88-97.48 (new harmony)
  { pulse: 1, low: 0, mid: 1, top: 0, perc: 0 }, // 97.48-110.28 (drop)
  { pulse: 1, low: 1, mid: 1, top: 1, perc: 0 }, // 110.28-123.08 (rebuild)
  { pulse: 1, low: 1, mid: 1, top: 2, perc: 1 }, // 123.08-139.08 (peak)
  { pulse: 1, low: 1, mid: 0, top: 0, perc: 0 }, // 139.08-end (outro: thins, fades)
];

// A "Clockwork": E minor. Muted plucked eighths like mill gears, a dark pad, a high bell line, ticking hats.
{
  const g = make();
  const progA = [[40, [52, 55, 59]], [36, [48, 52, 55]], [33, [45, 48, 52]], [35, [47, 51, 54]]]; // Em C Am B
  const progB = [[38, [50, 53, 57]], [34, [46, 50, 53]], [40, [52, 55, 59]], [35, [47, 51, 54]]]; // Dm Bb Em B
  const gear = [0, 7, 12, 7, 3, 7, 12, 15];
  for (let bar = 0; bar < NBARS; bar++) {
    const s = sectOf(bar), Ly = LAYERS[s], prog = s === 3 || s === 6 ? progB : progA, [root, tri] = prog[bar % 4];
    const outroK = s === 7 ? Math.max(0.2, 1 - (bar - firstBar(7)) / 14) : 1;
    for (let k = 0; k < 8; k++) g.pluck(tOf(bar, k * 0.5), root + 12 + gear[k] % 12 + (gear[k] >= 12 ? 12 : 0), 0.13 * outroK, k % 2 ? 0.35 : 0.65, 0.07, 0.18);
    if (Ly.low && bar % 4 === 0) g.pad(tOf(bar), tOf(bar + 4) - 0.1, [root, ...tri], 0.035 * outroK, 0.008);
    if (Ly.mid && (s > 0 || bar >= 8)) for (let k = 0; k < 4; k++) g.pluck(tOf(bar, k), tri[k % 3] + 12, 0.07, 0.5, 0.25, 0.06);
    if (Ly.top) { const line = [tri[2] + 24, tri[1] + 24, tri[0] + 24, tri[1] + 24]; g.bell(tOf(bar), line[bar % 4], 0.08, 0.3 + 0.4 * (bar % 2)); if (Ly.top > 1) g.bell(tOf(bar, 2), line[(bar + 2) % 4] + 12, 0.05, 0.7); }
    if (Ly.perc) for (let k = 0; k < 8; k++) g.hat(tOf(bar, k * 0.5 + 0.25), k % 2 ? 0.05 : 0.08, k % 2 ? 0.8 : 0.2);
    if (Ly.perc && bar % 2 === 0) g.thump(tOf(bar), 0.5);
  }
  for (const t of SECT.slice(1)) { g.riser(t, 3.2, 0.25); g.thump(t, 0.9, 38); }
  write('grohl-a-clockwork.wav', g);
}

// B "Storm Piano": D minor. A driving piano ostinato on eighths, octave bass on the downbeats, a pad swell per section.
{
  const g = make();
  const prog = [[38, [62, 65, 69]], [34, [58, 62, 65]], [31, [55, 58, 62]], [33, [57, 61, 64]]]; // Dm Bb Gm A
  const prog2 = [[34, [58, 62, 65]], [36, [60, 64, 67]], [38, [62, 65, 69]], [33, [57, 61, 64]]]; // Bb C Dm A
  const mel = [[74, 72, 69, 70], [70, 69, 65, 67], [67, 69, 70, 74], [73, 69, 64, 61]];
  for (let bar = 0; bar < NBARS; bar++) {
    const s = sectOf(bar), Ly = LAYERS[s], [root, tri] = (s === 3 || s === 6 ? prog2 : prog)[bar % 4];
    const outroK = s === 7 ? Math.max(0.25, 1 - (bar - firstBar(7)) / 14) : 1;
    const ost = [tri[0], tri[1], tri[2], tri[1], tri[0] + 12, tri[2], tri[1], tri[2]];
    for (let k = 0; k < 8; k++) g.piano(tOf(bar, k * 0.5), ost[k] - 12, 0.25, (0.28 + (k % 4 === 0 ? 0.1 : 0)) * outroK, 0.45 + 0.1 * (k % 2));
    if (Ly.low) { g.piano(tOf(bar), root, 1.6, 0.55 * outroK, 0.5); g.piano(tOf(bar), root + 12, 1.6, 0.35 * outroK, 0.5); }
    if (Ly.mid && (s > 0 || bar >= 8) && bar % 4 === 0) g.pad(tOf(bar), tOf(bar + 4) - 0.1, [root + 12, tri[0], tri[2]], 0.025, 0.006);
    if (Ly.top) mel[bar % 4].forEach((m, i) => g.piano(tOf(bar, i), m, 0.9, 0.38 + 0.08 * (Ly.top - 1), 0.4));
    if (Ly.perc && bar % 2 === 0) g.thump(tOf(bar), 0.55, 44);
    if (Ly.perc) g.thump(tOf(bar, 2.5), 0.3, 50);
  }
  for (const t of SECT.slice(1)) { g.riser(t, 3.2, 0.22); g.piano(t, 26, 3, 0.9); g.piano(t, 38, 3, 0.7); }
  write('grohl-b-storm-piano.wav', g);
}

// C "Heartbeat": C sharp minor. A sub heartbeat on every beat, ticking noise, a pulsing minor-second synth motif, risers.
{
  const g = make();
  const roots = [37, 33, 30, 32]; // C#m A F#m G#
  const motif = [61, 61, 62, 61, 59, 61, 62, 64];
  for (let bar = 0; bar < NBARS; bar++) {
    const s = sectOf(bar), Ly = LAYERS[s], root = roots[(bar + (s === 3 || s === 6 ? 2 : 0)) % 4];
    const outroK = s === 7 ? Math.max(0.2, 1 - (bar - firstBar(7)) / 14) : 1;
    for (let k = 0; k < 4; k++) { g.thump(tOf(bar, k), (k % 2 ? 0.35 : 0.55) * outroK, 46); g.thump(tOf(bar, k + 0.18), 0.25 * outroK, 42); }
    for (let k = 0; k < 8; k++) g.hat(tOf(bar, k * 0.5), (k % 2 ? 0.03 : 0.05) * outroK, k % 2 ? 0.75 : 0.25, 0.003);
    if (Ly.low && bar % 4 === 0) g.pad(tOf(bar), tOf(bar + 4) - 0.1, [root, root + 7, root + 12], 0.04 * outroK, 0.006 + 0.004 * Ly.top);
    if (Ly.mid && (s > 0 || bar >= 8)) for (let k = 0; k < 16; k++) g.pluck(tOf(bar, k * 0.25), motif[k % 8] - (bar % 8 >= 4 ? 2 : 0), 0.055 + 0.02 * Ly.top, 0.5 + 0.35 * Math.sin(k * 0.4), 0.04, 0.08 + 0.05 * Ly.top);
    if (Ly.top) g.bell(tOf(bar), root + 36 + (bar % 2 ? 3 : 0), 0.05 * Ly.top, 0.6);
    if (Ly.perc) for (let k = 0; k < 4; k++) g.hat(tOf(bar, k + 0.5), 0.09, 0.5, 0.02);
  }
  for (const t of SECT.slice(1)) { g.riser(t, 6.4, 0.3); g.thump(t, 1.2, 34); }
  write('grohl-c-heartbeat.wav', g);
}
