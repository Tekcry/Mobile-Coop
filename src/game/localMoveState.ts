/**
 * The local player's movement state (3.2.0 phase 1) for the co-op wire: which mode the body is in (free, wall,
 * attached, a committed move, a takedown) and the few numbers a remote needs to pose it with the same code
 * (`poseFromMoveState`, `AttachGrips`, `traversePath`). Built every fixed step a net session runs.
 */
import { wrapPi } from '../anim/motion';
import { knifeSub, packAttachSub, TAKEDOWN_SUB_BLOW, type ExitPose, type MoveMode, type MoveState } from '../player/moveState';
import type { GameState } from './gameState';
import { WALL_SUB } from '../player/wallController';
import { KNIFE_KILLS } from './knifeKill';
import { knifeSpan } from './knifePair';

const EXIT_OF: Partial<Record<string, ExitPose>> = { climbUp: 'climbUp', mantle: 'mantle', ventDrop: 'ventDrop', drop: 'drop' };

let gpBuf: number[] | null = null;

export function localMoveState(g: GameState, out: MoveState): MoveState {
  const p = g.player;
  const c = p.controller;
  const pose = p.pose;
  const tr = g.traversal;
  // (anim-rework S1) the pace band: the slowest gear whose speed covers the stick's analogue speed (the host's speed check)
  out.g = c.paceBand;
  out.r = p.carry.raise;
  const w = p.carry.w;
  out.rd = w.high > w.low && w.high >= w.compressed ? 1 : w.compressed > w.low ? 2 : 0;
  out.ay = wrapPi(p.cam.yaw - c.yaw);
  out.dw = g.weapons.drawPhase;
  out.a = -1;
  out.s = 0;
  out.sub = 0;
  out.ph = 0;
  out.tid = '';
  delete out.gp;
  delete out.u;
  // (3.2.0 phase 5) a team move: braced, boosted, the human ladder
  const tm = g.team.mode;
  if (tm) {
    out.m = tm;
    out.tid = g.team.partner;
    out.sub = g.team.wireSub;
    // (B5) the hang-down holder's depth (m, the head under the edge): the hanging partner follows it
    out.s = g.team.wireS;
    out.ph = pose.traverse === 'climbUp' || pose.traverse === 'vault' || pose.traverse === 'climb' ? pose.traverseT : 0;
    delete out.c;
    return out;
  }
  // (piano-knife S3) a knife kill, from the press until the attacker is free (the tail too, `active` null): the knife bit
  // and the row in `sub`, the move's phase over `knifeSpan` in `ph`, the approach's progress in `s`; without a row (7)
  // today's blow phase and bit
  const tk = g.takedown;
  if (tk.knifeOn) {
    out.m = 'takedown';
    out.tid = tk.knifeTid;
    if (tk.kr >= 0) {
      const R = KNIFE_KILLS[tk.kr]!;
      out.sub = knifeSub(tk.kr);
      out.ph = Math.max(0, Math.min(1, tk.kt / knifeSpan(R)));
      out.s = tk.knifeApproach;
    } else {
      out.sub = knifeSub(-1) | (tk.blowPh >= 0 ? TAKEDOWN_SUB_BLOW : 0);
      out.ph = Math.max(0, Math.min(1, tk.blowPh));
    }
    delete out.c;
    return out;
  }
  const td = g.takedown.active;
  if (td && g.takedown.hostage) {
    // (3.2.0) holding a hostage: free movement (walk), the guard held in front
    out.m = 'grab';
    out.tid = td.e.id;
    // (G7) the finisher's / interrogation's progress and which (sub bit 1 the kill, bit 2 interrogating): the host
    // lowers its guard with the knockout, remotes pose the bend and the kill's blow from them (no new wire field)
    g.takedown.grabWire(out);
    delete out.c;
    return out;
  }
  if (td) {
    out.m = 'takedown';
    out.tid = td.e.id;
    // (anim-n4d) the blow's own phase (posed warped onto the kill, `killWarp`, here and on remotes)
    out.ph = Math.max(0, Math.min(1, g.takedown.blowPh));
    // (pose-parity) whether the blow runs at all (`blowPh` -1: a choke, the lethal approach): `ph` cannot carry the -1, and
    // a remote posing the arc at 0 held the elbow wind-up through every choke
    out.sub = g.takedown.blowPh >= 0 ? TAKEDOWN_SUB_BLOW : 0;
    delete out.c;
    return out;
  }
  // (locomotion step 10) the elbow strike: after a takedown, before attached
  const sk = g.strike;
  if (sk.active) {
    out.m = 'strike';
    out.tid = sk.tid;
    out.ph = sk.ph;
    delete out.c;
    return out;
  }
  // (ct-toolkit 3.2, optic-coop) the optic cable: the door or gap, its kind (OPTIC_SUBS), the cable fed out; the view
  // at the tip is never sent
  const oc = g.optic.core;
  if (oc.active) {
    out.m = 'optic';
    out.a = oc.door;
    out.sub = oc.sub;
    out.ph = oc.extension;
    delete out.c;
    return out;
  }
  // (locomotion step 13) the door peek: the door, the hinge side, the door's drawn crack
  const dp = g.doorPeek;
  if (dp.active) {
    out.m = 'doorPeek';
    out.a = dp.door;
    out.sub = g.peekFrame.hingeRight ? 1 : 0;
    out.ph = Math.max(0, Math.min(1, g.world.doors.list[dp.door]?.ajar ?? 0));
    delete out.c;
    return out;
  }
  // (locomotion step 11) back to a wall: the segment (level order), metres along it, WALL_SUB; `ph` the settle
  const wc = g.wallCore;
  if (wc && wc.active) {
    out.m = 'wall';
    out.a = wc.seg;
    out.s = wc.s;
    // (step 12b, D9) leftHand from the edge side: peeking at edgeL (remotes pose the mirrored grip)
    out.sub = wc.sub() | (wc.leftHand ? WALL_SUB.leftHand : 0);
    out.ph = wc.phase === 'entering' ? Math.min(1, wc.t / wc.enterDur) : 1;
    delete out.c;
    return out;
  }
  if (tr.attached) {
    const m = tr.attach;
    const ac = tr.attachCtl;
    out.m = m.kind === 'ledge' && m.entry === 'wall' && m.phase === 'enter' ? 'wallJump' : (m.kind as MoveMode);
    out.a = m.anchor?.id ?? -1;
    out.s = m.s;
    const pp = ac.pipe;
    const pipeOn = m.kind === 'pipeH';
    const exit: ExitPose = m.phase === 'exit' && ac.isFlipping ? 'flip' : m.phase === 'exit' && ac.isFenceFlip ? 'fenceFlip' : (m.phase === 'exit' && EXIT_OF[pose.traverse]) || 'none';
    out.sub = packAttachSub(m.phase, m.face, exit, pipeOn ? (pp.to ? pp.from : pp.mode) : 'hands', pipeOn ? pp.to : null) | g.team.attachBits;
    out.ph = pipeOn && pp.to && m.phase === 'on' ? pp.progress : m.kind === 'rappel' && m.phase === 'on' ? Math.max(0, ac.swingT) : m.progress;
    // (3.2.0 phase 3) a rope's sideways offset / a fence's climb height
    if (m.kind === 'rappel' || m.kind === 'fence') out.u = ac.u;
    // at rest with every contact planted: the grips (the remote's own stepping may have ended elsewhere)
    if (m.phase === 'on' && Math.abs(m.v) < 0.01) {
      const gp = tr.attachCtl.grips.planted((gpBuf ??= [0, 0, 0, 0]));
      if (!gp.some((v) => Number.isNaN(v))) out.gp = gp as [number, number, number, number];
    }
    delete out.c;
    return out;
  }
  const cm = tr.committed;
  if (cm) {
    out.m = cm.window ? 'windowVault' : (cm.kind as MoveMode);
    out.ph = Math.max(0, Math.min(1, cm.t / Math.max(1e-3, cm.dur)));
    const k = (out.c ??= { n: 0, x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0, top: 0, v: 0, dur: 1 });
    k.n = cm.n;
    k.x0 = cm.from.x;
    k.y0 = cm.from.y;
    k.z0 = cm.from.z;
    k.x1 = cm.to.x;
    k.y1 = cm.to.y;
    k.z1 = cm.to.z;
    k.top = cm.top;
    k.v = cm.speed;
    k.dur = cm.dur;
    return out;
  }
  delete out.c;
  if (c.landT > 0.15 && c.lastLanding === 'heavy') {
    out.m = 'landing';
    out.ph = Math.max(0, Math.min(1, 1 - c.landT));
    return out;
  }
  out.m = 'ground';
  // (pose-parity) aiming from the left shoulder (the shoulder swap, G17) is the player flag `PF.aimLeft` (every mode,
  // `net/netShared.ts` localFlags), no longer the ground `sub` bit 128
  return out;
}
