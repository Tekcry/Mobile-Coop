// (traverse-fix, spare job 8) Traversal correctness: the hands at a lip's end, the climb-up's hand release, the rifle
// draw's clearance past the trunk.
import { describe, expect, it } from 'vitest';
import { AttachGrips, LEDGE_HAND_GAP } from '../src/player/attachGrips';
import { attachRange } from '../src/player/attach';
import { makeLedge, TraversalAnchors, type Ledge } from '../src/world/anchors';

const zero = () => ({ x: 0, y: 0, z: 0, w: 0 });

describe('(traverse-fix 1) a ledge hand at the lip end', () => {
  it('never lands on or through the other hand, and stays on the lip, shimmying into either end at any speed', () => {
    const anchors = new TraversalAnchors();
    // the lip runs along +x from x 0 (the hands' targets are on its line, z 10)
    for (const len of [0.8, 1.5, 3]) {
      const lip = anchors.add<Ledge>(makeLedge(0, 10, len, 10, 2.4));
      const r = attachRange(lip, 1.75);
      for (const speed of [0.5, 0.8, 1.2]) {
        for (const dir of [1, -1]) {
          for (const startK of [0, 0.5, 1]) {
            const g = new AttachGrips();
            const rig = { reachL: zero(), reachR: zero(), plantL: zero(), plantR: zero(), height: 1.68 };
            let s = r.min + (r.max - r.min) * startK;
            let v = 0;
            g.setup(lip, s, 1, 1.68);
            let minGap = 9;
            let lo = 9;
            let hi = -9;
            // into the end and held there, back the other way, then still (accel 8 m/s^2, the ledge's)
            for (let i = 0; i < 6 * 120; i++) {
              const want = i < 4 * 120 ? dir * speed : i < 5 * 120 ? -dir * speed : 0;
              v += Math.max(-8 / 120, Math.min(8 / 120, want - v));
              s += v / 120;
              if (s >= r.max) {
                s = r.max;
                if (v > 0) v = 0;
              } else if (s <= r.min) {
                s = r.min;
                if (v < 0) v = 0;
              }
              g.update(1 / 120, lip, s, v, 1, 1, rig);
              // the left hand is on the -x side here (the body faces the wall from +z)
              minGap = Math.min(minGap, rig.reachR.x - rig.reachL.x);
              lo = Math.min(lo, rig.reachL.x, rig.reachR.x);
              hi = Math.max(hi, rig.reachL.x, rig.reachR.x);
            }
            const what = `len ${len} speed ${speed} dir ${dir} from ${startK}`;
            // was 2.7 cm (0.8 m/s) and 0 (1.2 m/s) at the end, crossing by up to 32 cm mid-lip on the first quick reach
            expect(minGap, what).toBeGreaterThanOrEqual(LEDGE_HAND_GAP - 1e-6);
            expect(lo, what).toBeGreaterThanOrEqual(0.08 - 1e-6);
            expect(hi, what).toBeLessThanOrEqual(len - 0.08 + 1e-6);
          }
        }
      }
    }
  });
});

describe('(traverse-fix 3) the rifle sling draw clears the trunk', () => {
  it('no frame of the draw from the diagonal sling puts the gun into the trunk (e2e-clip "sling draw + glide": was -1.5 cm)', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, Vector3 } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const { WeaponModel, DEFAULT_WEAPON_COLORS, TRAVEL_VIA } = await import('../src/weapons/weaponModel');
    const { WEAPONS } = await import('../src/weapons/weaponDefs');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const rig = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
    const def = WEAPONS.rifle;
    const rifle = new WeaponModel(scene, lib, def, DEFAULT_WEAPON_COLORS, rig.root);
    const pose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 1, kick: 0, armed: true };
    // e2e-clip's trunk check: the bore line and the top edge against the pelvis -> neck capsule (r 0.1)
    const seg = (p: InstanceType<typeof Vector3>, a: InstanceType<typeof Vector3>, b: InstanceType<typeof Vector3>): number => {
      const ab = b.subtract(a);
      const t = Math.max(0, Math.min(1, p.subtract(a).dot(ab) / (ab.lengthSquared() || 1)));
      return Vector3.Distance(p, a.add(ab.scale(t)));
    };
    const drawMin = (): number => {
      rifle.hold(rig);
      for (let k = 0; k < 30; k++) rig.animate(1 / 60, pose);
      rifle.holster(rig, 'backC');
      for (let k = 0; k < 30; k++) rig.animate(1 / 60, pose);
      rifle.beginTravel(rig, 'backC', true, true);
      let min = 9;
      for (let k = 1; k <= 60; k++) {
        rifle.travel(rig, k / 60);
        rig.animate(1 / 60, pose);
        const m = rifle.node.computeWorldMatrix(true);
        const pv = rig.hips.computeWorldMatrix(true).getTranslation();
        const nk = rig.neck.computeWorldMatrix(true).getTranslation();
        for (let z = rig.gunSpan.z0; z <= def.muzzle[2] + 1e-6; z += 0.06) {
          for (const y of [def.muzzle[1], rig.gunSpan.top]) min = Math.min(min, seg(Vector3.TransformCoordinates(new Vector3(0, y, z), m), pv, nk) - 0.1);
        }
      }
      rifle.endTravel();
      return min;
    };
    const now = drawMin();
    // the old waypoint (0.3, -0.22, 0.14) for comparison: the new one passes further out
    const via = TRAVEL_VIA.sling as unknown as number[];
    const keep = [via[0]!, via[1]!, via[2]!];
    via[0] = 0.3;
    via[2] = 0.14;
    const old = drawMin();
    via[0] = keep[0]!;
    via[2] = keep[2]!;
    // (the headless rig has no swap clip overlay: here the old path just grazes the trunk, 0.3 cm, the new one clears it
    // by ~4.7 cm; in the game, e2e-clip "sling draw + glide", -1.5 -> +0.9 cm)
    expect(now - old).toBeGreaterThan(0.03);
    expect(now).toBeGreaterThan(0.03);
    rifle.dispose();
    scene.dispose();
  });
});

// (traverse-fix 2) the climb-up hands
// Measured in the game (proving ledge, Wren, arm 0.54 m): the grips hold the hands at weight 1 until k 0.38, but the
// shoulders rise out of reach from k 0.31 (0.60 m over the lip at 0.32, 0.92 m at 0.39: the CLIMB_UP clip's torso is
// near upright while the knee comes on), so the palms leave the lip as the knee comes on whatever the grip weight. The
// fix is in the mocap clip (src/anim/clips/traverse.ts CLIMB_UP), outside this job: docs/archive/traverse-fix/REPORT.md item 2.
// Headless check (NullEngine rig, the clip alone): the shoulder over the root is 1.27 m at k 0.21, 0.94 at 0.30 and
// 0.84 from 0.33 to 0.48 (hips 0.41); with CLIMB_UP_PATH's root (top - 0.50 m at 0.30, - 0.23 at 0.33, - 0.04 at 0.36,
// on the top at 0.38) that is 0.44, 0.61, 0.80, 0.84 m over the lip. Neither the grips (targets only) nor the root path
// can close it: a lower root sinks the planted knee into the block.
// (traverse-fix-2) Fixed in the clip and the lip grip's pivot: tests/climbHands.test.ts asserts it (palms <= 1.5 cm
// until the right foot is on the top at k 0.474, release <= 3 cm a frame, ends before the crouch).
