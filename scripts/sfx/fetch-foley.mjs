// Downloads the CC0 foley packs listed in scripts/sfx/foley-sources.json into .sfx-cache/ (git-ignored), checks each
// zip's SHA-256 and unpacks it. Only the rendered sprite ships; the source OGGs never enter the repo.
// Re-running skips packs already unpacked. Usage: npm run sfx:fetch
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const manifest = JSON.parse(readFileSync(join(here, 'foley-sources.json'), 'utf8'));
const cache = join(root, '.sfx-cache');
mkdirSync(cache, { recursive: true });

for (const [id, p] of Object.entries(manifest.packs)) {
  const dir = join(cache, id);
  if (existsSync(join(dir, 'License.txt'))) {
    console.log(`${id}: already unpacked`);
    continue;
  }
  const res = await fetch(p.url);
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status} ${p.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const sha = createHash('sha256').update(buf).digest('hex');
  if (sha !== p.sha256) throw new Error(`${id}: SHA-256 ${sha} does not match the manifest (${p.sha256})`);
  const zip = join(cache, `${id}.zip`);
  writeFileSync(zip, buf);
  mkdirSync(dir, { recursive: true });
  // bsdtar reads zips: Windows 10+ ships it (use it by path: Git Bash's GNU tar may come first on PATH), macOS too
  const tar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  execFileSync(tar, ['-xf', zip, '-C', dir], { stdio: 'inherit' });
  console.log(`${id}: ${(buf.length / 1e6).toFixed(2)} MB, SHA-256 ok, unpacked`);
}
