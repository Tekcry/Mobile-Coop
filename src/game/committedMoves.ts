/**
 * (locomotion step 10, A5 / PLAN H3) The generic host-approved committed move: a client asks (`cmove`), the host
 * checks it here and starts it for everyone with its own clock (`cstart {t0}`) or refuses it (`cdeny`). Pure; the
 * host runs the same check on its own requests (no message). Kinds parsed now: the elbow strike. Reserved, not parsed yet: takedown, grab, drag (step 27); splitBoost, backToBack, pullUp,
 * rappelAnchor, clutch (Phase 5, PLAN H4).
 */
import { isAttachedMode, isCommittedMode, type MoveMode } from '../player/moveState';
import { STRIKE } from './elbowStrike';

export const CKINDS = ['strike'] as const;
export type CKind = (typeof CKINDS)[number];

export type CDenial = 'rate' | 'dead' | 'busy' | 'far' | 'noTarget';
/** Every reason a `cdeny` carries: a check's denial, or the host interrupting a started move (damage). */
export const CDENY_REASONS = ['rate', 'dead', 'busy', 'far', 'noTarget', 'hit'] as const;
export type CDenyReason = (typeof CDENY_REASONS)[number];

/** Seconds between two requests of one player. */
export const COMMIT_RATE = 0.3;

export interface CTargetView {
  alive: boolean;
  /** Held in a takedown or as a hostage. */
  seized: boolean;
  /** Knocked out. */
  ko: boolean;
  /** Host distance (m) from the requester to the target. */
  dist: number;
}

export interface CRequest {
  kind: CKind;
  alive: boolean;
  downed: boolean;
  /** The requester's MoveState mode in the host's view. */
  mode: MoveMode | string;
  /** The host is still running an earlier committed move of this player. */
  active: boolean;
  /** Seconds since this player's last request. */
  sinceLast: number;
  /** The target (null = none asked: a whiff); `{alive: false}` for an id the host does not know. */
  target: CTargetView | null;
  /** Extra reach (m): the lag slack for a client, 0 for the host's own. */
  slack: number;
}

const TEAM_BUSY = new Set<string>(['brace', 'boost', 'stacked', 'takedown', 'grab']);

/** The host's check of a committed-move request: null = allowed, else why not. */
export function checkCommitted(r: CRequest): CDenial | null {
  if (r.sinceLast < COMMIT_RATE) return 'rate';
  if (!r.alive) return 'dead';
  const m = r.mode as MoveMode;
  // (the requester's own predicted `strike` mode is not busy; the host's record of a running move is)
  if (r.downed || r.active || TEAM_BUSY.has(m) || isAttachedMode(m) || isCommittedMode(m)) return 'busy';
  const t = r.target;
  if (t) {
    if (!t.alive || t.seized || t.ko) return 'noTarget';
    if (r.kind === 'strike' && t.dist > STRIKE.reach + r.slack) return 'far';
  }
  return null;
}
