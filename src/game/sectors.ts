import type { SquadSlot } from '../world/rooms';
import type { DifficultyPreset } from '../ai/archetypes';
import { AIRLOCK_DOORWAY_CLEAR, PAIR_WINDOW } from '../config/course';
import { clearPairHalves, pairHalves, pressPairHalf, type PairHalves } from './pairPress';
import type { GearTag, NoisySource, ReinforceEntry } from '../ai/guardAiData';
import { ENEMIES } from '../ai/enemyDefs';
import { markCount } from './rating/sectionRating';
import { checkStageActions, type SectorStageAction, type StageNavCheck } from './sectorStage';
import { checkDesks } from './sectorDesks';
import type { SecurityData } from '../security/data';

/**
 * Sector Ops (feature/sector-ops): a map split into sections played in order. Each section has one objective (a hack,
 * a grab or a download); then its connector opens: a short room with a near door (from the section) and a far door
 * (into the next). Every living player inside cycles it: the previous section unloads, the next one loads, and the
 * connector becomes the checkpoint (PLAN section 3). The last section ends at its extraction zone. Kills are optional,
 * so a ghost run (no kills, never spotted) is always possible (M3). No lives (M7): co-op revives with syringes; both
 * down, or solo, restarts the section at its checkpoint. Pure: the mode (`modes/sectorMode.ts`) puts it in the world.
 */
export type SectorObjectiveKind = 'hack' | 'grab' | 'download';

export interface SectorObjective {
  kind: SectorObjectiveKind;
  label: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/** Plan box [x0, z0, x1, z1] (world m, either corner order). */
export type PlanBox = [number, number, number, number];

/** A floor zone: a plan box on a floor (feet within `ZONE_Y_TOL` of `floorY`, default 0). */
export interface SectorZone {
  label: string;
  box: PlanBox;
  floorY?: number;
}

/** The room into the next section (PLAN section 3). */
export interface ConnectorDef extends SectorZone {
  /**
   * The near doorway's plan centre [x, z] (from this section): the cycle waits while someone stands in it
   * (`inDoorway`). Doors are found by their centres (`Doors.nearest`), never by id (ids are build order).
   */
  nearAt?: [number, number];
  /** The far doorway's plan centre [x, z] (into the next section). */
  farAt?: [number, number];
  /** More doorways of the next section that stay locked until this connector seals (side rooms off the connector). */
  sealUnlocks?: [number, number][];
  /** Where a restart puts the players once the connector has sealed (the next section's checkpoint). */
  checkpoint: Pose;
  /** (coop-rejoin, walk item 4) The partner's (slot 1) point at that checkpoint; none: a safe spot beside `checkpoint`. */
  checkpoint2?: Pose;
}

/** A route waypoint: [x, z] on the ground, or [x, z, y] on a raised floor (rack tops, the deck). */
export type RoutePt = readonly [number, number] | readonly [number, number, number];

/**
 * A named way through a section (M8): waypoints from the start (or checkpoint) to the objective (`pts[obj]`) and on to
 * the connector or the extraction. `climbs` lists the legs (i: pts[i] -> pts[i + 1]) taken by a ladder, a hop, a vault,
 * a climb or a cable that the guards' nav grid does not walk (the e2e nav check skips them).
 */
export interface SectorRoute {
  name: string;
  pts: readonly RoutePt[];
  obj: number;
  climbs?: readonly number[];
}

/** A section guard (M8): its slot, and the spot [x, z] where a player can take it down out of every other guard's sight. */
export interface SectorGuard extends SquadSlot {
  takedownSpot: [number, number];
  /**
   * (sector-redesign G20) A dog's handler: the index, in this section's `guards`, of the armed human guard it works with.
   * Required for a dog (`checkSectors`); the mode does not read it yet (the heel behaviour is guard-ai's, ENGINE.md
   * "Requests for guard-ai").
   */
  handler?: number;
  // (sector-redesign) Placement data for guard-ai (ENGINE.md "Requests for guard-ai"); optional, not read by any code yet.
  /** Squad id within the section (radio checks, the "missed" search, a dog's fallback handler). */
  squad?: number;
  /** Post / zone tags ('secure', 'perimeter', 'lobby', ...): what the guard's post protects. */
  zone?: string;
  /** Job ('gate', 'patrol', 'desk', 'handler', 'response', ...). */
  role?: string;
  /** Why the guard is there (M1 "have reason to what they are doing or protecting"); design text, may become a bark. */
  reason?: string;
  /** A talking-pair partner: the index in this section's `guards` of the guard he meets on his route. */
  pair?: number;
  /** A far guard that may sleep (sector-redesign A64). Data only: guard-render shipped no reader (A99). */
  dormant?: boolean;
}

/** (coop4 AI5) A section's response numbers, the same shape as Guard AI's `ResponseShapeOverride` (src/ai/gear.ts on
 *  feature/guard-ai-coop4), kept structural here so Sector Ops compiles and runs without that branch. */
export interface SectorResponseShape {
  readonly extraPerPlayer?: number;
  readonly splitAt?: number;
}

/** (coop4 AI5) What an alarm stage sends in Guard AI's shape: `size` guards in `teams` response teams. */
export interface SectorResponseOut {
  teams: number;
  size: number;
}

/** (coop4 AI5) How many of `size` guards go to response team `k` of `teams`: evenly, the first teams one more on a
 *  remainder (Guard AI's `responseTeamSize`, kept here so this file needs no symbol from that branch). */
export function responseTeamSize(k: number, size: number, teams: number): number {
  if (!(teams >= 1) || !(size >= 1) || k < 0 || k >= teams) return 0;
  const q = Math.floor(size / teams);
  return q + (k < size % teams ? 1 : 0);
}

export interface SectorDef {
  id: string;
  name: string;
  /** Where the section starts. The run's checkpoint for section 1; later sections start at the previous connector. */
  start: Pose;
  /** (coop-rejoin, walk item 4) The partner's (slot 1) start point; none: a safe spot beside `start`. */
  start2?: Pose;
  objective: SectorObjective;
  /** The room into the next section; every section but the last has one. */
  connector?: ConnectorDef;
  /** The run's end (the last section only): every living player inside ends it. */
  extract?: SectorZone;
  /** The guards that spawn when the section loads (holding, unaware). */
  guards: SectorGuard[];
  /** Where alarm reinforcements come in (x, z; taken in turn), inside the section. */
  reinforce: [number, number][];
  /** (guard-ai) Noisy things that mask hearing in this section. */
  noisy?: NoisySource[];
  /** (guard-ai) Reinforcement entry points and run-in routes; none = `reinforce`. */
  entries?: ReinforceEntry[];
  /** (guard-ai S11) Gear every guard of this section wears from the start (helmet / armour / both); none = no gear. */
  gear?: GearTag;
  /** (guard-ai S11) Sweep points the response teams walk, overriding the section's route points and posts. */
  sweep?: readonly (readonly [number, number])[];
  /** Guards each alarm stage sends in here (A3): armed guards (`SECTOR_REINFORCE_KIND`, no heavies, G155). */
  perStage: number;
  /** (coop4 AI5) This section's own response-shape numbers for Guard AI's `setResponseShape` (a field left out: Guard
   *  AI's default); none = the default. Read only when the Guard AI hook is present. */
  responseShape?: SectorResponseShape;
  /**
   * (sector-redesign G20, M10) How many dogs the section may have (default 0: none). Every dog needs a `handler`.
   * Sector Ops only (M10 "Include guard dogs"); G155 (no dogs) still holds for the co-op missions elsewhere.
   */
  dogs?: number;
  /** The ways to the objective and on to the exit (M8: at least 2). */
  routes: SectorRoute[];
  /** (sector-fixes-r RT) Team doors: doors bolted from one side (the course's B2 rule); none when absent. */
  bolts?: readonly SectorBolt[];
  /**
   * (sector-redesign E3, EW4) Pair gates: a door opened by two key switches turned within a window by two different
   * players (the course `PairGate`); none when absent. Co-op only by rule (A21, EG11).
   */
  pairGates?: readonly SectorPairGate[];
  /** (sector-redesign EW5, A4) Keypad doors: locked until the team holds the code (`SectorKeypad`); none when absent. */
  keypads?: readonly SectorKeypad[];
  /** (sector-redesign EW5, A4) Where the codes are found in this section (`SectorIntel`); none when absent. */
  intel?: readonly SectorIntel[];
  /** (sector-redesign E5, EW9) Alarm-stage extras: lights to full, lockdown doors, the response route, dog release (`sectorStage.ts`). */
  stageActions?: readonly SectorStageAction[];
  /** (E9-crate) the weapons crate at this section's start (A100, A109). */
  crate?: SectorCrate;
}

/** (sector-redesign E9-crate) A section's weapons crate: its floor point and yaw (the strip side, +z, faces the room). */
export interface SectorCrate {
  readonly at: readonly [number, number, number];
  readonly yaw: number;
}

/**
 * (sector-redesign EW5, A4) A keypad door. `at` is the door's plan centre [x, z] (found by position, `Doors.nearest`,
 * as the team doors). The door starts locked; its keypad ("Enter code", either side) opens it only once the team holds
 * the flag `code`. Codes are found in the level (`SectorIntel`), never typed. A section restart locks its keypads again.
 * Guards treat a keypad door as any locked door while it is locked (no guard route uses one).
 */
export interface SectorKeypad {
  readonly at: readonly [number, number];
  /** The code flag that opens it (any string; several keypads may share one, e.g. the lab block's codes). */
  readonly code: string;
}

/**
 * (sector-redesign EW5, A4) A place a code is found; using it gives the team the flag `grants` and shows `line` once as
 * a radio subtitle (written to be voiced later, G82; at most `INTEL_LINE_MAX` characters so it fits the co-op feed).
 * - `overhear`: a player stands in the plan box `box` (feet on `floorY`, default 0) for `hold` s (default
 *   `OVERHEAR_HOLD`) in a row. `talkers` (indices into this section's `guards`): the time runs only while every one is
 *   alive and not knocked out (one not spawned yet counts as not talking); omitted: the zone alone.
 * - `board`: a readable board at `at` [x, y, z] (a "Read" item, held `BOARD_READ` s).
 * - `objective`: the section's own objective is done (the S2 BMS hack gives the lab block's codes).
 */
export type SectorIntel =
  | { readonly kind: 'overhear'; readonly grants: string; readonly line: string; readonly box: PlanBox; readonly floorY?: number; readonly hold?: number; readonly talkers?: readonly number[] }
  | { readonly kind: 'board'; readonly grants: string; readonly line: string; readonly at: readonly [number, number, number]; readonly yaw?: number }
  | { readonly kind: 'objective'; readonly grants: string; readonly line: string };

/** (EW5) A keypad is used from this far (m) of the door centre, and held this long (s). */
export const KEYPAD_REACH = 1.6;
export const KEYPAD_HOLD = 1;
/** (EW5) An overheard code takes this long (s) in the zone, unless the intel sets `hold`. */
export const OVERHEAR_HOLD = 4;
/** (EW5) A board is read in this long (s). */
export const BOARD_READ = 1;
/** (EW5) The longest intel line: the co-op `feed` event's text cap (`net/protocol.ts`). */
export const INTEL_LINE_MAX = 60;

/** (EW5) The keypad item id of section `sec`'s keypad `k` (`c-`: first in the co-op item list, as the bolts). */
export function keypadItemId(sec: number, k: number): string {
  return `c-skey-${sec}-${k}`;
}

/** (EW5) The "Read" item id of section `sec`'s board intel `k`. */
export function intelItemId(sec: number, k: number): string {
  return `c-sintel-${sec}-${k}`;
}

/**
 * (EW5) A section's keypads and intel against the rules (empty when fine): every keypad's code is found somewhere a
 * solo player can reach first (an intel in an earlier section, or an overhear / board intel in its own section: its own
 * objective may sit behind the keypad), every line fits `INTEL_LINE_MAX`, every overhear hold is above 0.
 */
export function checkSectorCodes(defs: readonly SectorDef[]): string[] {
  const out: string[] = [];
  const earlier = new Set<string>();
  for (const d of defs) {
    const here = new Set<string>();
    d.intel?.forEach((n, k) => {
      if (n.kind !== 'objective') here.add(n.grants);
      if (n.line.length > INTEL_LINE_MAX) out.push(`${d.id}: intel ${k} line is over ${INTEL_LINE_MAX} characters`);
      if (n.kind === 'overhear' && !((n.hold ?? OVERHEAR_HOLD) > 0)) out.push(`${d.id}: intel ${k} overhear hold is not above 0`);
      if (n.kind === 'overhear') for (const t of n.talkers ?? []) if (!Number.isInteger(t) || t < 0 || t >= d.guards.length) out.push(`${d.id}: intel ${k} talker ${t} is not a guard index`);
    });
    d.keypads?.forEach((p, k) => {
      if (!earlier.has(p.code) && !here.has(p.code)) out.push(`${d.id}: keypad ${k} code '${p.code}' is not found before it`);
    });
    for (const n of d.intel ?? []) earlier.add(n.grants);
  }
  return out;
}

/**
 * (sector-fixes-r RT) A team door: a door bolted from one side (the course's B2 bolt, `BoltGate`). `at` is the door's
 * plan centre [x, z] (the door is found by position, `Doors.nearest`); `side` the unit plan direction from the door
 * toward the side that can unbolt it. The door starts locked; a player whose feet are past the door plane on `side`
 * (the course F7 test) within reach gets an "Unbolt" item; using it unlocks the door for both. A section restart
 * bolts its doors again. Guards treat a bolted door as any locked door (no guard route uses one).
 */
export interface SectorBolt {
  readonly at: readonly [number, number];
  readonly side: readonly [number, number];
  /** (sector-fixes-r2) The door's width (m) along its plane; `BOLT_DOOR_W` when absent. */
  readonly w?: number;
  /**
   * (sector-redesign E3, EW3; R2-PATHS design 2) A pair bolt: it draws only while another living player pushes the leaf
   * home on the near side (`partnerAtDoor`: within `BOLT_PAIR_DEPTH` of the plane, on the door's span, on the user's
   * floor). One player alone can never draw it, from either side. A plain bolt (absent / false) is not used by the
   * redesign (A21, EG11).
   */
  readonly pair?: boolean;
}

/** Reach (m) of a team door's "Unbolt" item (the course bolt's). */
export const BOLT_REACH = 1.6;

/** Is (x, z) on a bolt's unbolting side: past the door plane through `at` along `side` (course F7)? */
export function onBoltSide(b: SectorBolt, x: number, z: number): boolean {
  return (x - b.at[0]) * b.side[0] + (z - b.at[1]) * b.side[1] > 0;
}

/** (sector-fixes-r2) A team door's width (m) when its bolt gives none (the Warehouse's 1.2 doors). */
export const BOLT_DOOR_W = 1.2;
/** (sector-fixes-r2) How far (m) past the door's edge, along its plane, the "Unbolt" still reaches. */
export const BOLT_SIDE_MARGIN = 0.3;
/** (sector-fixes-r2) How far (m) out from the door plane, on the bolt side, the "Unbolt" reaches. */
export const BOLT_DEPTH = 1.2;

/** (sector-fixes-r2) Half the span (m) along the door plane from which a bolt can be worked: half the door plus the margin. */
export function boltHalfSpan(b: SectorBolt): number {
  return (b.w ?? BOLT_DOOR_W) / 2 + BOLT_SIDE_MARGIN;
}

/**
 * (sector-fixes-r2) Can feet at (x, z) work the bolt: on its side (`onBoltSide`), within `BOLT_DEPTH` of the door
 * plane and within `boltHalfSpan` of the door centre along the plane (so nobody unbolts it through the wall beside
 * the door, from a corridor running past its end). `Interactables.nearest` applies the same test (`sideHalf`,
 * `sideDepth`), so the prompt and the host agree.
 */
export function inBoltReach(b: SectorBolt, x: number, z: number): boolean {
  const dx = x - b.at[0];
  const dz = z - b.at[1];
  const depth = dx * b.side[0] + dz * b.side[1];
  const along = dz * b.side[0] - dx * b.side[1];
  return depth > 0 && depth <= BOLT_DEPTH && Math.abs(along) <= boltHalfSpan(b);
}

/** (sector-redesign E3, R2-PATHS design 2) How far (m) out from the door plane, on the near side, the partner pushes. */
export const BOLT_PAIR_DEPTH = 1.5;
/** (sector-redesign E3) The partner's feet within this (m) of the user's height (a catwalk over the door does not count). */
export const BOLT_PAIR_RISE = 1.0;

/** A player's feet (any `Vector3`-like). */
export interface Feet {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * (sector-redesign E3) Is a partner with feet at (x, y, z) pushing a pair bolt's leaf home: on the near side (not past
 * the plane on `side`), within `BOLT_PAIR_DEPTH` of the plane, within `boltHalfSpan` along it, and within
 * `BOLT_PAIR_RISE` of the user's feet height `userY`?
 */
export function partnerAtDoor(b: SectorBolt, x: number, y: number, z: number, userY: number): boolean {
  const dx = x - b.at[0];
  const dz = z - b.at[1];
  const depth = dx * b.side[0] + dz * b.side[1];
  const along = dz * b.side[0] - dx * b.side[1];
  return depth <= 0 && depth >= -BOLT_PAIR_DEPTH && Math.abs(along) <= boltHalfSpan(b) && Math.abs(y - userY) <= BOLT_PAIR_RISE;
}

/** Why a team door press did or did not draw the bolt: 'ok' drew it; 'partner': a pair bolt with nobody pushing. */
export type BoltPress = 'ok' | 'shut' | 'reach' | 'partner';

const BOLT_ID = /^c-sbolt-(\d+)-(\d+)$/;

/**
 * The "Unbolt" item id of section `sec`'s bolt `k`. The `c-` prefix puts it first in the co-op item list (the course
 * devices' rule, so the item cap never drops it); the client reads the bolt back from its own map data (`boltById`).
 */
export function boltItemId(sec: number, k: number): string {
  return `c-sbolt-${sec}-${k}`;
}

/** The bolt an "Unbolt" item id names (section, index and data), or null. */
export function boltById(defs: readonly SectorDef[] | undefined, id: string): { sec: number; k: number; bolt: SectorBolt } | null {
  const m = BOLT_ID.exec(id);
  if (!m || !defs) return null;
  const sec = Number(m[1]);
  const k = Number(m[2]);
  const bolt = defs[sec]?.bolts?.[k];
  return bolt ? { sec, k, bolt } : null;
}

/**
 * The team doors' state (host only, pure): which bolts are shut, per section. `use` is the host-authoritative press
 * (the user's feet must be on the bolt's side, the course B2 / F7 rule); `rebolt` shuts a section's bolts again (a
 * section restart, M9).
 */
export class SectorBolts {
  /** `shut[sec][k]`: the bolt is shut (its door locked). */
  readonly shut: boolean[][];

  constructor(readonly defs: readonly SectorDef[]) {
    this.shut = defs.map((d) => (d.bolts ?? []).map(() => true));
  }

  isShut(sec: number, k: number): boolean {
    return this.shut[sec]?.[k] === true;
  }

  /**
   * A player at (x, z) used bolt `k` of section `sec`: true when it unbolts (shut, and the feet in reach, `inBoltReach`).
   * A pair bolt never draws here (one player alone, EW3): it takes `press` with the partners' feet.
   */
  use(sec: number, k: number, x: number, z: number): boolean {
    const b = this.defs[sec]?.bolts?.[k];
    if (!b || b.pair || !this.isShut(sec, k) || !inBoltReach(b, x, z)) return false;
    this.shut[sec]![k] = false;
    return true;
  }

  /**
   * (sector-redesign E3) The host's press of bolt `k` of section `sec` by feet `user`, with the players' feet `mates`
   * (the user's own entry is skipped; indexed loop, no allocation): 'ok' when it draws. A plain bolt acts as `use`; a
   * pair bolt also needs a mate `partnerAtDoor` ('partner' otherwise). 'shut': a bad index or a bolt already drawn.
   */
  press(sec: number, k: number, user: Feet, mates: readonly Feet[]): BoltPress {
    const b = this.defs[sec]?.bolts?.[k];
    if (!b || !this.isShut(sec, k)) return 'shut';
    if (!inBoltReach(b, user.x, user.z)) return 'reach';
    if (b.pair) {
      let ok = false;
      for (let i = 0; i < mates.length && !ok; i++) {
        const m = mates[i]!;
        if (m !== user && partnerAtDoor(b, m.x, m.y, m.z, user.y)) ok = true;
      }
      if (!ok) return 'partner';
    }
    this.shut[sec]![k] = false;
    return 'ok';
  }

  /** Shut every bolt of section `sec` again; returns the indices that were open (their doors lock again). */
  rebolt(sec: number): number[] {
    const out: number[] = [];
    const row = this.shut[sec];
    if (!row) return out;
    for (let k = 0; k < row.length; k++) {
      if (!row[k]) out.push(k);
      row[k] = true;
    }
    return out;
  }
}

/** (sector-redesign E3, EW4) One key switch of a pair gate: plan [x, z], its height (default the door's floor) and facing. */
export interface SectorKeySwitch {
  readonly at: readonly [number, number];
  readonly y?: number;
  readonly yaw?: number;
  /** The prompt; `PAIR_SWITCH_LABEL` when absent. */
  readonly label?: string;
}

/**
 * (sector-redesign E3, EW4) A pair gate (the course `PairGate` in Sector Ops): the door at plan centre `door` [x, z]
 * (found by position, `Doors.nearest`) starts locked; key switches `a` and `b` turned within `window` s (default the
 * course's `PAIR_WINDOW`, 1.0), either order, by two different players unlock it for both. A section restart locks it
 * again. Guards treat it as a locked door (nav closure while shut).
 */
export interface SectorPairGate {
  readonly door: readonly [number, number];
  readonly a: SectorKeySwitch;
  readonly b: SectorKeySwitch;
  readonly window?: number;
}

/** (sector-redesign E3) A key switch's prompt and reach (m, the course devices'). */
export const PAIR_SWITCH_LABEL = 'Turn key';
export const PAIR_SWITCH_REACH = 1.4;

const PAIR_ID = /^c-spg-(\d+)-(\d+)-([ab])$/;

/** The item id of section `sec`'s pair gate `k`, switch a or b (`c-`: sorts with the course devices, never dropped). */
export function pairSwitchId(sec: number, k: number, isA: boolean): string {
  return `c-spg-${sec}-${k}-${isA ? 'a' : 'b'}`;
}

/** The pair gate a key switch item id names, or null. */
export function pairGateById(defs: readonly SectorDef[] | undefined, id: string): { sec: number; k: number; isA: boolean; gate: SectorPairGate } | null {
  const m = PAIR_ID.exec(id);
  if (!m || !defs) return null;
  const sec = Number(m[1]);
  const k = Number(m[2]);
  const gate = defs[sec]?.pairGates?.[k];
  return gate ? { sec, k, isA: m[3] === 'a', gate } : null;
}

/** A key turn: 'open' opened the gate; 'wait': the partner's key was not turned within the window; 'done': open already or a bad index. */
export type PairPress = 'open' | 'wait' | 'done';

/**
 * (sector-redesign E3, EW4) The pair gates' state (host only, pure): open or not and the two halves, per section.
 * `press` is a turn of switch a or b by player `p` at time `now` (the course rule, `pressPairHalf`, never solo);
 * `reset` locks a section's gates again (M9 restart).
 */
export class SectorPairGates {
  /** `open[sec][k]`: the gate is open (its door unlocked). */
  readonly open: boolean[][];
  private readonly halves: PairHalves[][];

  constructor(readonly defs: readonly SectorDef[]) {
    this.open = defs.map((d) => (d.pairGates ?? []).map(() => false));
    this.halves = defs.map((d) => (d.pairGates ?? []).map(() => pairHalves()));
  }

  isOpen(sec: number, k: number): boolean {
    return this.open[sec]?.[k] === true;
  }

  /** Player `p` (an index, distinct per player) turned switch a (`isA`) or b of gate `k` of section `sec` at `now` (s). */
  press(sec: number, k: number, isA: boolean, p: number, now: number): PairPress {
    const g = this.defs[sec]?.pairGates?.[k];
    const h = this.halves[sec]?.[k];
    if (!g || !h || this.isOpen(sec, k)) return 'done';
    if (!pressPairHalf(h, isA, p, now, g.window ?? PAIR_WINDOW, false)) return 'wait';
    this.open[sec]![k] = true;
    return 'open';
  }

  /** Lock every gate of section `sec` again (keys back); returns the indices that were open. */
  reset(sec: number): number[] {
    const out: number[] = [];
    const row = this.open[sec];
    const hs = this.halves[sec];
    if (!row || !hs) return out;
    for (let k = 0; k < row.length; k++) {
      if (row[k]) out.push(k);
      row[k] = false;
      clearPairHalves(hs[k]!);
    }
    return out;
  }
}

/** Tuning (prototype values). */
export const SECTOR = {
  /** A hack is held this long (s). */
  hackTime: 3,
  /** A download runs this long (s) while a player stays within `downloadRange` of the terminal. */
  downloadTime: 10,
  downloadRange: 4,
  /** Alarm stages (G125: escalating, never ends the run) and the guards each stage sends in (A3). */
  alarmMax: 3,
  perStage: 2,
  /** Every living player inside the connector this long (s) starts the cycle (once the near doorway is clear). */
  connectorHold: 1,
  /** The cycle (s): the previous section unloads at its start, the next loads at `connectorLoadAt`, then the far door unlocks. */
  connectorCycle: 3,
  connectorLoadAt: 1.5,
  /** The near doorway counts as occupied within this distance (m) of its centre (the course airlock rule). */
  doorwayClear: AIRLOCK_DOORWAY_CLEAR,
  /** Every living player in the extraction zone this long (s) ends the run. */
  extractHold: 0.5,
  /**
   * The per-mode live guard cap (M6): a section's guards plus its alarm reinforcements (alarmMax x the section's
   * perStage). The co-op snapshot carries at most `MAX_ENEMIES` (32, `net/protocol.ts`), so this never goes above it.
   */
  maxAlive: 32,
  /** Revive syringes per op by difficulty (M7, A10): co-op only; solo restarts the section at its checkpoint. */
  syringes: { rookie: 3, normal: 2, realistic: 1, perfectionist: 1 } as Readonly<Record<DifficultyPreset, number>>,
  /** (coop4 A4) Extra syringes in the team pool per player beyond 2 (counted when the op starts). Undo: 0. */
  syringeExtra: 1,
  /** (coop4 A9) Extra reinforcements per alarm stage per player beyond 2, within `maxAlive`. Undo: 0. */
  reinforcePerExtra: 1,
  /** (coop4 OUT, M1 b) From this team size an operator who is out waits for the next connector (no restart); below it
   *  one out restarts the section (1-2 players, unchanged). Undo: 99. */
  outWaitsMin: 3,
} as const;

/** (coop4 A4, A9) Players beyond the 2 the sections were tuned for (0 for 1 or 2 players). */
export function extraPlayers(players: number): number {
  return Number.isFinite(players) ? Math.max(0, Math.floor(players) - 2) : 0;
}

/** (coop4 A8, A10) Does a section guard spawn for a team of `players`? Untagged always; tagged from `minPlayers` up. */
export function guardForTeam(slot: { readonly minPlayers?: number }, players: number): boolean {
  return (slot.minPlayers ?? 0) <= players;
}

/** (guard-ai S13) A section's sweep source: its guards' route points, and the posts of the guards without a route. */
export type SweepSource = [readonly (readonly [number, number])[][], [number, number][]];

/**
 * (guard-ai S13; coop4 data check) The sweep source of a section's guard list for a team of `players`: only the guards
 * that spawn for that team (`guardForTeam`), dogs left out. A team of 1-2 gets master's (the untagged list). Load-time.
 */
export function sweepSourceOf(guards: readonly SectorGuard[], players: number): SweepSource {
  const routes: (readonly [number, number])[][] = [];
  const posts: [number, number][] = [];
  for (const q of guards) {
    if (q.kind === 'dog' || !guardForTeam(q, players)) continue;
    if (q.route && q.route.length) routes.push(q.route);
    else posts.push([q.x, q.z]);
  }
  return [routes, posts];
}

/**
 * (coop4 A9, lead decision) An alarm's `send` held to the live guard cap: the section's own `base` (`perStage`) always
 * goes (pending until there is room, as at 2 players); the 3-4 player extras only up to `headroom` (the cap less the
 * guards alive and waiting). `send` 0 (the stage was capped) stays 0.
 */
export function capReinforce(send: number, base: number, headroom: number): number {
  return Math.min(send, Math.max(base, Math.floor(headroom)));
}

/**
 * (sector-restart, M9) The banner of a checkpoint restart. The co-op host's banners reach the client as `banner` events;
 * this title is also the client's cue to restore its own loadout and calm its music (no wire change, A1 in
 * `docs/sector-restart/BRIEF.md`).
 */
export const SECTOR_RESTART_TITLE = 'RESTARTING FROM CHECKPOINT';

/** Feet height tolerance (m) for a floor zone. */
export const ZONE_Y_TOL = 1.5;

/** Is (x, y, z) inside the zone? */
export function inZone(zone: SectorZone, x: number, y: number, z: number): boolean {
  const [x0, z0, x1, z1] = zone.box;
  return x >= Math.min(x0, x1) && x <= Math.max(x0, x1) && z >= Math.min(z0, z1) && z <= Math.max(z0, z1) && Math.abs(y - (zone.floorY ?? 0)) < ZONE_Y_TOL;
}

/** Is (x, z) in the connector's near doorway (it cannot close and lock)? Never when the doorway is unknown. */
export function inDoorway(c: ConnectorDef, x: number, z: number): boolean {
  const at = c.nearAt;
  if (!at) return false;
  const dx = x - at[0];
  const dz = z - at[1];
  return dx * dx + dz * dz < SECTOR.doorwayClear * SECTOR.doorwayClear;
}

/** The zone that ends the section: its connector, or the extraction for the last one. */
export function exitZone(def: SectorDef): SectorZone | null {
  return def.connector ?? def.extract ?? null;
}

/**
 * Problems with a run's data (empty when fine): every section but the last has a connector, the last an extraction.
 * (E5) With `nav` (the map's nav grid and doors), a stage lockdown that leaves no way through is rejected too.
 * (E6) With `security` (the map's security data), its desks are checked against the sections and cameras (`checkDesks`).
 */
export function checkSectors(defs: readonly SectorDef[], nav?: StageNavCheck, security?: SecurityData): string[] {
  const out: string[] = [];
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i]!;
    const last = i === defs.length - 1;
    if (!last && !d.connector) out.push(`${d.id}: no connector`);
    if (!last && d.extract) out.push(`${d.id}: an extraction before the last section`);
    if (last && !d.extract) out.push(`${d.id}: the last section has no extraction`);
    if (last && d.connector) out.push(`${d.id}: a connector after the last section`);
    d.bolts?.forEach((b, k) => {
      if (b.side[0] === 0 && b.side[1] === 0) out.push(`${d.id}: bolt ${k} side is zero`);
    });
    d.pairGates?.forEach((g, k) => {
      if (g.a.at[0] === g.b.at[0] && g.a.at[1] === g.b.at[1]) out.push(`${d.id}: pair gate ${k} has both key switches in one place`);
      if (g.window !== undefined && !(g.window > 0)) out.push(`${d.id}: pair gate ${k} window is not positive`);
    });
    out.push(...checkSectorGuards(d));
  }
  out.push(...checkSectorCodes(defs));
  out.push(...checkStageActions(defs, nav));
  // (E6, EW10) the map's security desks: cameras that exist, in the desk's section; an operator of that section
  out.push(...checkDesks(defs, security));
  return out;
}

/** (sector-redesign G3) The kind every alarm reinforcement spawns as: an armed guard, never a heavy (G155). */
export const SECTOR_REINFORCE_KIND = 'grunt' as const;

/**
 * (sector-redesign G3 / G20) A section's guard list against the Sector Ops rules (empty when fine): every human guard
 * carries a gun (M1 "they should all have weapons": no melee-only kinds such as the runner), no heavies (G155), at most
 * `dogs` dogs (default 0), and each dog names a handler: another guard of the section, armed and human.
 */
export function checkSectorGuards(d: SectorDef): string[] {
  const out: string[] = [];
  let dogs = 0;
  d.guards.forEach((g, k) => {
    const def = ENEMIES[g.kind];
    if (g.kind === 'heavy') out.push(`${d.id}: guard ${k} is a heavy (G155)`);
    if (def.quadruped) {
      dogs++;
      const h = g.handler === undefined ? undefined : d.guards[g.handler];
      if (!h) out.push(`${d.id}: dog ${k} has no handler`);
      else if (g.handler === k || ENEMIES[h.kind].quadruped || !ENEMIES[h.kind].weapon) out.push(`${d.id}: dog ${k}'s handler ${g.handler} is not an armed human guard`);
      return;
    }
    if (!def.weapon) out.push(`${d.id}: guard ${k} (${g.kind}) carries no gun (M1)`);
  });
  if (dogs > (d.dogs ?? 0)) out.push(`${d.id}: ${dogs} dogs, the section allows ${d.dogs ?? 0}`);
  return out;
}

// Connector events (a bitmask, so a step allocates nothing). The mode applies them in this order.
/** The objective is done: unlock the near door. */
export const CONN_UNLOCK_NEAR = 1;
/** The cycle starts: shut and lock the near door. */
export const CONN_LOCK_NEAR = 2;
/** Unload the previous section: its guards (alive, knocked out or dead, bodies too), cameras and lasers. */
export const CONN_UNLOAD = 4;
/** Load the next section: its guards behind the far door (unaware, on their routes), its devices. */
export const CONN_LOAD = 8;
/** The cycle is done: unlock the far door (the connector is the checkpoint). */
export const CONN_UNLOCK_FAR = 16;

export type ConnectorState = 'locked' | 'open' | 'cycling' | 'sealed';

/** What the mode feeds a connector each step (a reused object). */
export interface ConnectorInput {
  /** Every living player is inside the connector (and at least one is alive). */
  allInside: boolean;
  /** Nobody stands in the near doorway (`inDoorway`), so the near door can shut and lock. */
  doorwayClear: boolean;
}

/**
 * One connector (PLAN section 3): locked (objective open) -> open (objective done; the near door unlocks) -> cycling
 * (every living player inside for `connectorHold`, then the near door shuts and locks once its doorway is clear; the
 * previous section unloads at once, the next loads at `connectorLoadAt`) -> sealed (after `connectorCycle` the far door
 * unlocks). Step-driven: `step` returns the events (CONN_* bits) and allocates nothing. Leaving before the near door
 * locks resets the hold; once cycling, the cycle runs out (the door is locked behind them).
 */
export class ConnectorMachine {
  state: ConnectorState = 'locked';
  /** Time (s) every living player has been inside (open state). */
  insideT = 0;
  /** Cycle time (s). */
  t = 0;
  private loaded = false;
  private pending = 0;

  /** The objective is done: the near door unlocks (CONN_UNLOCK_NEAR on the next step). False when not locked. */
  open(): boolean {
    if (this.state !== 'locked') return false;
    this.state = 'open';
    this.insideT = 0;
    this.pending |= CONN_UNLOCK_NEAR;
    return true;
  }

  step(dt: number, input: ConnectorInput): number {
    let ev = this.pending;
    this.pending = 0;
    if (this.state === 'open') {
      this.insideT = input.allInside ? Math.min(SECTOR.connectorHold, this.insideT + dt) : 0;
      if (this.insideT >= SECTOR.connectorHold - 1e-9 && input.doorwayClear) {
        this.state = 'cycling';
        this.t = 0;
        this.loaded = false;
        ev |= CONN_LOCK_NEAR | CONN_UNLOAD;
      }
    } else if (this.state === 'cycling') {
      this.t += dt;
      ev |= this.advance(false);
    }
    return ev;
  }

  /** A started cycle ends at once (a restart during the cycle); returns the events it still owed. 0 when not cycling. */
  finish(): number {
    if (this.state !== 'cycling') return 0;
    return this.advance(true);
  }

  /** Back to locked (a restart, or the next section's connector). */
  reset(): void {
    this.state = 'locked';
    this.insideT = 0;
    this.t = 0;
    this.loaded = false;
    this.pending = 0;
  }

  private advance(now: boolean): number {
    let ev = 0;
    if (!this.loaded && (now || this.t >= SECTOR.connectorLoadAt - 1e-9)) {
      this.loaded = true;
      ev |= CONN_LOAD;
    }
    if (now || this.t >= SECTOR.connectorCycle - 1e-9) {
      this.state = 'sealed';
      ev |= CONN_UNLOCK_FAR;
    }
    return ev;
  }
}

export type SectorPhase = 'objective' | 'connector' | 'extract' | 'done';

/**
 * The run's progress: which section, its phase (objective, then its connector or the extraction), the download, the
 * alarm stage (carried over between sections, A3) and the checkpoint (section 1's start; after a connector seals, the
 * connector's checkpoint). `restartSection` puts the current section back as it began (M7: no lives).
 */
export class SectorRun {
  index = 0;
  phase: SectorPhase = 'objective';
  /** Download progress (s) of the current objective. */
  progress = 0;
  /** The download was started at its terminal. */
  downloading = false;
  /** Alarm stage 0..SECTOR.alarmMax, carried over between sections (A3). */
  alarm = 0;
  /** The alarm stage when the current section began (a restart goes back to it). */
  alarmAtStart = 0;
  /** Where a restart puts the players (a copy; the defs are never written). */
  readonly checkpoint: Pose = { x: 0, y: 0, z: 0, yaw: 0 };
  /** (coop-rejoin) The partner's (slot 1) point at the checkpoint, when the map gives one (`start2` / `checkpoint2`). */
  checkpoint2: Pose | null = null;
  /** The current section's connector. */
  readonly conn = new ConnectorMachine();
  /** Time (s) every living player has been in the extraction. */
  private extractT = 0;
  /** (section-rating S2) Each section's marks (bitmask, `rating/sectionRating`), -1 until rated (never re-rated). */
  readonly marks: number[];
  /** (section-rating S2) Revive syringes the ratings granted this op (co-op, over the difficulty's preset). */
  syringeBonus = 0;
  /** (coop4 A10) Players in the session (connected plus held) when the current section loaded or restarted (the mode sets it). */
  teamSize = 1;

  constructor(readonly defs: readonly SectorDef[]) {
    this.marks = defs.map(() => -1);
    const s = defs[0];
    if (!s) this.phase = 'done';
    else {
      setPose(this.checkpoint, s.start);
      this.checkpoint2 = s.start2 ?? null;
    }
  }

  get current(): SectorDef | null {
    return this.phase === 'done' ? null : (this.defs[this.index] ?? null);
  }

  /** The section a connector loads (null on the last). */
  get next(): SectorDef | null {
    return this.phase === 'done' ? null : (this.defs[this.index + 1] ?? null);
  }

  /** The current objective is done: its connector opens (or the extraction). False when it was not the objective's turn. */
  objectiveDone(): boolean {
    const s = this.current;
    if (this.phase !== 'objective' || !s) return false;
    this.downloading = false;
    if (s.connector && this.index + 1 < this.defs.length) {
      this.phase = 'connector';
      this.conn.open();
    } else {
      this.phase = 'extract';
      this.extractT = 0;
    }
    return true;
  }

  /** A download tick while in range; true when it completes (the connector opens). */
  download(dt: number): boolean {
    if (this.phase !== 'objective' || !this.downloading) return false;
    this.progress = Math.min(SECTOR.downloadTime, this.progress + dt);
    return this.progress >= SECTOR.downloadTime && this.objectiveDone();
  }

  /**
   * The connector step (connector phase only, else 0): its events (CONN_* bits). On CONN_UNLOCK_FAR the run has moved
   * on: the next section's objective, the connector as the checkpoint, the alarm stage recorded as its start.
   */
  step(dt: number, input: ConnectorInput): number {
    if (this.phase !== 'connector') return 0;
    const ev = this.conn.step(dt, input);
    if (ev & CONN_UNLOCK_FAR) this.advance();
    return ev;
  }

  /** The extraction step (extract phase only): true once every living player has held it `extractHold` (the run ends). */
  extractStep(dt: number, allInside: boolean): boolean {
    if (this.phase !== 'extract') return false;
    this.extractT = allInside ? this.extractT + dt : 0;
    if (this.extractT < SECTOR.extractHold - 1e-9) return false;
    this.phase = 'done';
    return true;
  }

  /** An alarm (A3): up one stage (capped); returns how many guards it sends in (0 once capped; coop4 A9: + the extras for `teamSize`). */
  raiseAlarm(): number {
    const a = alarmStep(this.alarm, this.current?.perStage ?? SECTOR.perStage, this.teamSize);
    this.alarm = a.stage;
    return a.send;
  }

  /**
   * Both down, or solo down (M7): the current section starts again from its checkpoint, its objective, download and
   * connector reset and the alarm back to its stage when the section began. Returns the connector events the mode
   * still has to apply: CONN_LOCK_NEAR when the near door had unlocked; a cycle already running finishes first (the
   * near door is locked behind the players), so the restart is of the next section and returns the cycle's owed
   * events (CONN_LOAD, CONN_UNLOCK_FAR). The mode respawns the section's guards and devices.
   */
  restartSection(): number {
    if (this.phase === 'done') return 0;
    let ev = 0;
    if (this.phase === 'connector' && this.conn.state === 'cycling') {
      ev = this.conn.finish();
      this.advance();
    } else if (this.phase === 'connector' && this.conn.state === 'open') ev = CONN_LOCK_NEAR;
    this.phase = 'objective';
    this.progress = 0;
    this.downloading = false;
    this.extractT = 0;
    this.conn.reset();
    this.alarm = this.alarmAtStart;
    return ev;
  }

  /** The connector sealed: the next section begins at it. */
  private advance(): void {
    const c = this.current?.connector;
    if (c) {
      setPose(this.checkpoint, c.checkpoint);
      this.checkpoint2 = c.checkpoint2 ?? null;
    }
    this.index++;
    this.phase = this.index < this.defs.length ? 'objective' : 'done';
    this.progress = 0;
    this.downloading = false;
    this.extractT = 0;
    this.conn.reset();
    this.alarmAtStart = this.alarm;
  }
}

function setPose(out: Pose, p: Pose): void {
  out.x = p.x;
  out.y = p.y;
  out.z = p.z;
  out.yaw = p.yaw;
}

/**
 * The next alarm stage (capped) and how many guards it sends in (0 once capped; `perStage` per section, A3; coop4 A9:
 * + `reinforcePerExtra` per player beyond 2, before the live cap `capReinforce`).
 */
export function alarmStep(stage: number, perStage: number = SECTOR.perStage, players = 2): { stage: number; send: number } {
  if (stage >= SECTOR.alarmMax) return { stage, send: 0 };
  return { stage: stage + 1, send: perStage + SECTOR.reinforcePerExtra * extraPlayers(players) };
}

export interface SectorTally {
  time: number;
  /** Lethal kills (knock-outs are not kills, A4). */
  kills: number;
  /** Times spotted: guard detections plus camera alarms. */
  spotted: number;
  /** (section-rating S2) Each section's marks (bitmask; -1 not rated). Omitted: no marks on the line. */
  marks?: readonly number[];
}

export function fmtTime(s: number): string {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

/** The result line: time, kills, times spotted, and "Ghost" when there are none of either (A4). */
export function sectorResult(t: SectorTally): { ghost: boolean; line: string; marks?: readonly number[] } {
  const ghost = t.kills === 0 && t.spotted === 0;
  const line = `Time ${fmtTime(t.time)}  ·  Kills ${t.kills}  ·  Spotted ${t.spotted}${ghost ? '  ·  GHOST' : ''}${marksText(t.marks)}`;
  return { ghost, line, marks: t.marks };
}

/** (section-rating S2) "  ·  Marks 4/4 3/4 -": each section's marks of 4 ("-" not rated); '' when none are given. */
function marksText(marks: readonly number[] | undefined): string {
  if (!marks || marks.length === 0) return '';
  let out = '  ·  Marks';
  for (const m of marks) out += m < 0 ? ' -' : ` ${markCount(m)}/4`;
  return out;
}

/**
 * Co-op revive syringes for an op on `preset` (M7, A10); an unknown preset reads as Normal. (coop4 A4) The team pool:
 * + `syringeExtra` per player beyond 2 (`players`: the team when the op starts; default 2 = the preset).
 */
export function syringesFor(preset: DifficultyPreset | undefined, players = 2): number {
  return (SECTOR.syringes[preset ?? 'normal'] ?? SECTOR.syringes.normal) + SECTOR.syringeExtra * extraPlayers(players);
}

/**
 * The HUD mode info: "Section i/n", "Alarm a/max" and, in co-op, the revive syringes left (`syringes` null: solo, not
 * shown). Host and client build it the same way.
 */
export function sectorInfoHtml(section: number, sections: number, alarm: number, syringes: number | null): string {
  const sy = syringes === null ? '' : `<span>Syringes <b>${Math.max(0, syringes)}</b></span>`;
  return `<span>Section <b>${section}/${sections}</b></span><span>Alarm <b>${alarm}/${SECTOR.alarmMax}</b></span>${sy}`;
}

/**
 * (step 3, A9) What the host's `sector` message carries besides the devices (`sec`): the live section (`ls`, -1 none),
 * the locked door indices (`lk`), the cameras shot out (`dn`) and the revive syringes left (`sy`).
 */
export interface SectorNetExtra {
  ls: number;
  lk: number[];
  dn: string[];
  sy: number;
  /** (section-rating S2) The last section's rating (plain numbers; `sec` -1: none yet). S3 parses and clamps it. */
  rt: SectorRatingWire;
  /** (marlow-polish, inside protocol 42) Every section's rating so far, by index (`packRated`, the course's `rh`): a late
   *  joiner or a reloaded rejoiner rebuilds its results lines from it (no card, no top-up, no grant). */
  rh?: number[];
  /** (coop4 OUT) The slots out waiting for the next connector, a bitmask (bit s = slot s); absent = none. Sent only
   *  while someone is out (the 1-2 player message is unchanged). */
  ot?: number;
}

/**
 * (section-rating S2) The last rated section: its index, marks bitmask (0-15), synced takedowns and the grant it gave
 * the next section (gadget charges, syringes, medkits, alarm steps). Numbers only.
 */
export interface SectorRatingWire {
  sec: number;
  marks: number;
  synced: number;
  gadget: number;
  syringe: number;
  medkit: number;
  alarmStep: number;
}
