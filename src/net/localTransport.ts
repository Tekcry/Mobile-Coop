import type { Transport } from './transport';
import { NetSim, netSimPreset } from './netSim';

/**
 * Same-device transport over BroadcastChannel (several tabs/windows of the game). Used for
 * development and automated tests where WebRTC signalling relays are unreachable. `?net=local`.
 * (locomotion step 20b, D11) `&netsim=typical` delays incoming game messages through `NetSim` (reliable, ordered, as
 * the shipped transport); presence (hi / ack / bye) is not delayed. Only this transport reads the param.
 */
/** The heartbeat drop limit (ms): a peer silent this long is gone. */
export const LOCAL_DROP_MS = 60000;

/**
 * (coop-real A6) The test-only `&netdrop=<s>` on `?net=local`: the drop limit in seconds (1-60), so a frozen tab drops in
 * a few seconds as a real WebRTC peer does. Missing, not a number or out of range: the 60 s default.
 */
export function parseNetDrop(v: string | null | undefined): number {
  if (v === null || v === undefined || v.trim() === '') return LOCAL_DROP_MS;
  const s = Number(v);
  if (!Number.isFinite(s) || s < 1 || s * 1000 > LOCAL_DROP_MS) return LOCAL_DROP_MS;
  return Math.round(s * 1000);
}

export function createLocalTransport(roomId: string): Transport {
  const selfId = `L${Math.random().toString(36).slice(2, 10)}`;
  const ch = new BroadcastChannel(`ss-room-${roomId}`);
  const peers = new Map<string, number>();
  type Wire = { k: 'hi' | 'bye' | 'msg' | 'ack'; from: string; to?: string; data?: string };
  // a send after leave() (a delayed NetSim delivery or a teardown reply) is dropped: a closed channel throws
  let closed = false;
  const post = (w: Wire): void => {
    if (!closed) ch.postMessage(w);
  };
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  const preset = netSimPreset(q?.get('netsim'));
  const sim = preset ? new NetSim(preset, Number(q?.get('netseed')) || 1) : null;
  const dropMs = parseNetDrop(q?.get('netdrop'));
  // the e2e report reads its counters (only with ?netsim=)
  if (sim) (globalThis as { __netsim?: NetSim }).__netsim = sim;
  const t: Transport = {
    selfId,
    onMessage: null,
    onPeerJoin: null,
    onPeerLeave: null,
    send(msg, to) {
      post({ k: 'msg', from: selfId, to, data: JSON.stringify(msg) });
    },
    peers: () => [...peers.keys()],
    async leave() {
      post({ k: 'bye', from: selfId });
      closed = true;
      clearInterval(beat);
      ch.close();
    },
  };
  const seen = (id: string): void => {
    const known = peers.has(id);
    peers.set(id, Date.now());
    if (!known) t.onPeerJoin?.(id);
  };
  ch.onmessage = (ev: MessageEvent<Wire>) => {
    const w = ev.data;
    if (!w || w.from === selfId) return;
    if (w.to && w.to !== selfId) return;
    if (w.k === 'hi') {
      seen(w.from);
      post({ k: 'ack', from: selfId, to: w.from });
    } else if (w.k === 'ack') {
      seen(w.from);
    } else if (w.k === 'bye') {
      if (peers.delete(w.from)) t.onPeerLeave?.(w.from);
    } else if (w.k === 'msg' && typeof w.data === 'string') {
      seen(w.from);
      const data = w.data;
      const deliver = (): void => {
        try {
          t.onMessage?.(JSON.parse(data), w.from);
        } catch {
          /* ignore */
        }
      };
      if (!sim) deliver();
      else {
        const now = performance.now();
        setTimeout(deliver, sim.deliverAt(w.from, now) - now);
      }
    }
  };
  // presence heartbeat; peers silent for 60 s are considered gone (a page loading a map under software GL - the tests
  // on a small VM - can block its main thread for well over 15 s, which dropped the host from a waiting lobby: the
  // e2e-coop "Host left" stall, marlow-bays R). A peer that leaves on purpose says bye at once. (`&netdrop=`: tests)
  const beat = setInterval(() => {
    post({ k: 'hi', from: selfId });
    const now = Date.now();
    for (const [id, last] of peers) {
      if (now - last > dropMs) {
        peers.delete(id);
        t.onPeerLeave?.(id);
      }
    }
  }, 1000);
  setTimeout(() => post({ k: 'hi', from: selfId }), 0);
  return t;
}
