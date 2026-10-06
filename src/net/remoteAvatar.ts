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

/**
 * Another player's body, rendered from interpolated states: rig animation from speed/flags,
 * their weapon, and muzzle flashes + tracers while their firing flag is set.
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
  /** Fire sound hook. */
  onFire: ((cls: string, at: Vector3) => void) | null = null;

  constructor(
    private world: World,
    private vfx: Vfx,
    private ballistics: Ballistics,
    readonly info: PlayerInfo,
  ) {
    this.rig = new CharacterRig(world.scene, avatarFactory(world.parts, info.look, 'remote-part'), info.look, 1.75, `remote-${info.id}`);
    for (const m of this.rig.parts) world.addShadowCaster(m);
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
      for (const part of m.parts) this.world.addShadowCaster(part);
      this.models.set(id, m);
    }
    return m;
  }

  /** In the hands: `id`; every other carried weapon (lobby loadout + any seen held) in its own slot. */
  private setWeapon(id: WeaponId): void {
    if (id === this.weapon) return;
    for (const w of this.info.loadout) this.model(w);
    this.model(id);
    const ids = [...this.models.keys()];
    const slots = assignCarrySlots(ids.map((w) => ({ cls: WEAPONS[w].class, length: this.models.get(w)!.ext.z1 - this.models.get(w)!.ext.z0 })));
    ids.forEach((w, i) => {
      const m = this.models.get(w)!;
      const slot = slots[i];
      if (w === id) return;
      if (slot) m.holster(this.rig, slot);
      else m.setVisible(false);
    });
    this.model(id).hold(this.rig);
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
    }
    this.pos.set(s.x, s.y, s.z);
    this.yaw = s.yaw;
    const st = s.state;
    this.pitch = st.pitch;
    this.flags = st.f;
    this.setWeapon(st.w);
    const moved = hyp2(this.pos.x - this.prev.x, this.pos.z - this.prev.z);
    const inst = dt > 0 ? moved / dt : 0;
    this.speed += (Math.min(inst, 12) - this.speed) * Math.min(1, dt * 10);
    const lx = this.pos.x - this.prev.x;
    const lz = this.pos.z - this.prev.z;
    this.prev.copyFrom(this.pos);
    const f = this.flags;
    this.crouch += ((f & PF.crouch ? 1 : 0) - this.crouch) * Math.min(1, dt * 10);
    this.aim += ((f & (PF.ads | PF.firing) ? 1 : 0.15) - this.aim) * Math.min(1, dt * 10);
    this.kick = Math.max(0, this.kick - dt * 8);
    const r = this.rig.root;
    r.position.copyFrom(this.pos);
    r.rotation.y = this.yaw;
    if (this.rig.emote && (this.speed > 0.5 || f & PF.firing)) this.rig.emote = null;
    const sy = Math.sin(this.yaw);
    const cy = Math.cos(this.yaw);
    const inv = moved > 1e-4 ? 1 / moved : 0;
    this.rig.animate(dt, {
      speed: this.speed,
      localX: (lx * cy - lz * sy) * inv,
      localZ: (lx * sy + lz * cy) * inv,
      grounded: (f & PF.grounded) !== 0,
      crouch: this.crouch,
      aimPitch: this.pitch,
      aim: this.aim,
      kick: this.kick,
      dash: (f & PF.sprint) !== 0 ? 1 : 0,
    });
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
