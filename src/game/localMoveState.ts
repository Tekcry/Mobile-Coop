/**
 * The local player's movement state (3.2.0 phase 1) for the co-op / PvP wire: which mode the body is in (free, cover,
 * attached, a committed move, a takedown) and the few numbers a remote needs to pose it with the same code
 * (`poseFromMoveState`, `AttachGrips`, `traversePath`). Built every fixed step a net session runs.
 */
import { wrapPi } from '../anim/motion';
import { COVER_SUB, footOffsets, packAttachSub, type ExitPose, type MoveMode, type MoveState } from '../player/moveState';
import type { GameState } from './gameState';

const EXIT_OF: Partial<Record<string, ExitPose>> = { climbUp: 'climbUp', mantle: 'mantle', ventDrop: 'ventDrop', drop: 'drop' };

let gpBuf: number[] | null = null;
let fpBuf: [number, number, number, number] | null = null;

export function localMoveState(g: GameState, out: MoveState): MoveState {
  const p = g.player;
  const c = p.controller;
  const pose = p.coverPose;
  const tr = g.traversal;
  out.g = c.gear;
  out.r = p.carry.raise;
  const w = p.carry.w;
  out.rd = w.high > w.low && w.high >= w.compressed ? 1 : w.compressed > w.low ? 2 : 0;
  out.ay = wrapPi(p.cam.yaw - c.yaw);
  out.a = -1;
  out.s = 0;
  out.sub = 0;
  out.ph = 0;
  out.tid = '';
  delete out.cu;
  delete out.lf;
  delete out.fp;
  delete out.gp;
  const td = g.takedown.active;
  if (td) {
    out.m = 'takedown';
    out.tid = td.e.id;
    out.ph = Math.max(0, Math.min(1, pose.melee));
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
    const exit: ExitPose = m.phase === 'exit' && ac.isFlipping ? 'flip' : (m.phase === 'exit' && EXIT_OF[pose.traverse]) || 'none';
    out.sub = packAttachSub(m.phase, m.face, exit, pipeOn ? (pp.to ? pp.from : pp.mode) : 'hands', pipeOn ? pp.to : null);
    out.ph = pipeOn && pp.to && m.phase === 'on' ? pp.progress : m.progress;
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
  if (pose.cover !== 'none') {
    out.m = 'cover';
    let sub = 0;
    if (pose.cover === 'low') sub |= COVER_SUB.low;
    if (pose.wallSide > 0) sub |= COVER_SUB.wallRight;
    if (pose.peekOver > 0.5) sub |= COVER_SUB.over;
    if (pose.blind) sub |= COVER_SUB.blind;
    if (pose.gunClear) sub |= COVER_SUB.gunClear;
    if (c.kneeling) sub |= COVER_SUB.kneel;
    if (pose.edgeLook < -0.5) sub |= COVER_SUB.edgeL;
    else if (pose.edgeLook > 0.5) sub |= COVER_SUB.edgeR;
    if (p.rig.leftHanded) sub |= COVER_SUB.leftHand;
    out.sub = sub;
    out.s = pose.top;
    out.ph = (Math.max(-1, Math.min(1, pose.lean)) + 1) / 2;
    if (pose.top > 0) {
      out.cu = p.rig.curl;
      out.lf = p.rig.lift;
    }
    const L = p.rig.planner.L;
    const R = p.rig.planner.R;
    if (c.speed < 0.05) out.fp = footOffsets(c.pos.x, c.pos.z, c.yaw, L.x, L.z, R.x, R.z, (fpBuf ??= [0, 0, 0, 0]));
    return out;
  }
  if (c.landT > 0.15 && c.lastLanding === 'heavy') {
    out.m = 'landing';
    out.ph = Math.max(0, Math.min(1, 1 - c.landT));
    return out;
  }
  out.m = 'ground';
  return out;
}
