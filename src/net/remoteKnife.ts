/**
 * (piano-knife S3) A remote player's paired knife kill, posed from its MoveState with the game's own code (`killDrive`,
 * `knifePair`, `knifeKill` helpers) on the wire's clock. One per `RemoteAvatar`.
 *
 * The wire (`localMoveState`): mode `takedown`, `sub` the knife bit and the row (`knifeSub`; `KNIFE_ROW_NONE` the switch-on
 * move without a row: the knife shown, today's move), `ph` the move's phase over `knifeSpan` (the move and its tail),
 * `s` the approach's progress 0..1, `tid` the guard.
 *
 * Each render frame the owner calls `read` (the newest state), `attacker` before the attacker's rig animates (her clip
 * on her graph, her grip and knife hands on the guard's drawn body), and, while `posesVictim`, `victim` after she
 * animated (his root off her drawn root, his clip, buckle and hands on her forearm). On the client the guard is the
 * puppet and poses after this; on the host the guard posed earlier in the frame (one frame behind: BRIEF S3 Doubt 1).
 * Babylon only through the rigs it is given; no allocation per call.
 */
import type { CharacterRig } from '../player/characterRig';
import type { KeyedClip } from '../anim/keyed';
import { newKillDrive } from '../anim/killDrive';
import { KNIFE_ROW_NONE, knifeRowOfSub, type MoveState } from '../player/moveState';
import { KNIFE, KNIFE_KILLS, knifeClip, knifeClipsReady, loadKnifeClips } from '../game/knifeKill';
import { attackerHands, knifeSpan, newPairTrack, pairHandsOff, resetPairTrack, victimHands, victimRoot, type KnifeTip, type RootOut } from '../game/knifePair';

/** The guard's side of a remote pair: `Enemy.knifeVictim` (host) or `EnemyPuppet.knifeVictim` (client). */
export interface KnifeVictimSide {
  knifeVictim(clip: KeyedClip | null, ph: number, buckle: number): void;
}

/** A move restarts when its clock steps back further than this (s). */
const RESTART = 0.05;

export class RemoteKnife {
  /** -1 none; `KNIFE_ROW_NONE`: the knife shown, today's move; 0-3 a row (clips ready). */
  row = -1;
  tid = '';
  /** Seconds into the move (`ph` x `knifeSpan`). */
  kt = 0;
  /** The approach's progress 0..1. */
  ap = 0;
  /** `root` holds this frame's victim root (the host's seized step reads it). */
  rootOn = false;
  readonly root: RootOut = { x: 0, y: 0, z: 0, yaw: 0 };
  private readonly drive = newKillDrive();
  private readonly track = newPairTrack();
  private fromX = 0;
  private fromZ = 0;
  private fromYaw = 0;
  private fromSet = false;

  /** The newest state: true while it is a knife kill (the knife shown). A new move (another guard or row, or the clock
   *  stepping back) starts the pair afresh. Rows wait for the clips (loaded here on first sight: row 7 until then). */
  read(mv: MoveState | null): boolean {
    let r = mv && mv.m === 'takedown' ? knifeRowOfSub(mv.sub) : -1;
    if (!mv || r < 0) {
      this.row = -1;
      return false;
    }
    if (r < KNIFE_ROW_NONE) {
      if (r >= KNIFE_KILLS.length) r = KNIFE_ROW_NONE;
      else if (!knifeClipsReady()) {
        void loadKnifeClips();
        r = KNIFE_ROW_NONE;
      }
    }
    const R = r < KNIFE_ROW_NONE ? KNIFE_KILLS[r]! : null;
    const kt = R ? mv.ph * knifeSpan(R) : 0;
    if (mv.tid !== this.tid || r !== this.row || kt < this.kt - RESTART) {
      resetPairTrack(this.track);
      this.fromSet = false;
      this.rootOn = false;
    }
    this.tid = mv.tid;
    this.row = r;
    if (R) {
      this.kt = kt;
      this.ap = mv.s;
    } else {
      this.kt = 0;
      this.ap = 0;
    }
    return true;
  }

  /**
   * Render frame, before `ar` animates: her clip window on her graph (in over `blendIn`, out over `blendOut` after the
   * move, as the owner's `runKnife` / `knifeTail`), her hands on the guard's drawn body (`vr`; null: hands off) in over
   * the approach, released over `release` after `limp` (the owner's `knifeFrame`). Row 7: no drive, no hands. No
   * allocation.
   */
  attacker(ar: CharacterRig, vr: CharacterRig | null, knife: KnifeTip | null): void {
    const row = this.row;
    if (row < 0) return;
    const d = this.drive;
    if (row >= KNIFE_ROW_NONE) {
      if (ar.graph.kill === d) ar.graph.kill = null;
      d.clip = null;
      pairHandsOff(ar, null);
      return;
    }
    const R = KNIFE_KILLS[row]!;
    const kt = this.kt;
    const S = R.seconds;
    const contactT = R.contact * S;
    const limpT = R.limp * S;
    d.clip = knifeClip(row, false);
    // `attackerPhase`, written out (no boxed number from a call that is not inlined)
    d.phase = R.attackerFrom + (kt / S) * (R.attackerTo - R.attackerFrom);
    d.w = kt <= 0 ? 0 : kt < S ? Math.min(1, kt / KNIFE.blendIn) : Math.max(0, 1 - (kt - S) / KNIFE.blendOut);
    ar.graph.kill = d;
    // the hands' weight: `handsAt(ap, 1)` before `limp` (in over the approach's first `handsIn` share), then out
    let wGrip: number;
    if (kt >= limpT) {
      const u = (kt - limpT) / KNIFE.release;
      wGrip = u <= 0 ? 1 : u >= 1 ? 0 : 1 - u * u * (3 - 2 * u);
    } else {
      const u = this.ap / KNIFE.handsIn;
      wGrip = u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
    }
    if (!vr || wGrip <= 0) {
      pairHandsOff(ar, null);
      return;
    }
    attackerHands(R, kt / S, kt - contactT, ar, vr, knife, wGrip, this.track);
  }

  /** The guard is held this frame: a row, from the grab on (`grabAt(ap, 1) > 0`: before it the guard is his own, as the
   *  owner's `runKnife`). */
  get posesVictim(): boolean {
    return this.row >= 0 && this.row < KNIFE_ROW_NONE && this.grabK() > 0;
  }

  /** `grabAt(ap, 1)`, written out: the grab's eased share over the approach's last `gripIn`. */
  private grabK(): number {
    const u = (this.ap - (1 - KNIFE.gripIn)) / KNIFE.gripIn;
    const e = u <= 0 ? 0 : u >= 1 ? 1 : u;
    return e * e * (3 - 2 * e);
  }

  /**
   * Render frame, after `ar` animated: his root off her drawn root (`victimRoot`, eased from where he was drawn at the
   * first call over the grab), his clip at the move's phase with the buckle from the stab (during the approach: the
   * clip's start, no buckle), his hands on her forearm. After `limp` it carries on (his clip clamped at `victimTo`, his
   * hands going out) until the owner stops calling it. No allocation.
   */
  victim(ar: CharacterRig, vr: CharacterRig, v: KnifeVictimSide): void {
    const row = this.row;
    if (row < 0 || row >= KNIFE_ROW_NONE) return;
    const R = KNIFE_KILLS[row]!;
    const vroot = vr.root;
    if (!this.fromSet) {
      this.fromX = vroot.position.x;
      this.fromZ = vroot.position.z;
      this.fromYaw = vroot.rotation.y;
      this.fromSet = true;
    }
    const ap = ar.root.position;
    const r = victimRoot(R, ap.x, ap.y, ap.z, ar.root.rotation.y, this.grabK(), this.fromX, this.fromZ, this.fromYaw, this.root);
    vroot.position.set(r.x, r.y, r.z);
    vroot.rotation.y = r.yaw;
    this.rootOn = true;
    const S = R.seconds;
    const sc = this.kt - R.contact * S;
    // `victimPhase` and `buckleAt` x `bucklePitchOf`, written out as the owner's `runKnife`
    let vph = R.victimFrom;
    let bk = 0;
    if (this.ap >= 1) {
      const ph = this.kt / S;
      vph = R.victimFrom + (ph <= 0 ? 0 : ph < 1 ? ph : 1) * (R.victimTo - R.victimFrom);
      if (sc >= 0) {
        if (sc < KNIFE.buckleRise) {
          const u = sc / KNIFE.buckleRise;
          bk = u * u * (3 - 2 * u);
        } else {
          const q = (sc - KNIFE.buckleRise) / KNIFE.buckleDecay;
          if (q < 1) {
            const u = 1 - q;
            bk = u * u * (3 - 2 * u);
          }
        }
      }
    }
    v.knifeVictim(knifeClip(row, true), vph, bk * (R.yawOff === 0 ? -KNIFE.bucklePitch : KNIFE.bucklePitch));
    victimHands(R, sc, ar, vr, this.track);
  }

  /** The knife kill is over on this rig (the wire left it): her drive and hands off, the pair forgotten. */
  off(ar: CharacterRig): void {
    if (ar.graph.kill === this.drive) ar.graph.kill = null;
    this.drive.clip = null;
    pairHandsOff(ar, null);
    this.row = -1;
    this.tid = '';
    this.rootOn = false;
    this.fromSet = false;
  }
}
