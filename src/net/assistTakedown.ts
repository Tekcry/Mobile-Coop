/**
 * (coop-walk-fixes P6) The co-op team takedown on a partner's hostage (Michael 4.72: "coop partner has takedown option
 * when host is holding hostage, but it doesnt do anything. should trigger coop takedown"; "if coop partner holds guard,
 * host doesnt have option for takedown."). Pure host rules: who holds the guard, so the host can check a player's team
 * takedown and end that hold. No allocation.
 */

/** A host `seized` entry as these rules read it: the client holding the guard, and whether it is held as a hostage. */
export interface SeizedHold {
  by: string;
  hostage?: boolean;
}

/**
 * The player holding guard `eid` as a hostage, when it is not `by` (the player asking for the team takedown): the host
 * itself (`hostHostage`, the id of the guard its own grab holds; '' none) or a client whose `seized` entry is a hostage
 * hold and whose MoveState still holds him (`grabTid(client)` = the `grab` mode's `tid`, '' otherwise). Null: nobody
 * else holds him (no team takedown).
 */
export function assistHolder(eid: string, by: string, selfId: string, hostHostage: string, seized: ReadonlyMap<string, SeizedHold>, grabTid: (id: string) => string): string | null {
  if (hostHostage === eid) return by === selfId ? null : selfId;
  const s = seized.get(eid);
  if (!s || !s.hostage || s.by === by || grabTid(s.by) !== eid) return null;
  return s.by;
}
