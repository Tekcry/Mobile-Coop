import { h } from './dom';

export class Toasts {
  private el: HTMLElement;
  constructor(parent: HTMLElement) {
    this.el = h('div', { class: 'toasts' });
    parent.appendChild(this.el);
  }

  show(text: string, kind: 'info' | 'ok' | 'warn' = 'info', ms = 2600): void {
    const t = h('div', { class: `toast toast-${kind}`, text });
    this.el.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => {
      t.classList.remove('in');
      setTimeout(() => t.remove(), 300);
    }, ms);
    while (this.el.children.length > 3) this.el.firstChild?.remove();
  }
}
