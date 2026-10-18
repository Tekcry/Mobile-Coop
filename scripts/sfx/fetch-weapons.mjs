// Downloads the CC0 weapon recordings listed in scripts/sfx/weapon-sources.json into .sfx-cache/weapons/ (git-ignored),
// checks each file's SHA-256 and unpacks the firearm library. Only the rendered sprite ships; the source WAVs never
// enter the repo. Re-running skips files already there. Usage: npm run sfx:fetch-weapons
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const manifest = JSON.parse(readFileSync(join(here, 'weapon-sources.json'), 'utf8'));
const cache = join(root, '.sfx-cache', 'weapons');
mkdirSync(cache, { recursive: true });

for (const [name, f] of Object.entries(manifest.files)) {
  const path = join(cache, name);
  let buf = existsSync(path) ? readFileSync(path) : null;
  if (!buf) {
    const res = await fetch(f.url);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${f.url}`);
    buf = Buffer.from(await res.arrayBuffer());
  }
  const sha = createHash('sha256').update(buf).digest('hex');
  if (sha !== f.sha256) throw new Error(`${name}: SHA-256 ${sha} does not match the manifest (${f.sha256})`);
  writeFileSync(path, buf);
  if (f.unpack && !existsSync(join(cache, f.unpack))) {
    mkdirSync(join(cache, f.unpack), { recursive: true });
    // bsdtar reads 7z: Windows 10+ ships it (by path: Git Bash's GNU tar may come first on PATH), macOS too
    const tar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\Windows', 'System32', 'tar.exe') : 'tar';
    execFileSync(tar, ['-xf', path, '-C', join(cache, f.unpack)], { stdio: 'inherit' });
  }
  console.log(`${name}: ${(buf.length / 1e6).toFixed(2)} MB, SHA-256 ok`);
}
