// The flat menu and the campaign lobby (clean-up H removed the parked modes, Free Roam and ?legacy=1): the main menu is
// Co-op, Loadout (the issued kit, read only), Settings, Feedback and the Test Chamber; the co-op
// lobby lists Campaign and the Test Chamber only; saves export and import.
import { launch, frames, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;
const { browser, page, errors } = await launch({ url, params: 'net=local' });
const G = (f, a) => page.evaluate(f, a);

const menuClick = (P, text) => P.evaluate((t) => [...document.querySelectorAll('.main-menu .btn')].find((b) => new RegExp(t).test(b.textContent)).click(), text);

try {
  await page.waitForSelector('.main-menu');
  assert((await G(() => document.title)) === 'Night Shift', 'the page is titled Night Shift');
  // (menu-ui slice 1: the main menu's ghost title is MAIN / MENU; no profile badge, MD19)
  const title = await G(() => document.querySelector('.main-menu .ms-ghost')?.textContent ?? '');
  const oldName = await G(() => /SILENT|DEADLY/i.test(document.body.textContent ?? ''));
  assert(/Main/i.test(title) && /Menu/i.test(title) && !oldName, `the main menu title is MAIN MENU, no old name (${title})`);
  const badge = await G(() => ({ any: !!document.querySelector('.main-menu .badge'), level: !!document.querySelector('.badge-level'), credits: !!document.querySelector('.badge .credits') }));
  assert(!badge.any && !badge.level && !badge.credits, `no profile badge, level or credits (${JSON.stringify(badge)})`);
  const keys = await G(() => [...document.querySelectorAll('.main-menu [data-key]')].map((b) => b.dataset.key));
  // (anim-studio) plus the developer row Test Chamber last
  assert(JSON.stringify(keys) === JSON.stringify(['coop', 'loadout', 'settings', 'feedback', 'test-chamber']), `the flat main menu: Co-op, Loadout, Settings, Feedback, Test Chamber (${keys})`);
  // Loadout (slice 4, D-11: the issued kit, read only)
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
  // (clean-up G1) plus the Test Chamber: the test mode on the dev map `chamber` (e2e-coop:chamber starts it)
  assert(JSON.stringify(lob.seen) === JSON.stringify(['Campaign', 'Test Chamber']), `the lobby lists Campaign and the Test Chamber only (${lob.seen})`);
  assert(lob.maps['Campaign'] === 'ctcourseReplan' && lob.maps['Test Chamber'] === 'chamber', `the Test Chamber is the chamber map, the Campaign Marlow Yard (${JSON.stringify(lob.maps)})`);

  // saves are untouched: the export keeps its internal magic and an exported file imports, the campaign's loadout choice included
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
  // (clean-up I, save v11) the profile keeps the name and the gear, nothing of the removed progression or cosmetics
  const keys11 = await G(() => Object.keys(window.__app.save.get()).sort().join());
  assert(keys11 === 'createdAt,loadout,preset,presets,profile,updatedAt,version,weapons', `the profile keeps only the v11 fields (${keys11})`);
  const exd = JSON.parse(ex).data;
  assert(exd.version === 11 && !('unlocks' in exd) && !('avatar' in exd) && !('xp' in exd.profile) && !('credits' in exd.profile), 'the exported profile is v11, with no XP, credits, unlocks or look');
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
