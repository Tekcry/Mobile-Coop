import type { App } from '../../core/app';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button, Dialog, TabView } from '../widgets';
import { assignBind, bindable, bindLabels, BINDS, clearBind, keyName, type BindId, type KeyBinds } from '../../input/keyBindings';
import { assignPadBind, clearPadBind, PAD_BINDS, PAD_FIXED, padButtonName, type PadBindId } from '../../input/padBinds';
import { conflictIds, findConflicts, type Conflict } from '../../input/conflicts';

type Row = [string, string];
type Dev = 'pad' | 'kbm';

/** (locomotion step 18) A "press a button / key" capture gives up after this long (ms). */
export const CAPTURE_TIMEOUT_MS = 5000;

const LABELS: Record<Dev, string> = { pad: 'Controller', kbm: 'Keyboard & mouse' };

/** Fixed (not remappable) rows shown above the remappable ones. */
function fixedRows(dev: Dev): Row[] {
  return dev === 'pad'
    ? [
        ['Left stick', 'Move (push further: faster, up to the speed gear)'],
        ['Right stick', 'Look'],
        ['LT / RT', 'Aim / fire (fire while holstered: elbow strike)'],
        ['A / B, d-pad, LB / RB', 'Menus: select / back, move, tabs'],
      ]
    : [
        ['Mouse', 'Look (click to capture)'],
        ['Right / left button', 'Aim / fire (fire while holstered: elbow strike)'],
        ['Wheel', 'Speed gear up / down'],
        ['1-8', 'Pick a gadget'],
        ['Esc', 'Pause, menus back'],
      ];
}

/** Keyboard rows from the player's bindings (read-only summary, kept for callers that list them). */
export function kbmRows(k: KeyBinds): Row[] {
  return [...fixedRows('kbm'), ...BINDS.map((b): Row => [bindLabels(k, b.id), b.label])];
}

/** The conflicts of one device's bindings (the pad's include the fixed trigger verbs). */
export function deviceConflicts(app: App, dev: Dev): Conflict[] {
  const s = app.settings.get();
  return dev === 'pad' ? findConflicts({ ...s.pad, aim: PAD_FIXED.aim, fire: PAD_FIXED.fire }) : findConflicts(s.keys);
}

function rowLabel(dev: Dev, id: string): string {
  if (id === 'aim') return 'Aim';
  if (id === 'fire') return 'Fire';
  return (dev === 'pad' ? PAD_BINDS : BINDS).find((b) => b.id === id)?.label ?? id;
}

/**
 * (locomotion step 18, D7) One device's bindings: fixed rows, a row per verb with two slots (click / A, then press the
 * new button or key; 5 s timeout; Esc cancels, the pad also by holding B 1 s; Backspace / Y clears), conflict warnings
 * on both rows and a summary line (a warning: the bindings still save), and a reset with a confirm.
 */
export function bindPanel(app: App, dev: Dev): HTMLElement {
  const st = app.settings;
  const style = (): Parameters<typeof padButtonName>[1] => app.input.gamepad.style;
  const name = (v: string | number): string => (typeof v === 'number' ? padButtonName(v, style()) : keyName(v));
  const slots: { id: string; slot: 0 | 1; el: HTMLElement }[] = [];
  const rows = new Map<string, { row: HTMLElement; warn: HTMLElement }>();
  const summary = h('div', { class: 'row-note bind-summary' });
  let busy = false;

  const render = (): void => {
    const s = st.get();
    const list = dev === 'pad' ? (s.pad as Record<string, number[]>) : (s.keys as Record<string, string[]>);
    for (const k of slots) {
      const v = list[k.id]?.[k.slot];
      k.el.textContent = v === undefined ? '-' : name(v);
      k.el.classList.toggle('empty', v === undefined);
      k.el.classList.remove('listening');
    }
    const cs = deviceConflicts(app, dev);
    const ids = conflictIds(cs);
    for (const [id, r] of rows) {
      r.row.classList.toggle('conflict', ids.has(id));
      const mine = cs.filter((c) => c.a === id || c.b === id);
      r.warn.textContent = mine.length ? `Also on ${mine.map((c) => rowLabel(dev, c.a === id ? c.b : c.a)).join(', ')}` : '';
    }
    summary.hidden = cs.length === 0;
    summary.textContent = cs.length
      ? `${cs.length === 1 ? '1 conflict' : `${cs.length} conflicts`}: ${cs.map((c) => `${rowLabel(dev, c.a)} and ${rowLabel(dev, c.b)} share ${name(c.input)}`).join('; ')}. Saved anyway; both fire together.`
      : '';
  };

  const after = (id: string, v: string | number): void => {
    const other = deviceConflicts(app, dev).find((c) => (c.a === id || c.b === id) && c.input === v);
    if (other) app.toasts.show(`${name(v)} is also ${rowLabel(dev, other.a === id ? other.b : other.a)}: conflict`, 'warn', 2200);
  };

  const capture = (id: string, slot: 0 | 1, el: HTMLElement): void => {
    if (busy || app.input.kbm.capturing || app.input.gamepad.capturing) return;
    busy = true;
    render();
    el.textContent = dev === 'pad' ? 'Press a button' : 'Press a key';
    el.classList.add('listening');
    let timer = 0;
    const onKey = (e: KeyboardEvent): void => {
      if (e.code !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      app.input.gamepad.cancelCapture();
    };
    const done = (): void => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey, true);
      busy = false;
      render();
    };
    if (dev === 'pad') {
      window.addEventListener('keydown', onKey, true);
      timer = window.setTimeout(() => app.input.gamepad.cancelCapture(), CAPTURE_TIMEOUT_MS);
      app.input.gamepad.captureNext((btn) => {
        if (btn !== null) {
          st.update((d) => void assignPadBind(d.pad, id as PadBindId, slot, btn));
          after(id, btn);
        }
        done();
      });
    } else {
      timer = window.setTimeout(() => app.input.kbm.cancelCapture(), CAPTURE_TIMEOUT_MS);
      app.input.kbm.captureNext((code) => {
        if (code === '') st.update((d) => clearBind(d.keys, id as BindId, slot));
        else if (code !== null) {
          if (!bindable(code)) app.toasts.show(`${keyName(code)} can't be bound`, 'warn', 1600);
          else {
            st.update((d) => void assignBind(d.keys, id as BindId, slot, code));
            after(id, code);
          }
        }
        done();
      });
    }
  };

  const slotBtn = (id: string, slot: 0 | 1): HTMLElement => {
    const el = h('button', { class: `bind-key ${dev === 'pad' ? 'pad-key' : 'kb-key'}`, focus: true });
    (el as HTMLButtonElement).type = 'button';
    el.dataset.bind = `${id}:${slot}`;
    el.dataset.dev = dev;
    el.addEventListener('click', () => capture(id, slot, el));
    slots.push({ id, slot, el });
    return el;
  };

  const defs = dev === 'pad' ? PAD_BINDS : BINDS;
  const fixed = fixedRows(dev).map(([a, b]) => h('div', { class: 'controls-row fixed' }, h('b', { text: a }), h('span', { text: b })));
  const bindRows = defs.map((b) => {
    const warn = h('span', { class: 'bind-warn' });
    const row = h('div', { class: 'controls-row bind-row', attrs: { 'data-row': b.id } }, h('span', { class: 'row-label', text: b.label }), h('span', { class: 'kb-keys' }, slotBtn(b.id, 0), slotBtn(b.id, 1)), warn);
    rows.set(b.id, { row, warn });
    return row;
  });
  // the fixed trigger verbs are warned about too (a pad verb moved onto LT / RT)
  const note = h('div', {
    class: 'row-note',
    text:
      dev === 'pad'
        ? 'Select a slot, then press the new button. Hold B for 1 s (or Esc) to cancel, Y on a slot clears it. Gives up after 5 s.'
        : 'Click a key, then press the new key or mouse button. Esc cancels, Backspace clears. Gives up after 5 s.',
  });
  const reset = button(dev === 'pad' ? 'Reset controller to defaults' : 'Reset keys to defaults', () => {
    app.screens.push(
      new Dialog(dev === 'pad' ? 'Reset the controller?' : 'Reset the keys?', 'Every binding on this device goes back to the default layout.', [
        {
          label: 'Reset',
          primary: true,
          action: () => {
            st.reset(dev === 'pad' ? 'pad' : 'keys');
            render();
          },
        },
        { label: 'Cancel', action: () => {} },
      ]),
    );
  }, { class: 'subtle bind-reset' });
  render();
  const panel = h('div', { class: 'controls-list bind-panel', attrs: { 'data-dev': dev } }, summary, ...fixed, note, ...bindRows, reset);
  (panel as HTMLElement & { clearFocused?: () => boolean }).clearFocused = () => {
    const f = app.nav.focused;
    const k = slots.find((x) => x.el === f);
    if (!k || busy) return false;
    if (dev === 'pad') st.update((d) => clearPadBind(d.pad, k.id as PadBindId, k.slot));
    else st.update((d) => clearBind(d.keys, k.id as BindId, k.slot));
    render();
    return true;
  };
  return panel;
}

/** Every binding, per input type (Settings > Accessibility > Controls, and the pause menu's settings): remap the pad
 *  and the keyboard (locomotion step 18, D7; local only, D8). */
export class ControlsScreen extends Screen {
  override readonly showBack = true;
  private tabs: TabView;

  constructor(private app: App) {
    super('controls-screen');
    const order: Dev[] = app.input.mode === 'kbm' ? ['kbm', 'pad'] : ['pad', 'kbm'];
    this.tabs = new TabView(
      order.map((k) => ({
        id: k,
        label: LABELS[k],
        build: () => bindPanel(app, k),
      })),
    );
    this.tabs.onChange = () => app.nav.refresh();
    this.el.append(h('div', { class: 'screen-title', text: 'Controls' }), this.tabs.el);
  }

  override initialFocus(): HTMLElement | null {
    return this.el.querySelector<HTMLElement>('.tab-panel.active [data-focus]');
  }

  override onTab(dir: -1 | 1): void {
    if (this.app.input.gamepad.capturing || this.app.input.kbm.capturing) return;
    this.tabs.cycle(dir);
    this.app.nav.setRoot(this.el, this.initialFocus());
  }

  /** Y on a slot clears it. */
  override onAlt(): void {
    const p = this.el.querySelector<HTMLElement & { clearFocused?: () => boolean }>('.tab-panel.active .bind-panel');
    p?.clearFocused?.();
  }

  override hints(): Hint[] {
    return [
      { btn: 'A', label: 'Rebind' },
      { btn: 'Y', label: 'Clear' },
      { btn: 'LB/RB', label: 'Input type' },
      { btn: 'B', label: 'Back' },
    ];
  }
}
