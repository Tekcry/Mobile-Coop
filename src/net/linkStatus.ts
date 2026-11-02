/**
 * (co-op relay fix) The connection readout and the join failure messages. Pure: no DOM, no Trystero; `LinkMonitor`
 * (`linkMonitor.ts`) feeds it, the lobby and the pause menu show `linkText`.
 *
 * Direct or via relay comes from the WebRTC stats of the partner's connection: the selected ICE candidate pair (Chrome
 * and Edge: the `transport` stat's `selectedCandidatePairId`; Firefox: the pair with `selected`; else the nominated,
 * succeeded pair). A pair with a `relay` candidate on either end goes through a TURN relay; any other pair is direct.
 * The round trip is that pair's `currentRoundTripTime` (seconds).
 */

/** How the partner is reached: `local` is the same-device test transport (`?net=local`). */
export type LinkKind = 'direct' | 'relay' | 'local';

export interface LinkSample {
  kind: LinkKind;
  /** Round trip (ms), null when the browser has none yet. */
  rttMs: number | null;
  /** (diagnostics log) The pair's counters and candidate types (WebRTC only; `linkDetail`). */
  detail?: LinkDetail;
}

/**
 * (diagnostics log) The selected pair's counters and its candidates' TYPES (host / srflx / prflx / relay) and
 * protocol: never an address or a port (a candidate's address is the player's IP). Totals since the link opened.
 * WebRTC data channels report no lost packets (SCTP resends them): none here.
 */
export interface LinkDetail {
  local: string;
  remote: string;
  /** udp / tcp, and the relay's own protocol when the local candidate is a relay one. */
  protocol: string;
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
  packetsReceived: number;
  /** Data channel messages (all channels). */
  msgsSent: number;
  msgsReceived: number;
}

/** The selected pair's detail from a stats report, or null with no pair. */
export function linkDetail(stats: StatsLike): LinkDetail | null {
  const pair = selectedPair(stats);
  if (!pair) return null;
  const cand = (id: unknown): Rec | null => {
    const c = typeof id === 'string' ? stats.get(id) : null;
    return isRec(c) ? c : null;
  };
  const lc = cand(pair.localCandidateId);
  const rc = cand(pair.remoteCandidateId);
  const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const word = (v: unknown): string => (typeof v === 'string' && /^[a-z]{1,8}$/i.test(v) ? v : '?');
  let msgsSent = 0;
  let msgsReceived = 0;
  stats.forEach((s) => {
    if (isRec(s) && s.type === 'data-channel') {
      msgsSent += n(s.messagesSent);
      msgsReceived += n(s.messagesReceived);
    }
  });
  const relayProto = lc && typeof lc.relayProtocol === 'string' ? `/${word(lc.relayProtocol)}` : '';
  return {
    local: word(lc?.candidateType),
    remote: word(rc?.candidateType),
    protocol: `${word(lc?.protocol)}${relayProto}`,
    bytesSent: n(pair.bytesSent),
    bytesReceived: n(pair.bytesReceived),
    packetsSent: n(pair.packetsSent),
    packetsReceived: n(pair.packetsReceived),
    msgsSent,
    msgsReceived,
  };
}

/** `retrying`: the joiner's first attempt failed (a join error), Trystero tries again (it re-offers every ~5 s). */
export type LinkPhase = 'waiting' | 'connecting' | 'retrying' | 'connected' | 'failed';

export interface LinkState {
  phase: LinkPhase;
  /** Set while `connected` (null until the first stats read). */
  sample: LinkSample | null;
  /** Set while `failed`. */
  failure: JoinFailure | null;
}

/** Why a join failed (the attempt log keeps this key, the dialogs and readout its plain words). */
export type JoinFailure = 'unreachable' | 'timeout' | 'version' | 'full' | 'signalling' | 'other';

export const JOIN_FAILURES: readonly JoinFailure[] = ['unreachable', 'timeout', 'version', 'full', 'signalling', 'other'];

type StatsLike = { get(id: string): unknown; forEach(cb: (v: unknown) => void): void };
type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null;

/** The selected candidate pair of a stats report (an `RTCStatsReport` or any map of stats by id), or null. */
export function selectedPair(stats: StatsLike): Rec | null {
  const f: { transport: Rec | null; flagged: Rec | null; nominated: Rec | null } = { transport: null, flagged: null, nominated: null };
  stats.forEach((s) => {
    if (!isRec(s)) return;
    if (s.type === 'transport' && typeof s.selectedCandidatePairId === 'string' && !f.transport) {
      const p = stats.get(s.selectedCandidatePairId);
      if (isRec(p)) f.transport = p;
    } else if (s.type === 'candidate-pair') {
      if (s.selected === true && !f.flagged) f.flagged = s;
      else if (s.nominated === true && s.state === 'succeeded' && !f.nominated) f.nominated = s;
    }
  });
  return f.transport ?? f.flagged ?? f.nominated;
}

/** Direct or via relay, and the round trip, from a peer connection's stats; null while no pair is selected. */
export function sampleFromStats(stats: StatsLike): LinkSample | null {
  const pair = selectedPair(stats);
  if (!pair) return null;
  const typeOf = (id: unknown): unknown => {
    const c = typeof id === 'string' ? stats.get(id) : null;
    return isRec(c) ? c.candidateType : undefined;
  };
  const relay = typeOf(pair.localCandidateId) === 'relay' || typeOf(pair.remoteCandidateId) === 'relay';
  const rtt = pair.currentRoundTripTime;
  return { kind: relay ? 'relay' : 'direct', rttMs: typeof rtt === 'number' && Number.isFinite(rtt) && rtt >= 0 ? Math.round(rtt * 1000) : null };
}

/**
 * Trystero's `onJoinError` text as a failure kind. It is almost always "could not connect to peer ... after exchanging
 * SDP": the two found each other through the signalling relays but no network path worked (with the TURN relay in the
 * config, the relay did not answer either).
 */
export function classifyJoinError(error: string): JoinFailure {
  if (/after exchanging SDP|could not connect/i.test(error)) return 'unreachable';
  if (/password|decrypt/i.test(error)) return 'signalling';
  return 'other';
}

/** The short reason after "Failed - " in the readout. */
export const FAILURE_SHORT: Readonly<Record<JoinFailure, string>> = {
  unreachable: 'no network path to your partner',
  timeout: 'no answer from the room',
  version: 'different game versions',
  full: 'room full',
  signalling: 'connection setup failed',
  other: 'connection failed',
};

/** The dialog for a failed join: a title and plain words on what to do. */
export function failureDialog(f: JoinFailure, code: string): { title: string; text: string } {
  switch (f) {
    case 'unreachable':
      return {
        title: "Couldn't reach your partner",
        text: `Found room ${code}, but neither a direct link nor the relay server got through. One of you is probably on a network that blocks it (a VPN, a work or school network, a strict firewall). Try another network, such as a phone hotspot, or turn the VPN off, and check that the firewall lets the browser connect.`,
      };
    case 'timeout':
      return {
        title: 'No host found',
        text: `Nobody answered in room ${code}. Check the code, and that the host still has the lobby open, then try again.`,
      };
    case 'version':
      return {
        title: 'Different game versions',
        text: 'You and the host are running different versions of the game. Both of you reload the page (or restart the game) to get the latest version, then try again.',
      };
    case 'full':
      return { title: 'Room full', text: 'That room already has its two players. Ask the host to free a slot, or host your own room.' };
    case 'signalling':
      return { title: 'Could not connect', text: `The connection to room ${code} could not be set up. Try again in a moment.` };
    default:
      return { title: 'Could not connect', text: `The connection to room ${code} failed. Check your internet connection and try again.` };
  }
}

/** The readout line: "Connecting...", "Connected - direct, 45 ms", "Connected - via relay, 120 ms", "Failed - ...". */
export function linkText(s: LinkState): string {
  if (s.phase === 'waiting') return 'Waiting for your partner';
  if (s.phase === 'connecting') return 'Connecting...';
  if (s.phase === 'retrying') return 'Connecting... (first try failed, retrying)';
  if (s.phase === 'failed') return `Failed - ${FAILURE_SHORT[s.failure ?? 'other']}`;
  const smp = s.sample;
  if (!smp) return 'Connected';
  const how = smp.kind === 'relay' ? 'via relay' : smp.kind === 'local' ? 'same device' : 'direct';
  return smp.rttMs === null ? `Connected - ${how}` : `Connected - ${how}, ${smp.rttMs} ms`;
}
