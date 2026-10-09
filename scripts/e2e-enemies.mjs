// Enemy archetypes on the night Warehouse (Clear rules): heavy (plates, weak back / face plate, no frontal
// choke), enforcer (shield stops frontal rounds, no frontal grab, pushes forward), sniper (laser, glint refuses a
// mark, relocates after its shots), dog (smells a hidden crouched operator in the dark, a non-lethal takedown),
// drone operator (its recon drone spots and alerts; shot down; EMP drops it), officer (buffs squadmates, runs the
// alarm first), squad radio checks (a silent member is searched for), callouts, and Perfectionist (no Mark &
// Execute, no sonar). `node scripts/e2e-enemies.mjs [url] [--only=name]`
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7) ?? '';
let failed = false;

const setup = () => {
  const a = window.__app;
  const g = a.current;
  a.loop.manual = true;
  g.target.health.invulnerable = true;
  g.mode.pending.length = 0;
  const em = g.enemyMgr;
  const V = g.player.position.constructor;
  const st = a.input.state;
  const c = g.player.controller;
  window.__t = {
    V,
    reset() {
      g.takedown.reset();
      g.execute.reset();
      g.gadgets.clearWorld();
      em.clear();
      g.marks.clear();
      g.cover.reset();
      g.traversal.reset();
      st.releaseAll();
      st.setMove('t', 0, 0);
      c['crouchToggled'] = false;
      a.loop.timeScale = 1;
      a.loop.stepHeadless(0.3, 120);
    },
    tp(x, y, z, yaw, pitch = 0) {
      c.teleport(new V(x, y, z), yaw);
      g.player.cam.yaw = yaw;
      g.player.cam.pitch = pitch;
    },
    spawn(kind, x, z, yaw, alerted = false) {
      return em.spawn(kind, new V(x, 0, z), alerted, yaw);
    },
    step(s) {
      a.loop.stepHeadless(s, 120);
    },
    hit(e, dx, dz, part = 'body', amount = 20) {
      return e.applyDamage({ amount, point: e.pos.clone(), dir: new V(dx, 0, dz), part, kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: new V(e.pos.x - dx * 5, 1.5, e.pos.z - dz * 5), impulse: 1 });
    },
    freeze(e) {
      e.update = () => {};
    },
  };
};

const run = async (params, scenarios) => {
  const { browser, page, errors } = await launch({ url, params });
  const G = (f, a) => page.evaluate(f, a);
  try {
    await frames(page, 10);
    await G(setup);
    for (const [name, f] of scenarios) {
      if (only && !name.includes(only)) continue;
      console.log(name);
      await G(() => window.__t.reset());
      await f(G);
    }
    const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
    assert(real.length === 0, `no console errors (${real.join(' | ')})`);
  } catch (e) {
    failed = true;
    console.error(String(e));
  }
  await browser.close();
};

await run('autostart=warehouse&mode=clear', [
  [
    'heavy',
    async (G) => {
      const r = await G(() => {
        const t = window.__t;
        const g = window.__app.current;
        // face to face, a step apart
        t.tp(8, 0, 2.6, 0);
        const e = t.spawn('heavy', 8, 3.6, Math.PI);
        t.freeze(e);
        t.step(0.4);
        const offer = g.takedown.offer;
        const kind = offer?.plan.kind ?? null;
        const lethalOnly = offer?.lethalOnly ?? null;
        const label = document.querySelector('.wp-takedown.show')?.textContent ?? '';
        // armour by direction (dir = the round's travel: from the front travels along -z)
        const hp0 = e.health.hp;
        const front = t.hit(e, 0, 1, 'body').dealt;
        const back = t.hit(e, 0, -1, 'body').dealt;
        const face = t.hit(e, 0, 1, 'head').dealt;
        const crown = t.hit(e, 0, -1, 'head').dealt;
        return { kind, lethalOnly, label, front, back, face, crown, hp0 };
      });
      assert(r.kind === 'front' && r.lethalOnly && /lethal/i.test(r.label), `a heavy from the front: only a lethal takedown (${r.kind}, "${r.label}")`);
      assert(r.back > r.front * 2, `plates in front, an exposed back (front ${r.front.toFixed(1)} / back ${r.back.toFixed(1)})`);
      assert(r.face > r.crown, `the face plate is a weak point (${r.face.toFixed(1)} vs ${r.crown.toFixed(1)})`);
    },
  ],
  [
    'enforcer',
    async (G) => {
      const r = await G(() => {
        const t = window.__t;
        const g = window.__app.current;
        t.tp(8, 0, 2.6, 0);
        const e = t.spawn('enforcer', 8, 3.6, Math.PI);
        t.freeze(e);
        t.step(0.4);
        const frontOffer = g.takedown.offer?.plan.kind ?? null;
        const front = t.hit(e, 0, 1);
        const back = t.hit(e, 0, -1);
        // behind him: offered
        t.tp(8, 0, 4.6, Math.PI);
        e.yaw = Math.PI;
        t.step(0.4);
        const behindOffer = g.takedown.offer?.plan.kind ?? null;
        // alerted, in sight: he walks into it
        t.reset();
        // a clear line down the floor
        const nav = g.enemyMgr.nav;
        let lx = 8;
        for (let x = -2; x <= 22; x += 1) if (nav.lineClear([x, 7], [x, -4])) {
          lx = x;
          break;
        }
        t.tp(lx, 0, -4, 0);
        const p = t.spawn('enforcer', lx, 7, Math.PI, true);
        t.step(0.5);
        const d0 = Math.hypot(p.pos.x - lx, p.pos.z + 4);
        t.step(4);
        const d1 = Math.hypot(p.pos.x - lx, p.pos.z + 4);
        return { frontOffer, front: front.dealt, back: back.dealt, blocks: e.shieldBlocks, behindOffer, d0, d1 };
      });
      assert(r.front === 0 && r.blocks === 1 && r.back > 0, `the shield stops frontal rounds (front ${r.front}, back ${r.back.toFixed(1)})`);
      assert(r.frontOffer === null && r.behindOffer === 'behind', `no grab through the shield; from behind yes (${r.frontOffer} / ${r.behindOffer})`);
      assert(r.d1 < r.d0 - 1.2, `he pushes forward (${r.d0.toFixed(1)} -> ${r.d1.toFixed(1)} m)`);
    },
  ],
  [
    'sniper',
    async (G) => {
      const r = await G(() => {
        const t = window.__t;
        const g = window.__app.current;
        t.tp(8, 0, -4, 0);
        // (no alarm run: an alerted sniper would otherwise go for a panel)
        g.enemyMgr.alarmRaised = true;
        const e = t.spawn('sniper', 8, 9, Math.PI, true);
        const p0 = e.pos.clone();
        let laser = false;
        let glintMax = 0;
        let refused = 0;
        for (let i = 0; i < 90 && e.relocations === 0; i++) {
          t.step(0.1);
          g.frameUpdate(1 / 120, 1);
          laser = laser || e['laser'].isVisible;
          const cp = g.player.cam.camera.position;
          glintMax = Math.max(glintMax, e.glintFor(cp.x, cp.y, cp.z));
          // try to mark him while his scope is on us
          if (!refused && e.glintFor(cp.x, cp.y, cp.z) > 0.3) {
            const dx = e.pos.x - g.player.position.x;
            const dz = e.pos.z - g.player.position.z;
            g.player.cam.yaw = Math.atan2(dx, dz);
            g.player.cam.pitch = Math.atan2(e.pos.y + 1.2 - (g.player.position.y + 1.6), Math.hypot(dx, dz));
            g.player.forceAds = true;
            t.step(0.3);
            window.__app.input.state.tap('mark');
            t.step(0.05);
            g.player.forceAds = false;
            refused = g.execute.glintRefused;
          }
        }
        const shots = g.weapons ? e.relocations : 0;
        // the walk to the new perch (its path length varies with the perch picked)
        let moved = 0;
        for (let k = 0; k < 24 && moved <= 3; k++) {
          t.step(0.5);
          moved = Math.hypot(e.pos.x - p0.x, e.pos.z - p0.z);
        }
        return { laser, glintMax, refused, marked: g.marks.has(e.id), relocations: e.relocations, moved, shots };
      });
      assert(r.laser, 'its laser shows while it aims');
      assert(r.glintMax > 0.3, `its scope glints at you (${r.glintMax.toFixed(2)})`);
      assert(r.refused >= 1 && !r.marked, 'it cannot be marked through the glint');
      assert(r.relocations >= 1 && r.moved > 3, `it relocates after its shots (${r.relocations}, moved ${r.moved.toFixed(1)} m)`);
    },
  ],
  [
    'dog',
    async (G) => {
      const r = await G(() => {
        const t = window.__t;
        const g = window.__app.current;
        const c = g.player.controller;
        // crouched, still, behind the dog in the dark: out of its smell first, then inside it
        const e = t.spawn('dog', 8, 4, 0);
        c['crouchToggled'] = true;
        t.tp(8, 0, -3.5, 0);
        t.step(2);
        const far = e.meter;
        t.tp(8, 0, 1.6, 0);
        t.step(2.5);
        const near = e.meter;
        const level = e.level;
        // a non-lethal takedown puts it down
        t.reset();
        const d = t.spawn('dog', 8, 4, 0);
        t.freeze(d);
        t.tp(8, 0, 2.9, 0);
        t.step(0.4);
        const offer = g.takedown.offer?.plan.kind ?? null;
        window.__app.input.state.set('t', 'interact', true);
        t.step(1 / 60);
        window.__app.input.state.set('t', 'interact', false);
        t.step(1.5);
        return { far, near, level, offer, down: !d.alive, kept: g.enemyMgr['dogCorpses'].length };
      });
      assert(r.far < 0.05, `out of its smell radius nothing (${r.far.toFixed(2)})`);
      assert(r.near > 0.3 && r.level !== 'unaware', `inside it the dog smells a hidden operator in the dark (${r.near.toFixed(2)}, ${r.level})`);
      assert(r.offer === 'behind' && r.down && r.kept === 1, `a takedown puts the dog down (${r.offer}); it lies where it fell`);
    },
  ],
  [
    'drone operator',
    async (G) => {
      const r = await G(() => {
        const t = window.__t;
        const g = window.__app.current;
        const em = g.enemyMgr;
        t.tp(-30, 0, -30, 0);
        const op = t.spawn('droneOp', 8, 4, Math.PI);
        t.freeze(op);
        t.step(0.3);
        const d = em.drones[0];
        const has = !!d;
        // stand where it flies over
        t.tp(d.pos.x, 0, d.pos.z, 0);
        let alerted = false;
        for (let i = 0; i < 40 && !alerted; i++) {
          t.step(0.1);
          alerted = op.alerted;
        }
        const spotted = d.spotted;
        // shot down
        const hpBefore = d.hp;
        d.applyDamage({ amount: 40, point: d.pos.clone(), dir: new t.V(0, 1, 0), part: 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1 });
        t.step(3);
        const shotDown = em.drones.length === 0;
        // an EMP drops a second one
        t.reset();
        const op2 = t.spawn('droneOp', 8, 4, Math.PI);
        t.freeze(op2);
        t.step(0.3);
        const d2 = em.drones[0];
        g.gadgets['emp'](d2.pos.clone());
        t.step(3);
        return { has, alerted, spotted, hpBefore, shotDown, emp: em.drones.length === 0 };
      });
      assert(r.has, 'a drone operator flies a recon drone');
      assert(r.spotted && r.alerted, 'it spots you (no light needed) and its operator is alerted');
      assert(r.shotDown, 'it can be shot down');
      assert(r.emp, 'an EMP drops it');
    },
  ],
  [
    'officer',
    async (G) => {
      const r = await G(() => {
        const t = window.__t;
        const g = window.__app.current;
        const em = g.enemyMgr;
        t.tp(-30, 0, -30, 0);
        const o = t.spawn('officer', 8, 4, 0);
        const m = t.spawn('grunt', 10, 5, 0);
        const far = t.spawn('grunt', 8, -14, 0);
        t.step(1);
        const buff = m.buff && !far.buff;
        // the alarm: the officer runs it before a closer guard
        const p = em.alarms[0];
        let runner = null;
        if (p) {
          t.reset();
          const gg = t.spawn('grunt', p.x + 2.5, p.z + 0.5, 0, true);
          const oo = t.spawn('officer', p.x + 4.5, p.z + 0.5, 0, true);
          t.freeze(gg);
          t.freeze(oo);
          // (an earlier scenario's alerted guard may have raised it already: once per match)
          em.alarmRaised = false;
          em['alarmT'] = 0;
          t.step(0.1);
          runner = oo.runningAlarm ? 'officer' : gg.runningAlarm ? 'guard' : 'none';
        }
        return { buff, runner, hasPanel: !!p };
      });
      assert(r.buff, 'an officer buffs squadmates near him (not far ones)');
      assert(!r.hasPanel || r.runner === 'officer', `he runs the alarm first (${r.runner})`);
    },
  ],
  [
    'radio check',
    async (G) => {
      const r = await G(() => {
        const t = window.__t;
        const g = window.__app.current;
        const em = g.enemyMgr;
        t.tp(-30, 0, -30, 0);
        const a = t.spawn('grunt', 8, 4, 0);
        const b = t.spawn('grunt', 14, 4, 0);
        em.joinSquad(a, 77);
        em.joinSquad(b, 77);
        t.step(0.5);
        // b goes quiet (taken out unseen)
        b.knockOut({ amount: 999, point: b.pos.clone(), dir: new t.V(0, 0, 1), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: b.pos.clone(), impulse: 0 });
        t.step(0.2);
        em.radioCheckNow();
        g.frameUpdate(1 / 120, 1);
        const lines = g.hud.barks.shown.slice();
        const misses = em.radioMisses;
        t.step(0.5);
        return { misses, level: a.level, lines };
      });
      assert(r.misses === 1, 'a radio check finds the silent squadmate');
      assert(r.level === 'searching' || r.level === 'investigating', `the caller goes to look for him (${r.level})`);
      assert(r.lines.length >= 1, `callouts show (${r.lines.join(' / ')})`);
    },
  ],
  [
    'callouts',
    async (G) => {
      const r = await G(() => {
        const t = window.__t;
        const g = window.__app.current;
        t.tp(8, 0, 0, 0);
        const e = t.spawn('grunt', 8, 6, Math.PI);
        t.step(0.3);
        e.alert();
        t.step(0.05);
        // (the projection needs this frame's camera matrices)
        g.scene.render();
        g.frameUpdate(1 / 120, 1);
        const over = [...document.querySelectorAll('.hud-barks .bark:not([hidden])')].map((el) => el.textContent);
        return { lines: g.hud.barks.shown.slice(), shown: over.length, over };
      });
      assert(r.shown >= 1, `an alerted guard calls it out over his head (${r.over.join(' / ')})`);
    },
  ],
]);

await run('autostart=warehouse&mode=clear&difficulty=perfectionist', [
  [
    'perfectionist',
    async (G) => {
      const r = await G(() => {
        const t = window.__t;
        const g = window.__app.current;
        const v = g.vision;
        const modes = [v.cycle(), v.cycle(), v.cycle()];
        // a takedown earns no usable charge: marks do nothing
        g.marks.charges = 1;
        t.tp(8, 0, 0, 0);
        const e = t.spawn('grunt', 8, 6, Math.PI);
        t.freeze(e);
        g.player.forceAds = true;
        t.step(0.3);
        window.__app.input.state.tap('mark');
        t.step(0.3);
        g.player.forceAds = false;
        return { modes, marks: g.marks.ids.length, ready: g.execute.ready, def: g.difficultyDef.label };
      });
      assert(r.def === 'Perfectionist', `autostart takes the difficulty (${r.def})`);
      assert(!r.modes.includes('sonar'), `no sonar (${r.modes.join(' -> ')})`);
      assert(r.marks === 0 && !r.ready, 'no Mark & Execute');
    },
  ],
]);

process.exit(failed ? 1 : 0);
