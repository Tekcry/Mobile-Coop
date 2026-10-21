import { describe, expect, it, vi } from 'vitest';
import type { Transport } from '../src/net/transport';
import { DirectoryBrowser, DirectoryPoster, NOTICE_EVERY_S, NOTICE_TTL_S, parseDirMsg, type RoomNotice } from '../src/net/roomDirectory';

/** (server browser) A fake relay: every transport made on it hears every other (the directory room). */
function relay() {
  const peers = new Map<string, Transport & { deliver(m: unknown, from: string): void }>();
  const make = (id: string) => {
    const t = {
      selfId: id,
      onMessage: null as Transport['onMessage'],
      onPeerJoin: null as Transport['onPeerJoin'],
      onPeerLeave: null as Transport['onPeerLeave'],
      send(msg: unknown, to?: string) {
        const raw = JSON.parse(JSON.stringify(msg)) as unknown;
        for (const [pid, p] of peers) if (pid !== id && (!to || to === pid)) p.deliver(raw, id);
      },
      deliver(m: unknown, from: string) {
        t.onMessage?.(m, from);
      },
      peers: () => [...peers.keys()].filter((p) => p !== id),
      async leave() {
        peers.delete(id);
        for (const p of peers.values()) p.onPeerLeave?.(id);
      },
    };
    peers.set(id, t);
    // (like a real room: the others hear the newcomer once its handlers are set, on the next task)
    queueMicrotask(() => {
      for (const [pid, p] of peers) if (pid !== id) p.onPeerJoin?.(id);
    });
    return t;
  };
  return { make };
}

const V = '4.42.0/p27';
const room = (over: Partial<RoomNotice> = {}): RoomNotice => ({ code: 'ABCDE', map: 'ctcourse', mode: 'course', v: V, players: 1, cap: 2, host: 'Wren', ...over });
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('room directory (server browser prototype)', () => {
  it('validates notices: bad codes, versions, counts and names are dropped or cleaned', () => {
    expect(parseDirMsg({ t: 'room', ...room() })).toMatchObject({ code: 'ABCDE', players: 1, cap: 2 });
    expect(parseDirMsg({ t: 'room', ...room({ code: 'abc' }) })).toBeNull();
    expect(parseDirMsg({ t: 'room', ...room({ players: 99 }) })).toBeNull();
    expect(parseDirMsg({ t: 'room', ...room({ v: '<script>' }) })).toBeNull();
    expect(parseDirMsg({ t: 'room', ...room({ host: '<img onerror=x>Mallory-the-long-name' }) })).toMatchObject({ host: 'img onerrorxMall' });
    expect(parseDirMsg({ t: 'gone', code: 'ABCDE' })).toEqual({ t: 'gone', code: 'ABCDE' });
    expect(parseDirMsg({ t: 'nope' })).toBeNull();
  });

  it('a browser lists a public room of its version at once, drops it on gone, and never lists another version', async () => {
    const r = relay();
    let n: RoomNotice | null = room();
    const host = new DirectoryPoster(r.make('H'), () => n);
    const old = new DirectoryPoster(r.make('O'), () => room({ code: 'FGHJK', v: '4.30.0/p25' }));
    const b = new DirectoryBrowser(r.make('B'), V);
    await flush();
    expect(b.list().map((x) => x.code)).toEqual(['ABCDE']);
    // full: taken off at the next post
    n = room({ players: 2 });
    host.post();
    expect(b.list()).toEqual([]);
    n = room();
    host.post();
    expect(b.list().length).toBe(1);
    await host.close();
    expect(b.list()).toEqual([]);
    await old.close();
    await b.close();
  });

  it('a host that goes private or full sends gone; a notice not refreshed expires', async () => {
    vi.useFakeTimers();
    try {
      let now = 1_000_000;
      const r = relay();
      let pub = true;
      const host = new DirectoryPoster(r.make('H'), () => (pub ? room() : null));
      const b = new DirectoryBrowser(r.make('B'), V, () => now);
      await vi.runOnlyPendingTimersAsync();
      expect(b.list().length).toBe(1);
      // refreshed every NOTICE_EVERY_S: still listed past the TTL
      now += NOTICE_EVERY_S * 1000;
      vi.advanceTimersByTime(NOTICE_EVERY_S * 1000);
      now += NOTICE_EVERY_S * 1000;
      vi.advanceTimersByTime(NOTICE_EVERY_S * 1000);
      expect(b.list().length).toBe(1);
      pub = false;
      host.post();
      expect(b.list()).toEqual([]);
      // a host that vanished without a gone: the browser drops it after the TTL
      const ghost = r.make('G');
      ghost.send({ t: 'room', ...room({ code: 'QRSTU' }) });
      expect(b.list().map((x) => x.code)).toEqual(['QRSTU']);
      now += (NOTICE_TTL_S + 1) * 1000;
      expect(b.list()).toEqual([]);
      await host.close();
      await b.close();
    } finally {
      vi.useRealTimers();
    }
  });
});
