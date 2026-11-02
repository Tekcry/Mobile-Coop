import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LinkMonitor, LINK_POLL_MS, READ_FRESH_MS, RETRY_FAIL_GAP_MS, STATS_SLOW_MS } from '../src/net/linkMonitor';
import type { AttemptRecord } from '../src/net/attemptLog';
import type { LinkSample } from '../src/net/linkStatus';
import type { Transport } from '../src/net/transport';

// (co-op relay fix) the readout and attempt log of one room, on a fake transport
function fake() {
  const state = { peers: [] as string[], sample: null as LinkSample | null, reads: 0 };
  const t: Transport = {
    selfId: 'me',
    onMessage: null,
    onPeerJoin: null,
    onPeerLeave: null,
    onJoinError: null,
    send() {},
    peers: () => [...state.peers],
    leave: async () => {},
    linkStats: async (id) => {
      state.reads++;
      return state.peers.includes(id) ? state.sample : null;
    },
  };
  return { t, state };
}

/** The attempt log as the sink builds it (a replaced line is put in place). */
function sink() {
  const log: AttemptRecord[] = [];
  const put = (r: AttemptRecord, prev: AttemptRecord | null): void => {
    const i = prev ? log.indexOf(prev) : -1;
    if (i >= 0) log[i] = r;
    else log.push(r);
  };
  return { log, put };
}

const UNREACHABLE = 'could not connect to peer X after exchanging SDP; check that your TURN server URLs and credentials are reachable by both peers';

describe('LinkMonitor', () => {
  let now = 0;
  beforeEach(() => {
    vi.useFakeTimers();
    now = 10_000;
  });
  afterEach(() => vi.useRealTimers());

  it('joiner: connecting, then connected via relay with its time to connect, logged once', async () => {
    const { t, state } = fake();
    const { log, put } = sink();
    const m = new LinkMonitor(t, 'client', put, () => now);
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

  it('joiner: one join error is a retry; a retry that gets through connects and logs ok', async () => {
    const { t, state } = fake();
    const { log, put } = sink();
    const m = new LinkMonitor(t, 'client', put, () => now);
    const failed: string[] = [];
    m.onFailed = (f) => failed.push(f);
    t.onJoinError?.(UNREACHABLE);
    expect(m.text).toBe('Connecting... (first try failed, retrying)');
    expect(m.firstJoinError).toBe('unreachable');
    expect(failed).toEqual([]);
    expect(log).toEqual([]);
    state.peers = ['H'];
    state.sample = { kind: 'relay', rttMs: 30 };
    await m.poll();
    expect(m.text).toBe('Connected - via relay, 30 ms');
    expect(log.map((r) => r.result)).toEqual(['ok']);
    m.stop();
  });

  it('joiner: fails on 2+ join errors at least 6 s apart, with the first reason', () => {
    const { t } = fake();
    const m = new LinkMonitor(t, 'client', () => {}, () => now);
    const failed: string[] = [];
    m.onFailed = (f) => failed.push(f);
    t.onJoinError?.(UNREACHABLE);
    now += 2000;
    t.onJoinError?.('incorrect room password when decrypting offer');
    expect(failed).toEqual([]);
    now += RETRY_FAIL_GAP_MS;
    t.onJoinError?.('incorrect room password when decrypting offer');
    expect(failed).toEqual(['unreachable']);
    m.stop();
  });

  it('host: join errors keep it waiting, each one logged and told; only session members count as the partner', async () => {
    const { t, state } = fake();
    const { log, put } = sink();
    const members = new Set<string>();
    const m = new LinkMonitor(t, 'host', put, () => now, (id) => members.has(id));
    let told = 0;
    m.onFailed = () => told++;
    t.onJoinError?.(UNREACHABLE);
    t.onJoinError?.(UNREACHABLE);
    expect(m.text).toBe('Waiting for your partner');
    expect(told).toBe(2);
    expect(log.map((r) => [r.role, r.result])).toEqual([
      ['host', 'unreachable'],
      ['host', 'unreachable'],
    ]);
    // a transport peer the session refused (another version, a full room) is not the partner
    state.peers = ['REFUSED'];
    state.sample = { kind: 'direct', rttMs: 20 };
    await m.poll();
    expect(m.text).toBe('Waiting for your partner');
    expect(log).toHaveLength(2);
    // a member is
    state.peers = ['REFUSED', 'C1'];
    members.add('C1');
    await m.poll();
    expect(m.text).toBe('Connected - direct, 20 ms');
    expect(log.map((r) => [r.method, r.ms])).toEqual([
      ['none', null],
      ['none', null],
      ['direct', null],
    ]);
    // the member leaves: back to waiting; the next partner is a new line
    members.delete('C1');
    await m.poll();
    expect(m.text).toBe('Waiting for your partner');
    members.add('C2');
    state.peers = ['C2'];
    state.sample = { kind: 'relay', rttMs: 140 };
    await m.poll();
    expect(log).toHaveLength(4);
    m.note('version');
    expect(log[4]).toMatchObject({ role: 'host', result: 'version' });
    m.stop();
  });

  it('fail(): shown, held, logged once, and in place of the attempt ok line', async () => {
    const { t, state } = fake();
    const { log, put } = sink();
    const m = new LinkMonitor(t, 'client', put, () => now);
    state.peers = ['H'];
    state.sample = { kind: 'direct', rttMs: 10 };
    await m.poll();
    expect(log.map((r) => r.result)).toEqual(['ok']);
    m.fail('version');
    m.fail('timeout');
    await m.poll();
    expect(m.text).toBe('Failed - different game versions');
    expect(log.map((r) => r.result)).toEqual(['version']);
    m.stop();
  });

  it('after the attempt is logged, stats are read every 5 s unless the readout is on screen', async () => {
    const { t, state } = fake();
    const m = new LinkMonitor(t, 'client', () => {}, () => now);
    state.peers = ['H'];
    state.sample = { kind: 'direct', rttMs: 10 };
    await m.poll();
    expect(state.reads).toBe(1);
    // nobody reads the text: the next polls skip the stats until STATS_SLOW_MS
    now += READ_FRESH_MS + 1;
    await m.poll();
    expect(STATS_SLOW_MS).toBeGreaterThan(READ_FRESH_MS + 1);
    expect(state.reads).toBe(1);
    now += STATS_SLOW_MS;
    await m.poll();
    expect(state.reads).toBe(2);
    // the pause menu reads it every second: every poll reads the stats
    void m.text;
    now += LINK_POLL_MS;
    await m.poll();
    expect(state.reads).toBe(3);
    m.stop();
  });
});
