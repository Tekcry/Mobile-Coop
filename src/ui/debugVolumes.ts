import type { TransformNode } from '../core/babylon';

/** A collision/hit volume registered for the debug overlay's skeleton/capsule/hitbox view. */
export interface DebugVolume {
  node: TransformNode;
  kind: 'capsule' | 'sphere';
  /** Capsule segment endpoints (node-local Y heights) and radius. */
  y0: number;
  y1: number;
  r: number;
  color: string;
}

/** Everything that wants to be drawn in the debug view registers here (cheap; nothing is drawn while off). */
export const DEBUG_VOLUMES = new Set<DebugVolume>();
/** Live rigs (for skeleton lines). Typed loosely to keep this module free of rig imports. */
/** Foot state the skeleton view draws (planted / swinging, landing target). */
export interface DebugFoot {
  x: number;
  y: number;
  z: number;
  contact: boolean;
  toX: number;
  toY: number;
  toZ: number;
}
export const DEBUG_RIGS = new Set<{ bones(): [TransformNode, TransformNode][]; root: TransformNode; planner: { L: DebugFoot; R: DebugFoot } }>();
