/**
 * Offline foley render (node, on the PC): `npm run sfx:render` (scripts/sfx/render-foley.mjs bundles and runs this).
 * Needs the packs first (`npm run sfx:fetch`). Decodes the CC0 OGG takes in headless Chromium (node has no Vorbis
 * decoder), cuts them (`process.ts`), lays them out as one mono sprite, writes the WAV to `.sfx-cache/foley.wav`, the MP3
 * (Windows Media Foundation) to `src/assets/sfx/foley.mp3` and the index to `src/assets/sfx/foley.json`.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { encodeWav } from '../../music/wav';
import { firstAbove, FOLEY_BANKS, type FoleyBank, type FoleyIndex, type Take } from '../sprite';
import { dedupe, layout, normalize, splitHeelToe, trim } from './process';

const RATE = 48000;
const KBPS = 96;
const PEAK = 0.9;

interface BankSpec {
  pack: string;
  files: string[];
  maxDur: number;
  split?: boolean;
  normalize?: number;
}
const root = process.cwd();
const sources = JSON.parse(readFileSync(join(root, 'scripts', 'sfx', 'foley-sources.json'), 'utf8')) as { banks: Record<string, BankSpec> };
const cache = join(root, '.sfx-cache');
const outDir = join(root, 'src', 'assets', 'sfx');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('about:blank');
/** Decode an OGG to mono Float32 at RATE (the channels averaged). */
async function decode(path: string): Promise<Float32Array> {
  const b64 = readFileSync(path).toString('base64');
  const arr = await page.evaluate(
    async ([data, rate]) => {
      const bin = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      const buf = await new OfflineAudioContext(1, 1, rate).decodeAudioData(bin.buffer);
      const out = new Float32Array(buf.length);
      for (let c = 0; c < buf.numberOfChannels; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < d.length; i++) out[i] = out[i]! + d[i]! / buf.numberOfChannels;
      }
      return Array.from(out);
    },
    [b64, RATE] as const,
  );
  return Float32Array.from(arr);
}

const takes = new Map<FoleyBank, Float32Array[]>();
const add = (b: FoleyBank, t: Float32Array): void => {
  const l = takes.get(b) ?? [];
  l.push(t);
  takes.set(b, l);
};
for (const [id, spec] of Object.entries(sources.banks)) {
  for (const f of spec.files) {
    const raw = await decode(join(cache, spec.pack, 'Audio', `${f}.ogg`));
    const cut = trim(raw, RATE, spec.maxDur);
    const peak = spec.normalize ?? PEAK;
    if (spec.split) {
      const ht = splitHeelToe(cut, RATE);
      if (ht) {
        normalize(ht.heel, peak);
        normalize(ht.toe, peak);
        add('bootHeel', ht.heel);
        add('bootToe', ht.toe);
      } else {
        normalize(cut, peak);
        add('bootHeel', cut);
      }
      continue;
    }
    normalize(cut, peak);
    add(id as FoleyBank, cut);
  }
}
await browser.close();

// one sprite in bank order (concrete first: its sharp onset is the alignment mark)
const order: { bank: FoleyBank; take: Float32Array }[] = [];
for (const b of FOLEY_BANKS) for (const t of dedupe(takes.get(b) ?? [])) order.push({ bank: b, take: t });
const { buf, at } = layout(
  order.map((o) => o.take),
  RATE,
);
const banks = Object.fromEntries(FOLEY_BANKS.map((b) => [b, [] as Take[]])) as Record<FoleyBank, Take[]>;
order.forEach((o, i) => banks[o.bank].push(at[i]!));
const index: FoleyIndex = { rate: RATE, mark: Math.round(firstAbove(buf, RATE) * 1e5) / 1e5, length: Math.round((buf.length / RATE) * 1e3) / 1e3, banks };
const wav = join(cache, 'foley.wav');
writeFileSync(wav, encodeWav([buf], RATE));
const mp3 = join(outDir, 'foley.mp3');
execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'scripts', 'music', 'encode-mp3.ps1'), '-Kbps', String(KBPS), wav, mp3], { stdio: 'inherit' });
writeFileSync(join(outDir, 'foley.json'), JSON.stringify(index) + '\n');
for (const b of FOLEY_BANKS) console.info(`${b.padEnd(11)} ${banks[b].length} takes`);
console.info(`foley sprite: ${order.length} takes, ${index.length.toFixed(2)} s, ${(statSync(mp3).size / 1024).toFixed(0)} KB (MP3 ${KBPS} kbps)`);
