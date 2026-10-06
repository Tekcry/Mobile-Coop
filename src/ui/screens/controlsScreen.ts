import type { App } from '../../core/app';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { TabView } from '../widgets';

type Row = [string, string];

/** Bindings per input type (kept in step with `gamepadMapping`, `keyboardMouse` and `TOUCH_DEFS`). */
export const CONTROLS: Record<'pad' | 'kbm' | 'touch', { label: string; rows: Row[] }> = {
  pad: {
    label: 'Controller',
    rows: [
      ['Left stick', 'Move (push further: faster)'],
      ['Right stick', 'Look'],
      ['LT / RT', 'Aim / fire'],
      ['A', 'Take / leave cover, cover-to-cover, corner'],
      ['B', 'Crouch (stand / crouch in high cover); hold on a lip: lower in'],
      ['Y', 'Traverse, use, takedown (tap: knock out, hold: lethal); Execute when ready'],
      ['X', 'Reload (tap), next weapon (hold)'],
      ['RB', 'Mark (while aiming); next weapon'],
      ['LB', 'Previous weapon'],
      ['L3', 'Sprint'],
      ['R3', 'Swap shoulder'],
      ['D-pad up', 'Gadget (hold to aim, release to throw)'],
      ['D-pad down', 'Gadget wheel (hold)'],
      ['D-pad left / right', 'Emotes'],
      ['View', 'Goggles: night vision / sonar'],
      ['Menu', 'Pause'],
    ],
  },
  kbm: {
    label: 'Keyboard & mouse',
    rows: [
      ['W A S D', 'Move'],
      ['Mouse', 'Look (click to capture)'],
      ['Right / left button', 'Aim / fire'],
      ['Space', 'Take / leave cover, cover-to-cover'],
      ['C / Ctrl', 'Crouch'],
      ['E', 'Traverse, use, takedown (hold: lethal)'],
      ['F', 'Use'],
      ['Shift', 'Sprint'],
      ['R', 'Reload'],
      ['Q / X, wheel', 'Previous / next weapon'],
      ['T / Y', 'Mark / Execute'],
      ['G', 'Gadget (hold to aim)'],
      ['Tab, 1-8', 'Gadget wheel, pick a gadget'],
      ['N', 'Goggles'],
      ['V', 'Swap shoulder'],
      ['J K L', 'Emotes'],
      ['Esc / P', 'Pause'],
    ],
  },
  touch: {
    label: 'Touch',
    rows: [
      ['Left half', 'Move stick (floating)'],
      ['Camera stick', 'Look (never fires)'],
      ['Fire / Aim', 'Fire, aim down sights'],
      ['World prompts', 'Tap: take cover, vault, climb, cover-to-cover, corner, takedown'],
      ['Takedown button', 'When one is on offer: tap knocks out, hold is lethal'],
      ['Mark / Execute', 'Mark appears while aiming; Execute when marks are ready'],
      ['Use button', 'Only when something is in reach'],
      ['Gadget / wheel', 'Hold to aim a gadget, release to throw; the wheel picks one'],
      ['Crouch / Sprint', 'Toggles'],
      ['Goggles', 'Night vision / sonar'],
      ['Settings > Touch', 'Layout editor: presets, size, opacity'],
    ],
  },
};

/** Every binding, per input type (Settings > Accessibility > Controls, and the pause menu's settings). */
export class ControlsScreen extends Screen {
  override readonly showBack = true;
  private tabs: TabView;

  constructor(private app: App) {
    super('controls-screen');
    const order: ('pad' | 'kbm' | 'touch')[] = app.input.mode === 'touch' ? ['touch', 'pad', 'kbm'] : app.input.mode === 'kbm' ? ['kbm', 'pad', 'touch'] : ['pad', 'kbm', 'touch'];
    this.tabs = new TabView(
      order.map((k) => ({
        id: k,
        label: CONTROLS[k].label,
        build: () => h('div', { class: 'controls-list' }, ...CONTROLS[k].rows.map(([a, b]) => h('div', { class: 'controls-row', focus: true }, h('b', { text: a }), h('span', { text: b })))),
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
