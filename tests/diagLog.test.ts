import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DIAG,
  DiagBook,
  diagText,
  digestDiff,
  FramePerf,
  metaOf,
  rotate,
  sanitizeLines,
  sanitizeMeta,
  scrub,
  shortDevice,
  type DiagMeta,
  type PerfSample,
} from '../src/feedback/diagLog';
import { CHUNK_PREFIX, DiagLog, META_PREFIX } from '../src/feedback/diag';
import { dbKeys, resetDbCache } from '../src/save/db';
import { RELAY_SERVERS } from '../src/net/relayConfig';
import { NetDiag } from '../src/net/netDiag';
import { linkDetail } from '../src/net/linkStatus';

const T0 = 1_780_000_000_000;

describe('scrub', () => {
  it('hides IP addresses (v4, v6, mDNS) but keeps versions, times and the user agent', () => {
    expect(scrub('candidate 192.168.1.20 udp')).toBe('candidate [ip] udp');
    expect(scrub('http://10.0.0.5:5173/?room=ABCDE')).toBe('http://[ip]:5173/?room=ABCDE');
    expect(scrub('peer fe80::1c2a:3bff:fe4d:1 and 2001:db8:85a3:0:0:8a2e:370:7334')).toBe('peer [ip] and [ip]');
    expect(scrub('host 2b9c2f1e-7a3d-4e55-9a0b-1c2d3e4f5a6b.local typ host')).toBe('host [ip] typ host');
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68';
    expect(scrub(ua)).toBe(ua);
    expect(scrub('version 4.139.0 at 12:30:45, 999.1.2.3')).toBe('version 4.139.0 at 12:30:45, 999.1.2.3');
  });

  it('hides registered secrets and name=value logins, folds lines and caps the length', () => {
    expect(scrub('turn user=abc login abcdef1234 here', ['abcdef1234'])).toBe('turn user=abc login [hidden] here');
    expect(scrub('{"username":"bob","credential":"xyz"} password=hunter2')).toBe('{"username":"[hidden]","credential":"[hidden]"} password=[hidden]');
    expect(scrub('a\n  b')).toBe('a | b');
    expect(scrub('x'.repeat(900))).toHaveLength(DIAG.maxLineChars);
  });
});

describe('DiagBook', () => {
  it('counts repeated errors on their first line (numbers ignored) and back-to-back repeats of other lines', () => {
    const b = new DiagBook(T0, 'UTC');
    b.add(T0 + 100, 'err', 'boom at frame 12');
    b.add(T0 + 200, 'game', 'player down');
    b.add(T0 + 300, 'err', 'boom at frame 13');
    b.add(T0 + 400, 'ui', 'screen: pause');
    b.add(T0 + 500, 'ui', 'screen: pause');
    const lines = b.session.chunks[0]!.lines;
    expect(lines.map((l) => l.m)).toEqual(['boom at frame 12', 'player down', 'screen: pause']);
    expect(lines[0]!.n).toBe(2);
    expect(lines[0]!.tl).toBe(300);
    expect(lines[2]!.n).toBe(2);
    expect(b.session.stats.errors).toBe(2);
  });

  it('cuts a burst and says how many lines were skipped', () => {
    const b = new DiagBook(T0, 'UTC');
    for (let i = 0; i < DIAG.burstPerSec + 25; i++) b.add(T0 + 10, 'game', `event ${String.fromCharCode(65 + (i % 26))}${i}`);
    expect(b.lineCount).toBe(DIAG.burstPerSec);
    expect(b.session.stats.suppressed).toBe(25);
    b.add(T0 + 1500, 'game', 'later');
    const all = b.session.chunks.flatMap((c) => c.lines);
    expect(all.at(-2)!.m).toBe('25 more lines were skipped (too many at once)');
    expect(all.at(-1)!.m).toBe('later');
  });

  it('blocks lines, reports changed blocks, and drops the oldest block after the first past the session cap', () => {
    const b = new DiagBook(T0, 'UTC');
    const long = 'y'.repeat(400);
    let t = T0;
    for (let i = 0; i < 2500; i++) {
      t += 100;
      b.add(t, 'game', `${i} ${long}`);
    }
    const s = b.session;
    expect(s.chunks[0]!.id).toBe(0);
    expect(s.chunks[0]!.lines[0]!.m.startsWith('0 ')).toBe(true);
    expect(s.dropped).toBeGreaterThan(0);
    expect(metaOf(s).bytes).toBeLessThanOrEqual(DIAG.sessionCapBytes);
    const d = b.takeDirty();
    expect(d.removed.length).toBeGreaterThan(0);
    expect(d.chunks.map((c) => c.id)).toContain(s.chunks.at(-1)!.id);
    expect(b.isDirty).toBe(false);
    // a repeat of an old error marks its block again
    const b2 = new DiagBook(T0, 'UTC');
    b2.add(T0 + 1, 'err', 'old');
    for (let i = 0; i < DIAG.chunkLines + 5; i++) b2.add(T0 + 2000 * (i + 1), 'game', `g${i}`);
    b2.takeDirty();
    b2.add(T0 + 999_999, 'err', 'old');
    expect(b2.takeDirty().chunks.map((c) => c.id)).toEqual([0]);
  });
});

describe('FramePerf', () => {
  it('averages, takes the 1% low and the worst frame, counts long frames, then resets', () => {
    const f = new FramePerf(1000);
    const out: PerfSample = { frames: 0, fps: 0, low1Fps: 0, worstMs: 0, long: 0, cpuMs: 0 };
    expect(f.take(out)).toBe(false);
    for (let i = 0; i < 980; i++) f.push(10, 4);
    for (let i = 0; i < 20; i++) f.push(100, 4);
    expect(f.take(out)).toBe(true);
    expect(out.frames).toBe(1000);
    expect(out.fps).toBeCloseTo(1_000_000 / 11_800, 3);
    expect(out.low1Fps).toBeCloseTo(10, 5);
    expect(out.worstMs).toBe(100);
    expect(out.long).toBe(20);
    expect(out.cpuMs).toBe(4);
    expect(f.take(out)).toBe(false);
  });
});

describe('rotation and stored data', () => {
  const meta = (i: number, bytes = 1000): DiagMeta => ({ ...metaOf(new DiagBook(T0 + i * 1000, 'UTC', `s${i}`).session), bytes });
  it('keeps the newest sessions under the count and byte caps', () => {
    const r = rotate([meta(1), meta(5), meta(3), meta(2), meta(4), meta(6)]);
    expect(r.keep.map((m) => m.id)).toEqual(['s6', 's5', 's4', 's3']);
    expect(r.drop.map((m) => m.id).sort()).toEqual(['s1', 's2']);
    const big = rotate([meta(1, 350_000), meta(2, 350_000), meta(3, 350_000)]);
    expect(big.keep.map((m) => m.id)).toEqual(['s3']);
  });

  it('sanitises what it reads back', () => {
    expect(sanitizeMeta({ id: '../evil', started: 1 })).toBeNull();
    expect(sanitizeMeta('x')).toBeNull();
    const m = sanitizeMeta({ id: 'ok-1', started: 5, stats: { errors: -3, fails: ['a', 7] }, facts: { Game: '1.0', bad: 3 }, chunkIds: [0, 1.5, 2] })!;
    expect(m.stats.errors).toBe(0);
    expect(m.stats.fails).toEqual(['a']);
    expect(m.facts).toEqual({ Game: '1.0' });
    expect(m.chunkIds).toEqual([0, 2]);
    expect(sanitizeLines([{ t: 1, k: 'err', m: 'x', n: 3, tl: 9 }, { t: 2, k: 'nope', m: 'y' }, null])).toEqual([{ t: 1, k: 'err', m: 'x', n: 3, tl: 9 }]);
  });
});

describe('the copied text', () => {
  const session = (start: number, n: number, tag: string) => {
    const b = new DiagBook(start, 'Test/Zone, UTC+00:00', `id${start}`);
    b.session.facts.Game = '4.139.0 (build abc1234)';
    b.session.facts.Device = 'Windows, Edge 130';
    for (let i = 0; i < n; i++) b.add(start + i * 2000, i % 10 === 0 ? 'perf' : i % 7 === 0 ? 'err' : 'game', `${tag} line ${i} ${'z'.repeat(60)}`);
    return b.session;
  };

  it('starts with the summary, then this session, then the older ones', () => {
    const cur = session(T0, 30, 'now');
    cur.stats.attempts = 2;
    cur.stats.attemptsOk = 1;
    cur.stats.fails = ['no network path'];
    cur.stats.low1Fps = 41;
    cur.stats.worstFrameMs = 180;
    const txt = diagText([cur, session(T0 - 86_400_000, 10, 'old')], { now: T0 + 60_000 });
    const lines = txt.split('\n');
    expect(lines[0]).toMatch(/Night Shift diagnostics log/);
    expect(lines.indexOf('--- Summary ---')).toBeLessThan(5);
    expect(txt).toMatch(/Game: 4\.139\.0 \(build abc1234\)/);
    expect(txt).toMatch(/Performance: worst 1% low 41 fps.*longest frame 180 ms/);
    expect(txt).toMatch(/Connection: 2 attempts: 1 direct, 0 via relay, 1 failed \(no network path\)/);
    expect(txt).toMatch(/Trimmed to fit: nothing/);
    expect(txt.indexOf('=== This session')).toBeLessThan(txt.indexOf('=== Older session 2'));
    expect(txt).toMatch(/^ +0\.0s perf {2}now line 0 /m);
    expect(txt).toMatch(/^ +2\.0s game {2}now line 1 /m);
  });

  it('trims older sessions first, then this session\'s middle, and says what', () => {
    const cur = session(T0, 600, 'now');
    const olds = [session(T0 - 1e8, 600, 'old1'), session(T0 - 2e8, 600, 'old2')];
    const cap = 40_000;
    const txt = diagText([cur, ...olds], { now: T0, cap });
    expect(txt.length).toBeLessThanOrEqual(cap);
    expect(txt).toMatch(/Trimmed to fit: all older sessions' lines .*; \d+ of this session's older lines/);
    expect(txt).toMatch(/now line 0 /);
    expect(txt).toMatch(/now line 599 /);
    expect(txt).toMatch(/lines from this session's middle left out to fit/);
    // a looser cap only drops the older sessions' perf / menu lines
    const full = diagText([cur, ...olds], { now: T0, cap: 1e9 });
    expect(full).toMatch(/Trimmed to fit: nothing/);
    const mild = diagText([cur, ...olds], { now: T0, cap: full.length - 1000 });
    expect(mild).toMatch(/Trimmed to fit: older sessions' performance, menu and note lines \(\d+ lines\)$/m);
    expect(mild).toMatch(/now line 300 /);
  });

  it('never carries the relay login or an address', () => {
    const log = new DiagLog(T0);
    log.addSecrets(RELAY_SERVERS.flatMap((s) => [s.username, s.credential]));
    for (const s of RELAY_SERVERS) log.add('err', `ice failed ${String(s.urls)} ${s.username} ${s.credential} from 203.0.113.9`);
    log.fact('Page', '192.168.0.10:5173/ flags ?net=local');
    const txt = log.text(T0 + 1000);
    for (const s of RELAY_SERVERS) {
      expect(txt).not.toContain(s.username!);
      expect(txt).not.toContain(s.credential!);
    }
    expect(txt).not.toMatch(/203\.0\.113\.9|192\.168\.0\.10/);
    expect(txt).toMatch(/\[hidden\]/);
  });
});

describe('helpers', () => {
  it('names the device briefly', () => {
    expect(shortDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68')).toBe('Windows, Edge 130');
    expect(shortDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')).toBe('iPhone, Safari 18.0');
    expect(shortDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36')).toBe('Android, Chrome 130');
  });

  it('lists the settings that changed', () => {
    expect(digestDiff('preset=high fov=70 aa=on', 'preset=low fov=70 aa=on')).toBe('preset=low');
    expect(digestDiff('a=1', 'a=1')).toBe('');
  });
});

describe('co-op link lines (pushed from src/net)', () => {
  it('reads candidate types and counters, never an address', () => {
    const stats = new Map<string, unknown>([
      ['T', { type: 'transport', selectedCandidatePairId: 'P' }],
      ['P', { type: 'candidate-pair', localCandidateId: 'L', remoteCandidateId: 'R', bytesSent: 2048, bytesReceived: 4096, packetsSent: 10, packetsReceived: 20, currentRoundTripTime: 0.05 }],
      ['L', { type: 'local-candidate', candidateType: 'relay', protocol: 'udp', relayProtocol: 'tls', address: '198.51.100.7', port: 3478 }],
      ['R', { type: 'remote-candidate', candidateType: 'srflx', protocol: 'udp', address: '203.0.113.5', port: 5000 }],
      ['D', { type: 'data-channel', messagesSent: 7, messagesReceived: 9 }],
    ]);
    const d = linkDetail(stats)!;
    expect(d).toEqual({ local: 'relay', remote: 'srflx', protocol: 'udp/tls', bytesSent: 2048, bytesReceived: 4096, packetsSent: 10, packetsReceived: 20, msgsSent: 7, msgsReceived: 9 });
    expect(JSON.stringify(d)).not.toMatch(/198\.51|203\.0|3478|5000/);
  });

  it('writes one line per 10 s with the path, rates and message counts', () => {
    let now = 0;
    const out: string[] = [];
    const nd = new NetDiag(() => now, (l) => out.push(l));
    const det = (b: number) => ({ local: 'host', remote: 'srflx', protocol: 'udp', bytesSent: b, bytesReceived: b * 2, packetsSent: b / 100, packetsReceived: b / 50, msgsSent: 0, msgsReceived: 0 });
    nd.sample({ kind: 'direct', rttMs: 40, detail: det(0) });
    for (let i = 0; i < 200; i++) nd.count({ t: 'snap' }, false);
    for (let i = 0; i < 100; i++) nd.count({ t: 'in' }, true);
    now = 5000;
    nd.sample({ kind: 'direct', rttMs: 41, detail: det(5000) });
    expect(out).toHaveLength(1);
    now = 10_000;
    nd.sample({ kind: 'direct', rttMs: 45, detail: det(102_400) });
    expect(out).toHaveLength(2);
    expect(out[1]).toMatch(/^link direct, round trip 45 ms, host -> srflx over udp, sent 10\.0 kB\/s 102 pkt\/s, received 20\.0 kB\/s 205 pkt\/s, game messages out 10\.0\/s in 20\.0\/s \(<snap 20\.0 >in 10\.0\)$/);
  });
});

describe('DiagLog storage (IndexedDB)', () => {
  const logs: DiagLog[] = [];
  afterEach(() => {
    for (const l of logs) l.stop();
    logs.length = 0;
  });
  // (a clock that moves 100 ms a line: under the burst cap)
  const fresh = (now: number): DiagLog => {
    let t = now;
    const l = new DiagLog(now, () => (t += 100));
    logs.push(l);
    return l;
  };

  it('saves blocks, finds older sessions after a reload, rotates and clears', async () => {
    resetDbCache();
    const a = fresh(T0);
    a.fact('Game', '1.0');
    await a.start();
    for (let i = 0; i < DIAG.chunkLines + 10; i++) a.add('game', `first session ${i}`);
    await a.flush();
    const keys = await dbKeys('kv');
    expect(keys).toContain(`${META_PREFIX}${a.session.id}`);
    expect(keys.filter((k) => k.startsWith(`${CHUNK_PREFIX}${a.session.id}:`))).toHaveLength(2);
    // the next page load
    const b = fresh(T0 + 60_000);
    await b.start();
    b.add('err', 'second session error');
    await b.flush();
    const txt = await b.fullText(T0 + 70_000);
    expect(txt).toMatch(/second session error/);
    expect(txt).toMatch(/first session 0\b/);
    expect(txt).toMatch(/first session 209/);
    expect(txt).toMatch(/Older sessions on this device: 1/);
    // more loads than the cap: the oldest go, with their blocks
    for (let i = 2; i <= DIAG.maxSessions + 1; i++) {
      const c = fresh(T0 + i * 60_000);
      await c.start();
      c.add('game', `session ${i}`);
      await c.flush();
    }
    const last = fresh(T0 + 100 * 60_000);
    await last.start();
    await last.flush();
    const k2 = await dbKeys('kv');
    expect(k2.filter((k) => k.startsWith(META_PREFIX))).toHaveLength(DIAG.maxSessions);
    expect(k2.some((k) => k.includes(a.session.id))).toBe(false);
    await last.clear();
    const k3 = (await dbKeys('kv')).filter((k) => k.startsWith('diag:'));
    expect(k3.every((k) => k.includes(last.session.id))).toBe(true);
    expect(last.text()).toMatch(/log cleared on this device/);
  });
});
