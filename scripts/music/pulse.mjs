// Quick prototype: tense dark electronic pulse for Thornbeck Mill (original; mood from the Pixabay
// "Suspense Thriller" tags: dark, suspense, pulse, ambient, slow, cinematic). node scripts/music/pulse.mjs [outDir] -> sketch-4-pulse.wav in outDir (default: the current folder)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SR = 44100, BPM = 84, SPB = 60 / BPM, BARS = 32, LEN = Math.ceil((BARS * 4 * SPB + 5) * SR);
const L = new Float32Array(LEN), R = new Float32Array(LEN);
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 * 2 - 1;
const at = (beat) => Math.floor(beat * SPB * SR);
const arc = (i) => Math.min(1, i / LEN * 1.6); // tension rises over the piece

// Drone pad: detuned saws through a slow-opening one-pole low-pass, D minor root and fifth.
for (const [m, pan] of [[26, 0.5], [33, 0.3], [38, 0.7], [41, 0.5]]) {
  for (const det of [-0.004, 0.003]) {
    const f = hz(m) * (1 + det); let ph = Math.random(), lp = 0;
    for (let i = 0; i < LEN; i++) {
      ph += f / SR; if (ph >= 1) ph -= 1;
      const cut = 0.004 + 0.03 * arc(i) * (0.6 + 0.4 * Math.sin(i / SR * 0.21));
      lp += cut * ((2 * ph - 1) - lp);
      const v = lp * 0.11 * Math.min(1, i / (4 * SR));
      L[i] += v * (1 - pan); R[i] += v * pan;
    }
  }
}

// Heartbeat sub pulse: two thumps per bar (lub-dub), getting louder.
function thump(s, amp, f0) {
  for (let i = 0; i < 0.35 * SR && s + i < LEN; i++) {
    const t = i / SR, f = f0 * (1 + 2.5 * Math.exp(-t * 30));
    const v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 9) * amp;
    L[s + i] += v; R[s + i] += v;
  }
}
for (let b = 0; b < BARS; b++) {
  const a = 0.35 + 0.45 * (b / BARS);
  thump(at(b * 4), a, 46); thump(at(b * 4 + 0.45), a * 0.7, 42);
  if (b >= 16) { thump(at(b * 4 + 2), a * 0.8, 46); thump(at(b * 4 + 2.45), a * 0.55, 42); }
}

// Ticking clock: a short filtered click on every eighth from bar 4, panned left-right.
for (let k = 32; k < BARS * 8; k++) {
  const s = at(k * 0.5), amp = (k % 2 ? 0.05 : 0.09) * (0.6 + 0.6 * (k / (BARS * 8)));
  let hp = 0, prev = 0;
  for (let i = 0; i < 0.03 * SR && s + i < LEN; i++) {
    const n = rnd(); hp = 0.9 * (hp + n - prev); prev = n;
    const v = hp * Math.exp(-i / (0.004 * SR)) * amp;
    if (k % 2) R[s + i] += v; else L[s + i] += v;
  }
}

// Pulse arpeggio (from bar 8): a dark minor-second motif on sixteenths, slowly opening up.
const motif = [62, 62, 63, 62, 60, 62, 63, 65];
for (let k = 8 * 16; k < BARS * 16; k++) {
  const m = motif[k % 8] - (Math.floor(k / 64) % 2 ? 2 : 0), s = at(k * 0.25), f = hz(m);
  const amp = 0.05 + 0.06 * (k / (BARS * 16)), pan = 0.5 + 0.35 * Math.sin(k * 0.4);
  let ph = 0, lp = 0;
  for (let i = 0; i < 0.16 * SR && s + i < LEN; i++) {
    ph += f / SR; if (ph >= 1) ph -= 1;
    lp += (0.05 + 0.1 * arc(s)) * ((ph < 0.5 ? 1 : -1) - lp);
    const v = lp * Math.exp(-i / (0.05 * SR)) * amp;
    L[s + i] += v * (1 - pan); R[s + i] += v * pan;
  }
}

// Rising risers into bars 16 and 32, then a deep hit.
function riser(endBeat, beats) {
  const s = at(endBeat - beats), e = at(endBeat); let lp = 0;
  for (let i = s; i < e && i < LEN; i++) {
    const p = (i - s) / (e - s); lp += (0.01 + 0.25 * p * p) * (rnd() - lp);
    const v = lp * p * p * 0.35; L[i] += v; R[i] += v;
  }
}
riser(64, 8); riser(128, 12);
thump(at(64), 1.1, 38); thump(at(128), 1.4, 34);

// Short stereo echo for space, normalise, write 16-bit WAV.
const d = Math.floor(SPB * 0.75 * SR);
for (let i = d; i < LEN; i++) { L[i] += R[i - d] * 0.28; R[i] += L[i - d] * 0.28; }
let peak = 0; for (let i = 0; i < LEN; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.89 / peak, out = Buffer.alloc(44 + LEN * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + LEN * 4, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16);
out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28);
out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(LEN * 4, 40);
for (let i = 0; i < LEN; i++) {
  out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4);
  out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4);
}
const outDir = resolve(process.argv[2] ?? '.');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'sketch-4-pulse.wav'), out);
console.log('sketch-4-pulse.wav', (LEN / SR).toFixed(0) + ' s');
