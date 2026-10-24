/**
 * The section rating card (section-rating S4): four marks (tick / cross), the synced count and the grant for the next
 * section. Shown RATING_CARD_SHOW seconds with no input, then fades. Text is built by the pure `ratingLines`; the DOM is
 * written once per `show()` and reused (nothing per frame except a countdown in `update(dt)`). No graphics reads.
 */
import './ratingCard.css';
import { h } from '../dom';
import { MARK_LABELS, RATING_LABEL, markCount, type Grant } from '../../game/rating/sectionRating';

/** What the mode passes in for one rated section. */
export interface RatingView {
  sectionId: string;
  title: string;
  marks: number;
  synced: number;
  grant: Grant;
}

/** Seconds the card stays fully shown. */
export const RATING_CARD_SHOW = 4;
/** Seconds after that before the element is hidden (matches the CSS fade). */
export const RATING_CARD_FADE = 0.6;

export interface RatingLines {
  marks: { label: string; ok: boolean }[];
  /** "Synced x2", or "" when none. */
  synced: string;
  /** One entry per non-zero grant part. */
  grant: string[];
}

const plural = (n: number, one: string, many: string): string => `+${n} ${n === 1 ? one : many}`;

/** Pure text for a card. `gadgetName` ("jammer") makes "+1 jammer charge"; omitted it reads "+1 gadget charge". */
export function ratingLines(view: RatingView, gadgetName = 'gadget'): RatingLines {
  const g = view.grant;
  const grant: string[] = [];
  if (g.gadget > 0) grant.push(plural(g.gadget, `${gadgetName} charge`, `${gadgetName} charges`));
  if (g.syringe > 0) grant.push(plural(g.syringe, 'syringe', 'syringes'));
  if (g.medkit > 0) grant.push(plural(g.medkit, 'medkit', 'medkits'));
  if (g.alarmStep > 0) grant.push(`First alarm ${g.alarmStep === 1 ? 'stage' : `${g.alarmStep} stages`} skipped`);
  return {
    marks: MARK_LABELS.map((m) => ({ label: m.label, ok: (view.marks & m.bit) !== 0 })),
    synced: view.synced > 0 ? `${RATING_LABEL.synced} x${view.synced}` : '',
    grant,
  };
}

/** One line for the op / course end: "Dock: 3/4 (Undetected, No kills, No alarms), synced x1". */
export function sectionLine(view: RatingView): string {
  const earned = MARK_LABELS.filter((m) => (view.marks & m.bit) !== 0).map((m) => m.label);
  const n = markCount(view.marks);
  const names = n === MARK_LABELS.length ? 'all marks' : earned.length ? earned.join(', ') : 'no marks';
  const sync = view.synced > 0 ? `, ${RATING_LABEL.synced.toLowerCase()} x${view.synced}` : '';
  return `${view.title}: ${n}/${MARK_LABELS.length} (${names})${sync}`;
}

export class RatingCard {
  readonly el: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly rows: HTMLElement[] = [];
  private readonly marks: HTMLElement[] = [];
  private readonly names: HTMLElement[] = [];
  private readonly syncedEl: HTMLElement;
  private readonly grantEl: HTMLElement;
  /** Seconds left; 0 when idle. */
  private left = 0;

  constructor(parent: HTMLElement) {
    this.titleEl = h('div', { class: 'rc-title' });
    this.el = h('div', { class: 'rating-card' }, this.titleEl);
    for (let i = 0; i < MARK_LABELS.length; i++) {
      const mark = h('span', { class: 'rc-mark' });
      const name = h('span');
      const row = h('div', { class: 'rc-row' }, mark, name);
      this.rows.push(row);
      this.marks.push(mark);
      this.names.push(name);
      this.el.append(row);
    }
    this.syncedEl = h('div', { class: 'rc-synced' });
    this.grantEl = h('div', { class: 'rc-grant' });
    this.el.append(this.syncedEl, this.grantEl);
    this.el.hidden = true;
    parent.appendChild(this.el);
  }

  /** Fill the card and show it for RATING_CARD_SHOW seconds. */
  show(view: RatingView, gadgetName?: string): void {
    const t = ratingLines(view, gadgetName);
    this.titleEl.textContent = `${RATING_LABEL.title}: ${view.title}`;
    for (let i = 0; i < this.rows.length; i++) {
      const m = t.marks[i]!;
      this.rows[i]!.className = `rc-row ${m.ok ? 'ok' : 'miss'}`;
      this.marks[i]!.textContent = m.ok ? '✓' : '✗';
      this.names[i]!.textContent = m.label;
    }
    this.syncedEl.textContent = t.synced;
    this.syncedEl.hidden = t.synced === '';
    this.grantEl.textContent = t.grant.join(', ');
    this.grantEl.hidden = t.grant.length === 0;
    this.el.hidden = false;
    // Restart the fade-in on a re-show.
    this.el.classList.remove('show');
    void this.el.offsetWidth;
    this.el.classList.add('show');
    this.left = RATING_CARD_SHOW + RATING_CARD_FADE;
  }

  hide(): void {
    this.left = 0;
    this.el.classList.remove('show');
    this.el.hidden = true;
  }

  /** Per frame: a countdown; the DOM is touched only at the fade start and the end. */
  update(dt: number): void {
    if (this.left <= 0) return;
    const before = this.left;
    this.left -= dt;
    if (this.left <= 0) this.hide();
    else if (before > RATING_CARD_FADE && this.left <= RATING_CARD_FADE) this.el.classList.remove('show');
  }

  get visible(): boolean {
    return !this.el.hidden;
  }
}
