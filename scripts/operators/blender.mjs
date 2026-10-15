// Finds the pinned Blender, refuses any other version, and runs a pipeline Python script headless.
// Blender path: BLENDER_PATH, else the standard Windows install folder of the pinned version.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { PY_DIR, SEED } from './paths.mjs';

/** The only Blender the pipeline accepts (STATE.md tool check, 2026-10-15). */
export const PINNED_BLENDER = '5.2.2';

const CANDIDATES = [
  process.env.BLENDER_PATH,
  'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe',
  '/Applications/Blender.app/Contents/MacOS/Blender',
  '/usr/bin/blender',
].filter(Boolean);

export function findBlender() {
  const exe = CANDIDATES.find((p) => existsSync(p));
  if (!exe) throw new Error(`Blender ${PINNED_BLENDER} not found. Install it or set BLENDER_PATH. Looked in:\n  ${CANDIDATES.join('\n  ')}`);
  const r = spawnSync(exe, ['--version'], { encoding: 'utf8' });
  const first = (r.stdout || '').split(/\r?\n/)[0] ?? '';
  const m = /^Blender (\d+\.\d+\.\d+)/.exec(first);
  if (!m) throw new Error(`Could not read the Blender version from "${exe}": ${first || r.stderr}`);
  if (m[1] !== PINNED_BLENDER) throw new Error(`Blender ${m[1]} at "${exe}" refused: the pipeline is pinned to ${PINNED_BLENDER}.`);
  return { exe, version: first.trim() };
}

/**
 * Runs `py/<script>` in a fresh headless Blender (factory settings, no add-ons, no audio) and fails on any
 * Python error. `args` reach the script after `--`; the seed is always passed.
 */
export function runBlender(script, args = [], { blender = findBlender() } = {}) {
  const file = path.join(PY_DIR, script);
  const argv = ['-b', '--factory-startup', '-noaudio', '--python-exit-code', '1', '--python', file, '--', '--seed', String(SEED), ...args];
  const r = spawnSync(blender.exe, argv, { stdio: 'inherit', env: { ...process.env, PYTHONHASHSEED: String(SEED) } });
  if (r.status !== 0) throw new Error(`Blender script ${script} failed (exit ${r.status ?? r.signal}).`);
}
