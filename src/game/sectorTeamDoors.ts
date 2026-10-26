import { Vector3 } from '../core/babylon';
import type { PlayerRef } from '../ai/enemy';
import type { DoorState } from '../world/doors';
import type { Interactable, InteractKind } from './interactables';
import { addDoorClosure } from './sectorStage';
import {
  BOLT_DEPTH,
  BOLT_REACH,
  PAIR_SWITCH_LABEL,
  PAIR_SWITCH_REACH,
  SectorBolts,
  SectorPairGates,
  boltHalfSpan,
  boltItemId,
  pairSwitchId,
  type Feet,
  type SectorDef,
} from './sectors';

/** A door is found within this of its doorway centre (m). */
const DOOR_FIND = 1.2;

/** The local feed lines (the client gets none: no host-to-client feed message, R2-PATHS "Open"). */
export const FEED_UNBOLTED = 'Unbolted - open the door for your partner';
export const FEED_PAIR_BOLT = 'The bar binds - your partner has to push the door from the other side';
export const FEED_KEY_WAIT = 'Key turned - your partner turns the other key now';
export const FEED_GATE_OPEN = 'Both keys turned - the gate is unlocked';

/** What the team doors need from the game (the mode passes `GameState` parts; tests pass fakes). */
export interface TeamDoorHost {
  readonly doors: { nearest(x: number, z: number, r: number): DoorState | null };
  readonly ints: { add(id: string, kind: InteractKind, pos: Vector3, label: string, holdTime: number, yaw?: number): Interactable; setEnabled(it: Interactable, on: boolean): void } | null;
  readonly nav: { addClosure(cx: number, cz: number, hx: number, hz: number, yaw: number, y: number): number; setClosed(id: number, on: boolean): void } | null;
  /** Lock (shut) or unlock a door and its door item (`SectorMode.lockDoor`). */
  lockDoor(d: DoorState, on: boolean): void;
  /** The players (index 0 is this machine's), refilled in place. */
  refs(): readonly PlayerRef[];
  /** A feed line for this machine's player. */
  feed(text: string): void;
  /** A door lock changed: the co-op `sector` send goes now (the client's `lk`). */
  changed(): void;
}

/** A team door's item (an "Unbolt", or one key switch of a pair gate), its door and its nav closure (-1 none). */
interface BoltIt {
  sec: number;
  k: number;
  it: Interactable;
  door: DoorState | null;
  nav: number;
}
interface GateIt {
  sec: number;
  k: number;
  a: Interactable | null;
  b: Interactable | null;
  door: DoorState | null;
  nav: number;
}

/**
 * (sector-redesign E3) Sector Ops team doors in the world, host-authoritative (sector-fixes-r RT, r2-nav; EW3 / EW4):
 * - Bolts (`SectorBolt`): the door locked, an "Unbolt" item on the bolt side only. A pair bolt (`pair: true`, R2-PATHS
 *   design 2) draws only while another living player stands pushing on the near side (`SectorBolts.press`).
 * - Pair gates (`SectorPairGate`): the door locked, two "Turn key" switch items; both turned within the window by two
 *   different players unlock it (`SectorPairGates.press`, the course rule).
 * Each locked team door is a closure on the guards' nav grid, shut while locked, open once drawn / unlocked, shut again
 * on a restart (`reset`). The client mirrors the items (`c-` ids, no wire change) and the locks (`lk`); its use comes
 * back as `use` and lands here with its peer id.
 */
export class SectorTeamDoors {
  readonly bolts: SectorBolts;
  readonly gates: SectorPairGates;
  /** The mode's clock (s), for key turns from items (`turnKey` without a time). */
  now = 0;
  private readonly boltIts: BoltIt[] = [];
  private readonly gateIts: GateIt[] = [];
  /** The other players' feet for a pair bolt (reused). */
  private readonly mates: Feet[] = [];

  constructor(
    readonly defs: readonly SectorDef[],
    private readonly host: TeamDoorHost,
  ) {
    this.bolts = new SectorBolts(defs);
    this.gates = new SectorPairGates(defs);
  }

  /**
   * At the mode's start: lock every team door, shut its nav closure and put down its items. `missionId`: the bound
   * mission's `MissionDef.id` (none: no mission). (J8 A30) A bolt with `missions` is fitted only when they name
   * `missionId`; an unfitted bolt is a plain door (`SectorBolts.unfit`: no lock, no nav closure, no item, so `reset`
   * and `boltInfo` never see it).
   */
  build(missionId?: string): void {
    const h = this.host;
    this.defs.forEach((s, sec) => {
      s.bolts?.forEach((b, k) => {
        if (b.missions && (missionId === undefined || !b.missions.includes(missionId))) {
          this.bolts.unfit(sec, k);
          return;
        }
        const door = h.doors.nearest(b.at[0], b.at[1], DOOR_FIND);
        if (!door) console.warn(`[sector] ${s.id}: no door at bolt ${k} (${b.at[0]}, ${b.at[1]})`);
        const nav = this.closeDoor(door, b.at);
        if (!h.ints) return;
        const y = door ? door.anchor.hinge.y : 0;
        const it = h.ints.add(boltItemId(sec, k), 'door', new Vector3(b.at[0], y, b.at[1]), 'Unbolt', 0);
        it.section = sec;
        it.reach = BOLT_REACH;
        it.side = b.side;
        // (sector-fixes-r2) the door's span only, not through the wall beside it (inBoltReach, the host's test)
        it.sideHalf = boltHalfSpan(b);
        it.sideDepth = BOLT_DEPTH;
        it.onUse = (_it, by) => this.unbolt(sec, k, by);
        h.ints.setEnabled(it, true);
        this.boltIts.push({ sec, k, it, door, nav });
      });
      s.pairGates?.forEach((g, k) => {
        const door = h.doors.nearest(g.door[0], g.door[1], DOOR_FIND);
        if (!door) console.warn(`[sector] ${s.id}: no door at pair gate ${k} (${g.door[0]}, ${g.door[1]})`);
        const nav = this.closeDoor(door, g.door);
        const y0 = door ? door.anchor.hinge.y : 0;
        const key = (isA: boolean): Interactable | null => {
          const sw = isA ? g.a : g.b;
          if (!h.ints) return null;
          const it = h.ints.add(pairSwitchId(sec, k, isA), 'switch', new Vector3(sw.at[0], sw.y ?? y0, sw.at[1]), sw.label ?? PAIR_SWITCH_LABEL, 0, sw.yaw ?? 0);
          it.section = sec;
          it.reach = PAIR_SWITCH_REACH;
          it.onUse = (_it, by) => this.turnKey(sec, k, isA, by);
          h.ints.setEnabled(it, true);
          return it;
        };
        this.gateIts.push({ sec, k, a: key(true), b: key(false), door, nav });
      });
    });
  }

  /** Lock a team door and shut its doorway on the nav grid (host / solo); returns the closure (-1 none). */
  private closeDoor(door: DoorState | null, at: readonly [number, number]): number {
    if (!door) return -1;
    const h = this.host;
    h.lockDoor(door, true);
    return this.navClosure(door, at);
  }

  /**
   * (sector-fixes-r2 nav) A locked door's closure on the host's nav grid (shut now), so guards route round it; -1 none.
   * The one helper for every locked door the mode adds: the team doors here, and the keypad doors (EW5, `SectorMode`).
   */
  navClosure(door: DoorState | null, at: readonly [number, number]): number {
    const nav = this.host.nav;
    if (!door || !nav) return -1;
    const a = door.anchor;
    // (merge E5) one closure size for every locked door: E5's pure helper (STAGE_NAV_*)
    const id = addDoorClosure(nav, { cx: at[0], cz: at[1], yaw: a.yaw, width: a.width, y: a.hinge.y });
    nav.setClosed(id, true);
    return id;
  }

  /** The player ref `by` names ('local' or none: this machine's player; else a client's peer id). */
  private user(by: string | undefined): { refs: readonly PlayerRef[]; i: number } {
    const refs = this.host.refs();
    if (by === undefined || by === 'local') return { refs, i: refs.length > 0 ? 0 : -1 };
    for (let i = 0; i < refs.length; i++) if (refs[i]!.id === by) return { refs, i };
    return { refs, i: -1 };
  }

  /**
   * A player used a team door's "Unbolt". Host-authoritative: the user's feet must be in reach on the bolt side, and for
   * a pair bolt another living player must be pushing on the near side; then the door unlocks for both and the item
   * goes off. True when it drew.
   */
  unbolt(sec: number, k: number, by?: string): boolean {
    const { refs, i } = this.user(by);
    const r = refs[i];
    if (!r) return false;
    const mates = this.mates;
    mates.length = 0;
    for (let j = 0; j < refs.length; j++) if (j !== i && refs[j]!.target.alive) mates.push(refs[j]!.feet);
    const why = this.bolts.press(sec, k, r.feet, mates);
    mates.length = 0;
    if (why === 'partner' && i === 0) this.host.feed(FEED_PAIR_BOLT);
    if (why !== 'ok') return false;
    const b = this.boltIts.find((q) => q.sec === sec && q.k === k);
    if (!b) return true;
    this.openDoor(b.door, b.nav);
    this.host.ints?.setEnabled(b.it, false);
    if (i === 0) this.host.feed(FEED_UNBOLTED);
    return true;
  }

  /**
   * A player turned key switch a (`isA`) or b of pair gate `k` of section `sec` at `now` (s, the mode's clock). Host-
   * authoritative: the other key turned by another player within the window unlocks the door for both (the switches go
   * off). Returns the press result.
   */
  turnKey(sec: number, k: number, isA: boolean, by: string | undefined, now: number = this.now): 'open' | 'wait' | 'done' {
    const { refs, i } = this.user(by);
    if (i < 0 || !refs[i]!.target.alive) return 'done';
    const res = this.gates.press(sec, k, isA, i, now);
    if (res === 'wait' && i === 0) this.host.feed(FEED_KEY_WAIT);
    if (res !== 'open') return res;
    const g = this.gateIts.find((q) => q.sec === sec && q.k === k);
    if (g) {
      this.openDoor(g.door, g.nav);
      if (g.a) this.host.ints?.setEnabled(g.a, false);
      if (g.b) this.host.ints?.setEnabled(g.b, false);
    }
    if (i === 0) this.host.feed(FEED_GATE_OPEN);
    return res;
  }

  private openDoor(door: DoorState | null, nav: number): void {
    if (door) this.host.lockDoor(door, false);
    if (nav >= 0) this.host.nav?.setClosed(nav, false);
    // (sector-fixes-r fix) the client's door lock rides the next sector send: send it now
    this.host.changed();
  }

  /** (M9) A section restart: its bolts shut and its pair gates locked again (doors locked, nav shut, items back). */
  reset(sec: number): void {
    const h = this.host;
    this.bolts.rebolt(sec);
    this.gates.reset(sec);
    const shut = (door: DoorState | null, nav: number, it: Interactable | null): void => {
      if (door) h.lockDoor(door, true);
      if (nav >= 0) h.nav?.setClosed(nav, true);
      if (it && !it.enabled) h.ints?.setEnabled(it, true);
    };
    for (const b of this.boltIts) if (b.sec === sec) shut(b.door, b.nav, b.it);
    for (const g of this.gateIts) {
      if (g.sec !== sec) continue;
      shut(g.door, g.nav, g.a);
      shut(null, -1, g.b);
    }
    // (sector-fixes-r fix) the re-bolted locks reach the client on the next step's sector send
    h.changed();
  }

  /** Test view: the bolts (item id, door index, plan centre, side, pair, shut, door locked, nav closure shut). */
  boltInfo(): { id: string; sec: number; k: number; door: number; at: readonly [number, number]; side: readonly [number, number]; pair: boolean; shut: boolean; locked: boolean | null; nav: number }[] {
    return this.boltIts.map((b) => {
      const def = this.defs[b.sec]!.bolts![b.k]!;
      return { id: b.it.id, sec: b.sec, k: b.k, door: b.door?.index ?? -1, at: def.at, side: def.side, pair: !!def.pair, shut: this.bolts.isShut(b.sec, b.k), locked: b.door ? b.door.anchor.locked : null, nav: b.nav };
    });
  }

  /** Test view: the pair gates (switch item ids, door index, open, door locked, nav closure). */
  gateInfo(): { a: string | null; b: string | null; sec: number; k: number; door: number; open: boolean; locked: boolean | null; nav: number }[] {
    return this.gateIts.map((g) => ({ a: g.a?.id ?? null, b: g.b?.id ?? null, sec: g.sec, k: g.k, door: g.door?.index ?? -1, open: this.gates.isOpen(g.sec, g.k), locked: g.door ? g.door.anchor.locked : null, nav: g.nav }));
  }
}
