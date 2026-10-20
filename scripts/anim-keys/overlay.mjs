// (CT prototype G8) Pose overlays for the keyed clips (G8-WALK.md): joint points on a frame (CT points read by eye from
// a gridded frame and typed into a spec; ours projected by anim-sheet's SHEET_DUMP), the skeleton and its image-space
// angles drawn over it, and optionally ours laid semi-transparent over CT (aligned on the pelvis, scaled to the same
// stature) as a check. Never a trace: the CT points are a handful of joints placed by hand to measure angles.
//   node scripts/anim-keys/overlay.mjs <spec.json>
// spec: { out: 'dir', W: 1160, H: 800, panels: [{ name, label, img, pts: { headTop, neck, pelvis, sh, el, wr, hip, kn, an,
//   toe, hipB, knB, anB, toeB, ... } (px in img), fwd: 1 | -1 (the facing on screen), ground?: y, under?: { img, pts,
//   alpha } }] }
// Writes <out>/<name>.png per panel and <out>/angles.json (per panel: the measured angles and heights).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { launchOptions } from '../e2e-lib.mjs';

const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
mkdirSync(spec.out, { recursive: true });
const deg = (r) => (r * 180) / Math.PI;
/** Angle of the vector a->b from straight down (deg, + toward the facing). */
const fromDown = (a, b, fwd) => deg(Math.atan2((b[0] - a[0]) * fwd, b[1] - a[1]));
/** Angle of a->b from straight up (deg, + toward the facing). */
const fromUp = (a, b, fwd) => deg(Math.atan2((b[0] - a[0]) * fwd, a[1] - b[1]));
/** The bend at b (0 = straight). */
const bend = (a, b, c) => {
  const u = [a[0] - b[0], a[1] - b[1]];
  const v = [c[0] - b[0], c[1] - b[1]];
  const d = (u[0] * v[0] + u[1] * v[1]) / Math.sqrt((u[0] ** 2 + u[1] ** 2) * (v[0] ** 2 + v[1] ** 2));
  return 180 - deg(Math.acos(Math.max(-1, Math.min(1, d))));
};
const r1 = (v) => Math.round(v * 10) / 10;

export function measure(P, fwd, ground) {
  const g = ground ?? Math.max(P.toe?.[1] ?? 0, P.toeB?.[1] ?? 0, P.an?.[1] ?? 0, P.anB?.[1] ?? 0);
  const S = g - P.headTop[1];
  const h = (p) => (p ? r1(((g - p[1]) / S) * 100) : null);
  const m = {
    stature: r1(S),
    torsoPitch: r1(fromUp(P.pelvis, P.neck, fwd)),
    headTop: h(P.headTop),
    pelvisH: h(P.pelvis),
    shoulderDrop: P.sh ? r1(((P.sh[1] - P.neck[1]) / S) * 100) : null,
    armHang: P.sh && P.el ? r1(fromDown(P.sh, P.el, fwd)) : null,
    elbow: P.sh && P.el && P.wr ? r1(bend(P.sh, P.el, P.wr)) : null,
    handH: h(P.wr),
    handFwd: P.wr ? r1((((P.wr[0] - P.pelvis[0]) * fwd) / S) * 100) : null,
    knee: P.hip && P.kn && P.an ? r1(bend(P.hip, P.kn, P.an)) : null,
    kneeB: P.hipB && P.knB && P.anB ? r1(bend(P.hipB, P.knB, P.anB)) : null,
    thigh: P.hip && P.kn ? r1(fromDown(P.hip, P.kn, fwd)) : null,
    thighB: P.hipB && P.knB ? r1(fromDown(P.hipB, P.knB, fwd)) : null,
    ankle: P.kn && P.an && P.toe ? r1(bend(P.kn, P.an, P.toe) - 90) : null,
    ankleB: P.knB && P.anB && P.toeB ? r1(bend(P.knB, P.anB, P.toeB) - 90) : null,
  };
  return m;
}

const BONES = [['headTop', 'neck'], ['neck', 'pelvis'], ['neck', 'sh'], ['sh', 'el'], ['el', 'wr'], ['shB', 'elB'], ['elB', 'wrB'], ['pelvis', 'hip'], ['hip', 'kn'], ['kn', 'an'], ['an', 'toe'], ['pelvis', 'hipB'], ['hipB', 'knB'], ['knB', 'anB'], ['anB', 'toeB']];
const svg = (P, color, w) =>
  BONES.filter(([a, b]) => P[a] && P[b]).map(([a, b]) => `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`).join('') +
  Object.entries(P).map(([, p]) => `<circle cx="${p[0]}" cy="${p[1]}" r="${w * 1.2}" fill="${color}"/>`).join('');

const browser = await chromium.launch(launchOptions());
const page = await browser.newPage({ viewport: { width: spec.W ?? 1160, height: spec.H ?? 800 } });
const all = {};
for (const pn of spec.panels) {
  const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
  const m = measure(pn.pts, pn.fwd ?? 1, pn.ground);
  all[pn.name] = { ct: m };
  let under = '';
  if (pn.under) {
    // ours laid over at the same stature, pelvis on pelvis
    const U = pn.under;
    const mu = measure(U.pts, pn.fwd ?? 1, U.ground);
    all[pn.name].ours = mu;
    const k = m.stature / mu.stature;
    const tx = pn.pts.pelvis[0] - U.pts.pelvis[0] * k;
    const ty = pn.pts.pelvis[1] - U.pts.pelvis[1] * k;
    const UP = Object.fromEntries(Object.entries(U.pts).map(([n, p]) => [n, [p[0] * k + tx, p[1] * k + ty]]));
    under = `<img src="${b64(U.img)}" style="position:absolute;left:${tx}px;top:${ty}px;width:${U.W * k}px;height:${U.H * k}px;opacity:${U.alpha ?? 0.45}">` +
      `<svg style="position:absolute;left:0;top:0" width="${spec.W}" height="${spec.H}">${svg(UP, '#ff40ff', 2)}</svg>`;
  }
  const rows = Object.entries(m).filter(([, v]) => v !== null).map(([n, v]) => `${n} ${v}${all[pn.name].ours && all[pn.name].ours[n] !== null ? ` / ours ${all[pn.name].ours[n]}` : ''}`).join('<br>');
  await page.setContent(`<body style="margin:0;background:#000;position:relative;width:${spec.W}px;height:${spec.H}px;overflow:hidden">
<img src="${b64(pn.img)}" style="position:absolute;left:0;top:0;width:${spec.W}px;height:${spec.H}px">${under}
<svg style="position:absolute;left:0;top:0" width="${spec.W}" height="${spec.H}">${svg(pn.pts, '#30ff60', 3)}</svg>
<div style="position:absolute;left:6px;top:6px;font:13px monospace;color:#fff;background:#000b;padding:4px 6px">${pn.label}<br>${rows}<br><span style="color:#30ff60">CT points</span>${pn.under ? ' <span style="color:#ff40ff">ours (projected joints, scaled to the same stature)</span>' : ''}</div></body>`);
  await page.waitForTimeout(50);
  await page.screenshot({ path: path.join(spec.out, `${pn.name}.png`) });
}
writeFileSync(path.join(spec.out, 'angles.json'), JSON.stringify(all, null, 1));
console.log(JSON.stringify(all, null, 1));
await browser.close();
