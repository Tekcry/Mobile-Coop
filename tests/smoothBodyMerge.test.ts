// (guard-render S1) The pure merge of a rig's smooth parts into one rigidly skinned mesh: joint-space positions and
// normals as Babylon would transform the instances, the instance values per vertex, per-part ranges, the flash /
// heat / part-paint helpers and the rest box.
import { describe, expect, it } from 'vitest';
import { flashColors, heatPattern, mergeParts, paintPart, restBox, type MergePart } from '../src/player/smoothBodyMerge';

// a unit quad (4 vertices, 2 triangles) and a unit triangle
const QUAD = { pos: [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5], nrm: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], idx: [0, 1, 2, 0, 2, 3] };
const TRI = { pos: [0, 0, 0, 1, 0, 0, 0, 1, 0], nrm: [0.6, 0, 0.8, 0.6, 0, 0.8, 0.6, 0, 0.8], idx: [0, 1, 2] };

describe('smoothBodyMerge', () => {
  it('positions and normals match Babylon on the instance transform; instance values, bones and ranges per vertex', async () => {
    const { Matrix, Quaternion, Vector3 } = await import('../src/core/babylon');
    const m = Matrix.Compose(new Vector3(0.2, 0.5, 0.1), Quaternion.RotationYawPitchRoll(0.4, -0.3, 0.9), new Vector3(0.05, -0.2, 0.03));
    const parts: MergePart[] = [
      { ...QUAD, m: Matrix.Identity().m, bone: 0, color: [1, 0, 0, 1], pattern: [0, 1, 4, 0], color2: [0, 0, 0, 1], patScale: [1, 1, 1] },
      { ...TRI, m: m.m, bone: 3, color: [0.2, 0.3, 0.4, 1], pattern: [2, 0.25, 7, 0], color2: [0.5, 0.6, 0.7, 1], patScale: [0.2, 0.5, 0.1] },
      { pos: [], nrm: [], idx: [], m: m.m, bone: 1, color: [1, 1, 1, 1], pattern: [0, 1, 0, 0], color2: [0, 0, 0, 1], patScale: [1, 1, 1] },
    ];
    const r = mergeParts(parts);
    expect(r.positions.length).toBe(7 * 3);
    expect(Array.from(r.ranges)).toEqual([0, 4, 4, 3, 7, 0]);
    expect(Array.from(r.indices)).toEqual([0, 1, 2, 0, 2, 3, 4, 5, 6]);
    for (let k = 0; k < 3; k++) {
      const v = 4 + k;
      const p = Vector3.TransformCoordinates(new Vector3(TRI.pos[k * 3]!, TRI.pos[k * 3 + 1]!, TRI.pos[k * 3 + 2]!), m);
      expect(r.positions[v * 3]).toBeCloseTo(p.x, 6);
      expect(r.positions[v * 3 + 1]).toBeCloseTo(p.y, 6);
      expect(r.positions[v * 3 + 2]).toBeCloseTo(p.z, 6);
      const n = Vector3.TransformNormal(new Vector3(0.6, 0, 0.8), m).normalize();
      expect(r.normals[v * 3]).toBeCloseTo(n.x, 6);
      expect(r.normals[v * 3 + 1]).toBeCloseTo(n.y, 6);
      expect(r.normals[v * 3 + 2]).toBeCloseTo(n.z, 6);
      // the plugins' space: the unit position times the instance's world scale, the raw unit normal
      expect(r.ppos[v * 3]).toBeCloseTo(TRI.pos[k * 3]! * 0.2, 6);
      expect(r.ppos[v * 3 + 1]).toBeCloseTo(TRI.pos[k * 3 + 1]! * 0.5, 6);
      expect(Array.from(r.pnrm.slice(v * 3, v * 3 + 3))).toEqual([0.6, 0, 0.8].map((x) => Math.fround(x)));
      expect(Array.from(r.colors.slice(v * 4, v * 4 + 4))).toEqual([0.2, 0.3, 0.4, 1].map((x) => Math.fround(x)));
      expect(Array.from(r.pattern.slice(v * 4, v * 4 + 4))).toEqual([2, 0.25, 7, 0]);
      expect(Array.from(r.color2.slice(v * 4, v * 4 + 4))).toEqual([0.5, 0.6, 0.7, 1].map((x) => Math.fround(x)));
      expect(Array.from(r.matricesIndices.slice(v * 4, v * 4 + 4))).toEqual([3, 0, 0, 0]);
      expect(Array.from(r.matricesWeights.slice(v * 4, v * 4 + 4))).toEqual([1, 0, 0, 0]);
    }
    expect(Array.from(r.matricesIndices.slice(0, 4))).toEqual([0, 0, 0, 0]);
    expect(r.colors[0]).toBe(1);
  });

  it('flash, heat and part paint write in place', () => {
    const r = mergeParts([
      { ...QUAD, m: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], bone: 0, color: [0, 0, 0, 1], pattern: [0, 1, 0, 0], color2: [0, 0, 0, 1], patScale: [1, 1, 1] },
      { ...TRI, m: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], bone: 1, color: [0.5, 0.5, 0.5, 1], pattern: [0, 1, 0, 0], color2: [0, 0, 0, 1], patScale: [1, 1, 1] },
    ]);
    const out = new Float32Array(r.colors.length);
    flashColors(r.colors, 0, out);
    expect(Array.from(out)).toEqual(Array.from(r.colors));
    flashColors(r.colors, 1, out);
    expect(Array.from(out.slice(0, 4))).toEqual([1, 0.92, 0.85, 1].map((x) => Math.fround(x)));
    heatPattern(r.pattern, 0.7);
    for (let v = 0; v < 7; v++) expect(r.pattern[v * 4 + 3]).toBeCloseTo(0.7, 6);
    expect(paintPart(r.colors, r.ranges, 1, 0.1, 0.9, 0.2)).toBe(true);
    for (let v = 4; v < 7; v++) expect(r.colors[v * 4 + 1]).toBeCloseTo(0.9, 6);
    // the quad is untouched; an unknown part paints nothing
    expect(r.colors[1]).toBe(0);
    expect(paintPart(r.colors, r.ranges, 5, 1, 1, 1)).toBe(false);
  });

  it('the rest box puts each vertex through its bone and adds the margins', () => {
    const r = mergeParts([
      { ...QUAD, m: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], bone: 1, color: [1, 1, 1, 1], pattern: [0, 1, 0, 0], color2: [0, 0, 0, 1], patScale: [1, 1, 1] },
    ]);
    const bones = new Float32Array(32);
    bones.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], 0);
    // bone 1: up 1.5 m
    bones.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1.5, 0, 1], 16);
    const b = restBox(r.positions, r.matricesIndices, bones, [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
    expect(Array.from(b).map((x) => +x.toFixed(4))).toEqual([-0.6, 1.3, -0.8, 0.9, 2, 1.1]);
  });
});
