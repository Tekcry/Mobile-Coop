/**
 * (coop-torches) The co-op client's guard flashlights. Pure (no Babylon / DOM); allocation-free per frame.
 *
 * The client's `World` builds the same flashlight slots as the host's (`addTorchSlots`). Each frame this hands a free
 * slot to every shown guard whose snapshot carries the torch bit (`AL_TORCH`), places it with the host's own
 * `placeTorch` from the guard as drawn (position, yaw, crouched), sets its rendering `reach` with the host's
 * `beamReach`, and switches off the slots whose guard dropped the bit, died, or left the snapshot. The light rig, the
 * haze, the reflections and the light field (the client's meter) all read those registry entries, as on the host.
 * The aim is derived, not sent: the host's torch is a pure function of the same x, y, z, yaw and crouch.
 */
import { beamReach, nextTorchSwap, placeTorch, torchKey, type BeamHit } from '../world/torches';
import type { LightDef, LightRegistry } from '../world/lights';

/** What the mirror reads of a guard (an `EnemyPuppet`, or a stand-in in tests). */
export interface TorchHolder {
  readonly id: string;
  /** The snapshot's torch bit, false while he is missing from the snapshot (stale) or dead. */
  readonly torch: boolean;
  /** Crouched past half way (the snapshot's `st` 2, as the host's `crouch > 0.5`). */
  readonly torchCrouch: boolean;
  readonly pos: { readonly x: number; readonly y: number; readonly z: number };
  readonly yaw: number;
  readonly def: { readonly scale: number };
}

export class TorchMirror {
  /** The registry's flashlight slots, in registry order (the same order `EnemyManager` keeps on the host). */
  readonly slots: LightDef[] = [];
  /** Who holds each slot (null: free, off). */
  readonly owner: (TorchHolder | null)[] = [];
  private tick = 0;
  /** (piano SO3 fix) Slots without `beamCut` (the first ones) and a scratch of each slot's holder key. */
  private shadowed = 0;
  private readonly keys: Float64Array;

  constructor(
    private readonly reg: LightRegistry,
    private readonly hit: BeamHit,
  ) {
    for (const l of reg.lights) {
      if (l.kind !== 'flashlight') continue;
      this.slots.push(l);
      this.owner.push(null);
      if (!l.beamCut) this.shadowed++;
    }
    this.keys = new Float64Array(this.slots.length);
  }

  /** Once per frame, after the guards moved. `list` is every shown guard (dead or stale ones read `torch` false). */
  update(list: readonly TorchHolder[]): void {
    const ts = this.slots;
    if (!ts.length) return;
    // release: torch off, dead, stale, or gone from the list
    for (let i = 0; i < ts.length; i++) {
      const o = this.owner[i];
      if (!o) continue;
      if (o.torch && list.includes(o)) continue;
      this.owner[i] = null;
      this.reg.setOn(ts[i]!.id, false);
    }
    // acquire
    for (let j = 0; j < list.length; j++) {
      const p = list[j]!;
      if (!p.torch || this.owner.includes(p)) continue;
      const k = this.owner.indexOf(null);
      if (k < 0) break;
      this.owner[k] = p;
      ts[k]!.reach = undefined;
      this.reg.setOn(ts[k]!.id, true);
    }
    // (piano SO3 fix) a map with beamCut slots: the shadowed ones go to the lowest guard keys, the host's rule
    // (`EnemyManager.balanceTorches`), so a guard's torch is shadowed or cut alike on both pages whatever the order
    if (this.shadowed < ts.length) this.balance();
    // follow (the host's placement), the beam's reach round robin as the host's (one slot a call, a new one at once)
    this.tick = (this.tick + 1) % ts.length;
    for (let i = 0; i < ts.length; i++) {
      const o = this.owner[i];
      if (!o) continue;
      const l = ts[i]!;
      placeTorch(l, o.pos.x, o.pos.y, o.pos.z, o.yaw, o.torchCrouch, o.def.scale);
      if (i === this.tick || l.reach === undefined) l.reach = beamReach(l, this.hit);
    }
  }

  /** (piano SO3 fix) `nextTorchSwap` until it holds (as the host's `balanceTorches`). Allocation-free. */
  private balance(): void {
    const ts = this.slots;
    const own = this.owner;
    const keys = this.keys;
    const n = ts.length;
    for (let k = 0; k < n; k++) {
      const o = own[k];
      keys[k] = o ? torchKey(o.id) : -1;
    }
    for (let it = 0; it < n; it++) {
      const p = nextTorchSwap(keys, n, this.shadowed);
      if (p < 0) break;
      const i = p >> 6;
      const j = p & 63;
      const oi = own[i] ?? null;
      own[i] = own[j] ?? null;
      own[j] = oi;
      const ki = keys[i]!;
      keys[i] = keys[j]!;
      keys[j] = ki;
      this.reg.setOn(ts[i]!.id, !!own[i]);
      this.reg.setOn(ts[j]!.id, !!own[j]);
      ts[i]!.reach = undefined;
      ts[j]!.reach = undefined;
    }
  }

  /** The slot lit for this guard, or null (tests / e2e). */
  slotOf(id: string): LightDef | null {
    for (let i = 0; i < this.owner.length; i++) if (this.owner[i]?.id === id) return this.slots[i]!;
    return null;
  }

  /** Every slot off (the client leaves the match). */
  clear(): void {
    for (let i = 0; i < this.slots.length; i++) {
      if (this.owner[i]) this.reg.setOn(this.slots[i]!.id, false);
      this.owner[i] = null;
    }
  }
}
