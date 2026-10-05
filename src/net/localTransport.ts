import type { Transport } from './transport';

/**
 * Same-device transport over BroadcastChannel (several tabs/windows of the game). Used for
 * development and automated tests where WebRTC signalling relays are unreachable. `?net=local`.
 */
export function createLocalTransport(roomId: string): Transport {
  const selfId = `L${Math.random().toString(36).slice(2, 10)}`;
  const ch = new BroadcastChannel(`ss-room-${roomId}`);
  const peers = new Map<string, number>();
  type Wire = { k: 'hi' | 'bye' | 'msg' | 'ack'; from: string; to?: string; data?: string };
  const post = (w: Wire): void => ch.postMessage(w);
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
      try {
        t.onMessage?.(JSON.parse(w.data), w.from);
      } catch {
        /* ignore */
      }
    }
  };
  // presence heartbeat; peers silent for 4 s are considered gone
  const beat = setInterval(() => {
    post({ k: 'hi', from: selfId });
    const now = Date.now();
    for (const [id, last] of peers) {
      if (now - last > 4000) {
        peers.delete(id);
        t.onPeerLeave?.(id);
      }
    }
  }, 1000);
  setTimeout(() => post({ k: 'hi', from: selfId }), 0);
  return t;
}
