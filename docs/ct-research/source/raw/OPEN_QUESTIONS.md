# OPEN_QUESTIONS

There are two kinds of entry.
- **R-xx (research gaps).** Facts about the original co-op mode that could not be confirmed. Each has a status:
  - **CLOSED:** answered, mainly from primary game files (see `research_notes/gap_closing_gamefiles.md`).
  - **UPGRADED:** part-answered.
  - **OPEN:** still needs a human to check videos or a physical copy.
- **D-xx (design decisions).** Choices the new game must make. They are not decided here; the options and trade-offs are in DESIGN_BIBLE.md, "Decisions the game must make".

**Assumptions logged during the run:**
- The Xbox/PC version is treated as the reference build. PS2/GC and handheld versions are documented separately.
- Where the strategy guide and the game's own text disagree, the game text wins.
- Unwatched videos are cited only through their titles, descriptions and comments.

---

## Research gaps

| ID | Question | Status | What is now known / what is left |
|---|---|---|---|
| R-01 | PC order of the two downloads | CLOSED | The PC readme lists UN HQ then Nuclear Plant; both are Mission-mode only, so players choose the order. The briefing text is byte-identical to Xbox (not rewritten). |
| R-02 | Is the remote hack/scan device usable in co-op? | OPEN | It is bound to a key and a button in the co-op controls, and nothing disables it. Check in-game. |
| R-03 | Adrenaline count and the both-down rule | CLOSED for Xbox/PC | One syringe per agent, two revives per team (in-game training text). Still open: the PS2/GC count, and what happens if both agents are down at once. |
| R-04 | Did Share Equipment ship? | CLOSED | Yes. Only its training note was unused (designer comment). |
| R-05 | PS2/GC Team Training layout and move order | UPGRADED | Fragments from player comments: the wall boost, the ladder re-press, a throw at an enemy, the last area needs one player. The full order is unknown. Watch a PS2/GC video. |
| R-06 | How the AI treats two intruders (shared knowledge, separate searches) | OPEN | No source found. |
| R-07 | Checkpoints per platform | CLOSED | Xbox/PC: no automatic checkpoints; manual Quick Save/Save/Load from pause, which waits for the partner and reloads only with the same teammate. PS2/GC: saves only between sub-levels. |
| R-08 | Friendly fire | UPGRADED | Xbox has a match option. PC has no menu option and its settings default to on. Check on PC in-game. |
| R-09 | Must both agents reach extraction? | OPEN | Extraction places and an extraction interaction volume are known. A PS2 training hint suggests only one player is needed. Check in-game. |
| R-10 | Does difficulty change guard perception? | OPEN | Names are Normal / Hard / Expert. No text on what changes. |
| R-11 | Map and partner marker | UPGRADED | Every co-op map has a mission-device map page, and intel updates both devices. The map legend has no teammate entry. Whether the partner is shown is unknown. |
| R-12 | Co-op designers | CLOSED | The PC credits video lists the co-op team (see `03` §12 and `gap_closing_gamefiles.md`). Nuclear Plant may be by another (Italian) studio [UNCERTAIN]. |
| R-13 | PC split-screen | CLOSED | No. The PC menu is LAN / Online / Settings only. |
| R-14 | Panama briefing framing | CLOSED for Xbox/PC | Canal-inspection bribery, with a bonus objective about other uninspected ships. PS2/GC framing ("immigration bribes", guide only) is unchecked. |
| R-15 | Seoul 90% rating cap | UPGRADED | The cap is a known bug (Chemical Bunker caps at 97%). The cause is unknown. |
| R-16 | Chemical Bunker serum | UPGRADED | The blood type (A/B/O) is randomised per run and read from the protocol note. Vial count still unstated. |
| R-17 | Train Station informant and codes | UPGRADED | 9201 = locker, 0315 = key code (from a joint interrogation). He must not die early. A scripted death afterwards is likely [UNCERTAIN]. |
| R-18 | PS2/GC Train Station grenade type (frag vs flash) | OPEN | No new data. |
| R-19 | Nuclear Plant route | UPGRADED | The route sequence comes from the controller's text (see the mission file §14). Open: how the scanner doors are passed, where the co-op moves are, guard placement. |
| R-20 | UN HQ route | UPGRADED | Rappel to the window-washing platform; cameras already off; control room on floor 22; timer warnings at 20/10/5/1 min. Open: the "lit windows" rule, the defusal method, the colonel takedown, when the timer starts. |
| R-21 | Co-op music | CLOSED for missions | Each map uses the common set plus one solo stem set (see 15 §7). No co-op score. Menu music not identified. |
| R-22 | Does partner voice fade with in-game distance? | OPEN | The mic fed the guards' sound meter (VERIFIED). Partner-to-partner falloff is never mentioned. |
| R-23 | N-Gage/DS co-op details | OPEN | Room layouts, device effects, roles, scoring. Watch the DS video listed in `research_notes/mission_ngage_ds.md`. |

---

## Design decisions

All 14 were decided by the user on 2026-10-18. The trade-offs are kept in DESIGN_BIBLE.md §12.

| ID | Decision | Choice |
|---|---|---|
| D-01 | Setting / era | **Modern day** |
| D-02 | Alarm rule | **Escalating alert tiers, no abort**, plus at most one signposted hard rule per mission |
| D-03 | Failure and revive | **30-second revive, 2 per mission**; encounter checkpoints cap replay loss at about 10 min; both down = reload the last checkpoint |
| D-04 | Violence | **Scored.** Lethal and non-lethal both allowed; non-lethal and ghost play rewarded; no forced kills |
| D-05 | Lethal automated defences | **Only at military or private compounds**; elsewhere, realistic responses |
| D-06 | Proximity voice | **Opt-in modifier.** Off by default, visible and tunable |
| D-07 | Athletic tone | **Heightened.** Partner Launch, Drop Line and other showpiece moves allowed alongside grounded ones |
| D-08 | Difficulty scaling | **Perception, alert tolerance and resources** scale. Sync timing windows do not |
| D-09 | Player count | **Strictly two humans**; no AI partner, no solo variants |
| D-10 | Connectivity | **Online, split-screen and LAN**; no cross-play commitment |
| D-11 | Character model | **Identical characters with complementary per-mission kits** |
| D-12 | Partner awareness | **Follow the original: partner beacon (distinct light colour per player) + world pings.** No partner marker, and no live partner position on any map. The original had no documented marker; its map page appears to be a static image (R-11) |
| D-13 | Story framing | **Standalone co-op story** |
| D-14 | Camera | **Over-the-shoulder, strict corner-peek** (the camera sees little the character cannot) |

### Further decisions (from research gaps, decided by the user 2026-10-18)

Each comes from a gap in the research about the original. The new game's rule is set here whatever the original did.

| ID | From | Decision | Choice |
|---|---|---|---|
| D-15 | R-09 | Extraction | **Both players must reach the exit** to finish a mission |
| D-16 | R-06 | AI knowledge of two intruders | **Guards know only what they saw.** The shared alert tier rises, but no one "knows" a second intruder exists until one is seen or evidence suggests it |
| D-17 | R-22 | Partner voice | **Always clear** (earpiece model). It does not fade with distance; guard hearing is separate (D-06) |
| D-18 | R-08 | Friendly fire | **Host option, on by default** |
| D-19 | R-02 | Remote hacking tool | **None.** All hacking is hands-on |
| D-20 | R-16 | Randomised solutions | **Some per run.** Codes, items or rooms vary and must be read in-world |
| D-21 | R-20 | Lit windows | **Systemic.** Lit windows expose anyone in them, both ways; dark rooms hide |
| D-22 | R-17 | Story-critical characters | **Protected until their role is done.** Killing them earlier fails the mission, with clear warning |
| D-23 | R-15 | Perfect rating | **No kills + no alarms + all primary objectives.** Optional objectives are bonus; every mission must be testably 100%-able |
| D-24 | R-07 | Resuming saves | **Any partner can join** a saved mission; progress belongs to the host |
| D-25 | R-17 | Two-person questioning | **Yes, non-violent.** One player distracts or bluffs while the other reads a device or reaction |

R-05, R-18 and R-23 are purely historical and have no bearing on the new game.
