// Quick prototype piano sketches for the Thornbeck Mill scene (original notes; mood: slow, dark, cinematic).
// node scripts/music/piano.mjs [outDir] -> writes sketch-1-held-breath.wav, sketch-2-thornbeck.wav, sketch-3-last-round.wav
// into outDir (default: the current folder). Encode to MP3 with encode-mp3.ps1. Original notes, no samples.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SR = 44100;
const here = resolve(process.argv[2] ?? '.');
mkdirSync(here, { recursive: true });
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// One piano note: inharmonic partials, per-partial decay, soft hammer, two slightly detuned strings.
function note(buf, t0, midi, durSec, vel) {
  const f0 = hz(midi), B = 0.00035, start = Math.floor(t0 * SR);
  const ring = Math.min(durSec + 0.6, 7), len = Math.floor(ring * SR);
  const relAt = durSec * SR, bright = 0.35 + 0.65 * vel;
  for (let n = 1; n <= 7; n++) {
    const fn = n * f0 * Math.sqrt(1 + B * n * n);
    if (fn > 9000) break;
    const amp = vel * Math.pow(n, -1.1) * Math.pow(bright, n - 1) * 0.18;
    const dec = (0.45 + 0.55 * n) * Math.pow(f0 / 220, 0.35);
    for (const det of [-0.0006, 0.0006]) {
      const w = 2 * Math.PI * fn * (1 + det) / SR;
      let c = 1, s = 0; const cw = Math.cos(w), sw = Math.sin(w);
      for (let i = 0; i < len && start + i < buf.length; i++) {
        const t = i / SR;
        let env = Math.exp(-dec * t) * Math.min(1, t / 0.004);
        if (i > relAt) env *= Math.exp(-(i - relAt) / (0.18 * SR));
        buf[start + i] += amp * env * s;
        const c2 = c * cw - s * sw; s = s * cw + c * sw; c = c2;
      }
    }
  }
}

// Simple stereo Schroeder reverb.
function reverb(dry) {
  const L = new Float32Array(dry.length), R = new Float32Array(dry.length);
  const combs = [1557, 1617, 1491, 1422, 1277, 1356], fb = 0.86, damp = 0.3;
  for (const [side, off] of [[L, 0], [R, 23]]) {
    for (const d0 of combs) {
      const d = d0 + off, line = new Float32Array(d); let idx = 0, lp = 0;
      for (let i = 0; i < dry.length; i++) {
        const y = line[idx]; lp = y * (1 - damp) + lp * damp;
        line[idx] = dry[i] + lp * fb; side[i] += y / combs.length;
        idx = (idx + 1) % d;
      }
    }
    for (const d of [225 + off, 556 + off]) {
      const line = new Float32Array(d); let idx = 0;
      for (let i = 0; i < dry.length; i++) {
        const b = line[idx], x = side[i]; side[i] = -x + b; line[idx] = x + b * 0.5; idx = (idx + 1) % d;
      }
    }
  }
  return [L, R];
}

function writeWav(path, dry) {
  const [L, R] = reverb(dry);
  let peak = 0;
  for (let i = 0; i < dry.length; i++) {
    L[i] = dry[i] * 0.8 + L[i] * 0.45; R[i] = dry[i] * 0.8 + R[i] * 0.45;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const g = 0.89 / peak, n = dry.length, out = Buffer.alloc(44 + n * 4);
  out.write('RIFF', 0); out.writeUInt32LE(36 + n * 4, 4); out.write('WAVEfmt ', 8);
  out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write('data', 36);
  out.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
    out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
  }
  writeFileSync(path, out);
}

// Render a list of [beat, midi, beats, vel] at a tempo, with a little human timing.
function render(name, bpm, events, totalBeats) {
  const spb = 60 / bpm, buf = new Float32Array(Math.ceil((totalBeats * spb + 6) * SR));
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5);
  for (const [b, m, d, v] of events) note(buf, b * spb + rnd() * 0.02, m, d * spb, v * (1 + rnd() * 0.08));
  writeWav(join(here, name), buf);
  console.log(name, (buf.length / SR).toFixed(0) + ' s');
}

// Sketch 1 "Held Breath": D minor, 54 bpm. Low octaves, a ticking high D, a sparse falling melody.
{
  const ev = [], prog = [[38, 'Dm'], [34, 'Bb'], [31, 'Gm'], [33, 'A']];
  const tri = { Dm: [62, 65, 69], Bb: [58, 62, 65], Gm: [55, 58, 62], A: [57, 61, 64] };
  const mel = [[74, 72, 69, 67], [70, 69, 65, 62], [67, 65, 62, 70], [69, 67, 64, 61]];
  for (let bar = 0; bar < 16; bar++) {
    const [root, ch] = prog[bar % 4], b0 = bar * 4, pass = Math.floor(bar / 4);
    ev.push([b0, root, 4, 0.55], [b0, root + 12, 4, 0.35]);
    for (let k = 0; k < 4; k++) if (pass > 0 || k % 2 === 0) ev.push([b0 + k + 0.5, 86, 0.4, 0.12 + 0.03 * pass]);
    if (pass >= 1) tri[ch].forEach((m, i) => ev.push([b0 + 2 + i * 0.33, m, 2, 0.22]));
    if (pass >= 2) mel[bar % 4].forEach((m, i) => ev.push([b0 + i, m, 1.2, 0.42 + 0.05 * (pass - 2)]));
  }
  ev.push([64, 38, 6, 0.6], [64, 50, 6, 0.4], [64, 62, 6, 0.3]);
  render('sketch-1-held-breath.wav', 54, ev, 70);
}

// Sketch 2 "Thornbeck": A minor, 48 bpm. A soft repeated E like rain, drones, a slow rising line.
{
  const ev = [], roots = [33, 29, 36, 28], mel = [[64, 67, 69, 72], [65, 64, 60, 57], [67, 72, 71, 67], [68, 71, 76, 75]];
  for (let bar = 0; bar < 16; bar++) {
    const b0 = bar * 4, r = roots[bar % 4], pass = Math.floor(bar / 4);
    ev.push([b0, r, 4, 0.5], [b0 + 2, r + 7, 2, 0.25]);
    for (let k = 0; k < 8; k++) ev.push([b0 + k * 0.5, 76, 0.45, k % 2 ? 0.08 : 0.13]);
    if (pass >= 1) mel[bar % 4].forEach((m, i) => ev.push([b0 + i, m, 1.5, 0.3 + 0.06 * pass]));
    if (pass >= 3) ev.push([b0, r + 24, 4, 0.3]);
  }
  ev.push([64, 33, 6, 0.55], [64, 45, 6, 0.35], [64, 64, 6, 0.25], [64, 69, 6, 0.25]);
  render('sketch-2-thornbeck.wav', 48, ev, 70);
}

// Sketch 3 "Last Round": C minor, 60 bpm. Rolling arpeggios that build to a swell (the EMP moment).
{
  const ev = [], chords = [[36, [60, 63, 67]], [32, [56, 60, 63]], [39, [58, 63, 67]], [34, [58, 62, 65]]];
  for (let bar = 0; bar < 16; bar++) {
    const [r, ch] = chords[bar % 4], b0 = bar * 4, lift = bar / 16;
    ev.push([b0, r, 4, 0.45 + 0.3 * lift], [b0, r + 12, 4, 0.25 + 0.25 * lift]);
    const arp = [ch[0], ch[1], ch[2], ch[0] + 12, ch[2], ch[1], ch[2], ch[0] + 12];
    arp.forEach((m, i) => ev.push([b0 + i * 0.5, m + (bar >= 12 ? 12 : 0), 0.6, 0.18 + 0.32 * lift]));
    if (bar >= 8) ev.push([b0, ch[2] + 12 + (bar % 2 ? 0 : 3), 3, 0.35 + 0.3 * lift]);
  }
  ev.push([64, 24, 8, 0.85], [64, 36, 8, 0.75], [64, 60, 8, 0.6], [64, 63, 8, 0.6], [64, 67, 8, 0.6], [64, 72, 8, 0.5]);
  render('sketch-3-last-round.wav', 60, ev, 72);
}
