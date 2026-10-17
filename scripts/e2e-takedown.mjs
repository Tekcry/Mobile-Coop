// Takedowns on the night Warehouse (Clear rules): ground behind / front / side (side only on a
// calm guard), tap = non-lethal (knocked out) / hold = lethal, the attacker aligned within 5 cm, interrupted by
// damage, from above (a drop off the mezzanine), from below (hanging at the mezzanine lip),
// through a window; 3.2.0: the grab (walk, sidearm, human shield, knock out, kill, shove), drop attacks
// from a pipe and a split, an inverted choke. `node scripts/e2e-takedown.mjs [url] [--only=name]`
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
    const V = g.player.position.constructor;
    const st = a.input.state;
    const c = g.player.controller;
    window.__t = {
      V,
      reset() {
        g.takedown.reset();
        em.clear();
        g.traversal.reset();
        st.releaseAll();
        st.setMove('t', 0, 0);
        c['crouchToggled'] = false;
        a.loop.timeScale = 1;
      },
      tp(x, y, z, yaw) {
        c.teleport(new V(x, y, z), yaw);
        g.player.cam.yaw = yaw;
        g.player.cam.pitch = 0;
      },
      spawn(x, z, yaw, y = 0) {
        const e = em.spawn('grunt', new V(x, y, z), false, yaw);
        return e;
      },
      step(s) {
        a.loop.stepHeadless(s, 120);
      },
      /** Press interact: tap (released next step) or hold for `hold` s. */
      press(hold = 0) {
        st.set('t', 'interact', true);
        a.loop.stepHeadless(1 / 60, 120);
        if (hold > 0) a.loop.stepHeadless(hold, 120);
        st.set('t', 'interact', false);
      },
      run(sec) {
        const out = { aligned: 99, kind: '' };
        for (let t = 0; t < sec; t += 1 / 60) {
          const act = g.takedown.active;
          if (act) {
            out.kind = act.plan.kind;
            if (act.t >= act.plan.approach && act.plan.kind !== 'below' && act.plan.kind !== 'window') {
              const p = c.pos;
              out.aligned = Math.min(out.aligned, Math.hypot(p.x - act.plan.alignX, p.y - act.plan.alignY, p.z - act.plan.alignZ));
            }
          }
          a.loop.stepHeadless(1 / 60, 120);
        }
        return out;
      },
    };
  });
  const scen = async (name, f) => {
    if (only && !name.includes(only)) return;
    console.log(name);
    await G(() => window.__t.reset());
    await f();
  };

  await scen('ground', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      // behind (the guard faces away), tap: knocked out
      t.tp(2, 0, -2.2, 0);
      const e = t.spawn(2, -1, 0);
      t.step(0.4);
      const offer = g.takedown.offer?.plan.kind;
      const prompt = document.querySelector('.wp-takedown.show') !== null;
      t.press();
      const run = t.run(1.4);
      // (3.2.0: from behind it is a grab; a second tap knocks him out)
      const grabbed = g.takedown.hostage === e;
      t.press();
      t.run(1.0);
      const ko = em.bodies.find((b) => !b.lethal) !== undefined && !e.alive;
      // front, held: lethal
      t.reset();
      t.tp(2, 0, -2.2, 0);
      const e2 = t.spawn(2, -1, Math.PI);
      // (a guard that has not noticed the operator yet: in the dark)
      e2.passive = true;
      t.step(0.4);
      const offer2 = g.takedown.offer?.plan.kind;
      t.press(0.4);
      t.run(1.4);
      const lethal = em.bodies.find((b) => b.lethal) !== undefined && !e2.alive;
      // side: only on a calm guard
      t.reset();
      t.tp(2, 0, -2.2, 0);
      const e3 = t.spawn(2, -1, Math.PI / 2);
      t.step(0.4);
      const sideCalm = g.takedown.offer?.plan.kind;
      e3.alert();
      // (frozen: the alert would turn him round; the rule is about awareness alone)
      e3.update = () => {};
      t.step(0.1);
      const sideAlert = g.takedown.offer?.plan.kind ?? null;
      // a guard in combat who has seen this operator: no takedown; one alerted without seeing them (radioed): yes
      t.reset();
      t.tp(2, 0, -2.2, 0);
      const e4 = t.spawn(2, -1, Math.PI);
      let k = 0;
      while (!e4.alerted && k++ < 120) t.step(1 / 60);
      e4.update = () => {};
      t.step(0.2);
      const seenOffer = g.takedown.offer?.plan.kind ?? null;
      const spotted = g.spottedLocal;
      t.reset();
      t.tp(2, 0, -2.2, 0);
      // (nobody in combat for a moment: no guard knows the operator is there any more)
      t.step(0.1);
      const e5 = t.spawn(2, -1, Math.PI);
      e5.passive = true;
      e5.alert();
      e5.update = () => {};
      t.step(0.2);
      const calledOffer = g.takedown.offer?.plan.kind ?? null;
      return { offer, prompt, grabbed, aligned: run.aligned, ko, offer2, lethal, sideCalm, sideAlert, seenOffer, spotted, calledOffer, stats: g.takedown.done };
    });
    assert(r.spotted && r.seenOffer === null, `a guard in combat who saw you offers no takedown (${r.seenOffer}, spotted ${r.spotted})`);
    assert(r.calledOffer === 'front', `one alerted without seeing you still can be taken (${r.calledOffer})`);
    assert(r.offer === 'behind' && r.prompt, `behind a guard: takedown offered on him (${r.offer}, prompt ${r.prompt})`);
    assert(r.aligned < 0.05, `the attacker is aligned within 5 cm (${(r.aligned * 100).toFixed(1)} cm)`);
    assert(r.grabbed, 'from behind: grabbed and held');
    assert(r.ko, 'a tap is non-lethal: he is knocked out');
    assert(r.offer2 === 'front' && r.lethal, `from the front, held: lethal (${r.offer2}, ${r.lethal})`);
    assert(r.sideCalm === 'side' && r.sideAlert === null, `from the side only while he is calm (${r.sideCalm} / ${r.sideAlert})`);
  });

  await scen('grab', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const st = window.__app.input.state;
      const c = g.player.controller;
      t.tp(2, 0, -2.2, 0);
      const e = t.spawn(2, -1, 0);
      t.step(0.4);
      const lbl = g.hud.world.label('takedown');
      t.press();
      t.step(0.5);
      const held = g.takedown.hostage === e;
      // a walk at most, the hostage in front
      c.gears.gear = 6;
      st.setMove('t', 0, 1);
      t.step(1.0);
      const speed = c.speed;
      st.setMove('t', 0, 0);
      t.step(0.1);
      const fx = Math.sin(c.yaw);
      const fz = Math.cos(c.yaw);
      const front = Math.hypot(e.pos.x - (c.pos.x + fx * 0.42), e.pos.z - (c.pos.z + fz * 0.42));
      // the sidearm one-handed over his shoulder
      st.set('t', 'ads', true);
      t.step(0.8);
      const w = g.weapons;
      const cls = w.current.def.class;
      const raise = g.player.carry.raise;
      const mag0 = w.current.mag;
      st.set('t', 'fire', true);
      t.step(0.3);
      st.set('t', 'fire', false);
      const fired = mag0 - w.current.mag;
      const spread = w.attachSpread;
      st.set('t', 'ads', false);
      // a guard in front, alerted: holds fire a moment, then his shots hit the hostage first
      // (a clear line from 6 m: the operator turns to face that way, the hostage turned with him)
      let gx = c.pos.x + fx * 6;
      let gz = c.pos.z + fz * 6;
      for (let k = 0; k < 16; k++) {
        const an = (k / 16) * Math.PI * 2;
        const x = c.pos.x + Math.sin(an) * 6;
        const z = c.pos.z + Math.cos(an) * 6;
        const hit = g.ballistics.ray(new t.V(c.pos.x, 1.5, c.pos.z), new t.V(x, 1.5, z), 1).hit || g.ballistics.ray(new t.V(c.pos.x, 0.5, c.pos.z), new t.V(x, 0.5, z), 1).hit;
        if (!hit) {
          gx = x;
          gz = z;
          break;
        }
      }
      const toG = Math.atan2(gx - c.pos.x, gz - c.pos.z);
      c.yaw = toG;
      g.player.cam.yaw = toG;
      t.step(0.3);
      const s2 = t.spawn(gx, gz, toG + Math.PI);
      s2.alert();
      let shots = 0;
      const sh = s2['shoot'].bind(s2);
      s2['shoot'] = (...x) => {
        shots++;
        return sh(...x);
      };
      const hp0 = e.health.hp;
      // (he would go for cover first: hold him where he stands and pull his trigger every step once he has the target)
      t.step(0.5);
      const think = s2.update.bind(s2);
      s2.update = () => {};
      const fire = (sec) => {
        for (let k = 0; k < sec * 60; k++) {
          s2['tryFire'](1 / 60);
          t.step(1 / 60);
        }
      };
      fire(1.0);
      const hpEarly = e.health.hp;
      const shotsEarly = shots;
      fire(1.0);
      // (then a run of aimed shots: some of them land on the hostage in the way)
      const ref = s2.target;
      // (stop once one lands, so he is still alive for the tap)
      for (let k = 0; k < 30 && e.health.hp >= hp0; k++) s2['shoot'](ref, s2.def.weapon, 'aim');
      const eye = s2['eye'](new t.V());
      const hp = g.target.headPoint(new t.V());
      const ray = g.ballistics.ray(eye, hp, 1 | 8 | 512 | 128);
      window.__dbg = { hitId: ray.target?.id ?? ray.target?.team ?? null, part: ray.part, pt: [ray.point.x, ray.point.y, ray.point.z].map((v) => +v.toFixed(2)), hostage: [e.pos.x, e.pos.y, e.pos.z].map((v) => +v.toFixed(2)), head: [hp.x, hp.y, hp.z].map((v) => +v.toFixed(2)), eye: [eye.x, eye.y, eye.z].map((v) => +v.toFixed(2)), hb: ['bodyNode', 'headNode'].map((n) => { const q = e['hitboxes'][n].position; return [q.x, q.y, q.z].map((v) => +v.toFixed(2)); }) };
      const hpLate = e.health.hp;
      void think;
      const shield = g.localRef.shield === e;
      s2.update = () => {};
      // a head shot kills him: he drops and the grab ends; still alive: a tap knocks him out
      const shotDead = !e.alive;
      if (!shotDead) t.press();
      t.run(1.0);
      const ko = !e.alive && !g.takedown.active && g.localRef.shield === null;
      window.__dbg2 = { alive: e.alive, active: !!g.takedown.active, shield: !!g.localRef.shield, lost: g.takedown.grabs };
      c.gears.gear = 4;
      return { lbl, held, speed, front, cls, raise, fired, spread, hp0, hpEarly, hpLate, ko, shotDead, shield, shots, shotsEarly, dbg: window.__dbg, dbg2: window.__dbg2, s2: { level: s2.level, los: s2['los'], state: s2.state }, grabs: g.takedown.grabs };
    });
    assert(r.lbl === 'Grab', `the prompt from behind reads Grab ("${r.lbl}")`);
    assert(r.held, 'Y grabs and holds him');
    assert(r.speed <= 1.3 * 1.05, `moving with a hostage: gear 2 at most (${r.speed.toFixed(2)} m/s)`);
    assert(r.front < 0.05, `the hostage stays in front (${(r.front * 100).toFixed(1)} cm)`);
    assert(r.cls === 'pistol' && r.raise > 0.9 && r.fired > 0 && Math.abs(r.spread - 1.2) < 1e-6, `LT / RT: the sidearm over his shoulder, spread x1.2 (${r.cls}, fired ${r.fired})`);
    assert(r.shield, 'the hostage is a human shield');
    assert(r.hpEarly === r.hp0 && r.shotsEarly === 0, `guards hold fire at first (${r.hp0} -> ${r.hpEarly}, ${r.shotsEarly} shots)`);
    assert(r.hpLate < r.hp0, `then their shots hit the hostage (${r.hp0} -> ${r.hpLate}, ${r.shots} shots, ${JSON.stringify(r.s2)} ${JSON.stringify(r.dbg)})`);
    assert(r.ko, (r.shotDead ? 'shot dead: he drops, the grab ends' : 'tap: knocked out') + (r.ko ? '' : ' ' + JSON.stringify(r.dbg2)));
  });

  await scen('grab-kill-shove', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const st = window.__app.input.state;
      t.tp(2, 0, -2.2, 0);
      const e = t.spawn(2, -1, 0);
      t.step(0.4);
      t.press();
      t.step(0.5);
      t.press(0.4);
      t.run(1.0);
      const killed = !e.alive && g.enemyMgr.bodies.some((b) => b.lethal);
      t.reset();
      t.tp(2, 0, -2.2, 0);
      const e2 = t.spawn(2, -1, 0);
      t.step(0.4);
      t.press();
      t.step(0.5);
      st.set('t', 'crouch', true);
      t.step(1 / 60);
      st.set('t', 'crouch', false);
      t.step(0.2);
      const shoved = !g.takedown.active && e2.alive && !e2.taken;
      const crouched = g.player.controller.crouched;
      const stagger = e2['stagger'];
      t.step(1.2);
      return { killed, shoved, crouched, stagger, alerted: e2.alerted };
    });
    assert(r.killed, 'held press: killed');
    assert(r.shoved && !r.crouched, `B shoves him away (not a crouch) (${r.shoved})`);
    assert(r.stagger > 0.6 && r.alerted, `he staggers about a second, then is alert (${r.stagger?.toFixed(2)})`);
  });

  await scen('ct-drop-inverted', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const st = window.__app.input.state;
      const L = g.world.level.anchors;
      // a pipe hung at runtime over open floor (no visual): hang under it and drop on a guard below
      const pipe = L.add({ kind: 'pipeH', a: { x: 0, y: 3.6, z: -1.5 }, b: { x: 4, y: 3.6, z: -1.5 }, hangHeight: 3.6, radius: 0.06 });
      t.tp(2, 0, -1.2, 0);
      t.step(0.2);
      g.traversal.attachCtl.attachTo(pipe, 2, 'below', 1);
      t.step(0.8);
      const p = g.player.position;
      const e = t.spawn(p.x + 0.3, p.z + 0.3, 0);
      e.passive = true;
      t.step(0.3);
      const offer = g.takedown.offer?.plan.kind;
      t.press();
      t.run(1.8);
      const dropDone = !e.alive && !g.traversal.attached && g.player.position.y < 0.3;
      // inverted on the same pipe (lower: 3 m), a guard right beneath: choke him up
      t.reset();
      pipe.a.y = pipe.b.y = pipe.hangHeight = 3.0;
      t.tp(2, 0, -1.2, 0);
      t.step(0.2);
      g.traversal.attachCtl.attachTo(pipe, 2, 'below', 1);
      t.step(0.8);
      st.tap('jump');
      t.step(0.7);
      st.tap('jump');
      t.step(0.8);
      const inv = g.traversal.attachCtl.pipe.mode;
      const q = g.player.position;
      const e2 = t.spawn(q.x + 0.2, q.z - 0.2, 0);
      e2.passive = true;
      t.step(0.3);
      const offer2 = g.takedown.offer?.plan.kind;
      t.press();
      t.run(1.6);
      const invDone = !e2.alive && g.traversal.attached && g.traversal.attachCtl.pipe.mode === 'inverted';
      // a split (the Warehouse's generated gap): a guard below
      t.reset();
      const sg = L.splits[0];
      let splitOffer = 'none';
      let splitDone = false;
      if (sg) {
        const sx = sg.a.x + sg.tx * sg.len / 2;
        const sz = sg.a.z + sg.tz * sg.len / 2;
        t.tp(sx, sg.a.y, sz, Math.atan2(sg.tx, sg.tz));
        t.step(0.3);
        g.traversal.attachCtl.attachTo(sg, sg.len / 2, 'below', 1);
        t.step(0.8);
        const e3 = t.spawn(sx + sg.tx * 0.5, sz + sg.tz * 0.5, 0, sg.a.y);
        e3.passive = true;
        t.step(0.3);
        splitOffer = g.takedown.offer?.plan.kind ?? 'none';
        t.press();
        t.run(1.6);
        splitDone = !e3.alive;
      }
      return { offer, dropDone, inv, offer2, invDone, splitOffer, splitDone };
    });
    assert(r.offer === 'drop', `hanging from a pipe over a guard: drop attack (${r.offer})`);
    assert(r.dropDone, 'dropped on him and landed');
    assert(r.inv === 'inverted' && r.offer2 === 'inverted', `inverted over a guard: choke up (${r.inv}, ${r.offer2})`);
    assert(r.invDone, 'done, still hanging inverted');
    assert(r.splitOffer === 'drop' && r.splitDone, `from a split: drop attack (${r.splitOffer})`);
  });

  await scen('interrupt', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.tp(2, 0, -2.2, 0);
      const e = t.spawn(2, -1, 0);
      t.step(0.4);
      t.press();
      t.step(0.15);
      const was = !!g.takedown.active;
      g.target.health.invulnerable = false;
      g.target.applyDamage({ amount: 10, point: g.player.position.clone(), dir: new t.V(0, 0, 1), part: 'body', kind: 'bullet', attackerTeam: 'enemy', attackerId: 'x', sourcePos: g.player.position.clone(), impulse: 0 });
      g.target.health.invulnerable = true;
      t.step(0.1);
      return { was, now: !!g.takedown.active, alive: e.alive, free: !e.taken, alerted: e.alerted, aborted: g.takedown.done.aborted, override: !!g.player.controller.override };
    });
    assert(r.was && !r.now, 'taking damage breaks off a takedown');
    assert(r.alive && r.free && r.alerted, 'the victim breaks free, alerted');
    assert(!r.override, 'the attacker is released (no stuck override)');
  });

  await scen('above', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      // on the mezzanine deck at the zipline gap, a guard on the floor below
      t.tp(12, 2.6, 12.45, Math.PI);
      t.step(0.3);
      const e = t.spawn(12, 10.9, Math.PI);
      t.step(0.4);
      const offer = g.takedown.offer?.plan.kind;
      t.press();
      const run = t.run(1.6);
      return { offer, done: !e.alive, aligned: run.aligned, y: g.player.position.y };
    });
    assert(r.offer === 'above', `on a ledge over a guard: drop takedown (${r.offer})`);
    assert(r.done && r.y < 0.3, `done, landed on the floor (y ${r.y.toFixed(2)})`);
    assert(r.aligned < 0.05, `aligned within 5 cm (${(r.aligned * 100).toFixed(1)} cm)`);
  });

  await scen('below', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      // a hangable piece of the mezzanine's front lip (the railings cut it into pieces)
      const L = g.world.level.anchors.ledges.filter((l) => l.canHang && Math.abs(l.top - 2.6) < 0.1 && Math.abs(l.a.z - 12) < 0.25 && Math.abs(l.b.z - 12) < 0.25).sort((p, q) => q.len - p.len)[0];
      if (!L) return { err: 'no mezzanine lip' };
      const s = L.len / 2;
      const lx = L.a.x + L.tx * s;
      t.tp(lx, 0, 11.4, 0);
      t.step(0.2);
      g.traversal.attachCtl.attachTo(L, s, 'below');
      t.step(1.2);
      const hanging = g.traversal.attached;
      const e = t.spawn(lx + 0.2, 12.6, 0, 2.6);
      t.step(0.4);
      const offer = g.takedown.offer?.plan.kind;
      t.press();
      t.run(1.4);
      return { hanging, offer, done: !e.alive, stillHanging: g.traversal.attached };
    });
    assert(!r.err, r.err ?? '');
    assert(r.hanging, 'hanging at the mezzanine lip');
    assert(r.offer === 'below', `a guard at the lip above: pull him over (${r.offer})`);
    assert(r.done && r.stillHanging, 'done, still hanging');
  });

  await scen('window', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      // the workshop's open yard window (x 11.5, z -18): player inside, a guard outside
      t.tp(11.5, 0, -17.3, Math.PI);
      t.step(0.6);
      const e = t.spawn(11.5, -18.9, Math.PI);
      t.step(0.5);
      const hint = !!g.traversal.hintWindow;
      const offer = g.takedown.offer?.plan.kind;
      t.press();
      t.run(1.4);
      return { hint, offer, done: !e.alive };
    });
    assert(r.hint && r.offer === 'window', `at a window with a guard outside: pull him through (${r.offer}, window ${r.hint})`);
    assert(r.done, 'done');
  });

  // (locomotion step 12 r1) back to a high wall at an outside edge: a guard round the corner (past the end) is the
  // corner takedown; played from the wall, the guard goes down and the operator comes off the wall
  await scen('corner from the wall', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const st = window.__app.input.state;
      const V = t.V;
      const segs = g.world.level.coverSegments;
      const L = g.wallCore?.links;
      if (!L) return { err: 'no wallCore links' };
      const clear = (x0, z0, x1, z1, y) => !g.ballistics.ray(new V(x0, y, z0), new V(x1, y, z1), 1).hit;
      const floor = (x, z, y) => g.ballistics.ray(new V(x, y + 1, z), new V(x, y - 0.5, z), 1).hit;
      // a free high wall end: the face clear 2 m out along its last metre, the space round the end clear and floored
      let pick = null;
      for (let i = 0; i < segs.length && !pick; i++) {
        const s = segs[i];
        if (s.low || Math.abs(s.y) > 0.3 || s.len < 1.5) continue;
        for (const end of [1, -1]) {
          if ((end > 0 ? L.kB[i] : L.kA[i]) !== 0) continue;
          const ex = end > 0 ? s.bx : s.ax;
          const ez = end > 0 ? s.bz : s.az;
          const tx = end * s.tx;
          const tz = end * s.tz;
          // the player 0.25 m in from the end on the body line, the guard 0.75 m past the end, 0.35 m out
          const px = ex - tx * 0.25 + s.nx * 0.35;
          const pz = ez - tz * 0.25 + s.nz * 0.35;
          const gx = ex + tx * 0.75 + s.nx * 0.35;
          const gz = ez + tz * 0.75 + s.nz * 0.35;
          let ok = floor(px, pz, s.y) && floor(gx, gz, s.y) && floor(gx + tx * 0.6, gz + tz * 0.6, s.y);
          for (const h of [0.3, 1.0, 1.6]) {
            ok = ok && clear(px, pz, gx + tx * 0.6, gz + tz * 0.6, s.y + h);
            ok = ok && clear(px, pz, px + s.nx * 1.5, pz + s.nz * 1.5, s.y + h);
          }
          if (!ok) continue;
          // (inside the map: a guard spawned there stays there, not moved onto the nearest walkable cell)
          const probe = t.spawn(gx, gz, 0, s.y);
          const inPlace = Math.hypot(probe.pos.x - gx, probe.pos.z - gz) < 0.1;
          g.enemyMgr.clear();
          if (inPlace) { pick = { i, end, px, pz, gx, gz, tx, tz, y: s.y }; break; }
        }
      }
      if (!pick) return { err: 'no free wall end on the map' };
      const s = segs[pick.i];
      const yaw = Math.atan2(-s.nx, -s.nz);
      t.tp(pick.px + s.nx * 0.5, pick.y + 0.05, pick.pz + s.nz * 0.5, yaw);
      t.step(0.3);
      st.set('t', 'cover', true);
      t.step(1 / 60);
      st.set('t', 'cover', false);
      t.step(0.8);
      const wc = g.wallCore;
      const onWall = wc.phase === 'on' && wc.seg === pick.i && !wc.low;
      const edge = wc.edge;
      // the guard past the end, facing on away round the corner (not seeing the operator)
      const e = t.spawn(pick.gx, pick.gz, Math.atan2(pick.tx, pick.tz), pick.y);
      e.passive = true;
      e.update = () => {};
      t.step(0.3);
      const offer = g.takedown.offer?.plan.kind ?? null;
      const stillOn = g.wallCore.phase === 'on';
      const dbg = offer ? null : JSON.stringify({ inp: g.takedown['inp'], vic: g.takedownVictims().length, p: [g.player.position.x, g.player.position.z], e: [e.pos.x, e.pos.z, e.alive, e.taken, e.level], s: [s.ax, s.az, s.bx, s.bz, s.nx, s.nz] });
      t.press();
      const run = t.run(1.6);
      const down = !e.alive || g.takedown.hostage === e;
      const offWall = g.wallCore.phase !== 'on';
      // the same guard in front of the face (not past the end): an ordinary takedown, not a corner one
      t.reset();
      if (g.wallCore.active) g.wallCore.leave('test');
      t.tp(pick.px + s.nx * 0.5, pick.y + 0.05, pick.pz + s.nz * 0.5, yaw);
      t.step(0.3);
      st.set('t', 'cover', true);
      t.step(1 / 60);
      st.set('t', 'cover', false);
      t.step(0.8);
      const fx = pick.px - pick.tx * 0.2 + s.nx * 1.1;
      const fz = pick.pz - pick.tz * 0.2 + s.nz * 1.1;
      const e2 = t.spawn(fx, fz, Math.atan2(s.nx, s.nz), pick.y);
      e2.passive = true;
      e2.update = () => {};
      t.step(0.3);
      const offer2 = g.takedown.offer?.plan.kind ?? null;
      const on2 = g.wallCore.phase === 'on';
      if (g.wallCore.active) g.wallCore.leave('test');
      t.reset();
      return { dbg, pick: { i: pick.i, end: pick.end }, onWall, edge, offer, stillOn, kind: run.kind, aligned: run.aligned, down, offWall, offer2, on2 };
    });
    assert(!r.err, `corner from the wall: ${r.err ?? 'a free wall end'}`);
    assert(r.onWall && r.edge === r.pick.end, `on a high wall at its outside end (edge ${r.edge}, end ${r.pick.end})`);
    assert(r.offer === 'corner' && r.stillOn, `a guard round the edge: the corner takedown offered from the wall (${r.offer}${r.dbg ? ' ' + r.dbg : ''})`);
    assert(r.kind === 'corner' && r.down && r.offWall && r.aligned < 0.25, `played from the wall: corner, the guard down, off the wall, aligned ${r.aligned.toFixed(2)} m (${JSON.stringify(r)})`);
    assert(r.on2 && r.offer2 !== 'corner', `a guard in front of the face: not a corner takedown (${r.offer2})`);
  });

  // (locomotion step 10) the elbow strike on a heavy from the front: staggered, never knocked out (fire, D1)
  await scen('elbow strike: heavy from the front', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const st = window.__app.input.state;
      t.tp(2, 0, -1.9, 0);
      const e = g.enemyMgr.spawn('heavy', new t.V(2, 0, -1), true, Math.PI);
      e['stagger'] = 99;
      t.step(0.2);
      const fire = () => {
        st.set('t', 'fire', true);
        window.__app.loop.stepHeadless(1 / 60, 120);
        st.set('t', 'fire', false);
      };
      const out = [];
      for (let k = 0; k < 2; k++) {
        e.yaw = Math.PI;
        fire();
        t.step(1.0);
        out.push({ alive: e.alive, stag: g.strike.count.stagger });
      }
      return { out, ko: g.strike.count.ko, kind: e.def.kind };
    });
    assert(r.kind === 'heavy' && r.out.every((o) => o.alive) && r.out[1].stag >= 2 && r.ko === 0, `two frontal strikes on a heavy: staggered, never knocked out (${JSON.stringify(r)})`);
  });
  const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
  assert(real.length === 0, `no console errors (${real.join(' | ')})`);
} catch (e) {
  failed = true;
  console.error(String(e));
}
await browser.close();
process.exit(failed ? 1 : 0);
