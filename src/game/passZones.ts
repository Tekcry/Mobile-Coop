/**
 * Pass zones (CT prototype B3; marlow-final N1): a box on the map that sets a course flag when the players stand in it.
 * Run by `CtDevices.fixedUpdate` (host authority; the flag reaches the client through the course message). Pure (no
 * Babylon / DOM), unit-tested.
 */
import type { HallRule } from './jammer';

/** A zone the players stand in to set a course flag (station 3's camera pocket; marlow-final N1 "B past x" steps). */
export interface PassZone {
  id: string;
  box: [number, number, number, number];
  flag: string;
  floorY?: number;
  /** (marlow-jammer fix round 1) The camera hallway before this zone: its send-back rule (`hallStep`). */
  hall?: HallRule;
  /**
   * (marlow-final N1) One player inside is enough (`PassZone.any`): a step such as "B east of x 140" or "A on the
   * gallery". Any player counts (no role check: the step's line names who goes). Default: every player (at least 2).
   */
  any?: boolean;
}

/** How many players must stand in the zone for it to set its flag (`n` players in the match; `solo`: the dev flag). */
export function passZoneNeed(any: boolean | undefined, n: number, solo: boolean): number {
  return any || solo ? 1 : Math.max(2, n);
}

/**
 * (marlow-walk482 X6) The cameras that watch a hallway rule (`PassZone.hall.camera`): a training send-back camera. Its
 * full awareness only sends the player back (`CtDevices.stepHall`): no device alert to the guards, no alarm stage
 * (`CtDevices.onCamera`). Built once per map (host); empty when no zone has a hall.
 */
export function hallCameras(zones: readonly PassZone[]): Set<string> {
  const s = new Set<string>();
  for (const z of zones) if (z.hall) s.add(z.hall.camera);
  return s;
}
