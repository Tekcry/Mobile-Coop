import { Vector3 } from '../core/babylon';
import type { InputState } from '../input/inputState';
import { contextZoom } from '../input/conflicts';
import type { Player } from '../player/player';
import type { World } from '../world/world';
import { MASK } from '../physics/groups';
import type { Ballistics, RayHit } from './ballistics';
import { spreadDir } from './ballistics';
import type { Grenades } from './grenades';
import type { Vfx } from '../vfx/vfx';
import type { PartPattern } from '../world/partLibrary';
import { classWeight } from './weaponCarry';
import { GRENADE, WEAPONS, modelExtents, type WeaponDef, type WeaponId } from './weaponDefs';
import { assignCarrySlots, type CarrySlot } from './carrySlots';
import { withAttachments } from '../progression/attachments';
import { GrenadePouches } from './grenadePouches';
import { KnifeModel } from './knifeModel';
import { reloadClipFor } from '../anim/clips/actions';
import { WREN_HANDS } from '../operators/handFrame';
import { GADGETS, GadgetInventory, type GadgetId } from '../game/gadgets';
import type { SwapReach } from '../anim/clips/actions';
import { crateReserve } from '../game/crateLedger';
import { LoadoutSnapshot } from './loadoutSnapshot';

const modelLength = (d: WeaponDef): number => {
  const e = modelExtents(d);
  return e.z1 - e.z0;
};
import { WeaponModel, DEFAULT_WEAPON_COLORS, type WeaponColors } from './weaponModel';
import { AIM_IN_PRIMARY, AIM_IN_SIDEARM, DRAW_DRAWN, DRAW_HOLSTERED, DRAW_HOLSTERING, DrawState, drawTimeFor, fireReady, HOLSTER_TIME_MOVE, holsterTimeFor, type DrawPhase } from './drawState';
import { DRAW_BEAT, DRAW_CUR, drawClass, liftStart } from '../anim/drawMotion';
import { drawTuneApply } from './drawTune';
import { CLIP_BASE, clipSpeed } from '../anim/tuneClipSpeed'; // (clip-speed, track A)
import { STANCE } from '../player/weaponStance';
import { computeStats, damageAt, playerSpreadDeg, recoilKick, sampleSpread, NO_UPGRADES, type EffectiveStats, type StatMods, type WeaponUpgrades } from './weaponStats';
import { addSd, sdStart, spendShot, SUPPRESSED_NOISE } from './sdRounds';
import { emptyShotPose, shotOrigin } from './shotOrigin';
import { HandSwitch } from '../player/handSwitch';

export interface LoadoutEntry {
  id: WeaponId;
  upgrades?: WeaponUpgrades;
  mods?: StatMods;
  colors?: WeaponColors;
  pattern?: PartPattern;
  /** Attachment ids (visible on the model; their stat mods come in `mods`). */
  attachments?: string[];
}

export interface WeaponSlot {
  def: WeaponDef;
  stats: EffectiveStats;
  mag: number;
  reserve: number;
  model: WeaponModel;
  /** Thin material a round goes through (m; 0 = none) and what it keeps. */
  pen: number;
  /** Has a magnifying scope. */
  scoped: boolean;
  /** (sd-rounds) Quiet rounds left (Infinity: unlimited). */
  sd: number;
}

export type HitKind = 'hit' | 'head' | 'kill' | 'deflect';

export interface CombatEvents {
  onHit?(kind: HitKind, weapon: WeaponId, damage: number): void;
  onShot?(def: WeaponDef): void;
  onReload?(def: WeaponDef): void;
  onDryFire?(def: WeaponDef): void;
  onSwap?(def: WeaponDef): void;
  onGrenade?(): void;
  /** (sd-rounds) The quiet rounds of this gun ran out. */
  onSdOut?(def: WeaponDef): void;
}

const DEG = Math.PI / 180;
/** Weapon swap (s): holster the current gun, draw the next (the model changes hands half way). */
const SWAP_TIME = 0.9;
/** Swap beats (fractions of SWAP_TIME): holstered, taken from its slot, settled in the aim pocket. */
const SWAP_HOLSTER = 0.38;
const SWAP_TAKE = 0.58;
const SWAP_HOLD = 0.8;
/**
 * (anim-cleanup) The draw / holster travel beats: the outgoing gun leaves the aim pocket at TRAVEL_OUT and reaches its
 * slot at SWAP_HOLSTER in the trigger hand; the next one leaves its slot at TRAVEL_IN and is in the pocket at SWAP_HOLD
 * (actions.ts swap clip: the hand holds the grip over both spans, empty only between the slots).
 * (anim-natural N3) The incoming travel runs from the holstered beat (TRAVEL_IN = SWAP_HOLSTER = drawMotion DRAW_BEAT,
 * was 0.5: the reach is its first part, the hand blending onto the grip) to the clip's end (was SWAP_HOLD 0.8: the gun
 * stopped at the clip's level pocket for the last 20 % and then moved again into the low ready as the overlay faded;
 * the "random stop"), settling in the final pose; SWAP_HOLD stays for a gun that does not travel (the sling hand-off).
 * The outgoing travel starts at once (TRAVEL_OUT 0.06 -> 0): the gun moved with the overlay's pocket for 0.06 of the
 * clip, then stopped as the travel took it from rest (and the pistol's muzzle tipped up 44 deg before going down).
 */
const TRAVEL_OUT = 0;
const TRAVEL_IN = DRAW_BEAT;
/**
 * (anim-natural N3 fix) A draw holstered mid-way runs back at its own rate (X), or this many times it for a traversal, a
 * busy move or a queued strike (quicker, slow enough to stay one move); the turn from the draw to the return (s).
 */
export const REWIND_QUICK = 2;
const REWIND_TURN = 0.12;
/** (anim-natural N3 fix) The share of the travel over which a quick rewind eases back to the draw's rate as it seats. */
const REWIND_SEAT = 0.25;
/** (anim-natural N3 fix) Time constant (s) a running holster eases onto a quicker holster time with. */
const HOLSTER_EASE = 0.04;
/** (anim-natural N3 fix) The fixed step a rewind's length is stepped out with (the 60 Hz sim). */
const REWIND_DT = 1 / 60;
/** Grenade throw (s) and the moment it leaves the hand. */
const GRENADE_TIME = 1.2;
const GRENADE_RELEASE = 0.68;
// (clip-speed, track A) the tuner's "today" lines; the swap and throw clocks run at the tuner's clip speed (1: as before)
CLIP_BASE.swap = SWAP_TIME;
CLIP_BASE.grenade = GRENADE_TIME;
/** Reload durations relative to the weapon's base reload time: rifle 1.9 s -> 2.6 s / 3.1 s. */
export const RELOAD_TACTICAL_MULT = 1.37;
export const RELOAD_EMPTY_MULT = 1.63;

/** The local player's weapons: fire modes, spread/bloom, recoil, reload, swap, grenades. */
/** Holstering for attached traversal runs this much faster than a swap's holster beat (~0.14 s to the slot). */
const STOW_RATE = 2.5;
/** Thin material (m) a round goes through by class (doors, glazing, thin partitions); half the damage after. */
const PENETRATION: Record<string, number> = { pistol: 0.08, smg: 0.1, rifle: 0.2, lmg: 0.25, dmr: 0.32, sniper: 0.32 };

export class PlayerWeapons {
  readonly slots: WeaponSlot[] = [];
  /** (anim-weight) The carried-gear spring for every carried gun (Player calls it after the pose; bound once). */
  private readonly weightGear = (dx: number, dy: number, dz: number): void => {
    for (let i = 0; i < this.slots.length; i++) this.slots[i]!.model.weightGear(dx, dy, dz);
  };
  index = 0;
  /** Gadgets carried (the wheel selects one); thrown kinds go out through `onThrow`, placed / flown through
   *  `onPlace`. */
  readonly gadgets = new GadgetInventory();
  /** Belt pouches showing the grenades carried. */
  readonly pouches: GrenadePouches;
  /** (feature/weapons, A5) The knife, shown only when drawn (no knife verb yet: `knife.show`). */
  readonly knife: KnifeModel;
  private cooldown = 0;
  private grenadeCd = 0;
  private reloadT = -1;
  private swapT = -1;
  /** 0 = taking the gun off, 1 = holstered (hands empty), 2 = drawing (in the hand), 3 = in the pocket. */
  private swapPhase = 3;
  private reloadTotal = 1;
  private reloadEmpty = false;
  private grenadeT = -1;
  private grenadeThrown = false;
  private bloom = 0;
  private shotIndex = 0;
  private sinceShot = 99;
  /** A semi-auto press made while the weapon was still coming up fires once it is raised. */
  private queuedT = 0;
  infiniteAmmo = false;
  /** The current weapon has a magnifying scope (sway when aimed). */
  get scoped(): boolean {
    return this.current.scoped;
  }

  /** (optic-coop M2) Aiming a scoped weapon: Zoom's context (R3 zooms then and does not ping, `contextPing`). */
  get scopedAim(): boolean {
    return this.player.ads && this.current.scoped;
  }

  /** Suit gloves: swaps take this much of the time. */
  handsMul = 1;
  /** Extra spread factor (blind fire from cover). */
  spreadMul = 1;
  /** (3.2.0) Spread multiplier for a sidearm fired attached (hanging inverted). */
  attachSpread = 1;
  /** Last hitscan shot (debugging / tests). */
  lastShot: { origin: Vector3; aim: Vector3; hit: Vector3; target: string } | null = null;
  events: CombatEvents = {};
  /** Every hitscan ray (origin -> where it stopped): lights can be shot out along it. */
  onRay: ((from: Vector3, to: Vector3) => void) | null = null;
  /** Shots/hits per weapon for accuracy + mastery. */
  readonly tally = new Map<WeaponId, { shots: number; hits: number; kills: number; heads: number }>();
  private tmpO = new Vector3();
  private tmpD = new Vector3();
  /** The animated muzzle: the tracer, flash and casing only (rig-pose-fix S2, P6). */
  private muzzle = new Vector3();
  /** (rig-pose-fix S2, G6) The round's origin and the sim eye for the wall-poke test (`shotOrigin.ts`), and their input. */
  private shotO = new Vector3();
  private shotE = new Vector3();
  private readonly shotPose = emptyShotPose();
  /**
   * (rig-pose-fix S7, audit G15) The weapon changing hands, in sim: stepped in the fixed step toward `handLeft`. The swap's
   * hold and the shot's side read this; the rig eases its own copy toward the same target (`HandSwitch`).
   */
  readonly hand = new HandSwitch();
  /** (rig-pose-fix S3) The hand the wall edge / left-shoulder rule picked (true: the left), written by `gameState.ts`
   *  wallStep in the fixed step before `fixedUpdate` (it also gives `rig.openLeft` the same value for the drawn switch).
   *  Weapons never read the rig's flag. */
  handLeft = false;
  /** (rig-pose-fix S3) The one sim head (`PlayerTarget.body.head`, S1's body model, synced in the fixed step before
   *  `fixedUpdate`): the wall-poke test's eye. Set by `GameState`; null (a harness without one): no poke test. */
  simHead: { readonly x: number; readonly y: number; readonly z: number } | null = null;

  /** (rig-pose-fix S2) Where a round of the current weapon fired along `dir` (unit) starts (sim: `shotOrigin`), and
   *  (S3) the sim eye the wall-poke test runs from (`simHead`, else `outE` is left alone and false is returned). Writes
   *  `outO` / `outE`; no allocation. */
  shotPoint(dir: Vector3, outO: Vector3, outE: Vector3): boolean {
    const pl = this.player;
    const c = pl.controller;
    const sp = this.shotPose;
    const def = this.current.def;
    sp.x = c.pos.x;
    sp.y = c.pos.y;
    sp.z = c.pos.z;
    sp.crouch = c.crouchBlend;
    sp.lean = pl.pose.lean;
    // (S3, CHECK-W1 polish) the gun's side from the sim hand clock (`hand`: the wall edge's left hand and the left
    // shoulder, eased over EDGE_HAND_TIME), so the origin changes sides with the swap's clock and the drawn gun
    sp.side = this.hand.hand;
    sp.inverted = pl.attachAim?.inverted === true;
    sp.pistol = def.class === 'pistol';
    sp.dx = dir.x;
    sp.dy = dir.y;
    sp.dz = dir.z;
    sp.muzzleY = def.muzzle[1];
    sp.muzzleZ = def.muzzle[2];
    shotOrigin(sp, outO);
    const h = this.simHead;
    if (!h) return false;
    outE.set(h.x, h.y, h.z);
    return true;
  }

  constructor(
    private world: World,
    private player: Player,
    private ballistics: Ballistics,
    private grenadeSys: Grenades,
    private vfx: Vfx,
    loadout: LoadoutEntry[],
    /** (locomotion step 17) the shot rumble (the table, `config/rumble.ts`): suppressed or loud. */
    private shotFeel: (suppressed: boolean) => void,
  ) {
    // every carried weapon gets its own slot on the body (back / sling / thigh), so all stay visible
    const defs = loadout.map((e) => withAttachments(WEAPONS[e.id], e.attachments ?? []));
    this.carrySlots = assignCarrySlots(defs.map((d) => ({ cls: d.class, length: modelLength(d) })));
    for (let i = 0; i < loadout.length; i++) {
      const e = loadout[i]!;
      const def = defs[i]!;
      const stats = computeStats(def, e.upgrades ?? NO_UPGRADES, e.mods);
      const model = new WeaponModel(world.scene, world.parts, def, e.colors ?? DEFAULT_WEAPON_COLORS, player.rig.weaponPivot, e.pattern, { mesh: true, caster: (m) => world.addShadowCaster(m) });
      for (const m of model.renderMeshes) world.addShadowCaster(m);
      model.setVisible(false);
      this.slots.push({ def, stats, mag: stats.magSize, reserve: def.reserve, model, pen: PENETRATION[def.class] ?? 0, scoped: def.model.some((p) => p.role === 'scope'), sd: sdStart(def.id) });
    }
    player.onWeightGear = this.weightGear; // (anim-weight) the carried-gear spring (0: the guns are not touched)
    // (operators 11e) Wren's own kit carries the throwables: the part pouches are not drawn on her
    this.pouches = new GrenadePouches(world.parts, player.rig, this.grenades, false);
    this.knife = new KnifeModel(world.scene, player.rig, WREN_HANDS.R, (m) => world.addShadowCaster(m));
    for (const m of this.pouches.parts) world.addShadowCaster(m);
    this.equip(0);
  }

  get current(): WeaponSlot {
    return this.slots[this.index]!;
  }

  /** The selected weapon's slot index (the selection wheel marks it). */
  get slotIndex(): number {
    return this.index;
  }

  /** Fired within the last 0.2 s (coop animation flag). */
  get firingRecently(): boolean {
    return this.sinceShot < 0.2;
  }

  get reloading(): boolean {
    return this.reloadT >= 0;
  }

  get reloadProgress(): number {
    return this.reloading ? 1 - this.reloadT / this.reloadTotal : 0;
  }

  /** The current reload's length (s) and whether it is the empty one (the weapon sounds lay it out; read only). */
  get reloadDuration(): number {
    return this.reloadTotal;
  }

  get reloadIsEmpty(): boolean {
    return this.reloadEmpty;
  }

  get swapping(): boolean {
    return this.swapT >= 0;
  }

  /** Weapon away: holstered (not aiming, step 09) or both hands busy (ladders, pipes, hanging, ducts). */
  private stowed = false;
  /** (step 09) Holstered unless aiming: the draw phase (`MoveState.dw`), driven by aim when not attached. */
  readonly draw = new DrawState();
  /** Attached / carrying / a takedown / a team move: the attach stow and the one-handed sidearm win over aim. */
  private attachMode = false;
  /** The swap timeline is a draw / holster from aim: its pace follows the draw state (bible 5.6 times). */
  private aimDriven = false;
  /** The host forced holstered (D8): stays holstered until aim is released. */
  private drawLock = false;
  private started = false;
  /** (A43) Reload pressed while not drawn: draw to low ready, then reload (then holster if aim is not held). */
  private reloadQueued = false;

  /** (locomotion step 10) An elbow strike running: aim / reload do not draw until it ends (the gun stays in its
   *  slot with no stow overlay, so the local rig poses exactly as the remotes do from MoveState, D8). */
  handsBusy = false;
  /** (anim-natural N3 fix) RT pressed for a strike while holstering: the holster runs as a busy move (HOLSTER_TIME_MOVE)
   *  and the strike starts once holstered (GameState). */
  strikePending = false;
  /**
   * (anim-natural N3 fix) A draw holstered mid-way (X, a traversal, a busy move) rewinds: the swap clock runs back to the
   * holstered beat, from the draw's own rate `rewV0` (clip s / s) turning to the return (`rewVd` x `rewK` while the gun
   * travels), so the gun slows, turns back and returns along its draw path. `rewHol` is the holster time the draw state
   * uses meanwhile, so its phase reaches holstered as the gun is seated.
   */
  private rewind = false;
  private rewV0 = 0;
  private rewVd = 0;
  private rewK = 1;
  private rewLift = 0;
  private rewTau = 0;
  private rewHol = 0;
  /** (anim-natural N3 fix) The swap clock's rate in the last step (clip s / s): a rewind starts from it. */
  private swapRate = 0;

  /** (locomotion step 10) A reload running or queued (A43): the hands are busy, no elbow strike. */
  get reloadBusy(): boolean {
    return this.reloadQueued || this.reloading;
  }

  /**
   * Stow / draw for attached traversal: stowing plays the swap's holster half and holds there (hands empty,
   * every gun in its carry slot); drawing continues the same swap from its slot back into the hands. A swap
   * already running carries on into the stow.
   */
  setStowed(v: boolean): void {
    if (v === this.stowed) return;
    this.stowed = v;
    this.cancelReload();
    // (anim-natural N3 fix) drawn again mid-rewind: the draw carries on from where the gun is
    if (!v) this.rewind = false;
    const rig = this.player.rig;
    if (v) {
      if (this.swapT >= 0 && this.swapPhase === 2 && this.slots[this.index]!.model.travelling) {
        // (anim-natural N3 fix) mid-draw: the draw runs backwards from where it is (the swap clip's draw half and the
        // gun's draw path rewound to the slot, the reach letting go last), eased through the turn (was a snap into the
        // slot, 20-39 cm; then a fresh holster travel from clip time 0: the overlay's reach pose dropped out in a frame)
        this.startRewind();
      } else if (this.swapT >= 0 && this.swapPhase >= 2) {
        // mid-draw with no travel (the sling hand-off): the gun goes straight back to its slot
        this.holsterAll(-1);
        this.swapPhase = 1;
        this.swapT = SWAP_TIME * SWAP_HOLSTER;
      } else if (this.swapT < 0) {
        this.swapT = 0;
        this.swapPhase = 0;
        this.player.swapFrom = this.reach(this.held);
        this.player.swapTo = this.reach(this.index);
      }
    } else if (this.swapT < 0 && !rig.heldWeapon) {
      // fully stowed: draw from the slot (the swap from its holstered beat)
      this.swapT = SWAP_TIME * SWAP_HOLSTER;
      this.swapPhase = 1;
      this.player.swapFrom = this.player.swapTo = this.reach(this.index);
    }
  }

  get isStowed(): boolean {
    return this.stowed;
  }

  /** (step 09) Draw phase for the wire and the fire gate: 0 holstered, 1 drawing, 2 drawn, 3 holstering. */
  get drawPhase(): DrawPhase {
    return this.draw.phase;
  }

  /** (step 09) The host forced this player holstered for longer than latency explains: holster now and hold it
   *  until aim is released. */
  forceHolster(): void {
    if (this.attachMode) return;
    this.drawLock = true;
    this.player.stance.holster();
    this.reloadQueued = false;
    this.draw.holster();
    this.aimDriven = false;
    this.setStowed(true);
  }

  /** (3.2.0) The loadout's sidearm (a pistol), or -1: the one gun that comes out one-handed while attached. */
  get sidearmIndex(): number {
    for (let i = 0; i < this.slots.length; i++) if (this.slots[i]!.def.class === 'pistol') return i;
    return -1;
  }

  /** The slot to go back to once the sidearm is put away again. */
  private beforeSidearm = -1;

  /**
   * (3.2.0) Attached and both hands busy (`stowed`), except the sidearm drawn one-handed to aim (a split, an inverted
   * hang): `draw` takes it from its holster; letting go puts it back and the main weapon is the one drawn next.
   */
  setAttachedStow(stowed: boolean, draw: boolean): void {
    this.attachMode = stowed;
    if (stowed) this.aimDriven = false;
    const si = this.sidearmIndex;
    if (stowed && draw && si >= 0) {
      if (this.index !== si) {
        if (this.beforeSidearm < 0) this.beforeSidearm = this.index;
        this.index = si;
        // stowed now (hands empty): the draw below takes the new choice from its slot
        if (!this.stowed) this.setStowed(true);
      }
      this.setStowed(false);
      return;
    }
    if (this.beforeSidearm >= 0 && stowed) {
      // put the sidearm away (its holster), then hold the stow with the main gun chosen again
      this.setStowed(true);
      this.index = this.beforeSidearm;
      this.beforeSidearm = -1;
      this.player.swapTo = this.reach(this.index);
      return;
    }
    if (!stowed && this.beforeSidearm >= 0) {
      this.index = this.beforeSidearm;
      this.beforeSidearm = -1;
    }
    // hands free again: aim decides (fixedUpdate)
    if (stowed) this.setStowed(true);
  }

  /** Throwing a grenade (wind-up to recovery): no firing, aiming or reloading. */
  get throwing(): boolean {
    return this.grenadeT >= 0;
  }

  private tallyFor(id: WeaponId): { shots: number; hits: number; kills: number; heads: number } {
    let t = this.tally.get(id);
    if (!t) {
      t = { shots: 0, hits: 0, kills: 0, heads: 0 };
      this.tally.set(id, t);
    }
    return t;
  }

  /** Body slot per loadout entry (null only if the body is full). */
  readonly carrySlots: (CarrySlot | null)[];
  /** The weapon in the hands (the swap changes `index` first, the hands half way). */
  private held = 0;

  /** Put every weapon except `held` into its own carry slot. */
  private holsterAll(held: number): void {
    const rig = this.player.rig;
    for (let j = 0; j < this.slots.length; j++) {
      if (j === held) continue;
      const m = this.slots[j]!.model;
      // (anim-cleanup) a reload cut short: the magazine goes back in before the gun is put away
      m.magSeated();
      const slot = this.carrySlots[j];
      if (slot) m.holster(rig, slot);
      else m.setVisible(false);
    }
  }

  /** Where the hand reaches to holster / draw a weapon. */
  private reach(i: number): SwapReach {
    return this.carrySlots[i] ?? 'backC';
  }

  private switchTarget = -1;

  /** (F1a) Swap to the gun at slot `i` (the selection wheel): the swap runs on the next step. */
  switchTo(i: number): void {
    if (i >= 0 && i < this.slots.length) this.switchTarget = i;
  }

  /** (F1a, CT) R3 / B zoomed in: only a scoped weapon, only while aiming; normal aim never zooms (G29). */
  zoomOn = false;

  /** Aim camera for the current weapon: no zoom (G29) except a marksman scope toggled on with the zoom button; the camera blends in a little ahead of the draw (G103). */
  private applyAimCamera(): void {
    const cam = this.player.cam;
    cam.adsZoom = this.current.scoped && this.zoomOn ? this.current.stats.adsZoom : 1;
    // (anim-natural N3) drawn, the aim from low ready keeps its pre-N3 blend (AIM_IN_*): the longer draws never slow it
    // (anim-natural N3 fix, check finding 6) so does LT pressed during an X draw; the LT sling draw blends over what is
    // left of it, never under AIM_IN (the blend's time fell from 0.99 / 1.35 s to 0.27 s mid-dolly as the draw ended)
    const aimIn = this.current.def.class === 'pistol' ? AIM_IN_SIDEARM : AIM_IN_PRIMARY;
    const sling = this.draw.phase !== DRAW_DRAWN && this.player.stance.slingDraw;
    cam.adsInTime = (sling ? Math.max(aimIn, (1 - this.draw.progress) * this.drawTime()) : aimIn) * 0.9;
  }

  /** The current gun's draw time (s); (anim-rework S1, M2) the sling draw (LT from holstered) is slower. */
  private drawTime(): number {
    const cls = this.current.def.class;
    return drawTimeFor(cls) * (this.player.stance.slingDraw ? (cls === 'pistol' ? STANCE.slingDrawMult : STANCE.slingDrawLong) : 1);
  }

  /**
   * (anim-natural N3) The current gun's holster time (s), per class, with the tuner's Clip speed (rifle / pistol holster); a traversal or a
   * busy move (the stance suspended) holsters in HOLSTER_TIME_MOVE, as fast as before N3.
   * (anim-natural N3 fix) A queued strike too (`strikePending`); a holster already running eases onto the quicker time
   * (`holS`), and a rewound draw keeps its own (`rewHol`).
   */
  private holsterTime(): number {
    if (this.rewind && this.rewHol > 0) return this.rewHol;
    return this.holS;
  }

  /** (anim-natural N3 fix) The holster time asked for now (see `holsterTime`). */
  private holsterWant(): number {
    if (this.player.stance.suspended || this.strikePending) return HOLSTER_TIME_MOVE;
    return this.deliberateHolster();
  }

  /**
   * (anim-natural N3 fix) The holster time in use: a holster sped up mid-way (RT queued, a traversal) eases onto the
   * quicker time over HOLSTER_EASE (it switched in a frame: the gun jumped 8 cm, the rifle's muzzle 22 m/s); else as asked.
   */
  private holS = HOLSTER_TIME_MOVE;

  /** (anim-natural N3) The deliberate (X) holster time of the current gun (s). */
  private deliberateHolster(): number {
    return holsterTimeFor(this.current.def.class);
  }

  /**
   * (anim-natural N3 fix) Starts the rewind of a draw in progress (see `rewind`): the swap clock turns from the draw's rate
   * to the return over REWIND_TURN (the hand slows, stops and comes back), then runs back at the draw's own rate (X: the
   * elapsed draw mirrored). A traversal, a busy move, a queued strike, an attach or the host's forced holster bring the
   * gun back REWIND_QUICK x faster, easing to the draw's rate as it seats, so the hand lets go of it at the reach's pace
   * (G2's 0.15 s from mid-draw moved the gun 14-18 cm in a frame; the reach let go at 2x left the wrist 10 cm behind).
   * The rewind's length is stepped out here once (the same steps `fixedUpdate` takes), for the draw state's pace.
   */
  private startRewind(): void {
    const pr = this.draw.progress;
    const quick = this.player.stance.suspended || this.strikePending || this.attachMode || this.drawLock;
    this.rewVd = (SWAP_TIME * (1 - TRAVEL_IN)) / Math.max(1e-3, this.drawTime());
    this.rewK = quick ? REWIND_QUICK : 1;
    this.rewLift = liftStart(DRAW_CUR[drawClass(this.current.def.class)]);
    this.rewind = true;
    this.rewV0 = Math.min(Math.max(0, this.swapRate), 2 * this.rewVd);
    this.rewTau = 0;
    let x = this.swapT;
    let n = 0;
    while (x > SWAP_TIME * TRAVEL_IN + 1e-9 && n < 600) x = this.rewindStep(x, ++n * REWIND_DT, REWIND_DT);
    this.rewHol = pr > 1e-6 ? (n * REWIND_DT) / pr : 0;
  }

  /** (anim-natural N3 fix) One step of the rewind's swap clock from `x` (clip s) at rewind time `tau` (s). */
  private rewindStep(x: number, tau: number, dt: number): number {
    const u = (x / SWAP_TIME - TRAVEL_IN) / (1 - TRAVEL_IN);
    const k = (u - this.rewLift) / REWIND_SEAT;
    const ks = k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
    const back = this.rewVd * (1 + (this.rewK - 1) * ks);
    const c = tau >= REWIND_TURN ? 1 : tau / REWIND_TURN;
    const s = c * c * (3 - 2 * c);
    return Math.max(SWAP_TIME * TRAVEL_IN, x + (this.rewV0 * (1 - s) - back * s) * dt);
  }

  private equip(i: number): void {
    this.held = i;
    this.holsterAll(i);
    this.slots[i]!.model.hold(this.player.rig);
    this.index = i;
    const d = this.current.def;
    this.applyAimCamera();
    this.player.controller.speedMul = d.moveSpeedMult;
  }

  /** Spread half-angle in degrees right now (for the crosshair). */
  currentSpread(): number {
    const s = this.current;
    const c = this.player.controller;
    return playerSpreadDeg(s.def, s.stats, c.crouched, c.speed, this.bloom) * this.spreadMul * this.attachSpread;
  }

  /** (sector-restart, M9) The loadout when the current Sector Ops section began (`markCheckpoint`). */
  readonly checkpointKit = new LoadoutSnapshot<GadgetId>();

  /** (sector-restart) Record the loadout now: every gun's ammo, the gadgets carried and the one selected. */
  markCheckpoint(): void {
    this.checkpointKit.take(this.slots, this.gadgets);
  }

  /**
   * (sector-restart, M9) A checkpoint restart: the loadout as the section began, every gun reloaded from its reserve at
   * once (no reload animation; one running is cut short), the gadgets as they were. False before any checkpoint.
   */
  restoreCheckpoint(): boolean {
    if (!this.checkpointKit.taken) return false;
    // (check fix 1) a throw still in hand at the down ends here: nothing leaves the hand after the respawn (the
    // restored counts already hold the gadget it took)
    this.grenadeT = -1;
    this.grenadeThrown = false;
    this.grenadeCd = 0;
    this.player.grenadeT = -1;
    this.player.aimLockTimer = 0;
    this.cancelReload();
    this.reloadQueued = false;
    this.cooldown = 0;
    this.queuedT = 0;
    this.bloom = 0;
    return this.checkpointKit.restore(this.slots, this.gadgets, this.infiniteAmmo);
  }

  addAmmo(fraction: number): void {
    for (const s of this.slots) {
      s.reserve = Math.min(s.def.reserve * 2, s.reserve + Math.ceil(s.def.reserve * fraction));
      addSd(s, fraction);
    }
    this.gadgets.add('frag');
  }

  /**
   * (E9-crate, A102) The weapons crate: every gun's reserve rises so that mag + reserve reaches its starting loadout
   * (`stats.magSize + def.reserve`); never lowers, never touches the magazine, gadgets or grenades. True when any reserve
   * changed; false with `infiniteAmmo`.
   */
  crateTopUp(): boolean {
    if (this.infiniteAmmo) return false;
    let changed = false;
    for (const s of this.slots) {
      const r = crateReserve(s.mag, s.reserve, s.stats.magSize, s.def.reserve);
      if (r !== s.reserve) {
        s.reserve = r;
        changed = true;
      }
    }
    return changed;
  }

  /** (E9-crate, A103) Every gun at (or above) its starting loadout, or `infiniteAmmo`: a crate use would do nothing. */
  atLoadout(): boolean {
    if (this.infiniteAmmo) return true;
    for (const s of this.slots) if (s.mag + s.reserve < s.stats.magSize + s.def.reserve) return false;
    return true;
  }

  fixedUpdate(dt: number, inp: InputState): void {
    const s = this.current;
    // (anim-natural N3) the Draw section's values for this step (identity unless a slider moved)
    drawTuneApply(drawClass(s.def.class));
    this.hand.step(dt, this.handLeft);
    this.player.reload = this.reloading ? this.reloadProgress : -1;
    this.player.reloadEmpty = this.reloadEmpty;
    this.player.reloadQueued = this.reloadQueued;
    // holstered by aim and settled: no swap overlay (the free hands hang at the sides, unarmed)
    this.player.swapT = this.swapT >= 0 && !(this.stowed && !this.attachMode && this.swapPhase >= 1 && !this.rewind) ? this.swapT / SWAP_TIME : -1;
    this.pouches.setCount(this.grenades);
    this.player.grenadeT = this.grenadeT >= 0 ? this.grenadeT / GRENADE_TIME : -1;
    this.player.sinceShot = this.sinceShot;
    this.player.weaponDrawn = this.draw.phase === DRAW_DRAWN;
    // (anim-natural N3) the weight of the gun in the hands: through a swap's holster half the outgoing one (the next gun's
    // weight picked the pistol's pocket for the rifle at the press: a 28 cm jump in one frame)
    const inHand = this.swapT >= 0 && this.swapPhase === 0 && this.held >= 0 ? this.slots[this.held]!.def : s.def;
    this.player.weaponWeight = inHand.weight ?? classWeight(inHand.class);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.grenadeCd = Math.max(0, this.grenadeCd - dt);
    this.sinceShot += dt;
    this.bloom = Math.max(0, this.bloom - s.def.spreadRecovery * dt);
    if (this.sinceShot > 0.35) this.shotIndex = 0;
    if (!this.player.alive) return;
    const ctl = this.player.controller;

    // (step 09) holstered unless aiming: aim pressed draws, released holsters (attach rules win over aim)
    if (!this.started) {
      // a match starts holstered (every gun in its slot, hands free), not with a holster animation
      this.started = true;
      if (!this.stowed && this.swapT < 0) {
        this.stowed = true;
        this.holsterAll(-1);
        this.swapT = SWAP_TIME * SWAP_HOLSTER;
        this.swapPhase = 1;
        this.player.swapFrom = this.player.swapTo = this.reach(this.index);
        this.player.swapT = -1;
      }
    }
    // (anim-rework S1) out at low ready or aiming (`Player.drawWanted`); the host's forced holster holds until the
    // player asks for the gun again
    if (!this.player.drawWanted) this.drawLock = false;
    if (!this.scopedAim) this.zoomOn = false;
    else if (contextZoom(this.scopedAim, inp.pressed('zoom'))) this.zoomOn = !this.zoomOn;
    this.applyAimCamera();
    if (this.attachMode) {
      if (this.stowed) this.draw.holster();
      else if (!this.swapping) this.draw.drawn();
    } else {
      // (A43) a reload in progress or asked for while holstered keeps / brings the gun out at low ready
      const reloadWant = this.reloadT >= 0 || this.reloadQueued;
      const hw = this.holsterWant();
      this.holS = this.draw.phase === DRAW_HOLSTERING && hw < this.holS ? this.holS + (hw - this.holS) * (1 - Math.exp(-dt / HOLSTER_EASE)) : hw;
      const ph = this.draw.update(dt, !this.drawLock && !this.handsBusy && (this.player.drawWanted || reloadWant), this.drawTime(), this.holsterTime());
      const away = ph === DRAW_HOLSTERED || ph === DRAW_HOLSTERING;
      if (away !== this.stowed) {
        const reverse = !away && this.swapT >= 0 && this.swapPhase === 0 && this.index === this.held;
        this.setStowed(away);
        this.aimDriven = true;
        if (reverse) {
          // released and pressed again before the gun reached its slot: it is still in the hands (the holster beat),
          // so the holster just stops and it comes straight back up. (21w, PC-PASS 42) No jump into the draw half of
          // the clip (that moved the hand 12 cm and the gun 30 cm in one frame): the swap overlay fades out from where
          // it was and the aim pocket takes the gun back.
          const m = this.slots[this.held]!.model;
          if (m.travelling) {
            // (anim-cleanup) already on its way to the slot: it travels back from where it is to the aim pocket
            m.beginTravel(this.player.rig, this.carrySlots[this.held]!, true);
            this.swapT = SWAP_TIME * TRAVEL_IN;
            this.swapPhase = 2;
            this.aimDriven = false;
          } else {
            this.swapT = -1;
            this.swapPhase = 0;
            this.aimDriven = false;
          }
        }
      }
    }

    // swap (pressing again mid-swap keeps cycling)
    // (step 09: marks are gone and the gun is drawn only while aiming, so RB swaps while aiming too)
    // (F1a) the selection wheel names a gun (`switchTo`); LB tap / T is the next one
    const target = this.switchTarget;
    this.switchTarget = -1;
    const swapPress = inp.pressed('swapNext') || inp.pressed('swapPrev') || (target >= 0 && target !== this.index);
    if (swapPress && this.slots.length > 1 && !this.throwing && !(this.stowed && this.attachMode)) {
      const d = inp.pressed('swapNext') ? 1 : -1;
      this.cancelReload();
      this.aimDriven = false;
      this.index = target >= 0 && target < this.slots.length && !inp.pressed('swapNext') && !inp.pressed('swapPrev') ? target : (this.index + d + this.slots.length) % this.slots.length;
      if (this.stowed) {
        // (step 09 fix 4) holstered, the selection is the weapon carried at the ready: its move speed and zoom
        // apply now (as a drawn swap's equip would), not the last drawn gun's - holstering never changes the gait
        this.player.controller.speedMul = this.current.def.moveSpeedMult;
        this.applyAimCamera();
        // (CT prototype G2, AUDIT-AIM row 13) holstered and settled the swap is the selection only: CT's hero stays idle,
        // arms at the sides, no body motion (051812 6-10.8); the next aim draws the new gun from its slot
        if (!this.attachMode && (this.swapT < 0 || this.swapPhase >= 1)) {
          // (anim-natural N3 fix) a rewinding draw is cut short: the gun goes to its slot (the old mid-draw snap)
          if (this.rewind) {
            this.rewind = false;
            this.holsterAll(-1);
          }
          this.swapT = SWAP_TIME * SWAP_HOLSTER;
          this.swapPhase = 1;
          this.player.swapFrom = this.player.swapTo = this.reach(this.index);
          this.events.onSwap?.(this.current.def);
          return;
        }
      }
      if (this.swapT < 0) {
        this.swapT = 0;
        this.swapPhase = 0;
        this.player.swapFrom = this.reach(this.held);
      } else if (this.swapPhase >= 2) {
        // already drawing: the drawn gun goes back to its slot and the hand goes for the new choice
        this.player.swapFrom = this.reach(this.held);
        this.holsterAll(-1);
        this.swapT = SWAP_TIME * SWAP_HOLSTER;
        this.swapPhase = 1;
      }
      // (before the draw starts the hand simply goes for the new choice)
      this.player.swapTo = this.reach(this.index);
      this.events.onSwap?.(this.current.def);
      return;
    }
    if (this.swapT >= 0) {
      const t0 = this.swapT;
      // stowing for a climb / hang is quick: both hands are wanted on the anchor
      if (this.rewind) {
        // (anim-natural N3 fix) a draw holstered mid-way runs backwards to the holstered beat on its own clock
        this.rewTau += dt;
        this.swapT = Math.min(SWAP_TIME * (1 - 1e-6), this.rewindStep(this.swapT, this.rewTau, dt));
      } else if (this.aimDriven) {
        // a draw / holster from aim keeps pace with the draw state (drawTime / holsterTime: N3 1.1 / 0.75 s draws, 1.0 / 0.9 s
        // holsters, a traversal's 0.15 s)
        const left = this.draw.remaining(this.drawTime(), this.holsterTime());
        const togo = (this.stowed ? SWAP_TIME * SWAP_HOLSTER : SWAP_TIME) - this.swapT;
        this.swapT += left > dt ? Math.max(0, togo) * (dt / left) : Math.max(0, togo);
      } else this.swapT += ((this.stowed && this.swapPhase === 0 ? dt * STOW_RATE : dt) * clipSpeed('swap')) / this.handsMul; // (clip-speed, track A) = SWAP_TIME / speed
      this.swapRate = (this.swapT - t0) / dt;
      // the outgoing gun goes into its slot (hands empty), the hand takes the next from its slot and
      // brings it up, then it settles into the aim pocket with both hands on it
      let f = this.swapT / SWAP_TIME;
      // (anim-cleanup) the outgoing gun travels to its slot in the trigger hand (no teleport, never across the face)
      const out = this.held >= 0 ? this.slots[this.held] : undefined;
      // (check fix r1) a gun still in (or easing out of) the left hand waits in the pocket until it is back in the right
      if (this.swapPhase === 0 && f >= TRAVEL_OUT && !out?.model.travelling && (this.hand.hand < 0 || this.hand.switching)) {
        this.swapT = SWAP_TIME * TRAVEL_OUT;
        f = TRAVEL_OUT;
      }
      if (this.swapPhase === 0 && out && f >= TRAVEL_OUT && f < SWAP_HOLSTER && out.model.canTravel(this.carrySlots[this.held] ?? null) && this.hand.hand > 0 && !this.hand.switching) {
        if (!out.model.travelling) out.model.beginTravel(this.player.rig, this.carrySlots[this.held]!, false);
        out.model.travel(this.player.rig, (f - TRAVEL_OUT) / (SWAP_HOLSTER - TRAVEL_OUT));
      }
      if (this.swapPhase === 0 && f >= SWAP_HOLSTER) {
        this.swapPhase = 1;
        this.holsterAll(-1);
      }
      // stowed: hold at the holstered beat (hands empty) until drawn again
      if (this.stowed && this.swapPhase >= 1 && !this.rewind) this.swapT = SWAP_TIME * SWAP_HOLSTER;
      else if (this.swapPhase === 1) {
        // (anim-cleanup) the next gun leaves its slot in the trigger hand and travels to the aim pocket
        const next = this.slots[this.index]!;
        const from = this.carrySlots[this.index] ?? null;
        if (next.model.canTravel(from) && f >= TRAVEL_IN) {
          this.swapPhase = 2;
          // (anim-rework S3, M2) LT from holstered: the sling draw (the gun off the sling under the arm, up into the shoulder)
          next.model.beginTravel(this.player.rig, from!, true, this.player.stance.slingDraw);
        } else if (!next.model.canTravel(from) && f >= SWAP_TAKE) {
          this.swapPhase = 2;
          next.model.inHand(this.player.rig);
        }
      }
      // (anim-natural N3) the incoming travel runs to the clip's end (the settle in the final pose); held at its end
      let inTravel = false;
      if (this.swapPhase === 2) {
        const m = this.slots[this.index]!.model;
        inTravel = m.travelling;
        if (inTravel) m.travel(this.player.rig, (f - TRAVEL_IN) / (1 - TRAVEL_IN));
      }
      if (this.rewind && this.swapT <= SWAP_TIME * TRAVEL_IN + 1e-9) {
        // (anim-natural N3 fix) the rewind is back at the holstered beat: the gun is seated, the hand off it
        this.rewind = false;
        this.holsterAll(-1);
        this.swapPhase = 1;
        this.swapT = SWAP_TIME * SWAP_HOLSTER;
      } else if (this.swapPhase === 2 && !this.rewind && f >= (inTravel ? 1 - 1e-9 : SWAP_HOLD)) {
        this.swapPhase = 3;
        this.equip(this.index);
      }
      if (this.swapT >= SWAP_TIME) {
        this.swapT = -1;
        this.aimDriven = false;
      }
    }
    // hands busy on an anchor: nothing else; holstered by aim, a grenade / gadget throw still runs
    if (this.stowed && this.attachMode) return;
    // grenade: prep, pin, wind-up, release (thrown), recover
    if (this.grenadeT >= 0) {
      this.grenadeT += dt * clipSpeed('grenade'); // (clip-speed, track A) = GRENADE_TIME / speed, the release with it
      if (!this.grenadeThrown && this.grenadeT >= GRENADE_TIME * GRENADE_RELEASE) {
        this.grenadeThrown = true;
        this.releaseGrenade();
      }
      if (this.grenadeT >= GRENADE_TIME) this.grenadeT = -1;
    }

    // (anim-cleanup) the magazine and the support hand's reload points follow the reload (seated when there is none)
    this.reloadVisuals(s);
    // reload
    if (this.reloadT >= 0) {
      this.reloadT -= dt;
      if (this.reloadT < 0) {
        const need = s.stats.magSize - s.mag;
        const take = this.infiniteAmmo ? need : Math.min(need, s.reserve);
        s.mag += take;
        if (!this.infiniteAmmo) s.reserve -= take;
      }
    } else {
      const canReload = !this.throwing && s.mag < s.stats.magSize && (s.reserve > 0 || this.infiniteAmmo);
      // (anim-rework S1, A2) X held while drawn reloads; with nothing to reload the hold is the holster (the tap's job)
      const xHold = this.player.stance.holdAsk;
      if (xHold && !canReload && !this.attachMode) this.player.stance.holster();
      const ask = inp.pressed('reload') || (xHold && canReload);
      // (A43) holstered or mid draw / holster (not attached): queue it; the draw comes out to low ready first
      if (ask && canReload && !this.attachMode && !this.drawLock && this.draw.phase !== DRAW_DRAWN) {
        this.reloadQueued = true;
        // (anim-rework S1) the gun comes out for it: the state is low ready (it stays out after the reload)
        this.player.stance.readyForReload();
      }
      if (!canReload || this.attachMode || this.drawLock) this.reloadQueued = false;
      if (this.reloadQueued) {
        if (this.draw.phase === DRAW_DRAWN && !this.swapping) {
          this.reloadQueued = false;
          this.startReload();
        }
      } else if (ask && canReload && !this.swapping) this.startReload();
    }

    // (gadget throws are started by the gadget system: tap / hold of the gadget button decides use vs wheel)

    // fire
    // (step 09) no hip fire: only drawn and aimed (fire while holstered does nothing: no shot, click or bloom)
    if (this.draw.phase !== DRAW_DRAWN) {
      this.queuedT = 0;
      return;
    }
    // (anim-rework S1, A3) no fire from low ready: the trigger is live only while aiming
    if (!this.player.ads) {
      this.queuedT = 0;
      return;
    }
    if (inp.pressed('fire')) this.queuedT = 0.35;
    this.queuedT = Math.max(0, this.queuedT - dt);
    if (!fireReady(this.draw.phase, this.player.cam.ads)) return;
    const wants = s.def.fireMode === 'auto' ? inp.down('fire') : this.queuedT > 0;
    if (!wants || this.swapping || this.reloading || this.throwing || ctl.weaponBlocked || this.cooldown > 0) return;
    // raise-to-fire: the trigger is live only once the weapon is up from its ready position
    if (!this.player.carry.canFire(this.player.carryIn)) return;
    this.queuedT = 0;
    if (s.mag <= 0) {
      if (inp.pressed('fire')) this.events.onDryFire?.(s.def);
      if (s.reserve > 0 || this.infiniteAmmo) this.startReload();
      return;
    }
    this.shoot();
  }

  /**
   * (anim-cleanup) Through a reload the magazine goes from the well to the left hand, to the pouch and back, and is
   * seated (WeaponModel.magFollow, the clip's beats); the support hand's magazine point is the weapon's `magHold`, then on
   * an empty reload its charging handle / slide, pulled back along `chargePull` round the `charge` beat and let go.
   */
  private reloadVisuals(s: WeaponSlot): void {
    const rig = this.player.rig;
    const def = s.def;
    const ev = reloadClipFor(def.weight ?? classWeight(def.class), this.reloadEmpty).events;
    const rt = this.reloadT >= 0 ? 1 - this.reloadT / this.reloadTotal : -1;
    s.model.magFollow(rig, rt, ev.magOut ?? 0, ev.magIn ?? 1);
    if (!rig.heldWeapon || rig.heldWeapon !== s.model.node) return;
    const mh = def.magHold;
    const ch = def.charge;
    const at = ev.charge ?? -1;
    if (rt >= 0 && this.reloadEmpty && ch && at > 0 && rt >= (ev.magIn ?? 1) + 0.04) {
      // pulled back over the 0.06 before the beat, let go (snaps forward) over the 0.03 after
      const back = rt < at ? Math.max(0, (rt - (at - 0.06)) / 0.06) : Math.max(0, 1 - (rt - at) / 0.03);
      rig.magPoint.set(ch[0], ch[1], ch[2] + (def.chargePull ?? 0) * back * back * (3 - 2 * back));
    } else if (mh) rig.magPoint.set(mh[0], mh[1], mh[2]);
  }

  /**
   * (anim-cleanup, check fix r1) A reload cut short (a swap, a stow for a ladder or a hang, a throw): the magazine goes
   * back into the gun it came from at once and the hand lets it go, before the gun is put away.
   */
  private cancelReload(): void {
    if (this.reloadT >= 0) this.slots[this.held]?.model.magSeated();
    this.reloadT = -1;
    this.player.rig.holdingMag = false;
  }

  /** (anim-cleanup) The weapon may change hands (the shoulder swap) only settled in the aim pocket, never mid-reload. */
  get handSwitchOk(): boolean {
    return this.swapT < 0 && this.reloadT < 0 && !this.stowed;
  }

  /** Tactical reload (a round still chambered) or the longer empty reload (charging handle). */
  private startReload(): void {
    const s = this.current;
    this.reloadEmpty = s.mag <= 0;
    this.reloadTotal = s.stats.reloadTime * (this.reloadEmpty ? RELOAD_EMPTY_MULT : RELOAD_TACTICAL_MULT);
    this.reloadT = this.reloadTotal;
    this.events.onReload?.(s.def);
  }

  /** Throw / use the selected gadget (the gadget system calls this; frag with no handler). Returns false when it
   *  cannot (none left, busy). Thrown kinds play the throw and go out at its release (`onThrow`). */
  useGadget(): boolean {
    if (this.grenadeCd > 0 || this.throwing || (this.stowed ? this.attachMode : this.swapping)) return false;
    const g = this.gadgets;
    const def = GADGETS[g.selected];
    if (def.use === 'place') {
      if (!this.onPlace || !g.take()) return false;
      this.grenadeCd = GRENADE.cooldown;
      this.onPlace(g.selected);
      return true;
    }
    if (!g.take()) return false;
    this.throwKind = g.selected;
    this.grenadeCd = GRENADE.cooldown;
    this.cancelReload();
    this.grenadeT = 0;
    this.grenadeThrown = false;
    return true;
  }

  /** Where a throw leaves the hand and its launch velocity (the predicted arc uses the same). */
  throwStart(outFrom: Vector3, outVel: Vector3): void {
    const cam = this.player.cam;
    outFrom.copyFrom(cam.pivot).addInPlaceFromFloats(0, 0.1, 0).addInPlace(cam.forward.scale(0.5));
    const v = this.player.controller.cc.getVelocity();
    outVel.copyFrom(cam.forward).scaleInPlace(GRENADE.throwSpeed).addInPlaceFromFloats(0, GRENADE.upBias, 0).addInPlace(v.scale(0.5));
  }

  private releaseGrenade(): void {
    const from = new Vector3();
    const vel = new Vector3();
    this.throwStart(from, vel);
    if (this.onThrow) this.onThrow(this.throwKind, from, vel);
    else this.grenadeSys.throw(from, vel, 'player', 'local', undefined, true);
    this.player.aimLockTimer = 0.4;
    this.events.onGrenade?.();
  }

  onThrow: ((id: GadgetId, from: Vector3, vel: Vector3) => void) | null = null;
  onPlace: ((id: GadgetId) => void) | null = null;
  private throwKind: GadgetId = 'frag';

  /** Frags carried (belt pouches, pickups). */
  get grenades(): number {
    return this.gadgets.counts.frag;
  }

  /** (sd-rounds) The last shot's noise stat and whether it was quiet (true before any shot). */
  lastShotNoise = 0;
  lastShotQuiet = true;
  /** (coop-walk-fixes P7) Rounds fired this session (any weapon): the wire's `PlayerState.sc` (mod 256), so a partner
   *  plays each round once (the 0.2 s `firingRecently` window played a single shot twice). */
  shotCount = 0;

  private shoot(): void {
    const s = this.current;
    const def = s.def;
    const cam = this.player.cam;
    s.mag--;
    const had = s.sd;
    this.lastShotNoise = spendShot(s, this.infiniteAmmo);
    this.lastShotQuiet = this.lastShotNoise <= SUPPRESSED_NOISE;
    if (had > 0 && s.sd === 0) this.events.onSdOut?.(def);
    this.cooldown = s.stats.fireInterval;
    this.sinceShot = 0;
    this.shotCount++;
    this.player.aimLockTimer = 0.7;
    this.player.kick = 1;
    this.tallyFor(def.id).shots++;

    // 1) where is the crosshair pointing? (ray starts level with the player, not behind the camera)
    cam.aimRay(this.tmpO, this.tmpD);
    const toPivot = cam.pivot.subtract(this.tmpO);
    const startAlong = Math.max(0, Vector3.Dot(toPivot, this.tmpD));
    const camStart = this.tmpO.add(this.tmpD.scale(startAlong));
    const aimEnd = camStart.add(this.tmpD.scale(def.range));
    const aimHit = this.ballistics.ray(camStart, aimEnd, MASK.PLAYER_SHOT);
    const aimPoint = aimHit.hit && aimHit.distance > 0.5 ? aimHit.point : aimEnd;

    // 2) fire from the muzzle towards the aim point. If the barrel pokes through a wall (the line from the
    // shooter's head to the muzzle is blocked) the round starts at the head instead and hits that wall.
    // The head, not the camera pivot: leaning out past a cover edge, the pivot stays behind the cover
    // and the line from it would cut the corner the shooter is leaning round.
    // (rig-pose-fix S2, G6) Both points from the sim (`shotOrigin.ts`: feet, crouch, lean, shoulder side, inverted, the
    // aim, the barrel; S3: the eye is the one sim head, S1's body model), never the animated pose; the rig's muzzle only
    // places the tracer, flash and casing (P6).
    s.model.muzzleWorld(this.muzzle);
    const eye = this.shotPoint(this.tmpD, this.shotO, this.shotE);
    const head = this.shotE;
    const origin = eye && this.ballistics.ray(head, this.shotO, MASK.WORLD).hit ? head : this.shotO;
    const baseDir = aimPoint.subtract(origin).normalize();
    const spread = this.currentSpread();
    const dir = new Vector3();
    // (rig-pose-fix S2) the round's origin is the hit's source (a client sends it as its claimed `shot` ox / oy / oz; a
    // guard reads it as the stimulus); a projectile keeps its own copy (it lands after later shots)
    const from = def.kind === 'projectile' ? origin.clone() : origin;
    let firstEnd: Vector3 | null = null;
    for (let p = 0; p < def.pellets; p++) {
      const off = sampleSpread(spread, Math.random(), Math.random());
      spreadDir(baseDir, off.x, off.y, dir);
      if (def.kind === 'projectile') {
        this.ballistics.spawnProjectile(origin, dir.scale(def.projectileSpeed ?? 300), def.projectileGravity ?? 0, def.range / (def.projectileSpeed ?? 300) + 0.2,
          { team: 'player', id: 'local', collideWith: MASK.PLAYER_SHOT }, def.tracer,
          (h, d, travelled) => this.resolveHit(h, d, travelled, s, from));
        continue;
      }
      const end = origin.add(dir.scale(def.range));
      const h = this.ballistics.ray(origin, end, MASK.PLAYER_SHOT);
      this.lastShot = { origin: origin.clone(), aim: aimPoint.clone(), hit: h.point.clone(), target: h.target?.id ?? (h.prop ? 'prop' : h.hit ? 'world' : 'none') };
      this.resolveHit(h, dir.clone(), h.distance, s, from);
      this.onRay?.(origin, h.point);
      // penetration: through thin world geometry, on with half the damage
      if (s.pen > 0 && h.hit && !h.target && !h.prop && !h.armoured) this.penetrate(h.point, dir, h.distance, s, from);
      if (!firstEnd || p % 3 === 0) {
        firstEnd = h.point;
        this.vfx.tracer(this.muzzle, h.point, def.tracer, def.pellets > 1 ? 0.012 : 0.022);
      }
    }
    // brass (not for the shotgun pump or sniper bolt mid-shot)
    if (def.class !== 'shotgun') this.vfx.casing(this.muzzle.subtract(baseDir.scale(0.3)), new Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)), this.player.position.y);
    // muzzle flash, recoil, bloom
    // a suppressor hides most of the flash
    this.vfx.muzzleFlash(this.muzzle, (def.pellets > 1 ? 0.3 : def.class === 'pistol' ? 0.16 : 0.22) * (this.lastShotQuiet ? 0.35 : 1));
    const k = recoilKick(def, s.stats, this.shotIndex++);
    const adsDamp = 1 - cam.ads * 0.35;
    cam.kick(k.pitch * DEG * adsDamp, k.yaw * DEG * adsDamp);
    // (CT prototype G2, AUDIT-AIM row 11) no camera shake on a rifle / pistol shot: CT's view holds still on the shot frames
    // (111953 3.87, 6.27-6.33: < 0.5 deg); was 0.04
    if (def.class === 'sniper' || def.class === 'shotgun') cam.shake(def.class === 'sniper' ? 0.25 : 0.2);
    this.bloom += def.spreadPerShot;
    this.shotFeel(this.lastShotQuiet);
    this.events.onShot?.(def);
  }

  /** Rounds through thin material (m), tests. */
  penetrations = 0;

  /** A round that stopped on world geometry: if it is thinner than the weapon's penetration, carry on past it. */
  private penetrate(at: Vector3, dir: Vector3, travelled: number, s: WeaponSlot, from: Vector3): void {
    // from beyond the far side back towards the entry: the first face hit is the exit
    const far = at.add(dir.scale(s.pen + 0.02));
    const back = this.ballistics.ray(far, at, MASK.WORLD);
    if (!back.hit || back.distance < 0.005) return;
    const exit = back.point.add(dir.scale(0.01));
    const left = s.def.range - travelled;
    if (left <= 0.5) return;
    const h2 = this.ballistics.ray(exit, exit.add(dir.scale(left)), MASK.PLAYER_SHOT);
    this.penetrations++;
    this.resolveHit(h2, dir.clone(), travelled + h2.distance, s, from, 0.5);
    this.onRay?.(exit, h2.point);
  }

  /** `from`: the round's origin, the hit's `sourcePos` (a client sends it as its claimed `shot` origin). (train 54
   *  e2e-course) Optional: a caller without one (the e2e suites' real hit path, `resolveHit(h, dir, dist, slot)`) gets
   *  the sim shot origin along `dir` (`simShotSource`), never the rig and never undefined. */
  private resolveHit(h: RayHit, dir: Vector3, travelled: number, s: WeaponSlot, from?: Vector3, factor = 1): void {
    if (!h.hit) return;
    this.ballistics.impactFx(h, dir);
    const head = h.part === 'head';
    const dmg = damageAt(s.def, s.stats, travelled, head) * factor;
    if (h.target && (h.target.team !== 'player' || h.target.shootable === true)) {
      const res = h.target.applyDamage({
        amount: dmg,
        point: h.point,
        dir,
        part: h.part ?? 'body',
        kind: 'bullet',
        attackerTeam: 'player',
        attackerId: 'local',
        weapon: s.def.id,
        sourcePos: from ? from.clone() : this.simShotSource(dir),
        impulse: s.def.impulse,
      });
      const t = this.tallyFor(s.def.id);
      t.hits++;
      if (head) t.heads++;
      if (res.killed) t.kills++;
      this.events.onHit?.(res.killed ? 'kill' : res.deflect ? 'deflect' : head ? 'head' : 'hit', s.def.id, res.dealt);
    } else if (h.prop) {
      this.world.props.impulse(h.prop, dir.scale(s.def.impulse), h.point);
      this.world.props.damage(h.prop, dmg);
    }
  }

  /** (train 54 e2e-course) The sim shot origin along `dir` (`shotPoint`), a fresh vector: `resolveHit`'s source when the
   *  caller gave none. */
  private simShotSource(dir: Vector3): Vector3 {
    this.shotPoint(dir, this.shotO, this.shotE);
    return this.shotO.clone();
  }

  dispose(): void {
    this.pouches.dispose();
    this.knife.dispose();
    for (const s of this.slots) s.model.dispose();
  }
}
