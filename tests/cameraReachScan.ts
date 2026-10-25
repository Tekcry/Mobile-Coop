/**
 * (camera-range) The reach scan behind docs/archive/camera-range/MEASURE.md and `cameraReach.test.ts`: every camera of every
 * live map, built with the map's own pieces (`LevelBuilder`, `SightWorld` as the sector checks use), swept over its whole
 * pan. A head (standing 1.6 m, crouched 1.05 m over the feet, `remoteHeadY`) is "picked up" where it is in the frame
 * (`inFrame` with the camera's pitch and range), the lens has a clear line to it, the body stands free, and the rate is
 * over the leak (`seenAt`). Door leaves are not boxes: every door counts as open (the worst case).
 */
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { SightWorld } from '../src/game/sectorCheck';
import { roomAt, type RoomRect } from '../src/world/rooms';
import { CameraUnit, camPitch, inFrame, sweepYaw } from '../src/security/camera';
import { seenAt } from '../src/ai/perception';
import { remoteHeadY } from '../src/security/securitySystem';
import { GEARS } from '../src/config/movement';
import { hyp2 } from '../src/core/mathx';
import { CAMERA } from '../src/config/security';
import type { CameraDevice, SecurityData } from '../src/security/data';
import type { MapDef } from '../src/world/mapDef';

const DEG = Math.PI / 180;

/** The stances the table reads: name, crouched, speed (m/s; the GEARS walk / sneak speeds). */
export const STANCES = [
  { id: 'standStill', crouched: false, speed: 0 },
  { id: 'standWalk', crouched: false, speed: GEARS.stand[2] },
  { id: 'standRun', crouched: false, speed: GEARS.stand[4] },
  { id: 'crouchStill', crouched: true, speed: 0 },
  { id: 'crouchMove', crouched: true, speed: GEARS.crouch[1] },
] as const;

/** A camera model: its range (m) and the rate at a distance (the engine's, or the 4.63.1 one for "before"). */
export interface CamModel {
  range(def: CameraDevice): number;
  rate(dist: number, crouched: boolean, speed: number, range: number): number;
}

export interface ScanPoint {
  x: number;
  z: number;
  /** Horizontal distance from the mount (m). */
  h: number;
  room: string;
}

export interface CamScan {
  id: string;
  def: CameraDevice;
  floor: number;
  pitch: number;
  range: number;
  /** Farthest horizontal distance (m) a head is picked up, per stance (0 = never). */
  reach: Record<(typeof STANCES)[number]['id'], number>;
  /** Picked-up points for the standing run (the widest stance), with their zone. */
  seen: ScanPoint[];
}

export interface MapWorld {
  world: SightWorld;
  boxes: readonly BoxPiece[];
  rooms: RoomRect[];
  security: SecurityData;
}

export function buildMap(map: MapDef): MapWorld {
  const b = new LevelBuilder();
  const lay = map.build(b, 0);
  return { world: new SightWorld(b.boxes, b.cylinders), boxes: b.boxes, rooms: lay.rooms ?? [], security: lay.security! };
}

/** Scan one camera with `model`. `zoneOf` names the zone a floor point is in (default: its room). */
export function scanCamera(mw: MapWorld, def: CameraDevice, model: CamModel, zoneOf?: (x: number, z: number, y: number) => string): CamScan {
  const floor = mw.security.levels?.[def.level] ?? 0;
  const unit = new CameraUnit(def, floor);
  const range = model.range(def);
  const pitch = camPitch(def);
  const reach = { standStill: 0, standWalk: 0, standRun: 0, crouchStill: 0, crouchMove: 0 };
  const seen: ScanPoint[] = [];
  const yaws: number[] = [];
  if (def.sweep) {
    const t = Math.abs(def.sweep[1] - def.sweep[0]);
    for (let a = 0; a <= t + 1e-9; a += 2) yaws.push((Math.min(def.sweep[0], def.sweep[1]) + a) * DEG);
  } else yaws.push(sweepYaw(def, 0));
  const room = (x: number, z: number, y: number): string => {
    if (zoneOf) return zoneOf(x, z, y);
    const i = roomAt(mw.rooms, x, z, y);
    return i < 0 ? '(none)' : mw.rooms[i]!.id;
  };
  const done = new Set<string>();
  for (const yaw of yaws) {
    for (let da = -36; da <= 36; da += 1) {
      const az = yaw + da * DEG;
      const sx = Math.sin(az);
      const cz = Math.cos(az);
      for (let h = 0.4; h <= 20; h += 0.1) {
        const x = unit.x + sx * h;
        const z = unit.z + cz * h;
        if (mw.world.blocked(x, floor, z, 0.3) || !standsOn(mw.boxes, x, z, floor)) continue;
        let walkSeen = false;
        for (const s of STANCES) {
          const hy = remoteHeadY(floor, s.crouched);
          if (!inFrame(yaw, unit.x, unit.y, unit.z, x, hy, z, pitch, range)) continue;
          const dist = Math.sqrt(h * h + (hy - unit.y) * (hy - unit.y));
          // a hit within 0.2 m of the head is the body's own surroundings (`cameraSight`)
          const k = (dist - 0.2) / dist;
          if (!mw.world.clear(unit.x, unit.y, unit.z, unit.x + (x - unit.x) * k, unit.y + (hy - unit.y) * k, unit.z + (z - unit.z) * k)) continue;
          if (!seenAt(model.rate(dist, s.crouched, s.speed, range))) continue;
          if (h > reach[s.id]) reach[s.id] = h;
          if (s.id === 'standRun') walkSeen = true;
        }
        if (walkSeen) {
          const key = `${Math.round(x * 2)},${Math.round(z * 2)}`;
          if (!done.has(key)) {
            done.add(key);
            seen.push({ x, z, h: hyp2(x - unit.x, z - unit.z), room: room(x, z, floor) });
          }
        }
      }
    }
  }
  return { id: def.id, def, floor, pitch, range, reach, seen };
}

/** Per zone: how many picked-up points (0.5 m cells) and the farthest (m). */
export function zones(s: CamScan): Map<string, { n: number; far: number }> {
  const m = new Map<string, { n: number; far: number }>();
  for (const p of s.seen) {
    const e = m.get(p.room) ?? { n: 0, far: 0 };
    e.n++;
    if (p.h > e.far) e.far = p.h;
    m.set(p.room, e);
  }
  return m;
}

/** Where the frame lands on the floor: the bottom edge, the aim (centre) and the top edge (m from the mount; Infinity = never). */
export function floorPatch(def: CameraDevice): { near: number; centre: number; far: number } {
  const pitch = camPitch(def);
  const VF = CAMERA.vFov;
  const bot = pitch + VF / 2;
  const top = pitch - VF / 2;
  return { near: def.y / Math.tan(bot), centre: pitch > 0 ? def.y / Math.tan(pitch) : Infinity, far: top > 0 ? def.y / Math.tan(top) : Infinity };
}

/** A body can stand at (x, z) on a floor at height y: the ground (y about 0), or a solid piece whose top is that floor. */
function standsOn(boxes: readonly BoxPiece[], x: number, z: number, y: number): boolean {
  if (y < 0.3) return true;
  for (const b of boxes) {
    if (!b.collide || Math.abs(b.pitch) > 1e-3) continue;
    if (Math.abs(b.c[1] + b.s[1] / 2 - y) > 0.2) continue;
    const dx = x - b.c[0];
    const dz = z - b.c[2];
    const c = Math.cos(b.yaw);
    const sn = Math.sin(b.yaw);
    if (Math.abs(dx * c - dz * sn) <= b.s[0] / 2 && Math.abs(dx * sn + dz * c) <= b.s[2] / 2) return true;
  }
  return false;
}
