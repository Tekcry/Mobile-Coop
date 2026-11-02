import { describe, expect, it } from 'vitest';
import { BUILDS, headsTall, hitVolumes, proportions } from '../src/player/proportions';
import { elbowSwivelClear, segDist, solveTwoBone, springStep, v3, type V3 } from '../src/anim/rigMath';
import { AnimGraph, defaultInput, LOWER_STATES, pickLower, FADE } from '../src/anim/animGraph';
import { MOVEMENT } from '../src/config/movement';
import { coverStandoff } from '../src/cover/coverData';

const dist = (a: V3, b: V3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

describe('body proportions', () => {
  it('average build is ~7.5 heads tall at 1.75 m with shoulders ~2 head heights wide', () => {
    const p = proportions('average');
    expect(p.height).toBe(1.75);
    expect(headsTall(p)).toBeGreaterThan(7.3);
    expect(headsTall(p)).toBeLessThan(7.8);
    expect(p.shoulderWidth / p.head.h).toBeGreaterThan(1.8);
    expect(p.shoulderWidth / p.head.h).toBeLessThan(2.2);
  });
  it('torso tapers from chest to waist and limbs taper towards hands and feet', () => {
    for (const b of BUILDS) {
      const p = proportions(b);
      expect(p.waist.w).toBeLessThan(p.chest.w);
      expect(p.upperArm.r1).toBeLessThan(p.upperArm.r0);
      expect(p.forearm.r1).toBeLessThan(p.forearm.r0);
      expect(p.forearm.r0).toBeLessThanOrEqual(p.upperArm.r0);
      expect(p.thigh.r1).toBeLessThan(p.thigh.r0);
      expect(p.calf.r1).toBeLessThan(p.calf.r0);
      expect(p.calf.r0).toBeLessThan(p.thigh.r0);
      // not skinny: thigh at least ~half the head width, upper arm about a third
      expect(p.thigh.r0 * 2).toBeGreaterThan(p.head.w * 0.85);
      expect(p.upperArm.r0 * 2).toBeGreaterThan(p.head.w * 0.5);
    }
  });
  it('body types stay within a believable range of the average build', () => {
    const avg = proportions('average');
    for (const b of BUILDS) {
      const p = proportions(b);
      expect(p.shoulderWidth / avg.shoulderWidth).toBeGreaterThan(0.9);
      expect(p.shoulderWidth / avg.shoulderWidth).toBeLessThan(1.15);
      expect(p.thigh.r0 / avg.thigh.r0).toBeGreaterThan(0.85);
      expect(p.thigh.r0 / avg.thigh.r0).toBeLessThan(1.2);
      expect(p.waist.w / avg.waist.w).toBeGreaterThan(0.85);
      expect(p.waist.w / avg.waist.w).toBeLessThan(1.2);
      expect(p.height).toBe(avg.height);
    }
    const ath = proportions('athletic');
    expect(ath.chest.w / ath.waist.w).toBeGreaterThan(avg.chest.w / avg.waist.w);
  });
  it('joint pivots are stacked in anatomical order and limbs reach the ground', () => {
    for (const b of BUILDS) {
      const p = proportions(b);
      const y = p.y;
      expect(y.ankle).toBeLessThan(y.knee);
      expect(y.knee).toBeLessThan(y.hip);
      expect(y.hip).toBeLessThan(y.waist);
      expect(y.waist).toBeLessThan(y.chest);
      expect(y.chest).toBeLessThan(y.shoulder);
      expect(y.shoulder).toBeLessThan(y.neck);
      // leg lengths match the joint heights (hip -> ankle) within a few cm
      expect(Math.abs(p.thigh.len + p.calf.len - (y.hip - y.ankle))).toBeLessThan(0.06);
      // head top at the standing height
      expect(Math.abs(y.neck + p.neck.len + p.head.h - p.height)).toBeLessThan(0.06);
      // hands hang to mid-thigh
      const wrist = y.shoulder - p.upperArm.len - p.forearm.len;
      expect(wrist).toBeGreaterThan(y.knee);
      expect(wrist).toBeLessThan(y.hip);
      expect(p.shoulderHalf).toBeGreaterThan(p.hipHalf);
    }
  });
  it('scales with height', () => {
    const a = proportions('average', 1.75);
    const b = proportions('average', 1.85);
    expect(b.y.hip / a.y.hip).toBeCloseTo(1.85 / 1.75, 3);
    expect(b.thigh.len / a.thigh.len).toBeCloseTo(1.85 / 1.75, 3);
  });
  it('hit volumes fit inside the controller capsule and cover the body', () => {
    for (const b of BUILDS) {
      const p = proportions(b);
      const hv = hitVolumes(p);
      expect(hv.bodyR).toBeLessThanOrEqual(p.capsuleRadius);
      expect(hv.bodyR).toBeLessThanOrEqual(MOVEMENT.radius + 0.01);
      expect(hv.bodyR).toBeGreaterThanOrEqual(p.chest.d / 2);
      expect(hv.bodyY1 + hv.bodyR).toBeGreaterThanOrEqual(p.y.shoulder);
      expect(hv.bodyY0 - hv.bodyR).toBeLessThanOrEqual(p.y.knee);
      // head sphere sits on the skull: wider than half the head, smaller than the whole head
      expect(hv.headR * 2).toBeGreaterThan(p.head.w);
      expect(hv.headR * 2).toBeLessThan(p.head.h * 1.1);
      expect(hv.headY + hv.headR).toBeLessThan(p.height + 0.05);
      expect(MOVEMENT.standHeight).toBeGreaterThanOrEqual(p.height - 0.01);
    }
  });
  it('cover standoff clears the body depth and the capsule', () => {
    for (const b of BUILDS) {
      const p = proportions(b);
      const s = coverStandoff(MOVEMENT.radius, p.bodyDepthHalf);
      expect(s).toBeGreaterThan(p.bodyDepthHalf);
      expect(s).toBeGreaterThan(MOVEMENT.radius);
      expect(s).toBeLessThan(0.5);
    }
  });
});

describe('two-bone IK', () => {
  it('keeps bone lengths and reaches reachable targets', () => {
    const root = v3(0, 1, 0);
    const j = v3();
    const end = v3();
    for (const t of [v3(0.25, 0.65, 0.25), v3(-0.2, 0.9, 0.4), v3(0.1, 0.5, 0)]) {
      solveTwoBone(root, t, 0.3, 0.26, v3(0, -1, -0.3), j, end);
      expect(dist(root, j)).toBeCloseTo(0.3, 4);
      expect(dist(j, end)).toBeCloseTo(0.26, 4);
      expect(dist(end, t)).toBeLessThan(1e-3);
    }
  });
  it('bends towards the pole and straightens (not past) for far targets', () => {
    const j = v3();
    const end = v3();
    solveTwoBone(v3(0, 1, 0), v3(0, 0.2, 0.1), 0.42, 0.43, v3(0, 0, 1), j, end);
    expect(j.z).toBeGreaterThan(0.05); // knee forward
    solveTwoBone(v3(0, 1, 0), v3(0, -5, 0), 0.42, 0.43, v3(0, 0, 1), j, end);
    expect(dist(v3(0, 1, 0), end)).toBeLessThan(0.85);
    expect(dist(v3(0, 1, 0), end)).toBeGreaterThan(0.84);
  });
});

describe('gait and blending', () => {
  it('lower-body states cross-fade over ~200 ms with weights summing to 1', () => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    i.crouch = 1;
    expect(pickLower(i)).toBe('crouch');
    let t = 0;
    while (g.weights.crouch < 0.999 && t < 1) {
      g.update(1 / 60, i);
      t += 1 / 60;
      const sum = LOWER_STATES.reduce((a, s) => a + g.weights[s], 0);
      expect(sum).toBeCloseTo(1, 6);
    }
    expect(t).toBeGreaterThan(FADE * 0.7);
    expect(t).toBeLessThan(0.26);
    // mid-fade both states contribute (no snap)
    const h = new AnimGraph(proportions());
    h.update(0.1, i);
    expect(h.weights.crouch).toBeGreaterThan(0.2);
    expect(h.weights.locomotion).toBeGreaterThan(0.2);
  });
  it('state priority: traverse > air > wall > kneel/crouch > locomotion', () => {
    const i = defaultInput();
    expect(pickLower(i)).toBe('locomotion');
    i.crouch = 1;
    expect(pickLower(i)).toBe('crouch');
    i.kneel = true;
    expect(pickLower(i)).toBe('kneel');
    i.wall = true;
    expect(pickLower(i)).toBe('wall');
    i.grounded = false;
    expect(pickLower(i)).toBe('air');
    i.traverse = 'vault';
    expect(pickLower(i)).toBe('traverse');
  });
  it('crouching lowers the pelvis and the aim layer raises the weapon', () => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    for (let k = 0; k < 60; k++) g.update(1 / 60, i);
    const standY = g.out.pelvis.y;
    const lowPitch = g.out.weapon.pitch;
    i.crouch = 1;
    i.raise = 1;
    for (let k = 0; k < 60; k++) g.update(1 / 60, i);
    expect(g.out.pelvis.y).toBeLessThan(standY - 0.2);
    expect(g.out.weapon.pitch).toBeLessThan(lowPitch);
  });
  it('critically damped spring settles without overshoot', () => {
    let x = 0;
    let v = 0;
    let max = 0;
    for (let k = 0; k < 120; k++) {
      [x, v] = springStep(x, v, 1, 12, 1 / 60);
      max = Math.max(max, x);
    }
    expect(x).toBeCloseTo(1, 3);
    expect(max).toBeLessThanOrEqual(1 + 1e-6);
  });
});

describe('open-left weapon hand (D9, dormant until step 12b)', () => {
  it('mirrors the aim pocket and swaps the grip arm when openLeft is set', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, TransformNode, Vector3, Quaternion } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig, EDGE_HAND_TIME } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const rig = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
    const gun = new TransformNode('gun', scene);
    gun.parent = rig.weaponPivot;
    gun.rotationQuaternion = Quaternion.Identity();
    rig.heldWeapon = gun;
    const pose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0.3, kick: 0, armed: true };
    const tmp = new Vector3();
    const sample = (): { x: number; yaw: number; gripR: number; gripL: number } => {
      const m = gun.getWorldMatrix();
      const g = Vector3.TransformCoordinates(rig.grip, m);
      const yawLocal = rig.weaponPivot.rotationQuaternion!.toEulerAngles().y;
      return {
        x: rig.weaponPivot.position.x,
        yaw: yawLocal,
        gripR: rig.wristR.getAbsolutePosition().subtractToRef(g, tmp).length(),
        gripL: rig.wristL.getAbsolutePosition().subtractToRef(g, tmp).length(),
      };
    };
    for (let k = 0; k < 90; k++) rig.animate(1 / 60, pose);
    const right = sample();
    rig.openLeft = true;
    for (let k = 0; k < Math.ceil(EDGE_HAND_TIME * 60) + 90; k++) rig.animate(1 / 60, pose);
    expect(rig.handSwap).toBe(-1);
    const left = sample();
    // the aim pocket mirrors to the left shoulder: pivot x flips sign
    expect(right.x).toBeGreaterThan(0.02);
    expect(left.x).toBeLessThan(-0.02);
    expect(left.x).toBeCloseTo(-right.x, 2);
    // the weapon's yaw offset flips with it
    expect(Math.abs(right.yaw)).toBeGreaterThan(0.01);
    expect(Math.sign(left.yaw)).toBe(-Math.sign(right.yaw));
    // the grip arm swaps: the right wrist takes the trigger grip right-handed, the left wrist when open-left
    // (grip accuracy on the mirrored side is step 12b's job: harness grips < 2 cm)
    expect(right.gripR).toBeLessThan(right.gripL);
    expect(left.gripL).toBeLessThan(left.gripR);
    // and back: clearing the flag returns to the right hand
    rig.openLeft = false;
    for (let k = 0; k < Math.ceil(EDGE_HAND_TIME * 60) + 90; k++) rig.animate(1 / 60, pose);
    expect(rig.weaponPivot.position.x).toBeCloseTo(right.x, 2);
    scene.dispose();
  });
});

describe('open-side weapon at wall edges (step 12b, D9 / D10)', () => {
  async function setup() {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, TransformNode, Vector3, Quaternion } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig, WRIST_TRIGGER, WRIST_SUPPORT } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const rig = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
    const gun = new TransformNode('gun', scene);
    gun.parent = rig.weaponPivot;
    gun.rotationQuaternion = Quaternion.Identity();
    rig.heldWeapon = gun;
    /** World matrices from the root down (the harness's refresh), then the wrist errors to the weapon-space targets. */
    const force = (n: { parent: unknown; computeWorldMatrix(f: boolean): unknown }): void => {
      const ch: { computeWorldMatrix(f: boolean): unknown }[] = [];
      for (let x = n as { parent: unknown; computeWorldMatrix(f: boolean): unknown } | null; x; x = x.parent as typeof x) ch.unshift(x);
      for (const x of ch) x.computeWorldMatrix(true);
    };
    const errs = (left: boolean): { grip: number; fore: number } => {
      force(gun);
      force(rig.wristL);
      force(rig.wristR);
      const m = gun.getWorldMatrix();
      const side = left ? -1 : 1;
      const gt = Vector3.TransformCoordinates(rig.grip.add(new Vector3(WRIST_TRIGGER[0] * side, WRIST_TRIGGER[1], WRIST_TRIGGER[2])), m);
      const ft = Vector3.TransformCoordinates(rig.foregrip.add(new Vector3(-WRIST_SUPPORT[0] * side, WRIST_SUPPORT[1], WRIST_SUPPORT[2])), m);
      const gw = left ? rig.wristL : rig.wristR;
      const fw = left ? rig.wristR : rig.wristL;
      return { grip: gw.getAbsolutePosition().subtract(gt).length(), fore: fw.getAbsolutePosition().subtract(ft).length() };
    };
    return { scene, rig, Vector3, errs, force };
  }
  // pistol and rifle grip data (weapons.ts shapes: pistol foregrip just ahead of the grip, rifle on the handguard)
  const WEAPONS = { pistol: { grip: [0, -0.05, 0], fore: [0, -0.06, 0.05] }, rifle: { grip: [0, -0.05, 0], fore: [0, -0.04, 0.3] } } as const;
  const edgePose = (left: boolean, crouch: number) => ({
    speed: 0, localX: 0, localZ: 0, grounded: true, crouch, aimPitch: 0, aim: 1, kick: 0, armed: true,
    wall: true, wallSide: left ? -1 : 1, wallNx: 0, wallNz: 1, wallFace: -0.35, lean: left ? -0.3 : 0.3,
  });

  it('mirrored grips: the left hand on the grip, the right on the support, within 2 cm (pistol and rifle)', async () => {
    const { scene, rig, errs } = await setup();
    for (const [name, w] of Object.entries(WEAPONS)) {
      rig.grip.set(w.grip[0], w.grip[1], w.grip[2]);
      rig.foregrip.set(w.fore[0], w.fore[1], w.fore[2]);
      for (const left of [false, true]) {
        rig.openLeft = left;
        for (let k = 0; k < 90; k++) rig.animate(1 / 60, edgePose(left, 0));
        const e = errs(left);
        expect(e.grip, `${name} ${left ? 'left' : 'right'} grip`).toBeLessThan(0.02);
        expect(e.fore, `${name} ${left ? 'left' : 'right'} support`).toBeLessThan(0.06);
      }
    }
    scene.dispose();
  });

  it('the hand switch blends over EDGE_HAND_TIME (no pop) and ends on the mirrored pocket', async () => {
    const { scene, rig } = await setup();
    const { EDGE_HAND_TIME } = await import('../src/player/characterRig');
    expect(EDGE_HAND_TIME).toBeGreaterThanOrEqual(0.2);
    expect(EDGE_HAND_TIME).toBeLessThanOrEqual(0.3);
    for (let k = 0; k < 60; k++) rig.animate(1 / 60, edgePose(false, 0));
    rig.openLeft = true;
    const x0 = rig.weaponPivot.position.x;
    let px = x0;
    let worst = 0;
    let prevStep = 0;
    let worstJerk = 0;
    for (let k = 0; k < 40; k++) {
      rig.animate(1 / 60, edgePose(true, 0));
      const st = Math.abs(rig.weaponPivot.position.x - px);
      worst = Math.max(worst, st);
      worstJerk = Math.max(worstJerk, Math.abs(st - prevStep));
      prevStep = st;
      px = rig.weaponPivot.position.x;
    }
    // spread over EDGE_HAND_TIME (0.25 s, inside D9's 0.2-0.3 s, about 15 frames for the 0.26 m across): no frame
    // jumps against its neighbours (no pop)
    expect(Math.abs(x0 - px)).toBeGreaterThan(0.2);
    expect(worst).toBeLessThan(0.05);
    expect(worstJerk).toBeLessThan(0.012);
    expect(rig.weaponPivot.position.x).toBeLessThan(-0.05);
    scene.dispose();
  });

  it('the hand switch reversing mid-blend restarts from the current blend (no pop, 12b fix r1)', async () => {
    const { scene, rig } = await setup();
    const { EDGE_HAND_TIME } = await import('../src/player/characterRig');
    const half = Math.round((EDGE_HAND_TIME * 60) / 2);
    const { HAND_SWAP } = await import('../src/anim/handSwapPath');
    const dipStep = (Math.PI * Math.sqrt(HAND_SWAP.drop ** 2 + HAND_SWAP.fwd ** 2)) / (EDGE_HAND_TIME * 60);
    // reverse early, at the middle and late in the switch, both directions
    for (const at of [3, half, half + 4]) {
      for (const startLeft of [false, true]) {
        rig.openLeft = startLeft;
        for (let k = 0; k < 90; k++) rig.animate(1 / 60, edgePose(startLeft, 0));
        expect(rig.handSwap).toBe(-1);
        const p = rig.weaponPivot.position;
        let px = p.x;
        let py = p.y;
        let pz = p.z;
        let prevStep = 0;
        let worst = 0;
        let worstYZ = 0;
        let worstJerk = 0;
        for (let k = 0; k < 60; k++) {
          const left = k < at ? !startLeft : startLeft;
          rig.openLeft = left;
          rig.animate(1 / 60, edgePose(startLeft, 0));
          // across the switch axis (x): the plain switch's step and jerk limits every frame; height and depth (the
          // tuck) under the step limit while the hands are changing (the lean-out after a finished switch is the
          // edge peek's own move)
          const st = Math.abs(p.x - px);
          worst = Math.max(worst, st);
          if (rig.handSwap >= 0) worstYZ = Math.max(worstYZ, Math.abs(p.y - py), Math.abs(p.z - pz));
          worstJerk = Math.max(worstJerk, Math.abs(st - prevStep));
          prevStep = st;
          px = p.x;
          py = p.y;
          pz = p.z;
        }
        // the pose stays on the starting edge; only the hand target flips and flips back. The same limits as a
        // plain switch: no frame jumps, and it ends back where it started
        expect(worst, `reverse at ${at} from ${startLeft ? 'left' : 'right'}`).toBeLessThan(0.05);
        // (anim-n4c) height and depth: the plain limit plus the aimed swap's designed dip (handSwapPath.ts: down and
        // forward under the chin while the sight lets go of the eye) at its peak rate (~7 cm a frame over 0.25 s), and
        // the sight's release on the same envelope; the old centre-line pop was 28-41 cm in a frame
        expect(worstYZ, `reverse at ${at} from ${startLeft ? 'left' : 'right'} (height / depth)`).toBeLessThan(0.05 + dipStep + 0.02);
        expect(worstJerk, `reverse at ${at} from ${startLeft ? 'left' : 'right'} (jerk)`).toBeLessThan(0.012);
        expect(rig.handSwap).toBe(-1);
        expect(Math.sign(p.x)).toBe(startLeft ? -1 : 1);
      }
    }
    scene.dispose();
  });

  it('low-wall side lean: the head centre stays under the wall top (headCap), both edges', async () => {
    const { scene, rig, Vector3 } = await setup();
    // (A51) a 1.1 m low wall: the deepest crouch sink (0.3 m) keeps the head under walls from about 1.07 m up
    const top = 1.1;
    for (const left of [false, true]) {
      rig.openLeft = left;
      for (let k = 0; k < 120; k++) rig.animate(1 / 60, { ...edgePose(left, 1), headCap: top - 0.14 });
      const h = rig.posedHead(new Vector3());
      expect(h.y).toBeLessThan(top - 0.1);
    }
    scene.dispose();
  });

  it('exposure: the left-edge lean exposes no more body than the right-edge lean (perception and light meter)', async () => {
    const { scene, rig, Vector3 } = await setup();
    const { exposureFraction, exposurePointsPosed } = await import('../src/game/tactics');
    // a symmetric wall x -2..2, z -0.2..0.2, 2.5 m: the body leans out 0.35 m past an end; the threats beyond it
    const blocked = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): boolean => {
      let t0 = 0;
      let t1 = 1;
      const lo = [-2, 0, -0.2];
      const hi = [2, 2.5, 0.2];
      const A = [a.x, a.y, a.z];
      const D = [b.x - a.x, b.y - a.y, b.z - a.z];
      for (let k = 0; k < 3; k++) {
        if (Math.abs(D[k]!) < 1e-9) {
          if (A[k]! < lo[k]! || A[k]! > hi[k]!) return false;
          continue;
        }
        let u = (lo[k]! - A[k]!) / D[k]!;
        let v = (hi[k]! - A[k]!) / D[k]!;
        if (u > v) [u, v] = [v, u];
        t0 = Math.max(t0, u);
        t1 = Math.min(t1, v);
        if (t0 > t1) return false;
      }
      return true;
    };
    for (const [name, w] of Object.entries(WEAPONS)) {
      rig.grip.set(w.grip[0], w.grip[1], w.grip[2]);
      rig.foregrip.set(w.fore[0], w.fore[1], w.fore[2]);
      const res: Record<string, { exp: number; out: number }> = {};
      for (const left of [false, true]) {
        const sx = left ? -1 : 1;
        rig.root.position.set(sx * (2 - 0.22 + 0.35), 0, 0.55);
        rig.openLeft = left;
        for (let k = 0; k < 120; k++) rig.animate(1 / 60, edgePose(left, 0));
        const feet = { x: rig.root.position.x, y: 0, z: 0.55 };
        const head = rig.posedHead(new Vector3());
        const chest = rig.posedChest(new Vector3());
        const pts = exposurePointsPosed(feet, 0, 1, 0, left ? -0.3 : 0.3, head, chest, []);
        const eyes = [{ x: sx * 6, y: 1.55, z: -3 }, { x: sx * 4, y: 1.55, z: -6 }];
        // the light meter's head sample: how far past the end (x = +-2) the head is
        res[left ? 'L' : 'R'] = { exp: exposureFraction(pts, eyes, blocked), out: sx * head.x - 2 };
      }
      expect(res.L!.exp, `${name} exposure`).toBeLessThanOrEqual(res.R!.exp + 1e-6);
      expect(res.L!.out, `${name} head past the edge`).toBeLessThanOrEqual(res.R!.out + 0.005);
    }
    scene.dispose();
  });
});

describe('elbow swivel clear of the trunk (operators step 11e)', () => {
  const s = v3(0.2, 1.23, 0.04);
  const w = v3(0.06, 1.21, 0.1);
  const p0 = v3(0, 0.95, 0);
  const p1 = v3(0, 1.45, 0);
  const swivel = (e: V3, th: number): V3 => {
    // Rodrigues about the shoulder -> wrist axis
    const u = { x: w.x - s.x, y: w.y - s.y, z: w.z - s.z };
    const l = Math.hypot(u.x, u.y, u.z);
    u.x /= l;
    u.y /= l;
    u.z /= l;
    const v = { x: e.x - s.x, y: e.y - s.y, z: e.z - s.z };
    const d = u.x * v.x + u.y * v.y + u.z * v.z;
    const c = Math.cos(th);
    const sn = Math.sin(th);
    const cx = u.y * v.z - u.z * v.y;
    const cy = u.z * v.x - u.x * v.z;
    const cz = u.x * v.y - u.y * v.x;
    return v3(s.x + v.x * c + cx * sn + u.x * d * (1 - c), s.y + v.y * c + cy * sn + u.y * d * (1 - c), s.z + v.z * c + cz * sn + u.z * d * (1 - c));
  };
  it('leaves a clear elbow alone', () => {
    expect(elbowSwivelClear(s, w, v3(0.3, 1.0, 0.1), p0, p1, 0.135)).toBe(0);
  });
  it('turns an elbow inside the chest out, keeping its distances to shoulder and wrist', () => {
    const e = v3(0.0, 1.11, -0.02);
    expect(segDist(e.x, e.y, e.z, p0, p1)).toBeLessThan(0.05);
    const th = elbowSwivelClear(s, w, e, p0, p1, 0.135);
    expect(th).not.toBe(0);
    const e2 = swivel(e, th);
    expect(segDist(e2.x, e2.y, e2.z, p0, p1)).toBeGreaterThanOrEqual(0.135);
    const dist = (a: V3, b: V3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    expect(dist(e2, s)).toBeCloseTo(dist(e, s), 6);
    expect(dist(e2, w)).toBeCloseTo(dist(e, w), 6);
  });
});
