/**
 * The music lab: a debug screen for Michael's ears (`?musiclab=1`, or Settings > Audio > Music lab with `?debug=1`).
 * The V2 motif picker was removed (tag `music-v2-archive`); the V3 sketch picker replaces it.
 */
import type { App } from '../../core/app';
import { h } from '../../ui/dom';
import { Screen } from '../../ui/screen';

export class MusicLabScreen extends Screen {
  override modal = false;

  constructor(_app: App) {
    super('music-lab');
    this.el.append(
      h('div', { class: 'screen-title', text: 'Music lab' }),
      h('div', { class: 'row-note', text: 'The V2 engine is paused. The V3 sketch picker lands in the next commit.' }),
    );
  }
}
