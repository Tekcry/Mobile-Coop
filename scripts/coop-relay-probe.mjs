// (co-op relay fix) Manual probe, not in any suite (it needs the internet): two headless pages of a served build join one
// room over the REAL transport (Trystero, its public Nostr signalling relays) with every link forced through the TURN
// relay (`?relay=only`, iceTransportPolicy 'relay'), and report whether the relay answered and how long the join took.
// It uses a little of the relay's monthly allowance (a lobby only, no match).
//
//   npm run build && npx vite preview --port 4190 --host 127.0.0.1   (another shell)
//   node scripts/coop-relay-probe.mjs [http://127.0.0.1:4190/] [--direct]
//
// `--direct` drops the forced relay (`?relay=off`: public STUN only) for comparison. Never prints the relay login.
import { launch, openPage } from './e2e-lib.mjs';

const url = process.argv.find((a) => /^https?:/.test(a)) ?? 'http://127.0.0.1:4190/';
const direct = process.argv.includes('--direct');
const params = direct ? 'relay=off' : 'relay=only';
const want = direct ? /Connected - (direct|via relay)/ : /Connected - via relay/;

const { browser, ctx, page: A } = await launch({ url, params });
let ok = false;
try {
  await A.click('.main-menu .btn:has-text("Co-op")');
  await A.click('.btn:has-text("Host a room")');
  await A.waitForFunction(() => !!window.__coop?.session.code && !!document.querySelector('.lobby-screen'), null, { timeout: 30000 });
  const code = await A.evaluate(() => window.__coop.session.code);
  console.log(`host opened room ${code} (${params})`);
  const { page: B } = await openPage(ctx, url, params);
  // the attempt log's console line (method, time; never the relay login)
  for (const [P, who] of [[A, 'host'], [B, 'joiner']]) P.on('console', (m) => /^co-op connection:/.test(m.text()) && console.log(`  ${who} log: ${m.text()}`));
  await B.click('.main-menu .btn:has-text("Co-op")');
  await B.click('.btn:has-text("Join with code")');
  await B.keyboard.type(code);
  const t0 = Date.now();
  await B.keyboard.press('Enter');
  const read = (P) => P.evaluate(() => document.querySelector('.lobby-screen .lobby-link')?.textContent ?? document.querySelector('.dialog-screen .dialog')?.textContent ?? '(no lobby)');
  for (;;) {
    const [a, b] = [await read(A), await read(B)];
    const s = (Date.now() - t0) / 1000;
    if (want.test(a) && want.test(b)) {
      console.log(`connected after ${s.toFixed(1)} s\n  host:   ${a}\n  joiner: ${b}`);
      ok = true;
      break;
    }
    if (/Failed|Couldn't|No host/.test(b) || s > 45) {
      console.log(`NOT connected after ${s.toFixed(1)} s\n  host:   ${a}\n  joiner: ${b}`);
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  await new Promise((r) => setTimeout(r, 1500));
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
