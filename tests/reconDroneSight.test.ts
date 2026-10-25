import { afterAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene, Vector3 } from '../src/core/babylon';
import type * as babylon from '../src/core/babylon';
import { MASK } from '../src/physics/groups';
import { ARCHETYPE } from '../src/ai/archetypes';
import { ReconDrone } from '../src/ai/reconDrone';
import type { Enemy, PlayerRef } from '../src/ai/enemy';
import type { DamageRegistry, Damageable } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import type { PartLibrary } from '../src/world/partLibrary';

// (guard-ai polish 2, T1) The recon drone's sight verdict: `hitDistance(eye, aim, MASK.SIGHT) > length - 0.3` sees.
// A real scene (NullEngine) for the drone's TransformNode; the physics body and shape are stand-ins (no Havok), the part
// library and the ballistics are stubs, so the test sets the first hit's distance directly.

vi.mock('../src/core/babylon', async (orig) => {
  const m = await orig<typeof babylon>();
  class FakeBody {
    shape: unknown = null;
    disablePreStep = false;
    dispose(): void {}
  }
  class FakeShape {
    filterMembershipMask = 0;
    filterCollideMask = 0;
    dispose(): void {}
  }
  return { ...m, PhysicsBody: FakeBody, PhysicsShapeSphere: FakeShape };
});

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => {
  scene.dispose();
  engine.dispose();
});

function part(): unknown {
  return {
    parent: null,
    isVisible: true,
    scaling: { set: vi.fn() },
    position: { set: vi.fn() },
    rotation: { set: vi.fn() },
    dispose: vi.fn(),
  };
}

const D = ARCHETYPE.drone;

/** `short`: how far before the aim point the first hit lies (m); null = no hit (a miss: the segment's length). */
function rig(short: number | null) {
  const casts: { mask: number; len: number }[] = [];
  const ballistics = {
    hitDistance(from: Vector3, to: Vector3, mask: number): number {
      const len = Vector3.Distance(from, to);
      casts.push({ mask, len });
      return short === null ? len : len - short;
    },
  } as unknown as Ballistics;
  const lib = { instance: () => part() } as unknown as PartLibrary;
  const registry = { register: vi.fn(), unregisterBody: vi.fn(), removeTarget: vi.fn() } as unknown as DamageRegistry;
  const op = { alive: true, pos: new Vector3(0, 0, 0) } as unknown as Enemy;
  const drone = new ReconDrone(scene, lib, registry, ballistics, {} as Vfx, op);
  // orbit angle 0: the drone sits at its orbit target (0, height, orbit) and faces +x (yaw = angle + PI / 2)
  (drone as unknown as { angle: number }).angle = 0;
  drone.pos.set(0, op.pos.y + D.height, D.orbit);
  const onSpot = vi.fn();
  /** One think (the first update thinks; a tiny dt keeps the drone on its mark). */
  const look = (x: number, z: number, crouched = false): void => {
    const target: Damageable = { alive: true, aimPoint: (out: Vector3) => out.set(x, 1, z) } as unknown as Damageable;
    const p: PlayerRef = { id: 'p', target, feet: new Vector3(x, 0, z), speed: 0, crouched };
    drone.update(0.0001, [p], 1, 0, onSpot);
  };
  return { drone, casts, onSpot, look };
}

describe('ReconDrone sight verdict (R1)', () => {
  it('a hit 0.2 m short of the aim point still sees: meter up, spot reported, cast with MASK.SIGHT', () => {
    const r = rig(0.2);
    r.look(10, D.orbit);
    expect(r.casts).toHaveLength(1);
    expect(r.casts[0]!.mask).toBe(MASK.SIGHT);
    expect(r.drone.meter).toBeGreaterThan(0);
    expect(r.onSpot).toHaveBeenCalledTimes(1);
  });

  it('a hit 0.5 m short of the aim point blocks: no meter, no spot', () => {
    const r = rig(0.5);
    r.look(10, D.orbit);
    expect(r.casts).toHaveLength(1);
    expect(r.drone.meter).toBe(0);
    expect(r.onSpot).not.toHaveBeenCalled();
  });

  it('a miss (distance = the segment length) sees', () => {
    const r = rig(null);
    r.look(10, D.orbit);
    expect(r.casts).toHaveLength(1);
    expect(r.casts[0]!.len).toBeGreaterThan(5);
    expect(r.drone.meter).toBeGreaterThan(0);
    expect(r.onSpot).toHaveBeenCalledTimes(1);
  });

  it('outside the cone and more than 3 m off (horizontally): no ray at all', () => {
    const r = rig(null);
    r.look(-10, D.orbit); // behind it
    r.look(0, D.orbit + 3.5); // 90 degrees off, over 3 m
    expect(r.casts).toHaveLength(0);
    expect(r.drone.meter).toBe(0);
    expect(r.onSpot).not.toHaveBeenCalled();
  });

  it('straight below (within 3 m horizontally) casts even outside the cone', () => {
    const r = rig(null);
    r.look(0, D.orbit + 2); // 90 degrees off but 2 m away
    expect(r.casts).toHaveLength(1);
    expect(r.onSpot).toHaveBeenCalledTimes(1);
  });

  it('beyond its range: no ray', () => {
    const r = rig(null);
    r.look(D.range + 5, D.orbit);
    expect(r.casts).toHaveLength(0);
    expect(r.onSpot).not.toHaveBeenCalled();
  });
});
