/**
 * LOD picker and close-up camera registry (step 11d, pure, no allocation per call). Render-side only: gameplay never
 * reads the result (CLAUDE.md). Bands (SPEC 6.4, D29 desktop): LOD0 under 8 m, LOD1 8-25 m, LOD2 beyond, each edge
 * with a 10 % hysteresis so a body at an edge does not swap every frame. Hero (D21) only for a registered close-up
 * camera (main menu, photo mode, any later close shot); gameplay cameras use LOD0-2.
 */
import { LOD_0, LOD_2, LOD_HERO } from './manifest';

/** Band edges (m): LOD0 -> LOD1, LOD1 -> LOD2. */
export const LOD_EDGES: readonly [number, number] = [8, 25];
/** Hysteresis as a fraction of the edge. */
export const LOD_HYSTERESIS = 0.1;

/** The distance band for `dist` given the LOD currently shown (hysteresis around each edge). `edges`: the band edges
 *  (default Wren's `LOD_EDGES`; the guard figures pass `GUARD_LOD.edges`). */
export function bandLod(current: number, dist: number, edges: readonly [number, number] = LOD_EDGES): number {
  let t = current < LOD_0 || current > LOD_2 ? LOD_0 : current;
  while (t < LOD_2 && dist > edges[t - LOD_0]! * (1 + LOD_HYSTERESIS)) t++;
  while (t > LOD_0 && dist < edges[t - 1 - LOD_0]! * (1 - LOD_HYSTERESIS)) t--;
  return t;
}

/**
 * The LOD to show: hero for a close-up camera when it is loaded, else the distance band; if the wanted level is not
 * loaded (`have`: bit i = LOD i ready) the nearest loaded game level, preferring more detail; -1 when nothing is ready.
 */
export function pickLod(current: number, dist: number, closeUp: boolean, have: number, edges: readonly [number, number] = LOD_EDGES): number {
  if (closeUp && have & (1 << LOD_HERO)) return LOD_HERO;
  const want = closeUp ? LOD_0 : bandLod(current, dist, edges);
  if (have & (1 << want)) return want;
  for (let d = 1; d <= 3; d++) {
    const a = want - d;
    if (a >= LOD_0 && have & (1 << a)) return a;
    const b = want + d;
    if (b <= LOD_2 && have & (1 << b)) return b;
  }
  return have & (1 << LOD_HERO) ? LOD_HERO : -1;
}

/** Close-up cameras (D21) by id (Babylon `camera.uniqueId`). */
export class CloseCameras {
  private readonly ids = new Set<number>();
  add(id: number): void {
    this.ids.add(id);
  }
  remove(id: number): void {
    this.ids.delete(id);
  }
  has(id: number): boolean {
    return this.ids.has(id);
  }
  get size(): number {
    return this.ids.size;
  }
}

/** The one registry the game uses (menu and photo mode add their cameras; their dispose removes them). */
export const CLOSE_CAMERAS = new CloseCameras();
