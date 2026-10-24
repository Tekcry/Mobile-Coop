import type { App } from '../../core/app';
import { h } from '../dom';
import { glyphSlot, MenuScreen, type LegendItem } from '../menuScreen';
import { button, Dialog, TabView } from '../widgets';
import { assignBind, bindable, bindLabels, BINDS, clearBind, keyName, type BindId, type KeyBinds } from '../../input/keyBindings';
import { assignPadBind, clearPadBind, PAD_BINDS, PAD_FIXED, padButtonName, type PadBindId } from '../../input/padBinds';
import { conflictIds, findConflicts, type Conflict } from '../../input/conflicts';

type Row = [string, string];
type Dev = 'pad' | 'kbm';

/** (locomotion step 18) A "press a button / key" capture gives up after this long (ms). */
export const CAPTURE_TIMEOUT_MS = 5000;

const LABELS: Record<Dev, string> = { pad: 'Controller', kbm: 'Keyboard and mouse' };

/** Fixed (not remappable) rows shown above the remappable ones. */
function fixedRows(dev: Dev): Row[] {
  return dev === 'pad'
    ? [
        ['Left stick', 'Move: push further to go faster (creep, sneak and walk; the last fifth jogs and runs)'],
        ['Right stick', 'Look'],
        ['LT', 'Aim (hold); from holstered it draws straight to the aim (slower). Let go: low ready'],
        ['RT', 'Fire while aiming. Holstered or holding a guard: tap knockout, hold kill'],
        ['D-pad up / down', 'Move the highlight of the held context menu (no speed buttons)'],
        ['A / B, d-pad, LB / RB', 'Menus: select / back, move, tabs'],
        ['Menu / Start', 'Pause; cancels a remap'],
      ]
    : [
        ['Mouse', 'Look (click to capture)'],
        ['Right button', 'Aim (hold); from holstered it draws straight to the aim (slower)'],
        ['Left button', 'Fire while aiming. Holstered or holding a guard: click knockout, hold kill'],
        ['W A S D', 'Walk (hold Shift to run, Alt to creep)'],
        ['Wheel', 'Move the highlight of the held context menu'],
        ['1-7', 'Pick a gadget'],
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
    // (SPEC 4.3) the capture overlay: the action, a 5 s countdown, Cancel (Menu / Start, Esc or a click; G22)
    const cancel = (): void => (dev === 'pad' ? app.input.gamepad.cancelCapture() : app.input.kbm.cancelCapture());
    let left = Math.round(CAPTURE_TIMEOUT_MS / 1000);
    const count = h('span', { class: 'cap-count', text: String(left) });
    const cancelBtn = h('button', { class: 'ms-lg nofocus cap-cancel', html: `${glyphSlot('start', 'Esc')}<span class="ms-lg-label">Cancel</span>` });
    (cancelBtn as HTMLButtonElement).type = 'button';
    cancelBtn.addEventListener('click', cancel);
    const overlay = h(
      'div',
      { class: 'cap-overlay' },
      h('div', { class: 'cap-title', text: dev === 'pad' ? 'Press a button' : 'Press a key or mouse button' }),
      h('div', { class: 'cap-action', text: rowLabel(dev, id) }),
      count,
      cancelBtn,
    );
    (el.closest('.screen') ?? document.body).append(overlay);
    const tickT = window.setInterval(() => {
      left = Math.max(0, left - 1);
      count.textContent = String(left);
    }, 1000);
    const onKey = (e: KeyboardEvent): void => {
      if (e.code !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      app.input.gamepad.cancelCapture();
    };
    const done = (): void => {
      window.clearTimeout(timer);
      window.clearInterval(tickT);
      overlay.remove();
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
    el.dataset.key = `${id}-${slot}`;
    el.dataset.ctx = `<h3>${rowLabel(dev, id)}</h3><p>${dev === 'pad' ? 'Select, then press the new button. Menu / Start cancels.' : 'Select, then press the new key or mouse button. Esc cancels.'}</p>`;
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
        ? 'Select a slot, then press the new button (B can be bound). Menu / Start or Esc cancels; X on a slot clears it. Gives up after 5 s. Zoom and Ping share R3 by default: Ping, or Zoom while aiming a scoped weapon.'
        : 'Click a key, then press the new key or mouse button. Esc cancels, Backspace clears. Gives up after 5 s.',
  });
  const resetAll = (): void => {
    if (busy) return;
    app.screens.push(
      new Dialog(dev === 'pad' ? 'Reset the controller?' : 'Reset the keys?', 'Every binding on this device goes back to the default layout.', [
        // (MD18) Cancel first and focused
        { label: 'Cancel', safe: true, action: () => {} },
        {
          label: 'Reset',
          action: () => {
            st.reset(dev === 'pad' ? 'pad' : 'keys');
            render();
          },
        },
      ]),
    );
  };
  const reset = button(dev === 'pad' ? 'Reset controller to defaults' : 'Reset keys to defaults', resetAll, { class: 'subtle bind-reset', key: 'reset' });
  render();
  const panel = h('div', { class: 'controls-list bind-panel', attrs: { 'data-dev': dev, 'data-wrap': '' } }, summary, ...fixed, note, ...bindRows, reset);
  (panel as BindPanelEl).resetAll = resetAll;
  (panel as BindPanelEl).clearFocused = () => {
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

type BindPanelEl = HTMLElement & { clearFocused?: () => boolean; resetAll?: () => void };

/** CONTROLS / REMAP (menu-ui SPEC 7.12, MD13): every binding, per input type (Settings > Controls > Remap controls):
 *  remap the pad and the keyboard (locomotion step 18, D7; local only, D8). */
export class ControlsScreen extends MenuScreen {
  private tabs: TabView;
  private shown = false;

  constructor(private app: App) {
    super('controls-screen', ['Controls', 'Remap']);
    const order: Dev[] = app.input.mode === 'kbm' ? ['kbm', 'pad'] : ['pad', 'kbm'];
    this.tabs = new TabView(
      order.map((k) => ({
        id: k,
        label: LABELS[k],
        build: () => bindPanel(app, k),
      })),
      { menu: true },
    );
    this.tabs.focused = () => app.nav.focused;
    this.tabs.onChange = () => {
      if (this.shown) app.nav.setRoot(this.el, this.tabs.recall());
    };
    this.body.append(this.tabs.el);
  }

  private get busy(): boolean {
    return this.app.input.gamepad.capturing || this.app.input.kbm.capturing;
  }

  private get panel(): BindPanelEl | null {
    return this.el.querySelector<BindPanelEl>('.tab-panel.active .bind-panel');
  }

  override onShow(): void {
    this.shown = true;
  }

  override initialFocus(): HTMLElement | null {
    return this.tabs.recall();
  }

  override onTab(dir: -1 | 1): void {
    if (this.busy) return;
    this.tabs.cycle(dir);
  }

  /** X on a slot clears it. */
  override onX(): void {
    if (!this.busy) this.panel?.clearFocused?.();
  }

  /** Y: reset this device's bindings (confirm, Cancel first). */
  override onAlt(): void {
    if (!this.busy) this.panel?.resetAll?.();
  }

  override onBack(): boolean {
    // (a capture in progress: Back is not a cancel, the capture owns the input)
    return this.busy;
  }

  override legend(): LegendItem[] {
    return [
      { act: 'back', label: 'Back' },
      { act: 'confirm', label: 'Change' },
      { act: 'lb', label: '' },
      { act: 'rb', label: 'Device' },
      { act: 'x', label: 'Clear' },
      { act: 'y', label: 'Reset all' },
    ];
  }
}
