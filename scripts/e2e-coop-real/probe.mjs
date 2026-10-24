// e2e-coop-real lifecycle probe (coop-real H1, PLAN "Lifecycle probe", PLAN-CHECK 6): which headless Chromium mechanism
// hides / freezes a tab the way Michael's Chrome does. For each mechanism, over a 5 s window, the page records its
// visibilityState, rAF frames, a 100 ms setInterval, a 100 ms dedicated worker, BroadcastChannel arrivals (the other page
// posts every 100 ms from Node), the game's bgTick worker messages and its sim clock. Counts are timestamped in the page
// and read after the restore, so a frozen page (whose evaluate waits) is still measured. Run under both flag sets: the
// e2e default (background throttling off) and `realBackground` (e2e-lib BACKGROUND_FLAGS left out). Read only: the
// counters are the probe's own timers and a pass-through listener on the bgTick worker.
import { bootPair, cdp, lifecycle, hideBehind, spoofHidden, hostSession, sleep } from './lib.mjs';

const WIN = 5000;

function installCounters() {
  const sim = () => window.__app?.current?.time ?? null;
  if (window.__lp) {
    for (const k of Object.keys(window.__lp)) if (Array.isArray(window.__lp[k])) window.__lp[k].length = 0;
  } else {
    const L = (window.__lp = { raf: [], iv: [], wk: [], bc: [], bg: [], vis: [], frz: [] });
    const f = () => {
      L.raf.push([Date.now(), sim()]);
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
    setInterval(() => L.iv.push([Date.now(), sim(), document.visibilityState, document.hasFocus()]), 100);
    const w = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(1), 100)'], { type: 'text/javascript' })));
    w.onmessage = () => L.wk.push([Date.now(), sim()]);
    const bc = (window.__lpc = new BroadcastChannel('coop-real-probe'));
    bc.onmessage = () => L.bc.push([Date.now(), sim()]);
    document.addEventListener('visibilitychange', () => L.vis.push([Date.now(), document.visibilityState]));
    document.addEventListener('freeze', () => L.frz.push([Date.now(), 'freeze']));
    document.addEventListener('resume', () => L.frz.push([Date.now(), 'resume']));
  }
  const bg = window.__app?.loop?.bg;
  if (bg && !bg.__lp) {
    bg.addEventListener('message', () => window.__lp.bg.push([Date.now(), sim()]));
    bg.__lp = true;
  }
  return { webdriver: navigator.webdriver, bgWorker: !!bg, vis: document.visibilityState, sim: sim() };
}

/** One mechanism: `apply` on `target` for WIN ms while `other` posts; returns the table row. */
async function measure(h, name, target, other, apply, restore, win = WIN) {
  await target.evaluate(installCounters);
  await other.evaluate(installCounters);
  const sim0 = await target.evaluate(() => window.__app?.current?.time ?? null);
  const t0 = Date.now();
  let err = '';
  try {
    await apply();
  } catch (e) {
    err = `apply: ${String(e.message).split('\n')[0]}`;
  }
  const post = setInterval(() => other.evaluate(() => window.__lpc.postMessage(1)).catch(() => {}), 100);
  await sleep(win);
  const t1 = Date.now();
  clearInterval(post);
  const live = await Promise.race([target.evaluate(() => document.visibilityState).catch(() => 'error'), sleep(1500).then(() => 'blocked')]);
  const host = target === h.B ? await hostSession(h.A).catch(() => null) : null;
  try {
    await restore();
  } catch (e) {
    err += ` restore: ${String(e.message).split('\n')[0]}`;
  }
  await sleep(1000);
  const L = await target.evaluate(() => window.__lp);
  const lo = t0 + 300;
  const s = (t1 - lo) / 1000;
  const inW = (a) => a.filter((x) => x[0] >= lo && x[0] <= t1);
  const hz = (a) => +(inW(a).length / s).toFixed(1);
  const sims = [...inW(L.raf), ...inW(L.iv), ...inW(L.bg)].map((x) => x[1]).filter((v) => v !== null);
  const simAdv = sims.length && sim0 !== null ? Math.max(...sims) - sim0 : 0;
  const row = {
    name,
    page: target === h.A ? 'host' : 'client',
    vis: [...new Set(inW(L.iv).map((x) => x[2]))].join('/') || '-',
    focus: [...new Set(inW(L.iv).map((x) => String(x[3])))].join('/') || '-',
    visEv: L.vis.filter((x) => x[0] >= t0).map((x) => x[1]).join('>') || '-',
    frzEv: L.frz.filter((x) => x[0] >= t0).map((x) => x[1]).join('>') || '-',
    rafHz: hz(L.raf),
    ivHz: hz(L.iv),
    wkHz: hz(L.wk),
    bcHz: hz(L.bc),
    bgHz: hz(L.bg),
    simX: +(simAdv / ((t1 - t0) / 1000)).toFixed(2),
    evalWhileOn: live,
    hostRemotes: host ? host.remotes.length : '-',
    err: err || '-',
  };
  console.log(`PROBE ${JSON.stringify(row)}`);
  return row;
}

/** CDP: the window of page P's target (are the two pages one window, two tabs?). */
async function windowOf(P) {
  const s = await cdp(P);
  const { targetInfo } = await s.send('Target.getTargetInfo');
  try {
    const w = await s.send('Browser.getWindowForTarget', { targetId: targetInfo.targetId });
    return { targetId: targetInfo.targetId, ctxId: targetInfo.browserContextId, windowId: w.windowId, state: w.bounds?.windowState };
  } catch (e) {
    return { targetId: targetInfo.targetId, ctxId: targetInfo.browserContextId, windowId: `n/a (${String(e.message).split('\n')[0]})` };
  }
}

export async function probe(url, { realBackground }) {
  const tag = realBackground ? 'realBackground' : 'e2e-default';
  console.log(`lifecycle probe: ${tag} (boot the pair, netdrop 8 s)`);
  const h = await bootPair(url, { netdrop: 8, realBackground });
  const rows = [];
  try {
    const init = await Promise.all([h.A.evaluate(installCounters), h.B.evaluate(installCounters)]);
    const win = await Promise.all([windowOf(h.A), windowOf(h.B)]);
    console.log(`PROBE-ENV ${tag} ${JSON.stringify({ host: { ...init[0], ...win[0] }, client: { ...init[1], ...win[1] } })}`);
    const noop = async () => {};
    rows.push(await measure(h, 'baseline (client in front)', h.B, h.A, noop, noop));
    rows.push(await measure(h, 'baseline host (behind the client)', h.A, h.B, noop, noop));
    rows.push(await measure(h, 'spoof document.hidden + visibilitychange', h.B, h.A, () => spoofHidden(h.B, true), () => spoofHidden(h.B, false)));
    let restore = noop;
    rows.push(await measure(h, 'focus emulation off + host bringToFront', h.B, h.A, async () => (restore = await hideBehind(h.B, h.A)), () => restore()));
    // a third page in its own window over the client (Target.createTarget newWindow, same browser context)
    const sB = await cdp(h.B);
    let third = null;
    rows.push(
      await measure(
        h,
        'new window over the client (Target.createTarget newWindow)',
        h.B,
        h.A,
        async () => {
          const { targetInfo } = await sB.send('Target.getTargetInfo');
          third = (await sB.send('Target.createTarget', { url: 'about:blank', newWindow: true, browserContextId: targetInfo.browserContextId })).targetId;
          await sB.send('Target.activateTarget', { targetId: third });
        },
        async () => {
          if (third) await sB.send('Target.closeTarget', { targetId: third });
          await h.B.bringToFront();
        },
      ),
    );
    rows.push(await measure(h, 'CDP frozen (client in front)', h.B, h.A, () => lifecycle(h.B, 'frozen'), () => lifecycle(h.B, 'active')));
    rows.push(
      await measure(
        h,
        'hidden (focus off + host front) then CDP frozen',
        h.B,
        h.A,
        async () => {
          restore = await hideBehind(h.B, h.A);
          await lifecycle(h.B, 'frozen');
        },
        async () => {
          await lifecycle(h.B, 'active');
          await restore();
        },
      ),
    );
    // (triage 2026-10-25) run 1 (6204d95f, laptop GPU): every mechanism above left the client visible with rAF ~57 Hz and
    // timers at 10 Hz under both flag sets (headless keeps every tab visible; a visible page ignores `frozen`). Next
    // candidates: the shared window minimized (both pages hidden, the host still pumped from Node) for B1; frozen once
    // minimized, and the client's main thread paused by the debugger (timers, rAF and BroadcastChannel stop; the wire
    // goes silent as in a frozen tab) for B2.
    const winId = (await windowOf(h.B)).windowId;
    const winState = (state) => sB.send('Browser.setWindowBounds', { windowId: winId, bounds: { windowState: state } });
    rows.push(await measure(h, 'window minimized (both pages, host pumped)', h.B, h.A, () => winState('minimized'), () => winState('normal')));
    rows.push(
      await measure(
        h,
        'window minimized then CDP frozen',
        h.B,
        h.A,
        async () => {
          await winState('minimized');
          await lifecycle(h.B, 'frozen');
        },
        async () => {
          await lifecycle(h.B, 'active');
          await winState('normal');
        },
      ),
    );
    rows.push(
      await measure(
        h,
        'Debugger.pause (client main thread)',
        h.B,
        h.A,
        async () => {
          await sB.send('Debugger.enable');
          await sB.send('Debugger.pause');
        },
        async () => {
          await sB.send('Debugger.resume').catch(() => {});
          await sB.send('Debugger.disable').catch(() => {});
        },
      ),
    );
    rows.push(await measure(h, 'CDP frozen 10 s (past netdrop 8 s)', h.B, h.A, () => lifecycle(h.B, 'frozen'), () => lifecycle(h.B, 'active'), 10000));
    await sleep(3000);
    const after = { host: await hostSession(h.A), client: await h.B.evaluate(() => ({ inMatch: !!window.__app.current?.net, peers: window.__coop?.session?.players?.size ?? null, screen: window.__app.screens.top?.el?.className ?? null })) };
    console.log(`PROBE-AFTER-DROP ${tag} ${JSON.stringify(after)}`);
    // the hidden host with the pump off: does the game's own bgTick worker drive it (PLAN-CHECK 6)?
    h.pump.pause();
    rows.push(await measure(h, 'host hidden (focus off + client front), pump OFF', h.A, h.B, async () => (restore = await hideBehind(h.A, h.B)), () => restore()));
    h.pump.resume();
  } finally {
    await h.close();
  }
  return rows;
}
