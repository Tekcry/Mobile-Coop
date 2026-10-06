// Modes 2.0: Hunter (alarm doubles the hostiles), Infiltration missions run objective by objective - download
// (start, uploads in range, pauses away, noticed pulses), intel (any order), plant / hack, rescue (the asset
// follows), sabotage (armed, goes off at extraction), extraction (stinger, rating, play-style bars) - and fail
// (a Ghost contract on detection, the operator down three times). Every mission objective is reachable along
// the ground plus at least two anchor routes (above / through), and each mission map has 25+ anchors.
// `node scripts/e2e-missions.mjs [url] [--only=name]`
import { launch, assert } from './e2e-lib.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7) ?? '';
let failed = false;

const helpers = () => {
  const a = window.__app;
  const g = a.current;
  a.loop.manual = true;
  g.target.health.invulnerable = true;
  const V = g.player.position.constructor;
  const st = a.input.state;
  window.__t = {
    V,
    calm() {
      // nobody around: the steps under test only
      g.enemyMgr.clear();
      if (g.mode.pending) g.mode.pending.length = 0;
    },
    tp(x, y, z, yaw = 0) {
      g.player.controller.teleport(new V(x, y, z), yaw);
      g.player.cam.yaw = yaw;
      a.loop.stepHeadless(0.3, 60);
    },
    step(s) {
      a.loop.stepHeadless(s, 60);
    },
    tap() {
      st.set('t', 'interact', true);
      a.loop.stepHeadless(1 / 60, 60);
      st.set('t', 'interact', false);
      a.loop.stepHeadless(0.1, 60);
    },
    hold(s) {
      st.set('t', 'interact', true);
      a.loop.stepHeadless(s, 60);
      st.set('t', 'interact', false);
      a.loop.stepHeadless(0.1, 60);
    },
    /** Walk the operator to (x, z) over `s` seconds (teleport steps: the follower has to keep up). */
    walk(x, z, s) {
      const p0 = g.player.position.clone();
      const n = Math.ceil(s * 10);
      for (let i = 1; i <= n; i++) {
        const k = i / n;
        g.player.controller.teleport(new V(p0.x + (x - p0.x) * k, p0.y, p0.z + (z - p0.z) * k), g.player.controller.yaw);
        a.loop.stepHeadless(0.1, 60);
      }
    },
  };
};

const run = async (params, scenarios) => {
  if (only && !scenarios.some(([n]) => n.includes(only))) return;
  const { browser, page, errors } = await launch({ url, params });
  const G = (f, a) => page.evaluate(f, a);
  try {
    await page.waitForTimeout(1000);
    await G(helpers);
    for (const [name, f] of scenarios) {
      if (only && !name.includes(only)) continue;
      console.log(name);
      await f(G, page);
    }
    const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
    assert(real.length === 0, `no console errors (${real.join(' | ')})`);
  } catch (e) {
    failed = true;
    console.error(String(e));
  }
  await browser.close();
};

await run('autostart=warehouse&mode=hunter', [
  [
    'hunter alarm',
    async (G) => {
      const r = await G(() => {
        const g = window.__app.current;
        const em = g.enemyMgr;
        window.__t.step(0.5);
        const before = g.mode.enemiesLeft;
        const e = em.enemies.find((q) => q.alive);
        em['raiseAlarm'](e, em.alarms[0]);
        window.__t.step(0.2);
        return { mode: g.mode.id, before, after: g.mode.enemiesLeft, added: g.mode.alarmAdded };
      });
      assert(r.mode === 'clear', '?mode=hunter runs Hunter (the old Clear)');
      assert(r.after === r.before * 2 && r.added === r.before, `the alarm doubles the hostiles (${r.before} -> ${r.after})`);
    },
  ],
]);

await run('autostart=embassy&mode=infiltration&mission=embassy-pouch&insertion=gate', [
  [
    'download + intel + extract',
    async (G, page) => {
      const r = await G(() => {
        const t = window.__t;
        const g = window.__app.current;
        const m = g.mode;
        const em = g.enemyMgr;
        t.calm();
        let pings = 0;
        const hear = em.hear.bind(em);
        em.hear = (p, r2) => {
          if (r2 >= 15) pings++;
          hear(p, r2);
        };
        const o = m.chain.current;
        t.tp(o.x + 1.0, 0, o.z, -Math.PI / 2);
        t.tap();
        const started = m.downloading;
        t.step(15);
        const mid = m.chain.fraction;
        // walk away: it pauses, nothing lost
        t.tp(o.x + 25, 0, o.z - 10);
        t.step(5);
        const away = m.chain.fraction;
        t.tp(o.x + 1.0, 0, o.z);
        t.step(30);
        const next = m.chain.current?.type;
        // intel, picked up in any order
        const items = m.chain.current.items;
        for (const k of [2, 0, 1]) {
          const it = items[k];
          t.tp(it[0] + 0.6, it[1], it[2], 0);
          t.tap();
        }
        const afterIntel = m.chain.current?.type;
        const x = m.chain.current;
        t.tp(x.x, 0, x.z);
        t.step(1.5);
        const state = m.chain.state;
        // the stinger runs, then the results
        t.step(3);
        return { started, mid, away, next, pings, afterIntel, state };
      });
      assert(r.started && r.mid > 0.3 && r.mid < 0.5, `the upload runs in range (${(r.mid * 100).toFixed(0)}% after 15 s)`);
      assert(Math.abs(r.away - r.mid) < 0.01, 'away from the terminal it pauses; nothing is lost');
      assert(r.next === 'intel' && r.pings >= 2, `done; the traffic was noticed (${r.pings} pulses)`);
      assert(r.afterIntel === 'extract', 'intel picked up in any order');
      assert(r.state === 'done', 'reaching the zone completes the mission');
      await page.waitForSelector('.results-screen', { timeout: 15000 });
      const res = await G(() => ({ rating: document.querySelector('.mission-rating')?.textContent ?? '', bars: document.querySelectorAll('.style-bar').length, stats: window.__app.current.stats }));
      assert(res.stats.won && res.stats.rating >= 2 && /★/.test(res.rating), `results: a rating (${res.rating})`);
      assert(res.bars === 3, 'results: Ghost / Panther / Assault bars');
    },
  ],
]);

await run('autostart=embassy&mode=infiltration&mission=embassy-asset&insertion=gate', [
  [
    'plant + rescue + extract',
    async (G) => {
      const r = await G(() => {
        const t = window.__t;
        const g = window.__app.current;
        const m = g.mode;
        t.calm();
        const o = m.chain.current;
        // (beside the phone, clear of the conference door)
        t.tp(o.x - 1.2, 0, o.z - 0.3, Math.PI / 2);
        t.hold(o.time + 0.3);
        const planted = m.chain.current?.type;
        const v = m.vip;
        t.tp(v.pos.x - 1.0, 0, v.pos.z, Math.PI / 2);
        t.hold(2);
        const free = v.free;
        // walk out through the corridor and the lobby: he follows
        const vp0 = v.pos.clone();
        t.walk(12.5, 3, 2);
        t.walk(12.5, 11.2, 3);
        t.walk(0, 11.2, 4);
        t.walk(0, 3, 3);
        t.step(5);
        const moved = Math.hypot(v.pos.x - vp0.x, v.pos.z - vp0.z);
        const near = Math.hypot(v.pos.x - g.player.position.x, v.pos.z - g.player.position.z);
        // out of the front door to the gate
        t.walk(0, -6, 3);
        t.walk(0, -19.5, 5);
        t.step(4);
        return { planted, free, moved, near, state: m.chain.state, vipAt: [v.pos.x, v.pos.z] };
      });
      assert(r.planted === 'rescue', 'the bug is planted (a hold)');
      assert(r.free, 'the asset is freed (a hold)');
      assert(r.moved > 8 && r.near < 4, `he follows the operator (${r.moved.toFixed(1)} m, ${r.near.toFixed(1)} m behind)`);
      assert(r.state === 'done', `extraction with the asset completes it (asset at ${r.vipAt.map((n) => n.toFixed(1))})`);
    },
  ],
]);

await run('autostart=embassy&mode=infiltration&mission=embassy-blackout&insertion=drain', [
  [
    'sabotage + extract',
    async (G) => {
      const r = await G(() => {
        const t = window.__t;
        const g = window.__app.current;
        const m = g.mode;
        t.calm();
        const o = m.chain.current;
        t.tp(o.x - 1.0, 0, o.z, Math.PI / 2);
        t.hold(o.time + 0.3);
        const armed = m.chain.armed;
        const x = m.chain.current;
        t.tp(x.x, 0, x.z);
        t.step(1.5);
        return { armed, state: m.chain.state };
      });
      assert(r.armed, 'the charge is armed (a hold)');
      assert(r.state === 'done', 'extraction completes the sabotage');
    },
  ],
]);

await run('autostart=embassy&mode=infiltration&mission=embassy-blackout&insertion=drain', [
  [
    'ghost contract fails on detection',
    async (G, page) => {
      const r = await G(() => {
        const t = window.__t;
        const g = window.__app.current;
        t.step(1);
        const e = g.enemyMgr.enemies.find((q) => q.alive);
        e.alert();
        t.step(0.5);
        return { state: g.mode.chain.state, reason: g.mode.chain.failReason };
      });
      assert(r.state === 'failed' && /Undetected/.test(r.reason), `detected: the contract fails (${r.reason})`);
      await page.waitForSelector('.results-screen', { timeout: 15000 });
      assert((await G(() => document.querySelector('.results-title')?.textContent)) === 'DEFEAT', 'results: defeat');
    },
  ],
]);

await run('autostart=warehouse&mode=infiltration&mission=warehouse-cold', [
  [
    'operator down three times fails',
    async (G) => {
      const r = await G(() => {
        const t = window.__t;
        const g = window.__app.current;
        g.target.health.invulnerable = false;
        for (let i = 0; i < 3; i++) {
          g.target.applyDamage({ amount: 999, point: g.player.position.clone(), dir: new t.V(0, 0, 1), part: 'body', kind: 'bullet', attackerTeam: 'enemy', attackerId: 'x', sourcePos: g.player.position.clone(), impulse: 0 });
          t.step(4);
          g.target.damageMul = 1;
        }
        return { state: g.mode.chain.state, lives: g.mode.lives };
      });
      assert(r.state === 'failed' && r.lives === 0, `three times down: mission failed (${r.state}, lives ${r.lives})`);
    },
  ],
]);

// routes: every mission objective has the ground plus two anchor routes (above / through) within reach
for (const map of ['embassy', 'warehouse']) {
  await run(`autostart=${map}&mode=infiltration`, [
    [
      `${map} routes`,
      async (G) => {
        const r = await G((mapId) => {
          const g = window.__app.current;
          const L = g.world.level.anchors;
          const nav = g.nav;
          // every mission on this map (the bundled definitions)
          const defs = window.__missions.filter((m) => m.map === mapId);
          const out = [];
          for (const m of defs) {
            const ins = m.insertions[0];
            for (const o of m.objectives) {
              const sites = o.type === 'intel' ? o.items.map((i) => ({ x: i[0], y: i[1], z: i[2] })) : [{ x: o.x, y: o.y, z: o.z }];
              for (const s of sites) {
                // the grid is flood-filled from the spawn: a walkable cell at the site is reachable on foot
                const c = nav.nearestWalkable(s.x, s.z, 3);
                const cc = c >= 0 ? nav.center(c) : [1e9, 1e9];
                const ground = c >= 0 && nav.isWalkable(c) && Math.hypot(cc[0] - s.x, cc[1] - s.z) < 1.5 && (s.y < 1 || o.type === 'intel');
                void ins;
                const R = 14;
                const near = (x, z) => Math.hypot(x - s.x, z - s.z) < R;
                let above = 0;
                let through = 0;
                for (const l of L.ladders) if (near(l.base.x, l.base.z) && l.top.y - s.y > 2) above++;
                for (const p of L.pipesV) if (near(p.base.x, p.base.z) && p.top.y - s.y > 2) above++;
                for (const z of L.ziplines) if (near(z.b.x, z.b.z)) above++;
                for (const d of L.ducts) if (near(d.exit.pos.x, d.exit.pos.z)) above++;
                for (const l of L.ledges) if (l.canHang && near((l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2) && l.top - s.y > 2) above++;
                for (const w of L.windows) if (near(w.c.x, w.c.z)) through++;
                for (const d of L.ducts) if (near(d.entry.pos.x, d.entry.pos.z)) through++;
                for (const d of L.doors ?? []) if (near(d.hinge.x, d.hinge.z)) through++;
                out.push({ id: `${m.id}:${o.id}`, ground, above, through });
              }
            }
          }
          return { anchors: L.all.length, out };
        }, map);
        assert(r.anchors >= 25, `${map}: ${r.anchors} traversal anchors (>= 25)`);
        const bad = r.out.filter((q) => !q.ground || q.above < 1 || q.through < 1 || q.above + q.through < 2);
        assert(bad.length === 0, `${map}: every objective reachable along the ground + above + through (${r.out.length} sites${bad.length ? '; missing ' + JSON.stringify(bad) : ''})`);
      },
    ],
  ]);
}

process.exit(failed ? 1 : 0);
