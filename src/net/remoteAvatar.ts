import { Vector3, type InstancedMesh } from '../core/babylon';
import { CharacterRig } from '../player/characterRig';
import { avatarFactory } from '../cosmetics/avatarFactory';
import { playEmote } from '../cosmetics/emotes';
import { WeaponModel, DEFAULT_WEAPON_COLORS } from '../weapons/weaponModel';
import { WEAPONS, type WeaponId } from '../weapons/weaponDefs';
import { assignCarrySlots } from '../weapons/carrySlots';
import { GrenadePouches } from '../weapons/grenadePouches';
import { MASK } from '../physics/groups';
import type { World } from '../world/world';
import type { Vfx } from '../vfx/vfx';
import type { Ballistics } from '../weapons/ballistics';
import { SnapshotBuffer } from './interp';
import { PF, type PlayerInfo, type PlayerState } from './protocol';
import { hyp2 } from '../core/mathx';
import { TEAM_COLORS } from './pvp';
import { AttachGrips } from '../player/attachGrips';
import { wrapPi } from '../anim/motion';
import { RAPPEL } from '../config/movement';
import { attachGripWeight, COVER_SUB, emptyMovePose, footPoints, isAttachedMode, poseFromMoveState, unpackAttachSub, type MoveCommit, type MoveMode } from '../player/moveState';
import { traversePath, type PathKind } from '../player/traversePath';
import type { TraverseKind } from '../anim/animGraph';

/** Rope slots per remote (`Ropes` keys). */
let ropeKeys = 0;

/**
 * Another player's body, rendered from interpolated states: rig animation from speed / flags and (3.2.0) their
 * movement state - cover, attached grips, committed moves replayed from their start, takedowns - posed by the same
 * code as the local player (`poseFromMoveState`, `AttachGrips`, `traversePath`); their weapon (stowed while both
 * hands are busy), and muzzle flashes + tracers while their firing flag is set.
 */
export class RemoteAvatar {
  readonly rig: CharacterRig;
  readonly buf = new SnapshotBuffer<PlayerState>(40, 0.25);
  readonly pos = new Vector3();
  yaw = 0;
  pitch = 0;
  flags = 0;
  private models = new Map<WeaponId, WeaponModel>();
  private pouches: GrenadePouches;
  private weapon: WeaponId | null = null;
  private fireT = 0;
  private kick = 0;
  private crouch = 0;
  private aim = 0;
  private prev = new Vector3();
  private speed = 0;
  private tmpA = new Vector3();
  private tmpB = new Vector3();
  private placed = false;
  /** Movement state posing: the grips on the anchor in use, the pose families, a committed move replaying. */
  private grips = new AttachGrips();
  private gripAnchor = -1;
  private gripFace = 1;
  private sPrev = 0;
  private mp = emptyMovePose();
  private replay: { t: number; c: MoveCommit; path: PathKind; pose: TraverseKind } | null = null;
  private lastCommit = -1;
  private stowed = false;
  private kin = { x: 0, y: 0, z: 0 };
  private pa = { x: 0, y: 0, z: 0 };
  private pb = { x: 0, y: 0, z: 0 };
  /** The movement mode shown now (tests, host checks). */
  mode: MoveMode = 'ground';
  private pipeKey = 'hands>hands';
  private readonly ropeKey = `remote-${++ropeKeys}`;
  private roped = false;
  /** Seconds the remote has held still on its anchor (settling onto the owner's grips waits for it). */
  private stillT = 0;
  private carryW = { low: 1, high: 0, compressed: 0 };
  /** Fire sound hook. */
  onFire: ((cls: string, at: Vector3) => void) | null = null;

  constructor(
    private world: World,
    private vfx: Vfx,
    private ballistics: Ballistics,
    readonly info: PlayerInfo,
  ) {
    this.rig = new CharacterRig(world.scene, avatarFactory(world.parts, info.look, 'remote-part'), info.look, 1.75, `remote-${info.id}`);
    for (const m of this.rig.renderMeshes) world.addShadowCaster(m);
    this.pouches = new GrenadePouches(world.parts, this.rig);
    for (const m of this.pouches.parts) world.addShadowCaster(m);
    this.rig.setEnabled(false);
  }

  get dead(): boolean {
    return (this.flags & PF.dead) !== 0;
  }

  /** A model for a carried weapon (created once, kept for the session). */
  private model(id: WeaponId): WeaponModel {
    let m = this.models.get(id);
    if (!m) {
      m = new WeaponModel(this.world.scene, this.world.parts, WEAPONS[id], DEFAULT_WEAPON_COLORS, this.rig.weaponPivot);
      for (const part of m.renderMeshes) this.world.addShadowCaster(part);
      this.models.set(id, m);
    }
    return m;
  }

  /** In the hands: `id` (or stowed with the rest while climbing / in a takedown); every other carried weapon (lobby
   *  loadout + any seen held) in its own slot. */
  private setWeapon(id: WeaponId, stowed = false): void {
    if (id === this.weapon && stowed === this.stowed) return;
    this.stowed = stowed;
    for (const w of this.info.loadout) this.model(w);
    this.model(id);
    const ids = [...this.models.keys()];
    const slots = assignCarrySlots(ids.map((w) => ({ cls: WEAPONS[w].class, length: this.models.get(w)!.ext.z1 - this.models.get(w)!.ext.z0 })));
    ids.forEach((w, i) => {
      const m = this.models.get(w)!;
      const slot = slots[i];
      if (w === id && !stowed) return;
      if (slot) m.holster(this.rig, slot);
      else m.setVisible(false);
    });
    if (!stowed) this.model(id).hold(this.rig);
    this.weapon = id;
  }

  emote(id: string): void {
    playEmote(this.rig, id);
  }

  private marker: InstancedMesh | null = null;

  /** Team-mate marker (team deathmatch): a small diamond over the head in the team's colour. */
  markTeam(team: number): void {
    if (this.marker) return;
    const m = this.world.parts.instance('sphere', TEAM_COLORS[team === 1 ? 1 : 0], 'team-mark');
    m.parent = this.rig.root;
    m.scaling.set(0.09, 0.14, 0.09);
    m.position.set(0, 2.08, 0);
    this.marker = m;
  }

  /** Render-rate update at `renderTime` (in the buffer's clock). */
  update(dt: number, renderTime: number): void {
    const s = this.buf.sample(renderTime);
    if (!s) return;
    if (!this.placed) {
      this.placed = true;
      this.rig.setEnabled(true);
      this.prev.set(s.x, s.y, s.z);
      this.lastCommit = s.state.mv?.c?.n ?? -1;
    }
    this.pos.set(s.x, s.y, s.z);
    this.yaw = s.yaw;
    const st = s.state;
    const mv = st.mv;
    this.pitch = st.pitch;
    this.flags = st.f;
    this.mode = mv?.m ?? 'ground';
    // a committed move (vault, mantle, roll, ...) replays from its start along the same path
    if (mv?.c && mv.c.n !== this.lastCommit) {
      this.lastCommit = mv.c.n;
      const path: PathKind = mv.m === 'windowVault' ? 'vault' : mv.m === 'landing' ? 'drop' : (mv.m as PathKind);
      this.replay = { t: 0, c: mv.c, path, pose: mv.m as TraverseKind };
    }
    const rp = this.replay;
    let replayK = -1;
    if (rp) {
      rp.t += dt;
      replayK = Math.min(1, rp.t / rp.c.dur);
      const c = rp.c;
      this.pa.x = c.x0;
      this.pa.y = c.y0;
      this.pa.z = c.z0;
      this.pb.x = c.x1;
      this.pb.y = c.y1;
      this.pb.z = c.z1;
      traversePath(rp.path, this.pa, this.pb, c.top, c.v, replayK, this.kin);
      this.pos.set(this.kin.x, this.kin.y, this.kin.z);
      if (replayK >= 1) this.replay = null;
    }
    const attached = !!mv && isAttachedMode(mv.m) && !rp;
    // attached both hands are busy (the gun stowed), except a sidearm aimed from a split / an inverted hang
    const sidearmOut = !!mv && mv.r > 0.05 && (mv.m === 'split' || mv.m === 'rappel' || (mv.m === 'pipeH' && unpackAttachSub(mv.sub).pipe === 'inverted'));
    this.setWeapon(st.w, (attached && !sidearmOut) || mv?.m === 'takedown');
    const moved = hyp2(this.pos.x - this.prev.x, this.pos.z - this.prev.z);
    const inst = dt > 0 ? moved / dt : 0;
    // (3.2.0) the owner's own speed when it sends a move state (interpolation jitter is not a gait)
    const want = mv && !rp ? st.speed : inst;
    this.speed += (Math.min(want, 12) - this.speed) * Math.min(1, dt * 10);
    const lx = this.pos.x - this.prev.x;
    const lz = this.pos.z - this.prev.z;
    this.prev.copyFrom(this.pos);
    const f = this.flags;
    this.crouch += ((f & PF.crouch ? 1 : 0) - this.crouch) * Math.min(1, dt * 10);
    const aimTarget = mv ? mv.r : f & (PF.ads | PF.firing) ? 1 : 0.15;
    this.aim += (aimTarget - this.aim) * Math.min(1, dt * 10);
    // ready position weights eased to the owner's (`MoveState.rd`)
    const rd = mv?.rd ?? 0;
    const cw = this.carryW;
    const ck = Math.min(1, dt / 0.15);
    cw.low += ((rd === 0 ? 1 : 0) - cw.low) * ck;
    cw.high += ((rd === 1 ? 1 : 0) - cw.high) * ck;
    cw.compressed += ((rd === 2 ? 1 : 0) - cw.compressed) * ck;
    this.kick = Math.max(0, this.kick - dt * 8);
    const r = this.rig.root;
    r.position.copyFrom(this.pos);
    r.rotation.y = this.yaw;
    if (this.rig.emote && (this.speed > 0.5 || f & PF.firing)) this.rig.emote = null;
    // the pose families from the movement state; on an anchor the hands and feet grip it like the player's
    const mp = mv ? poseFromMoveState(mv, this.grips.cadence(), this.mp) : emptyMovePose();
    if (attached && this.world.level.anchors.all[mv!.a]) {
      const a = this.world.level.anchors.all[mv!.a]!;
      const from = s.from.mv;
      const to = s.to.mv;
      // the position along the anchor between the two states (the same anchor), else the newest
      const sv = from && to && from.a === to.a && isAttachedMode(from.m) && isAttachedMode(to.m) ? from.s + (to.s - from.s) * Math.max(0, Math.min(1, s.k)) : mv!.s;
      const sub = unpackAttachSub(mv!.sub);
      // a new anchor, or (3.2.0) turned round on a pipe: re-grip
      if (this.gripAnchor !== mv!.a || (a.kind === 'pipeH' && sub.face !== this.gripFace)) {
        this.grips.setPipe(a, sv, sub.face, 'hands', 'hands', this.rig.height);
        this.grips.setup(a, sv, sub.face, this.rig.height);
        this.gripAnchor = mv!.a;
        this.gripFace = sub.face;
        this.sPrev = sv;
        this.pipeKey = 'hands>hands';
      }
      // (3.2.0) a horizontal pipe's sub-state and its changes: the grips re-grip as the owner's did
      if (a.kind === 'pipeH') {
        const to = sub.pipeTo ?? sub.pipe;
        const key = `${sub.pipe}>${to}`;
        if (key !== this.pipeKey) {
          this.pipeKey = key;
          this.grips.setPipe(a, sv, sub.face, sub.pipe, to, this.rig.height);
        }
        this.grips.pipeK = sub.pipeTo && sub.phase === 'on' ? mv!.ph : 1;
      }
      // (3.2.0 phase 3) a rope's sideways offset and kick-out swing, a fence's climb height
      this.grips.u = mv!.u ?? 0;
      this.grips.outOff = a.kind === 'rappel' && sub.phase === 'on' && mv!.ph > 0 ? Math.sin(Math.PI * mv!.ph) * RAPPEL.swingOut : 0;
      this.grips.aimFree = a.kind === 'rappel' ||
        a.kind === 'split' || (a.kind === 'pipeH' && sub.pipe === 'inverted' && !sub.pipeTo) ? this.aim : 0;
      const v = dt > 0 ? (sv - this.sPrev) / dt : 0;
      this.sPrev = sv;
      const vent = sub.phase === 'exit' && (sub.exit === 'ventDrop' || sub.exit === 'drop') ? { drop: 1, progress: mv!.ph, kinY: this.pos.y } : null;
      // at rest: settle onto the owner's planted grips (stepping is history dependent)
      this.stillT = Math.abs(v) < 0.01 ? this.stillT + dt : 0;
      const follow = !!mv!.gp && this.stillT > 0.25 && !mv!.gp.some((g) => Number.isNaN(g));
      if (follow) this.grips.settleTo(mv!.gp!);
      // (following the owner's grips the remote makes no stepping decisions of its own)
      this.grips.update(dt, a, sv, v, sub.face, attachGripWeight(sub.phase, mv!.ph), this.rig, vent, !follow);
    } else if (this.gripAnchor >= 0) {
      this.grips.release(this.rig);
      this.gripAnchor = -1;
    }
    if (rp) {
      mp.traverse = rp.pose;
      mp.traverseT = replayK;
    }
    // weapon hand: the owner's (the cover controller swaps it at a left edge)
    this.rig.leftHanded = mv?.m === 'cover' && (mv.sub & COVER_SUB.leftHand) !== 0;
    // hiding at low cover: the owner's curl (its own height control is history dependent)
    this.rig.curlHold = mv?.m === 'cover' && mv.cu !== undefined ? mv.cu : null;
    this.rig.liftHold = mv?.m === 'cover' && mv.lf !== undefined ? mv.lf : null;
    // still in cover: the feet step onto the owner's planted spots
    const pins = this.rig.footPins;
    if (mv?.m === 'cover' && mv.fp && st.speed < 0.05) footPoints(r.position.x, r.position.z, r.rotation.y, mv.fp, pins);
    else pins[0] = pins[1] = pins[2] = pins[3] = NaN;
    const sy = Math.sin(this.yaw);
    const cy = Math.cos(this.yaw);
    const inv = moved > 1e-4 ? 1 / moved : 0;
    // hanging inverted (tumbled over): the spine aims mirrored, the raised weapon along the view in world space
    const upside = mp.tumble > 2;
    this.rig.animate(dt, {
      speed: this.speed,
      localX: (lx * cy - lz * sy) * inv,
      localZ: (lx * sy + lz * cy) * inv,
      grounded: (f & PF.grounded) !== 0 || mp.traverse !== 'none',
      crouch: this.crouch,
      kneel: mp.kneel,
      aimPitch: (upside ? -this.pitch : this.pitch) * this.aim,
      aimYaw: mv ? (upside ? -wrapPi(mv.ay + Math.PI) : mv.ay) * this.aim : 0,
      aimWorldYaw: upside && mv ? this.yaw + mv.ay : undefined,
      aimWorldPitch: upside ? this.pitch : undefined,
      tumble: mp.tumble,
      // lowered: only the head glances where the owner looks (as the player's rig)
      lookYaw: mv ? Math.max(-1.1, Math.min(1.1, mv.ay)) * 0.5 * (1 - this.aim) : 0,
      lookPitch: Math.max(-0.6, Math.min(0.6, this.pitch)) * 0.5 * (1 - this.aim),
      aim: this.aim,
      carry: this.carryW,
      kick: this.kick,
      dash: (f & PF.sprint) !== 0 ? 1 : 0,
      cover: mp.cover,
      wallSide: mp.wallSide,
      lean: mp.lean,
      peekOver: mp.peekOver,
      coverTop: mp.coverTop,
      coverMode: mp.coverMode,
      blind: mp.blind,
      edgeLook: mp.edgeLook,
      peekClear: mp.peekClear,
      traverse: mp.traverse,
      traverseT: mp.traverseT,
      melee: mp.melee,
    });
    // (3.2.0 phase 3) on a rope: draw it from the anchor to the harness
    const ra = mv?.m === 'rappel' ? this.world.level.anchors.all[mv.a] : null;
    if (ra && ra.kind === 'rappel') {
      const h = this.rig.hips;
      h.computeWorldMatrix(true);
      const hp = h.getAbsolutePosition();
      this.world.ropes.set(this.ropeKey, ra.top.x - ra.nx * 0.25, ra.top.y + 0.55, ra.top.z - ra.nz * 0.25, hp.x, hp.y, hp.z);
      this.roped = true;
    } else if (this.roped) {
      this.world.ropes.hide(this.ropeKey);
      this.roped = false;
    }
    // downed: lie on the side
    r.rotation.z = this.dead ? Math.PI / 2 : 0;
    if (this.dead) r.position.y += 0.22;
    this.fireVisuals(dt);
  }

  private fireVisuals(dt: number): void {
    if (!(this.flags & PF.firing) || this.dead || !this.weapon) {
      this.fireT = 0;
      return;
    }
    this.fireT -= dt;
    if (this.fireT > 0) return;
    const def = WEAPONS[this.weapon];
    this.fireT = Math.max(0.06, 60 / def.rpm);
    const m = this.models.get(this.weapon)!;
    const muzzle = m.muzzleWorld(this.tmpA);
    const cp = Math.cos(this.pitch);
    const end = this.tmpB.set(muzzle.x + Math.sin(this.yaw) * cp * 60, muzzle.y + Math.sin(this.pitch) * 60, muzzle.z + Math.cos(this.yaw) * cp * 60);
    const hit = this.ballistics.ray(muzzle, end, MASK.WORLD);
    this.vfx.tracer(muzzle, hit.point, def.tracer, def.pellets > 1 ? 0.012 : 0.02);
    this.vfx.muzzleFlash(muzzle, def.pellets > 1 ? 0.3 : 0.2);
    this.kick = 1;
    this.onFire?.(def.class, muzzle);
  }

  dispose(): void {
    this.marker?.dispose();
    this.marker = null;
    this.pouches.dispose();
    for (const m of this.models.values()) m.dispose();
    this.models.clear();
    this.rig.dispose();
  }
}
