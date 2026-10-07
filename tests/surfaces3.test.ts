import { describe, expect, it } from 'vitest';
import { floorKind, hsv, pieceKind } from '../src/world/surfaceKinds';
import { SURFACE_KINDS, SURFACE_PARAMS } from '../src/world/surfaceAtlas';

describe('procedural surfaces (3.0)', () => {
  it('sixteen surfaces with parameters (one 4 x 4 atlas)', () => {
    expect(SURFACE_KINDS.length).toBe(16);
    for (const k of SURFACE_KINDS) expect(SURFACE_PARAMS[k].tile).toBeGreaterThan(0);
  });
  it('hsv', () => {
    expect(hsv('#ff0000')).toEqual([0, 1, 1]);
    const [h, s, v] = hsv('#59636b');
    expect(h).toBeGreaterThan(200);
    expect(s).toBeGreaterThan(0.1);
    expect(v).toBeCloseTo(0.42, 2);
  });
  it('floors follow what is underfoot', () => {
    expect(pieceKind('#9aa3a8', 20, 0.2, 20, 'concrete')).toBe('concreteFloor');
    expect(pieceKind('#9aa3a8', 6, 0.1, 6, 'grate')).toBe('checker');
    expect(floorKind('gravel', '#6f8f5a')).toBe('grass');
    expect(floorKind('gravel', '#3a3d40')).toBe('asphalt');
    expect(floorKind('gravel', '#8a7a5e')).toBe('gravel');
    expect(pieceKind('#7a5a3a', 4, 0.1, 4, 'carpet')).toBe('carpet');
  });
  it('walls and props by colour', () => {
    expect(pieceKind('#b9824a', 1.2, 1.2, 1.2, null)).toBe('wood'); // crate
    expect(pieceKind('#c0392b', 0.6, 0.9, 0.6, null)).toBe('corrugated'); // barrel / container paint
    expect(pieceKind('#59636b', 2, 2, 0.4, null)).toBe('brushed'); // machinery
    expect(pieceKind('#c9b79c', 8, 3, 0.3, null)).toBe('plaster'); // wall
    expect(pieceKind('#6c757b', 8, 3, 0.3, null)).toBe('concrete');
    expect(pieceKind('#8a3b22', 0.8, 1.2, 0.8, null)).toBe('rust');
    expect(pieceKind('#a5482e', 6, 3, 0.4, null)).toBe('brick');
    expect(pieceKind('#3d6b35', 3, 1.8, 0.8, null)).toBe('grass'); // hedge
    expect(pieceKind('#1a1c1e', 1, 1, 1, null)).toBe('rubber');
  });
});
