/**
 * The co-op relay (TURN) servers, handed to Trystero as `turnConfig` (`trysteroTransport.ts`). Trystero adds them after
 * its own public STUN servers (Google x3, Cloudflare), so a direct link is tried first and the relay carries the game
 * only when two networks cannot reach each other (strict NAT, a VPN, a phone hotspot, a firewall that blocks UDP).
 *
 * This is the Metered free-trial login (workspace `nightshift-coop`: 500 MB a month, stops at the limit, never
 * charged). It is public on purpose for now (owner's decision 2026-11-02, the repo is public): it is replaced by
 * short-lived credentials, or by Steam networking, later. Never print it: no log, readout, error message or test output
 * may show these values (`tests/relayConfig.test.ts` checks the net code's logging).
 */
export interface RelayServer {
  readonly urls: string | readonly string[];
  readonly username?: string;
  readonly credential?: string;
}

const USER = '132f2be98063edc9af58fba9';
const KEY = 'sX4KGLRy8Ld66sV9';

export const RELAY_SERVERS: readonly RelayServer[] = [
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'turn:global.relay.metered.ca:80', username: USER, credential: KEY },
  { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: USER, credential: KEY },
  { urls: 'turn:global.relay.metered.ca:443', username: USER, credential: KEY },
  { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: USER, credential: KEY },
];

/** `?relay=` (testing): `only` forces every link through the relay (`iceTransportPolicy: 'relay'`); `off` leaves the
 *  relay out (public STUN only, as before this fix). Anything else: the relay as a fallback (the shipped default). */
export type RelayMode = 'auto' | 'only' | 'off';

export function relayMode(param: string | null | undefined): RelayMode {
  return param === 'only' || param === 'off' ? param : 'auto';
}

/** The ICE part of Trystero's room config for a relay mode (fresh objects: Trystero may keep them). No `rtcConfig.iceServers`:
 *  that would replace Trystero's default STUN list instead of adding to it. */
export function iceConfig(mode: RelayMode, servers: readonly RelayServer[] = RELAY_SERVERS): { turnConfig: { urls: string | string[]; username?: string; credential?: string }[]; rtcConfig?: RTCConfiguration } {
  const turnConfig = mode === 'off' ? [] : servers.map((s) => ({ ...s, urls: typeof s.urls === 'string' ? s.urls : [...s.urls] }));
  return mode === 'only' ? { turnConfig, rtcConfig: { iceTransportPolicy: 'relay' } } : { turnConfig };
}
