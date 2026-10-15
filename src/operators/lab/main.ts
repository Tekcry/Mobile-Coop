/** Operator Lab page: wires operators.html to the Lab scene and exposes `window.__lab` for the sheet script. Dev-only. */
import { Lab, type DebugView } from './lab';
import { CLOSEUPS, LIGHT_RIGS, POSES, PRESETS, TURNAROUND } from './labData';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const lab = new Lab($<HTMLCanvasElement>('c'));
(window as unknown as { __lab: Lab; __labReady: Promise<void> }).__lab = lab;

const fill = (id: string, rows: readonly { id: string; label: string }[], value: string): void => {
  const el = $<HTMLSelectElement>(id);
  el.innerHTML = rows.map((r) => `<option value="${r.id}">${r.label}</option>`).join('');
  el.value = value;
};

function lodRows(): { id: string; label: string }[] {
  const names: Record<string, string> = { hero: 'Hero (LOD 0)', lod1: 'In-game LOD 1', lod2: 'In-game LOD 2', phone: 'Phone' };
  return ['hero', 'lod1', 'lod2', 'phone'].map((l) => ({ id: l, label: lab.lods.includes(l) ? names[l]! : `${names[l]} (built in step 10)` }));
}

const params = new URLSearchParams(location.search);
if (params.has('clean')) document.body.classList.add('clean');
const ready = lab.init().then(() => {
  fill('operator', ['wren', 'moth'].map((id) => ({ id, label: lab.available.includes(id) ? id : `${id} (not built yet)` })), lab.state.operator);
  fill('lod', lodRows(), lab.state.lod);
  fill('preset', PRESETS, lab.state.preset);
  fill('rig', LIGHT_RIGS, lab.state.rig);
  fill('pose', POSES, lab.state.pose);
  fill('closeup', [{ id: '', label: 'Close-up...' }, ...CLOSEUPS], '');
  lab.turnaround(TURNAROUND[1]!);
  if (!lab.available.length) $('msg').textContent = 'No built glTF. Run npm run operators:build first.';
  setInterval(() => {
    const s = lab.stats();
    $('stats').textContent = `${s.operator} ${s.lod}\n${s.triangles.toLocaleString()} triangles, ${s.meshes} meshes, ${s.materials} materials\ntextures: ${s.textures}\n${lab.engine.getFps().toFixed(0)} fps`;
  }, 500);
});
(window as unknown as { __labReady: Promise<void> }).__labReady = ready;

const on = (id: string, ev: string, fn: (el: HTMLInputElement & HTMLSelectElement) => void): void => {
  const el = $<HTMLInputElement & HTMLSelectElement>(id);
  el.addEventListener(ev, () => fn(el));
};
on('operator', 'change', (e) => {
  if (lab.available.includes(e.value)) void lab.load(e.value).then(() => { lab.apply(); fill('lod', lodRows(), lab.state.lod); });
});
on('lod', 'change', (e) => {
  if (!lab.lods.includes(e.value)) { e.value = lab.state.lod; return; }
  lab.state.lod = e.value;
  void lab.load(lab.state.operator).then(() => lab.apply());
});
on('preset', 'change', (e) => lab.setPreset(e.value));
on('rig', 'change', (e) => lab.setRig(e.value));
on('pose', 'change', (e) => lab.setPose(e.value));
on('debug', 'change', (e) => lab.setDebug(e.value as DebugView));
on('turntable', 'change', (e) => { lab.state.turntable = e.checked; });
on('ortho', 'change', (e) => lab.setOrtho(e.checked));
on('silhouette', 'change', (e) => lab.setSilhouette(e.checked));
on('gameRig', 'change', (e) => {
  lab.setGameRig(e.checked);
  lab.setOffsets(e.checked ? -0.6 : 0, e.checked ? 0.6 : 0);
});
on('closeup', 'change', (e) => { if (e.value) lab.closeUp(e.value); });
for (const b of document.querySelectorAll<HTMLButtonElement>('button[data-view]')) {
  b.addEventListener('click', () => lab.turnaround(TURNAROUND.find((t) => t.id === b.dataset.view)!));
}
