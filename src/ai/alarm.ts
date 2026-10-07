/**
 * Alarm panels (pure data + rules), unit-tested: an alerted enemy within reach of a working panel runs to it and
 * holds it for a moment to call reinforcements. The player can disable a panel first, or drop the runner.
 */

import { hyp2 } from '../core/mathx';

export const ALARM = {
  /** Furthest panel an alerted enemy will run to (m, straight line). */
  range: 30,
  /** Seconds at the panel to raise it. */
  holdTime: 1.6,
  /** Seconds the player holds to disable a panel. */
  disableTime: 1.2,
  /** Reinforcements per alarm. */
  squad: 3,
  /** Stand-off from the wall to use it (m). */
  standoff: 0.6,
} as const;

export interface AlarmPanel {
  id: string;
  x: number;
  y: number;
  z: number;
  /** Facing (out of the wall). */
  yaw: number;
  disabled: boolean;
}

/** Where a user stands to work the panel (writes `out`). */
export function alarmStandPoint(p: AlarmPanel, out: [number, number]): [number, number] {
  out[0] = p.x + Math.sin(p.yaw) * ALARM.standoff;
  out[1] = p.z + Math.cos(p.yaw) * ALARM.standoff;
  return out;
}

/** Nearest working panel within `ALARM.range` of (x, z), or null. */
export function nearestPanel(panels: readonly AlarmPanel[], x: number, z: number, maxDy = 2, y = 0): AlarmPanel | null {
  let best: AlarmPanel | null = null;
  let bd: number = ALARM.range;
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i]!;
    if (p.disabled || Math.abs(p.y - y) > maxDy) continue;
    const d = hyp2(p.x - x, p.z - z);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}
