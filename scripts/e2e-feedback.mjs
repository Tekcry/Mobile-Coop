// Playtest feedback: Settings > Feedback (new note, list, export), the pause menu's Report feedback, photo mode
// (frozen game, no HUD, free camera, take / retake / keep / cancel, more than one photo per note), IndexedDB.
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=proving', touch: false });
const G = (f, a) => page.evaluate(f, a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (sel, text) => G(([s, t]) => [...document.querySelectorAll(s)].filter((e) => !e.closest('[hidden]')).find((e) => !t || new RegExp(t).test(e.textContent)).click(), [sel, text]);
let failed = false;
try {
  await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 60000 });
  await wait(400);
  // in game: pause > Report feedback
  await G(() => window.__app.current.pause());
  await frames(page, 4);
  await click('.pause-screen .btn', 'Report feedback');
  await frames(page, 4);
  const form = await G(() => !!document.querySelector('.feedback-screen'));
  assert(form, 'the pause menu opens a feedback note');
  const ctx = await G(() => document.querySelector('.feedback-ctx').textContent);
  assert(/map: proving/.test(ctx) && /position:/.test(ctx) && /version:/.test(ctx), `the note carries the game context (${ctx.slice(0, 80)})`);
  await page.fill('.feedback-text', 'Ladder clips the wall\nat the top');
  // photo mode
  const before = await G(() => { const g = window.__app.current; const c = g.player.cam.camera; return { p: g.player.position.clone(), cam: c.position.clone(), t: g.time ?? 0 }; });
  await click('.feedback-screen .btn', 'Add photo');
  await frames(page, 4);
  const pm = await G(() => ({ on: document.body.classList.contains('photo-mode'), hud: getComputedStyle(document.querySelector('.hud')).display, form: getComputedStyle(document.querySelector('.feedback-screen')).display, take: !!document.querySelector('.photo-live:not([hidden]) .photo-btn') }));
  assert(pm.on && pm.hud === 'none' && pm.form === 'none' && pm.take, `photo mode hides the HUD and menus, prompts only (${JSON.stringify(pm)})`);
  // fly: W forward for a moment, E up
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyE');
  await wait(700);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyE');
  const flown = await G(() => window.__app.current.player.cam.camera.position.clone());
  const moved = Math.hypot(flown._x - before.cam._x, flown._y - before.cam._y, flown._z - before.cam._z);
  assert(moved > 0.5, `the free camera flies (${moved.toFixed(2)} m)`);
  const frozen = await G(() => { const g = window.__app.current; return { paused: !g.simulating, p: g.player.position.clone() }; });
  assert(frozen.paused && Math.abs(frozen.p._x - before.p._x) < 1e-6 && Math.abs(frozen.p._z - before.p._z) < 1e-6, 'the game stays frozen (the operator never moved)');
  // take -> review -> retake -> take -> keep
  await page.keyboard.press('Enter');
  await page.waitForSelector('.photo-review:not([hidden]) .photo-preview[src^="blob:"]', { timeout: 15000 });
  assert(true, 'taking a photo shows it with keep / retake / cancel');
  await click('.photo-review .photo-btn', 'Retake');
  await frames(page, 3);
  const live = await G(() => !document.querySelector('.photo-live').hidden && document.querySelector('.photo-review').hidden);
  assert(live, 'retake goes back to the live camera');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.photo-review:not([hidden]) .photo-preview[src^="blob:"]', { timeout: 15000 });
  await page.keyboard.press('Enter');
  await frames(page, 4);
  const back = await G(() => ({ on: document.body.classList.contains('photo-mode'), photos: document.querySelectorAll('.feedback-photo').length, cam: window.__app.current.player.cam.camera.position.clone() }));
  assert(!back.on && back.photos === 1, `keep returns to the note with the photo (${back.photos})`);
  assert(Math.hypot(back.cam._x - before.cam._x, back.cam._y - before.cam._y, back.cam._z - before.cam._z) < 0.01, 'the camera goes back where it was');
  // a second photo; cancel once first
  await click('.feedback-screen .btn', 'Add photo');
  await frames(page, 3);
  await page.keyboard.press('Escape');
  await frames(page, 3);
  let n = await G(() => ({ on: document.body.classList.contains('photo-mode'), photos: document.querySelectorAll('.feedback-photo').length }));
  assert(!n.on && n.photos === 1, 'cancel leaves photo mode without a photo');
  await click('.feedback-screen .btn', 'Add photo');
  await frames(page, 3);
  await page.keyboard.press('Enter');
  await page.waitForSelector('.photo-review:not([hidden]) .photo-preview[src^="blob:"]', { timeout: 15000 });
  await click('.photo-review .photo-btn', 'Keep');
  await frames(page, 3);
  n = await G(() => document.querySelectorAll('.feedback-photo').length);
  assert(n === 2, `more than one photo per note (${n})`);
  await click('.feedback-screen .btn', 'Save feedback');
  await wait(400);
  const stored = await G(async () => (await window.__app.feedback.all()).map((e) => ({ text: e.text, photos: e.photos.length, type: e.photos[0]?.type, map: e.context.map })));
  assert(stored.length === 1 && stored[0].photos === 2 && stored[0].type === 'image/jpeg' && stored[0].map === 'proving', `saved to the device with its photos (${JSON.stringify(stored)})`);
  // persists across a reload (IndexedDB), listed in Settings > Feedback, exported as one HTML file
  await page.goto(url + '?gfx=min&platform=desktop');
  await page.waitForFunction(() => document.getElementById('boot')?.classList.contains('done'), null, { timeout: 60000 });
  await wait(600);
  await click('.main-menu .btn', 'Settings');
  await frames(page, 4);
  await click('.tab', 'Feedback');
  await wait(400);
  const rows = await G(() => [...document.querySelectorAll('.feedback-row')].map((e) => e.textContent));
  assert(rows.length === 1 && /Bug: Ladder clips the wall/.test(rows[0]) && /2 photos/.test(rows[0]), `listed after a reload (${rows[0]})`);
  const dl = page.waitForEvent('download', { timeout: 15000 });
  await click('.btn', 'Export report');
  const file = await dl;
  const path = await file.path();
  const html = (await import('node:fs')).readFileSync(path, 'utf8');
  assert(/sbd-feedback-.*\.html/.test(file.suggestedFilename()) && /Ladder clips the wall<br>at the top/.test(html) && (html.match(/<img src="data:image\/jpeg/g) ?? []).length === 2, 'the report has the note and both photos');
  // a note from the menu: photo mode on the menu stage
  await click('.btn', 'New feedback');
  await frames(page, 4);
  await click('.feedback-screen .btn', 'Add photo');
  await frames(page, 4);
  const menuPm = await G(() => document.body.classList.contains('photo-mode') && window.__app.current.scene.activeCamera.name === 'photoCam');
  assert(menuPm, 'photo mode works on the menu stage too');
  await page.keyboard.press('Escape');
  await frames(page, 3);
  const restored = await G(() => window.__app.current.scene.activeCamera.name);
  assert(restored === 'menuCam', 'and gives the menu camera back');
  const errs = errors.filter((e) => !/GPU stall|GL Driver/.test(e));
  assert(errs.length === 0, `no console errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
  console.log('feedback e2e passed');
} catch (e) {
  failed = true;
  console.error(e);
}
await browser.close();
process.exit(failed ? 1 : 0);
