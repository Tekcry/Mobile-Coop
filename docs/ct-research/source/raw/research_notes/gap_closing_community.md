# Gap-closing pass - community sources (R-05, R-07, R-09, R-10, R-11, R-15, R-16, R-17, R-19, R-20, R-22)

Rules per `_AGENT_BRIEF.md`: paraphrase only, tags [VERIFIED - 2+ sources] / [SINGLE SOURCE] / [UNCERTAIN]. Written as found; status table near the end.

## Method and access notes (this pass)
- **YouTube comments + descriptions + chapters** read via the `youtubei/v1/next` endpoint (comment continuation tokens work). ~40 Nuclear Plant / UN HQ / co-op videos scanned. Watch pages and caption/transcript endpoints are blocked (Google "sorry" redirect; player API returns LOGIN_REQUIRED), so no transcripts.
- **Reddit** via the Arctic Shift archive API (`https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=Splintercell&title=...` and `/api/comments/search?link_id=...`). Works if requests are spaced (parallel calls time out). pullpush.io refuses agents (rate-limit message); reddit.com and old.reddit.com JSON return "Blocked".
- Thread IDs below can be opened as `https://www.reddit.com/r/Splintercell/comments/<id>/`.

## R-19 Nuclear Plant route (first block of findings)
- **No uploader-written chapters exist** on any of ~30 Nuclear Plant uploads scanned (hexen2k7, PleasePlayMore, R3xXcoN, BoSstonPL, Pretend3r, TheEasyNICK, PAYKOOBRAZNIY, dat_carlin, MrBonJonson, GhostLetsPlays, CrypticNmad, FazePlays, TrayZorXx67, Agt_ Pendergast, Spyker2041, Urban Reflex, speedrun ILs). The only chapter list (Spyker2041) is machine-generated, already logged. [Negative result]
- **Lambert is silent in both downloadable missions.** Several commenters note that his briefing and in-mission lines appear only as on-screen text with no voice, and explain it as the late DLC not getting new recordings. A Reddit commenter says the same of UN HQ ("you can read his text on screen"). [VERIFIED - YouTube comments on hexen2k7 1/3 and PleasePlayMore #17 + Reddit v5jncz]. Design note: the two finale missions run on text-only handler comms.
- **PC order and the briefing.** Russian PC let's-players dat_carlin (part 6) wrote that they realised the missions were swapped when the Nuclear Plant briefing told them to look for another bomb - the one they had already dealt with in the previous episode (UN HQ). Their view: Nuclear Plant should come fifth. This suggests the **PC Nuclear Plant briefing was NOT rewritten** for the swapped order, contradicting the one German uploader cited earlier. [SINGLE SOURCE - uploader description; conflicts with RednBlue2k9 -> R-01 remainder stays UNCERTAIN, now leaning "not rewritten"]
- **dat_carlin also judged it the hardest mission**: confusing layout with many sub-objectives; they could not finish it stealthily. Czech LP (GhostLetsPlays) calls it probably one of the longest co-op missions. [SINGLE SOURCE each; consistent with known ~23 min ghost / 30-120 min casual]
- **Speedrun shortcut is a glitch, not a route.** A speedrunner (Buttercak3) explained under the UN HQ IL that one player fakes lock-picking a door while the partner tasers him, which leaves the model stuck and the player practically invisible. Other commenters call it "becoming a ghost". The GDQ-style 2016 run uploader says the same glitches recur in later missions. So speedrun videos are poor evidence for the intended route. [VERIFIED - YouTube comments on B8z_7lUW6XI, yEjHJb-SpjQ, gOn-T6LlNHk]
- **PC crash point.** One Reddit player (Chemical Bunker thread) reports a crash two or three rooms after the laser hallway; YouTube commenters ask for a fix for Panama and Nuclear Plant disconnecting immediately on PC. [SINGLE SOURCE each - stability, not route]
- **Route, scanner solution, laser handling and footbridge still not described in any reachable text.** [GAP]

## R-20 UN Headquarters (findings)
- **No uploader-written chapters or route notes** on ~25 UN HQ uploads (hexen2k7, CR4ZY BALLISTICS, PleasePlayMore, R3xXcoN, Pretend3r, BoSstonPL, TheEasyNICK, DoubleTroubeify, GhostLetsPlays, martinschlauch, Def Valerius, FazePlays, speedrun ILs). [Negative result]
- **Bomb defusal involves wires - weak confirmation.** On the final part of a Czech UN HQ let's play (the part that ends the mission), a viewer says the little wires made him tear his hair out. [SINGLE SOURCE - YouTube comment, GhostLetsPlays part 4]. Fits the brief's "simultaneous bomb wire cut" move, but which wire, how many, and whether it is timed are still unknown. [UNCERTAIN]
- **Two-player bomb panel on PC is a mini-game that confused players.** A 2008 AnandTech thread: two brothers on PC reached the Train Station bomb ("defuse" opens a device screen) and a two-player laser grid, and could not work out the inputs; nobody answered. [SINGLE SOURCE - forum; Train Station, not UN HQ]. Design lesson: the shared device screen needed on-screen input prompts.
- **Roof start confirmed indirectly.** Under the UN HQ speedrun IL, the runner says the run begins with him going to the door on the roof and (pretending to) pick its lock. [SINGLE SOURCE - runner's own YouTube reply, B8z_7lUW6XI]. With the Fandom rooftop-lock entry, the roof-door start is now [VERIFIED - FAN + speedrunner].
- **Pace.** Pretend3r (PC, 2005-06) played UN HQ before Xbox owners had it, on Normal at 640x480 because of lag, knocking out more guards "since the missions are pretty long". DoubleTroubeify subtitled their episode "Suicide Central". iTrJGQAZg-o commenter: "my brothers and I went through hell" on this mission. [SINGLE SOURCE each; sentiment = hard]
- **Platform availability.** One commenter says UN HQ disappeared from their Xbox 360 (backward-compat) install while Nuclear Plant stayed; others say on Xbox One/Series backward compatibility both maps are simply present. [UNCERTAIN - comments only; Xbox One presence stated by 2 commenters + 1 Reddit user -> VERIFIED that Xbox One BC includes them]
- **Lit windows, metal detector handling, 22nd-floor approach, Kim takedown, timer start: not found in any text.** [GAP]

## Internal map numbering (bears on R-01 and order)
- A 2017 Steam thread lists the PC co-op map files that can be launched from a batch file: `00_Training_COOP`, `01_Panama`, `02_seoulthree`, `03_ChemBunker`, `04_GCS`, `05_NuclearPlant`, `07_UNhq`. [SINGLE SOURCE - Steam discussion 133262738417485094]
- Reading: internally Nuclear Plant is numbered before UN HQ (Xbox order), and **slot 06 is missing**, which hints at a cut or renumbered mission. The poster adds that maps launched this way behave like test builds (lots of ammo, no dialogue). [Numbering SINGLE SOURCE; "cut mission" is my inference - UNCERTAIN]
- Lambert has **no voice in either DLC mission** on PC; a Steam reply says the missions never shipped with spoken Lambert lines; another found that enabling "Use native sounds" made the info screen vanish and killed ambient/enemy voice on these two maps (matches the patch readme warning). [VERIFIED - Steam threads 828925849173270181 + 45350245387206844 + YouTube comments]

## R-07 Co-op checkpoints / quick save per platform
- **PC: quick save and quick load exist in co-op.** speedrun.com's Any% Co-op rules say quicksaving and quickloading are allowed, and co-op IL runs are filed under an "Any% No QS/QL" category (KuroKishi/Diligence UN HQ 6:05 and Nuclear Plant 7:41 "No QS/QL"). A Reddit player boasts of beating co-op Panama on Elite/Expert "with NO SAVES", which only means something if saving is possible. [VERIFIED - speedrun.com API rules + Reddit 15s93fb + video titles]
- So the 2009 PC reviewer's "no checkpoints" is about automatic checkpoints, not manual saves. [UNCERTAIN reconciliation]
- **Xbox:** no new evidence beyond the manual's session-only quick save. **PS2/GC:** a Reddit user calls the GameCube co-op levels "extremely chopped up" (consistent with sub-level saves). [SINGLE SOURCE]
- How a quick load works for two players (does it reload both, who can trigger it) - not found. [GAP]

## R-15 Seoul 90% cap
- A 2022 Reddit thread (PC co-op): two players knocked out only the two required targets (fake and real Jong Pom-chu), no detection, and still got 90%. Replies: knockouts tied to objectives don't count; it is a known unfixed bug; many perfect runs end at 90%, so treat 90% as the maximum. One adds that they hit similar trouble getting 100% on Chemical Bunker. [SINGLE SOURCE - Reddit v5jncz; consistent with prior uploader evidence -> cap VERIFIED, cause still unknown]
- PleasePlayMore's PC co-op series description says some missions cannot reach 100% because of glitches even when every condition is met. [SINGLE SOURCE - YouTube description]
- Possible mechanism (solo Seoul, by analogy only): solo players report 96% on solo Seoul with clean stats and blame (a) soldiers already in combat mode spotting the player without a visible alarm and (b) grenades thrown into IFV hatches being counted as player-caused injuries. Not tested for co-op Seoul 3. [UNCERTAIN - analogy; Reddit dgzg9g]
- **Cause: still open.** [GAP]

## R-22 Partner voice attenuation
- Players repeat that **guards can hear you through voice chat if you talk too loudly** (Reddit vpwdry, 1e9pwjx). This is guard hearing again, not partner-to-partner distance falloff. On today's PC the in-game voice option is greyed out, so players use Discord. [VERIFIED for guard hearing; attenuation still GAP]

## R-11 Partner marker / map
- No new source. Community memory is about voice and verbal coordination ("yelling at each other when someone got spotted"). [GAP]

## R-09, R-10, R-16, R-17, R-05
- No community text found that answers these directly in this pass (searched Reddit titles, Steam discussions, YouTube comments). Details below where partial.
- R-16 (Chemical Bunker): a Reddit post lists the mission's three "mini-games": mixing chemicals, working a crane while one player gives directions, and disarming a missile. Players remember failing the disarm causes a large explosion with ragdolls everywhere. Says nothing about vial count. [SINGLE SOURCE - Reddit 1ouonhz]
- R-05 (PS2/GC Team Training): no text walkthrough found; see videos.

## Bomb defusal - player descriptions (supports R-20; Train Station primary)
- Players explaining the Train Station bomb to stuck viewers agree: **both agents must have the bomb selected; each switches to thermal vision to find the hot wire; both cut at the same moment; then repeat for a second wire before a timer runs out.** A Brazilian PS2 player adds: turn thermal on to see which wire glows, turn it off, then cut that wire; another says the cut is the X button on PS2. A PS2 uploader says it is hard without controller vibration, which also cues the live wire. [VERIFIED - YouTube comments on 8FiRUvq86sg (PC), LY9-0Dk-YHk (GameCube, 2 commenters), ge7dEnjp6MU (PS2), ge7dEnjp6MU description; matches Prima/Fandom already in mission_train_station.md]
- **The bomb is the single most-asked "how do we do this" moment** in comments: English, Spanish and Portuguese players ask which key cuts the wire or report that both clicked the first wire together and it exploded (likely wrong wire or a pulse change). [VERIFIED - 6+ comments across NrooRPC9cog, xjynpfObTLs, LY9-0Dk-YHk, ge7dEnjp6MU]
- For UN HQ: a Czech viewer's "those little wires" complaint on the final UN HQ part suggests the same wire mechanic is reused for the last bomb. [UNCERTAIN - single comment; mechanic for UN HQ still not described in text]
- Design note: the defusal is remembered as both tense and confusing; it needs explicit input prompts and a visible indication of which wire is live and how much time is left.

## R-17 Train Station - Chu
- A second account on the same Suru upload: the two players' own stat blocks show 0 kills (one player 0 KOs, the other 2 KOs) and a 100% rating, while their timestamp list labels the 10:56 beat "Killing Chu". So whatever happens to Chu is not counted as a player kill. Combined with Fandom RU ("always dies"), this suggests a scripted death after the interrogation. [UNCERTAIN -> leaning "Chu dies, scripted"; Suru description -JnlamHBZrc]
- A commenter on the same video says he got stuck "after killing the infected guy" - that is the infected soldier, a different character. [SINGLE SOURCE]
- Locker 9201 vs code 0315: no new source. [GAP]

## R-05 PS2/GC Team Training (partial)
- A PS2 uploader (Jake "Ziggity" Steven, PCSX2, US version) describes Team Training as a two-player training level that oddly uses a North Korean soldier as the target, and says **the last area needs only one player to reach the exit point**. [SINGLE SOURCE - description obcKEeRniRw]
- PS2 viewers on the WalkthroughCinema PS2 training video: one laughs that a partner **threw him at the enemy** (a throw used as an attack); another explains the human-ladder step - **the agent who was boosted up must press the co-op button again after landing so the partner can climb him**. [SINGLE SOURCE each - comments on gy1Vt3pxX8U]
- GameCube players explaining the first wall in training: **stand with your back to the wall and press the co-op input (Z + D-pad left on GC); the partner faces you, crouches and presses the same**, and the boost plays. A first-time player says they were stuck at "the very first bit". [VERIFIED - 2 commenters on gm9uYnMw9KA]
- One GameCube-era commenter claims the PS2 version has only training videos, not a training level; this is contradicted by two PS2 uploads of Team Training. [Claim REJECTED]
- Full PS2/GC Team Training sequence beyond these beats: [GAP]

## PS2/GC structure notes (bears on R-07)
- Jake Steven's PS2 co-op series (US, 2023-24) gives the PS2 mission order as **01 Team Training, 02 Seoul, 03 Chemical Bunker, 04 Train Station, 05 Panama**, with Panama last (he calls its ending anticlimactic because it was the first mission on Xbox/PC). Sub-level chapters match the brief's names (Seoul 5 parts, Bunker 5, Train Station 4, Panama 4). [SINGLE SOURCE for order - 5 uploader descriptions; sub-levels VERIFIED with Fandom]
- **PS2 co-op has no in-mission saving**; he says the missions are cut into small sub-levels for that reason and he used emulator save states to record. [SINGLE SOURCE - two of his descriptions; consistent with the GameCube reviewer -> R-07 PS2/GC "no mid-mission save" now VERIFIED]
- He judges Train Station sub-level 2 (Hydro Tunnel) hardest on PS2 (camera guarding the laptop for the opportunity objective; two guards in the last bomb room), and Seoul and Panama easiest. [SINGLE SOURCE]
- A Reddit user calls GameCube co-op levels "extremely chopped up" and "half the experience" of Xbox. [SINGLE SOURCE - Reddit kw1j41]

## R-09 Must both agents reach extraction?
- Only indirect hint: the PS2 uploader says the last area of Team Training needs only one player to reach the exit point. Whether that is a general rule or a training-level exception is unknown. [SINGLE SOURCE - obcKEeRniRw; R-09 still OPEN for story missions]

## R-10 Does difficulty change perception?
- Community perception only: players say enemies spot you much more easily on Expert ("enemy can easily see you", so they shoot out lights), and a commenter on hexen2k7's Elite run says on Elite guards come to investigate at the slightest noise and fire at once, unlike Expert. Not a controlled comparison. [UNCERTAIN - YouTube comments on tg8sn2ZC2CY, jry663Tx5bg]. R-10 stays OPEN.

## R-22 addendum - voice as a gameplay tool
- Two Reddit commenters remember that **your microphone voice registered on the in-game sound meter**, so guards could hear you talking at full volume - and that you could **deliberately make noise into the mic to attract or distract guards**. [VERIFIED - Reddit mngqa0, 2 commenters; plus vpwdry, 1e9pwjx]. This is the most-praised systemic detail in community memory. Partner-to-partner distance falloff: still not mentioned anywhere. [GAP]

## Community favourite moments and what made the co-op special
Sources: Reddit r/Splintercell and r/patientgamers via Arctic Shift (thread ids given), YouTube comments. Paraphrased; counts are rough.

**What players say made it special**
1. **The co-op needed both players.** The most repeated praise: you physically need each other to climb into vents, kill lights and cameras, or open doors in sync, so pairs stay close and improvise. Several contrast this with Conviction/Blacklist co-op, which they call single-player mechanics with a second player. [VERIFIED - Reddit 1g21m8q (several commenters), 99qjfn, 1rz5d99, 1m8z5gm]
2. **Moves as physical comedy and bonding.** The Tomoe Nage throw is the signature memory ("dispatch an idiot by throwing your idiot"; shouting its name); boosts, back-climbs and inverted rappel are remembered fondly; one judo player says the throw and the climb-over-partner move are realistic. [VERIFIED - Reddit 1g21m8q, ijtifz, 1djaago, 1s6ylts]
3. **Voice chat inside the stealth simulation** (see R-22 addendum). [VERIFIED]
4. **Failure is funny.** Repeated stories: a partner misjudges a zip-line, drops in front of a guard, the other clears the room and revives him, then the agents' "Damn we're good" line plays; doors slammed in a partner's face; ragdolls; failing the missile disarm and everyone flying; deliberately goofing with guards. Players say most of the fun is messing up and improvising. [VERIFIED - Reddit 1megyet, 1ouonhz, PS2/ParagonMitchell comments, 6lzq8e]
5. **Shared-screen and family memories.** Large numbers of comments about playing with a brother, sister, dad or best friend, split-screen at sleepovers, original Xbox with wired mics; some say it is the source of "some of the best laughs" of their life. [VERIFIED - dozens of comments across ParagonMitchell, DeepVelocityOps, Reddit 1df5iet, 18zgpgu, 1lw7uy0]
6. **Communication without words.** One player finished the hardest difficulty with a stranger without mics, by miming; another played with Korean players and used jumps and visual cues; another says coordinating moves with a stranger who spoke another language was both infuriating and the most satisfying thing he did online. [VERIFIED - 3 independent YouTube comments]
7. **Agent One and Two as blank slates with cocky lines** ("Damn, we're good"; the "we're the first" exchange about other Splinter Cells), nicknamed "Bob and Steve" after G4 X-Play's machinima. Some wish they had more story and dialogue; the campaign "felt more like mission packs". [VERIFIED - Reddit 1g21m8q, 1rz5d99, ijtifz, 1fiyo7i]
8. **Simultaneous takedowns.** Players love dropping on or shooting two guards at the exact same moment; it is hard because if one fires early the other guard reacts. [SINGLE SOURCE - Reddit 1df5iet]

**Favourite missions/moments named**
- Panama named a favourite by one player; Seoul 3 by another; Chemical Bunker's three "mini-games" (chemical mixing, crane with a spotter giving directions, missile disarm) and its scientist line about looking after the monkeys are quoted with affection; the Train Station bomb as the tensest moment. [SINGLE SOURCE each - Reddit ijtifz, 1ouonhz, 1isi4hk, 1m8z5gm]
- One veteran says the first few levels are among the best co-op ever, but the later levels feel rushed. [SINGLE SOURCE - Reddit 1utzrr6]

**Recurring criticisms**
- Too-small maps and areas lit too brightly compared with solo levels ("low-budget" feel). [SINGLE SOURCE - Reddit 1g21m8q, 2 commenters]
- Co-op moves clunky and awkward to execute at times; inputs for shared devices unclear (bomb, laser grid, door code). [VERIFIED - Reddit 1g21m8q + many YouTube help requests + AnandTech 2008]
- Hard for newcomers: several pairs never got past the first or second level; Chemical Bunker on PS2 "took months". [VERIFIED - multiple comments]
- PC co-op is capped around 35 fps, desyncs if a player alt-tabs or uses different resolutions/widescreen patch, crashes at specific points, and no longer has official servers (players use Radmin, ZeroTier, Hamachi, Evolve). [VERIFIED - Reddit 1m3rm7z, 1htj7ha, 1ouonhz, many YouTube comments]
- Bugs blocking 100% (Seoul, Chemical Bunker 97%). [VERIFIED - see R-15]

**Solo with two controllers?** A PS2 thread: possible in theory but very frustrating; players stress that OCP jamming in co-op is not fire-and-forget (one player keeps aiming and holding the trigger while the other moves) and that in dual rappel one player controls sideways movement and the other controls height. [SINGLE SOURCE - Reddit 1qfdvur; OCP-hold detail worth checking against the manual]

## Lit-window rule (R-20) - context only
- The rule text itself (Fandom RU: being detected in windows where the light is on fails the mission) was re-read; it sits beside the metal-detector rule and the hidden 20-minute timer note. No player text explains it.
- One fuzzy Reddit memory describes a co-op mission where you "shimmy down the side of a building" and a guard in a room you pass investigates a light going out. The commenter mixes up missions, so this cannot be assigned to UN HQ. [UNCERTAIN - Reddit 1m8z5gm]. Combined with roof entry and inside-only emergency doors, an exterior descent past lit office windows is a plausible reading of the rule, but it is **not confirmed**. [GAP]

## Status table
| Item | Result of this pass | Confidence now |
|---|---|---|
| R-05 PS2/GC Team Training | Partial: wall boost input, human-ladder re-press, throw-at-enemy beat, North Korean training target, last area needs one player | Partial, mostly SINGLE SOURCE |
| R-07 Saves | PC co-op has quick save/load (VERIFIED); PS2/GC no mid-mission save (VERIFIED); Xbox unchanged | Upgraded |
| R-09 Both at extraction | Only PS2 training hint | Open |
| R-10 Difficulty and perception | Community perception only | Open |
| R-11 Partner marker/map | Nothing | Open |
| R-15 Seoul 90% | Cap re-confirmed as a known bug, Bunker 97% too; cause unknown | Cap VERIFIED, cause open |
| R-16 Serum vials | Nothing new on count | Open |
| R-17 Chu | 0-kill stats next to "Killing Chu" support a scripted death | Upgraded to leaning, still UNCERTAIN |
| R-19 Nuclear Plant route | No route text; Lambert silent; PC briefing likely not rewritten; map numbering; glitch-based speedruns | Open (context added) |
| R-20 UN HQ route | Roof-door start VERIFIED; bomb uses wires (weak); lit windows/metal detector/22nd floor/Kim/timer open | Partly upgraded |
| R-22 Voice attenuation | Mic feeds sound meter and can lure guards (VERIFIED); partner falloff never mentioned | Open |
| Community sentiment | New section from Reddit + YouTube | Done |

## Sources
**Reddit (via Arctic Shift API: `https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=...&title=...` and `/api/comments/search?link_id=...`; thread = `https://www.reddit.com/r/<sub>/comments/<id>/`)**
- r/Splintercell 1g21m8q (ranking co-op modes), 1df5iet (first-time co-op), 1m8z5gm (best co-op), 1megyet (funny failures), 1ouonhz (Chemical Bunker mini-games, crash after laser hallway), 1q5uvqx (v1.05 co-op), 1isi4hk (campaign length), 18zgpgu, 1djaago (moves in real life), 1qfdvur (solo with two controllers; OCP hold; dual rappel split), 1ive4t5, 1utzrr6, 1rz5d99, ijtifz, 99qjfn, 1fiyo7i (X-Play Co-op Theater), 1e9pwjx (mic heard by enemies), 1htj7ha, 1m3rm7z (35 fps cap, NV fix), 1lw7uy0, 1q28oog, v5jncz (Seoul 90% co-op), 15s93fb (co-op with no saves), kw1j41 (GameCube co-op), 1s6ylts, 1n7ayft / 1opytqm (SC1 Nuclear Power Plant - different mission, excluded), 1ecekbl, dgzg9g, 11u5vk4 (solo Seoul scoring, analogy only), 1k1o3v9.
- r/patientgamers mngqa0 (mic on sound meter), 6lzq8e, 4mfcaa, 8vk0aw; r/gaming d3xxja, vpwdry (voice chat greyed out; guards hear voice).
**YouTube (descriptions, chapters, comments via `POST https://www.youtube.com/youtubei/v1/next`)**
- Nuclear Plant: OBU3MtaoKb4, rVg3fr3OrPA, jry663Tx5bg (hexen2k7; Lambert-silent comment), phfqPfdFZdQ (PleasePlayMore; "glitches block 100%"; Xbox One has maps), H-AXCQQ8sCs (dat_carlin; order/briefing remark), Bf7afScPj-c (GhostLetsPlays), 8L90xIjo9uk / wdxUBFyBMlA (Pretend3r), xFO_ntoDVBY (Spyker2041, auto chapters), 8Ww7rE4UOm8 (Urban Reflex), kM-HTagymSM / OWqEWyFiN34 / ioOcGz6P_PQ / tg8sn2ZC2CY / mODHEazeQr8 (R3xXcoN), BXhyhwzT67c / B6tnTABDOtc / qbLoTbAPNi4 (BoSstonPL), TheEasyNICK 3janOG4RYT4 / -4Kq2wMmWwU / ezBiZ-_5E2Y / iOqpdDhbkGE, PAYKOOBRAZNIY BTZC73LY1Lw / _Dh7tza0XJk / uJX02s3DmfM / 7npoMU0SrdU, c7slNfcHmig, 1Od5OMtil9w, ocRhdbfZ798, KQoTIplV_QA, wIRXoX8nd0I, U3wdapNPbaY.
- UN HQ: 5RBmv-nRtTs / Vmob0mzcINg / -mU9NO8dxVw (hexen2k7), yQH90XJtxTY, 3CH1BrvzlPA, 748PAmV4MUc, cdCN8UQOvn8 / 75QYl5F9nKM (Pretend3r), Ya-6NCCKmTg / 0iWVH-KZ6_8 / DbJGFSi1FKo / v4gb6uKa5SQ / uHMLby5KwZI / iTrJGQAZg-o (R3xXcoN), C05yF9EI8Uo, PoXfW1ZVeBI / KiuKSDDxsUo, ULiNF7HcIV4, iYKmSOodngw (Czech; "wires" comment), ZLs3zuAooBs, er8ZbvFLmMA / ZjLMtG7irg8, TvaVH-CWZRM, WZi5Jum_mmo, vHbEPapMngk.
- Speedruns: B8z_7lUW6XI (roof-door start; taser invisibility glitch), iD_AeCbzvJI, DaxcKvwW7LI, qcI5CBbQ2vE, chkCInZRTIc, 79Q6LqfXck0, gOn-T6LlNHk (2016 run with commentary; glitches), yEjHJb-SpjQ (Distro/Heinki; comments on co-op fun), MS-4g3ZHyXk, Q33b5tX5vPQ.
- Train Station / Bunker / Training / PS2-GC: -JnlamHBZrc (Suru; Chu stats), 2X5MvQPOQ14 / yDq17RUC8fs, 8FiRUvq86sg, LY9-0Dk-YHk (GameCube), NrooRPC9cog, xjynpfObTLs, B5mtzFTTI3s, chb66dBOt74 / ILxhYQ1BHc0, 8OvS5zQkS6w, akWLnghZb8c, dWuinQ0k8pg, BROMKfkVpYs, 49TgQ2npG1Y, obcKEeRniRw / __LRg8KrYQ8 / qLQEHSaRECM / ge7dEnjp6MU / 2FmkMk4rHQw (Jake "Ziggity" Steven, PS2 US), gy1Vt3pxX8U (WalkthroughCinema PS2 training), gm9uYnMw9KA (GameCube training).
- Sentiment essays: SwxTLoWn5e4 (ParagonMitchell "The most cursed co-op game", ~90 comments), SjycM4h_5r0 (Tekkie, Russian), KCOcnYpCD0s (Lawerenceofalevi), 4GtVpbf1xAw (DeepVelocityOps), LLww3vy8_1Y (3dCossack), At3X6nNWLP0.
**Other**
- speedrun.com API: `https://www.speedrun.com/api/v1/games/j1n44e6p/categories`, `/levels`, `/variables`, `/runs?level=<id>` and `/runs?category=zd3xm8dn` (co-op rules: quick save allowed; IL "No QS/QL" categories; run comments).
- Steam discussions (app 13570): 133262738417485094 (co-op map file names), 828925849173270181 and 45350245387206844 (no Lambert voice; native-sounds bug), 1326718197214822685; Steam guides 2594188456, 2035564921, 1762258050 (setup only, no mission content).
- AnandTech forum 2008: https://forums.anandtech.com/threads/chaos-theory-co-op-mp-question-regarding-2-person-activated-objects.142480/ (PC players stuck on two-player bomb/laser/cryo inputs; unanswered).
- Fandom RU cached page /home/user/raw/wiki/ru_Штаб_квартира_ООН.txt (re-read for lit-window, metal detector, 20-min timer notes).
**Failed / blocked**
- YouTube watch page (Google "sorry" 302) and `youtubei/v1/player` (LOGIN_REQUIRED) - no captions/transcripts.
- api.pullpush.io - refuses agents ("Rate limit exceeded ... not provide free scraping resources for agents").
- reddit.com and old.reddit.com JSON - "Blocked" page.
- Arctic Shift comment full-text search (`body=`) - times out every time; title search works when spaced out.
- GameFAQs via r.jina.ai - "Request Blocked"; GameFAQs board via WebFetch - 403.
- WebSearch (works) for jeuxvideo.com and Russian sites returned no co-op Nuclear Plant/UN HQ walkthrough text.

## Source URLs (expanded from the ids above)

**Reddit threads** (read through the Arctic Shift API, https://arctic-shift.photon-reddit.com/api/posts/search and /api/comments/search):
- https://www.reddit.com/r/Splintercell/comments/1g21m8q/
- https://www.reddit.com/r/Splintercell/comments/1df5iet/
- https://www.reddit.com/r/Splintercell/comments/1m8z5gm/
- https://www.reddit.com/r/Splintercell/comments/1megyet/
- https://www.reddit.com/r/Splintercell/comments/1ouonhz/
- https://www.reddit.com/r/Splintercell/comments/1q5uvqx/
- https://www.reddit.com/r/Splintercell/comments/1isi4hk/
- https://www.reddit.com/r/Splintercell/comments/18zgpgu/
- https://www.reddit.com/r/Splintercell/comments/1djaago/
- https://www.reddit.com/r/Splintercell/comments/1qfdvur/
- https://www.reddit.com/r/Splintercell/comments/1ive4t5/
- https://www.reddit.com/r/Splintercell/comments/1utzrr6/
- https://www.reddit.com/r/Splintercell/comments/1rz5d99/
- https://www.reddit.com/r/Splintercell/comments/ijtifz/
- https://www.reddit.com/r/Splintercell/comments/99qjfn/
- https://www.reddit.com/r/Splintercell/comments/1fiyo7i/
- https://www.reddit.com/r/Splintercell/comments/1e9pwjx/
- https://www.reddit.com/r/Splintercell/comments/1htj7ha/
- https://www.reddit.com/r/Splintercell/comments/1m3rm7z/
- https://www.reddit.com/r/Splintercell/comments/1lw7uy0/
- https://www.reddit.com/r/Splintercell/comments/1q28oog/
- https://www.reddit.com/r/Splintercell/comments/v5jncz/
- https://www.reddit.com/r/Splintercell/comments/15s93fb/
- https://www.reddit.com/r/Splintercell/comments/kw1j41/
- https://www.reddit.com/r/Splintercell/comments/1s6ylts/
- https://www.reddit.com/r/Splintercell/comments/1ecekbl/
- https://www.reddit.com/r/Splintercell/comments/dgzg9g/
- https://www.reddit.com/r/Splintercell/comments/1k1o3v9/
- https://www.reddit.com/r/patientgamers/comments/mngqa0/
- https://www.reddit.com/r/patientgamers/comments/6lzq8e/
- https://www.reddit.com/r/patientgamers/comments/4mfcaa/
- https://www.reddit.com/r/patientgamers/comments/8vk0aw/
- https://www.reddit.com/r/gaming/comments/d3xxja/
- https://www.reddit.com/r/gaming/comments/vpwdry/

**Steam discussions and guides (app 13570):**
- https://steamcommunity.com/app/13570/discussions/0/133262738417485094/
- https://steamcommunity.com/app/13570/discussions/0/828925849173270181/
- https://steamcommunity.com/app/13570/discussions/0/45350245387206844/
- https://steamcommunity.com/app/13570/discussions/0/1326718197214822685/
- https://steamcommunity.com/sharedfiles/filedetails/?id=2594188456
- https://steamcommunity.com/sharedfiles/filedetails/?id=2035564921
- https://steamcommunity.com/sharedfiles/filedetails/?id=1762258050

**speedrun.com API:** https://www.speedrun.com/api/v1/games/j1n44e6p/categories ; https://www.speedrun.com/api/v1/games/j1n44e6p/levels ; https://www.speedrun.com/api/v1/runs?category=zd3xm8dn

**YouTube videos read for description, chapters and comments (84):**
- https://www.youtube.com/watch?v=-4Kq2wMmWwU
- https://www.youtube.com/watch?v=-JnlamHBZrc
- https://www.youtube.com/watch?v=-mU9NO8dxVw
- https://www.youtube.com/watch?v=0iWVH-KZ6_8
- https://www.youtube.com/watch?v=1Od5OMtil9w
- https://www.youtube.com/watch?v=2FmkMk4rHQw
- https://www.youtube.com/watch?v=2X5MvQPOQ14
- https://www.youtube.com/watch?v=3CH1BrvzlPA
- https://www.youtube.com/watch?v=3janOG4RYT4
- https://www.youtube.com/watch?v=49TgQ2npG1Y
- https://www.youtube.com/watch?v=4GtVpbf1xAw
- https://www.youtube.com/watch?v=5RBmv-nRtTs
- https://www.youtube.com/watch?v=748PAmV4MUc
- https://www.youtube.com/watch?v=75QYl5F9nKM
- https://www.youtube.com/watch?v=79Q6LqfXck0
- https://www.youtube.com/watch?v=7npoMU0SrdU
- https://www.youtube.com/watch?v=8FiRUvq86sg
- https://www.youtube.com/watch?v=8L90xIjo9uk
- https://www.youtube.com/watch?v=8OvS5zQkS6w
- https://www.youtube.com/watch?v=8Ww7rE4UOm8
- https://www.youtube.com/watch?v=At3X6nNWLP0
- https://www.youtube.com/watch?v=B5mtzFTTI3s
- https://www.youtube.com/watch?v=B6tnTABDOtc
- https://www.youtube.com/watch?v=B8z_7lUW6XI
- https://www.youtube.com/watch?v=BTZC73LY1Lw
- https://www.youtube.com/watch?v=BXhyhwzT67c
- https://www.youtube.com/watch?v=Bf7afScPj-c
- https://www.youtube.com/watch?v=C05yF9EI8Uo
- https://www.youtube.com/watch?v=DaxcKvwW7LI
- https://www.youtube.com/watch?v=DbJGFSi1FKo
- https://www.youtube.com/watch?v=H-AXCQQ8sCs
- https://www.youtube.com/watch?v=ILxhYQ1BHc0
- https://www.youtube.com/watch?v=KCOcnYpCD0s
- https://www.youtube.com/watch?v=KQoTIplV_QA
- https://www.youtube.com/watch?v=LLww3vy8_1Y
- https://www.youtube.com/watch?v=LY9-0Dk-YHk
- https://www.youtube.com/watch?v=MS-4g3ZHyXk
- https://www.youtube.com/watch?v=NrooRPC9cog
- https://www.youtube.com/watch?v=OBU3MtaoKb4
- https://www.youtube.com/watch?v=OWqEWyFiN34
- https://www.youtube.com/watch?v=PoXfW1ZVeBI
- https://www.youtube.com/watch?v=Q33b5tX5vPQ
- https://www.youtube.com/watch?v=SjycM4h_5r0
- https://www.youtube.com/watch?v=SwxTLoWn5e4
- https://www.youtube.com/watch?v=TvaVH-CWZRM
- https://www.youtube.com/watch?v=U3wdapNPbaY
- https://www.youtube.com/watch?v=ULiNF7HcIV4
- https://www.youtube.com/watch?v=Vmob0mzcINg
- https://www.youtube.com/watch?v=WZi5Jum_mmo
- https://www.youtube.com/watch?v=Ya-6NCCKmTg
- https://www.youtube.com/watch?v=ZLs3zuAooBs
- https://www.youtube.com/watch?v=ZjLMtG7irg8
- https://www.youtube.com/watch?v=_Dh7tza0XJk
- https://www.youtube.com/watch?v=__LRg8KrYQ8
- https://www.youtube.com/watch?v=akWLnghZb8c
- https://www.youtube.com/watch?v=c7slNfcHmig
- https://www.youtube.com/watch?v=cdCN8UQOvn8
- https://www.youtube.com/watch?v=chb66dBOt74
- https://www.youtube.com/watch?v=dWuinQ0k8pg
- https://www.youtube.com/watch?v=er8ZbvFLmMA
- https://www.youtube.com/watch?v=ezBiZ-_5E2Y
- https://www.youtube.com/watch?v=gOn-T6LlNHk
- https://www.youtube.com/watch?v=ge7dEnjp6MU
- https://www.youtube.com/watch?v=gm9uYnMw9KA
- https://www.youtube.com/watch?v=gy1Vt3pxX8U
- https://www.youtube.com/watch?v=iD_AeCbzvJI
- https://www.youtube.com/watch?v=iTrJGQAZg-o
- https://www.youtube.com/watch?v=ioOcGz6P_PQ
- https://www.youtube.com/watch?v=jry663Tx5bg
- https://www.youtube.com/watch?v=kM-HTagymSM
- https://www.youtube.com/watch?v=mODHEazeQr8
- https://www.youtube.com/watch?v=ocRhdbfZ798
- https://www.youtube.com/watch?v=qbLoTbAPNi4
- https://www.youtube.com/watch?v=qcI5CBbQ2vE
- https://www.youtube.com/watch?v=rVg3fr3OrPA
- https://www.youtube.com/watch?v=tg8sn2ZC2CY
- https://www.youtube.com/watch?v=uHMLby5KwZI
- https://www.youtube.com/watch?v=uJX02s3DmfM
- https://www.youtube.com/watch?v=v4gb6uKa5SQ
- https://www.youtube.com/watch?v=wIRXoX8nd0I
- https://www.youtube.com/watch?v=xFO_ntoDVBY
- https://www.youtube.com/watch?v=yDq17RUC8fs
- https://www.youtube.com/watch?v=yEjHJb-SpjQ
- https://www.youtube.com/watch?v=yQH90XJtxTY
