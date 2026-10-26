/**
 * (coop-carry) The co-op client's own body carry: the same `BodyCarry` the host and solo run (`StealthSystems`), on the
 * client's own lying `Body` of that guard (`CoopClient.kept`). Host-authoritative: the pick up starts when the host's
 * mirror names this player as the body's carrier (`begin`), a hide when the body leaves the mirror (`hostHide`); the put
 * down runs here at once and its hand-over tells the host (`use` `drop-body`), so both pages ragdoll it together.
 * While carrying, the interact is a hiding spot of this map in reach (the host checks it: `use` `hide-<i>`), else a
 * door faced (the mirrored door item), else "Drop body", as the host's `StealthSystems.carryTarget`.
 */
import { Vector3 } from '../core/babylon';
import type { Body } from '../ai/body';
import { hyp2 } from '../core/mathx';
import { BodyCarry, type NetCarry } from '../game/bodyCarry';
import type { GameState } from '../game/gameState';
import type { Interactable, Interactables } from '../game/interactables';
import { DROP_BODY_ID } from './protocol';

/** The hide reach (m), as the host's hide items (`StealthSystems`, 1.5). */
const HIDE_REACH = 1.5;

/** A free-standing interact (never in the world list), as the host's "Drop body". */
function looseItem(id: string, kind: Interactable['kind'], pos: Vector3, label: string, onUse: () => void): Interactable {
  return { id, kind, pos, label, holdTime: 0, enabled: true, done: false, progress: 0, node: null!, parts: [], light: null, onUse };
}

export class ClientCarry implements NetCarry {
  readonly bc: BodyCarry;
  private readonly dropIt: Interactable;
  private readonly hides: Interactable[] = [];
  /** The put down comes from the host (its drop, our death there): no `drop-body` back. */
  private quiet = false;

  constructor(
    private g: GameState,
    private ints: () => Interactables | null,
    private send: (useId: string) => void,
    canRagdoll: () => boolean,
  ) {
    this.bc = new BodyCarry(g, {
      canRagdoll,
      // the host's guards hear the host's own put down (it runs `Body.drop` and the noise when our `drop-body` lands)
      noise: () => {},
      // let go of before the hoist (crouch): the host lets it lie again
      onLetGo: () => this.send(DROP_BODY_ID),
      onDropped: () => {
        if (!this.quiet) this.send(DROP_BODY_ID);
      },
    });
    this.dropIt = looseItem(DROP_BODY_ID, 'body', new Vector3(), 'Drop body', () => this.bc.beginDrop());
    g.world.layout.hideSpots?.forEach((h, i) => {
      const id = `hide-${i}`;
      this.hides.push(looseItem(id, 'hide', h.pos, 'Hide body', () => this.send(id)));
    });
  }

  /** The enemy id of the body on our shoulder ('' none). */
  get bodyId(): string {
    return this.bc.carry?.enemyId ?? '';
  }

  get carrying(): boolean {
    return this.bc.carrying;
  }
  get busy(): boolean {
    return this.bc.busy;
  }
  get bend(): number {
    return this.bc.bend;
  }
  get bendDrop(): number {
    return this.bc.bendDrop;
  }
  get stepping(): boolean {
    return this.bc.stepping;
  }
  get loadShare(): number {
    return this.bc.loadShare;
  }
  get loadSide(): number {
    return this.bc.loadSide;
  }
  get liftStepK(): number {
    return this.bc.liftStepK;
  }

  /** The host named us the carrier of `b`: the lift starts (false: it cannot here, the host is told to let go). */
  begin(b: Body): boolean {
    if (this.bc.carry === b) return true;
    if (this.bc.pickUp(b)) return true;
    this.send(DROP_BODY_ID);
    return false;
  }

  /** The host put our body down (we went down there, it dropped it): the instant drop here, nothing sent back. */
  hostDrop(eid: string): void {
    if (this.bodyId !== eid) return;
    this.quiet = true;
    this.bc.dropCarried();
    this.quiet = false;
  }

  /** The host hid our body: off the shoulder and gone. */
  hostHide(eid: string): void {
    if (this.bodyId !== eid) return;
    this.bc.takeOff()?.hide();
  }

  /** The body went away under us (a restart, the stale sweep): the carry ends, no drop. */
  lost(eid: string): void {
    if (this.bodyId === eid) this.bc.reset();
  }

  carryTarget(feet: Vector3): Interactable | null {
    if (!this.bc.carry || this.bc.busy) return null;
    let best: Interactable | null = null;
    let bd = HIDE_REACH;
    for (let i = 0; i < this.hides.length; i++) {
      const h = this.hides[i]!;
      const d = hyp2(h.pos.x - feet.x, h.pos.z - feet.z);
      if (d <= bd && Math.abs(h.pos.y - feet.y) < 2) {
        bd = d;
        best = h;
      }
    }
    if (best) return best;
    const door = this.ints()?.nearest(feet, 1.5, 'door') ?? null;
    if (door) {
      const c = this.g.player.controller;
      const dx = door.pos.x - feet.x;
      const dz = door.pos.z - feet.z;
      const d = hyp2(dx, dz);
      if (d < 0.05 || (Math.sin(c.yaw) * dx + Math.cos(c.yaw) * dz) / d > 0.3) return door;
    }
    return this.dropIt;
  }

  fixedUpdate(crouchPressed: boolean): void {
    this.bc.fixedUpdate(crouchPressed);
  }

  frameUpdate(): void {
    this.bc.frameUpdate();
  }

  dispose(): void {
    this.bc.reset();
    this.bc.dispose();
  }
}
