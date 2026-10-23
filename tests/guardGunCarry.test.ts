import { describe, expect, it } from 'vitest';
import type { RigPose } from '../src/player/characterRig';

// (guard-ai S21) The guard's gun follows his carry on the real rig (NullEngine): holstered it rides in its slot with the
// hands empty (the rifle slung across the back, the pistol on the right thigh: thighGear), a draw / holster carries it in
// the trigger hand along the travel path with the clip, drawn it is back in the aim pocket. No jump from frame to frame.

const DT = 1 / 60;

async function setup(kind: 'grunt' | 'officer') {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, Vector3 } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const { buildEnemyRig, GuardGunCarry } = await import('../src/ai/enemyRig');
  const { GuardCarry, carrySlotOf, carryRaise } = await import('../src/ai/carryState');
  const scene = new Scene(new NullEngine());
  const parts = new PartLibrary(scene);
  const world = { parts, map: { theme: { faction: 'urban' } }, addShadowCaster: () => {} };
  const def = ENEMIES[kind];
  const { rig, gun } = buildEnemyRig(scene, world as never, def, `${kind}-s21`);
  const g = gun!;
  const slot = carrySlotOf(g.def.class);
  const gc = new GuardGunCarry(rig, g, slot);
  const carry = new GuardCarry(true, g.def.class);
  const rp: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0 };
  const at = new Vector3();
  const prev = new Vector3();
  let worst = 0;
  let first = true;
  /** One step + frame as `Enemy.update` / `Enemy.frame` do; the gun's largest world move in a frame so far. */
  const tick = (calm: boolean, aim: number): void => {
    carry.step(DT, calm);
    gc.apply(carry);
    rp.aim = carryRaise(aim, carry);
    rp.ready = carry.holstered;
    rp.swap = carry.swapClip();
    rp.swapFrom = slot;
    rp.swapTo = slot;
    rig.animate(DT, rp);
    g.node.computeWorldMatrix(true);
    at.copyFrom(g.node.getAbsolutePosition());
    expect(Number.isFinite(at.x + at.y + at.z)).toBe(true);
    if (!first) {
      const mv = at.subtract(prev).length();
      if (process.env.S21_TRACE && mv > 0.04) console.info(`jump ${(mv * 100).toFixed(1)} cm phase ${carry.phase} u ${carry.u.toFixed(2)} seq ${carry.seq} travel ${rig.weaponTravel}`);
      worst = Math.max(worst, mv);
    }
    first = false;
    prev.copyFrom(at);
  };
  return { rig, g, slot, carry, tick, worst: () => worst, resetWorst: () => (worst = 0) };
}

describe('the guard gun carry on the rig (GuardGunCarry)', () => {
  it('rifle: slung across the back when calm, drawn by the trigger hand along the travel, back in the hands', async () => {
    const s = await setup('grunt');
    expect(s.slot).toBe('backC');
    for (let i = 0; i < 60; i++) s.tick(true, 0.2);
    expect(s.carry.holstered).toBe(true);
    expect(s.rig.heldWeapon).toBeNull();
    expect(s.g.slot).toBe('backC');
    expect(s.g.node.parent).toBe(s.rig.torso);
    s.resetWorst();
    // suspicious: the draw
    s.tick(false, 0.4);
    expect(s.rig.weaponTravel).toBe(true);
    for (let i = 0; i < 60 && !s.carry.drawn; i++) s.tick(false, 0.4);
    expect(s.carry.drawn).toBe(true);
    for (let i = 0; i < 30; i++) s.tick(false, 0.4);
    expect(s.rig.heldWeapon).toBe(s.g.node);
    expect(s.g.node.parent).toBe(s.rig.weaponPivot);
    expect(s.rig.weaponTravel).toBe(false);
    // calm hold, then the holster
    for (let i = 0; i < 60 * 17; i++) s.tick(true, 0.2);
    expect(s.carry.holstered).toBe(true);
    expect(s.rig.heldWeapon).toBeNull();
    expect(s.g.node.parent).toBe(s.rig.torso);
    // never a jump: a draw moves the gun ~1 m in 0.7 s (under 3 cm a frame)
    console.info(`S21 rifle worst gun move a frame: ${(s.worst() * 100).toFixed(1)} cm`);
    expect(s.worst()).toBeLessThan(0.12);
  });

  it('pistol: on the right thigh (thighGear) when calm, drawn and holstered again', async () => {
    const s = await setup('officer');
    expect(s.slot).toBe('thigh');
    for (let i = 0; i < 60; i++) s.tick(true, 0.2);
    expect(s.carry.holstered).toBe(true);
    expect(s.rig.thighGear).toBe(true);
    expect(s.g.node.parent).toBe(s.rig.hipR);
    s.resetWorst();
    for (let i = 0; i < 60; i++) s.tick(false, 1);
    expect(s.carry.drawn).toBe(true);
    expect(s.rig.thighGear).toBe(false);
    expect(s.rig.heldWeapon).toBe(s.g.node);
    // stirred mid-holster: back to the hands without a jump
    for (let i = 0; i < 60 * 15 + 20; i++) s.tick(true, 0.2);
    expect(s.carry.holstered).toBe(false);
    for (let i = 0; i < 60; i++) s.tick(false, 0.4);
    expect(s.carry.drawn).toBe(true);
    expect(s.rig.heldWeapon).toBe(s.g.node);
    console.info(`S21 pistol worst gun move a frame: ${(s.worst() * 100).toFixed(1)} cm`);
    expect(s.worst()).toBeLessThan(0.12);
  });
});

// (guard-ai S27, A164) The carry rule reads the mode's alarm stage too (`AiContext.alarmStage`, Sector Ops' panel, camera
// or laser stage): a calm guard with the guards' own alarm not raised but a stage up is not in a calm area (he draws);
// at stage 0 he holsters after the calm hold as before. On Enemy's prototype (the fields `carryCalm` reads).
describe('the carry after an alarm stage (guard-ai S27)', () => {
  async function calmGuard(stage: () => number) {
    const { Enemy } = await import('../src/ai/enemy');
    const { GuardCarry, GUARD_CARRY } = await import('../src/ai/carryState');
    const e = Object.create(Enemy.prototype) as InstanceType<typeof Enemy>;
    Object.assign(e, {
      ctx: { stealth: () => true, alarmRaised: () => false, alarmStage: stage },
      aware: { level: 'unaware' },
      caution: 0,
      incident: -1,
      camBody: null,
      postDef: null,
      responder: false,
      crew: null,
    });
    const carry = new GuardCarry(true, 'rifle');
    const calm = (): boolean => (e as unknown as { carryCalm(): boolean }).carryCalm();
    return { carry, calm, GUARD_CARRY };
  }

  it('stage 1 with no own alarm: not a calm area, he draws', async () => {
    let stage = 0;
    const s = await calmGuard(() => stage);
    expect(s.calm()).toBe(true);
    s.carry.step(DT, s.calm());
    expect(s.carry.holstered).toBe(true);
    stage = 1;
    expect(s.calm()).toBe(false);
    for (let i = 0; i < 60 && !s.carry.drawn; i++) s.carry.step(DT, s.calm());
    expect(s.carry.drawn).toBe(true);
    // he stays drawn while the stage holds
    for (let i = 0; i < 60 * (s.GUARD_CARRY.calmHold + 2); i++) s.carry.step(DT, s.calm());
    expect(s.carry.drawn).toBe(true);
  });

  it('stage 0 (a restart from a stage-0 checkpoint): holstered again after the calm hold', async () => {
    let stage = 2;
    const s = await calmGuard(() => stage);
    s.carry.step(DT, s.calm());
    expect(s.carry.drawn).toBe(true);
    stage = 0;
    for (let i = 0; i < 60 * (s.GUARD_CARRY.calmHold - 1); i++) s.carry.step(DT, s.calm());
    expect(s.carry.drawn).toBe(true);
    for (let i = 0; i < 60 * 3; i++) s.carry.step(DT, s.calm());
    expect(s.carry.holstered).toBe(true);
  });

  it('no alarmStage hook (the parked modes, the co-op client): as before', async () => {
    const { Enemy } = await import('../src/ai/enemy');
    const e = Object.create(Enemy.prototype) as InstanceType<typeof Enemy>;
    Object.assign(e, { ctx: { stealth: () => true, alarmRaised: () => false }, aware: { level: 'unaware' }, caution: 0, incident: -1, camBody: null, postDef: null, responder: false, crew: null });
    expect((e as unknown as { carryCalm(): boolean }).carryCalm()).toBe(true);
  });
});
