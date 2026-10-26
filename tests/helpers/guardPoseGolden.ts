/**
 * guard-render S5: golden guard poses. Same setup as `animSkeletonGuardIdentity.ts` (real guard rigs through
 * `buildEnemyRig`, NullEngine, seeded Math.random, DT 1/60, no active camera). Captures, at frames 10, 30, 60 and the last
 * of each scenario, the world position and local rotation quaternion (w >= 0) of the pre-T3 joints plus clavL, clavR,
 * weaponPivot and the held gun node. Numbers, not hashes; the test asserts them within 1e-4.
 * Captured once on the untouched code (`GUARD_POSE_CAPTURE=1`); never re-captured.
 */
import type { CharacterRig, RigPose } from '../../src/player/characterRig';

export type GoldenFixture = Record<string, number[]>;

const DT = 1 / 60;

type Step = (rig: CharacterRig, k: number, p: RigPose) => void;
type Scenario = { id: string; steps: number; step: Step; init?: (rig: CharacterRig) => Promise<void> | void };

function pose(): RigPose {
  return { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0.2, kick: 0 };
}

const move = (speed: number, crouch: number, aim: number): Step => (rig, _k, p) => {
  p.speed = speed;
  p.localZ = speed > 0 ? 1 : 0;
  p.crouch = crouch;
  p.aim = aim;
  p.stride = aim < 0.5 && speed > 0 ? 'facing' : 'velocity';
  p.velZ = speed;
  rig.root.position.z += speed * DT;
};

const SCENARIOS: Scenario[] = [
  { id: 'idle', steps: 60, step: move(0, 0, 0.2) },
  { id: 'walk', steps: 90, step: move(1.4, 0, 0.2) },
  { id: 'dash', steps: 90, step: (rig, k, p) => { move(4.5, 0, 0.2)(rig, k, p); p.dash = 1; } },
  { id: 'crouchAim', steps: 90, step: (rig, k, p) => { move(k > 45 ? 1 : 0, 1, 1)(rig, k, p); p.aimPitch = 0.15; } },
  { id: 'aimWalk', steps: 90, step: (rig, k, p) => { move(1, 0, k > 20 ? 1 : 0.4)(rig, k, p); p.aimPitch = -0.1; p.kick = k % 30 < 4 ? 1 : 0; } },
  { id: 'climb', steps: 120, step: (rig, k, p) => { p.traverse = 'climb'; p.traverseT = k * DT * 1.1 * 1.6; p.aim = 0; rig.root.position.y += 1.1 * DT; } },
  { id: 'wallLean', steps: 90, step: (_r, k, p) => { p.wall = true; p.wallSide = 1; p.lean = k > 40 ? Math.min(1, (k - 40) / 20) : 0; p.aim = 1; } },
  { id: 'melee', steps: 60, step: (rig, k, p) => { p.melee = k < 30 ? k / 30 : -1; p.aim = 0; rig.setFlash(k < 10 ? 0.75 : 0); } },
  { id: 'crouchWalk', steps: 90, step: move(1, 1, 0.2) },
  { id: 'turn', steps: 60, step: (rig, k, p) => { move(0, 0, 0.2)(rig, k, p); rig.root.rotation.y += 2 * DT; } },
  {
    id: 'hostage',
    steps: 90,
    step: move(0, 0, 0.2),
    init: async (rig) => {
      const { GuardCq } = await import('../../src/game/closeQuarters');
      const cq = new GuardCq();
      cq.seize(false, 0);
      cq.set('hostage');
      rig.emote = (_r, t) => cq.pose(t) ?? undefined;
      rig.emoteTime = 0;
    },
  },
  {
    id: 'blind',
    steps: 90,
    step: move(0, 0, 0.2),
    init: (rig) => {
      // Mirrors `Enemy.blind` (src/ai/enemy.ts, the rig.emote it installs).
      rig.emote = (_r, t) => {
        const k = Math.min(1, t * 6);
        const w = Math.sin(t * 9) * 0.1;
        return { neck: [0.45 * k, w, 0], chest: [0.3 * k, 0, 0], shoulderL: [-2.1 * k, 0, -0.5 * k], shoulderR: [-2.1 * k, 0, 0.5 * k], elbowL: [0, 0, -2.2 * k], elbowR: [0, 0, 2.2 * k], pelvisLift: -0.06 * k };
      };
      rig.emoteTime = 0;
    },
  },
];

function joints(r: CharacterRig) {
  return [
    r.root, r.body, r.hips, r.spine, r.torso, r.neck, r.headNode, r.shoulderL, r.elbowL, r.wristL, r.shoulderR,
    r.elbowR, r.wristR, r.hipL, r.kneeL, r.ankleL, r.hipR, r.kneeR, r.ankleR, r.toeL, r.toeR,
    r.clavL, r.clavR, r.weaponPivot,
  ];
}

export async function runGuardPoseGolden(): Promise<GoldenFixture> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../../src/core/babylon');
  const { PartLibrary } = await import('../../src/world/partLibrary');
  const { ENEMIES, ENEMY_KINDS } = await import('../../src/ai/enemyDefs');
  const { buildEnemyRig } = await import('../../src/ai/enemyRig');

  const scene = new Scene(new NullEngine());
  const parts = new PartLibrary(scene);
  const world = { parts, map: { theme: { faction: 'urban' } }, addShadowCaster: () => {} };
  const out: GoldenFixture = {};
  const random = Math.random;
  let seed = 1;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  /** (guard-ai runner-armed, A7) The fixtures were captured with the runner unarmed (before G298): his key keeps
   *  that def, so the fixture stays valid and still covers the unarmed rig; the armed lean rig is the sniper's key. */
  const GOLDEN_RUNNER = { ...ENEMIES.runner, gun: null };
  try {
    for (const kind of ENEMY_KINDS) {
      const def = kind === 'runner' ? GOLDEN_RUNNER : ENEMIES[kind];
      for (const sc of SCENARIOS) {
        seed = 12345;
        const { rig, gun } = buildEnemyRig(scene, world as never, def, `g-${kind}`);
        await sc.init?.(rig);
        const nodes = joints(rig);
        if (gun) nodes.push(gun.node);
        const p = pose();
        for (let k = 0; k < sc.steps; k++) {
          sc.step(rig, k, p);
          rig.animate(DT, p);
          const f = k + 1;
          if (f === 10 || f === 30 || f === 60 || f === sc.steps) {
            const vals: number[] = [];
            for (const n of nodes) {
              n.computeWorldMatrix(true);
              const a = n.getAbsolutePosition();
              vals.push(a.x, a.y, a.z);
              const q = n.rotationQuaternion;
              if (q) {
                const s = q.w < 0 ? -1 : 1;
                vals.push(q.x * s, q.y * s, q.z * s, q.w * s);
              } else vals.push(0, 0, 0, 1);
            }
            out[`${kind}:${sc.id}:${f}`] = vals;
          }
        }
        gun?.dispose();
        rig.dispose();
      }
    }
  } finally {
    Math.random = random;
  }
  scene.dispose();
  return out;
}
