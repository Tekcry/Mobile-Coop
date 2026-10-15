// Shared paths and constants of the operator pipeline (docs/operators/SPEC.md 6.3).
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PY_DIR = path.join(ROOT, 'scripts', 'operators', 'py');
/** Build output; not committed. Bundled assets are copied out of here by a later export step. */
export const OUT_DIR = path.join(ROOT, 'build', 'operators');
export const JOINTS_JSON = path.join(OUT_DIR, 'joints.json');
/** Fixed seed for every random choice in the pipeline (cloth, wear, scatter): same scripts, same assets. */
export const SEED = 1015;
