// Dead Line design scripts: the engine as the source of truth. Bundles the pure game modules (perception, light, lamp
// formula, footstep and landing noise, muffling, surfaces, camera framing) from src/ with esbuild and re-exports them,
// so the checks and bots never re-type an engine number or formula.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../../src');
const entry = `
export { PERCEPTION, sightRate, fieldFactor, stepMeter, instantDetect, seenAt, noiseSuspicion, lightFactor, motionFactor } from './ai/perception';
export { LIGHT, visibilityFromLight } from './world/lights';
export { lampTerm, LAMP_LEVEL_GAIN, LAMP_CONE_COS, LAMP_EXP } from './world/lampMath';
export { noiseRadius, LANDING, landingKind, landingNoise } from './player/movement';
export { MUFFLE, LANDING_NOISE_RADIUS, HOLD_NOISE_RADIUS } from './config/noise';
export { SURFACE_NOISE } from './world/surfaces';
export { CAMERA, framing } from './config/camera';
export { MOVEMENT, GEARS, NOISE_QUIET } from './config/movement';
`;
const out = path.join(os.tmpdir(), `nightshift-engine-${process.pid}.mjs`);
await build({ stdin: { contents: entry, resolveDir: src, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'silent' });
const E = await import(pathToFileURL(out).href);
fs.rmSync(out, { force: true });
export const { PERCEPTION, sightRate, fieldFactor, stepMeter, instantDetect, seenAt, noiseSuspicion, lightFactor, motionFactor, LIGHT, visibilityFromLight, lampTerm, LAMP_LEVEL_GAIN, LAMP_CONE_COS, LAMP_EXP, noiseRadius, LANDING, landingKind, landingNoise, MUFFLE, LANDING_NOISE_RADIUS, HOLD_NOISE_RADIUS, SURFACE_NOISE, CAMERA, framing, MOVEMENT, GEARS, NOISE_QUIET } = E;
// MAX_ALIVE lives in ai/enemyManager.ts (Babylon); read the literal from the source file
const em = fs.readFileSync(path.join(src, 'ai/enemyManager.ts'), 'utf8');
export const MAX_ALIVE = +(em.match(/export const MAX_ALIVE = (\d+)/) || [0, NaN])[1];
