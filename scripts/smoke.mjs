// Headless mobile-emulated smoke test against a built `dist/` served by `vite preview`.
// Usage: node scripts/smoke.mjs [url] [--shot=out.png] [--wait=ms] [--eval=js]
import { chromium, devices } from 'playwright-core';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=').slice(1).join('=');
const shot = opt('shot', '');
const wait = Number(opt('wait', '4000'));
const evalJs = opt('eval', '');

const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(existsSync);
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const pixel = devices['Pixel 7 landscape'] ?? devices['Pixel 5 landscape'];
const ctx = await browser.newContext({ ...pixel });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
  else if (process.env.VERBOSE) console.log(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug=1');
await page.waitForFunction(() => document.getElementById('boot')?.classList.contains('done') || /Failed/.test(document.getElementById('boot-status')?.textContent ?? ''), null, { timeout: 60000 });
await page.waitForTimeout(wait);
if (evalJs) console.log('eval:', await page.evaluate(evalJs));
const status = await page.evaluate(() => document.getElementById('boot-status')?.textContent);
const dbg = await page.evaluate(() => document.querySelector('.debug-overlay pre')?.textContent ?? '');
console.log('boot status:', status);
console.log('debug overlay:\n' + dbg);
if (shot) await page.screenshot({ path: shot });
console.log(errors.length ? 'console problems:\n' + errors.join('\n') : 'no console errors');
await browser.close();
process.exit(errors.some((e) => e.startsWith('[pageerror]') || e.startsWith('[error]')) ? 1 : 0);
