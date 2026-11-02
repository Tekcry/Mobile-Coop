/**
 * (anim-natural N3) A node harness for the draw / holster / swap / ready-to-aim chain: Wren's operator rig, the real
 * `PlayerWeapons` (rifle on the diagonal back sling, pistol in the thigh holster), the real `WeaponStance` and
 * `WeaponCarry`, and the weapon fields of the rig pose as `Player.fixedUpdate` / `frameUpdate` build them (standing
 * still, no camera pitch). Per 60 Hz step it samples the right wrist and the gun's grip / muzzle in world space.
 */
import type { CharacterRig, RigPose } from '../../src/player/characterRig';
import type { PlayerWeapons } from '../../src/weapons/playerWeapons';
import type { InputState } from '../../src/input/inputState';
import type { WeaponStance } from '../../src/player/weaponStance';

export interface DrawSample {
  t: number;
  /** The gun sampled (the one in the hands or travelling, else the selected one). */
  gun: string;
  wx: number;
  wy: number;
  wz: number;
  /** The trigger arm's elbow (world). */
  ex: number;
  ey: number;
  ez: number;
  gx: number;
  gy: number;
  gz: number;
  mx: number;
  my: number;
  mz: number;
  /** The grip and muzzle in the chest (torso) frame: the carry pose without the body's breathing and sway. */
  cgx: number;
  cgy: number;
  cgz: number;
  cmx: number;
  cmy: number;
  cmz: number;
  swap: number;
  raise: number;
  state: string;
  phase: number;
  /** The graph's weapon pitch channel (rad), the swap overlay weight and the spine yaw. */
  wpPitch: number;
  swapW: number;
  spYaw: number;
}

export interface DrawHarness {
  rig: CharacterRig;
  weapons: PlayerWeapons;
  inp: InputState;
  /** The weapon stance (holstered / low ready / aiming) the steps drive. */
  stance: WeaponStance;
  /** One fixed step + one frame (60 Hz), returning the sample after it. */
  step(): DrawSample;
  /** Runs `n` steps, collecting samples. */
  run(n: number, out?: DrawSample[]): DrawSample[];
  hold(action: 'ads' | 'draw', down: boolean): void;
  tap(action: 'swapNext' | 'draw'): void;
  /** A traversal or busy move holding the weapon state (`Player.weaponSuspend`). */
  suspend(on: boolean): void;
  /** The aim camera's blend-in time (s) the weapons set. */
  adsInTime(): number;
  dispose(): void;
}

export const DT = 1 / 60;

export async function drawHarness(): Promise<DrawHarness> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, Vector3, Matrix } = await import('../../src/core/babylon');
  const { PartLibrary } = await import('../../src/world/partLibrary');
  const { defaultLook } = await import('../../src/player/avatarLook');
  const { operatorRig } = await import('../../src/operators/runtime/playerFigure');
  const { PlayerWeapons } = await import('../../src/weapons/playerWeapons');
  const { WeaponStance, emptyStanceInput } = await import('../../src/player/weaponStance');
  const { WeaponCarry, emptyCarryInput, DRAW_RAISE } = await import('../../src/weapons/weaponCarry');
  const { InputState } = await import('../../src/input/inputState');

  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const make = (shape: Parameters<typeof lib.instance>[0], hex: string, slot?: Parameters<typeof lib.instance>[2]) => lib.instance(shape, hex, slot);
  const { rig } = operatorRig(scene, make, defaultLook(), 'n3');
  // the idle cycle starts at a random phase (AnimGraph.idleT): pinned, so every run samples the same poses
  (rig.graph as unknown as { idleT: number }).idleT = 0;
  const stance = new WeaponStance();
  const si = emptyStanceInput();
  const carry = new WeaponCarry();
  const ci = emptyCarryInput();
  const player = {
    rig,
    stance,
    carry,
    carryIn: ci,
    alive: true,
    ads: false,
    aimLockTimer: 0,
    kick: 0,
    reload: -1,
    reloadQueued: false,
    reloadEmpty: false,
    swapT: -1,
    swapFrom: 'backC',
    swapTo: 'backC',
    grenadeT: -1,
    sinceShot: 99,
    weaponDrawn: false,
    weaponWeight: 1,
    onWeightGear: null,
    position: new Vector3(0, 0, 0),
    cam: { ads: 0, adsZoom: 1, adsInTime: 0.3, yaw: 0, pitch: 0, pivot: new Vector3(0, 1.6, 0) },
    controller: { speedMul: 1, cc: { getVelocity: () => new Vector3(0, 0, 0) } },
    get drawWanted(): boolean {
      return stance.drawWanted;
    },
  };
  const stub = {} as never;
  const world = { scene, parts: lib, addShadowCaster: () => {}, props: { impulse: () => {}, damage: () => {} } } as never;
  const weapons = new PlayerWeapons(world, player as never, stub, stub, stub, [{ id: 'rifle' }, { id: 'pistolSd' }], () => {});
  const inp = new InputState();
  const pose: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, lookYaw: 0, lookPitch: 0 };
  let t = 0;
  let suspended = false;
  const gp = new Vector3();
  const mp = new Vector3();
  const cg = new Vector3();
  const cm = new Vector3();
  const inv = new Matrix();

  const fixed = (): void => {
    // Player.fixedUpdate (the weapon parts)
    si.xDown = inp.down('draw') || inp.pressed('draw');
    si.aimDown = inp.down('ads');
    si.alive = true;
    si.suspended = suspended;
    si.gunOut = player.weaponDrawn;
    stance.update(DT, si);
    player.ads = stance.aimWanted;
    player.cam.ads += ((player.ads ? 1 : 0) - player.cam.ads) * Math.min(1, DT / Math.max(0.05, player.cam.adsInTime));
    ci.ads = player.ads;
    ci.fire = false;
    ci.sinceShot = player.sinceShot;
    const backDraw = player.swapT >= (player.swapFrom === player.swapTo ? DRAW_RAISE.from : 0.5) && (player.swapTo === 'backL' || player.swapTo === 'backC' || player.swapTo === 'backR' || player.swapTo === 'thigh');
    ci.reloading = player.reload >= 0 || player.reloadQueued || (player.swapT >= 0 && !backDraw) || player.grenadeT >= 0;
    ci.raiseTime = backDraw ? DRAW_RAISE.time : 0;
    ci.weight = player.weaponWeight;
    carry.update(DT, ci);
    weapons.fixedUpdate(DT, inp);
    inp.consumeEdges();
  };
  const frame = (): void => {
    pose.aim = carry.raise;
    pose.carry = carry.w;
    pose.weight = player.weaponWeight;
    pose.reload = player.reload;
    pose.reloadEmpty = player.reloadEmpty;
    pose.swap = player.swapT;
    pose.swapFrom = player.swapFrom as RigPose['swapFrom'];
    pose.swapTo = player.swapTo as RigPose['swapTo'];
    pose.grenade = -1;
    pose.stride = carry.raise <= 0.5 ? 'facing' : 'velocity';
    rig.animate(DT, pose);
  };
  const sample = (): DrawSample => {
    const w = rig.wristR.computeWorldMatrix(true).getTranslation();
    const el = rig.elbowR.computeWorldMatrix(true).getTranslation();
    // the gun in the hands (or travelling), else the selected one
    const m = weapons.slots.find((s) => s.model.node === rig.heldWeapon)?.model ?? weapons.current.model;
    const wm = m.node.computeWorldMatrix(true);
    const def = m.def;
    Vector3.TransformCoordinatesFromFloatsToRef(def.grip[0], def.grip[1], def.grip[2], wm, gp);
    Vector3.TransformCoordinatesFromFloatsToRef(def.muzzle[0], def.muzzle[1], def.muzzle[2], wm, mp);
    rig.torso.computeWorldMatrix(true).invertToRef(inv);
    Vector3.TransformCoordinatesToRef(gp, inv, cg);
    Vector3.TransformCoordinatesToRef(mp, inv, cm);
    return { t, gun: def.id, ex: el.x, ey: el.y, ez: el.z, cgx: cg.x, cgy: cg.y, cgz: cg.z, cmx: cm.x, cmy: cm.y, cmz: cm.z, wx: w.x, wy: w.y, wz: w.z, gx: gp.x, gy: gp.y, gz: gp.z, mx: mp.x, my: mp.y, mz: mp.z, swap: player.swapT, raise: carry.raise, state: stance.state, phase: weapons.draw.phase, wpPitch: rig.graph.out.weapon.pitch, swapW: rig.graph.rowW.swap, spYaw: rig.graph.out.spine.yaw };
  };
  const h: DrawHarness = {
    rig,
    weapons,
    inp,
    stance,
    step() {
      t += DT;
      inp.tick(DT);
      fixed();
      frame();
      return sample();
    },
    run(n, out = []) {
      for (let k = 0; k < n; k++) out.push(h.step());
      return out;
    },
    hold(action, down) {
      inp.set('test', action, down);
    },
    suspend(on) {
      suspended = on;
    },
    adsInTime() {
      return player.cam.adsInTime;
    },
    tap(action) {
      inp.tap(action);
    },
    dispose() {
      scene.dispose();
    },
  };
  return h;
}

/** Speed (m/s) of a sampled point between consecutive samples (the gun's points: 0 across a change of gun). */
export function speeds(s: readonly DrawSample[], k: 'w' | 'g' | 'm' | 'e'): number[] {
  const out: number[] = [];
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1]!;
    const b = s[i]!;
    if ((k === 'g' || k === 'm') && a.gun !== b.gun) {
      out.push(out.length ? out[out.length - 1]! : 0);
      continue;
    }
    const dx = (b as unknown as Record<string, number>)[`${k}x`]! - (a as unknown as Record<string, number>)[`${k}x`]!;
    const dy = (b as unknown as Record<string, number>)[`${k}y`]! - (a as unknown as Record<string, number>)[`${k}y`]!;
    const dz = (b as unknown as Record<string, number>)[`${k}z`]! - (a as unknown as Record<string, number>)[`${k}z`]!;
    out.push(Math.sqrt(dx * dx + dy * dy + dz * dz) / DT);
  }
  return out;
}
