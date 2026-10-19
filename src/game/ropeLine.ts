import { Color3, CreateBox, StandardMaterial, Vector3, type Mesh, type Scene } from '../core/babylon';
import { hyp2, hyp3 } from '../core/mathx';
import type { TeamController } from './teamController';

/** Rope thickness (m) and the holder's hand height above its feet (render only, starting values). */
const ROPE_W = 0.035;
const HAND_Y = 0.95;

/**
 * (CT prototype B8) The two-person rope drawn while it is out (B7 drew none): render only, never read by gameplay. Two
 * pooled thin boxes: the holder's hands to the lip above the rope's foot, then straight down to the foot. Shown on the
 * holder's page (ropeOffer / ropeHold) and the climber's page (ropeClimb / ropeTop / ropeSlide). No per-frame allocation.
 */
export class RopeLine {
  private readonly a: Mesh;
  private readonly b: Mesh;
  private readonly from = new Vector3();
  private readonly lip = new Vector3();
  private readonly foot = new Vector3();
  private readonly mid = new Vector3();

  constructor(scene: Scene) {
    const mat = new StandardMaterial('ropeLineMat', scene);
    mat.diffuseColor = new Color3(0.55, 0.45, 0.3);
    mat.specularColor = new Color3(0, 0, 0);
    this.a = CreateBox('ropeLineA', { width: ROPE_W, height: ROPE_W, depth: 1 }, scene);
    this.b = CreateBox('ropeLineB', { width: ROPE_W, height: ROPE_W, depth: 1 }, scene);
    for (const m of [this.a, this.b]) {
      m.material = mat;
      m.isPickable = false;
      m.setEnabled(false);
    }
  }

  /** Each frame: follow the team controller's rope (hidden when no rope is out on this page). */
  update(team: TeamController, selfFeet: Vector3): void {
    const st = team.state;
    const holder = st === 'ropeOffer' || st === 'ropeHold';
    const climber = st === 'ropeClimb' || st === 'ropeTop' || st === 'ropeSlide';
    const hands = holder ? selfFeet : climber ? team.partnerPos() : null;
    if (!hands) {
      if (this.a.isEnabled()) {
        this.a.setEnabled(false);
        this.b.setEnabled(false);
      }
      return;
    }
    const r = team.rope;
    this.from.set(hands.x, hands.y + HAND_Y, hands.z);
    this.lip.set(r.x, r.edgeY + 0.05, r.z);
    this.foot.set(r.x, r.floorY + 0.02, r.z);
    this.place(this.a, this.from, this.lip);
    this.place(this.b, this.lip, this.foot);
  }

  private place(m: Mesh, p: Vector3, q: Vector3): void {
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const dz = q.z - p.z;
    const len = hyp3(dx, dy, dz);
    if (len < 0.02) {
      m.setEnabled(false);
      return;
    }
    if (!m.isEnabled()) m.setEnabled(true);
    this.mid.set((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
    m.position.copyFrom(this.mid);
    m.scaling.set(1, 1, len);
    // the box's depth axis (+Z) along p -> q: yaw then pitch
    m.rotation.set(-Math.atan2(dy, hyp2(dx, dz)), Math.atan2(dx, dz), 0);
  }

  dispose(): void {
    this.a.material?.dispose();
    this.a.dispose();
    this.b.dispose();
  }
}
