import type { Scene } from '../core/babylon';
import { hyp2 } from '../core/mathx';
import { InputState } from '../input/inputState';
import { CharacterRig, type RigPose, type WorldTarget } from '../player/characterRig';
import type { Player } from '../player/player';
import type { World } from '../world/world';
import type { DebugOverlay } from '../ui/debugOverlay';
import { defaultLook } from '../cosmetics/avatarLook';
import { avatarFactory } from '../cosmetics/avatarFactory';
import { loadPlayLods, operatorRig, partnerFigureFrame, PLAYER_HEIGHT, type OperatorRig } from '../operators/runtime/playerFigure';
import { GRAB } from './takedown';
import { FREE_VIEW } from '../player/freeView';
import { clearGripAxis } from '../player/attachGrips';
import { TUNE_BODY } from '../anim/tune';
import { TUNE_FLAGS, TUNE_STATE_BAG } from '../anim/tuneRegistry';
import { MOVE_TUNE_TEAM, moveTuneBegin, moveTuneEnd, moveTuneRoot, moveTuneSelect } from '../anim/moveTune';
import { newStudioDrive } from '../anim/studioDrive';
import { newPairRole, pairFrames, pairPose, ropeLine, type PairRole } from '../anim/studioPairs';
import { newTravOut, newTravState, PAIR_STATION, STUDIO_MID, travTick, type TravButton, type TravEntry } from '../anim/studioTraversal';
import { STUDIO, STUDIO_PAIR, STUDIO_RIGS, STUDIO_TARGET, studioAdvance, studioEntry, studioInput, studioReset, studioScrub, studioSpot, studioStepPhase, spotShift, type StudioEntry, type StudioInputOut } from '../anim/studio';

/** What the stage needs from the match (GameState). */
export interface StudioHost {
  readonly player: Player;
  readonly scene: Scene;
  readonly world: World;
  readonly debug: DebugOverlay;
  /** The weapon's draw phase (0 holstered). */
  drawPhase(): number;
  /** Crouch is a toggle in the settings (else held). */
  crouchToggle(): boolean;
  /** (anim-studio-2) Put Wren at a spot (feet) facing `yaw`, the camera behind her: off any anchor, wall or move. */
  teleport(x: number, y: number, z: number, yaw: number): void;
  /** (anim-studio-2) The door menu's Open on the stage's door (the G6 committed step and the door's own open). */
  doorOpen(): void;
  /** (anim-studio-2) Every door on the stage shut (a loop's reset). */
  doorsShut(): void;
  /** (anim-studio-2) The anchor kind Wren is attached to ('' none). */
  attachKind(): string;
  /** (tuner-ui) Move Wren and her feet by (dx, dz) with no teleport (the treadmill of a state on the spot). */
  shift(dx: number, dz: number): void;
}

/** The pairs' viewing spot: Wren (hidden) stands here, so the camera and the free view frame the team block. */
const PAIR_VIEW = { x: PAIR_STATION.x, z: PAIR_STATION.z - 6.5, yaw: 0 };
const ROPE_KEY = 'studio-pair-rope';
const TRAV_BUTTONS: readonly TravButton[] = ['jump', 'interact', 'drop', 'cover'];

/** A puppet's pose bag (reused). */
function newPose(): RigPose {
  return { speed: 0, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing', traverse: 'none', traverseT: 0, tumble: 0, kneel: false };
}

/**
 * (anim-studio) The Anim Studio stage (the `studio` map, single player only): opens the tuner panel docked and the debug
 * overlay (the crab readout), plays the loop player's choice (`STUDIO.entry`):
 * - a procedural state by synthesised input (`input`, per fixed step: the stick, aim, crouch and draw; `frame` turns the
 *   game camera so a moving loop walks the 2 m circle);
 * - a keyed clip through a drive on the rig's graph (`studioDrive.ts`): in place (treadmill feet, the studio owns the
 *   phase: scrub and step) or, with root motion on, along the circle on the graph's gait clock;
 * - an optional guard figure (a plain rig, no AI, no hitboxes) at the hold offset in front of Wren; a guard clip plays on
 *   it while it is on.
 * (anim-studio-2)
 * - a co-op pair: two Wren puppets (plain local rigs with her figure; Wren herself is hidden and stands back so the camera
 *   frames them) posed through the team move's own paths and timing on ONE clock (`studioPairs.ts`), each through its
 *   role's move section (`moveTune.ts`) exactly as the local player is in real play; no network;
 * - a hold pair: Wren's hold clip and the guard's clip in place on one clock (both drives held to the pair's phase);
 * - a traversal loop: Wren is reset to the prop's start, walks in and plays the move by synthesised input on the real
 *   geometry and anchors (`studioTraversal.ts`), then again.
 * Leaving (`dispose`) takes every drive off, removes the guard and the puppets, closes what it opened and resets the
 * studio state.
 */
export class StudioStage {
  /** The game's input while a loop plays (none of the devices' buttons reach the game then, except pause). */
  readonly inp = new InputState();
  private readonly out: StudioInputOut = { x: 0, y: 0, turn: 0, ads: false, crouch: false, drawn: false };
  private readonly drive = newStudioDrive();
  /** (anim-studio-2) The guard's drive in a hold pair. */
  private readonly gdrive = newStudioDrive();
  private target: CharacterRig | null = null;
  private guard: CharacterRig | null = null;
  private readonly guardPose: RigPose = { speed: 0, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' };
  private crouchCd = 0;
  private drawCd = 0;
  // the configuration applied (changes rebuild the drive)
  private cEntry = '';
  private cRoot = false;
  private cMirror = false;
  private cGuard = false;
  private openedPanel = false;
  private shownDebug = false;
  // (anim-studio-2) the pairs: two puppets, their roles and poses, the pair clock
  private puppets: [OperatorRig, OperatorRig] | null = null;
  private puppetsShown = false;
  private readonly rA: PairRole = newPairRole();
  private readonly rB: PairRole = newPairRole();
  private readonly pA: RigPose = newPose();
  private readonly pB: RigPose = newPose();
  private pairPhase = 0;
  private readonly rope = { x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0 };
  private ropeShown = false;
  /** Wren is hidden (a team pair plays with the puppets). */
  private hidden = false;
  /** Wren is away from the middle (a pair or a loop moved her): back to it for a state or a clip. */
  private away = false;
  // (anim-studio-2) the traversal loop
  private readonly trav = newTravState();
  private readonly travOut = newTravOut();
  // (tuner-ui) a state on the spot: held at (spotX, spotZ) from its first step
  private spotOn = false;
  private spotX = 0;
  private spotZ = 0;
  private readonly spotD = { x: 0, z: 0 };

  constructor(private readonly host: StudioHost) {
    studioReset();
    STUDIO.active = true;
    STUDIO_RIGS.push(host.player.rig);
    const d = host.debug;
    if (!d.isVisible) {
      d.toggle(true);
      this.shownDebug = true;
    }
    if (!d.animTune.isOpen) {
      d.animTune.show();
      this.openedPanel = true;
    }
  }

  /** A loop plays (the game reads `inp`, not the devices). */
  get drives(): boolean {
    return STUDIO.entry !== 'off';
  }

  /** Per fixed step while `drives`: the loop's stick, aim, crouch (held, or one press per 0.5 s as a toggle) and draw
   *  (one tap per 0.6 s while drawn differs from what the loop wants); a traversal loop's own stick and buttons. No
   *  allocation. */
  input(dt: number): InputState {
    const fi = this.inp;
    fi.consumeEdges();
    fi.tick(dt);
    const e = studioEntry(STUDIO.entry);
    if (e.trav) return this.travInput(dt, e.trav);
    const o = studioInput(e, STUDIO.rootMotion, this.out, STUDIO.spot);
    fi.move.x = o.x;
    fi.move.y = o.y;
    fi.set('studio', 'ads', o.ads);
    this.crouchCd = Math.max(0, this.crouchCd - dt);
    let crouch = false;
    if (!this.host.crouchToggle()) crouch = o.crouch;
    else if (o.crouch !== this.host.player.controller.crouched && this.crouchCd <= 0) {
      crouch = true;
      this.crouchCd = 0.5;
    }
    fi.set('studio', 'crouch', crouch);
    // a traversal loop's buttons up (the drop stays the crouch's alias)
    for (let i = 0; i < TRAV_BUTTONS.length; i++) if (TRAV_BUTTONS[i] !== 'drop') fi.set('studio', TRAV_BUTTONS[i]!, false);
    this.drawTap(dt, o.drawn, o.ads);
    return fi;
  }

  /**
   * (tuner-ui) After the player's fixed step: a moving state on the spot is held where it started (a treadmill): the
   * body goes back by what it moved and the planted feet with it, so the gait runs with no travel. No allocation.
   */
  afterStep(): void {
    const e = studioEntry(STUDIO.entry);
    const on = this.drives && studioSpot(e, STUDIO.spot);
    const p = this.host.player.position;
    if (on && !this.spotOn) {
      this.spotX = p.x;
      this.spotZ = p.z;
    }
    this.spotOn = on;
    if (!on) return;
    const d = spotShift(p.x, p.z, this.spotX, this.spotZ, this.spotD);
    if (d.x * d.x + d.z * d.z < 1e-12) return;
    this.host.shift(-d.x, -d.z);
  }

  /** One draw tap per 0.6 s while drawn differs from what the loop wants. */
  private drawTap(dt: number, want: boolean, ads: boolean): void {
    this.drawCd = Math.max(0, this.drawCd - dt);
    const drawn = this.host.drawPhase() !== 0;
    let tap = false;
    if (!ads && want !== drawn && this.drawCd <= 0) {
      tap = true;
      this.drawCd = 0.6;
    }
    this.inp.set('studio', 'draw', tap);
  }

  /** (anim-studio-2) A traversal loop's step: reset to the start, the walk in, the act's stick and buttons. */
  private travInput(dt: number, t: TravEntry): InputState {
    const fi = this.inp;
    const pl = this.host.player;
    const p = pl.position;
    const o = travTick(t, this.trav, dt, hyp2(p.x - t.start.x, p.z - t.start.z), this.travOut);
    if (o.teleport) {
      this.host.doorsShut();
      this.host.teleport(t.start.x, t.start.y, t.start.z, t.start.yaw);
      this.away = true;
    }
    if (!Number.isNaN(o.face)) pl.cam.yaw = t.start.yaw + o.face;
    if (o.call === 'doorOpen') this.host.doorOpen();
    fi.move.x = o.x;
    fi.move.y = o.y;
    fi.set('studio', 'ads', false);
    fi.set('studio', 'crouch', false);
    for (let i = 0; i < TRAV_BUTTONS.length; i++) {
      const b = TRAV_BUTTONS[i]!;
      fi.set('studio', b, b === o.hold || b === o.press);
    }
    this.drawTap(dt, false, false);
    const s = STUDIO_PAIR;
    s.travPhase = this.trav.phase;
    s.travStep = this.trav.step;
    s.travLoops = this.trav.loops;
    s.attach = this.host.attachKind();
    s.traverse = pl.pose.traverse ?? 'none';
    return fi;
  }

  /** Per rendered frame, before the player animates: the configuration, the circle's camera turn, the scrub / step
   *  requests, the guard figure, the pairs and the readout. */
  frame(dt: number, look: { x: number; y: number }): void {
    const e = studioEntry(STUDIO.entry);
    this.configure(e);
    if (dt > 0 && this.drives && e.kind !== 'trav' && e.kind !== 'pair') look.x += studioInput(e, STUDIO.rootMotion, this.out, STUDIO.spot).turn * dt;
    const d = this.drive;
    if (e.kind === 'pair') {
      // the pair's one clock: both rigs (the puppets, or Wren and the guard) at the same phase
      if (dt > 0) this.pairPhase = studioAdvance(this.pairPhase, dt, e.cycle);
      if (!Number.isNaN(STUDIO.seek)) this.pairPhase = studioScrub(STUDIO.seek);
      if (STUDIO.step !== 0) this.pairPhase = studioStepPhase(this.pairPhase, e.team ? pairFrames(e.cycle) : (e.clip?.frames ?? 1), STUDIO.step);
      d.phase = this.gdrive.phase = this.pairPhase;
    } else if (d.clip && d.inPlace) {
      if (!Number.isNaN(STUDIO.seek)) d.phase = studioScrub(STUDIO.seek);
      if (STUDIO.step !== 0) d.phase = studioStepPhase(d.phase, d.clip.frames, STUDIO.step);
    }
    STUDIO.seek = Number.NaN;
    STUDIO.step = 0;
    if (this.guard) this.guardFrame(dt, e.kind === 'pair');
    if (e.team) this.pairFrame(dt, e);
    STUDIO.phase = e.kind === 'pair' ? this.pairPhase : d.clip ? d.phase : 0;
    STUDIO.frames = e.team ? pairFrames(e.cycle) : d.clip ? d.clip.frames : 0;
  }

  /** Apply a changed choice: the drive onto the right rig (Wren, or the guard for a guard clip while it is on); a hold
   *  pair's two drives; a team pair's puppets; a traversal loop's start. */
  private configure(e: StudioEntry): void {
    const wantGuard = STUDIO.guard || (e.kind === 'pair' && !!e.guardClip);
    if (e.id === this.cEntry && STUDIO.rootMotion === this.cRoot && STUDIO.mirror === this.cMirror && wantGuard === this.cGuard) return;
    const clipChanged = e.id !== this.cEntry;
    this.cEntry = e.id;
    this.cRoot = STUDIO.rootMotion;
    this.cMirror = STUDIO.mirror;
    this.cGuard = wantGuard;
    if (wantGuard && !this.guard) this.makeGuard();
    else if (!wantGuard && this.guard) this.dropGuard();
    this.detach();
    if (clipChanged) {
      this.pairPhase = 0;
      this.trav.phase = 'reset';
      this.trav.step = 0;
      this.trav.t = 0;
      this.trav.loops = 0;
      const s = STUDIO_PAIR;
      s.aState = s.bState = 'none';
      s.aGroup = s.bGroup = s.travPhase = s.attach = s.traverse = '';
      s.k = s.travLoops = 0;
      MOVE_TUNE_TEAM.follow = '';
      // Wren back to the middle for a state, a clip or a hold pair (a loop or a team pair moved her)
      if (this.away && !e.trav) {
        this.host.doorsShut();
        this.host.teleport(STUDIO_MID, 0, STUDIO_MID, 0);
        this.away = false;
      }
    }
    // a team pair: the puppets, Wren hidden at the viewing spot
    this.showPuppets(!!e.team);
    this.hideWren(!!e.team);
    if (e.team && clipChanged) {
      this.host.teleport(PAIR_VIEW.x, 0, PAIR_VIEW.z, PAIR_VIEW.yaw);
      this.away = true;
    }
    if (!e.team && this.ropeShown) {
      this.host.world.ropes.hide(ROPE_KEY);
      this.ropeShown = false;
    }
    const d = this.drive;
    d.clip = e.clip;
    d.held = false;
    if (e.clip) {
      const pair = e.kind === 'pair';
      const rig = e.guard && this.guard ? this.guard : this.host.player.rig;
      d.inPlace = pair || rig === this.guard || !(STUDIO.rootMotion && e.circle);
      d.held = pair;
      d.cycle = e.cycle;
      d.mirror = STUDIO.mirror;
      d.drawn = e.drawn;
      d.crouch = e.crouch;
      d.pace = e.pace;
      d.dirX = e.move === 'side' ? 1 : 0;
      d.dirZ = e.move === 'fwd' ? 1 : e.move === 'back' ? -1 : 0;
      if (clipChanged) d.phase = 0;
      d.inL = d.inR = true;
      rig.graph.drive = d;
      rig.planner.L.init = rig.planner.R.init = false;
      this.target = rig;
      // a hold pair: the guard's clip on the guard, held to the same phase
      if (pair && e.guardClip && this.guard) {
        const g = this.gdrive;
        g.clip = e.guardClip;
        g.inPlace = true;
        g.held = true;
        g.cycle = e.cycle;
        g.mirror = STUDIO.mirror;
        g.drawn = g.crouch = false;
        g.pace = e.pace * 0.8;
        g.dirX = d.dirX;
        g.dirZ = d.dirZ;
        g.phase = d.phase;
        g.inL = g.inR = true;
        this.guard.graph.drive = g;
        this.guard.planner.L.init = this.guard.planner.R.init = false;
      }
    }
    STUDIO_TARGET.rig = this.target;
    STUDIO_TARGET.clip = this.target ? e.clip : null;
    STUDIO_TARGET.drive = this.target ? d : null;
  }

  private detach(): void {
    const t = this.target;
    if (t) {
      t.graph.drive = null;
      t.planner.L.init = t.planner.R.init = false;
      this.target = null;
    }
    const g = this.guard;
    if (g && g.graph.drive === this.gdrive) {
      g.graph.drive = null;
      g.planner.L.init = g.planner.R.init = false;
    }
    this.gdrive.clip = null;
  }

  private makeGuard(): void {
    const look = defaultLook();
    look.torso = 'tee';
    look.helmet = 'visor';
    look.backpack = 'none';
    look.colors.torso = '#7a8794';
    look.colors.legs = '#4b525a';
    look.colors.helmet = '#5d646c';
    const w = this.host.world;
    const rig = new CharacterRig(this.host.scene, (shape, hex) => w.parts.instance(shape, hex, 'studio-guard'), look, 1.75, 'studio-guard', { armor: true });
    for (const m of rig.renderMeshes) w.addShadowCaster(m);
    this.guard = rig;
    STUDIO_RIGS.push(rig);
    this.guardFrame(0, false);
  }

  private dropGuard(): void {
    const g = this.guard;
    if (!g) return;
    if (this.target === g) this.detach();
    if (g.graph.drive === this.gdrive) g.graph.drive = null;
    const i = STUDIO_RIGS.indexOf(g);
    if (i >= 0) STUDIO_RIGS.splice(i, 1);
    g.dispose();
    this.guard = null;
  }

  /** The guard figure at the hold offset in front of Wren (her rendered root), facing her way, posed by its graph. In a
   *  hold pair the Body section's hold gap and side (`guardGapAdd` / `guardSideAdd`, which move Wren in real play) set
   *  the same spacing here by moving the guard. */
  private guardFrame(dt: number, pair: boolean): void {
    const g = this.guard!;
    const r = this.host.player.rig.root;
    const yaw = r.rotation.y;
    const s = Math.sin(yaw);
    const c = Math.cos(yaw);
    const h = TUNE_BODY.hold;
    const gap = pair && !TUNE_FLAGS.bypass ? h.guardGapAdd : 0;
    const side = pair && !TUNE_FLAGS.bypass ? h.guardSideAdd : 0;
    const f = GRAB.hold + gap;
    const sd = GRAB.side + side;
    g.root.position.set(r.position.x + s * f + c * sd, r.position.y, r.position.z + c * f - s * sd);
    g.root.rotation.y = yaw;
    g.animate(dt, this.guardPose);
  }

  // ---- (anim-studio-2) the team pairs ----

  private showPuppets(on: boolean): void {
    if (on && !this.puppets) {
      const w = this.host.world;
      const look = defaultLook();
      const make = (name: string): OperatorRig => {
        const op = operatorRig(this.host.scene, avatarFactory(w.parts, look, `${name}-part`), look, name, (m) => w.addShadowCaster(m));
        loadPlayLods(op.figure);
        return op;
      };
      this.puppets = [make('studio-p1'), make('studio-p2')];
      this.puppetsShown = !on;
    }
    if (on === this.puppetsShown || !this.puppets) return;
    this.puppetsShown = on;
    for (const op of this.puppets) {
      op.figure.setEnabled(on);
      const i = STUDIO_RIGS.indexOf(op.rig);
      if (on && i < 0) STUDIO_RIGS.push(op.rig);
      else if (!on && i >= 0) STUDIO_RIGS.splice(i, 1);
      op.rig.planner.L.init = op.rig.planner.R.init = false;
    }
    STUDIO_PAIR.rigs = on ? 2 : 0;
  }

  /** Wren hidden while the puppets play (her figure and her skeleton in the overlay). */
  private hideWren(on: boolean): void {
    if (on === this.hidden) return;
    this.hidden = on;
    const pl = this.host.player;
    pl.figure.setEnabled(!on);
    const i = STUDIO_RIGS.indexOf(pl.rig);
    if (on && i >= 0) STUDIO_RIGS.splice(i, 1);
    else if (!on && i < 0) STUDIO_RIGS.unshift(pl.rig);
  }

  /** Both roles at the pair clock's `t`, each puppet posed through its role's move section. */
  private pairFrame(dt: number, e: StudioEntry): void {
    const ps = this.puppets;
    if (!ps || !e.team) return;
    const t = this.pairPhase * e.cycle;
    pairPose(e.team, t, PAIR_STATION, PLAYER_HEIGHT, this.rA, this.rB);
    this.posePuppet(ps[0], this.rA, this.pA, dt);
    this.posePuppet(ps[1], this.rB, this.pB, dt);
    const s = STUDIO_PAIR;
    s.aState = this.rA.state;
    s.bState = this.rB.state;
    s.aGroup = this.rA.group;
    s.bGroup = this.rB.group;
    s.k = this.rA.k;
    s.tA = s.tB = t;
    s.cycle = e.cycle;
    s.ay = ps[0].rig.root.position.y;
    s.by = ps[1].rig.root.position.y;
    // the panel follows role A's section while it is in the move (B's otherwise)
    MOVE_TUNE_TEAM.follow = this.rA.group || this.rB.group;
    TUNE_STATE_BAG.team = MOVE_TUNE_TEAM.follow;
    if (e.team === 'rope') {
      ropeLine(PAIR_STATION, this.rope);
      const r = this.rope;
      this.host.world.ropes.set(ROPE_KEY, r.x0, r.y0, r.z0, r.x1, r.y1, r.z1);
      this.ropeShown = true;
    } else if (this.ropeShown) {
      this.host.world.ropes.hide(ROPE_KEY);
      this.ropeShown = false;
    }
  }

  /** One puppet: the root, the pose, the hand grips, the role's move section (as the local player in real play). */
  private posePuppet(op: OperatorRig, r: PairRole, p: RigPose, dt: number): void {
    const rig = op.rig;
    const root = rig.root;
    const ry = r.y + (r.lie ? 0.22 : 0);
    // a jump (the loop's wrap, a lowering): the feet start over
    if (hyp2(root.position.x - r.x, root.position.z - r.z) > 1 || Math.abs(root.position.y - ry) > 1) rig.planner.L.init = rig.planner.R.init = false;
    root.position.set(r.x, ry, r.z);
    root.rotation.y = r.yaw;
    // downed: lying on the side (the remote avatar's downed pose)
    root.rotation.z = r.lie ? Math.PI / 2 : 0;
    p.speed = r.speed;
    p.localX = 0;
    p.localZ = 1;
    // hanging head-first is the only airborne pose without a traversal
    p.grounded = !(r.traverse === 'none' && Math.abs(r.tumble) > 0.5);
    p.crouch = r.crouch;
    p.kneel = r.kneel;
    p.traverse = r.traverse;
    p.traverseT = r.traverseT;
    p.tumble = r.tumble;
    this.grip(rig.reachL, r.grip !== 'none', r.hlx, r.hly, r.hlz, r.grip === 'lip');
    this.grip(rig.reachR, r.grip !== 'none', r.hrx, r.hry, r.hrz, r.grip === 'lip');
    moveTuneSelect(r.group, r.k, r.traverse, false);
    moveTuneRoot(root.position, root.rotation);
    moveTuneBegin(p, rig);
    try {
      rig.animate(dt, p);
    } finally {
      moveTuneEnd(rig);
    }
    partnerFigureFrame(op.figure, rig, dt, this.host.scene.activeCamera);
  }

  private grip(t: WorldTarget, on: boolean, x: number, y: number, z: number, hook: boolean): void {
    if (!on) {
      t.w = 0;
      return;
    }
    clearGripAxis(t);
    t.x = x;
    t.y = y;
    t.z = z;
    t.w = 1;
    t.hook = hook ? 1 : 0;
  }

  dispose(): void {
    this.detach();
    this.dropGuard();
    this.hideWren(false);
    if (this.puppets) {
      for (const op of this.puppets) {
        const i = STUDIO_RIGS.indexOf(op.rig);
        if (i >= 0) STUDIO_RIGS.splice(i, 1);
        op.figure.dispose();
        op.rig.dispose();
      }
      this.puppets = null;
    }
    if (this.ropeShown) this.host.world.ropes.hide(ROPE_KEY);
    MOVE_TUNE_TEAM.follow = '';
    FREE_VIEW.spin = 0;
    FREE_VIEW.snap = '';
    const d = this.host.debug;
    d.animTune.setFreeMode('off');
    if (this.openedPanel && d.animTune.isOpen) d.animTune.hide();
    if (this.shownDebug && d.isVisible) d.toggle(false);
    studioReset();
  }
}
