import type { Scene } from '../core/babylon';
import { InputState } from '../input/inputState';
import { CharacterRig, type RigPose } from '../player/characterRig';
import type { Player } from '../player/player';
import type { World } from '../world/world';
import type { DebugOverlay } from '../ui/debugOverlay';
import { defaultLook } from '../cosmetics/avatarLook';
import { GRAB } from './takedown';
import { FREE_VIEW } from '../player/freeView';
import { newStudioDrive } from '../anim/studioDrive';
import { STUDIO, STUDIO_RIGS, STUDIO_TARGET, studioEntry, studioInput, studioReset, studioScrub, studioStepPhase, type StudioEntry, type StudioInputOut } from '../anim/studio';

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
 * Leaving (`dispose`) takes every drive off, removes the guard, closes what it opened and resets the studio state.
 */
export class StudioStage {
  /** The game's input while a loop plays (none of the devices' buttons reach the game then, except pause). */
  readonly inp = new InputState();
  private readonly out: StudioInputOut = { x: 0, y: 0, turn: 0, ads: false, crouch: false, drawn: false };
  private readonly drive = newStudioDrive();
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
   *  (one tap per 0.6 s while drawn differs from what the loop wants). No allocation. */
  input(dt: number): InputState {
    const fi = this.inp;
    fi.consumeEdges();
    const o = studioInput(studioEntry(STUDIO.entry), STUDIO.rootMotion, this.out);
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
    this.drawCd = Math.max(0, this.drawCd - dt);
    const drawn = this.host.drawPhase() !== 0;
    let tap = false;
    if (!o.ads && o.drawn !== drawn && this.drawCd <= 0) {
      tap = true;
      this.drawCd = 0.6;
    }
    fi.set('studio', 'draw', tap);
    return fi;
  }

  /** Per rendered frame, before the player animates: the configuration, the circle's camera turn, the scrub / step
   *  requests, the guard figure and the readout. */
  frame(dt: number, look: { x: number; y: number }): void {
    const e = studioEntry(STUDIO.entry);
    this.configure(e);
    if (dt > 0 && this.drives) look.x += studioInput(e, STUDIO.rootMotion, this.out).turn * dt;
    const d = this.drive;
    if (d.clip && d.inPlace) {
      if (!Number.isNaN(STUDIO.seek)) d.phase = studioScrub(STUDIO.seek);
      if (STUDIO.step !== 0) d.phase = studioStepPhase(d.phase, d.clip.frames, STUDIO.step);
    }
    STUDIO.seek = Number.NaN;
    STUDIO.step = 0;
    if (this.guard) this.guardFrame(dt);
    STUDIO.phase = d.clip ? d.phase : 0;
    STUDIO.frames = d.clip ? d.clip.frames : 0;
  }

  /** Apply a changed choice: the drive onto the right rig (Wren, or the guard for a guard clip while it is on). */
  private configure(e: StudioEntry): void {
    if (e.id === this.cEntry && STUDIO.rootMotion === this.cRoot && STUDIO.mirror === this.cMirror && STUDIO.guard === this.cGuard) return;
    const clipChanged = e.id !== this.cEntry;
    this.cEntry = e.id;
    this.cRoot = STUDIO.rootMotion;
    this.cMirror = STUDIO.mirror;
    this.cGuard = STUDIO.guard;
    if (STUDIO.guard && !this.guard) this.makeGuard();
    else if (!STUDIO.guard && this.guard) this.dropGuard();
    this.detach();
    const d = this.drive;
    d.clip = e.clip;
    if (e.clip) {
      const rig = e.guard && this.guard ? this.guard : this.host.player.rig;
      d.inPlace = rig === this.guard || !(STUDIO.rootMotion && e.circle);
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
    }
    STUDIO_TARGET.rig = this.target;
    STUDIO_TARGET.clip = this.target ? e.clip : null;
    STUDIO_TARGET.drive = this.target ? d : null;
  }

  private detach(): void {
    const t = this.target;
    if (!t) return;
    t.graph.drive = null;
    t.planner.L.init = t.planner.R.init = false;
    this.target = null;
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
    this.guardFrame(0);
  }

  private dropGuard(): void {
    const g = this.guard;
    if (!g) return;
    if (this.target === g) this.detach();
    const i = STUDIO_RIGS.indexOf(g);
    if (i >= 0) STUDIO_RIGS.splice(i, 1);
    g.dispose();
    this.guard = null;
  }

  /** The guard figure at the hold offset in front of Wren (her rendered root), facing her way, posed by its graph. */
  private guardFrame(dt: number): void {
    const g = this.guard!;
    const r = this.host.player.rig.root;
    const yaw = r.rotation.y;
    const s = Math.sin(yaw);
    const c = Math.cos(yaw);
    g.root.position.set(r.position.x + s * GRAB.hold + c * GRAB.side, r.position.y, r.position.z + c * GRAB.hold - s * GRAB.side);
    g.root.rotation.y = yaw;
    g.animate(dt, this.guardPose);
  }

  dispose(): void {
    this.detach();
    this.dropGuard();
    FREE_VIEW.spin = 0;
    FREE_VIEW.snap = '';
    const d = this.host.debug;
    d.animTune.setFreeMode('off');
    if (this.openedPanel && d.animTune.isOpen) d.animTune.hide();
    if (this.shownDebug && d.isVisible) d.toggle(false);
    studioReset();
  }
}
