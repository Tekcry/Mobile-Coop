import { describe, expect, it } from 'vitest';

// Same matrix the minimap uses: screen = [[cos, -sin], [-sin, -cos]] * (dx, dz)
const toScreen = (dx: number, dz: number, yaw: number) => ({
  x: Math.cos(yaw) * dx - Math.sin(yaw) * dz,
  y: -Math.sin(yaw) * dx - Math.cos(yaw) * dz,
});

describe('minimap orientation', () => {
  it('view direction is screen-up and right is screen-right for any yaw', () => {
    for (const yaw of [0, 0.7, Math.PI / 2, 2.5, -1.3]) {
      const f = toScreen(Math.sin(yaw), Math.cos(yaw), yaw);
      expect(f.x).toBeCloseTo(0);
      expect(f.y).toBeCloseTo(-1);
      const r = toScreen(Math.cos(yaw), -Math.sin(yaw), yaw);
      expect(r.x).toBeCloseTo(1);
      expect(r.y).toBeCloseTo(0);
    }
  });
});
