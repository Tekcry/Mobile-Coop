import type { App } from '../../core/app';
import { h } from '../dom';
import { button, Dialog } from '../widgets';
import type { TabDef } from '../widgets';
import type { SettingsScreen } from './settingsScreen';
import { shareOrDownload } from '../fileOut';

/** Settings > Data: export/import the save file, reset progress, storage status. */
export function dataTab(app: App, screen: SettingsScreen): TabDef {
  return {
    id: 'data',
    label: 'Data',
    icon: 'data',
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
              { label: 'Cancel', safe: true, action: () => {} },
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
      // (menu-ui SPEC 7.11) rows with descriptions; destructive actions confirm with Cancel first
      return h(
        'div',
        { class: 'rows ms-rows', attrs: { 'data-wrap': '' } },
        h('div', { class: 'row-note', text: status }),
        h('div', { class: 'grp', text: 'Backup' }),
        button('Export save file', () => exportSave(app), { desc: 'Saves your progress and settings to a file you can keep or move to another computer.' }),
        button('Import save file', () => file.click(), { desc: 'Loads a save file. Your current profile is backed up first.' }),
        file,
        h('div', { class: 'grp', text: 'Danger zone' }),
        button('Reset profile', () =>
            screen.manager.push(
              new Dialog('Reset profile?', 'Your name and gear go back to the defaults. Settings and mission records stay. A backup is kept on this device.', [
                { label: 'Cancel', safe: true, action: () => {} },
                { label: 'Reset', primary: true, action: () => void app.save.reset().then(() => app.toasts.show('Profile reset', 'warn')) },
              ]),
            ),
          { class: 'subtle', desc: 'Puts your name and gear back to the defaults. A backup is kept on this device.' }),
      );
    },
  };
}

function exportSave(app: App): void {
  const text = app.save.exportText();
  const blob = new Blob([text], { type: 'application/json' });
  shareOrDownload(blob, `night-shift-save-${new Date().toISOString().slice(0, 10)}.json`, 'Night Shift save');
  app.toasts.show('Save exported', 'ok');
}
