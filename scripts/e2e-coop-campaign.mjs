// (campaign-mode CM7, PLAN 6) e2e-coop part `campaign` (run-e2e: `e2e-coop:campaign`; PART_SCRIPT, its own script): the campaign in
// the co-op lobby, two players over `?net=local&campaign=1&missions=1`.
// Lobby: the host's Mission row lists Prologue, Mission 1: Three Grey Coats and Mission 1: Two-Key Ledger in that order; the
// partner's lobby shows the host's pick and the same briefing text; Start is refused with one player (the blocked text, the
// room stays in the lobby), with two Three Grey Coats starts at W1 on both pages, and the host's `campaign:save` holds W1.
// Continue: the host leaves, a fresh host page of the same browser profile offers "Continue campaign" (the saved mission and
// section, difficulty locked), a different fresh page with no rejoin token joins (G147) and the match starts at the saved
// section (the mission resumed: `SectorMode.carried` set). The run ends through the `__mission` test hook (`host.finish()`, the
// extraction's own call): the results read MISSION COMPLETE, 100% PERFECT, no kills, and BOTH pages' `campaign:progress` hold
// the mission, the save is cleared.
// (plan check polish 3) Every page runs in its OWN browser context (own IndexedDB, own localStorage): the host's `campaign:save`
// and `campaign:progress` are the host profile's, the partner's `campaign:progress` is written by the partner's own client from
// the host's `pc` (the check that failed to prove anything when both pages shared one context). A context does not share
// BroadcastChannel either, so the room's `ss-room-*` channel is relayed through Node (the e2e-coop-gpu `separate` variant).
// Two CM5 checker notes are LOGGED for the laptop run, never asserted: `CM5-CHECK practice` (does the client treat a Continue run
// as practice, skipping its rewards: `net.practice`, `stats.practice`; the Continue here is at W1, so the answer there is
// "no": a later-section Continue is not exercised) and `CM5-CHECK partner results rows` (which category rows the partner's
// results panel shows: the wire carries `pc` only, so the kills / alarms rows are expected to be missing).
// The guards are frozen and nobody can be hurt (the test reads the campaign, not the stealth).
import { tmpdir } from 'node:os';
import { join as joinPath } from 'node:path';
import { chromium } from 'playwright-core';
import { launchOptions, fakePointerLock, openPage, assert } from './e2e-lib.mjs';
import { until, setSimPages, LOAD_MS, NET_VIEWPORT } from './e2e-net-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const PARAMS = 'net=local&campaign=1&missions=1';
/** The Mission row's entries in order (campaignOrder.ts `entryRowText`: label, title). */
const ROWS = ['Prologue: Marlow Yard (training)', 'Mission 1: Three Grey Coats', 'Mission 1: Two-Key Ledger'];
const MISSION = 'threeGreyCoats';
/** (mission-rules R4) `CAMPAIGN_TWO_PLAYERS` (src/game/mission/campaign.ts): the blocked Start button's text. */
const TWO_PLAYERS = 'Campaign missions need exactly two players';
let failed = false;
let where = 'start';

// ---- the room's BroadcastChannel relayed through Node (separate contexts), as e2e-coop-gpu's `separate` variant ----

/** Page side: `BroadcastChannel` for `ss-room-*` goes out through `__relayOut` and comes in through `__relayIn`; any other name stays native. */
function relayInit() {
  const Native = window.BroadcastChannel;
  const chans = new Map();
  window.__relayIn = (name, data) => {
    for (const c of chans.get(name) ?? []) { try { c.onmessage?.({ data }); } catch (e) { console.error('relay handler', e); } }
  };
  window.BroadcastChannel = class {
    constructor(name) {
      if (!String(name).startsWith('ss-room-')) return new Native(name);
      this.name = name;
      this.onmessage = null;
      if (!chans.has(name)) chans.set(name, new Set());
      chans.get(name).add(this);
    }
    postMessage(d) {
      // same page, other instances (a real channel delivers to them too)
      for (const c of chans.get(this.name) ?? []) if (c !== this) setTimeout(() => c.onmessage?.({ data: d }), 0);
      window.__relayOut(this.name, JSON.stringify(d));
    }
    close() { chans.get(this.name)?.delete(this); }
    addEventListener() {}
    removeEventListener() {}
  };
}

const browser = await chromium.launch(launchOptions());
/** The pages the relay delivers to (every open page of every context). */
const live = new Set();
const relayQueues = new Map();
const errLists = [];

/** A fresh browser context: its own IndexedDB and localStorage, the relay installed. */
async function newContext() {
  const ctx = await browser.newContext({ viewport: NET_VIEWPORT, acceptDownloads: true });
  ctx.setDefaultNavigationTimeout(120000);
  await ctx.addInitScript(fakePointerLock);
  await ctx.addInitScript(relayInit);
  await ctx.exposeBinding('__relayOut', ({ page }, name, json) => {
    for (const other of live) {
      if (other === page) continue;
      // in order per target page
      const q = (relayQueues.get(other) ?? Promise.resolve()).then(() => other.evaluate(([n, j]) => window.__relayIn?.(n, JSON.parse(j)), [name, json])).catch(() => {});
      relayQueues.set(other, q);
    }
  });
  return ctx;
}

/** A page of `ctx` on the main menu, known to the relay. */
async function open(ctx) {
  const { page, errors } = await openPage(ctx, url, PARAMS);
  errLists.push(errors);
  live.add(page);
  return page;
}

// Both sims keep running once a page is in a match: a page whose rAF did not advance is stepped headless (e2e-coop-gpu's pump).
let pumping = false;
const pump = setInterval(async () => {
  if (pumping) return;
  pumping = true;
  for (const P of live) {
    await P.evaluate(() => {
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
      if (idle && window.__app?.current?.net) window.__app.loop.stepHeadless(Math.min(0.1, Math.max(1 / 60, (now - last) / 1000)));
    }).catch(() => {});
  }
  pumping = false;
}, 40);

// ---- helpers ----

/** Poll `fn` (async, from Node) until it is truthy; throw with `what` past `ms` (wall time: the lobby and the menus have no sim clock). */
async function waitFor(what, ms, fn) {
  const t0 = Date.now();
  for (;;) {
    let v = null;
    try { v = await fn(); } catch { /* a page mid-navigation: poll again */ }
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 120));
  }
}

/** The lobby options row `label`'s value text (a choice's or a locked row's), null when there is no such row. */
const rowText = (P, label) => P.evaluate((label) => {
  const r = [...document.querySelectorAll('.lobby-opts .row')].find((x) => x.querySelector('.row-label')?.textContent === label);
  return r ? (r.querySelector('.choice-val') ?? r.querySelector('.locked-val'))?.textContent ?? '' : null;
}, label);
/** Is the lobby row `label` a locked row. */
const rowLocked = (P, label) => P.evaluate((label) => !!([...document.querySelectorAll('.lobby-opts .row')].find((x) => x.querySelector('.row-label')?.textContent === label)?.classList.contains('row-locked')), label);
/** The host's Mission row: the next entry (the right arrow). */
const nextMission = (P) => P.evaluate(() => {
  const r = [...document.querySelectorAll('.lobby-opts .row')].find((x) => x.querySelector('.row-label')?.textContent === 'Mission');
  r?.querySelectorAll('.choice-arrow')[1]?.click();
});
/** The briefing the Mission row carries in the context panel (`data-ctx`): its title and paragraphs. */
const brief = (P) => P.evaluate(() => {
  const el = document.querySelector('.lobby-opts [data-campaign]');
  if (!el) return null;
  const d = new DOMParser().parseFromString(el.dataset.ctx ?? '', 'text/html');
  return { title: d.querySelector('h3')?.textContent ?? '', paras: [...d.querySelectorAll('p')].map((p) => p.textContent ?? '') };
});

/** Read a kv record of the page's own IndexedDB (the game's `shoulder-strike` database, store `kv`): null when absent. */
const kvGet = (P, key) => P.evaluate((k) => new Promise((res) => {
  const r = indexedDB.open('shoulder-strike');
  r.onsuccess = () => {
    try {
      const q = r.result.transaction('kv').objectStore('kv').get(k);
      q.onsuccess = () => { r.result.close(); res(q.result ?? null); };
      q.onerror = () => { r.result.close(); res(null); };
    } catch {
      res(null);
    }
  };
  r.onerror = () => res(null);
}), key);
/** Wait (wall time, polled from here) until the page's kv record `key` satisfies `ok`; returns it. */
const kvWait = (P, key, ok, what, ms = 30000) => waitFor(what, ms, async () => { const v = await kvGet(P, key); return ok(v) ? { v } : null; }).then((r) => r.v);

/** Type the room code on a main menu page and join. */
async function joinByCode(P, code) {
  await P.click('.main-menu .btn:has-text("Co-op")');
  await P.click('.btn:has-text("Join with code")');
  await P.keyboard.type(code.toLowerCase());
  await P.keyboard.press('Enter');
}
/** Press the host's Start button (the real one). */
const clickStart = (P) => P.evaluate(() => document.querySelector('.lobby-actions .btn[data-key="start"]')?.click());
/** A sector match with its net on this page. */
const inMatch = (P, what) => until(P, () => { const g = window.__app.current; return g?.opts?.mode === 'sector' && !!g.net && !g.isEnded; }, null, LOAD_MS, what);
/** The host's guards frozen and nobody hurt (the test reads the campaign, not the stealth). Needs the client's state on the host. */
async function freeze(A, what) {
  await until(A, () => window.__app.current.net.remotes.values().next().value?.state, null, 15000, `${what}: the client's state reaches the host`);
  await A.evaluate(() => {
    const g = window.__app.current;
    g.target.damageMul = 0;
    for (const r of g.net.remotes.values()) r.damageMul = 0;
    g.enemyMgr.update = () => {};
    if (g.security) g.security.fixedUpdate = () => {};
  });
}
/** The results panel as drawn on page `P`. */
const panel = (P) => P.evaluate(() => ({
  title: document.querySelector('.results-title')?.textContent ?? '',
  sub: document.querySelector('.results-sub')?.textContent ?? '',
  pct: document.querySelector('.campaign-pct')?.textContent ?? '',
  perfect: !!document.querySelector('.campaign-pct.perfect'),
  cont: document.querySelector('.rs-continued')?.textContent ?? '',
  rows: [...document.querySelectorAll('.campaign-rows .stat')].map((s) => [s.querySelector('span')?.textContent ?? '', s.querySelector('b')?.textContent ?? '']),
}));

let A = null;
let B = null;
let A2 = null;
let C = null;
try {
  // ---- 1. the lobby: the entries in order, the partner's view, Start refused alone, W1 on both, the save ----
  where = 'host lobby';
  console.log('host opens a room: the Mission row lists the campaign in order');
  const ctxA = await newContext();
  A = await open(ctxA);
  await A.click('.main-menu .btn:has-text("Co-op")');
  await A.click('.btn:has-text("Host a room")');
  await until(A, () => !!document.querySelector('.lobby-screen') && !!window.__coop, null, 15000, 'host lobby');
  const code = await A.evaluate(() => window.__coop.session.code);
  // a new room starts on the prologue; the arrow steps on through the list and round
  for (let i = 0; i < ROWS.length; i++) {
    if (i > 0) await nextMission(A);
    await waitFor(`the Mission row reads "${ROWS[i]}"`, 15000, async () => (await rowText(A, 'Mission')) === ROWS[i]);
  }
  assert(true, `the Mission row lists the campaign in order: ${ROWS.join(' / ')}`);
  await nextMission(A);
  await waitFor('the Mission row wraps to the prologue', 15000, async () => (await rowText(A, 'Mission')) === ROWS[0]);
  await nextMission(A);
  await waitFor('the Mission row is Three Grey Coats', 15000, async () => (await rowText(A, 'Mission')) === ROWS[1]);
  const room = await A.evaluate(() => { const s = window.__coop.session; return { mode: s.mode, map: s.map, sm: s.campaignPick }; });
  assert(room.mode === 'sector' && room.map === 'tallowWharf' && room.sm === MISSION, `picking Three Grey Coats sets Sector Ops on Tallow Wharf with the mission (${JSON.stringify(room)})`);
  assert((await rowText(A, 'Mode')) === 'Campaign', 'the Mode row reads Campaign on a campaign entry');

  // Start is refused with one player (mission-rules R4): no match, the room stays in the lobby, the button carries the reason
  const alone = await A.evaluate(() => { const s = window.__coop.session; return { start: s.startMatch(), phase: s.phase, n: s.players.size }; });
  assert(alone.start === null && alone.phase === 'lobby' && alone.n === 1, `Start is refused with one player: startMatch() null, the room in the lobby (${JSON.stringify(alone)})`);
  await waitFor('the Start button shows the blocked text', 8000, () => A.evaluate((t) => { const b = document.querySelector('.lobby-actions .btn[data-key="start"]'); return !!b && b.classList.contains('blocked') && b.dataset.locked === t; }, TWO_PLAYERS));
  await clickStart(A);
  await waitFor('the room stays in the lobby after a Start press', 3000, () => A.evaluate(() => window.__coop.session.phase === 'lobby' && !window.__app.current?.net)).catch(() => { throw new Error('a Start press with one player left the lobby'); });
  assert(true, `the host's Start button is blocked ("${TWO_PLAYERS}") and a press starts nothing`);
  // the host's briefing: this peer's own progress (none yet: Mission 1 is past the first entry not done, so the spoiler line shows)
  const hb = await waitFor('the host briefing carries the spoiler line', 15000, async () => { const b = await brief(A); return b && b.paras.includes('Story spoilers ahead') ? b : null; });
  assert(hb.title === ROWS[1] && hb.paras.includes('Needs exactly two players') && hb.paras.length >= 4, `the host's briefing: title, spoiler, the briefing lines, two players, difficulty (${JSON.stringify(hb.paras)})`);

  where = 'partner joins (own context)';
  console.log('the partner joins from its own browser context');
  const ctxB = await newContext();
  B = await open(ctxB);
  await joinByCode(B, code);
  await until(A, () => window.__coop.session.players.size === 2, null, 15000, 'host sees the partner');
  await until(B, () => !!window.__coop.session.hostId && window.__coop.session.players.size === 2, null, 15000, 'partner sees the host lobby');
  await waitFor("the partner's Mission row shows the host's pick", 15000, async () => (await rowText(B, 'Mission')) === ROWS[1]);
  assert((await rowText(B, 'Mode')) === 'Campaign' && (await rowLocked(B, 'Mission')), "the partner's lobby shows the host's pick (Campaign, Mission 1: Three Grey Coats), locked");
  const bb = await waitFor("the partner's briefing", 15000, async () => { const b = await brief(B); return b && b.paras.includes('Story spoilers ahead') ? b : null; });
  assert(JSON.stringify(bb) === JSON.stringify(hb), `the partner's lobby shows the same briefing text (${JSON.stringify(bb.paras)})`);

  where = 'W1 on both';
  console.log('ready, Start: Three Grey Coats starts at W1 on both pages');
  await B.evaluate(() => window.__coop.session.setReady(true));
  await waitFor('Start unblocked', 8000, () => A.evaluate(() => window.__coop.session.allReady && !document.querySelector('.lobby-actions .btn[data-key="start"]')?.classList.contains('blocked')));
  const difficulty = await A.evaluate(() => window.__coop.session.difficulty);
  await clickStart(A);
  await inMatch(A, 'the host match');
  await inMatch(B, 'the partner match');
  setSimPages([A, B]);
  await until(A, () => !!window.__sector && !!window.__mission && window.__sector.debug().index === 0, null, LOAD_MS, 'the host runs section W1');
  await freeze(A, 'first run');
  const w1 = await A.evaluate(() => { const g = window.__app.current; const d = window.__sector.debug(); return { map: g.world.map.id, index: d.index, id: d.id, first: g.world.map.sectors[0].id, name: g.world.map.sectors[0].name, mission: d.mission?.id, carried: window.__sector.carried }; });
  assert(w1.map === 'tallowWharf' && w1.index === 0 && w1.id === w1.first && w1.mission === MISSION && w1.carried === null, `the host is in Three Grey Coats at W1 (${w1.name}), a fresh run (${JSON.stringify(w1)})`);
  await until(B, () => { const r = window.__app.current.net.mission?.runner; return !!r && r.def.id === 'threeGreyCoats' && r.section === 0; }, null, 20000, 'the partner mirrors Three Grey Coats at its first section');
  assert((await B.evaluate(() => window.__app.current.world.map.id)) === 'tallowWharf', 'the partner is on Tallow Wharf in the same mission, section 0 (W1)');
  const save1 = await kvWait(A, 'campaign:save', (s) => !!s && s.key === MISSION && s.section === 0, "the host's campaign:save holds W1");
  assert(save1.mission === MISSION && save1.map === 'tallowWharf' && save1.section === 0 && save1.difficulty === difficulty, `the host's campaign:save holds W1 (section ${save1.section}, ${save1.difficulty})`);
  assert((await kvGet(B, 'campaign:save')) === null && (await kvGet(B, 'campaign:progress')) === null, "the partner's own profile has no save and no progress yet");

  // ---- 2. the host leaves; a fresh host page continues; a stranger joins ----
  where = 'host leaves';
  console.log('the host leaves, a fresh host page offers Continue');
  await A.evaluate(() => window.__coop.leave(false));
  await waitFor('the host is back at its main menu', 20000, () => A.evaluate(() => !!document.querySelector('.main-menu') && !window.__app.current?.net));
  const save2 = await kvGet(A, 'campaign:save');
  assert(!!save2 && save2.section === 0 && save2.key === MISSION, 'leaving keeps the host\'s campaign:save');
  setSimPages([]);
  // the old partner page goes (its context, with its rejoin token, too); the fresh host page shares the HOST's profile (the save)
  live.delete(B);
  await ctxB.close();
  B = null;
  live.delete(A);
  await A.close();
  A = null;
  A2 = await open(ctxA);
  await waitFor('the main menu offers "Continue campaign"', 30000, () => A2.evaluate(() => { const b = document.querySelector('.main-menu [data-key="continue-campaign"]'); return !!b && /Continue campaign/.test(b.textContent ?? ''); }));
  assert(true, 'the fresh host page offers "Continue campaign" on the main menu');
  await A2.evaluate(() => document.querySelector('.main-menu [data-key="continue-campaign"]').click());
  await until(A2, () => !!document.querySelector('.lobby-screen') && !!window.__coop && window.__coop.session.isHost, null, 15000, 'the Continue room');
  const code2 = await A2.evaluate(() => window.__coop.session.code);
  assert(code2 !== code, `Continue opens a new room (${code2})`);
  const want = `Continue: Three Grey Coats, ${w1.name}`;
  await waitFor(`the Mission row reads "${want}"`, 15000, async () => (await rowText(A2, 'Mission')) === want);
  assert(await rowLocked(A2, 'Difficulty'), 'a Continue locks the difficulty to the save\'s');
  const cr = await A2.evaluate(() => { const s = window.__coop.session; return { mode: s.mode, map: s.map, sm: s.campaignPick, d: s.difficulty, resume: !!s.campaignResume }; });
  assert(cr.mode === 'sector' && cr.map === 'tallowWharf' && cr.sm === MISSION && cr.d === difficulty && cr.resume, `the Continue room is the saved mission at the saved difficulty (${JSON.stringify(cr)})`);
  const cb = await waitFor('the Continue briefing', 15000, async () => { const b = await brief(A2); return b && b.paras.some((p) => /kept from the save/.test(p)) ? b : null; });
  assert(cb.title === want, `the briefing is the Continue's (${cb.title})`);

  where = 'stranger joins';
  console.log('a different fresh page (own context, no rejoin token) joins');
  const ctxC = await newContext();
  C = await open(ctxC);
  assert(await C.evaluate(() => !document.querySelector('.main-menu [data-key="rejoin"]')), 'the joiner has no rejoin token (G147: any partner can join a saved mission)');
  assert((await kvGet(C, 'campaign:progress')) === null, "the joiner's own profile has no campaign progress");
  await joinByCode(C, code2);
  await until(A2, () => window.__coop.session.players.size === 2, null, 15000, 'host sees the joiner');
  await until(C, () => !!window.__coop.session.hostId && window.__coop.session.players.size === 2, null, 15000, 'joiner sees the host lobby');
  await waitFor("the joiner's Mission row shows the host's pick", 15000, async () => (await rowText(C, 'Mission')) === ROWS[1]);
  await C.evaluate(() => window.__coop.session.setReady(true));
  await waitFor('Start unblocked', 8000, () => A2.evaluate(() => window.__coop.session.allReady && !document.querySelector('.lobby-actions .btn[data-key="start"]')?.classList.contains('blocked')));

  where = 'continued match';
  console.log('Start: the match starts at the saved section');
  await clickStart(A2);
  await inMatch(A2, 'the continued host match');
  await inMatch(C, 'the continued joiner match');
  setSimPages([A2, C]);
  await until(A2, () => !!window.__sector && !!window.__mission, null, LOAD_MS, 'the host runs the continued mission');
  await freeze(A2, 'continued run');
  const k = await A2.evaluate(() => { const g = window.__app.current; const d = window.__sector.debug(); return { map: g.world.map.id, index: d.index, mission: d.mission?.id, carried: window.__sector.carried, resumedAt: window.__sector.resumedAt, difficulty: g.opts.difficulty ?? 'normal' }; });
  assert(k.map === 'tallowWharf' && k.index === save1.section && k.mission === MISSION && k.carried !== null && k.resumedAt === save1.section + 1 && k.difficulty === difficulty, `the continued match starts at the saved section (${JSON.stringify(k)})`);
  await until(C, () => { const r = window.__app.current.net.mission?.runner; return !!r && r.def.id === 'threeGreyCoats' && r.section === 0; }, null, 20000, 'the joiner mirrors the mission at the saved section');
  assert(true, 'the joiner is in the same mission at the saved section');

  // ---- 3. the end: the __mission hook, the results, both pages' progress ----
  where = 'the end';
  console.log('the run ends through the __mission hook: MISSION COMPLETE, 100% PERFECT, both pages record it');
  assert((await kvGet(A2, 'campaign:progress')) === null && (await kvGet(C, 'campaign:progress')) === null, 'neither profile holds the mission before the end');
  // CM5 note 1 (logged): does the client treat a Continue run as practice?
  const prac = await C.evaluate(() => ({ practice: window.__app.current.net?.practice ?? null, statsPractice: window.__app.current.stats?.practice ?? null }));
  const hostPrac = await A2.evaluate(() => window.__sector.practiceFrom);
  console.log(`  CM5-CHECK practice: joiner net.practice=${prac.practice} stats.practice=${prac.statsPractice}; host practiceFrom=${hostPrac} (Continue at section ${save1.section + 1}: a later-section Continue is not exercised here)`);
  await A2.evaluate(() => window.__mission.host.finish());
  await until(A2, () => !!document.querySelector('.results-screen'), null, 30000, 'the host results screen');
  await until(C, () => !!document.querySelector('.results-screen'), null, 30000, 'the joiner results screen');
  const ph = await panel(A2);
  assert(ph.title === 'MISSION COMPLETE' && ph.sub === 'Three Grey Coats', `the host's results: MISSION COMPLETE, Three Grey Coats (${ph.title} / ${ph.sub})`);
  assert(/^100%\s+PERFECT$/.test(ph.pct.trim()) && ph.perfect, `the host's results show 100% and PERFECT (${JSON.stringify(ph.pct)})`);
  const kills = ph.rows.find((r) => r[0] === 'Kills');
  const alarms = ph.rows.find((r) => r[0] === 'Alarms raised');
  assert(!!kills && kills[1] === '0' && !!alarms && alarms[1] === '0', `no kills, no alarms in the host's category rows (${JSON.stringify(ph.rows)})`);
  assert(/Continued from section 1/.test(ph.cont), `the host's results say it was a Continue (${ph.cont})`);
  const pc = await panel(C);
  assert(pc.title === 'MISSION COMPLETE' && /^100%\s+PERFECT$/.test(pc.pct.trim()) && pc.perfect, `the joiner's results show MISSION COMPLETE, 100% and PERFECT (${pc.title} / ${JSON.stringify(pc.pct)})`);
  // CM5 note 2 (logged): which category rows does the partner's panel show (the wire carries `pc` only)?
  console.log(`  CM5-CHECK partner results rows: ${pc.rows.length ? pc.rows.map((r) => `${r[0]}=${r[1]}`).join(', ') : '(none)'}; host rows: ${ph.rows.map((r) => r[0]).join(', ')}; joiner continued line: ${JSON.stringify(pc.cont)}`);
  const prac2 = await C.evaluate(() => ({ practice: window.__app.current?.net?.practice ?? null, statsPractice: window.__app.current?.stats?.practice ?? null }));
  console.log(`  CM5-CHECK practice (after the end): joiner net.practice=${prac2.practice} stats.practice=${prac2.statsPractice}`);

  // each page's OWN profile (own contexts): the host's own record, the joiner's from the host's `pc`
  const done = (r) => !!r && !!r.done && !!r.done[MISSION] && r.done[MISSION].best === 100 && r.done[MISSION].plays === 1;
  const hp = await kvWait(A2, 'campaign:progress', done, "the host's campaign:progress holds the mission");
  const jp = await kvWait(C, 'campaign:progress', done, "the joiner's campaign:progress holds the mission (its own IndexedDB, from the host's pc)");
  assert(true, `both pages' campaign:progress hold Three Grey Coats at 100% (host ${JSON.stringify(hp.done[MISSION])}, joiner ${JSON.stringify(jp.done[MISSION])})`);
  await kvWait(A2, 'campaign:save', (s) => s === null, "the host's campaign:save is cleared at the mission's end");
  assert(true, "the host's campaign:save is cleared at the mission's end");
} catch (e) {
  failed = true;
  console.error(`${String(e)}\n(at: ${where})`);
  for (const [n, P] of [['A', A], ['B', B], ['A2', A2], ['C', C]]) {
    if (P) await P.screenshot({ path: process.env.SHOT ?? joinPath(tmpdir(), `e2e-coop-campaign-${n}-fail.png`) }).catch(() => {});
  }
} finally {
  clearInterval(pump);
  await browser.close().catch(() => {});
}

const real = errLists.flat().filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext|Failed to load resource/i.test(e));
if (real.length) {
  failed = true;
  console.error('console errors:\n' + real.join('\n'));
}
console.log(failed ? 'COOP CAMPAIGN E2E FAILED' : 'coop campaign e2e passed');
process.exit(failed ? 1 : 0);
