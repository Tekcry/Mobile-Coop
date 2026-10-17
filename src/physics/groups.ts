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
} as const;

export const MASK = {
  /** What blocks the camera boom and line of sight. */
  WORLD: G.STATIC,
  /** What the player controller capsule collides with. */
  PLAYER_COLLIDE: G.STATIC | G.PROP | G.ENEMY | G.FENCE | G.PARTNER,
  /** What a player bullet can hit. */
  PLAYER_SHOT: G.STATIC | G.PROP | G.ENEMY_HITBOX | G.RAGDOLL,
  /** What an enemy bullet can hit. */
  ENEMY_SHOT: G.STATIC | G.PROP | G.PLAYER_HITBOX,
  PROP_COLLIDE: G.STATIC | G.PROP | G.PLAYER | G.ENEMY | G.RAGDOLL | G.PROJECTILE,
  RAGDOLL_COLLIDE: G.STATIC | G.PROP | G.RAGDOLL,
  PROJECTILE_COLLIDE: G.STATIC | G.PROP | G.ENEMY | G.PLAYER,
} as const;

/** Upper bounds so a busy fight can never tank the physics step. */
export const BUDGET = {
  maxDynamicProps: 28,
  maxRagdolls: 4,
  maxProjectiles: 24,
} as const;
