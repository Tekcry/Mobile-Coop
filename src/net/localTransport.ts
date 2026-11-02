import type { Transport } from './transport';
import { BLOCKED_JOIN_ERROR_MS, BLOCKED_RETRY_MS, NetSim, netSimPreset } from './netSim';

/**
 * Same-device transport over BroadcastChannel (several tabs/windows of the game). Used for
 * development and automated tests where WebRTC signalling relays are unreachable. `?net=local`.
 * (locomotion step 20b, D11) `&netsim=typical` delays incoming game messages through `NetSim` (reliable, ordered, as
 * the shipped transport); presence (hi / ack / bye) is not delayed. Only this transport reads the param.
 * (co-op relay fix) `linkStats` reads "same device" (with `&netsim=`, its round trip; `relay` reads as via relay);
 * `&netsim=blocked` hears the other tabs but takes nothing from them, and reports a join error after
 * `BLOCKED_JOIN_ERROR_MS`, then every `BLOCKED_RETRY_MS`, as Trystero's retries do when no path works.
 */
export function createLocalTransport(roomId: string): Transport {
  const selfId = `L${Math.random().toString(36).slice(2, 10)}`;
  const ch = new BroadcastChannel(`ss-room-${roomId}`);
  const peers = new Map<string, number>();
  type Wire = { k: 'hi' | 'bye' | 'msg' | 'ack'; from: string; to?: string; data?: string };
  // a send after leave() (a delayed NetSim delivery or a teardown reply) is dropped: a closed channel throws
  let closed = false;
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  const preset = netSimPreset(q?.get('netsim'));
  // (a blocked page sends nothing either: the other side never sees it, as a link that never opens)
  const blocked = preset?.blocked === true;
  const post = (w: Wire): void => {
    if (!closed && !blocked) ch.postMessage(w);
  };
  const sim = preset && !blocked ? new NetSim(preset, Number(q?.get('netseed')) || 1) : null;
  // the e2e report reads its counters (only with ?netsim=)
  if (sim) (globalThis as { __netsim?: NetSim }).__netsim = sim;
  let joinErrT: ReturnType<typeof setTimeout> | null = null;
  const t: Transport = {
    selfId,
    onMessage: null,
    onPeerJoin: null,
    onPeerLeave: null,
    onJoinError: null,
    send(msg, to) {
      post({ k: 'msg', from: selfId, to, data: JSON.stringify(msg) });
    },
    peers: () => [...peers.keys()],
    async leave() {
      post({ k: 'bye', from: selfId });
      closed = true;
      clearInterval(beat);
      if (joinErrT) clearTimeout(joinErrT);
      ch.close();
    },
    linkStats(id) {
      if (!peers.has(id)) return Promise.resolve(null);
      return Promise.resolve({ kind: preset?.relay ? 'relay' : 'local', rttMs: preset ? 2 * preset.oneWayMs : null });
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
    if (blocked) {
      // found through "signalling", no path: one join error per first contact, as Trystero's
      if (!joinErrT && !closed) {
        const from = w.from;
        const fire = (): void => {
          if (closed) return;
          t.onJoinError?.(`could not connect to peer ${from} after exchanging SDP (simulated: netsim=blocked)`);
          joinErrT = setTimeout(fire, BLOCKED_RETRY_MS);
        };
        joinErrT = setTimeout(fire, BLOCKED_JOIN_ERROR_MS);
      }
      return;
    }
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
  // e2e-coop "Host left" stall, marlow-bays R). A peer that leaves on purpose says bye at once.
  const beat = setInterval(() => {
    post({ k: 'hi', from: selfId });
    const now = Date.now();
    for (const [id, last] of peers) {
      if (now - last > 60000) {
        peers.delete(id);
        t.onPeerLeave?.(id);
      }
    }
  }, 1000);
  setTimeout(() => post({ k: 'hi', from: selfId }), 0);
  return t;
}
