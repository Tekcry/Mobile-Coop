// 3.5 parked content: with ?legacy off (the default) the Play screen lists Infiltration, Training and Free Roam, the
// co-op lobby Infiltration and Free Roam, the Loadout screen weapons / attachments / gadget / presets only (every weapon
// and attachment selectable, nothing bought, saved or unlocked), the menu says Night Shift and shows no level or
// credits; with ?legacy=1 everything is as before 3.5.
import { launch, openPage, frames, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;
const { browser, ctx, page, errors } = await launch({ url, params: 'net=local', touch: false });
const G = (f, a) => page.evaluate(f, a);

/** The labels of the Play screen's Mode choice, by stepping it round once. */
const playModes = (P) =>
  P.evaluate(async () => {
    const row = document.querySelector('.play-screen .row-choice');
    const arrows = row.querySelectorAll('.choice-arrow');
    const next = arrows[arrows.length - 1];
    const seen = [];
    for (let i = 0; i < 10; i++) {
      const v = row.querySelector('.choice-val').textContent;
      if (seen.includes(v)) break;
      seen.push(v);
      next.click();
      await new Promise((r) => setTimeout(r, 60));
    }
    return seen;
  });
const menuClick = (P, text) => P.evaluate((t) => [...document.querySelectorAll('.main-menu .btn')].find((b) => new RegExp(t).test(b.textContent)).click(), text);
const rowLabels = (P) => P.evaluate(() => [...document.querySelectorAll('.lo-list .lo-label')].map((e) => e.textContent));
const openLoadoutPage = (P, fn, arg) => P.evaluate(([f, a]) => { const s = window.__app.screens.top; s.open(s[f](a)); }, [fn, arg]);

try {
  console.log('legacy off (the default)');
  await page.waitForSelector('.main-menu');
  assert((await G(() => document.title)) === 'Night Shift', 'the page is titled Night Shift');
  const title = await G(() => document.querySelector('.game-title')?.textContent ?? '');
  assert(/NIGHT/.test(title) && /SHIFT/.test(title) && !/SILENT|DEADLY/.test(title), `the main menu title is Night Shift (${title})`);
  const badge = await G(() => ({ level: !!document.querySelector('.badge-level'), credits: !!document.querySelector('.badge .credits'), name: document.querySelector('.badge-name b')?.textContent }));
  assert(!badge.level && !badge.credits && !!badge.name, `the profile badge shows no level or credits (${JSON.stringify(badge)})`);

  await menuClick(page, 'Play');
  await page.waitForSelector('.play-screen');
  const modes = await playModes(page);
  assert(JSON.stringify([...modes].sort()) === JSON.stringify(['Free Roam', 'Infiltration', 'Training']), `the Play screen lists Infiltration, Training and Free Roam (${modes})`);
  assert((await G(() => window.__app.screens.top.mode)) === 'infiltration' || modes[0] === 'Infiltration', 'the default mode is Infiltration');
  await G(() => window.__app.screens.pop());

  // Loadout
  await menuClick(page, 'Loadout');
  await page.waitForSelector('.loadout-screen .lo-row');
  await frames(page, 3);
  const labels = await rowLabels(page);
  assert(JSON.stringify(labels) === JSON.stringify(['Loadout', 'Primary', 'Secondary', 'Gadget']), `the Loadout root: loadout presets, primary, secondary, gadget (${labels})`);
  const top = await G(() => ({ brand: document.querySelector('.net-brand')?.textContent, wallet: document.querySelector('.wallet')?.textContent ?? '', ticker: document.querySelector('.net-ticker')?.textContent ?? '' }));
  assert(top.brand === 'NIGHT SHIFT' && !top.wallet && !top.ticker, `no level, credits or challenge ticker (${JSON.stringify(top)})`);
  const before = await G(() => { const s = window.__app.save.get(); return { unlocks: [...s.unlocks], credits: s.profile.credits, xp: s.profile.xp }; });
  await openLoadoutPage(page, 'weaponsPage', 'primary');
  await frames(page, 3);
  const wp = await G(() => ({ rows: document.querySelectorAll('.lo-list .lo-row').length, locked: document.querySelectorAll('.lo-list .lo-row.m-locked').length, buy: document.querySelectorAll('.lo-list .lo-row.m-buyable').length, price: document.querySelectorAll('.lo-list .lo-val.price').length }));
  assert(wp.rows >= 10 && wp.locked === 0 && wp.buy === 0 && wp.price === 0, `every weapon is selectable: nothing locked or for sale (${JSON.stringify(wp)})`);
  // equip a weapon the profile does not own: the sniper
  await G(() => {
    const row = [...document.querySelectorAll('.lo-list .lo-row')].find((r) => /M700/.test(r.textContent));
    row.click();
    row.click();
  });
  await frames(page, 4);
  const eq = await G(() => { const s = window.__app.save.get(); return { primary: s.loadout.primary, unlocks: [...s.unlocks], credits: s.profile.credits, xp: s.profile.xp }; });
  assert(eq.primary === 'sniper', `the locked sniper equips (${eq.primary})`);
  assert(JSON.stringify(eq.unlocks) === JSON.stringify(before.unlocks) && eq.credits === before.credits && eq.xp === before.xp, 'nothing was unlocked, bought or paid for in the save');
  await openLoadoutPage(page, 'customizePage', 'sniper');
  await frames(page, 3);
  const cp = await G(() => ({ labels: [...document.querySelectorAll('.lo-list .lo-label')].map((e) => e.textContent), groups: [...document.querySelectorAll('.lo-list .lo-group')].map((e) => e.textContent), locked: document.querySelectorAll('.lo-list .lo-row.m-locked').length, price: document.querySelectorAll('.lo-list .lo-val.price').length, sub: document.querySelector('.lo-sub')?.textContent }));
  assert(cp.labels.length > 0 && cp.locked === 0 && cp.price === 0 && !cp.groups.some((g) => /UPGRADES|CAMO/.test(g)) && !/UPGRADES/.test(cp.sub), `attachments only: no upgrades, camo, locks or prices (${JSON.stringify(cp)})`);
  const att = await G(() => {
    const row = [...document.querySelectorAll('.lo-list .lo-row')][0];
    row.click();
    row.click();
    return row.querySelector('.lo-label').textContent;
  });
  await frames(page, 4);
  const sa = await G(() => ({ atts: window.__app.save.get().weapons.sniper.attachments, unlocks: window.__app.save.get().unlocks.length }));
  assert(sa.atts.length === 1 && sa.unlocks === before.unlocks.length, `an attachment equips without an unlock (${att}: ${sa.atts})`);
  // it persists (the sanitiser keeps the campaign's choice)
  await G(() => window.__app.save.flush());
  await page.reload();
  await page.waitForFunction(() => document.getElementById('boot')?.classList.contains('done'), null, { timeout: 60000 });
  const kept = await G(() => ({ primary: window.__app.save.get().loadout.primary, unlocks: window.__app.save.get().unlocks.length }));
  assert(kept.primary === 'sniper' && kept.unlocks === before.unlocks.length, `the choice survives a reload (${kept.primary})`);

  // co-op lobby
  await menuClick(page, 'Co-op');
  await page.click('.btn:has-text("Host a room")');
  await page.waitForFunction(() => !!document.querySelector('.lobby-screen') && !!window.__coop, null, { timeout: 15000 });
  const lob = await G(async () => {
    const s = window.__coop.session;
    const row = [...document.querySelectorAll('.lobby-screen .row-choice')].find((r) => /Mode/.test(r.textContent));
    const arrows = row.querySelectorAll('.choice-arrow');
    const seen = [];
    for (let i = 0; i < 8; i++) {
      const v = row.querySelector('.choice-val').textContent;
      if (seen.includes(v)) break;
      seen.push(v);
      arrows[arrows.length - 1].click();
      await new Promise((r) => setTimeout(r, 80));
    }
    return { mode: s.mode, seen };
  });
  assert(lob.mode === 'infiltration', `a new room starts on Infiltration (${lob.mode})`);
  assert(JSON.stringify([...lob.seen].sort()) === JSON.stringify(['Free Roam', 'Infiltration']), `the lobby lists Infiltration and Free Roam (${lob.seen})`);

  // saves are untouched by parking: the export keeps its internal magic and an exported file imports (what e2e-progression
  // checked, now that it is a legacy suite), the campaign's loadout choice included
  const ex = await G(() => window.__app.save.exportText());
  assert(/shoulder-strike-save/.test(ex), 'the save export keeps its internal magic');
  const imp = await G(async (t) => {
    const o = JSON.parse(t);
    o.data.profile.name = 'Imported';
    await window.__app.save.importText(JSON.stringify(o));
    const s = window.__app.save.get();
    return { name: s.profile.name, primary: s.loadout.primary };
  }, ex);
  assert(imp.name === 'Imported' && imp.primary === 'sniper', `importing an exported file restores it (${JSON.stringify(imp)})`);

  console.log('legacy on (?legacy=1)');
  const L = (await openPage(ctx, url, 'legacy=1')).page;
  const GL = (f, a) => L.evaluate(f, a);
  await L.waitForSelector('.main-menu');
  const lbadge = await GL(() => ({ level: !!document.querySelector('.badge-level'), credits: !!document.querySelector('.badge .credits') }));
  assert(lbadge.level && lbadge.credits, 'the profile badge shows level and credits');
  await menuClick(L, 'Play');
  await L.waitForSelector('.play-screen');
  const lmodes = await playModes(L);
  assert(lmodes.length === 6 && ['Wave Survival', 'Mission', 'Hunter'].every((m) => lmodes.includes(m)), `Wave, Mission and Hunter are back (${lmodes})`);
  assert(lmodes[0] === 'Wave Survival', 'the default mode is Wave Survival again');
  await GL(() => window.__app.screens.pop());
  await menuClick(L, 'Loadout');
  await L.waitForSelector('.loadout-screen .lo-row');
  await frames(L, 3);
  const llabels = await rowLabels(L);
  assert(['Suit', 'Appearance', 'Tag & emotes', 'HQ upgrades', 'Challenges'].every((x) => llabels.includes(x)), `the Loadout economy is back (${llabels})`);
  await openLoadoutPage(L, 'weaponsPage', 'primary');
  await frames(L, 3);
  const lw = await GL(() => document.querySelectorAll('.lo-list .lo-row.m-locked, .lo-list .lo-row.m-buyable').length);
  assert(lw > 0, `locked / buyable weapons show again (${lw})`);
  await L.close();
} catch (e) {
  failed = true;
  console.error(String(e));
}
const bad = errors.filter((e) => !/favicon|net::ERR|WebSocket|webrtc/i.test(e));
assert(bad.length === 0, `no console errors${bad.length ? ': ' + bad.slice(0, 3).join(' | ') : ''}`);
await browser.close();
if (failed) {
  console.log('FAILED');
  process.exit(1);
}
