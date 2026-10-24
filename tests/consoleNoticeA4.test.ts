/**
 * guard-ai S22 game, the A4 laptop failure (`docs/guard-ai/slices/S22-GAME-A4-TRIAGE.md`): the e2e's step 3 on the real
 * `Enemy` / `EnemyManager`, A4's built geometry and the guards' runtime nav. The officer is drawn off by a distraction in
 * the room's north-west corner, the console goes off while he is on it, and back from the noise he must notice it and turn
 * it back on. The e2e left both players on L3's pad, in line with L3's far door, which stands open (an airlock's front door
 * opens itself when its cycle ends, `CourseMode.applyLocks`): the officer turning to the noise has them in his periphery
 * through the doorway, any sight of them retargets his investigation (`Enemy.perceive`: the stimulus is the player's feet),
 * and he goes after them instead of coming back. With the players against L3's north wall beside the doorway (out of every
 * line from the room) he comes back, notices it and turns it back on. Stand-ins: no rig or hitboxes (`vi.mock`), the
 * sight ray a sampled segment against the built collision boxes (doors and their leaves left out: the far door open).
 */
import { describe, expect, it, vi } from 'vitest';
import { Scene, Vector3 } from '../src/core/babylon';
import type { Enemy, PlayerRef } from '../src/ai/enemy';

vi.mock('../src/ai/hitboxes', () => ({
  Hitboxes: class {
    sync(): void {}
    setSolid(): void {}
    dispose(): void {}
  },
}));

/** Where the e2e left the players for step 3 before the fix: the L3 checkpoint (the pad's middle) and the client by it. */
const ON_PAD: readonly [number, number][] = [
  [103, 10],
  [103.5, 10.5],
];
/** Where the e2e puts them now (`a4GoodsShed.mjs` `L3_HIDE`): against L3's north wall west of the far doorway. */
const L3_HIDE: readonly [number, number][] = [
  [100.7, 12.3],
  [100.7, 11.5],
];
/** The e2e's thrown item (`a4GoodsShed.mjs` `NOISE`, `NOISE_R`). */
const NOISE: [number, number, number] = [101.0, 18.2, 13];

interface Run {
  finds: number;
  resets: number;
  /** The officer's investigation spot moved onto a player. */
  retargeted: boolean;
  /** The officer stepped into L3 or went into combat. */
  leftRoom: boolean;
  alerted: boolean;
}

async function run(players: readonly [number, number][]): Promise<Run> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const { ctcourse } = await import('../src/world/maps/ctcourse');
  const { runtimeNav } = await import('./helpers/runtimeNav');
  const { EnemyManager } = await import('../src/ai/enemyManager');
  const { DIFFICULTY } = await import('../src/ai/archetypes');
  const { DamageRegistry } = await import('../src/game/damage');
  const b = new LevelBuilder();
  const lay = ctcourse.build(b, 0);
  const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, ctcourse.navLayers ?? 3, lay.navSeeds ?? []);
  const scene = new Scene(new NullEngine());
  const world = { parts: new PartLibrary(scene), map: { theme: { faction: 'urban' } }, addShadowCaster: () => {}, level: { lights: b.lights, cover: [], coverSegments: [] }, layout: lay, doors: { list: [] } };
  // the static collision round the room and L3 (glass left out: none blocks a line here)
  const solids = b.boxes.filter((p) => p.collide && !p.glass && p.c[0] > 90 && p.c[0] < 115 && p.c[2] > 3 && p.c[2] < 30);
  const solidAt = (x: number, y: number, z: number): boolean => {
    for (const p of solids) {
      const c = Math.cos(p.yaw);
      const s = Math.sin(p.yaw);
      const dx = x - p.c[0];
      const dz = z - p.c[2];
      if (Math.abs(dx * c - dz * s) <= p.s[0] / 2 && Math.abs(y - p.c[1]) <= p.s[1] / 2 && Math.abs(dx * s + dz * c) <= p.s[2] / 2) return true;
    }
    return false;
  };
  type P3 = { x: number; y: number; z: number };
  /** The first blocked fraction of the segment (1: clear), sampled every ~5 cm. */
  const along = (a: P3, q: P3): number => {
    const n = 160;
    for (let k = 1; k <= n; k++) {
      const f = k / n;
      if (solidAt(a.x + (q.x - a.x) * f, a.y + (q.y - a.y) * f, a.z + (q.z - a.z) * f)) return f;
    }
    return 1;
  };
  const len = (a: P3, q: P3): number => Math.sqrt((q.x - a.x) ** 2 + (q.y - a.y) ** 2 + (q.z - a.z) ** 2);
  const ray = {
    clear: (a: P3, q: P3) => along(a, q) === 1,
    ray: (a: P3, q: P3) => {
      const f = along(a, q);
      return { hit: f < 1, distance: len(a, q) * f };
    },
    // (guard-ai R1) losClear casts through hitDistance when the ballistics has it (the noop proxy would answer undefined)
    hitDistance: (a: P3, q: P3) => len(a, q) * along(a, q),
    armouredFirst: () => false,
  };
  // anything else combat asks of the ballistics or the effects: nothing
  const noop = <T extends object>(o: T): T => new Proxy(o, { get: (t, k) => (k in t ? (t as Record<string | symbol, unknown>)[k] : () => undefined) });
  const refs: PlayerRef[] = players.map(([x, z], i) => ({
    id: `p${i}`,
    target: { alive: true, aimPoint: (o: Vector3) => o.set(x, 1.3, z), headPoint: (o: Vector3) => o.set(x, 1.65, z), applyDamage: () => ({}) } as unknown as PlayerRef['target'],
    feet: new Vector3(x, 0.05, z),
    speed: 0,
    crouched: false,
    // L3 is lit by its two LED slots; the exact level does not decide it: any sight of a player moves the spot
    light: 0.6,
  }));
  const em = new EnemyManager(scene, world as never, nav, new DamageRegistry(), noop(ray) as never, noop({}) as never, DIFFICULTY.normal, () => refs);
  em.stealth = true;
  const cs = lay.course!;
  let officer: Enemy | null = null;
  for (const id of ['a4-officer', 'a4-dock1', 'a4-dock2']) {
    const s = cs.squads[id]!;
    const e = em.spawn(s.kind, new Vector3(s.x, s.y ?? Number.NaN, s.z), false, s.yaw)!;
    if (s.route) e.setPatrol({ points: s.route, wait: s.wait, waits: s.waits, faces: s.faces, start: s.start, loop: s.loop });
    em.placeSlot(e, s);
    // the e2e makes the loaders passive for step 3
    if (id === 'a4-officer') officer = e;
    else e.passive = true;
  }
  const e = officer!;
  const dv = cs.devices['a4-console']!;
  let on = true;
  em.consoleHost = {
    reset: (id) => {
      if (on || id !== 'a4-console') return false;
      on = true;
      em.consoleState(id, dv.x, dv.y, dv.z, true);
      return true;
    },
  };
  const dt = 1 / 60;
  for (let i = 0; i < 120; i++) em.update(dt);
  // the refusal's precondition: calm at his post, watching it
  expect(em.watchesConsole(e, dv.x, dv.y, dv.z)).toBe(true);
  em.hear(new Vector3(NOISE[0], 0.3, NOISE[1]), NOISE[2], 'distraction');
  for (let t = 0; t < 8 && e.incident < 0; t += dt) em.update(dt);
  expect(e.incident).toBeGreaterThanOrEqual(0);
  expect(em.watchesConsole(e, dv.x, dv.y, dv.z)).toBe(false);
  // the host's press goes through: the console off (`CourseMode.consoleEdge`)
  on = false;
  em.consoleState('a4-console', dv.x, dv.y, dv.z, false);
  const stim = (e as unknown as { stimulus: number[] }).stimulus;
  let retargeted = false;
  let leftRoom = false;
  // the e2e's 40 s for the notice, then its 20 s for the reset
  for (let t = 0; t < 40 && em.consoleFinds === 0; t += dt) {
    em.update(dt);
    for (const [x, z] of players) if (Math.abs(stim[0]! - x) < 0.01 && Math.abs(stim[1]! - z) < 0.01) retargeted = true;
    if (e.pos.z < 13 || e.alerted) leftRoom = true;
  }
  for (let t = 0; t < 20 && em.consoleFinds > 0 && em.consoleResets === 0; t += dt) em.update(dt);
  return { finds: em.consoleFinds, resets: em.consoleResets, retargeted, leftRoom, alerted: e.alerted };
}

describe('guard-ai S22 game, A4: back from the noise the officer notices the console off (real Enemy, A4 geometry)', () => {
  it('the laptop failure: with the players on L3 pad, in line with the open far door, the distraction turns onto them and he never notices it in 40 s', async () => {
    const r = await run(ON_PAD);
    expect(r.retargeted).toBe(true);
    expect(r.leftRoom).toBe(true);
    expect(r.finds).toBe(0);
    expect(r.resets).toBe(0);
  }, 60000);

  it("the e2e's staging now: with the players against L3's north wall beside the doorway he comes back, notices it and turns it back on, calm", async () => {
    const r = await run(L3_HIDE);
    expect(r.retargeted).toBe(false);
    expect(r.leftRoom).toBe(false);
    expect(r.finds).toBe(1);
    expect(r.resets).toBe(1);
    expect(r.alerted).toBe(false);
  }, 60000);
});
