import { h } from '../dom';
import { SD_LOW } from '../../weapons/sdRounds';
import { icon } from '../icons';
import { keyLabels, verbPromptHtml } from '../prompts';
import { WorldPrompts } from './worldPrompts';
import { AwarenessArcs } from './awareness';
import { GadgetWheel } from './gadgetWheel';
import { PingView } from './pings';
import { BarkView } from './barks';
import { ContextMenuView } from './contextMenuView';
import { OBJECTIVE_POPUP, ObjectivePopup } from './objectivePopup';

export interface HudFrame {
  hp: number;
  maxHp: number;
  weapon: string;
  mag: number;
  magSize: number;
  reserve: number;
  /** (sd-rounds) Quiet rounds left, -1 = not shown. */
  sd: number;
  /** Selected gadget (icon) and how many are carried. */
  gadget: string;
  grenades: number;
  reloadProgress: number;
  /** Crosshair gap in CSS pixels. */
  spreadPx: number;
  onTarget: boolean;
  ads: boolean;
  /** (step 09) Crosshair shown (drawn and aiming only). */
  crosshair: boolean;
}

/** In-game DOM HUD. Updated per frame with cheap property writes only when values change. */
export class Hud {
  readonly el: HTMLElement;
  private hpFill: HTMLElement;
  private hpText: HTMLElement;
  private wName: HTMLElement;
  private wMag: HTMLElement;
  private wRes: HTMLElement;
  private wSd: HTMLElement;
  /** Gadget wheel and the remote feed overlay. */
  readonly gadgets: GadgetWheel;
  private gCount: HTMLElement;
  private gIcon!: HTMLElement;
  private cross: HTMLElement;
  private hit: HTMLElement;
  private ring: SVGCircleElement;
  private dmgWrap: HTMLElement;
  private objective: HTMLElement;
  /** (G343) When the objective line shows; `objShown` is the `.show` class as set, `objText` the line as written. */
  private readonly popup = new ObjectivePopup();
  private objShown = false;
  private objText = '';
  /** (hud-guidance A7) The co-op connection notice, its own small line under the objective (empty: hidden). */
  private netStatus: HTMLElement;
  /** (mission-rules R6) The objective's hint line (`setObjectiveHint`), made on first use. */
  private objHint: HTMLElement | null = null;
  private modeInfo: HTMLElement;
  private weaponEl!: HTMLElement;
  private roomEl: HTMLElement;
  private bannerEl: HTMLElement;
  private interactEl: HTMLElement;
  /** (G5) The CT context action menu, top right. */
  readonly ctx = new ContextMenuView();
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
  /** Enemy callouts over their heads. */
  readonly barks: BarkView;
  readonly pings: PingView;
  private last: Partial<Record<string, string | number | boolean>> = {};
  private hitTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(parent: HTMLElement) {
    this.hpFill = h('div', { class: 'bar-fill hp' });
    this.hpText = h('div', { class: 'vital-text' });
    this.staminaFill = h('i');
    this.staminaBar = h('div', { class: 'bar stamina' }, this.staminaFill);
    this.exposureEl = h('div', { class: 'tac-exposure', html: '<b>EXPOSED</b><span><i></i><i></i><i></i><i></i><i></i></span>' });
    this.noiseEl = h('div', { class: 'tac-noise', html: `${icon('noise', 14)}<span><i></i><i></i><i></i></span>` });
    this.lightFill = h('i');
    this.lightEl = h('div', { class: 'tac-light', title: 'Light' }, h('b', { text: '◐' }), h('span', {}, this.lightFill));
    this.visionEl = h('div', { class: 'tac-vision' });
    const vitals = h(
      'div',
      { class: 'hud-vitals' },
      h('div', { class: 'bar health' }, this.hpFill),
      h('div', { class: 'vital-row' }, this.hpText),
      this.staminaBar,
      h('div', { class: 'hud-tac' }, this.lightEl, this.visionEl, this.exposureEl, this.noiseEl),
    );
    this.wName = h('div', { class: 'w-name' });
    this.wMag = h('span', { class: 'w-mag' });
    this.wRes = h('span', { class: 'w-res' });
    this.wSd = h('span', { class: 'w-sd' });
    this.gCount = h('span', { class: 'w-gren' });
    this.gIcon = h('span', { class: 'w-gren-icon', html: icon('frag', 16) });
    const weapon = (this.weaponEl = h(
      'div',
      { class: 'hud-weapon' },
      this.wName,
      h('div', { class: 'w-ammo' }, this.wMag, h('span', { class: 'w-sep', text: '/' }), this.wRes),
      h('div', { class: 'w-extra' }, this.wSd, this.gIcon, this.gCount),
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
    this.objective = h('div', { class: 'hud-objective' });
    this.objective.style.setProperty('--obj-fade', `${OBJECTIVE_POPUP.fadeS}s`);
    this.netStatus = h('div', { class: 'hud-net-status', attrs: { role: 'status' } });
    this.modeInfo = h('div', { class: 'hud-mode' });
    this.roomEl = h('div', { class: 'hud-room' });
    this.bannerEl = h('div', { class: 'hud-banner' });
    this.interactEl = h('div', { class: 'hud-interact' });
    this.feed = h('div', { class: 'hud-feed' });
    this.vignette = h('div', { class: 'hud-vignette' });
    this.suppressEl = h('div', { class: 'hud-suppress' });
    this.el = h(
      'div',
      { class: 'hud' },
      this.vignette,
      this.suppressEl,
      vitals,
      h('div', { class: 'hud-top' }, this.roomEl, this.objective, this.netStatus, this.modeInfo),
      weapon,
      h('div', { class: 'hud-center' }, this.arcs.canvas, this.cross, this.hit, svg, this.dmgWrap),
      this.bannerEl,
      this.interactEl,
      this.ctx.el,
      this.feed,
    );
    parent.appendChild(this.el);
    this.barks = new BarkView(this.el);
    this.pings = new PingView(this.el);
    this.world = new WorldPrompts(parent);
    this.gadgets = new GadgetWheel(parent);
  }

  /** Health shown as bars (else only the screen-edge vignette); ammo always on (else it fades when unchanged). */
  private healthBar = true;
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
    this.set('hp', Math.round(hpPct * 200), () => {
      this.hpFill.style.width = `${hpPct * 100}%`;
      this.hpFill.classList.toggle('low', hpPct < 0.3);
      this.hpText.textContent = `${Math.ceil(f.hp)}`;
      // the screen edge reddens with damage: the only health readout without the bars
      this.vignette.style.opacity = String(this.healthBar ? (hpPct < 0.35 ? (0.35 - hpPct) * 2.2 : 0) : hpPct < 0.9 ? Math.min(0.95, Math.pow((0.9 - hpPct) / 0.9, 0.8) * 1.05) : 0);
    });
    this.set('wn', f.weapon, () => (this.wName.textContent = f.weapon));
    this.set('mag', f.mag, () => {
      this.wMag.textContent = String(f.mag);
      this.wMag.classList.toggle('low', f.mag <= Math.max(1, Math.floor(f.magSize * 0.25)));
    });
    this.set('res', f.reserve, () => (this.wRes.textContent = Number.isFinite(f.reserve) ? String(f.reserve) : '∞'));
    this.set('sd', f.sd, () => {
      this.wSd.textContent = f.sd >= 0 ? `SD ${f.sd}` : '';
      this.wSd.style.display = f.sd >= 0 ? '' : 'none';
      this.wSd.classList.toggle('low', f.sd >= 0 && f.sd <= SD_LOW);
    });
    this.set('gr', f.grenades, () => (this.gCount.textContent = `×${f.grenades}`));
    this.set('gi', f.gadget, () => (this.gIcon.innerHTML = icon(f.gadget, 16)));
    const gap = Math.round(Math.min(60, 4 + f.spreadPx));
    this.set('gap', gap, () => this.cross.style.setProperty('--gap', `${gap}px`));
    this.set('ot', f.onTarget, () => this.cross.classList.toggle('on-target', f.onTarget));
    this.set('ads', f.ads, () => this.cross.classList.toggle('ads', f.ads));
    this.set('cx', f.crosshair, () => (this.cross.style.display = f.crosshair ? '' : 'none'));
    // ammo / gadget readout: on any change, a reload or a low magazine; fades after 3 s otherwise
    const now = performance.now();
    const ak = `${f.weapon}|${f.mag}|${f.reserve}|${f.grenades}|${f.gadget}|${f.sd}`;
    if (ak !== this.ammoKey || f.reloadProgress > 0 || f.mag <= Math.max(1, Math.floor(f.magSize * 0.25))) {
      this.ammoKey = ak;
      this.ammoT = now;
    }
    // (G343) the objective popup: the class flips only when the visibility does (the CSS fade runs OBJECTIVE_POPUP.fadeS)
    const vis = this.popup.visible(now / 1000);
    if (vis !== this.objShown) {
      this.objShown = vis;
      this.objective.classList.toggle('show', vis);
    }
    const quiet = !this.ammoAlways && now - this.ammoT > 3000;
    this.set('aq', quiet, () => this.weaponEl.classList.toggle('quiet', quiet));
    const rp = Math.round(f.reloadProgress * 50);
    this.set('rl', rp, () => {
      const c = 2 * Math.PI * 17;
      this.ring.style.strokeDasharray = `${c * f.reloadProgress} ${c}`;
      this.ring.parentElement!.classList.toggle('on', f.reloadProgress > 0);
    });
  }

  hitMarker(kind: 'hit' | 'head' | 'kill' | 'deflect'): void {
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

  /** The current objective line as shown. */
  get objectiveText(): string {
    return this.objective.textContent ?? '';
  }

  /** (G343, BRIEF A4) A real change of the line shows it for `OBJECTIVE_POPUP.holdS` (restarting the hold if it is up;
   *  the fade-in plays only when it was hidden); an empty line hides it. */
  setObjective(text: string): void {
    if (text === this.objText) return;
    this.objText = text;
    this.objective.textContent = text;
    if (text) this.popup.show(performance.now() / 1000);
    else this.popup.hide();
  }

  /** (G343, BRIEF A5) View / Select or O: shows the current line again for `OBJECTIVE_POPUP.holdS`. An empty line
   *  (Marlow Yard, Clear) shows nothing. Returns whether it showed. */
  showObjective(): boolean {
    if (!this.objText) return false;
    this.popup.show(performance.now() / 1000);
    return true;
  }

  /** (hud-guidance A7) The co-op connection notice ("Connecting to host…"), on its own line; '' hides it. */
  setNetStatus(text: string): void {
    if (this.netStatus.textContent !== text) this.netStatus.textContent = text;
  }

  get netStatusText(): string {
    return this.netStatus.textContent ?? '';
  }

  /**
   * (mission-rules R6, HG7) The hint line under the objective (a mission's current step, the hint layer on); null or ''
   * hides it. Made on the first non-empty call, right after the objective line; it shares `hud-objective`, so once
   * hud-guidance B1's popup is in it shows and fades with the objective. Cached: a repeat call writes nothing. (R6
   * polish) Its size is its own, in px as the objective's 13px (`.hud-objective`): about 0.8 of it (an `em` would scale
   * from the parent, not from the objective line).
   */
  setObjectiveHint(text: string | null): void {
    const t = text ?? '';
    if (!this.objHint) {
      if (!t) return;
      this.objHint = h('div', { class: 'hud-objective hud-objective-hint', style: { fontSize: '10.5px', opacity: '0.8' } });
      this.objective.after(this.objHint);
    }
    const el = this.objHint;
    this.set('objHint', t, () => {
      el.textContent = t;
      el.hidden = !t;
    });
  }

  /** Room tag at the top (close-quarters maps); `cleared` marks it as secured. */
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
      this.interactEl.innerHTML = text ? `<i class="hold-ring"></i>${verbPromptHtml('interact', keyLabels.interact)}<span>${text}</span>` : '';
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

  /** Goggles (step 14): a small label for the mode just chosen ('' once it has shown for 1.5 s, or off). */
  setVision(text: string, mode: string): void {
    this.set('vision', text, () => {
      this.visionEl.textContent = text;
      this.visionEl.dataset.mode = mode;
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

  /** (CT prototype B8) The downed player's revive countdown (null hides it). Test hook: `.hud-down-timer`. */
  private downEl: HTMLElement | null = null;
  setDownTimer(text: string | null): void {
    if (!text) {
      if (this.downEl) this.downEl.style.display = 'none';
      return;
    }
    if (!this.downEl) {
      this.downEl = h('div', { class: 'hud-down-timer' });
      this.downEl.style.cssText =
        'position:absolute;left:50%;top:62%;transform:translateX(-50%);padding:6px 14px;background:rgba(0,0,0,.6);color:#ffb0a0;font:600 18px/1.2 sans-serif;letter-spacing:.06em;border-radius:4px;pointer-events:none;';
      this.el.appendChild(this.downEl);
    }
    this.downEl.style.display = '';
    if (this.downEl.textContent !== text) this.downEl.textContent = text;
  }

  /** (marlow-bays R2-R3) A co-op connection line that stays up ("Wren - reconnecting...", "Host disconnected -
   *  waiting (CODE)"); null hides it. Test hook: `.hud-net-notice`. */
  private netEl: HTMLElement | null = null;
  setNetNotice(text: string | null): void {
    if (!text) {
      if (this.netEl) this.netEl.style.display = 'none';
      return;
    }
    if (!this.netEl) {
      this.netEl = h('div', { class: 'hud-net-notice', attrs: { role: 'status' } });
      this.netEl.style.cssText =
        'position:absolute;left:50%;top:14%;transform:translateX(-50%);padding:6px 14px;background:rgba(0,0,0,.6);color:#ffd27a;font:600 17px/1.2 sans-serif;letter-spacing:.05em;border-radius:4px;pointer-events:none;';
      this.el.appendChild(this.netEl);
    }
    this.netEl.style.display = '';
    if (this.netEl.textContent !== text) this.netEl.textContent = text;
  }

  dispose(): void {
    this.el.remove();
    this.world.dispose();
    this.gadgets.dispose();
  }
}
