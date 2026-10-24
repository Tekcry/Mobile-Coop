/** Havok collision filter bits (shape.filterMembershipMask / filterCollideMask, raycast query masks). */
export const G = {
  STATIC: 1 << 0,
  PLAYER: 1 << 1,
  ENEMY: 1 << 2,
  PROP: 1 << 3,
  PROJECTILE: 1 << 4,
  RAGDOLL: 1 << 5,
  /** Enemy hit volumes (head/body) for weapon raycasts. */
  ENEMY_HITBOX: 1 << 7,
  TRIGGER: 1 << 8,
  /** Player hit capsule (separate from the controller so the controller never collides with it). */
  PLAYER_HITBOX: 1 << 9,
  /** (3.2.0) Chain-link fences: they stop bodies, not bullets or sight. */
  FENCE: 1 << 10,
  /** (T5b2, D49) A co-op partner's body (`PartnerBlocker`): blocks the local player's controller only. */
  PARTNER: 1 << 11,
  /** (E2, EW6) Glass panes (`BoxPiece.glass`): they stop bodies, props, ragdolls and grenades and are a wall to
   *  hearing; bullets, the camera boom, the level probes and light pass (G45; armoured glass is E10's). */
  GLASS: 1 << 12,
  /** (E2) Frosted glass carries this bit as well: it blocks guard sight (`MASK.SIGHT`); clear glass does not (G45). */
  GLASS_FROSTED: 1 << 13,
  /** (E10, A97) The armour bit: an armoured glass pane (`BoxPiece.armoured`, with `G.GLASS`) and an armoured door leaf
   *  (`Door.armoured`, with `G.STATIC`). Rounds stop on it (`PLAYER_SHOT` / `ENEMY_SHOT`) and never penetrate it; it is
   *  not in `SIGHT` (armoured clear glass still sees) nor `WORLD` (the camera boom passes). */
  GLASS_ARMOURED: 1 << 14,
} as const;

export const MASK = {
  /** What blocks the camera boom and line of sight. */
  WORLD: G.STATIC,
  /** What the player controller capsule collides with. */
  PLAYER_COLLIDE: G.STATIC | G.PROP | G.ENEMY | G.FENCE | G.PARTNER | G.GLASS,
  /** (E2) What blocks a guard's line of sight: static geometry and frosted glass (clear glass sees, G45). */
  SIGHT: G.STATIC | G.GLASS_FROSTED,
  /** (E2) What muffles a sound as a wall: static geometry and every glass pane. */
  HEARING: G.STATIC | G.GLASS,
  /** What a player bullet can hit. (rig-pose-fix S7, audit G18) Not `G.RAGDOLL`: a ragdoll is visual and per machine (each
   *  simulates its own, capped by `BUDGET.maxRagdolls`; the body's sim position is `Body.pos`, S5), so a round passes through
   *  it as the host's `HOST_LOS` check of a client round already did. Undo: add `G.RAGDOLL` back here. */
  PLAYER_SHOT: G.STATIC | G.PROP | G.ENEMY_HITBOX | G.GLASS_ARMOURED,
  /** What an enemy bullet can hit (E10: armoured glass stops it; a guard's fire decision must test this mask, not SIGHT). */
  ENEMY_SHOT: G.STATIC | G.PROP | G.PLAYER_HITBOX | G.GLASS_ARMOURED,
  /** (polish 15) What shields a grenade blast: static geometry and every glass pane (the grenade itself bounces off a pane). */
  BLAST: G.STATIC | G.GLASS,
  /** (polish 16) What stops a thrown gadget in flight (sticky camera, noise maker, the throw arc): static and glass, as the grenade body. */
  GADGET_FLIGHT: G.STATIC | G.GLASS,
  /** (polish 18) The host's line-of-sight check of a client's claimed round: static geometry and armoured panes / leaves. */
  HOST_LOS: G.STATIC | G.GLASS_ARMOURED,
  PROP_COLLIDE: G.STATIC | G.PROP | G.PLAYER | G.ENEMY | G.RAGDOLL | G.PROJECTILE | G.GLASS,
  RAGDOLL_COLLIDE: G.STATIC | G.PROP | G.RAGDOLL | G.GLASS,
  PROJECTILE_COLLIDE: G.STATIC | G.PROP | G.ENEMY | G.PLAYER | G.GLASS,
} as const;

/** (E2 / E10) A glass pane's body bits: `G.GLASS`, frosted adds `G.GLASS_FROSTED`, armoured adds `G.GLASS_ARMOURED`. */
export function glassMembership(kind: 'clear' | 'frosted', armoured: boolean): number {
  return G.GLASS | (kind === 'frosted' ? G.GLASS_FROSTED : 0) | (armoured ? G.GLASS_ARMOURED : 0);
}

/** (E10) A closed door leaf's body bits: `G.STATIC` (a round stops; a plain 0.1 leaf is thinner than a rifle's penetration), armoured adds the armour bit. */
export function doorMembership(armoured: boolean): number {
  return G.STATIC | (armoured ? G.GLASS_ARMOURED : 0);
}

/** (E10) A struck body's bits carry the armour bit: the round stops on it (sparks), never penetrates. */
export function isArmoured(membership: number): boolean {
  return (membership & G.GLASS_ARMOURED) !== 0;
}

/**
 * (guard-ai sniper triage) The bodies that are armour, marked where they are built (an armoured pane group's body in
 * `LevelBuilder.buildGlass`, an armoured door leaf's in `Doors.addBody`). A ray hit cannot read armour from the struck
 * shape's bits: Havok reports no leaf for a container hit, and a container's own filter reads as Havok's default (every
 * bit, the armour bit included) whatever was set on it, so the level's static walls read as armour (tests/armourFireStatic).
 */
const ARMOURED_BODIES = new WeakSet<object>();

/** Marks a physics body as armour (rounds stop on it, never through it; a guard's fire gate holds at it). */
export function markArmoured(body: object): void {
  ARMOURED_BODIES.add(body);
}

/** (guard-ai sniper triage) The struck body is armour (`markArmoured`). No allocation. */
export function isArmouredBody(body: object | null | undefined): boolean {
  return body !== null && body !== undefined && ARMOURED_BODIES.has(body);
}

/** Upper bounds so a busy fight can never tank the physics step. */
export const BUDGET = {
  maxDynamicProps: 28,
  maxRagdolls: 4,
  maxProjectiles: 24,
} as const;
