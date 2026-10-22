// (mocap-trial) Stick-figure contact sheets of the intermediates, without the game: per slot a side view and a front
// view (root frame) of 8 frames across the clip, plus a top view of the root path and the planted feet.
//   node scripts/mocap/sheets.mjs [slot ...] [--png]   -> build/mocap/sheets/<slot>.svg (and .png: headless Chromium
//                                                         through the installed playwright-core; nothing new installed)
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT } from './retarget.mjs';

const SHEETS = path.join(OUT, 'sheets');
const COLS = 8;
const CELL = 150; // px per cell (side / front)
const PXM = 78; // px per metre

const LEFT = new Set(['shL', 'elL', 'wrL', 'handL', 'hipL', 'knL', 'anL', 'toeL']);
const RIGHT = new Set(['shR', 'elR', 'wrR', 'handR', 'hipR', 'knR', 'anR', 'toeR']);
const col = (name) => (LEFT.has(name) ? '#2a6fdb' : RIGHT.has(name) ? '#d9452b' : '#333');

function figure(d, k, view, ox, oy) {
  const P = d.pos[k];
  const J = d.joints;
  const idx = Object.fromEntries(J.map((n, i) => [n, i]));
  // side: z to the right, y up; front: looking at her face, her right (+X) on the viewer's left
  const proj = (p) => (view === 'side' ? [ox + p[2] * PXM, oy - p[1] * PXM] : [ox - p[0] * PXM, oy - p[1] * PXM]);
  const out = [];
  // draw the far side first
  const order = view === 'side' ? [...J].sort((a, b) => (RIGHT.has(a) ? -1 : 0) - (RIGHT.has(b) ? -1 : 0)) : J;
  for (const n of order) {
    const p = d.parents[idx[n]];
    if (!p || n === 'body' || n === 'pelvis') continue;
    const a = proj(P[idx[p]]), b = proj(P[idx[n]]);
    out.push(`<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${col(n)}" stroke-width="${RIGHT.has(n) && view === 'side' ? 2 : 2.6}" stroke-linecap="round" opacity="${RIGHT.has(n) && view === 'side' ? 0.75 : 1}"/>`);
  }
  const h = proj(P[idx.head]);
  out.push(`<circle cx="${h[0].toFixed(1)}" cy="${(h[1] - 8).toFixed(1)}" r="9" fill="none" stroke="#333" stroke-width="2"/>`);
  for (const [fi, f] of [[0, 'L'], [1, 'R']]) {
    if (!d.contact[k][fi]) continue;
    const t = proj(P[idx[`toe${f}`]]), a = proj(P[idx[`an${f}`]]);
    out.push(`<circle cx="${((t[0] + a[0]) / 2).toFixed(1)}" cy="${(oy + 3).toFixed(1)}" r="4" fill="${f === 'L' ? '#2a6fdb' : '#d9452b'}"/>`);
  }
  return out.join('');
}

export function sheetSvg(d) {
  const n = d.frames;
  const ks = Array.from({ length: COLS }, (_, i) => Math.min(n - 1, Math.round((i * (d.loop ? n : n - 1)) / (d.loop ? COLS : COLS - 1))));
  const W = COLS * CELL + 20;
  const rowH = 175;
  // top view of the root path and planted feet (world)
  const world = d.pos.map((P, k) => {
    const [x, z, yaw] = d.root[k];
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return P.map((p) => [p[0] * c + p[2] * s + x, p[1], -p[0] * s + p[2] * c + z]);
  });
  const iA = { L: d.joints.indexOf('anL'), R: d.joints.indexOf('anR') }, iT = { L: d.joints.indexOf('toeL'), R: d.joints.indexOf('toeR') };
  const xs = [], zs = [];
  for (const w of world) for (const p of w) { xs.push(p[0]); zs.push(p[2]); }
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const topH = 230;
  const sc = Math.min((W - 60) / Math.max(0.5, maxZ - minZ), (topH - 40) / Math.max(0.5, maxX - minX));
  // top view: forward (+Z) to the right, her right (+X) down the page
  const tp = (p) => [30 + (p[2] - minZ) * sc, 20 + (p[0] - minX) * sc];
  const top = [];
  top.push(`<polyline fill="none" stroke="#888" stroke-width="1.5" stroke-dasharray="4 3" points="${d.root.map((r) => tp([r[0], 0, r[1]]).map((v) => v.toFixed(1)).join(',')).join(' ')}"/>`);
  for (const f of ['L', 'R']) {
    for (let k = 0; k < n; k++) {
      if (!d.contact[k][f === 'L' ? 0 : 1]) continue;
      const a = tp(world[k][iA[f]]), t = tp(world[k][iT[f]]);
      top.push(`<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${t[0].toFixed(1)}" y2="${t[1].toFixed(1)}" stroke="${f === 'L' ? '#2a6fdb' : '#d9452b'}" stroke-width="3" opacity="0.35" stroke-linecap="round"/>`);
    }
  }
  for (const k of ks) {
    const r = d.root[k];
    const p = tp([r[0], 0, r[1]]);
    const q = tp([r[0] + Math.sin(r[2]) * 0.25, 0, r[1] + Math.cos(r[2]) * 0.25]);
    top.push(`<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}" stroke="#333" stroke-width="1.5"/><text x="${(p[0] + 3).toFixed(1)}" y="${(p[1] - 4).toFixed(1)}" font-size="10" fill="#555">${k}</text>`);
  }
  const q = d.quality;
  const title = `${d.slot} - CMU ${d.source.take} ${d.source.seconds[0]}-${d.source.seconds[1]} s - ${d.frames} f @ ${d.fps} fps (${d.duration} s)${d.loop ? ` loop ${d.speed} m/s, ${d.cycleDistance} m per cycle` : ` segment, ${d.distance} m`}`;
  const sub = `Wren ${d.wren.height} m, scaleLeg ${d.wren.scaleLeg}; slide ${q.slideBeforeCm.med}/${q.slideBeforeCm.max} -> ${q.slideAfterCm.med}/${q.slideAfterCm.max} cm (med/max)${q.seamBefore ? `; seam before ${q.seamBefore.pelCm} cm / ${q.seamBefore.maxDeg} deg (${q.seamBefore.joint}), after step ${q.seamAfter.stepCm} cm (typical ${q.seamAfter.typicalStepCm})` : ''}. Blue left, red right; dots: planted foot.`;
  const H = 50 + rowH * 2 + topH + 20;
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Consolas, monospace">`, `<rect width="100%" height="100%" fill="#fafafa"/>`,
    `<text x="10" y="18" font-size="13" fill="#111">${title}</text>`, `<text x="10" y="36" font-size="10.5" fill="#444">${sub}</text>`];
  for (const [row, view] of [[0, 'side'], [1, 'front']]) {
    const y0 = 50 + row * rowH;
    const oy = y0 + rowH - 18;
    parts.push(`<line x1="0" y1="${oy}" x2="${W}" y2="${oy}" stroke="#bbb"/>`);
    parts.push(`<text x="4" y="${y0 + 12}" font-size="11" fill="#777">${view}</text>`);
    ks.forEach((k, i) => {
      const ox = 10 + i * CELL + CELL / 2;
      parts.push(figure(d, k, view, ox, oy));
      const ph = d.phase[k];
      parts.push(`<text x="${ox - CELL / 2 + 22}" y="${y0 + 12}" font-size="10" fill="#555">f${k}${ph === null ? '' : ` ph ${ph.toFixed(2)}`}</text>`);
    });
  }
  const ty = 50 + rowH * 2;
  parts.push(`<g transform="translate(0 ${ty})"><text x="4" y="12" font-size="11" fill="#777">top (forward right, her right down; dashed root path, ticks = heading at the sampled frames)</text>${top.join('')}</g>`);
  parts.push('</svg>');
  return parts.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const png = args.includes('--png');
  const want = args.filter((a) => !a.startsWith('--'));
  mkdirSync(SHEETS, { recursive: true });
  const slots = readdirSync(OUT).filter((f) => f.endsWith('.json') && !['analysis.json', 'index.json', 'wren-joints.json'].includes(f)).map((f) => f.slice(0, -5))
    .filter((s) => !want.length || want.includes(s));
  const written = [];
  for (const s of slots) {
    const d = JSON.parse(readFileSync(path.join(OUT, `${s}.json`), 'utf8'));
    if (d.format !== 'mocap-intermediate/1') continue;
    const file = path.join(SHEETS, `${s}.svg`);
    writeFileSync(file, sheetSvg(d));
    written.push(file);
  }
  if (png && written.length) {
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    for (const f of written) {
      const svg = readFileSync(f, 'utf8');
      const m = /width="(\d+)" height="(\d+)"/.exec(svg);
      await page.setViewportSize({ width: Number(m[1]), height: Number(m[2]) });
      await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
      await page.screenshot({ path: f.replace(/\.svg$/, '.png') });
    }
    await browser.close();
  }
  for (const f of written) console.log(f + (png ? ` (+ .png)` : ''));
}
