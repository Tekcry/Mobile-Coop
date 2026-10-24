import { describe, expect, it } from 'vitest';
import {
  AL_ARMOUR,
  AL_CARRY,
  AL_CARRY_SHIFT,
  AL_CAUTION,
  AL_HELMET,
  AL_MAX,
  AL_SEIZED,
  AL_TORCH,
  alertCarry,
  packAlert,
  parseMessage,
  WIRE_CARRY_DRAWING,
  WIRE_CARRY_DRAWN,
  WIRE_CARRY_HOLSTERED,
  WIRE_CARRY_HOLSTERING,
  type EnemyState,
} from '../src/net/protocol';
import { CARRY_DRAWING, CARRY_DRAWN, CARRY_HOLSTERED, CARRY_HOLSTERING, GUARD_CARRY, GuardCarry, type CarryPhase } from '../src/ai/carryState';
import { carryPhaseOf, PuppetCarry, wireCarry } from '../src/net/puppetCarry';
import type { RigPose } from '../src/player/characterRig';

// (guard-ai A126, protocol 41) The S21 weapon carry on the wire: the host's carry phase in `al` bits 7-8, and the
// client's `PuppetCarry` following it (the same draw / holster clip, posed through the host's `GuardGunCarry`).

const snapEnemies = (enemies: EnemyState[]): EnemyState[] => {
  const m = parseMessage(JSON.parse(JSON.stringify({ t: 'snap', time: 1, players: [], enemies, obj: '', info: '' })));
  return m && m.t === 'snap' ? m.enemies : [];
};

const PHASES: CarryPhase[] = [CARRY_HOLSTERED, CARRY_DRAWING, CARRY_DRAWN, CARRY_HOLSTERING];

describe('guard-ai A126: the carry bits', () => {
  it('the carry is bits 7-8 over every S9 bit; drawn is 0, so old packAlert callers are unchanged', () => {
    expect([AL_CARRY_SHIFT, AL_CARRY, AL_MAX]).toEqual([7, 384, 65535]);
    expect(AL_CARRY & (3 | AL_SEIZED | AL_TORCH | AL_CAUTION | AL_HELMET | AL_ARMOUR)).toBe(0);
    expect([WIRE_CARRY_DRAWN, WIRE_CARRY_HOLSTERED, WIRE_CARRY_DRAWING, WIRE_CARRY_HOLSTERING]).toEqual([0, 1, 2, 3]);
    expect(packAlert(3, true, true)).toBe(15);
    expect(packAlert(0, false, false, true, true, true)).toBe(112);
    expect(packAlert(0, false, false, false, false, false, WIRE_CARRY_HOLSTERED)).toBe(128);
    expect(packAlert(3, true, true, true, true, true, WIRE_CARRY_HOLSTERING)).toBe(511);
    expect(alertCarry(packAlert(2, false, true, true))).toBe(WIRE_CARRY_DRAWN);
  });

  it('pack / unpack round trip through JSON and the parser: every carry with every S9 bit', () => {
    const states: EnemyState[] = [];
    const want: number[][] = [];
    for (let carry = 0; carry < 4; carry++) {
      for (let lvl = 0; lvl < 4; lvl++) {
        for (let mask = 0; mask < 32; mask++) {
          const f = [(mask & 1) !== 0, (mask & 2) !== 0, (mask & 4) !== 0, (mask & 8) !== 0, (mask & 16) !== 0];
          const al = packAlert(lvl, f[0]!, f[1]!, f[2]!, f[3]!, f[4]!, carry);
          states.push({ id: `e${states.length}`, k: 'grunt', x: 0, y: 0, z: 0, yaw: 0, st: 0, hp: 1, al });
          want.push([lvl, mask, carry]);
        }
      }
    }
    const got: EnemyState[] = [];
    for (let i = 0; i < states.length; i += 32) got.push(...snapEnemies(states.slice(i, i + 32)));
    expect(got.length).toBe(512);
    got.forEach((e, i) => {
      const al = e.al;
      const mask = (al & AL_SEIZED ? 1 : 0) | (al & AL_TORCH ? 2 : 0) | (al & AL_CAUTION ? 4 : 0) | (al & AL_HELMET ? 8 : 0) | (al & AL_ARMOUR ? 16 : 0);
      expect([al & 3, mask, alertCarry(al)]).toEqual(want[i]);
    });
  });

  it('the host phase maps to the wire and back for every phase; drawn is 0', () => {
    for (const p of PHASES) expect(carryPhaseOf(wireCarry(p))).toBe(p);
    expect(wireCarry(CARRY_DRAWN)).toBe(WIRE_CARRY_DRAWN);
    expect(new Set(PHASES.map(wireCarry)).size).toBe(4);
  });
});

/** The host's guard stepped at 60 Hz, the client's puppet carry fed a 15 Hz snapshot (through JSON) and stepped per
 *  render frame, as `CoopHost` / `EnemyPuppet` do. */
function link(cls: string) {
  const host = new GuardCarry(true, cls);
  const pup = new PuppetCarry(cls);
  let wire = 0;
  let t = 0;
  let snapT = 0;
  return {
    host,
    pup,
    step(calm: boolean): void {
      host.step(1 / 60, calm);
      t += 1 / 60;
      if (t >= snapT) {
        snapT = t + 1 / 15;
        wire = alertCarry(snapEnemies([{ id: 'g', k: 'grunt', x: 0, y: 0, z: 0, yaw: 0, st: 0, hp: 1, al: packAlert(0, false, false, false, false, false, wireCarry(host.phase)) }])[0]!.al);
      }
      pup.step(1 / 60, wire);
    },
  };
}

describe('guard-ai A126: the puppet follows the host carry (PuppetCarry)', () => {
  it('holstered from the first state, draws when the host draws, at the host draw time, then drawn', () => {
    const l = link('rifle');
    for (let i = 0; i < 30; i++) l.step(true);
    expect(l.host.holstered).toBe(true);
    expect(l.pup.c.holstered).toBe(true);
    expect(l.pup.c.seq).toBe(1); // taken as it was, no clip
    let drawStart = -1;
    let drawn = -1;
    for (let i = 0; i < 120; i++) {
      l.step(false);
      if (drawStart < 0 && l.pup.c.phase === CARRY_DRAWING) drawStart = i;
      if (drawn < 0 && l.pup.c.drawn) drawn = i;
      if (l.pup.c.phase === CARRY_DRAWING) expect(l.pup.c.swapClip()).toBeGreaterThan(0);
    }
    // one snapshot late at most, the draw at the rifle's 0.7 s (+ the one end step)
    expect(drawStart).toBeLessThanOrEqual(5);
    expect((drawn - drawStart) / 60).toBeGreaterThanOrEqual(GUARD_CARRY.draw.long - 0.02);
    expect((drawn - drawStart) / 60).toBeLessThan(GUARD_CARRY.draw.long + 0.1);
    expect(l.pup.c.phase).toBe(CARRY_DRAWN);
  });

  it('holsters after the host calm hold; a stir mid-holster draws straight back, quicker than a full draw', () => {
    const l = link('pistol');
    for (let i = 0; i < 10; i++) l.step(false);
    expect(l.pup.c.drawn).toBe(true);
    for (let i = 0; i < 60 * GUARD_CARRY.calmHold - 30; i++) l.step(true);
    expect(l.pup.c.drawn).toBe(true); // no flicker before the hold
    for (let i = 0; i < 60 && l.pup.c.phase !== CARRY_HOLSTERING; i++) l.step(true);
    expect(l.pup.c.phase).toBe(CARRY_HOLSTERING);
    for (let i = 0; i < 30; i++) l.step(true); // half the 0.9 s holster
    const u = l.pup.c.u;
    expect(u).toBeGreaterThan(0.2);
    let n = 0;
    while (!l.pup.c.drawn && n < 120) {
      l.step(false);
      n++;
    }
    expect(l.pup.c.drawn).toBe(true);
    expect(n / 60).toBeLessThan(GUARD_CARRY.draw.pistol + 0.1);
  });

  it('a clip seen late is played whole, never jumped; a drawn host (never holsters, old al) stays drawn', () => {
    const p = new PuppetCarry('rifle');
    p.step(1 / 60, WIRE_CARRY_HOLSTERED);
    expect(p.c.holstered).toBe(true);
    // the snapshot skipped the drawing phase: the puppet still runs the draw
    p.step(1 / 60, WIRE_CARRY_DRAWN);
    expect(p.c.phase).toBe(CARRY_DRAWING);
    for (let i = 0; i < 30; i++) p.step(1 / 60, WIRE_CARRY_DRAWN);
    expect(p.c.phase).toBe(CARRY_DRAWING);
    for (let i = 0; i < 20; i++) p.step(1 / 60, WIRE_CARRY_DRAWN);
    expect(p.c.drawn).toBe(true);
    // the client's draw ran ahead of the host's: it waits at the end until the host is drawn
    const q = new PuppetCarry('rifle');
    q.step(1 / 60, WIRE_CARRY_HOLSTERED);
    for (let i = 0; i < 120; i++) q.step(1 / 60, WIRE_CARRY_DRAWING);
    expect([q.c.phase, q.c.u]).toEqual([CARRY_DRAWING, 1]);
    q.step(1 / 60, WIRE_CARRY_DRAWN);
    expect(q.c.drawn).toBe(true);
    const r = new PuppetCarry('rifle');
    for (let i = 0; i < 600; i++) r.step(1 / 60, alertCarry(packAlert(0, false, true)));
    expect([r.c.drawn, r.c.seq]).toEqual([true, 1]);
  });

  it('no allocation per step (plain fields only)', () => {
    const p = new PuppetCarry('rifle');
    const keys = Object.keys(p).sort();
    for (let i = 0; i < 200; i++) p.step(1 / 60, i % 50 < 25 ? WIRE_CARRY_HOLSTERED : WIRE_CARRY_DRAWN);
    expect(Object.keys(p).sort()).toEqual(keys);
  });
});

describe('guard-ai A126: the puppet poses the gun as the host (real rig, NullEngine)', () => {
  it('the client rifle is slung when the host holsters, travels on the draw, in the hands once drawn; same parents as the host', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    const { buildEnemyRig, GuardGunCarry } = await import('../src/ai/enemyRig');
    const { carryRaise, carrySlotOf } = await import('../src/ai/carryState');
    const scene = new Scene(new NullEngine());
    const world = { parts: new PartLibrary(scene), map: { theme: { faction: 'urban' } }, addShadowCaster: () => {} };
    const def = ENEMIES.grunt;
    const mk = (name: string) => {
      const { rig, gun } = buildEnemyRig(scene, world as never, def, name);
      const slot = carrySlotOf(gun!.def.class);
      return { rig, gun: gun!, slot, gc: new GuardGunCarry(rig, gun!, slot) };
    };
    const h = mk('host-a126');
    const c = mk('client-a126');
    const l = link(h.gun.def.class);
    const rp: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0 };
    /** `EnemyPuppet.update`'s carry block on the client rig. */
    const frame = (calm: boolean, aim: number): void => {
      l.step(calm);
      h.gc.apply(l.host);
      c.gc.apply(l.pup.c);
      rp.aim = carryRaise(aim, l.pup.c);
      rp.ready = l.pup.c.holstered;
      rp.swap = l.pup.c.swapClip();
      rp.swapFrom = c.slot;
      rp.swapTo = c.slot;
      c.rig.animate(1 / 60, rp);
    };
    for (let i = 0; i < 30; i++) frame(true, 0.2);
    expect(c.slot).toBe('backC');
    expect(c.rig.heldWeapon).toBeNull();
    expect(c.gun.node.parent).toBe(c.rig.torso);
    expect(h.gun.node.parent).toBe(h.rig.torso);
    expect(rp.ready).toBe(true);
    expect(rp.aim).toBe(0);
    let travelled = false;
    for (let i = 0; i < 90; i++) {
      frame(false, 0.4);
      travelled ||= c.rig.weaponTravel;
    }
    expect(travelled).toBe(true);
    expect(l.pup.c.drawn).toBe(true);
    expect(c.rig.heldWeapon).toBe(c.gun.node);
    expect(c.gun.node.parent).toBe(c.rig.weaponPivot);
    expect(rp.ready).toBe(false);
    expect(rp.aim).toBeCloseTo(0.4);
    for (let i = 0; i < 60 * (GUARD_CARRY.calmHold + 2); i++) frame(true, 0.2);
    expect(l.pup.c.holstered).toBe(true);
    expect(c.gun.node.parent).toBe(c.rig.torso);
    scene.dispose();
  });
});
