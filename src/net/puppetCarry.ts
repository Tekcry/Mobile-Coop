/**
 * (guard-ai A126, protocol 38) The S21 weapon carry across co-op. The host packs its guard's `GuardCarry` phase into
 * the snapshot's `al` (`wireCarry` -> `packAlert`, bits 7-8); the client's `EnemyPuppet` follows it with `PuppetCarry`,
 * which drives a `GuardCarry` of its own (never `step`ped: the brain is host-only) so the rig and the gun pose through
 * the very path the host uses (`GuardGunCarry.apply`, `carryRaise`, `swapClip`, `RigPose.ready`). Low ready and raised
 * stay on the wire as before (`st`, the level, `AL_CAUTION`: `wireGuardAim`).
 *
 * The client runs each draw / holster clip on its own clock at the host's times (`GUARD_CARRY.draw` / `holster`): a
 * snapshot (15 Hz) only says which clip runs, so a clip seen late is played whole, never jumped to its end. Pure and
 * Babylon-free; no allocation per step.
 */
import { CARRY_DRAWING, CARRY_DRAWN, CARRY_HOLSTERED, CARRY_HOLSTERING, GUARD_CARRY, GuardCarry, type CarryPhase } from '../ai/carryState';
import { WIRE_CARRY_DRAWING, WIRE_CARRY_DRAWN, WIRE_CARRY_HOLSTERED, WIRE_CARRY_HOLSTERING } from './protocol';

/** Host: the wire carry (`WIRE_CARRY_*`) for a guard's phase; drawn is 0 (every kind that never holsters). */
export function wireCarry(phase: CarryPhase): number {
  return phase === CARRY_HOLSTERED ? WIRE_CARRY_HOLSTERED : phase === CARRY_DRAWING ? WIRE_CARRY_DRAWING : phase === CARRY_HOLSTERING ? WIRE_CARRY_HOLSTERING : WIRE_CARRY_DRAWN;
}

/** Client: the phase a wire carry stands for. */
export function carryPhaseOf(wire: number): CarryPhase {
  return wire === WIRE_CARRY_HOLSTERED ? CARRY_HOLSTERED : wire === WIRE_CARRY_DRAWING ? CARRY_DRAWING : wire === WIRE_CARRY_HOLSTERING ? CARRY_HOLSTERING : CARRY_DRAWN;
}

/** The client's carry for one puppet: follows the host's phase, runs the clips locally. */
export class PuppetCarry {
  /** The carry the rig and the gun pose from (the host's class: `GuardGunCarry.apply`, `carryRaise`, `swapClip`). */
  readonly c: GuardCarry;
  private dur = 1;
  private started = false;

  constructor(cls: string) {
    this.c = new GuardCarry(true, cls);
  }

  /** One render step towards the host's phase `wire` (`alertCarry(al)`). The first takes it as it is (no clip). */
  step(dt: number, wire: number): void {
    const want = carryPhaseOf(wire);
    const c = this.c;
    if (!this.started) {
      this.started = true;
      this.set(want, want === CARRY_DRAWING ? c.drawTime : want === CARRY_HOLSTERING ? c.holsterTime : 1);
      return;
    }
    const toHands = want === CARRY_DRAWING || want === CARRY_DRAWN;
    switch (c.phase) {
      case CARRY_HOLSTERED:
        if (toHands) this.set(CARRY_DRAWING, c.drawTime);
        break;
      case CARRY_DRAWN:
        if (!toHands) this.set(CARRY_HOLSTERING, c.holsterTime);
        break;
      case CARRY_DRAWING:
        if (!toHands) this.set(CARRY_HOLSTERING, c.holsterTime);
        // the draw ends (shown at its end for a step, as the host) once the host is drawn too
        else if (c.u >= 1) {
          if (want === CARRY_DRAWN) this.set(CARRY_DRAWN, 1);
        } else c.u = Math.min(1, c.u + dt / this.dur);
        break;
      case CARRY_HOLSTERING:
        // stirred mid-holster: straight back up from where it is, as the host (`GuardCarry.step`)
        if (toHands) this.set(CARRY_DRAWING, Math.max(GUARD_CARRY.reverseMin, c.drawTime * c.u));
        else if (c.u >= 1) {
          if (want === CARRY_HOLSTERED) this.set(CARRY_HOLSTERED, 1);
        } else c.u = Math.min(1, c.u + dt / this.dur);
        break;
    }
  }

  private set(p: CarryPhase, dur: number): void {
    const c = this.c;
    c.phase = p;
    c.u = 0;
    c.seq++;
    this.dur = dur > 1e-3 ? dur : 1e-3;
  }
}
