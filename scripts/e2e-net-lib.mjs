// Shared co-op helpers for the two-page ?net=local suites (e2e-netmove, anim-audit --remote): the host (page A) opens a
// room, the clients join by code; a mode starts on every page; joint readers for the client's own pose and the host's
// copy of it.
import { launch, openPage } from './e2e-lib.mjs';

/** Wait for `fn(arg)` to be truthy on `page` (polled every 100 ms), else throw "timed out waiting for <what>". */
export async function until(page, fn, arg, timeout = 15000, what = 'condition') {
  // (G13) polled from here: on a desktop context the in-page polling of waitForFunction stops on a page in the
  // background (another page in front), so a condition that holds there was never seen
  const t0 = Date.now();
  for (;;) {
    if (await page.evaluate(`!!(${fn})(${JSON.stringify(arg) ?? 'undefined'})`).catch(() => false)) return;
    if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

/** The wrists, ankles and head: the joints e2e-netmove compares (10 cm). */
export const JOINTS = ['wristL', 'wristR', 'ankleL', 'ankleR', 'headNode'];

/**
 * Launch a browser, host a room on page A and join it from `n - 1` more pages over ?net=local (the pages share the
 * context: BroadcastChannel + IndexedDB). Returns { browser, ctx, A, B, pages, errors: [eA, eB, ...], startMode }.
 * `launchOpts` goes to e2e-lib `launch` (e.g. `args`).
 */
export async function hostAndJoin(url, n = 2, launchOpts = {}) {
  const { browser, ctx, page: A, errors: eA } = await launch({ url, params: 'net=local', ...launchOpts });
  const pages = [A];
  const errors = [eA];
  await A.click('.main-menu .btn:has-text("Co-op")');
  await A.click('.btn:has-text("Host a room")');
  await until(A, () => !!document.querySelector('.lobby-screen') && !!window.__coop, null, 15000, 'host lobby');
  const code = await A.evaluate(() => window.__coop.session.code);
  for (let i = 1; i < n; i++) {
    const { page, errors: e } = await openPage(ctx, url, 'net=local');
    await page.click('.main-menu .btn:has-text("Co-op")');
    await page.click('.btn:has-text("Join with code")');
    await page.keyboard.type(code.toLowerCase());
    await page.keyboard.press('Enter');
    await until(A, (k) => window.__coop.session.players.size === k, i + 1, 15000, 'host sees client');
    pages.push(page);
    errors.push(e);
  }
  return { browser, ctx, A, B: pages[1] ?? null, pages, errors, startMode: (mode, map) => startMode(pages, mode, map) };
}

/** Host (pages[0]) sets the mode and map, every client readies, the match starts on every page; damage off. */
export async function startMode(pages, mode, map) {
  const [A, ...clients] = pages;
  await A.evaluate(([m, mp]) => window.__coop.session.setSettings(m, mp, 'normal', ''), [mode, map]);
  for (const P of clients) await P.evaluate(() => window.__coop.session.setReady(true));
  await until(A, () => window.__coop.session.allReady, null, 8000, 'everyone ready');
  await A.evaluate(() => window.__coop.session.startMatch());
  for (const P of pages) await until(P, (m) => window.__app.current?.opts?.mode === m && !!window.__app.current.net && !window.__app.current.isEnded, mode, 40000, `${mode} match on both pages`);
  await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state), null, 15000, 'client state reaches the host');
  await A.evaluate(() => { window.__app.current.target.damageMul = 0; for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
}

/** World positions of `names` on the page's own player rig (the client's own pose). */
export const localJoints = (P, names = JOINTS) =>
  P.evaluate((names) => {
    const rig = window.__app.current.player.rig;
    return Object.fromEntries(names.map((n) => { rig[n].computeWorldMatrix(true); const p = rig[n].getAbsolutePosition(); return [n, [p.x, p.y, p.z]]; }));
  }, names);

/** The host's copy of its first remote player: its move mode and the world positions of `names`. */
export const remoteJoints = (A, names = JOINTS) =>
  A.evaluate((names) => {
    const r = window.__app.current.net.remotes.values().next().value;
    const rig = r.avatar.rig;
    return { mode: r.avatar.mode, j: Object.fromEntries(names.map((n) => { rig[n].computeWorldMatrix(true); const p = rig[n].getAbsolutePosition(); return [n, [p.x, p.y, p.z]]; })) };
  }, names);

/** Let the host's remotes jump (a teleport the next `n` snapshots) instead of reading it as rubber-banding. */
export const allowTeleport = (A, n = 3) => A.evaluate((n) => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(n); }, n);
