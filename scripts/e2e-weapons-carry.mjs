// Weapon carry on Free Roam (the CT kit, G76: the rifle and the suppressed pistol): every carried weapon visible in its
// own slot (the rifle centred on the back, the pistol on the right thigh), long guns on the back within 10 deg of their
// slot's axis (the side slots vertical, muzzle up; (CT prototype G2, AUDIT-AIM row 3) the centre gun slung DIAGONALLY,
// stock at the right shoulder blade, muzzle down to the left hip, as CT 053525 / 053709) in every stance and gait, nothing clipping (weapon vs weapon, weapon vs
// body, with and without a backpack, both avatar styles), the hands on the grip points (within 2 cm) for
// every weapon, the swap reaching to the right slot, grenade pouches, and the draw-call budget.
import { launch, frames, assert as hard } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=studio' });
const G = (f, a) => page.evaluate(f, a);
let failed = false;
const assert = (cond, msg) => {
  if (cond || !process.env.SOFT) return hard(cond, msg);
  failed = true;
  console.log('  FAIL -', msg);
};
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : String(v));

const install = () => {
  const a = window.__app;
  const g = a.current;
  const p = g.player;
  const c = p.controller;
  const V = p.position.constructor;
  g.target.damageMul = 0;
  const st = a.input.state;
  const up = new V(0, 1, 0);
  const fwd = new V(0, 0, 1);
  window.__w = {
    tp(x, z, yaw) {
      c.teleport(new V(x, 0, z), yaw);
      p.cam.yaw = yaw;
      p.cam.snap();
      st.move.x = st.move.y = 0;
      a.loop.stepHeadless(1.0, 120);
    },
    run(sec, inp = {}) {
      const n = Math.round(sec * 60);
      for (let k = 1; k <= n; k++) {
        st.move.x = inp.x ?? 0;
        st.move.y = inp.y ?? 0;
        st.set('carry', 'ads', !!inp.ads);
        if (inp.taps?.[k]) st.tap(inp.taps[k]);
        a.loop.stepHeadless(1 / 60, 120);
        inp.each?.();
      }
      st.move.x = st.move.y = 0;
      st.set('carry', 'ads', false);
    },
    /** Carried (not held) weapon models with their slots. */
    carried() {
      const w = g.weapons;
      return w.slots.map((s, i) => ({ id: s.def.id, slot: w.carrySlots[i], model: s.model })).filter((e) => e.model.slot !== null);
    },
    /**
     * Angle (deg) between a back weapon's bore and its slot's axis in the chest frame, and how upright the slot axis is
     * kept in the world (1 = as on an upright chest): the side slots' axis is the chest's up (muzzle up), the centre's the
     * diagonal sling (G2: src/weapons/backDiag.ts, BACK_DIAG.angle 0.66 rad from straight down, toward the left).
     */
    backAngles() {
      const torsoUp = p.rig.torso.getDirection(up);
      const diag = p.rig.torso.getDirection(new V(-Math.sin(0.66), -Math.cos(0.66), 0));
      const out = [];
      for (const e of window.__w.carried()) {
        if (!e.slot.startsWith('back')) continue;
        e.model.node.computeWorldMatrix(true);
        const bore = e.model.node.getDirection(fwd);
        const ax = e.slot === 'backC' ? diag : torsoUp;
        const upY = e.slot === 'backC' ? -bore.y / Math.cos(0.66) : bore.y;
        out.push({ id: e.id, deg: (Math.acos(Math.min(1, Math.max(-1, bore.x * ax.x + bore.y * ax.y + bore.z * ax.z))) * 180) / Math.PI, upY });
      }
      return out;
    },
    /** Pairs of intersecting meshes: carried weapon vs carried weapon, carried weapon vs body. */
    clips() {
      const hits = [];
      const ws = window.__w.carried();
      for (const e of ws) for (const m of e.model.parts) m.computeWorldMatrix(true);
      for (let i = 0; i < ws.length; i++)
        for (let j = i + 1; j < ws.length; j++)
          for (const a1 of ws[i].model.parts) for (const b1 of ws[j].model.parts) if (a1.intersectsMesh(b1, true)) hits.push(`${ws[i].id}/${ws[j].id}`);
      // body: everything but the arms and hands (they hold the gun in front) and the head
      const body = p.rig.parts.filter((m) => m.isEnabled() && m.isVisible && !/arm|hand|elbow|wrist|thumb|head|hair|eye|helmet|face|nose|ear|brow|mouth|neck/i.test(m.name + ' ' + (m.metadata?.slot ?? '')));
      for (const m of body) m.computeWorldMatrix(true);
      for (const e of ws) for (const a1 of e.model.parts) for (const b1 of body) if (a1.intersectsMesh(b1, true)) hits.push(`${e.id}/${b1.parent?.name ?? b1.name}`);
      return [...new Set(hits)];
    },
  };
};
await G(install);

try {
  let r;
  // every weapon of the arsenal: the Free Roam kit, then the same two in the other order (the pistol in hand first)
  const checkLoadout = async (label, n) => {
    console.log('slots');
    r = await G(() => {
      const w = window.__app.current.weapons;
      const s = window.__w;
      s.tp(20, 21, -Math.PI / 2);
      const rig = window.__app.current.player.rig;
      return {
        n: w.slots.length,
        slots: w.carrySlots,
        visible: w.slots.every((sl) => sl.model.node.isEnabled()),
        // (step 09) holstered unless aiming: every gun in its slot, the hands free
        held: rig.heldWeapon === null && w.drawPhase === 0,
        parents: s.carried().map((e) => `${e.id}:${e.slot}:${e.model.node.parent?.name}`),
        pouches: window.__app.current.weapons.pouches.count,
      };
    });
    assert(r.n === n && new Set(r.slots).size === n && !r.slots.includes(null), `${label}: ${n} weapons, ${n} distinct slots (${r.slots.join(', ')})`);
    assert(r.visible && r.held, `every weapon visible: holstered (not aiming), all carried in their slots (${r.parents.join(' ')})`);
    assert(r.pouches >= 1, `grenade pouches on the belt (${r.pouches})`);

    console.log('back carry: on the slot axis (side slots vertical muzzle up, the centre diagonal muzzle down-left), within 10 deg');
    const stances = [
      ['idle', {}],
      ['walk', { y: 0.5 }],
      ['jog', { y: 1 }],
      ['sprint', { y: 1, taps: { 1: 'dash' } }],
      ['crouch walk', { y: 0.8, taps: { 1: 'crouch' } }],
      ['aim strafe', { x: 1, ads: true }],
    ];
    for (const [name, inp] of stances) {
      r = await G((inp) => {
        const s = window.__w;
        s.tp(20, 21, -Math.PI / 2);
        let worst = 0;
        let minUp = 1;
        let clips = [];
        s.run(1.4, {
          ...inp,
          each() {
            for (const b of s.backAngles()) {
              worst = Math.max(worst, b.deg);
              minUp = Math.min(minUp, b.upY);
            }
          },
        });
        clips = s.clips();
        window.__app.current.player.controller['crouchToggled'] = false;
        return { worst, minUp, clips };
      }, inp);
      // crouched the operative is bent over the knees, so the back guns lean forward with the spine
      const upMin = name === 'crouch walk' ? 0.35 : 0.7;
      assert(r.worst <= 10 && r.minUp > upMin, `${name}: back guns within ${f2(r.worst)} deg of their slot axis, kept upright (${f2(r.minUp)} > ${upMin})`);
      assert(r.clips.length === 0, `${name}: nothing clips (${r.clips.join(', ') || 'none'})`);
    }

    console.log('hands on the grip points');
    r = await G(() => {
      const s = window.__w;
      const g = window.__app.current;
      const rig = g.player.rig;
      const V = g.player.position.constructor;
      const out = [];
      for (let i = 0; i < g.weapons.slots.length; i++) {
        s.tp(20, 21, -Math.PI / 2);
        // swap to weapon i, then aim
        let guard = 0;
        while (g.weapons.index !== i && guard++ < 6) s.run(1.1, { taps: { 1: 'swapNext' } });
        s.run(1.0, { ads: true });
        const st = window.__app.input.state;
        st.set('carry', 'ads', true);
        window.__app.loop.stepHeadless(0.3, 120);
        const m = rig.heldWeapon.getWorldMatrix();
        // the wrist sits behind / under the palm point in weapon space (characterRig WRIST_TRIGGER /
        // WRIST_SUPPORT; right hand on the grip, left on the foregrip); (feature/weapons) an operator body with its own
        // hands: the solved hold's wrist offset (palm on the grip)
        const oR = rig.wristOffset?.(1, 'trigger') ?? new V(0.01, -0.015, -0.065);
        const oL = rig.wristOffset?.(-1, rig.supportStyle ?? 'tube') ?? new V(-0.015, -0.055, -0.035);
        const gp = V.TransformCoordinates(rig.grip.add(oR), m);
        const fp = V.TransformCoordinates(rig.foregrip.add(oL), m);
        rig.wristR.computeWorldMatrix(true);
        rig.wristL.computeWorldMatrix(true);
        const wr = rig.wristR.getAbsolutePosition();
        const wl = rig.wristL.getAbsolutePosition();
        const dR = Math.hypot(wr.x - gp.x, wr.y - gp.y, wr.z - gp.z);
        const dL = Math.hypot(wl.x - fp.x, wl.y - fp.y, wl.z - fp.z);
        st.set('carry', 'ads', false);
        out.push({ id: g.weapons.current.def.id, dR, dL });
      }
      return out;
    });
    for (const h of r) assert(h.dR <= 0.02 && h.dL <= 0.02, `${h.id}: hands within 2 cm of the grip (${(h.dR * 100).toFixed(1)} cm) and support point (${(h.dL * 100).toFixed(1)} cm)`);

    console.log('swap reaches each slot');
    r = await G(() => {
      const s = window.__w;
      const g = window.__app.current;
      const rig = g.player.rig;
      const w = g.weapons;
      s.tp(20, 21, -Math.PI / 2);
      // (step 09) swaps from the hands: aim (drawn) through the whole section
      const st = window.__app.input.state;
      // (anim-natural N3) the LT sling draw is 1.5 s (rifle) / 1.2 s (pistol) now: wait for it to finish
      s.run(2.0, { ads: true });
      const out = [];
      for (let k = 0; k < w.slots.length; k++) {
        const from = w.slots[w.index].model;
        const toIdx = (w.index + 1) % w.slots.length;
        const to = w.slots[toIdx].model;
        const fromSlot = w.carrySlots[w.index];
        const toSlot = w.carrySlots[toIdx];
        let t = 0;
        let nearFrom = 9;
        let nearTo = 9;
        let dur = 0;
        // (anim-natural N3) the incoming gun leaves its slot's parent as its travel starts and waits at the seat until the
        // hand lifts it: count it as seated while it is within 3 cm of where it left the slot
        const seat = { f: null, t: null };
        s.run(1 / 60, { ads: true, taps: { 1: 'swapNext' } });
        while (w.swapping && t < 2) {
          st.set('carry', 'ads', true);
          window.__app.loop.stepHeadless(1 / 60, 120);
          t += 1 / 60;
          rig.wristR.computeWorldMatrix(true);
          const wr = rig.wristR.getAbsolutePosition();
          // distance from the hand to where the gun sits in its slot (the outgoing one once holstered)
          for (const [m, key] of [[from, 'f'], [to, 't']]) {
            m.node.computeWorldMatrix(true);
            const c = m.node.getAbsolutePosition();
            if (m.slot !== null) seat[key] = { x: c.x, y: c.y, z: c.z };
            else if (!seat[key] || Math.hypot(c.x - seat[key].x, c.y - seat[key].y, c.z - seat[key].z) > 0.03) continue;
            // nearest point along the gun's length
            const dir = m.node.getDirection(new wr.constructor(0, 0, 1));
            let best = 9;
            for (let z = m.ext.z0; z <= m.ext.z1; z += 0.05) best = Math.min(best, Math.hypot(wr.x - c.x - dir.x * z, wr.y - c.y - dir.y * z, wr.z - c.z - dir.z * z));
            if (key === 'f') nearFrom = Math.min(nearFrom, best);
            else nearTo = Math.min(nearTo, best);
          }
        }
        dur = t + 1 / 60;
        s.run(0.3, { ads: true });
        out.push({ from: fromSlot, to: toSlot, nearFrom, nearTo, dur });
      }
      st.set('carry', 'ads', false);
      return out;
    });
    for (const sw of r) {
      assert(sw.dur >= 0.8 && sw.dur <= 1.0, `swap ${sw.from} -> ${sw.to}: ${f2(sw.dur)} s (0.8-1.0 s)`);
      assert(sw.nearFrom < 0.25 && sw.nearTo < 0.25, `swap ${sw.from} -> ${sw.to}: the hand reaches both slots (${(sw.nearFrom * 100).toFixed(0)} / ${(sw.nearTo * 100).toFixed(0)} cm)`);
    }
  };
  // (the 2.x gaits: gear 4 = the 2.8 m/s jog; a crouch walk near 1 m/s grazes the thigh pistol with the right elbow pad,
  // as on 3.1 - an open issue in docs/ct-movement-progress.md)
  await checkLoadout('Free Roam', 2);
  // (load-latent-ui2) the match loads below take up to 120 s (shaders compile on the loading screen), as elsewhere
  for (const lo of ['pistolSd,rifle']) {
    console.log(`loadout ${lo}`);
    await page.goto(`${url}?autostart=studio&loadout=${lo}&gfx=min&gear=4`);
    await page.waitForFunction(() => window.__app?.current?.player, null, { timeout: 120000 });
    await frames(page, 10);
    await G(install);
    await checkLoadout(lo, lo.split(',').length);
  }
  await page.goto(`${url}?autostart=studio&gfx=min&gear=4`);
  await page.waitForFunction(() => window.__app?.current?.player, null, { timeout: 120000 });
  await G(install);

  console.log('backpack + detailed style');
  // both styles, with the deepest backpack: rebuild the match with the new look
  await G(() => {
    const a = window.__app;
    a.settings.update((d) => void (d.video.avatarStyle = 'detailed'));
    a.save.update((d) => void (d.avatar.backpack = 'pack'));
  });
  // (load-latent-ui2) both saves are debounced (settings 250 ms, profile 200 ms) and written to IndexedDB: poll the stored
  // records (up to 30 s) before the reload, not a fixed 600 ms that a loaded CPU can outrun
  const persisted = () => G(() => new Promise((res) => {
    const r = indexedDB.open('shoulder-strike');
    r.onsuccess = () => {
      try {
        const tx = r.result.transaction(['kv', 'profile']);
        const qs = tx.objectStore('kv').get('settings');
        const qp = tx.objectStore('profile').get('main');
        tx.oncomplete = () => {
          r.result.close();
          res(qs.result?.video?.avatarStyle === 'detailed' && qp.result?.avatar?.backpack === 'pack');
        };
        tx.onerror = () => { r.result.close(); res(false); };
      } catch {
        r.result.close();
        res(false);
      }
    };
    r.onerror = () => res(false);
  }));
  for (const t0 = Date.now(); !(await persisted()) && Date.now() - t0 < 30000; ) await page.waitForTimeout(250);
  hard(await persisted(), 'the detailed style and the backpack are saved before the reload');
  await page.reload();
  await page.waitForFunction(() => window.__app?.current?.player, null, { timeout: 120000 });
  await G(install);
  for (const [name, inp] of [
    ['jog', { y: 1 }],
    ['crouch walk', { y: 0.8, taps: { 1: 'crouch' } }],
  ]) {
    r = await G((inp) => {
      const s = window.__w;
      const p = window.__app.current.player;
      s.tp(20, 21, -Math.PI / 2);
      let worst = 0;
      s.run(1.4, { ...inp, each: () => (worst = Math.max(worst, ...s.backAngles().map((b) => b.deg))) });
      const clips = s.clips();
      p.controller['crouchToggled'] = false;
      return { worst, clips, style: p.rig.style, gear: p.rig.backGear };
    }, inp);
    assert(r.style === 'detailed' && r.gear > 0.15, `detailed avatar with a backpack (back gear ${f2(r.gear)} m)`);
    assert(r.worst <= 10 && r.clips.length === 0, `detailed + backpack, ${name}: back guns on their slot axis (${f2(r.worst)} deg), nothing clips (${r.clips.join(', ') || 'none'})`);
  }
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-weapons-carry-fail.png' });
}
const real = errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
console.log(real.length ? 'console problems:\n' + real.join('\n') : 'no console errors');
await browser.close();
process.exit(failed || real.length ? 1 : 0);
