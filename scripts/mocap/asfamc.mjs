// (mocap-trial) ASF/AMC reader: the CMU skeleton (ASF) and motion (AMC, 120 fps), forward kinematics to world joint
// positions and orientations per frame, and the conversion into the game frame (+X right, +Y up, +Z forward, metres).
// Raw files live in .mocap-cache/ (gitignored, never copied into tracked files: the licence bans redistributing them).
//   node scripts/mocap/asfamc.mjs <take> [<take> ...]     self-check (bone lengths, rotations, floor, dead channels)
//
// ASF conventions (the CMU / Acclaim format): `length` units are inches x 0.45 (`:units length 0.45`), so metres =
// value / 0.45 x 0.0254; angles in degrees. Each bone has a rest `direction` (world, rest pose), a `length` and an
// `axis` (Euler angles + order) giving its local frame C. Motion: L = C M C^-1 with M the AMC rotation built in the
// dof order (rx ry rz -> Rz Ry Rx, column vectors); world rotation W = W_parent L; the bone's tip (joint) is
// tip_parent + length * W * direction. The root's tip is the AMC translation. At rest every W is the identity.
// CMU frame: Y up, the subject's left is +X and forward is +Z at rest (right-handed); the game is left-handed with +X
// right, so game = (-x, y, z) and rotations convert as S R S with S = diag(-1, 1, 1).
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { D2R, m3, v3, q4 } from './math.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CACHE = path.join(ROOT, '.mocap-cache');
export const FPS = 120;

const rotOf = (axis, a) => (axis === 'x' ? m3.rx(a) : axis === 'y' ? m3.ry(a) : m3.rz(a));

/** Euler angles (degrees) applied in `order` (e.g. 'XYZ': X first) -> matrix (column vectors). */
export function eulerMat(angles, order) {
  let m = m3.I();
  for (let i = 0; i < order.length; i++) m = m3.mul(rotOf(order[i].toLowerCase(), angles[i] * D2R), m);
  return m;
}

export function parseASF(text) {
  const lines = text.split(/\r?\n/);
  const skel = { units: { mass: 1, length: 1, angle: 'deg' }, root: null, bones: new Map(), parent: new Map(), children: new Map(), order: [] };
  let section = '';
  let bone = null;
  let inLimits = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith(':')) {
      const [key, ...rest] = line.split(/\s+/);
      section = key.slice(1);
      if (section === 'root') skel.root = { order: [], axis: 'XYZ', position: [0, 0, 0], orientation: [0, 0, 0] };
      if (section === 'name' || section === 'version') skel[section] = rest.join(' ');
      continue;
    }
    const tok = line.split(/\s+/);
    if (section === 'units') {
      skel.units[tok[0]] = tok[0] === 'angle' ? tok[1] : Number(tok[1]);
    } else if (section === 'root') {
      if (tok[0] === 'order') skel.root.order = tok.slice(1).map((s) => s.toLowerCase());
      else if (tok[0] === 'axis') skel.root.axis = tok[1];
      else if (tok[0] === 'position') skel.root.position = tok.slice(1, 4).map(Number);
      else if (tok[0] === 'orientation') skel.root.orientation = tok.slice(1, 4).map(Number);
    } else if (section === 'bonedata') {
      if (tok[0] === 'begin') { bone = { dof: [], axis: [0, 0, 0], axisOrder: 'XYZ', dir: [0, 0, 0], length: 0 }; inLimits = false; }
      else if (tok[0] === 'end') { skel.bones.set(bone.name, bone); bone = null; }
      else if (tok[0] === 'id') bone.id = Number(tok[1]);
      else if (tok[0] === 'name') bone.name = tok[1];
      else if (tok[0] === 'direction') bone.dir = tok.slice(1, 4).map(Number);
      else if (tok[0] === 'length') bone.length = Number(tok[1]);
      else if (tok[0] === 'axis') { bone.axis = tok.slice(1, 4).map(Number); bone.axisOrder = tok[4] ?? 'XYZ'; }
      else if (tok[0] === 'dof') { bone.dof = tok.slice(1).map((s) => s.toLowerCase()); inLimits = false; }
      else if (tok[0] === 'limits') inLimits = true;
      else if (inLimits) { /* limit rows: not used */ }
    } else if (section === 'hierarchy') {
      if (tok[0] === 'begin' || tok[0] === 'end') continue;
      const [p, ...kids] = tok;
      skel.children.set(p, [...(skel.children.get(p) ?? []), ...kids]);
      for (const k of kids) skel.parent.set(k, p);
    }
  }
  if (skel.units.angle !== 'deg') throw new Error(`ASF angle unit ${skel.units.angle} not supported (deg only)`);
  // topological order from root
  const q = ['root'];
  while (q.length) {
    const n = q.shift();
    skel.order.push(n);
    for (const k of skel.children.get(n) ?? []) q.push(k);
  }
  for (const [name, b] of skel.bones) {
    b.C = eulerMat(b.axis, b.axisOrder);
    b.Cinv = m3.T(b.C);
    if (!skel.parent.has(name)) throw new Error(`ASF bone ${name} has no parent in :hierarchy`);
  }
  skel.root.C = eulerMat(skel.root.orientation, skel.root.axis);
  skel.root.Cinv = m3.T(skel.root.C);
  /** metres per ASF length unit */
  skel.metres = (1 / skel.units.length) * 0.0254;
  return skel;
}

export function parseAMC(text, skel) {
  const lines = text.split(/\r?\n/);
  let degrees = false;
  const frames = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith(':')) { if (/^:DEGREES/i.test(line)) degrees = true; continue; }
    if (/^\d+$/.test(line)) { cur = { n: Number(line), v: new Map() }; frames.push(cur); continue; }
    if (!cur) continue;
    const [name, ...vals] = line.split(/\s+/);
    cur.v.set(name, vals.map(Number));
  }
  if (!degrees) throw new Error('AMC without :DEGREES is not supported');
  // a partial frame at the end (an interrupted download) is dropped
  const want = 1 + skel.bones.size - [...skel.bones.values()].filter((b) => !b.dof.length).length;
  while (frames.length && frames[frames.length - 1].v.size < want) frames.pop();
  return frames;
}

/** Forward kinematics of one AMC frame: world tips (ASF units, CMU frame) and world rotations (mat3) per bone. */
export function fkFrame(skel, frame) {
  const pos = new Map(), rot = new Map();
  const rv = frame.v.get('root') ?? [0, 0, 0, 0, 0, 0];
  const t = [0, 0, 0], ang = [];
  const angOrder = [];
  skel.root.order.forEach((ch, i) => {
    if (ch[0] === 't') t['xyz'.indexOf(ch[1])] = rv[i];
    else { ang.push(rv[i]); angOrder.push(ch[1].toUpperCase()); }
  });
  const rootM = m3.mul(m3.mul(skel.root.C, eulerMat(ang, angOrder.join(''))), skel.root.Cinv);
  pos.set('root', v3.add(t, skel.root.position));
  rot.set('root', rootM);
  for (const name of skel.order) {
    if (name === 'root') continue;
    const b = skel.bones.get(name);
    const p = skel.parent.get(name);
    const vals = frame.v.get(name);
    let M = m3.I();
    if (b.dof.length && vals) {
      const order = b.dof.map((d) => d[1].toUpperCase()).join('');
      M = eulerMat(vals, order);
    }
    const W = m3.mul(rot.get(p), m3.mul(m3.mul(b.C, M), b.Cinv));
    rot.set(name, W);
    pos.set(name, v3.add(pos.get(p), v3.scale(m3.apply(W, b.dir), b.length)));
  }
  return { pos, rot };
}

const S = [-1, 0, 0, 0, 1, 0, 0, 0, 1];
/** CMU point (ASF units) -> game metres. */
export const toGamePos = (p, metres) => [-p[0] * metres, p[1] * metres, p[2] * metres];
/** CMU world rotation -> game-frame quaternion. */
export const toGameQuat = (R) => q4.fromMat(m3.mul(m3.mul(S, R), S));
/** CMU rest direction -> game direction. */
export const toGameDir = (d) => [-d[0], d[1], d[2]];

/**
 * Loads a take: `{ take, subject, skel, frames, fps, pos: Map<bone, [x,y,z][]>, quat: Map<bone, q[]> }` in the game
 * frame (metres), plus `dead`: bones whose channels never change (missing data in the capture).
 */
export function loadTake(take, { cache = CACHE } = {}) {
  const subject = take.split('_')[0];
  const asfFile = path.join(cache, `${subject}.asf`);
  const amcFile = path.join(cache, `${take}.amc`);
  if (!existsSync(asfFile) || !existsSync(amcFile)) throw new Error(`missing ${!existsSync(asfFile) ? asfFile : amcFile}`);
  const skel = parseASF(readFileSync(asfFile, 'utf8'));
  const frames = parseAMC(readFileSync(amcFile, 'utf8'), skel);
  const pos = new Map(), quat = new Map();
  for (const n of skel.order) { pos.set(n, []); quat.set(n, []); }
  for (const f of frames) {
    const r = fkFrame(skel, f);
    for (const n of skel.order) {
      pos.get(n).push(toGamePos(r.pos.get(n), skel.metres));
      const q = toGameQuat(r.rot.get(n));
      const arr = quat.get(n);
      arr.push(arr.length ? q4.align(q, arr[arr.length - 1]) : q);
    }
  }
  // dead channels: a bone with dofs whose values never move
  const dead = [];
  for (const [name, b] of skel.bones) {
    if (!b.dof.length) continue;
    let span = 0;
    const first = frames[0]?.v.get(name) ?? [];
    for (const f of frames) {
      const v = f.v.get(name) ?? [];
      for (let i = 0; i < v.length; i++) span = Math.max(span, Math.abs(v[i] - (first[i] ?? 0)));
    }
    if (span < 1e-6) dead.push(name);
  }
  // dropouts: frames where a moving bone's channels are all exactly zero (a lost marker set written as rest)
  const zeros = new Map();
  for (const [name, b] of skel.bones) {
    if (!b.dof.length || dead.includes(name)) continue;
    const z = [];
    frames.forEach((f, i) => { const v = f.v.get(name) ?? []; if (v.length && v.every((x) => x === 0)) z.push(i); });
    if (z.length) zeros.set(name, z);
  }
  return { take, subject, skel, frames: frames.length, fps: FPS, pos, quat, dead, zeros, bytes: statSync(amcFile).size };
}

/** Rest-pose (all W = I) bone tips in the game frame, root at the origin. */
export function restPose(skel) {
  const r = fkFrame(skel, { v: new Map() });
  const out = new Map();
  for (const n of skel.order) out.set(n, toGamePos(r.pos.get(n), skel.metres));
  return out;
}

/** Self-check of one loaded take; returns { ok, lines }. */
export function selfCheck(t) {
  const lines = [];
  let ok = true;
  const { skel } = t;
  // 1. bone lengths constant over frames (FK consistency)
  let worstLen = 0, worstBone = '';
  for (const [name, b] of skel.bones) {
    const p = skel.parent.get(name), want = b.length * skel.metres;
    const a = t.pos.get(p), c = t.pos.get(name);
    for (let i = 0; i < t.frames; i += 7) {
      const e = Math.abs(v3.dist(a[i], c[i]) - want);
      if (e > worstLen) { worstLen = e; worstBone = name; }
    }
  }
  lines.push(`bone length drift max ${(worstLen * 1000).toFixed(4)} mm (${worstBone || '-'})`);
  if (worstLen > 1e-4) ok = false;
  // 2. rotations unit and continuous
  let worstQ = 0;
  for (const [, arr] of t.quat) for (let i = 0; i < arr.length; i += 11) worstQ = Math.max(worstQ, Math.abs(Math.hypot(...arr[i]) - 1));
  lines.push(`quaternion norm error max ${worstQ.toExponential(1)}`);
  if (worstQ > 1e-6) ok = false;
  // 3. rest height (subject) and the floor: lowest foot point per frame
  const rest = restPose(skel);
  const ys = [...rest.values()].map((p) => p[1]);
  const restH = Math.max(...ys) - Math.min(...ys);
  lines.push(`rest skeleton height (foot to head tip) ${restH.toFixed(3)} m, units ${skel.metres.toFixed(5)} m/unit`);
  const low = [];
  for (let i = 0; i < t.frames; i++) {
    low.push(Math.min(t.pos.get('ltoes')[i][1], t.pos.get('rtoes')[i][1], t.pos.get('lfoot')[i][1], t.pos.get('rfoot')[i][1]));
  }
  const s = [...low].sort((a, b) => a - b);
  const floor = s[Math.floor(s.length * 0.05)];
  lines.push(`floor estimate (5th pct of the lowest foot point) ${(floor * 100).toFixed(1)} cm; min ${(s[0] * 100).toFixed(1)} cm`);
  if (Math.abs(floor) > 0.08) { ok = false; lines.push('  FLOOR off by more than 8 cm'); }
  if (t.dead.length) lines.push(`dead channels (never move): ${t.dead.join(', ')}`);
  return { ok, lines, restH, floor };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const takes = process.argv.slice(2);
  if (!takes.length) { console.error('usage: node scripts/mocap/asfamc.mjs <take> [...]'); process.exit(2); }
  let bad = 0;
  for (const take of takes) {
    const t = loadTake(take);
    const r = selfCheck(t);
    console.log(`${take}: ${t.frames} frames (${(t.frames / FPS).toFixed(2)} s) ${r.ok ? 'OK' : 'FAIL'}`);
    for (const l of r.lines) console.log(`  ${l}`);
    if (!r.ok) bad++;
  }
  process.exit(bad ? 1 : 0);
}
