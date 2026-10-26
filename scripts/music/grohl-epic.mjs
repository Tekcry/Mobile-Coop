// Prototype scene music, "epic" hybrid orchestral-electronic style (Michael ~21:35: big, cinematic military-thriller
// sound), on the same form as grohl-form.mjs (150 bpm, section changes 36.68 / 49.48 / 71.88 / 97.48 / 110.28 /
// 123.08 s, outro 139.08 s, fade by ~162 s). Original notes and sounds only: staccato string ostinatos, war drums, low
// brass "braam" hits, distorted synth bass, choir pad, reverse swells, a big hall. node scripts/music/grohl-epic.mjs [which=def] [outDir] -> grohl-d/e/f .wav in outDir (default: the current folder)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SR = 44100, SPB = 0.4, BAR = 1.6, T0 = 1.48, END = 160.7, LEN = Math.ceil(163 * SR);
const here = resolve(process.argv[3] ?? '.');
mkdirSync(here, { recursive: true });
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const SECT = [1.48, 36.68, 49.48, 71.88, 97.48, 110.28, 123.08, 139.08];
const NBARS = Math.floor((END - T0) / BAR);
const tOf = (bar, beat = 0) => T0 + bar * BAR + beat * SPB;
const sectOf = (bar) => { const t = tOf(bar) + 0.01; let s = 0; for (let i = 0; i < SECT.length; i++) if (t >= SECT[i]) s = i; return s; };
const firstBar = (s) => Math.round((SECT[s] - T0) / BAR);
const lastBarOf = (bar) => { const s = sectOf(bar); return s < 7 && sectOf(bar + 1) !== s; };
// Energy per section: build, lift, full, new colour, drop, rebuild, peak, outro.
const E = [0.35, 0.55, 0.8, 0.9, 0.4, 0.7, 1.0, 0.5];

function svf() { let low = 0, band = 0; return (x, fc, q = 1.1) => { const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6.5) / SR); low += f * band; const high = x - low - q * band; band += f * high; return low; }; }

function make() {
  const L = new Float32Array(LEN), R = new Float32Array(LEN);
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 * 2 - 1;
  const put = (i, v, pan) => { if (i >= 0 && i < LEN) { L[i] += v * (1 - pan); R[i] += v * pan; } };
  const saw = (ph) => 2 * ph - 1;
  return {
    L, R, rnd,
    // Short bowed-string stab: three detuned saws, filtered, fast decay.
    stacc(t, m, amp, pan = 0.5, len = 0.16, bright = 2200) {
      const s = Math.floor(t * SR), n = Math.floor(len * 2.2 * SR), f = hz(m), fl = svf(), phs = [Math.random(), Math.random(), Math.random()];
      for (let i = 0; i < n; i++) {
        let x = 0; for (let k = 0; k < 3; k++) { phs[k] += f * (1 + (k - 1) * 0.004) / SR; if (phs[k] >= 1) phs[k] -= 1; x += saw(phs[k]); }
        const e = Math.min(1, i / (0.004 * SR)) * Math.exp(-i / (len * 0.45 * SR));
        put(s + i, fl(x / 3, bright * (0.5 + e)) * e * amp, pan);
      }
    },
    // Sustained section (strings or brass): detuned saws, a swelling filter, slow attack, vibrato.
    ens(t0, t1, ms, amp, c0 = 300, c1 = 1500, att = 0.5, pan = 0.5, q = 1.1) {
      const s = Math.floor(t0 * SR), n = Math.floor((t1 - t0) * SR), rel = Math.floor(0.6 * SR);
      for (const m of ms) for (const det of [-0.006, 0, 0.005]) {
        const f = hz(m) * (1 + det), fl = svf(); let ph = Math.random();
        for (let i = 0; i < n + rel; i++) {
          const p = Math.min(1, i / n), vib = 1 + 0.003 * Math.sin(2 * Math.PI * 5.2 * i / SR) * Math.min(1, i / SR);
          ph += f * vib / SR; if (ph >= 1) ph -= 1;
          const env = Math.min(1, i / (att * SR)) * (i > n ? Math.exp(-(i - n) / (0.2 * SR)) : 1);
          put(s + i, fl(saw(ph), c0 + (c1 - c0) * p * p, q) * env * amp, pan + det * 25);
        }
      }
    },
    // Low brass "braam": a low cluster whose filter snaps open then closes, driven, with a sub under it.
    braam(t, root, amp, len = 2.6) {
      const s = Math.floor(t * SR), n = Math.floor(len * SR);
      for (const m of [root, root + 7, root + 12, root + 15]) for (const det of [-0.008, -0.002, 0.004, 0.009]) {
        const f = hz(m) * (1 + det), fl = svf(); let ph = Math.random();
        for (let i = 0; i < n; i++) {
          ph += f / SR; if (ph >= 1) ph -= 1; const x = i / SR;
          const cut = 180 + 2600 * Math.min(1, x / 0.12) * Math.exp(-Math.max(0, x - 0.12) * 1.6);
          const e = Math.min(1, x / 0.02) * Math.exp(-x * 1.1);
          put(s + i, Math.tanh(fl(saw(ph), cut, 0.8) * 2.2) * e * amp * 0.25, 0.5 + det * 20);
        }
      }
      for (let i = 0; i < n; i++) { const x = i / SR; put(s + i, Math.sin(2 * Math.PI * hz(root - 12) * x) * Math.exp(-x * 1.4) * Math.min(1, x / 0.01) * amp * 0.9, 0.5); }
    },
    // War drum: a pitched membrane that drops, plus a slap of low noise.
    taiko(t, amp, f0 = 62, pan = 0.5) {
      const s = Math.floor(t * SR), fl = svf(); let ph = 0;
      for (let i = 0; i < 0.9 * SR; i++) {
        const x = i / SR, f = f0 * (1 + 1.2 * Math.exp(-x * 40)); ph += f / SR;
        const v = Math.sin(2 * Math.PI * ph) * Math.exp(-x * 5) + fl(rnd(), 500) * Math.exp(-x * 25) * 1.4;
        put(s + i, v * amp, pan);
      }
    },
    // Snare / rim hit for hybrid percussion.
    snare(t, amp, pan = 0.5) {
      const s = Math.floor(t * SR), fl = svf(), top = svf();
      for (let i = 0; i < 0.25 * SR; i++) { const x = i / SR; const n = rnd(), lp = fl(n, 1800, 0.7); put(s + i, (top(n - lp, 5500, 1) * 0.6 + Math.sin(2 * Math.PI * 190 * x) * 0.5) * Math.exp(-x * 18) * amp, pan); }
    },
    // Distorted synth bass note.
    bass(t, m, dur, amp, cut = 500) {
      const s = Math.floor(t * SR), n = Math.floor(dur * SR), f = hz(m), fl = svf(); let p1 = 0, p2 = 0.5;
      for (let i = 0; i < n + 0.03 * SR; i++) {
        p1 += f / SR; if (p1 >= 1) p1 -= 1; p2 += f * 1.005 / SR; if (p2 >= 1) p2 -= 1;
        const e = Math.min(1, i / (0.003 * SR)) * (i > n ? Math.exp(-(i - n) / (0.008 * SR)) : Math.exp(-i / (dur * 2 * SR)));
        put(s + i, Math.tanh(fl(saw(p1) + (p2 < 0.5 ? 0.6 : -0.6), cut * (0.6 + e), 0.9) * 3.5) * e * amp, 0.5);
      }
    },
    // Wordless choir: saws through two vowel formants, slow attack.
    choir(t0, t1, ms, amp) {
      const s = Math.floor(t0 * SR), n = Math.floor((t1 - t0) * SR), rel = Math.floor(0.8 * SR);
      for (const m of ms) for (const det of [-0.005, 0.004]) {
        const f = hz(m) * (1 + det), f1 = svf(), f2 = svf(), f3 = svf(); let ph = Math.random();
        for (let i = 0; i < n + rel; i++) {
          ph += f * (1 + 0.004 * Math.sin(2 * Math.PI * 4.6 * i / SR + det * 900)) / SR; if (ph >= 1) ph -= 1;
          const x = saw(ph), lo = f1(x, 650, 0.25), lo2 = f2(x, 1100, 0.25), lp = f3(x, 400, 1);
          const env = Math.min(1, i / (0.9 * SR)) * (i > n ? Math.exp(-(i - n) / (0.3 * SR)) : 1);
          put(s + i, (lo - lp * 0.9 + lo2 * 0.5) * env * amp, 0.5 + det * 40);
        }
      }
    },
    // Reverse swell into a hit (a reversed cymbal feel).
    swell(tEnd, dur, amp) {
      const s = Math.floor((tEnd - dur) * SR), n = Math.floor(dur * SR), fl = svf();
      for (let i = 0; i < n; i++) { const p = i / n, x = rnd(); put(s + i, (x - fl(x, 3000, 0.7)) * p * p * p * amp, 0.5 + 0.3 * Math.sin(i / SR * 3)); }
    },
    // Electronic stutter tick.
    tick(t, amp, pan) {
      const s = Math.floor(t * SR);
      for (let i = 0; i < 0.03 * SR; i++) put(s + i, (Math.sin(2 * Math.PI * 3200 * i / SR) > 0 ? 1 : -1) * Math.exp(-i / (0.004 * SR)) * amp, pan);
    },
  };
}

// Big hall (Schroeder), soft master glue, fade, normalise, write.
function write(name, g) {
  const { L, R } = g, wetL = new Float32Array(LEN), wetR = new Float32Array(LEN);
  const combs = [2335, 2425, 2236, 2133, 1915, 2034], fb = 0.885, damp = 0.35;
  for (const [src, dst, off] of [[L, wetL, 0], [R, wetR, 37]]) {
    for (const d0 of combs) {
      const d = d0 + off, line = new Float32Array(d); let idx = 0, lp = 0;
      for (let i = 0; i < LEN; i++) { const y = line[idx]; lp = y * (1 - damp) + lp * damp; line[idx] = src[i] + lp * fb; dst[i] += y / combs.length; idx = (idx + 1) % d; }
    }
    for (const d of [225 + off, 556 + off, 441 + off]) {
      const line = new Float32Array(d); let idx = 0;
      for (let i = 0; i < LEN; i++) { const b = line[idx], x = dst[i]; dst[i] = -x + b; line[idx] = x + b * 0.5; idx = (idx + 1) % d; }
    }
  }
  let peak = 0;
  for (let i = 0; i < LEN; i++) { L[i] = L[i] * 0.85 + wetL[i] * 0.55; R[i] = R[i] * 0.85 + wetR[i] * 0.55; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
  const pre = 1.0 / peak;
  for (let i = 0; i < LEN; i++) {
    const k = i / SR > 158.5 ? Math.max(0, 1 - (i / SR - 158.5) / 3.5) : 1;
    L[i] = Math.tanh(L[i] * pre) * k; R[i] = Math.tanh(R[i] * pre) * k;
  }
  peak = 0; for (let i = 0; i < LEN; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const gn = 0.89 / peak, out = Buffer.alloc(44 + LEN * 4);
  out.write('RIFF', 0); out.writeUInt32LE(36 + LEN * 4, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28);
  out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(LEN * 4, 40);
  for (let i = 0; i < LEN; i++) {
    out.writeInt16LE(Math.round(L[i] * gn * 32767), 44 + i * 4);
    out.writeInt16LE(Math.round(R[i] * gn * 32767), 46 + i * 4);
  }
  writeFileSync(join(here, name), out);
  console.log(name);
}

const outroK = (bar) => sectOf(bar) === 7 ? Math.max(0.2, 1 - (bar - firstBar(7)) / 14) : 1;
const which = process.argv[2] || 'def';

// D "Hybrid Ops": E minor. Driving 3-3-2 string ostinato, war drums, distorted bass, brass swells, braams on each change.
if (which.includes('d')) {
  const g = make();
  const A = [[40, [52, 55, 59]], [36, [48, 52, 55]], [33, [45, 48, 52]], [35, [47, 51, 54]]]; // Em C Am B
  const B = [[40, [52, 55, 59]], [38, [50, 54, 57]], [36, [48, 52, 55]], [35, [47, 51, 54]]]; // Em D C B
  for (let bar = 0; bar < NBARS; bar++) {
    const s = sectOf(bar), e = E[s] * outroK(bar), [root, tri] = (s === 3 || s === 6 ? B : A)[bar % 4];
    const pat = [0, 0, 7, 0, 0, 7, 12, 10];
    for (let k = 0; k < 8; k++) g.stacc(tOf(bar, k * 0.5), root + 24 + pat[k], (k === 0 || k === 3 || k === 6 ? 0.2 : 0.12) * (0.5 + e), k % 2 ? 0.4 : 0.6, 0.15, 1400 + 1800 * e);
    if (s >= 2 && s !== 4) for (let k = 0; k < 8; k++) g.stacc(tOf(bar, k * 0.5), root + 36 + [7, 7, 12, 7, 7, 12, 15, 14][k], 0.08 * e, 0.7, 0.12, 2400);
    if (bar % 2 === 0) g.ens(tOf(bar), tOf(bar + 2) - 0.05, [root, root + 12], 0.05 * (0.4 + e), 200, 500 + 900 * e, 0.3);
    if (s >= 1 && s !== 4 && s !== 7) for (let k = 0; k < 8; k++) g.bass(tOf(bar, k * 0.5), root - 12 + (k === 6 ? 7 : 0), 0.18, 0.12 * e, 350 + 500 * e);
    if (s >= 2 && s !== 4 && s !== 7 && bar % 2 === 0) g.ens(tOf(bar), tOf(bar + 2) - 0.1, [tri[0], tri[2]], 0.035 * e, 250, 2200 * e, 0.9);
    if (s === 6 || s === 3) g.ens(tOf(bar), tOf(bar + 1) - 0.05, [tri[(bar % 3)] + 12], 0.03 * e, 400, 2600, 0.25, 0.4);
    const drum = s === 2 || s === 3 || s === 6 ? [0, 1.5, 2, 3, 3.5] : s === 5 ? [0, 2] : bar % 2 === 0 ? [0] : [];
    drum.forEach((b, i) => g.taiko(tOf(bar, b), (i === 0 ? 0.7 : 0.45) * (0.4 + e), i % 2 ? 70 : 58, 0.35 + 0.3 * (i % 2)));
    if ((s === 2 || s === 3 || s === 6) ) { g.snare(tOf(bar, 1), 0.25 * e, 0.55); g.snare(tOf(bar, 3), 0.3 * e, 0.45); }
    if (lastBarOf(bar)) for (let k = 0; k < 8; k++) g.taiko(tOf(bar, 2 + k * 0.25), 0.25 + 0.06 * k, 66 + k * 2, k % 2 ? 0.3 : 0.7);
  }
  for (const t of SECT.slice(1)) { g.swell(t, 2.4, 0.35); g.braam(t, 28, 0.9); g.taiko(t, 1.3, 52); }
  write('grohl-d-hybrid-ops.wav', g);
}

// E "Last Stand": D minor. Choir and a slow brass anthem over pulsing strings; drums on one and three; a heroic lift.
if (which.includes('e')) {
  const g = make();
  const P = [[38, [62, 65, 69]], [34, [58, 62, 65]], [36, [60, 64, 67]], [33, [57, 61, 64]]]; // Dm Bb C A
  const Q = [[34, [58, 62, 65]], [29, [53, 57, 60]], [36, [60, 64, 67]], [38, [62, 65, 69]]]; // Bb F C Dm
  const anthem = [[69, 4], [70, 2], [69, 2], [67, 4], [64, 4], [65, 4], [67, 2], [65, 2], [64, 8]]; // 32 beats = 8 bars
  for (let bar = 0; bar < NBARS; bar++) {
    const s = sectOf(bar), e = E[s] * outroK(bar), [root, tri] = (s === 3 || s === 6 ? Q : P)[bar % 4];
    const sub = s >= 3 && s !== 4 ? 16 : 8;
    for (let k = 0; k < sub; k++) g.stacc(tOf(bar, k * (4 / sub)), tri[k % 2 === 0 ? 0 : 2] - 12, (k % 4 === 0 ? 0.16 : 0.1) * (0.4 + e), 0.3 + 0.4 * (k % 2), 4 / sub * SPB * 0.8, 1200 + 1500 * e);
    if (bar % 2 === 0) g.ens(tOf(bar), tOf(bar + 2) - 0.05, [root, root + 7], 0.05 * (0.4 + e), 180, 700 * (0.5 + e), 0.4);
    if (bar % 4 === 0 && (s > 0 || bar >= 8)) g.choir(tOf(bar), tOf(bar + 4) - 0.1, [tri[0], tri[1], tri[2]], 0.045 * (0.3 + e));
    if (s === 2 || s === 3 || s === 5 || s === 6) {
      const b8 = (bar - firstBar(s)) % 8; let acc = 0;
      for (const [m, d] of anthem) { if (acc >= b8 * 4 && acc < b8 * 4 + 4) g.ens(tOf(bar, acc - b8 * 4), tOf(bar, acc - b8 * 4 + d) - 0.05, [m - 12, m - (s === 6 ? 0 : 24)], 0.045 * e, 350, 1600 + 1400 * e, 0.12, 0.5, 0.9); acc += d; }
    }
    if (s !== 0 || bar >= 12) { g.taiko(tOf(bar), 0.6 * (0.4 + e), 56); if (s >= 2 && s !== 4) g.taiko(tOf(bar, 2), 0.45 * e, 64, 0.6); }
    if (s === 6) g.snare(tOf(bar, 3.5), 0.2, 0.5);
    if (lastBarOf(bar)) for (let k = 0; k < 6; k++) g.taiko(tOf(bar, 2.5 + k * 0.25), 0.3 + 0.08 * k, 60 + k * 3, k % 2 ? 0.35 : 0.65);
  }
  for (const t of SECT.slice(1)) { g.swell(t, 3.2, 0.3); g.braam(t, 26, 0.8, 3.2); g.taiko(t, 1.2, 50); }
  write('grohl-e-last-stand.wav', g);
}

// F "Ghost Signal": C sharp minor. Pulsing distorted bass and electronic stutters, string swells, sparse war drums.
if (which.includes('f')) {
  const g = make();
  const roots = [37, 33, 30, 32]; // C#m A F#m G#
  for (let bar = 0; bar < NBARS; bar++) {
    const s = sectOf(bar), e = E[s] * outroK(bar), root = roots[(bar + (s === 3 || s === 6 ? 2 : 0)) % 4];
    for (let k = 0; k < 16; k++) if (s >= 1 || k % 2 === 0) g.bass(tOf(bar, k * 0.25), root - 12 + (k % 8 === 7 ? 12 : 0), 0.09, (k % 4 === 0 ? 0.16 : 0.1) * (0.4 + e), 250 + 900 * e * (0.5 + 0.5 * Math.sin(bar * 0.4 + k * 0.2)));
    if (bar % 2 === 0) g.ens(tOf(bar), tOf(bar + 2) - 0.05, [root + 12, root + 19, root + 24], 0.03 * (0.3 + e), 250, 700 + 2000 * e, 1.2);
    if (s >= 1 && s !== 4) for (let k = 0; k < 16; k++) if ((k * 7 + bar) % 5 === 0) g.tick(tOf(bar, k * 0.25), 0.05 * e, k % 2 ? 0.8 : 0.2);
    if (s === 2 || s === 3 || s === 6) for (let k = 0; k < 8; k++) g.stacc(tOf(bar, k * 0.5), root + 24 + [0, 3, 7, 3, 0, 3, 8, 7][k], 0.1 * e, k % 2 ? 0.3 : 0.7, 0.13, 2600);
    if (bar % 2 === 0) g.taiko(tOf(bar), 0.7 * (0.3 + e), 54);
    if (s >= 2 && s !== 4 && s !== 7) { g.taiko(tOf(bar, 1.5), 0.4 * e, 66, 0.3); g.snare(tOf(bar, 2), 0.3 * e, 0.5); g.taiko(tOf(bar, 3), 0.45 * e, 60, 0.7); }
    if (s === 4 && bar % 4 === 0) g.choir(tOf(bar), tOf(bar + 4) - 0.1, [root + 24, root + 27, root + 31], 0.05);
    if (lastBarOf(bar)) for (let k = 0; k < 16; k++) g.tick(tOf(bar, 2 + k * 0.125), 0.04 + 0.006 * k, 0.5 + 0.4 * Math.sin(k));
  }
  for (const t of SECT.slice(1)) { g.swell(t, 4.8, 0.35); g.braam(t, 25, 1.0); g.taiko(t, 1.3, 48); }
  write('grohl-f-ghost-signal.wav', g);
}
