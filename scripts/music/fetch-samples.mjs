// Downloads the CC0 source samples listed in scripts/music/samples.json into .music-cache/samples/ (git-ignored).
// Only the rendered stems ship; the raw WAVs never enter the repo. Re-running skips files already present.
// Usage: node scripts/music/fetch-samples.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const manifest = JSON.parse(readFileSync(join(here, 'samples.json'), 'utf8'));
const dir = join(root, '.music-cache', 'samples');
mkdirSync(dir, { recursive: true });

export const sampleUrl = (s) => {
  const src = manifest.sources[s.lib];
  return `https://raw.githubusercontent.com/${src.repo}/${src.commit}/${s.path.split('/').map(encodeURIComponent).join('/')}`;
};

let got = 0;
let bytes = 0;
const queue = manifest.samples.filter((s) => !existsSync(join(dir, `${s.id}.wav`)));
async function worker() {
  for (let s = queue.shift(); s; s = queue.shift()) {
    const res = await fetch(sampleUrl(s));
    if (!res.ok) throw new Error(`${s.id}: HTTP ${res.status} ${sampleUrl(s)}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.toString('ascii', 0, 4) !== 'RIFF') throw new Error(`${s.id}: not a WAV`);
    writeFileSync(join(dir, `${s.id}.wav`), buf);
    got++;
    bytes += buf.length;
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
console.log(`fetched ${got} samples (${(bytes / 1e6).toFixed(1)} MB); ${manifest.samples.length} in the manifest`);
