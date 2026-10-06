import { Color4, CreateLineSystem, SceneInstrumentation, Vector3, type Engine, type LinesMesh, type Scene } from '../core/babylon';
import { MOVEMENT, MOVEMENT_RANGES } from '../config/movement';
import { CAMERA } from '../config/camera';
import { CARRY } from '../weapons/weaponCarry';
import { DEBUG_RIGS, DEBUG_VOLUMES } from './debugVolumes';
import type { GameLoop } from '../core/loop';
import type { PacingSnapshot } from '../core/pacing';

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
  /** Frame pacing against the display budget (refresh detection, percentiles); set by the app. */
  pacing: (() => PacingSnapshot) | null = null;
  private budgetMs = 1000 / 60;
  /** Movement controller capsules to draw in the skeleton view (set by the play session). */
  controllerCapsules: (() => { feet: Vector3; height: number; radius: number }[]) | null = null;
  private skeleton = false;
  private lines: LinesMesh | null = null;
  private tools: HTMLDivElement;
  private tune: HTMLDivElement;
  /** Live traces (e.g. weapon bob): sampled every frame, drawn as a line graph. */
  private traces = new Map<string, { fn: () => number; scale: number; buf: number[]; color: string }>();
  private traceCanvas: HTMLCanvasElement;

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
    this.traceCanvas = document.createElement('canvas');
    this.traceCanvas.width = 120;
    this.traceCanvas.height = 32;
    this.traceCanvas.className = 'debug-trace';
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
      // slow motion for reviewing blends: 1x -> 0.5x -> 0.25x -> 1x
      btn('1x', (b) => {
        const next = this.loop.timeScale === 1 ? 0.5 : this.loop.timeScale === 0.5 ? 0.25 : 1;
        this.loop.timeScale = next;
        b.textContent = `${next}x`;
        b.classList.toggle('on', next !== 1);
      }),
    );
    this.buildTune();
    this.el.append(this.text, this.graph, this.traceCanvas, this.tools, this.tune);
    document.body.appendChild(this.el);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') this.toggle();
    });
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 3) this.toggle();
    });
    engine.onEndFrameObservable.add(() => this.onFrame());
  }

  /** Add a live trace (value per frame; `scale` = value at the top of the graph). */
  addTrace(key: string, fn: () => number, scale: number, color = '#8fd3ff'): void {
    this.traces.set(key, { fn, scale, buf: [], color });
  }

  removeTrace(key: string): void {
    this.traces.delete(key);
  }

  /** Live tuning: sliders bound to the movement, camera and weapon-carry tables (apply immediately). */
  private buildTune(): void {
    const table = (title: string, obj: Record<string, number>, ranges: Record<string, readonly [number, number, number]>): void => {
      const h = document.createElement('b');
      h.className = 'debug-tune-title';
      h.textContent = title;
      this.tune.append(h);
      for (const [k, range] of Object.entries(ranges)) {
        const row = document.createElement('label');
        const name = document.createElement('span');
        name.textContent = k;
        const val = document.createElement('b');
        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(range[0]);
        input.max = String(range[1]);
        input.step = String(range[2]);
        input.value = String(obj[k]);
        val.textContent = String(obj[k]);
        input.addEventListener('input', () => {
          obj[k] = Number(input.value);
          val.textContent = input.value;
        });
        row.append(name, input, val);
        this.tune.append(row);
      }
    };
    table('Movement', MOVEMENT as unknown as Record<string, number>, MOVEMENT_RANGES);
    table('Camera', CAMERA as unknown as Record<string, number>, {
      boomHip: [0.6, 3.5, 0.05],
      boomAds: [0.4, 1.5, 0.05],
      shoulderHip: [0.2, 0.9, 0.02],
      shoulderAds: [0.2, 0.8, 0.02],
      pivotStand: [1.2, 1.9, 0.02],
      height: [-0.4, 0.4, 0.02],
      leanShift: [0, 0.8, 0.02],
      dashBoom: [0, 0.8, 0.05],
    });
    table('Weapon carry', CARRY as unknown as Record<string, number>, {
      raiseTime: [0.05, 0.4, 0.01],
      lowerTime: [0.1, 0.8, 0.01],
      holdAfterFire: [0, 2, 0.05],
      readyFade: [0.05, 0.6, 0.01],
    });
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
    const plantC = new Color4(0.2, 1, 0.3, 1);
    const swingC = new Color4(1, 0.6, 0.1, 1);
    for (const rig of DEBUG_RIGS) {
      if (!rig.root.isEnabled()) continue;
      for (const [a, b] of rig.bones()) {
        a.computeWorldMatrix(true);
        b.computeWorldMatrix(true);
        push([a.getAbsolutePosition().clone(), b.getAbsolutePosition().clone()], boneC);
      }
      // foot contacts: green cross = planted (locked), orange = swinging, with a line to the landing spot
      for (const f of [rig.planner.L, rig.planner.R]) {
        const c = f.contact ? plantC : swingC;
        const y = f.y + 0.01;
        push([new Vector3(f.x - 0.07, y, f.z), new Vector3(f.x + 0.07, y, f.z)], c);
        push([new Vector3(f.x, y, f.z - 0.07), new Vector3(f.x, y, f.z + 0.07)], c);
        if (!f.contact) push([new Vector3(f.x, y, f.z), new Vector3(f.toX, f.toY + 0.01, f.toZ)], c);
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
    for (const t of this.traces.values()) {
      t.buf.push(t.fn());
      if (t.buf.length > 120) t.buf.shift();
    }
    this.frameTimes.push(ft);
    if (this.frameTimes.length > 120) this.frameTimes.shift();
    if (now < this.nextPaint) return;
    this.nextPaint = now + 250;
    const n = this.frameTimes.length;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / n;
    const worst = Math.max(...this.frameTimes);
    const s = this.scene;
    const pc = this.pacing?.();
    const lines = [
      `FPS ${(1000 / avg).toFixed(0)}  avg ${avg.toFixed(1)}ms  max ${worst.toFixed(1)}ms`,
      pc
        ? `display ${pc.hz || '?'}Hz budget ${pc.budgetMs.toFixed(2)}ms${pc.hz === 60 && /iPhone|iPad/.test(navigator.userAgent) ? ' (Safari may cap rAF at 60)' : ''}\n` +
          `pacing p50 ${pc.p50.toFixed(1)} p95 ${pc.p95.toFixed(1)} p99 ${pc.p99.toFixed(1)}ms  drops ${(pc.dropShare * 100).toFixed(1)}%\n` +
          `cpu/frame p50 ${pc.cpuP50.toFixed(2)} p95 ${pc.cpuP95.toFixed(2)}ms`
        : '',
      `sim ${this.loop.stats.simMs.toFixed(2)}ms  phys ${this.loop.stats.physicsMs.toFixed(2)}ms  steps ${this.loop.stats.steps}`,
      `draws ${this.instr?.drawCallsCounter.current ?? '-'}  active ${s?.getActiveMeshes().length ?? 0}/${s?.meshes.length ?? 0}`,
      `res ${this.engine.getRenderWidth()}x${this.engine.getRenderHeight()}  scale ${(1 / this.engine.getHardwareScalingLevel()).toFixed(2)}`,
    ];
    if (pc?.budgetMs) this.budgetMs = pc.budgetMs;
    for (const [k, fn] of this.extra) lines.push(`${k} ${fn()}`);
    this.text.textContent = lines.join('\n');
    this.drawGraph();
    this.drawTraces();
  }

  private drawTraces(): void {
    const c = this.traceCanvas;
    c.hidden = this.traces.size === 0;
    const g = c.getContext('2d');
    if (!g || c.hidden) return;
    const { width: w, height: h } = c;
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.fillRect(0, h / 2, w, 1);
    for (const t of this.traces.values()) {
      g.strokeStyle = t.color;
      g.beginPath();
      t.buf.forEach((v, i) => {
        const y = h / 2 - (v / t.scale) * (h / 2);
        if (i === 0) g.moveTo(i, y);
        else g.lineTo(i, y);
      });
      g.stroke();
    }
  }

  private drawGraph(): void {
    const g = this.graph.getContext('2d');
    if (!g) return;
    const { width: w, height: h } = this.graph;
    g.clearRect(0, 0, w, h);
    // pacing graph: bars per frame against the display budget line (scale = 3 budgets)
    const b = this.budgetMs;
    const top = b * 3;
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(0, h - (b / top) * h, w, 1);
    const ft = this.frameTimes;
    for (let i = 0; i < ft.length; i++) {
      const v = ft[i]!;
      const bh = Math.min(h, (v / top) * h);
      g.fillStyle = v > b * 1.5 ? '#ff5050' : v > b * 1.1 ? '#ffc040' : '#50e080';
      g.fillRect(i, h - bh, 1, bh);
    }
  }
}
