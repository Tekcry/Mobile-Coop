/**
 * ON6: the Kestrel play file's lamps and circuits (docs/kestrel/schema.md section 3) as the game's own lights, pure.
 * The level editor writes the records (src/editor/lamps.ts, the fitting catalogue src/editor/lightCatalogue.ts turns
 * lumens, colour temperature and beam into the `params` once); the walk test builds them here into `LightInit`s that go
 * through `LevelBuilder.light` like any map's lights, so the light meter and the guards read the same lamps (bible 5.1).
 *
 * Registry state the game has: `on`, `destructible` (shot out), `group` (one per circuit: a wall switch or breaker turns
 * the group). Not in the game yet: PIR triggering and mains-off. A motion lamp and a non-maintained emergency lamp build in
 * their normal state, off; a maintained one is on.
 */
import type { LightCone, LightFixture, LightInit, LightKind } from '../lights';

/** The `LightInit` fields a lamp record carries (schema `lamps[].params`). */
export interface LampParams {
  kind?: LightKind;
  radius: number;
  intensity: number;
  color: [number, number, number];
  cone?: LightCone | null;
  fixture?: LightFixture | null;
  /** false: off in its normal state (a fridge's door light). */
  on?: boolean;
  /**
   * An area fitting (Michael 2026-10-14: a troffer, a strip): its light as points across its lit face, plan offsets
   * from the lamp's point, each with its cell of the face as the fixture box (sx, sz). The game builds one light per
   * point with the intensity shared out (the sum is the fitting's), the same reach and cone, so the whole face lights.
   */
  area?: { pts: [number, number][]; sx: number; sz: number };
}

export type Emergency = 'maintained' | 'non-maintained';

export interface LampRecord {
  id: string;
  /** The fitting's catalogue id (src/editor/lightCatalogue.ts). */
  fixture: string;
  owner: string;
  room: string;
  /** [x, y, z]: plan point and the light's height above the room's floor. */
  at: [number, number, number];
  circuit: string;
  params: LampParams;
  /** [yaw, pitch] degrees: yaw 0 faces north (+z), 90 east; pitch below the horizontal (negative: up). */
  aim?: [number, number];
  /** Linear fittings (strip, batten, troffer run): the other end, as `at`. */
  b?: [number, number, number];
  emergency?: Emergency;
  motion?: boolean;
  breakable?: boolean;
  /** Twin-spot emergency fittings: the second head points the other way along the wall (yaw + 180). */
  heads?: number;
  /** Changed from the catalogue (absent: the catalogue's). */
  lumens?: number;
  kelvin?: number;
  beam?: number;
  /** Quarter turns of the body (ceiling fittings), degrees. */
  yaw?: number;
  name?: string;
  /** The object or post it sits on (desk lamp, monitor, rack LEDs, pole lantern). */
  on?: string;
  [k: string]: unknown;
}

export interface CircuitRecord {
  id: string;
  /** The wall switch: plan point on the wall face, its height above the floor, and the wall. null: no switch. */
  switch: { at: [number, number, number]; wall: string } | null;
  lamps: string[];
  /** Empty, or the real reason it has no switch (emergency, PIR, photocell, switched at the lamp). */
  unswitchable: string;
  name?: string;
  [k: string]: unknown;
}

interface Where {
  levels: readonly { id: string; floor: number }[];
  rooms: readonly { id: string; level: string }[];
}

/** The floor under a lamp (its room's level), or null when the room is gone. */
export function lampFloor(f: Where, l: Pick<LampRecord, 'room'>): number | null {
  const r = f.rooms.find((q) => q.id === l.room);
  const lv = r ? f.levels.find((q) => q.id === r.level) : undefined;
  return lv ? lv.floor : null;
}

/** On in the game's normal state: not a PIR lamp (no motion yet), not a non-maintained emergency lamp (mains on). */
export function lampOnNormally(l: Pick<LampRecord, 'emergency' | 'motion' | 'params'>): boolean {
  if (l.motion) return false;
  if (l.emergency === 'non-maintained') return false;
  return l.params.on !== false;
}

/**
 * Every lamp as the game's lights: absolute position (a linear fitting at its middle), the record's params, the
 * circuit as a switch group (1, 2, ... in the circuits' order; -1 none), breakable as `destructible`. A twin-spot
 * fitting is two lights, the second head mirrored. `ids` (ON7, the editor's light preview): the lamp id of each light,
 * in the same order (the registry ids of a map that adds only these lights).
 */
export function campusLights(f: Where & { lamps?: readonly LampRecord[]; circuits?: readonly CircuitRecord[] }, ids?: string[]): LightInit[] {
  const out: LightInit[] = [];
  const circuits = f.circuits ?? [];
  for (const l of f.lamps ?? []) {
    const floor = lampFloor(f, l);
    if (floor === null) continue;
    const b = l.b ?? l.at;
    const x = (l.at[0] + b[0]) / 2;
    const z = (l.at[2] + b[2]) / 2;
    const y = floor + (l.at[1] + b[1]) / 2;
    const gi = circuits.findIndex((c) => c.id === l.circuit);
    const p = l.params;
    const base: LightInit = {
      kind: p.kind ?? (p.cone ? 'spot' : 'lamp'),
      x,
      y,
      z,
      radius: p.radius,
      intensity: p.intensity,
      color: [p.color[0], p.color[1], p.color[2]],
      cone: p.cone ? { ...p.cone } : null,
      on: lampOnNormally(l),
      destructible: !!l.breakable,
      electric: true,
      group: gi >= 0 ? gi + 1 : -1,
      fixture: p.fixture ? { ...p.fixture } : null,
    };
    const area = p.area && p.area.pts.length > 1 ? p.area : null;
    if (area) {
      // an area fitting: a light per point of its face, the intensity shared out, each point's cell its fixture box
      const n = area.pts.length;
      for (const [dx, dz] of area.pts) {
        out.push({ ...base, x: x + dx, z: z + dz, intensity: p.intensity / n, color: [p.color[0], p.color[1], p.color[2]], cone: p.cone ? { ...p.cone } : null, fixture: p.fixture ? { ...p.fixture, sx: area.sx, sz: area.sz } : null });
        ids?.push(l.id);
      }
      continue;
    }
    out.push(base);
    ids?.push(l.id);
    if ((l.heads ?? 1) > 1 && p.cone) {
      out.push({ ...base, cone: { ...p.cone, dx: -p.cone.dx, dz: -p.cone.dz }, fixture: null });
      ids?.push(l.id);
    }
  }
  return out;
}
