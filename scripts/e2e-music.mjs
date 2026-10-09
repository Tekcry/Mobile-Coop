// Music lab (music project): the lab boots on phone emulation and on desktop with no console errors.
// The V3 sketch picker checks land with the picker.
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';

async function run(label, opts) {
  console.log(`\n-- ${label}`);
  const { browser, page, errors } = await launch({ url, params: 'musiclab=1', ...opts });
  let failed = false;
  try {
    await page.waitForSelector('.music-lab', { timeout: 30000 });
    await frames(page, 3);
    const errs = errors.filter((e) => !/GPU stall|GL Driver/.test(e));
    assert(errs.length === 0, `no console errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
  } catch (e) {
    failed = true;
    console.error(e);
  }
  await browser.close();
  return !failed;
}

const phone = await run('phone', { touch: true });
const desktop = await run('desktop', { touch: false });
if (phone && desktop) console.log('music e2e passed');
process.exit(phone && desktop ? 0 : 1);
