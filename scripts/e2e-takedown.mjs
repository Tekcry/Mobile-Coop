// Takedowns on the night Warehouse (Clear rules): ground behind / front / side (side only on a
// calm guard), (G5, Michael 08:10) one context menu row per takedown (a knockout; RT held is the lethal strike, anim-rework S1), the attacker aligned within 5 cm, interrupted by
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
      /** (G5) Hold A (the context menu opens on row 1), step the highlight `rows` down, let go (the row runs). */
      menu(rows) {
        st.set('t', 'interact', true);
        a.loop.stepHeadless(1 / 60, 120);
        for (let i = 0; i < rows; i++) {
          st.tap('uiDown');
          a.loop.stepHeadless(1 / 60, 120);
        }
        st.set('t', 'interact', false);
        a.loop.stepHeadless(1 / 60, 120);
        return g.ctxMenu.state;
      },
      /** (A4) With the grab menu open: select `opt` and press A (the menu arms once A is up). */
      pick(opt) {
        const m = g.grabMenu;
        a.loop.stepHeadless(1 / 60, 120);
        m.sel = m.opts.indexOf(opt);
        this.press();
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
      // (A4: from behind it is a grab; the CT grab menu knocks him out)
      const grabbed = g.takedown.hostage === e && g.grabMenu.open;
      t.pick('knockout');
      t.run(1.0);
      const ko = em.bodies.find((b) => !b.lethal) !== undefined && !e.alive;
      // front: (G5, Michael 08:10: no knock out / kill rows) one row, Takedown: a tap knocks him out
      t.reset();
      t.tp(2, 0, -2.2, 0);
      const e2 = t.spawn(2, -1, Math.PI);
      // (a guard that has not noticed the operator yet: in the dark)
      e2.passive = true;
      t.step(0.4);
      const offer2 = g.takedown.offer?.plan.kind;
      const rows2 = g.ctxMenu.opts.slice(0, g.ctxMenu.count).map((o) => o.label).join(' / ');
      t.press();
      t.run(1.4);
      const frontKo = em.bodies.find((b) => !b.lethal) !== undefined && !e2.alive;
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
      return { offer, prompt, grabbed, aligned: run.aligned, ko, offer2, rows2, frontKo, sideCalm, sideAlert, seenOffer, spotted, calledOffer, stats: g.takedown.done };
    });
    assert(r.spotted && r.seenOffer === null, `a guard in combat who saw you offers no takedown (${r.seenOffer}, spotted ${r.spotted})`);
    assert(r.calledOffer === 'front', `one alerted without seeing you still can be taken (${r.calledOffer})`);
    assert(r.offer === 'behind' && r.prompt, `behind a guard: takedown offered on him (${r.offer}, prompt ${r.prompt})`);
    assert(r.aligned < 0.05, `the attacker is aligned within 5 cm (${(r.aligned * 100).toFixed(1)} cm)`);
    assert(r.grabbed, 'from behind: grabbed and held');
    assert(r.ko, 'grab menu Knock out: he is knocked out');
    assert(r.offer2 === 'front' && r.rows2 === 'Takedown' && r.frontKo, `from the front: one row, Takedown, a tap knocks him out (${r.offer2}, ${r.rows2}, ${r.frontKo})`);
    assert(r.sideCalm === 'side' && r.sideAlert === null, `from the side only while he is calm (${r.sideCalm} / ${r.sideAlert})`);
  });

  // (guard-ai S12, item 2 "takedowns still one move") a helmeted, armoured guard falls to one takedown
  await scen('gear: one takedown', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      t.tp(2, 0, -2.2, 0);
      const e = t.spawn(2, -1, Math.PI);
      e.setGear({ helmet: true, armour: true });
      e.passive = true;
      t.step(0.4);
      const offer = g.takedown.offer?.plan.kind ?? null;
      t.press();
      t.run(1.4);
      return { offer, down: !e.alive, ko: em.bodies.find((b) => !b.lethal) !== undefined, helmet: e.helmet, armour: e.armour };
    });
    assert(r.offer === 'front' && r.down && r.ko, `one takedown knocks out a helmeted, armoured guard (${JSON.stringify(r)})`);
    assert(r.helmet && r.armour, `the takedown never touches his gear (${JSON.stringify(r)})`);
  });

  await scen('grab', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const c = g.player.controller;
      const st0 = window.__app.input.state;
      t.tp(2, 0, -2.2, 0);
      const e = t.spawn(2, -1, 0);
      t.step(0.4);
      const lbl = g.hud.world.label('takedown');
      const offerRows = g.ctxMenu.opts.slice(0, g.ctxMenu.count).map((o) => o.label).join(' / ');
      t.press();
      // (G7, AUDIT-WALLS row 5, 110936: the step-in 0.42 s then the 0.6 s pull-in; not held yet at 0.6 s)
      t.step(0.6);
      const early = g.takedown.hostage === e;
      // the hold settles ~1.0-1.2 s after the press
      t.step(0.6);
      const held = g.takedown.hostage === e;
      const menu = g.grabMenu.open;
      // (Michael 08:10 / 08:25) held: no Knock out / Kill / Carry rows, no BACK TO GAME; with no information no menu at all
      const behindRows = 'Grab character';
      const heldRows = g.ctxMenu.count;
      st0.set('t', 'interact', true);
      t.step(0.1);
      const heldMenu = g.ctxMenu.state;
      st0.set('t', 'interact', false);
      t.step(1 / 60);
      const labels = g.grabMenu.labels([]);
      const shield = g.localRef.shield === e;
      const fx = Math.sin(c.yaw);
      const fz = Math.cos(c.yaw);
      // (G7, row 11: held pelvis to pelvis about 0.3 m, GRAB.hold 0.32; was 0.42)
      // (fix round: and 0.1 m to her left, GRAB.side, so his feet walk between hers)
      const front = Math.hypot(e.pos.x - (c.pos.x + fx * 0.32 - fz * 0.1), e.pos.z - (c.pos.z + fz * 0.32 + fx * 0.1));
      // a stub entry does nothing and the menu stays open
      t.pick('device');
      t.step(0.2);
      const stubStays = g.grabMenu.open && g.takedown.hostage === e;
      // (G7, row 11, 110936 @ 22-23) the hostage walk: CT ~0.7 m/s (was gear 2, 1.4 m/s)
      const st = window.__app.input.state;
      st.setMove('t', 0, 1);
      t.step(1.5);
      const walk = c.speed;
      st.setMove('t', 0, 0);
      t.step(0.5);
      // ("Missing entirely": interrogate) 1.5 s at his jaw, then the hold (and the menu) goes on
      t.pick('interrogate');
      t.step(0.3);
      const inter = !g.grabMenu.open && g.takedown.hostage === e;
      t.step(1.4);
      const interDone = g.grabMenu.open && g.takedown.hostage === e && g.takedown.grabs.interrogated === 1;
      // (anim-rework S1, M3) the knockout: an RT tap, or the KBM knockout key (`altFire`, Z) as here
      st0.set('t', 'altFire', true);
      t.step(1 / 60);
      st0.set('t', 'altFire', false);
      // (G7, row 20: the knockout lowers him over 0.85 s)
      t.step(0.5);
      const lowering = e.alive && g.takedown.active !== null;
      t.run(0.8);
      const ko = !e.alive && !g.takedown.active && g.localRef.shield === null && !g.grabMenu.open;
      return { lbl, offerRows, behindRows, heldRows, heldMenu, early, held, menu, labels, shield, front, stubStays, walk, inter, interDone, lowering, ko };
    });
    assert(!r.early, 'the pull-in: not held yet 0.6 s after the press');
    assert(r.walk > 0.3 && r.walk < 0.8, `the hostage walk is slow (${r.walk.toFixed(2)} m/s, CT ~0.7)`);
    assert(r.inter && r.interDone, `Interrogate: the menu closes for it, the hold goes on after (${r.inter} / ${r.interDone})`);
    assert(r.lowering, 'the knockout takes its time (he is lowered, not dropped)');
    assert(r.lbl === 'Grab', `the prompt from behind reads Grab ("${r.lbl}")`);
    assert(r.held && r.menu, 'A grabs and holds him, the grab menu opens');
    assert(r.labels[0] === 'Knock out' && r.labels[1] === 'Kill' && r.labels[2] === 'Carry', `menu: ${r.labels.join(' / ')}`);
    assert(r.shield, 'the hostage is a human shield');
    assert(r.front < 0.05, `the hostage stays in front (${(r.front * 100).toFixed(1)} cm)`);
    assert(r.stubStays, 'Force to device (stub) leaves the menu open');
    assert(r.offerRows === r.behindRows, `behind a guard the list is only Grab character (and BACK TO GAME) (${r.offerRows})`);
    assert(r.heldRows === 0 && r.heldMenu === 'none', `held, no information: no rows, A shows no menu (${r.heldRows}, ${r.heldMenu})`);
    assert(r.ko, 'the knockout (Z) knocks him out: he is down, the hold ends');
  });

  // (spare 9) interrogation intel: a guard's door code reaches the mode and the feed
  await scen('grab-interrogate-intel', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.tp(2, 0, -2.2, 0);
      const e = t.spawn(2, -1, 0);
      e.info = { lines: ['Lab door is 4471.'], codes: [{ flag: 'e2e-code', label: 'Lab door 4471' }] };
      g.mode.onIntelCode = (f) => (window.__intelCodes ??= []).push(f);
      // (batch-23) patrol timing: a second guard walking a route away from the hold; the intel reads it through the
      // Guard AI getter `Enemy.patrolRoute` (ping-pong 6 m, 5 s waits: 12 m / (walkSpeed x PACE.patrol 1.1) + 10 s)
      const route = { points: [[10, -2], [16, -2]], wait: 5 };
      const p = t.spawn(10, -2, Math.PI / 2);
      p.setPatrol(route);
      const getter = p.patrolRoute === route;
      const loop = Math.round(12 / (p.def.walkSpeed * 1.1) + 10);
      const n0 = g.takedown.grabs.interrogated;
      t.step(0.4);
      t.press();
      t.step(1.2);
      const held = g.takedown.hostage === e;
      t.pick('interrogate');
      t.step(1.8);
      const feed = [...document.querySelectorAll('.hud-feed')].map((x) => x.textContent).join(' | ');
      return { held, codes: window.__intelCodes ?? null, feed, info: e.info, n: g.takedown.grabs.interrogated - n0, getter, loop };
    });
    assert(r.held, 'the guard is held');
    assert(r.getter, 'Enemy.patrolRoute returns the route set by setPatrol');
    assert(r.feed.includes(`Patrols near: 1, loop ${r.loop} s`), `the feed shows the patrol timing (loop ${r.loop} s) (${r.feed})`);
    assert(JSON.stringify(r.codes) === JSON.stringify(['e2e-code']), `the code flag reaches the mode (${JSON.stringify(r.codes)})`);
    assert(r.feed.includes('Code: Lab door 4471'), `the feed shows the code (${r.feed})`);
    assert(r.info === null && r.n === 1, 'his information is spent, one interrogation');
    // (hud-guidance B5, R12, A9) Pause > Field Terminal > Notes lists the interrogation's lines
    const notes = await G(() => {
      const g = window.__app.current;
      const S = window.__app.screens;
      g.pause();
      document.querySelector('.pause-screen [data-key="notes"]')?.click();
      const top = S.top?.el.classList[1] ?? '(none)';
      const rows = [...document.querySelectorAll('.notes-screen .ms-item .btn-label')].map((x) => x.textContent);
      S.back(S.top);
      S.top?.resume?.();
      return { top, rows, paused: g.paused };
    });
    assert(
      notes.top === 'notes-screen' && notes.rows.includes('Code: Lab door 4471') && notes.rows.some((t) => t.startsWith('Patrols near: 1')) && !notes.paused,
      `Field Terminal > Notes lists the interrogation lines (G343 field menu, A9) (${JSON.stringify(notes)})`,
    );
  });

  // (Michael 08:10 / 08:20) RT kills; Carry is not a row (a script pick: knock out, then shoulder); nothing lets him go
  await scen('grab-kill-carry-noletgo', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const st = window.__app.input.state;
      t.tp(2, 0, -2.2, 0);
      const e = t.spawn(2, -1, 0);
      t.step(0.4);
      t.press();
      t.step(1.2);
      // (anim-rework S1, M3 "RT tap / hold") RT held (0.35 s) while holding: the kill; a tap is the knockout
      st.set('t', 'fire', true);
      t.step(0.5);
      st.set('t', 'fire', false);
      t.run(1.0);
      const killed = !e.alive && g.enemyMgr.bodies.some((b) => b.lethal);
      t.reset();
      t.tp(2, 0, -2.2, 0);
      const e1 = t.spawn(2, -1, 0);
      t.step(0.4);
      t.press();
      t.step(1.2);
      t.pick('carry');
      // (G7, rows 6 / 20: the 0.85 s knockout, then the 2.0 s lift onto the shoulder)
      t.run(3.2);
      const carried = !e1.alive && g.stealth.carrying && !g.stealth.busy && !!g.stealth.carry;
      t.reset();
      g.stealth.carry = null;
      t.tp(2, 0, -2.2, 0);
      const e2 = t.spawn(2, -1, 0);
      t.step(0.4);
      t.press();
      t.step(1.2);
      // (Michael 08:20: "The guard cannot be let go either") B, Y and back never let him go (nor crouch / jump)
      for (const b of ['crouch', 'jump', 'uiBack']) {
        st.set('t', b, true);
        t.step(1 / 60);
        st.set('t', b, false);
        t.step(0.3);
      }
      t.step(2.0);
      const stillHeld = g.takedown.hostage === e2 && e2.alive && g.grabMenu.open;
      const crouched = g.player.controller.crouched;
      st.set('t', 'altFire', true);
      t.step(1 / 60);
      st.set('t', 'altFire', false);
      t.run(1.2);
      const koAfter = !e2.alive && !g.takedown.active;
      return { killed, carried, stillHeld, crouched, koAfter };
    });
    assert(r.killed, 'RT held while holding: killed');
    assert(r.carried, 'Carry (a script pick, not a row): knocked out and on the shoulder');
    assert(r.stillHeld && !r.crouched, `B, Y and back never let him go (held ${r.stillHeld}, crouched ${r.crouched})`);
    assert(r.koAfter, 'the hold ends only in the knockout (RT tap / Z) or the kill');
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

  // (A4, G42 / G155) the palm strike: one hit knocks out any guard (aware, facing, even a heavy), contact about 0.12 s in
  await scen('palm strike: one hit', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const st = window.__app.input.state;
      const out = [];
      for (const kind of ['grunt', 'heavy']) {
        t.reset();
        t.tp(2, 0, -1.9, 0);
        const e = g.enemyMgr.spawn(kind, new t.V(2, 0, -1), true, Math.PI);
        e['stagger'] = 99;
        t.step(0.2);
        st.set('t', 'fire', true);
        window.__app.loop.stepHeadless(1 / 60, 120);
        st.set('t', 'fire', false);
        // (F1b: contact at 0.08 s) the guard still stands right after the press
        const early = e.alive;
        t.step(0.3);
        out.push({ kind, early, alive: e.alive, ko: g.strike.count.ko, stag: g.strike.count.stagger });
        t.step(1.5);
      }
      return out;
    });
    for (const o of r) assert(!o.alive && o.stag === 0, `one frontal palm strike knocks out a ${o.kind} (${JSON.stringify(o)})`);
    assert(r.every((o) => o.early), 'contact is not before the wind-up ends');
  });
  const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
  assert(real.length === 0, `no console errors (${real.join(' | ')})`);
} catch (e) {
  failed = true;
  console.error(String(e));
}
await browser.close();
process.exit(failed ? 1 : 0);
