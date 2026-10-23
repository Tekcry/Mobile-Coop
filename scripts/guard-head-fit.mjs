#!/usr/bin/env node
/**
 * guard-render S3a: fits movement tables of `src/ai/guardHead.ts` from a sweep written by
 * `tests/guardHeadSweep.test.ts` (one TSV line per sampled frame). Prints the arrays to paste, and the worst residual
 * per case. Values are in units of `height / 1.75`, 1 mm rounding.
 *
 *   GUARD_HEAD_SWEEP=1 GUARD_HEAD_SETTLE=2.5 GUARD_HEAD_LEN=2 GUARD_HEAD_OUT=wall.tsv npx vitest run tests/guardHeadSweep.test.ts
 *   node scripts/guard-head-fit.mjs wall wall.tsv
 *
 * Mode `wall`: `WALL_MOVE` (lean 0) and `WALL_LEAN_MOVE` (the lean away from the wall side) over the direction relative
 * to the wall side (`WALL_TH`) and the speed (`WALL_SP`): the rig head minus the sim's still stance (speed 0), mean up per
 * (theta, speed), mean forward and side per |theta| (side times the wall side), and for the lean the stride's first
 * harmonic on the gait clock signed by the side of travel (`bobC` / `bobS`, up per (theta, speed)).
 */
import { readFileSync } from 'node:fs';

const [mode, file] = process.argv.slice(2);
if (mode !== 'wall' || !file) {
  console.error('usage: node scripts/guard-head-fit.mjs wall <sweep.tsv>');
  process.exit(1);
}
const defs = JSON.parse(readFileSync(new URL('../src/config/enemies.json', import.meta.url), 'utf8'));
const K = (kind) => defs[kind].height / 1.75;

const [hdr, ...lines] = readFileSync(file, 'utf8').trim().split('\n');
const cols = hdr.split('\t');
const rows = lines.map((l) => {
  const v = l.split('\t');
  const o = {};
  cols.forEach((c, i) => (o[c] = Number.isNaN(Number(v[i])) ? v[i] : Number(v[i])));
  return o;
});

/** Least squares by the normal equations (small systems). */
function lsq(X, Y) {
  const n = X[0].length;
  const A = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  for (let r = 0; r < X.length; r++)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) A[i][j] += X[r][i] * X[r][j];
      A[i][n] += X[r][i] * Y[r];
    }
  for (let i = 0; i < n; i++) A[i][i] += 1e-9;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[p][i])) p = j;
    [A[i], A[p]] = [A[p], A[i]];
    for (let j = i + 1; j < n; j++) {
      const f = A[j][i] / A[i][i];
      for (let k = i; k <= n; k++) A[j][k] -= f * A[i][k];
    }
  }
  const b = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = A[i][n];
    for (let j = i + 1; j < n; j++) s -= A[i][j] * b[j];
    b[i] = s / A[i][i];
  }
  return b;
}

const r3 = (v) => {
  const x = Math.round(v * 1000) / 1000;
  return (Object.is(x, -0) ? 0 : x).toString().replace(/^(-?)0\./, '$1.');
};
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

const WALL_TH = [-180, -150, -120, -90, -70, -50, -30, 0, 30, 50, 70, 90, 120, 150, 180];
const WALL_THA = [0, 30, 50, 70, 90, 120, 150, 180];
const WALL_SP = [0.3, 0.6, 0.9, 1.3];

// case id: `wall ws <ws> peek <peek> dir <deg> sp <sp>`; thr = deg * ws
const groups = new Map();
for (const r of rows) {
  const m = /^wall ws (-?\d+) peek (-?\d+) dir (-?\d+) sp ([\d.]+)$/.exec(r.case);
  if (!m) continue;
  const ws = Number(m[1]);
  const lean = Number(m[2]) !== 0;
  const thr = Number(m[3]) * ws;
  const sp = Number(m[4]);
  const key = `${lean ? 1 : 0} ${thr} ${sp}`;
  if (!groups.has(key)) groups.set(key, { lean, thr, sp, rows: [] });
  groups.get(key).rows.push(r);
}

for (const lean of [false, true]) {
  const up = [];
  const bobC = [];
  const bobS = [];
  const fwAbs = new Map();
  const sxAbs = new Map();
  const worst = [];
  for (const thr of WALL_TH)
    for (const sp of WALL_SP) {
      const g = groups.get(`${lean ? 1 : 0} ${thr} ${sp}`);
      if (!g) throw new Error(`missing case lean ${lean} thr ${thr} sp ${sp}`);
      const X = [];
      const Y = [];
      for (const r of g.rows) {
        const k = K(r.kind);
        const side = r.mx > 0 ? 1 : r.mx < 0 ? -1 : 0;
        const a = 2 * Math.PI * r.phase;
        X.push(lean ? [1, side * Math.cos(a), side * Math.sin(a)] : [1]);
        Y.push((r.ru - r.bu) / k);
        const at = Math.abs(thr);
        if (!fwAbs.has(at)) {
          fwAbs.set(at, []);
          sxAbs.set(at, []);
        }
        fwAbs.get(at).push((r.rf - r.bf) / k);
        sxAbs.get(at).push((r.rs - r.bs) / (k * r.ws));
      }
      const b = lsq(X, Y);
      up.push(b[0]);
      bobC.push(b[1] ?? 0);
      bobS.push(b[2] ?? 0);
      let mx = 0;
      for (let i = 0; i < X.length; i++) mx = Math.max(mx, Math.abs(Y[i] - X[i].reduce((s, v, j) => s + v * b[j], 0)));
      worst.push(`${thr}/${sp}: ${mx.toFixed(3)}`);
    }
  const name = lean ? 'WALL_LEAN_MOVE' : 'WALL_MOVE';
  const grid = (a) => WALL_TH.map((_, i) => `    ${a.slice(i * 4, i * 4 + 4).map(r3).join(', ')},`).join('\n');
  console.log(`// ${name}: fitted by scripts/guard-head-fit.mjs wall`);
  console.log(`  up: [\n${grid(up)}\n  ],`);
  if (lean) {
    console.log(`  bobC: [\n${grid(bobC)}\n  ],`);
    console.log(`  bobS: [\n${grid(bobS)}\n  ],`);
  }
  console.log(`  fw: [${WALL_THA.map((t) => r3(mean(fwAbs.get(t)))).join(', ')}],`);
  console.log(`  sx: [${WALL_THA.map((t) => r3(mean(sxAbs.get(t)))).join(', ')}],`);
  console.log(`// worst up residual per theta/speed (units of height / 1.75): ${worst.join('  ')}\n`);
}
