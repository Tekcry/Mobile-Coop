// Stealth movement, free-orbit camera and Blacklist-style cover, in the real-time loop where it matters
// (look input is injected every rendered frame, like the touch camera stick / right stick / mouse).
//  - camera: never stuck - 360 deg looks standing, crouched, moving, after a sprint, after leaving cover and
//    after a lean; the body does not turn with the camera while standing still; no residual offset after
//    sprint / cover / lean / traversal (framing back to default).
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
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-stealth-fail.png' });
}
const real = errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
console.log(real.length ? 'console problems:\n' + real.join('\n') : 'no console errors');
await browser.close();
process.exit(failed || real.length ? 1 : 0);
