// Music lab (music project, Stage M1): the lab boots on phone emulation and on desktop with no console errors, the
// motif button plays, calm and combat run, voices stay under the cap, and the offline WAV export is a real WAV
// with sane levels. Headless (no real audio output needed: the context runs with a null sink).
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const G = (page, f, a) => page.evaluate(f, a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// real pointer clicks: the first one is also the audio unlock (a synthetic .click() would not be)
const click = (page, sel, text) => page.locator(sel).filter({ hasText: new RegExp(text) }).first().click();

async function run(label, opts) {
  console.log(`\n-- ${label}`);
  const { browser, page, errors } = await launch({ url, params: 'musiclab=1', ...opts });
  let failed = false;
  try {
    await page.waitForSelector('.music-lab', { timeout: 30000 });
    await frames(page, 3);
    const first = await G(page, () => document.querySelector('.music-lab .btn .btn-label')?.textContent);
    assert(first === 'Play A', `the motif picker comes first (${first})`);
    const fit = await G(page, () => {
      const el = document.querySelector('.music-lab');
      return { sw: el.scrollWidth, cw: el.clientWidth };
    });
    assert(fit.sw <= fit.cw + 1, `the lab fits the width without a sideways scroll (${fit.sw} <= ${fit.cw})`);

    // the first tap is the audio unlock; the library renders in chunks, then the motif plays
    await click(page, '.music-lab .btn', '^Play A$');
    await page.waitForFunction(() => window.__app.music.ready, null, { timeout: 60000 });
    const ms = await G(page, () => window.__app.music.renderMs);
    console.log(`  library render: ${Math.round(ms)} ms (software GL host; the phone budget is measured on the device)`);
    assert(ms > 0 && ms < 15000, `the library renders (${Math.round(ms)} ms)`);
    const running = await G(page, () => window.__app.audio.ctx?.state);
    assert(running === 'running', `the audio context is running (${running})`);
    await wait(1500);
    let st = await G(page, () => window.__app.music.stats());
    assert(st.played > 0, `candidate A plays (${st.played} sounds started)`);
    for (const take of ['B sneak', 'C break', 'A noir']) {
      const p0 = (await G(page, () => window.__app.music.stats())).played;
      await click(page, '.music-lab .btn', `^${take}$`);
      await wait(2500);
      const p1 = (await G(page, () => window.__app.music.stats())).played;
      assert(p1 > p0, `${take} plays (${p1 - p0} sounds)`);
    }
    for (const id of ['A', 'B', 'C']) {
      const r = await G(page, (k) => window.__app.music.renderExport(k, 60, []).then((x) => ({ peak: x.peakDb, rms: x.rmsDb, voices: x.peakVoices })), `cand${id}`);
      console.log(`  candidate ${id}  peak ${r.peak.toFixed(1)} dBFS  RMS ${r.rms.toFixed(1)} dBFS  voices ${r.voices}`);
      assert(r.peak <= -6 && r.peak > -40, `candidate ${id} 60 s render: peak at or below -6 dBFS and not silent`);
      assert(r.voices <= 24, `candidate ${id} voices under the cap (${r.voices})`);
    }

    // calm, then combat
    await click(page, '.music-lab .btn', '^Calm');
    await wait(800);
    assert((await G(page, () => window.__app.music.state)) === 'calm', 'calm state');
    await click(page, '.music-lab .btn', '^Combat168');
    const before = (await G(page, () => window.__app.music.stats())).played;
    await wait(6000);
    st = await G(page, () => window.__app.music.stats());
    const bpm = await G(page, () => window.__app.music.tempo());
    assert(bpm === 168, `combat runs at 168 BPM (${bpm})`);
    assert(st.played - before > 60, `combat is busy (${st.played - before} sounds in 6 s)`);
    assert(st.peak <= 24, `voices stay under the cap (peak ${st.peak} of 24)`);
    assert(st.late === 0, `nothing was scheduled late (${st.late})`);
    // the status panel shows it
    const panel = await G(page, () => document.querySelector('.lab-status').textContent);
    assert(/voices/.test(panel) && /combat/.test(panel), 'the status panel shows the state and voices');

    // seed and tempo nudge
    await click(page, '.music-lab .btn', '^\\+$');
    const seed1 = await G(page, () => window.__app.music.getSeed());
    assert(seed1 === 8, `seed + (${seed1})`);
    await click(page, '.music-lab .btn', '^\\+1%$');
    await wait(400);
    assert((await G(page, () => window.__app.music.tempo())) === 170, 'tempo +1 % moves Combat to 170 BPM');
    const note = await G(page, () => [...document.querySelectorAll('.music-lab .row-note')].find((n) => /noir \d+ BPM/.test(n.textContent))?.textContent ?? '');
    assert(/noir 71 BPM/.test(note), `the tempo note shows the take tempos (${note})`);
    await click(page, '.music-lab .btn', '^Reset$');
    assert((await G(page, () => window.__app.music.getTempo())) === 1, 'tempo reset');

    // mute a stem
    await click(page, '.music-lab .lab-stem', '^BREAK$');
    assert(await G(page, () => window.__app.music.isStemMuted('BREAK')), 'a stem can be muted');
    await click(page, '.music-lab .lab-stem', '^BREAK$');

    // offline renders: levels and the voice cap
    const calm = await G(page, () => window.__app.music.renderExport('calm', 30, []).then((r) => ({ peak: r.peakDb, rms: r.rmsDb, voices: r.peakVoices, n: r.left.length })));
    const combat = await G(page, () => window.__app.music.renderExport('combat', 30, []).then((r) => ({ peak: r.peakDb, rms: r.rmsDb, voices: r.peakVoices, n: r.left.length })));
    console.log(`  calm   peak ${calm.peak.toFixed(1)} dBFS  RMS ${calm.rms.toFixed(1)} dBFS  voices ${calm.voices}`);
    console.log(`  combat peak ${combat.peak.toFixed(1)} dBFS  RMS ${combat.rms.toFixed(1)} dBFS  voices ${combat.voices}`);
    assert(calm.n === 30 * 48000 && combat.n === 30 * 48000, 'the offline render is the length asked');
    assert(calm.peak <= -6 && combat.peak <= -6, 'music bus peaks stay at or below -6 dBFS');
    assert(calm.peak > -80, 'calm is not silent');
    assert(combat.rms > calm.rms + 6, 'combat is clearly louder than calm');
    assert(calm.rms < -26 && calm.rms > -50, `calm sits near -30 dBFS RMS (${calm.rms.toFixed(1)})`);
    assert(combat.rms < -12 && combat.rms > -24, `combat sits near -16 dBFS RMS (${combat.rms.toFixed(1)})`);
    assert(calm.voices <= 24 && combat.voices <= 24, `offline voices stay under the cap (${calm.voices}, ${combat.voices})`);

    // the real WAV export button (60 s)
    if (label === 'desktop') {
      const dl = page.waitForEvent('download', { timeout: 120000 });
      await click(page, '.music-lab .btn', '^Combat 60 s WAV$');
      const file = await dl;
      const bytes = (await import('node:fs')).readFileSync(await file.path());
      assert(/^night-shift-combat-seed\d+\.wav$/.test(file.suggestedFilename()), `the export is named (${file.suggestedFilename()})`);
      assert(bytes.length === 44 + 60 * 48000 * 4 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE', `60 s of 16-bit stereo 48 kHz (${bytes.length} bytes)`);
      await page.waitForFunction(() => /peak/.test([...document.querySelectorAll('.music-lab .section')].pop()?.querySelector('.row-note')?.textContent ?? ''), null, { timeout: 10000 });
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
