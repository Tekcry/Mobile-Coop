// Headless desktop smoke test against a built `dist/` served by `vite preview`.
// Usage: node scripts/smoke.mjs [url] [--shot=out.png] [--wait=ms] [--eval=js]
import { chromium } from 'playwright-core';
import { launchOptions, fakePointerLock } from './e2e-lib.mjs';

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=').slice(1).join('=');
const shot = opt('shot', '');
const wait = Number(opt('wait', '4000'));
const evalJs = opt('eval', '');

const browser = await chromium.launch(launchOptions());
const ctx = await browser.newContext({ viewport: { width: 1280, height: 640 } });
await ctx.addInitScript(fakePointerLock);
// (load-audit) the 120 s navigation default of e2e-lib's launch(): this context is smoke's own
ctx.setDefaultNavigationTimeout(120000);
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
// (anim-tuner) F3 > Anim: a slider moved through the page sets the tuning table and logs the change (then put back)
const tune = await page.evaluate(() => {
  // the full overlay (a settings sync may have left it hidden or as the compact banner)
  if (!document.querySelector('.debug-overlay:not([hidden]):not(.compact)')) window.__app.debug.toggle(true);
  const btn = [...document.querySelectorAll('.debug-tools button')].find((b) => b.textContent === 'Anim');
  if (!btn) return 'no Anim button';
  btn.click();
  const panel = document.querySelector('.anim-tune');
  if (!panel || panel.hidden) return 'panel hidden';
  const pick = panel.querySelector('.anim-tune-pick-body');
  pick.value = 'walk';
  pick.dispatchEvent(new Event('change'));
  const input = panel.querySelector('input[data-group="walk"][data-id="trackMul"]');
  if (!input) return 'no walk trackMul slider';
  input.value = '1.25';
  input.dispatchEvent(new Event('input'));
  const t = window.__animTune;
  const v = t.get('walk', 'trackMul');
  const logged = t.log.some((c) => c.group === 'walk' && c.id === 'trackMul' && c.to === 1.25);
  t.set('walk', 'trackMul', 1);
  btn.click();
  return v === 1.25 && logged ? 'ok' : `value ${v}, logged ${logged}`;
});
console.log('anim tuner:', tune);
if (tune !== 'ok') errors.push(`[error] anim tuner: ${tune}`);
if (shot) await page.screenshot({ path: shot });
console.log(errors.length ? 'console problems:\n' + errors.join('\n') : 'no console errors');
await browser.close();
process.exit(errors.some((e) => e.startsWith('[pageerror]') || e.startsWith('[error]')) ? 1 : 0);
