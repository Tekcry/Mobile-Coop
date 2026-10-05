import {
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeBox,
  PhysicsShapeCylinder,
  Quaternion,
  TransformNode,
  Vector3,
  type AbstractMesh,
  type PhysicsShape,
  type Scene,
} from '../core/babylon';
import { BUDGET, G, MASK } from '../physics/groups';
import type { PartLibrary } from './partLibrary';
import { PALETTE } from './materials';

export type PropKind = 'crate' | 'smallCrate' | 'barrel' | 'explosiveBarrel' | 'box';

export interface PropDef {
  mass: number;
  size: [number, number, number];
  shape: 'box' | 'cyl';
  hp: number;
  explosive?: { radius: number; damage: number; force: number };
}

export const PROP_DEFS: Record<PropKind, PropDef> = {
  crate: { mass: 14, size: [1, 1, 1], shape: 'box', hp: 9999 },
  smallCrate: { mass: 5, size: [0.6, 0.6, 0.6], shape: 'box', hp: 9999 },
  box: { mass: 3, size: [0.5, 0.35, 0.4], shape: 'box', hp: 9999 },
  barrel: { mass: 16, size: [0.6, 0.9, 0.6], shape: 'cyl', hp: 9999 },
  explosiveBarrel: { mass: 16, size: [0.6, 0.9, 0.6], shape: 'cyl', hp: 40, explosive: { radius: 5.5, damage: 140, force: 60 } },
};

export interface Prop {
  id: number;
  kind: PropKind;
  node: TransformNode;
  body: PhysicsBody;
  shape: PhysicsShape;
  parts: AbstractMesh[];
  hp: number;
  alive: boolean;
}

/** Dynamic physics props (capped by BUDGET.maxDynamicProps). Instanced visuals. */
export class PropSystem {
  readonly props: Prop[] = [];
  private byBody = new Map<PhysicsBody, Prop>();
  private nextId = 1;
  onDestroyed: ((p: Prop) => void) | null = null;

  constructor(
    private scene: Scene,
    private parts: PartLibrary,
    private shadowCaster?: (m: AbstractMesh) => void,
  ) {}

  spawn(kind: PropKind, pos: Vector3, yaw = 0): Prop | null {
    if (this.props.filter((p) => p.alive).length >= BUDGET.maxDynamicProps) return null;
    const def = PROP_DEFS[kind];
    const node = new TransformNode(`prop-${kind}`, this.scene);
    node.position.copyFrom(pos);
    node.position.y += def.size[1] / 2;
    node.rotationQuaternion = Quaternion.RotationYawPitchRoll(yaw, 0, 0);
    const [sx, sy, sz] = def.size;
    const meshes: AbstractMesh[] = [];
    const add = (shape: 'box' | 'cyl', hex: string, s: [number, number, number], p: [number, number, number] = [0, 0, 0]): void => {
      const m = this.parts.instance(shape, hex, `prop-${kind}-part`);
      m.parent = node;
      m.scaling.set(...s);
      m.position.set(...p);
      meshes.push(m);
      this.shadowCaster?.(m);
    };
    if (kind === 'crate' || kind === 'smallCrate' || kind === 'box') {
      const col = kind === 'box' ? '#8f9aa3' : PALETTE.crate;
      add('box', col, [sx, sy, sz]);
      if (kind !== 'box') {
        add('box', PALETTE.crateDark, [sx * 1.02, sy * 0.14, sz * 1.02], [0, sy * 0.36, 0]);
        add('box', PALETTE.crateDark, [sx * 1.02, sy * 0.14, sz * 1.02], [0, -sy * 0.36, 0]);
      }
    } else {
      const col = kind === 'explosiveBarrel' ? PALETTE.barrel : '#4f7b8f';
      add('cyl', col, [sx, sy, sz]);
      add('cyl', kind === 'explosiveBarrel' ? PALETTE.hazard : '#2f4b5a', [sx * 1.04, sy * 0.08, sz * 1.04], [0, sy * 0.3, 0]);
      add('cyl', kind === 'explosiveBarrel' ? PALETTE.hazard : '#2f4b5a', [sx * 1.04, sy * 0.08, sz * 1.04], [0, -sy * 0.3, 0]);
    }
    const shape =
      def.shape === 'box'
        ? new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(sx, sy, sz), this.scene)
        : new PhysicsShapeCylinder(new Vector3(0, -sy / 2, 0), new Vector3(0, sy / 2, 0), sx / 2, this.scene);
    shape.filterMembershipMask = G.PROP;
    shape.filterCollideMask = MASK.PROP_COLLIDE;
    shape.material = { friction: 0.7, restitution: 0.15 };
    const body = new PhysicsBody(node, PhysicsMotionType.DYNAMIC, false, this.scene);
    body.shape = shape;
    body.setMassProperties({ mass: def.mass });
    body.setLinearDamping(0.15);
    body.setAngularDamping(0.3);
    const prop: Prop = { id: this.nextId++, kind, node, body, shape, parts: meshes, hp: def.hp, alive: true };
    this.props.push(prop);
    this.byBody.set(body, prop);
    return prop;
  }

  get(body: PhysicsBody | undefined): Prop | undefined {
    return body ? this.byBody.get(body) : undefined;
  }

  impulse(prop: Prop, impulse: Vector3, point: Vector3): void {
    prop.body.applyImpulse(impulse, point);
  }

  /** Push every prop within radius away from the centre. */
  blast(center: Vector3, radius: number, force: number): void {
    for (const p of this.props) {
      if (!p.alive) continue;
      const d = p.node.position.subtract(center);
      const dist = d.length();
      if (dist > radius) continue;
      const f = force * (1 - dist / radius) * PROP_DEFS[p.kind].mass * 0.12;
      d.y = Math.max(0.4, d.y + 0.6);
      d.normalize().scaleInPlace(f);
      p.body.applyImpulse(d, p.node.position.add(new Vector3(0, 0.15, 0)));
    }
  }

  /** Apply damage; returns true if the prop was destroyed. */
  damage(prop: Prop, amount: number): boolean {
    if (!prop.alive || prop.hp >= 9999) return false;
    prop.hp -= amount;
    if (prop.hp > 0) return false;
    this.remove(prop);
    this.onDestroyed?.(prop);
    return true;
  }

  remove(prop: Prop): void {
    if (!prop.alive) return;
    prop.alive = false;
    this.byBody.delete(prop.body);
    prop.body.dispose();
    prop.shape.dispose();
    for (const m of prop.parts) m.dispose();
    prop.node.dispose();
  }

  dispose(): void {
    for (const p of this.props) this.remove(p);
    this.props.length = 0;
  }
}
