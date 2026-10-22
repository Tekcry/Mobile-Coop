import { describe, expect, it } from 'vitest';
import type { Vector3 } from '../src/core/babylon';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Body } from '../src/ai/body';
import { CameraUnit } from '../src/security/camera';
import type { CameraDevice } from '../src/security/data';
import {
  CAM_BODY,
  SecuritySystem,
  cameraSeesBody,
  type CamBody,
  type CameraBodyEvent,
  type SightRay,
} from '../src/security/securitySystem';

// (guard-ai S7, design 9) Cameras see downed bodies: frame + range + one ray to the hips, IR (no light), once per camera.

/** A camera at the origin, 3 m up, facing +Z, pitched down to the floor 8 m ahead (range 18 m). */
const CAM: CameraDevice = { id: 'cam1', kind: 'camera', level: 'ground', at: [0, 0], y: 3, facing: 0, aim: 8, reason: 't', section: 2 };

/** Static world for the ray: walls are planes z = const across the whole map (null = open floor). */
class FakeRay implements SightRay {
  wallZ: number | null = null;
  calls = 0;
  hitDistance(from: Vector3, to: Vector3): number {
    this.calls++;
    const len = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2 + (to.z - from.z) ** 2);
    const w = this.wallZ;
    if (w === null) return len;
    const lo = Math.min(from.z, to.z);
    const hi = Math.max(from.z, to.z);
    if (w <= lo || w >= hi) return len;
    return (len * (w - from.z)) / (to.z - from.z);
  }
}

interface FakeBody extends CamBody {
  id: string;
  pos: { x: number; y: number; z: number };
  lethal: boolean;
  carried: boolean;
  hidden: boolean;
  present: boolean;
  /** The lamp light on it (the real `Body` has it; the camera must ignore it). */
  light: number;
}

function body(id: string, x: number, z: number, lethal = false, light = 1): FakeBody {
  return { id, pos: { x, y: 0.15, z }, lethal, carried: false, hidden: false, present: true, light };
}

function rig(devices: CameraDevice[] = [CAM]): { sys: SecuritySystem; ray: FakeRay; bodies: FakeBody[]; events: CameraBodyEvent[] } {
  const ray = new FakeRay();
  const sys = new SecuritySystem({ devices }, { ballistics: ray as unknown as Ballistics, players: () => [] });
  const bodies: FakeBody[] = [];
  const events: CameraBodyEvent[] = [];
  sys.setBodySource(() => bodies);
  sys.onBody = (e) => events.push(e);
  return { sys, ray, bodies, events };
}

/** Run the system `s` seconds at 60 Hz. */
function run(sys: SecuritySystem, s: number): void {
  for (let i = 0; i < Math.round(s * 60); i++) sys.fixedUpdate(1 / 60);
}

describe('camera body pass (S7)', () => {
  it('reports a body in frame and range once, with its camera, id, kind and position', () => {
    const { sys, bodies, events } = rig();
    bodies.push(body('b1', 0.5, 8, true));
    run(sys, 3);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ camera: 'cam1', bodyId: 'b1', lethal: true, x: 0.5, y: 0.15, z: 8, section: 2 });
  });

  it(`thinks at ${CAM_BODY.hz} Hz: nothing before the first body pass`, () => {
    const { sys, bodies, events } = rig();
    bodies.push(body('b1', 0, 8));
    run(sys, 0.4);
    expect(events).toHaveLength(0);
    run(sys, 0.2);
    expect(events).toHaveLength(1);
  });

  it('does not report a body behind a wall', () => {
    const { sys, ray, bodies, events } = rig();
    ray.wallZ = 5;
    bodies.push(body('b1', 0, 8));
    run(sys, 3);
    expect(events).toHaveLength(0);
    // the wall gone (a door opened): seen
    ray.wallZ = null;
    run(sys, 1);
    expect(events).toHaveLength(1);
  });

  it('a hit at the body itself (the floor it lies on) is not an occluder', () => {
    const { sys, ray, bodies, events } = rig();
    ray.wallZ = 8 - 0.1;
    bodies.push(body('b1', 0, 8));
    run(sys, 1);
    expect(events).toHaveLength(1);
  });

  it('does not report a body out of range or out of frame', () => {
    const { sys, bodies, events } = rig([{ ...CAM, range: 10 }]);
    bodies.push(body('far', 0, 14)); // past the 10 m range
    bodies.push(body('behind', 0, -6)); // behind the camera
    bodies.push(body('side', 12, 4)); // outside the 70 deg field
    run(sys, 3);
    expect(events).toHaveLength(0);
  });

  it('a looped, off, jammed or destroyed camera sees nothing; back online it reports', () => {
    for (const blind of ['looped', 'off', 'jammed', 'destroyed'] as const) {
      const { sys, bodies, events } = rig();
      const c = sys.cameras[0]!;
      if (blind === 'jammed') c.frozen = true;
      else if (blind === 'destroyed') c.destroy();
      else c.setMode(blind);
      bodies.push(body('b1', 0, 8));
      run(sys, 3);
      expect(events, blind).toHaveLength(0);
      if (blind === 'jammed') c.frozen = false;
      else if (blind === 'destroyed') c.repair();
      else c.setMode('online');
      run(sys, 1);
      expect(events, blind).toHaveLength(1);
    }
  });

  it('IR (G240): a body in the dark is reported the same as a lit one', () => {
    const { sys, bodies, events } = rig();
    bodies.push(body('dark', -0.5, 8, false, 0));
    bodies.push(body('lit', 0.5, 8, false, 1));
    run(sys, 1);
    expect(events.map((e) => e.bodyId).sort()).toEqual(['dark', 'lit']);
  });

  it('does not report a carried, hidden or gone body', () => {
    const { sys, bodies, events } = rig();
    const carried = body('carried', 0, 8);
    carried.carried = true;
    carried.present = false;
    const hidden = body('hidden', 0.4, 8);
    hidden.hidden = true;
    hidden.present = false;
    const gone = body('gone', -0.4, 8);
    gone.present = false;
    bodies.push(carried, hidden, gone);
    run(sys, 3);
    expect(events).toHaveLength(0);
    // put down in view: now it is reported
    carried.carried = false;
    carried.present = true;
    run(sys, 1);
    expect(events.map((e) => e.bodyId)).toEqual(['carried']);
  });

  it('never reports the same body twice from one camera; a second camera reports it once too', () => {
    const second: CameraDevice = { ...CAM, id: 'cam2', at: [1, 0] };
    const { sys, bodies, events } = rig([CAM, second]);
    bodies.push(body('b1', 0.5, 8));
    run(sys, 10);
    expect(events.map((e) => e.camera).sort()).toEqual(['cam1', 'cam2']);
    // moved (dragged) and still in view: no new report
    bodies[0]!.pos.z = 9;
    run(sys, 5);
    expect(events).toHaveLength(2);
    // a restart clears the reports
    sys.clearBodyReports();
    run(sys, 1);
    expect(events).toHaveLength(4);
  });

  it('reported bodies cost no ray; no source or no listener: no pass at all', () => {
    const { sys, ray, bodies, events } = rig();
    bodies.push(body('b1', 0, 8));
    run(sys, 1);
    expect(events).toHaveLength(1);
    const n = ray.calls;
    run(sys, 5);
    expect(ray.calls).toBe(n);
    sys.setBodySource(null);
    bodies.push(body('b2', 0.3, 8));
    run(sys, 2);
    expect(events).toHaveLength(1);
    expect(ray.calls).toBe(n);
  });

  it('cameraSeesBody is the pure per-camera test (frame, range, ray; no light input)', () => {
    const c = new CameraUnit(CAM, 0);
    const ray = new FakeRay();
    expect(cameraSeesBody(c, 0, 0.15, 8, ray)).toBe(true);
    expect(cameraSeesBody(c, 0, 0.15, 30, ray)).toBe(false);
    ray.wallZ = 4;
    expect(cameraSeesBody(c, 0, 0.15, 8, ray)).toBe(false);
  });

  it('the real Body fits CamBody (the host hands over EnemyManager.bodies directly)', () => {
    const fits = (b: Body): CamBody => b;
    expect(typeof fits).toBe('function');
  });
});
