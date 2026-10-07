import type { BuiltLevel } from '../../world/levelBuilder';

export interface Blip {
  x: number;
  z: number;
  kind: 'enemy' | 'ally' | 'objective' | 'pickup' | 'danger';
}

const PX_PER_M = 3;

/** Rotating radar minimap. Level is pre-rendered once; blips drawn at ~20 Hz. */
export class Minimap {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement;
  private minX: number;
  private minZ: number;
  private next = 0;
  /** World radius shown. */
  range = 28;

  constructor(level: BuiltLevel, size = 120) {
    this.canvas = document.createElement('canvas');
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.canvas.className = 'minimap';
    this.ctx = this.canvas.getContext('2d')!;
    const b = level.bounds;
    this.minX = b.minX - 4;
    this.minZ = b.minZ - 4;
    const w = (b.maxX - b.minX + 8) * PX_PER_M;
    const hgt = (b.maxZ - b.minZ + 8) * PX_PER_M;
    this.bg = document.createElement('canvas');
    this.bg.width = Math.ceil(w);
    this.bg.height = Math.ceil(hgt);
    const g = this.bg.getContext('2d')!;
    g.fillStyle = 'rgba(30,38,48,0.85)';
    g.fillRect(0, 0, w, hgt);
    // draw boxes by height: tall = light, low = mid
    const sorted = [...level.boxes].filter((p) => p.visible !== false && !p.detail && p.s[1] > 0.3 && p.c[1] + p.s[1] / 2 > 0.4).sort((a, b2) => a.c[1] + a.s[1] / 2 - (b2.c[1] + b2.s[1] / 2));
    for (const p of sorted) {
      const top = p.c[1] + p.s[1] / 2;
      g.fillStyle = top > 2.2 ? 'rgba(200,210,220,0.85)' : top > 1 ? 'rgba(150,160,170,0.8)' : 'rgba(110,120,130,0.7)';
      g.save();
      g.translate((p.c[0] - this.minX) * PX_PER_M, (p.c[2] - this.minZ) * PX_PER_M);
      g.rotate(p.yaw);
      g.fillRect((-p.s[0] / 2) * PX_PER_M, (-p.s[2] / 2) * PX_PER_M, p.s[0] * PX_PER_M, p.s[2] * PX_PER_M * Math.cos(p.pitch));
      g.restore();
    }
    for (const c of level.cylinders) {
      g.fillStyle = 'rgba(190,200,210,0.85)';
      g.beginPath();
      g.arc((c.c[0] - this.minX) * PX_PER_M, (c.c[2] - this.minZ) * PX_PER_M, c.r * PX_PER_M, 0, Math.PI * 2);
      g.fill();
    }
  }

  draw(now: number, px: number, pz: number, yaw: number, blips: readonly Blip[]): void {
    if (now < this.next) return;
    this.next = now + 50;
    const c = this.ctx;
    const W = this.canvas.width;
    const scale = W / 2 / (this.range * PX_PER_M);
    c.clearRect(0, 0, W, W);
    c.save();
    c.beginPath();
    c.arc(W / 2, W / 2, W / 2 - 1, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = 'rgba(20,26,34,0.75)';
    c.fillRect(0, 0, W, W);
    c.translate(W / 2, W / 2);
    c.scale(scale, scale);
    // bg space is (x, z) with z drawn downward. Map the view direction to screen-up and
    // world right to screen-right: screen = [[cos, -sin], [-sin, -cos]] * bg.
    const cs = Math.cos(yaw);
    const sn = Math.sin(yaw);
    c.transform(cs, -sn, -sn, -cs, 0, 0);
    c.translate(-(px - this.minX) * PX_PER_M, -(pz - this.minZ) * PX_PER_M);
    c.drawImage(this.bg, 0, 0);
    for (const b of blips) {
      const x = (b.x - this.minX) * PX_PER_M;
      const z = (b.z - this.minZ) * PX_PER_M;
      c.fillStyle = b.kind === 'enemy' ? '#ff4d4d' : b.kind === 'ally' ? '#3fc1ff' : b.kind === 'objective' ? '#ffd23f' : b.kind === 'danger' ? '#ff9f1a' : '#4fdc7c';
      c.beginPath();
      c.arc(x, z, (b.kind === 'objective' ? 6 : 4.5) / scale, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    // player arrow (always pointing up)
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(W / 2, W / 2 - 9);
    c.lineTo(W / 2 - 6, W / 2 + 7);
    c.lineTo(W / 2, W / 2 + 3);
    c.lineTo(W / 2 + 6, W / 2 + 7);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(W / 2, W / 2, W / 2 - 1, 0, Math.PI * 2);
    c.stroke();
  }
}
