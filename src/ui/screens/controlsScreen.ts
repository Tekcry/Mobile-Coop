import type { App } from '../../core/app';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { TabView } from '../widgets';
import { bindLabels, type KeyBinds } from '../../input/keyBindings';

type Row = [string, string];

/** Bindings per input type (kept in step with `gamepadMapping` and `TOUCH_DEFS`; keyboard rows come from the bindings). */
export const CONTROLS: Record<'pad' | 'kbm' | 'touch', { label: string; rows: Row[] }> = {
  pad: {
    label: 'Controller',
    rows: [
      ['Left stick', 'Move (push further: faster, up to the speed gear)'],
      ['Right stick', 'Look'],
      ['LT / RT', 'Aim / fire'],
      ['A', 'Take / leave cover, cover-to-cover, corner'],
      ['B', 'Crouch (stand / crouch in high cover); at speed (gear 5-6): forward roll; hold on a lip: lower in'],
      ['Y', 'Traverse, use, takedown (tap: knock out, hold: lethal); Execute when ready; nothing on offer: jump (grabs what is in reach; twice between two walls: split)'],
      ['X', 'Reload (tap), next weapon (hold)'],
      ['RB', 'Mark (while aiming); next weapon'],
      ['LB', 'Previous weapon'],
      ['L3', 'Sprint'],
      ['R3', 'Swap shoulder'],
      ['D-pad up / down', 'Speed gear up / down (6 gears)'],
      ['D-pad right', 'Gadget (hold to aim, release to throw)'],
      ['D-pad left', 'Tap: ping (co-op: marks a spot or a guard); hold: gadget wheel'],
      ['View', 'Tap: goggles (night vision / sonar); hold: emote'],
      ['Menu', 'Pause'],
    ],
  },
  kbm: { label: 'Keyboard & mouse', rows: [] },
  touch: {
    label: 'Touch',
    rows: [
      ['Left half', 'Move stick (floating)'],
      ['Camera stick', 'Look (never fires)'],
      ['Fire / Aim', 'Fire, aim down sights'],
      ['Action button', 'Does what the world prompts show: take cover, vault, climb, grab, cover-to-cover, corner, use; moving at an obstacle goes over it, still takes cover'],
      ['Jump', 'Grabs ledges, pipes and ladders in reach; double tap between two tall walls: split jump'],
      ['Takedown button', 'When one is on offer: tap knocks out, hold is lethal'],
      ['Mark / Execute', 'Mark appears while aiming; Execute when marks are ready'],
      ['Gadget / wheel', 'Hold to aim a gadget, release to throw; the wheel picks one'],
      ['Crouch / Sprint', 'Toggles; crouch at speed (gear 5-6): forward roll'],
      ['Speed rocker', 'Speed gear up / down; the pips show the gear'],
      ['Goggles', 'Night vision / sonar'],
      ['Ping', 'Co-op: marks what the camera looks at for the team'],
      ['Settings > Touch', 'Layout editor: presets, size, opacity'],
    ],
  },
};

/** Keyboard rows from the player's bindings (Settings > Mouse & Keyboard). */
export function kbmRows(k: KeyBinds): Row[] {
  const b = (id: Parameters<typeof bindLabels>[1]): string => bindLabels(k, id);
  return [
    [`${b('forward')} ${b('left')} ${b('back')} ${b('right')}`, 'Move'],
    ['Mouse', 'Look (click to capture)'],
    ['Right / left button', 'Aim / fire'],
    [b('cover'), 'Take / leave cover, cover-to-cover'],
    [b('crouch'), 'Crouch (at speed: forward roll)'],
    [b('traverse'), 'Traverse, use, takedown (hold: lethal); nothing on offer: jump (twice between walls: split)'],
    [b('use'), 'Use'],
    [b('sprint'), 'Sprint'],
    [`Wheel, ${b('speedUp')} / ${b('speedDown')}`, 'Speed gear up / down'],
    [b('reload'), 'Reload'],
    [`${b('prevWeapon')} / ${b('nextWeapon')}`, 'Previous / next weapon'],
    [`${b('mark')} / ${b('execute')}`, 'Mark / Execute'],
    [b('gadget'), 'Gadget (hold to aim)'],
    [`${b('wheel')}, 1-8`, 'Gadget wheel, pick a gadget'],
    [b('goggles'), 'Goggles'],
    [b('shoulder'), 'Swap shoulder'],
    [`${b('emote1')} ${b('emote2')} ${b('emote3')}`, 'Emotes'],
    [b('ping'), 'Ping (co-op)'],
    [`Esc / ${b('pause')}`, 'Pause'],
  ];
}

/** Every binding, per input type (Settings > Accessibility > Controls, and the pause menu's settings). */
export class ControlsScreen extends Screen {
  override readonly showBack = true;
  private tabs: TabView;

  constructor(private app: App) {
    super('controls-screen');
    const all: ('pad' | 'kbm' | 'touch')[] = app.input.mode === 'touch' ? ['touch', 'pad', 'kbm'] : app.input.mode === 'kbm' ? ['kbm', 'pad', 'touch'] : ['pad', 'kbm', 'touch'];
    const desktop = app.platform.platform === 'desktop';
    const order = all.filter((k) => (k === 'touch' ? !desktop || app.platform.touch : true));
    this.tabs = new TabView(
      order.map((k) => ({
        id: k,
        label: CONTROLS[k].label,
        build: () => h('div', { class: 'controls-list' }, ...(k === 'kbm' ? kbmRows(app.settings.get().keys) : CONTROLS[k].rows).map(([a, b]) => h('div', { class: 'controls-row', focus: true }, h('b', { text: a }), h('span', { text: b })))),
      })),
    );
    this.tabs.onChange = () => app.nav.refresh();
    this.el.append(h('div', { class: 'screen-title', text: 'Controls' }), this.tabs.el);
  }

  override initialFocus(): HTMLElement | null {
    return this.el.querySelector<HTMLElement>('.tab-panel.active [data-focus]');
  }

  override onTab(dir: -1 | 1): void {
    this.tabs.cycle(dir);
    this.app.nav.setRoot(this.el, this.initialFocus());
  }

  override hints(): Hint[] {
    return [
      { btn: 'LB/RB', label: 'Input type' },
      { btn: 'B', label: 'Back' },
    ];
  }
}
