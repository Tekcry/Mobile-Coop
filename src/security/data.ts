import { CAMERA, SECURITY_LIMITS } from '../config/security';
import { camRange } from './camera';
import type { SecurityDesk } from '../game/sectorDesks';

/**
 * Security map data (S0 section 6). Part A of S1 reads cameras only; the desk, panel and the rest join as their
 * stages are built. Yaw and sweep are degrees (0 faces +Z, 90 faces +X); `y` is the mount height above the level floor.
 */
export interface CameraDevice {
  id: string;
  kind: 'camera';
  level: string;
  at: [number, number];
  y: number;
  facing: number;
  /** Two yaw angles (deg) the camera pans between; none = fixed. */
  sweep?: [number, number];
  room?: string;
  reason: string;
  /** Sector Ops: the section the camera belongs to (live only while that section is; none = always live). */
  section?: number;
  /** (sector-fixes C, item 3) The floor patch it watches: horizontal distance (m) from the mount to the floor point at the
   *  centre of its frame. The camera pitches down to it (`camPitch`); none = it looks level (SN02's old default). */
  aim?: number;
  /** (sector-fixes C, item 3) Its detection range (m, at most `CAMERA.rangeMax`): the section in front of it that it
   *  monitors. None: `CAMERA.aimReach` x `aim` when aimed, else `CAMERA.range` (camera-range). Detection and the cue
   *  both read `camRange`. */
  range?: number;
  /** (sector-fixes S) A course flag that switches the camera off until the bay restarts (a security room's console). */
  offFlag?: string;
  /** (sector-redesign E8, A95: stealth over shooting) Armoured housing: a round ricochets off it (sparks, the impact
   *  sound and noise) and never destroys it. The jammer, a desk, an `offFlag` console or slipping the sweep still beat
   *  it. The host alone destroys cameras, so a co-op client follows (`applyDestroyed`) with no wire change. */
  bulletproof?: boolean;
  /** (sector-redesign E8, A96) A thermal camera. Every camera already sees by its own IR and ignores the lamps
   *  (`CAMERA.irLight`, marlow-jammer M3) and no smoke or darkness-only hide exists for cameras, so this changes no
   *  detection: it is the data tag plus its own LED colour (`SecurityView`), ready for a later hide a thermal one sees. */
  thermal?: boolean;
  /** (guard-ai walk 4.82 item 6, Michael: "It's a training exercise, the guard should be non hostile and not respond to
   *  you being detected on the camera") `false`: a training camera. What it sees brings no guard response: its alarm
   *  makes no device incident (nobody sent, no radio call, no investigation, nobody told of the spot for the alarm's
   *  reinforcements) and its body sightings are not reported. Its meter, cue, the course's rules (a hallway send-back)
   *  and the alarm stage run as before (the exercise's own rules). Absent / `true`: the guards respond (every other
   *  camera). Read through `cameraAlertsGuards`. */
  guardResponse?: boolean;
}

/** (guard-ai walk 4.82 item 6) Does what camera `def` sees bring a guard response (`CameraDevice.guardResponse`)? */
export function cameraAlertsGuards(def: Pick<CameraDevice, 'guardResponse'>): boolean {
  return def.guardResponse !== false;
}

export type SecurityDevice = CameraDevice;

export interface SecurityData {
  devices: SecurityDevice[];
  /** Floor height (m) of each level id a device names (default 0, the ground floor). */
  levels?: Record<string, number>;
  /** (sector-redesign E6, EW10) Sector Ops security desks: consoles that loop or switch off their section's cameras
   *  once the operator is down or away (`game/sectorDesks.ts`; checked by `checkSectors` given the security data). */
  desks?: SecurityDesk[];
}

/** Every rule violation in a security file (empty = valid). */
export function validateSecurity(d: SecurityData): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  let cams = 0;
  for (const dev of d.devices) {
    if (ids.has(dev.id)) errs.push(`${dev.id}: duplicate id`);
    ids.add(dev.id);
    if (!dev.reason) errs.push(`${dev.id}: no reason`);
    if (dev.kind !== 'camera') {
      errs.push(`${(dev as { id: string }).id}: kind ${(dev as { kind: string }).kind} is not built yet`);
      continue;
    }
    cams++;
    if (dev.y < CAMERA.mountMin || dev.y > CAMERA.mountMax) errs.push(`${dev.id}: mount height ${dev.y} outside ${CAMERA.mountMin}-${CAMERA.mountMax} (SN04)`);
    if (dev.aim !== undefined && (dev.aim < CAMERA.aimMin || dev.aim > camRange(dev))) errs.push(`${dev.id}: aim ${dev.aim} m outside ${CAMERA.aimMin} m - its range`);
    if (dev.range !== undefined && (dev.range < CAMERA.rangeMin || dev.range > CAMERA.rangeMax)) errs.push(`${dev.id}: range ${dev.range} m outside ${CAMERA.rangeMin}-${CAMERA.rangeMax} m`);
    if (dev.sweep) {
      const span = Math.abs(dev.sweep[1] - dev.sweep[0]);
      if (span > CAMERA.sweepMaxDeg) errs.push(`${dev.id}: sweep ${span} deg is over ${CAMERA.sweepMaxDeg} (SN13)`);
      if (span < 1) errs.push(`${dev.id}: sweep span under 1 deg`);
    }
  }
  // (sector-redesign G1) SN60 caps the cameras live at once: per Sector Ops section (an untagged camera is live in
  // every section), the whole map when none is tagged
  const live = liveCameraPeak(d.devices);
  if (live > SECURITY_LIMITS.cameras) errs.push(`${live} cameras live in one section is over ${SECURITY_LIMITS.cameras} (SN60)`);
  if (cams > WIRE_CAMERAS) errs.push(`${cams} cameras on the map is over the co-op wire's ${WIRE_CAMERAS} (sec.ck)`);
  return errs;
}

/**
 * (sector-redesign G1) The co-op `sec` field carries one sweep clock per camera of the map, at most this many
 * (`SEC_CAMS` in `net/protocol.ts`; single player never imports `src/net`, so the number is mirrored here and a test
 * holds the two equal). More cameras per map needs a wire change (clocks for the live section only) and a
 * `PROTOCOL_VERSION` bump.
 */
export const WIRE_CAMERAS = 16;

/** (sector-redesign G1) The most cameras live at once: untagged cameras plus the busiest section's own. */
export function liveCameraPeak(devices: readonly SecurityDevice[]): number {
  let always = 0;
  const per = new Map<number, number>();
  for (const dev of devices) {
    if (dev.kind !== 'camera') continue;
    if (dev.section === undefined) always++;
    else per.set(dev.section, (per.get(dev.section) ?? 0) + 1);
  }
  let peak = 0;
  for (const n of per.values()) peak = Math.max(peak, n);
  return always + peak;
}
