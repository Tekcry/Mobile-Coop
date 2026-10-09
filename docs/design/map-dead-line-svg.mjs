// Dead Line: the plan as an SVG, one panel per level (Basement, Ground, Upper, Roof), drawn from map-dead-line.json and the context.
import { hyp, guardAt } from './map-dead-line-core.mjs';

const S = 8; // px per metre
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const KIND = { outdoor: '#dde6d0', main: '#ececec', minor: '#e5e0d2', corr: '#f1ede0', catwalk: '#cfd6df', roof: '#dfe3ea', tunnel: '#d4cdc2', duct: '#bdb6a8', ledge: '#c4c4c4', void: '#8fa3b8' };
const GCOL = { G1: '#d9534f', G2: '#e8a33d', G3: '#c98a22', G4: '#8e5bd8', G5: '#2e7d32', G6: '#111111', G7: '#00838f', G8: '#6d4c41', G9: '#c2185b', G10: '#1565c0', G11: '#ef6c00', G12: '#4e342e', G13: '#00897b', G14: '#6a1b9a' };
const RCOL = { M: '#1f5fbf', R6A: '#e0701a', 'S-CHUTE': '#2ca02c', 'S-V': '#9467bd', 'S-LEDGE': '#8c564b', 'S-CULVERT': '#17becf', 'O1-B': '#7f7f7f', 'O2-C': '#bcbd22', 'EX-1': '#d62728', 'EX-2': '#e377c2', 'EX-3': '#ff7f0e' };

export function buildSvg(R) {
  const D = R.D, ctx = R.ctx, W = ctx.W;
  const [X0, X1] = D.meta.footprint.x, [Z0, Z1] = D.meta.footprint.z;
  const M = 40;
  const PW = (X1 - X0) * S, PH = (Z1 - Z0) * S;
  const GAP = 56, HEAD = 30;
  const panels = [{ lv: 'B', name: 'Basement and service tunnel (B, y -3.3)' }, { lv: 'G', name: 'Ground (G, y 0), with the trench and culvert at T (-1.4)' }, { lv: 'U', name: 'Upper floor and the hall catwalk (U, y 3.3)' }, { lv: 'R', name: 'Roof (R, y 6.6)' }];
  const Wd = M * 2 + PW;
  const LEG = 250;
  const Hd = M + panels.length * (PH + GAP + HEAD) + LEG;
  let svg = '';
  const add = (s) => { svg += s + '\n'; };
  const ox = (x) => M + (x - X0) * S;
  const oy = (pi, z) => M + HEAD + pi * (PH + GAP + HEAD) + (Z1 - z) * S;
  add(`<svg xmlns="http://www.w3.org/2000/svg" width="${Wd}" height="${Hd}" viewBox="0 0 ${Wd} ${Hd}" font-family="Segoe UI, Arial, sans-serif">`);
  add(`<rect width="${Wd}" height="${Hd}" fill="#fafafa"/>`);
  add(`<text x="${M}" y="26" font-size="18" font-weight="bold" fill="#222">Kestrel Exchange campus, Mission 1 DEAD LINE: plan (x east, z north, 0.5 m grid, 8 px per metre)</text>`);
  const lamps = D.lamps;
  panels.forEach((P, pi) => {
    const lv = P.lv;
    const yy0 = M + HEAD + pi * (PH + GAP + HEAD);
    add(`<text x="${M}" y="${yy0 - 8}" font-size="13" font-weight="bold" fill="#333">${esc(P.name)}</text>`);
    add(`<rect x="${M}" y="${yy0}" width="${PW}" height="${PH}" fill="#ffffff" stroke="#999"/>`);
    // grid every 10 m
    for (let x = Math.ceil(X0 / 10) * 10; x <= X1; x += 10) { add(`<line x1="${ox(x)}" y1="${yy0}" x2="${ox(x)}" y2="${yy0 + PH}" stroke="#eee"/>`); add(`<text x="${ox(x) + 2}" y="${yy0 + 10}" font-size="8" fill="#aaa">${x}</text>`); }
    for (let z = Math.ceil(Z0 / 10) * 10; z <= Z1; z += 10) { add(`<line x1="${M}" y1="${oy(pi, z)}" x2="${M + PW}" y2="${oy(pi, z)}" stroke="#eee"/>`); add(`<text x="${M + 2}" y="${oy(pi, z) - 2}" font-size="8" fill="#aaa">${z}</text>`); }
    // spaces (level, plus the trench and culvert on the G panel, drawn dashed)
    const here = D.spaces.filter((s) => s.level === lv || (lv === 'G' && s.level === 'T'));
    for (const s of here) {
      const [a, b, c, d] = s.rect;
      const isT = s.level === 'T';
      add(`<rect x="${ox(a)}" y="${oy(pi, d)}" width="${(c - a) * S}" height="${(d - b) * S}" fill="${KIND[s.kind] || '#eee'}" ${isT ? 'fill-opacity="0.7" stroke="#6a5a3a" stroke-dasharray="3 2"' : 'stroke="none"'}/>`);
    }
    // blocks
    for (const bl of D.blocks.filter((q) => q.level === lv)) {
      const [a, b, c, d] = bl.rect;
      add(`<rect x="${ox(a)}" y="${oy(pi, d)}" width="${(c - a) * S}" height="${(d - b) * S}" fill="${bl.kind === 'rail' ? 'none' : '#a9a9a9'}" stroke="#666" ${bl.kind === 'rail' ? 'stroke-dasharray="2 2"' : ''}/>`);
    }
    // lamp pools (radius where the floor light first drops under the shadow threshold is not drawn: the full range is shown faintly)
    for (const l of lamps.filter((q) => q.level === lv || (q.also || []).includes(lv))) add(`<circle cx="${ox(l.x)}" cy="${oy(pi, l.z)}" r="${l.r * S * 0.5}" fill="${l.circuit === 'E' ? '#8fd3ff' : '#ffe066'}" fill-opacity="0.10"/>`);
    // walls
    for (const w of W.moveWalls[lv]) add(`<line x1="${ox(w.x0)}" y1="${oy(pi, w.z0)}" x2="${ox(w.x1)}" y2="${oy(pi, w.z1)}" stroke="#222" stroke-width="2.2"/>`);
    // openings: doors (orange; locked red), windows and rails (blue dashed), wide (green)
    for (const o of D.openings.filter((q) => q.level === lv)) {
      const half = o.w / 2;
      const [x0, z0, x1, z1] = o.axis === 'z' ? [o.c - half, o.at, o.c + half, o.at] : [o.at, o.c - half, o.at, o.c + half];
      const col = o.type === 'window' ? '#2a7de1' : o.type === 'rail' ? '#6aa6e8' : o.type === 'sealed' ? '#555' : o.lock ? '#d62728' : (o.type === 'wide' || o.type === 'open') ? '#59b36b' : '#ee8a1c';
      add(`<line x1="${ox(x0)}" y1="${oy(pi, z0)}" x2="${ox(x1)}" y2="${oy(pi, z1)}" stroke="${col}" stroke-width="3.5" ${o.type === 'window' || o.type === 'rail' ? 'stroke-dasharray="3 2"' : ''}/>`);
    }
    // space labels
    for (const s of here) {
      const [a, b, c, d] = s.rect;
      const w = (c - a), h = (d - b);
      if (w < 3 || h < 1.2) continue;
      const fs = Math.max(7, Math.min(10, w * S / (s.name.length * 0.62)));
      add(`<text x="${ox((a + c) / 2)}" y="${oy(pi, (b + d) / 2) + 3}" text-anchor="middle" font-size="${fs.toFixed(1)}" fill="#555">${esc(s.name)}</text>`);
    }
    // links: stairs, ladders, drops, beam, crawls
    for (const l of D.links) {
      for (const [e, o] of [[l.a, l.b], [l.b, l.a]]) {
        if (e[0] !== lv) continue;
        const col = l.kind.startsWith('stairs') ? '#a05a00' : l.kind === 'ladder' ? '#7a3db0' : l.kind === 'drop' ? '#c0392b' : '#2e7d32';
        add(`<g><rect x="${ox(e[1]) - 4}" y="${oy(pi, e[2]) - 4}" width="8" height="8" fill="${col}" fill-opacity="0.9" stroke="#fff" stroke-width="0.8"/><text x="${ox(e[1]) + 5}" y="${oy(pi, e[2]) - 5}" font-size="8" fill="${col}" font-weight="bold">${esc(l.id)}</text></g>`);
        break;
      }
      if (l.kind === 'beam' && l.a[0] === lv) add(`<line x1="${ox(l.a[1])}" y1="${oy(pi, l.a[2])}" x2="${ox(l.b[1])}" y2="${oy(pi, l.b[2])}" stroke="#e0701a" stroke-width="3"/>`);
      if ((l.kind === 'crawl' || l.kind === 'ledge') && l.a[0] === lv && l.path) add(`<polyline points="${l.path.map((p) => `${ox(p[0])},${oy(pi, p[1])}`).join(' ')}" fill="none" stroke="#6a5a3a" stroke-width="2" stroke-dasharray="4 2"/>`);
    }
    // hides and vantages
    for (const h of D.hides.filter((q) => q.level === lv)) add(`<rect x="${ox(h.rect[0])}" y="${oy(pi, h.rect[3])}" width="${(h.rect[2] - h.rect[0]) * S}" height="${(h.rect[3] - h.rect[1]) * S}" fill="#4caf50" fill-opacity="${h.body ? 0.55 : 0.3}" stroke="#2e7d32" stroke-width="0.8"/>`);
    for (const v of D.vantage.filter((q) => q.level === lv)) add(`<polygon points="${ox(v.x)},${oy(pi, v.z) - 5} ${ox(v.x) - 4.5},${oy(pi, v.z) + 3.5} ${ox(v.x) + 4.5},${oy(pi, v.z) + 3.5}" fill="#1565c0" stroke="#fff" stroke-width="0.6"/><text x="${ox(v.x) + 5}" y="${oy(pi, v.z) + 9}" font-size="7" fill="#1565c0">${esc(v.id)}</text>`);
    // routes (drawn from the timed segments)
    for (const [rid, col] of Object.entries(RCOL)) {
      const rt = ctx.routes[rid];
      if (!rt || rt.error) continue;
      const pts = [];
      let cur = [];
      for (const s of rt.segs) {
        if (s.link) { if (cur.length > 1) pts.push(cur); cur = []; continue; }
        if (s.hold) continue;
        if (s.lv !== lv) { if (cur.length > 1) pts.push(cur); cur = []; continue; }
        if (!cur.length) cur.push(s.a);
        cur.push(s.b);
      }
      if (cur.length > 1) pts.push(cur);
      for (const pl of pts) add(`<polyline points="${pl.map((p) => `${ox(p[0]).toFixed(1)},${oy(pi, p[1]).toFixed(1)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="${rid === 'M' ? 3 : 1.6}" stroke-opacity="${rid === 'M' ? 0.85 : 0.75}" ${rid === 'M' ? '' : 'stroke-dasharray="5 3"'} stroke-linejoin="round"/>`);
    }
    // guards: loop path and waypoints with facing
    for (const g of ctx.guards.filter((q) => q.level === lv)) {
      const tl = ctx.TL[g.id];
      const col = GCOL[g.id] || '#000';
      for (const seg of tl.segs) if (seg.kind === 'move') add(`<polyline points="${seg.poly.map((p) => `${ox(p[0]).toFixed(1)},${oy(pi, p[1]).toFixed(1)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="1.4" stroke-opacity="0.8"/>`);
      g.wps.forEach((w, k) => {
        const len = 22 * (g.arch === 'sniper' ? 1 : 0.9);
        add(`<line x1="${ox(w.x)}" y1="${oy(pi, w.z)}" x2="${ox(w.x) + w.face[0] * len}" y2="${oy(pi, w.z) - w.face[1] * len}" stroke="${col}" stroke-width="1.2"/>`);
        add(`<circle cx="${ox(w.x)}" cy="${oy(pi, w.z)}" r="3.2" fill="${col}" stroke="#fff" stroke-width="0.8"/>`);
      });
      const w0 = g.wps[0];
      add(`<text x="${ox(w0.x) + 4}" y="${oy(pi, w0.z) - 4}" font-size="9" font-weight="bold" fill="${col}">${g.id}</text>`);
    }
    // lamps
    for (const l of lamps.filter((q) => q.level === lv)) add(`<circle cx="${ox(l.x)}" cy="${oy(pi, l.z)}" r="2.8" fill="${l.circuit === 'E' ? '#ffffff' : '#ffc400'}" stroke="${l.circuit === 'E' ? '#1976d2' : '#9a6b00'}" stroke-width="1"/>`);
    // switches, panels
    for (const c of D.circuits.filter((q) => q.switch.level === lv)) add(`<rect x="${ox(c.switch.x) - 2.5}" y="${oy(pi, c.switch.z) - 2.5}" width="5" height="5" fill="#8d6e00"/><text x="${ox(c.switch.x) + 4}" y="${oy(pi, c.switch.z) + 3}" font-size="7" fill="#8d6e00">${esc(c.switch.id)}</text>`);
    for (const p of D.panels.filter((q) => q.level === lv)) add(`<rect x="${ox(p.x) - 3}" y="${oy(pi, p.z) - 3}" width="6" height="6" fill="#d62728"/><text x="${ox(p.x) + 5}" y="${oy(pi, p.z) + 3}" font-size="8" fill="#d62728" font-weight="bold">${esc(p.id)}</text>`);
    // objectives, spawns, exits
    for (const o of D.objectives.filter((q) => q.level === lv)) add(`<text x="${ox(o.x)}" y="${oy(pi, o.z) + 5}" text-anchor="middle" font-size="15" fill="#b8860b" stroke="#fff" stroke-width="0.6">&#9733;</text><text x="${ox(o.x) + 8}" y="${oy(pi, o.z) - 4}" font-size="8" fill="#7a5a00" font-weight="bold">${esc(o.id)}</text>`);
    if (lv === 'G') {
      for (const s of D.spawns) add(`<circle cx="${ox(s.x)}" cy="${oy(pi, s.z)}" r="3" fill="#00bcd4" stroke="#fff"/>`);
      add(`<text x="${ox(D.spawns[0].x) + 6}" y="${oy(pi, D.spawns[0].z) + 12}" font-size="8" fill="#00838f">spawns S1-S4</text>`);
      for (const e of D.extraction) add(`<circle cx="${ox(e.x)}" cy="${oy(pi, e.z)}" r="${e.r * S}" fill="#2e7d32" fill-opacity="0.15" stroke="#2e7d32" stroke-dasharray="3 2"/><text x="${ox(e.x)}" y="${oy(pi, e.z) + 3}" text-anchor="middle" font-size="9" fill="#1b5e20" font-weight="bold">${esc(e.id)}</text>`);
    }
    // encounters (numbered)
    for (const e of D.encounters.filter((q) => q.level === lv)) {
      add(`<circle cx="${ox(e.x)}" cy="${oy(pi, e.z)}" r="7" fill="${e.main ? '#1f5fbf' : '#7a7a7a'}" fill-opacity="0.9" stroke="#fff" stroke-width="1"/><text x="${ox(e.x)}" y="${oy(pi, e.z) + 2.8}" text-anchor="middle" font-size="7" fill="#fff" font-weight="bold">${esc(e.id.replace('E', ''))}</text>`);
    }
    // regroup points
    for (const r of (D.regroup || []).filter((q) => q.level === lv)) add(`<rect x="${ox(r.x) - 4}" y="${oy(pi, r.z) - 4}" width="8" height="8" fill="none" stroke="#00897b" stroke-width="1.6" transform="rotate(45 ${ox(r.x)} ${oy(pi, r.z)})"/><text x="${ox(r.x) + 6}" y="${oy(pi, r.z) + 11}" font-size="7" fill="#00695c">${esc(r.id)}</text>`);
  });
  // legend
  const ly = M + panels.length * (PH + GAP + HEAD) + 10;
  const items = [
    ['<rect width="14" height="8" fill="#a9a9a9" stroke="#666"/>', 'block (solid)'], ['<line x2="14" y1="4" y2="4" stroke="#222" stroke-width="2.2"/>', 'wall'], ['<line x2="14" y1="4" y2="4" stroke="#ee8a1c" stroke-width="3.5"/>', 'door'], ['<line x2="14" y1="4" y2="4" stroke="#d62728" stroke-width="3.5"/>', 'locked door or gate'],
    ['<line x2="14" y1="4" y2="4" stroke="#59b36b" stroke-width="3.5"/>', 'wide opening'], ['<line x2="14" y1="4" y2="4" stroke="#2a7de1" stroke-width="3.5" stroke-dasharray="3 2"/>', 'window or rail'], ['<circle cx="7" cy="4" r="3" fill="#ffc400" stroke="#9a6b00"/>', 'lamp (switchable)'], ['<circle cx="7" cy="4" r="3" fill="#fff" stroke="#1976d2"/>', 'emergency lamp'],
    ['<rect width="14" height="8" fill="#4caf50" fill-opacity="0.4" stroke="#2e7d32"/>', 'hide spot (darker: body spot)'], ['<polygon points="7,0 2,8 12,8" fill="#1565c0"/>', 'vantage point'], ['<rect width="8" height="8" fill="#d62728"/>', 'alarm panel'], ['<rect width="8" height="8" fill="#8d6e00"/>', 'light switch'],
    ['<circle cx="7" cy="4" r="6" fill="#1f5fbf"/>', 'encounter on the main route'], ['<circle cx="7" cy="4" r="6" fill="#7a7a7a"/>', 'encounter off the main route'], ['<text x="0" y="9" font-size="14" fill="#b8860b">&#9733;</text>', 'objective'], ['<rect width="8" height="8" fill="none" stroke="#00897b" stroke-width="1.6" transform="rotate(45 7 4)"/>', 'regroup point']
  ];
  items.forEach((it, i) => add(`<g transform="translate(${M + (i % 4) * 300},${ly + Math.floor(i / 4) * 20})">${it[0]}<text x="22" y="9" font-size="10" fill="#333">${esc(it[1])}</text></g>`));
  const ry = ly + 100;
  add(`<text x="${M}" y="${ry}" font-size="11" font-weight="bold" fill="#333">Routes (solid blue = main route M, dashed = alternatives) and guards (loop line, waypoint dots, facing ticks)</text>`);
  Object.entries(RCOL).forEach(([k, col], i) => add(`<g transform="translate(${M + (i % 6) * 190},${ry + 10 + Math.floor(i / 6) * 16})"><line x2="22" y1="4" y2="4" stroke="${col}" stroke-width="${k === 'M' ? 3 : 1.6}" ${k === 'M' ? '' : 'stroke-dasharray="5 3"'}/><text x="28" y="8" font-size="10" fill="#333">${esc(k)}</text></g>`));
  Object.entries(GCOL).forEach(([k, col], i) => { if (!ctx.guards.find((g) => g.id === k)) return; add(`<g transform="translate(${M + (i % 14) * 80},${ry + 50})"><circle cx="5" cy="4" r="4" fill="${col}"/><text x="14" y="8" font-size="10" fill="#333">${k}</text></g>`); });
  add('</svg>');
  return { svg, W: Wd, H: Hd };
}
