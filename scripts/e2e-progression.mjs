// Progression + save: armory by controller, buying, match rewards, IndexedDB persistence, export/import.
import { launch, frames, press, BTN, focusedText, assert } from './e2e-lib.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, ctx, page, errors } = await launch({ url });
const G = (f, a) => page.evaluate(f, a);
const q = (sel) => G((s) => !!document.querySelector(s), sel);
let failed = false;
try {
  await G(() => window.__pad.connect());
  await press(page, BTN.LB);
  const p0 = await G(() => window.__app.save.get().profile);
  assert(p0.credits === 500 && p0.xp === 0, 'fresh profile: 500 cr, level 1');

  // Armory via controller
  for (let i = 0; i < 6 && !/Armory/.test(await focusedText(page)); i++) await press(page, BTN.DOWN);
  assert(/Armory/.test(await focusedText(page)), 'focus Armory');
  await press(page, BTN.A);
  assert(await q('.armory-screen'), 'Armory opens');
  assert(/AR-7/.test(await G(() => document.querySelector('.w-title')?.textContent)), 'starts on the rifle');
  await press(page, BTN.RB);
  assert(/V-12/.test(await G(() => document.querySelector('.w-title')?.textContent)), 'RB cycles to SMG');
  assert(/Locked/.test(await focusedText(page)), `SMG is locked at level 1 ("${await focusedText(page)}")`);
  await press(page, BTN.LB);
  // buy a damage upgrade on the rifle with A
  const seq = [];
  for (let i = 0; i < 8 && !/Upgrade/.test(await focusedText(page)); i++) { seq.push(await focusedText(page)); await press(page, BTN.DOWN); }
  console.log('    nav:', seq.join(' | '));
  const before = await G(() => window.__app.save.get().weapons.rifle.upgrades);
  assert(/Upgrade · \d+ cr/.test(await focusedText(page)), `focus an upgrade button ("${await focusedText(page)}")`);
  await press(page, BTN.A);
  const after = await G(() => window.__app.save.get().weapons.rifle.upgrades);
  const spent = 500 - (await G(() => window.__app.save.get().profile.credits));
  const total = (o) => o.damage + o.magazine + o.recoil + o.reload;
  assert(total(after) === total(before) + 1 && spent > 0, `A buys an upgrade (spent ${spent} cr)`);
  assert((await G(() => document.querySelectorAll('.pips i.on').length)) === 1, 'upgrade pip lit');
  await press(page, BTN.B);

  // Store: level up via save, then buy the SMG
  await G(() => window.__app.save.update((d) => { d.profile.xp = 600; d.profile.credits = 700; }));
  for (let i = 0; i < 6 && !/Store/.test(await focusedText(page)); i++) await press(page, BTN.DOWN);
  await press(page, BTN.A);
  assert(await q('.store-screen'), 'Store opens');
  assert(/Buy · 600 cr/.test(await focusedText(page)), `first buyable item focused ("${await focusedText(page)}")`);
  await press(page, BTN.A);
  assert(await G(() => window.__app.save.get().unlocks.includes('weapon:smg')), 'buying unlocks the SMG');
  await press(page, BTN.B);

  // Play a quick wave match, score kills, die -> rewards
  await G(() => window.__app.screens.top?.manager);
  await page.evaluate(() => {
    const app = window.__app;
    document.querySelector('.main-menu .btn')?.dispatchEvent(new Event('click'));
  });
  await page.waitForSelector('.play-screen');
  for (let i = 0; i < 6 && !/Deploy/.test(await focusedText(page)); i++) await press(page, BTN.DOWN);
  await press(page, BTN.A);
  await page.waitForFunction(() => window.__app.current?.enemyMgr, null, { timeout: 30000 });
  const xp0 = await G(() => window.__app.save.get().profile.xp);
  await G(() => { const g = window.__app.current; g.target.damageMul = 0; window.__app.loop.stepHeadless(8); });
  await G(() => {
    const g = window.__app.current;
    for (const e of [...g.enemyMgr.enemies]) e.applyDamage({ amount: 9999, point: e.pos.clone(), dir: e.pos.clone(), part: 'head', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', weapon: 'rifle', sourcePos: g.player.position.clone(), impulse: 1 });
    g.stats.weaponKills.rifle = 3;
    g.target.damageMul = 1;
    g.target.applyDamage({ amount: 9999, point: g.player.position.clone(), dir: g.player.position.clone(), part: 'body', kind: 'bullet', attackerTeam: 'enemy', attackerId: 'x', sourcePos: g.player.position.clone(), impulse: 0 });
  });
  await page.waitForSelector('.results-screen .rewards', { timeout: 20000 });
  const xp1 = await G(() => window.__app.save.get().profile.xp);
  const lines = await G(() => document.querySelector('.rewards')?.textContent ?? '');
  assert(xp1 > xp0 && /Kills/.test(lines), `results show rewards and XP is banked (${xp0} -> ${xp1})`);
  const kills = await G(() => window.__app.save.get().weapons.rifle.kills);
  assert(kills >= 3, `weapon mastery kills recorded (${kills})`);

  // persistence across reload (IndexedDB)
  await G(() => window.__app.save.flush());
  await page.reload();
  await page.waitForFunction(() => document.getElementById('boot')?.classList.contains('done'), null, { timeout: 60000 });
  const xp2 = await G(() => window.__app.save.get().profile.xp);
  const smg = await G(() => window.__app.save.get().unlocks.includes('weapon:smg'));
  assert(xp2 === xp1 && smg, 'profile survives a reload (IndexedDB)');

  // export / import through Settings > Data
  await G(() => window.__app.screens.push(new (window.__app.screens.top.constructor)(window.__app)));
  await G(() => window.__app.screens.pop());
  const dl = page.waitForEvent('download');
  await G(() => {
    const blob = new Blob([window.__app.save.exportText()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'save.json';
    document.body.appendChild(a);
    a.click();
  });
  const file = await (await dl).path();
  const text = readFileSync(file, 'utf8');
  assert(/shoulder-strike-save/.test(text), 'export produces a save file');
  const mod = JSON.parse(text);
  mod.data.profile.name = 'Imported';
  writeFileSync('/tmp/e2e-import.json', JSON.stringify(mod));
  await G(() => window.__app.save.importText(JSON.stringify({ magic: 'shoulder-strike-save', version: 1, data: { version: 1, name: 'Legacy', xp: 10, money: 77, unlocked: [] } })));
  const legacy = await G(() => window.__app.save.get().profile);
  assert(legacy.name === 'Legacy' && legacy.credits === 77, 'importing a v1 save migrates it');
  await G((t) => window.__app.save.importText(t), readFileSync('/tmp/e2e-import.json', 'utf8'));
  assert((await G(() => window.__app.save.get().profile.name)) === 'Imported', 'importing an exported file restores it');
  void ctx;
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-progression-fail.png' });
} finally {
  console.log(errors.length ? 'console problems:\n' + errors.join('\n') : 'no console errors');
  await browser.close();
  process.exit(failed || errors.length ? 1 : 0);
}
