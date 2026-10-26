import { Color3, PointLight, Vector3, type AbstractMesh, type Material, type Scene } from '../core/babylon';
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
import { TUNE_BODY, TUNE_PIN } from '../anim/tune';
import { TUNE_FLAGS, TUNE_STATE_BAG } from '../anim/tuneRegistry';
import { MOVE_TUNE_TEAM, moveTuneBegin, moveTuneEnd, moveTuneRoot, moveTuneSelect } from '../anim/moveTune';
import { newStudioDrive } from '../anim/studioDrive';
import { mixamoStudioEntry } from '../anim/mixamo';
import { newPairRole, pairFrames, pairPose, ropeHoldLine, ropeLine, type PairRole } from '../anim/studioPairs';
import { TeamPoser } from '../anim/clips/team';
import { newTravOut, newTravState, PAIR_STATION, STUDIO_MID, travTick, type TravButton, type TravEntry } from '../anim/studioTraversal';
import { STAGE_LIGHTS, STUDIO, STUDIO_LIGHT, STUDIO_PAIR, STUDIO_RIGS, STUDIO_TARGET, studioAdvance, studioEntry, studioInput, studioKeyInfo, studioKeyPhase, studioBodyPin, studioReset, studioScrub, studioSpot, studioStepPhase, studioWeaponFor, spotShift, stageLightPlace, stageViewYaw, studioCq, holdPairTravel, type GuardLoop, type HoldTravel, type StudioEntry, type StudioInputOut } from '../anim/studio';
import { buildEnemyRig } from '../ai/enemyRig';
import { ENEMIES } from '../ai/enemyDefs';
import { TUNE_WHO } from '../anim/tuneGuard';
import type { WeaponModel } from '../weapons/weaponModel';
import { loadStudioCaptures, stageLightKeep, stageLightMeshes } from '../anim/studio';
import { LOD_NAMES } from '../operators/runtime/manifest';
import { newKillDrive } from '../anim/killDrive'; // (piano-knife S1) the knife pairs
import { attackerPhase, bucklePitchOf, buckleAt, KNIFE, KNIFE_KILLS, knifeClip, knifeClipsReady, loadKnifeClips, victimPhase } from './knifeKill';
import { attackerHands, newPairTrack, pairHandsOff, resetPairTrack, victimHands, victimRoot, type RootOut } from './knifePair';
import { KnifeModel } from '../weapons/knifeModel';
import { WREN_HANDS } from '../operators/handFrame';
import { ease } from './closeQuarters';

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
  /** (marlow-bays T1a, item 19) The selected weapon's class ('rifle', 'pistol', ...), and a swap to the first gun of a
   *  class in the loadout (no-op without one). */
  weaponClass(): string;
  switchWeapon(cls: string): void;
}

/** The pairs' viewing spot: Wren (hidden) stands here, so the camera and the free view frame the team block. */
const PAIR_VIEW = { x: PAIR_STATION.x, z: PAIR_STATION.z - 6.5, yaw: 0 };
const ROPE_KEY = 'studio-pair-rope';
const ROPE_HOLD_KEY = 'studio-pair-rope-hold';
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
  /** (piano-knife S1) A knife pair: Wren's and the guard's kill drives, the hands' tracking, the root scratch, the knife
   *  in Wren's hand (the Studio's own, made on first use) and the loop's last time (a wrap starts the hands afresh). */
  private readonly kAD = newKillDrive();
  private readonly kVD = newKillDrive();
  private readonly kTrack = newPairTrack();
  private readonly kRoot: RootOut = { x: 0, y: 0, z: 0, yaw: 0 };
  private kKnife: KnifeModel | null = null;
  private kLastT = 0;
  private target: CharacterRig | null = null;
  private guard: CharacterRig | null = null;
  private readonly guardPose: RigPose = { speed: 0, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' };
  private crouchCd = 0;
  private drawCd = 0;
  private weaponCd = 0;
  // the configuration applied (changes rebuild the drive)
  private cEntry = '';
  private cRoot = false;
  private cMirror = false;
  private cGuard = false;
  private openedPanel = false;
  // (anim-studio-2) the pairs: two puppets, their roles and poses, the pair clock
  private puppets: [OperatorRig, OperatorRig] | null = null;
  private puppetsShown = false;
  private readonly rA: PairRole = newPairRole();
  private readonly rB: PairRole = newPairRole();
  private readonly pA: RigPose = newPose();
  private readonly pB: RigPose = newPose();
  /** (anim-n4b, track A) Each puppet's team pose (B's working body, A's push), as the players' in real play. */
  private readonly tA = new TeamPoser();
  private readonly tB = new TeamPoser();
  private pairPhase = 0;
  /** (anim-n4b) A walking hold pair: its travel state and how far (m) Wren has been moved along it. */
  private readonly holdTr: HoldTravel = { n: 0, last: 0 };
  private holdOff = 0;
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
  // (marlow-bays item 14) the stage lights that follow her (made once; only her meshes take them)
  private readonly stageLights: PointLight[] = [];
  private stageMeshes = -1;
  private stageNext = 0;
  private readonly stageP = { x: 0, y: 0, z: 0 };
  /** Her meshes the stage lights take (her own; never an instance, `stageLightMeshes`). */
  private stageSrc: AbstractMesh[] = [];
  /** (fix 12 GPU round) A stage light's include list without the shared part bases (`stageLightKeep`; reused). */
  private readonly stageKeep: AbstractMesh[] = [];
  // (marlow-bays item 24, track A) the guard puppet: a real guard rig (`buildEnemyRig`, guard rows on), no AI
  private puppet: CharacterRig | null = null;
  private puppetGun: WeaponModel | null = null;
  private readonly puppetPose: RigPose = newPose();

  constructor(private readonly host: StudioHost) {
    studioReset();
    STUDIO.active = true;
    // (mixamo-retarget I9 fix round) batch 2's captures, one lazy chunk (once; the loop list fills when it lands)
    void loadStudioCaptures();
    STUDIO_RIGS.push(host.player.rig);
    for (const l of STAGE_LIGHTS) {
      const p = new PointLight(`studio-stage-${l.name}`, new Vector3(0, -50, 0), host.scene);
      // the game's range falloff (her PBR materials would take the inverse square otherwise)
      p.falloffType = PointLight.FALLOFF_STANDARD;
      p.range = l.range;
      p.diffuse = new Color3(l.color[0], l.color[1], l.color[2]);
      p.specular = new Color3(l.color[0] * 0.3, l.color[1] * 0.3, l.color[2] * 0.3);
      p.intensity = 0;
      // no meshes yet: an empty include list would light everything, so the light waits disabled
      p.setEnabled(false);
      this.stageLights.push(p);
    }
    // (test hook) the stage lights: place, intensity, the meshes they light
    (window as unknown as { __studioStage?: unknown }).__studioStage = {
      lights: () =>
        this.stageLights.map((p) => ({ name: p.name, x: p.position.x, y: p.position.y, z: p.position.z, intensity: p.intensity, enabled: p.isEnabled(), meshes: p.includedOnlyMeshes.length })),
      root: () => {
        const r = this.host.player.rig.root;
        const c = this.host.scene.activeCamera?.globalPosition;
        // (T2) viewYaw: the frame the lights take (from her toward the camera)
        const viewYaw = c ? stageViewYaw(r.position.x, r.position.z, c.x, c.z, r.rotation.y) : r.rotation.y;
        return { x: r.position.x, y: r.position.y, z: r.position.z, yaw: r.rotation.y, viewYaw };
      },
      // (studio-pairs, AUDIT fix 12) each pair puppet's figure: the LOD shown, its meshes drawn (enabled) and whether
      // they are ready to draw (material and shaders; false = not drawn this frame), its root. (fix 12 GPU round) `lod`
      // is the LOD index (`LOD_NAMES`: 0 hero, 1 LOD0, 2 LOD1, 3 LOD2), so 1 is LOD0; `lodName` spells it out
      puppets: () =>
        (this.puppets ?? []).map((op) => {
          const ms = op.figure.renderMeshes.filter((m) => m.isEnabled());
          const r = op.rig.root.position;
          const lod = op.figure.current;
          return { lod, lodName: LOD_NAMES[lod] ?? 'none', shown: ms.length, ready: ms.length > 0 && ms.every((m) => m.isReady(true)), x: r.x, y: r.y, z: r.z };
        }),
    };
    const d = host.debug;
    // (marlow-bays item 29) the studio leaves the F3 debug readout as it is, off by default on every device (it covered
    // her); F3 and the tuner's More > Debug readout turn it on
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
    // (marlow-bays T1a, item 19) an armed loop plays with the picked gun (one swap request per 0.8 s until it is in hand)
    this.weaponCd = Math.max(0, this.weaponCd - dt);
    const want = studioWeaponFor(e, STUDIO.weapon);
    if (want && this.weaponCd <= 0 && this.host.weaponClass() !== want) {
      this.host.switchWeapon(want);
      this.weaponCd = 0.8;
    }
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
    // (marlow-bays item 29) a keyed clip of hers tunes with its own state (on the spot her pose alone says idle)
    TUNE_PIN.body = this.drives ? studioBodyPin(e) : '';
    TUNE_PIN.rig = this.host.player.rig;
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
      // (marlow-bays T1a, item 15) onto a key (the Keys tab's pick), or the next key back / forward
      const kp = studioKeyPhase(d.clip.name, d.phase, STUDIO.seekKey, STUDIO.keyStep);
      if (!Number.isNaN(kp)) d.phase = kp;
      else if (STUDIO.keyStep !== 0) d.phase = studioStepPhase(d.phase, d.clip.frames, STUDIO.keyStep);
    }
    if (e.kind === 'pair' && STUDIO.keyStep !== 0) {
      // a pair has no key table: a frame step (as the old key step)
      this.pairPhase = studioStepPhase(this.pairPhase, e.team ? pairFrames(e.cycle) : (e.clip?.frames ?? 1), STUDIO.keyStep);
      d.phase = this.gdrive.phase = this.pairPhase;
    }
    STUDIO.seek = Number.NaN;
    STUDIO.step = 0;
    // a key request waits for its clip's drive (a pick that changes the loop lands a frame later)
    if (d.clip || e.kind !== 'keyed') STUDIO.seekKey = -1;
    STUDIO.keyStep = 0;
    this.holdTravel(e);
    if (this.guard) {
      if (e.knife !== undefined) this.knifeFrame(dt, e, e.knife);
      else this.guardFrame(dt, e.kind === 'pair');
    }
    if (this.puppet && e.gloop) this.puppetFrame(dt, e.gloop);
    if (e.team) this.pairFrame(dt, e);
    STUDIO.phase = e.kind === 'pair' ? this.pairPhase : d.clip ? d.phase : 0;
    STUDIO.frames = e.team ? pairFrames(e.cycle) : d.clip ? d.clip.frames : 0;
    studioKeyInfo(d.clip && !e.team ? d.clip.name : '', STUDIO.phase, STUDIO);
  }

  /**
   * (anim-n4b, PASS2 row 44) A walking hold pair (hold_back) travels with its clip on the pair clock: Wren (and the guard
   * placed in front of her) moves along the clip's travel at its pace, so the treadmill's planted feet stay on the floor
   * (on the spot they slid 22-32 cm); after `HOLD_PAIR_CYCLES` cycles back to the start at a heel strike. No allocation.
   */
  private holdTravel(e: StudioEntry): void {
    const tr = holdPairTravel(e, this.pairPhase, this.holdTr);
    const dd = tr - this.holdOff;
    if (dd === 0) return;
    this.holdOff = tr;
    const d = this.drive;
    const yaw = this.host.player.rig.root.rotation.y;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const bx = (d.mirror ? -d.dirX : d.dirX) * dd;
    const bz = d.dirZ * dd;
    this.host.shift(bx * c + bz * s, -bx * s + bz * c);
    this.away = true;
  }

  /** (marlow-bays item 26 round) Per rendered frame, after the player animates and the camera updates: the stage
   *  lights onto this frame's root and camera. They were placed in `frame`, before the player moved, so they lagged her
   *  root by one frame of motion (a slow frame on a busy machine: up to 0.1 m in e2e-studio). */
  lightsFrame(): void {
    this.stageFrame();
  }

  /**
   * (marlow-bays item 14) The stage lights onto her root, (T2) turned toward the camera (`stageViewYaw`), at the "Stage light" scale; her meshes (the LODs
   * load late) are re-read once a second, the include lists only rewritten when they change, and her materials checked
   * to take every light on her (`fitStageMaterials`). Rendering only. No allocation per frame.
   */
  private stageFrame(): void {
    const root = this.host.player.rig.root;
    const now = performance.now();
    if (now >= this.stageNext) {
      this.stageNext = now + 1000;
      const ms = root.getChildMeshes(false);
      if (ms.length !== this.stageMeshes) {
        this.stageMeshes = ms.length;
        // (studio-pairs, AUDIT fix 12) her own meshes only: an instance's source is the shared part base, which lit
        // every part instance in the scene (the hold pair's guard read white)
        const src = stageLightMeshes(ms, []);
        this.stageSrc = src;
        for (const p of this.stageLights) {
          this.unlight(p.includedOnlyMeshes, src);
          p.includedOnlyMeshes = src.slice();
          p.setEnabled(src.length > 0);
        }
      } else {
        // (studio-pairs, AUDIT fix 12 GPU round) a shared part base pushed into a list since (the N0 audit's pair rows
        // push `sourceMesh ?? mesh`) lit every part instance in the scene: the hold pair's guard read white on the GPU
        // sheets. Dropped here; anything else pushed (a puppet's figure) stays
        for (const p of this.stageLights) {
          if (!stageLightKeep(p.includedOnlyMeshes, this.stageKeep)) continue;
          this.unlight(p.includedOnlyMeshes, this.stageKeep);
          p.includedOnlyMeshes = this.stageKeep.slice();
        }
      }
      this.fitStageMaterials();
    }
    const k = STUDIO_LIGHT.scale;
    const pos = root.position;
    // (marlow-bays T2) placed toward the camera: key and fill on its side, the rim beyond her, the top light above
    const cam = this.host.scene.activeCamera;
    // (item 26 round) the camera's own position (set this frame by the follow / free view): `globalPosition` is only
    // refreshed when the camera's world matrix is computed at render, so it held last frame's place
    const cp = cam ? (cam.parent ? cam.globalPosition : cam.position) : null;
    const yaw = cp ? stageViewYaw(pos.x, pos.z, cp.x, cp.z, root.rotation.y) : root.rotation.y;
    for (let i = 0; i < this.stageLights.length; i++) {
      const p = this.stageLights[i]!;
      const l = STAGE_LIGHTS[i]!;
      const o = stageLightPlace(l, pos.x, pos.y, pos.z, yaw, this.stageP);
      p.position.set(o.x, o.y, o.z);
      p.intensity = l.intensity * k;
    }
  }

  /**
   * (studio-pairs, AUDIT fix 12 GPU round) The meshes of `old` not in `keep` lose the stage lights: their frozen
   * materials are frozen again (`freeze` marks them dirty), so the next frame recompiles them for the lights they still
   * take. A frozen material otherwise keeps the shader built with the stage lights' slots and only rebinds the lights
   * left, and the slots it no longer binds read whatever light block was bound there last (her stage lights).
   */
  private unlight(old: readonly AbstractMesh[], keep: readonly AbstractMesh[]): void {
    for (const m of old) {
      if (keep.includes(m)) continue;
      const mat = m.material;
      if (mat?.isFrozen) mat.freeze();
    }
  }

  /**
   * Her materials take every light on her: the game's (`LightRig.fitMaterial` sets those) plus the stage's. Re-checked
   * once a second, so a later rig fit (a quality change) that leaves fewer slots is lifted again. Most of them are frozen
   * (the shared skin material): unfrozen, set, frozen again, as `LightRig.fitMaterial` does, so the shader recompiles.
   * Only ever raises the count. No allocation.
   */
  private fitStageMaterials(): void {
    const src = this.stageSrc;
    for (let i = 0; i < src.length; i++) {
      const s = src[i]!;
      const mat = s.material as (Material & { maxSimultaneousLights?: number; disableLighting?: boolean }) | null;
      if (!mat || typeof mat.maxSimultaneousLights !== 'number' || mat.disableLighting) continue;
      // every light on this mesh now, the stage's included (Babylon lists them all; the material caps what it takes)
      const want = s.lightSources.length;
      if (mat.maxSimultaneousLights >= want) continue;
      const frozen = mat.isFrozen;
      if (frozen) mat.unfreeze();
      mat.maxSimultaneousLights = want;
      if (frozen) mat.freeze();
    }
  }

  /** Apply a changed choice: the drive onto the right rig (Wren, or the guard for a guard clip while it is on); a hold
   *  pair's two drives; a team pair's puppets; a traversal loop's start. */
  private configure(e: StudioEntry): void {
    const wantGuard = STUDIO.guard || (e.kind === 'pair' && (!!e.guardClip || e.knife !== undefined));
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
      mixamoStudioEntry(e.id); // (mixamo-retarget I2) a traversal capture's loop plays that capture (else none)
      this.pairPhase = 0;
      this.holdTr.n = 0;
      this.holdTr.last = 0;
      this.holdOff = 0;
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
    // (piano-knife S1) a knife pair: the clips (loaded once), the knife in her hand
    if (e.knife !== undefined) {
      void loadKnifeClips();
      resetPairTrack(this.kTrack);
      this.kLastT = 0;
      if (!this.kKnife) this.kKnife = new KnifeModel(this.host.scene, this.host.player.rig, WREN_HANDS.R, (m) => this.host.world.addShadowCaster(m));
    }
    this.kKnife?.show(e.knife !== undefined);
    // a team pair: the puppets, Wren hidden at the viewing spot
    this.showPuppets(!!e.team);
    // (item 24, track A) a guard loop: the guard puppet stands where she stands (she is hidden, the camera stays on her)
    const gl = e.kind === 'guard';
    if (gl && !this.puppet) this.makePuppet();
    else if (!gl && this.puppet) this.dropPuppet();
    this.hideWren(!!e.team || gl);
    if (e.team && clipChanged) {
      this.host.teleport(PAIR_VIEW.x, 0, PAIR_VIEW.z, PAIR_VIEW.yaw);
      this.away = true;
    }
    if (!e.team && this.ropeShown) {
      this.hideRopes();
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
      d.cq = studioCq(e); // (anim-n4b) a hold clip: the close-quarters layer on its keyed trunk
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
        // (anim-n4b) the pair walks together (it travels with the clip): the guard at her pace, so his planted feet stay
        // down too (his clip is keyed at 0.8 m/s: a slightly longer step)
        g.pace = e.pace;
        g.dirX = d.dirX;
        g.dirZ = d.dirZ;
        g.phase = d.phase;
        g.inL = g.inR = true;
        this.guard.graph.drive = g;
        this.guard.planner.L.init = this.guard.planner.R.init = false;
      }
    }
    STUDIO_TARGET.rig = this.target ?? this.puppet;
    STUDIO_TARGET.clip = this.target ? e.clip : null;
    STUDIO_TARGET.drive = this.target ? d : null;
  }

  /** (item 24, track A) The guard puppet: a grunt's rig as every guard gets it (its guard rows on, its gun in hand). */
  private makePuppet(): void {
    const w = this.host.world;
    const { rig, gun } = buildEnemyRig(this.host.scene, w, ENEMIES.grunt, 'studio-guard-puppet');
    this.puppet = rig;
    this.puppetGun = gun;
    STUDIO_RIGS.push(rig);
    TUNE_WHO.rig = rig;
    const r = this.host.player.rig.root;
    rig.root.position.copyFrom(r.position);
    rig.root.rotation.y = r.rotation.y;
  }

  private dropPuppet(): void {
    const g = this.puppet;
    if (!g) return;
    const i = STUDIO_RIGS.indexOf(g);
    if (i >= 0) STUDIO_RIGS.splice(i, 1);
    if (TUNE_WHO.rig === g) TUNE_WHO.rig = null;
    if (STUDIO_TARGET.rig === g) STUDIO_TARGET.rig = null;
    TUNE_STATE_BAG.guardJoint = TUNE_STATE_BAG.guardStep = TUNE_STATE_BAG.guardWeight = '';
    this.puppetGun?.dispose();
    g.dispose();
    this.puppet = null;
    this.puppetGun = null;
  }

  /**
   * (item 24, track A) The guard puppet's frame: where Wren stands (her rendered root, her facing), posed as
   * `Enemy.frame` poses a guard (pace, aim raise, crouch, cover, dash); a moving loop runs on the spot (a treadmill:
   * the world slides back under its planted feet, `shiftWorld`). The guard rig's own window reads the guard rows.
   */
  private puppetFrame(dt: number, gl: GuardLoop): void {
    const g = this.puppet!;
    const r = this.host.player.rig.root;
    const root = g.root;
    if (hyp2(root.position.x - r.position.x, root.position.z - r.position.z) > 1) g.planner.L.init = g.planner.R.init = false;
    root.position.copyFrom(r.position);
    root.rotation.y = r.rotation.y;
    const s = Math.sin(root.rotation.y);
    const c = Math.cos(root.rotation.y);
    const v = gl.speed;
    if (v > 0 && dt > 0) g.shiftWorld(-s * v * dt, -c * v * dt);
    const p = this.puppetPose;
    p.speed = v;
    p.localX = 0;
    p.localZ = v > 0 ? 1 : 0;
    p.velX = s * v;
    p.velZ = c * v;
    p.crouch = gl.crouch ? 1 : 0;
    p.aim = gl.aim;
    p.aimPitch = 0;
    p.wall = gl.wall;
    p.wallSide = gl.wall ? 1 : 0;
    p.dash = gl.dash ? 1 : 0;
    p.stride = !gl.wall && gl.aim < 0.5 && v > 0 ? 'facing' : 'velocity';
    g.animate(dt, p);
  }

  private detach(): void {
    this.knifeOff(); // (piano-knife S1)
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

  /**
   * (piano-knife S1) A knife pair's frame, the game's code on one clock (the pair phase x the cycle, s): Wren's clip on her
   * graph through the kill drive (in over `blendIn`, out over `blendOut` into the rest), the guard's on his with the
   * buckle from the stab (after `limp` his clip runs on to its end: the collapse the ragdoll takes in play), his root
   * at the row's spot off her rendered root (`victimRoot`), her grip and knife hands (`attackerHands`) and his on her
   * forearm (`victimHands`). Before the clips resolve: the plain guard frame.
   */
  private knifeFrame(dt: number, e: StudioEntry, k: number): void {
    const g = this.guard!;
    const ar = this.host.player.rig;
    if (!knifeClipsReady()) {
      this.guardFrame(dt, false);
      return;
    }
    const R = KNIFE_KILLS[k]!;
    const t = this.pairPhase * e.cycle;
    if (t < this.kLastT) resetPairTrack(this.kTrack);
    this.kLastT = t;
    const ph = Math.min(1, t / R.seconds);
    const limpT = R.limp * R.seconds;
    const since = t - R.contact * R.seconds;
    const a = this.kAD;
    a.clip = knifeClip(k, false);
    a.phase = attackerPhase(R, t / R.seconds); // (piano-knife S2) the clip window at its own speed, on through the blend-out
    a.w = t < R.seconds ? Math.min(1, t / KNIFE.blendIn) : Math.max(0, 1 - (t - R.seconds) / KNIFE.blendOut);
    ar.graph.kill = a;
    const v = this.kVD;
    const vl = victimPhase(R, R.limp);
    v.clip = knifeClip(k, true);
    v.phase = ph < R.limp ? victimPhase(R, ph) : vl + ((1 - vl) * (ph - R.limp)) / (1 - R.limp);
    v.w = 1;
    v.buckle = buckleAt(since);
    v.bucklePitch = bucklePitchOf(R);
    g.graph.kill = v;
    const r = ar.root;
    const p = victimRoot(R, r.position.x, r.position.y, r.position.z, r.rotation.y, 1, 0, 0, 0, this.kRoot);
    g.root.position.set(p.x, p.y, p.z);
    g.root.rotation.y = p.yaw;
    const wGrip = t < limpT ? ease(t / KNIFE.blendIn) : 1 - ease((t - limpT) / KNIFE.release);
    attackerHands(R, ph, since, ar, g, this.kKnife, wGrip, this.kTrack);
    victimHands(R, since, ar, g, this.kTrack);
    g.animate(dt, this.guardPose);
  }

  /** (piano-knife S1) A knife pair's drives and hands off both rigs, the knife away. */
  private knifeOff(): void {
    const ar = this.host.player.rig;
    if (ar.graph.kill === this.kAD) ar.graph.kill = null;
    const g = this.guard;
    if (g && g.graph.kill === this.kVD) g.graph.kill = null;
    if (this.kAD.clip || this.kVD.clip) pairHandsOff(ar, g);
    this.kAD.clip = this.kVD.clip = null;
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
    this.posePuppet(ps[0], this.rA, this.pA, this.tA, dt);
    this.posePuppet(ps[1], this.rB, this.pB, this.tB, dt);
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
      // (anim-n4b, track A) and from the holder's hands over the lip, as the game's rope line
      if (ropeHoldLine(this.rB, PLAYER_HEIGHT, r)) this.host.world.ropes.set(ROPE_HOLD_KEY, r.x0, r.y0, r.z0, r.x1, r.y1, r.z1);
      else this.host.world.ropes.hide(ROPE_HOLD_KEY);
      this.ropeShown = true;
    } else if (this.ropeShown) {
      this.hideRopes();
      this.ropeShown = false;
    }
  }

  /** The pair's rope (the line down the face and the holder's length over the lip). */
  private hideRopes(): void {
    this.host.world.ropes.hide(ROPE_KEY);
    this.host.world.ropes.hide(ROPE_HOLD_KEY);
  }

  /** One puppet: the root, the pose, the hand grips, the role's move section (as the local player in real play). */
  private posePuppet(op: OperatorRig, r: PairRole, p: RigPose, tp: TeamPoser, dt: number): void {
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
    p.tuneTeam = r.group; // (anim-joints J2, A6) the role's team row of the tuner tables
    p.tumble = r.tumble;
    this.grip(rig.reachL, r.grip !== 'none', r.hlx, r.hly, r.hlz, r.grip === 'lip');
    this.grip(rig.reachR, r.grip !== 'none', r.hrx, r.hry, r.hrz, r.grip === 'lip');
    moveTuneSelect(r.group, r.k, r.traverse, false);
    moveTuneRoot(root.position, root.rotation);
    // (anim-n4b, track A) the team pose (B's working body, A's push) on the pose and the grips, as in real play
    p.bend = p.bendDrop = p.sway = 0;
    // (N4b train-8 fix) paused (dt 0: a scrub, a key step) the team pose shows this phase's, not the weight it was paused at
    if (dt <= 0) tp.jump(r.tp);
    tp.begin(dt, r.tp, p, rig);
    moveTuneBegin(p, rig);
    try {
      rig.animate(dt, p);
    } finally {
      moveTuneEnd(rig);
      tp.end(rig);
    }
    // (studio-pairs, AUDIT fix 12) no camera: the figure stays on its nearest game LOD (LOD0) through the loop. By the
    // view's distance the puppets stand at the LOD0 / LOD1 edge (8.8 m out, 7.2 m back) from a framing camera, and a
    // LOD shown for the first time draws nothing until its shaders compile (~0.5 s gone after a crossing or a wrap)
    partnerFigureFrame(op.figure, rig, dt, null);
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
    mixamoStudioEntry(''); // (mixamo-retarget I2) the Studio's capture pick ends with the Studio
    // (piano-knife S1) the knife pair's drives and the Studio's knife
    this.knifeOff();
    if (this.kKnife) {
      this.kKnife.show(false);
      this.kKnife.dispose();
      this.kKnife = null;
    }
    for (const p of this.stageLights) p.dispose();
    this.stageLights.length = 0;
    delete (window as unknown as { __studioStage?: unknown }).__studioStage;
    this.detach();
    this.dropGuard();
    this.dropPuppet();
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
    if (this.ropeShown) this.hideRopes();
    MOVE_TUNE_TEAM.follow = '';
    FREE_VIEW.spin = 0;
    FREE_VIEW.snap = '';
    const d = this.host.debug;
    d.animTune.setFreeMode('off');
    if (this.openedPanel && d.animTune.isOpen) d.animTune.hide();
    TUNE_PIN.body = '';
    TUNE_PIN.rig = null;
    studioReset();
  }
}
