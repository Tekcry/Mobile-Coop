// Music lab (music project, V3 sketch picker): the lab boots on phone emulation and on desktop with no console errors,
// each sketch loads and plays its three stems, the threat controls crossfade them, the decoded MP3 loops join without a
// seam, and the playback cost is measured (an offline render of the three-stem graph). Headless (null audio sink).
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const G = (page, f, a) => page.evaluate(f, a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// real pointer clicks: the first one is also the audio unlock
const click = (page, sel, text) => page.locator(sel).filter({ hasText: new RegExp(text) }).first().click();
const status = (page) => G(page, () => document.querySelector('.music-lab .lab-status')?.textContent ?? '');
// wait (up to 10 s: the status refreshes on the frame loop, slow on software GL) for the status to show these gains
const gainsBecome = (page, re) => page.waitForFunction((src) => new RegExp(src).test(document.querySelector('.music-lab .lab-status')?.textContent ?? ''), re, { timeout: 10000 }).then(() => true, () => false);
const gains = async (page) => {
  const m = /alert ([\d.]+) \/ ([\d.]+) \/ ([\d.]+)/.exec(await status(page));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};

async function run(label, opts) {
  console.log(`\n-- ${label}`);
  const { browser, page, errors } = await launch({ url, params: 'musiclab=1', ...opts });
  let failed = false;
  try {
    await page.waitForSelector('.music-lab', { timeout: 90000 });
    await frames(page, 3);
    const first = await G(page, () => document.querySelector('.music-lab .btn .btn-label')?.textContent);
    assert(first === 'Play A', `the sketch picker comes first (${first})`);
    const fit = await G(page, () => {
      const el = document.querySelector('.music-lab');
      return { sw: el.scrollWidth, cw: el.clientWidth };
    });
    assert(fit.sw <= fit.cw + 1, `the lab fits the width without a sideways scroll (${fit.sw} <= ${fit.cw})`);

    for (const id of ['A', 'B', 'C']) {
      await click(page, '.music-lab .btn', `^Play ${id}`);
      await page.waitForFunction((k) => new RegExp(`^${k} - .* playing`).test(document.querySelector('.music-lab .lab-status')?.textContent ?? ''), id, { timeout: 30000 });
      const st = await status(page);
      const load = /load (\d+) ms {2}files ([\d.]+) MB {2}decoded ([\d.]+) MB/.exec(st);
      console.log(`  ${id}: load ${load?.[1]} ms, files ${load?.[2]} MB, decoded ${load?.[3]} MB`);
      assert(load && Number(load[2]) > 2 && Number(load[2]) < 4, `${id} loads three stems (${load?.[2]} MB)`);
    }
    assert((await G(page, () => window.__app.audio.ctx?.state)) === 'running', 'the audio context is running');

    // state buttons and the threat slider crossfade the stems
    await click(page, '.music-lab .btn', '^Alert');
    assert(await gainsBecome(page, 'alert 1.00 / 1.00 / 1.00'), 'Alert: all three stems');
    await click(page, '.music-lab .btn', '^Calm');
    assert(await gainsBecome(page, 'alert 1.00 / 0.00 / 0.00'), 'Calm: the calm stem only');
    await click(page, '.music-lab .btn', '^Evasion');
    await gainsBecome(page, 'alert 1.00 / 1.00 / 0.40');
    const ev = await gains(page);
    assert(ev && ev[1] === 1 && ev[2] > 0 && ev[2] < 0.5, `Evasion: caution and a thinned alert (${ev})`);
    await click(page, '.music-lab .btn', '^Play the ladder');
    assert(await gainsBecome(page, 'ladder: calm'), 'the ladder starts at calm');

    // the decoded loops: the last sample of the loop region runs into its first without a jump
    const seams = await G(page, async () => {
      const urls = [...new Set(performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /\.mp3$/.test(n)))];
      const ctx = new OfflineAudioContext(2, 1, 48000);
      const out = [];
      for (const u of urls) {
        const buf = await ctx.decodeAudioData(await (await fetch(u)).arrayBuffer());
        const d = buf.getChannelData(0);
        const pad = 0.5 * buf.sampleRate;
        // every sketch loop is 60 s (whole bars); the decoded file is longer by the two pads and the encoder's padding
        const loop = 60 * buf.sampleRate;
        // compare the jump across the loop point with the typical jump in the second around it
        let typ = 0;
        for (let i = pad + 1; i < pad + buf.sampleRate; i++) typ = Math.max(typ, Math.abs(d[i] - d[i - 1]));
        const jump = Math.abs(d[pad] - d[pad + loop - 1]);
        out.push({ u: u.split('/').pop(), ratio: jump / (typ || 1), len: buf.length / buf.sampleRate });
      }
      return out;
    });
    assert(seams.length === 9, `nine stems decoded (${seams.length})`);
    for (const s of seams) assert(s.ratio < 0.5, `${s.u} loops without a seam (jump ${s.ratio.toFixed(3)} of the largest step)`);

    // playback cost: three looping stems through gains, 60 s rendered offline
    if (label === 'desktop') {
      const ms = await G(page, async () => {
        const u = [...new Set(performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /A-.*\.mp3$/.test(n)))];
        const ctx = new OfflineAudioContext(2, 60 * 48000, 48000);
        const bufs = await Promise.all(u.map(async (x) => ctx.decodeAudioData(await (await fetch(x)).arrayBuffer())));
        for (const b of bufs) {
          const s = ctx.createBufferSource();
          s.buffer = b;
          s.loop = true;
          s.loopStart = 0.5;
          s.loopEnd = b.duration - 0.5;
          const g = ctx.createGain();
          g.gain.value = 0.8;
          s.connect(g).connect(ctx.destination);
          s.start(0, 0.5);
        }
        const t0 = performance.now();
        await ctx.startRendering();
        return performance.now() - t0;
      });
      console.log(`  playback cost: 60 s of three stems rendered offline in ${Math.round(ms)} ms (${((ms / 60000) * 100).toFixed(2)} % of real time, software host)`);
      assert(ms < 6000, 'three-stem playback is cheap');
    }

    await click(page, '.music-lab .btn', '^Stop$');
    await wait(300);
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
