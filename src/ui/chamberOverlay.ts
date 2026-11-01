import type { Scene } from '../core/babylon';
import { CHAMBER, CHAMBER_RIGS, CHAMBER_TARGET, chamberKey, type ChamberJoint, type ChamberRigView } from '../anim/chamber';
import type { KeyedClip } from '../anim/keyed';
import { projectPoint, type OverlayCam } from './overlayProject';

/** Foot trail samples kept per foot. */
const TRAIL_N = 60;
/** A key is recorded for the onion skin when the shown phase is this close to it (in keys). */
const ONION_NEAR = 0.26;

interface RigBones {
  /** The rig's joints (each once) and its bones as index pairs into them. */
  joints: ChamberJoint[];
  pairs: Int16Array;
}

/**
 * (anim-studio) The chamber's viewing aids as a 2D canvas over the game canvas (no scene meshes; `pointer-events: none`),
 * drawn after the render from the rigs' joints projected through the rendered camera (`overlayProject.ts`):
 * - the skeleton of every rig on the stage (green lines);
 * - foot contacts (a filled green dot planted, an orange ring swinging) and short foot trails;
 * - the onion skin of a keyed clip: the skeleton at the previous (blue) and next (orange) key, faint. A key's pose is
 *   cached (root-local) whenever the shown phase passes it, so a ghost shows once its key has played or been stepped
 *   onto; a tuner change, another clip, the mirror or root motion clear the cache.
 * Allocation-free per frame after the first frame of a rig.
 */
export class ChamberOverlay {
  private canvas: HTMLCanvasElement | null = null;
  private rectAt = 0;
  private W = 0;
  private H = 0;
  private readonly bones = new Map<ChamberRigView, RigBones>();
  private readonly pa = { x: 0, y: 0, z: 0 };
  private readonly pb = { x: 0, y: 0, z: 0 };
  // trails (the drive's target rig, else Wren): per sample L xyz, R xyz
  private readonly trail = new Float32Array(TRAIL_N * 6);
  private trailN = 0;
  private trailHead = 0;
  private trailRig: ChamberRigView | null = null;
  private trailEntry = '';
  // onion skin: per key, the joints root-local (x right, y up, z forward)
  private onion = new Float32Array(0);
  private onionOk = new Uint8Array(0);
  private onionClip: KeyedClip | null = null;
  private onionRig: ChamberRigView | null = null;
  private onionMirror = false;
  private onionRoot = false;
  private onionVer = -1;
  // (marlow-bays item 30d) the compare ghost: the compared key's joints root-local, recorded when she stands on it
  private cmp = new Float32Array(0);
  private cmpOk = false;
  private cmpClip: KeyedClip | null = null;
  private cmpRig: ChamberRigView | null = null;
  private cmpFrame = -1;
  private cmpMirror = false;
  private cmpRoot = false;
  private cmpVer = -1;

  /** Every frame while the chamber runs (after the render). */
  frame(nowMs: number, scene: Scene | null): void {
    const c = this.ensureCanvas();
    const g = c.getContext('2d');
    if (!g) return;
    if (scene && nowMs >= this.rectAt) {
      this.rectAt = nowMs + 500;
      const gc = scene.getEngine().getRenderingCanvas();
      if (gc) {
        const r = gc.getBoundingClientRect();
        c.style.left = `${r.left}px`;
        c.style.top = `${r.top}px`;
        c.style.width = `${r.width}px`;
        c.style.height = `${r.height}px`;
        const W = Math.max(1, Math.round(r.width));
        const H = Math.max(1, Math.round(r.height));
        if (c.width !== W || c.height !== H) {
          c.width = W;
          c.height = H;
        }
        this.W = W;
        this.H = H;
      }
    }
    c.hidden = false;
    g.clearRect(0, 0, c.width, c.height);
    const cam = scene?.activeCamera as unknown as OverlayCam | null | undefined;
    if (!cam || !cam.rotation || !(this.W > 0)) return;
    this.recordOnion();
    this.recordCompare();
    this.recordTrail();
    if (CHAMBER.onion) this.drawOnion(g, cam);
    if (CHAMBER.compare) this.drawCompare(g, cam);
    if (CHAMBER.skeleton) for (let i = 0; i < CHAMBER_RIGS.length; i++) this.drawSkeleton(g, cam, CHAMBER_RIGS[i]!);
    if (CHAMBER.feet) {
      this.drawTrail(g, cam);
      for (let i = 0; i < CHAMBER_RIGS.length; i++) this.drawFeet(g, cam, CHAMBER_RIGS[i]!);
    }
  }

  /** Hidden and emptied (the chamber left). */
  clear(): void {
    const c = this.canvas;
    if (c) {
      c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
      c.hidden = true;
    }
    this.bones.clear();
    this.trailN = 0;
    this.trailRig = null;
    this.onionClip = null;
    this.onionRig = null;
    this.cmpClip = null;
    this.cmpRig = null;
    this.cmpOk = false;
  }

  /** (item 30d) The compare ghost is recorded for the compared key (the panel visits the key once when it is not). */
  compareReady(): boolean {
    return this.cmpOk && this.cmpClip === CHAMBER_TARGET.clip && this.cmpRig === CHAMBER_TARGET.rig && this.cmpFrame === this.compareFrame();
  }

  /** The compared key's frame of the clip playing (-1 none). */
  private compareFrame(): number {
    const clip = CHAMBER_TARGET.clip;
    return clip && Number.isFinite(CHAMBER.comparePhase) ? chamberKey(CHAMBER.comparePhase, clip.frames) : -1;
  }

  /** (item 30d) Record the target's joints (root-local) while she stands on the compared key's frame. */
  private recordCompare(): void {
    const rig = CHAMBER_TARGET.rig;
    const clip = CHAMBER_TARGET.clip;
    const fr = this.compareFrame();
    if (!rig || !clip || fr < 0) {
      this.cmpOk = false;
      return;
    }
    const b = this.bonesOf(rig);
    const J = b.joints.length;
    if (clip !== this.cmpClip || rig !== this.cmpRig || fr !== this.cmpFrame || CHAMBER.mirror !== this.cmpMirror || CHAMBER.rootMotion !== this.cmpRoot || CHAMBER.compareVer !== this.cmpVer) {
      this.cmpClip = clip;
      this.cmpRig = rig;
      this.cmpFrame = fr;
      this.cmpMirror = CHAMBER.mirror;
      this.cmpRoot = CHAMBER.rootMotion;
      this.cmpVer = CHAMBER.compareVer;
      this.cmpOk = false;
      if (this.cmp.length !== J * 3) this.cmp = new Float32Array(J * 3);
    }
    const ph = CHAMBER_TARGET.drive?.live ?? CHAMBER.phase;
    // (on the key itself: its phase; a key sits on the bake's 1/48 grid, not always on a clip frame)
    let dp = Math.abs(ph - CHAMBER.comparePhase) % 1;
    if (dp > 0.5) dp = 1 - dp;
    if (dp > 1e-4) return;
    const rp = rig.root.position;
    const yaw = rig.root.rotation.y;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const o = this.cmp;
    for (let j = 0; j < J; j++) {
      const p = b.joints[j]!.getAbsolutePosition();
      const dx = p.x - rp.x;
      const dz = p.z - rp.z;
      o[j * 3] = dx * c - dz * s;
      o[j * 3 + 1] = p.y - rp.y;
      o[j * 3 + 2] = dx * s + dz * c;
    }
    this.cmpOk = true;
  }

  /** (item 30d) The compare ghost: the compared key's skeleton, light, over her. */
  private drawCompare(g: CanvasRenderingContext2D, cam: OverlayCam): void {
    const rig = this.cmpRig;
    if (!rig || !this.compareReady()) return;
    const b = this.bonesOf(rig);
    const o = this.cmp;
    const rp = rig.root.position;
    const yaw = rig.root.rotation.y;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(235,225,255,0.5)';
    g.beginPath();
    for (let i = 0; i < b.pairs.length; i += 2) {
      const a = b.pairs[i]! * 3;
      const e = b.pairs[i + 1]! * 3;
      const ax = rp.x + o[a]! * c + o[a + 2]! * s;
      const az = rp.z - o[a]! * s + o[a + 2]! * c;
      const ex = rp.x + o[e]! * c + o[e + 2]! * s;
      const ez = rp.z - o[e]! * s + o[e + 2]! * c;
      this.seg(g, cam, ax, rp.y + o[a + 1]!, az, ex, rp.y + o[e + 1]!, ez);
    }
    g.stroke();
  }

  private ensureCanvas(): HTMLCanvasElement {
    let c = this.canvas;
    if (!c) {
      c = this.canvas = document.createElement('canvas');
      c.className = 'chamber-overlay';
      c.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:139;';
      document.body.appendChild(c);
    }
    return c;
  }

  private bonesOf(rig: ChamberRigView): RigBones {
    let b = this.bones.get(rig);
    if (b) return b;
    const list = rig.bones();
    const joints: ChamberJoint[] = [];
    const pairs = new Int16Array(list.length * 2);
    list.forEach(([a, c], i) => {
      let ia = joints.indexOf(a);
      if (ia < 0) ia = joints.push(a) - 1;
      let ic = joints.indexOf(c);
      if (ic < 0) ic = joints.push(c) - 1;
      pairs[i * 2] = ia;
      pairs[i * 2 + 1] = ic;
    });
    b = { joints, pairs };
    this.bones.set(rig, b);
    return b;
  }

  /** A projected segment (skipped when an end is behind the camera). */
  private seg(g: CanvasRenderingContext2D, cam: OverlayCam, ax: number, ay: number, az: number, bx: number, by: number, bz: number): void {
    const near = Math.max(0.05, cam.minZ);
    projectPoint(cam, ax, ay, az, this.W, this.H, this.pa);
    projectPoint(cam, bx, by, bz, this.W, this.H, this.pb);
    if (this.pa.z <= near || this.pb.z <= near) return;
    g.moveTo(this.pa.x, this.pa.y);
    g.lineTo(this.pb.x, this.pb.y);
  }

  private drawSkeleton(g: CanvasRenderingContext2D, cam: OverlayCam, rig: ChamberRigView): void {
    const b = this.bonesOf(rig);
    g.strokeStyle = 'rgba(80,255,130,0.9)';
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < b.pairs.length; i += 2) {
      const a = b.joints[b.pairs[i]!]!.getAbsolutePosition();
      const ax = a.x;
      const ay = a.y;
      const az = a.z;
      const c = b.joints[b.pairs[i + 1]!]!.getAbsolutePosition();
      this.seg(g, cam, ax, ay, az, c.x, c.y, c.z);
    }
    g.stroke();
  }

  private drawFeet(g: CanvasRenderingContext2D, cam: OverlayCam, rig: ChamberRigView): void {
    const near = Math.max(0.05, cam.minZ);
    for (let k = 0; k < 2; k++) {
      const f = k === 0 ? rig.planner.L : rig.planner.R;
      projectPoint(cam, f.x, f.y + 0.01, f.z, this.W, this.H, this.pa);
      if (this.pa.z <= near) continue;
      const r = Math.max(3, Math.min(10, 60 / this.pa.z));
      g.beginPath();
      g.arc(this.pa.x, this.pa.y, r, 0, Math.PI * 2);
      if (f.contact) {
        g.fillStyle = 'rgba(60,230,110,0.85)';
        g.fill();
      } else {
        g.strokeStyle = 'rgba(255,160,40,0.95)';
        g.lineWidth = 2;
        g.stroke();
      }
    }
  }

  /** The target rig's feet into the ring buffer (cleared on another rig or loop). */
  private recordTrail(): void {
    const rig = CHAMBER_TARGET.rig ?? CHAMBER_RIGS[0] ?? null;
    if (rig !== this.trailRig || CHAMBER.entry !== this.trailEntry) {
      this.trailRig = rig;
      this.trailEntry = CHAMBER.entry;
      this.trailN = 0;
      this.trailHead = 0;
    }
    if (!rig) return;
    const t = this.trail;
    const L = rig.planner.L;
    const R = rig.planner.R;
    // (a frozen frame adds nothing: the trail keeps its shape)
    if (this.trailN > 0) {
      const p = ((this.trailHead - 1 + TRAIL_N) % TRAIL_N) * 6;
      if (t[p] === L.x && t[p + 1] === L.y && t[p + 2] === L.z && t[p + 3] === R.x && t[p + 4] === R.y && t[p + 5] === R.z) return;
    }
    const o = this.trailHead * 6;
    t[o] = L.x;
    t[o + 1] = L.y;
    t[o + 2] = L.z;
    t[o + 3] = R.x;
    t[o + 4] = R.y;
    t[o + 5] = R.z;
    this.trailHead = (this.trailHead + 1) % TRAIL_N;
    this.trailN = Math.min(TRAIL_N, this.trailN + 1);
  }

  private drawTrail(g: CanvasRenderingContext2D, cam: OverlayCam): void {
    const n = this.trailN;
    if (n < 2) return;
    const t = this.trail;
    g.lineWidth = 1.5;
    for (let side = 0; side < 2; side++) {
      g.strokeStyle = side === 0 ? 'rgba(120,200,255,0.7)' : 'rgba(255,140,200,0.7)';
      g.beginPath();
      for (let i = 1; i < n; i++) {
        const a = ((this.trailHead - n + i - 1 + TRAIL_N * 2) % TRAIL_N) * 6 + side * 3;
        const b = ((this.trailHead - n + i + TRAIL_N * 2) % TRAIL_N) * 6 + side * 3;
        this.seg(g, cam, t[a]!, t[a + 1]! + 0.01, t[a + 2]!, t[b]!, t[b + 1]! + 0.01, t[b + 2]!);
      }
      g.stroke();
    }
  }

  /** Cache the target's joints (root-local) at the key nearest the shown phase, when close enough to it. */
  private recordOnion(): void {
    const rig = CHAMBER_TARGET.rig;
    const clip = CHAMBER_TARGET.clip;
    if (!rig || !clip) {
      this.onionClip = null;
      return;
    }
    const b = this.bonesOf(rig);
    const J = b.joints.length;
    const N = clip.frames;
    if (clip !== this.onionClip || rig !== this.onionRig || CHAMBER.mirror !== this.onionMirror || CHAMBER.rootMotion !== this.onionRoot || CHAMBER.poseVer !== this.onionVer) {
      this.onionClip = clip;
      this.onionRig = rig;
      this.onionMirror = CHAMBER.mirror;
      this.onionRoot = CHAMBER.rootMotion;
      this.onionVer = CHAMBER.poseVer;
      if (this.onion.length !== N * J * 3) {
        this.onion = new Float32Array(N * J * 3);
        this.onionOk = new Uint8Array(N);
      } else this.onionOk.fill(0);
    }
    // the phase the rig was posed at this frame
    const ph = CHAMBER_TARGET.drive?.live ?? CHAMBER.phase;
    const f = ph * N;
    const near = Math.abs(f - Math.round(f));
    if (near > ONION_NEAR) return;
    const k = chamberKey(ph, N);
    const rp = rig.root.position;
    const yaw = rig.root.rotation.y;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const o = this.onion;
    for (let j = 0; j < J; j++) {
      const p = b.joints[j]!.getAbsolutePosition();
      const dx = p.x - rp.x;
      const dz = p.z - rp.z;
      const at = (k * J + j) * 3;
      o[at] = dx * c - dz * s;
      o[at + 1] = p.y - rp.y;
      o[at + 2] = dx * s + dz * c;
    }
    this.onionOk[k] = 1;
  }

  private drawOnion(g: CanvasRenderingContext2D, cam: OverlayCam): void {
    const rig = this.onionRig;
    const clip = this.onionClip;
    if (!rig || !clip) return;
    const N = clip.frames;
    const k = chamberKey(CHAMBER_TARGET.drive?.live ?? CHAMBER.phase, N);
    const b = this.bonesOf(rig);
    g.lineWidth = 1.5;
    this.ghost(g, cam, rig, b, (k - 1 + N) % N, 'rgba(110,170,255,0.45)');
    this.ghost(g, cam, rig, b, (k + 1) % N, 'rgba(255,170,90,0.45)');
  }

  private ghost(g: CanvasRenderingContext2D, cam: OverlayCam, rig: ChamberRigView, b: RigBones, key: number, color: string): void {
    if (!this.onionOk[key]) return;
    const J = b.joints.length;
    const o = this.onion;
    const rp = rig.root.position;
    const yaw = rig.root.rotation.y;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    g.strokeStyle = color;
    g.beginPath();
    for (let i = 0; i < b.pairs.length; i += 2) {
      const a = (key * J + b.pairs[i]!) * 3;
      const e = (key * J + b.pairs[i + 1]!) * 3;
      const ax = rp.x + o[a]! * c + o[a + 2]! * s;
      const az = rp.z - o[a]! * s + o[a + 2]! * c;
      const ex = rp.x + o[e]! * c + o[e + 2]! * s;
      const ez = rp.z - o[e]! * s + o[e + 2]! * c;
      this.seg(g, cam, ax, rp.y + o[a + 1]!, az, ex, rp.y + o[e + 1]!, ez);
    }
    g.stroke();
  }
}
