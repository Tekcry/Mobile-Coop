#!/usr/bin/env node
/**
 * guard-render S3a: fits movement tables of `src/ai/guardHead.ts` from a sweep written by
 * `tests/guardHeadSweep.test.ts` (one TSV line per sampled frame). Prints the arrays to paste, and the worst residual
 * per case. Values are in units of `height / 1.75`, 1 mm rounding.
 *
 *   GUARD_HEAD_SWEEP=1 GUARD_HEAD_SETTLE=2.5 GUARD_HEAD_LEN=2 GUARD_HEAD_OUT=wall.tsv npx vitest run tests/guardHeadSweep.test.ts
 *   node scripts/guard-head-fit.mjs wall wall.tsv
 *   for i in 0 1 2 3 4 5 6 7; do GUARD_HEAD_SWEEP=1 GUARD_HEAD_CASES=free GUARD_HEAD_EVERY=3 GUARD_HEAD_PART=$i/8 \
 *     GUARD_HEAD_OUT=free-$i.tsv npx vitest run tests/guardHeadSweep.test.ts; done
 *   node scripts/guard-head-fit.mjs free free-*.tsv --write
 *   GUARD_HEAD_SWEEP=1 GUARD_HEAD_CASES=hostage GUARD_HEAD_LEN=3 GUARD_HEAD_OUT=hostage.tsv npx vitest run tests/guardHeadSweep.test.ts
 *   node scripts/guard-head-fit.mjs hostage hostage.tsv --write
 *
 * `--write` replaces the generated block in `src/ai/guardHead.ts` (between its `<guard-head-fit MODE>` markers)
 * instead of printing it (modes `free` and `hostage`; the wall tables are pasted by hand). The worst and the 95th
 * percentile residual per case group go to stderr.
 *
 * Mode `wall`: `WALL_MOVE` (lean 0) and `WALL_LEAN_MOVE` (the lean away from the wall side) over the direction relative
 * to the wall side (`WALL_TH`) and the speed (`WALL_SP`): the rig head minus the sim's still stance (speed 0), mean up per
 * (theta, speed), mean forward and side per |theta| (side times the wall side), and for the lean the stride's first
 * harmonic on the gait clock signed by the side of travel (`bobC` / `bobS`, up per (theta, speed)).
 *
 * Mode `free` (S3a fix 2): every `MOVE` class at once (AF0 / AF1 / AV0 / AV1 / DF / DV / NF0 / NF1 / NV0 / NV1), one
 * least-squares system per axis: each sampled frame of the free sweep (motion state 'move') is a row with the class
 * weights `guardHead` blends (the stride class, the dash share, crouch) and its bilinear knot weights, against the rig head
 * minus the sim's still stance. Up: the (theta, speed) table, the bob on the gait clock at the class's fixed phase, the
 * aim per theta and the pitch; forward likewise without the bob; side: constant, aim, pitch. A term the class's data
 * cannot carry (one aim, one pitch) is left out (null / 0); the bob is null where it stays under 5 mm. Neighbouring knots
 * are tied by a weak first-difference term (`SMOOTH`), so a knot no frame reaches takes its neighbours' value.
 *
 * Mode `hostage` (S3a fix 2): `HELD_MOVE`, the walked hostage's head (the rig's own gait under the held pose) relative to
 * the held still pose: up and forward per (theta, speed), the facing stride armed / unarmed and the velocity stride.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [mode, ...rest] = process.argv.slice(2);
const WRITE = rest.includes('--write');
const files = rest.filter((a) => a !== '--write');
if (!['wall', 'free', 'hostage'].includes(mode) || files.length === 0) {
  console.error('usage: node scripts/guard-head-fit.mjs wall|free|hostage <sweep.tsv> [more.tsv ...] [--write]');
  process.exit(1);
}
const defs = JSON.parse(readFileSync(new URL('../src/config/enemies.json', import.meta.url), 'utf8'));
const K = (kind) => defs[kind].height / 1.75;

// one or more sweep files (the free sweep runs in parts), the same header each
let hdr = '';
const lines = [];
for (const f of files) {
  const [h, ...ls] = readFileSync(f, 'utf8').trim().split(/\r?\n/);
  hdr = h;
  for (const l of ls) lines.push(l);
}
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

function fitWall() {
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
}

// ---- free movement (`MOVE`) and the walked hostage (`HELD_MOVE`): one least-squares system per axis over every class,
// each sampled frame a row with the class weights and the bilinear knot weights `guardHead` uses (a copy of its lookup)

const TH_F = [0, 30, 50];
const TH_V = [0, 30, 50, 70, 90, 120, 150, 180];
const TH_VN = [70, 90, 120, 150, 180];
const SP_W = [0.15, 0.4, 0.7, 1, 1.4, 1.8, 2.2, 2.8, 3.4, 4.2];
const SP_C = [0.15, 0.4, 0.7, 1, 1.4];
const SP_D = [1.6, 2.2, 2.8, 3.4];
const SP_H = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1.2, 1.6];
/** (S3a fix 3) `HELD_MOVE`'s theta knots: the facing stride up to the boundary, the velocity stride from it. */
const TH_HF = [0, 30, 45, 50, 55, 59];
const TH_HV = [61, 75, 90, 120, 150, 180];
/** The bob's phase on the gait clock per stride (cycles; `MoveTable.ph`). */
const PH_F = -0.05;
const PH_V = 0.21;
const ROOT_DIP = 0.05;
/** Smoothness between neighbouring knots (first differences, in frame rows): an unreached knot takes its neighbours'. */
const SMOOTH = 1;

/** `guardHead`'s `knots` + `cell` weights: [index, weight] pairs into a (theta, speed) table, and the theta-row pairs. */
function knotW(th, sp, t, s, ramp) {
  const nt = th.length;
  const tc = Math.min(Math.max(t, th[0]), th[nt - 1]);
  let i = 0;
  while (i < nt - 2 && tc > th[i + 1]) i++;
  const tf = (tc - th[i]) / (th[i + 1] - th[i]);
  const ns = sp.length;
  let j0;
  let j1;
  let sf;
  let z = 1;
  if (s <= sp[0]) {
    j0 = j1 = 0;
    sf = 0;
    z = ramp ? (s > 0 ? s / sp[0] : 0) : 1;
  } else if (s >= sp[ns - 1]) {
    j0 = j1 = ns - 1;
    sf = 0;
  } else {
    let j = 0;
    while (s > sp[j + 1]) j++;
    j0 = j;
    j1 = j + 1;
    sf = (s - sp[j]) / (sp[j + 1] - sp[j]);
  }
  const cells = [
    [i * ns + j0, (1 - tf) * (1 - sf) * z],
    [i * ns + j1, (1 - tf) * sf * z],
    [(i + 1) * ns + j0, tf * (1 - sf) * z],
    [(i + 1) * ns + j1, tf * sf * z],
  ];
  return { cells, rows: [[i, 1 - tf], [i + 1, tf]] };
}

/** A sparse least-squares system: rows of [index, value] pairs, normal equations, first-difference smoothing. */
class Sys {
  constructor() {
    this.n = 0;
    this.smooth = [];
  }
  block(len) {
    const at = this.n;
    this.n += len;
    return at;
  }
  /** Smoothness pairs along the speed and the theta of a (theta, speed) block. */
  grid(at, nt, ns) {
    for (let i = 0; i < nt; i++)
      for (let j = 0; j < ns; j++) {
        if (j + 1 < ns) this.smooth.push([at + i * ns + j, at + i * ns + j + 1]);
        if (i + 1 < nt) this.smooth.push([at + i * ns + j, at + (i + 1) * ns + j]);
      }
  }
  line(at, nt) {
    for (let i = 0; i + 1 < nt; i++) this.smooth.push([at + i, at + i + 1]);
  }
  start() {
    const n = this.n;
    this.A = new Float64Array(n * n);
    this.b = new Float64Array(n);
  }
  add(row, y) {
    const A = this.A;
    const n = this.n;
    for (const [i, vi] of row) {
      if (vi === 0) continue;
      this.b[i] += vi * y;
      for (const [j, vj] of row) A[i * n + j] += vi * vj;
    }
  }
  solve() {
    const n = this.n;
    const A = this.A;
    for (const [i, j] of this.smooth) {
      A[i * n + i] += SMOOTH;
      A[j * n + j] += SMOOTH;
      A[i * n + j] -= SMOOTH;
      A[j * n + i] -= SMOOTH;
    }
    for (let i = 0; i < n; i++) A[i * n + i] += 1e-6;
    // Cholesky (A is symmetric positive definite)
    const L = new Float64Array(n * n);
    for (let i = 0; i < n; i++)
      for (let j = 0; j <= i; j++) {
        let v = A[i * n + j];
        for (let k = 0; k < j; k++) v -= L[i * n + k] * L[j * n + k];
        L[i * n + j] = i === j ? Math.sqrt(v) : v / L[j * n + j];
      }
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let v = this.b[i];
      for (let k = 0; k < i; k++) v -= L[i * n + k] * y[k];
      y[i] = v / L[i * n + i];
    }
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let v = y[i];
      for (let k = i + 1; k < n; k++) v -= L[k * n + i] * x[k];
      x[i] = v / L[i * n + i];
    }
    return x;
  }
}

/** The sweep's frames of the cases matching `re`, with the kind's scale and constants. */
function framesOf(re) {
  const out = [];
  for (const r of rows) {
    if (!re.test(r.case)) continue;
    const d = defs[r.kind];
    out.push({ ...r, k: K(r.kind), armed: d.gun !== null && d.gun !== undefined, dashFrom: !d.melee && d.runSpeed > 0 ? d.runSpeed * 0.8 : Infinity });
  }
  return out;
}

/** `guardHead`'s direction of travel: theta (deg, of |side|), the forward part and the sign of the side. */
function dirOf(r) {
  const mx = r.mx;
  const mz = mx === 0 && r.mz === 0 ? r.speed : r.mz;
  return { mz, side: mx > 0 ? 1 : mx < 0 ? -1 : 0, th: r.speed > 0 ? (Math.atan2(Math.abs(mx), mz) * 180) / Math.PI : 0 };
}

/** `guardHead`'s `dashShare`. */
function dashShare(sp, dashFrom, ph) {
  if (dashFrom === Infinity) return 0;
  const pace = sp / (1 - ROOT_DIP * Math.cos(4 * Math.PI * ph));
  const q = (1 - dashFrom / pace) / ROOT_DIP;
  return q >= 1 ? 1 : q <= -1 ? 0 : 1 - Math.acos(q) / Math.PI;
}

const fmtRows = (a, ns, ind) => {
  const out = [];
  for (let i = 0; i < a.length; i += ns) out.push(`${ind}${a.slice(i, i + ns).map(r3).join(', ')},`);
  return out.join('\n');
};
const arr = (a) => `[${a.map(r3).join(', ')}]`;
const dot = (row, x) => row.reduce((v, [i, w]) => v + x[i] * w, 0);

/** Replace the block between `// <guard-head-fit TAG>` and `// </guard-head-fit TAG>` in guardHead.ts, or print it. */
function emit(tag, text) {
  if (!WRITE) {
    console.log(text);
    return;
  }
  const url = new URL('../src/ai/guardHead.ts', import.meta.url);
  const src = readFileSync(url, 'utf8');
  const a = `// <guard-head-fit ${tag}>`;
  const b = `// </guard-head-fit ${tag}>`;
  const i = src.indexOf(a);
  const j = src.indexOf(b);
  if (i < 0 || j < 0) throw new Error(`markers ${a} / ${b} not found in src/ai/guardHead.ts`);
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  writeFileSync(url, src.slice(0, i + a.length) + eol + text.replace(/\n/g, eol) + eol + src.slice(j));
  console.log(`wrote <guard-head-fit ${tag}> in src/ai/guardHead.ts`);
}

/** Prints the worst and the 95th-percentile residual (m, 3D) per case group (to stderr). */
function report(fr, pred, label) {
  const g = new Map();
  for (let i = 0; i < fr.length; i++) {
    const r = fr[i];
    const [ps, pu, pf] = pred[i];
    const e = Math.hypot(r.rs - r.bs - ps * r.k, r.ru - r.bu - pu * r.k, r.rf - r.bf - pf * r.k);
    const key = label(r);
    if (!g.has(key)) g.set(key, []);
    g.get(key).push(e);
  }
  const lines = [];
  for (const [key, es] of [...g].sort()) {
    es.sort((x, y) => x - y);
    lines.push(`  ${key.padEnd(40)} worst ${es[es.length - 1].toFixed(3)} p95 ${es[Math.floor(es.length * 0.95)].toFixed(3)} n ${es.length}`);
  }
  console.error(`residuals (m):\n${lines.join('\n')}`);
}

function fitFree() {
  const fr = framesOf(/^free /).filter((r) => r.state === 'move' && r.speed > 0);
  const CL = {
    AF0: { th: TH_F, sp: SP_W, ph: PH_F, doc: 'armed, weapon low (aim < 0.5), stride along the facing (|theta| < 60 deg), standing.' },
    AF1: { th: TH_F, sp: SP_C, ph: PH_F, doc: 'armed, weapon low, stride along the facing, crouched.' },
    AV0: { th: TH_V, sp: SP_W, ph: PH_V, doc: 'armed, stride along the velocity (aim >= 0.5, or the weapon low going sideways / back), standing.' },
    AV1: { th: TH_V, sp: SP_C, ph: PH_V, doc: 'armed, stride along the velocity, crouched.' },
    DF: { th: TH_F, sp: SP_D, ph: PH_F, doc: 'armed, weapon low, the dash (faster than `dashFrom`), stride along the facing, standing.' },
    DV: { th: TH_V, sp: SP_D, ph: PH_V, doc: 'armed, weapon low, the dash, stride along the velocity, standing.' },
    NF0: { th: TH_F, sp: SP_W, ph: PH_F, doc: 'unarmed (melee), stride along the facing, standing.' },
    NF1: { th: TH_F, sp: SP_C, ph: PH_F, doc: 'unarmed, stride along the facing, crouched.' },
    NV0: { th: TH_VN, sp: SP_W, ph: PH_V, doc: 'unarmed, stride along the velocity, standing.' },
    NV1: { th: TH_VN, sp: SP_C, ph: PH_V, doc: 'unarmed, stride along the velocity, crouched.' },
  };
  // per frame: the classes and weights `guardHead` blends
  const parts = fr.map((r) => {
    const c = Math.min(1, Math.max(0, r.crouch));
    const a = r.aim;
    const p = Math.max(-0.5, Math.min(0.5, r.pitch));
    const { mz, side, th } = dirOf(r);
    const facing = a < 0.5 && mz > 0.5 * r.speed;
    const dw = r.armed && a < 0.5 ? dashShare(r.speed, r.dashFrom, r.phase) : 0;
    const t0 = r.armed ? (facing ? 'AF0' : 'AV0') : facing ? 'NF0' : 'NV0';
    const t1 = r.armed ? (facing ? 'AF1' : 'AV1') : facing ? 'NF1' : 'NV1';
    const ws = [];
    if (c < 1) {
      if ((1 - c) * (1 - dw) > 0) ws.push([t0, (1 - c) * (1 - dw)]);
      if (dw > 0) ws.push([facing ? 'DF' : 'DV', (1 - c) * dw]);
    }
    if (c > 0) ws.push([t1, c]);
    return { r, a, p, side, th, ws };
  });
  // which optional terms the data can carry (the class has more than one aim / pitch)
  const seen = {};
  for (const n of Object.keys(CL)) seen[n] = { aims: new Set(), pitches: new Set() };
  for (const q of parts)
    for (const [n, w] of q.ws)
      if (w > 0.5) {
        seen[n].aims.add(q.a.toFixed(2));
        seen[n].pitches.add(q.p.toFixed(2));
      }
  const U = new Sys();
  const F = new Sys();
  const S = new Sys();
  const ix = {};
  for (const [n, t] of Object.entries(CL)) {
    const nt = t.th.length;
    const ns = t.sp.length;
    const hasAim = seen[n].aims.size > 1;
    const hasPitch = seen[n].pitches.size > 1;
    const o = { nt, ns, hasAim, hasPitch };
    o.up = U.block(nt * ns);
    U.grid(o.up, nt, ns);
    o.bob = U.block(nt * ns);
    U.grid(o.bob, nt, ns);
    o.fw = F.block(nt * ns);
    F.grid(o.fw, nt, ns);
    if (hasAim) {
      o.aimUp = U.block(nt);
      U.line(o.aimUp, nt);
      o.aimFw = F.block(nt);
      F.line(o.aimFw, nt);
    }
    if (hasPitch) {
      o.pu = U.block(2);
      o.pf = F.block(2);
    }
    o.sx = S.block(1 + (hasAim ? 1 : 0) + (hasPitch ? 2 : 0));
    ix[n] = o;
  }
  U.start();
  F.start();
  S.start();
  const rowsU = [];
  const rowsF = [];
  const rowsS = [];
  for (const q of parts) {
    const ru = [];
    const rf = [];
    const rs = [];
    for (const [n, w] of q.ws) {
      const t = CL[n];
      const o = ix[n];
      const kw = knotW(t.th, t.sp, q.th, q.r.speed, t.sp !== SP_D);
      const bob = q.side !== 0 ? q.side * Math.cos(2 * Math.PI * (q.r.phase - t.ph)) : 0;
      for (const [ci, cw] of kw.cells) {
        ru.push([o.up + ci, w * cw]);
        rf.push([o.fw + ci, w * cw]);
        if (bob !== 0) ru.push([o.bob + ci, w * cw * bob]);
      }
      if (o.hasAim)
        for (const [ti, tw] of kw.rows) {
          ru.push([o.aimUp + ti, w * tw * q.a]);
          rf.push([o.aimFw + ti, w * tw * q.a]);
        }
      if (o.hasPitch) {
        ru.push([o.pu, w * q.p], [o.pu + 1, w * q.p * q.p]);
        rf.push([o.pf, w * q.p], [o.pf + 1, w * q.p * q.p]);
      }
      let si = o.sx;
      rs.push([si++, w]);
      if (o.hasAim) rs.push([si++, w * q.a]);
      if (o.hasPitch) rs.push([si++, w * q.p], [si++, w * q.p * q.p]);
    }
    const r = q.r;
    U.add(ru, (r.ru - r.bu) / r.k);
    F.add(rf, (r.rf - r.bf) / r.k);
    S.add(rs, (r.rs - r.bs) / r.k);
    rowsU.push(ru);
    rowsF.push(rf);
    rowsS.push(rs);
  }
  const xu = U.solve();
  const xf = F.solve();
  const xs = S.solve();
  // round as written, then report on the rounded values
  for (const x of [xu, xf, xs]) for (let i = 0; i < x.length; i++) x[i] = Math.round(x[i] * 1000) / 1000;
  report(
    fr,
    parts.map((_, i) => [dot(rowsS[i], xs), dot(rowsU[i], xu), dot(rowsF[i], xf)]),
    (r) => `${r.case.replace(/ sp [\d.]+/, '').replace(/ dir -?\d+/, '')} ${r.kind}`,
  );
  const out = ['const MOVE: Record<MoveClass, MoveTable> = {'];
  const name = (a) => (a === TH_F ? 'TH_F' : a === TH_V ? 'TH_V' : a === TH_VN ? 'TH_VN' : a === SP_W ? 'SP_W' : a === SP_C ? 'SP_C' : 'SP_D');
  for (const [n, t] of Object.entries(CL)) {
    const o = ix[n];
    const len = o.nt * o.ns;
    const up = [...xu.slice(o.up, o.up + len)];
    const bob = [...xu.slice(o.bob, o.bob + len)];
    const fw = [...xf.slice(o.fw, o.fw + len)];
    // the bob only where it is 5 mm or more somewhere in the class
    const bobOn = bob.some((v) => Math.abs(v) >= 0.005);
    let si = o.sx;
    const sx = [xs[si++], o.hasAim ? xs[si++] : 0, o.hasPitch ? xs[si++] : 0, o.hasPitch ? xs[si++] : 0];
    out.push(`  /** ${t.doc} */`);
    out.push(`  ${n}: {`);
    out.push(`    th: ${name(t.th)},`);
    out.push(`    sp: ${name(t.sp)},`);
    out.push(`    up: [\n${fmtRows(up, o.ns, '      ')}\n    ],`);
    out.push(`    fw: [\n${fmtRows(fw, o.ns, '      ')}\n    ],`);
    out.push(bobOn ? `    bob: [\n${fmtRows(bob, o.ns, '      ')}\n    ],` : '    bob: null,');
    out.push(o.hasAim ? `    aimUp: ${arr([...xu.slice(o.aimUp, o.aimUp + o.nt)])},` : '    aimUp: null,');
    out.push(o.hasAim ? `    aimFw: ${arr([...xf.slice(o.aimFw, o.aimFw + o.nt)])},` : '    aimFw: null,');
    out.push(`    pitch: ${arr(o.hasPitch ? [xu[o.pu], xu[o.pu + 1], xf[o.pf], xf[o.pf + 1]] : [0, 0, 0, 0])},`);
    out.push(`    sx: ${arr(sx)},`);
    out.push(`    ph: ${t.ph},`);
    out.push('  },');
  }
  out.push('};');
  emit('free', out.join('\n'));
}

function fitHostage() {
  // the walked hostage: the rig's own gait under the held pose (`rp.phase` -1) on top of the held still pose; no aim,
  // no bob (the rig's gait clock is its own), standing (the sweep's crouch 0)
  const fr = framesOf(/^hostage /).filter((r) => r.speed > 0);
  const CL = {
    AF: { th: TH_HF, doc: 'armed, stride along the facing' },
    NF: { th: TH_HF, doc: 'unarmed, stride along the facing' },
    V: { th: TH_HV, doc: 'stride along the velocity (armed or not)' },
  };
  const U = new Sys();
  const F = new Sys();
  const ix = {};
  const ns = SP_H.length;
  for (const [n, t] of Object.entries(CL)) {
    const nt = t.th.length;
    ix[n] = { nt, up: U.block(nt * ns), fw: F.block(nt * ns) };
    U.grid(ix[n].up, nt, ns);
    F.grid(ix[n].fw, nt, ns);
  }
  U.start();
  F.start();
  const rowsU = [];
  const rowsF = [];
  for (const r of fr) {
    const { mz, th } = dirOf(r);
    // `guardHead`'s `heldFacing` (the rig's own test, bit for bit)
    const n = r.speed > 0.01 && mz * (1 / r.speed) > 0.5 ? (r.armed ? 'AF' : 'NF') : 'V';
    const kw = knotW(CL[n].th, SP_H, th, r.speed, true);
    const ru = kw.cells.map(([i, w]) => [ix[n].up + i, w]);
    const rf = kw.cells.map(([i, w]) => [ix[n].fw + i, w]);
    U.add(ru, (r.ru - r.bu) / r.k);
    F.add(rf, (r.rf - r.bf) / r.k);
    rowsU.push(ru);
    rowsF.push(rf);
  }
  const xu = U.solve();
  const xf = F.solve();
  for (const x of [xu, xf]) for (let i = 0; i < x.length; i++) x[i] = Math.round(x[i] * 1000) / 1000;
  // (S3a fix 3) per direction, the hold's speeds (up to the 0.75 m/s cap) apart from the faster ones (a turning hold)
  const band = (r) => (Number(/ sp ([\d.]+)/.exec(r.case)[1]) <= 0.75 ? 'hold <= 0.75' : 'fast 0.9-1.6');
  report(fr, fr.map((_, i) => [0, dot(rowsU[i], xu), dot(rowsF[i], xf)]), (r) => `${r.case.replace(/ sp [\d.]+/, '')} ${band(r)} ${r.kind}`);
  const out = ['const HELD_MOVE: Record<HeldMoveClass, HeldMoveTable> = {'];
  for (const [n, t] of Object.entries(CL)) {
    const o = ix[n];
    const len = o.nt * ns;
    out.push(`  /** ${t.doc}. */`);
    out.push(`  ${n}: {`);
    out.push(`    th: ${t.th === TH_HF ? 'TH_HF' : 'TH_HV'},`);
    out.push(`    up: [\n${fmtRows([...xu.slice(o.up, o.up + len)], ns, '      ')}\n    ],`);
    out.push(`    fw: [\n${fmtRows([...xf.slice(o.fw, o.fw + len)], ns, '      ')}\n    ],`);
    out.push('  },');
  }
  out.push('};');
  emit('hostage', out.join('\n'));
}

if (mode === 'free') fitFree();
else if (mode === 'hostage') fitHostage();
else fitWall();
