/**
 * (optic-coop, ct-toolkit 3.2) The rest of the optic cable: MoveState mode `optic` on the wire, the partner's pose and
 * cable selection, and the gaps other than doors (hatches, ceiling panels, grilles, shaft tops): tip placement and
 * refusal. The protocol number is never asserted (tests read the constant; the train bumps it).
 */
import { describe, expect, it } from 'vitest';
import { OPTIC } from '../src/config/tools';
import {
  dropBadDoorMove,
  dropBadOpticMove,
  emptyMovePose,
  emptyMoveState,
  MOVE_MODES,
  moveChanged,
  moveKneels,
  OPTIC_POINT_MAX,
  packMoveState,
  poseFromMoveState,
  sanitizeMoveState,
  type MoveState,
} from '../src/player/moveState';
import { parseMessage, PROTOCOL_VERSION, wirePlayerState, type PlayerState } from '../src/net/protocol';
import {
  emptyOpticPlace,
  OPTIC_SUBS,
  opticCableEnd,
  OpticCore,
  opticPlace,
  opticPlaceOf,
  opticPointPlace,
  opticPointRefusal,
  opticSubOf,
  type OpticPoint,
} from '../src/player/opticCable';

const DEG = Math.PI / 180;
const door = { hinge: { x: 0, y: 0, z: 0 }, yaw: 0, width: 0.9, locked: false };
/** A floor hatch at the origin (the void below), a ceiling panel at 2.6 m, a wall grille facing +z at 0.4 m. */
const hatch: OpticPoint = { kind: 'hatch', gap: { x: 0, y: 0, z: 0 }, nx: 0, ny: -1, nz: 0 };
const panel: OpticPoint = { kind: 'panel', gap: { x: 0, y: 2.6, z: 0 }, nx: 0, ny: 1, nz: 0 };
const grille: OpticPoint = { kind: 'grille', gap: { x: 2, y: 0.4, z: 1 }, nx: 0, ny: 0, nz: 1 };
const shaft: OpticPoint = { kind: 'shaft', gap: { x: 5, y: 6, z: 5 }, nx: 0, ny: -1, nz: 0 };

const optic = (sub: number, a: number, ph = 1): MoveState => ({ ...emptyMoveState(), m: 'optic', a, sub, ph });

describe('MoveState mode optic on the wire (optic-coop)', () => {
  it('is appended (the older indices stay) and round-trips through a pstate', () => {
    expect(PROTOCOL_VERSION).toBeGreaterThan(0);
    expect(MOVE_MODES.indexOf('doorPeek')).toBe(26);
    expect(MOVE_MODES.indexOf('optic')).toBe(MOVE_MODES.length - 1);
    expect(OPTIC_SUBS).toEqual(['door', 'hatch', 'panel', 'grille']);
    const ps = { id: 'peerA', x: 1, y: 0, z: 2, yaw: 0.5, pitch: 0.1, speed: 0, f: 1, w: 'rifle', hp: 100 } as PlayerState;
    for (const [sub, a, ph] of [
      [0, 3, 0.4],
      [1, 0, 1],
      [2, 5, 0.25],
      [3, 7, 0],
    ] as const) {
      const wire = JSON.parse(JSON.stringify({ t: 'pstate', s: wirePlayerState({ ...ps, mv: optic(sub, a, ph) }) }));
      expect(wire.s.mv.m).toBe(MOVE_MODES.indexOf('optic'));
      const m = parseMessage(wire);
      expect(m && m.t === 'pstate' && m.s.mv).toMatchObject({ m: 'optic', a, sub, ph });
    }
  });
  it('refuses a bad sub or index; clamps the feed', () => {
    const i = MOVE_MODES.indexOf('optic');
    expect(sanitizeMoveState({ m: i, a: 2, sub: 4 })).toBeNull();
    expect(sanitizeMoveState({ m: i, a: 2, sub: -1 })).toBeNull();
    expect(sanitizeMoveState({ m: i, a: 2 })).toBeNull();
    expect(sanitizeMoveState({ m: i, a: -1, sub: 1 })).toBeNull();
    // a door index past the level's doors (sub 0); a gap index past the wire's bound
    expect(sanitizeMoveState({ m: i, a: 10, sub: 0 }, 4096, 4096, 10)).toBeNull();
    expect(sanitizeMoveState({ m: i, a: OPTIC_POINT_MAX, sub: 3 })).toBeNull();
    expect(sanitizeMoveState({ m: i, a: 9, sub: 0 }, 4096, 4096, 10)!.a).toBe(9);
    expect(sanitizeMoveState({ m: i, a: 1, sub: 2, ph: 7 })!.ph).toBe(1);
    expect(sanitizeMoveState(packMoveState(optic(1, 2, 0.5)))!.sub).toBe(1);
  });
  it('the receive path drops a door or gap this level does not have', () => {
    const d = { mv: optic(0, 5) };
    expect(dropBadDoorMove(d, 4)).toBe(true);
    expect(d.mv).toBeUndefined();
    const g = { mv: optic(2, 3) };
    expect(dropBadDoorMove(g, 0)).toBe(false);
    expect(dropBadOpticMove(g, 3)).toBe(true);
    expect(g.mv).toBeUndefined();
    const ok = { mv: optic(3, 0) };
    expect(dropBadOpticMove(ok, 1)).toBe(false);
    expect(ok.mv).toBeDefined();
    // a door is never the gap check's
    expect(dropBadOpticMove({ mv: optic(0, 50) }, 0)).toBe(false);
  });
  it('a new kind or gap sends at once; the feed rides the ticks', () => {
    expect(moveChanged(optic(0, 1), optic(1, 1))).toBe(true);
    expect(moveChanged(optic(1, 1), optic(1, 2))).toBe(true);
    expect(moveChanged({ ...emptyMoveState() }, optic(0, 0))).toBe(true);
    expect(moveChanged(optic(1, 1, 0.2), optic(1, 1, 0.6))).toBe(false);
  });
});

describe('the partner pose for mode optic', () => {
  it('poses still on the stance spots (no wall, traverse or melee) and kneels with the crouch', () => {
    const p = poseFromMoveState(optic(0, 1), 0, emptyMovePose());
    expect(p.settle).toBe(true);
    expect(p.wall).toBe(false);
    expect(p.traverse).toBe('none');
    expect(p.melee).toBe(-1);
    expect(moveKneels('optic')).toBe(true);
    expect(moveKneels('doorPeek')).toBe(true);
    expect(moveKneels('ladder')).toBe(false);
    expect(moveKneels(undefined)).toBe(false);
  });
  it('selects the door place for sub 0 and the gap place for a matching kind, else none', () => {
    const out = emptyOpticPlace();
    const a = opticPlaceOf(0, door, null, 1.2, 0.3, 0.025, out)!;
    const b = opticPlace(door, 1.2, 0.3, 0.025, emptyOpticPlace());
    expect(a).toMatchObject({ kx: b.kx, kz: b.kz, tx: b.tx, tz: b.tz, hx: b.hx, crouch: true });
    expect(opticPlaceOf(1, null, hatch, 0, 1, 0.025, out)).not.toBeNull();
    expect(opticPlaceOf(3, null, shaft, 5, 6, 0.025, out)).not.toBeNull();
    expect(opticPlaceOf(3, null, hatch, 0, 1, 0.025, out)).toBeNull();
    expect(opticPlaceOf(2, door, undefined, 0, 1, 0.025, out)).toBeNull();
    expect(opticPlaceOf(0, undefined, hatch, 0, 1, 0.025, out)).toBeNull();
  });
  it('the cable runs from the hand (fed 0) to the tip (fed 1); under a door it stays at floor height', () => {
    const pl = opticPlace({ ...door, hinge: { x: 0, y: 1, z: 0 } }, 1.2, 0.3, 0.025, emptyOpticPlace());
    expect(pl.hx).toBeCloseTo(0.025 + OPTIC.hand);
    expect(pl.hy).toBeCloseTo(1 + OPTIC.height);
    const e = { x: 0, y: 0, z: 0 };
    expect(opticCableEnd(pl, 0, e)).toEqual({ x: pl.hx, y: pl.hy, z: pl.hz });
    opticCableEnd(pl, 1, e);
    expect(e.x).toBeCloseTo(pl.tx);
    expect(e.y).toBeCloseTo(pl.ty);
    opticCableEnd(pl, 0.5, e);
    expect(e.x).toBeCloseTo((pl.hx + pl.tx) / 2);
    expect(opticCableEnd(pl, 3, e).x).toBeCloseTo(pl.tx);
  });
});

describe('optic gaps other than doors (ct-toolkit 5, map field optic)', () => {
  it('kinds map to the wire sub (a shaft top is a grille)', () => {
    expect(opticSubOf('hatch')).toBe(1);
    expect(opticSubOf('panel')).toBe(2);
    expect(opticSubOf('grille')).toBe(3);
    expect(opticSubOf('shaft')).toBe(3);
  });
  it('a floor hatch: kneel on the body side, the tip 0.3 m down into the void, the look 50 deg down away from the body', () => {
    const p = opticPointPlace(hatch, 0, 2, emptyOpticPlace());
    expect(p.kx).toBeCloseTo(0);
    expect(p.kz).toBeCloseTo(OPTIC.kneel);
    expect(p.tx).toBeCloseTo(0);
    expect(p.ty).toBeCloseTo(-OPTIC.into);
    expect(Math.abs(p.yaw)).toBeCloseTo(Math.PI);
    expect(p.pitch).toBeCloseTo(-OPTIC.vertPitch);
    expect(p.hy).toBeCloseTo(OPTIC.hand);
    expect(p.crouch).toBe(true);
  });
  it('a ceiling panel: stand under it, the tip up into the void, the look up', () => {
    const p = opticPointPlace(panel, 1, 0, emptyOpticPlace());
    expect(p.kx).toBeCloseTo(OPTIC.stand);
    expect(p.ty).toBeCloseTo(2.6 + OPTIC.into);
    expect(p.pitch).toBeCloseTo(OPTIC.vertPitch);
    expect(p.crouch).toBe(false);
  });
  it('a wall grille: kneel back along its normal, the tip through it, the look along it', () => {
    const p = opticPointPlace(grille, 9, 9, emptyOpticPlace());
    expect(p.kx).toBeCloseTo(2);
    expect(p.kz).toBeCloseTo(1 - OPTIC.kneel);
    expect(p.tz).toBeCloseTo(1 + OPTIC.into);
    expect(p.ty).toBeCloseTo(0.4);
    expect(p.yaw).toBeCloseTo(0);
    expect(p.pitch).toBe(0);
  });
  it('an authored tip point wins over the default', () => {
    const p = opticPointPlace({ ...hatch, tip: { x: 0.1, y: -0.5, z: 0.2 } }, 0, 2, emptyOpticPlace());
    expect([p.tx, p.ty, p.tz]).toEqual([0.1, -0.5, 0.2]);
  });
  it('a body on the gap itself still gets a kneel spot', () => {
    const p = opticPointPlace(hatch, 0, 0, emptyOpticPlace());
    expect(Number.isFinite(p.kx) && Number.isFinite(p.yaw)).toBe(true);
    expect(Math.hypot(p.kx, p.kz)).toBeCloseTo(OPTIC.kneel);
  });
  it('refuses out of reach, then a blocked far side (a wall behind)', () => {
    expect(opticPointRefusal(hatch, 0, 0, 0.8, true)).toBeNull();
    expect(opticPointRefusal(hatch, 0, 0, OPTIC.reach + 0.1, true)).toBe('Too far');
    expect(opticPointRefusal(panel, 0, 0, 0.2, true)).toBe('Too far');
    expect(opticPointRefusal(panel, 0, 0.5, 0.2, true)).toBeNull();
    expect(opticPointRefusal(hatch, 0, OPTIC.reachDown + 0.1, 0.5, true)).toBe('Too far');
    expect(opticPointRefusal(grille, 2, 0, 0.5, false)).toBe('No gap');
    expect(opticPointRefusal(grille, 2, 0, -5, false)).toBe('Too far');
  });
  it('the core starts with the gap kind and looks around the centre pitch; the feed rides out and back', () => {
    const c = new OpticCore();
    opticPointPlace(hatch, 0, 2, c.place);
    expect(c.start(4, 1)).toBe(true);
    expect([c.door, c.sub]).toEqual([4, 1]);
    expect(c.pitch).toBeCloseTo(-OPTIC.vertPitch);
    expect(c.extension).toBe(0);
    c.update(OPTIC.feedIn / 2, false, false);
    expect(c.extension).toBeCloseTo(0.5);
    c.update(OPTIC.feedIn / 2 + 1e-6, false, false);
    expect(c.viewing).toBe(true);
    expect(c.extension).toBe(1);
    c.look(0, -1);
    expect(c.pitch).toBeCloseTo(-OPTIC.vertPitch + OPTIC.pitchMin);
    c.look(0, 2);
    expect(c.pitch).toBeCloseTo(-OPTIC.vertPitch + OPTIC.pitchMax);
    c.look(2, 0);
    expect(c.yaw - c.baseYaw).toBeCloseTo(75 * DEG);
    c.update(0.01, true, false);
    expect(c.phase).toBe('retract');
    c.update(OPTIC.feedOut / 2, false, false);
    expect(c.extension).toBeCloseTo(0.5);
    c.update(OPTIC.feedOut, false, false);
    expect(c.active).toBe(false);
    expect(c.sub).toBe(0);
  });
});
