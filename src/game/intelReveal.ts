/** (CT Core spare 9) Interrogation intel from the live world: reads the cameras and guards, then shows the lines. */
import type { GuardInfo } from '../ai/guardInfo';
import { PACE } from '../ai/enemy';
import { sweepCycle } from '../security/camera';
import { gatherIntel, intelGuard, type IntelCam, type IntelGuard, type IntelResult } from './intel';
import type { GameState } from './gameState';
import { jointLines, type JointIntel } from './jointInterrogation';

export function revealIntel(g: GameState, at: { x: number; y: number; z: number }, info: GuardInfo | null | undefined): IntelResult | null {
  if (!info || info.lines.length === 0) return null;
  const cams: IntelCam[] = [];
  for (const c of g.security?.cameras ?? []) cams.push({ x: c.x, y: c.y, z: c.z, cycle: sweepCycle(c.def.sweep), live: c.mode !== 'destroyed' });
  const guards: IntelGuard[] = [];
  // patrol timing: each guard's route through the Guard AI getter `Enemy.patrolRoute` (an Enemy is a PatrolSource)
  for (const e of g.enemyMgr?.enemies ?? []) guards.push(intelGuard(e, PACE.patrol));
  const r = gatherIntel(at, info, cams, guards);
  for (const line of r.lines) g.hud.feedItem(line);
  for (const flag of r.codes) g.mode?.onIntelCode?.(flag);
  g.events.emit('intel', { lines: r.lines, codes: r.codes });
  return r;
}

/** (joint-interrogation) A joint read's extra lines (host / solo only): radio subtitle and feed here, the flag to the
 *  mode (`onIntelCode`), and the `intel` event (the co-op host relays the lines to the clients as `feed`). `at`: the
 *  guard (kept for parity with `revealIntel`; the joint lines are authored, not derived from the place). */
export function revealJoint(g: GameState, _at: { x: number; y: number; z: number }, j: JointIntel | null): boolean {
  const lines = jointLines(j);
  if (!j || lines.length === 0) return false;
  for (const line of lines) {
    g.hud.feedItem(line);
    g.hud.barks.say('lantern', line, true);
  }
  const codes: string[] = [];
  if (j.flag) {
    codes.push(j.flag);
    g.mode?.onIntelCode?.(j.flag);
  }
  g.events.emit('intel', { lines, codes });
  return true;
}
