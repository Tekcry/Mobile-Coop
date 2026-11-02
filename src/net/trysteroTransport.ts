import type { Transport } from './transport';
import { APP_ID } from './transport';
import { iceConfig, relayMode } from './relayConfig';
import { sampleFromStats } from './linkStatus';

/**
 * WebRTC data channels via Trystero with its default public Nostr relays for signalling
 * (no game server). Loaded only when the player opens coop.
 * (co-op relay fix) ICE: Trystero's public STUN servers plus the TURN relay (`relayConfig.ts`, as `turnConfig`), so two
 * networks that cannot reach each other directly still connect; `?relay=only` forces the relay, `?relay=off` leaves it
 * out (testing). A failed connection is reported through `onJoinError`; `linkStats` reads the selected ICE pair.
 */
export async function createTrysteroTransport(roomId: string): Promise<Transport> {
  const { joinRoom, selfId } = await import('trystero');
  const mode = relayMode(typeof location !== 'undefined' ? new URLSearchParams(location.search).get('relay') : null);
  const t: Transport = {
    selfId,
    onMessage: null,
    onPeerJoin: null,
    onPeerLeave: null,
    onJoinError: null,
    send(msg, to) {
      void action.send(JSON.stringify(msg), to ? { target: to } : undefined).catch(() => {});
    },
    peers: () => [...peers],
    leave: () => room.leave(),
    async linkStats(id) {
      const pc = room.getPeers()[id];
      if (!pc) return null;
      try {
        return sampleFromStats(await pc.getStats());
      } catch {
        return null;
      }
    },
  };
  // (the error text is Trystero's: a peer id and advice, never the relay login)
  const room = joinRoom({ appId: APP_ID, ...iceConfig(mode) }, roomId, { onJoinError: (e) => t.onJoinError?.(e.error) });
  const action = room.makeAction<string>('m');
  const peers = new Set<string>();
  action.onMessage = (data, ctx) => {
    if (typeof data !== 'string' || data.length > 64_000) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    t.onMessage?.(parsed, ctx.peerId);
  };
  room.onPeerJoin = (id) => {
    peers.add(id);
    t.onPeerJoin?.(id);
  };
  room.onPeerLeave = (id) => {
    peers.delete(id);
    t.onPeerLeave?.(id);
  };
  return t;
}
