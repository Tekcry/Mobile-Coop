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
  /** What a player bullet can hit. */
  PLAYER_SHOT: G.STATIC | G.PROP | G.ENEMY_HITBOX | G.RAGDOLL,
  /** What an enemy bullet can hit. */
  ENEMY_SHOT: G.STATIC | G.PROP | G.PLAYER_HITBOX,
  PROP_COLLIDE: G.STATIC | G.PROP | G.PLAYER | G.ENEMY | G.RAGDOLL | G.PROJECTILE | G.GLASS,
  RAGDOLL_COLLIDE: G.STATIC | G.PROP | G.RAGDOLL | G.GLASS,
  PROJECTILE_COLLIDE: G.STATIC | G.PROP | G.ENEMY | G.PLAYER | G.GLASS,
} as const;

/** Upper bounds so a busy fight can never tank the physics step. */
export const BUDGET = {
  maxDynamicProps: 28,
  maxRagdolls: 4,
  maxProjectiles: 24,
} as const;
