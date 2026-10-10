import { CAMERA, SECURITY_LIMITS } from '../config/security';

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
}

export type SecurityDevice = CameraDevice;

export interface SecurityData {
  devices: SecurityDevice[];
  /** Floor height (m) of each level id a device names (default 0, the ground floor). */
  levels?: Record<string, number>;
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
    if (dev.sweep) {
      const span = Math.abs(dev.sweep[1] - dev.sweep[0]);
      if (span > CAMERA.sweepMaxDeg) errs.push(`${dev.id}: sweep ${span} deg is over ${CAMERA.sweepMaxDeg} (SN13)`);
      if (span < 1) errs.push(`${dev.id}: sweep span under 1 deg`);
    }
  }
  if (cams > SECURITY_LIMITS.cameras) errs.push(`${cams} cameras is over ${SECURITY_LIMITS.cameras} (SN60)`);
  return errs;
}
