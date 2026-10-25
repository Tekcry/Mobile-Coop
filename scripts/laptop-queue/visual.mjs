/**
 * @typedef {{ v: 1, verdict: 'clean' | 'flagged' | 'error', sha: string | null, version: string, train: number | null,
 *   renderer: string, shots: number, flags: number, known: number, parity: number, newKeys: number, warnings: number,
 *   errors: number, base: { version: string, approver: string | null } | null, wallS: number, reason: string | null,
 *   top: string[], recorded: boolean, thumbs: string[] }} VisualSummary
 */
/** @typedef {{ state: 'success' | 'failure' | 'error', description: string }} StatusPost */
/** @typedef {{ run: false, status: StatusPost | null } | { run: true, port: string, release: string[] }} VisualPlan */
/** @typedef {{ state: 'success' | 'failure' | 'error', description: string, summary: VisualSummary | null, block: string | null }} VisualVerdict */

// Laptop queue: the visual-gate post-step after a green train (visual-gate job, VG6; docs/laptop-queue/visual-gate.md).
// Pure: no node: imports, no fs, git or gh. service.mjs runVisual does the I/O. The suite (scripts/e2e-visual.mjs, VG5)
// prints one block between `VISUAL-GATE BEGIN` / `VISUAL-GATE END`, line 2 `<!-- visual-gate-summary <json> -->`.
import { capTail } from './lib.mjs';

export const VISUAL_CONTEXT = 'visual-gate';
export const VISUAL_SUITE = 'e2e-visual';
/** run-e2e's own suite kill (E2E_SUITE_TIMEOUT). */
export const VISUAL_TIMEOUT_S = 300;
/** The service's shell cap: the suite kill plus the server start and teardown. */
export const VISUAL_SH_TIMEOUT_MS = 360_000;
/** The block body in the PR comment is cut to its last BLOCK_CAP chars (lib capTail). */
export const BLOCK_CAP = 8000;
export const THUMB_BASE = 'https://github.com/Tekcry/Mobile-Coop/blob/visual-baselines';

const DESC_MAX = 140; // GitHub rejects a status description over 140 chars (as service finish)
const BEGIN = 'VISUAL-GATE BEGIN';
const END = 'VISUAL-GATE END';
const VERDICTS = ['clean', 'flagged', 'error'];

/** @param {string} s */
const cut = (s) => (s.length > DESC_MAX ? `${s.slice(0, DESC_MAX - 3)}...` : s);

/**
 * Whether and where the post-step runs. First match: disabled (LQ_VISUAL=0), no scripts/e2e-visual.mjs at the head,
 * train not green (A19) -> nothing; the desktop lane (A20) -> the skipped error status; else run on ports[0] after
 * releasing the other slots.
 * @param {{ enabled: boolean, desktop: boolean, hasScript: boolean, trainOk: boolean, ports: string[] }} o
 * @returns {VisualPlan}
 */
export function visualPlan({ enabled, desktop, hasScript, trainOk, ports }) {
  if (!enabled || !hasScript || !trainOk) return { run: false, status: null };
  if (desktop) return { run: false, status: { state: 'error', description: 'skipped: desktop lane (laptop GPU only)' } };
  return { run: true, port: String(ports[0]), release: ports.slice(1) };
}

/**
 * The extra env for the e2e-visual run (on top of service e2e's E2E_PORT / E2E_JOBS / E2E_GPU).
 * @param {{ n: number | string, sha: string }} train
 * @returns {Record<string, string>}
 */
export function visualEnv({ n, sha }) {
  return { E2E_SUITE_TIMEOUT: String(VISUAL_TIMEOUT_S), VG_RECORD: '1', VG_TRAIN: String(n), VG_SHA: sha, VG_BRANCH: `train/${n}` };
}

/**
 * The last block in a log (CRLF normalised): the last BEGIN line through the next END line, both included; null when
 * there is none or the last BEGIN has no END.
 * @param {string} text
 * @returns {string | null}
 */
export function extractBlock(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  let begin = -1;
  for (let i = lines.length - 1; i >= 0; i--) if (lines[i].trim() === BEGIN) { begin = i; break; }
  if (begin < 0) return null;
  for (let i = begin + 1; i < lines.length; i++) if (lines[i].trim() === END) return lines.slice(begin, i + 1).join('\n');
  return null;
}

/**
 * The block's machine line as a VisualSummary; null unless v is 1 and verdict one of clean / flagged / error.
 * @param {string | null} block
 * @returns {VisualSummary | null}
 */
export function parseSummary(block) {
  if (!block) return null;
  for (const line of block.split('\n')) {
    const m = /^<!-- visual-gate-summary (\{.*\}) -->$/.exec(line.trim());
    if (!m) continue;
    try {
      const s = JSON.parse(m[1]);
      return s && s.v === 1 && VERDICTS.includes(s.verdict) ? s : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * The visual-gate status from the run's log text and exit code. Descriptions are at most 140 chars.
 * @param {string} text
 * @param {{ code?: number, timedOut?: boolean }} [o]
 * @returns {VisualVerdict}
 */
export function visualVerdict(text, { code = 0, timedOut = false } = {}) {
  const block = extractBlock(text);
  /** @type {(state: VisualVerdict['state'], d: string, summary?: VisualSummary | null) => VisualVerdict} */
  const out = (state, d, summary = null) => ({ state, description: cut(d), summary, block });
  if (!block) {
    const killed = timedOut || code === 124 || /^KILLED: e2e-visual ran past/m.test(String(text ?? '').replace(/\r\n?/g, '\n'));
    return out('error', killed ? `over ${VISUAL_TIMEOUT_S} s (killed), no result` : `no result (exit ${code})`);
  }
  const s = parseSummary(block);
  if (!s) return out('error', 'unreadable result block');
  if (s.verdict === 'clean') {
    if (code !== 0) return out('error', `exit ${code} with a clean block`, s);
    let d = `clean: ${s.shots} shots vs ${s.base?.version ?? 'no baseline'}, ${s.wallS} s`;
    if (s.known > 0) d += `; ${s.known} known`;
    if (s.warnings > 0) d += `; ${s.warnings} warn`;
    return out('success', d, s);
  }
  if (s.verdict === 'flagged') {
    const n = (s.flags || 0) + (s.parity || 0);
    const top = Array.isArray(s.top) ? s.top : [];
    let d = `${n} ${n === 1 ? 'flag' : 'flags'}`;
    if (top.length) d += `: ${top.join(', ')}`;
    if (s.base) d += ` vs ${s.base.version}`;
    return out('failure', d, s);
  }
  return out('error', `error: ${s.reason || 'unknown'}`, s);
}

/**
 * A thumb on the data branch; the key is URL-encoded (`@` -> `%40`, C0 P17).
 * @param {string} sha
 * @param {string} key
 */
export function thumbUrl(sha, key) {
  return `${THUMB_BASE}/runs/${sha}/thumbs/${encodeURIComponent(key)}.webp`;
}

/**
 * The PR comment for a flagged run (null otherwise: an error lives in the status only).
 * @param {VisualVerdict} v
 * @param {{ sha: string, n: number | string }} train
 * @returns {string | null}
 */
export function visualComment(v, { sha, n }) {
  if (!v || v.state !== 'failure') return null;
  const body = (v.block ?? '').split('\n').filter((l) => l.trim() !== BEGIN && l.trim() !== END).join('\n');
  const parts = [`visual-gate flagged train ${n} (${sha.slice(0, 8)}): ${v.description}`, '', capTail(body, BLOCK_CAP)];
  const thumbs = v.summary?.thumbs ?? [];
  if (thumbs.length) {
    parts.push('', 'Thumbs (now | baseline):');
    for (const key of thumbs) {
      if (key.endsWith('.base')) continue;
      const base = thumbs.includes(`${key}.base`) ? ` | [baseline](${thumbUrl(sha, `${key}.base`)})` : '';
      parts.push(`- \`${key}\`: [now](${thumbUrl(sha, key)})${base}`);
    }
  }
  parts.push('', `Accept a deliberate look change: \`node scripts/visual-gate/baseline.mjs accept --sha ${sha} --by <name> --why <text> [--only k,k]\` (A9)`);
  return parts.join('\n');
}
