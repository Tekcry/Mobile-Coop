/** One measured shot (VG5 fills it; the store reads only `key`). @typedef {{ key: string } & Record<string, unknown>} ShotRecord */
/**
 * @typedef {{
 *   sha: string, version: string, train: number | null, branch: string, at: string,   // at: ISO time
 *   renderer: string, chrome: string, viewport: { width: number, height: number },
 *   verdict: 'green' | 'flagged' | 'error',
 *   shots: ShotRecord[], rigs: ShotRecord[], parity: Record<string, unknown>[], flags: Record<string, unknown>[], ms: number,
 * }} RunRecord
 */
/** @typedef {{ sha: string, version: string, by: string, why: string, at: string, only: string[] | null }} AcceptRecord */
/** @typedef {{ runs: RunRecord[], accepted: AcceptRecord[] }} Records */
/** @typedef {{ key: string, sha: string, version: string, source: 'accepted' | 'green', approver: string | null, shot: ShotRecord }} BaselinePick */

// Visual gate baseline store, pure part (docs/visual-gate/PLAN.md section 5, BRIEF A8 / A9 / A11): record shapes, the
// paths on the `visual-baselines` data branch, the baseline pick and the CLI argument parser. No node: imports, no git,
// no fs; the I/O lives in store.mjs, the CLI in baseline.mjs.

export const BRANCH = 'visual-baselines';

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const SHA40 = /^[0-9a-f]{40}$/;
const VERDICTS = ['green', 'flagged', 'error'];

/**
 * Shot key `<view or rig id>@<preset>`; a rig shot is `<id>-on@<preset>` / `<id>-off@<preset>`.
 * @param {string} id @param {string} preset @param {'on' | 'off' | null} [rigState]
 */
export function shotKey(id, preset, rigState = null) {
  return rigState ? `${id}-${rigState}@${preset}` : `${id}@${preset}`;
}

/** @param {string} v */
function semverParts(v) {
  const m = SEMVER.exec(String(v));
  if (!m) throw new Error(`malformed version ${v}`);
  return /** @type {[number, number, number]} */ ([Number(m[1]), Number(m[2]), Number(m[3])]);
}

/** `x.y.z` numeric compare: negative when a < b, 0 when equal, positive when a > b. Throws on a malformed one. */
export function cmpSemver(/** @type {string} */ a, /** @type {string} */ b) {
  const pa = semverParts(a);
  const pb = semverParts(b);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
}

/** @param {unknown} v */
const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Why a shot key cannot name a file on the data branch (`runs/<sha>/thumbs/<key>.webp`), or '' when it can: no `/`,
 * `\` or `..` (a key must stay one path segment inside its run's folder).
 * @param {string} key
 */
function keyProblem(key) {
  if (key.includes('/') || key.includes('\\')) return `key ${key} contains a path separator`;
  if (key.includes('..')) return `key ${key} contains ..`;
  return '';
}

/** Problems with a RunRecord (empty = valid). @param {unknown} rec @returns {string[]} */
export function validateRun(rec) {
  if (!isObj(rec)) return ['run record is not an object'];
  const r = /** @type {Record<string, unknown>} */ (rec);
  const problems = [];
  if (typeof r.sha !== 'string' || !SHA40.test(r.sha)) problems.push(`sha is not 40 lowercase hex: ${String(r.sha)}`);
  if (typeof r.version !== 'string' || !SEMVER.test(r.version)) problems.push(`version is not x.y.z: ${String(r.version)}`);
  if (!VERDICTS.includes(/** @type {string} */ (r.verdict))) problems.push(`verdict is not one of ${VERDICTS.join(' / ')}: ${String(r.verdict)}`);
  if (typeof r.renderer !== 'string' || !r.renderer.trim()) problems.push('renderer is empty');
  const seen = new Set();
  for (const field of ['shots', 'rigs']) {
    const list = r[field];
    if (list === undefined && field === 'rigs') continue;
    if (!Array.isArray(list)) { problems.push(`${field} is not an array`); continue; }
    list.forEach((s, i) => {
      if (!isObj(s) || typeof s.key !== 'string' || !s.key) { problems.push(`${field}[${i}] has no string key`); return; }
      const bad = keyProblem(s.key);
      if (bad) problems.push(bad);
      if (seen.has(s.key)) problems.push(`duplicate key ${s.key}`);
      seen.add(s.key);
    });
  }
  return problems;
}

/** Every shot of a run: shots then rigs. @param {RunRecord} run @returns {ShotRecord[]} */
function runShots(run) {
  return [...(Array.isArray(run.shots) ? run.shots : []), ...(Array.isArray(run.rigs) ? run.rigs : [])];
}

/**
 * Files to write for a run: `runs/<sha>/result.json` and `runs/<sha>/thumbs/<key>.webp` per thumb (raw key as the name).
 * Throws on a thumb key with `/`, `\` or `..`.
 * @param {RunRecord} rec @param {Record<string, Uint8Array>} [thumbs]
 * @returns {{ path: string, data: string | Uint8Array }[]}
 */
export function runPaths(rec, thumbs = {}) {
  /** @type {{ path: string, data: string | Uint8Array }[]} */
  const files = [{ path: `runs/${rec.sha}/result.json`, data: `${JSON.stringify(rec, null, 2)}\n` }];
  for (const [key, data] of Object.entries(thumbs)) {
    const bad = keyProblem(key);
    if (bad) throw new Error(`thumb ${bad}`);
    files.push({ path: `runs/${rec.sha}/thumbs/${key}.webp`, data });
  }
  return files;
}

/**
 * An accept record for a recorded run (A9). Version and sha come from the run, which must pass `validateRun` (a corrupt
 * record read off the branch must not produce an odd accept path or a `-`-leading git argument).
 * @param {{ run: RunRecord | null, by: string, why: string, only?: string[] | null, at: string }} o
 * @returns {AcceptRecord}
 */
export function acceptRecord({ run, by, why, only = null, at }) {
  if (!run) throw new Error('no recorded run for that sha');
  const problems = validateRun(run);
  if (problems.length) throw new Error(`recorded run is invalid: ${problems.join('; ')}`);
  if (typeof why !== 'string' || !why.trim()) throw new Error('--why is empty');
  if (typeof by !== 'string' || !by.trim()) throw new Error('--by is empty');
  if (only !== null) {
    if (!only.length) throw new Error('--only is empty');
    const keys = new Set(runShots(run).map((s) => s.key));
    for (const k of only) if (!keys.has(k)) throw new Error(`unknown key ${k}`);
  }
  return { sha: run.sha, version: run.version, by: by.trim(), why: why.trim(), at, only: only === null ? null : [...only] };
}

/** `accepted/<version>-<sha first 8>.json`. @param {AcceptRecord} a */
export function acceptPath(a) {
  return `accepted/${a.version}-${a.sha.slice(0, 8)}.json`;
}

/** @param {string} a @param {string} b ISO times; later is positive. */
function cmpAt(a, b) {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb;
  return String(a ?? '') < String(b ?? '') ? -1 : String(a ?? '') > String(b ?? '') ? 1 : 0;
}

/**
 * The baseline per shot key (A8): from the runs on the same renderer older than `version`, a key's baseline is the newest
 * run (semver; ties: accepted over green, then the later `at`) that either has an accept record covering the key
 * (source 'accepted') or is green with its sha an ancestor of master (source 'green'). Flagged / error runs qualify
 * only when accepted. Keys with no candidate are absent (the gate reports them `new`).
 * @param {Records} records
 * @param {{ isAncestor: (sha: string) => boolean, renderer: string, version: string }} o
 * @returns {Record<string, BaselinePick>}
 */
export function pickBaseline(records, { isAncestor, renderer, version }) {
  semverParts(version);
  /** @type {Map<string, AcceptRecord[]>} */
  const acceptsBySha = new Map();
  for (const a of records.accepted ?? []) {
    const list = acceptsBySha.get(a.sha) ?? [];
    list.push(a);
    acceptsBySha.set(a.sha, list);
  }
  /** @type {Record<string, BaselinePick>} */
  const out = {};
  /** @type {Record<string, RunRecord>} */
  const pickRun = {};
  for (const run of records.runs ?? []) {
    if (run.renderer !== renderer) continue;
    if (!SEMVER.test(String(run.version)) || cmpSemver(run.version, version) >= 0) continue;
    // the latest accept per run wins for its approver (accepts of one run share a path, so normally there is one)
    const accepts = [...(acceptsBySha.get(run.sha) ?? [])].sort((x, y) => cmpAt(y.at, x.at));
    /** @type {boolean | null} */
    let ancestor = null;
    for (const shot of runShots(run)) {
      const acc = accepts.find((a) => a.only === null || a.only === undefined || a.only.includes(shot.key));
      /** @type {BaselinePick | null} */
      let pick = null;
      if (acc) pick = { key: shot.key, sha: run.sha, version: run.version, source: 'accepted', approver: acc.by, shot };
      else if (run.verdict === 'green') {
        if (ancestor === null) ancestor = Boolean(isAncestor(run.sha));
        if (ancestor) pick = { key: shot.key, sha: run.sha, version: run.version, source: 'green', approver: null, shot };
      }
      if (!pick) continue;
      const cur = out[shot.key];
      const curRun = pickRun[shot.key];
      if (cur && curRun) {
        const byVersion = cmpSemver(run.version, cur.version);
        if (byVersion < 0) continue;
        if (byVersion === 0) {
          const rank = (/** @type {BaselinePick} */ p) => (p.source === 'accepted' ? 1 : 0);
          const bySource = rank(pick) - rank(cur);
          if (bySource < 0) continue;
          if (bySource === 0 && cmpAt(run.at, curRun.at) <= 0) continue;
        }
      }
      out[shot.key] = pick;
      pickRun[shot.key] = run;
    }
  }
  return out;
}

/**
 * CLI arguments: `list`, `show <sha>`, `accept --sha <sha> --by <name> --why <text> [--only k,k] [--dry-run] [--replace]`;
 * anything else is 'help'. A flag value starting with `--` is refused ('help'), so `--why --dry-run` is not a why.
 * `--replace` lets `accept` overwrite an earlier accept of the same run (refused without it).
 * @param {string[]} argv
 * @returns {{ cmd: 'list' | 'show' | 'accept' | 'help', sha: string | null, by: string | null, why: string | null, only: string[] | null, dryRun: boolean, replace: boolean }}
 */
export function parseArgs(argv) {
  /** @type {{ cmd: 'list' | 'show' | 'accept' | 'help', sha: string | null, by: string | null, why: string | null, only: string[] | null, dryRun: boolean, replace: boolean }} */
  const out = { cmd: 'help', sha: null, by: null, why: null, only: null, dryRun: false, replace: false };
  const help = () => ({ ...out, cmd: /** @type {'help'} */ ('help') });
  const [cmd, ...rest] = argv;
  if (cmd === 'list') return rest.length ? help() : { ...out, cmd: 'list' };
  if (cmd === 'show') {
    if (rest.length !== 1 || !rest[0] || rest[0].startsWith('--')) return help();
    return { ...out, cmd: 'show', sha: rest[0] };
  }
  if (cmd !== 'accept') return help();
  const res = { ...out, cmd: /** @type {'accept'} */ ('accept') };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--dry-run') { res.dryRun = true; continue; }
    if (a === '--replace') { res.replace = true; continue; }
    if (a !== '--sha' && a !== '--by' && a !== '--why' && a !== '--only') return help();
    const v = rest[i + 1];
    if (v === undefined || v.startsWith('--')) return help();
    i++;
    if (a === '--sha') res.sha = v;
    else if (a === '--by') res.by = v;
    else if (a === '--why') res.why = v;
    else res.only = v.split(',').map((k) => k.trim()).filter(Boolean);
  }
  return res;
}
