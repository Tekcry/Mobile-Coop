// 3.5 parked content: with ?legacy off (the default) the Play screen lists Infiltration and Free Roam, the
// co-op lobby Infiltration and Free Roam, the Loadout screen weapons / attachments / gadget / presets only (every weapon
// and attachment selectable, nothing bought, saved or unlocked), the menu says Night Shift and shows no level or
// credits; with ?legacy=1 everything is as before 3.5.
import { launch, openPage, frames, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;
const { browser, ctx, page, errors } = await launch({ url, params: 'net=local' });
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
  // (menu-ui slice 1: the main menu's ghost title is MAIN / MENU; the profile badge only with ?legacy=1, MD19)
  const title = await G(() => document.querySelector('.main-menu .ms-ghost')?.textContent ?? '');
  const oldName = await G(() => /SILENT|DEADLY/i.test(document.body.textContent ?? ''));
  assert(/Main/i.test(title) && /Menu/i.test(title) && !oldName, `the main menu title is MAIN MENU, no old name (${title})`);
  const badge = await G(() => ({ any: !!document.querySelector('.main-menu .badge'), level: !!document.querySelector('.badge-level'), credits: !!document.querySelector('.badge .credits') }));
  assert(!badge.any && !badge.level && !badge.credits, `no profile badge, level or credits (${JSON.stringify(badge)})`);
  const keys = await G(() => [...document.querySelectorAll('.main-menu [data-key]')].map((b) => b.dataset.key));
  // (anim-studio) plus the developer row Test Chamber last
  assert(JSON.stringify(keys) === JSON.stringify(['coop', 'loadout', 'settings', 'feedback', 'test-chamber']), `the flat main menu: Co-op, Loadout, Settings, Feedback, Test Chamber (${keys})`);
  // Loadout (slice 4, D-11: the issued kit, read only; the old screen stays under ?legacy=1)
  await menuClick(page, 'Loadout');
  await page.waitForSelector('.kit-screen .ms-item');
  await frames(page, 3);
  const labels = await G(() => [...document.querySelectorAll('.kit-screen .ms-item .btn-label')].map((e) => e.textContent));
  assert(JSON.stringify(labels) === JSON.stringify(['Primary', 'Sidearm', 'Gadget']), `the issued kit: primary, sidearm, gadget (${labels})`);
  const ctrs = await G(() => [...document.querySelectorAll('.kit-screen .ms-ctr')].map((e) => e.textContent));
  assert(ctrs[0] === 'Heron Carbine' && ctrs[1] === 'Hush 9 SD', `the CT kit guns, G76 (${ctrs})`);
  const before = await G(() => JSON.stringify(window.__app.save.get().loadout));
  await page.click('.kit-screen [data-key="primary"]');
  await frames(page, 3);
  assert((await G(() => JSON.stringify(window.__app.save.get().loadout))) === before && (await G(() => !!document.querySelector('.kit-screen'))), 'the kit is not selectable: a click changes nothing');
  await G(() => window.__app.screens.pop());

  // co-op lobby
  await menuClick(page, 'Co-op');
  await page.click('.btn:has-text("Host a room")');
  await page.waitForFunction(() => !!document.querySelector('.lobby-screen') && !!window.__coop, null, { timeout: 15000 });
  const lob = await G(async () => {
    const s = window.__coop.session;
    const mode0 = s.mode;
    const map0 = s.map;
    const row = () => [...document.querySelectorAll('.lobby-screen .row-choice')].find((r) => /Mode/.test(r.textContent));
    const seen = [];
    const maps = {};
    for (let i = 0; i < 8; i++) {
      const v = row().querySelector('.choice-val').textContent;
      if (seen.includes(v)) break;
      seen.push(v);
      maps[v] = s.map;
      const arrows = row().querySelectorAll('.choice-arrow');
      arrows[arrows.length - 1].click();
      await new Promise((r) => setTimeout(r, 80));
    }
    return { mode0, map0, seen, maps };
  });
  // (sector-ops slice 3) co-op is the campaign: Marlow Yard in Course mode by default; no Sector Ops map is listed
  assert(lob.mode0 === 'course' && lob.map0 === 'ctcourseReplan', `a new room starts on the campaign, Marlow Yard, the re-planned yard (marlowreplan is on by default) (${lob.mode0}, ${lob.map0})`);
  // (clean-up G1) plus the Test Chamber: Free Roam on the dev map `chamber` (e2e-coop:chamber starts it)
  assert(JSON.stringify(lob.seen) === JSON.stringify(['Campaign', 'Test Chamber']), `the lobby lists Campaign and the Test Chamber only (${lob.seen})`);
  assert(lob.maps['Campaign'] === 'ctcourseReplan' && lob.maps['Test Chamber'] === 'chamber', `the Test Chamber is the chamber map, the Campaign Marlow Yard (${JSON.stringify(lob.maps)})`);

  // saves are untouched by parking: the export keeps its internal magic and an exported file imports (what e2e-progression
  // checked, now that it is a legacy suite), the campaign's loadout choice included
  const exAtts = await G(() => window.__app.save.get().weapons.rifle.attachments.length);
  const ex = await G(() => window.__app.save.exportText());
  assert(/shoulder-strike-save/.test(ex), 'the save export keeps its internal magic');
  const imp = await G(async (t) => {
    const o = JSON.parse(t);
    o.data.profile.name = 'Imported';
    await window.__app.save.importText(JSON.stringify(o));
    const s = window.__app.save.get();
    return { name: s.profile.name, atts: s.weapons.rifle.attachments.length };
  }, ex);
  assert(imp.name === 'Imported' && imp.atts === exAtts, `importing an exported file restores it (${JSON.stringify(imp)})`);

  console.log('legacy on (?legacy=1)');
  const L = (await openPage(ctx, url, 'legacy=1')).page;
  const GL = (f, a) => L.evaluate(f, a);
  await L.waitForSelector('.main-menu');
  const lbadge = await GL(() => ({ level: !!document.querySelector('.badge-level'), credits: !!document.querySelector('.badge .credits') }));
  assert(lbadge.level && lbadge.credits, 'the profile badge shows level and credits');
  // (sector-ops slice 1) Missions and Free roam only with ?legacy=1
  const lkeys = await GL(() => [...document.querySelectorAll('.main-menu [data-key]')].map((b) => b.dataset.key));
  assert(['missions', 'coop', 'freeroam', 'loadout', 'settings', 'feedback', 'legacy'].every((k) => lkeys.includes(k)), `the legacy main menu keeps Missions and Free roam (${lkeys})`);
  await menuClick(L, 'Missions');
  await L.waitForSelector('.missions-screen .ms-item');
  const mk = await GL(() => ({ n: document.querySelectorAll('.missions-screen .ms-item').length, total: window.__missions.length }));
  assert(mk.n === mk.total && mk.n > 0, `Missions lists the campaign cards (${JSON.stringify(mk)})`);
  await GL(() => window.__app.screens.pop());
  await menuClick(L, 'Free roam');
  await L.waitForSelector('.freeroam-screen .ms-item');
  assert((await GL(() => document.querySelectorAll('.freeroam-screen .ms-item').length)) > 0, 'Free roam lists the sandbox maps');
  await GL(() => window.__app.screens.pop());
  await menuClick(L, 'Legacy');
  await L.waitForSelector('.play-screen');
  const lmodes = await playModes(L);
  assert(lmodes.length === 4 && ['Mission', 'Hunter'].every((m) => lmodes.includes(m)), `Mission and Hunter are back (${lmodes})`);
  assert(lmodes[0] === 'Hunter', 'the default mode is Hunter');
  await GL(() => window.__app.screens.pop());
  await menuClick(L, 'Loadout');
  await L.waitForSelector('.loadout-screen .lo-row');
  await frames(L, 3);
  const llabels = await rowLabels(L);
  assert(['Suit', 'Appearance', 'Tag', 'HQ upgrades', 'Challenges'].every((x) => llabels.includes(x)), `the Loadout economy is back (${llabels})`);
  // (G115: both CT kit guns are starter guns, so the locks show on the attachments)
  await openLoadoutPage(L, 'customizePage', 'rifle');
  await frames(L, 3);
  const lw = await GL(() => document.querySelectorAll('.lo-list .lo-row.m-locked, .lo-list .lo-row.m-buyable').length);
  assert(lw > 0, `locked / buyable attachments show again (${lw})`);
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
