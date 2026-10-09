// Stealth AI on the night Warehouse (Clear mode, stealth rules): shadow vs light detection, the awareness arc
// warning before detection, no sight through walls, noise -> suspicious -> investigating, the squad radio,
// LKP set + ghost + search that converges and ends, patrols walking their routes.
// `node scripts/e2e-stealth-ai.mjs [url] [--only=name]`
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7) ?? '';
let failed = false;
const { browser, page, errors } = await launch({ url, params: 'autostart=warehouse&mode=clear' });
const G = (f, a) => page.evaluate(f, a);
try {
  await frames(page, 10);
  await G(() => {
    const a = window.__app;
    const g = a.current;
    a.loop.manual = true;
    g.target.health.invulnerable = true;
    g.mode.pending.length = 0;
    const em = g.enemyMgr;
    em.clear();
    const V = g.player.position.constructor;
    const st = a.input.state;
    const c = g.player.controller;
    // helpers kept on window for the scenarios
    window.__t = {
      V,
      reset() {
        em.clear();
        // (an alarm in an earlier scenario queues Hunter's reinforcements)
        g.mode.pending.length = 0;
        em.lkpValid = false;
        em.sightT = 99;
        em.alarmRaised = false;
        for (const p of em.alarms) p.disabled = false;
        for (const it of g.interactables.items) if (it.kind === 'alarm') { it.done = false; g.interactables.setEnabled(it, true); }
        const reg = g.world.level.lights;
        for (const l of reg.lights) {
          if (l.kind === 'flashlight') continue;
          l.destroyed = false;
          l.on = true;
        }
        reg.version++;
        if (g.stealth.carry) g.stealth.dropCarried();
        // doors shut again
        const doors = g.world.doors;
        for (const d of doors.list) {
          d.open = 0;
          d.target = 0;
          doors['write'](d);
          doors['addBody'](d);
        }
        doors['mesh']?.thinInstanceBufferUpdated('matrix');
        g.noise = 0;
        g.cover.reset();
        g.traversal.reset();
        st.releaseAll();
        st.setMove('t', 0, 0);
        c['crouchToggled'] = false;
        g.player.light = undefined;
        delete g.localRef.lightOverride;
      },
      tp(x, z, yaw) {
        c.teleport(new V(x, 0, z), yaw);
        g.player.cam.yaw = yaw;
        g.player.cam.pitch = 0;
      },
      spawn(kind, x, z, yaw) {
        return em.spawn(kind, new V(x, 0, z), false, yaw);
      },
      crouch(v) {
        c['crouchToggled'] = v;
      },
      /** Pin the player's light level (else it is sampled from the lamps). */
      light(v) {
        g['updateLight'] = v === null ? Object.getPrototypeOf(g)['updateLight'] : () => (g.localRef.light = g.lightLevel = v);
      },
      step(s) {
        a.loop.stepHeadless(s, 120);
      },
      kill(e, knockOut = false) {
        const h = { amount: 999, point: e.pos.clone(), dir: new V(0, 0, 1), part: 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: e.pos.clone(), impulse: 1 };
        if (knockOut) e.knockOut(h);
        else e.applyDamage(h);
      },
    };
  });
  const scen = async (name, f) => {
    if (only && !name.includes(only)) return;
    console.log(name);
    await G(() => window.__t.reset());
    await f();
  };

  await scen('shadow', async () => {
    // dark racking aisle: a crouched sneak past behind a guard, and crouched still in front at 8 m
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.light(null);
      const e = t.spawn('grunt', -14.5, 10, 0);
      t.crouch(true);
      t.tp(-15.2, 6.2, Math.PI / 2);
      t.step(0.6);
      const light = g.lightLevel;
      let max = 0;
      const st = window.__app.input.state;
      st.setMove('t', 0, 0.5);
      for (let k = 0; k < 40; k++) {
        t.step(0.1);
        max = Math.max(max, e.meter);
      }
      st.setMove('t', 0, 0);
      // in front, crouched and still in the dark
      t.tp(-14.5, 17.5, Math.PI);
      e.yaw = 0;
      let front = 0;
      for (let k = 0; k < 40; k++) {
        t.step(0.1);
        front = Math.max(front, e.meter);
      }
      return { light, max, front, level: e.level };
    });
    assert(r.light < 0.28, `the aisle is in shadow (light ${r.light.toFixed(2)})`);
    assert(r.max < 0.3, `a crouched sneak behind a guard in shadow stays unnoticed (meter max ${r.max.toFixed(2)})`);
    assert(r.front < 0.3, `crouched still in the dark in front at ~7 m stays unnoticed (meter max ${r.front.toFixed(2)}, ${r.level})`);
  });

  await scen('light', async () => {
    // lit factory floor: a walker in a lamp pool is seen; the arc warns first
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.light(null);
      const e = t.spawn('grunt', 0, 5, Math.PI);
      t.tp(-0.5, -3, 0);
      t.step(0.4);
      const light = g.lightLevel;
      const st = window.__app.input.state;
      let firstArc = -1;
      let alertAt = -1;
      for (let k = 0; k < 240 && alertAt < 0; k++) {
        st.setMove('t', k % 60 < 30 ? 0.6 : -0.6, 0);
        t.step(1 / 60);
        window.__app.current.frameUpdate(1 / 60, 1);
        if (firstArc < 0 && g.hud.arcs.shown > 0) firstArc = k / 60;
        if (e.alerted) alertAt = k / 60;
      }
      st.setMove('t', 0, 0);
      return { light, firstArc, alertAt, red: g.hud.arcs.anyRed };
    });
    assert(r.light > 0.6, `the lamp pool lights the player (${r.light.toFixed(2)})`);
    assert(r.alertAt > 0 && r.alertAt < 3, `walking in the light in view at 8 m is detected (${r.alertAt.toFixed(2)} s)`);
    assert(r.firstArc >= 0 && r.alertAt - r.firstArc > 0.25, `the awareness arc shows first (arc at ${r.firstArc.toFixed(2)} s, detected at ${r.alertAt.toFixed(2)} s)`);
  });

  await scen('walls', async () => {
    const r = await G(() => {
      const t = window.__t;
      // dispatch guard facing the corridor wall; the player lit, walking, right behind the wall
      t.light(1);
      const e = t.spawn('grunt', -2, -13, 0);
      t.tp(-2, -9.9, Math.PI);
      const st = window.__app.input.state;
      const g = window.__app.current;
      let max = 0;
      let arcs = 0;
      let meter = 0;
      for (let k = 0; k < 30; k++) {
        st.setMove('t', k % 10 < 5 ? 0.7 : -0.7, 0);
        t.step(0.1);
        g.frameUpdate(0.1, 1);
        // sight only (footsteps are heard through the wall, rightly)
        max = Math.max(max, e.rate);
        meter = Math.max(meter, e.meter);
        arcs = Math.max(arcs, g.hud.arcs.shown);
      }
      st.setMove('t', 0, 0);
      t.light(null);
      return { max, level: e.level, arcs, meter };
    });
    assert(r.max === 0, `no sight through walls (sight rate ${r.max.toFixed(2)}, ${r.level})`);
    assert(r.arcs === 0, `a guard who only hears you through a wall shows no arc (meter ${r.meter.toFixed(2)}, ${r.arcs} arcs)`);
  });

  await scen('noise', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.light(0);
      const e = t.spawn('grunt', -14.5, 10, 0);
      t.tp(-14.5, 4, 0);
      t.step(0.3);
      g.enemyMgr.hear(g.player.position, 9);
      t.step(0.2);
      const l1 = e.level;
      const z0 = e.pos.z;
      // it looks for ALERT.hearLook (1.8 s) before walking over
      for (let k = 0; k < 9; k++) {
        g.enemyMgr.hear(g.player.position, 9);
        t.step(0.25);
      }
      const l2 = e.level;
      t.tp(-22, -24, 0);
      t.step(2);
      t.light(null);
      return { l1, l2, moved: z0 - e.pos.z };
    });
    assert(r.l1 === 'suspicious', `a noise makes a guard suspicious (${r.l1})`);
    assert(r.l2 === 'investigating', `more noise: it investigates (${r.l2})`);
    assert(r.moved > 1, `it walks over to the noise (${r.moved.toFixed(2)} m)`);
  });

  await scen('radio', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.light(1);
      const a = t.spawn('grunt', 0, 5, Math.PI);
      const b = t.spawn('grunt', 10, 9, Math.PI);
      const far = t.spawn('grunt', -21, 17, Math.PI);
      t.tp(-0.5, 0, 0);
      let k = 0;
      while (!a.alerted && k++ < 300) t.step(1 / 60);
      const bBefore = b.alerted;
      const pending = a.radioT;
      t.step(1.5);
      const bMid = b.alerted;
      const farMid = far.level;
      t.step(3);
      t.light(null);
      return { a: a.alerted, bBefore, bMid, pending, b: b.alerted, far: farMid, lkp: g.enemyMgr.lkpValid };
    });
    assert(r.a, 'the guard who sees the player is alerted');
    assert(r.pending > 1.5 && !r.bMid, `the spotter takes a moment to radio it in (${r.pending.toFixed(1)} s)`);
    assert(r.b && !r.bBefore, 'a squadmate within radio range joins once it is called in');
    assert(r.far !== 'alert', `a guard out of radio range is not told (${r.far})`);
    assert(r.lkp, 'the sighting sets the last known position');
  });

  await scen('radio window', async () => {
    const r = await G(() => {
      const t = window.__t;
      t.light(1);
      const a = t.spawn('grunt', 0, 5, Math.PI);
      const b = t.spawn('grunt', 10, 9, Math.PI);
      const near = t.spawn('grunt', 3, 8, Math.PI);
      t.tp(-0.5, 0, 0);
      let k = 0;
      while (!a.alerted && k++ < 300) t.step(1 / 60);
      // the guard close by hears the shout at once
      t.step(0.8);
      const nearOn = near.alerted;
      // the spotter is taken out (silently) before the call goes out
      a.knockOut({ amount: 999, point: a.pos.clone(), dir: new t.V(0, 0, 1), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: a.pos.clone(), impulse: 0 });
      near.knockOut({ amount: 999, point: near.pos.clone(), dir: new t.V(0, 0, 1), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: near.pos.clone(), impulse: 0 });
      t.tp(-21, -24, 0);
      t.step(5);
      t.light(null);
      return { nearOn, b: b.level };
    });
    assert(r.nearOn, 'a squadmate close by joins at once (the shout)');
    assert(r.b !== 'alert', `the spotter taken out before calling it in: nobody else is told (${r.b})`);
  });

  await scen('lkp', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      t.light(1);
      // no alarm run (Hunter would bring the doubled hostiles in hunting, and they find you)
      em.alarmRaised = true;
      const e = t.spawn('grunt', 0, 5, Math.PI);
      t.tp(-0.5, 0, 0);
      let k = 0;
      while (!(e.alerted && em.sightT < 0.1) && k++ < 400) {
        t.step(1 / 60);
        g.frameUpdate(1 / 60, 1);
      }
      const seenAt = { x: em.lkp.x, z: em.lkp.z };
      // vanish behind the dispatch wall (out of sight, far from the last known position)
      t.light(0);
      t.tp(-2, -15, 0);
      let ghost = false;
      let searching = false;
      let closest = 99;
      let wallhack = false;
      for (let i = 0; i < 500; i++) {
        // (the mode's later squads stay out of it: this is about the one guard)
        for (const x of em.enemies) if (x !== e) x.passive = true;
        t.step(0.05);
        g.frameUpdate(0.05, 1);
        if (g.ghost.visible) ghost = true;
        if (e.level === 'searching') searching = true;
        closest = Math.min(closest, Math.hypot(e.pos.x - seenAt.x, e.pos.z - seenAt.z));
        if (e.level === 'alert' && e.sinceSeen > 1 && Math.hypot(e.pos.x + 2, e.pos.z + 15) < 2) wallhack = true;
      }
      const lkpNear = Math.hypot(em.lkp.x - seenAt.x, em.lkp.z - seenAt.z);
      // the search ends
      for (let i = 0; i < 50; i++) t.step(1);
      for (let i = 0; i < 5; i++) g.frameUpdate(0.2, 1);
      t.light(null);
      return { lkpNear, ghost, searching, closest, wallhack, end: e.level, lkpAfter: em.lkpValid, ghostAfter: g.ghost.visible };
    });
    assert(r.lkpNear < 1.5, `the last known position stays where the player was seen (${r.lkpNear.toFixed(2)} m off)`);
    assert(r.ghost, 'the LKP ghost shows once they lose sight');
    assert(r.closest < 2.5, `they converge on the last known position (closest ${r.closest.toFixed(2)} m)`);
    assert(r.searching, 'they search from it');
    assert(!r.wallhack, 'they never home in on the hidden player');
    assert(r.end === 'cooldown' || r.end === 'unaware', `the search ends (${r.end})`);
    assert(!r.lkpAfter && !r.ghostAfter, 'the LKP and its ghost clear afterwards');
  });

  await scen('patrol', async () => {
    const r = await G(() => {
      const t = window.__t;
      t.light(0);
      const e = t.spawn('grunt', -19, -10.5, Math.PI);
      e.setPatrol({ points: [[-19, -10.5], [-12.5, -8.6], [-16.5, -14.8]], wait: 1 });
      t.tp(-22, 16, 0);
      const pts = [];
      for (let i = 0; i < 64; i++) {
        t.step(0.5);
        pts.push([e.pos.x, e.pos.z]);
      }
      t.light(null);
      const near = (x, z) => pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < 0.8);
      return { a: near(-12.5, -8.6), b: near(-16.5, -14.8), level: e.level };
    });
    assert(r.a && r.b, `an unaware guard walks its route (${r.a} ${r.b})`);
    assert(r.level === 'unaware', `and stays unaware (${r.level})`);
  });

  await scen('bodies', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      t.light(0);
      t.tp(-22, -24, 0);
      // lit: a body in the factory floor lamp pool, a guard 9 m away facing it
      const v = t.spawn('grunt', 0, -3, 0);
      t.kill(v);
      const w = t.spawn('grunt', 0.5, 6, Math.PI);
      const mate = t.spawn('grunt', 8, 8, 0);
      let found = false;
      for (let i = 0; i < 40 && !found; i++) {
        t.step(0.1);
        found = em.bodiesFound > 0;
      }
      const lw = w.level;
      t.step(1);
      const lmate = mate.level;
      // shadow: a body in the dark aisle, a guard 6 m away facing it
      t.reset();
      t.light(0);
      t.tp(-22, -24, 0);
      const f0 = em.bodiesFound;
      const v2 = t.spawn('grunt', -14.5, 10.5, 0);
      t.kill(v2);
      t.spawn('grunt', -14.5, 16.5, Math.PI);
      t.step(5);
      const dark = em.bodiesFound - f0;
      t.light(null);
      return { found, lw, lmate, dark, bodies: em.bodies.length };
    });
    assert(r.found, 'a body in the light is found');
    assert(r.lw === 'searching', `the finder searches (${r.lw})`);
    assert(r.lmate === 'searching', `the squad is told and searches too (${r.lmate})`);
    assert(r.dark === 0, `a body in the dark at 6 m is not found (${r.dark})`);
  });

  await scen('carry', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      const st = window.__app.input.state;
      t.light(0);
      const v = t.spawn('grunt', -18, -21, 0);
      t.tp(-18, -23.5, 0);
      t.step(0.2);
      t.kill(v);
      t.step(4);
      const b = em.bodies[0];
      t.tp(b.pos.x, b.pos.z - 0.9, 0);
      t.step(0.2);
      const offer = g.interactTarget?.label;
      st.tap('interact');
      t.step(0.1);
      const carrying = !!g.stealth.carry;
      const stowed = g.weapons.stowed;
      st.setMove('t', 0, 1);
      st.tap('dash');
      t.step(1.5);
      const speed = g.player.controller.speed;
      st.setMove('t', 0, 0);
      t.step(0.3);
      // put down, pick up again, then into the dumpster
      st.tap('interact');
      t.step(2.5);
      const dropped = !g.stealth.carry && em.bodies[0]?.present;
      const b2 = em.bodies[0];
      t.tp(b2.pos.x - 0.8, b2.pos.z, Math.PI / 2);
      t.step(0.2);
      st.tap('interact');
      t.step(0.2);
      const again = !!g.stealth.carry;
      t.tp(-21.6, -20.2, Math.PI);
      t.step(0.2);
      const hideOffer = g.interactTarget?.label;
      st.tap('interact');
      t.step(0.2);
      t.light(null);
      return { offer, carrying, stowed, speed, dropped, again, hideOffer, hidden: g.stealth.bodiesHidden, present: em.bodies.filter((x) => x.present).length };
    });
    assert(r.offer === 'Pick up body', `standing at a body offers to pick it up (${r.offer})`);
    assert(r.carrying && r.stowed, 'picking it up puts it on the shoulder and stows the weapon');
    assert(r.speed < 2.4, `carrying is slow, no sprint (${r.speed.toFixed(2)} m/s)`);
    assert(r.dropped, 'it can be put down again');
    assert(r.again, 'and picked up again');
    assert(r.hideOffer === 'Hide body', `at the dumpster: hide it (${r.hideOffer})`);
    assert(r.hidden === 1 && r.present === 0, 'hidden bodies are gone for good');
  });

  await scen('lights', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      const reg = g.world.level.lights;
      t.light(0);
      t.tp(-22, -24, 0);
      // shoot out the factory floor lamp at (0, -3): the nearest guard comes to look with a flashlight
      const e = t.spawn('grunt', 6, 3, 0);
      const lamp = reg.lights.find((l) => l.kind === 'lamp' && l.x === 0 && l.z === -3);
      const before = reg.countOn();
      g.weapons.onRay(new t.V(0, 1.5, -10), new t.V(0, 8.6, 4));
      const out = lamp.destroyed;
      // the far end of another strip (1.2 m from its centre) is a hit too
      const lamp2 = reg.lights.find((l) => l.kind === 'lamp' && l.x === 9 && l.z === -9);
      g.weapons.onRay(new t.V(9, 1, -7.8), new t.V(9, 9, -7.8));
      const end = lamp2.destroyed;
      // it looks for ALERT.hearLook (2.4 s), then walks over
      t.step(2.8);
      const lv = e.level;
      // (3.6: the torch comes on where it is dark at his head - the light field, lamps included - not where the ambient
      // alone is. He walks to the second lamp shot out, at (9, -9), through the pool of the lamp at (9, 3) (0.44-0.51
      // at his head: no torch) and lights it once he leaves the light, a few metres on at an investigating walk)
      let torch = 0;
      let torchLevel = -1;
      for (let k = 0; k < 150 && !torch; k++) {
        t.step(0.1);
        torch = em.torchesOn;
        if (torch) torchLevel = g.world.lightField.levelAt(e.pos.x, e.pos.y + 1.4, e.pos.z);
      }
      // switch: the floor circuit off at its wall switch
      t.reset();
      t.light(0);
      const e2 = t.spawn('grunt', 4, -2, Math.PI);
      const sw = g.interactables.items.find((i) => i.id === 'switch-4');
      t.tp(sw.pos.x, sw.pos.z + 0.6, Math.PI);
      t.step(0.2);
      const swOffer = g.interactTarget?.label;
      const on0 = reg.countOn();
      window.__app.input.state.tap('interact');
      t.step(0.2);
      const on1 = reg.countOn();
      t.step(2.8);
      const lv2 = e2.level;
      t.light(null);
      return { before, out, end, lv, torch, torchLevel, swOffer, on0, on1, lv2, shot: g.stealth.lightsShot };
    });
    assert(r.out, 'a shot through a bulb puts the light out');
    assert(r.end, 'a shot at the end of a lamp strip puts it out too');
    assert(r.lv === 'investigating', `the nearest guard comes to look (${r.lv})`);
    assert(r.torch >= 1 && r.torchLevel < 0.35, `with a flashlight in the dark (${r.torch} on, light at his head ${r.torchLevel.toFixed(2)})`);
    assert(r.swOffer === 'Lights off', `a wall switch offers lights off (${r.swOffer})`);
    assert(r.on1 < r.on0, `switching turns the room's circuit off (${r.on0} -> ${r.on1})`);
    assert(r.lv2 === 'investigating', `the room going dark is investigated (${r.lv2})`);
  });

  await scen('alarm', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      const st = window.__app.input.state;
      t.light(0);
      t.tp(-22, 16, 0);
      const e = t.spawn('grunt', 2, 6, 0);
      e.alert();
      const n0 = em.alive;
      let raised = false;
      for (let i = 0; i < 100 && !raised; i++) {
        t.step(0.1);
        raised = em.alarmRaised;
      }
      t.step(0.5);
      const n1 = em.alive;
      // disable a panel first (hold), then nobody can raise it
      t.reset();
      t.light(0);
      const panel = g.interactables.items.find((i) => i.id === 'alarm-1');
      t.tp(panel.pos.x + 0.7, panel.pos.z, -Math.PI / 2);
      t.step(0.2);
      const offer = g.interactTarget?.label;
      st.set('t', 'interact', true);
      t.step(1.5);
      st.set('t', 'interact', false);
      const dis = em.alarms[1].disabled;
      em.alarms[0].disabled = true;
      t.tp(-22, 16, 0);
      const e2 = t.spawn('grunt', 2, 6, 0);
      e2.alert();
      t.step(8);
      t.light(null);
      return { raised, n0, n1, offer, dis, raised2: em.alarmRaised };
    });
    assert(r.raised, 'an alerted guard runs to the alarm panel and raises it');
    assert(r.n1 > r.n0, `reinforcements come in (${r.n0} -> ${r.n1})`);
    assert(/Disable alarm/.test(r.offer ?? ''), `the panel can be disabled (${r.offer})`);
    assert(r.dis && !r.raised2, 'a disabled panel never raises the alarm');
  });

  await scen('revive', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      t.light(0);
      t.tp(-22, -24, 0);
      const v = t.spawn('grunt', 0, -3, 0);
      t.kill(v, true);
      const w = t.spawn('grunt', 0.5, 6, Math.PI);
      const n0 = em.alive;
      let woke = false;
      for (let i = 0; i < 200 && !woke; i++) {
        t.step(0.1);
        woke = em.alive > n0;
      }
      const lethal = em.bodies.length;
      t.light(null);
      return { woke, lethal, wl: w.level };
    });
    assert(r.woke, 'a knocked-out guard is woken when a squadmate finds him');
    assert(r.lethal === 0, `and the body is gone (${r.lethal} left)`);
  });

  await scen('surfaces', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const st = window.__app.input.state;
      t.light(0);
      const walk = (x, y, z, yaw) => {
        g.player.controller.teleport(new t.V(x, y, z), yaw);
        g.player.cam.yaw = yaw;
        t.step(0.3);
        st.setMove('t', 0, 0.6);
        let n = 0;
        let surf = '';
        for (let i = 0; i < 12; i++) {
          t.step(0.1);
          n = Math.max(n, g.noise);
          surf = g.surface;
        }
        st.setMove('t', 0, 0);
        t.step(0.4);
        return { n, surf };
      };
      const concrete = walk(8, 0, -5, Math.PI / 2);
      const metal = walk(13.5, 2.6, 14.6, Math.PI / 2);
      const carpet = walk(-2.5, 0, 13.4, 0);
      t.light(null);
      return { concrete, metal, carpet };
    });
    assert(r.concrete.surf === 'concrete' && r.metal.surf === 'metal' && r.carpet.surf === 'carpet', `surfaces under foot (${r.concrete.surf}, ${r.metal.surf}, ${r.carpet.surf})`);
    assert(r.metal.n > r.concrete.n && r.concrete.n > r.carpet.n, `walking is loudest on metal, quietest on carpet (${r.metal.n.toFixed(1)} / ${r.concrete.n.toFixed(1)} / ${r.carpet.n.toFixed(1)} m)`);
  });

  await scen('shots', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.light(0);
      t.tp(0, -5, Math.PI);
      const e = t.spawn('grunt', 0, 5, 0);
      t.step(0.3);
      const stats = g.weapons.current.stats;
      const n0 = stats.noise;
      stats.noise = 0.45;
      g.weapons.events.onShot(g.weapons.current.def);
      t.step(0.2);
      const supp = e.level;
      stats.noise = n0;
      t.reset();
      t.light(0);
      t.tp(0, -5, Math.PI);
      const e2 = t.spawn('grunt', 0, 5, 0);
      t.step(0.3);
      // (an unsuppressed report: the issued 9mm SD is quiet)
      const st2 = g.weapons.current.stats;
      const n1 = st2.noise;
      st2.noise = 1;
      g.weapons.events.onShot(g.weapons.current.def);
      st2.noise = n1;
      t.step(0.2);
      const loud = e2.level;
      t.reset();
      t.light(0);
      t.tp(-22, -24, 0);
      const e3 = t.spawn('grunt', 0, 5, 0);
      t.step(0.3);
      g.weapons.onRay(new t.V(-5, 1, 5), new t.V(1.5, 1, 6));
      t.step(0.2);
      const impact = e3.level;
      t.light(null);
      return { supp, loud, impact };
    });
    assert(r.supp === 'suspicious', `a suppressed shot only makes a guard suspicious (${r.supp})`);
    assert(r.loud === 'alert', `a loud shot puts him in combat (${r.loud})`);
    assert(r.impact === 'suspicious', `a round landing close by is heard (${r.impact})`);
  });

  await scen('doors', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const st = window.__app.input.state;
      const doors = g.world.doors;
      const d = doors.nearest(-0.95, 12, 0.5);
      // a closed door blocks sight: a lit walker on the far side is not seen
      t.light(1);
      const e = t.spawn('grunt', -0.95, 15, Math.PI);
      t.tp(-0.95, 9.8, 0);
      let blocked = 0;
      for (let i = 0; i < 20; i++) {
        st.setMove('t', i % 10 < 5 ? 0.5 : -0.5, 0);
        t.step(0.1);
        blocked = Math.max(blocked, e.rate);
      }
      st.setMove('t', 0, 0);
      // opened quietly by hand: a creak (2 m), then he can see through
      t.tp(-0.95, 11.2, 0);
      t.step(0.2);
      const offer = g.interactTarget?.label;
      g.noise = 0;
      st.tap('interact');
      t.step(0.1);
      const quiet = g.noise;
      t.step(1.4);
      const open = d.open;
      t.tp(-0.95, 9.8, 0);
      let seen = 0;
      for (let i = 0; i < 10; i++) {
        t.step(0.1);
        seen = Math.max(seen, e.rate);
      }
      // bashed open at a sprint: loud
      t.reset();
      t.light(0);
      // (from beside the conveyor, angled at the doorway)
      t.tp(-2.6, 8.2, Math.atan2(1.65, 3.8));
      t.step(0.3);
      st.setMove('t', 0, 1);
      st.tap('dash');
      let bash = 0;
      for (let i = 0; i < 60 && d.target === 0; i++) t.step(0.05);
      t.step(0.1);
      bash = g.noise;
      st.setMove('t', 0, 0);
      const bashed = d.target === 1;
      // a guard walking his beat through a closed door opens it
      t.reset();
      t.light(0);
      t.tp(-22, -24, 0);
      const w = t.spawn('grunt', -0.95, 14.5, Math.PI);
      w.setPatrol({ points: [[-0.95, 14.5], [-0.95, 8.5]], wait: 1 });
      let through = false;
      for (let i = 0; i < 80 && !through; i++) {
        t.step(0.25);
        through = w.pos.z < 11;
      }
      t.light(null);
      return { blocked, offer, quiet, open, seen, bash, bashed, through, dOpen: d.target };
    });
    assert(r.blocked === 0, `a closed door blocks sight (${r.blocked.toFixed(2)})`);
    assert(r.offer === 'Open door', `at a door: open it (${r.offer})`);
    assert(r.quiet > 0 && r.quiet <= 2.5, `opening by hand is a quiet creak (${r.quiet.toFixed(1)} m)`);
    assert(r.open === 1 && r.seen > 0, `once open he sees through (${r.seen.toFixed(2)})`);
    assert(r.bashed && r.bash >= 8, `sprinting into a door bashes it open, loud (${r.bash.toFixed(1)} m)`);
    assert(r.through && r.dOpen === 1, 'a guard walking through opens the door');
  });

  await scen('vision', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const st = window.__app.input.state;
      const v = g.vision;
      t.light(null);
      // a guard behind the dispatch wall, 8 m away
      t.spawn('grunt', 0, -15, 0);
      t.tp(0, -7, Math.PI);
      t.step(0.2);
      st.tap('vision');
      t.step(0.4);
      g.frameUpdate(0.4, 1);
      const night = { mode: v.mode, nv: g.post['nv'], hud: document.querySelector('.tac-vision')?.textContent };
      st.tap('vision');
      t.step(0.1);
      g.frameUpdate(0.1, 1);
      // (Step 4b fix) no sonar: the second press turns the goggles off (thermal replaces sonar in Phase 3)
      t.step(0.4);
      g.frameUpdate(0.4, 1);
      const off = { mode: v.mode, marks: g.sonarMarks.count, hud: document.querySelector('.tac-vision')?.textContent };
      return { night, off, nvOff: g.post['nv'] };
    });
    assert(r.night.mode === 'night' && r.night.nv > 0.9 && r.night.hud === 'NV', `the goggles button: night vision (${JSON.stringify(r.night)})`);
    assert(r.off.mode === 'off' && r.off.marks === 0 && r.off.hud === '', `again: off, no sonar (${JSON.stringify(r.off)})`);
    assert(r.nvOff < 0.01, `night vision is off (${r.nvOff})`);
  });

  const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
  assert(real.length === 0, `no console errors (${real.join(' | ')})`);
} catch (e) {
  failed = true;
  console.error(String(e));
}
await browser.close();
process.exit(failed ? 1 : 0);
