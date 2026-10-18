/**
 * Drill verb detection (training course, pure, Babylon-free): the single place course verbs are derived (T1c). Each
 * fixed step the game fills a `DrillSnap` for one player and `DrillDetect.step` writes the verb ids that rose this step
 * (edge-triggered: a verb ticks once per occurrence). Event-driven verbs (ping, door, gadget, takedown, team move,
 * throw, fire, vision) arrive as counters, so an occurrence between two steps is never lost or counted twice.
 *
 * The host runs one detector on its own snapshot and one on the remote's host-visible snapshot (MoveState modes,
 * takedowns, team moves, C10); the client runs one on its own snapshot and sends only `CLIENT_VERBS` as `ctick`.
 * Writes into the caller's array (cleared first) and caches takedown-kind strings: no allocation per step.
 */

export interface DrillSnap {
  /** Speed gear 1..6 (0 = unknown). */
  gear: number;
  crouch: boolean;
  /** Vision mode changes (counter) and the mode now (0 off). */
  visions: number;
  pings: number;
  ads: boolean;
  /** Shots fired (counter). */
  shots: number;
  reload: boolean;
  weapon: string;
  /** MoveState mode ('ground' = none) and its sub-state bits. */
  mode: string;
  sub: number;
  /** Traversal kind ('none' = none). */
  traversal: string;
  /** Landings (counter) and the last one's band ('none' | 'soft' | 'hard' | 'heavy' | ...). */
  landings: number;
  landing: string;
  doors: number;
  gadgets: number;
  throws: number;
  takedowns: number;
  /** The last takedown's kind. */
  takedownKind: string;
  teamMoves: number;
  /** Light meter band: 0 dark, 1 dim, 2 lit. */
  light: number;
}

export const emptySnap = (): DrillSnap => ({
  gear: 0,
  crouch: false,
  visions: 0,
  pings: 0,
  ads: false,
  shots: 0,
  reload: false,
  weapon: '',
  mode: 'ground',
  sub: 0,
  traversal: 'none',
  landings: 0,
  landing: 'none',
  doors: 0,
  gadgets: 0,
  throws: 0,
  takedowns: 0,
  takedownKind: '',
  teamMoves: 0,
  light: 2,
});

/** Verb ids the detector emits (besides MoveState modes and traversal kinds, which are emitted under their own name). */
export const VERBS = {
  gear: 'gear',
  sprint: 'sprint',
  stance: 'stance',
  vision: 'vision',
  ping: 'ping',
  aim: 'aim',
  fire: 'fire',
  reload: 'reload',
  swap: 'swap',
  land: 'land',
  door: 'door',
  gadget: 'gadget',
  throw: 'throw',
  takedown: 'takedown',
  teamMove: 'teamMove',
  dark: 'dark',
  /** A course device pressed (switch, lever, pickup: `CourseMode.press`, not from a snapshot). */
  switch: 'switch',
} as const;

/** Sprint is gear 6 standing (speedGears). */
const SPRINT_GEAR = 5; // (CT prototype M1: no sprint; the verb is now the top-speed run)

const push = (out: string[], v: string): void => {
  for (let i = 0; i < out.length; i++) if (out[i] === v) return;
  out.push(v);
};

/** Copy every field (no allocation). */
export function copySnap(d: DrillSnap, s: DrillSnap): void {
  d.gear = s.gear;
  d.crouch = s.crouch;
  d.visions = s.visions;
  d.pings = s.pings;
  d.ads = s.ads;
  d.shots = s.shots;
  d.reload = s.reload;
  d.weapon = s.weapon;
  d.mode = s.mode;
  d.sub = s.sub;
  d.traversal = s.traversal;
  d.landings = s.landings;
  d.landing = s.landing;
  d.doors = s.doors;
  d.gadgets = s.gadgets;
  d.throws = s.throws;
  d.takedowns = s.takedowns;
  d.takedownKind = s.takedownKind;
  d.teamMoves = s.teamMoves;
  d.light = s.light;
}

export class DrillDetect {
  private prev = emptySnap();
  private primed = false;
  private readonly tdNames = new Map<string, string>();
  private readonly landNames = new Map<string, string>();

  /** Forget the last snapshot (a respawn, a bay restart): the next step only primes. */
  reset(): void {
    this.primed = false;
  }

  step(s: DrillSnap, out: string[]): void {
    out.length = 0;
    const p = this.prev;
    if (this.primed) {
      if (p.gear !== 0 && s.gear !== 0 && s.gear !== p.gear) push(out, VERBS.gear);
      const sprint = s.gear === SPRINT_GEAR && !s.crouch;
      if (sprint && !(p.gear === SPRINT_GEAR && !p.crouch)) push(out, VERBS.sprint);
      if (s.crouch !== p.crouch) push(out, VERBS.stance);
      if (s.visions > p.visions) push(out, VERBS.vision);
      if (s.pings > p.pings) push(out, VERBS.ping);
      if (s.ads && !p.ads) push(out, VERBS.aim);
      if (s.shots > p.shots) push(out, VERBS.fire);
      if (s.reload && !p.reload) push(out, VERBS.reload);
      if (s.weapon !== p.weapon) push(out, VERBS.swap);
      if (s.mode !== p.mode && s.mode !== 'ground') push(out, s.mode);
      if (s.traversal !== p.traversal && s.traversal !== 'none') push(out, s.traversal);
      if (s.landings > p.landings && s.landing !== 'none') {
        push(out, VERBS.land);
        push(out, this.name(this.landNames, 'land:', s.landing));
      }
      if (s.doors > p.doors) push(out, VERBS.door);
      if (s.gadgets > p.gadgets) push(out, VERBS.gadget);
      if (s.throws > p.throws) push(out, VERBS.throw);
      if (s.takedowns > p.takedowns) {
        push(out, VERBS.takedown);
        if (s.takedownKind) push(out, this.name(this.tdNames, 'takedown:', s.takedownKind));
      }
      if (s.teamMoves > p.teamMoves) push(out, VERBS.teamMove);
      if (s.light === 0 && p.light !== 0) push(out, VERBS.dark);
    }
    this.primed = true;
    copySnap(p, s);
  }

  /** `prefix + kind`, built once per kind. */
  private name(cache: Map<string, string>, prefix: string, kind: string): string {
    let n = cache.get(kind);
    if (n === undefined) cache.set(kind, (n = prefix + kind));
    return n;
  }
}
