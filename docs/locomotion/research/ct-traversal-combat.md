# Chaos Theory traversal, close combat and co-op moves vs Night Shift

Research for PLAY-NOTES P14 (full CT movement comparison) and P5 (elbow strike too slow, should only fire in range of an enemy). Written 2026-10-17 by a research subagent. Read-only on code; nothing here is a decision. Wall / cover / locomotion feel are covered elsewhere; this file covers traversal, close combat, co-op team moves and the stealth verbs around them.

## Method and limits

- Web: WebSearch + WebFetch. The Splinter Cell Fandom wiki returned HTTP 402 to every fetch (also via BreezeWiki and the Wayback Machine), GameSpot / Giant Bomb / pcgames.de returned 403. Fandom, GameSpot and Giant Bomb claims below come from **search-result snippets only** and are marked (snippet).
- The CT manual exists on ManualsLib but its text layer is OCR-garbled: only its **section headings** are reliable. They are still useful: they name the moves.
- No source gives CT move timings in seconds or metres. Every number for CT in this file is **inference** (marked) unless quoted. Measuring CT footage frame by frame is the only way to get real timings.
- "Stated" = a source says it. "Inference" = my reading, flagged as such.
- The ludo.guide list [S2] is titled "SC1-3 moves list" and uses PS2 buttons, so a move there may come from SC1 or Pandora Tomorrow rather than CT. Where only [S2] supports a move, treat it as likely, not certain.

## Sources

| Key | Source | URL |
| --- | --- | --- |
| S1 | GameRevolution FAQ (Xbox), "Stealth Controls" + walkthrough text | https://www.gamerevolution.com/guides/29920-splinter-cell-chaos-theorysplinter-cell-chaos-theory-splinter-cell-chaos-theory-faq |
| S2 | ludo.guide "SC1-3 moves list" (PS2 buttons) | https://www.ludo.guide/guide/tom-clancys-splinter-cell-chaos-theory/sc1-3-moves-list |
| S3 | Wikipedia, CT gameplay section | https://en.wikipedia.org/wiki/Tom_Clancy%27s_Splinter_Cell:_Chaos_Theory |
| S4 | Nintendo World Report review | https://nintendoworldreport.com/review/4357 |
| S5 | Worthplaying Xbox / PC review | http://worthplaying.com/article/2005/3/28/reviews/23463-xboxpc-review-splinter-cell-chaos-theory/ |
| S6 | TechEnclave PC review | https://techenclave.com/threads/splinter-cell-chaos-theory-pc-review.4838/ |
| S7 | GameSpy review (archive mirror) | https://gamespy-archives.quaddicted.com/sites/www.planetrainbowsix.com/features/articles/7-13-05b.html |
| S8 | GameRevolution review | https://www.gamerevolution.com/?p=36141 |
| S9 | Globe and Mail review | https://www.theglobeandmail.com/technology/splinter-cell-chaos-theory/article1115954 |
| S10 | GamesFirst "Ubisoft Focus" preview | https://gamesfirst.com/articles/2005/ubisoft-focus-tom-clancys-splinter-cell-chaos-theory/ |
| S11 | CT Xbox manual on ManualsLib (headings only legible) | https://www.manualslib.com/manual/379207/Ubisoft-Splinter-Cell-Chaos-Theory.html |
| S12 | Steam thread on CT speed control | https://steamcommunity.com/app/13570/discussions/0/1620599015901837449 |
| S13 | GameSpot user review (snippet) | https://www.gamespot.com/tom-clancys-splinter-cell-chaos-theory/user-reviews/2200-577084/ |
| S14 | GameSpot walkthrough (snippet) | https://gamespot.com/articles/tom-clancys-splinter-cell-chaos-theory-walkthrough/1100-6121234/ |
| S15 | GameSpot co-op hands-on, Panama (snippet) | https://www.gamespot.com/articles/tom-clancys-splinter-cell-chaos-theory-co-op-hands-on-panama/1100-6119226/ |
| S16 | pcgames.de NSA training videos (snippet) | https://www.pcgames.de/Tom-Clancys-Splinter-Cell-Chaos-Theory-Spiel-56218/Downloads/Splinter-Cell-3-4-NSA-Training-352940/ |
| S17 | Giant Bomb "Sound Meter" (snippet) | https://giantbomb.com/wiki/Concepts/Sound_Meter |
| S18 | r/Splintercell thread on wall rebound (mirror, snippet) | https://reddit.birdcat.cafe/r/Splintercell/s/RcsbGM7LHM |
| S19 | Gaming Pastime PC review (snippet) | https://gamingpastime.com/splinter-cell-chaos-theory-pc-review/ |
| S20 | Pocket Gamer review of the N-Gage / mobile CT (snippet) | https://www.pocketgamer.com/splinter-cell-chaos-theory/review |
| F1 | Fandom "Split jump" (snippet) | https://splintercell.fandom.com/wiki/Split_jump |
| F2 | Fandom "Half-split jump" (snippet) | https://splintercell.fandom.com/wiki/Half-split_jump |
| F3 | Fandom "Splinter Cell Controls" (snippet; CT PC keys) | https://splintercell.fandom.com/wiki/Splinter_Cell_Controls |
| F4 | Fandom "Tomoe nage" (snippet) | https://splintercell.fandom.com/wiki/Tomoe_nage |
| F5 | Fandom "Training Facility" (CT co-op mission 1, snippet) | https://splintercell.fandom.com/wiki/Training_Facility |
| F6 | Fandom "Agent Two" (snippet) | https://splintercell.fandom.com/wiki/Agent_Two |
| F7 | Fandom "Cooperative" (snippet) | https://splintercell.fandom.com/wiki/Cooperative |
| F8 | Fandom "Interaction System" (snippet) | https://splintercell.fandom.com/wiki/Interaction_System |
| F9 | Fandom "Knockout" (snippet) | https://splintercell.fandom.com/wiki/Knockout |
| F10 | Fandom "SC Combat Knife" (snippet) | https://splintercell.fandom.com/wiki/SC_Combat_Knife |
| F11 | Fandom SC1 "Training/Walkthrough" (snippet; SC1, not CT) | https://splintercell.fandom.com/wiki/Training/Walkthrough |
| F12 | Fandom "Spy Training Manual" (snippet) | https://splintercell.fandom.com/wiki/Spy_Training_Manual |

Manual headings [S11] (pages): Basic Moves, Crouching, Mantling (10); Advanced Moves, Zip Line, Throwing, Rolling (11); Move Body, Grabbing, Human Shield, Interrogation (13); Co-Op Moves (24); Short Scale/Boost, Tomoe Nage/Long Jump, Human Ladder, Contextual Co-Op Moves (25); Hang over Teammate, Stand on Teammate's Shoulders, Heal Teammate (26); Synchronized Action (27); Puzzle Action, Crane Gameplay (28); Use a Gadget, Back to Wall, Elbow Shot, Grab (41; context of this page not legible, likely a controls summary or the Versus section).

## 1. Traversal

| CT move | How it works in CT (cited) | Night Shift today (file) | Gap |
| --- | --- | --- | --- |
| Speed control (context for every move) | Stick depth sets speed and noise on pad; mouse wheel steps speed on PC [S12, F3]. Players describe a few wheel steps, "roll all the way down then up three clicks" for quiet but quick [S12]. | 6 speed gears, wheel / D-pad / rocker (`src/player/speedGears.ts`, `docs/ct-movement.md` Phase 0). | Matches the PC model. Pad in CT is analog (continuous) - Night Shift scales gear cap by stick (`ct-movement.md` Phase 0), close enough. |
| Mantle / climb onto objects | Manual heading "Mantling" [S11]; "push toward a ledge or object and press" jump [S2]. Jump in place leaps straight up; jump while running jumps forward (manual p.42, legible) [S11]. | Step / vault / mantle / hop / drop committed traversal (`src/player/traversal.ts`, `traversePath.ts`). | None in kind. CT has a free jump (Y = "JUMP/SPLIT-JUMP" [S1]); Night Shift keeps Y contextual, no free jump (`ct-movement.md` Controls). Deliberate difference. |
| Ledge hang, shimmy, pull-up, drop | Hang from a ledge, shimmy left / right, climb back up, drop [S2]. "Jump over a ledge and shimmy on it past the enemy" (the jump-and-hide trick) [S1]. Hang from a building or balcony [S4]. | `ledge` attach: shimmy 1.2 m/s, sidearm allowed, takedowns allowed, exits climb / drop (`src/player/attach.ts` ATTACH.ledge). | None in kind. Sidearm from a ledge hang: not confirmed for CT by any source (inference: likely not). |
| Vertical drainpipe | "Slide down the pipe" (walkthrough) [S1]; CT PC key C drops from ledges, ladders and vertical pipes [F3]. | `pipeV` attach 0.9 m/s, `PIPE_SLIDE` 3.2 m/s (`attach.ts`). | None. |
| Horizontal pipe, hand over hand | Shimmy along a pipeline, e.g. "shimmy over the closed door" [S1]. Jump up under a bar, X tucks feet, O drops or untucks; weapon drawable while hanging [S2]. CT PC: Shift = legs up, C = legs down / drop [F3]. | `pipeH` attach, `hands` sub, 1.0 m/s, sidearm allowed (`attach.ts`, `PIPE` in `src/config/movement.ts`). | None. |
| Pipe legs up | Tuck feet on a bar [S2, F3]. | `legsUp` sub, 0.5 m/s, feet 0.38 m higher (`PIPE_HIPS`, `PIPE.legsUpSpeed`). | None. |
| Inverted hang (shoot, choke, neck snap) | From a pipe over a guard: "reach down and snap his neck" [S4]; "choke down or break the neck of enemies below him" [S3]; tucked over an enemy: L1 choke unconscious, R1 snap neck [S2]. An official training video is titled "Inverted Neck Break" [S16]. Shooting while hanging by the legs is stated for Pandora Tomorrow; not confirmed for CT (inference: carried over). The mobile CT lacked it [S20]. | `inverted` sub: sidearm yaw +/-120 deg, pitch -80..+30, spread x1.3; takedown kind `inverted` reach 0.9 m, 0.6-2.8 m below (`PIPE`, `TAKEDOWN` in `src/game/takedown.ts`). | None in kind. |
| Ladder | "Climb it and head up the stairway" [S1]; drop off with C [F3]. | `ladder` attach, rung rate 3/s, slide 4.5 m/s (`attach.ts`). | None. |
| Zipline | "ZIP on down to the next building" [S1]; manual heading "Zip Line" [S11]; X tucks feet, O drops [S2]. | `zipline` attach 6 m/s, sidearm + takedown allowed (`attach.ts`). | Tuck feet on a zipline: no sub-state in Night Shift (grep `tuck` finds none). Small. |
| Split jump (and shooting from it) | CT: "look at the wall and hold the jump button"; the hero looks up at the spot when available [F1]. "Split-Jump and whack him from above" (drop on a guard) [S1]; from the split "you can draw a weapon or drop on foes" [S2]; "land on unsuspecting foes from above to knock them out" [S6]. A reviewer calls it "cool but usually useless" [S5]. | `split` attach, prompt + Y, 0.45 s jump, sidearm yaw +/-100 deg, pitch -85..+30; drop takedown from it (`src/player/splitJump.ts`, `SPLIT`). | Trigger differs: CT = look at the wall and hold jump, no world prompt [F1]. Night Shift = world prompt + Y. |
| Half-split jump | Works in CT "in a similar manner" to Pandora Tomorrow; one leg bent, one stretched, body leaning to one side; for narrower spaces, to reach an upper level [F2]. | None (grep `half` finds nothing). | Missing. Needs a narrow-gap detector (narrower than `SPLIT.minWidth` 1.2 m) and a climb-up exit. |
| Wall jump / "double jump" | SC1: press jump twice with a wall beside you to reach a ledge [F11]. CT co-op Training Facility includes a wall jump over a barrier [F5]. Players use a "rebound" wall jump off one wall for shortcuts in CT maps [S18]. | Prompt "Wall jump", committed 0.6 s kick ending in a ledge hang on a 2.7-3.8 m lip; inside-corner variant (`WALL_JUMP` in `src/config/movement.ts`, `attachController.ts`). | Input differs: CT is a jump-then-jump timing move (inference from SC1 [F11] and the "rebound" wording [S18]); Night Shift is a prompt. Night Shift always ends in a hang; CT's rebound can land on top of furniture [S18]. |
| Fences | A review lists climbing and moving along "pipes and fences" among the series' movement [S19] (game version not explicit). No CT-specific source. | `fence` attach: climb 0.9, shimmy 0.6, 0.9 s flip, rattle 4 m above gear 3 (`FENCE`). | Unverified in CT. Night Shift may exceed CT here; no change suggested. |
| Rappel | "RAPPEL ON WALL" option at a hook point [S1]; jump kicks off the wall, press down to climb slowly, weapon drawable [S2]. "GRAB ROPE option and shimmy down" (a hanging rope) [S1]. | `rappel` attach: ascend 1.0, descend 1.6 (3.0 sprint), kick-out 1.2 m swing, sidearm, window kick-through (`RAPPEL`). | None in kind. Free-hanging rope climb ("GRAB ROPE") not modelled (inference: small). |
| Vents / crawlspaces | "CRAWLSPACE" interaction to enter vents [S1]; "sneak through a crawl-space and drop into an office" [S8]. | `duct` attach 0.9 m/s, gadgets allowed (`attach.ts`). | None. |
| Windows | No CT source found for window moves. | Window vault (glass breaks), rope kick-through (`traversal.ts` `windowProbe`). | Unverified in CT. |
| Roll | Manual heading "Rolling" [S11]; "while running, hold O" [S2]. | Crouch tap at gear 5-6: 0.7 s, 3 m roll, 2 m noise (`movement.ts` rollGear / rollTime). | None in kind (input differs: hold vs tap). |
| Drop and grab / drop off a hang | Drop carefully off a ledge into a hang [S2]; C drops from ledges, ladders, pipes [F3]. | `drop` traversal and ledge exit `drop` (`traversal.ts`, `attach.ts` ExitReason). | None. |

## 2. Close combat

| CT move | How it works in CT (cited) | Night Shift today (file) | Gap |
| --- | --- | --- | --- |
| Close attack (non-lethal, any side) | Xbox: L-trigger "KNOCKOUT BLOW", R-trigger "LETHAL BLOW" with no weapon equipped [S1]. Close attack L1 / R1 "when near an enemy" [S2]. Direction and enemy awareness no longer matter for melee [S3]. "Instantly KO enemies by running up and pulling the Left trigger" [S5]. "Rush enemies and bash them in the chin with the palm of his hand" [S9]. "Palm smash (which results in an immediate KO)" [S7]. Non-lethal is a palm or knee strike; it "no longer takes two whacks of [the hero]'s elbow" [S13]. | Elbow strike on fire while holstered: reach 1.2 m, 90 deg cone, contact at 0.5 s, total 0.9 s, lunge cap 0.3 m; KO if unaware / side / behind, stagger if aware and facing, heavies only stagger; **starts on any press, with or without a target (a whiff)** (`src/game/elbowStrike.ts` STRIKE, `src/game/strikeController.ts` `begin()` / `pickTarget()`). Bible 5.4 sets these values. | P5. CT: proximity-gated (offered "when near an enemy" [S2]), one hit KO from any side at any awareness [S3, S7, S13], a rush-in palm strike [S5, S9]. Night Shift: slower, whiffs allowed, aware-facing only staggers. Speed in seconds for CT: not documented; "immediate" / "instantly" [S5, S7] (inference: well under 0.5 s to contact). |
| Knife, lethal | Knife replaces the elbow strike with "an instantly fatal close-quarters stab or slash" [S5]; "slash an enemy's throat or jab them in the gut" [S6]; "nearly instant lethal kills at close range" [S14]. | No knife. Lethal = hold on a contextual takedown (`TAKEDOWN.lethalHold` 0.3 s, `takedown.ts`). Bible lists the knife as Phase 6. | Missing as a verb; covered functionally by hold-for-lethal takedowns. Lethal / non-lethal on two triggers in CT [S1] vs tap / hold in Night Shift. |
| Knife, utility | Cut tents / plastic to make entrances [S5, S7]; cut through paper or plastic "to grab enemies on the other side" [S9]; break door locks instead of picking [S3, S9]. | None (bible Phase 6). | Missing; out of scope for the locomotion run. |
| Grab from behind | Get behind an enemy, interaction menu "Grab" [S2]; manual headings Grabbing, Human Shield, Interrogation [S11]. From the grab: L1 silent knockout, R1 lethal [S2]. | `behind` takedown starts a grab (`GRAB_KINDS`), gears 1-2 while holding, sidearm over the shoulder (spread x1.2), tap KO / hold kill, shove (`GRAB` in `takedown.ts`, `takedownController.ts`). | None in kind. |
| Human shield | Draw a weapon while grabbing to use him as a shield [S2]; manual heading "Human Shield" [S11]. | Guards hesitate 1.5 s then aim at the exposed head; hostage takes hits first (`GRAB.hesitate`). | None. |
| Interrogation | "INTERROGATE" from a grab [S1, S2]; the knife is the threat during it [F10]; lethal or non-lethal end [S3]. | None (bible Phase 6 verb). | Missing; out of scope here. |
| Force cooperation | While grabbing, walk the enemy to a retinal scanner [S2]. | None. | Missing; a mission verb, not movement. |
| Throw a grabbed guard / body off a ledge | "GRAB CHARACTER option to toss him over the ledge" [S1]; R1 near a ledge throws the body off [S2]; "throw bodies off cliffs or over railings, even onto other guards" [S3]. | None found (no ledge-throw kind in `TakedownKind`). | Missing. |
| Pull a guard over a railing / off a ledge | Hanging below, grab and throw him off; a long fall kills [S2]; "pull people over railings while hanging off a ledge" [S3]; jump up and fling him over the rails [S4]; "pulling an enemy off a ledge while hanging" [S6]. | `below` takedown: hanging at a lip, victim within 1.4 m, pulled over (`TAKEDOWN.belowReach`, `pullTime` 0.55 s). | None. |
| Drop attack from above | "The split-jump, drop attack, and rappelling return" [S7]; land on foes from above to KO [S6]. | `drop` (from an anchor, 1.2-5 m below, 1.0 m reach) and `above` (from a high edge) kinds (`takedown.ts`). | None. |
| Inverted neck snap / choke | See section 1 [S2, S3, S4, S16]. "A new upside-down chokehold" [S5]. | `inverted` kind (`takedown.ts`). | None. |
| Carry / hide bodies | Manual "Move Body" [S11]. Near a body, pick up; while carrying, crouch-stand silently; set down silently or drop quickly [S2]. Doors open while carrying (from Pandora Tomorrow on) [F8]. A guard or camera must find the body before an alarm [F8]. | Pick up, carry at `BODY.carrySpeed`, weapon stowed, hide spots or "Drop body" (`src/game/stealthSystems.ts`). | Minor: no separate quiet set-down vs quick drop. |
| Whistle | Dedicated button: Xbox Black [S1], PC V "Whistle (Solo)" [F3]; used to pull a guard into a dark hall [S1]. | None in code. Bible lists it with the Phase 2 sound work and the comms wheel. | Missing. |
| Door bash / quiet open | Open and bash use different buttons in the interaction prompt [F8]; bashing "knock[s] anyone who's on the other side" [S6]; door bash knocks out the guard behind [S4]. | Quiet open 1.1 s, bash at a sprint 0.22 s, door peek crack 12% (`src/world/doors.ts`, `src/world/doorPeek.ts`). | Bash in Night Shift does not knock out the guard behind (not found in `doors.ts`). P10's slow push-open is not described in any CT source found. |
| Water kill | Drown a guard from water (GameCube only) [S2, S4]. | None. | Not needed. |

## 3. Co-op team moves

CT co-op is two spies, one button, "One player simply signals they are in position and the second player will finish the process" [S8]; "All the double team moves are handled with the tap of a single button" [S6]; about 10 new moves [S10]; used "in very specific locations and situations" (search summary of [S4]).

| CT move | How it works in CT (cited) | Night Shift today (file) | Gap |
| --- | --- | --- | --- |
| Short scale / boost | Manual "Short Scale/Boost" [S11]; one agent kneels to boost the other to a high ledge [S15]; "boosting partners over high walls" [S6]. | Brace (hold Y 0.4 s, wall behind, mate within 3 m) then partner taps Y: toss up to 4.5 m onto a lip / pipe / split (`src/game/teamMoves.ts`, `TEAM`, `src/game/teamController.ts`). | CT kneels in the open (inference from "kneel" [S15]); Night Shift needs a wall behind (`TEAM.wallBehind` 1.0 m). |
| Human ladder (stand on shoulders) | Manual "Human Ladder", "Stand on Teammate's Shoulders" [S11]; "using each other as human ladders" [S7]. | Human ladder: top player on the shoulders at 1.45 m, any weapon, yaw 360, grab a lip <= 4.1 m (`TEAM`, `ct-movement.md` Phase 5). | None in kind. |
| Hang over teammate (climb a hanging partner) | Manual "Hang over Teammate" [S11]; "boost your partner up to a ledge, then climb his body while he hangs from it" [S4]; the person hanging from the ledge acts as a ladder [S15]; climbing a partner's back [F12]. | None (`TeamKind` = `boost` / `ladder` only). | Missing. Reaches ledges higher than the boost alone. |
| Tomoe nage / long jump (throw partner) | Manual "Tomoe Nage/Long Jump" [S11]; judo throw of the partner over security lasers or across a chasm, can also knock out guards [F4, F5]; "tossing your buddy over long gaps or into enemies to knock them out" [S4]; "hurl each other over laser grids" [S8]. | None. | Missing. Also a co-op takedown (throw into a guard). |
| Dual rappel / lower partner on a rope | "Drop a rappel line for your partner" for elevator shafts [S4]; "lowering them on a rope" [S6]; "rappel in tandem" [S10]; Dual Rappelling taught in the co-op Training Facility [F5]; manual "Hang on rope" (p.28 fragment) [S11]. | Solo rappel only (`RAPPEL`, `attach.ts`). | Missing: one player as the anchor lowering / raising the other. |
| Back-to-back climbing | Listed among co-op techniques with tomoe nage and human ladder [F6]. No mechanics described in any source found. | None. | Missing; mechanics unknown (inference: both brace back to back and walk up a narrow shaft, like a two-person split jump). |
| Split-jump boost | No source found for a co-op split-jump boost. | Boost can toss onto a split (`checkTeamRequest` target "lip, pipe, split"). | Night Shift has it; CT not confirmed. |
| Pull-up | No co-op pull-up source found; closest is climbing a hanging partner [S4, S15]. | None. | See "Hang over teammate". |
| Heal teammate | Manual "Heal Teammate" [S11]; "heal each other with a miraculously beneficial adrenaline shot" [S8]. | Medkit / revive code exists (`src/game/medkit.ts`, `medkitController.ts`, `health.ts`). | Not checked in detail here. |
| Synchronized / puzzle actions | Manual "Synchronized Action", "Puzzle Action", "Crane Gameplay" [S11]. Details not legible. | None found. | Unknown content; level-design verbs. |
| Voice noise | Enemies "pick up on the volume of your voice" [S7]; find "a louder ambient sound to cover up your voice" [S10]. | Not found. | Missing; co-op comms, not movement. |

## 4. Stealth verbs around movement

| CT feature | How it works in CT (cited) | Night Shift today (file) | Gap |
| --- | --- | --- | --- |
| Noise meter vs ambient | Meter "just under the standard light meter", with an ambient mark; "as long as the noise you make doesn't spike over that mark, no one can hear you"; trucks or thunder mask movement [S4]. "Anything above the marker will alert an enemy within range" [S7]; sprinklers raise ambient [S7]. Affected by weapons and movement [S17]. | HUD noise bars 0-3 (`src/ui/hud/hud.ts` `setTactical`); bible S2 / S4 plan noise zones and an ambient marker (Phase 2). No ambient marker found in `hud.ts`. | Ambient masking and marker not built (bible Phase 2). Movement speed (gear) already drives noise. |
| Light meter | "Standard light bar" kept [S3]; a reviewer calls it "often pointless" next to the noise meter [S5]. | Light level from the light field, exposure on the HUD (`gameState.ts`, `hud.ts`). | None for movement. |
| Training | No single-player training mission; optional training videos from the main menu [S9]; one video is "Inverted Neck Break" [S16]. | Proving Grounds CT course (`ct-movement.md` Phase 2-3). | Night Shift is ahead. |

## Implications for Night Shift

Stated facts first, then my inferences. None of this is a decision: P5 and anything that touches bible 5.4 needs Michael's call and a DECISIONS.md entry.

### P5 - the elbow strike

What CT does (stated):
- The non-lethal close attack is offered "when near an enemy" [S2]. You run up and pull the trigger [S5], or "rush enemies" with a palm to the chin [S9].
- It is a one-hit knockout ("immediate KO" [S7]; no more "two whacks of [the hero]'s elbow" [S13]).
- Direction and the guard's awareness no longer matter [S3].
- The lethal version is the knife, on the other trigger, "instantly fatal" [S5].
- The elbow itself is SC1 / Pandora Tomorrow; CT replaced it with a palm / knee strike and the knife [S13, S5].

What Night Shift does (`src/game/elbowStrike.ts`, `strikeController.ts`, bible 5.4):
- 0.5 s from press to contact, 0.9 s in all.
- `begin()` starts on any press. `pickTarget()` returns '' when no guard is in the 1.2 m / 90 deg cone, and the move still plays as a whiff with a 0.4 s exposed recovery.
- An aware guard facing you is only staggered; heavies are only ever staggered.

Gap and options (inference):
1. **In range only:** when `pickTarget()` returns '', do not start (no whiff animation, no recovery). This is a small change in `StrikeController.begin()` plus the touch / pad prompt. P5 asks for exactly this, and [S2]'s "when near an enemy" supports it.
2. **Faster:** CT gives no number. "Immediate" / "instantly" [S5, S7] and the rush-in description [S5, S9] suggest contact at about 0.2-0.3 s and about 0.5-0.6 s in all, with a short closing step. Measure CT footage to confirm before locking a number.
3. **Reach with a rush:** CT lets you run up into it. A slightly longer acquire range (for example 1.6-2.0 m) with a closing lunge, replacing today's 0.3 m lunge cap, gives that feel without a whiff.
4. **Result table:** CT knocks out from any side at any awareness [S3]. Bible 5.4 deliberately staggers aware, facing guards. Matching CT means a bible change, so it needs Michael.
5. Bible 5.4 fixes "about 0.5 s from press to hit" and "a miss leaves you exposed". Options 1-2 contradict that text. The bible must be updated alongside the code.

### Other gaps, rough priority for "feels like CT"

1. **Throw a body or a grabbed guard over a ledge or railing** [S1, S2, S3]. This is a signature CT verb. It is missing, and it fits the existing grab and takedown kinds.
2. **Co-op moves:** the missing CT moves are the hang-over-teammate ladder [S4, S11, S15], tomoe nage (a throw across gaps or lasers, or into a guard) [F4, S4, S8, S11] and the dual rappel / partner-held rope [S4, S6, F5]. Back-to-back climbing is named [F6] but its mechanics are unknown. CT drives all of them with one button and a "signal in position, partner finishes" flow [S6, S8], which matches Night Shift's brace-then-press handshake.
3. **Half-split jump** for narrow gaps [F2]. It is missing.
4. **Whistle** [S1, F3]. It is missing, and it is planned in the bible's Phase 2 sound work.
5. **Door bash knocks out the guard behind it** [S4, S6]. Night Shift's bash only opens the door.
6. **Input differences** (stated for CT, deliberate in Night Shift):
   - Split jump: CT is "look at the wall and hold jump" [F1].
   - Wall jump: CT uses a jump-then-jump timing [F11, S18].
   - Night Shift uses world prompts for both. Keep the prompts for touch.
   - Optional: a pad-only hold-jump shortcut would give the CT feel.
7. **Small items:** zipline tuck feet [S2], separate quiet / quick body set-down [S2], and climbing a free-hanging rope ("GRAB ROPE") [S1].
8. **Night Shift already covers or exceeds CT** in these areas:
   - Ledges, all horizontal pipe states, the inverted neck snap, drop attacks and pulling a guard off a ledge.
   - Split jump with aiming, rappel, ladders, vents and rolling.
   - Grab, human shield and carrying bodies.
   - Boost and human ladder.
   - CT has no single-player timing data, so any change to feel numbers (traversal speeds, takedown 0.22 s approach + 0.7 s strike) needs CT footage measured on Michael's PC, not more web research.

### Not found (open)
- Any CT timing or distance in seconds or metres.
- Whether CT's close attack plays a whiff animation when no enemy is near. [S2] implies it is offered only near an enemy, but no source says what an empty press does. Check in game or in footage.
- CT window moves, CT fence climbing, and what back-to-back climbing involves.
