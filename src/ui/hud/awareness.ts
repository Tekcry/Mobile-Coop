/**
 * Enemy awareness arcs round the crosshair (Blacklist): one arc per enemy noticing the player, on the bearing
 * to it (top = ahead). The arc fills white as the enemy's meter rises (suspicious), and turns red at
 * detection. A small canvas redrawn only while something shows (and once to clear).
 */
const MAX = 10;
/** Arc radius and half-width (CSS px / rad), line width. */
const RADIUS = 92;
const HALF = 0.22;
const WIDTH = 5;

export class AwarenessArcs {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private bearing = new Float32Array(MAX);
  private fill = new Float32Array(MAX);
  private red = new Uint8Array(MAX);
  private n = 0;
  private drawn = 0;
  private size = 0;
  private dpr = 1;
  /** Arcs shown in the last draw (tests / debug). */
  shown = 0;
  /** Highest fill shown in the last draw. */
  maxFill = 0;
  anyRed = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'hud-awareness';
    this.ctx = this.canvas.getContext('2d');
  }

  begin(): void {
    this.n = 0;
  }

  /** `bearing`: radians relative to the view (0 ahead, + to the right); `fill` 0..1; `red` detected. */
  add(bearing: number, fill: number, red: boolean): void {
    if (this.n >= MAX) return;
    this.bearing[this.n] = bearing;
    this.fill[this.n] = fill;
    this.red[this.n] = red ? 1 : 0;
    this.n++;
  }

  end(): void {
    const c = this.ctx;
    if (!c) return;
    if (this.n === 0 && this.drawn === 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = (RADIUS + WIDTH * 2 + 4) * 2;
    if (size !== this.size || dpr !== this.dpr) {
      this.size = size;
      this.dpr = dpr;
      this.canvas.width = Math.round(size * dpr);
      this.canvas.height = Math.round(size * dpr);
      this.canvas.style.width = `${size}px`;
      this.canvas.style.height = `${size}px`;
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, size, size);
    const cx = size / 2;
    let maxFill = 0;
    let anyRed = false;
    c.lineCap = 'round';
    for (let i = 0; i < this.n; i++) {
      // canvas angle: 0 = +x (right); bearing 0 = up
      const a = this.bearing[i]! - Math.PI / 2;
      const f = this.fill[i]!;
      const red = this.red[i] === 1;
      c.lineWidth = WIDTH;
      c.strokeStyle = 'rgba(255,255,255,0.18)';
      c.beginPath();
      c.arc(cx, cx, RADIUS, a - HALF, a + HALF);
      c.stroke();
      // fills from both ends towards the middle
      const k = red ? 1 : f;
      c.strokeStyle = red ? 'rgba(255,64,48,0.95)' : 'rgba(255,255,255,0.92)';
      c.beginPath();
      c.arc(cx, cx, RADIUS, a - HALF * k, a + HALF * k);
      c.stroke();
      if (f > maxFill) maxFill = f;
      if (red) anyRed = true;
    }
    this.drawn = this.n;
    this.shown = this.n;
    this.maxFill = maxFill;
    this.anyRed = anyRed;
  }
}
