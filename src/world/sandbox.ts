import {
  Color3,
  Color4,
  CreateBox,
  CreateGround,
  FreeCamera,
  HemisphericLight,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  StandardMaterial,
  Vector3,
  type Engine,
} from '../core/babylon';
import type { LoopHooks } from '../core/loop';
import { enablePhysics } from '../physics/havok';

/** Phase 1 smoke scene: proves Babylon + Havok + loop work offline. */
export async function createSandboxScene(engine: Engine): Promise<{ scene: Scene; hooks: LoopHooks }> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.45, 0.62, 0.8, 1);
  await enablePhysics(scene);

  const cam = new FreeCamera('cam', new Vector3(0, 6, -14), scene);
  cam.setTarget(new Vector3(0, 1, 0));
  new HemisphericLight('sky', new Vector3(0.3, 1, 0.2), scene);

  const ground = CreateGround('ground', { width: 40, height: 40 }, scene);
  const gm = new StandardMaterial('gm', scene);
  gm.diffuseColor = new Color3(0.35, 0.4, 0.32);
  gm.specularColor = Color3.Black();
  ground.material = gm;
  new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

  const bm = new StandardMaterial('bm', scene);
  bm.diffuseColor = new Color3(1, 0.54, 0.12);
  bm.specularColor = Color3.Black();
  const boxes = [] as PhysicsAggregate[];
  for (let i = 0; i < 12; i++) {
    const b = CreateBox(`b${i}`, { size: 1 }, scene);
    b.material = bm;
    b.position.set((i % 4) - 1.5, 4 + Math.floor(i / 4) * 1.5, (i % 3) * 0.3);
    boxes.push(new PhysicsAggregate(b, PhysicsShapeType.BOX, { mass: 1, restitution: 0.2 }, scene));
  }

  let t = 0;
  const hooks: LoopHooks = {
    fixedUpdate: () => {},
    frameUpdate: (dt) => {
      t += dt;
      cam.position.x = Math.sin(t * 0.3) * 14;
      cam.position.z = -Math.cos(t * 0.3) * 14;
      cam.setTarget(new Vector3(0, 1, 0));
    },
  };
  return { scene, hooks };
}
