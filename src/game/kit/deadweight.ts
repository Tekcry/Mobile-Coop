/**
 * (coop-kit K1, PLAN Part 2 "Deadweight") Michael's SIGNOFF row: "One hangs on a chain so a counterweighted grate lifts
 * for the other." A counterweighted lift gate: the hanger's body weight on the chain (a jump-grab, then a dead hang,
 * arms long) balances the counterweight, so the grate (the spot's door) lifts and the partner ducks under. Letting go
 * drops it, never onto a body. One chain each side of the grate: whoever is through hangs for the other (forced co-op
 * both ways). Pure and Babylon-free (type imports only from `world/doors` and the player); registered with the kit
 * registry at load (teamController's glob loads it).
 *
 * Spot (`addKitSpot`, `kind 'deadweight'`): (`x`, `y`, `z`) the near chain's grip (y = the grip's absolute height, not a
 * floor), (`x2`, `y2`, `z2`) the far chain's, `door` the grate's door anchor id as TEXT (`String(<anchor id>)`; the level
 * stores a number: matched by `String(d.anchor.id) === spot.door`), `yaw` / `w` / `h` unused. Bands (A12 "Not yet", M3:
 * move constants, logged at setup by `deadweightSpotOk`, not enforced, A17): each grip 2.2-2.6 m over the door's floor,
 * each chain 1.0-3.0 m off the door plane, one each side. One `DeadweightDevice` per spot, added for every spot whatever
 * `flags.kitMoves` says (the spot index must match on every page, k0-CHECK-B polish 3); only the offers and the host's
 * rule read the id. A spot whose door is not found stays listed and inert (one warning).
 *
 * Hanger (role b, wire `brace` + `DEADWEIGHT_SUB`; local entry, no request): under a chain, Co-op -> `chainGrab`
 * (`grab` s: to the chain, feet up to the hang) -> `chainHang` (held; the chain pays out `sag` over `sagTime`; the feet
 * never under the floor + `footClear`, K1-4) -> Co-op or B (or hurt) -> `chainDrop` (`chainDrop` s, straight down) ->
 * free. Wire `s`: +(spot index + 1) in `chainHang`, -(index + 1) in `chainGrab` / `chainDrop` (K1-1: only a settled hang
 * lifts the grate; a let-go starts the drop clock at once).
 * Partner (role a, wire `boost` + `DEADWEIGHT_SUB`, `s` +(index + 1); local, no request): at the grate held open past
 * `passOpen`, Co-op -> `grateUnder` (`passTime` s, crouched kinematic across the doorway, `passOut` past the plane) ->
 * free. A mate hanging and the grate not up yet: "Wait for the grate to lift".
 * Moved by something else (K1-3: Marlow's retry teleports to the marks; K5b's `reset` hook is not on this base): a hang
 * or a pass whose override was replaced, or whose body is more than `shove` off where the move put it, ends at once.
 *
 * The host's rule (`tick`, every page, every fixed step; nothing on a co-op client, which follows the host's door
 * snapshot): per device, a hanger (the own player in `chainHang`, or a mate in `brace` + 64 with `s` = index + 1 near a
 * chain at hang height, K1-6: the host trusts the MoveState) held for `lift` s opens the door (`Doors.setOpen`, which
 * forces the locked sliding door and tells the guards' nav grid); nobody for `drop` s shuts it, only with the doorway
 * clear (no body, no live guard in the doorway box, no mate passing, the own player not passing: the shutter's no-crush
 * rule). With the id off on the host nobody counts as hanging.
 * Done (K1-2): a player other than the last hanger crossing the door plane (a side flip near the doorway) while the move
 * holds the grate open (held, or in the drop window) -> `kitDone('deadweight', spot id, passer, hanger)`, undefined =
 * the host's own player. A walk-through counts; the hanger's own slip (K1-5) and a door the motor opened count nothing.
 * Two passes (one each way) = two calls. Guards: the open door is a door left open (the existing door rules; G403 names
 * no notice for Deadweight). Numbers are starting values (G10, A17).
 */
import { hyp2 } from '../../core/mathx';
import { flags } from '../../core/flags';
import { DEADWEIGHT_SUB, type TeamDenial } from '../teamMoves';
import { registerKitMove, type KitDevice, type KitDevices, type KitHost, type KitMove } from './registry';
import { kitDone, kitSpotIndex, kitSpotsOf, type KitSpot } from './kitApi';
import type { DoorState } from '../../world/doors';
import type { MoveOverride } from '../../player/playerController';
import type { TeamMate } from '../teamController';

export const DEADWEIGHT = {
  /** The hang offer: horizontal reach from a chain (m). */
  reach: 0.8,
  /** The hang offer: the grip this high over the player's feet (m; the A12 band 2.2-2.6 +-0.2 for the controller's
   *  2-4.5 cm rest gap and floor drift). */
  gripLo: 2.0,
  gripHi: 2.8,
  /** `chainGrab`: the jump to the grip (s). */
  grab: 0.6,
  /** Grip to soles in a dead hang, arms long (m; a 1.75 m operator). */
  hangLen: 2.15,
  /** The chain pays out this far under the hanger's weight (m). */
  sag: 0.5,
  /** ... over this long (s). */
  sagTime: 0.5,
  /** The hanger's feet never go lower than this over the floor (m). */
  footClear: 0.05,
  /** `chainDrop`: let go, down to the floor (s). */
  chainDrop: 0.5,
  /** Host: hanging this long before the grate opens (s). */
  lift: 0.8,
  /** Host: nobody hanging this long before it shuts (s). */
  drop: 0.4,
  /** Host: a hanger within this of a chain (m, horizontal). */
  holdReach: 1.0,
  /** Host: the grip this high over the hanger's feet (m). */
  holdLo: 1.9,
  holdHi: 2.9,
  /** The door's `open` fraction before the pass is offered. */
  passOpen: 0.9,
  /** The pass offer: this far off the door plane at most (m). */
  passReach: 1.0,
  /** The pass offer: the feet within this of the door's floor (m). */
  passUp: 0.4,
  /** `grateUnder`: the duck under, start to end (s). */
  passTime: 1.0,
  /** The pass ends this far past the plane (m). */
  passOut: 0.7,
  /** The pass lane keeps this far in from the doorway's sides (m). */
  sideIn: 0.35,
  /** The no-crush box: this far either side of the plane (m), the doorway's width + 0.2 along. */
  doorwayAcross: 0.5,
  /** A side counts only this far off the plane (m; the leaf's 0.25 half thickness, no jitter at the plane). */
  crossMin: 0.3,
  /** A crossing counts only this near the plane (m). */
  crossNear: 2.0,
  /** The body this far from where the move put it (m, horizontal) = moved by something else (a retry teleport). */
  shove: 0.6,
  /** Band helpers (A12 / A17, logged at setup): the grip over the floor (m) and each chain off the door plane (m). */
  bandLo: 2.2,
  bandHi: 2.6,
  chainLo: 1.0,
  chainHi: 3.0,
} as const;

/** `DeadweightDevice.user` / `lastHanger` for the local player (a mate's is their id). */
export const LOCAL_HANGER = '@local';

/** Crossing slots per device: slot 0 the own player, 1-4 mates. */
const MATE_SLOTS = 4;

/** A Deadweight spot's live device (`KitDevice` + its state). */
export interface DeadweightDevice extends KitDevice {
  readonly kind: 'deadweight';
  /** The far chain's grip ((`x`, `y`, `z`) is the near one's; y = the grip's height). */
  readonly x2: number;
  readonly y2: number;
  readonly z2: number;
  /** The spot's door (anchor id as text) and its index in `world.doors.list` (-1 = not found: inert). */
  readonly door: string;
  readonly doorIdx: number;
  /** The doorway centre (floor) and half width (m). */
  readonly cx: number;
  readonly cz: number;
  readonly hw: number;
  /** "Across": the unit axis from the near grip to the far grip; "along" = (nz, -nx). */
  readonly nx: number;
  readonly nz: number;
  readonly tx: number;
  readonly tz: number;
  /** Bumped each time the move opens the door. */
  opens: number;
  /** Parity with `ShutterDevice` (-1; no notice code, G403). */
  noticed: number;
  /** Host: seconds someone has hung / nobody has since the move opened it; the last hanger (id, '@local' or ''). */
  holdT: number;
  freeT: number;
  lastHanger: string;
  /** Host: the crossing slots (mate ids of slots 1-4, '' free; each slot's side -1 / 0 unseen / +1). */
  readonly ids: string[];
  readonly side: Int8Array;
}

export function isDeadweightDevice(d: KitDevice): d is DeadweightDevice {
  return d.kind === 'deadweight';
}

// ---- pure helpers (exported for tests; no allocation) ----

/** A point relative to the doorway centre on the device axes. */
export interface DwLocal {
  across: number;
  along: number;
}

export function dwLocal(d: Pick<DeadweightDevice, 'cx' | 'cz' | 'nx' | 'nz' | 'tx' | 'tz'>, x: number, z: number, out: DwLocal): DwLocal {
  const dx = x - d.cx;
  const dz = z - d.cz;
  out.across = dx * d.nx + dz * d.nz;
  out.along = dx * d.tx + dz * d.tz;
  return out;
}

/** The nearer chain within `r` of (x, z), horizontal: 1 near, 2 far, 0 none. */
function chainWithin(d: DeadweightDevice, x: number, z: number, r: number): number {
  const r1 = hyp2(d.x - x, d.z - z);
  const r2 = hyp2(d.x2 - x, d.z2 - z);
  if (r1 <= r && r1 <= r2) return 1;
  return r2 <= r ? 2 : 0;
}

/** The nearer chain within the hang reach of (x, z): 1 / 2, or 0. */
export function chainOf(d: DeadweightDevice, x: number, z: number): number {
  return chainWithin(d, x, z, d.reach);
}

/**
 * A spot against the A12 starting bands (A17: logged, not enforced): '' fine, 'grip' a grip outside `bandLo..bandHi`
 * over `floorY`, 'chain' a chain outside `chainLo..chainHi` off the door plane (through the doorway centre, across the
 * near-to-far axis), 'sides' both chains on one side.
 */
export function deadweightSpotOk(spot: KitSpot, doorCx: number, doorCz: number, floorY: number): '' | 'grip' | 'chain' | 'sides' {
  const B = DEADWEIGHT;
  const x2 = spot.x2 ?? spot.x;
  const y2 = spot.y2 ?? spot.y;
  const z2 = spot.z2 ?? spot.z;
  const g1 = spot.y - floorY;
  const g2 = y2 - floorY;
  if (g1 < B.bandLo - 1e-6 || g1 > B.bandHi + 1e-6 || g2 < B.bandLo - 1e-6 || g2 > B.bandHi + 1e-6) return 'grip';
  const l = hyp2(x2 - spot.x, z2 - spot.z);
  if (l < 1e-6) return 'sides';
  const nx = (x2 - spot.x) / l;
  const nz = (z2 - spot.z) / l;
  const a1 = (spot.x - doorCx) * nx + (spot.z - doorCz) * nz;
  const a2 = (x2 - doorCx) * nx + (z2 - doorCz) * nz;
  const off = (a: number): boolean => Math.abs(a) < B.chainLo - 1e-6 || Math.abs(a) > B.chainHi + 1e-6;
  if (off(a1) || off(a2)) return 'chain';
  return a1 * a2 < 0 ? '' : 'sides';
}

/** A spot's device; `doors` the level's (`world.doors.list`; null = none: inert). Level load only. */
export function newDeadweightDevice(spot: KitSpot, doors: readonly DoorState[] | null): DeadweightDevice {
  let doorIdx = -1;
  if (doors && spot.door !== undefined) {
    for (let i = 0; i < doors.length; i++) {
      if (String(doors[i]!.anchor.id) === spot.door) {
        doorIdx = i;
        break;
      }
    }
  }
  const door = doorIdx >= 0 ? doors![doorIdx]! : null;
  const x2 = spot.x2 ?? spot.x;
  const y2 = spot.y2 ?? spot.y;
  const z2 = spot.z2 ?? spot.z;
  let nx = x2 - spot.x;
  let nz = z2 - spot.z;
  const l = hyp2(nx, nz);
  if (l > 1e-6) {
    nx /= l;
    nz /= l;
  } else if (door) {
    // one point only: across the door's own leaf (the leaf runs along (sin yaw, cos yaw))
    nx = Math.cos(door.anchor.yaw);
    nz = -Math.sin(door.anchor.yaw);
  } else {
    nx = 0;
    nz = 1;
  }
  if (!door) console.warn(`deadweight: spot ${spot.id} names door ${String(spot.door)}, not in the level: the spot is inert`);
  else {
    const why = deadweightSpotOk(spot, door.cx, door.cz, door.anchor.hinge.y);
    if (why !== '') console.warn(`deadweight: spot ${spot.id} is outside the starting band (${why})`);
  }
  return {
    id: spot.id,
    kind: 'deadweight',
    x: spot.x,
    y: spot.y,
    z: spot.z,
    yaw: spot.yaw,
    reach: DEADWEIGHT.reach,
    open: 0,
    user: '',
    x2,
    y2,
    z2,
    door: spot.door ?? '',
    doorIdx,
    cx: door ? door.cx : spot.x,
    cz: door ? door.cz : spot.z,
    hw: door ? door.anchor.width / 2 : 0,
    nx,
    nz,
    tx: nz,
    tz: -nx,
    opens: 0,
    noticed: -1,
    holdT: 0,
    freeT: 0,
    lastHanger: '',
    ids: ['', '', '', ''],
    side: new Int8Array(MATE_SLOTS + 1),
  };
}

// ---- the move ----

export interface DeadweightRun {
  dev: DeadweightDevice | null;
  /** Hanger: the chain (1 near, 2 far), its grip, the floor under it (the feet at the press), the hang's top feet. */
  chain: number;
  gx: number;
  gy: number;
  gz: number;
  floor: number;
  hangTop: number;
  /** Hanger: the feet when the drop started. */
  dropY: number;
  /** The start (feet) and, passer, the end (world). */
  sx: number;
  sz: number;
  ex: number;
  ez: number;
  /** Passer: the start side (+1 / -1 across) and the lane along the doorway. */
  side: number;
  lane: number;
  /** Where the move put the body last step (horizontal; the "moved" check). */
  px: number;
  pz: number;
  /** Hanger: health at the last step (a drop = hurt). */
  hp: number;
  /** The override the move set last ('moved' when another replaced it). */
  ov: MoveOverride | null;
  /** Scratch (no allocation per step). */
  readonly loc: DwLocal;
  /** The overrides (one object each, reused; `kinematic` is the controller's own vector type, cloned once). */
  readonly ovHang: MoveOverride;
  readonly ovPass: MoveOverride;
}

function newRun(): DeadweightRun {
  return {
    dev: null,
    chain: 0,
    gx: 0,
    gy: 0,
    gz: 0,
    floor: 0,
    hangTop: 0,
    dropY: 0,
    sx: 0,
    sz: 0,
    ex: 0,
    ez: 0,
    side: 1,
    lane: 0,
    px: 0,
    pz: 0,
    hp: NaN,
    ov: null,
    loc: { across: 0, along: 0 },
    ovHang: { yaw: 0, turnRate: 12, crouch: false },
    ovPass: { yaw: 0, turnRate: 12, crouch: true },
  };
}

/** A mate hanging (or grabbing / dropping) on a Deadweight chain: `brace` + the sub bit. */
function hangingMate(m: TeamMate): boolean {
  return m.mode === 'brace' && ((m.sub ?? 0) & DEADWEIGHT_SUB) !== 0;
}

function passingMate(m: TeamMate): boolean {
  return m.mode === 'boost' && ((m.sub ?? 0) & DEADWEIGHT_SUB) !== 0;
}

function prompt(h: KitHost, text: string, x: number, y: number, z: number): void {
  h.prompt = text;
  h.promptAt.set(x, y, z);
}

function doorList(h: KitHost): readonly DoorState[] | null {
  return h.g.world?.doors?.list ?? null;
}

/** Drive the body to (x, y, z) feet through `ov` (kinematic) and remember where it was put. */
function put(h: KitHost, run: DeadweightRun, ov: MoveOverride, x: number, y: number, z: number): void {
  const c = h.g.player.controller;
  if (!ov.kinematic) ov.kinematic = c.pos.clone();
  ov.kinematic.set(x, y, z);
  c.override = ov;
  run.ov = ov;
  run.px = x;
  run.pz = z;
}

/** K1-3: something else moved the body (a retry teleport) or replaced the override. */
function moved(h: KitHost, run: DeadweightRun): boolean {
  const c = h.g.player.controller;
  return c.override !== run.ov || hyp2(c.pos.x - run.px, c.pos.z - run.pz) > DEADWEIGHT.shove;
}

/** A mate on chain `chain` of device index `i` (any phase: grabbing, hanging, dropping). No allocation. */
function chainTaken(h: KitHost, d: DeadweightDevice, i: number, chain: number): boolean {
  const ms = h.mates();
  for (let j = 0; j < ms.length; j++) {
    const m = ms[j]!;
    if (!hangingMate(m) || Math.abs(Math.round(m.s ?? 0)) !== i + 1) continue;
    if (chainWithin(d, m.pos.x, m.pos.z, DEADWEIGHT.holdReach) === chain) return true;
  }
  return false;
}

/** The hang offer: the nearest free chain over the player. */
function hangIdle(h: KitHost, run: DeadweightRun, coopPressed: boolean): boolean | null {
  const c = h.g.player.controller;
  const list = h.devices.list;
  let best: DeadweightDevice | null = null;
  let bestChain = 0;
  let bd = Infinity;
  for (let i = 0; i < list.length; i++) {
    const d0 = list[i]!;
    if (!isDeadweightDevice(d0) || d0.doorIdx < 0) continue;
    const d = d0;
    for (let ch = 1; ch <= 2; ch++) {
      const gx = ch === 1 ? d.x : d.x2;
      const gy = ch === 1 ? d.y : d.y2;
      const gz = ch === 1 ? d.z : d.z2;
      const r = hyp2(gx - c.pos.x, gz - c.pos.z);
      const up = gy - c.pos.y;
      if (r > d.reach || r >= bd || up < DEADWEIGHT.gripLo || up > DEADWEIGHT.gripHi || chainTaken(h, d, i, ch)) continue;
      bd = r;
      best = d;
      bestChain = ch;
    }
  }
  if (!best) return null;
  const d = best;
  const gx = bestChain === 1 ? d.x : d.x2;
  const gy = bestChain === 1 ? d.y : d.y2;
  const gz = bestChain === 1 ? d.z : d.z2;
  prompt(h, 'Co-op: hang on the chain (deadweight)', gx, gy - 0.3, gz);
  if (!coopPressed) return false;
  run.dev = d;
  run.chain = bestChain;
  run.gx = gx;
  run.gy = gy;
  run.gz = gz;
  run.floor = c.pos.y;
  run.hangTop = Math.max(run.floor + DEADWEIGHT.footClear, gy - DEADWEIGHT.hangLen);
  run.sx = c.pos.x;
  run.sz = c.pos.z;
  run.hp = h.health();
  run.ovHang.yaw = Math.atan2(d.cx - gx, d.cz - gz);
  d.user = LOCAL_HANGER;
  h.partner = '';
  h.state = 'chainGrab';
  h.t = 0;
  h.count.offers++;
  put(h, run, run.ovHang, c.pos.x, c.pos.y, c.pos.z);
  return true;
}

/** The pass offer: a mate settled on a chain of a device whose door is held open, the player at the doorway. */
function passIdle(h: KitHost, run: DeadweightRun, coopPressed: boolean, free: boolean): boolean | null {
  const doors = doorList(h);
  if (!doors) return null;
  const c = h.g.player.controller;
  const list = h.devices.list;
  const ms = h.mates();
  for (let j = 0; j < ms.length; j++) {
    const m = ms[j]!;
    if (!hangingMate(m)) continue;
    const s = Math.round(m.s ?? 0);
    if (s <= 0) continue;
    const d0 = list[s - 1];
    if (!d0 || !isDeadweightDevice(d0) || d0.doorIdx < 0) continue;
    const d = d0;
    if (chainWithin(d, m.pos.x, m.pos.z, DEADWEIGHT.holdReach) === 0) continue;
    const door = doors[d.doorIdx];
    if (!door) continue;
    const l = dwLocal(d, c.pos.x, c.pos.z, run.loc);
    if (Math.abs(l.across) > DEADWEIGHT.passReach || Math.abs(l.along) > d.hw || Math.abs(c.pos.y - door.anchor.hinge.y) > DEADWEIGHT.passUp) continue;
    if (!free) return null;
    if (door.target !== 1 || door.open < DEADWEIGHT.passOpen) {
      prompt(h, 'Wait for the grate to lift', c.pos.x, c.pos.y + 1.8, c.pos.z);
      return false;
    }
    prompt(h, 'Co-op: duck under the grate (deadweight)', c.pos.x, c.pos.y + 1.8, c.pos.z);
    if (!coopPressed) return false;
    const m2 = d.hw - DEADWEIGHT.sideIn;
    run.dev = d;
    run.side = l.across === 0 ? 1 : Math.sign(l.across);
    run.lane = m2 > 0 ? Math.max(-m2, Math.min(m2, l.along)) : 0;
    run.sx = d.cx + l.across * d.nx + run.lane * d.tx;
    run.sz = d.cz + l.across * d.nz + run.lane * d.tz;
    const endAcross = -run.side * DEADWEIGHT.passOut;
    run.ex = d.cx + endAcross * d.nx + run.lane * d.tx;
    run.ez = d.cz + endAcross * d.nz + run.lane * d.tz;
    run.floor = c.pos.y;
    run.ovPass.yaw = Math.atan2(-run.side * d.nx, -run.side * d.nz);
    h.partner = m.id;
    h.state = 'grateUnder';
    h.t = 0;
    put(h, run, run.ovPass, c.pos.x, c.pos.y, c.pos.z);
    return true;
  }
  return null;
}

/** Inside the no-crush box of the doorway. */
function inDoorway(d: DeadweightDevice, x: number, z: number, loc: DwLocal): boolean {
  dwLocal(d, x, z, loc);
  return Math.abs(loc.across) < DEADWEIGHT.doorwayAcross && Math.abs(loc.along) < d.hw + 0.2;
}

/** The doorway is clear for the drop: no body, no live guard in the box, no mate passing, the own player not passing. */
function doorwayClear(h: KitHost, d: DeadweightDevice, ms: readonly TeamMate[], loc: DwLocal): boolean {
  if (h.state === 'grateUnder') return false;
  const c = h.g.player.controller;
  if (inDoorway(d, c.pos.x, c.pos.z, loc)) return false;
  for (let j = 0; j < ms.length; j++) {
    const m = ms[j]!;
    if (inDoorway(d, m.pos.x, m.pos.z, loc)) return false;
    if (passingMate(m) && hyp2(m.pos.x - d.cx, m.pos.z - d.cz) <= DEADWEIGHT.crossNear + DEADWEIGHT.passOut) return false;
  }
  const en = h.g.enemyMgr?.enemies;
  if (en) {
    for (let j = 0; j < en.length; j++) {
      const e = en[j]!;
      if (e.alive && inDoorway(d, e.pos.x, e.pos.z, loc)) return false;
    }
  }
  return true;
}

/** One player's crossing slot: its side updates near the doorway; a flip while the move holds the grate is a pass. */
function crossOne(h: KitHost, d: DeadweightDevice, slot: number, who: string, x: number, z: number, on: boolean, loc: DwLocal): void {
  const l = dwLocal(d, x, z, loc);
  const a = Math.abs(l.across);
  if (a < DEADWEIGHT.crossMin || a > DEADWEIGHT.crossNear || Math.abs(l.along) > d.hw + 0.2) return;
  const s = l.across > 0 ? 1 : -1;
  const prev = d.side[slot]!;
  d.side[slot] = s;
  if (!on || prev === 0 || prev === s || d.open !== 1 || who === d.lastHanger || d.lastHanger === '') return;
  kitDone(h.g, 'deadweight', d.id, who === LOCAL_HANGER ? undefined : who, d.lastHanger === LOCAL_HANGER ? undefined : d.lastHanger);
}

/** The host's crossing slots for one device (slot 0 ours, 1-4 mates by id). No allocation. */
function crossings(h: KitHost, d: DeadweightDevice, ms: readonly TeamMate[], on: boolean, loc: DwLocal): void {
  const c = h.g.player.controller;
  crossOne(h, d, 0, LOCAL_HANGER, c.pos.x, c.pos.z, on, loc);
  // a slot whose mate is gone is cleared
  for (let k = 0; k < MATE_SLOTS; k++) {
    const id = d.ids[k]!;
    if (id === '') continue;
    let here = false;
    for (let j = 0; j < ms.length && !here; j++) here = ms[j]!.id === id;
    if (!here) {
      d.ids[k] = '';
      d.side[k + 1] = 0;
    }
  }
  for (let j = 0; j < ms.length; j++) {
    const m = ms[j]!;
    let slot = -1;
    for (let k = 0; k < MATE_SLOTS && slot < 0; k++) if (d.ids[k] === m.id) slot = k;
    // a new mate takes a free slot on first sight
    for (let k = 0; k < MATE_SLOTS && slot < 0; k++) {
      if (d.ids[k] === '') {
        d.ids[k] = m.id;
        d.side[k + 1] = 0;
        slot = k;
      }
    }
    if (slot >= 0) crossOne(h, d, slot + 1, m.id, m.pos.x, m.pos.z, on, loc);
  }
}

/**
 * The host's rule, every fixed step on every page (nothing on a co-op client): per device, the hanger opens the door
 * after `lift`, nobody shuts it after `drop` with the doorway clear, and a pass under the held grate tells the mode.
 * Index loops over preallocated state: no allocation.
 */
export function deadweightHost(h: KitHost, run: DeadweightRun, dt: number): void {
  if (h.g.puppet) return;
  const doors = h.g.world?.doors;
  if (!doors) return;
  const list = h.devices.list;
  if (list.length === 0) return;
  const on = flags.kitMoves.has('deadweight');
  const ms = h.mates();
  for (let i = 0; i < list.length; i++) {
    const d0 = list[i]!;
    if (!isDeadweightDevice(d0) || d0.doorIdx < 0) continue;
    const d = d0;
    const door = doors.list[d.doorIdx];
    if (!door) continue;
    // 1. the hanger now
    let hanger = '';
    if (on) {
      if (h.state === 'chainHang' && run.dev === d) hanger = LOCAL_HANGER;
      else {
        for (let j = 0; j < ms.length; j++) {
          const m = ms[j]!;
          if (!hangingMate(m) || Math.round(m.s ?? 0) !== i + 1) continue;
          const ch = chainWithin(d, m.pos.x, m.pos.z, DEADWEIGHT.holdReach);
          if (ch === 0) continue;
          const up = (ch === 1 ? d.y : d.y2) - m.pos.y;
          if (up < DEADWEIGHT.holdLo || up > DEADWEIGHT.holdHi) continue;
          hanger = m.id;
          break;
        }
      }
    }
    if (hanger !== '') {
      // 2. held: open after the lift time (again if something else shut it while held)
      d.holdT += dt;
      d.freeT = 0;
      d.user = hanger;
      d.lastHanger = hanger;
      if (d.holdT >= DEADWEIGHT.lift && door.target === 0) {
        doors.setOpen(door, true);
        d.open = 1;
        d.opens++;
      }
    } else {
      // 3. nobody (or the id off): shut after the drop time, never on a body
      d.holdT = 0;
      d.user = '';
      if (d.open === 1) {
        d.freeT += dt;
        if (d.freeT >= DEADWEIGHT.drop && doorwayClear(h, d, ms, run.loc)) {
          doors.setOpen(door, false);
          d.open = 0;
          d.freeT = 0;
        }
      }
    }
    // 4. done: a pass under the held grate
    crossings(h, d, ms, on, run.loc);
  }
}

function hangStep(h: KitHost, run: DeadweightRun, coopPressed: boolean, bPressed: boolean): void {
  const c = h.g.player.controller;
  const B = DEADWEIGHT;
  switch (h.state) {
    case 'chainGrab': {
      const k = Math.min(1, h.t / B.grab);
      const kh = Math.min(1, h.t / (B.grab / 2));
      const ky = k * k * (3 - 2 * k);
      put(h, run, run.ovHang, run.sx + (run.gx - run.sx) * kh, run.floor + (run.hangTop - run.floor) * ky, run.sz + (run.gz - run.sz) * kh);
      h.prompt = null;
      if (k >= 1) {
        h.state = 'chainHang';
        h.t = 0;
      }
      return;
    }
    case 'chainHang': {
      const y = Math.max(run.floor + B.footClear, run.hangTop - B.sag * Math.min(1, h.t / B.sagTime));
      put(h, run, run.ovHang, run.gx, y, run.gz);
      prompt(h, 'Hanging on the chain: Co-op or B lets go', run.gx, run.gy - 0.3, run.gz);
      if (bPressed) c.swallowCrouch = true;
      const hp = h.health();
      const hurt = hp < run.hp;
      run.hp = hp;
      if (coopPressed || bPressed || hurt) {
        h.endWhy = hurt ? 'deadweight: hurt' : '';
        run.dropY = y;
        h.state = 'chainDrop';
        h.t = 0;
        h.prompt = null;
      }
      return;
    }
    case 'chainDrop': {
      const k = Math.min(1, h.t / B.chainDrop);
      put(h, run, run.ovHang, run.gx, run.dropY + (run.floor - run.dropY) * k, run.gz);
      h.prompt = null;
      if (k >= 1) h.end(false);
      return;
    }
  }
}

function passStep(h: KitHost, run: DeadweightRun): void {
  const k = Math.min(1, h.t / DEADWEIGHT.passTime);
  put(h, run, run.ovPass, run.sx + (run.ex - run.sx) * k, run.floor, run.sz + (run.ez - run.sz) * k);
  h.prompt = null;
  if (k >= 1) {
    h.endWhy = '';
    h.end(false);
  }
}

/** Check: no requests (local entry both roles); K0 refuses an off id before this. */
function checkDeadweight(): TeamDenial | null {
  return 'notOffering';
}

export const DEADWEIGHT_MOVE: KitMove<DeadweightRun> = {
  kind: 'deadweight',
  times: { chainGrab: DEADWEIGHT.grab, chainDrop: DEADWEIGHT.chainDrop, grateUnder: DEADWEIGHT.passTime },
  paired: false,
  claimsPoint: false,
  busyOffer: false,
  newRun,
  check: checkDeadweight,

  tick(h, run, dt) {
    deadweightHost(h, run, dt);
  },

  idle(h, run, coopPressed, free) {
    if (!flags.kitMoves.has('deadweight')) return null;
    const pass = passIdle(h, run, coopPressed, free);
    if (pass !== null) return pass;
    return free ? hangIdle(h, run, coopPressed) : null;
  },

  begin(h) {
    // the host never starts it (no requests)
    h.endWhy = 'deadweight: no start';
  },

  step(h, run, dt, coopPressed, bPressed) {
    h.t += dt;
    if (!run.dev) {
      h.endWhy = 'deadweight: no device';
      h.end(true);
      return;
    }
    // K1-3: moved by something else (a retry teleport, another override): ends at once, no drop phase
    if (moved(h, run)) {
      h.endWhy = 'deadweight: moved';
      h.end(true);
      return;
    }
    if (h.state === 'grateUnder') passStep(h, run);
    else hangStep(h, run, coopPressed, bPressed);
  },

  ended() {
    // no pair: nothing to end
  },

  end(_h, run) {
    const d = run.dev;
    if (d && d.user === LOCAL_HANGER) d.user = '';
    run.dev = null;
    run.ov = null;
  },

  wireS(h, run) {
    const d = run.dev;
    if (!d) return 0;
    const i = kitSpotIndex(h.devices.list, d.id);
    if (i < 0) return 0;
    return h.state === 'chainHang' || h.state === 'grateUnder' ? i + 1 : -(i + 1);
  },

  setupDevices(h, run, devices: KitDevices, level) {
    run.dev = null;
    run.ov = null;
    const spots = kitSpotsOf(level, 'deadweight');
    if (spots.length === 0) return;
    const doors = doorList(h);
    for (let i = 0; i < spots.length; i++) devices.add(newDeadweightDevice(spots[i]!, doors));
  },
};

registerKitMove(DEADWEIGHT_MOVE);
