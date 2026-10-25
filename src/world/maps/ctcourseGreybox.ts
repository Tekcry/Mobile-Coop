/**
 * (marlow-final greybox, draft) Greybox helpers for Marlow Yard's team-move set pieces (`docs/marlow-final/SPEC.md`
 * sections 8, 9 and 12; `docs/marlow-final/GREYBOX-HELPERS.md`). Pure and Babylon-free: each helper takes a few
 * numbers and returns plain data in the level builder's own shapes (box pieces, stairs, doors, manual ledges, course
 * devices and gates, lasers, scanners, cameras), plus the planned co-op grips (for the map's `COOP_LIPS`) and the
 * marked spots each move is done from. `applyGreybox` writes one into a `LevelBuilder`; the course data (devices,
 * gates) goes into the map's `CourseLayout` / `BayDef` by hand.
 *
 * Every height and distance is read from the game's tables (`TEAM`, `WALL_JUMP`, `MOVEMENT`, `GEARS`, `JAMMER`,
 * `SCANNER`, `PAIR_WINDOW`, `CAMERA`), never retuned (LD 12.1). Each helper throws when its numbers would break the
 * co-op-only property it exists for (as `validateCourse` does). Prototype starting values (G10).
 *
 * Frame: `at` (x, z) is the obstacle's origin and `facing` the route's direction across it (from the approach floor
 * to the far side). Local u runs along `facing`, local v along the obstacle (+z for an x facing, +x for a z facing).
 */
import { GEARS, MOVEMENT, TEAM, WALL_JUMP } from '../../config/movement';
import { hyp2 } from '../../core/mathx';
import { PAIR_WINDOW } from '../../config/course';
import { CAMERA } from '../../config/security';
import { JAMMER, LASER, type LaserDef } from '../../game/jammer';
import { SCANNER, type ScannerDef } from '../../game/scanners';
import type { CourseDevice, GateDef } from '../../game/course/courseDef';
import type { CameraDevice } from '../../security/data';
import type { BoxPiece, LevelBuilder } from '../levelBuilder';

/** The co-op lip height (m over its floor): the middle of G57's 4.3-4.5 band, as the current yard's `LEDGE`. */
export const COOP_LIP = 4.4;
/** LD 11.3: a co-op lip sits at least 0.5 m over the solo reach and within the boost. */
export const COOP_BAND = { min: WALL_JUMP.maxUp + 0.5, max: TEAM.boostMax } as const;
/** The booster's mark this far out from the lip's face (m): the current yard's tested `LEGUP_SPOT` standoff. */
export const LEGUP_STANDOFF = 0.5;
/**
 * (greybox tests) The booster's mark off a free-standing wall's face (m). From 0.5 m the boost search
 * (`findJumpTarget`: a lip under 0.8 m away in plan scores by the climb's steepness, a farther one by direction) takes
 * the FAR face's lip of a wall under 0.76 m thick (the 0.6 m A1 wall): the boosted player hangs on the yard side and
 * the near-side relay is lost. From 0.9 m both lips score by direction and the near one, closer, wins at any thickness.
 */
export const WALL_STANDOFF = 0.9;
/**
 * Keep-clear radius (m, plan) round a planned co-op grip on its approach side: nothing a player alone can stand on
 * (a top over 0.3 m, under the grip) inside it. Over the solo running-jump grab (`tests/helpers/soloJumpReach.ts`,
 * pinned by `tests/ctcourseGreybox.test.ts`) and the corner wall-jump reach. (greybox tests) 3.0 -> 4.7: the top-gear
 * running jump off a top just under a 4.4 m grip carries 4.62 m (off a 1.8 m crate 3.30 m), so 3.0 was short.
 */
export const GREY_KEEP_CLEAR = 4.7;
/**
 * (greybox tests) Keep-clear radius (m, plan) round a throw gateway's beam line on its approach side: nothing a player
 * alone can stand on (a top over 0.3 m) inside it. A top-gear running jump off a top carries the feet over the top
 * beam (1.45 m) across the beams' touch band (`LASER.reach`) from up to 3.97 m (a top just under the 4.8 m header; off a
 * 1.8 m drum stack 2.72 m), pinned by the greybox tests. From the floor the jump peaks under the top beam.
 */
export const BEAM_KEEP_CLEAR = 4.0;
/** The device / interactable reach (m, plan) from the feet (`Interactables.nearest`), and its height band (m). */
export const INTERACT_REACH = 1.8;
export const INTERACT_DY = 1.5;
/** One jam's blind window on a camera (s): the hold plus the reboot (`JAMMER`). */
export const JAM_WINDOW = JAMMER.useMax + JAMMER.reboot;
/** The fastest silent crouched gear (m/s, `GEARS.crouch[2]`; LD 12.1 silent bands): the jam relay's hop pace. */
export const SILENT_CROUCH = GEARS.crouch[2]!;
/** The fastest a player alone runs (m/s, the top standing gear). */
export const SOLO_RUN = Math.max(...GEARS.stand);
/** Scale-sheet stair: rise and run (m). */
export const STAIR_RISE = 0.165;
export const STAIR_RUN = 0.285;

const GREY = '#6a6f74';
const DARK = '#3f4348';
const WARN = '#c9a227';
const STEEL = '#8d949b';
const PANEL_DARK = '#20252b';

export type Facing = '+x' | '-x' | '+z' | '-z';

/** A box piece the helper emits (the builder's own shape) and what it is, for the element register. */
export interface GreyBox extends BoxPiece {
  tag: string;
}
/** `LevelBuilder.stairs` arguments. */
export interface GreyStair {
  tag: string;
  x: number;
  z: number;
  w: number;
  len: number;
  rise: number;
  steps: number;
  yaw: number;
  y: number;
}
/** `LevelBuilder.door` arguments, keyed by the course door id. */
export interface GreyDoor {
  id: string;
  hinge: [number, number, number];
  width: number;
  yaw: number;
  height: number;
  locked: boolean;
}
/** `LevelBuilder.ledge` arguments (a manual lip on a `noLedge` piece: a → b with the floor on its right). */
export interface GreyLedge {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  top: number;
}
/** A planned co-op grip (the shape the solo-reach tests take): the lip at `y`, its floor, the outward normal. */
export interface CoopLip {
  id: string;
  y: number;
  floor: number;
  a: { x: number; z: number };
  b: { x: number; z: number };
  n: { x: number; z: number };
}
/** Where a move is done from (feet), also drawn as a striped square. */
export interface GreySpot {
  kind: 'legUp' | 'relay' | 'throw' | 'runner' | 'landing' | 'hold' | 'rope' | 'jam' | 'scan' | 'press';
  x: number;
  y: number;
  z: number;
}

export interface Greybox {
  id: string;
  boxes: GreyBox[];
  stairs: GreyStair[];
  doors: GreyDoor[];
  ledges: GreyLedge[];
  devices: Record<string, CourseDevice>;
  gates: GateDef[];
  lips: CoopLip[];
  spots: GreySpot[];
  lasers: LaserDef[];
  scanners: ScannerDef[];
  cameras: CameraDevice[];
  /** The way back for a lone or downed player (LD 11.4 intent; SPEC section 12), for the register. */
  wayBack: string;
}

/** The local frame of an obstacle at `at` facing `facing`. */
export interface GreyFrame {
  /** Route direction (u) and the obstacle's run (v), world plan unit vectors. */
  u: { x: number; z: number };
  v: { x: number; z: number };
  /** World (x, z) of local (u, v). */
  p(u: number, v: number): [number, number];
  /** World plan size (sx, sz) of a local size (su, sv). */
  size(su: number, sv: number): [number, number];
  /** Yaw (rad, 0 = +z) of a direction (local du, dv). */
  yaw(du: number, dv: number): number;
  /** `LevelBuilder.door` yaw for a leaf along +v. */
  doorYaw: number;
}

export function greyFrame(at: { x: number; z: number }, facing: Facing): GreyFrame {
  const ux = facing === '+x' ? 1 : facing === '-x' ? -1 : 0;
  const uz = facing === '+z' ? 1 : facing === '-z' ? -1 : 0;
  const vx = uz !== 0 ? 1 : 0;
  const vz = ux !== 0 ? 1 : 0;
  return {
    u: { x: ux, z: uz },
    v: { x: vx, z: vz },
    p: (u, v) => [at.x + ux * u + vx * v, at.z + uz * u + vz * v],
    size: (su, sv) => (ux !== 0 ? [su, sv] : [sv, su]),
    yaw: (du, dv) => Math.atan2(ux * du + vx * dv, uz * du + vz * dv),
    doorYaw: ux !== 0 ? 0 : Math.PI / 2,
  };
}

/** An empty greybox and its local box / mark / device writers. */
function start(id: string, at: { x: number; z: number }, facing: Facing) {
  const f = greyFrame(at, facing);
  const g: Greybox = { id, boxes: [], stairs: [], doors: [], ledges: [], devices: {}, gates: [], lips: [], spots: [], lasers: [], scanners: [], cameras: [], wayBack: '' };
  /** A box centred at local (u, v), from `y0` up `h`, sized (su, sv). */
  const box = (tag: string, u: number, v: number, y0: number, su: number, sv: number, h: number, color: string, opts: { collide?: boolean; noLedge?: boolean; overhead?: boolean } = {}): GreyBox => {
    const [x, z] = f.p(u, v);
    const [sx, sz] = f.size(su, sv);
    const piece: GreyBox = { tag, c: [x, y0 + h / 2, z], s: [sx, h, sz], yaw: 0, pitch: 0, color, collide: opts.collide ?? true, visible: true };
    if (opts.noLedge) piece.noLedge = true;
    if (opts.overhead) piece.overhead = true;
    g.boxes.push(piece);
    return piece;
  };
  /** A marked spot and its striped square (2 cm paint, no collision: CT's marked spot). */
  const spot = (kind: GreySpot['kind'], u: number, v: number, y: number, paint = true): GreySpot => {
    const [x, z] = f.p(u, v);
    const s: GreySpot = { kind, x, y, z };
    g.spots.push(s);
    if (paint) box(`mark ${kind}`, u, v, y + 0.005, 1.0, 1.0, 0.02, WARN, { collide: false });
    return s;
  };
  const device = (key: string, u: number, v: number, y: number, du: number, dv: number, label: string): CourseDevice => {
    const [x, z] = f.p(u, v);
    const d: CourseDevice = { x, y, z, yaw: f.yaw(du, dv), label };
    g.devices[key] = d;
    return d;
  };
  /** A manual lip along local u = `u` from v0 to v1 at `top`, its normal pointing to -u (`out` = -1) or +u (+1). */
  const lip = (lipId: string, u: number, v0: number, v1: number, top: number, floor: number, out: 1 | -1): void => {
    let [ax, az] = f.p(u, v0);
    let [bx, bz] = f.p(u, v1);
    // makeLedge's normal is (tz, -tx): order a -> b so it points to the floor side
    const tx = bx - ax;
    const tz = bz - az;
    const nx = out * f.u.x;
    const nz = out * f.u.z;
    if (tz * nx - tx * nz < 0) [ax, az, bx, bz] = [bx, bz, ax, az];
    g.ledges.push({ ax, az, bx, bz, top });
    g.lips.push({ id: lipId, y: top, floor, a: { x: ax, z: az }, b: { x: bx, z: bz }, n: { x: nx, z: nz } });
  };
  return { f, g, box, spot, device, lip };
}

function checkLip(id: string, lip: number): void {
  if (lip < COOP_BAND.min - 1e-6 || lip > COOP_BAND.max + 1e-6) throw new Error(`${id}: co-op lip ${lip} m outside ${COOP_BAND.min}-${COOP_BAND.max} (LD 11.3)`);
}

/** Scale-sheet stair steps for a rise (count, rise each, run each). */
export function stairSteps(rise: number): { steps: number; rise: number; run: number; len: number } {
  const steps = Math.max(1, Math.round(rise / STAIR_RISE));
  return { steps, rise: rise / steps, run: STAIR_RUN, len: steps * STAIR_RUN };
}

// ---- 1. Boost wall: leg-up (and ledge relay) over a 4.4 m wall, a wicket bolted on the far side (A1, CR-S1) ----

export interface BoostWallOpts {
  id: string;
  /** Centre of the wall's footprint. */
  at: { x: number; z: number };
  facing: Facing;
  /** Wall length along v (m), centred; it must run wall to wall in the map (no way round). */
  span: number;
  lip?: number;
  thick?: number;
  /** The wicket's centre along v (m), its width; `null` = no wicket (then the map gives the way back). */
  wicket?: number | null;
  wicketW?: number;
  /** The booster's mark along v (m); default 3.5 m from the wicket. */
  spot?: number;
  color?: string;
}

/**
 * A free-standing boundary wall with its top at the co-op lip, a wicket door locked on the approach side and bolted on
 * the far side (`bolt` gate: a press from the far side opens it for good), and the leg-up mark on the approach side.
 * Both faces carry generated lips (the wall top is walkable: `thick` over `LEDGE.climbDepth`), so the boosted player
 * hangs and the ledge relay works there too. Way back: the wicket.
 */
export function boostWall(o: BoostWallOpts): Greybox {
  const lipY = o.lip ?? COOP_LIP;
  checkLip(o.id, lipY);
  const t = o.thick ?? 0.6;
  const w = o.wicketW ?? 1.2;
  const color = o.color ?? GREY;
  const { f, g, box, spot } = start(o.id, o.at, o.facing);
  const half = o.span / 2;
  const wv = o.wicket === undefined ? 0 : o.wicket;
  if (wv !== null) {
    if (Math.abs(wv) + w / 2 > half - 1.5) throw new Error(`${o.id}: wicket within 1.5 m of the wall's end (scale sheet 4)`);
    const g0 = wv - w / 2;
    const g1 = wv + w / 2;
    box('wall', 0, (-half + g0) / 2, 0, t, g0 + half, lipY, color);
    box('wall', 0, (g1 + half) / 2, 0, t, half - g1, lipY, color);
    // the wicket's head: door height to the lip, so the lip runs on over it
    box('wicket head', 0, wv, 2.1, t, w, lipY - 2.1, color);
    const [hx, hz] = f.p(0, g0);
    g.doors.push({ id: `${o.id}-wicket`, hinge: [hx, 0, hz], width: w, yaw: f.doorYaw, height: 2.1, locked: true });
    const [ax, az] = f.p(0, wv);
    g.gates.push({ kind: 'bolt', id: `g-${o.id}-wicket`, doorId: `${o.id}-wicket`, side: [f.u.x, f.u.z], at: [ax, az] });
  } else {
    box('wall', 0, 0, 0, t, o.span, lipY, color);
  }
  const sv = o.spot ?? (wv === null ? 0 : wv - 3.5 > -half + 1 ? wv - 3.5 : wv + 3.5);
  spot('legUp', -(t / 2 + WALL_STANDOFF), sv, 0);
  // the planned grips: both faces (approach and far side), the hands kept off the ends
  const [p0, p1] = [-half + 0.25, half - 0.25];
  g.lips.push(...lipsOf(f, o.id, t, p0, p1, lipY));
  g.wayBack = wv === null ? 'None in the helper: the map gives the far side its own way back.' : 'The wicket: a lone player on the far side unbolts it (bolt gate) and walks back.';
  return g;
}

/** The two generated face lips of a wall `t` thick along v (no manual ledge: the generator makes them). */
function lipsOf(f: GreyFrame, id: string, t: number, v0: number, v1: number, y: number): CoopLip[] {
  const near = (u: number, out: 1 | -1, name: string): CoopLip => {
    const [ax, az] = f.p(u, v0);
    const [bx, bz] = f.p(u, v1);
    return { id: `${id}-${name}`, y, floor: 0, a: { x: ax, z: az }, b: { x: bx, z: bz }, n: { x: out * f.u.x, z: out * f.u.z } };
  };
  return [near(-t / 2, -1, 'near'), near(t / 2, 1, 'far')];
}

// ---- 2. Co-op deck: leg-up / relay / two-person rope onto a 4.4 m deck, a stair at one end (A2, A6, A8) ----

export interface CoopDeckOpts {
  id: string;
  /** Centre of the deck's front (lip) edge. */
  at: { x: number; z: number };
  /** From the floor toward the deck (the deck lies on +u). */
  facing: Facing;
  span: number;
  depth: number;
  lip?: number;
  /** The open lip span along v [v0, v1] (the loading edge, SPEC P13); default the middle 4 m. */
  open?: [number, number];
  /** A solid edge screen (m) on the rest of the front edge (SPEC A2 / LD 16.5.3); 0 = none. */
  screen?: number;
  /** The stair down at the deck's 'start' (-v) or 'end' (+v) end, or none. */
  stair?: 'start' | 'end' | false;
  stairW?: number;
  /** The two-person rope's anchor along v (on the open span), or none. */
  rope?: number;
  /** The booster's mark along v; default the open span's middle. */
  spot?: number;
  color?: string;
}

/**
 * A raised deck (gallery, staging) as one solid block from the floor to the lip, every face `noLedge` but the open
 * span's lip (a manual ledge): no unplanned boost targets on its ends (LD 11.5). The rest of the front edge carries a
 * solid screen (occluder for the high route, SPEC P8). Optionally the two-person rope's holder strip and anchor plate
 * on the open span, and a scale-sheet stair down at one end (the way back: the map puts its foot past the exercise).
 */
export function coopDeck(o: CoopDeckOpts): Greybox {
  const lipY = o.lip ?? COOP_LIP;
  checkLip(o.id, lipY);
  const color = o.color ?? GREY;
  const half = o.span / 2;
  const [v0, v1] = o.open ?? [-2, 2];
  if (v0 < -half + 0.25 || v1 > half - 0.25 || v1 - v0 < 1.2) throw new Error(`${o.id}: open span [${v0}, ${v1}] not on the deck (or under 1.2 m)`);
  const { f, g, box, spot, lip } = start(o.id, o.at, o.facing);
  box('deck', o.depth / 2, 0, 0, o.depth, o.span, lipY, color, { noLedge: true });
  lip(`${o.id}-lip`, 0, v0, v1, lipY, 0, -1);
  const screen = o.screen ?? 1.2;
  if (screen > 0) {
    if (v0 > -half) box('edge screen', 0.05, (-half + v0) / 2, lipY, 0.1, v0 + half, screen, DARK, { noLedge: true });
    if (v1 < half) box('edge screen', 0.05, (v1 + half) / 2, lipY, 0.1, half - v1, screen, DARK, { noLedge: true });
  }
  spot('legUp', -LEGUP_STANDOFF, o.spot ?? (v0 + v1) / 2, 0);
  if (o.rope !== undefined) {
    if (o.rope < v0 + 0.5 || o.rope > v1 - 0.5) throw new Error(`${o.id}: rope ${o.rope} not on the open span`);
    if (lipY < TEAM.ropeMin || lipY > TEAM.ropeMax) throw new Error(`${o.id}: a ${lipY} m drop is outside the rope's ${TEAM.ropeMin}-${TEAM.ropeMax}`);
    spot('rope', 0.6, o.rope, lipY);
    box('rope anchor plate', 0.3, o.rope, lipY + 0.02, 0.3, 0.3, 0.03, STEEL, { collide: false });
    spot('runner', -0.6, o.rope, 0, false);
  }
  const end = o.stair ?? 'end';
  if (end) {
    const s = stairSteps(lipY);
    const sw = o.stairW ?? 1.2;
    if (sw > o.depth) throw new Error(`${o.id}: stair ${sw} m wider than the deck`);
    const sign = end === 'end' ? 1 : -1;
    // the flight runs off the deck's end along v and rises toward it, against the deck's back (away from the lip)
    const [x, z] = f.p(o.depth - sw / 2, sign * (half + s.len / 2));
    g.stairs.push({ tag: 'stair', x, z, w: sw, len: s.len, rise: lipY, steps: s.steps, yaw: f.yaw(0, -sign), y: 0 });
  }
  g.wayBack = end ? `The stair at the deck's ${end} end (${stairSteps(lipY).steps} risers of ${stairSteps(lipY).rise.toFixed(3)} m).` : 'None in the helper: the map gives the deck its own way down.';
  return g;
}

// ---- 3. Throw gateway: partner throw over IR beams, a far-side release (A5, A8 beam curtain, CR-S3) ----

export interface ThrowGatewayOpts {
  id: string;
  /** Centre of the gateway, on the beam line. */
  at: { x: number; z: number };
  facing: Facing;
  /** The opening's width along v (m), and the wall's whole length (wall to wall in the map). */
  gap?: number;
  span: number;
  /** The wall's height (to the set ceiling: no lip) and the gateway's header underside (m). */
  wallH?: number;
  header?: number;
  thick?: number;
  beams?: number[];
  /** The thrower's mark behind the beam line (m). */
  stand?: number;
  /** The release device (local u, v) on the far side, in sight across the beams. */
  release?: { u: number; v: number };
  color?: string;
}

/**
 * A wall to the ceiling (`noLedge`) with a gateway closed by an IR beam band (a `LaserDef`, `offFlag` = the release's
 * flag); the thrower's mark behind the line, the runner's start and the landing in front; the release switch on the
 * far side (`pickup` gate setting the flag). Way back: the release turns the beams off for good.
 */
export function throwGateway(o: ThrowGatewayOpts): Greybox {
  const gap = o.gap ?? 6;
  const wallH = o.wallH ?? 6;
  const header = o.header ?? 4.8;
  const t = o.thick ?? 0.3;
  const beams = o.beams ?? [0.35, 0.9, 1.45];
  const stand = o.stand ?? 1.2;
  const color = o.color ?? GREY;
  const half = o.span / 2;
  if (gap / 2 > half - 0.5) throw new Error(`${o.id}: gateway wider than the wall`);
  const { f, g, box, spot, device } = start(o.id, o.at, o.facing);
  box('wall', 0, -(half + gap / 2) / 2, 0, t, half - gap / 2, wallH, color, { noLedge: true });
  box('wall', 0, (half + gap / 2) / 2, 0, t, half - gap / 2, wallH, color, { noLedge: true });
  if (header < wallH) box('gateway header', 0, 0, header, t, gap, wallH - header, color, { noLedge: true, overhead: true });
  const [x1, z1] = f.p(0, -gap / 2);
  const [x2, z2] = f.p(0, gap / 2);
  const flag = `${o.id}-release`;
  g.lasers.push({ id: `laser-${o.id}`, x1, z1, x2, z2, ys: beams, label: `${o.id} beams`, offFlag: flag });
  spot('throw', -stand, 0, 0);
  spot('runner', -stand - 1.0, 0, 0, false);
  spot('landing', TEAM.throwDist - stand, 0, 0, false);
  const rel = o.release ?? { u: TEAM.throwDist - stand + 3, v: 0 };
  // (greybox tests) a player alone at the beams (feet just off their touch band) must not reach the release
  if (rel.u + LASER.reach < INTERACT_REACH + 0.05) throw new Error(`${o.id}: the release at u ${rel.u} is in reach (${INTERACT_REACH} m) from the near side of the beams`);
  device(`sw-${o.id}-release`, rel.u, rel.v, 1.2, -1, 0, 'Beam release');
  g.gates.push({ kind: 'pickup', id: `g-${o.id}-release`, switchId: `sw-${o.id}-release`, flag, perPlayer: false });
  spot('press', rel.u - 0.6, rel.v, 0, false);
  g.wayBack = 'The far-side release turns the beams off for good; the thrower walks through.';
  return g;
}

// ---- 4. Hang plate: hang-down through a gland plate into a closed cage (A6, CR-S10) ----

export interface HangPlateOpts {
  id: string;
  /** Centre of the cage (the bridge slab over it). */
  at: { x: number; z: number };
  /** The holder's facing toward the plate (the holder stands on -u of it). */
  facing: Facing;
  /** Deck top over the floor (m) and the slab's thickness. */
  deck?: number;
  slab?: number;
  /** The cage's outer size (u, v) and the slab's overhang past it (m). */
  cage?: [number, number];
  overhang?: number;
  /** The plate's opening (m, square): under a body's width so nobody drops through it. */
  hole?: number;
  /** (greybox tests) The drive panel's hold (s, SPEC N4: `CourseDevice.hold`); 0 = a tap. */
  hold?: number;
  color?: string;
}

/**
 * A bridge slab (`noLedge`: its edges are the map's) at the deck height over a mesh cage closed to the slab's underside,
 * a plate-sized opening over the cage, the drive panel on a cabinet inside (out of reach from outside the cage and from
 * the deck), the holder's mark beside the opening, the cage door locked with an `egress` exit release on the cabinet's
 * back (also out of reach from outside). The panel is a `pickup` gate (flag `<id>-done`) held `hold` s (N4). Throws
 * when the cage is too small to keep both devices out of reach from outside (at least 3.74 m along u, 3.1 m along v).
 * Way back: a dropped player presses the panel from the floor, then the exit release, and leaves by the cage door.
 */
export function hangPlate(o: HangPlateOpts): Greybox {
  const deck = o.deck ?? COOP_LIP;
  const slab = o.slab ?? 0.4;
  const [cu, cv] = o.cage ?? [4.2, 4.2];
  const over = o.overhang ?? 0.6;
  const hole = o.hole ?? 0.55;
  const color = o.color ?? DARK;
  if (hole >= 2 * MOVEMENT.radius) throw new Error(`${o.id}: a ${hole} m plate passes a body (radius ${MOVEMENT.radius})`);
  if (deck - TEAM.hangDrop < 1.6 + 0.05) throw new Error(`${o.id}: deck ${deck} m: the cabinet would be inside the hang's drop probe`);
  const { g, box, spot, device } = start(o.id, o.at, o.facing);
  // the plate: 0.8 m toward the holder from the cage centre (the cabinet's face is in the hanger's reach)
  const hu = -0.8;
  const h2 = hole / 2;
  const su = cu + 2 * over;
  const sv = cv + 2 * over;
  const y0 = deck - slab;
  const uLo = -su / 2;
  const uHi = su / 2;
  box('bridge slab', (uLo + hu - h2) / 2, 0, y0, hu - h2 - uLo, sv, slab, color, { noLedge: true, overhead: true });
  box('bridge slab', (hu + h2 + uHi) / 2, 0, y0, uHi - hu - h2, sv, slab, color, { noLedge: true, overhead: true });
  box('bridge slab', hu, (-sv / 2 - h2) / 2, y0, hole, sv / 2 - h2, slab, color, { noLedge: true, overhead: true });
  box('bridge slab', hu, (sv / 2 + h2) / 2, y0, hole, sv / 2 - h2, slab, color, { noLedge: true, overhead: true });
  // the tell: a striped frame round the plate and the holder's square beside it, the plate's lifted cover
  box('plate frame', hu, 0, deck + 0.005, hole + 0.2, hole + 0.2, 0.01, WARN, { collide: false });
  spot('hold', hu - 0.7, 0, deck);
  box('plate cover', hu, hole + 0.2, deck, 0.55, 0.55, 0.04, STEEL, { collide: false });
  // the cage: 0.1 m mesh walls from the floor to the slab's underside (closed: no top to climb into), door on +u
  const wt = 0.1;
  const dw = 1.2;
  const wallH = y0;
  box('cage wall', -cu / 2 + wt / 2, 0, 0, wt, cv, wallH, STEEL, { noLedge: true });
  box('cage wall', 0, -cv / 2 + wt / 2, 0, cu - 2 * wt, wt, wallH, STEEL, { noLedge: true });
  box('cage wall', 0, cv / 2 - wt / 2, 0, cu - 2 * wt, wt, wallH, STEEL, { noLedge: true });
  // (greybox tests) the door wall's pieces run to the corners (they stopped `wt` short: a 0.1 m open corner post)
  box('cage wall', cu / 2 - wt / 2, (-cv / 2 - dw / 2) / 2, 0, wt, cv / 2 - dw / 2, wallH, STEEL, { noLedge: true });
  box('cage wall', cu / 2 - wt / 2, (cv / 2 + dw / 2) / 2, 0, wt, cv / 2 - dw / 2, wallH, STEEL, { noLedge: true });
  box('cage door head', cu / 2 - wt / 2, 0, 2.1, wt, dw, wallH - 2.1, STEEL, { noLedge: true });
  const gf = greyFrame(o.at, o.facing);
  const [hx, hz] = gf.p(cu / 2 - wt / 2, -dw / 2);
  g.doors.push({ id: `${o.id}-cage`, hinge: [hx, 0, hz], width: dw, yaw: gf.doorYaw, height: 2.1, locked: true });
  // (greybox tests) the exit release on the cabinet's back (door side), not by the door: course devices have no side
  // and `Interactables.nearest` reaches through mesh, so a bar by the door was pressed from outside (a solo way in)
  device(`sw-${o.id}-exit`, 0.32, 0, 1.1, 1, 0, 'Exit release (push)');
  g.gates.push({ kind: 'egress', id: `g-${o.id}-exit`, switchId: `sw-${o.id}-exit`, doorIds: [`${o.id}-cage`] });
  // the drive cabinet at the cage centre, its panel on the face toward the plate
  box('drive cabinet', 0, 0, 0, 0.6, 0.8, 1.6, PANEL_DARK, { noLedge: true });
  const panel = device(`sw-${o.id}-panel`, -0.32, 0, 1.2, -1, 0, 'Drive panel (hang down through the plate)');
  const hold = o.hold ?? 3;
  if (hold > 0) panel.hold = hold;
  // (greybox tests) both devices out of reach from any body outside the cage (centre a radius off the outer face)
  for (const [du, dv] of [[-0.32, 0], [0.32, 0]] as const) {
    const out = Math.min(cu / 2 - Math.abs(du), cv / 2 - Math.abs(dv)) + MOVEMENT.radius;
    if (out < INTERACT_REACH + 0.05) throw new Error(`${o.id}: a ${cu} x ${cv} m cage puts a device ${out.toFixed(2)} m from a body outside (reach ${INTERACT_REACH})`);
  }
  g.gates.push({ kind: 'pickup', id: `g-${o.id}-panel`, switchId: `sw-${o.id}-panel`, flag: `${o.id}-done`, perPlayer: false });
  g.wayBack = "A dropped player presses the panel from the cage floor, then the exit release on the cabinet's back (egress), and leaves by the cage door.";
  return g;
}

// ---- 5. Sync station: paired scanners or a pair gate, two panels apart (A7 cage, A8 time locks, CR-S20) ----

export interface SyncStationOpts {
  id: string;
  kind: 'scan' | 'pair';
  /** Each panel's mounting point and the direction it faces (yaw, rad, 0 = +z). */
  a: { x: number; z: number; yaw: number };
  b: { x: number; z: number; yaw: number };
  y?: number;
  /** The shortest walk between the two (m) when a divider makes it longer than the straight line; default straight. */
  walk?: number;
  /** The pair gate's door (kind 'pair' only). */
  doorId?: string;
}

/** The least panel spacing (m) a lone player cannot serve: scanners (stay within reach of each) or a pair gate (run between inside the window). */
export function syncMinGap(kind: 'scan' | 'pair'): number {
  return kind === 'scan' ? 2 * SCANNER.reach + 2 * MOVEMENT.radius : 2 * INTERACT_REACH + SOLO_RUN * PAIR_WINDOW;
}

/**
 * Two panels (0.9 m housings on their walls) and their pairing: a `ScannerDef` (2 s hacks inside 1.5 s, G131) or a
 * `pair` gate (two presses inside `PAIR_WINDOW`), flag `<id>-sync`. Throws when the panels sit close enough for one
 * player. The scanners need SPEC N6 for a second pair on one map. Way back: ground level both sides.
 */
export function syncStation(o: SyncStationOpts): Greybox {
  const y = o.y ?? 1.2;
  const d = Math.max(hyp2(o.b.x - o.a.x, o.b.z - o.a.z), o.walk ?? 0);
  const min = syncMinGap(o.kind);
  // (greybox tests) strict: at exactly the pair minimum a run fits the window to the frame (`pressPair` takes <=)
  if (!(d > min + 1e-6)) throw new Error(`${o.id}: panels ${d.toFixed(2)} m apart, under ${min.toFixed(2)} (one player could serve both)`);
  const g: Greybox = { id: o.id, boxes: [], stairs: [], doors: [], ledges: [], devices: {}, gates: [], lips: [], spots: [], lasers: [], scanners: [], cameras: [], wayBack: 'Both panels are on ground level, open both ways.' };
  const flag = `${o.id}-sync`;
  const label = o.kind === 'scan' ? 'Terminal (hack with your partner)' : 'Plate (press with your partner)';
  for (const [k, p] of [['a', o.a], ['b', o.b]] as const) {
    const key = `sw-${o.id}-${k}`;
    g.devices[key] = { x: p.x, y, z: p.z, yaw: p.yaw, label: `${label} ${k.toUpperCase()}` };
    const sx = Math.abs(Math.cos(p.yaw)) > 0.5 ? 0.9 : 0.08;
    const sz = Math.abs(Math.cos(p.yaw)) > 0.5 ? 0.08 : 0.9;
    g.boxes.push({ tag: `panel ${k}`, c: [p.x - Math.sin(p.yaw) * 0.2, y + 0.2, p.z - Math.cos(p.yaw) * 0.2], s: [sx, 0.9, sz], yaw: 0, pitch: 0, color: PANEL_DARK, collide: false, visible: true });
    g.spots.push({ kind: o.kind === 'scan' ? 'scan' : 'press', x: p.x + Math.sin(p.yaw) * 0.6, y: 0, z: p.z + Math.cos(p.yaw) * 0.6 });
  }
  if (o.kind === 'scan') g.scanners.push({ id: `sc-${o.id}`, a: `sw-${o.id}-a`, b: `sw-${o.id}-b`, flag });
  else g.gates.push({ kind: 'pair', id: `g-${o.id}`, a: `sw-${o.id}-a`, b: `sw-${o.id}-b`, flag, ...(o.doorId ? { doorId: o.doorId } : {}) });
  return g;
}

// ---- 6. Jam relay corridor: a camera at the far end, door-reveal recesses one jam apart (A3, E5, CR-S13) ----

export interface JamRelayOpts {
  id: string;
  /** The corridor's start (its near mouth, on the centre line). */
  at: { x: number; z: number };
  /** Along the corridor, toward the camera. */
  facing: Facing;
  length: number;
  width?: number;
  height?: number;
  /** Recesses on the +v (1) or -v (-1) wall. */
  side?: 1 | -1;
  recessDepth?: number;
  recessW?: number;
  camY?: number;
  color?: string;
}

/** The longest hop (m) a runner makes inside one jam at the silent crouch, with a fifth spare for the start. */
export const JAM_HOP = 0.8 * JAM_WINDOW * SILENT_CROUCH;

/**
 * A corridor (walls `noLedge`; the map adds its ceiling) with an IR camera at the far end looking back down it, and
 * door-reveal recesses on one wall so no hop is longer than `JAM_HOP`; the jam posts in the near and far lobbies are in
 * the jammer's range. One jam never covers a lone player: the jammer must stand still (`JAMMER.stillSpeed`). Way back:
 * the corridor itself (the A3 send-back returns a seen player to the near lobby).
 */
export function jamRelay(o: JamRelayOpts): Greybox {
  const w = o.width ?? 3.5;
  const h = o.height ?? 3.0;
  const side = o.side ?? 1;
  const rd = o.recessDepth ?? 1.0;
  const rw = o.recessW ?? 1.4;
  const camY = o.camY ?? 2.8;
  const color = o.color ?? GREY;
  if (camY < CAMERA.mountMin || camY > CAMERA.mountMax) throw new Error(`${o.id}: camera at ${camY} m outside ${CAMERA.mountMin}-${CAMERA.mountMax}`);
  if (o.length + 1 > JAMMER.range) throw new Error(`${o.id}: the near post is over the jammer's ${JAMMER.range} m from the camera`);
  const { f, g, box, spot } = start(o.id, o.at, o.facing);
  // the recesses one `JAM_HOP` or less apart along the corridor, and (greybox tests) every real leg inside one blind
  // window at the silent crouch: along the corridor a body off the recess wall, then in to the hide spot
  const hideU = rw / 2 - MOVEMENT.radius - 0.05;
  const lane = w / 2 - MOVEMENT.radius;
  const inset = rd / 2 + MOVEMENT.radius;
  const longest = (k: number): number => {
    if (k === 1) return o.length;
    const s = o.length / k;
    return Math.max(hyp2(s + hideU, lane) + inset, s + 2 * inset, hyp2(s - hideU, lane) + inset);
  };
  let n = Math.max(1, Math.ceil(o.length / JAM_HOP));
  while (n > 1 && longest(n) > JAM_WINDOW * SILENT_CROUCH) n++;
  const rec: number[] = [];
  for (let k = 1; k < n; k++) rec.push((o.length * k) / n);
  // the plain wall and the recess wall (gaps at the recesses, each recess a reveal with a back and two cheeks)
  box('corridor wall', o.length / 2, -side * (w / 2 + 0.15), 0, o.length, 0.3, h, color, { noLedge: true });
  let u = 0;
  for (const r of rec) {
    box('corridor wall', (u + r - rw / 2) / 2, side * (w / 2 + 0.15), 0, r - rw / 2 - u, 0.3, h, color, { noLedge: true });
    box('recess back', r, side * (w / 2 + rd + 0.15), 0, rw + 0.6, 0.3, h, color, { noLedge: true });
    box('recess cheek', r - rw / 2 - 0.15, side * (w / 2 + rd / 2), 0, 0.3, rd, h, color, { noLedge: true });
    box('recess cheek', r + rw / 2 + 0.15, side * (w / 2 + rd / 2), 0, 0.3, rd, h, color, { noLedge: true });
    // (greybox tests) the hide spot against the camera-side cheek: a body in the recess's middle showed its edge to the
    // camera past that cheek (a 19 m corridor's second recess)
    spot('runner', r + hideU, side * (w / 2 + rd / 2), 0);
    u = r + rw / 2;
  }
  box('corridor wall', (u + o.length) / 2, side * (w / 2 + 0.15), 0, o.length - u, 0.3, h, color, { noLedge: true });
  const [cx, cz] = f.p(o.length - 0.4, 0);
  const deg = (f.yaw(-1, 0) * 180) / Math.PI;
  const facingDeg = (deg + 360) % 360;
  g.cameras.push({ id: `cam-${o.id}`, kind: 'camera', level: 'ground', at: [cx, cz], y: camY, facing: facingDeg, sweep: [facingDeg - 8, facingDeg + 8], aim: Math.min(CAMERA.range, Math.max(CAMERA.aimMin, o.length / 2)), reason: `Training camera for the ${o.id} jam relay corridor` });
  spot('jam', -1, 0, 0);
  spot('jam', o.length + 1, 0, 0);
  g.wayBack = 'The corridor is ground level both ways; the A3 send-back returns a seen player to the near lobby.';
  return g;
}

// ---- writing a greybox into the level ----

/**
 * Write a greybox's level pieces into the builder (boxes, `noLedge` / `overhead` marks, stairs, manual ledges, doors)
 * and return the door anchor ids by course id. Devices, gates, lasers, scanners and cameras are data for the map's
 * `CourseLayout`, `BayDef.gates` and `MapLayout`.
 */
export function applyGreybox(b: LevelBuilder, g: Greybox): Record<string, number> {
  for (const p of g.boxes) {
    const from = b.boxes.length;
    b.box(p.c[0], p.c[1], p.c[2], p.s[0], p.s[1], p.s[2], p.color, p.yaw, p.pitch, p.collide, p.visible ?? true);
    if (p.noLedge || p.overhead) b.mark(from, { ...(p.noLedge ? { noLedge: true } : {}), ...(p.overhead ? { overhead: true } : {}) });
  }
  for (const s of g.stairs) b.stairs(s.x, s.z, s.w, s.len, s.rise, s.steps, GREY, s.yaw, s.y);
  for (const l of g.ledges) b.ledge(l.ax, l.az, l.bx, l.bz, l.top);
  const doors: Record<string, number> = {};
  for (const d of g.doors) doors[d.id] = b.door(d.hinge[0], d.hinge[1], d.hinge[2], d.width, d.yaw, { height: d.height, locked: d.locked }).id;
  return doors;
}

// ---- a floor slab with holes (J14 re-plan) ----

/** A rectangular floor hole in world metres: [x0, z0, x1, z1]. */
export type FloorHole = readonly [number, number, number, number];

/**
 * (J14 S0, from `bunkerUpper.ts` `slabWithHoles`) A floor slab over the world rect (x0, z0)-(x1, z1), top at `y`, with
 * rectangular holes left open. The slab is cut on the hole edges into solid cells, merged along z per x strip, so every
 * piece is one `b.floor` (0.4 thick). With no holes it is one piece the size of the rect, the same box as `b.floor`.
 */
export function slabWithHoles(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y: number, holes: readonly FloorHole[], color: string): void {
  const xs = [x0, x1];
  const zs = [z0, z1];
  for (const h of holes) {
    xs.push(h[0], h[2]);
    zs.push(h[1], h[3]);
  }
  const ux = [...new Set(xs)].filter((v) => v >= x0 && v <= x1).sort((p, q) => p - q);
  const uz = [...new Set(zs)].filter((v) => v >= z0 && v <= z1).sort((p, q) => p - q);
  for (let i = 0; i + 1 < ux.length; i++) {
    const ax = ux[i]!;
    const bx = ux[i + 1]!;
    const mx = (ax + bx) / 2;
    let run = -1;
    for (let j = 0; j < uz.length; j++) {
      const mz = j + 1 < uz.length ? (uz[j]! + uz[j + 1]!) / 2 : NaN;
      const solid = j + 1 < uz.length && !holes.some((h) => mx > h[0] && mx < h[2] && mz > h[1] && mz < h[3]);
      if (solid && run < 0) run = j;
      if (!solid && run >= 0) {
        const za = uz[run]!;
        const zb = uz[j]!;
        b.floor(mx, (za + zb) / 2, bx - ax, zb - za, color, y);
        run = -1;
      }
    }
  }
}
