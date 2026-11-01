import { CHAMBER_MAP_ID } from '../anim/chamberMapId';

/**
 * (G1) Where the animation tuner may open: the Test Chamber (map `chamber`) only. Every way in (the pause and Settings
 * rows, F3 > Anim, the chamber stage, a phone launching it) goes through `AnimTunePanel.show()`, which asks this with the
 * current map's id; on any other map, or in a menu, it does not open and its rows are not listed. Pure (no DOM).
 */
export function animTuneAllowed(mapId: string | null | undefined): boolean {
  return mapId === CHAMBER_MAP_ID;
}
