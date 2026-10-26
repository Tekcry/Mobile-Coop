/**
 * anim-skeleton #88 fix: the guard half of the bit-identity harness (A5). Guards are plain CharacterRigs with their own
 * builds and heights (`buildEnemyRig`, no Wren figure, no tuner rows); the S2 harness covered only Wren. Drives one rig
 * per enemy kind through the poses `Enemy.frame` feeds (idle, patrol walk, dash, crouch, aim, a ladder climb, wall
 * cover with a lean, a melee swing, a hit flash) and hashes, every step, the world matrix and local TRS of each pre-T3
 * joint (the guard's head is the perception eye; hips / neck / head place its hit volumes). Self-contained so it runs
 * on the pre-S2 code too: `tests/fixtures/anim-skeleton-guard-identity.json` was captured on 39b97591 with
 * `ANIM_SKELETON_CAPTURE=1`. Hashing as the Wren harness: float64 bit patterns, -0 written as +0.
 */
import type { CharacterRig, RigPose } from '../../src/player/characterRig';

export type GuardFixture = Record<string, { steps: number; rig: string }>;

class Hasher {
  private h1 = 0xdeadbeef;
  private h2 = 0x41c6ce57;
  private readonly f = new Float64Array(1);
  private readonly u = new Uint32Array(this.f.buffer);
  add(v: number): void {
    this.f[0] = v === 0 ? 0 : v;
    for (let k = 0; k < 2; k++) {
      const c = this.u[k]!;
      this.h1 = Math.imul(this.h1 ^ c, 2654435761);
      this.h2 = Math.imul(this.h2 ^ c, 1597334677);
    }
  }
  digest(): string {
    let h1 = Math.imul(this.h1 ^ (this.h1 >>> 16), 2246822507);
    h1 ^= Math.imul(this.h2 ^ (this.h2 >>> 13), 3266489909);
    let h2 = Math.imul(this.h2 ^ (this.h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  }
}

const DT = 1 / 60;

/** The pre-T3 rig joints (RIG_JOINTS order at 39b97591). */
function preT3(r: CharacterRig) {
  return [
    r.root, r.body, r.hips, r.spine, r.torso, r.neck, r.headNode, r.shoulderL, r.elbowL, r.wristL, r.shoulderR,
    r.elbowR, r.wristR, r.hipL, r.kneeL, r.ankleL, r.hipR, r.kneeR, r.ankleR, r.toeL, r.toeR,
  ];
}

type Step = (rig: CharacterRig, k: number, p: RigPose) => void;

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

const SCENARIOS: { id: string; steps: number; step: Step }[] = [
  { id: 'idle', steps: 60, step: move(0, 0, 0.2) },
  { id: 'walk', steps: 90, step: move(1.4, 0, 0.2) },
  { id: 'dash', steps: 90, step: (rig, k, p) => { move(4.5, 0, 0.2)(rig, k, p); p.dash = 1; } },
  { id: 'crouchAim', steps: 90, step: (rig, k, p) => { move(k > 45 ? 1 : 0, 1, 1)(rig, k, p); p.aimPitch = 0.15; } },
  { id: 'aimWalk', steps: 90, step: (rig, k, p) => { move(1, 0, k > 20 ? 1 : 0.4)(rig, k, p); p.aimPitch = -0.1; p.kick = k % 30 < 4 ? 1 : 0; } },
  { id: 'climb', steps: 120, step: (rig, k, p) => { p.traverse = 'climb'; p.traverseT = k * DT * 1.1 * 1.6; p.aim = 0; rig.root.position.y += 1.1 * DT; } },
  { id: 'wallLean', steps: 90, step: (_r, k, p) => { p.wall = true; p.wallSide = 1; p.lean = k > 40 ? Math.min(1, (k - 40) / 20) : 0; p.aim = 1; } },
  { id: 'melee', steps: 60, step: (rig, k, p) => { p.melee = k < 30 ? k / 30 : -1; p.aim = 0; rig.setFlash(k < 10 ? 0.75 : 0); } },
];

/** One rig per enemy kind through every scenario; the fixture shape. */
export async function runGuardIdentity(): Promise<GuardFixture> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../../src/core/babylon');
  const { PartLibrary } = await import('../../src/world/partLibrary');
  const { ENEMIES, ENEMY_KINDS } = await import('../../src/ai/enemyDefs');
  const { buildEnemyRig } = await import('../../src/ai/enemyRig');

  const scene = new Scene(new NullEngine());
  const parts = new PartLibrary(scene);
  const world = { parts, map: { theme: { faction: 'urban' } }, addShadowCaster: () => {} };
  const out: GuardFixture = {};
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
        const nodes = preT3(rig);
        const h = new Hasher();
        const p = pose();
        for (let k = 0; k < sc.steps; k++) {
          sc.step(rig, k, p);
          rig.animate(DT, p);
          for (const n of nodes) {
            const m = n.computeWorldMatrix(true).m;
            for (let i = 0; i < 16; i++) h.add(m[i]!);
            h.add(n.position.x); h.add(n.position.y); h.add(n.position.z);
            const q = n.rotationQuaternion;
            if (q) { h.add(q.x); h.add(q.y); h.add(q.z); h.add(q.w); } else h.add(Number.NaN);
          }
        }
        out[`${kind}:${sc.id}`] = { steps: sc.steps, rig: h.digest() };
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
