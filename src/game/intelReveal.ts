/** (CT Core spare 9) Interrogation intel from the live world: reads the cameras and guards, then shows the lines. */
import type { GuardInfo } from '../ai/guardInfo';
import { PACE } from '../ai/enemy';
import { sweepCycle } from '../security/camera';
import { gatherIntel, type IntelCam, type IntelGuard, type IntelResult, type PatrolSource } from './intel';
import type { GameState } from './gameState';

export function revealIntel(g: GameState, at: { x: number; y: number; z: number }, info: GuardInfo | null | undefined): IntelResult | null {
  if (!info || info.lines.length === 0) return null;
  const cams: IntelCam[] = [];
  for (const c of g.security?.cameras ?? []) cams.push({ x: c.x, y: c.y, z: c.z, cycle: sweepCycle(c.def.sweep), live: c.mode !== 'destroyed' });
  const guards: IntelGuard[] = [];
  for (const e of g.enemyMgr?.enemies ?? []) {
    const src: PatrolSource = e;
    guards.push({ x: e.pos.x, y: e.pos.y, z: e.pos.z, up: e.alive && !e.ko && !e.taken && !e.def.quadruped, route: src.patrolRoute ?? null, speed: e.def.walkSpeed * PACE.patrol });
  }
  const r = gatherIntel(at, info, cams, guards);
  for (const line of r.lines) g.hud.feedItem(line);
  for (const flag of r.codes) g.mode?.onIntelCode?.(flag);
  g.events.emit('intel', { lines: r.lines, codes: r.codes });
  return r;
}
