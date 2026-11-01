// Takedowns on the Test Chamber (G2b, test mode; was the night Warehouse, Clear rules): ground behind / front / side (side only on a
// calm guard), (G5, Michael 08:10) one context menu row per takedown (a knockout; RT held is the lethal strike, anim-rework S1), the attacker aligned within 5 cm, interrupted by
// damage, from above (a drop off the platform), from below (hanging at the ledge wall's lip),
// through a window; 3.2.0: the grab (walk, sidearm, human shield, knock out, kill, shove), drop attacks
// from a pipe and a split, an inverted choke; (G348) none on a dog; (context-prompts S3) the prompts under ?ctxprompts=1.
// (knife-kills, owner decision) The lethal takedown (A hold Kill under the prompts) on a guard on two legs is the paired
// knife kill on every map: solo on the Test Chamber, then co-op in its test mode (two tabs, ?net=local): the host's
// and the client's lethal takedowns play the knife kill on both pages (the partner's figure poses the guard), a
// client's knockout stays a knockout. (Moved here from the removed piano e2e.) `node scripts/e2e-takedown.mjs [url] [--only=name]`
import { launch, openPage, assert, frames } from './e2e-lib.mjs';
import { hostAndJoin, hostStepResult, onHostStep, until, waitSim } from './e2e-net-lib.mjs';

/** (knife-kills) The measured knife timings (knife S2, PR #620), from the press: contact, guard limp, operator free (s). */
const KNIFE = { contact: 1.05, limp: 1.57, free: 1.87 };
/** (knife-kills) The knife kill's clip modules are their own chunks, loaded at match start: wait for them on a page (a
 *  synchronous `stepHeadless` run cannot let a dynamic import land). */
const KNIFE_CHUNK = /\/(stabbing|standing_melee_attack_downward|falling_forward_death|dying|falling_back_death)[-.]/;
async function knifeClipsIn(P) {
  await P.waitForFunction((src) => {
    const re = new RegExp(src);
    const got = new Set(performance.getEntriesByType('resource').filter((r) => re.test(r.name) && r.responseEnd > 0).map((r) => re.exec(r.name)[1]));
    return got.size >= 5;
  }, KNIFE_CHUNK.source, { timeout: 30000 });
  await frames(P, 5);
}

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7) ?? '';
let failed = false;

/**
 * (knife-kills) The co-op run: a host and a client in the Test Chamber's test mode; the host spawns three calm, frozen guards; the
 * host knife-kills G1 from behind, the client knife-kills G2 from behind, the client knocks out G3. Each kill: the
 * attacker's page runs the knife row, the other page's figure of the attacker poses that guard (`RemoteKnife`), the
 * host's guard dies (a lethal body). A page in the background stops its frames: a pump steps it (as e2e-ctcourse).
 */
async function coopKnife() {
  const net = await hostAndJoin(url, 2);
  const { browser: nb, A, B, errors } = net;
  const GA = (f, a) => A.evaluate(f, a);
  const GB = (f, a) => B.evaluate(f, a);
  let pumpOn = true;
  let pumping = false;
  const pumpPage = (P) =>
    P.evaluate(() => {
      if (window.__raf === undefined) {
        window.__raf = 0;
        const f = () => {
          window.__raf++;
          requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
      }
      const now = performance.now();
      const last = window.__pumpT ?? now;
      const idle = window.__pumpRaf === window.__raf;
      window.__pumpT = now;
      window.__pumpRaf = window.__raf;
      if (idle && window.__app.current) window.__app.loop.stepHeadless(Math.min(0.1, Math.max(1 / 60, (now - last) / 1000)));
    }).catch(() => {});
  const pump = setInterval(async () => {
    if (!pumpOn || pumping) return;
    pumping = true;
    await pumpPage(A);
    await pumpPage(B);
    pumping = false;
  }, 40);
  try {
    await net.startMode('test', 'chamber');
    for (const P of [A, B]) await knifeClipsIn(P);
    // three guards ahead of the host's spawn, facing +z (away from an attacker south of them), frozen and calm (a host
    // step hook keeps every live, untaken guard unaware and every client unspotted)
    const ids = await GA(() => {
      const g = window.__app.current;
      const V = g.player.position.constructor;
      const p = g.player.position;
      const out = [];
      for (const dx of [0, 2.5, -2.5]) {
        const e = g.enemyMgr.spawn('grunt', new V(p.x + dx, p.y, p.z + 3), false, 0);
        e.update = () => {};
        e['stagger'] = 99;
        e.passive = true;
        out.push(e.id);
      }
      return out;
    });
    await onHostStep(A, (g) => {
      for (const e of g.enemyMgr.enemies) if (e.alive && !e.taken) e.aware.set('unaware');
      for (const r of g.net.remotes.values()) r.ref.spotted = false;
      return false;
    });
    const [g1, g2, g3] = ids;
    const hostEnemy = (id) => GA((id) => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.id === id); return e ? { x: e.pos.x, y: e.pos.y, z: e.pos.z, yaw: e.yaw, alive: e.alive } : null; }, id);
    const lethalBodies = () => GA(() => window.__app.current.enemyMgr.bodies.filter((b) => b.lethal).length);
    const koBodies = () => GA(() => window.__app.current.enemyMgr.bodies.filter((b) => !b.lethal).length);
    for (const id of ids) await until(B, (id) => window.__app.current.net.puppets.get(id)?.alive === true, id, 10000, `the client has guard ${id}`);
    /** The spot 0.8 m behind guard `id` (his facing), on the host's copy. */
    const behind = async (id) => {
      const e = await hostEnemy(id);
      return [e.x - Math.sin(e.yaw) * 0.8, e.y + 0.05, e.z - Math.cos(e.yaw) * 0.8, e.yaw];
    };
    /** Step hook (either page): start this page's takedown (`lethal`) the step its offer is on guard `a.id`; result: the
     *  knife state at the start. */
    const START = (g, a) => {
      const td = g.takedown;
      if (!td.active && td.offer?.e.id === a.id) td.start(a.lethal);
      return td.active ? { kr: td.kr, knife: td.knifeOn, grab: td.active.grab !== null } : false;
    };
    /** Step hook (either page): the page's figure of the partner poses guard `a.id` in a knife kill (latched). */
    const SEES = (g, a) => {
      const avs = g.net.avatars ? [...g.net.avatars.values()] : [...g.net.remotes.values()].map((r) => r.avatar);
      return avs.some((av) => av.knife.posesVictim && av.knife.tid === a.id) ? true : false;
    };

    // ---- the host's knife kill on G1: the client's figure of the host poses G1's puppet
    const l0 = await lethalBodies();
    const [hx, hy, hz, hyaw] = await behind(g1);
    await GA(([x, y, z, yaw]) => {
      const g = window.__app.current;
      g.player.controller.teleport(new g.player.position.constructor(x, y, z), yaw);
      g.player.cam.yaw = yaw;
    }, [hx, hy, hz, hyaw]);
    const seeB = await onHostStep(B, SEES, { id: g1 });
    const hk = await onHostStep(A, START, { id: g1, lethal: true });
    const hs = await hostStepResult(A, hk, 8000, 'the host starts its takedown on G1');
    assert(hs.kr === 0 && hs.knife && !hs.grab, `the host's lethal takedown from behind is the knife kill, row behind (${JSON.stringify(hs)})`);
    assert((await hostStepResult(B, seeB, 8000, "the client's figure of the host poses G1")) === true, "the client's figure of the host plays the paired kill on G1's puppet");
    await waitSim((KNIFE.free + 0.6) * 1000);
    assert(!(await hostEnemy(g1))?.alive && (await lethalBodies()) === l0 + 1, 'G1 is dead on the host (a lethal body)');
    assert(await GA(() => !window.__app.current.takedown.busy), 'the host is free after the kill');

    // ---- the client's knife kill on G2: the host's figure of the client poses G2
    const [cx, cy, cz, cyaw] = await behind(g2);
    await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
    await GB(([x, y, z, yaw]) => {
      const g = window.__app.current;
      g.player.controller.teleport(new g.player.position.constructor(x, y, z), yaw);
      g.player.cam.yaw = yaw;
    }, [cx, cy, cz, cyaw]);
    await waitSim(400);
    const seeA = await onHostStep(A, SEES, { id: g2 });
    const ck = await onHostStep(B, START, { id: g2, lethal: true });
    const cs = await hostStepResult(B, ck, 8000, 'the client starts its takedown on G2');
    assert(cs.kr === 0 && cs.knife && !cs.grab, `the client's lethal takedown from behind is the knife kill (${JSON.stringify(cs)})`);
    assert((await hostStepResult(A, seeA, 8000, "the host's figure of the client poses G2")) === true, "the host's figure of the client plays the paired kill on G2");
    await waitSim((KNIFE.free + 0.6) * 1000);
    assert(!(await hostEnemy(g2))?.alive && (await lethalBodies()) === l0 + 2, 'G2 is dead on the host (a lethal body)');

    // ---- the client's knockout on G3: no knife, a knockout on the host
    const k0 = await koBodies();
    const [kx, ky, kz, kyaw] = await behind(g3);
    await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
    await GB(([x, y, z, yaw]) => {
      const g = window.__app.current;
      g.player.controller.teleport(new g.player.position.constructor(x, y, z), yaw);
      g.player.cam.yaw = yaw;
    }, [kx, ky, kz, kyaw]);
    await waitSim(400);
    const kk = await onHostStep(B, START, { id: g3, lethal: false });
    const ks = await hostStepResult(B, kk, 8000, 'the client starts its knockout on G3');
    assert(ks.kr === -1 && !ks.knife, `the client's knockout is no knife kill (${JSON.stringify(ks)})`);
    await waitSim(2500);
    assert(!(await hostEnemy(g3))?.alive && (await koBodies()) === k0 + 1 && (await lethalBodies()) === l0 + 2, 'G3 is knocked out on the host (no lethal body)');

    const errs = errors.flat().filter((e) => !/GPU stall|GL Driver|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
    assert(errs.length === 0, `co-op knife: no console errors (${errs.join(' | ')})`);
  } finally {
    pumpOn = false;
    clearInterval(pump);
    await nb.close();
  }
}
const { browser, ctx, page, errors } = await launch({ url, params: 'autostart=chamber&mode=test&ctxprompts=0' });
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
      t.tp(20, 0, 19.8, 0);
      const e = t.spawn(20, 21, 0);
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
      t.tp(20, 0, 19.8, 0);
      const e2 = t.spawn(20, 21, Math.PI);
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
      t.tp(20, 0, 19.8, 0);
      const e3 = t.spawn(20, 21, Math.PI / 2);
      t.step(0.4);
      const sideCalm = g.takedown.offer?.plan.kind;
      e3.alert();
      // (frozen: the alert would turn him round; the rule is about awareness alone)
      e3.update = () => {};
      t.step(0.1);
      const sideAlert = g.takedown.offer?.plan.kind ?? null;
      // a guard in combat who has seen this operator: no takedown; one alerted without seeing them (radioed): yes
      t.reset();
      t.tp(20, 0, 19.8, 0);
      const e4 = t.spawn(20, 21, Math.PI);
      let k = 0;
      while (!e4.alerted && k++ < 120) t.step(1 / 60);
      e4.update = () => {};
      t.step(0.2);
      const seenOffer = g.takedown.offer?.plan.kind ?? null;
      const spotted = g.spottedLocal;
      t.reset();
      t.tp(20, 0, 19.8, 0);
      // (nobody in combat for a moment: no guard knows the operator is there any more)
      t.step(0.1);
      const e5 = t.spawn(20, 21, Math.PI);
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
      t.tp(20, 0, 19.8, 0);
      const e = t.spawn(20, 21, Math.PI);
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

  // (guard-rules S2, G348) no takedown of any kind on a dog: behind one, no prompt, no menu row, the press does nothing
  await scen('dog: no takedown', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.tp(20, 0, 19.8, 0);
      const d = g.enemyMgr.spawn('dog', new t.V(20, 0, 21), false, 0);
      d.update = () => {};
      t.step(0.4);
      const offer = g.takedown.offer?.plan.kind ?? null;
      const prompt = document.querySelector('.wp-takedown.show') !== null;
      const rows = g.ctxMenu.opts.slice(0, g.ctxMenu.count).map((o) => o.label).join(' / ');
      t.press();
      t.step(1.0);
      return { offer, prompt, rows, active: g.takedown.active !== null, up: d.alive };
    });
    assert(r.offer === null && !r.prompt && !/Takedown|Grab/i.test(r.rows), `behind a dog: no takedown offer, prompt or menu row (${r.offer}, prompt ${r.prompt}, rows ${r.rows})`);
    assert(!r.active && r.up, `the press starts nothing, the dog stays up (${JSON.stringify(r)})`);
  });

  await scen('grab', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const c = g.player.controller;
      const st0 = window.__app.input.state;
      t.tp(20, 0, 19.8, 0);
      const e = t.spawn(20, 21, 0);
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
      t.tp(20, 0, 19.8, 0);
      const e = t.spawn(20, 21, 0);
      e.info = { lines: ['Lab door is 4471.'], codes: [{ flag: 'e2e-code', label: 'Lab door 4471' }] };
      g.mode.onIntelCode = (f) => (window.__intelCodes ??= []).push(f);
      // (batch-23) patrol timing: a second guard walking a route away from the hold; the intel reads it through the
      // Guard AI getter `Enemy.patrolRoute` (ping-pong 6 m, 5 s waits: 12 m / (walkSpeed x PACE.patrol 1.1) + 10 s)
      const route = { points: [[12, 21], [18, 21]], wait: 5 };
      const p = t.spawn(12, 21, Math.PI / 2);
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
      t.tp(20, 0, 19.8, 0);
      const e = t.spawn(20, 21, 0);
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
      t.tp(20, 0, 19.8, 0);
      const e1 = t.spawn(20, 21, 0);
      t.step(0.4);
      t.press();
      t.step(1.2);
      t.pick('carry');
      // (G7, rows 6 / 20: the 0.85 s knockout, then the 2.0 s lift onto the shoulder)
      t.run(3.2);
      const carried = !e1.alive && g.stealth.carrying && !g.stealth.busy && !!g.stealth.carry;
      t.reset();
      g.stealth.carry = null;
      t.tp(20, 0, 19.8, 0);
      const e2 = t.spawn(20, 21, 0);
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
      const pipe = L.add({ kind: 'pipeH', a: { x: 18, y: 3.6, z: 19.7 }, b: { x: 22, y: 3.6, z: 19.7 }, hangHeight: 3.6, radius: 0.06 });
      t.tp(20, 0, 20.0, 0);
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
      t.tp(20, 0, 20.0, 0);
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
      // a split (the Test Chamber's fin beside the team block: the generated gap): a guard below
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
      t.tp(20, 0, 19.8, 0);
      const e = t.spawn(20, 21, 0);
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
      // on the platform's south edge (top 3.0), a guard on the floor below
      t.tp(1.5, 3.02, 8.45, Math.PI);
      t.step(0.3);
      const e = t.spawn(1.5, 6.9, Math.PI);
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
      // the ledge wall's south lip (top 2.4, z 25; the longest hangable piece)
      const L = g.world.level.anchors.ledges.filter((l) => l.canHang && Math.abs(l.top - 2.4) < 0.1 && Math.abs(l.a.z - 25) < 0.25 && Math.abs(l.b.z - 25) < 0.25).sort((p, q) => q.len - p.len)[0];
      if (!L) return { err: 'no ledge-wall lip' };
      const s = L.len / 2;
      const lx = L.a.x + L.tx * s;
      t.tp(lx, 0, 24.4, 0);
      t.step(0.2);
      g.traversal.attachCtl.attachTo(L, s, 'below');
      t.step(1.2);
      const hanging = g.traversal.attached;
      const e = t.spawn(lx + 0.2, 25.6, 0, 2.4);
      t.step(0.4);
      const offer = g.takedown.offer?.plan.kind;
      t.press();
      t.run(1.4);
      return { hanging, offer, done: !e.alive, stillHanging: g.traversal.attached };
    });
    assert(!r.err, r.err ?? '');
    assert(r.hanging, 'hanging at the ledge wall lip');
    assert(r.offer === 'below', `a guard at the lip above: pull him over (${r.offer})`);
    assert(r.done && r.stillHanging, 'done, still hanging');
  });

  await scen('window', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      // the window wall's open window (x 18, z 4): player north of it, a guard south
      t.tp(18, 0, 4.7, Math.PI);
      t.step(0.6);
      const e = t.spawn(18, 3.1, Math.PI);
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
        t.tp(20, 0, 20.1, 0);
        const e = g.enemyMgr.spawn(kind, new t.V(20, 0, 21), true, Math.PI);
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

  // (context-prompts S3, PLAN 8) the context prompts (`?ctxprompts=1`, dark until switch-on): from behind A grabs (held
  // through the grab: the raw A keeps reaching the takedown); faced, a tap knocks out and a hold kills; RT unchanged;
  // the held guard's A interrogates; the old box never shows
  if (!only || 'context prompts'.includes(only)) {
    console.log('context prompts');
    await page.close();
    const p2 = await openPage(ctx, url, 'autostart=chamber&mode=test&ctxprompts=1');
    await frames(p2.page, 10);
    // (knife-kills) the knife clips in before the stepped run (the hold's kill is the knife kill)
    await knifeClipsIn(p2.page);
    const r = await p2.page.evaluate(() => {
      const a = window.__app;
      const g = a.current;
      a.loop.manual = true;
      g.target.health.invulnerable = true;
      g.mode.pending.length = 0;
      const em = g.enemyMgr;
      const V = g.player.position.constructor;
      const st = a.input.state;
      const c = g.player.controller;
      const cp = g.ctxPrompts;
      const step = (s) => a.loop.stepHeadless(s, 120);
      let box = false;
      const watch = (s) => {
        for (let t = 0; t < s; t += 0.1) {
          step(0.1);
          box ||= document.querySelector('.hud-ctx.show') !== null || g.ctxMenu.state !== 'none';
        }
      };
      const reset = () => {
        g.takedown.reset();
        em.clear();
        g.traversal.reset();
        st.releaseAll();
        st.setMove('t', 0, 0);
        c['crouchToggled'] = false;
        step(0.1);
      };
      const at = (yaw) => {
        c.teleport(new V(20, 0, 19.8), 0);
        g.player.cam.yaw = 0;
        g.player.cam.pitch = 0;
        const e = em.spawn('grunt', new V(20, 0, 21), false, yaw);
        e.passive = true;
        step(0.4);
        return e;
      };
      const rowsOf = () => [0, 1, 2, 3].map((s) => (cp.shows(s) ? `${cp.rows[s].tapLabel}|${cp.rows[s].holdLabel}` : '-')).join(' ; ');
      // A pressed for `hold` s (0: one step), then let go
      const pressA = (hold) => {
        st.set('t', 'interact', true);
        step(1 / 60);
        if (hold > 0) step(hold);
        st.set('t', 'interact', false);
        step(1 / 60);
      };
      const out = {};
      // from behind: [A] Grab; A held through the grab keeps him (the raw A reaches the takedown)
      reset();
      const e1 = at(0);
      out.behind = { kind: cp.kind, rows: rowsOf() };
      st.set('t', 'interact', true);
      step(1 / 60);
      out.behind.started = g.takedown.active !== null;
      watch(1.3);
      out.behind.held = g.takedown.hostage === e1 && g.grabMenu.open;
      st.set('t', 'interact', false);
      step(0.2);
      out.behind.stillHeld = g.takedown.hostage === e1 && e1.alive;
      out.behind.heldKind = cp.kind;
      out.behind.heldRows = rowsOf();
      // faced: a tap knocks out
      reset();
      const e2 = at(Math.PI);
      out.front = { kind: cp.kind, rows: rowsOf() };
      pressA(0.1);
      watch(1.6);
      out.front.down = !e2.alive;
      out.front.lethal = em.bodies.some((b) => b.lethal);
      // faced: held past CTX_HOLD kills; (knife-kills) the kill is the paired knife kill (the front row: her clip drives her
      // graph, his clip his, the knife in hand), quiet, then she is free with the knife away
      reset();
      const e3 = at(Math.PI);
      const kn = { row: -1, drove: false, victim: false };
      const sample = () => {
        const td = g.takedown;
        if (td.knifeOn) {
          kn.row = Math.max(kn.row, td.kr);
          kn.drove ||= g.player.rig.graph.kill !== null;
          kn.victim ||= e3['knifePinned'] === true;
        }
      };
      st.set('t', 'interact', true);
      step(1 / 60);
      for (let t = 0; t < 0.5; t += 0.05) {
        step(0.05);
        sample();
      }
      st.set('t', 'interact', false);
      for (let t = 0; t < 2.4; t += 0.05) {
        step(0.05);
        sample();
        box ||= document.querySelector('.hud-ctx.show') !== null || g.ctxMenu.state !== 'none';
      }
      out.hold = { down: !e3.alive, lethal: em.bodies.some((b) => b.lethal), knife: kn, free: !g.takedown.busy && !g.takedown.knifeOn, byKind: g.takedown.done.byKind.knife ?? 0 };
      // RT unchanged: the holstered palm strike knocks out a guard faced
      // (triage G319) the strike's reach is 1.3 m (`STRIKE.reach`) and the spawned guard settles about 0.35 m off his
      // (2, -1) spawn (1.47 m from `at`'s spot, out of reach: no strike starts): stand 0.9 m in front of where he stands,
      // as the flag-off 'palm strike' scenario does
      reset();
      const e4 = at(Math.PI);
      c.teleport(new V(e4.pos.x, 0, e4.pos.z - 0.9), 0);
      g.player.cam.yaw = 0;
      step(0.2);
      const pick = g.strike.pickTarget();
      st.set('t', 'fire', true);
      step(1 / 60);
      st.set('t', 'fire', false);
      watch(1.0);
      out.rt = { down: !e4.alive, ko: g.strike.count.ko, inReach: pick === e4.id };
      // the held guard with information: [A] Interrogate, a tap runs it
      reset();
      const e5 = at(0);
      e5.info = { lines: ['Lab door is 4471.'], codes: [] };
      pressA(0);
      watch(1.4);
      out.inter = { kind: cp.kind, rows: rowsOf(), held: g.takedown.hostage === e5 };
      const n0 = g.takedown.grabs.interrogated;
      pressA(0);
      watch(2.0);
      out.inter.done = g.takedown.grabs.interrogated === n0 + 1;
      out.box = box;
      return out;
    });
    assert(r.behind.kind === 'guard' && r.behind.rows.startsWith('Grab|'), `ctx: behind a guard the prompt is [A] Grab (${JSON.stringify(r.behind)})`);
    assert(r.behind.started && r.behind.held && r.behind.stillHeld, `ctx: A held through the grab: grabbed and held (${JSON.stringify(r.behind)})`);
    assert(r.behind.heldKind === 'held' && r.behind.heldRows.includes('Knock out|Kill'), `ctx: held, the RT row names Knock out / Kill (${JSON.stringify(r.behind)})`);
    assert(r.front.kind === 'guard' && r.front.rows.startsWith('Knock out|Kill'), `ctx: faced, [A] Knock out · hold Kill (${JSON.stringify(r.front)})`);
    assert(r.front.down && !r.front.lethal, `ctx: faced, a tap knocks him out (${JSON.stringify(r.front)})`);
    assert(r.hold.down && r.hold.lethal, `ctx: faced, a hold kills (${JSON.stringify(r.hold)})`);
    assert(r.hold.knife.row === 3 && r.hold.knife.drove && r.hold.knife.victim && r.hold.byKind === 1 && r.hold.free, `ctx: the hold's kill is the paired knife kill (front row), then she is free (${JSON.stringify(r.hold)})`);
    assert(r.rt.inReach && r.rt.down && r.rt.ko >= 1, `ctx: RT holstered still knocks out (${JSON.stringify(r.rt)})`);
    assert(r.inter.kind === 'held' && r.inter.rows.startsWith('Interrogate|') && r.inter.held && r.inter.done, `ctx: the held guard's [A] Interrogate runs (${JSON.stringify(r.inter)})`);
    assert(!r.box, 'ctx: the old box never shows');
    const real2 = p2.errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
    assert(real2.length === 0, `ctx: no console errors (${real2.join(' | ')})`);
  }

  // (knife-kills; moved from the removed piano e2e) co-op in the Test Chamber (two tabs, ?net=local): the host's lethal
  // takedown plays the paired knife kill and the client's figure of the host poses the guard; the client's lethal
  // takedown plays it on the host too; both guards die (lethal bodies); a client's knockout stays a knockout
  if (!only || 'co-op knife'.includes(only)) {
    console.log('co-op knife');
    await coopKnife();
  }
} catch (e) {
  failed = true;
  console.error(String(e));
}
await browser.close();
process.exit(failed ? 1 : 0);
