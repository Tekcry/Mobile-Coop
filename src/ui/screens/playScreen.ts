import type { App } from '../../core/app';
import type { GameOptions, ModeId } from '../../game/gameState';
import type { Difficulty } from '../../ai/enemyDefs';
import { MAPS } from '../../world/maps';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button, choice } from '../widgets';

const MODES: { id: ModeId; label: string; desc: string }[] = [
  { id: 'wave', label: 'Wave Survival', desc: 'Endless waves of grunts, runners and heavies. How long can you last?' },
  { id: 'mission', label: 'Mission', desc: 'Hack two terminals, steal the intel, hold the extraction point.' },
  { id: 'sandbox', label: 'Free Roam', desc: 'Practice range with every weapon and training targets.' },
];

/** Mode -> map -> difficulty, then start. */
export class PlayScreen extends Screen {
  private mode: ModeId = 'wave';
  private mapId = MAPS[0]!.id;
  private difficulty: Difficulty = 'normal';
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
      [
        { value: 'easy', label: 'Easy' },
        { value: 'normal', label: 'Normal' },
        { value: 'hard', label: 'Hard' },
      ] as { value: Difficulty; label: string }[],
      () => this.difficulty,
      (v) => (this.difficulty = v),
    );
    modeChoice.dataset.autofocus = '';
    if (this.mode === 'sandbox') diff.hidden = true;
    const go = button('Deploy', () => this.start({ map, mode: this.mode, difficulty: this.difficulty, seed: Math.floor(Math.random() * 1e6) }), {
      icon: 'play',
      class: 'primary big',
    });
    this.body.replaceChildren(modeChoice, mapChoice, diff, this.desc, go);
  }

  private rebuild(): void {
    const idx = Array.from(this.body.children).indexOf(this.app.nav.focused as HTMLElement);
    this.build();
    const el = this.body.children[Math.max(0, idx)] as HTMLElement | undefined;
    this.app.nav.setRoot(this.el, el ?? null);
  }

  override hints(): Hint[] {
    return [
      { btn: 'A', label: 'Select' },
      { btn: 'B', label: 'Back' },
    ];
  }
}
