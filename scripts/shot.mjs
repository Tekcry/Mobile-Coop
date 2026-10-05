// Screenshot helper: node scripts/shot.mjs <out.png> [query] [waitFrames] [js-to-eval-before-shot]
import { launch, frames } from './e2e-lib.mjs';
const [out, query = '', wait = '60', js = ''] = process.argv.slice(2);
const { browser, page, errors } = await launch({ params: query });
await frames(page, Number(wait));
if (js) console.log('eval:', await page.evaluate(js));
await page.screenshot({ path: out });
console.log(await page.evaluate(() => document.querySelector('.debug-overlay pre')?.textContent ?? ''));
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
