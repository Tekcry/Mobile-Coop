import type { App } from '../../core/app';
import type { SaveData } from '../../save/schema';
import { MenuState } from '../../world/menuScene';
import { suitLook } from '../../progression/suit';
import { campaignAttachments, campaignKit } from '../../config/arsenal';

/** The menu operator as saved: the look with the worn suit, holding the primary with its attachments and camo. */
export function showSavedOperator(app: App): void {
  const m = app.current;
  if (!(m instanceof MenuState)) return;
  const s: SaveData = app.save.get();
  // the campaign: the long gun it issues, with its issued parts (bible 5.6, A62)
  const w = campaignKit(s.loadout).primary;
  m.setAvatar(suitLook(s.avatar, s.suit.worn), w, s.weapons[w].camo, campaignAttachments(w, s.weapons[w].attachments));
}
