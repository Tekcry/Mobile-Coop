/**
 * Room clearing bookkeeping (pure). A room is clear once a player has been inside it and every enemy
 * assigned to it is down (enemies that leave their room still count for it). Rooms without a squad
 * clear on entry.
 */
export class RoomClearTracker {
  private visited: boolean[];
  private clearedFlags: boolean[];
  private remaining: number[];
  /** Pending squad members not spawned yet (a room is never clear while some are pending). */
  private pending: number[];
  private owner = new Map<string, number>();
  cleared = 0;
  /** Order rooms were cleared in (indices). */
  readonly order: number[] = [];

  constructor(readonly total: number) {
    this.visited = new Array<boolean>(total).fill(false);
    this.clearedFlags = new Array<boolean>(total).fill(false);
    this.remaining = new Array<number>(total).fill(0);
    this.pending = new Array<number>(total).fill(0);
  }

  /** Reserve `n` squad slots for a room that will spawn later. */
  expect(room: number, n: number): void {
    if (room < 0 || room >= this.total) return;
    this.pending[room]! += n;
  }

  /** An enemy now belongs to a room (consumes a pending slot when there is one). */
  assign(enemyId: string, room: number): void {
    if (room < 0 || room >= this.total || this.owner.has(enemyId)) return;
    this.owner.set(enemyId, room);
    this.remaining[room]!++;
    if (this.pending[room]! > 0) this.pending[room]!--;
  }

  /** Player is in a room. Returns the room index if this cleared it, else -1. */
  visit(room: number): number {
    if (room < 0 || room >= this.total || this.visited[room]) return -1;
    this.visited[room] = true;
    return this.check(room);
  }

  /** An enemy died. Returns the room index this cleared, else -1. */
  killed(enemyId: string): number {
    const room = this.owner.get(enemyId);
    if (room === undefined) return -1;
    this.owner.delete(enemyId);
    this.remaining[room]!--;
    return this.check(room);
  }

  /** Cancel a room's unspawned squad slots. Returns the room index if this cleared it, else -1. */
  drop(room: number): number {
    if (room < 0 || room >= this.total) return -1;
    this.pending[room] = 0;
    return this.check(room);
  }

  isCleared(room: number): boolean {
    return this.clearedFlags[room] ?? false;
  }

  isVisited(room: number): boolean {
    return this.visited[room] ?? false;
  }

  /** Squad members alive or still to spawn for a room. */
  hostiles(room: number): number {
    return (this.remaining[room] ?? 0) + (this.pending[room] ?? 0);
  }

  get done(): boolean {
    return this.cleared >= this.total;
  }

  private check(room: number): number {
    if (this.clearedFlags[room] || !this.visited[room] || this.remaining[room]! > 0 || this.pending[room]! > 0) return -1;
    this.clearedFlags[room] = true;
    this.cleared++;
    this.order.push(room);
    return room;
  }
}
