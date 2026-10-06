import { Vector3 } from '../core/babylon';
import type { Body } from '../ai/body';
import { BODY } from '../ai/bodies';
import { ALARM, type AlarmPanel } from '../ai/alarm';
import type { EnemyManager } from '../ai/enemyManager';
import type { EnemyKind } from '../ai/enemyDefs';
import { lightOnRay, type LightRegistry } from '../world/lights';
import type { Interactable, Interactables } from './interactables';
import type { GameState } from './gameState';
import { hyp2 } from '../core/mathx';

/** Noise radii (m): a bulb shot out, a body put down. */
const SHOT_LIGHT_NOISE = 5;
const DROP_NOISE = 3;

/**
 * Stealth fixtures in a match (phase 3b): bodies the player can pick up, carry (slow, weapon stowed, hands on
 * the victim), put down or hide in a container; light switches (a room's lamp circuit) and lights shot out
 * (enemies come to look, with a flashlight in the dark); alarm panels the player can disable before an
 * alerted enemy reaches one (reinforcements). Owned by `GameState` in modes with enemies.
 */
export class StealthSystems {
  /** The body on the player's shoulder. */
  carry: Body | null = null;
  bodiesHidden = 0;
  lightsShot = 0;
  private bodyIts = new Map<Body, Interactable>();
  private switches: { it: Interactable; group: number; on: boolean }[] = [];
  private panels: { panel: AlarmPanel; it: Interactable }[] = [];
  /** The "Drop body" action (not in the world: offered while carrying with no hiding spot near). */
  private dropIt: Interactable;
  private kneeL = new Vector3();
  private kneeR = new Vector3();

  constructor(
    private g: GameState,
    private em: EnemyManager,
    private ints: Interactables,
    private noise: (r: number, at: Vector3) => void,
  ) {
    const layout = g.world.layout;
    const reg = g.world.level.lights;
    layout.switches?.forEach((s, i) => {
      const it = ints.add(`switch-${i}`, 'switch', s.pos, 'Lights off', 0, s.yaw);
      it.reach = 1.3;
      const sw = { it, group: s.group, on: true };
      it.onUse = () => this.toggle(sw, reg);
      ints.setEnabled(it, true);
      this.switches.push(sw);
    });
    layout.alarms?.forEach((a, i) => {
      const panel: AlarmPanel = { id: `alarm-${i}`, x: a.pos.x, y: a.pos.y, z: a.pos.z, yaw: a.yaw, disabled: false };
      em.alarms.push(panel);
      const it = ints.add(panel.id, 'alarm', a.pos, 'Disable alarm', ALARM.disableTime, a.yaw);
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
      it.reach = 1.5;
      it.onUse = () => this.hideCarried();
      ints.setEnabled(it, true);
    });
    // a free-standing item for "Drop body" (never added to the world list)
    this.dropIt = { id: 'drop-body', kind: 'body', pos: new Vector3(), label: 'Drop body', holdTime: 0, enabled: true, done: false, progress: 0, node: null!, parts: [], light: null, onUse: () => this.dropCarried() };
    em.onBodyAdded = (b) => this.addBody(b);
    em.onBodyRemoved = (b) => {
      const it = this.bodyIts.get(b);
      if (it) ints.remove(it);
      this.bodyIts.delete(b);
      if (this.carry === b) this.carry = null;
    };
    em.onBodyFound = (_e, b) => {
      g.events.emit('bodyFound', { x: b.pos.x, z: b.pos.z });
      g.hud.feedItem('Body found', 'warn');
    };
    em.onRevived = (e) => g.mode?.onEnemyJoined?.(e);
    em.onAlarm = (_e, p) => this.onAlarm(p);
    for (const b of em.bodies) this.addBody(b);
  }

  private addBody(b: Body): void {
    const it = this.ints.add(`body-${b.id}`, 'body', b.pos, 'Pick up body', 0);
    it.reach = BODY.reach;
    it.onUse = () => this.pickUp(b);
    this.ints.setEnabled(it, b.present);
    this.bodyIts.set(b, it);
  }

  get carrying(): boolean {
    return this.carry !== null;
  }

  /** While carrying: the interact target is a hiding spot in reach, else "Drop body". */
  carryTarget(feet: Vector3): Interactable | null {
    if (!this.carry) return null;
    return this.ints.nearest(feet, 1.5, 'hide') ?? this.dropIt;
  }

  private pickUp(b: Body): void {
    if (this.carry || !b.present || this.g.traversal.active || this.g.cover.state !== 'none') return;
    const rig = this.g.player.rig;
    const p = rig.p;
    const chestY = p.y.waist + 0.13 * (rig.height / 1.75);
    b.pickUp(rig.torso, p.shoulderHalf * 0.75, p.y.shoulder - chestY + 0.12);
    this.carry = b;
    const it = this.bodyIts.get(b);
    if (it) this.ints.setEnabled(it, false);
    this.g.player.controller.cancelSprint();
    this.g.events.emit('body', { action: 'pickup' });
  }

  /** Put the body down in front (a short ragdoll drop). */
  dropCarried(): void {
    const b = this.carry;
    if (!b) return;
    const c = this.g.player.controller;
    const s = Math.sin(c.yaw);
    const co = Math.cos(c.yaw);
    const at = new Vector3(c.pos.x + s * 0.7, c.pos.y, c.pos.z + co * 0.7);
    b.drop(new Vector3(s * 25, -8, co * 25), this.em.canRagdoll(), at, c.yaw + Math.PI / 2);
    this.carry = null;
    this.release();
    this.noise(DROP_NOISE, at);
    this.g.events.emit('body', { action: 'drop' });
  }

  /** Into the container in reach: gone for good, never found. */
  private hideCarried(): void {
    const b = this.carry;
    if (!b) return;
    b.hide();
    this.carry = null;
    this.bodiesHidden++;
    this.release();
    this.g.hud.feedItem('Body hidden');
    this.g.events.emit('body', { action: 'hide' });
  }

  private release(): void {
    const rig = this.g.player.rig;
    rig.reachL.w = rig.reachR.w = 0;
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
    this.g.events.emit('lightSwitch', { on: sw.on });
    if (!sw.on) {
      // the room going dark is noticed; someone comes to look at the switch
      this.em.lightsOut(sw.it.pos.x, sw.it.pos.z);
    }
  }

  /** A hitscan ray: shoot out the first bulb along it. */
  shotRay(from: Vector3, to: Vector3): void {
    const reg = this.g.world.level.lights;
    const id = lightOnRay(reg, from.x, from.y, from.z, to.x, to.y, to.z);
    if (id < 0 || !reg.destroy(id)) return;
    const l = reg.lights[id]!;
    this.lightsShot++;
    const at = new Vector3(l.x, l.y, l.z);
    this.g.vfx.sparks(at, Vector3.Down(), 10, '#fff1c8');
    this.g.events.emit('lightOut', { x: l.x, y: l.y, z: l.z, shot: true });
    this.noise(SHOT_LIGHT_NOISE, at);
    this.em.lightsOut(l.x, l.z);
  }

  /** The alarm went off: banner, horn, reinforcements at the map's entry points. */
  private onAlarm(p: AlarmPanel): void {
    const g = this.g;
    g.hud.banner('ALARM', 'Reinforcements inbound', 2200);
    g.events.emit('alarm', {});
    for (const q of this.panels) if (q.panel === p) this.ints.setIndicator(q.it, '#ff3b30');
    const pts = g.world.layout.reinforce ?? [];
    if (!pts.length) return;
    let at = pts[0]!;
    let bd = -1;
    // the entry furthest from the player (they come in, not spawn on top of them)
    for (const q of pts) {
      const d = hyp2(q.x - g.player.position.x, q.z - g.player.position.z);
      if (d > bd) {
        bd = d;
        at = q;
      }
    }
    const kinds: EnemyKind[] = ['grunt', 'grunt', 'heavy'];
    for (let i = 0; i < ALARM.squad; i++) {
      const e = this.em.reinforce(kinds[i % kinds.length]!, at.add(new Vector3(i * 1.3 - 1.3, 0, 0)), 1)[0];
      if (e) g.mode?.onEnemyJoined?.(e);
    }
  }

  /** Fixed step: body interact positions, carry movement rules. Call after the corner controller (speed cap). */
  fixedUpdate(): void {
    for (const [b, it] of this.bodyIts) {
      it.pos.copyFrom(b.pos);
      const show = b.present;
      if (it.enabled !== show) this.ints.setEnabled(it, show);
    }
    if (!this.carry) return;
    const c = this.g.player.controller;
    if (!this.g.player.alive) {
      this.dropCarried();
      return;
    }
    c.cancelSprint();
    c.speedCap = Math.min(c.speedCap, BODY.carrySpeed);
  }

  /** Render frame (before the player animates): the hands hold the victim's legs. */
  frameUpdate(): void {
    const b = this.carry;
    if (!b) return;
    b.knees(this.kneeL, this.kneeR);
    const rig = this.g.player.rig;
    rig.reachR.x = this.kneeR.x;
    rig.reachR.y = this.kneeR.y;
    rig.reachR.z = this.kneeR.z;
    rig.reachR.w = 1;
    rig.reachL.x = this.kneeL.x;
    rig.reachL.y = this.kneeL.y - 0.05;
    rig.reachL.z = this.kneeL.z;
    rig.reachL.w = 0.8;
  }

  /** Lamps on a circuit are on (tests / HUD). */
  switchOn(group: number): boolean {
    return this.switches.find((s) => s.group === group)?.on ?? true;
  }

  dispose(): void {
    this.em.onBodyAdded = this.em.onBodyRemoved = this.em.onBodyFound = null;
    this.em.onRevived = null;
    this.em.onAlarm = null;
  }
}
