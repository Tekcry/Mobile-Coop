// Section rating (feature/section-rating S7, S6): the rating card on Marlow Yard (solo, co-op, the re-plan). The Sector Ops
// Warehouse parts left with that map (clean-up F).
import { launch, frames, assert } from './e2e-lib.mjs';
import { until, hostAndJoin, waitSim, LOAD_MS } from './e2e-net-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
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

// ---------------------------------------------------------------- Marlow Yard (S6)
// Solo `?autostart=ctcourse&mode=course`: A1 (a passive checker) is unrated, A2-A8 are rated. The test jumps to A2
// (`startAt`), seals its exit airlock through the state (what both players on the pad do) -> the card with 4 ticks and
// the gadget grant on the emptied kit; in A3 a kill then a restart -> the set starts again and is rated clean.
console.log('section rating: Marlow Yard solo (a rated set, a restart)');
{
  const { browser, page, errors } = await launch({ url, params: 'autostart=ctcourse&mode=course' });
  const G = (f, a) => page.evaluate(f, a);
  const sim = async (s) => { for (let t = 0; t < s; t += 0.5) await G((d) => window.__app.loop.stepHeadless(d), Math.min(0.5, s - t)); await frames(page, 1); };
  // the exit airlock of the current set seals (the cycle done), and the mode acts on the events at once
  const seal = () => G(() => { const m = window.__course; const st = m.state; st.seal(st.airById.get(st.currentBay.exit)); m.handle(); return st.bay; });
  try {
    await poll(() => G(() => !!window.__course?.state && !!window.__app?.current), 60000, 'the Marlow course mode');
    await G(() => { const g = window.__app.current; g.target.damageMul = 0; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
    await sim(0.5);
    const rated = await G(() => window.__course.state.def.bays.map((b) => !!b.rated));
    assert(rated.join() === 'false,true,true,true,true,true,true,true', `A1 unrated, A2-A8 rated (${rated.join()})`);
    assert(await G(() => !!window.__sectionRating && window.__sectionRating.last === null), 'the course rating hook exists, nothing rated yet');
    await G(() => { const m = window.__course; m.state.startAt(2); m.handle(); });
    await emptyGadgets(page);
    await sim(0.5);
    assert((await seal()) === 2, 'A2 sealed: A3 is the set now');
    await poll(async () => (await cardState(page))?.shown, 8000, 'the rating card after A2');
    const c = await cardState(page);
    assert(c.ok === 4 && c.miss === 0, `a clean A2: four ticks (${JSON.stringify(c.rows)})`);
    assert(/charge/.test(c.grant) && !c.grantHidden, `the card names the gadget charges ("${c.grant}")`);
    const r1 = await G(() => ({ last: window.__sectionRating.last, given: window.__sectionRating.lastGrant, title: document.querySelector('.rating-card .rc-title')?.textContent ?? '' }));
    assert(r1.last && r1.last.sectionId === 'A2' && r1.last.marks === 15, `A2 rated 15 (${JSON.stringify(r1.last)})`);
    assert(/Carriage Shed/.test(r1.title), `the card names the set ("${r1.title}")`);
    const gs = await gadgetSum(page);
    assert(gs > 0 && gs === r1.given.gadget, `the grant topped the kit up at once (${gs}, given ${JSON.stringify(r1.given)})`);
    // A3: a kill counts, then a restart starts the set's rating again (never re-rates A2)
    await G(() => window.__course.state.record('kills', 1));
    await sim(0.2);
    assert((await G(() => window.__sectionRating.stats.kills)) === 1, 'the kill is in A3\'s live stats');
    await G(() => window.__course.restartCheckpoint());
    await sim(1);
    assert((await G(() => window.__course.restarts)) === 1, 'A3 restarted');
    assert((await G(() => window.__sectionRating.stats.kills)) === 0, 'the restart reset A3\'s rating stats');
    assert((await seal()) === 3, 'A3 sealed');
    const r2 = await G(() => window.__sectionRating.last);
    assert(r2 && r2.sectionId === 'A3' && r2.marks === 15, `A3 rated clean after the restart (${JSON.stringify(r2)})`);
    const rt = await G(() => window.__course.wire().rt);
    assert(rt && rt.sec === 2 && rt.marks === 15, `the course wire carries the last rating (${JSON.stringify(rt)})`);
  } catch (e) {
    failed = true;
    console.error(String(e));
    await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-section-rating-marlow-fail.png' }).catch(() => {});
  } finally {
    all.push(...errors);
    await browser.close();
  }
}

// ---------------------------------------------------------------- Marlow Yard co-op (S6 check should-fix 2)
// Host + client on ?net=local course mode: the host jumps to A2 (`startAt`, A1 is the passive checker) and seals its
// airlock through the state -> `.rating-card` on both pages (4 ticks), the client's hook matches the host's marks, the
// client's emptied gadgets topped up once; a client rejoin gets no card.
console.log('section rating: Marlow Yard co-op (the card on both pages, the client top-up, a rejoin)');
{
  const { browser, A, B, errors: [eA, eB], startMode } = await hostAndJoin(url, 2, { params: 'net=local' });
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
  try {
    await startMode('course', 'ctcourse');
    await until(A, () => !!window.__course?.state && !!window.__sectionRating, null, 30000, 'the host course running');
    await until(B, () => !!window.__course?.wire, null, 30000, 'the client has the course state');
    await GA(() => { const g = window.__app.current; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
    await GA(() => { const m = window.__course; m.state.startAt(2); m.handle(); });
    await emptyGadgets(A);
    await emptyGadgets(B);
    await waitSim(500);
    assert((await gadgetSum(B)) === 0, 'the client kit is empty before the rating');
    await GA(() => { const m = window.__course; const st = m.state; st.seal(st.airById.get(st.currentBay.exit)); m.handle(); });
    await poll(async () => (await cardState(A))?.shown, 60000, 'the rating card on the host');
    await poll(async () => (await cardState(B))?.shown, 60000, 'the rating card on the client');
    const cA = await cardState(A);
    const cB = await cardState(B);
    assert(cA.ok === 4 && cA.miss === 0, `host: a clean A2, four ticks (${JSON.stringify(cA.rows)})`);
    assert(cB.ok === 4 && cB.miss === 0, `client: a clean A2, four ticks (${JSON.stringify(cB.rows)})`);
    const lastA = await GA(() => window.__sectionRating.last);
    const lastB = await GB(() => window.__sectionRating?.last);
    assert(lastA && lastA.sectionId === 'A2' && lastA.marks === 15, `host rated A2 15 (${JSON.stringify(lastA)})`);
    assert(lastB && lastB.sectionId === lastA.sectionId && lastB.marks === lastA.marks, `the client's last matches the host's (${JSON.stringify(lastB)})`);
    const gB = await gadgetSum(B);
    assert(gB > 0 && gB <= (lastB.grant?.gadget ?? 99), `the client's gadgets were topped up (${gB} of ${JSON.stringify(lastB.grant)})`);
    await waitSim(3000);
    assert((await gadgetSum(B)) === gB, `the client's top-up is not repeated (${gB} -> ${await gadgetSum(B)})`);
    // (marlow-polish P2-1) A3 rated as well, so the rejoin rebuilds A2 from `rh` and A3 from `rt`
    await GA(() => { const m = window.__course; const st = m.state; st.seal(st.airById.get(st.currentBay.exit)); m.handle(); });
    await until(B, () => window.__sectionRating?.last?.sectionId === 'A3', null, 60000, 'the client has the A3 rating');

    // rejoin: the first course message after it only records; no card
    const code0 = await GA(() => window.__coop.session.code);
    const pidKeep = await GB(() => window.__coop.session.selfId);
    await GB(() => window.__coop.leave());
    await until(A, (id) => window.__coop.session.players.get(id)?.away === true, pidKeep, 20000, 'the host holds the dropped client');
    await until(B, (c) => (document.querySelector('.main-menu [data-key="rejoin"]')?.textContent ?? '').includes(`Rejoin ${c}`), code0, 60000, 'the client main menu offers Rejoin <code>');
    await GB(() => document.querySelector('.main-menu [data-key="rejoin"]').click());
    await until(B, () => !!window.__app.current?.net && !!window.__course?.wire, null, LOAD_MS, 'the client is back in the course');
    await waitSim(2000);
    const cB2 = await cardState(B);
    assert(!cB2 || cB2.shown === false, `no rating card on the rejoined client (${JSON.stringify(cB2)})`);
    // (marlow-polish P2-1) the rejoined client's results list: A2 from `rh`, A3 from `rt`, equal to the host's lines
    const linesOf = () => window.__app.current.sectionRatings.map((r) => ({ id: r.sectionId, marks: r.marks }));
    await until(B, () => (window.__app.current?.sectionRatings?.length ?? 0) >= 2, null, 15000, 'the rejoined client has its results lines');
    const linesA = await GA(linesOf);
    const linesB = await GB(linesOf);
    const idsA = linesA.map((l) => l.id).join();
    const idsB = linesB.map((l) => l.id).join();
    assert(idsB === 'A2,A3' && idsB === idsA, `the rejoined client's results lines are A2, A3, as the host's (host ${idsA}, client ${idsB})`);
    for (const l of linesB) {
      const h = linesA.find((x) => x.id === l.id);
      assert(h && h.marks === l.marks, `the rejoined client's ${l.id} marks equal the host's (host ${h?.marks}, client ${l.marks})`);
    }
  } catch (e) {
    failed = true;
    console.error(String(e));
    await A.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-section-rating-marlow-coop-fail.png' }).catch(() => {});
  } finally {
    clearInterval(pump);
    all.push(...eA, ...eB);
    await browser.close();
  }
}

// ---------------------------------------------------------------- Marlow Yard re-plan (J14 R2)
// Host + client on `?marlowreplan=1` (map ctcourseReplan, both pages carry the flag as e2e-ctcourse parts 5-8 do). The objective
// list's header names the live step ("step <n> of 18") and the line under it the bay's retry rule, on host and client (A1: no
// rule, nothing can fail). A1 and A3 are unrated (no guard who can see): sealing them gives no card and no results line. In A2
// a station retry (the shunter sees the client) is not a set restart: the set's rating stats are not reset (a kill recorded
// before it still counts at the seal), `restarts` + 1 with `lastRetry` { st 3, cause 'seen' }; A2 is rated once at L2. In A3 the
// corridor camera's detection retries station 6 and still gives no A3 rating. NOT RUN by the builder: pending PC run.
console.log('section rating: Marlow Yard re-plan (?marlowreplan=1): step badges, the retry rule, unrated A1 / A3, a station retry');
{
  const { openPage } = await import('./e2e-lib.mjs');
  const { setSimPages, NET_VIEWPORT } = await import('./e2e-net-lib.mjs');
  const Q = 'net=local&autostart=ctcourseReplan&mode=course&marlowreplan=1';
  const { browser, ctx, page: A, errors: eA } = await launch({ url, params: Q, viewport: NET_VIEWPORT });
  let B = null;
  let eB = [];
  let pumpOn = false;
  let pumping = false;
  const pump = setInterval(async () => {
    if (!pumpOn || pumping) return;
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
  const SEEN_T = 'Seen or out of time: you go back to the start of this step.';
  const SEEN = 'Seen: you go back to the start of this step.';
  /** The objective list's header and rule line as page P shows them. */
  const hud = (P) => P.evaluate(() => {
    const r = document.querySelector('.course-hud .ch-rule');
    return { bay: document.querySelector('.course-hud .ch-bay')?.textContent ?? '', rule: r && !r.hidden ? r.textContent : null };
  });
  /** Both pages show this header and rule line. */
  const hudIs = async (bay, rule, what) => {
    for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
      await until(P, ([b, r]) => {
        const el = document.querySelector('.course-hud .ch-rule');
        const shown = el && !el.hidden ? el.textContent : null;
        return document.querySelector('.course-hud .ch-bay')?.textContent === b && shown === r;
      }, [bay, rule], 20000, `${what}: the ${tag} header "${bay}" and rule ${JSON.stringify(rule)}`);
    }
  };
  const seal = () => GA(() => { const m = window.__course; const st = m.state; st.seal(st.airById.get(st.currentBay.exit)); m.handle(); return st.bay; });
  const noDamage = () => GA(() => { const g = window.__app.current; g.target.damageMul = 0; for (const r of g.net.remotes.values()) r.damageMul = 0; });
  const ratingIds = (P) => P.evaluate(() => window.__app.current.sectionRatings.map((r) => r.sectionId));
  async function moveHost(x, z, yaw = Math.PI / 2) {
    await GA(([x, z, yaw]) => { const g = window.__app.current; g.team.end(true); g.player.controller.teleport(new g.player.position.constructor(x, 0.1, z), yaw); }, [x, z, yaw]);
    await until(A, ([x, z]) => { const f = window.__course.state.feet; return Math.hypot(f[0] - x, f[2] - z) < 0.4; }, [x, z], 15000, `the course sees the host at ${x}, ${z}`);
  }
  async function moveClient(x, z, yaw = Math.PI / 2) {
    await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
    await GB(([x, z, yaw]) => { const g = window.__app.current; g.team.end(true); g.player.controller.teleport(new g.player.position.constructor(x, 0.1, z), yaw); }, [x, z, yaw]);
    await until(A, ([x, z]) => { const f = window.__course.state.feet; return Math.hypot(f[3] - x, f[5] - z) < 0.4; }, [x, z], 15000, `the host sees the client at ${x}, ${z}`);
  }
  try {
    await until(A, () => window.__coop?.session?.isHost === true, null, 30000, 'the first tab hosts');
    const opened = await openPage(ctx, url, Q);
    B = opened.page;
    eB = opened.errors;
    setSimPages([A, B]);
    for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => window.__app.current?.opts?.mode === 'course' && !!window.__app.current.net && window.__app.current.opts.map?.id === 'ctcourseReplan', null, LOAD_MS, `${tag} in the ctcourseReplan match`);
    pumpOn = true;
    await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state) && !!window.__course?.state && !!window.__sectionRating, null, 30000, 'the host course running');
    await until(B, () => !!window.__course?.wire, null, 30000, 'the client has the course state');
    await noDamage();

    // the rated sets: A1 (a passive checker) and A3 (no guard) are not
    const rated = await GA(() => Object.fromEntries(window.__course.state.def.bays.map((b) => [b.id, !!b.rated])));
    assert(rated.A1 === false && rated.A3 === false, `A1 and A3 unrated (${JSON.stringify(rated)})`);
    assert(['A2', 'A4', 'A5', 'A7', 'A8'].every((k) => rated[k] === true), `A2, A4, A5, A7, A8 rated (${JSON.stringify(rated)})`);

    // A1: step 1 of 18, no rule line (nothing can fail); its exit gives no card and no results line
    await hudIs('A1 - objectives - step 1 of 18', null, 'A1');
    assert((await seal()) === 1, 'A1 sealed: A2 is the set now');
    await waitSim(1500);
    assert(await GA(() => window.__sectionRating.last === null), 'A1: no rating');
    for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
      assert((await cardState(P))?.shown !== true, `A1: no rating card on the ${tag}`);
      assert((await ratingIds(P)).length === 0, `A1: no results line on the ${tag}`);
    }

    // A2: step 3 of 18 and its rule; a kill recorded, then a station retry (the shunter sees the client in the lit neck)
    await hudIs('A2 - objectives - step 3 of 18', SEEN, 'A2');
    await moveHost(31.0, 11.5);
    await moveClient(31.0, 13.0);
    await GA(() => window.__course.state.record('kills', 1));
    await waitSim(300);
    const s0 = await GA(() => ({ ...window.__sectionRating.stats }));
    assert(s0.kills === 1, `A2: the kill is in the set's live stats (${JSON.stringify(s0)})`);
    const r0 = await GA(() => window.__course.restarts);
    await moveClient(54, 10, -Math.PI / 2);
    await until(A, (r) => window.__course.restarts === r + 1, r0, 45000, 'A2: the host counts a station retry');
    await until(B, (r) => window.__course.restarts === r + 1, r0, 15000, 'A2: the client counts the station retry');
    for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
      const lr = await P.evaluate(() => window.__course.lastRetry);
      assert(!!lr && lr.st === 3 && lr.cause === 'seen', `A2: the ${tag}'s last retry is station 3 / seen (${JSON.stringify(lr)})`);
    }
    await waitSim(1500);
    await noDamage();
    // not a set restart: the stats are not reset (the spotting itself may add a detection; nothing goes down)
    const s1 = await GA(() => ({ ...window.__sectionRating.stats }));
    assert(s1.kills === 1 && Object.keys(s0).every((k) => typeof s0[k] !== 'number' || s1[k] >= s0[k]), `A2: the retry left the set's rating stats (${JSON.stringify(s0)} -> ${JSON.stringify(s1)})`);
    assert(await GA(() => window.__sectionRating.last === null), 'A2: the retry rated nothing');
    await hudIs('A2 - objectives - step 3 of 18', SEEN, 'A2 after the retry');
    // A2 rated once at L2, the kill counted (No kills a miss)
    await GA(() => { const g = window.__app.current; g.enemyMgr.update = () => {}; });
    assert((await seal()) === 2, 'A2 sealed: A3 is the set now');
    await poll(async () => (await cardState(A))?.shown, 60000, 'the rating card after A2 on the host');
    await poll(async () => (await cardState(B))?.shown, 60000, 'the rating card after A2 on the client');
    const l2 = await GA(() => window.__sectionRating.last);
    assert(l2 && l2.sectionId === 'A2' && (l2.marks & 2) === 0, `A2 rated, the kill from before the retry counted (${JSON.stringify(l2)})`);
    await until(B, () => window.__sectionRating?.last?.sectionId === 'A2', null, 15000, 'the client has the A2 rating');

    // A3: step 6 of 18 and its rule; the corridor camera has the client: a station 6 retry, no rating
    await hudIs('A3 - objectives - step 6 of 18', SEEN, 'A3');
    await noDamage();
    const r3 = await GA(() => window.__course.restarts);
    await moveHost(80.0, 10.0);
    await moveClient(87.0, 10.75, Math.PI / 2);
    await until(A, (r) => window.__course.restarts > r && window.__course.lastRetry?.st === 6, r3, 90000, 'A3: the camera has the client: station 6 retries');
    assert((await GA(() => window.__course.lastRetry.cause)) === 'seen', "A3: the retry's cause is seen");
    await waitSim(1500);
    assert((await seal()) === 3, 'A3 sealed: A4 is the set now');
    await waitSim(2000);
    const l3 = await GA(() => window.__sectionRating.last);
    assert(l3 && l3.sectionId === 'A2', `A3: no rating after the camera's detection and the exit (last ${JSON.stringify(l3)})`);
    for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
      const ids = await ratingIds(P);
      assert(ids.join() === 'A2', `A3: the ${tag}'s results lines are A2 only (${JSON.stringify(ids)})`);
    }
    await hudIs('A4 - objectives - step 8 of 18', SEEN, 'A4');
  } catch (e) {
    failed = true;
    console.error(String(e));
    await A.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-section-rating-marlow-replan-fail.png' }).catch(() => {});
  } finally {
    clearInterval(pump);
    all.push(...eA, ...eB);
    await browser.close();
  }
}

console.log(all.length ? 'console problems:\n' + all.join('\n') : 'no console errors');
process.exit(failed || all.length ? 1 : 0);
