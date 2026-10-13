/**
 * The local player's drill feed (training course, T1c): counts the event-driven verbs (vision, door, gadget, throw,
 * takedown, ping, shot), fills a `DrillSnap` from the game each fixed step and runs `DrillDetect` on it. The host's
 * `CourseMode` and the client's `CoopClient` both use it, so verbs are derived in one place. No allocation per step.
 */
import type { GameState } from '../gameState';
import { COURSE_DARK, COURSE_DIM } from '../../config/course';
import { DrillDetect, emptySnap } from './drillDetect';
import { localMoveState } from '../localMoveState';
import { emptyMoveState } from '../../player/moveState';

export class CourseFeed {
  private readonly snap = emptySnap();
  private readonly det = new DrillDetect();
  private readonly mv = emptyMoveState();
  private lastShot: unknown = null;
  private offs: (() => void)[] = [];
  /** Verbs this step (reused). */
  readonly out: string[] = [];
  /** Host: a client's `use` is running, so a door it moves is the client's (`remoteDoors`), not ours. */
  remote = false;
  /** Host: doors a client's `use` moved since the course mode last took them. */
  remoteDoors = 0;

  /**
   * `client`: the co-op client's feed. Its thrown gadgets reach the host as `gadget` messages (the host ticks gadget and
   * throw), so only a placed gadget counts as its local `gadget` verb (DECISIONS A23).
   */
  constructor(
    private g: GameState,
    client = false,
  ) {
    const s = this.snap;
    const ev = g.events;
    this.offs.push(
      ev.on('vision', () => s.visions++),
      ev.on('door', (e) => {
        if (e.how === 'enemy') return;
        if (this.remote) this.remoteDoors++;
        else s.doors++;
      }),
      ev.on('gadget', (e) => {
        if (e.phase === 'throw') s.throws++;
        if (e.phase === 'place' || (e.phase === 'throw' && !client)) s.gadgets++;
      }),
      ev.on('takedown', (e) => {
        if (e.phase !== 'done') return;
        s.takedownKind = e.kind;
        s.takedowns++;
      }),
    );
  }

  /** The local player sent a ping. */
  ping(): void {
    this.snap.pings++;
  }

  /** A team move the local player took part in. */
  teamMove(): void {
    this.snap.teamMoves++;
  }

  /** One fixed step: the verbs that rose are in `out`. */
  step(): string[] {
    const g = this.g;
    const s = this.snap;
    const mv = localMoveState(g, this.mv);
    const c = g.player.controller;
    s.gear = mv.g;
    s.crouch = c.crouched;
    s.ads = g.player.ads;
    const shot = g.weapons.lastShot;
    if (shot !== null && shot !== this.lastShot) s.shots++;
    this.lastShot = shot;
    s.reload = g.weapons.reloading;
    s.weapon = g.weapons.current.def.id;
    s.mode = mv.m;
    s.sub = mv.sub;
    s.traversal = g.traversal.kind;
    s.landings = c.landings;
    s.landing = c.lastLanding;
    const l = g.lightLevel;
    s.light = l < COURSE_DARK ? 0 : l < COURSE_DIM ? 1 : 2;
    this.det.step(s, this.out);
    return this.out;
  }

  /** A respawn or restart: the next step only primes (a teleport is not a verb). */
  reset(): void {
    this.det.reset();
  }

  dispose(): void {
    for (const off of this.offs) off();
    this.offs.length = 0;
  }
}
