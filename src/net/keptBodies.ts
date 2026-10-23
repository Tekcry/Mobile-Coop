/**
 * (LR16-6 fix) The co-op client's kept bodies cooling (render-only body heat). The client has no enemy manager, so
 * `GameState.paintHeat` cannot stamp its bodies as the host does from `EnemyManager.bodies`; `CoopClient` stamps them through
 * `GameState.bodyStamp` with this: each kept rig marked a body this render frame, its age since it went down, so it
 * cools on the same curve (`bodyHeat`) and a body behind a shut door stops showing when the host's does. Render only:
 * nothing is sent, nothing in gameplay reads it. No allocation (no iterator, no closure per call).
 */

/** The rig fields `paintHeat` reads for a body. */
export interface KeptBody {
  readonly rig: { bodyFrame: number; bodyAge: number };
}

const S = { f: 0, t: 0, at: null as ReadonlyMap<string, number> | null };

function stampOne(r: KeptBody, id: string): void {
  r.rig.bodyFrame = S.f;
  r.rig.bodyAge = S.t - (S.at!.get(id) ?? S.t);
}

/** Mark every kept body's rig a body at render frame `frame`, aged `time` minus when it went down (`at`, by id). */
export function stampKeptBodies(kept: ReadonlyMap<string, KeptBody>, at: ReadonlyMap<string, number>, time: number, frame: number): void {
  S.f = frame;
  S.t = time;
  S.at = at;
  kept.forEach(stampOne);
  S.at = null;
}
