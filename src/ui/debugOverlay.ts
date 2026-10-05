import { SceneInstrumentation, type Engine, type Scene } from '../core/babylon';
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

  constructor(private engine: Engine, private loop: GameLoop) {
    this.el = document.createElement('div');
    this.el.className = 'debug-overlay';
    this.el.hidden = true;
    this.text = document.createElement('pre');
    this.graph = document.createElement('canvas');
    this.graph.width = 120;
    this.graph.height = 32;
    this.el.append(this.text, this.graph);
    document.body.appendChild(this.el);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') this.toggle();
    });
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 3) this.toggle();
    });
    engine.onEndFrameObservable.add(() => this.onFrame());
  }

  setScene(scene: Scene | null): void {
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
