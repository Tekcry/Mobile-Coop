import type { App } from '../../core/app';
import { h } from '../dom';
import { button, Dialog, section } from '../widgets';
import type { TabDef } from '../widgets';
import type { SettingsScreen } from './settingsScreen';

/** Settings > Data: export/import the save file, reset progress, storage status. */
export function dataTab(app: App, screen: SettingsScreen): TabDef {
  return {
    id: 'data',
    label: 'Data',
    build: () => {
      const s = app.save.get();
      const status = app.save.readOnly && app.save.storageError && /newer|version/i.test(app.save.storageError)
        ? `Your saved progress is from a newer version of the game and was left untouched. Update the app (reload when online) to continue it.`
        : app.save.storageError
        ? `Storage unavailable (${app.save.storageError}). Progress will not be kept - export it before closing.`
        : `Saved on this device (IndexedDB). Profile created ${new Date(s.createdAt).toLocaleDateString()}.`;
      const file = h('input', { attrs: { type: 'file', accept: 'application/json,.json' }, style: { display: 'none' } }) as HTMLInputElement;
      file.addEventListener('change', () => {
        const f = file.files?.[0];
        if (!f) return;
        void f.text().then((text) =>
          screen.manager.push(
            new Dialog('Import save?', `This replaces your current profile with "${f.name}". Your current profile is backed up first.`, [
              { label: 'Cancel', action: () => {} },
              {
                label: 'Import',
                primary: true,
                action: () =>
                  void app.save
                    .importText(text)
                    .then(() => app.toasts.show('Save imported', 'ok'))
                    .catch((e: unknown) => app.toasts.show(`Import failed: ${e instanceof Error ? e.message : String(e)}`, 'warn', 4000)),
              },
            ]),
          ),
        );
        file.value = '';
      });
      return h(
        'div',
        { class: 'rows' },
        h('div', { class: 'row-note', text: status }),
        section(
          'Backup',
          button('Export save file', () => exportSave(app), { icon: 'back' }),
          button('Import save file', () => file.click(), { icon: 'play' }),
          file,
        ),
        section(
          'Danger zone',
          button('Reset all progress', () =>
            screen.manager.push(
              new Dialog('Reset progress?', 'XP, credits, unlocks, upgrades and cosmetics go back to the start. A backup is kept on this device.', [
                { label: 'Cancel', action: () => {} },
                { label: 'Reset', primary: true, action: () => void app.save.reset().then(() => app.toasts.show('Progress reset', 'warn')) },
              ]),
            ),
          { class: 'subtle' }),
        ),
      );
    },
  };
}

function exportSave(app: App): void {
  const text = app.save.exportText();
  const blob = new Blob([text], { type: 'application/json' });
  const name = `shoulder-strike-save-${new Date().toISOString().slice(0, 10)}.json`;
  const file = typeof File !== 'undefined' ? new File([blob], name, { type: 'application/json' }) : null;
  // Mobile: prefer the share sheet (Files / Drive); fall back to a download link.
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (file && nav.canShare?.({ files: [file] })) {
    void nav.share({ files: [file], title: 'Shoulder Strike save' }).catch(() => download(blob, name));
  } else {
    download(blob, name);
  }
  app.toasts.show('Save exported', 'ok');
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
