// (CT prototype G7) Grab, hold, knockout, carry against the CT footage (AUDIT-WALLS rows 5-8, 11, 19, 20): the pure
// timelines, and the real rigs on a NullEngine posed as the controllers pose them, checked for clipping (the hold
// forearm against the guard's head and neck, the two bodies' heads and feet, the carried body against the carrier).
import { describe, expect, it } from 'vitest';
import { CQ, dropCurve, flailAt, GuardCq, holdHandTargets, holdHandsLocal, holdSway, koCurve, liftCurve, type DropState, type KoState, type LiftState } from '../src/game/closeQuarters';
import { GRAB } from '../src/game/takedown';
import { BODY } from '../src/ai/bodies';
import { segDist, type V3 } from '../src/anim/rigMath';

describe('G7 close quarters: timelines (pure)', () => {
  it('the hold is settled about 1 s after the press (CT 110936 ~1.2 s, 052607 ~1 s)', () => {
    expect(GRAB.approach + GRAB.pull).toBeGreaterThan(0.85);
    expect(GRAB.approach + GRAB.pull).toBeLessThan(1.25);
  });
  it('carry is a slow walk (CT 0.4-0.8 m/s), the hostage walk ~0.7 m/s', () => {
    expect(BODY.carrySpeed).toBeLessThanOrEqual(0.85);
    expect(GRAB.speedCap).toBeCloseTo(0.75);
  });
  it('knockout from the hold: limp, then lowered, the hero bent most at the end (110936 @ 37.0-38.2, ~1 s)', () => {
    const k: KoState = { limp: 0, lower: 0, bend: 0 };
    expect(CQ.koTime).toBeGreaterThan(0.7);
    expect(CQ.koTime).toBeLessThan(1.1);
    koCurve(0, k);
    expect(k.limp + k.lower + k.bend).toBe(0);
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
      koCurve(i / 20, k);
      expect(k.lower).toBeGreaterThanOrEqual(prev);
      prev = k.lower;
    }
    koCurve(1, k);
    expect(k.limp).toBe(1);
    expect(k.lower).toBe(1);
    expect(k.bend).toBe(1);
    // limp before lowered
    koCurve(0.4, k);
    expect(k.limp).toBeGreaterThan(k.lower);
  });
  it('body lift 2.0 s: at the body to 0.8 s, on the shoulder by 1.6 s (110936 @ 39.5-42.6)', () => {
    const l: LiftState = { atBody: true, hoist: 0, bend: 0, drop: 0, crouch: true, hands: 0, step: 0, load: 0 };
    expect(CQ.lift).toBeCloseTo(2.0);
    liftCurve(0.5, l);
    expect(l.atBody && l.crouch).toBe(true);
    expect(l.bend).toBeGreaterThan(0.4);
    liftCurve(0.81, l);
    expect(l.atBody).toBe(false);
    expect(l.hoist).toBeLessThan(0.05);
    liftCurve(1.6, l);
    expect(l.hoist).toBe(1);
    expect(l.bend).toBeCloseTo(CQ.carryBend);
    liftCurve(1.3, l);
    expect(l.crouch).toBe(false);
  });
  it('put down 0.8 s: the ragdoll takes it at 0.4 s (it falls the rest), the hands off by 0.8 s, a small push', () => {
    const d: DropState = { slide: 0, bend: 0, drop: 0, hands: 1, load: 1 };
    dropCurve(CQ.dropHand, d);
    expect(d.slide).toBe(1);
    expect(d.hands).toBe(1);
    dropCurve(CQ.drop, d);
    expect(d.hands).toBe(0);
    expect(d.drop).toBeLessThan(0.01);
    dropCurve(CQ.drop / 2, d);
    expect(d.drop).toBeCloseTo(CQ.dropDip, 2);
    expect(Math.abs(CQ.dropImpulse)).toBeLessThanOrEqual(3);
    expect(Math.abs(CQ.dropImpulseDown)).toBeLessThanOrEqual(2);
  });
  it('the hold sway is 2 cm at 0.5 Hz, none while walking', () => {
    let m = 0;
    for (let t = 1; t < 5; t += 0.01) m = Math.max(m, Math.abs(holdSway(t, 1)));
    expect(m).toBeCloseTo(0.02, 3);
    expect(holdSway(2.5, 0)).toBe(0);
  });
  it('flails last 0.4 s, 2-4 s apart, the same on every machine', () => {
    const starts: number[] = [];
    let on = false;
    for (let t = 0; t < 30; t += 0.005) {
      const f = flailAt(t, 0.37);
      if (f > 0 && !on) starts.push(t);
      on = f > 0;
    }
    expect(starts.length).toBeGreaterThan(5);
    for (let i = 1; i < starts.length; i++) {
      const gap = starts[i]! - starts[i - 1]! - CQ.flail;
      expect(gap).toBeGreaterThan(CQ.flailGapMin - 0.02);
      expect(gap).toBeLessThan(CQ.flailGapMax + 0.02);
    }
    expect(flailAt(7.3, 0.37)).toBe(flailAt(7.3, 0.37));
  });
  it('the guard pose keeps its joint set through every mode, and starts at the contact', () => {
    const g = new GuardCq();
    g.seize(false, 0.42);
    expect(g.pose(0.2)).toBeNull();
    const keys = Object.keys(g.pose(0.6)!).sort().join();
    g.set('hostage');
    for (const t of [0.7, 0.8, 1.5]) expect(Object.keys(g.pose(t)!).sort().join()).toBe(keys);
    g.set('ko');
    g.k = 1;
    const p = g.pose(3)!;
    // limp: the arms hang (shoulders near the rest), the head forward
    expect(Math.abs(p.shoulderL[0])).toBeLessThan(0.3);
    expect(p.neck[0]).toBeGreaterThan(0.3);
    // a mode change blends (no jump in one frame)
    g.set('hostage');
    const a = g.pose(3.0)!.shoulderL[0];
    const b = g.pose(3.017)!.shoulderL[0];
    expect(Math.abs(b - a)).toBeLessThan(0.2);
  });
});

type Node = { parent: unknown; computeWorldMatrix(f: boolean): unknown; getAbsolutePosition(): { x: number; y: number; z: number } };
const W = (nd: Node): V3 => {
  const chain: Node[] = [];
  for (let q: Node | null = nd; q; q = q.parent as Node | null) chain.unshift(q);
  for (const q of chain) q.computeWorldMatrix(true);
  const p = nd.getAbsolutePosition();
  return { x: p.x, y: p.y, z: p.z };
};
const dist = (a: V3, b: V3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

async function scene() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/player/avatarLook');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const sc = new Scene(new NullEngine());
  const lib = new PartLibrary(sc);
  const make = (look: ReturnType<typeof defaultLook>, h?: number) => {
    const r = new CharacterRig(sc, (shape, hex, slot) => lib.instance(shape, hex, slot), look, h);
    r.groundProbe = () => 0;
    return r;
  };
  return { sc, make, defaultLook, grunt: ENEMIES.grunt };
}

describe('G7 close quarters: the real rigs (NullEngine), no clipping', () => {
  it('the hostage hold, still and walking at 0.7 m/s: forearm across the throat clears his head, bodies and feet apart', async () => {
    const { sc, make, defaultLook, grunt } = await scene();
    const hero = make(defaultLook());
    const guard = make(grunt.look, grunt.height);
    const cq = new GuardCq();
    cq.seize(false, 0);
    cq.set('hostage');
    guard.emote = (_r, t) => cq.pose(t) ?? undefined;
    const dt = 1 / 60;
    const r = { forearmHead: 9, forearmNeck: 9, heads: 9, feet: 9, reachErr: 0, chest: 9, handTorso: 9 };
    const L = { x: 0, y: 0, z: 0 };
    const R = { x: 0, y: 0, z: 0 };
    let z = 0;
    for (let n = 0; n < 60 * 4; n++) {
      const t = n * dt;
      const sp = t > 1.5 ? 0.7 : 0;
      z += sp * dt;
      hero.root.position.set(0, 0, z);
      hero.root.rotation.y = 0;
      guard.root.position.set(GRAB.side, 0, z + GRAB.hold);
      guard.root.rotation.y = 0;
      guard.animate(dt, { speed: sp, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, velX: 0, velZ: sp });
      const nk = W(guard.neck as unknown as Node);
      const sr = W(guard.shoulderR as unknown as Node);
      holdHandTargets(nk.x, nk.y, nk.z, sr.x, sr.y, sr.z, 0, L, R);
      Object.assign(hero.reachL, L, { w: 1 });
      Object.assign(hero.reachR, R, { w: 0.9 });
      hero.animate(dt, { speed: sp, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, bend: CQ.holdBend, velX: 0, velZ: sp });
      if (t < 1) continue;
      const el = W(hero.elbowL as unknown as Node);
      const wr = W(hero.wristL as unknown as Node);
      const gh = W(guard.headNode as unknown as Node);
      const gn = W(guard.neck as unknown as Node);
      r.forearmHead = Math.min(r.forearmHead, segDist(gh.x, gh.y, gh.z, el, wr));
      r.forearmNeck = Math.min(r.forearmNeck, segDist(gn.x, gn.y + 0.05, gn.z, el, wr));
      r.heads = Math.min(r.heads, dist(W(hero.headNode as unknown as Node), gh));
      r.chest = Math.min(r.chest, W(guard.torso as unknown as Node).z - W(hero.torso as unknown as Node).z);
      r.reachErr = Math.max(r.reachErr, Math.hypot(wr.x - L.x, wr.y - L.y, wr.z - L.z));
      for (const ha of [hero.ankleL, hero.ankleR]) for (const ga of [guard.ankleL, guard.ankleR]) {
        const a = W(ha as unknown as Node);
        const b = W(ga as unknown as Node);
        r.feet = Math.min(r.feet, Math.hypot(a.x - b.x, a.z - b.z));
      }
    }
    sc.dispose();
    const headR = guard.p.head.w / 2;
    const armR = hero.p.forearm.r0;
    // the forearm lies across the front of the throat: clear of the head (skin contact at most), touching the neck
    expect(r.forearmHead, JSON.stringify(r)).toBeGreaterThan(headR + armR - 0.015);
    expect(r.forearmNeck, JSON.stringify(r)).toBeLessThan(0.16);
    // the hand reaches the hold point (the palm is a hand's length past the wrist)
    expect(r.reachErr, JSON.stringify(r)).toBeLessThan(hero.p.hand.len + 0.06);
    expect(r.heads, JSON.stringify(r)).toBeGreaterThan(hero.p.head.w * 0.5 + headR);
    // chests together but not through each other (torso joints at least a torso depth apart)
    expect(r.chest, JSON.stringify(r)).toBeGreaterThan(hero.p.chest.d * 0.5 + guard.p.chest.d * 0.5 - 0.03);
    // (fix round) his feet walk between hers (GRAB.side): ankles at least 0.085 m apart side to side (the 0.1 m wide
    // soles may graze by ~1.5 cm when level, never on top of each other; the shins clear: the next test)
    expect(r.feet, JSON.stringify(r)).toBeGreaterThan(0.085);
  });

  it('(fix round) the hostage walk at 0.7 m/s: her legs and feet never meet his, at any gait phase between them', async () => {
    const { sc, make, defaultLook, grunt } = await scene();
    let worst = 9;
    let need = 0;
    for (const off of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]) {
      const hero = make(defaultLook());
      const guard = make(grunt.look, grunt.height);
      need = hero.p.calf.r1 + guard.p.calf.r1;
      let z = 0;
      for (let n = 0; n < 240; n++) {
        const t = n / 60;
        const sp = 0.7;
        z += sp / 60;
        hero.root.position.set(0, 0, z);
        guard.root.position.set(GRAB.side, 0, z + GRAB.hold);
        const ph = (t * 0.9) % 1;
        hero.animate(1 / 60, { speed: sp, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, bend: CQ.holdBend, velX: 0, velZ: sp, phase: ph });
        guard.animate(1 / 60, { speed: sp, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, velX: 0, velZ: sp, phase: (ph + off) % 1 });
        if (t < 1) continue;
        for (const [k, a] of [[hero.kneeL, hero.ankleL], [hero.kneeR, hero.ankleR]] as const) {
          const K = W(k as unknown as Node);
          const A = W(a as unknown as Node);
          const T = { x: A.x, y: A.y, z: A.z + hero.p.foot.len * 0.7 };
          for (const [gk, ga] of [[guard.kneeL, guard.ankleL], [guard.kneeR, guard.ankleR]] as const) {
            const GK = W(gk as unknown as Node);
            const GA = W(ga as unknown as Node);
            const GT = { x: GA.x, y: GA.y, z: GA.z + guard.p.foot.len * 0.7 };
            for (let u = 0; u <= 1.001; u += 0.25) {
              for (const [p0, p1] of [[K, A], [A, T]] as const) {
                const px = p0.x + (p1.x - p0.x) * u;
                const py = p0.y + (p1.y - p0.y) * u;
                const pz = p0.z + (p1.z - p0.z) * u;
                worst = Math.min(worst, segDist(px, py, pz, GK, GA), segDist(px, py, pz, GA, GT));
              }
            }
          }
        }
      }
      hero.dispose();
      guard.dispose();
    }
    sc.dispose();
    // shin and foot centre lines at least the two ankles' radii apart (straight in front it was 1-3 mm: legs through legs)
    expect(worst, JSON.stringify({ worst, need })).toBeGreaterThan(need);
  });

  it('the remote hold hands sit within a few cm of the owner\'s (MoveState only, no guard rig)', async () => {
    const { sc, make, grunt } = await scene();
    const guard = make(grunt.look, grunt.height);
    const cq = new GuardCq();
    cq.seize(false, 0);
    cq.set('hostage');
    guard.emote = (_r, t) => cq.pose(t) ?? undefined;
    guard.root.position.set(GRAB.side, 0, GRAB.hold);
    for (let n = 0; n < 60; n++) guard.animate(1 / 60, { speed: 0, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0 });
    const nk = W(guard.neck as unknown as Node);
    const sr = W(guard.shoulderR as unknown as Node);
    const L = { x: 0, y: 0, z: 0 };
    const R = { x: 0, y: 0, z: 0 };
    holdHandTargets(nk.x, nk.y, nk.z, sr.x, sr.y, sr.z, 0, L, R);
    const lL = { x: 0, y: 0, z: 0 };
    const lR = { x: 0, y: 0, z: 0 };
    holdHandsLocal(GRAB.hold, GRAB.side, lL, lR);
    sc.dispose();
    expect(dist(L, lL), JSON.stringify({ L, lL })).toBeLessThan(0.08);
    expect(dist(R, lR), JSON.stringify({ R, lR })).toBeLessThan(0.08);
  });

  for (const headRight of [true, false]) {
    it(`the hoist from the floor to the shoulder never passes through the carrier, nor under the floor (head to his ${headRight ? 'right: right shoulder' : 'left: left shoulder'})`, async () => {
      const { sc, make, defaultLook, grunt } = await scene();
      const { TransformNode, Quaternion, Vector3 } = await import('../src/core/babylon');
      const { layAt, hoistAt, socketLocal, attachToShoulder, slideAt, captureLying, SOCKET_YAW } = await import('../src/ai/carryPose');
      const hero = make(defaultLook());
      const body = make(grunt.look, grunt.height);
      const p = hero.p;
      const chestY = p.y.waist + 0.13 * (hero.height / 1.75);
      // (StealthSystems.carrySide) the shoulder on the side the head lies
      const side = headRight ? 1 : -1;
      const sx = p.shoulderHalf * 0.75 * side;
      const sy = p.y.shoulder - chestY + 0.12;
      // the body lies across in front of the kneeling carrier (the step-in: 0.5 m from its chest)
      // (fix round) a corpse lying as a ragdoll leaves it (knees and hips bent, an arm out), copied onto the carried rig
      const corpse = make(grunt.look, grunt.height);
      const q0 = new Quaternion();
      layAt(corpse, -0.15 * side, 0.12, CQ.liftSide, (side * Math.PI) / 2, q0);
      Quaternion.RotationYawPitchRollToRef(0, -0.6, 0.1, corpse.hipL.rotationQuaternion!);
      Quaternion.RotationYawPitchRollToRef(0, 0.9, 0, corpse.kneeL.rotationQuaternion!);
      Quaternion.RotationYawPitchRollToRef(0, -0.3, -0.6, corpse.shoulderR.rotationQuaternion!);
      const from = new Vector3();
      const fromJ = Array.from({ length: 16 }, () => new Quaternion());
      captureLying(corpse, body, q0, from, fromJ);
      // no pop: every joint of the carried rig where the corpse's is
      let pop = 0;
      for (const k of ['hips', 'torso', 'headNode', 'kneeL', 'ankleL', 'wristR', 'ankleR'] as const) pop = Math.max(pop, dist(W(corpse[k] as unknown as Node), W(body[k] as unknown as Node)));
      expect(pop, 'capture pop').toBeLessThan(0.02);
      corpse.dispose();
      const sock = new TransformNode('sock', sc);
      sock.parent = hero.torso;
      const s = { th: 0, x: 0, y: 0, z: 0 };
      socketLocal(body, sx, sy, s);
      sock.rotation.set(s.th, SOCKET_YAW, 0);
      sock.position.set(s.x, s.y, s.z);
      const lc: LiftState = { atBody: true, hoist: 0, bend: 0, drop: 0, crouch: true, hands: 0, step: 0, load: 0 };
      const dt = 1 / 60;
      let crouch = 1;
      const r: Record<string, unknown> & { head: number; floor: number; torso: number; legsUp: number; heroLegs: number } = { head: 9, floor: 9, torso: 9, legsUp: -9, heroLegs: 9 };
      const parts = [body.headNode, body.torso, body.hips, body.kneeL, body.kneeR, body.ankleL, body.ankleR];
      const check = (t: number): void => {
        const hh = W(hero.headNode as unknown as Node);
        const hip = W(hero.hips as unknown as Node);
        const nk = W(hero.neck as unknown as Node);
        // the body's ankles never above its pelvis (legs kept down: they swung up across her chest)
        const bh = W(body.hips as unknown as Node);
        const lu = Math.max(W(body.ankleL as unknown as Node).y - bh.y, W(body.ankleR as unknown as Node).y - bh.y);
        // (lying, before the hoist takes it, a bent knee may stand above the pelvis)
        if ((lc.hoist > 0.15 || t > 3) && lu > r.legsUp) { r.legsUp = lu; r.legsAt = t.toFixed(2); }
        // her legs (hip - knee - ankle) never through its trunk (pelvis to chest)
        const bt = W(body.torso as unknown as Node);
        for (const [a0, a1] of [[hero.hipL, hero.kneeL], [hero.kneeL, hero.ankleL], [hero.hipR, hero.kneeR], [hero.kneeR, hero.ankleR]] as const) {
          const A0 = W(a0 as unknown as Node);
          const A1 = W(a1 as unknown as Node);
          for (let u = 0; u <= 1.001; u += 0.25) r.heroLegs = Math.min(r.heroLegs, segDist(A0.x + (A1.x - A0.x) * u, A0.y + (A1.y - A0.y) * u, A0.z + (A1.z - A0.z) * u, bh, bt));
        }
        for (const nd of parts) {
          const b = W(nd as unknown as Node);
          r.head = Math.min(r.head, dist(b, hh));
          if (b.y < r.floor) { r.floor = b.y; r.floorAt = [t.toFixed(2), parts.indexOf(nd)]; }
          // the carrier's trunk as a segment from the hips to the neck
          const dd = segDist(b.x, b.y, b.z, hip, nk);
          if (dd < r.torso) {
            r.torso = dd;
            r.at = [t.toFixed(2), parts.indexOf(nd)];
          }
        }
      };
      for (let n = 0; n <= 60 * CQ.lift; n++) {
        const t = n * dt;
        liftCurve(t, lc);
        // the controller's stance ease (crouch held, then standTime ~0.25 s)
        crouch = lc.crouch ? Math.min(1, crouch + dt / 0.22) : Math.max(0, crouch - dt / 0.25);
        hero.animate(dt, { speed: 0, localX: 0, localZ: 1, grounded: true, crouch, aimPitch: 0, aim: 0, kick: 0, armed: false, kneel: false, bend: lc.bend, bendDrop: lc.drop });
        if (lc.atBody) continue;
        if (t < CQ.liftRise) hoistAt(body, from, q0, fromJ, sock, side, lc.hoist);
        else if (body.root.parent !== hero.torso) attachToShoulder(body, hero.torso, sx, sy);
        check(t);
      }
      // the put down's slide off the shoulder
      for (let k = 0; k <= 1.001; k += 0.05) {
        slideAt(body, sx, sy, k);
        hero.animate(dt, { speed: 0, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, bend: CQ.carryBend, bendDrop: 0.1 });
        check(3 + k);
      }
      sc.dispose();
      // joint centres: the body's limbs ~0.06-0.09 m thick, the carrier's head ~0.1 m radius, his trunk axis to skin ~0.1
      expect(r.head, JSON.stringify(r)).toBeGreaterThan(0.17);
      expect(r.floor, JSON.stringify(r)).toBeGreaterThan(0.02);
      expect(r.torso, JSON.stringify(r)).toBeGreaterThan(0.1);
      expect(r.legsUp, JSON.stringify(r)).toBeLessThan(0.05);
      expect(r.heroLegs, JSON.stringify(r)).toBeGreaterThan(0.15);
    });
  }
});
