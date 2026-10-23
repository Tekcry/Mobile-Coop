/**
 * The held pistol jammer, the laser device and the camera pocket (CT prototype B3, DECISIONS G152 / G125). Pure (no
 * Babylon / DOM), unit-tested. Every number is a prototype starting value (G10).
 *
 * The jammer: drawn pistol, hold the co-op button on one camera, laser or light while aiming. (marlow-jammer, Michael
 * 2026-10-21 items 7 and 8; A3, J1) Each player jams for at most `JAMMER.useMax` seconds, then cools down for
 * `JAMMER.cooldown`; letting go early (or moving: the stand-still rule) also starts the cooldown. A jammed device runs
 * its own timeline (`DevJam`): jammed while someone holds it, then it recovers (a camera reboots 1.5 s, a light stays off
 * 4 s and flickers back on) and nobody can jam it again until it is back. The 20 s charge model (drain / refill /
 * minStart) is gone (J1; undo: restore it here).
 */
import { hyp2, hyp3 } from '../core/mathx';

export const JAMMER = {
  /** (J1) Seconds one jam lasts at most. */
  useMax: 5,
  /** (J1) Seconds after a jam ends (the cap, a release, a move) before that player can jam again. */
  cooldown: 5,
  /** (A3) Seconds a camera (or a laser power panel, sector-fixes P) takes to come back online after its jam; it cannot
   *  be jammed meanwhile. */
  reboot: 1.5,
  /** Horizontal speed (m/s) above which the player is moving and the jam breaks. */
  stillSpeed: 0.45,
  /** Reach to a target (m). */
  range: 20,
  /** Aim cone half-angle (rad) a target must sit inside to be picked (about 9 deg). */
  cone: 0.16,
  /** A target the aim has a clear line to: a static hit closer than this to the target (m) counts as clear. */
  losSlack: 0.4,
  /** A client's intent is dropped after this long without a heartbeat (s); the client sends every `heartbeat`. */
  stale: 0.7,
  heartbeat: 0.25,
  /** (jammer-fixes) The host takes a client's claimed camera eye (the `jam` message's `e`) only this close to the
   *  client's head (m) and with a clear static line between them; otherwise it checks from the head. The settled pistol
   *  aim puts the eye about 0.5 m from the head (`boomAds` 0.4, `shoulderAds` 0.3). */
  eyeTol: 1.5,
  /** (jammer-fixes) Slack (m) on the head-to-eye line: a static hit closer than this to the eye still counts as clear. */
  eyeSlack: 0.1,
} as const;

/** (item 8) A jammed light's timeline: a flicker to off as the jam starts, off while jammed, off `offHold` after the
 *  release, then a flicker back on. The flicker toggles at `edges` (s, irregular), an even count: it ends as it began. */
export const JAM_LIGHT = {
  flickerOff: 0.5,
  offHold: 4,
  flickerOn: 0.5,
  edges: [0.06, 0.11, 0.21, 0.26, 0.37, 0.44] as readonly number[],
} as const;

/** One player's jammer. */
export interface JamState {
  /** Jamming now. */
  active: boolean;
  /** Seconds into the current jam. */
  use: number;
  /** Cooldown seconds left (0: ready). */
  cool: number;
}

export function newJam(): JamState {
  return { active: false, use: 0, cool: 0 };
}

/** Seconds of jam left now: the rest of the current jam, the full `useMax` when ready, 0 while cooling down. */
export function jamLeft(s: JamState): number {
  if (s.active) return Math.max(0, JAMMER.useMax - s.use);
  return s.cool > 0 ? 0 : JAMMER.useMax;
}

/**
 * One step: `want` = the trigger is held on a target that may be jammed, `speed` the player's horizontal speed (m/s).
 * Returns true while the jam is on. A jam ends at `useMax`, on a release or on a move; each end starts the cooldown, and
 * no jam starts while it runs.
 */
export function stepJam(s: JamState, want: boolean, speed: number, dt: number): boolean {
  const ok = want && speed <= JAMMER.stillSpeed;
  if (s.active) {
    if (ok) {
      s.use += dt;
      if (s.use < JAMMER.useMax - 1e-6) return true;
    }
    s.active = false;
    s.use = 0;
    s.cool = JAMMER.cooldown;
    return false;
  }
  if (s.cool > 0) {
    s.cool = Math.max(0, s.cool - dt);
    return false;
  }
  if (!ok) return false;
  s.active = true;
  s.use = dt;
  return true;
}

/** A device's jam phase: idle (working), jammed (someone holds it), recovering (back soon, cannot be jammed). */
export const DEV_IDLE = 0;
export const DEV_JAMMED = 1;
export const DEV_RECOVER = 2;
export type DevPhase = typeof DEV_IDLE | typeof DEV_JAMMED | typeof DEV_RECOVER;

/** One jam target's timeline. */
export interface DevJam {
  ph: DevPhase;
  /** Seconds in the phase. */
  t: number;
}

export function newDevJam(): DevJam {
  return { ph: DEV_IDLE, t: 0 };
}

/** Seconds a device of `kind` takes to recover after its jam (a light: the 4 s off and the flicker back on). */
export function recoverTime(kind: JamTarget['kind']): number {
  return kind === 'light' ? JAM_LIGHT.offHold + JAM_LIGHT.flickerOn : JAMMER.reboot;
}

/** Advance a device's timeline by `dt` with `jammed` = someone jams it now. Returns true when the phase changed. */
export function stepDevJam(d: DevJam, jammed: boolean, kind: JamTarget['kind'], dt: number): boolean {
  if (jammed) {
    if (d.ph === DEV_JAMMED) {
      d.t += dt;
      return false;
    }
    d.ph = DEV_JAMMED;
    d.t = 0;
    return true;
  }
  if (d.ph === DEV_JAMMED) {
    d.ph = DEV_RECOVER;
    d.t = 0;
    return true;
  }
  if (d.ph === DEV_RECOVER) {
    d.t += dt;
    if (d.t >= recoverTime(kind) - 1e-6) {
      d.ph = DEV_IDLE;
      d.t = 0;
      return true;
    }
  }
  return false;
}

/** Client: advance a mirrored timeline between the host's messages (it never starts or ends a jam itself). */
export function advanceDevJam(d: DevJam, kind: JamTarget['kind'], dt: number): void {
  if (d.ph === DEV_IDLE) return;
  d.t += dt;
  if (d.ph === DEV_RECOVER && d.t >= recoverTime(kind) - 1e-6) {
    d.ph = DEV_IDLE;
    d.t = 0;
  }
}

/** A flicker `t` s in: lit or not; it starts lit (`startOn`) or dark and toggles at each of `JAM_LIGHT.edges`. */
export function flickerLit(t: number, startOn: boolean): boolean {
  const e = JAM_LIGHT.edges;
  let n = 0;
  for (let i = 0; i < e.length; i++) if (t >= e[i]!) n++;
  return (n % 2 === 0) === startOn;
}

/** (item 8) Is a jammed light lit now: one function of its timeline, for the bake / meter / guards and the picture alike. */
export function lightLit(d: DevJam): boolean {
  if (d.ph === DEV_IDLE) return true;
  if (d.ph === DEV_JAMMED) return d.t < JAM_LIGHT.flickerOff ? flickerLit(d.t, false) : false;
  if (d.t < JAM_LIGHT.offHold) return false;
  return flickerLit(d.t - JAM_LIGHT.offHold, true);
}

/** (jammer-fixes) What a light's jam driver needs from the light registry (`LightRegistry` has these). */
export interface JamLights {
  jamStart(id: number): void;
  jamLit(id: number, lit: boolean): void;
  jamEnd(id: number): void;
}

/**
 * (jammer-fixes) Put a light's jam timeline on the registry (host and client alike): a jam starts, flickers, ends. At
 * the end the light takes the state its switches / EMP / shots give it NOW (the registry's base), never its state at
 * the jam's start. `was`: the phase the light had the last call. No allocation.
 */
export function applyJamLight(reg: JamLights, id: number, d: DevJam, was: DevPhase): void {
  if (d.ph === DEV_IDLE) {
    if (was !== DEV_IDLE) reg.jamEnd(id);
    return;
  }
  if (was === DEV_IDLE) reg.jamStart(id);
  reg.jamLit(id, lightLit(d));
}

/**
 * (jammer-fixes) The host's line-of-sight origin for a client's jam: the client's claimed camera eye when it is within
 * `JAMMER.eyeTol` of the client's head and `clear(head, eye)` (a static line) holds; otherwise the head. Writes the origin
 * into `out` and returns true when the eye was taken. `eye` null: no claim (the head). No allocation.
 */
export function jamOrigin(
  hx: number,
  hy: number,
  hz: number,
  eye: readonly [number, number, number] | null | undefined,
  clear: (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => boolean,
  out: { x: number; y: number; z: number },
): boolean {
  out.x = hx;
  out.y = hy;
  out.z = hz;
  if (!eye) return false;
  const ex = eye[0];
  const ey = eye[1];
  const ez = eye[2];
  if (hyp3(ex - hx, ey - hy, ez - hz) > JAMMER.eyeTol) return false;
  if (!clear(hx, hy, hz, ex, ey, ez)) return false;
  out.x = ex;
  out.y = ey;
  out.z = ez;
  return true;
}

/** The jammer's HUD line: the jam's seconds left, the cooldown, a refused target, or ready on a target ('' = hidden). */
export function jamHudText(s: JamState, pick: boolean, pickRecovering: boolean): string {
  if (s.active) return `JAMMING ${jamLeft(s).toFixed(1)} s`;
  if (s.cool > 0) return `JAMMER COOLDOWN ${s.cool.toFixed(1)} s`;
  if (pick && pickRecovering) return 'TARGET REBOOTING';
  if (pick) return 'JAMMER READY: hold Co-op, stand still';
  return '';
}

/** A thing the jammer can be pointed at. (sector-fixes P, A1) Lasers are jammed at their power panel ('panel'); the
 *  'laser' kind stays for the undo (per-laser jam targets) and reboots like a panel. */
export interface JamTarget {
  id: string;
  kind: 'camera' | 'laser' | 'light' | 'panel';
  x: number;
  y: number;
  z: number;
}

/**
 * The target nearest the aim line: inside `range` and the `cone` around the unit direction (dx, dy, dz) from the eye
 * (ox, oy, oz), not refused by `skip` (a light switched off). Returns its index in `targets`, or -1.
 */
export function pickJamTarget(
  targets: readonly JamTarget[],
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  range: number = JAMMER.range,
  cone: number = JAMMER.cone,
  skip: ((t: JamTarget) => boolean) | null = null,
): number {
  let best = -1;
  let bestA = cone;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]!;
    if (skip && skip(t)) continue;
    const vx = t.x - ox;
    const vy = t.y - oy;
    const vz = t.z - oz;
    const d = hyp3(vx, vy, vz);
    if (d > range || d < 0.05) continue;
    const dot = (vx * dx + vy * dy + vz * dz) / d;
    const a = Math.acos(Math.max(-1, Math.min(1, dot)));
    if (a < bestA) {
      bestA = a;
      best = i;
    }
  }
  return best;
}

/** A laser device: beams across a plan segment (x1, z1) - (x2, z2) at the listed heights above `floorY`. */
export interface LaserDef {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  /** Beam heights above the floor (m). */
  ys: number[];
  floorY?: number;
  /** Label for the radio line and the alarm banner when it is broken. */
  label?: string;
  /** (CT prototype B4) A course flag that switches the laser off for good (a far-side release switch). */
  offFlag?: string;
  /** Sector Ops: the section the laser belongs to (live only while that section is; none = always live). */
  section?: number;
}

/**
 * The laser sensor. (sector-fixes C, item 5, Michael 2026-10-22: "Lasers should set off alarms, not hurt you.") A break
 * raises the alarm stage on the camera's path (`deviceAlarm`) and never deals damage (the old "Health hit (CT)" pick and
 * its `damage` / `floorHp` are gone). (Item 4, Michael's answer "Night vision": the beams are infrared, drawn only in
 * night vision; render only, the sensor works the same in every vision mode.)
 */
export const LASER = {
  /** Seconds before the same player can break it again (one alarm per break, not one per step). */
  cooldown: 2,
  /** Beam thickness plus body radius (m): a body within this of the beam line touches it. */
  reach: 0.3,
  /** Body height (m) standing / crouched (the beams it can touch). */
  standHeight: 1.75,
  crouchHeight: 1.1,
} as const;

/** Distance in plan from a point to the segment (x1, z1) - (x2, z2). */
export function distToSegment(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const sx = x2 - x1;
  const sz = z2 - z1;
  const len2 = sx * sx + sz * sz;
  let t = len2 > 1e-9 ? ((px - x1) * sx + (pz - z1) * sz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return hyp2(px - (x1 + sx * t), pz - (z1 + sz * t));
}

/**
 * Does a body (feet at (px, py, pz), `height` tall) touch the laser's beams? In plan it must be within `LASER.reach` of
 * the beam line, and one beam height must fall inside the body (a body over every beam, or under all of them, is clear).
 */
export function laserTouch(def: LaserDef, px: number, py: number, pz: number, height: number): boolean {
  if (distToSegment(px, pz, def.x1, def.z1, def.x2, def.z2) > LASER.reach) return false;
  const base = def.floorY ?? 0;
  for (let i = 0; i < def.ys.length; i++) {
    const y = base + def.ys[i]!;
    if (y >= py && y <= py + height) return true;
  }
  return false;
}

/**
 * (guard-ai S17, A100) Where a broken laser is for the guards: the middle of its beam line on the plan, at its floor
 * (`floorY`; NaN when the def has none: the caller takes the nav floor there). A beam sensor knows which beam broke,
 * not where along it, nor where the body went after: never the player's position. Writes `out`, no allocation.
 */
export function beamSpot(def: LaserDef, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  out.x = (def.x1 + def.x2) / 2;
  out.z = (def.z1 + def.z2) / 2;
  out.y = def.floorY ?? Number.NaN;
  return out;
}

/** Per-player break cooldown: true when a break counts now (and arms the cooldown), false while it is cooling. */
export function laserCooldown(cool: { t: number }, dt: number, touching: boolean): boolean {
  cool.t = Math.max(0, cool.t - dt);
  if (!touching || cool.t > 0) return false;
  cool.t = LASER.cooldown;
  return true;
}

/** Alarm stages (G125: escalating, never ends the run). */
export const ALARM_MAX = 3;
/** Minimum seconds between two escalations by cameras. */
export const ALARM_GAP = 5;

/** Next alarm stage after a camera has someone (capped at `ALARM_MAX`). */
export function nextAlarm(stage: number): number {
  return Math.min(ALARM_MAX, stage + 1);
}

/**
 * (sector-fixes C, item 5) The security devices' one alarm path (a camera at full awareness, a laser break): the stage
 * after a trip `since` s after the last escalation, or -1 inside `ALARM_GAP` (no escalation).
 */
export function deviceAlarm(stage: number, since: number): number {
  return since < ALARM_GAP ? -1 : nextAlarm(stage);
}

/** Is the foot point inside the plan box [x0, z0, x1, z1]? (the camera pocket, the pass zone) */
export function inBox(box: readonly [number, number, number, number], x: number, z: number): boolean {
  return x >= Math.min(box[0], box[2]) && x <= Math.max(box[0], box[2]) && z >= Math.min(box[1], box[3]) && z <= Math.max(box[1], box[3]);
}

/**
 * (B8, B3 polish 1) Re-arm the pass zones whose flag the course cleared (a bay restart deletes the bay's flags): a zone
 * marked set while its flag is gone can set it again. No allocation (`has` is the course's flag test).
 */
export function rearmZones(set: Set<string>, zones: readonly { id: string; flag: string }[], has: (flag: string) => boolean): void {
  if (set.size === 0) return;
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i]!;
    if (set.has(z.id) && !has(z.flag)) set.delete(z.id);
  }
}

/**
 * (marlow-jammer fix round 1, Michael item 5: "it should be impossible to pass without one player jamming in to walk
 * past") A camera hallway's hard rule, one station only (bay 3): a player the hallway's camera has (its meter full,
 * stage 2) while in the hallway is sent back to a fixed spot in the entry lobby, facing the hallway, with a radio line.
 * A player who entered the hallway is "running" until they stand in the far lobby with the camera's meter on them empty
 * (stage 0; a jammed or rebooting camera keeps it empty); a running player the camera has in the far lobby is sent back
 * too. The far lobby's pass zone counts only players who are neither running nor sent back (a sent-back player must
 * run it again).
 * (fix round 2) A sent-back player stays "sent back" until their reported position is in the entry lobby (or the
 * hallway) after `HALL_BACK_HOLD`: positions the client sent before it got the `back` event arrive inside the host's
 * teleport grace (no speed check) and must not count (the camera's meter on them was emptied by the send-back).
 */
export interface HallRule {
  /** The camera that watches the hallway. */
  camera: string;
  /** The hallway's plan box [x0, z0, x1, z1]. */
  box: [number, number, number, number];
  /** (fix round 2) The entry lobby's plan box [x0, z0, x1, z1]: where a sent-back player must be seen again. */
  lobby: [number, number, number, number];
  /** The send-back spot in the entry lobby: x, z and yaw (facing the hallway; 0 is +z). */
  back: [number, number, number];
  /** LANTERN's line on a send-back (<= 90 characters). */
  say: string;
}

/** A player's hallway state: not running, running (entered the hallway, not yet clean through), sent back now, and
 *  (fix round 2) sent back (moved to the entry lobby, not yet seen there). */
export const HALL_IDLE = 0;
export const HALL_RUN = 1;
export const HALL_BACK = 2;
export const HALL_SENT = 3;
export type HallStep = typeof HALL_IDLE | typeof HALL_RUN | typeof HALL_BACK | typeof HALL_SENT;
/**
 * (fix round 2) Seconds a sent-back co-op client stays "sent back" whatever position it reports: the host's copy takes
 * any position for this long after the move (`RemotePlayer.moveTo`'s teleport grace, the same constant), including
 * stale ones the client sent before the `back` event reached it. The host's own player moves at once (no hold).
 */
export const HALL_BACK_HOLD = 3;

/**
 * One player's step of the hallway rule. `state`: their state (`HALL_IDLE`, `HALL_RUN` or `HALL_SENT`);
 * `inLobby` / `inHall` / `inFar`: their feet in the entry lobby / the hallway / the far lobby; `stage`: the hallway
 * camera's meter stage on them (2 = it has them); `held`: still inside `HALL_BACK_HOLD` after a send-back. Returns the
 * new state, or `HALL_BACK` when they must be sent back now (the caller moves them and stores `HALL_SENT`).
 * A sent-back player leaves `HALL_SENT` only once the hold is over: in the entry lobby (not running) or the hallway
 * (running again); still in the far lobby then means the move did not take: sent back again.
 */
export function hallStep(state: number, inLobby: boolean, inHall: boolean, inFar: boolean, stage: number, held: boolean): HallStep {
  if (state === HALL_SENT) {
    if (stage >= 2 && inHall) return HALL_BACK;
    if (held) return HALL_SENT;
    if (inLobby) return HALL_IDLE;
    if (inHall) return HALL_RUN;
    return inFar ? HALL_BACK : HALL_SENT;
  }
  const running = state === HALL_RUN;
  if (stage >= 2 && (inHall || (inFar && running))) return HALL_BACK;
  if (inHall) return HALL_RUN;
  if (running && inFar && stage === 0) return HALL_IDLE;
  return running ? HALL_RUN : HALL_IDLE;
}

/**
 * (fix round 1) Client: take the host's phase and time for a mirrored device timeline, only ever forward. A host
 * RECOVER that arrives while the mirror is idle because it ran that same reboot down itself less than `MIRROR_STALE` s
 * ago (`idleFor`; Infinity when the mirror did not) is late and dropped (no blink back into the reboot); inside one
 * phase the time only moves on. Returns true when the host's state was taken.
 */
export const MIRROR_STALE = 1;
export function mirrorDevJam(d: DevJam, ph: DevPhase, t: number, idleFor: number): boolean {
  if (ph === DEV_IDLE) {
    d.ph = DEV_IDLE;
    d.t = 0;
    return true;
  }
  if (ph === DEV_RECOVER && d.ph === DEV_IDLE && idleFor < MIRROR_STALE) return false;
  if (ph === d.ph) {
    if (t > d.t) d.t = t;
    return true;
  }
  d.ph = ph;
  d.t = t;
  return true;
}

/**
 * (fix round 1) The HUD line's cache key: its kind and its shown tenths, so the text (a new string) is only built when
 * what it shows changes. 0 = hidden.
 */
export function jamHudKey(s: JamState, pick: boolean, pickRecovering: boolean): number {
  if (s.active) return 100000 + Math.round(jamLeft(s) * 10);
  if (s.cool > 0) return 200000 + Math.round(s.cool * 10);
  if (pick && pickRecovering) return 3;
  if (pick) return 4;
  return 0;
}
