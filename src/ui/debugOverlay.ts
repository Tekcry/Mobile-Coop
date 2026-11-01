import { Color4, CreateLineSystem, SceneInstrumentation, Vector3, type Engine, type LinesMesh, type Scene, type TransformNode } from '../core/babylon';
import { CT, CT_RANGES, MOVEMENT, MOVEMENT_RANGES } from '../config/movement';
import { CAMERA } from '../config/camera';
import { CARRY } from '../weapons/weaponCarry';
import { DEBUG_RIGS, DEBUG_VOLUMES } from './debugVolumes';
import { CRAB_JOINTS, crabFrame, type CrabNow } from '../anim/audit/metrics';
import { crabRanges } from '../anim/audit/limits';
import type { GameLoop } from '../core/loop';
import type { PacingSnapshot } from '../core/pacing';
import { AnimTunePanel, type TuneRigView } from './animTunePanel';
import { TUNE_WHO } from '../anim/tuneGuard';

/** (anim-metrics-2) What the live crab readout reads from the player (set by the app; typed loosely, no player import). */
export interface CrabPlayer {
  rig: { [K in (typeof CRAB_JOINTS)[number]]: TransformNode } & { planner: { L: { contact: boolean }; R: { contact: boolean } } };
  controller: { speed: number; crouched: boolean };
  ads: boolean;
}

/**
 * FPS / frame-time overlay. Toggle with F3 or the settings switch.
 * Instrumentation is only active while visible.
 */
export class DebugOverlay {
  private el: HTMLDivElement;
  private visible = false;
  /** The Settings "Show FPS overlay" banner: one line in the bottom left corner (wheel-ui; was the top edge), the
   *  critical numbers only (F3 and `?debug=1` show the full overlay). */
  private compact = false;
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
  private warp: HTMLDivElement;
  /** Live traces (e.g. weapon bob): sampled every frame, drawn as a line graph. */
  private traces = new Map<string, { fn: () => number; scale: number; buf: number[]; color: string }>();
  private traceCanvas: HTMLCanvasElement;
  /** (anim-metrics-2) The player the anti-crab readout measures (anim-rework BRIEF 5; `CRAB` in audit/limits.ts). */
  crabPlayer: (() => CrabPlayer | null) | null = null;
  private crabEl: HTMLDivElement;
  private crabRows: HTMLSpanElement[] = [];
  private readonly crabBuf = new Float64Array(30);
  /** (anim-tuner) The animation tuner (the Anim button): its own panel top right, clear of the crab readout. */
  readonly animTune = new AnimTunePanel();
  private readonly animBtn: HTMLButtonElement;
  private readonly crabNow: CrabNow = { kneeSep: 0, trackL: 0, trackR: 0, bowL: 0, bowR: 0, wingL: 0, wingR: 0, hipWidth: 0 };
  /** The worst of each since the last paint (track: planted frames only, kept until a foot plants again). */
  private crab = { n: 0, kneeMin: 0, kneeMax: 0, trackL: 0, trackR: 0, planted: 0, bowL: 0, bowR: 0, wingL: 0, wingR: 0, speed: 0, crouched: false, ads: false };

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
    this.warp = document.createElement('div');
    this.warp.className = 'debug-warp';
    this.warp.hidden = true;
    this.traceCanvas = document.createElement('canvas');
    this.traceCanvas.width = 120;
    this.traceCanvas.height = 32;
    this.traceCanvas.className = 'debug-trace';
    this.crabEl = document.createElement('div');
    this.crabEl.className = 'debug-crab';
    this.crabEl.hidden = true;
    for (let i = 0; i < 5; i++) {
      const row = document.createElement('span');
      row.style.display = 'block';
      this.crabRows.push(row);
      this.crabEl.append(row);
    }
    const btn = (label: string, fn: (b: HTMLButtonElement) => void): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', () => fn(b));
      return b;
    };
    // (G1) the Anim button is listed in the Test Chamber only (`animTune.canOpen`, read each frame while the overlay shows)
    this.animBtn = btn('Anim', (b) => {
      b.classList.toggle('on', this.animTune.toggle());
    });
    this.animBtn.hidden = true;
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
      this.animBtn,
      // slow motion for reviewing blends: 1x -> 0.5x -> 0.25x -> 1x
      btn('1x', (b) => {
        const next = this.loop.timeScale === 1 ? 0.5 : this.loop.timeScale === 0.5 ? 0.25 : 1;
        this.loop.timeScale = next;
        b.textContent = `${next}x`;
        b.classList.toggle('on', next !== 1);
      }),
    );
    this.buildTune();
    this.el.append(this.text, this.crabEl, this.graph, this.traceCanvas, this.tools, this.tune, this.warp);
    document.body.appendChild(this.el);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') this.toggle();
    });
    // (marlow-bays item 24, track A) the Test Chamber's guard puppet while it plays (the highlight and the picks on it)
    this.animTune.rig = () => (TUNE_WHO.rig as TuneRigView | null) ?? (this.crabPlayer?.() as unknown as { rig?: TuneRigView } | null)?.rig ?? null;
    // (tuner-camera) the tuner's slow-motion picker sets the loop's time scale
    this.animTune.loop = this.loop;
    // (anim-tuner pass 2) opened from the pause menu or Settings too: the Anim button shows its state
    this.animTune.onOpenChange = (on) => Array.from(this.tools.querySelectorAll('button')).find((b) => b.textContent === 'Anim')?.classList.toggle('on', on);
    // (marlow-bays item 26) the tuner's Settings toggle for this readout (off by default on a phone)
    this.animTune.debugHost = { visible: () => this.visible, set: (on) => this.toggle(on) };
    engine.onEndFrameObservable.add(() => this.onFrame());
  }

  private toggles = new Map<string, HTMLButtonElement>();

  /** A dev tool toggle (e.g. the course solo flag); `fn` null removes it. */
  setToggle(id: string, label: string, on: boolean, fn: ((on: boolean) => void) | null): void {
    this.toggles.get(id)?.remove();
    this.toggles.delete(id);
    if (!fn) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.classList.toggle('on', on);
    b.addEventListener('click', () => {
      const next = !b.classList.contains('on');
      b.classList.toggle('on', next);
      fn(next);
    });
    this.tools.append(b);
    this.toggles.set(id, b);
  }

  /**
   * Teleport menu (greybox maps): a "Teleport" tool button opens grouped buttons (chapter starts, spawns, objectives).
   * Pass `null` to remove it (leaving a match).
   */
  setTeleports(points: { group: string; label: string; go: () => void }[] | null): void {
    this.warp.replaceChildren();
    this.warp.hidden = true;
    this.tools.querySelector('.debug-warp-btn')?.remove();
    if (!points || !points.length) return;
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'debug-warp-btn';
    open.textContent = 'Teleport';
    open.addEventListener('click', () => {
      this.warp.hidden = !this.warp.hidden;
      open.classList.toggle('on', !this.warp.hidden);
    });
    this.tools.append(open);
    const groups = new Map<string, typeof points>();
    for (const p of points) groups.set(p.group, [...(groups.get(p.group) ?? []), p]);
    for (const [name, list] of groups) {
      const h = document.createElement('b');
      h.className = 'debug-tune-title';
      h.textContent = name;
      const row = document.createElement('div');
      row.className = 'debug-tools';
      row.style.flexWrap = 'wrap';
      for (const p of list) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = p.label;
        b.dataset.tp = p.label;
        b.addEventListener('click', p.go);
        row.append(b);
      }
      this.warp.append(h, row);
    }
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
    table('Chaos Theory', CT as unknown as Record<string, number>, CT_RANGES);
    table('Camera', CAMERA as unknown as Record<string, number>, {
      boomHip: [0.6, 3.5, 0.05],
      boomOpen: [1.5, 4.5, 0.05],
      boomAds: [0.2, 1.5, 0.05],
      shoulderHip: [0, 0.9, 0.01],
      shoulderAds: [0, 0.8, 0.01],
      pivotStand: [1.2, 1.9, 0.02],
      height: [-0.4, 0.4, 0.02],
      leanShift: [0, 0.8, 0.02],
      aimEyeDrop: [0, 0.3, 0.01],
      adsInTime: [0.2, 1.2, 0.05],
      swapRate: [5, 30, 0.5],
      swapArc: [0, 1, 0.05],
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
    this.animTune.setScene(scene);
    if (this.visible && scene) this.instr = new SceneInstrumentation(scene);
  }

  toggle(force?: boolean, compact = false): void {
    this.visible = force ?? !this.visible;
    this.compact = compact;
    this.el.classList.toggle('compact', compact);
    this.el.hidden = !this.visible;
    this.setScene(this.scene);
    this.animTune.debugShown(this.visible);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  private onFrame(): void {
    const now = performance.now();
    const ft = now - this.last;
    this.last = now;
    // (anim-tuner pass 2) the tuner panel runs with or without the overlay (opened from the pause menu)
    this.animTune.frame(now);
    if (!this.visible) return;
    this.animBtn.hidden = !this.animTune.canOpen;
    if (this.skeleton && !this.compact) this.drawSkeleton();
    if (!this.compact) this.sampleCrab();
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
    if (this.compact) {
      // (Michael 2026-10-20: "a banner on the top of the screen with only critical information")
      const drops = pc ? `  |  drops ${(pc.dropShare * 100).toFixed(1)}%` : '';
      this.text.textContent =
        `FPS ${(1000 / avg).toFixed(0)}  |  ${avg.toFixed(1)} ms  |  max ${worst.toFixed(1)} ms${drops}  |  ` +
        `${this.engine.getRenderWidth()}x${this.engine.getRenderHeight()}`;
      return;
    }
    const lines = [
      `FPS ${(1000 / avg).toFixed(0)}  avg ${avg.toFixed(1)}ms  max ${worst.toFixed(1)}ms`,
      pc
        ? `display ${pc.hz || '?'}Hz budget ${pc.budgetMs.toFixed(2)}ms\n` +
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
    this.paintCrab();
    this.drawGraph();
    this.drawTraces();
  }

  /** (anim-metrics-2) Every frame while visible: the player's crab metrics, the worst kept until the next paint. No allocation. */
  private sampleCrab(): void {
    const p = this.crabPlayer?.();
    if (!p) return;
    const buf = this.crabBuf;
    for (let i = 0; i < CRAB_JOINTS.length; i++) {
      const n = p.rig[CRAB_JOINTS[i]!];
      n.computeWorldMatrix(true);
      const v = n.getAbsolutePosition();
      buf[i * 3] = v.x;
      buf[i * 3 + 1] = v.y;
      buf[i * 3 + 2] = v.z;
    }
    const m = crabFrame(buf, this.crabNow);
    if (!m.hipWidth) return;
    const c = this.crab;
    if (c.n === 0) {
      c.kneeMin = c.kneeMax = m.kneeSep;
      c.bowL = m.bowL;
      c.bowR = m.bowR;
      c.wingL = m.wingL;
      c.wingR = m.wingR;
      c.speed = 0;
    }
    c.n++;
    c.kneeMin = Math.min(c.kneeMin, m.kneeSep);
    c.kneeMax = Math.max(c.kneeMax, m.kneeSep);
    c.bowL = Math.max(c.bowL, m.bowL);
    c.bowR = Math.max(c.bowR, m.bowR);
    c.wingL = Math.max(c.wingL, m.wingL);
    c.wingR = Math.max(c.wingR, m.wingR);
    c.speed = Math.max(c.speed, p.controller.speed);
    c.crouched = p.controller.crouched;
    c.ads = p.ads;
    // the track counts planted feet: the first planted sample after a paint replaces the kept value
    const pl = p.rig.planner;
    if (pl.L.contact) {
      c.trackL = c.planted & 1 ? Math.max(c.trackL, Math.abs(m.trackL)) : Math.abs(m.trackL);
      c.planted |= 1;
    }
    if (pl.R.contact) {
      c.trackR = c.planted & 2 ? Math.max(c.trackR, Math.abs(m.trackR)) : Math.abs(m.trackR);
      c.planted |= 2;
    }
  }

  /** (anim-metrics-2) The readout, 4 times a second: green inside the CRAB ranges, red outside. */
  private paintCrab(): void {
    const c = this.crab;
    const show = !!this.crabPlayer?.() && c.n > 0;
    this.crabEl.hidden = !show;
    if (!show) return;
    const r = crabRanges(c.crouched);
    const cm = (v: number): string => (v * 100).toFixed(1);
    const gait = c.speed < 0.15 ? 'idle' : c.crouched ? (c.speed < 1.2 ? 'sneak' : 'crouch') : c.speed < 2.2 ? 'walk' : c.speed < 3.7 ? 'jog' : 'run';
    const row = (i: number, text: string, ok: boolean | null): void => {
      const el = this.crabRows[i]!;
      el.textContent = text;
      el.style.color = ok === null ? '' : ok ? '#50e080' : '#ff5050';
    };
    row(0, `crab  ${gait}  ${c.crouched ? 'crouched' : 'standing'}, ${c.ads ? 'weapon out' : 'holstered'}  ${c.speed.toFixed(2)} m/s`, null);
    row(1, `knees ${c.kneeMin.toFixed(2)}-${c.kneeMax.toFixed(2)} x hips (${r.kneeSep.min}-${r.kneeSep.max})`, c.kneeMin >= r.kneeSep.min && c.kneeMax <= r.kneeSep.max);
    row(2, `track L ${cm(c.trackL)} R ${cm(c.trackR)} cm from the line (<= ${cm(r.trackHalf)})`, Math.max(c.trackL, c.trackR) <= r.trackHalf);
    row(3, `knee outside ankle L ${cm(c.bowL)} R ${cm(c.bowR)} cm (<= ${cm(r.kneeBow)})`, Math.max(c.bowL, c.bowR) <= r.kneeBow);
    row(4, `elbow outside shoulder L ${cm(c.wingL)} R ${cm(c.wingR)} cm (<= ${cm(r.elbowWing)})`, Math.max(c.wingL, c.wingR) <= r.elbowWing);
    // the next window (the track keeps its last planted value until a foot plants again)
    c.n = 0;
    c.planted = 0;
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
