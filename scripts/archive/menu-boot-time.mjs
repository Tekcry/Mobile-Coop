// Boot-to-main-menu time under software GL (menu-notes): `E2E_PORT=4191 node scripts/archive/menu-boot-time.mjs 3` with dist/ served on that port.
import { launch } from '../e2e-lib.mjs';
const url = `http://127.0.0.1:${process.env.E2E_PORT}/`;
const runs = +(process.argv[2] ?? 3);
for (let i = 0; i < runs; i++) {
  const t0 = Date.now();
  const { browser, page } = await launch({ url });
  await page.waitForFunction(() => document.querySelector('.main-menu') && document.getElementById('boot')?.classList.contains('done'), null, { timeout: 120000, polling: 50 });
  const menu = Date.now() - t0;
  const info = await page.evaluate(() => ({ gate: window.__app?.current?.bootGate ?? '(none)', lod: window.__app?.current?.heroLod ?? '?' }));
  console.log(`run ${i + 1}: main menu shown after ${menu} ms`, JSON.stringify(info));
  await browser.close();
}
