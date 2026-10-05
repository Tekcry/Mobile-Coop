import { Color4, CreateLineSystem, SceneInstrumentation, Vector3, type Engine, type LinesMesh, type Scene } from '../core/babylon';
import { MOVEMENT, MOVEMENT_RANGES, type MovementKey } from '../config/movement';
import { DEBUG_RIGS, DEBUG_VOLUMES } from './debugVolumes';
import type { GameLoop } from '../core/loop';

/**
 * FPS / frame-time overlay. Toggle with F3, the settings switch, or a 3-finger tap.
 * Instrumentation is only active while visible.
 */
export class DebugOverlay {
  private el: HTMLDivElement;
  private visible = false;
  private instr: SceneInstrumentation | null = null;
  private scene: Scene | null = null;
  private frameTimes: number[] = [];
  private last = performance.now();
  private nextPaint = 0;
  private graph: HTMLCanvasElement;
  private text: HTMLPreElement;
  /** Extra lines provided by game systems. */
  readonly extra = new Map<string, () => string>();
  /** Movement controller capsules to draw in the skeleton view (set by the play session). */
  controllerCapsules: (() => { feet: Vector3; height: number; radius: number }[]) | null = null;
  private skeleton = false;
  private lines: LinesMesh | null = null;
  private tools: HTMLDivElement;
  private tune: HTMLDivElement;

  constructor(private engine: Engine, private loop: GameLoop) {
    this.el = document.createElement('div');
    this.el.className = 'debug-overlay';
    this.el.hidden = true;
    this.text = document.createElement('pre');
    this.graph = document.createElement('canvas');
    this.graph.width = 120;
    this.graph.height = 32;
    this.tools = document.createElement('div');
    this.tools.className = 'debug-tools';
    this.tune = document.createElement('div');
    this.tune.className = 'debug-tune';
    this.tune.hidden = true;
    const btn = (label: string, fn: (b: HTMLButtonElement) => void): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', () => fn(b));
      return b;
    };
    this.tools.append(
      btn('Skeleton', (b) => {
        this.skeleton = !this.skeleton;
        b.classList.toggle('on', this.skeleton);
        if (!this.skeleton) this.clearLines();
      }),
      btn('Tune', (b) => {
        this.tune.hidden = !this.tune.hidden;
        b.classList.toggle('on', !this.tune.hidden);
      }),
    );
    this.buildTune();
    this.el.append(this.text, this.graph, this.tools, this.tune);
    document.body.appendChild(this.el);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') this.toggle();
    });
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 3) this.toggle();
    });
    engine.onEndFrameObservable.add(() => this.onFrame());
  }

  /** Live movement/camera tuning: sliders bound to the MOVEMENT table (applies immediately). */
  private buildTune(): void {
    for (const [k, range] of Object.entries(MOVEMENT_RANGES) as [MovementKey, [number, number, number]][]) {
      const row = document.createElement('label');
      const name = document.createElement('span');
      name.textContent = k;
      const val = document.createElement('b');
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(range[0]);
      input.max = String(range[1]);
      input.step = String(range[2]);
      input.value = String(MOVEMENT[k]);
      val.textContent = String(MOVEMENT[k]);
      input.addEventListener('input', () => {
        (MOVEMENT as Record<MovementKey, number>)[k] = Number(input.value);
        val.textContent = input.value;
      });
      row.append(name, input, val);
      this.tune.append(row);
    }
  }

  private clearLines(): void {
    this.lines?.dispose();
    this.lines = null;
  }

  /** Skeleton (bones), controller capsules and hit volumes as lines over the meshes. */
  private drawSkeleton(): void {
    const scene = this.scene;
    this.clearLines();
    if (!scene) return;
    const lines: Vector3[][] = [];
    const colors: Color4[][] = [];
    const push = (pts: Vector3[], c: Color4): void => {
      lines.push(pts);
      colors.push(pts.map(() => c));
    };
    const boneC = new Color4(0.3, 1, 0.5, 1);
    for (const rig of DEBUG_RIGS) {
      if (!rig.root.isEnabled()) continue;
      for (const [a, b] of rig.bones()) {
        a.computeWorldMatrix(true);
        b.computeWorldMatrix(true);
        push([a.getAbsolutePosition().clone(), b.getAbsolutePosition().clone()], boneC);
      }
    }
    const ring = (c: Vector3, r: number, axis: 'y' | 'x' | 'z', n = 16): Vector3[] => {
      const pts: Vector3[] = [];
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const u = Math.cos(a) * r;
        const v = Math.sin(a) * r;
        pts.push(axis === 'y' ? new Vector3(c.x + u, c.y, c.z + v) : axis === 'x' ? new Vector3(c.x, c.y + u, c.z + v) : new Vector3(c.x + u, c.y + v, c.z));
      }
      return pts;
    };
    const capsule = (p0: Vector3, p1: Vector3, r: number, c: Color4): void => {
      push(ring(p0, r, 'y'), c);
      push(ring(p1, r, 'y'), c);
      for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]] as const) push([p0.add(new Vector3(dx, 0, dz)), p1.add(new Vector3(dx, 0, dz))], c);
      push(ring(p0.add(new Vector3(0, -r * 0.7, 0)), r * 0.7, 'y'), c);
      push(ring(p1.add(new Vector3(0, r * 0.7, 0)), r * 0.7, 'y'), c);
    };
    for (const v of DEBUG_VOLUMES) {
      if (!v.node.isEnabled()) continue;
      v.node.computeWorldMatrix(true);
      const o = v.node.getAbsolutePosition();
      if (o.y < -100) continue;
      const c = Color4.FromHexString(v.color + 'ff');
      if (v.kind === 'sphere') {
        push(ring(o, v.r, 'y'), c);
        push(ring(o, v.r, 'x'), c);
        push(ring(o, v.r, 'z'), c);
      } else capsule(o.add(new Vector3(0, v.y0, 0)), o.add(new Vector3(0, v.y1, 0)), v.r, c);
    }
    const ccC = new Color4(1, 1, 1, 1);
    for (const cc of this.controllerCapsules?.() ?? []) {
      capsule(cc.feet.add(new Vector3(0, cc.radius, 0)), cc.feet.add(new Vector3(0, cc.height - cc.radius, 0)), cc.radius, ccC);
    }
    if (!lines.length) return;
    this.lines = CreateLineSystem('debug-skeleton', { lines, colors }, scene);
    this.lines.isPickable = false;
    this.lines.renderingGroupId = 2;
  }

  setScene(scene: Scene | null): void {
    this.clearLines();
    this.instr?.dispose();
    this.instr = null;
    this.scene = scene;
    if (this.visible && scene) this.instr = new SceneInstrumentation(scene);
  }

  toggle(force?: boolean): void {
    this.visible = force ?? !this.visible;
    this.el.hidden = !this.visible;
    this.setScene(this.scene);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  private onFrame(): void {
    const now = performance.now();
    const ft = now - this.last;
    this.last = now;
    if (!this.visible) return;
    if (this.skeleton) this.drawSkeleton();
    this.frameTimes.push(ft);
    if (this.frameTimes.length > 120) this.frameTimes.shift();
    if (now < this.nextPaint) return;
    this.nextPaint = now + 250;
    const n = this.frameTimes.length;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / n;
    const worst = Math.max(...this.frameTimes);
    const s = this.scene;
    const lines = [
      `FPS ${(1000 / avg).toFixed(0)}  avg ${avg.toFixed(1)}ms  max ${worst.toFixed(1)}ms`,
      `sim ${this.loop.stats.simMs.toFixed(2)}ms  phys ${this.loop.stats.physicsMs.toFixed(2)}ms  steps ${this.loop.stats.steps}`,
      `draws ${this.instr?.drawCallsCounter.current ?? '-'}  active ${s?.getActiveMeshes().length ?? 0}/${s?.meshes.length ?? 0}`,
      `res ${this.engine.getRenderWidth()}x${this.engine.getRenderHeight()}  scale ${(1 / this.engine.getHardwareScalingLevel()).toFixed(2)}`,
    ];
    for (const [k, fn] of this.extra) lines.push(`${k} ${fn()}`);
    this.text.textContent = lines.join('\n');
    this.drawGraph();
  }

  private drawGraph(): void {
    const g = this.graph.getContext('2d');
    if (!g) return;
    const { width: w, height: h } = this.graph;
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.fillRect(0, h - (16.7 / 50) * h, w, 1);
    const ft = this.frameTimes;
    for (let i = 0; i < ft.length; i++) {
      const v = ft[i]!;
      const bh = Math.min(h, (v / 50) * h);
      g.fillStyle = v > 20 ? '#ff5050' : v > 17.5 ? '#ffc040' : '#50e080';
      g.fillRect(i, h - bh, 1, bh);
    }
  }
}
