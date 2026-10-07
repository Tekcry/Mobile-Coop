// Close-up of the menu preview rig for proportion/silhouette checks.
// node scripts/rig-shot.mjs out.png [yaw] [js-before]   (yaw: avatar yaw in radians, PI = facing camera)
import { launch, frames } from './e2e-lib.mjs';
const [out, yaw = String(Math.PI), js = ''] = process.argv.slice(2);
const { browser, page, errors } = await launch({ params: '', url: process.env.URL ?? 'http://localhost:4173/' });
await frames(page, 30);
await page.evaluate((y) => {
  document.querySelector('.screens').style.display = 'none';
  const m = window.__app.current;
  m.setFraming('loadout');
  m.previewYaw = Number(y);
  m.setFraming = () => {};
  m.framing = 'inspect';
}, yaw);
if (js) console.log('eval:', await page.evaluate(js));
await frames(page, 20);
await page.evaluate(() => {
  const m = window.__app.current;
  const r = m.rig.root.position;
  m.camera.target.set(r.x, r.y + 1.0, r.z);
  m.camera.radius = 2.6;
  m.camera.beta = 1.45;
});
await frames(page, 2);
await page.screenshot({ path: out });
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
