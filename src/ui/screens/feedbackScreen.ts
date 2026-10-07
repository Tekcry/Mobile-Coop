import { aspectLabel } from '../../core/display';
import type { App } from '../../core/app';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button, choice, Dialog, section, type TabDef } from '../widgets';
import { CATEGORY_LABEL, FEEDBACK_CATEGORIES, feedbackReportHtml, feedbackText, MAX_PHOTOS, MAX_TEXT, newEntry, type FeedbackEntry } from '../../feedback/feedback';
import { blobToDataUrl } from '../../feedback/feedbackStore';
import { isPhotoHost, PhotoModeScreen } from './photoMode';
import { shareOrDownload } from '../fileOut';
import type { SettingsScreen } from './settingsScreen';

/** Where a note is written: the game's own context (map, mode, position...) plus version, device and graphics. */
export function feedbackContext(app: App): Record<string, string> {
  const st = app.current as unknown as { feedbackContext?: () => Record<string, string> } | null;
  const ctx: Record<string, string> = typeof st?.feedbackContext === 'function' ? st.feedbackContext() : { screen: 'menu' };
  const v = app.settings.get().video;
  ctx.version = `${__APP_VERSION__}${__PREVIEW__ ? ' preview' : ''}`;
  ctx.platform = `${app.platform.platform} (${app.input.mode})`;
  ctx.graphics = `${app.quality.level.name}, ${app.engine.getRenderWidth()}x${app.engine.getRenderHeight()}${v.fpsCap ? `, cap ${v.fpsCap}` : ''}`;
  const pace = app.quality.pacing();
  if (pace.p50 > 0) ctx.frames = `p50 ${pace.p50.toFixed(1)} ms, p99 ${pace.p99.toFixed(1)} ms @ ${app.quality.hz} Hz`;
  const w = Math.round(window.innerWidth * devicePixelRatio);
  const hgt = Math.round(window.innerHeight * devicePixelRatio);
  ctx.display = `${w}x${hgt} (${aspectLabel(w, hgt)}) @ ${Math.round(app.quality.hz)} Hz, FOV ${v.fovH} (max ${v.maxFov}), HUD ${v.hudWidth}`;
  ctx.gpu = `${app.gpu.renderer || 'unknown'} (${app.gpu.kind})`;
  ctx.device = navigator.userAgent.slice(0, 160);
  return ctx;
}

/**
 * One feedback note: category, text, photos (photo mode: the frozen game or the menu stage under a free camera,
 * as many as wanted) and the context it was written in. Saved to the device; Settings > Feedback lists and
 * exports them.
 */
export class FeedbackFormScreen extends Screen {
  private entry: FeedbackEntry;
  private dirty = false;
  private photosEl: HTMLElement;
  private text: HTMLTextAreaElement;
  private urls: string[] = [];

  constructor(
    private app: App,
    entry: FeedbackEntry | null,
    private onSaved: (() => void) | null = null,
  ) {
    super('feedback-screen');
    this.entry = entry ? { ...entry, photos: [...entry.photos], context: { ...entry.context } } : newEntry(feedbackContext(app));
    const isNew = !entry;
    this.text = h('textarea', {
      class: 'text-input feedback-text',
      focus: true,
      attrs: { maxlength: String(MAX_TEXT), rows: '5', placeholder: 'What happened, what you expected, how to repeat it…', 'aria-label': 'Feedback' },
    }) as HTMLTextAreaElement;
    this.text.value = this.entry.text;
    this.text.addEventListener('input', () => {
      this.entry.text = this.text.value;
      this.dirty = true;
    });
    // a pad / keyboard confirm on the box starts typing in it
    this.text.addEventListener('click', () => this.text.focus());
    this.photosEl = h('div', { class: 'feedback-photos' });
    const ctx = h('div', { class: 'feedback-ctx' }, ...Object.entries(this.entry.context).filter(([k]) => k !== 'device').map(([k, v]) => h('span', { text: `${k}: ${v}` })));
    const actions = h(
      'div',
      { class: 'menu-list feedback-actions' },
      button('Add photo (photo mode)', () => this.photo(), { icon: 'camera' }),
      button(isNew ? 'Save feedback' : 'Save changes', () => void this.save(), { icon: 'check', class: 'primary' }),
      ...(isNew
        ? []
        : [
            button(this.entry.done ? 'Mark not done' : 'Mark done', () => {
              this.entry.done = !this.entry.done;
              void this.save();
            }, { class: 'subtle' }),
            button('Delete', () => this.confirmDelete(), { class: 'subtle' }),
          ]),
    );
    this.el.append(
      h('div', { class: 'screen-title', text: isNew ? 'Report feedback' : 'Feedback' }),
      h(
        'div',
        { class: 'feedback-body rows scrollable' },
        choice('Type', FEEDBACK_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] })), () => this.entry.category, (v) => {
          this.entry.category = v;
          this.dirty = true;
        }),
        this.text,
        section('Photos', this.photosEl),
        actions,
        ctx,
      ),
    );
    this.renderPhotos();
  }

  override initialFocus(): HTMLElement | null {
    return this.text;
  }

  private renderPhotos(): void {
    for (const u of this.urls) URL.revokeObjectURL(u);
    this.urls = this.entry.photos.map((b) => URL.createObjectURL(b));
    this.photosEl.replaceChildren(
      ...this.urls.map((u, i) => {
        const rm = h('button', { class: 'feedback-photo-x', focus: true, text: '✕', attrs: { 'aria-label': `Remove photo ${i + 1}` } });
        rm.addEventListener('click', () => {
          this.entry.photos.splice(i, 1);
          this.dirty = true;
          this.renderPhotos();
          this.app.nav.refresh();
        });
        return h('div', { class: 'feedback-photo' }, h('img', { attrs: { src: u, alt: `photo ${i + 1}` } }), rm);
      }),
      ...(this.entry.photos.length ? [] : [h('div', { class: 'row-note', text: 'No photos yet. Photo mode freezes the game and hides the HUD: fly the camera to the problem and take one.' })]),
    );
  }

  private photo(): void {
    if (this.entry.photos.length >= MAX_PHOTOS) {
      this.app.toasts.show(`Up to ${MAX_PHOTOS} photos per note`, 'warn');
      return;
    }
    const host = this.app.current;
    if (!isPhotoHost(host)) {
      this.app.toasts.show('Photo mode is not available here', 'warn');
      return;
    }
    this.manager.push(
      new PhotoModeScreen(this.app, host, (b) => {
        this.entry.photos.push(b);
        this.dirty = true;
        this.renderPhotos();
        this.app.toasts.show(`Photo added (${this.entry.photos.length})`, 'ok', 1400);
      }),
    );
  }

  private async save(): Promise<void> {
    if (!this.entry.text.trim() && !this.entry.photos.length) {
      this.app.toasts.show('Write something or add a photo first', 'warn');
      return;
    }
    try {
      await this.app.feedback.save(this.entry);
      this.dirty = false;
      this.app.toasts.show('Feedback saved (Settings > Feedback)', 'ok');
      this.onSaved?.();
      this.manager.pop();
    } catch (e) {
      this.app.toasts.show(`Could not save: ${e instanceof Error ? e.message : String(e)}`, 'warn', 4000);
    }
  }

  private confirmDelete(): void {
    this.manager.push(
      new Dialog('Delete this note?', 'Its text and photos are removed from this device.', [
        { label: 'Cancel', action: () => {} },
        {
          label: 'Delete',
          primary: true,
          action: () =>
            void this.app.feedback.remove(this.entry.id).then(() => {
              this.dirty = false;
              this.onSaved?.();
              this.manager.pop();
            }),
        },
      ]),
    );
  }

  override onBack(): boolean {
    if (!this.dirty) return false;
    this.manager.push(
      new Dialog('Discard this note?', 'Your changes are not saved.', [
        { label: 'Keep editing', action: () => {} },
        {
          label: 'Discard',
          primary: true,
          action: () => {
            this.dirty = false;
            this.manager.pop();
          },
        },
      ]),
    );
    return true;
  }

  override onHide(): void {
    if (this.manager.top === this) return;
    // (photo mode on top keeps the previews)
    if (!this.el.isConnected) for (const u of this.urls) URL.revokeObjectURL(u);
  }

  override hints(): Hint[] {
    return [
      { btn: 'A', label: 'Select' },
      { btn: 'B', label: 'Back' },
    ];
  }
}

/** The standalone HTML report of every note (photos embedded). */
export async function exportFeedback(app: App): Promise<void> {
  const list = await app.feedback.all();
  if (!list.length) {
    app.toasts.show('No feedback yet', 'warn');
    return;
  }
  app.toasts.show('Preparing the report…', 'info', 1200);
  const urls = await Promise.all(list.map((e) => Promise.all(e.photos.map(blobToDataUrl))));
  const html = feedbackReportHtml(list, urls, 'Silent But Deadly');
  const day = new Date().toISOString().slice(0, 10);
  shareOrDownload(new Blob([html], { type: 'text/html' }), `sbd-feedback-${day}.html`, 'Silent But Deadly feedback');
}

/** Settings > Feedback: new note, the list (open one to edit / add photos), export, copy as text, delete all. */
export function feedbackTab(app: App, screen: SettingsScreen): TabDef {
  return {
    id: 'feedback',
    label: 'Feedback',
    icon: 'note',
    build: () => {
      const list = h('div', { class: 'feedback-list' });
      const refresh = (): void => {
        void app.feedback.all().then((all) => {
          list.replaceChildren(
            ...(all.length
              ? all.map((e) => {
                  const first = e.text.trim().split('\n')[0] || '(photo only)';
                  return button(`${CATEGORY_LABEL[e.category]}: ${first.length > 70 ? first.slice(0, 70) + '…' : first}`, () => screen.manager.push(new FeedbackFormScreen(app, e, refresh)), {
                    class: `feedback-row${e.done ? ' done' : ''}`,
                    sub: `${new Date(e.created).toLocaleString()}${e.context.map ? ` - ${e.context.map}` : ''}${e.photos.length ? ` - ${e.photos.length} photo${e.photos.length > 1 ? 's' : ''}` : ''}`,
                  });
                })
              : [h('div', { class: 'row-note', text: 'No notes yet. Write one here or from the pause menu while playing (Report feedback), with photos from photo mode.' })]),
          );
          app.nav.refresh();
        });
      };
      refresh();
      return h(
        'div',
        { class: 'rows' },
        section(
          'Playtest notes',
          button('New feedback', () => screen.manager.push(new FeedbackFormScreen(app, null, refresh)), { icon: 'note', class: 'primary' }),
          button('Export report (HTML with photos)', () => void exportFeedback(app), { icon: 'back' }),
          button('Copy as text', () => {
            void app.feedback.all().then((all) =>
              navigator.clipboard?.writeText(feedbackText(all)).then(
                () => app.toasts.show(`Copied ${all.length} notes`, 'ok'),
                () => app.toasts.show('Copy is not allowed here: use Export', 'warn'),
              ),
            );
          }, { class: 'subtle' }),
        ),
        list,
        button('Delete all feedback', () =>
          screen.manager.push(
            new Dialog('Delete all feedback?', 'Every note and photo is removed from this device. Export first if you still need them.', [
              { label: 'Cancel', action: () => {} },
              { label: 'Delete all', primary: true, action: () => void app.feedback.clear().then(refresh) },
            ]),
          ),
        { class: 'subtle' }),
      );
    },
  };
}
