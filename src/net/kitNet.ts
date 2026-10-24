/**
 * (mission NET) The host's side of the co-op kit moves on the wire (pure; `coopHost.onTeamMove` calls it). A kit request
 * (`tmove` kind `pull` / `shutter`) claims a point when its move says so (`KitMove.claimsPoint`: the pull-up's catch
 * point, carried by the start as `l`); a paired move (`KitMove.paired`) is a pair until an end. Ends travel as the
 * hang-down's (`tmove` `hangEnd`, `tend` k), with the kit's rules on who may say what:
 * - pull-up: only the holder `b` claims the catch; the host judges it on its own clock (`pullVerdict(now - t0, claim,
 *   lag)`, `lag` the claim's trip for a client holder). One verdict per attempt. After a catch the pair stays until the
 *   haul is over (`until`), so a partner that landed before the catch reached it answers 'drop' (the holder lets go).
 *   The partner `a` may only drop (it landed with no verdict).
 * - shutter: only the crawler `a` says 'pull' (through); either side may 'drop'. The pair lapses after the crawl and the
 *   push clear and a few seconds (`SHUTTER_PAIR_S`), so a crawl that never started cannot linger as a pair.
 * (NET2) An end carries its attempt (`kitAttemptKey` of the start's t0, in the hangEnd's `s`; 0 = unknown, an old peer
 * or the host's own): an end for another attempt (a stale drop crossing a new start) is ignored (`sameAttempt`).
 */
import { PULL, pullVerdict } from '../game/kit/pullUp';
import { SHUTTER } from '../game/kit/shutter';
import type { KitKind } from '../game/teamMoves';

export interface KitPair {
  kind: KitKind;
  /** The partner / crawler (the requester) and the holder. */
  a: string;
  b: string;
  /** The host's start time (s, its clock). */
  t0: number;
  /** The pull-up's verdict so far ('' none). */
  verdict: '' | 'pull' | 'drop';
  /** The pair lapses after this host time (s). */
  until: number;
}

/** The pull-up pair lasts the jump, the verdict wait, the haul and the scramble, and a second more. */
export const PULL_PAIR_S = PULL.landT + PULL.verdictWait + PULL.haul + PULL.scramble + 1;
/** (NET2) The shutter pair lasts the crawl and the push clear, and 3 s more (a holder's lift, wire jitter). */
export const SHUTTER_PAIR_S = SHUTTER.crawlTime + SHUTTER.pushTime + 3;

export function newKitPair(kind: KitKind, a: string, b: string, t0: number): KitPair {
  return { kind, a, b, t0, verdict: '', until: t0 + (kind === 'pull' ? PULL_PAIR_S : SHUTTER_PAIR_S) };
}

/** (NET2) An attempt's key on the wire: the start's host time modulo this (the hangEnd's `s` is bounded to +-500). */
export const KIT_ATTEMPT_MOD = 400;

/** (NET2) The key a player's end carries for the start at host time `t0` (0 = no start known). */
export function kitAttemptKey(t0: number): number {
  return t0 > 0 ? t0 % KIT_ATTEMPT_MOD : 0;
}

/** (NET2) An end with key `key` belongs to the attempt started at `t0` (key 0 or no start known: an old peer, the host). */
export function sameAttempt(t0: number | undefined, key: number): boolean {
  return key === 0 || t0 === undefined || Math.abs(kitAttemptKey(t0) - key) < 1e-3;
}

/** The claim's trip allowance for the holder's catch (s): 0 for the host's own, `PULL.claimLag` for a client's. */
export function pullLag(holderIsHost: boolean): number {
  return holderIsHost ? 0 : PULL.claimLag;
}

/**
 * Host: player `by` of pair `p` sent the end `k` at host time `now`. Returns the end to relay to both (`tend` k), or
 * null to drop the message. `lag` the holder's claim allowance (`pullLag`). Updates `p.verdict`.
 */
export function kitEnd(p: KitPair, by: string, k: 'pull' | 'drop', now: number, lag: number): 'pull' | 'drop' | null {
  if (p.kind === 'pull') {
    if (by === p.b) {
      if (p.verdict !== '') return null;
      p.verdict = pullVerdict(now - p.t0, k, lag);
      return p.verdict;
    }
    if (by === p.a && k === 'drop' && p.verdict !== 'drop') {
      p.verdict = 'drop';
      return 'drop';
    }
    return null;
  }
  // the shutter
  if (k === 'pull') return by === p.a ? 'pull' : null;
  return by === p.a || by === p.b ? 'drop' : null;
}

/** After relaying `k`: the pair is over (a pull-up's catch keeps it until `until`, for the partner's late drop). */
export function kitPairOver(p: KitPair, k: 'pull' | 'drop'): boolean {
  return !(p.kind === 'pull' && k === 'pull');
}
