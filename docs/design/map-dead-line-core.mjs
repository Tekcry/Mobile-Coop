// Dead Line map: geometry, 0.5 m nav grid, 3D line of sight, light, guard clock and the perception model.
// Used by map-dead-line-render.mjs (checks, SVG, tables) and the two bots. Pure node, no game code.
// Engine numbers: PERCEPTION (ai/perception.ts), LIGHT and lamp formula (world/lights.ts, lampMath.ts), noiseRadius (player/movement.ts).
export const CELL = 0.5;
export const AGENT = 0.32;
export const hyp = (a, b) => Math.sqrt(a * a + b * b);
export const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);

// ---- engine constants copied from the code (see the validation doc for sources)
export const PERCEPTION = { focusHalf: (55 / 2) * (Math.PI / 180), focusRange: 25, periphHalf: 100 * (Math.PI / 180), periphRange: 12, periphMul: 0.35, edgeBlend: 0.18, rate: 2.2, distPow: 1.5, closeRange: 1.8, closeRate: 1.5, instantRange: 1.6, maxRate: 3.2, hold: 1.2, decay: 0.18, leak: 0.2, suspicious: 0.3, investigate: 0.6, crouchMul: 0.55, stillMul: 0.55, sneakMul: 0.75, walkMul: 1, jogMul: 1.35, sprintMul: 1.9, exposureMin: 0.2 };
export const LIGHT = { shadow: 0.28, lit: 0.6 };
export const LAMP_GAIN = 1.2;
const LAMP_CUT = Math.cos((Math.PI * 0.97) / 2);
export const AMBIENT = { default: 0.1, basement: 0.06 };
const smooth = (t) => t * t * (3 - 2 * t);
export function visibilityFromLight(level) {
  const t = Math.max(0, Math.min(1, (level - LIGHT.shadow * 0.5) / (LIGHT.lit - LIGHT.shadow * 0.5)));
  return 0.25 + 0.75 * t * t * (3 - 2 * t);
}
export const lightFactor = (l) => { const v = visibilityFromLight(l); return v * v; };
export function motionFactor(speed) {
  const P = PERCEPTION;
  if (speed < 0.15) return P.stillMul;
  if (speed < 0.9) return P.sneakMul;
  if (speed < 1.4) return P.sneakMul + (P.walkMul - P.sneakMul) * ((speed - 0.9) / 0.5);
  if (speed < 2.0) return P.walkMul;
  if (speed < 3.6) return P.walkMul + (P.jogMul - P.walkMul) * ((speed - 2.0) / 1.6);
  return P.jogMul + (P.sprintMul - P.jogMul) * Math.min(1, (speed - 3.6) / 1.4);
}
export function fieldFactor(angle) {
  const P = PERCEPTION;
  const a = Math.abs(angle);
  if (a <= P.focusHalf) return [1, P.focusRange];
  if (a <= P.focusHalf + P.edgeBlend) {
    const t = smooth((a - P.focusHalf) / P.edgeBlend);
    return [1 + (P.periphMul - 1) * t, P.focusRange + (P.periphRange - P.focusRange) * t];
  }
  if (a <= P.periphHalf) return [P.periphMul, P.periphRange];
  return [0, 0];
}
export function sightRate(i) {
  const P = PERCEPTION;
  if (i.exposure <= 0) return 0;
  const stance = i.crouched ? P.crouchMul : 1;
  const motion = motionFactor(i.speed);
  let rate = 0;
  const [field, range] = fieldFactor(i.angle);
  if (field > 0 && i.dist < range) {
    const df = Math.pow(1 - i.dist / range, P.distPow);
    const exp = P.exposureMin + (1 - P.exposureMin) * Math.min(1, i.exposure);
    rate = P.rate * df * field * lightFactor(i.light) * stance * motion * exp;
  }
  if (i.dist < P.closeRange && i.speed > 0.15) {
    const k = 1 - i.dist / P.closeRange;
    const behind = field > 0 ? 1 : motion > 0.8 ? 0.4 : 0;
    rate += P.closeRate * k * behind * Math.min(1, motion) * stance;
  }
  return rate > P.maxRate ? P.maxRate : rate;
}
// footstep noise radius (m): player/movement.ts noiseRadius with crouchWalkSpeed 1.8, walkSpeed 1.4, NOISE_QUIET crouch 1.9 stand 1.45
export function noiseRadius(speed, crouched, sprinting) {
  if (speed < 0.15) return 0;
  if (sprinting) return 9;
  if (crouched) return speed <= 1.9 ? 0 : 1 + (speed - 1.8) * 1.5;
  return speed <= 1.45 ? 0 : 1.2 + (speed - 1.4) * 1.6;
}
export const MUFFLE = 0.45;

export function loadWorld(D) {
  const W = { D };
  W.Y = Object.fromEntries(D.meta.levels.map((l) => [l.id, l.y]));
  W.levels = D.meta.levels.map((l) => l.id);
  W.spaceById = Object.fromEntries(D.spaces.map((s) => [s.id, s]));
  const NOGRID = new Set(['duct', 'ledge', 'void']);
  const PASS = new Set(['door1', 'door2', 'wide', 'open', 'gate']);
  const MOVECUT = PASS;
  const LOSCUT = new Set(['wide', 'open', 'window', 'mesh', 'rail']);
  const gridded = D.spaces.filter((s) => !NOGRID.has(s.kind));
  W.gridded = gridded;
  const edgesOf = (r) => [
    { axis: 'z', at: r[1], a: r[0], b: r[2] },
    { axis: 'z', at: r[3], a: r[0], b: r[2] },
    { axis: 'x', at: r[0], a: r[1], b: r[3] },
    { axis: 'x', at: r[2], a: r[1], b: r[3] }
  ];
  const cut = (e, level, types) => {
    const cuts = D.openings.filter((o) => o.level === level && o.axis === e.axis && Math.abs(o.at - e.at) < 1e-6 && types.has(o.type))
      .map((o) => [Math.max(e.a, o.c - o.w / 2), Math.min(e.b, o.c + o.w / 2)]).filter(([s, t]) => t > s + 1e-6).sort((p, q) => p[0] - q[0]);
    const out = [];
    let cur = e.a;
    for (const [s, t] of cuts) { if (s > cur + 1e-6) out.push([cur, s]); cur = Math.max(cur, t); }
    if (cur < e.b - 1e-6) out.push([cur, e.b]);
    return out;
  };
  const seg = (axis, at, a, b) => (axis === 'z' ? { x0: a, z0: at, x1: b, z1: at } : { x0: at, z0: a, x1: at, z1: b });
  W.moveWalls = Object.fromEntries(W.levels.map((l) => [l, []]));
  W.losWalls = [];
  const railLow = new Set(['rail']);
  for (const s of gridded) {
    for (const e of edgesOf(s.rect)) {
      for (const [a, b] of cut(e, s.level, MOVECUT)) W.moveWalls[s.level].push(seg(e.axis, e.at, a, b));
      const tall = s.level === 'G' && s.wallH > 3.3;
      const y0 = W.Y[s.level];
      // lower part (this level)
      for (const [a, b] of cut(e, s.level, LOSCUT)) {
        // a rail cut leaves a low wall (1.0 m) for sight
        W.losWalls.push({ ...seg(e.axis, e.at, a, b), y0, y1: tall ? 3.3 : y0 + s.wallH });
      }
      for (const [a, b] of cut(e, s.level, new Set(['rail']))) { /* rail ranges are removed from the cut above; add the low wall */ }
      // railed ranges: low wall
      const railRanges = D.openings.filter((o) => o.level === s.level && o.axis === e.axis && Math.abs(o.at - e.at) < 1e-6 && o.type === 'rail').map((o) => [Math.max(e.a, o.c - o.w / 2), Math.min(e.b, o.c + o.w / 2)]).filter(([p, q]) => q > p + 1e-6);
      for (const [a, b] of railRanges) W.losWalls.push({ ...seg(e.axis, e.at, a, b), y0, y1: y0 + 1.0 });
      if (tall) for (const [a, b] of cut(e, 'U', LOSCUT)) W.losWalls.push({ ...seg(e.axis, e.at, a, b), y0: 3.3, y1: s.wallH });
    }
  }
  // sealed doors and closed doors block sight: they are walls in the sight list (door ranges are cut only for wide/open/window/mesh/rail above)
  W.blocks = Object.fromEntries(W.levels.map((l) => [l, D.blocks.filter((b) => b.level === l)]));
  // slabs: planes where a ray cannot pass
  W.slabs = [];
  for (const s of D.spaces) if (s.level === 'U' && s.kind !== 'ledge') W.slabs.push({ rect: s.rect, y: 3.3 });
  for (const s of gridded) if (s.level === 'G' && s.wallH <= 3.3 && s.kind !== 'outdoor') W.slabs.push({ rect: s.rect, y: 3.3 });
  for (const s of D.spaces) if (s.level === 'R') W.slabs.push({ rect: s.rect, y: 6.6 });
  for (const s of gridded) if (s.level === 'G' && s.wallH > 3.3) W.slabs.push({ rect: s.rect, y: 6.6 });
  for (const s of gridded) if (s.level === 'U') W.slabs.push({ rect: s.rect, y: 6.6 });
  // ground slab: every B cell is under G/outdoor ground
  W.slabs.push({ rect: [-50, -38, 74, 12], y: 0, onlyBelow: true });

  // nav grid
  const [x0, x1] = D.meta.footprint.x;
  const [z0, z1] = D.meta.footprint.z;
  W.NX = Math.round((x1 - x0) / CELL);
  W.NZ = Math.round((z1 - z0) / CELL);
  W.x0 = x0; W.z0 = z0;
  W.grids = {};
  W.makeGrid = (off) => {
    const g = { off };
    g.cx = (i) => x0 + off + 0.25 + CELL * i;
    g.cz = (j) => z0 + off + 0.25 + CELL * j;
    g.cellOf = (x, z) => [Math.round((x - (x0 + off + 0.25)) / CELL), Math.round((z - (z0 + off + 0.25)) / CELL)];
    g.W = {};
    for (const lv of W.levels) {
      const arr = new Uint8Array(W.NX * W.NZ);
      const rects = gridded.filter((s) => s.level === lv).map((s) => s.rect);
      const blks = W.blocks[lv];
      const walls = W.moveWalls[lv];
      for (let i = 0; i < W.NX; i++) {
        const x = g.cx(i);
        for (let j = 0; j < W.NZ; j++) {
          const z = g.cz(j);
          let inside = false;
          for (const r of rects) if (x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) { inside = true; break; }
          if (!inside) continue;
          let ok = true;
          for (const b of blks) {
            const dx = Math.max(b.rect[0] - x, 0, x - b.rect[2]);
            const dz = Math.max(b.rect[1] - z, 0, z - b.rect[3]);
            if (hyp(dx, dz) < AGENT - 1e-6) { ok = false; break; }
          }
          if (ok) for (const w of walls) {
            const dx = w.x1 - w.x0, dz = w.z1 - w.z0;
            const l2 = dx * dx + dz * dz;
            let t = l2 ? ((x - w.x0) * dx + (z - w.z0) * dz) / l2 : 0;
            t = Math.max(0, Math.min(1, t));
            if (hyp(x - (w.x0 + dx * t), z - (w.z0 + dz * t)) < AGENT - 1e-6) { ok = false; break; }
          }
          arr[i * W.NZ + j] = ok ? 1 : 0;
        }
      }
      g.W[lv] = arr;
    }
    g.walk = (lv, i, j) => i >= 0 && j >= 0 && i < W.NX && j < W.NZ && g.W[lv][i * W.NZ + j] === 1;
    g.nearest = (lv, x, z, rad = 1.2) => {
      const [ci, cj] = g.cellOf(x, z);
      let best = null, bd = 1e9;
      const n = Math.ceil(rad / CELL) + 1;
      for (let i = ci - n; i <= ci + n; i++) for (let j = cj - n; j <= cj + n; j++) {
        if (!g.walk(lv, i, j)) continue;
        const d = hyp(g.cx(i) - x, g.cz(j) - z);
        if (d < bd && d <= rad) { bd = d; best = [i, j]; }
      }
      return best;
    };
    return g;
  };
  W.grid = W.makeGrid(0);
  W.grid25 = W.makeGrid(0.25);

  // space lookup
  W.spaceAt = (lv, x, z) => {
    let best = null;
    for (const s of D.spaces) if (s.level === lv && x >= s.rect[0] - 1e-6 && x <= s.rect[2] + 1e-6 && z >= s.rect[1] - 1e-6 && z <= s.rect[3] + 1e-6) {
      if (!best || (s.rect[2] - s.rect[0]) * (s.rect[3] - s.rect[1]) < (best.rect[2] - best.rect[0]) * (best.rect[3] - best.rect[1])) best = s;
    }
    return best;
  };

  // ---- graph for shortest paths (nodes: lv, i, j) with links
  const NL = W.levels.length;
  const lvIdx = Object.fromEntries(W.levels.map((l, k) => [l, k]));
  W.lvIdx = lvIdx;
  const N = W.NX * W.NZ;
  const nodeId = (lv, i, j) => lvIdx[lv] * N + i * W.NZ + j;
  W.nodeId = nodeId;
  W.linkEdges = new Map();
  W.linkNode = {};
  const g = W.grid;
  for (const l of D.links) {
    const a = g.nearest(l.a[0], l.a[1], l.a[2], 1.6);
    const b = g.nearest(l.b[0], l.b[1], l.b[2], 1.6);
    l.snap = { a: a && [l.a[0], g.cx(a[0]), g.cz(a[1])], b: b && [l.b[0], g.cx(b[0]), g.cz(b[1])] };
    if (!a || !b) continue;
    const na = nodeId(l.a[0], a[0], a[1]);
    const nb = nodeId(l.b[0], b[0], b[1]);
    const add = (u, v) => { if (!W.linkEdges.has(u)) W.linkEdges.set(u, []); W.linkEdges.get(u).push({ to: v, cost: l.travel, link: l }); };
    add(na, nb);
    if (!l.oneway) add(nb, na);
  }
  const dirs = [[1, 0, 0.5], [-1, 0, 0.5], [0, 1, 0.5], [0, -1, 0.5], [1, 1, 0.7071], [1, -1, 0.7071], [-1, 1, 0.7071], [-1, -1, 0.7071]];
  // shortest path: A* over time at the walk pace; returns { nodes, cost, links }
  W.findPath = (from, to, opts = {}) => {
    const { avoidLinks = null, onlyLinks = null, pace = 2.0 } = opts;
    const [lva, xa, za] = from;
    const [lvb, xb, zb] = to;
    const sa = g.nearest(lva, xa, za, 1.4);
    const sb = g.nearest(lvb, xb, zb, 1.4);
    if (!sa || !sb) return null;
    const start = nodeId(lva, sa[0], sa[1]);
    const goal = nodeId(lvb, sb[0], sb[1]);
    const dist = new Map();
    const prev = new Map();
    // binary heap
    const heap = [];
    const push = (k, v) => { heap.push([k, v]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { let l = c * 2 + 1, r = l + 1, m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    dist.set(start, 0);
    push(0, start);
    const hOf = (id) => {
      const lv = W.levels[Math.floor(id / N)];
      if (lv !== lvb) return 0;
      const r = id % N;
      const i = Math.floor(r / W.NZ), j = r % W.NZ;
      return hyp(g.cx(i) - xb, g.cz(j) - zb) / pace * 0.98;
    };
    while (heap.length) {
      const [, u] = pop();
      if (u === goal) break;
      const du = dist.get(u);
      const lvl = W.levels[Math.floor(u / N)];
      const r = u % N;
      const i = Math.floor(r / W.NZ), j = r % W.NZ;
      for (const [di, dj, c] of dirs) {
        const i2 = i + di, j2 = j + dj;
        if (!g.walk(lvl, i2, j2)) continue;
        if (di && dj && !(g.walk(lvl, i2, j) && g.walk(lvl, i, j2))) continue;
        const v = nodeId(lvl, i2, j2);
        const nd = du + c / pace;
        if (nd < (dist.get(v) ?? 1e18)) { dist.set(v, nd); prev.set(v, [u, null]); push(nd + hOf(v), v); }
      }
      for (const e of W.linkEdges.get(u) || []) {
        if (avoidLinks && avoidLinks.has(e.link.id)) continue;
        if (onlyLinks && !onlyLinks.has(e.link.id)) continue;
        const nd = du + e.cost;
        if (nd < (dist.get(e.to) ?? 1e18)) { dist.set(e.to, nd); prev.set(e.to, [u, e.link]); push(nd + hOf(e.to), e.to); }
      }
    }
    if (!dist.has(goal)) return null;
    const seq = [];
    let cur = goal;
    while (cur !== undefined) { const p = prev.get(cur); seq.push({ id: cur, via: p ? p[1] : null }); cur = p ? p[0] : undefined; }
    seq.reverse();
    return seq.map((s) => {
      const lv = W.levels[Math.floor(s.id / N)];
      const r = s.id % N;
      return { lv, x: g.cx(Math.floor(r / W.NZ)), z: g.cz(r % W.NZ), via: s.via };
    });
  };
  // straight-line walkability on a level
  W.straightOk = (lv, p, q) => {
    const n = Math.max(1, Math.ceil(hyp(q[0] - p[0], q[1] - p[1]) / 0.25));
    for (let k = 0; k <= n; k++) {
      const x = p[0] + ((q[0] - p[0]) * k) / n;
      const z = p[1] + ((q[1] - p[1]) * k) / n;
      const [i, j] = g.cellOf(x, z);
      let ok = false;
      for (let di = -1; di <= 1 && !ok; di++) for (let dj = -1; dj <= 1 && !ok; dj++) if (g.walk(lv, i + di, j + dj) && hyp(g.cx(i + di) - x, g.cz(j + dj) - z) <= 0.36) ok = true;
      if (!ok) return false;
    }
    return true;
  };
  // path -> polyline segments [{lv, pts:[[x,z]...] , link}]; smooth runs of same level
  W.pathToLegs = (nodes) => {
    const legs = [];
    let run = [];
    const flush = (lv) => {
      if (!run.length) return;
      // string pulling
      const out = [run[0]];
      let a = 0;
      while (a < run.length - 1) {
        let b = run.length - 1;
        while (b > a + 1 && !W.straightOk(lv, run[a], run[b])) b--;
        out.push(run[b]);
        a = b;
      }
      legs.push({ lv, pts: out, link: null });
      run = [];
    };
    let cur = null;
    for (let k = 0; k < nodes.length; k++) {
      const n = nodes[k];
      if (n.via) { flush(cur); legs.push({ lv: n.lv, pts: [[n.x, n.z]], link: n.via }); cur = n.lv; run = [[n.x, n.z]]; continue; }
      if (cur !== n.lv) { flush(cur); cur = n.lv; }
      run.push([n.x, n.z]);
    }
    flush(cur);
    return legs;
  };

  // ---- 3D line of sight. A, B: { l, x, z, h } (h above own floor)
  const segSeg = (ax, az, bx, bz, s) => {
    const rx = bx - ax, rz = bz - az, qx = s.x1 - s.x0, qz = s.z1 - s.z0;
    const den = rx * qz - rz * qx;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((s.x0 - ax) * qz - (s.z0 - az) * qx) / den;
    const u = ((s.x0 - ax) * rz - (s.z0 - az) * rx) / den;
    if (t < 0 || t > 1 || u < -1e-9 || u > 1 + 1e-9) return null;
    return t;
  };
  const clipSeg = (ax, az, bx, bz, r) => {
    let t0 = 0, t1 = 1;
    const dx = bx - ax, dz = bz - az;
    for (const [p, q] of [[-dx, ax - r[0]], [dx, r[2] - ax], [-dz, az - r[1]], [dz, r[3] - az]]) {
      if (Math.abs(p) < 1e-12) { if (q < 0) return null; } else { const t = q / p; if (p < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t); }
    }
    return t0 <= t1 ? [t0, t1] : null;
  };
  W.los = (A, B) => {
    const ya = W.Y[A.l] + A.h, yb = W.Y[B.l] + B.h;
    const minx = Math.min(A.x, B.x), maxx = Math.max(A.x, B.x), minz = Math.min(A.z, B.z), maxz = Math.max(A.z, B.z);
    for (const w of W.losWalls) {
      if (Math.max(w.x0, w.x1) < minx - 1e-6 || Math.min(w.x0, w.x1) > maxx + 1e-6 || Math.max(w.z0, w.z1) < minz - 1e-6 || Math.min(w.z0, w.z1) > maxz + 1e-6) continue;
      const t = segSeg(A.x, A.z, B.x, B.z, w);
      if (t === null) continue;
      const y = ya + (yb - ya) * t;
      if (y >= w.y0 - 1e-6 && y <= w.y1 + 1e-6) { W.los.last = 'wall ' + w.x0 + ',' + w.z0; return false; }
    }
    for (const lv of W.levels) for (const b of W.blocks[lv]) {
      const r = b.rect;
      if (r[2] < minx || r[0] > maxx || r[3] < minz || r[1] > maxz) continue;
      const c = clipSeg(A.x, A.z, B.x, B.z, r);
      if (!c) continue;
      const y0 = ya + (yb - ya) * c[0], y1 = ya + (yb - ya) * c[1];
      const base = W.Y[lv];
      if (Math.min(y0, y1) < base + b.h && Math.max(y0, y1) > base) { W.los.last = 'block ' + b.id; return false; }
    }
    const lo = Math.min(ya, yb), hi = Math.max(ya, yb);
    for (const s of W.slabs) {
      if (s.y < lo + 0.05 || s.y > hi - 0.05) continue;
      const c = clipSeg(A.x, A.z, B.x, B.z, s.rect);
      if (!c) continue;
      const y0 = ya + (yb - ya) * c[0], y1 = ya + (yb - ya) * c[1];
      if (Math.min(y0, y1) <= s.y && Math.max(y0, y1) >= s.y) { W.los.last = 'slab ' + s.y; return false; }
    }
    return true;
  };

  // ---- light. lamps with circuit state: on = (circuitId) => bool
  W.lampsOn = (state) => D.lamps.filter((l) => !state.off.has(l.circuit) && !state.shot.has(l.id));
  W.lightAt = (lv, x, z, h = 1.0, state = { off: new Set(), shot: new Set() }) => {
    let L = W.spaceAt(lv, x, z)?.amb ?? (lv === 'B' ? AMBIENT.basement : AMBIENT.default);
    for (const l of W.lampsOn(state)) {
      const lvls = [l.level, ...(l.also || [])];
      if (!lvls.includes(lv)) continue;
      const dx = x - l.x, dz = z - l.z;
      const dh = (W.Y[l.level] + l.h) - (W.Y[lv] + h);
      const d = Math.sqrt(dx * dx + dz * dz + dh * dh);
      if (d >= l.r) continue;
      const cosA = dh / Math.max(d, 1e-4);
      if (cosA < LAMP_CUT) continue;
      const term = (1 - d / l.r) * Math.max(cosA, 1e-4);
      if (term * LAMP_GAIN * (l.i ?? 1) < 0.01) continue;
      if (!W.los({ l: l.level, x: l.x, z: l.z, h: l.h }, { l: lv, x, z, h })) continue;
      L += LAMP_GAIN * (l.i ?? 1) * term;
    }
    return Math.min(1, L);
  };
  return W;
}

// ---- guards: waypoint timeline on the master clock
export function guardTimeline(W, g) {
  const D = W.D;
  const lv = g.level || 'G';
  const turn = D.meta.guardTurnSec;
  const pts = g.wps;
  const n = pts.length;
  const segs = []; // {t0,t1, kind:'move'|'dwell'|'turn', from, to, path}
  let t = 0;
  let travel = 0, dwell = 0;
  for (let k = 0; k < n; k++) {
    const a = pts[k], b = pts[(k + 1) % n];
    dwell += a.d;
    segs.push({ kind: 'dwell', t0: t, t1: t + a.d, at: [a.x, a.z], face: a.face });
    t += a.d;
    if (a.x === b.x && a.z === b.z && n >= 1) {
      // same spot: a turn only
      segs.push({ kind: 'turn', t0: t, t1: t + turn, at: [a.x, a.z], face: a.face });
      t += turn;
      continue;
    }
    const nodes = W.findPath([lv, a.x, a.z], [lv, b.x, b.z], { pace: g.speed });
    if (!nodes) return { error: `${g.id}: no path ${k}->${(k + 1) % n}` };
    const legs = W.pathToLegs(nodes).filter((l) => !l.link);
    const poly = [[a.x, a.z]];
    for (const leg of legs) for (const p of leg.pts) poly.push(p);
    poly.push([b.x, b.z]);
    let len = 0;
    for (let q = 1; q < poly.length; q++) len += hyp(poly[q][0] - poly[q - 1][0], poly[q][1] - poly[q - 1][1]);
    const dur = len / g.speed;
    travel += len;
    segs.push({ kind: 'move', t0: t, t1: t + dur, poly, len, from: [a.x, a.z], to: [b.x, b.z], nextFace: b.face });
    t += dur;
    segs.push({ kind: 'turn', t0: t, t1: t + turn, at: [b.x, b.z], face: b.face });
    t += turn;
  }
  return { id: g.id, segs, period: t, travel, dwell, level: lv };
}
export function guardAt(g, tl, T) {
  const P = tl.period;
  const t = ((T % P) + P) % P;
  for (const s of tl.segs) {
    if (t < s.t0 || t >= s.t1) continue;
    if (s.kind === 'dwell' || s.kind === 'turn') return { x: s.at[0], z: s.at[1], face: s.face, moving: false, kind: s.kind };
    const f = (t - s.t0) / (s.t1 - s.t0);
    let target = f * s.len;
    for (let q = 1; q < s.poly.length; q++) {
      const l = hyp(s.poly[q][0] - s.poly[q - 1][0], s.poly[q][1] - s.poly[q - 1][1]);
      if (target <= l || q === s.poly.length - 1) {
        const k = l ? Math.min(1, target / l) : 1;
        const dx = s.poly[q][0] - s.poly[q - 1][0], dz = s.poly[q][1] - s.poly[q - 1][1];
        const dl = hyp(dx, dz) || 1;
        return { x: s.poly[q - 1][0] + dx * k, z: s.poly[q - 1][1] + dz * k, face: [dx / dl, dz / dl], moving: true, kind: 'move' };
      }
      target -= l;
    }
  }
  const last = tl.segs[tl.segs.length - 1];
  return { x: last.at?.[0] ?? 0, z: last.at?.[1] ?? 0, face: last.face || [1, 0], moving: false, kind: 'end' };
}
