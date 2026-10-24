// (rig-pose-fix S7, audit G16) The course dummy's head volume comes from its sim position and the hit-volume fit of its
// static proportions (`hitVolumes(rig.p).headY`, plus `DUMMY_HEAD` along its yaw), not its animated head node: the
// dummy's rig animates without `solveDt` and skips solves beyond the Detail / governor LOD distance, so the old read moved
// with graphics state. Parity: the fit stays on the drawn head (a NullEngine rig built and posed as `TrainingDummy` does).
import { describe, expect, it } from 'vitest';
import { hitVolumes } from '../src/player/proportions';
import { DUMMY_HEAD } from '../src/game/trainingDummy';

describe('rig-pose-fix S7: the training dummy head from sim (G16)', () => {
  it('the sim head sits on the posed head (still and strafing)', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, Vector3 } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const rig = new CharacterRig(scene, (s, h) => lib.instance(s, h, 'dummy-part'), defaultLook(), 1.75, 'dummy-t', { armor: true });
    const headY = hitVolumes(rig.p).headY - DUMMY_HEAD.drop;
    const pos = new Vector3(4, 0, -2);
    const yaw = 0.7;
    rig.root.position.copyFrom(pos);
    rig.root.rotation.y = yaw;
    let worstY = 0;
    let worstH = 0;
    for (const speed of [0, 0.9]) {
      for (let k = 0; k < 120; k++) {
        rig.animate(1 / 60, { speed, localX: 1, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0.3, kick: 0 });
        if (k < 60) continue;
        rig.headNode.computeWorldMatrix(true);
        const h = rig.headNode.getAbsolutePosition();
        worstY = Math.max(worstY, Math.abs(h.y - (pos.y + headY)));
        worstH = Math.max(worstH, Math.sqrt((h.x - pos.x - Math.sin(yaw) * DUMMY_HEAD.fwd) ** 2 + (h.z - pos.z - Math.cos(yaw) * DUMMY_HEAD.fwd) ** 2));
      }
    }
    console.info(`dummy head: sim vs posed, vertical max ${(worstY * 100).toFixed(1)} cm, horizontal max ${(worstH * 100).toFixed(1)} cm (head radius ${(hitVolumes(rig.p).headR * 100).toFixed(1)} cm)`);
    // within 3 cm of the drawn head (the head sphere's radius is ~11 cm)
    expect(worstY).toBeLessThan(0.03);
    expect(worstH).toBeLessThan(0.03);
    scene.dispose();
  });
});
