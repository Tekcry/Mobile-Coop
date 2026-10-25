import type { App } from '../../core/app';
import type { GameOptions } from '../../game/gameState';
import type { Difficulty } from '../../ai/archetypes';
import type { MapDef, WeatherChoice } from '../../world/mapDef';
import { MAPS } from '../../world/maps';
import type { MissionDef } from '../../game/missions';
import { difficultyRows } from '../difficultyRows';
import { h } from '../dom';
import { MenuScreen, type LegendItem } from '../menuScreen';
import { button, choice, describe } from '../widgets';
import { KitScreen } from './kitScreen';

const WEATHER_LABEL: Record<WeatherChoice, string> = { clear: 'Clear', rain: 'Rain', fog: 'Fog' };
export const STARS = (n: number): string => '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));

/** The difficulty last picked in the menus (one of the four fixed levels, G106). */
let lastDifficulty: Difficulty = 'normal';

export type BriefingTarget = { kind: 'mission'; mission: MissionDef } | { kind: 'freeroam'; map: MapDef } | { kind: 'sector'; map: MapDef };

/**
 * menu-ui slice 4 (step 07): the briefing. A mission shows its text, objectives and rules, then Insertion, Difficulty
 * (the four fixed levels, G106), Weather where the map offers it and Start. Free roam reuses it for a map: Weather and
 * Start only. Start keeps `data-key="deploy"` for the suites.
 */
export class BriefingScreen extends MenuScreen {
  private difficulty: Difficulty = lastDifficulty;
  private weather: WeatherChoice = 'clear';
  private insertion: string;
  private map: MapDef;
  private rows: HTMLElement;

  constructor(private app: App, private start: (o: GameOptions) => void, private target: BriefingTarget) {
    super('briefing-screen', target.kind === 'mission' ? ['Mission', 'Briefing'] : target.kind === 'sector' ? ['Sector', 'Ops'] : ['Free', 'Roam']);
    if (target.kind === 'mission') {
      this.map = MAPS.find((m) => m.id === target.mission.map)!;
      this.insertion = target.mission.insertions[0]!.id;
    } else {
      this.map = target.map;
      this.insertion = '';
    }
    this.rows = h('div', { class: 'ms-rows br-rows' });
    this.body.append(this.briefBlock(), this.rows);
    this.build();
  }

  private briefBlock(): HTMLElement {
    const t = this.target;
    if (t.kind === 'freeroam') {
      return h('div', { class: 'br-doc' }, h('h2', { class: 'br-name', text: t.map.name }), h('p', { text: t.map.description }), h('p', { class: 'br-dim', text: 'No guards. Every weapon.' }));
    }
    if (t.kind === 'sector') {
      return h(
        'div',
        { class: 'br-doc' },
        h('h2', { class: 'br-name', text: t.map.name }),
        h('p', { text: 'Clear each section in order: its objective, then through its connector room into the next. Kills are optional. Being spotted raises the alarm and brings more guards. Go down and the section restarts at the last checkpoint.' }),
        h('h4', { text: 'Sections' }),
        h('ul', { class: 'br-obj' }, ...(t.map.sectors ?? []).map((s, i) => h('li', { text: `${i + 1}. ${s.name}: ${s.objective.label}` }))),
        h('p', { class: 'br-dim', text: 'No kills and no alarm: Perfect. No kills and never spotted: Ghost.' }),
      );
    }
    const m = t.mission;
    const rec = this.app.save.get().missions[m.id];
    const rules = (['noAlarms', 'noKills', 'undetected'] as const)
      .filter((k) => m.rules[k] !== 'off')
      .map((k) => `${k === 'noAlarms' ? 'No alarms' : k === 'noKills' ? 'No kills' : 'Undetected'} (${m.rules[k]})`);
    return h(
      'div',
      { class: 'br-doc' },
      h('h2', { class: 'br-name', text: `${m.name}  ·  ${this.map.name}` }),
      h('p', { text: m.brief }),
      h('h4', { text: 'Objectives' }),
      h('ul', { class: 'br-obj' }, ...m.objectives.map((o) => h('li', { text: o.label }))),
      h('p', { class: 'br-dim', text: `${rules.length ? `Rules: ${rules.join(', ')}  ·  ` : ''}${rec ? `Best ${STARS(rec.rating)}  ·  ${rec.wins}/${rec.plays} won` : 'Not played yet'}` }),
    );
  }

  private build(): void {
    const t = this.target;
    const out: HTMLElement[] = [];
    if (t.kind === 'mission') {
      out.push(
        describe(
          choice('Insertion', t.mission.insertions.map((i) => ({ value: i.id, label: i.name })), () => this.insertion, (v) => (this.insertion = v)),
          'Insertion',
          'Where you enter the map. Each way in changes which guards see you first.',
        ),
      );
    }
    if (t.kind !== 'freeroam') {
      for (const r of difficultyRows(() => this.difficulty, (v) => (lastDifficulty = this.difficulty = v))) {
        out.push(describe(r, 'Difficulty', 'Rookie, Normal, Realistic or Perfectionist. Changes guard sight, hearing, aim and reaction.', 'difficulty'));
      }
    }
    const ws = this.map.weathers;
    if (ws?.length) {
      if (!ws.includes(this.weather)) this.weather = ws[0]!;
      out.push(describe(choice('Weather', ws.map((w) => ({ value: w, label: WEATHER_LABEL[w] })), () => this.weather, (v) => (this.weather = v)), 'Weather', 'Visual only. Rain and fog change what you see, not what the guards do.'));
    }
    const go = button(t.kind === 'mission' ? 'Start mission' : 'Start', () => this.go(), { key: 'deploy', autofocus: true, desc: t.kind === 'mission' ? 'Go in with the issued kit.' : 'Enter the map.' });
    out.push(go);
    this.rows.replaceChildren(...out);
  }

  private go(): void {
    const t = this.target;
    const weather = this.map.weathers?.includes(this.weather) ? this.weather : undefined;
    if (t.kind === 'mission') {
      this.start({ map: this.map, mode: 'infiltration', difficulty: this.difficulty, seed: 1, missionId: t.mission.id, insertion: this.insertion, weather });
    } else if (t.kind === 'sector') {
      this.start({ map: this.map, mode: 'sector', difficulty: this.difficulty, seed: 1, weather });
    } else {
      this.start({ map: this.map, mode: 'sandbox', difficulty: this.difficulty, seed: Math.floor(Math.random() * 1e6), weather });
    }
  }

  override legend(): LegendItem[] {
    const l: LegendItem[] = [
      { act: 'back', label: 'Back' },
      { act: 'confirm', label: 'Select' },
    ];
    if (this.target.kind === 'mission') l.push({ act: 'y', label: 'Kit' });
    return l;
  }

  /** Y: the issued kit for this mission (read only). */
  override onAlt(): void {
    if (this.target.kind === 'mission') this.app.screens.push(new KitScreen(this.app, this.target.mission));
  }
}
