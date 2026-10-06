import { h } from '../dom';
import { icon } from '../icons';
import { promptHtml } from '../prompts';
import type { Minimap } from './minimap';
import { WorldPrompts } from './worldPrompts';
import { AwarenessArcs } from './awareness';
import { Markers } from './markers';
import { GadgetWheel } from './gadgetWheel';
import { PingView } from './pings';
import { BarkView } from './barks';

export interface HudFrame {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  weapon: string;
  mag: number;
  magSize: number;
  reserve: number;
  /** Selected gadget (icon) and how many are carried. */
  gadget: string;
  grenades: number;
  reloadProgress: number;
  /** Crosshair gap in CSS pixels. */
  spreadPx: number;
  onTarget: boolean;
  ads: boolean;
  /** Camera yaw (radians) for the compass. */
  yaw: number;
  /** Compass markers: world bearing (radians) + label/colour. */
  markers: { bearing: number; kind: 'objective' | 'enemy' }[];
}

const COMPASS_PX_PER_RAD = 120;

/** In-game DOM HUD. Updated per frame with cheap property writes only when values change. */
export class Hud {
  readonly el: HTMLElement;
  private hpFill: HTMLElement;
  private shFill: HTMLElement;
  private hpText: HTMLElement;
  private wName: HTMLElement;
  private wMag: HTMLElement;
  private wRes: HTMLElement;
  /** Gadget wheel and the remote feed overlay. */
  readonly gadgets: GadgetWheel;
  private gCount: HTMLElement;
  private gIcon!: HTMLElement;
  private cross: HTMLElement;
  private hit: HTMLElement;
  private ring: SVGCircleElement;
  private dmgWrap: HTMLElement;
  private compassStrip: HTMLElement;
  private compassMarks: HTMLElement;
  private objective: HTMLElement;
  private modeInfo: HTMLElement;
  private weaponEl!: HTMLElement;
  private roomEl: HTMLElement;
  private bannerEl: HTMLElement;
  private interactEl: HTMLElement;
  /** Cover / vault prompts, the cover badge and the cover-to-cover marker, on the world surfaces. */
  readonly world: WorldPrompts;
  private feed: HTMLElement;
  private vignette: HTMLElement;
  private suppressEl: HTMLElement;
  private staminaFill: HTMLElement;
  private staminaBar: HTMLElement;
  private exposureEl: HTMLElement;
  private noiseEl: HTMLElement;
  private lightEl: HTMLElement;
  private visionEl: HTMLElement;
  private lightFill: HTMLElement;
  /** Enemy awareness arcs round the crosshair. */
  readonly arcs = new AwarenessArcs();
  /** Mark & Execute chevrons. */
  readonly markers: Markers;
  /** Enemy callouts over their heads. */
  readonly barks: BarkView;
  readonly pings: PingView;
  private chargeEl: HTMLElement;
  private last: Partial<Record<string, string | number | boolean>> = {};
  private hitTimer: ReturnType<typeof setTimeout> | null = null;
  readonly minimapSlot: HTMLElement;

  constructor(parent: HTMLElement) {
    this.hpFill = h('div', { class: 'bar-fill hp' });
    this.shFill = h('div', { class: 'bar-fill sh' });
    this.hpText = h('div', { class: 'vital-text' });
    this.staminaFill = h('i');
    this.staminaBar = h('div', { class: 'bar stamina' }, this.staminaFill);
    this.exposureEl = h('div', { class: 'tac-exposure', html: '<b>EXPOSED</b><span><i></i><i></i><i></i><i></i><i></i></span>' });
    this.noiseEl = h('div', { class: 'tac-noise', html: `${icon('noise', 14)}<span><i></i><i></i><i></i></span>` });
    this.lightFill = h('i');
    this.lightEl = h('div', { class: 'tac-light', title: 'Light' }, h('b', { text: '◐' }), h('span', {}, this.lightFill));
    this.visionEl = h('div', { class: 'tac-vision' });
    this.chargeEl = h('div', { class: 'tac-charge', title: 'Execute charge' });
    const vitals = h(
      'div',
      { class: 'hud-vitals' },
      h('div', { class: 'bar shield' }, this.shFill),
      h('div', { class: 'bar health' }, this.hpFill),
      this.hpText,
      this.staminaBar,
      h('div', { class: 'hud-tac' }, this.lightEl, this.chargeEl, this.visionEl, this.exposureEl, this.noiseEl),
    );
    this.wName = h('div', { class: 'w-name' });
    this.wMag = h('span', { class: 'w-mag' });
    this.wRes = h('span', { class: 'w-res' });
    this.gCount = h('span', { class: 'w-gren' });
    this.gIcon = h('span', { class: 'w-gren-icon', html: icon('frag', 16) });
    const weapon = (this.weaponEl = h(
      'div',
      { class: 'hud-weapon' },
      this.wName,
      h('div', { class: 'w-ammo' }, this.wMag, h('span', { class: 'w-sep', text: '/' }), this.wRes),
      h('div', { class: 'w-extra' }, this.gIcon, this.gCount),
    ));
    this.cross = h('div', { class: 'crosshair' }, h('i', { class: 'ch t' }), h('i', { class: 'ch b' }), h('i', { class: 'ch l' }), h('i', { class: 'ch r' }), h('i', { class: 'ch dot' }));
    this.hit = h('div', { class: 'hitmarker' }, h('i'), h('i'), h('i'), h('i'));
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 40 40');
    svg.setAttribute('class', 'reload-ring');
    this.ring = document.createElementNS(ns, 'circle');
    this.ring.setAttribute('cx', '20');
    this.ring.setAttribute('cy', '20');
    this.ring.setAttribute('r', '17');
    svg.appendChild(this.ring);
    this.dmgWrap = h('div', { class: 'dmg-wrap' });
    const ticks: string[] = [];
    const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    for (let rep = -1; rep <= 1; rep++) {
      for (let i = 0; i < 24; i++) {
        const deg = i * 15;
        const x = ((rep * 360 + deg) * Math.PI / 180) * COMPASS_PX_PER_RAD;
        const lbl = deg % 45 === 0 ? labels[deg / 45]! : '';
        ticks.push(`<span class="ctick${lbl ? ' major' : ''}" style="left:${x}px">${lbl || '·'}</span>`);
      }
    }
    this.compassStrip = h('div', { class: 'compass-strip', html: ticks.join('') });
    this.compassMarks = h('div', { class: 'compass-marks' });
    const compass = h('div', { class: 'hud-compass' }, this.compassStrip, this.compassMarks, h('div', { class: 'compass-caret' }));
    this.objective = h('div', { class: 'hud-objective' });
    this.modeInfo = h('div', { class: 'hud-mode' });
    this.roomEl = h('div', { class: 'hud-room' });
    this.bannerEl = h('div', { class: 'hud-banner' });
    this.interactEl = h('div', { class: 'hud-interact' });
    this.feed = h('div', { class: 'hud-feed' });
    this.vignette = h('div', { class: 'hud-vignette' });
    this.suppressEl = h('div', { class: 'hud-suppress' });
    this.minimapSlot = h('div', { class: 'hud-minimap' });
    this.el = h(
      'div',
      { class: 'hud' },
      this.vignette,
      this.suppressEl,
      vitals,
      h('div', { class: 'hud-top' }, compass, this.roomEl, this.objective, this.modeInfo),
      this.minimapSlot,
      weapon,
      h('div', { class: 'hud-center' }, this.arcs.canvas, this.cross, this.hit, svg, this.dmgWrap),
      this.bannerEl,
      this.interactEl,
      this.feed,
    );
    parent.appendChild(this.el);
    this.markers = new Markers(this.el);
    this.barks = new BarkView(this.el);
    this.pings = new PingView(this.el);
    this.world = new WorldPrompts(parent);
    this.gadgets = new GadgetWheel(parent);
  }

  setMinimap(m: Minimap): void {
    this.minimapSlot.replaceChildren(m.canvas);
  }

  /** Health shown as bars (else only the screen-edge vignette); ammo always on (else it fades when unchanged). */
  private healthBar = false;
  private ammoAlways = false;
  private ammoT = 0;
  private ammoKey = '';

  /** Settings > Accessibility: HUD size, health bar, ammo, colour-safe arcs, subtitles. Cheap to call per frame. */
  setAccess(a: { hudScale: number; healthBar: boolean; ammoAlways: boolean; colorSafe: boolean; subtitles: boolean }): void {
    this.set('acc-scale', a.hudScale, () => {
      this.el.style.setProperty('--hud-scale', String(a.hudScale));
      this.world.el.style.setProperty('--hud-scale', String(a.hudScale));
    });
    this.set('acc-hbar', a.healthBar, () => {
      this.healthBar = a.healthBar;
      this.el.classList.toggle('no-hbar', !a.healthBar);
      this.last.hp = -1;
    });
    this.set('acc-ammo', a.ammoAlways, () => {
      this.ammoAlways = a.ammoAlways;
      this.weaponEl.classList.remove('quiet');
    });
    this.arcs.colorSafe = a.colorSafe;
    this.barks.subtitles = a.subtitles;
  }

  setVisible(v: boolean): void {
    this.el.hidden = !v;
    this.world.setVisible(v);
  }

  private set(key: string, v: string | number | boolean, apply: () => void): void {
    if (this.last[key] === v) return;
    this.last[key] = v;
    apply();
  }

  update(f: HudFrame): void {
    const hpPct = Math.max(0, f.hp / f.maxHp);
    const shPct = f.maxShield > 0 ? Math.max(0, f.shield / f.maxShield) : 0;
    this.set('hp', Math.round(hpPct * 200), () => {
      this.hpFill.style.width = `${hpPct * 100}%`;
      this.hpFill.classList.toggle('low', hpPct < 0.3);
      this.hpText.textContent = `${Math.ceil(f.hp)}`;
      // the screen edge reddens with damage: the only health readout without the bars
      this.vignette.style.opacity = String(this.healthBar ? (hpPct < 0.35 ? (0.35 - hpPct) * 2.2 : 0) : hpPct < 0.9 ? Math.min(0.95, Math.pow((0.9 - hpPct) / 0.9, 0.8) * 1.05) : 0);
    });
    this.set('sh', Math.round(shPct * 200), () => (this.shFill.style.width = `${shPct * 100}%`));
    this.set('wn', f.weapon, () => (this.wName.textContent = f.weapon));
    this.set('mag', f.mag, () => {
      this.wMag.textContent = String(f.mag);
      this.wMag.classList.toggle('low', f.mag <= Math.max(1, Math.floor(f.magSize * 0.25)));
    });
    this.set('res', f.reserve, () => (this.wRes.textContent = Number.isFinite(f.reserve) ? String(f.reserve) : '∞'));
    this.set('gr', f.grenades, () => (this.gCount.textContent = `×${f.grenades}`));
    this.set('gi', f.gadget, () => (this.gIcon.innerHTML = icon(f.gadget, 16)));
    const gap = Math.round(Math.min(60, 4 + f.spreadPx));
    this.set('gap', gap, () => this.cross.style.setProperty('--gap', `${gap}px`));
    this.set('ot', f.onTarget, () => this.cross.classList.toggle('on-target', f.onTarget));
    this.set('ads', f.ads, () => this.cross.classList.toggle('ads', f.ads));
    // ammo / gadget readout: on any change, a reload or a low magazine; fades after 3 s otherwise
    const now = performance.now();
    const ak = `${f.weapon}|${f.mag}|${f.reserve}|${f.grenades}|${f.gadget}`;
    if (ak !== this.ammoKey || f.reloadProgress > 0 || f.mag <= Math.max(1, Math.floor(f.magSize * 0.25))) {
      this.ammoKey = ak;
      this.ammoT = now;
    }
    const quiet = !this.ammoAlways && now - this.ammoT > 3000;
    this.set('aq', quiet, () => this.weaponEl.classList.toggle('quiet', quiet));
    const rp = Math.round(f.reloadProgress * 50);
    this.set('rl', rp, () => {
      const c = 2 * Math.PI * 17;
      this.ring.style.strokeDasharray = `${c * f.reloadProgress} ${c}`;
      this.ring.parentElement!.classList.toggle('on', f.reloadProgress > 0);
    });
    const yawPx = Math.round(f.yaw * COMPASS_PX_PER_RAD);
    this.set('yaw', yawPx, () => (this.compassStrip.style.transform = `translateX(${-yawPx}px)`));
    // markers (rebuild only when count changes; positions every frame are cheap transforms)
    if (this.compassMarks.children.length !== f.markers.length) {
      this.compassMarks.replaceChildren(...f.markers.map((m) => h('i', { class: `cmark ${m.kind}` })));
    }
    f.markers.forEach((m, i) => {
      let d = m.bearing - f.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const el = this.compassMarks.children[i] as HTMLElement;
      const x = Math.max(-1.2, Math.min(1.2, d)) * COMPASS_PX_PER_RAD;
      el.style.transform = `translateX(${x}px)`;
      el.classList.toggle('edge', Math.abs(d) > 1.2);
    });
  }

  hitMarker(kind: 'hit' | 'head' | 'kill'): void {
    this.hit.className = `hitmarker show ${kind}`;
    if (this.hitTimer) clearTimeout(this.hitTimer);
    this.hitTimer = setTimeout(() => (this.hit.className = 'hitmarker'), kind === 'kill' ? 320 : 140);
  }

  /** Show a red arc pointing towards a damage source. `relAngle` is source bearing minus camera yaw. */
  damageFrom(relAngle: number): void {
    const arc = h('div', { class: 'dmg-arc' });
    arc.style.transform = `rotate(${relAngle}rad)`;
    this.dmgWrap.appendChild(arc);
    setTimeout(() => arc.remove(), 900);
    while (this.dmgWrap.children.length > 5) this.dmgWrap.firstChild?.remove();
  }

  banner(title: string, sub = '', ms = 2200): void {
    this.bannerEl.innerHTML = `<div class="b-title">${title}</div>${sub ? `<div class="b-sub">${sub}</div>` : ''}`;
    this.bannerEl.classList.remove('show');
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('show');
    setTimeout(() => this.bannerEl.classList.remove('show'), ms);
  }

  setObjective(text: string): void {
    this.set('obj', text, () => (this.objective.textContent = text));
  }

  /** Room tag under the compass (close-quarters maps); `cleared` marks it as secured. */
  setRoom(name: string | null, cleared = false): void {
    const key = name ? `${name}|${cleared}` : '';
    this.set('room', key, () => {
      this.roomEl.textContent = name ?? '';
      this.roomEl.classList.toggle('cleared', cleared);
    });
  }

  setModeInfo(html: string): void {
    this.set('mode', html, () => (this.modeInfo.innerHTML = html));
  }

  /** The use prompt; `progress` 0..1 draws the hold ring round the button glyph (-1 = a tap). */
  setInteract(text: string | null, progress = -1): void {
    this.set('int', text ?? '', () => {
      this.interactEl.innerHTML = text ? `<i class="hold-ring"></i>${promptHtml('Y')}<span>${text}</span>` : '';
      this.interactEl.classList.toggle('show', !!text);
    });
    const p = Math.round(progress * 40);
    this.set('intp', p, () => {
      this.interactEl.classList.toggle('hold', progress >= 0);
      this.interactEl.style.setProperty('--p', `${Math.max(0, progress) * 360}deg`);
    });
  }

  /**
   * Tactical indicators: dash stamina (only while not full), exposure to the nearest threats (hidden
   * with no threats: < 0), footstep noise (0..3 bars) and the suppression vignette.
   */
  setTactical(stamina: number, exposure: number, noiseBars: number, suppression: number): void {
    this.set('stam', Math.round(stamina * 40), () => {
      this.staminaFill.style.width = `${stamina * 100}%`;
      this.staminaBar.classList.toggle('show', stamina < 0.99);
    });
    const ex = exposure < 0 ? -1 : Math.round(exposure * 5);
    this.set('expo', ex, () => {
      this.exposureEl.classList.toggle('show', ex >= 0);
      this.exposureEl.dataset.level = String(Math.max(0, ex));
      this.exposureEl.querySelectorAll('i').forEach((el, i) => el.classList.toggle('on', i < ex));
    });
    this.set('noise', noiseBars, () => {
      this.noiseEl.dataset.level = String(noiseBars);
      this.noiseEl.querySelectorAll('i').forEach((el, i) => el.classList.toggle('on', i < noiseBars));
    });
    this.set('supp', Math.round(suppression * 20), () => (this.suppressEl.style.opacity = String(Math.min(0.85, suppression * 0.9))));
  }

  /** Light meter: how lit the body is (0 dark .. 1); `shadow` marks being hidden in it. */
  setLight(level: number, shadow: boolean): void {
    const v = Math.round(level * 20);
    this.set('light', v, () => (this.lightFill.style.width = `${Math.max(6, level * 100)}%`));
    this.set('lightS', shadow, () => this.lightEl.classList.toggle('shadow', shadow));
  }

  /** Execute charges (a pip per charge) and whether the marks can be executed now. */
  setCharge(charges: number, ready: boolean): void {
    this.set('charge', `${charges}|${ready}`, () => {
      this.chargeEl.textContent = charges > 0 ? '◆'.repeat(charges) : '';
      this.chargeEl.classList.toggle('ready', ready);
    });
  }

  /** Goggles: the mode in use, or the sonar recharging (seconds left). */
  setVision(mode: 'off' | 'night' | 'sonar', cooldown: number): void {
    const text = mode === 'night' ? 'NV' : mode === 'sonar' ? 'SONAR' : cooldown > 0 ? `SONAR ${Math.ceil(cooldown)}` : '';
    this.set('vision', text, () => {
      this.visionEl.textContent = text;
      this.visionEl.dataset.mode = mode === 'off' ? (cooldown > 0 ? 'cool' : 'off') : mode;
    });
  }

  /** Small right-side feed (kills, XP, pickups). */
  feedItem(text: string, kind = ''): void {
    const it = h('div', { class: `feed-item ${kind}`, text });
    this.feed.appendChild(it);
    setTimeout(() => it.classList.add('out'), 2200);
    setTimeout(() => it.remove(), 2600);
    while (this.feed.children.length > 5) this.feed.firstChild?.remove();
  }

  dispose(): void {
    this.el.remove();
    this.world.dispose();
    this.gadgets.dispose();
  }
}
