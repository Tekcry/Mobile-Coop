import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LinkMonitor, LINK_POLL_MS } from '../src/net/linkMonitor';
import type { AttemptRecord } from '../src/net/attemptLog';
import type { LinkSample } from '../src/net/linkStatus';
import type { Transport } from '../src/net/transport';

// (co-op relay fix) the readout and attempt log of one room, on a fake transport
function fake() {
  const state = { peers: [] as string[], sample: null as LinkSample | null };
  const t: Transport = {
    selfId: 'me',
    onMessage: null,
    onPeerJoin: null,
    onPeerLeave: null,
    onJoinError: null,
    send() {},
    peers: () => [...state.peers],
    leave: async () => {},
    linkStats: async (id) => (state.peers.includes(id) ? state.sample : null),
  };
  return { t, state };
}

describe('LinkMonitor', () => {
  let now = 0;
  beforeEach(() => {
    vi.useFakeTimers();
    now = 10_000;
  });
  afterEach(() => vi.useRealTimers());

  it('joiner: connecting, then connected via relay with its time to connect, logged once', async () => {
    const { t, state } = fake();
    const log: AttemptRecord[] = [];
    const m = new LinkMonitor(t, 'client', (r) => log.push(r), () => now);
    const changes: string[] = [];
    m.onChange = () => changes.push(m.text);
    expect(m.text).toBe('Connecting...');
    now += 3200;
    state.peers = ['H'];
    await m.poll();
    // connected, no stats yet: nothing logged
    expect(m.text).toBe('Connected');
    expect(log).toEqual([]);
    state.sample = { kind: 'relay', rttMs: 118 };
    now += 1000;
    await m.poll();
    expect(m.text).toBe('Connected - via relay, 118 ms');
    expect(log).toEqual([{ at: now, role: 'client', method: 'relay', ms: 3200, result: 'ok' }]);
    state.sample = { kind: 'relay', rttMs: 121 };
    await m.poll();
    expect(log).toHaveLength(1);
    expect(changes).toEqual(['Connected', 'Connected - via relay, 118 ms', 'Connected - via relay, 121 ms']);
    m.stop();
  });

  it('the timer polls; stop ends it and lets go of onJoinError', async () => {
    const { t, state } = fake();
    const m = new LinkMonitor(t, 'host', () => {}, () => now);
    expect(m.text).toBe('Waiting for your partner');
    expect(t.onJoinError).toBeTypeOf('function');
    state.peers = ['C'];
    state.sample = { kind: 'direct', rttMs: 40 };
    await vi.advanceTimersByTimeAsync(LINK_POLL_MS + 1);
    expect(m.text).toBe('Connected - direct, 40 ms');
    m.stop();
    expect(t.onJoinError).toBeNull();
    state.sample = { kind: 'direct', rttMs: 90 };
    await vi.advanceTimersByTimeAsync(LINK_POLL_MS * 3);
    expect(m.text).toBe('Connected - direct, 40 ms');
  });

  it('a join error with no partner: failed, logged, onFailed; a later connection is a new attempt', async () => {
    const { t, state } = fake();
    const log: AttemptRecord[] = [];
    const m = new LinkMonitor(t, 'client', (r) => log.push(r), () => now);
    const failed: string[] = [];
    m.onFailed = (f) => failed.push(f);
    t.onJoinError?.('could not connect to peer X after exchanging SDP; check that your TURN server URLs and credentials are reachable by both peers');
    expect(m.text).toBe('Failed - no network path to your partner');
    expect(failed).toEqual(['unreachable']);
    expect(log).toEqual([{ at: now, role: 'client', method: 'none', ms: null, result: 'unreachable' }]);
    // a retry got through: connected, logged as its own (direct) attempt
    state.peers = ['H'];
    state.sample = { kind: 'direct', rttMs: 30 };
    await m.poll();
    await m.poll();
    expect(m.text).toBe('Connected - direct, 30 ms');
    expect(log.map((r) => r.result)).toEqual(['unreachable', 'ok']);
    m.stop();
  });

  it('host: each partner connection logs one line (no time to connect); a partner leaving goes back to waiting', async () => {
    const { t, state } = fake();
    const log: AttemptRecord[] = [];
    const m = new LinkMonitor(t, 'host', (r) => log.push(r), () => now);
    state.peers = ['C1'];
    state.sample = { kind: 'direct', rttMs: 20 };
    await m.poll();
    state.peers = [];
    await m.poll();
    expect(m.text).toBe('Waiting for your partner');
    state.peers = ['C2'];
    state.sample = { kind: 'relay', rttMs: 140 };
    await m.poll();
    expect(log.map((r) => [r.method, r.ms])).toEqual([
      ['direct', null],
      ['relay', null],
    ]);
    // a join error while a partner is connected: logged, the readout stays on the partner, no onFailed
    let called = false;
    m.onFailed = () => (called = true);
    t.onJoinError?.('could not connect to peer Z after exchanging SDP');
    expect(m.text).toBe('Connected - via relay, 140 ms');
    expect(called).toBe(false);
    expect(log).toHaveLength(3);
    m.stop();
  });

  it('fail(): shown and logged once, and held (a poll does not overwrite it)', async () => {
    const { t, state } = fake();
    const log: AttemptRecord[] = [];
    const m = new LinkMonitor(t, 'client', (r) => log.push(r), () => now);
    state.peers = ['H'];
    m.fail('version');
    m.fail('timeout');
    state.sample = { kind: 'direct', rttMs: 10 };
    await m.poll();
    expect(m.text).toBe('Failed - different game versions');
    expect(log.map((r) => r.result)).toEqual(['version']);
    m.stop();
  });
});
