import { describe, expect, it } from 'vitest';

// (ct-prototype, doorPeek parity; e2e-netmove "doorPeek": the host's copy stood 2-3 cm higher and, at low frame rates,
// its left foot landed 9-13 cm off the owner's) The door peek's stance comes from the MoveState alone: still, the
// feet step onto the stance spots under the root (`RigPose.settleFeet`, as on a wall), so the approach glide's frame
// rate and the copy's 20 Hz interpolation no longer decide where the feet end up. The owner glides onto the frame as
// `GameState.doorPeekStep` drives it (DOOR_PEEK.settle, a velocity override: no Chaos Theory stop); the copy is posed
// as `RemoteAvatar.update` poses it from the snapshots (100 ms behind, no motion driver).
describe('door peek stance parity (owner and copy, 15 and 60 fps)', () => {
  it('ankles and head of the owner and the copy agree within 2 cm at 15 and 60 fps', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { FreeCamera, Scene, Vector3 } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const { DOOR_PEEK } = await import('../src/world/doorPeek');
    const { emptyMovePose, poseFromMoveState } = await import('../src/player/moveState');
    // the owner's rig is near its own camera; the host's view of the copy is across the yard (the animation LOD halves
    // its rate, as on the host in e2e-netmove: "lod": true)
    const near = new Scene(new NullEngine());
    const far = new Scene(new NullEngine());
    far.activeCamera = new FreeCamera('host', new Vector3(40, 2, 40), far);
    const libs = new Map([[near, new PartLibrary(near)], [far, new PartLibrary(far)]]);
    const mk = (scene: typeof near) => new CharacterRig(scene, (shape, hex, slot) => libs.get(scene)!.instance(shape, hex, slot), defaultLook());
    // the frame spot (facing +z, the door ahead) and where the door menu's pick left the body (behind, off to the side)
    const FX = 0;
    const FZ = 0;
    const YAW = 0;
    const SX = -0.27;
    const SZ = -0.31;
    const T_END = 3;
    // the capsule rests SETTLE.rest (2 cm) over the floor (y 0): both rigs stand their feet on the probed floor (the
    // copy's probe is the host's physics ray since the fix; before it the copy's feet stood at the root, 2 cm up)
    const ROOT_Y = 0.02;
    const floor = () => 0;
    // the owner's capsule at 60 Hz (the fixed step): the glide onto the frame, then the 0.1 s pull onto it
    const path: { t: number; x: number; z: number; v: number }[] = [];
    {
      let x = SX;
      let z = SZ;
      const h = 1 / 60;
      for (let t = 0; t <= T_END + 0.5; t += h) {
        const left = t < DOOR_PEEK.settle ? Math.max(h, DOOR_PEEK.settle - t) : 0.1;
        const vx = (FX - x) / left;
        const vz = (FZ - z) / left;
        path.push({ t, x, z, v: Math.hypot(vx, vz) });
        x += vx * h;
        z += vz * h;
      }
    }
    const at = (t: number) => {
      const k = Math.max(0, Math.min(path.length - 2, Math.floor(t * 60)));
      const a = path[k]!;
      const b = path[k + 1]!;
      const u = Math.max(0, Math.min(1, (t - a.t) * 60));
      return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, v: a.v + (b.v - a.v) * u };
    };
    // the doorPeek MoveState the owner sends (hinge on the right: the left hand on the handle)
    const mv = { m: 'doorPeek', a: 0, s: 0, sub: 1, ph: 0.12, dw: 1, r: 0, rd: 0, ay: 0, tid: '' } as never;
    const mp = poseFromMoveState(mv, 0, emptyMovePose());
    expect(mp.settle).toBe(true);
    const base = { grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: true, lookYaw: 0, lookPitch: 0, wall: false, lean: 0, traverse: 'none' as const, traverseT: 0 };

    const owner = (fps: number) => {
      const rig = mk(near);
      rig.groundProbe = floor;
      const dt = 1 / fps;
      rig.root.rotation.y = YAW;
      let px = SX;
      let pz = SZ;
      for (let t = 0; t <= T_END; t += dt) {
        const p = at(t);
        const lx = p.x - px;
        const lz = p.z - pz;
        const d = Math.hypot(lx, lz);
        px = p.x;
        pz = p.z;
        rig.root.position.set(p.x, ROOT_Y, p.z);
        const moving = p.v > 0.05;
        // as Player.frameUpdate under the peek's override (ct off: no stop hold, no quick stop, the stride on the velocity)
        rig.animate(dt, { ...base, speed: p.v, localX: d > 1e-5 ? lx / d : 0, localZ: d > 1e-5 ? lz / d : 0, motion: moving ? 'move' : 'idle', motionT: t, quickStop: 0, holdSpeed: 0, accelFwd: 0, accelSide: 0, velX: d > 1e-5 ? (lx / d) * p.v : 0, velZ: d > 1e-5 ? (lz / d) * p.v : 0, goalYaw: YAW, stride: 'velocity', settleFeet: mp.settle } as never);
      }
      return rig;
    };
    const copy = (fps: number) => {
      const rig = mk(far);
      rig.groundProbe = floor;
      const dt = 1 / fps;
      rig.root.rotation.y = YAW;
      let speed = 0;
      let px = SX;
      let pz = SZ;
      for (let t = 0; t <= T_END; t += dt) {
        // the snapshots at 20 Hz, sampled 100 ms behind
        const rt = Math.max(0, t - 0.1);
        const k = Math.floor(rt * 20);
        const a = at(k / 20);
        const b = at((k + 1) / 20);
        const u = rt * 20 - k;
        const x = a.x + (b.x - a.x) * u;
        const z = a.z + (b.z - a.z) * u;
        speed += (Math.min(a.v, 12) - speed) * Math.min(1, dt * 10);
        const lx = x - px;
        const lz = z - pz;
        const d = Math.hypot(lx, lz);
        px = x;
        pz = z;
        rig.root.position.set(x, ROOT_Y, z);
        // as RemoteAvatar.update for mode doorPeek
        rig.animate(dt, { ...base, speed, localX: d > 1e-4 ? lx / d : 0, localZ: d > 1e-4 ? lz / d : 0, stride: mp.settle ? 'velocity' : 'facing', settleFeet: mp.settle } as never);
      }
      return rig;
    };
    const ref = owner(60);
    const rigs = { owner15: owner(15), copy60: copy(60), copy15: copy(15) };
    const errs: Record<string, number> = {};
    let worst = 0;
    for (const [name, rig] of Object.entries(rigs)) {
      for (const n of ['ankleL', 'ankleR', 'headNode'] as const) {
        const a = ref[n].getAbsolutePosition();
        const b = rig[n].getAbsolutePosition();
        const e = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        errs[`${name} ${n}`] = +e.toFixed(3);
        worst = Math.max(worst, e);
      }
    }
    // (m, against the owner at 60 fps)
    expect(worst, JSON.stringify(errs)).toBeLessThan(0.02);
    near.dispose();
    far.dispose();
  });
});
