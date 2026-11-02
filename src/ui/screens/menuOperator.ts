import type { App } from '../../core/app';
import type { SaveData } from '../../save/schema';
import { MenuState } from '../../world/menuScene';
import { campaignAttachments, campaignKit } from '../../config/arsenal';

/** The menu operator: Wren (one fixed look), holding the issued primary with its attachments. */
export function showMenuOperator(app: App): void {
  const m = app.current;
  if (!(m instanceof MenuState)) return;
  const s: SaveData = app.save.get();
  // the campaign: the long gun it issues, with its issued parts (bible 5.6, A62)
  const w = campaignKit(s.loadout).primary;
  m.setAvatar(w, campaignAttachments(w, s.weapons[w].attachments));
}
