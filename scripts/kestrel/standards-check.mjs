// Shared standards check (Michael, 2026-10-11; handover Notes "P03B Part 2").
// standardsCheck(arch) -> { fails, info, counts }. CLI: node scripts/kestrel/standards-check.mjs <arch.json>
// Vertical test VT1-VT5 (2c): stairs have wells, voids have rooms below, ladders join levels, upper rooms and services clear yards, service ends on building edges are listed.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WALL = 0.3; // interior wall thickness (RULES 6)
const short = (r) => Math.min(r[2] - r[0], r[3] - r[1]);
const EPS = 1e-6;
const within = (r, f) => r[0] >= f[0] && r[1] >= f[1] && r[2] <= f[2] && r[3] <= f[3];

export function standardsCheck(arch) {
  const fails = [], info = [];
  const counts = { corridors: 0, doors: 0, crawl: 0, stairs: 0, vertical: 0 };
  const rooms = arch.rooms ?? [], levels = arch.levels ?? [];
  const lvl = (id) => levels.find((l) => l.id === id);

  // Corridors: clear short side at least 3.0 (scale-sheet l.37 "never under 3.0"; RULES 6 clear = rect minus 0.30)
  for (const r of rooms) {
    if (r.kind !== 'corridor') continue;
    counts.corridors++;
    const clear = short(r.rect) - WALL;
    if (clear < 3.0 - EPS) fails.push(`corridor ${r.id}: clear short side ${clear.toFixed(2)} < 3.0`);
  }

  // Doors: w >= 1.0, h >= 2.1 (scale-sheet l.33); a 1.0 door sits on a 0.5 multiple (scale-sheet l.55)
  const wallOf = Object.fromEntries((arch.walls ?? []).map((w) => [w.id, w]));
  for (const o of arch.openings ?? []) {
    if (!['door', 'double', 'fire-door'].includes(o.type)) continue;
    counts.doors++;
    if (o.w < 1.0 - EPS) fails.push(`door ${o.id}: w ${o.w} < 1.0`);
    if (o.h < 2.1 - EPS) fails.push(`door ${o.id}: h ${o.h} < 2.1`);
    if (Math.abs(o.w - 1.0) < EPS) {
      const w = wallOf[o.wall];
      if (!w || !Array.isArray(w.a) || !Array.isArray(w.b)) { info.push(`door ${o.id}: 1.0 door centre not checkable (wall ${o.wall} missing)`); continue; }
      const c = w.a[0] === w.b[0] ? w.a[1] + Math.sign(w.b[1] - w.a[1]) * o.at : w.a[0] + Math.sign(w.b[0] - w.a[0]) * o.at;
      if (Math.abs(c / 0.5 - Math.round(c / 0.5)) > 1e-6) fails.push(`door ${o.id}: 1.0 door centre ${c} not on a 0.5 multiple`);
    }
  }

  // Crawl spaces: level U or crawl:true; clear height >= 1.5 (handover Decisions "Underfloor void"), clear short side >= 1.2 (scale-sheet l.44)
  for (const r of rooms) {
    if (r.level !== 'U' && !r.crawl) continue;
    counts.crawl++;
    // level U: ceiling if set, else height minus 0.1 floor tiles (03B 2 row U "1.6 to hall floor (1.5 clear under tiles)")
    const lh = lvl(r.level)?.height ?? 0;
    const h = r.ceiling > 0 ? r.ceiling : r.level === 'U' ? lh - 0.1 : lh;
    if (h < 1.5 - EPS) fails.push(`crawl ${r.id}: clear height ${h} < 1.5`);
    const clear = short(r.rect) - WALL;
    if (clear < 1.2 - EPS) fails.push(`crawl ${r.id}: clear short side ${clear.toFixed(2)} < 1.2`);
  }

  // Stairs: width by kind; levels exist
  for (const s of arch.stairs ?? []) {
    counts.stairs++;
    // fire 1.3 (scale-sheet l.40), main 1.85 (handover Decisions "Main stair"), feature 2.4 (scale-sheet l.41); other kinds have no minimum
    const min = { fire: 1.3, main: 1.85, feature: 2.4 }[s.kind] ?? 0;
    if (!(s.kind in { fire: 1, main: 1, feature: 1 })) info.push(`stair ${s.id}: kind ${s.kind} has no width minimum`);
    if (s.width < min - EPS) fails.push(`stair ${s.id}: width ${s.width} < ${min} (${s.kind})`);
    if (!lvl(s.from) || !lvl(s.to)) fails.push(`stair ${s.id}: missing level at from ${s.from} or to ${s.to}`);
  }

  // Vertical test (2c; headroom 2.1 = door height, scale-sheet l.33)
  const inRect = (x, z, r) => x >= r[0] - EPS && x <= r[2] + EPS && z >= r[1] - EPS && z <= r[3] + EPS;
  const same = (a, b) => a.length === 4 && b.length === 4 && a.every((v, i) => Math.abs(v - b[i]) < EPS);
  const voids = arch.voids ?? [], ladders = arch.ladders ?? [], services = arch.services ?? [];
  counts.vertical = (arch.stairs ?? []).length + voids.length + ladders.length;
  for (const s of arch.stairs ?? []) { // VT1
    if (!voids.some((v) => v.kind === 'stairwell' && v.level === s.to && same(v.rect, s.rect))) fails.push(`stair ${s.id}: no stairwell void on ${s.to}`);
  }
  for (const v of voids) { // VT2
    const cx = (v.rect[0] + v.rect[2]) / 2, cz = (v.rect[1] + v.rect[3]) / 2, f = lvl(v.level)?.floor ?? 0;
    const below = levels.filter((l) => l.floor < f).map((l) => l.id);
    if (!rooms.some((r) => below.includes(r.level) && inRect(cx, cz, r.rect))) fails.push(`void ${v.id}: nothing below`);
  }
  for (const l of ladders) { // VT3
    const a = lvl(l.from), b = lvl(l.to);
    if (!a || !b) fails.push(`ladder ${l.id}: missing level at from ${l.from} or to ${l.to}`);
    else {
      if (b.floor <= a.floor) fails.push(`ladder ${l.id}: to ${l.to} is not above from ${l.from}`);
      if (!rooms.some((r) => r.level === l.from && inRect(l.at[0], l.at[1], r.rect))) fails.push(`ladder ${l.id}: foot ${l.at} in no room on ${l.from}`);
    }
  }
  const yards = rooms.filter((r) => r.level === 'G' && (r.kind === 'yard' || r.kind === 'lane'));
  const overlap = (a, b) => a[0] < b[2] - EPS && a[2] > b[0] + EPS && a[1] < b[3] - EPS && a[3] > b[1] + EPS; // VT4
  const clears = (id, rect, h) => {
    for (const y of yards) if (overlap(rect, y.rect)) { counts.vertical++; if (h < 2.1 - EPS) fails.push(`${id} over ${y.id}: ${h.toFixed(2)} < 2.1`); }
  };
  for (const r of rooms) if ((lvl(r.level)?.floor ?? 0) > 0) clears(r.id, r.rect, lvl(r.level).floor);
  for (const sv of services) {
    const h = Math.min(...sv.path.map((p) => p[1])) - sv.size[1] / 2, hw = sv.size[0] / 2;
    for (let i = 0; i + 1 < sv.path.length; i++) {
      const [p, q] = [sv.path[i], sv.path[i + 1]];
      const dx = p[0] === q[0] ? hw : 0, dz = p[2] === q[2] ? hw : 0; // widen across the run
      clears(sv.id, [Math.min(p[0], q[0]) - dx, Math.min(p[2], q[2]) - dz, Math.max(p[0], q[0]) + dx, Math.max(p[2], q[2]) + dz], h);
    }
    for (const e of [sv.path[0], sv.path[sv.path.length - 1]]) { // VT5
      const [lo, hi] = [e[1] - sv.size[1] / 2, e[1] + sv.size[1] / 2];
      for (const b of arch.meta?.buildings ?? []) {
        if (!(inRect(e[0], e[2], b.footprint) && (Math.abs(e[0] - b.footprint[0]) < EPS || Math.abs(e[0] - b.footprint[2]) < EPS))) continue;
        for (const l of levels) {
          if (l.floor <= 0 || !(l.footprint ?? []).some((f) => within(f, b.footprint) && inRect(e[0], e[2], f))) continue;
          const a = Math.max(lo, l.floor), c = Math.min(hi, l.floor + l.height);
          if (a < c - EPS) info.push(`${sv.id} meets level ${l.id} of ${b.id} at ${+(a - l.floor).toFixed(2)}-${+(c - l.floor).toFixed(2)} above the floor`);
        }
      }
    }
  }
  return { fails, info, counts };
}

export const summary = ({ fails, info, counts }) =>
  `standards corridors ${counts.corridors}, doors ${counts.doors}, crawl ${counts.crawl}, stairs ${counts.stairs}, vertical ${counts.vertical}, fails ${fails.length}, info ${info.length}`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const res = standardsCheck(JSON.parse(readFileSync(process.argv[2], 'utf8')));
  for (const f of res.fails) console.log('FAIL', f);
  for (const i of res.info) console.log('INFO', i);
  console.log(summary(res));
  process.exit(res.fails.length ? 1 : 0);
}
