/**
 * The slice 0d stub set (marlow-final PLAN 0d): an empty lit hall inside the set box, its way through open (no gate:
 * the holding rooms' doors are the course chain's), one objective step ("Cross to the next holding room."), one lamp
 * group (the set's first read circuit in `MARLOW_CIRCUITS`), its standby `ambientZone` (`MARLOW_ZONES`), camera spaces,
 * nav seeds, debug points, light spots and a shot vantage, so the whole course walks end to end before any set is
 * built. A set slice replaces its file's call to `buildStub` with the real set and drops `stub: true`; this file goes
 * once no set uses it.
 */
import type { LevelBuilder } from '../../levelBuilder';
import { MARLOW_CIRCUITS, MARLOW_LOUNGE, MARLOW_ZONES, type MarlowCircuit } from '../../lighting/marlowCircuits';
import {
  emptyPart,
  HOLD_DOORS,
  SET_BOX,
  SET_LINKS,
  SET_NAME,
  SET_NO,
  setBay,
  setIdPrefix,
  tally,
  type Box,
  type Pt,
  type SetId,
  type SetPart,
} from './types';

/** Stub hall lamps: high-bays at most `STUB_LAMP.spacing` apart on a grid over each set box (prototype values). */
export const STUB_LAMP = { y: 5, radius: 8, intensity: 1.0, spacing: 8 } as const;
/** Neutral white (render only: gameplay reads intensity). */
const WHITE: [number, number, number] = [0.96, 0.97, 1.0];
const NUMBER_WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

/** The set's stub circuit: its first plain-switched read circuit, else its first live read or pool circuit. */
export function stubCircuit(id: SetId): MarlowCircuit {
  const room = setBay(id);
  const rows = MARLOW_CIRCUITS.filter((c) => c.room === room);
  const c = rows.find((r) => r.kind === 'switch' && r.role === 'read') ?? rows.find((r) => r.kind !== 'dead' && r.kind !== 'house' && (r.role === 'read' || r.role === 'pool'));
  if (!c) throw new Error(`ctcourse stub: no circuit for ${room}`);
  return c;
}

/** Where the players step into the set: 2.5 m past the entry holding room's far door (A1: the arrival lounge). */
export function stubEntry(id: SetId): Pt & { yaw: number } {
  const e = SET_LINKS[id].entry;
  if (e === 'start') return { x: 4, y: 0, z: 11, yaw: Math.PI / 2 };
  const d = HOLD_DOORS[e].far;
  return { x: d.x + d.into[0] * 2.5, y: 0, z: d.z + d.into[1] * 2.5, yaw: Math.atan2(d.into[0], d.into[1]) };
}

/** The middle of the set's largest box. */
export function stubMid(id: SetId): Pt {
  let best: Box = SET_BOX[id][0]!;
  for (const b of SET_BOX[id]) if ((b[2] - b[0]) * (b[3] - b[1]) > (best[2] - best[0]) * (best[3] - best[1])) best = b;
  return { x: (best[0] + best[2]) / 2, y: 0, z: (best[1] + best[3]) / 2 };
}

/** The stub's lamp grid over box `b` (none in a box under 5 m on a side: A4's staff passage). */
export function stubLamps(b: Box): { x: number; z: number }[] {
  const w = b[2] - b[0];
  const d = b[3] - b[1];
  if (Math.min(w, d) < 5) return [];
  const nx = Math.max(1, Math.ceil(w / STUB_LAMP.spacing));
  const nz = Math.max(1, Math.ceil(d / STUB_LAMP.spacing));
  const out: { x: number; z: number }[] = [];
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) out.push({ x: b[0] + ((i + 0.5) * w) / nx, z: b[1] + ((k + 0.5) * d) / nz });
  return out;
}

/** Build set `id` as the stub. `extra` lets a stub add a piece the frames need now (A1's passive checker). */
export function buildStub(b: LevelBuilder, id: SetId, extra?: (p: SetPart) => void): SetPart {
  const p = emptyPart(id);
  p.stub = true;
  const n = SET_NO[id];
  const bay = setBay(id);
  const circuit = stubCircuit(id);
  const exit = SET_LINKS[id].exit;
  tally(b, p.register, `${bay}-0`, 'Stub hall lamps (slice 0d; the set slice replaces them)', () => {
    for (const box of SET_BOX[id]) {
      for (const l of stubLamps(box)) {
        b.light({ x: l.x, y: STUB_LAMP.y, z: l.z, radius: STUB_LAMP.radius, intensity: STUB_LAMP.intensity, color: WHITE, group: circuit.group, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.12, sz: 0.6, oy: 0.06 } });
      }
    }
  });
  p.groups[circuit.key] = circuit.group;
  for (const z of MARLOW_ZONES) if (z.id === bay) p.ambientZones.push({ id: z.id, box: z.box, ambient: z.ambient, minY: z.minY, maxY: z.maxY });
  if (id === 'a1Gate') {
    const lz = MARLOW_ZONES.find((z) => z.id === 'lounge');
    if (lz) p.ambientZones.push({ id: lz.id, box: MARLOW_LOUNGE, ambient: lz.ambient, minY: lz.minY, maxY: lz.maxY });
  }
  const next = exit === 'end' ? 'the cash dock' : `holding room ${NUMBER_WORD[Number(exit.slice(1))]}`;
  p.bay.radio.push({ at: 'enter', text: `Set ${NUMBER_WORD[n]}, ${SET_NAME[id]}: not built yet. Walk through to ${next}.` });
  p.objectives.push({ id: `${setIdPrefix(id)}cross`, bay, text: exit === 'end' ? 'Both of you out to the cash dock.' : 'Cross to the next holding room.' });
  const entry = stubEntry(id);
  const mid = stubMid(id);
  for (const box of SET_BOX[id]) {
    const small = Math.min(box[2] - box[0], box[3] - box[1]) < 8;
    p.camSpaces.push({ box, size: small ? 'tight' : 'open' });
    p.navSeeds.push({ x: (box[0] + box[2]) / 2, y: 0, z: (box[1] + box[3]) / 2 });
  }
  p.navSeeds.push({ x: entry.x, y: 0, z: entry.z });
  p.debugPoints.push({ id: `${bay}-entry`, label: `Set ${n} entry`, pos: { x: entry.x, y: 0, z: entry.z }, yaw: entry.yaw }, { id: `${bay}-mid`, label: `Set ${n} middle`, pos: mid, yaw: entry.yaw });
  p.lightSpots.push(
    { name: `${bay} entry`, kind: 'body', x: entry.x, y: 0, z: entry.z, band: 'read' },
    { name: `${bay} mid`, kind: 'body', x: mid.x, y: 0, z: mid.z, band: 'read' },
    { name: `${bay} mid floor`, kind: 'surf', x: mid.x, y: 0.05, z: mid.z, band: 'any' },
    { name: `${bay} mid standby`, kind: 'body', x: mid.x, y: 0, z: mid.z, band: 'standby' },
    { name: `${bay} mid cut`, kind: 'body', x: mid.x, y: 0, z: mid.z, band: 'cut', off: [circuit.group] },
  );
  p.shotVantages.push({ name: `${bay.toLowerCase()}-stub-hall`, feet: [entry.x, 0, entry.z], cam: [entry.x - Math.sin(entry.yaw) * 1.5, 1.9, entry.z - Math.cos(entry.yaw) * 1.5], target: [mid.x, 1.5, mid.z] });
  extra?.(p);
  return p;
}
