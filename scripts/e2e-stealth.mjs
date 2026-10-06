// Stealth movement, free-orbit camera and Blacklist-style cover, in the real-time loop where it matters
// (look input is injected every rendered frame, like the touch camera stick / right stick / mouse).
//  - camera: never stuck - 360 deg looks standing, crouched, moving, after a sprint, after leaving cover and
//    after a lean; the body does not turn with the camera while standing still; no residual offset after
//    sprint / cover / lean / traversal (framing back to default); 360 deg looks while aiming.
//  - cover (headless, 120 Hz render): 3 m snap with a 0.25-0.45 s glide and hand contact, slide in from a
//    sprint, crouched edge peek at low cover, head-first peek with the weapon out in 150-250 ms and back
//    in 150-250 ms, hand switch at a left edge in 150-200 ms, corner swing 0.4-0.6 s, sticky exit ~0.25 s,
//    cover-to-cover routed round a corner, a push back cancelling the move, reload tucked in, auto
//    shoulder to the faced side.
import { launch, frames, assert as hard } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
const G = (f, a) => page.evaluate(f, a);
let failed = false;
const assert = (cond, msg) => {
  if (cond || !process.env.SOFT) return hard(cond, msg);
  failed = true;
  console.log('  FAIL -', msg);
};
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : String(v));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const within = (v, lo, hi) => v >= lo && v <= hi;

await G(() => {
  const a = window.__app;
  const g = a.current;
  const p = g.player;
  const c = p.controller;
  const V = p.position.constructor;
  g.target.damageMul = 0;
  // aim assist deliberately slows the look over targets (the Free Roam dummies): off for exact sums
  a.settings.update((d) => {
    d.touch.aimAssist = 'off';
    d.gamepad.aimAssist = 'off';
  });
  const st = a.input.state;
  // per-frame look injection (rad/s), applied after the real input poll each rendered frame
  const look = { yaw: 0, pitch: 0, total: 0 };
  const poll = a.input.poll.bind(a.input);
  a.input.poll = (t, dt) => {
    poll(t, dt);
    if (look.yaw || look.pitch) {
      st.addLook(look.yaw * dt, look.pitch * dt);
      look.total += Math.abs(look.yaw * dt);
    }
  };
  window.__s = {
    look,
    tp(x, z, yaw) {
      g.cover.reset();
      g.corners.reset();
      c.teleport(new V(x, 0, z), yaw);
      p.cam.yaw = yaw;
      p.cam.pitch = 0;
      p.cam.snap();
      st.move.x = st.move.y = 0;
    },
    move(x, y) {
      st.move.x = x;
      st.move.y = y;
    },
    /** Unwrapped camera yaw (rad) so full turns are measurable. */
    trackYaw() {
      let prev = p.cam.yaw;
      let acc = 0;
      const o = a.loop.onFrameEnd;
      const tr = { get turned() { return acc; } };
      a.loop.onFrameEnd = (i, cpu) => {
        o?.(i, cpu);
        const y = p.cam.yaw;
        acc += Math.atan2(Math.sin(y - prev), Math.cos(y - prev));
        prev = y;
      };
      tr.stop = () => (a.loop.onFrameEnd = o);
      return tr;
    },
    state() {
      const cm = p.cam;
      return {
        camYaw: cm.yaw,
        viewYaw: cm.viewYaw,
        bodyYaw: c.yaw,
        pitch: cm.pitch,
        speed: c.speed,
        sprint: c.dashing,
        cover: g.cover.state,
        lean: p.coverPose.lean,
        dashS: cm['sDash'].x,
        leanS: cm['sLean'].x,
        coverS: cm['sCover'].x,
        side: cm['sSide'].x,
        shoulder: cm.shoulder,
      };
    },
  };
});

/** Hold a look rate for `ms` of real time while `setup` keeps the input as given; returns degrees turned. */
async function lookFor(ms, rate, inp = {}) {
  await G(([rate, inp]) => {
    const s = window.__s;
    s.move(inp.x ?? 0, inp.y ?? 0);
    s.look.yaw = rate;
    window.__tr = s.trackYaw();
    window.__tr.y0 = s.state().bodyYaw;
  }, [rate, inp]);
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await G((inp) => window.__s.move(inp.x ?? 0, inp.y ?? 0), inp);
    await wait(40);
  }
  await G(() => {
    window.__s.look.yaw = 0;
    window.__s.move(0, 0);
  });
  // the last injected look is applied on the next rendered frame
  await frames(page, 3);
  return G(() => {
    const s = window.__s;
    const turned = window.__tr.turned;
    window.__tr.stop();
    return { turned, real: window.__s.look.total, ...s.state(), y0: window.__tr.y0 };
  });
}
const resetTotal = () => G(() => (window.__s.look.total = 0));

try {
  console.log('camera: free orbit, never stuck');
  // standing still: a full 360 at 6 rad/s, and the body stays put
  await G(() => window.__s.tp(0, -14, Math.PI / 2));
  await frames(page, 20);
  await resetTotal();
  let r = await lookFor(1300, 6);
  assert(Math.abs(r.turned) >= r.real * 0.97 && r.real > 6.2, `standing: the view follows every bit of look input (${f2(r.turned)} of ${f2(r.real)} rad)`);
  const bodyMoved = Math.abs(Math.atan2(Math.sin(r.bodyYaw - r.y0), Math.cos(r.bodyYaw - r.y0)));
  assert(bodyMoved < 0.05, `standing still: the body does not turn with the camera (${f2(bodyMoved)} rad)`);
  // crouched, still
  await G(() => window.__app.input.state.tap('crouch'));
  await frames(page, 30);
  await resetTotal();
  r = await lookFor(1300, 6);
  assert(Math.abs(r.turned) >= r.real * 0.97, `crouched: full 360 look (${f2(r.turned)} of ${f2(r.real)} rad)`);
  await G(() => window.__app.input.state.tap('crouch'));
  await frames(page, 30);
  // moving
  await G(() => window.__s.tp(0, -14, Math.PI / 2));
  await resetTotal();
  r = await lookFor(1300, 6, { y: 1 });
  assert(Math.abs(r.turned) >= r.real * 0.97, `moving: full 360 look (${f2(r.turned)} of ${f2(r.real)} rad)`);
  // after a sprint
  await G(() => window.__s.tp(0, -18, Math.PI / 2));
  await G(() => {
    window.__s.move(0, 1);
    window.__app.input.state.tap('dash');
  });
  await wait(900);
  await G(() => window.__s.move(0, 1));
  await wait(300);
  await resetTotal();
  r = await lookFor(1300, 6);
  assert(Math.abs(r.turned) >= r.real * 0.97, `after a sprint: full 360 look (${f2(r.turned)} of ${f2(r.real)} rad)`);
  await wait(700);
  let s = await G(() => window.__s.state());
  assert(s.dashS < 0.02 && Math.abs(Math.atan2(Math.sin(s.viewYaw - s.camYaw), Math.cos(s.viewYaw - s.camYaw))) < 0.003, `after a sprint: no residual framing or view offset (dash ${f2(s.dashS)})`);
  assert(s.speed < 0.05, `after a sprint the body has stopped within ~1 s (${f2(s.speed)} m/s)`);
  // looking up/down returns nothing by itself and is never clamped short of the limits
  await G(() => (window.__s.look.pitch = 3));
  await wait(400);
  await G(() => (window.__s.look.pitch = 0));
  s = await G(() => window.__s.state());
  assert(s.pitch > 0.9, `pitch follows look input (${f2(s.pitch)})`);
  await G(() => (window.__app.current.player.cam.pitch = 0));

  // after leaving cover and after a lean
  await G(() => window.__s.tp(-3.7, -6, -Math.PI / 2));
  await G(() => window.__app.input.state.tap('cover'));
  await wait(1200);
  const inCover = (await G(() => window.__s.state())).cover;
  await G(() => window.__app.input.state.tap('cover'));
  await wait(1000);
  await resetTotal();
  r = await lookFor(1300, 6);
  s = await G(() => window.__s.state());
  assert(inCover === 'in' && Math.abs(r.turned) >= r.real * 0.97, `after leaving cover: full 360 look (cover ${inCover}, ${f2(r.turned)} of ${f2(r.real)} rad)`);
  assert(s.coverS < 0.05 && Math.abs(s.side - s.shoulder) < 0.05, `after leaving cover: framing back to default (cover ${f2(s.coverS)}, side ${f2(s.side)})`);
  // lean at the free-standing wall end (aim), then release and look round
  await G(() => window.__s.tp(-16, 5.9, Math.PI));
  await wait(300);
  await G(() => window.__app.input.state.set('stealth-ads', 'ads', true));
  await wait(900);
  const leaned = (await G(() => window.__s.state())).lean;
  await G(() => window.__app.input.state.set('stealth-ads', 'ads', false));
  await wait(900);
  await resetTotal();
  r = await lookFor(1300, 6);
  s = await G(() => window.__s.state());
  assert(Math.abs(r.turned) >= r.real * 0.97, `after a lean (${f2(leaned)}): full 360 look (${f2(r.turned)} of ${f2(r.real)} rad)`);
  assert(Math.abs(s.leanS) < 0.05 && Math.abs(s.side - s.shoulder) < 0.05, `after a lean: no residual lean or shoulder offset (${f2(s.leanS)}, side ${f2(s.side)})`);
  // aiming: the view still orbits freely (the body follows the aim at its own capped rate)
  await G(() => window.__s.tp(0, -14, Math.PI / 2));
  await G(() => window.__app.input.state.set('stealth-ads', 'ads', true));
  await wait(400);
  await resetTotal();
  r = await lookFor(1300, 6);
  await G(() => window.__app.input.state.set('stealth-ads', 'ads', false));
  assert(Math.abs(r.turned) >= r.real * 0.97, `aiming: full 360 look (${f2(r.turned)} of ${f2(r.real)} rad)`);

  // ---------------------------------------------------------------- cover (headless, exact timing)
  console.log('cover');
  await G(() => {
    const a = window.__app;
    const g = a.current;
    const p = g.player;
    const st = a.input.state;
    const H = (window.__h = {
      /** One 60 Hz sim step with its two 120 Hz render frames. */
      step() {
        a.loop.stepHeadless(1 / 60, 120);
      },
      /** Step until `cond()` or `max` seconds; returns the time taken (or max). */
      until(cond, max = 3) {
        for (let t = 0; t < max; t += 1 / 60) {
          H.step();
          if (cond()) return t + 1 / 60;
        }
        return max;
      },
      run(sec) {
        for (let t = 0; t < sec; t += 1 / 60) H.step();
      },
      tp(x, z, yaw) {
        window.__s.tp(x, z, yaw);
        st.set('stealth-ads', 'ads', false);
        H.run(0.4);
      },
      cover: () => g.cover,
      pose: () => p.rig.graph.pose,
    });
  });
  // snap from ~2.9 m: glide 0.25-0.45 s, the support hand on the wall at arrival
  let cv = await G(() => {
    const H = window.__h;
    const st = window.__app.input.state;
    const p = window.__app.current.player;
    H.tp(-1.8, -6, -Math.PI / 2);
    const cand = !!H.cover().candidate;
    const x0 = p.position.x;
    st.tap('cover');
    const glide = H.until(() => H.cover().state === 'in', 2);
    H.run(0.15);
    // off hand on the cover surface (offCover channel 20)
    return { cand, glide, moved: x0 - p.position.x, hand: H.pose()[20] };
  });
  assert(cv.cand && within(cv.glide, 0.25, 0.46) && cv.moved > 2.3, `snap from ~3 m: ${f2(cv.moved)} m glide in ${f2(cv.glide)} s (0.25-0.45 s)`);
  assert(cv.hand > 0.5, `support hand reaches the wall (${f2(cv.hand)})`);
  // sticky exit: a firm push away leaves after ~0.25 s, a brief one does not
  cv = await G(() => {
    const H = window.__h;
    const st = window.__app.input.state;
    st.move.x = 0;
    st.move.y = -1; // camera faces the cover (-x): back = away
    H.run(0.15);
    const stillIn = H.cover().state === 'in';
    st.move.y = 0;
    H.run(0.3);
    st.move.y = -1;
    const t = H.until(() => H.cover().state === 'none', 1);
    st.move.y = 0;
    return { stillIn, t };
  });
  assert(cv.stillIn && within(cv.t, 0.2, 0.32), `sticky exit: a brief push stays, a firm push leaves after ${f2(cv.t)} s (~0.25 s)`);
  // sprinting at cover, then pressing cover once it is in reach: slides in (never on its own)
  cv = await G(() => {
    const H = window.__h;
    const st = window.__app.input.state;
    H.tp(1.5, -6, -Math.PI / 2);
    st.move.y = 1;
    st.tap('dash');
    H.until(() => window.__app.current.player.controller.sprinting && window.__app.current.player.controller.speed > 3.5, 2);
    H.until(() => !!window.__app.current.cover.candidate, 2);
    st.tap('cover');
    let slid = false;
    H.until(() => {
      if (window.__app.current.player.coverPose.slide >= 0) slid = true;
      return H.cover().state === 'in';
    }, 2);
    st.move.y = 0;
    return { slid, state: H.cover().state };
  });
  assert(cv.slid && cv.state === 'in', `cover pressed while sprinting at it slides in (${cv.state})`);

  // low cover: aiming at the edge, looking past it, leans round it crouched (not over the top)
  cv = await G(() => {
    const H = window.__h;
    const st = window.__app.input.state;
    const p = window.__app.current.player;
    H.tp(-3.7, -4.6, -Math.PI / 2);
    st.tap('cover');
    H.run(0.6);
    st.move.x = 1; // strafe to the z = -4 end
    H.run(1.2);
    st.move.x = 0;
    H.run(0.3);
    p.cam.yaw = -Math.PI / 2 + 0.7; // look past the edge
    st.set('stealth-ads', 'ads', true);
    H.run(0.5);
    const r = { state: H.cover().state, kind: H.cover().peekKind, crouched: p.controller.crouched, lean: p.coverPose.lean };
    st.set('stealth-ads', 'ads', false);
    H.run(0.4);
    p.cam.yaw = -Math.PI / 2;
    return r;
  });
  assert(cv.state === 'peek' && cv.kind === 'edge' && cv.crouched && cv.lean !== 0, `low cover edge: crouched peek round the corner (${JSON.stringify(cv)})`);

  // high cover: head-first peek, weapon out in 150-250 ms, back in 150-250 ms; left edge hand switch
  cv = await G(() => {
    const H = window.__h;
    const st = window.__app.input.state;
    const p = window.__app.current.player;
    const gr = p.rig.graph;
    // high cover at x=-10 (east face x=-9.75, z 0..4); camera faces -x: right on screen = +z
    H.tp(-8.8, 2.5, -Math.PI / 2);
    st.tap('cover');
    H.run(0.6);
    st.move.x = 1;
    H.run(1.6);
    st.move.x = 0;
    H.run(0.5);
    st.set('stealth-ads', 'ads', true);
    let headFirst = false;
    const out = H.until(() => {
      const hd = Math.abs(gr['leanHead'].x);
      const bd = Math.abs(gr['leanBody'].x);
      if (hd > 0.3 && bd < 0.1) headFirst = true;
      return bd > 0.9 && p.carry.raise > 0.9;
    }, 2);
    H.run(0.4);
    st.set('stealth-ads', 'ads', false);
    const back = H.until(() => Math.abs(gr['leanBody'].x) < 0.1, 2);
    H.run(0.4);
    // the left (z = 0) edge: the weapon is in the left (outside) hand for the lean; the change of
    // hands (on the turn towards that edge) takes 150-200 ms
    let swapT = 0;
    let cur = 0;
    const track = () => {
      if (p.rig.handSwap >= 0) cur += 1 / 60;
      else if (cur > 0) {
        swapT = Math.max(swapT, cur);
        cur = 0;
      }
      return false;
    };
    st.move.x = -1;
    H.until(track, 3.6);
    st.move.x = 0;
    H.until(track, 0.5);
    st.set('stealth-ads', 'ads', true);
    H.until(track, 0.8);
    const left = p.rig.leftHanded;
    st.set('stealth-ads', 'ads', false);
    H.run(0.6);
    return { headFirst, out, back, swapT, left };
  });
  assert(cv.headFirst, 'peek: the head leads, the body follows');
  assert(within(cv.out, 0.15, 0.25), `peek: weapon out in ${f2(cv.out)} s (150-250 ms)`);
  assert(within(cv.back, 0.15, 0.25), `peek release: back in ${f2(cv.back)} s (150-250 ms)`);
  assert(cv.left && within(cv.swapT, 0.15, 0.2), `left edge: the weapon changes hands in ${f2(cv.swapT)} s (150-200 ms)`);

  // corner swing 0.4-0.6 s (building east face x=5, corner at z=19)
  cv = await G(() => {
    const H = window.__h;
    const st = window.__app.input.state;
    H.tp(5.9, 17.5, -Math.PI / 2);
    st.tap('cover');
    H.run(0.6);
    st.move.x = 1;
    H.until(() => H.cover().state === 'corner', 6);
    const t = H.until(() => H.cover().state !== 'corner', 2);
    st.move.x = 0;
    H.run(0.3);
    return { t, state: H.cover().state };
  });
  assert(cv.state === 'in' && within(cv.t, 0.4, 0.6), `corner swing ${f2(cv.t)} s (0.4-0.6 s)`);

  // reload / swap tucked in; the camera on the shoulder of the side being faced
  cv = await G(() => {
    const H = window.__h;
    const st = window.__app.input.state;
    const p = window.__app.current.player;
    H.tp(-3.7, -6, -Math.PI / 2);
    st.tap('cover');
    H.run(0.6);
    const w = window.__app.current.weapons;
    w.current.mag = Math.max(1, w.current.mag - 5);
    st.tap('reload');
    H.run(0.6);
    const tuck = p.rig.graph.tuckW;
    H.run(2.4);
    // look along the face each way: the shoulder follows the faced side
    p.cam.yaw = 0.6;
    st.move.x = 0.6;
    H.run(0.6);
    st.move.x = 0;
    const s1 = p.cam.shoulder;
    p.cam.yaw = Math.PI - 0.6;
    st.move.x = -0.6;
    H.run(0.6);
    st.move.x = 0;
    H.run(0.2);
    const s2 = p.cam.shoulder;
    return { tuck, s1, s2 };
  });
  assert(cv.tuck > 0.8, `reloading in cover tucks in (${f2(cv.tuck)})`);
  assert(cv.s1 !== cv.s2, `auto shoulder follows the faced side (${cv.s1} / ${cv.s2})`);

  // cover-to-cover routed round a corner, and a push back cancelling a move
  cv = await G(() => {
    const H = window.__h;
    const st = window.__app.input.state;
    const g = window.__app.current;
    const p = g.player;
    const c = g.cover;
    // find a face and a target behind its end (straight line blocked, routed via the corner)
    for (const seg of c['segments']) {
      if (seg.len < 1.5 || seg.low) continue;
      const mx = seg.ax + seg.tx * seg.len * 0.5 + seg.nx * 1.2;
      const mz = seg.az + seg.tz * seg.len * 0.5 + seg.nz * 1.2;
      if (Math.abs(seg.y) > 0.1) continue;
      H.tp(mx, mz, Math.atan2(-seg.nx, -seg.nz));
      st.tap('cover');
      H.run(0.6);
      if (c.state !== 'in' || c.seg !== seg) continue;
      for (let k = 0; k < 24; k++) {
        p.cam.yaw = (k / 24) * Math.PI * 2;
        const t = c['findDash']({ x: Math.sin(p.cam.yaw), z: Math.cos(p.cam.yaw), mag: 1 });
        if (t && t.via) {
          // intent: looking at it and holding the stick towards it (camera forward)
          st.move.x = 0;
          st.move.y = 1;
          H.run(0.3);
          if (!c.target || !c.target.via) {
            st.move.y = 0;
            continue;
          }
          const goal = c.target.seg;
          st.tap('cover');
          let viaSeen = false;
          H.until(() => {
            if (c.state === 'dash' && c['dashTo']?.via) viaSeen = true;
            return c.state === 'in' || c.state === 'none';
          }, 4);
          st.move.y = 0;
          return { found: true, viaSeen, state: c.state, arrived: c.seg === goal };
        }
      }
    }
    return { found: false };
  });
  assert(cv.found && cv.viaSeen && cv.state === 'in' && cv.arrived, `cover-to-cover routes round a corner to the marked cover (${JSON.stringify(cv)})`);
  cv = await G(() => {
    const H = window.__h;
    const st = window.__app.input.state;
    const p = window.__app.current.player;
    const c = H.cover();
    // low cover east face, look at the low wall to the south; start the move, then pull back
    H.tp(-3.7, -6, -Math.PI / 2);
    st.tap('cover');
    H.run(0.6);
    p.cam.yaw = Math.atan2(-2 - p.position.x, -11.35 - p.position.z);
    st.move.y = 1; // stick held towards it (camera forward): cover-to-cover needs that intent
    H.run(0.4);
    const had = !!c.target;
    st.tap('cover');
    H.run(0.15);
    const dashing = c.state === 'dash';
    // stick back towards where we came from (camera faces the target: back = -y)
    st.move.y = -1;
    const t = H.until(() => c.state !== 'dash', 1.5);
    st.move.y = 0;
    return { had, dashing, t, state: c.state, reason: c.sm.reason };
  });
  assert(cv.had && cv.dashing && cv.state === 'none' && cv.reason === 'dash-cancel', `pushing back cancels a cover-to-cover move (${JSON.stringify(cv)})`);
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-stealth-fail.png' });
}
const real = errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
console.log(real.length ? 'console problems:\n' + real.join('\n') : 'no console errors');
await browser.close();
process.exit(failed || real.length ? 1 : 0);
