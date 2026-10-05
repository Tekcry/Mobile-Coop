import type { CharacterRig } from '../player/characterRig';

export interface EmoteDef {
  duration: number;
  /** Applied after the regular animation each frame. */
  pose(rig: CharacterRig, t: number): void;
}

const s = Math.sin;

/** Procedural emote poses (overrides on top of the rig animation). */
export const EMOTE_POSES: Record<string, EmoteDef> = {
  wave: {
    duration: 2.2,
    pose: (r, t) => {
      r.shoulderR.rotation.set(0, 0, 2.6 + s(t * 10) * 0.35);
      r.elbowR.rotation.set(0, 0, 0.4);
    },
  },
  salute: {
    duration: 2,
    pose: (r) => {
      r.shoulderR.rotation.set(-0.3, -0.6, 2.2);
      r.elbowR.rotation.set(0, 0, 2.2);
    },
  },
  point: {
    duration: 1.8,
    pose: (r, t) => {
      r.shoulderR.rotation.set(-Math.PI / 2 - 0.2, 0, 0);
      r.elbowR.rotation.set(0, 0, 0);
      r.torso.rotation.y = s(t * 2) * 0.15;
    },
  },
  dance: {
    duration: 4,
    pose: (r, t) => {
      r.hips.rotation.y = s(t * 6) * 0.5;
      r.hips.position.y += Math.abs(s(t * 6)) * 0.08;
      r.shoulderL.rotation.set(0, 0, -2.4 - s(t * 6) * 0.4);
      r.shoulderR.rotation.set(0, 0, 2.4 - s(t * 6) * 0.4);
      r.hipL.rotation.x = s(t * 6) * 0.4;
      r.hipR.rotation.x = -s(t * 6) * 0.4;
    },
  },
  flex: {
    duration: 2.4,
    pose: (r, t) => {
      const k = Math.min(1, t * 3);
      r.shoulderL.rotation.set(0, 0, -1.6 * k);
      r.shoulderR.rotation.set(0, 0, 1.6 * k);
      r.elbowL.rotation.set(0, 0, -1.9 * k);
      r.elbowR.rotation.set(0, 0, 1.9 * k);
      r.torso.rotation.x = -0.1;
    },
  },
  clap: {
    duration: 2.4,
    pose: (r, t) => {
      const c = Math.abs(s(t * 9)) * 0.35;
      r.shoulderL.rotation.set(-1.3, 0.6 - c, 0);
      r.shoulderR.rotation.set(-1.3, -0.6 + c, 0);
      r.elbowL.rotation.set(-0.4, 0, 0);
      r.elbowR.rotation.set(-0.4, 0, 0);
    },
  },
  laugh: {
    duration: 2.4,
    pose: (r, t) => {
      r.torso.rotation.x = -0.25 + s(t * 14) * 0.05;
      r.neck.rotation.x = -0.4;
      r.shoulderL.rotation.set(-0.4, 0, -0.3);
      r.shoulderR.rotation.set(-0.4, 0, 0.3);
    },
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
    e.pose(r, t);
  };
  return true;
}
