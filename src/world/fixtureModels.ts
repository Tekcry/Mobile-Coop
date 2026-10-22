import type { FittingModel } from './lights';

/**
 * The LED light fittings (sector-fixes L; pure: no Babylon / DOM), built from boxes in the fitting's frame: the light
 * at the origin on the emitting face, y up, a bulkhead facing +z with its back on the wall side. Each model is two
 * meshes: the body (one shared pale aluminium material, `LightRig`) and the flat diffuser that glows (the bulbs'
 * emissive material, dark when the light is out). Michael (2026-10-22): "All lights should look like LED designs."
 * Thin, flat-diffuser fittings; sizes match `FITTING` in `lampMount.ts` (the mounts) and the light boxes of
 * `maps/lampRooms.ts` (the bake, glare and shots).
 * - panel: a 600 mm square LED panel, surface-mounted flush under a room ceiling: a slim frame, a recessed opal diffuser.
 * - strip: a linear LED high-bay / batten for the halls, hung on two wires: an extrusion, end caps, a diffuser strip.
 * - bulkhead: a slim LED wall bulkhead (rooms, facades, signs): a flat body, a flat diffuser, a light two-bar guard.
 */

export interface MeshArrays {
  positions: number[];
  normals: number[];
  indices: number[];
}

const empty = (): MeshArrays => ({ positions: [], normals: [], indices: [] });

/** One quad (a, b, c, d counter-clockwise seen from outside) with a flat normal. */
function quad(o: MeshArrays, a: readonly number[], b: readonly number[], c: readonly number[], d: readonly number[], n: readonly number[]): void {
  const i = o.positions.length / 3;
  for (const p of [a, b, c, d]) {
    o.positions.push(p[0]!, p[1]!, p[2]!);
    o.normals.push(n[0]!, n[1]!, n[2]!);
  }
  // Babylon's default winding (clockwise front faces, left-handed): a, c, b / a, d, c
  o.indices.push(i, i + 2, i + 1, i, i + 3, i + 2);
}

/** An axis-aligned box centred on (cx, cy, cz). */
export function boxInto(o: MeshArrays, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): void {
  const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
  quad(o, [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0]);
  quad(o, [x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [0, -1, 0]);
  quad(o, [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0]);
  quad(o, [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], [-1, 0, 0]);
  quad(o, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]);
  quad(o, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]);
}

/** The body and the glowing face of a model, in the fitting's frame (see the module note). */
export function fittingMesh(model: FittingModel): { body: MeshArrays; face: MeshArrays } {
  const body = empty();
  const face = empty();
  if (model === 'panel') {
    boxInto(body, 0, 0.025, 0, 0.6, 0.03, 0.6); // the back box (top 0.04: flush on the ceiling)
    for (const s of [-1, 1]) {
      boxInto(body, 0, 0.006, s * 0.29, 0.6, 0.012, 0.02); // the frame lip round the diffuser
      boxInto(body, s * 0.29, 0.006, 0, 0.02, 0.012, 0.56);
    }
    boxInto(face, 0, 0.005, 0, 0.56, 0.006, 0.56); // the opal diffuser, a few mm inside the lip
  } else if (model === 'strip') {
    boxInto(body, 0, 0.0325, 0, 1.2, 0.045, 0.08); // the extrusion (top 0.055)
    for (const s of [-1, 1]) boxInto(body, s * 0.6, 0.03, 0, 0.02, 0.05, 0.085); // end caps
    boxInto(face, 0, 0.006, 0, 1.16, 0.008, 0.06); // the diffuser strip
  } else {
    boxInto(body, 0, 0, -0.0425, 0.32, 0.16, 0.055); // the flat body (back on the wall at z -0.07)
    boxInto(face, 0, 0, -0.008, 0.27, 0.11, 0.012); // the diffuser
    for (const y of [-0.03, 0.03]) boxInto(body, 0, y, 0.008, 0.29, 0.01, 0.01); // the guard bars
    for (const x of [-0.145, 0.145]) boxInto(body, x, 0, -0.004, 0.012, 0.09, 0.024); // their posts
  }
  return { body, face };
}
