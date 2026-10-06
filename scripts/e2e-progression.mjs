// Progression + save: the Loadout screen by controller (live preview, upgrades, buying in place, suit, HQ),
// match rewards, IndexedDB persistence, export/import.
import { launch, frames, press, BTN, focusedText, focusTo, assert } from './e2e-lib.mjs';
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

  // Loadout via controller (Blacklist lists): Primary -> the weapon list (focus previews), customise, buy an upgrade
  const key = () => G(() => window.__app.nav.focused?.dataset.key ?? '');
  const shown = () => G(() => JSON.parse(window.__app.current.shown));
  const detail = () => G(() => document.querySelector('.lo-detail')?.textContent ?? '');
  await focusTo(page, /Loadout/);
  assert(/Loadout/.test(await focusedText(page)), 'focus Loadout');
  await press(page, BTN.A);
  assert(await q('.loadout-screen'), 'Loadout opens');
  await press(page, BTN.DOWN);
  assert((await key()) === 'primary' && /9MM SD/.test(await detail()), `Primary: the issued 9mm SD (${await key()})`);
  assert((await shown())[1] === 'pistolSd', 'the operator holds it');
  await press(page, BTN.A);
  assert(/PRIMARY WEAPON/.test(await G(() => document.querySelector('.lo-title')?.textContent)), 'A opens the primary weapon list');
  for (let i = 0; i < 6 && (await key()) !== 'w-smg'; i++) await press(page, BTN.DOWN);
  assert((await key()) === 'w-smg' && (await shown())[1] === 'smg', 'focusing the MP5 puts it in the operator\'s hands');
  assert(/Level 2/.test(await detail()) && /MP5/.test(await detail()), `the details show its stats and what it needs`);
  for (let i = 0; i < 6 && (await key()) !== 'w-pistolSd'; i++) await press(page, BTN.UP);
  await press(page, BTN.Y);
  assert(/ATTACHMENTS & UPGRADES/.test(await G(() => document.querySelector('.lo-sub')?.textContent)), 'Y customises the weapon');
  await focusTo(page, /Damage/, 20);
  const before = await G(() => window.__app.save.get().weapons.pistolSd.upgrades);
  assert((await key()) === 'up-damage', `focus the damage upgrade (${await key()})`);
  await press(page, BTN.A);
  const after = await G(() => window.__app.save.get().weapons.pistolSd.upgrades);
  const spent = 500 - (await G(() => window.__app.save.get().profile.credits));
  const total = (o) => o.damage + o.magazine + o.recoil + o.reload;
  assert(total(after) === total(before) + 1 && spent > 0, `A buys an upgrade (spent ${spent} cr)`);
  assert(/UPGRADES \[1\//.test(await G(() => document.querySelector('.lo-list')?.textContent)), 'the upgrade count shows');
  await press(page, BTN.B);
  await press(page, BTN.B);
  await press(page, BTN.B);

  // buying in place: level up via save, then buy the SMG from the list with A (it is equipped)
  await G(() => window.__app.save.update((d) => { d.profile.xp = 600; d.profile.credits = 700; }));
  await focusTo(page, /Loadout/);
  await press(page, BTN.A);
  await press(page, BTN.DOWN);
  await press(page, BTN.A);
  for (let i = 0; i < 6 && (await key()) !== 'w-smg'; i++) await press(page, BTN.DOWN);
  assert(/Buy MP5 Kurz · 600 cr/.test(await G(() => document.querySelector('.lo-acts')?.textContent)), 'the action bar offers the buy');
  await press(page, BTN.A);
  const sv = await G(() => window.__app.save.get());
  assert(sv.unlocks.includes('weapon:smg') && sv.loadout.primary === 'smg', 'buying unlocks the SMG and equips it');
  await press(page, BTN.B);
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

  // HQ: buy a suit tier and an upgrade and a new weapon; they apply in the match and persist
  await G(async () => {
    window.__app.save.update((d) => {
      d.profile.xp = 200000;
      d.profile.credits = 20000;
    });
  });
  await page.waitForTimeout(300);
  await page.locator('.btn', { hasText: 'Loadout' }).first().tap();
  await page.waitForSelector('.loadout-screen');
  // a tap previews a row; the action bar (A) acts on it
  const tapRow = async (k, act = true) => {
    await page.locator(`[data-key="${k}"]`).tap();
    await page.waitForTimeout(200);
    // (a tap on the row already focused acts at once)
    if (act && (await G((x) => window.__app.nav.focused?.dataset.key === x, k))) {
      await page.locator('.lo-act').first().tap();
      await page.waitForTimeout(200);
    }
  };
  const tapAct = async (re) => {
    await page.locator('.lo-act', { hasText: re }).first().tap();
    await page.waitForTimeout(150);
  };
  await tapRow('suit');
  await tapRow('piece-vest');
  // the next vest tier previews on the operator, then buy it from the action bar
  await tapRow('tier-1', false);
  const vestPreview = await G(() => JSON.parse(window.__app.current.shown)[0].legs ?? '');
  await tapAct(/Buy/);
  await tapAct(/Back/);
  await tapAct(/Back/);
  await tapRow('hq');
  await tapRow('hq-marks', false);
  await tapAct(/Upgrade/);
  const hq = await G(() => {
    const s = window.__app.save.get();
    return { vest: s.suit.worn.vest, marks: s.hq.marks, credits: s.profile.credits };
  });
  assert(hq.vest === 1 && hq.marks === 1 && hq.credits < 20000, `Loadout: suit tier and HQ upgrade bought (${JSON.stringify(hq)}, previewed torso ${vestPreview})`);
  await G(() => window.__app.save.update((d) => {
    d.unlocks.push('weapon:ak');
    d.weapons.ak.attachments = ['suppressor'];
    d.loadout.primary = 'ak';
  }));
  await G(() => window.__app.screens.pop());
  await page.locator('.btn', { hasText: 'Play' }).first().tap();
  await page.waitForSelector('.play-screen');
  await page.locator('.btn', { hasText: 'Deploy' }).tap();
  await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const live = await G(() => {
    const g = window.__app.current;
    return { armor: g.target.armorMul, marks: g.marks.max, weapon: g.weapons.slots[0].def.id, sup: g.weapons.slots[0].def.model.some((p) => p.role === 'suppressor'), noise: g.weapons.slots[0].stats.noise };
  });
  assert(live.armor < 1 && live.marks === 4, `in the match: vest armour (${live.armor}) and an extra mark (${live.marks})`);
  assert(live.weapon === 'ak' && live.sup && live.noise < 1, `the bought rifle with its suppressor, visible and quieter (${live.weapon}, noise ${live.noise})`);
  await G(() => window.__app.save.flush());
  await page.reload();
  await page.waitForFunction(() => document.getElementById('boot')?.classList.contains('done'), null, { timeout: 60000 });
  const kept = await G(() => {
    const s = window.__app.save.get();
    return s.suit.owned.vest === 1 && s.hq.marks === 1 && s.loadout.primary === 'ak';
  });
  assert(kept, 'suit, HQ and loadout survive a reload');

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
