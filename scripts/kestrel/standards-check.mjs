// Shared standards check (Michael, 2026-10-11; handover Notes "P03B Part 2").
// standardsCheck(arch) -> { fails, info, counts }. CLI: node scripts/kestrel/standards-check.mjs <arch.json>
// The vertical test (anything crossing a floor clears that floor's height or is listed) is added in 2c.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WALL = 0.3; // interior wall thickness (RULES 6)
const short = (r) => Math.min(r[2] - r[0], r[3] - r[1]);
const EPS = 1e-6;

export function standardsCheck(arch) {
  const fails = [], info = [];
  const counts = { corridors: 0, doors: 0, crawl: 0, stairs: 0 };
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
    const h = r.ceiling > 0 ? r.ceiling : lvl(r.level)?.height ?? 0;
    if (h < 1.5 - EPS) fails.push(`crawl ${r.id}: clear height ${h} < 1.5`);
    const clear = short(r.rect) - WALL;
    if (clear < 1.2 - EPS) fails.push(`crawl ${r.id}: clear short side ${clear.toFixed(2)} < 1.2`);
  }

  // Stairs: width >= 1.3 (fire) or 1.85 (main); levels exist (scale-sheet l.40; handover Decisions "Main stair")
  for (const s of arch.stairs ?? []) {
    counts.stairs++;
    const min = s.kind === 'fire' ? 1.3 : s.kind === 'main' ? 1.85 : 0;
    if (s.width < min - EPS) fails.push(`stair ${s.id}: width ${s.width} < ${min} (${s.kind})`);
    if (!lvl(s.from) || !lvl(s.to)) fails.push(`stair ${s.id}: missing level at from ${s.from} or to ${s.to}`);
  }
  return { fails, info, counts };
}

export const summary = ({ fails, info, counts }) =>
  `standards corridors ${counts.corridors}, doors ${counts.doors}, crawl ${counts.crawl}, stairs ${counts.stairs}, fails ${fails.length}, info ${info.length}`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const res = standardsCheck(JSON.parse(readFileSync(process.argv[2], 'utf8')));
  for (const f of res.fails) console.log('FAIL', f);
  for (const i of res.info) console.log('INFO', i);
  console.log(summary(res));
  process.exit(res.fails.length ? 1 : 0);
}
