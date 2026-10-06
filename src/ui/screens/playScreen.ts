import type { App } from '../../core/app';
import type { GameOptions, ModeId } from '../../game/gameState';
import { DIFFICULTIES, DIFFICULTY, type Difficulty } from '../../ai/archetypes';
import { MAPS } from '../../world/maps';
import { MISSIONS, missionById } from '../../game/missions';
import { applyPreset } from '../../progression/profile';
import { WEAPONS, type WeaponId } from '../../weapons/weaponDefs';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button, choice } from '../widgets';

const MODES: { id: ModeId; label: string; desc: string }[] = [
  { id: 'wave', label: 'Wave Survival', desc: 'Endless waves of guards, dogs, enforcers and heavies. How long can you last?' },
  { id: 'mission', label: 'Mission', desc: 'Hack two terminals, steal the intel, hold the extraction point.' },
  { id: 'clear', label: 'Hunter', desc: 'Clear every hostile in the area, starting undetected. If they raise the alarm, their numbers double.' },
  { id: 'infiltration', label: 'Infiltration', desc: 'Objective missions: uploads, bugs, rescues, sabotage, intel and extraction. Choose your way in.' },
  { id: 'training', label: 'Training', desc: 'Learn each move, one at a time: cover, vaults, ladders, goggles, takedowns, Mark & Execute, gadgets.' },
  { id: 'sandbox', label: 'Free Roam', desc: 'Practice range with every weapon and training targets.' },
];

const STARS = (n: number): string => '\u2605'.repeat(n) + '\u2606'.repeat(3 - n);

/** Mode -> map -> difficulty, then start. */
export class PlayScreen extends Screen {
  private mode: ModeId = 'wave';
  private mapId = MAPS[0]!.id;
  private difficulty: Difficulty = 'normal';
  private missionId = MISSIONS[0]!.id;
  private insertion = MISSIONS[0]!.insertions[0]!.id;
  private desc: HTMLElement;
  private body: HTMLElement;

  constructor(
    private app: App,
    private start: (o: GameOptions) => void,
  ) {
    super('play-screen');
    this.desc = h('div', { class: 'row-note' });
    this.body = h('div', { class: 'rows scrollable' });
    this.el.append(h('div', { class: 'screen-title', text: 'Play' }), this.body);
    this.build();
  }

  private mapsForMode(): typeof MAPS {
    return MAPS.filter((m) => m.modes.includes(this.mode));
  }

  private build(): void {
    if (this.mode === 'infiltration') {
      this.buildMissions();
      return;
    }
    const maps = this.mapsForMode();
    if (!maps.some((m) => m.id === this.mapId)) this.mapId = maps[0]!.id;
    const map = maps.find((m) => m.id === this.mapId)!;
    this.desc.textContent = `${MODES.find((m) => m.id === this.mode)!.desc}  ·  ${map.description}`;
    const modeChoice = choice(
      'Mode',
      MODES.map((m) => ({ value: m.id, label: m.label })),
      () => this.mode,
      (v) => {
        this.mode = v;
        this.rebuild();
      },
    );
    const mapChoice = choice(
      'Map',
      maps.map((m) => ({ value: m.id, label: m.name })),
      () => this.mapId,
      (v) => {
        this.mapId = v;
        this.rebuild();
      },
    );
    const diff = choice(
      'Difficulty',
      DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY[d].label })),
      () => this.difficulty,
      (v) => (this.difficulty = v),
    );
    modeChoice.dataset.autofocus = '';
    if (this.mode === 'sandbox') diff.hidden = true;
    const go = button('Deploy', () => this.start({ map, mode: this.mode, difficulty: this.difficulty, seed: Math.floor(Math.random() * 1e6) }), {
      icon: 'play',
      class: 'primary big',
    });
    this.body.replaceChildren(modeChoice, mapChoice, diff, this.presetChoice(), this.desc, go);
  }

  /** Infiltration: the mission board (best rating and play-style split per mission), insertion, difficulty. */
  private buildMissions(): void {
    const m = missionById(this.missionId) ?? MISSIONS[0]!;
    if (!m.insertions.some((i) => i.id === this.insertion)) this.insertion = m.insertions[0]!.id;
    const rec = this.app.save.get().missions[m.id];
    const modeChoice = choice(
      'Mode',
      MODES.map((x) => ({ value: x.id, label: x.label })),
      () => this.mode,
      (v) => {
        this.mode = v;
        this.rebuild();
      },
    );
    modeChoice.dataset.autofocus = '';
    // the mission board: a card per mission (its map's night sky, the brief, where, best rating)
    const missionChoice = h('div', { class: 'mission-cards scrollable', attrs: { 'data-wrap': '' } });
    for (const x of MISSIONS) {
      const mp = MAPS.find((q) => q.id === x.map)!;
      const card = h(
        'button',
        { class: `mission-card${x.id === m.id ? ' sel' : ''}`, focus: true, onClick: () => {
          this.missionId = x.id;
          this.rebuild();
        } },
        h('span', { class: 'mc-art', style: { background: `linear-gradient(180deg, ${mp.theme.sky} 0%, ${mp.theme.horizon} 70%, ${mp.theme.ground} 100%)` } }),
        h('span', { class: 'mc-name', text: x.name }),
        h('span', { class: 'mc-brief', text: x.brief }),
        h('span', { class: 'mc-loc', text: `${mp.name}  ·  ${STARS(this.app.save.get().missions[x.id]?.rating ?? 0)}` }),
      );
      card.dataset.mission = x.id;
      missionChoice.append(card);
    }
    const insChoice = choice(
      'Insertion',
      m.insertions.map((i) => ({ value: i.id, label: i.name })),
      () => this.insertion,
      (v) => (this.insertion = v),
    );
    const diff = choice(
      'Difficulty',
      DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY[d].label })),
      () => this.difficulty,
      (v) => (this.difficulty = v),
    );
    const map = MAPS.find((x) => x.id === m.map)!;
    const rules = (['noAlarms', 'noKills', 'undetected'] as const)
      .filter((k) => m.rules[k] !== 'off')
      .map((k) => `${k === 'noAlarms' ? 'No alarms' : k === 'noKills' ? 'No kills' : 'Undetected'} (${m.rules[k]})`);
    const best = rec ? `Best ${STARS(rec.rating)}  ·  Ghost ${rec.ghost} / Panther ${rec.panther} / Assault ${rec.assault}  ·  ${rec.wins}/${rec.plays} won` : 'Not played yet';
    this.desc.textContent = `Objectives: ${m.objectives.map((o) => o.label).join(', ')}${rules.length ? '  ·  Rules: ' + rules.join(', ') : ''}  ·  ${best}`;
    const go = button('Deploy', () => this.start({ map, mode: 'infiltration', difficulty: this.difficulty, seed: 1, missionId: m.id, insertion: this.insertion }), {
      icon: 'play',
      class: 'primary big',
    });
    this.body.replaceChildren(modeChoice, missionChoice, insChoice, diff, this.presetChoice(), this.desc, go);
  }

  /** The loadout preset to deploy with (weapons and starting gadget; edited in HQ). */
  private presetChoice(): HTMLElement {
    const sv = this.app.save.get();
    return choice(
      'Loadout',
      sv.presets.map((p, i) => ({ value: i, label: `${p.name}: ${WEAPONS[p.primary as WeaponId]?.name ?? p.primary}` })),
      () => this.app.save.get().preset,
      (i) => this.app.save.update((d) => applyPreset(d, i)),
    );
  }

  private rebuild(): void {
    const f = this.app.nav.focused as HTMLElement | null;
    const mission = f?.dataset.mission;
    const idx = Array.from(this.body.children).indexOf(f as HTMLElement);
    this.build();
    // a mission card keeps the focus on the card picked
    const el = mission ? this.body.querySelector<HTMLElement>(`[data-mission="${mission}"]`) : (this.body.children[Math.max(0, idx)] as HTMLElement | undefined);
    this.app.nav.setRoot(this.el, el ?? null);
  }

  override hints(): Hint[] {
    return [
      { btn: 'A', label: 'Select' },
      { btn: 'B', label: 'Back' },
    ];
  }
}
