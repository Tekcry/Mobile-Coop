// Section rating (feature/section-rating S7): Sector Ops rates each section as its connector unloads it. Solo (?autostart,
// the Warehouse, 4 guards a section): section 1 cleared clean shows the rating card (4 ticks, a grant line), it hides
// after ~4.6 s, window.__sectionRating.last.marks is 15; section 2 with a kill shows No kills as a miss; the extraction
// shows no card and the results list one line per section. Co-op (two pages over ?net=local, the host pumped headless):
// a synced knock-out pair (host + client inside SYNC_WINDOW) -> synced 1 on both cards, the client's gadgets topped up
// once at the rating, the host's revive cap up by the grant's syringe at the next section's begin; a rejoined client gets
// no card and no second top-up.
// No src edits: every step uses an existing hook. NEEDS HOOK items are marked in comments.
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';
import { until, hostAndJoin, waitSim, LOAD_MS } from './e2e-net-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const PARAMS = 'autostart=warehouseOps&mode=sector&sectorGuards=4';
let failed = false;
const all = [];

/** The rating card as a page shows it (null: no element yet). */
const cardState = (P) =>
  P.evaluate(() => {
    const el = document.querySelector('.rating-card');
    if (!el) return null;
    return {
      shown: !el.hidden && getComputedStyle(el).display !== 'none',
      ok: el.querySelectorAll('.rc-row.ok').length,
      miss: el.querySelectorAll('.rc-row.miss').length,
      rows: [...el.querySelectorAll('.rc-row')].map((r) => ({ cls: r.className, text: r.textContent })),
      grant: el.querySelector('.rc-grant')?.textContent ?? '',
      grantHidden: !!el.querySelector('.rc-grant')?.hidden,
      synced: el.querySelector('.rc-synced')?.textContent ?? '',
    };
  });
/** Wall-time poll from Node (a background page's own timers stop). Returns the ms it took. */
async function poll(fn, ms, what, step = 100) {
  const t0 = Date.now();
  for (;;) {
    if (await fn()) return Date.now() - t0;
    if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, step));
  }
}
const gadgetSum = (P) => P.evaluate(() => { const c = window.__app.current.weapons.gadgets.counts; return c.noise + c.gas; });
const emptyGadgets = (P) => P.evaluate(() => { const c = window.__app.current.weapons.gadgets.counts; c.noise = 0; c.gas = 0; });

// ---------------------------------------------------------------- solo
console.log('section rating: solo Sector Ops (clean section, a kill, the extraction)');
{
  const { browser, page, errors } = await launch({ url, params: PARAMS });
  const G = (f, a) => page.evaluate(f, a);
  const sim = async (s) => { for (let t = 0; t < s; t += 0.5) await G((d) => window.__app.loop.stepHeadless(d), Math.min(0.5, s - t)); await frames(page, 1); };
  const tp = (x, y, z, yaw = 0) => G(([a, b, c, w]) => { const g = window.__app.current; const P = g.player.position.constructor; g.player.controller.teleport(new P(a, b, c), w); }, [x, y, z, yaw]);
  try {
    await G(() => window.__pad.connect());
    await press(page, BTN.LS);
    await G(() => { const g = window.__app.current; g.target.damageMul = 0; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
    await sim(0.5);
    const S = await G(() => window.__app.current.world.map.sectors.map((s) => ({ cp: s.connector ? s.connector.checkpoint : null, exit: (s.connector ?? s.extract).box })));
    assert(S.length === 3, `the Warehouse has three sections (${S.length})`);
    assert(await G(() => !!window.__sectionRating), 'the rating hook exists in Sector Ops');
    const objectiveDone = () => G(() => { const m = window.__sector; if (m.run.current.objective.kind === 'download') { m.run.downloading = true; m.run.download(999); } else m.run.objectiveDone(); });
    const cycle = async (i) => {
      await objectiveDone();
      await sim(0.3);
      await tp(S[i].cp.x, S[i].cp.y, S[i].cp.z, S[i].cp.yaw);
      await sim(1.3); // the cycle locks the near door and unloads (and rates) the section
    };

    // section 1: clean (no kill, nothing seen: the guards' brains are off)
    assert((await cardState(page))?.shown !== true, 'no card before the first rating');
    await cycle(0);
    await poll(async () => (await cardState(page))?.shown, 8000, 'the rating card after section 1');
    const c1 = await cardState(page);
    assert(c1.ok === 4 && c1.miss === 0, `a clean section 1: four ticks (${JSON.stringify(c1.rows)})`);
    assert(c1.grant.length > 0 && !c1.grantHidden, `the card has a grant line ("${c1.grant}")`);
    const last1 = await G(() => window.__sectionRating.last);
    assert(last1 && last1.marks === 15, `__sectionRating.last.marks is 15 (${JSON.stringify(last1)})`);
    // the card hides by itself (4 s shown + 0.6 s fade of rendered frames)
    const t0 = Date.now();
    await poll(async () => { await frames(page, 2); return (await cardState(page))?.shown === false; }, 90000, 'the card hides', 50);
    const hid = (Date.now() - t0) / 1000;
    console.log(`  (card hid ${hid.toFixed(1)} s after it was first read; ~4.6 s of frame time)`);
    assert(hid > 0.5, `the card stayed up for a while before hiding (${hid.toFixed(1)} s)`);
    await sim(3.2); // section 2 loads
    assert((await G(() => window.__sector.debug().index)) === 1, 'section 2 is live');

    // section 2: a guard killed outright (the hook e2e-clear uses for kills: applyDamage; killOutright is the lethal finisher)
    await G(() => {
      const g = window.__app.current;
      const e = g.enemyMgr.enemies.find((q) => q.alive);
      e.killOutright({ amount: 9999, point: e.pos.clone(), dir: e.pos.clone().normalize(), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1 });
    });
    await sim(0.2);
    assert((await G(() => window.__sectionRating.stats.kills)) >= 1, 'the kill is counted in the live section stats');
    await cycle(1);
    await poll(async () => (await cardState(page))?.shown, 8000, 'the rating card after section 2');
    const c2 = await cardState(page);
    // MARK_LABELS order: Undetected, No kills, No alarms, Bodies hidden
    assert(/kill/i.test(c2.rows[1].text) && c2.rows[1].cls.includes('miss'), `No kills is a miss after a kill (${JSON.stringify(c2.rows)})`);
    const last2 = await G(() => window.__sectionRating.last);
    assert(last2 && (last2.marks & 2) === 0, `the rating's No kills bit is clear (marks ${last2?.marks})`);
    await poll(async () => { await frames(page, 2); return (await cardState(page))?.shown === false; }, 90000, 'the card hides again', 50);
    await sim(3.2); // section 3 loads
    assert((await G(() => window.__sector.debug().index)) === 2, 'section 3 is live');

    // the extraction: no card; the results list one line per section
    await objectiveDone();
    await sim(0.3);
    await tp((S[2].exit[0] + S[2].exit[2]) / 2, 0, (S[2].exit[1] + S[2].exit[3]) / 2);
    await sim(1);
    assert((await G(() => window.__sector.debug().phase)) === 'done', 'the extraction ends the run');
    assert((await cardState(page))?.shown !== true, 'no rating card at the extraction');
    await page.waitForSelector('.results-screen', { timeout: 20000 });
    assert((await cardState(page))?.shown !== true, 'no rating card on the results screen');
    const lines = await G(() => [...document.querySelectorAll('.results-screen ul.rs-sections li')].map((l) => l.textContent));
    assert(lines.length === 3, `the results list a line per section (${JSON.stringify(lines)})`);
    assert(lines.every((l) => /\d\/4/.test(l)), `each line reads its marks (${JSON.stringify(lines)})`);
  } catch (e) {
    failed = true;
    console.error(String(e));
    await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-section-rating-solo-fail.png' }).catch(() => {});
  } finally {
    all.push(...errors);
    await browser.close();
  }
}

// ---------------------------------------------------------------- co-op
console.log('section rating: co-op (a synced pair, the client top-up, the host syringe, a rejoin)');
{
  const { browser, A, B, errors: [eA, eB], startMode } = await hostAndJoin(url, 2, { params: 'net=local&sectorGuards=4' });
  // the host page is in the background: step it headless when its own rAF did not run (the e2e-sectorops pattern)
  let pumping = false;
  const pump = setInterval(async () => {
    if (pumping) return;
    pumping = true;
    try {
      await A.evaluate(() => {
        if (window.__raf === undefined) {
          window.__raf = 0;
          const f = () => { window.__raf++; requestAnimationFrame(f); };
          requestAnimationFrame(f);
        }
        const now = performance.now();
        const last = window.__pumpT ?? now;
        const idle = window.__pumpRaf === window.__raf;
        window.__pumpT = now;
        window.__pumpRaf = window.__raf;
        if (idle && window.__app.current) window.__app.loop.stepHeadless(Math.min(0.1, Math.max(1 / 60, (now - last) / 1000)));
      });
    } catch {}
    pumping = false;
  }, 40);
  const GA = (f, a) => A.evaluate(f, a);
  const GB = (f, a) => B.evaluate(f, a);
  const place = (P, x, y, z, yaw) => P.evaluate(([x, y, z, w]) => { const g = window.__app.current; g.team.end(true); g.traversal.reset(); g.player.controller.teleport(new g.player.position.constructor(x, y, z), w); g.player.cam.yaw = w; g.player.cam.pitch = 0; }, [x, y, z, yaw]);
  try {
    await startMode('sector', 'warehouseOps');
    await GA(() => { const g = window.__app.current; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
    await until(B, () => !!window.__app.current?.net, null, 15000, 'the client is in the match');
    const pid1 = await GB(() => window.__coop.session.selfId);
    // a kit with room, so a top-up shows: both players' gadgets emptied; the host's syringes read before the rating
    await emptyGadgets(A);
    await emptyGadgets(B);
    const syr0 = await GA(() => window.__app.current.net.revivesLeft());
    assert(syr0 === 2, `Normal: 2 revive syringes before the rating (${syr0})`);

    // a synced knock-out pair: the host's and the client's takedown in one host step (within SYNC_WINDOW 1.5 s).
    // NEEDS HOOK: a real client takedown (the client's own press, carried to the host) has no test hook; the pair is the
    // host's mode `onEnemyKilled` fed through `Enemy.knockOut` with the host's attacker id ('local') and the client's id.
    const ko = await GA((cid) => {
      const g = window.__app.current;
      const live = g.enemyMgr.enemies.filter((q) => q.alive).slice(0, 2);
      const who = ['local', cid];
      live.forEach((e, i) => e.knockOut({ amount: 9999, point: e.pos.clone(), dir: e.pos.clone().normalize(), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: who[i], sourcePos: g.player.position.clone(), impulse: 1 }));
      return { n: live.length, t: +g.time.toFixed(2) };
    }, pid1);
    assert(ko.n === 2, `two guards knocked out together (${JSON.stringify(ko)})`);
    await waitSim(200);
    const st = await GA(() => window.__sectionRating.stats);
    assert(st.synced === 1 && st.knockouts === 2 && st.kills === 0, `the host counts one synced pair, no kills (${JSON.stringify(st)})`);

    // the section's objective done, both players into the connector -> the rating
    await GA(() => { const m = window.__sector; if (m.run.current.objective.kind === 'download') { m.run.downloading = true; m.run.download(999); } else m.run.objectiveDone(); });
    const cp = await GA(() => window.__app.current.world.map.sectors[0].connector.checkpoint);
    await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
    await place(B, cp.x + 0.6, cp.y, cp.z, cp.yaw);
    await until(A, ([x, z]) => { const r = window.__app.current.net.remotes.values().next().value; return Math.hypot(r.feet.x - x, r.feet.z - z) < 0.4; }, [cp.x + 0.6, cp.z], 15000, 'the host sees the client in the connector');
    await place(A, cp.x - 0.6, cp.y, cp.z, cp.yaw);
    // the card on both screens (the client's carries the wire's rating)
    await poll(async () => (await cardState(A))?.shown, 60000, 'the rating card on the host');
    await poll(async () => (await cardState(B))?.shown, 60000, 'the rating card on the client');
    const cA = await cardState(A);
    const cB = await cardState(B);
    assert(/x1/.test(cA.synced) && /x1/.test(cB.synced), `synced 1 on both cards (host "${cA.synced}", client "${cB.synced}")`);
    assert(cA.grant.length > 0 && cB.grant.length > 0, `both cards show the grant (host "${cA.grant}", client "${cB.grant}")`);
    assert(/syringe/.test(cA.grant) && /syringe/.test(cB.grant), `the grant has a syringe (host "${cA.grant}", client "${cB.grant}")`);
    const lastB = await GB(() => window.__sectionRating?.last);
    assert(lastB && lastB.synced === 1, `the client's hook has the rating (${JSON.stringify(lastB)})`);

    // the client's gadgets topped up once, at the rating
    const gB = await gadgetSum(B);
    assert(gB > 0 && gB <= lastB.grant.gadget, `the client's gadgets were topped up (${gB} of a ${lastB.grant.gadget} charge grant)`);
    await waitSim(3000);
    assert((await gadgetSum(B)) === gB, `the client's top-up is not repeated (${gB} -> ${await gadgetSum(B)})`);

    // the host's grant lands as the next section begins: its gadgets and its revive cap
    await until(A, () => window.__sector.debug().index === 1, null, 30000, 'section 2 loads');
    await waitSim(300);
    const gA = await gadgetSum(A);
    const lastA = await GA(() => ({ last: window.__sectionRating.last, given: window.__sectionRating.lastGrant }));
    assert(gA > 0, `the host's gadgets were topped up as section 2 began (${gA})`);
    const syr1 = await GA(() => window.__app.current.net.revivesLeft());
    assert(lastA.given && lastA.given.syringe >= 1 && syr1 === syr0 + lastA.given.syringe, `the host's revive cap rose by the syringe grant (${syr0} -> ${syr1}, granted ${JSON.stringify(lastA.given)})`);
    assert((await cardState(A))?.shown !== undefined, 'the host card element exists');

    // rejoin: the client drops and comes back from its main menu; no card, no second top-up
    // (the rejoined page rebuilds its game state with the starting kit, so a repeated top-up shows only as a card or a rating)
    const code0 = await GA(() => window.__coop.session.code);
    const pidKeep = await GB(() => window.__coop.session.selfId);
    await GB(() => window.__coop.leave());
    await until(A, (id) => window.__coop.session.players.get(id)?.away === true, pidKeep, 20000, 'the host holds the dropped client');
    await until(B, (c) => (document.querySelector('.main-menu [data-key="rejoin"]')?.textContent ?? '').includes(`Rejoin ${c}`), code0, 60000, 'the client main menu offers Rejoin <code>');
    await GB(() => document.querySelector('.main-menu [data-key="rejoin"]').click());
    await until(B, () => !!window.__app.current?.net && !!window.__app.current.puppet, null, LOAD_MS, 'the client is back in the match');
    // the first sector message after the rejoin is the late-join path: the rating goes to the results list only
    await until(B, () => window.__app.current.net.sawSector === true, null, 15000, 'the rejoined client has its first sector message');
    await waitSim(1500);
    const cB2 = await cardState(B);
    assert(!cB2 || cB2.shown === false, `no rating card on the rejoined client (${JSON.stringify(cB2)})`);
    const seq = await GB(() => window.__app.current.net.ratingSeq);
    assert(seq === 0 || seq === undefined, `the rejoined client took no new rating (ratingSeq ${seq})`);
    const syr2 = await GA(() => window.__app.current.net.revivesLeft());
    assert(syr2 === syr1, `the host's revive cap did not move again (${syr1} -> ${syr2})`);
  } catch (e) {
    failed = true;
    console.error(String(e));
    await A.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-section-rating-coop-fail.png' }).catch(() => {});
  } finally {
    clearInterval(pump);
    all.push(...eA, ...eB);
    await browser.close();
  }
}

console.log(all.length ? 'console problems:\n' + all.join('\n') : 'no console errors');
process.exit(failed || all.length ? 1 : 0);
