// (CT prototype G8) Pairs our matched-camera frames (anim-sheet SHEET_DUMP: frames + projected joints) with the CT
// points spec, panel by panel, into an overlay spec (ours semi-transparent under the CT points) and runs overlay.mjs.
//   node scripts/anim-keys/pair.mjs <ct spec.json> <our dump dir> <scenario-view prefix> <out dir> [near=R]
// Our joints by the CT names: the near arm (the camera side, `near` R or L), the front leg (its knee ahead on screen) as
// kn / an / toe, the other as knB / anB / toeB. Panels pair in order (our SHEET_PHASES in the CT panel order).
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const [ctSpec, dumpDir, prefix, out, near = 'R'] = process.argv.slice(2);
const ct = JSON.parse(readFileSync(ctSpec, 'utf8'));
const frames = JSON.parse(readFileSync(path.join(dumpDir, `${prefix}-frames.json`), 'utf8'));
const panels = ct.panels.map((pn, i) => {
  const f = frames[i];
  const j = f.j;
  const fwd = pn.fwd ?? 1;
  const lFront = (j.knL[0] - j.knR[0]) * fwd > 0;
  const F = lFront ? 'L' : 'R';
  const B = lFront ? 'R' : 'L';
  const pts = {
    headTop: j.headTop, neck: j.neck, pelvis: j.pelvis, sh: j['sh' + near], el: j['el' + near], wr: j['wr' + near],
    hip: j['hip' + F], kn: j['kn' + F], an: j['an' + F], toe: j['toe' + F], hipB: j['hip' + B], knB: j['kn' + B], anB: j['an' + B], toeB: j['toe' + B],
  };
  return { ...pn, label: `${pn.label} | ours phase ${f.phase.toFixed(3)} keyed ${f.keyW.toFixed(2)}`, under: { img: path.join(dumpDir, f.file), pts, W: f.W, H: f.H, alpha: 0.5 } };
});
const spec = { ...ct, out, panels };
const sp = path.join(out, 'spec.json');
(await import('node:fs')).mkdirSync(out, { recursive: true });
writeFileSync(sp, JSON.stringify(spec, null, 1));
const r = spawnSync(process.execPath, ['scripts/anim-keys/overlay.mjs', sp], { stdio: 'inherit', windowsHide: true });
process.exit(r.status ?? 1);
