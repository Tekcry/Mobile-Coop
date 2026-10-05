import type { CharacterRig, FkPose } from '../player/characterRig';

export interface EmoteDef {
  duration: number;
  /** Joint overrides (Euler x, y, z, limbs hanging down in the bind pose), blended over the animation. */
  pose(t: number): FkPose;
}

const s = Math.sin;

/** Procedural emote poses. The rig cross-fades into and out of them (no snaps). */
export const EMOTE_POSES: Record<string, EmoteDef> = {
  wave: {
    duration: 2.2,
    pose: (t) => ({ shoulderR: [0, 0, 2.6 + s(t * 10) * 0.3], elbowR: [0, 0, 0.5] }),
  },
  salute: {
    duration: 2,
    pose: () => ({ shoulderR: [-0.4, -0.5, 2.0], elbowR: [0, 0, 2.3] }),
  },
  point: {
    duration: 1.8,
    pose: (t) => ({ shoulderR: [-Math.PI / 2 - 0.15, 0, 0], elbowR: [-0.05, 0, 0], chest: [0, s(t * 2) * 0.15, 0] }),
  },
  dance: {
    duration: 4,
    pose: (t) => ({
      pelvis: [0, s(t * 6) * 0.4, 0],
      pelvisLift: Math.abs(s(t * 6)) * 0.06,
      shoulderL: [0, 0, -2.3 - s(t * 6) * 0.35],
      shoulderR: [0, 0, 2.3 - s(t * 6) * 0.35],
      elbowL: [0, 0, -0.4],
      elbowR: [0, 0, 0.4],
    }),
  },
  flex: {
    duration: 2.4,
    pose: (t) => {
      const k = Math.min(1, t * 3);
      return { shoulderL: [0, 0, -1.55 * k], shoulderR: [0, 0, 1.55 * k], elbowL: [0, 0, -1.9 * k], elbowR: [0, 0, 1.9 * k], chest: [-0.08, 0, 0] };
    },
  },
  clap: {
    duration: 2.4,
    pose: (t) => {
      const c = Math.abs(s(t * 9)) * 0.3;
      return { shoulderL: [-1.25, 0.55 - c, 0], shoulderR: [-1.25, -0.55 + c, 0], elbowL: [-0.5, 0, 0], elbowR: [-0.5, 0, 0] };
    },
  },
  laugh: {
    duration: 2.4,
    pose: (t) => ({ chest: [-0.2 + s(t * 14) * 0.04, 0, 0], neck: [-0.35, 0, 0], shoulderL: [-0.35, 0, -0.25], shoulderR: [-0.35, 0, 0.25], elbowL: [-0.8, 0, 0], elbowR: [-0.8, 0, 0] }),
  },
};

/** Start an emote on a rig. Returns false for unknown ids. */
export function playEmote(rig: CharacterRig, id: string): boolean {
  const e = EMOTE_POSES[id];
  if (!e) return false;
  rig.emoteTime = 0;
  rig.emote = (r, t) => {
    if (t > e.duration) {
      r.emote = null;
      return;
    }
    return e.pose(t);
  };
  return true;
}
