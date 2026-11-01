# CT controls research (original Xbox pad, PC defaults, co-op)

History. The game's controls now follow `docs/archive/anim-rework/BRIEF.md` section 1 (Michael 2026-10-20: analogue speed, holstered / low ready / aiming, LT held aims); the live table is `docs/systems/input-and-loop.md`.

Scope: default controls of the 2005 reference game, single player and co-op. Wording is generic (goggles, gadget, co-op action, speed). Date of research: 2026-10-18.

## Sources

| Id | Source | Type |
| --- | --- | --- |
| M | Xbox manual scan, https://archive.org/details/xboxmanual_Splinter_Cell_3_Chaos_Theory (PDF: https://archive.org/download/xboxmanual_Splinter_Cell_3_Chaos_Theory/Splinter_Cell_3_Chaos_Theory.pdf). Page numbers below are the printed manual page numbers (pdf page = printed + 1). Read from the page images. | Primary |
| F | GameFAQs-style FAQ mirror, https://www.gamerevolution.com/guides/29920-splinter-cell-chaos-theorysplinter-cell-chaos-theory-splinter-cell-chaos-theory-faq (also https://www.gamerstemple.com/vg/games12/001435/001435g102.asp) | Secondary |
| S1 | Steam discussion, https://steamcommunity.com/app/13570/discussions/0/3835424220128873066 | Community, PC |
| S2 | Steam discussion, https://steamcommunity.com/app/13570/discussions/0/1778262124947608790 (PC pad config with button-to-action names) | Community, PC |
| S3 | PC review, https://techenclave.com/threads/splinter-cell-chaos-theory-pc-review.4838/ | Review |
| S4 | Previews/reviews quoted in search (White button hold and scroll), https://cheatcc.com/articles/tom-clancy-s-splinter-cell-chaos-theory-review-preview-for-xbox-xb-xb-rev/ | Review |
| L | Local footage notes, `docs/research/ct-movement/ct-measure-walls-doors-combat-vision.md` section 4 | Our own measurement |
| D | `docs/ct-research/moves-mechanics-digest.md` section 3 (co-op buttons) and row G18 / G96 | Our digest |

Not found: an official PC manual with the keyboard table (not on archive.org or replacementdocs in search). The PC keyboard table below is therefore thin and marked low confidence. Check the in-game Controls screen on a real copy.

Manual glyph note: the scanned button glyphs are small. Letters below were read from the diagram on printed page 8 and the text on pages 9-12; they agree with F.

## CT default pad (original Xbox, single player)

Source for every row marked "manual": printed page 8 diagram "Solo game, default controls", plus the text on pages 9-13.

| Button | Action | Source | Confidence |
| --- | --- | --- | --- |
| Left stick (move) | Move; speed set by how far the stick is pushed (analog) | M p8 ("Movement/Stance"), S1, search results from F | manual + multiple |
| Left stick click, standing or crouched | Back to wall | M p9 text, F | manual + multiple |
| Left stick click, weapon drawn (aiming mode) | Switch shoulder (handedness); also zoom in/out per the diagram | M p8 diagram, M p10 text ("click the left thumbstick to switch your weapon from one shoulder to another"), F (L3 = switch crosshairs) | manual |
| Right stick | Camera; look left/right and up/down | M p8 | manual |
| Right stick click | Enter/exit the long-range scan/binocular view; click again in that view to zoom | M p8, F | manual + multiple |
| Right stick click, weapon drawn (aiming mode) | Enter/exit zoom (sniper-style) | M p8 diagram marker "Click - Enter / Exit Zoom", F | manual + one |
| A | Interact (context menu: doors, grab, body, heal, give gadget, hack, rappel); reload when weapon drawn | M p8, p11-12 | manual |
| B | Crouch / stand; hold while running = roll; exit interactions, let go of ledge or pipe | M p8-p10, p17 | manual |
| X | Equip weapon (draw); also gets a held item ready to throw; no separate aim button | M p8, p10, F ("X = equip weapon") | manual |
| Y | Jump (split jump, grab ledge, grab pipe or zip line, mantle when pushed into a low object) | M p8-p10, F | manual |
| Left trigger | Close range, not aiming: non-lethal knockout. Weapon drawn: secondary fire (knockout/alt attachment) | M p8 ("KO attack / fire secondary"), p9 | manual |
| Right trigger | Close range, not aiming: lethal attack. Weapon drawn: primary fire. Throw when an item is in hand | M p8, p9, p10 | manual |
| Black | Whistle (solo). Co-op: co-op action (see below) | M p8, p23-p24, F | manual |
| White | Quick inventory: tap = quick switch, hold = open the inventory menu and choose with the right stick | M p8 ("Quick inventory"), F ("real-time inventory switch, hold for menu"), S4 ("hold White and scroll") | manual + multiple |
| Start | Pause menu | M p8, p13 | manual |
| Back | Mission device (satellite PDA: goals, notes, data, map, equipment); game does not pause | M p8, p14 | manual |
| D-pad left | Night vision (activate / deactivate) | M p8, F | manual + multiple |
| D-pad right | Thermal vision (activate / deactivate) | M p8, F | manual + multiple |
| D-pad up | Disputed. The solo diagram (M p8) labels the throwable-camera view ("enter/exit throwable camera") next to the up direction; the co-op/versus chart (M p31) says "D-pad up: consult throwable camera". F says "D-pad up: EMF vision". The solo diagram has no EMF label | M p8, p31 vs F | CONFLICT: two manual pages for camera, one FAQ for EMF |
| D-pad down | Long-range scan view in the solo diagram; aiming laser on/off in the versus chart (M p31). One PC pad config names it "throwable camera view" | M p8, M p31, S2 | manual (solo = scan view) |

Notes on the D-pad:

- Manual p17: inside the scan view you "can toggle the thermal, night vision and EMF modes as you would normally". So EMF exists as a toggle and is reachable from the pad. The PC pad config in S2 gives left = night, right = thermal, up = EMF, down = throwable camera view, which matches F, not the solo diagram. Best reading: left / right / up are the three goggle modes (F + S2 + M p17), and the manual diagram's "throwable camera" label is a layout or print quirk. Treat "up = EMF" as the likely truth, medium confidence.
- There is no "cycle" button on the pad. Each goggle mode has its own D-pad direction and toggles on and off.
- There is no speed control on the D-pad. Speed is analog stick deflection (see below).

## CT default pad (co-op)

| Button | Action | Source | Confidence |
| --- | --- | --- | --- |
| Black | Co-op action: start or finish a free co-op move (boost, long throw, human ladder). Same button as the solo whistle | M p24 (three moves each say "Co-op Action button (Black button)"), D | manual |
| A | Contextual co-op moves (dual rappel, hang-over, stand on shoulders, puzzle action, share view, heal teammate, share equipment): start from the interaction menu, partner completes with the same menu entry | M p24-p27 | manual |
| Left and right triggers | Rope holder moves the rope (left/right for dual rappel, up/down for hang-over) | M p24-p25 | manual |
| Left trigger (rider) | Inverse-crouch hide pose when hanging over the teammate | M p25 | manual |
| Left stick click and hold + stick direction | Voice message to partner ("Up", "Down", "Left", "Right", "Back", "Forward", "Lower", "Raise"); release = "Stop". Triggers add Lower / Raise for crane | M p26-p27 | manual |
| Everything else | Same as solo | M p8 | manual |
| (versus mode only) White | "Start/finish a co-op move" in the versus spy chart | M p31 | one source; differs from co-op pages, ignore |

Co-op move rule: a free move needs a crouch for the boost (M p24); if there is not enough space the agent shakes his head and the pad vibrates (M p23).

## CT default keyboard and mouse (PC)

Confidence is low. No manual table was found. Facts below are from player reports and a review.

| Input | Action | Source | Confidence |
| --- | --- | --- | --- |
| W A S D | Move | search snippet quoting a Steam thread (S1 family) | one source |
| Mouse wheel | Change movement speed (forward / back steps through walk and run). Without the wheel, full speed at any key press | S1, S3 | multiple sources |
| Mouse | Camera | S1 | one source |
| Right mouse button | Non-lethal attack (knockout) | Steam post found in search (non-lethal = right mouse click) | one source |
| Left mouse button | Presumed primary fire or lethal attack (matches the pad's right trigger mapping on PC pad configs: RT = left mouse, LT = right mouse) | S2 | one source, inferred |
| Space | Jump (carried over from the first game on PC) | AnandTech thread about the first game | low, other game |
| Goggle keys, equip, interact, crouch, quick inventory | Not found | - | unknown |

PC-with-pad (S2, Joy buttons, a PC conversion of the Xbox layout): jump, crouch/exit, back to wall / switch hand / zoom (L3), interact/reload (A), use/equip (X), whistle/co-op action (Black), quick inventory/switch attachment (White), mission device, scan-view/zoom (R3), pause. D-pad left night, right thermal, up EMF, down throwable camera view. This equals the original Xbox layout with Black and White moved to the bumpers (F-family note: "black/white -> bumper substitutions").

## Aim

- There is no aim button and no aim toggle in the manual. X draws the weapon; drawing puts the game in "aiming mode" (the manual's marker on the diagram), camera moves over the shoulder, and RT / LT then fire. Unclear from sources whether X again holsters or X (tap) holsters. Medium confidence that X toggles draw / holster; not stated in the manual pages read.
- Fire: RT primary, LT secondary (M p8). Not aiming: RT = lethal close attack, LT = non-lethal knockout (M p9).
- Precision: sniper / zoom is the right stick click in aiming mode (M p8, F). In zoom, D-pad up / down zoom in / out and LT focuses or holds breath (M p31 for the versus mercenary, F for the rifle). Left stick click swaps shoulder (M p10).
- Slow / precise aim: not in the manual. Zoom is the precision tool. Gyro and stick-aim complaints (S1) suggest no slow-aim modifier on the pad.
- Speed while aiming: nothing stated.
- Weapon switching: White (tap = quick switch, hold = menu, right stick selects) for the selected weapon / gadget; X equips what is selected. The pistol vs rifle is picked in the same inventory. No next-weapon button. The rifle's attachment is swapped with Black (F). Sources: M p8, F, S4. Multiple sources.
- On PC: not found. The pad-on-PC config (S2) uses White-equivalent (button 5) for quick inventory and attachment switch.

## Vision cycle and on / off

- Order: there is no cycle on the pad. Night = D-pad left, thermal = D-pad right, EMF = D-pad up (likely). Pressing the same direction again turns that mode off. Pressing a different direction switches directly (M p8, F).
- Our footage (L, 054201) shows one button stepping thermal, then EMF, then night vision, then normal, instant cuts with no transition effect. The footage input is unknown (probably a PC copy), so this is the only evidence of a cycle order. Night vision is not first in that sequence.
- On / off animation: no source describes it. Our footage measurement records "no transition effect" between modes (L) and one shared binocular goggle mask for all modes (L). A press of the on / off button is therefore treated as an instant cut plus mask; no goggle-lowering animation is documented for this game. Confidence low (one source, our own footage). A news item says the earlier game of the series had a goggles-slide animation; do not assume it applies here.

## Changes to our layout (our current -> CT)

Our current layout is from `docs/ct-prototype/A3-WALL-DOORS.md` section 1.

| Verb | Our current | CT default | Change |
| --- | --- | --- | --- |
| Vision modes | D-pad up cycles all modes (one button) | Separate buttons: D-pad left = night, right = thermal, up = EMF (likely), each toggles its own mode | Option 1: keep one cycle on up. Option 2 (CT): left / right / up direct. Needs Michael's call (footage shows a cycle, pad manual does not) |
| Speed gear | D-pad left / right | None on pad: analog stick deflection; PC mouse wheel | Free left / right for goggles; make stick deflection the speed (we already scale analog); keep wheel on PC |
| Gadget / throw-cam | D-pad down hold aims | D-pad down = long-range scan view (solo); throwable camera view is entered from the quick inventory or the up / down label in the manual | Move to D-pad down for scan view; gadget use through quick inventory + RT |
| Quick inventory | LB (hold: wheel) | White: tap = quick switch, hold = menu; right stick picks | Same function; keep LB as White |
| Co-op action | RB (ping) | Black: co-op action (and the solo whistle) | Keep RB as Black; add a whistle in solo only |
| Back to wall | L3 | L3 | Same |
| Aim | LT = aim / secondary | No aim button: X draws the weapon (aiming mode); LT = knockout (not aiming) / secondary fire (aiming) | Make X draw / holster the weapon; LT is knockout when not aiming |
| Fire / lethal | RT | RT = lethal close attack (not aiming), primary fire (aiming) | Same |
| Equip | X: reload tap, next weapon hold | X = equip (draw); A = reload | Move reload to A (when weapon drawn); drop "next weapon on X hold"; weapon pick through White |
| Shoulder swap | R3 (aiming only) | L3 click in aiming mode | Move shoulder swap to L3 (back to wall is out of aiming mode) |
| Scan / zoom | none (zoom not present) | R3 click: scan / binocular view, and zoom in aiming mode | Add R3 click for zoom; free R3 from shoulder swap |
| Interact | A | A | Same |
| Jump | Y | Y | Same |
| Crouch | B (roll hold) | B; hold while running = roll | Same (check roll hold) |
| Mission device | View | Back | Same (View = Back) |
| Pause | Menu | Start | Same |
| KBM goggles / speed | N cycle; `-` / `=`, wheel | Wheel = speed; goggle keys unknown | Keep wheel for speed; keep our goggle keys |
| KBM non-lethal | RMB = aim / secondary | RMB = non-lethal knockout | RMB knockout when not aiming |

Open questions for Michael: (1) cycle vs direct D-pad goggles, (2) D-pad up = EMF vs throwable camera. Both depend on sources that disagree.
