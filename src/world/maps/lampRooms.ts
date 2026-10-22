import type { LevelBuilder } from '../levelBuilder';
import { makeCone, type FittingModel, type LightCone } from '../lights';

/**
 * Sector Ops lamp layout by room (sector-fixes L; pure data helpers, no Babylon). Michael (2026-10-22): "light fittings
 * in same rooms are different heights and locations. Theres random lights on the roof. Theres a light in the middle of
 * a climbing pipe." / "All lights should look like LED designs." Every room's fittings share one model, one height
 * (the ceiling or roof underside minus that model's fixed drop, or one wall height) and a regular layout (a grid or a
 * row on the room's bays); none stands on a roof or on traversal geometry (`tests/warehouseLamps.test.ts`). A lamp
 * with intensity 0 is a dead fitting: drawn (dark), never lit (the stealth darkness of a pocket in a regular grid).
 * Every lamp is a real registry light: the bake, the meter and the guards read it (light parity).
 */

/** Fixed drops (m) from the structure to the emitting face: a panel flush under its ceiling, a strip on short hangers under a roof. */
export const PANEL_DROP = 0.05;
export const STRIP_DROP = 0.22;

/** LED colours (rendering only): neutral white in rooms, cool white in the halls, the exit-sign green. */
export const NEUTRAL: readonly [number, number, number] = [1, 0.95, 0.88];
export const COOL: readonly [number, number, number] = [0.9, 0.95, 1];
export const EXIT_GREEN: readonly [number, number, number] = [0.5, 1, 0.6];

/** One room's fittings: one model at one height, one circuit, one optic. */
export interface LampRoom {
  /** Room tag (the HUD room or a part of one: 'bay', 'workshop', 'facade'). */
  id: string;
  model: FittingModel;
  /** The emitting face's height (m): ceiling / roof underside minus the drop, or the wall height. */
  y: number;
  group: number;
  /** A strip's long axis (0 = along x) or, for a bulkhead, its facing (yaw of local +z, away from the wall). */
  yaw: number;
  /** A beam (LED high-bay optics or a flood): the spot cone; none = the lamp hemisphere. */
  cone?: LightCone;
  colour?: readonly [number, number, number];
  /** Part of the section's lamp pass (the light tests switch these off to compare). */
  pass: boolean;
  /** [x, z, radius, intensity, beam?]: intensity 0 = a dead fitting; `beam` (the half angle, rad) gives a downward
   *  fitting its own beam optic in place of the room's (-1: none, the lamp hemisphere). */
  lamps: readonly (readonly [x: number, z: number, radius: number, intensity: number, beam?: number])[];
}

/** Each model's light box (what the bake samples, glare and shots read): sx, sy, sz, oy over the face. */
const BOX: Record<FittingModel, { sx: number; sy: number; sz: number; oy: number }> = {
  panel: { sx: 0.6, sy: 0.04, sz: 0.6, oy: 0.02 },
  strip: { sx: 1.2, sy: 0.05, sz: 0.09, oy: 0.03 },
  bulkhead: { sx: 0.3, sy: 0.16, sz: 0.07, oy: 0 },
};

/** Add every room's lamps to the builder (in table order). Strip boxes turn with the strip. */
export function addLampRooms(b: LevelBuilder, rooms: readonly LampRoom[]): void {
  for (const r of rooms) {
    const box = BOX[r.model];
    const across = r.model === 'strip' && Math.abs(Math.sin(r.yaw)) > 0.5;
    const fx = across ? box.sz : box.sx;
    const fz = across ? box.sx : box.sz;
    const base = r.model === 'bulkhead' ? 'wall' : 'ceiling';
    for (const [x, z, radius, intensity, beam] of r.lamps) {
      const dead = intensity <= 0;
      const cone = beam ? (beam > 0 ? makeCone(0, -1, 0, beam) : null) : r.cone ?? null;
      b.light({
        kind: cone ? 'spot' : 'lamp',
        x,
        y: r.y,
        z,
        radius: dead ? 0 : radius,
        intensity: dead ? 0 : intensity,
        color: [...(r.colour ?? (r.model === 'strip' ? COOL : NEUTRAL))] as [number, number, number],
        cone,
        group: dead ? -1 : r.group,
        on: !dead,
        destructible: !dead,
        electric: !dead,
        fixture: { sx: fx, sy: box.sy, sz: fz, oy: box.oy, model: r.model, base, yaw: r.yaw, mount: 0 },
      });
    }
  }
}

/** The lit lamps of the pass rooms as [x, y, z, radius, intensity, group] (the light tests' tables). */
export function passLamps(rooms: readonly LampRoom[]): (readonly [number, number, number, number, number, number])[] {
  const out: (readonly [number, number, number, number, number, number])[] = [];
  for (const r of rooms) if (r.pass) for (const [x, z, radius, intensity] of r.lamps) if (intensity > 0) out.push([x, r.y, z, radius, intensity, r.group]);
  return out;
}
