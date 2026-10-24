// Plan SVGs of a map, headless (Node, no browser): builds the map's data with its LevelBuilder (loaded through Vite's
// SSR module loader, the same transform the unit tests use) and writes one top-down SVG per storey.
//
// Usage: node scripts/plan-svg.mjs [mapId] [--floors 8.8,4.4,0] [--bounds x0,z0,x1,z1] [--out dir] [--prefix name]
//        (defaults: bunker, floors 16,6,0, the whole map, test-results/training, plan)
// Output: <out>/<prefix>-<y>.svg (one per storey floor y). --bounds keeps the pieces and anchors whose centre lies in
// the box and frames the plan to it (a section crop for a sign-off page).
//
// Scale 1 m = 10 px, a 6 m grid, north (+z) up. Boxes are drawn by height over their storey floor (darker = taller)
// and labelled with that height when there is room; overhead pieces (roof slabs) are left out. Anchors: ladders (L),
// drainpipes (P), horizontal pipes (blue lines), ledges (red: hang only dashed), doors (green; locked red), windows
// (cyan), fences / glass (dashed grey), course devices (stars), spawns and debug points (circles).
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const argv = process.argv.slice(2);
const opt = (k) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : undefined;
};
const mapId = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'bunker';
const OUT = resolve(opt('--out') ?? 'test-results/training');
const PREFIX = opt('--prefix') ?? 'plan';
const BOUNDS = opt('--bounds')?.split(',').map(Number);
const inB = (x, z) => !BOUNDS || (x >= BOUNDS[0] && x <= BOUNDS[2] && z >= BOUNDS[1] && z <= BOUNDS[3]);
const S = 10;
const GRID = 6;
// storey floors (m): a piece belongs to the highest floor at or below its base + 2 m (pits and trenches stay with it)
const FLOORS = (opt('--floors')?.split(',').map(Number) ?? [16, 6, 0]).sort((a, c) => c - a);

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { LevelBuilder } = await server.ssrLoadModule('/src/world/levelBuilder.ts');
  const { getMap } = await server.ssrLoadModule('/src/world/maps/index.ts');
  const def = getMap(mapId);
  if (def.id !== mapId) throw new Error(`no map '${mapId}'`);
  const b = new LevelBuilder();
  const lay = def.build(b, 0);
  mkdirSync(OUT, { recursive: true });
  const storeyOf = (y) => FLOORS.find((f) => y >= f - 2) ?? FLOORS[FLOORS.length - 1];
  const written = [];
  for (const f of FLOORS) {
    const boxes = b.boxes.filter((p) => !p.overhead && storeyOf(p.c[1] - p.s[1] / 2) === f && p.s[1] > 0.03 && inB(p.c[0], p.c[2]));
    if (!boxes.length) continue;
    const near = (y) => storeyOf(y) === f;
    // extent: the storey's pieces plus 3 m
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of boxes) {
      const c = Math.abs(Math.cos(p.yaw));
      const s = Math.abs(Math.sin(p.yaw));
      const rx = (c * p.s[0] + s * p.s[2]) / 2;
      const rz = (s * p.s[0] + c * p.s[2]) / 2;
      minX = Math.min(minX, p.c[0] - rx); maxX = Math.max(maxX, p.c[0] + rx);
      minZ = Math.min(minZ, p.c[2] - rz); maxZ = Math.max(maxZ, p.c[2] + rz);
    }
    minX = Math.floor((minX - 3) / GRID) * GRID; maxX = Math.ceil((maxX + 3) / GRID) * GRID;
    minZ = Math.floor((minZ - 3) / GRID) * GRID; maxZ = Math.ceil((maxZ + 3) / GRID) * GRID;
    if (BOUNDS) [minX, minZ, maxX, maxZ] = BOUNDS;
    const W = (maxX - minX) * S;
    const H = (maxZ - minZ) * S;
    const px = (x) => ((x - minX) * S).toFixed(1);
    const pz = (z) => ((maxZ - z) * S).toFixed(1);
    const o = [];
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="monospace" font-size="9">`);
    o.push(`<rect width="${W}" height="${H}" fill="#f4f2ec"/>`);
    for (let x = minX; x <= maxX; x += GRID) o.push(`<line x1="${px(x)}" y1="0" x2="${px(x)}" y2="${H}" stroke="#d8d4c8" stroke-width="1"/><text x="${px(x) - -2}" y="10" fill="#a09a8a">${x}</text>`);
    for (let z = minZ; z <= maxZ; z += GRID) o.push(`<line x1="0" y1="${pz(z)}" x2="${W}" y2="${pz(z)}" stroke="#d8d4c8" stroke-width="1"/><text x="2" y="${pz(z) - 2}" fill="#a09a8a">${z}</text>`);
    // pieces: lowest first so tall ones sit on top
    const sorted = [...boxes].sort((p, q) => p.c[1] + p.s[1] / 2 - (q.c[1] + q.s[1] / 2));
    for (const p of sorted) {
      const top = p.c[1] + p.s[1] / 2 - f;
      const shade = Math.max(40, Math.min(225, Math.round(225 - top * 16)));
      const fill = p.collide ? `rgb(${shade},${shade},${shade + 8})` : 'none';
      const deg = (-p.yaw * 180) / Math.PI;
      o.push(`<rect x="${(-p.s[0] / 2) * S}" y="${(-p.s[2] / 2) * S}" width="${p.s[0] * S}" height="${p.s[2] * S}" fill="${fill}" fill-opacity="0.85" stroke="${p.collide ? '#333' : '#999'}" stroke-width="0.6" transform="translate(${px(p.c[0])} ${pz(p.c[2])}) rotate(${deg.toFixed(2)})"/>`);
      if (p.collide && Math.max(p.s[0], p.s[2]) >= 1.5 && Math.abs(top) > 0.05 && top < 11.9) o.push(`<text x="${px(p.c[0])}" y="${pz(p.c[2])}" text-anchor="middle" fill="#7a1010">${top.toFixed(1)}</text>`);
    }
    const A = b.anchors;
    const line = (a, e, stroke, w, dash = '') => o.push(`<line x1="${px(a.x)}" y1="${pz(a.z)}" x2="${px(e.x)}" y2="${pz(e.z)}" stroke="${stroke}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`);
    const label = (x, z, t, fill) => o.push(`<text x="${px(x)}" y="${pz(z)}" fill="${fill}" font-weight="bold">${t}</text>`);
    for (const l of A.ledges) if (near(l.top - 0.5)) line(l.a, l.b, '#d02020', 2, l.canClimbUp ? '' : '3 2');
    for (const p of A.all) {
      if (p.kind === 'ladder' && near(p.base.y)) { line(p.base, p.top, '#7a4a10', 3); label(p.base.x + 0.3, p.base.z, `L ${(p.top.y - p.base.y).toFixed(1)}`, '#7a4a10'); }
      else if (p.kind === 'pipeV' && near(p.base.y)) { o.push(`<circle cx="${px(p.base.x)}" cy="${pz(p.base.z)}" r="3" fill="#2050c0"/>`); label(p.base.x + 0.3, p.base.z, `P ${(p.top.y - p.base.y).toFixed(1)}`, '#2050c0'); }
      else if (p.kind === 'pipeH' && near(p.a.y - 3)) { line(p.a, p.b, '#2050c0', 2); label((p.a.x + p.b.x) / 2, (p.a.z + p.b.z) / 2 - 0.6, `pipe ${(p.a.y - f).toFixed(1)}`, '#2050c0'); }
      else if (p.kind === 'door' && near(p.hinge.y)) {
        const e = { x: p.hinge.x + Math.sin(p.yaw) * p.width, z: p.hinge.z + Math.cos(p.yaw) * p.width };
        line(p.hinge, e, p.locked ? '#c00000' : '#10a040', 4);
      } else if (p.kind === 'window' && near(p.c.y - 1.5)) {
        // the opening runs across the window's facing (yaw 0: along x)
        const dx = Math.cos(p.yaw) * p.w / 2;
        const dz = -Math.sin(p.yaw) * p.w / 2;
        line({ x: p.c.x - dx, z: p.c.z - dz }, { x: p.c.x + dx, z: p.c.z + dz }, '#00a0c0', 4);
        label(p.c.x + 0.4, p.c.z, p.open ? 'win open' : 'win glazed', '#007090');
      } else if (p.kind === 'fence' && near(p.a.y)) line(p.a, p.b, '#7b8288', 2, '6 3');
    }
    const devs = lay.course?.devices ?? {};
    for (const [id, d] of Object.entries(devs)) {
      if (!near(d.y)) continue;
      o.push(`<polygon points="${px(d.x)},${pz(d.z) - 5} ${px(d.x) - -4},${pz(d.z) - -3} ${px(d.x) - 4},${pz(d.z) - -3}" fill="#e08000"/>`);
      label(d.x + 0.5, d.z - 0.3, id, '#a05000');
    }
    for (const s of lay.playerSpawns) if (near(s.pos.y)) o.push(`<circle cx="${px(s.pos.x)}" cy="${pz(s.pos.z)}" r="4" fill="#20a020"/>`);
    for (const d of lay.debugPoints ?? []) if (near(d.pos.y)) { o.push(`<circle cx="${px(d.pos.x)}" cy="${pz(d.pos.z)}" r="5" fill="none" stroke="#8020a0" stroke-width="2"/>`); label(d.pos.x + 0.6, d.pos.z + 0.6, d.id, '#8020a0'); }
    o.push(`<text x="${W - 4}" y="${H - 4}" text-anchor="end" font-size="12" fill="#333">${def.name} - storey y ${f} - 1 m = ${S} px, grid ${GRID} m, north up</text>`);
    // scale bar (10 m) and north arrow, bottom left
    o.push(`<rect x="8" y="${H - 18}" width="${10 * S}" height="5" fill="#333"/><text x="8" y="${H - 22}" fill="#333" font-size="11">10 m</text>`);
    o.push(`<polygon points="${10 * S + 30},${H - 34} ${10 * S + 24},${H - 14} ${10 * S + 36},${H - 14}" fill="#333"/><text x="${10 * S + 26}" y="${H - 38}" fill="#333" font-size="11">N</text>`);
    o.push('</svg>');
    const file = resolve(OUT, `${PREFIX}-${f}.svg`);
    writeFileSync(file, o.join('\n'));
    written.push(`${file} (${boxes.length} pieces)`);
  }
  console.log(`plan-svg: ${mapId}: ${written.length} storey(s)\n  ${written.join('\n  ')}`);
} finally {
  await server.close();
}
