import type { Transport } from './transport';
import { APP_ID } from './transport';

/**
 * WebRTC data channels via Trystero with its default public Nostr relays for signalling
 * (no game server). Loaded only when the player opens coop.
 */
export async function createTrysteroTransport(roomId: string): Promise<Transport> {
  const { joinRoom, selfId } = await import('trystero');
  const room = joinRoom({ appId: APP_ID }, roomId);
  const action = room.makeAction<string>('m');
  const peers = new Set<string>();
  const t: Transport = {
    selfId,
    onMessage: null,
    onPeerJoin: null,
    onPeerLeave: null,
    send(msg, to) {
      void action.send(JSON.stringify(msg), to ? { target: to } : undefined).catch(() => {});
    },
    peers: () => [...peers],
    leave: () => room.leave(),
  };
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
