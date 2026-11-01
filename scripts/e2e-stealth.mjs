// Stealth movement and the free-orbit camera, in the real-time loop where it matters
// (look input is injected every rendered frame, like the right stick / mouse).
//  - camera: never stuck - 360 deg looks standing, crouched, moving and after a sprint; the body does not turn
//    with the camera while standing still; no residual offset after sprint / traversal (framing back to
//    default); 360 deg looks while aiming. (The player cover checks left with locomotion step 05.)
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
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// (test-speed) the game's own clock: under load the loop runs slower than real time, so a fixed real-time wait gives
// less game time than the asserts expect. `forSim(ms, tick)` lets `ms` of sim time pass (`tick` runs every 40 ms of
// real time meanwhile), with a wall cap (10x, at least 30 s) as the hang guard.
const simNow = () => G(() => window.__app.current.time);
async function forSim(ms, tick) {
  const t0 = await simNow();
  const w0 = Date.now();
  const cap = Math.max(ms * 10, 30000);
  while ((await simNow()) - t0 < ms / 1000 && Date.now() - w0 < cap) {
    if (tick) await tick();
    await wait(40);
  }
}
const within = (v, lo, hi) => v >= lo && v <= hi;

await G(() => {
  const a = window.__app;
  const g = a.current;
  const p = g.player;
  const c = p.controller;
  const V = p.position.constructor;
  g.target.damageMul = 0;
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
        lean: p.pose.lean,
        leanS: cm['sLean'].x,
        side: cm['sSide'].x,
        shoulder: cm.shoulder,
      };
    },
  };
});

/** Hold a look rate for `ms` of sim time while `setup` keeps the input as given; returns degrees turned. */
async function lookFor(ms, rate, inp = {}) {
  await G(([rate, inp]) => {
    const s = window.__s;
    s.move(inp.x ?? 0, inp.y ?? 0);
    s.look.yaw = rate;
    window.__tr = s.trackYaw();
    window.__tr.y0 = s.state().bodyYaw;
  }, [rate, inp]);
  await forSim(ms, () => G((inp) => window.__s.move(inp.x ?? 0, inp.y ?? 0), inp));
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
  await G(() => window.__s.tp(9, 20, Math.PI / 2));
  await frames(page, 20);
  await resetTotal();
  let r = await lookFor(1700, 6);
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
  await G(() => window.__s.tp(9, 20, Math.PI / 2));
  await resetTotal();
  r = await lookFor(1300, 6, { y: 1 });
  assert(Math.abs(r.turned) >= r.real * 0.97, `moving: full 360 look (${f2(r.turned)} of ${f2(r.real)} rad)`);
  // after a run (G31: sprint and its dash spring are gone; the tap('dash') is dropped)
  await G(() => window.__s.tp(9, 20, Math.PI / 2));
  await G(() => {
    window.__s.move(0, 1);
  });
  await forSim(900);
  await G(() => window.__s.move(0, 1));
  await forSim(300);
  await resetTotal();
  r = await lookFor(1300, 6);
  assert(Math.abs(r.turned) >= r.real * 0.97, `after a run: full 360 look (${f2(r.turned)} of ${f2(r.real)} rad)`);
  await forSim(700);
  let s = await G(() => window.__s.state());
  assert(Math.abs(Math.atan2(Math.sin(s.viewYaw - s.camYaw), Math.cos(s.viewYaw - s.camYaw))) < 0.003, `after a run: no residual view offset`);
  assert(s.speed < 0.05, `after a run the body has stopped within ~1 s (${f2(s.speed)} m/s)`);
  // looking up/down returns nothing by itself and is never clamped short of the limits
  await G(() => (window.__s.look.pitch = 3));
  await forSim(400);
  await G(() => (window.__s.look.pitch = 0));
  s = await G(() => window.__s.state());
  assert(s.pitch > 0.9, `pitch follows look input (${f2(s.pitch)})`);
  await G(() => (window.__app.current.player.cam.pitch = 0));

  // aiming: the view still orbits freely (the body follows the aim at its own capped rate)
  await G(() => window.__s.tp(9, 20, Math.PI / 2));
  await G(() => window.__app.input.state.set('stealth-ads', 'ads', true));
  await forSim(400);
  await resetTotal();
  r = await lookFor(1300, 6);
  await G(() => window.__app.input.state.set('stealth-ads', 'ads', false));
  assert(Math.abs(r.turned) >= r.real * 0.97, `aiming: full 360 look (${f2(r.turned)} of ${f2(r.real)} rad)`);
  // a shake's roll (hard landing, hit, explosion) never leaves the horizon tilted once it settles, at any
  // pitch or yaw (Babylon rebuilds the up vector, pitch included, only when the roll changes)
  await G(() => { const p = window.__app.current.player; p.cam.pitch = -0.35; p.cam.shake(0.8); });
  await forSim(1200);
  await lookFor(700, 3);
  const roll = await G(() => {
    const p = window.__app.current.player;
    const right = p.cam.camera.getDirection(new p.position.constructor(1, 0, 0));
    return (Math.asin(Math.max(-1, Math.min(1, right.y))) * 180) / Math.PI;
  });
  await G(() => (window.__app.current.player.cam.pitch = 0));
  assert(Math.abs(roll) < 0.2, `after a shake: the horizon is level again at a new yaw (roll ${f2(roll)} deg)`);
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-stealth-fail.png' });
}
const real = errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
console.log(real.length ? 'console problems:\n' + real.join('\n') : 'no console errors');
await browser.close();
process.exit(failed || real.length ? 1 : 0);
