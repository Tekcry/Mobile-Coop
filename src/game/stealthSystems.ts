import { Vector3 } from '../core/babylon';
import { BodyCarry, type LocalCarry } from './bodyCarry';
import type { Body } from '../ai/body';
import { BODY } from '../ai/bodies';
import { ALARM, type AlarmPanel } from '../ai/alarm';
import { RESPONSE, responseTeam } from '../ai/gear';
import type { EnemyManager } from '../ai/enemyManager';
import type { EnemyKind } from '../ai/enemyDefs';
import type { Enemy } from '../ai/enemy';
import type { ReinforceEntry } from '../ai/guardAiData';
import { groupBaseOn, lampReachProbe, lightOnRay, type LightRegistry } from '../world/lights';
import type { BreakerHost } from '../ai/breaker';
import { BACK_TIMER, BOARD_REACH, IsolatorBoards, type BoardSink } from './isolators';
import type { Interactable, Interactables } from './interactables';
import type { GameState } from './gameState';
import { DOOR, type DoorState } from '../world/doors';
import { G, MASK } from '../physics/groups';
import { hyp2 } from '../core/mathx';

/** Noise radius (m): a bulb shot out (a body put down: `bodyCarry.ts` DROP_NOISE). */
const SHOT_LIGHT_NOISE = 5;
/** (A3, G41) A guard's door is shut this long (s) after he is clear of it. Starting value. */
const DOOR_GUARD_CLOSE = 1.5;
/** Door noise radii (m): eased open / shut by hand, bashed open at a sprint. */
const DOOR_QUIET_NOISE = 2;
/** (F1b, door-4, G41) A calm guard this close, facing it, with a clear line, notices a door the player left open. */
const DOOR_NOTICE_RANGE = 9;
const DOOR_NOTICE_COS = 0.2;
/** Seconds between notice checks. */
const DOOR_NOTICE_EVERY = 0.25;
const DOOR_BASH_NOISE = 10;

/**
 * (marlow-final, ENGINE-ANSWERS Q9) Is (x, z) occupied within `r`: the local player at (px, pz), any co-op partner (a
 * calm guard must never shut a door onto the client's player), or a live enemy? No allocation.
 */
export function spotOccupied(
  x: number,
  z: number,
  r: number,
  px: number,
  pz: number,
  remotes: readonly { feet: { x: number; z: number } }[],
  enemies: readonly { alive: boolean; pos: { x: number; z: number } }[],
): boolean {
  if (hyp2(px - x, pz - z) < r) return true;
  for (let i = 0; i < remotes.length; i++) {
    const f = remotes[i]!.feet;
    if (hyp2(f.x - x, f.z - z) < r) return true;
  }
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i]!;
    if (e.alive && hyp2(e.pos.x - x, e.pos.z - z) < r) return true;
  }
  return false;
}

/**
 * Stealth fixtures in a match (phase 3b): bodies the player can pick up, carry (slow, weapon stowed, hands on
 * the victim), put down or hide in a container; light switches (a room's lamp circuit) and lights shot out
 * (enemies come to look, with a flashlight in the dark); alarm panels the player can disable before an
 * alerted enemy reaches one (reinforcements). Owned by `GameState` in modes with enemies.
 */
export class StealthSystems implements LocalCarry {
  bodiesHidden = 0;
  lightsShot = 0;
  private bodyIts = new Map<Body, Interactable>();
  private switches: { it: Interactable; group: number; on: boolean }[] = [];
  private panels: { panel: AlarmPanel; it: Interactable }[] = [];
  /** (sector-redesign E4, EW8) Breaker / timed isolator boards (`MapLayout.boards`) and their items (`board-<i>`). */
  boards: IsolatorBoards | null = null;
  private boardIts: Interactable[] = [];
  /** The "Drop body" action (not in the world: offered while carrying with no hiding spot near). */
  private dropIt: Interactable;
  private doorIts: { d: DoorState; it: Interactable }[] = [];
  /** (A3, G41) Seconds a door a guard opened has stood open and clear (index -> s). A calm guard's door is shut behind him. */
  private guardOpened = new Map<number, number>();
  /** (F1b, door-4) Doors the player opened and nobody has dealt with (door index set). A guard who sees one open raises
   *  suspicion and then shuts it (the G41 close). */
  private playerOpened = new Set<number>();
  private noticeT = 0;
  private noticeA = new Vector3();
  /** (polish2) The mount-reach probe's ends (`lampReachProbe`). */
  private readonly reachA = new Vector3();
  private readonly reachB = new Vector3();
  private noticeB = new Vector3();

  constructor(
    private g: GameState,
    private em: EnemyManager,
    private ints: Interactables,
    private noise: (r: number, at: Vector3) => void,
  ) {
    this.carrier = new BodyCarry(g, {
      canRagdoll: () => em.canRagdoll(),
      noise: (r, at) => this.noise(r, at),
      // (G7) let go of before the hoist: offered again
      onLetGo: (b) => {
        const it = this.bodyIts.get(b);
        if (it) ints.setEnabled(it, b.present);
      },
    });
    const layout = g.world.layout;
    const reg = g.world.level.lights;
    layout.switches?.forEach((s, i) => {
      const it = ints.add(`switch-${i}`, 'switch', s.pos, 'Lights off', 0, s.yaw);
      if (s.section !== undefined) it.section = s.section;
      it.reach = 1.3;
      const sw = { it, group: s.group, on: true };
      it.onUse = () => this.toggle(sw, reg);
      ints.setEnabled(it, true);
      this.switches.push(sw);
    });
    // (guard-ai S15) the guards reach the switches: a cut circuit is turned back on through the player's own toggle
    // (never a course mains gate's circuit, A63)
    const course = layout.course;
    if (course?.groups) {
      for (const bay of course.def.bays) {
        for (const gt of bay.gates) {
          const gid = gt.kind === 'mains' ? course.groups[gt.group] : undefined;
          if (gid !== undefined) this.mainsGroups.add(gid);
        }
      }
    }
    em.breakers = this.breakerHost;
    // (sector-redesign E4, EW8) boards: a 'switch' item (no new item kind on the wire), the switch's reach; host / solo
    // only (a co-op client mirrors the item and sends `use`, the host runs it, its lamps follow by slice L's `lamps`)
    const bd = layout.boards;
    if (bd?.length) {
      const sink: BoardSink = {
        cut: (i, x, z) => {
          this.boardChanged(i, false);
          // the circuit going dark is noticed. (guard-ai LR16-4) A breaker board is a wall switch's fault: reported on
          // its circuit at the board (the S15 reset walk, `breakerHost`); a timed window is the player's, so its cut
          // stays the S2 look at the board (the lure) and the timer relights it
          const b = this.boards;
          const gr = b && !b.timed(i) ? b.liveGroup(i) : -1;
          if (gr >= 0) this.em.lightsOut(x, z, b!.defs[i]!.pos.y + 2.5, -1, gr);
          else this.em.lightsOut(x, z);
        },
        back: (i, how) => {
          this.boardChanged(i, true);
          // the timed window's end: the cue is the switch click, the lamps and the board's indicator lit again
          if (how === BACK_TIMER) g.hud.feedItem('Circuit restored');
        },
      };
      const boards = new IsolatorBoards(bd, reg, sink);
      this.boards = boards;
      bd.forEach((b, i) => {
        const it = ints.add(`board-${i}`, 'switch', b.pos, '', 0, b.yaw);
        if (b.section !== undefined) it.section = b.section;
        it.reach = BOARD_REACH;
        it.onUse = () => boards.use(i);
        this.boardIts.push(it);
        this.showBoard(i);
      });
    }
    layout.alarms?.forEach((a, i) => {
      const panel: AlarmPanel = { id: `alarm-${i}`, x: a.pos.x, y: a.pos.y, z: a.pos.z, yaw: a.yaw, disabled: false, ...(a.section !== undefined ? { section: a.section } : {}) };
      em.alarms.push(panel);
      const it = ints.add(panel.id, 'alarm', a.pos, 'Disable alarm', ALARM.disableTime, a.yaw);
      if (a.section !== undefined) it.section = a.section;
      it.reach = 1.3;
      it.onUse = () => {
        panel.disabled = true;
        it.done = true;
        ints.setEnabled(it, false);
        g.hud.feedItem('Alarm disabled');
      };
      ints.setEnabled(it, true);
      this.panels.push({ panel, it });
    });
    layout.hideSpots?.forEach((h, i) => {
      const it = ints.add(`hide-${i}`, 'hide', h.pos, 'Hide body', 0);
      if (h.section !== undefined) it.section = h.section;
      it.reach = 1.5;
      it.onUse = () => this.hideCarried();
      ints.setEnabled(it, true);
    });
    // a free-standing item for "Drop body" (never added to the world list)
    this.dropIt = { id: 'drop-body', kind: 'body', pos: new Vector3(), label: 'Drop body', holdTime: 0, enabled: true, done: false, progress: 0, node: null!, parts: [], light: null, onUse: () => this.beginDrop() };
    // doors: open / close by hand, bash open at a sprint
    const doors = g.world.doors;
    for (const d of doors.list) {
      const it = ints.add(`door-${d.anchor.id}`, 'door', new Vector3(d.cx, d.anchor.hinge.y, d.cz), 'Open door', 0);
      if (d.anchor.section !== undefined) it.section = d.anchor.section;
      it.reach = 1.4;
      it.onUse = () => {
        if (d.target === 0) doors.open(d, 'quiet');
        else doors.close(d, (x, z, r) => this.occupied(x, z, r));
      };
      ints.setEnabled(it, !d.anchor.locked);
      this.doorIts.push({ d, it });
    }
    doors.onSound = (d, how) => {
      // (step 13) a door-peek crack / close: the quiet-open sound at 30%, no noise for the guards (quiet floors)
      if (how === 'crack') {
        g.events.emit('door', { how: 'quiet', x: d.cx, z: d.cz, vol: 0.3 });
        return;
      }
      if (how === 'drive') {
        g.events.emit('door', { how: 'quiet', x: d.cx, z: d.cz, vol: 0.3 });
        this.playerOpened.add(d.index);
        return;
      }
      g.events.emit('door', { how, x: d.cx, z: d.cz });
      if (how === 'enemy') {
        this.guardOpened.set(d.index, 0);
        this.playerOpened.delete(d.index);
        return;
      }
      if (how === 'close') this.playerOpened.delete(d.index);
      else this.playerOpened.add(d.index);
      const r = how === 'bash' ? DOOR_BASH_NOISE : DOOR_QUIET_NOISE;
      this.noise(r, new Vector3(d.cx, d.anchor.hinge.y, d.cz));
    };
    em.onBodyAdded = (b) => this.addBody(b);
    em.onBodyRemoved = (b) => {
      const it = this.bodyIts.get(b);
      if (it) ints.remove(it);
      this.bodyIts.delete(b);
      if (this.carry === b) this.carrier.reset();
    };
    em.onBodyFound = (_e, b) => {
      g.events.emit('bodyFound', { x: b.pos.x, z: b.pos.z });
      g.hud.feedItem('Body found', 'warn');
    };
    em.onRevived = (e) => g.mode?.onEnemyJoined?.(e);
    em.onAlarm = (e, p) => this.onAlarm(e, p);
    for (const b of em.bodies) this.addBody(b);
  }

  private addBody(b: Body): void {
    const it = this.ints.add(`body-${b.id}`, 'body', b.pos, 'Pick up body', 0);
    it.reach = BODY.reach;
    it.onUse = () => this.pickUp(b);
    this.ints.setEnabled(it, b.present);
    this.bodyIts.set(b, it);
  }

  /** (coop-carry) The local player's carry (`BodyCarry`: the lift, the carry, the put down), moved out of here unchanged. */
  readonly carrier: BodyCarry;

  /** The body on the player's shoulder. */
  get carry(): Body | null {
    return this.carrier.carry;
  }
  set carry(b: Body | null) {
    this.carrier.carry = b;
  }

  /** A body on the shoulder, or (G7) being lifted to it / put down from it: hands busy, no traversal. */
  get carrying(): boolean {
    return this.carrier.carrying;
  }

  /** (G7) The lift or the put down is under way (committed: no interact, no movement). */
  get busy(): boolean {
    return this.carrier.busy;
  }

  /** The hero's bend (rad) and pelvis drop (m) this step (GameState hands them to the player pose). */
  get bend(): number {
    return this.carrier.bend;
  }
  get bendDrop(): number {
    return this.carrier.bendDrop;
  }
  /** (G7) Stepping in to the body under the override this step. */
  get stepping(): boolean {
    return this.carrier.stepping;
  }
  /** (anim-n4 fix) The body's weight on the shoulder this step, 0..1. */
  get loadShare(): number {
    return this.carrier.loadShare;
  }
  /** (anim-n4 fix) The lift's step-in to the body 0..1 this step, -1 no lift. */
  get liftStepK(): number {
    return this.carrier.liftStepK;
  }
  /** (anim-n4) The shoulder the body is on (1 right, -1 left). */
  get loadSide(): number {
    return this.carrier.loadSide;
  }

  /** While carrying: the interact target is a hiding spot in reach, (G7, row 7: CT opens and closes doors while
   *  carrying, 052704 @ 9, 21-24) else a door in reach the operator faces (open / close only: no stealth open, bash or
   *  optic cable), else "Drop body". Nothing while the lift or the put down runs. */
  carryTarget(feet: Vector3): Interactable | null {
    if (!this.carrier.carry || this.carrier.busy) return null;
    const hide = this.ints.nearest(feet, 1.5, 'hide');
    if (hide) return hide;
    const door = this.ints.nearest(feet, 1.5, 'door');
    if (door) {
      const c = this.g.player.controller;
      const dx = door.pos.x - feet.x;
      const dz = door.pos.z - feet.z;
      const d = hyp2(dx, dz);
      if (d < 0.05 || (Math.sin(c.yaw) * dx + Math.cos(c.yaw) * dz) / d > 0.3) return door;
    }
    return this.dropIt;
  }

  /** (A4) The grab menu's Carry: shoulder this body now (through the lift). */
  pickUpBody(b: Body): void {
    this.pickUp(b);
  }

  /** (G7) Pick up through the lift (`BodyCarry.pickUp`); the body's item goes off while it is reached for. */
  private pickUp(b: Body): void {
    if (!this.carrier.pickUp(b)) return;
    const it = this.bodyIts.get(b);
    if (it) this.ints.setEnabled(it, false);
  }

  /** Put the body down at once (a restart, the carrier down): `BodyCarry.dropCarried`. */
  dropCarried(): void {
    this.carrier.dropCarried();
  }

  private beginDrop(): void {
    this.carrier.beginDrop();
  }

  /** Into the container in reach: gone for good, never found. */
  private hideCarried(): void {
    const b = this.carrier.takeOff();
    if (!b) return;
    b.hide();
    this.bodiesHidden++;
    this.g.hud.feedItem('Body hidden');
    this.g.events.emit('body', { action: 'hide' });
  }

  private toggle(sw: { it: Interactable; group: number; on: boolean }, reg: LightRegistry): void {
    sw.on = !sw.on;
    // every switch on the same circuit follows
    for (const o of this.switches) {
      if (o.group !== sw.group) continue;
      o.on = sw.on;
      o.it.label = o.on ? 'Lights off' : 'Lights on';
      this.ints.setIndicator(o.it, o.on ? '#ffe08a' : '#3a3f45');
    }
    reg.setGroup(sw.group, sw.on);
    this.followBoards();
    this.g.events.emit('lightSwitch', { on: sw.on });
    if (!sw.on) {
      // the room going dark is noticed; someone comes to look at the switch
      this.em.lightsOut(sw.it.pos.x, sw.it.pos.z, sw.it.pos.y + 2.5, -1, sw.group);
    }
  }

  /** (guard-ai S15, A42) The switches as the guards use them (`EnemyManager.breakers`). (LR16-4) The breaker boards too:
   *  a cut board with no running window is where a guard turns its circuits back on (`IsolatorBoards.switchBack`); a
   *  running timed window is the player's, never a fault. No allocation. */
  private readonly breakerHost: BreakerHost = {
    switchOf: (group, x, z, out) => {
      const bi = this.boards ? this.boards.cutBoard(group, x, z) : -1;
      if (bi >= 0) {
        const bp = this.boards!.defs[bi]!.pos;
        out[0] = bp.x;
        out[1] = bp.y;
        out[2] = bp.z;
        return true;
      }
      const sws = this.switches;
      let best = -1;
      let bd = Infinity;
      for (let i = 0; i < sws.length; i++) {
        const s = sws[i]!;
        if (s.group !== group) continue;
        const d = hyp2(s.it.pos.x - x, s.it.pos.z - z);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      if (best < 0) return false;
      const p = sws[best]!.it.pos;
      out[0] = p.x;
      out[1] = p.y;
      out[2] = p.z;
      return true;
    },
    // off at its switches and dark (a lamp of it lit again by other means, an isolator: no longer a cut). A course
    // mains gate's circuit (cutting it opens the gate) is never a fault a guard puts right (A63): the S2 incident
    isOff: (group) => {
      if (this.mainsGroups.has(group)) return false;
      const b = this.boards;
      // (LR16-4) a running timed window holds it: the player's, the guards leave it to the timer
      if (b?.holding(group)) return false;
      if (groupBaseOn(this.g.world.level.lights, group)) return false;
      const sws = this.switches;
      for (let i = 0; i < sws.length; i++) {
        const s = sws[i]!;
        if (s.group === group) return !s.on;
      }
      return b !== null && b.cutBoard(group, 0, 0) >= 0;
    },
    reset: (group) => {
      if (this.mainsGroups.has(group)) return false;
      const b = this.boards;
      if (b?.holding(group)) return false;
      // (LR16-4) a cut breaker board first: every circuit of it back (its wall switches follow, `boardChanged`)
      const bi = b ? b.cutBoard(group, 0, 0) : -1;
      if (bi >= 0) return b!.switchBack(bi);
      return this.resetCircuit(group);
    },
  };
  /** (guard-ai S15, A63) The circuits a course mains gate reads (`MapLayout.course`): cutting one opens the gate, so no
   *  guard turns it back on (that would shut the gate on the players). */
  private readonly mainsGroups = new Set<number>();

  /**
   * (guard-ai S15, A42) A guard worked the switch: circuit `group` back on through the player's own toggle, so the lamps,
   * the light field and meter, the switch labels and the co-op light sync (Sector Ops `lamps`, Course `lights.groups`:
   * both read the registry) all follow. Turning on wakes nobody. False when no switch of it was off.
   */
  resetCircuit(group: number): boolean {
    const sws = this.switches;
    for (let i = 0; i < sws.length; i++) {
      const s = sws[i]!;
      if (s.group !== group || s.on) continue;
      this.toggle(s, this.g.world.level.lights);
      return true;
    }
    return false;
  }

  /**
   * (sector-redesign G22) After the lights were put back (a section restart): each switch reads its circuit again (on
   * while any unbroken light of its group is on by its switches) and its label and indicator follow. No guard reacts.
   */
  syncSwitches(): void {
    const reg = this.g.world.level.lights;
    for (const sw of this.switches) {
      let on = false;
      let live = 0;
      for (const l of reg.lights) {
        if (l.group !== sw.group || l.destroyed) continue;
        live++;
        if (reg.baseOn(l)) on = true;
      }
      // every lamp of the circuit shot out: the switch keeps its place
      if (live === 0 || on === sw.on) continue;
      sw.on = on;
      sw.it.label = on ? 'Lights off' : 'Lights on';
      this.ints.setIndicator(sw.it, on ? '#ffe08a' : '#3a3f45');
    }
    this.followBoards();
  }

  /** (E4) A board cut or put back its circuits: the wall switches on them and the board's item follow, the click. */
  private boardChanged(i: number, on: boolean): void {
    const gs = this.boards!.defs[i]!.groups;
    for (let k = 0; k < gs.length; k++) this.syncGroup(gs[k]!, on);
    this.followBoards();
    this.g.events.emit('lightSwitch', { on });
  }

  /** (E4) Board `i`'s label, use and indicator from its state: off-use while its window runs (indicator dark). */
  private showBoard(i: number): void {
    const b = this.boards;
    const it = this.boardIts[i];
    if (!b || !it) return;
    const running = b.left[i]! > 0;
    const cut = b.cut[i] === 1;
    it.label = running ? 'Circuit isolated' : b.timed(i) ? (cut ? 'Power on' : 'Isolate circuit') : cut ? 'Breaker on' : 'Breaker off';
    this.ints.setEnabled(it, !running);
    if (!running) this.ints.setIndicator(it, cut ? '#3a3f45' : '#ffe08a');
  }

  /** (E4) Idle boards read their circuits again (a wall switch moved one, a restart put the lamps back). */
  private followBoards(): void {
    const b = this.boards;
    if (!b) return;
    b.follow();
    for (let i = 0; i < this.boardIts.length; i++) this.showBoard(i);
  }

  /** A hitscan ray: shoot out the first bulb along it. */
  shotRay(from: Vector3, to: Vector3): void {
    const reg = this.g.world.level.lights;
    const id = lightOnRay(reg, from.x, from.y, from.z, to.x, to.y, to.z);
    if (id < 0) return;
    // (polish2) a hit only through the mount reach needs a clear static line up from the landing to the head (a round
    // on a door soffit never breaks the wall lamp over the door's far face); the co-op client and host test the same
    const a = this.reachA;
    const h = lampReachProbe(reg, id, from.x, from.y, from.z, to.x, to.y, to.z, a);
    if (h > 0 && !this.g.ballistics.clear(a, this.reachB.set(a.x, a.y + h, a.z), G.STATIC)) return;
    this.shootLight(id);
  }

  /** Shoot out light `id` (the host's own round, or a co-op client's checked lamp shot, sector-redesign slice L):
   *  sparks, the shot noise and a guard sent to look. False when it cannot be (none, already out, not destructible). */
  shootLight(id: number): boolean {
    const reg = this.g.world.level.lights;
    if (id < 0 || !reg.destroy(id)) return false;
    const l = reg.lights[id]!;
    this.lightsShot++;
    const at = new Vector3(l.x, l.y, l.z);
    this.g.vfx.sparks(at, Vector3.Down(), 10, '#fff1c8');
    this.g.events.emit('lightOut', { x: l.x, y: l.y, z: l.z, shot: true });
    // (guard-ai S2) the light first: the bulb's pop (and the round's impact after this) merge into its incident
    this.em.lightsOut(l.x, l.z, l.y, id);
    this.noise(SHOT_LIGHT_NOISE, at);
    return true;
  }

  /**
   * (Sector Ops) Only the panels of section `live` work (-1: none); panels without a section always do. Every panel
   * comes back working and usable (a section load or restart: a panel the player disabled is armed again).
   */
  setLiveAlarms(live: number): void {
    for (const q of this.panels) {
      const off = q.panel.section !== undefined && q.panel.section !== live;
      q.panel.disabled = off;
      q.it.done = false;
      q.it.progress = 0;
      this.ints.setEnabled(q.it, !off);
    }
  }

  /**
   * (sector-restart, M9) A checkpoint restart: nothing the old guards or the player left behind draws the new guards.
   * Doors the player opened are no longer "noticed" (a fresh guard does not come to look at them), the guard-opened door
   * clock is dropped, and a carried body is let go of (the restart has removed it). The panels are re-armed by
   * `setLiveAlarms` (the section load).
   */
  resetForRestart(): void {
    this.playerOpened.clear();
    this.guardOpened.clear();
    this.noticeT = 0;
    // (E4, A50) running isolator windows are dropped; the lamps come back from the section's start state, then
    // `syncSwitches` has the boards read them
    this.boards?.cancel();
    this.carrier.reset();
  }

  /** The alarm went off (a panel `p`, or (guard-ai S6) a command call by radio, `p` null; `e` raised it): banner, horn,
   *  reinforcements at the map's entry points. */
  private onAlarm(e: Enemy, p: AlarmPanel | null): void {
    const g = this.g;
    const em = this.em;
    g.hud.banner('ALARM', 'Reinforcements inbound', 2200);
    g.events.emit('alarm', {});
    g.style.record('alarm', true);
    if (p) for (const q of this.panels) if (q.panel === p) this.ints.setIndicator(q.it, '#ff3b30');
    const pts = g.world.layout.reinforce ?? [];
    const px = g.player.position.x;
    const pz = g.player.position.z;
    let at: Vector3 | null = null;
    let bd = -1;
    // the entry furthest from the player (they come in, not spawn on top of them)
    for (const q of pts) {
      const d = hyp2(q.x - px, q.z - pz);
      if (d > bd) {
        bd = d;
        at = q;
      }
    }
    // Hunter: the mode doubles the hostiles itself; Sector Ops raises its stage and sends its section's guards
    // (guard-ai S6: a live mode's alarm reaches it with no map reinforce points too; the parked ones as before)
    if (at || em.coordinated) {
      if (g.mode?.onAlarm?.(at ?? g.player.position.clone())) return;
    }
    const kinds: EnemyKind[] = ['grunt', 'grunt', 'heavy'];
    if (!em.coordinated) {
      if (!at) return;
      for (let i = 0; i < ALARM.squad; i++) {
        const r = em.reinforce(kinds[i % kinds.length]!, at.add(new Vector3(i * 1.3 - 1.3, 0, 0)), 1)[0];
        if (r) g.mode?.onEnemyJoined?.(r);
      }
      return;
    }
    // (guard-ai S6, design 7, M1) aggressive reinforcements at the alarm section's entry furthest from the player
    // (`MapLayout.guardAi.entries`, running its route in), else at the map's reinforce point
    const ents = em.entriesFor(e.section, this.entryScratch);
    let ent: ReinforceEntry | null = null;
    bd = -1;
    for (const q of ents) {
      const d = hyp2(q.at[0] - px, q.at[1] - pz);
      if (d > bd) {
        bd = d;
        ent = q;
      }
    }
    if (!ent && !at) return;
    const base = ent ? new Vector3(ent.at[0], ent.y ?? Number.NaN, ent.at[1]) : at!;
    const yaw = ent?.yaw ?? 0;
    // (guard-ai S13, items 3 and 11, A38) a response team in place of grunt, grunt, heavy (no heavies in the co-op
    // missions, G155): armed guards (`RESPONSE.liveTeam`); the one alarm is stage 1 (no stage gear). It sweeps the
    // section's guard routes and posts after its search. (guard-rules S1, A14, Marlow Build) no shield lead: Marlow
    // Yard's team is armed guards only, as the campaign's (M2). Undo: drop the `false`.
    const n = responseTeam(1, RESPONSE.liveTeam, this.teamKinds, false);
    em.sweepSource(e.section, this.teamRoutes, this.teamPosts);
    const team = em.newTeam(e.section, null, this.teamRoutes.slice(), this.teamPosts.slice());
    for (let i = 0; i < n; i++) {
      const r = em.spawnReinforcement(this.teamKinds[i]!, base.add(new Vector3(i * 1.3 - 1.3, 0, 0)), yaw, e.section, ent?.route ?? null);
      if (!r) continue;
      em.joinTeam(r, team);
      g.mode?.onEnemyJoined?.(r);
    }
  }

  /** (guard-ai S13) Scratch for the response team's kinds and sweep source. */
  private readonly teamKinds: EnemyKind[] = [];
  private readonly teamRoutes: (readonly (readonly [number, number])[])[] = [];
  private readonly teamPosts: (readonly [number, number])[] = [];

  /** (guard-ai S6) Scratch for the alarm section's entries. */
  private readonly entryScratch: ReinforceEntry[] = [];

  /**
   * (F1b, door-4, G41) A calm guard within range, facing a door the player opened (open past the shut threshold), with
   * a clear line to it, notices: he hears it as a noise at the door (suspicion, he comes to look) and the door joins
   * the ones guards shut behind a calm patrol.
   */
  private noticeOpenDoors(dt: number): void {
    this.noticeT -= dt;
    if (this.noticeT > 0) return;
    this.noticeT = DOOR_NOTICE_EVERY;
    const doors = this.g.world.doors.list;
    for (const i of this.playerOpened) {
      const d = doors[i];
      if (!d || d.target === 0 || d.open <= DOOR.driveShut) {
        if (!d || d.target === 0) this.playerOpened.delete(i);
        continue;
      }
      for (const e of this.em.enemies) {
        if (!e.alive || e.alerted) continue;
        const dx = d.cx - e.pos.x;
        const dz = d.cz - e.pos.z;
        const dist = hyp2(dx, dz);
        if (dist > DOOR_NOTICE_RANGE || Math.abs(d.anchor.hinge.y - e.pos.y) > 1.5) continue;
        if (dist > 0.5 && (Math.sin(e.yaw) * dx + Math.cos(e.yaw) * dz) / dist < DOOR_NOTICE_COS) continue;
        this.noticeA.set(e.pos.x, e.pos.y + 1.6, e.pos.z);
        this.noticeB.set(d.cx, d.anchor.hinge.y + 1.2, d.cz);
        if (!this.g.ballistics.clear(this.noticeA, this.noticeB, MASK.SIGHT)) continue;
        e.hear(d.cx, d.cz, DOOR_NOTICE_RANGE + 2);
        this.guardOpened.set(i, 0);
        this.playerOpened.delete(i);
        break;
      }
    }
  }

  /** Someone (the player, a co-op partner or an enemy) stands within `r` of (x, z). */
  private occupied(x: number, z: number, r: number): boolean {
    const p = this.g.player.position;
    return spotOccupied(x, z, r, p.x, p.z, this.g.remotePlayers(), this.em.enemies);
  }

  /** Fixed step: body interact positions, carry movement rules, doors. Call after the corner controller. `crouchPressed`
   *  (G7) lets go of a body still being reached for. */
  fixedUpdate(crouchPressed = false): void {
    // (E4) timed isolator windows (allocation-free; a window's end relights through the sink)
    this.boards?.update(1 / 60);
    for (const { d, it } of this.doorIts) {
      it.label = d.target === 0 ? 'Open door' : 'Close door';
      // (S-e2e-fix3b, ENGINE-ANSWERS Q9) a lock only stops a door opening: a door left open when it relocks can still be
      // shut by hand (the A8 grille after its 25 s window); shut and locked, its item goes off
      const use = !d.anchor.locked || d.target !== 0;
      if (it.enabled !== use) this.ints.setEnabled(it, use);
    }
    if (this.playerOpened.size) this.noticeOpenDoors(1 / 60);
    // (A3, G97) running into a door does nothing special: bashing is the door menu's (CT)
    // (A3, G41) a door a guard opened is shut behind him on a calm patrol, once he is clear of it
    if (this.guardOpened.size && !this.em.anyAlerted) {
      for (const [i, t] of this.guardOpened) {
        const d = this.g.world.doors.list[i];
        if (!d || d.target === 0) {
          this.guardOpened.delete(i);
          continue;
        }
        if (this.occupied(d.cx, d.cz, 2.2)) {
          this.guardOpened.set(i, 0);
          continue;
        }
        this.guardOpened.set(i, t + 1 / 60);
        if (t > DOOR_GUARD_CLOSE && this.g.world.doors.close(d, (x, z, r) => this.occupied(x, z, r))) this.guardOpened.delete(i);
      }
    }
    for (const [b, it] of this.bodyIts) {
      it.pos.copyFrom(b.pos);
      // (G7) the body being reached for is not offered again
      const show = b.present && b !== this.carry;
      if (it.enabled !== show) this.ints.setEnabled(it, show);
    }
    this.carrier.fixedUpdate(crouchPressed);
  }

  /** Render frame (before the player animates): the carry's hands and the carried rig (`BodyCarry`). */
  frameUpdate(): void {
    this.carrier.frameUpdate();
  }

  /**
   * (marlow-final N2) A course isolator switched circuit `group` off (or back on) from its cabinet at (x, z): the
   * registry and the circuit's wall switches follow, and going dark is the lights-out lure at the cabinet (the nearest
   * calm guard comes to look, as for a wall switch).
   */
  isolate(group: number, on: boolean, x: number, z: number): void {
    this.g.world.level.lights.setGroup(group, on);
    this.syncGroup(group, on);
    this.g.events.emit('lightSwitch', { on });
    // (S-e2e-fix3b) the circuit's group, as a wall switch passes it (guard-ai's coordinated lights-out): a guard who sees
    // one of its lamps go out (or stands in a room it lights) is a witness; without it only the cabinet point was tested
    if (!on) this.em.lightsOut(x, z, Number.NaN, -1, group);
  }

  /** Set every switch on a circuit to the registry's state (label and indicator too); no event, no noise. */
  syncGroup(group: number, on: boolean): void {
    for (const o of this.switches) {
      if (o.group !== group || o.on === on) continue;
      o.on = on;
      o.it.label = on ? 'Lights off' : 'Lights on';
      this.ints.setIndicator(o.it, on ? '#ffe08a' : '#3a3f45');
    }
  }

  /** Lamps on a circuit are on (tests / HUD). */
  switchOn(group: number): boolean {
    return this.switches.find((s) => s.group === group)?.on ?? true;
  }

  dispose(): void {
    this.carrier.dispose();
    this.em.onBodyAdded = this.em.onBodyRemoved = this.em.onBodyFound = null;
    this.em.onRevived = null;
    this.em.onAlarm = null;
    if (this.em.breakers === this.breakerHost) this.em.breakers = null;
  }
}
