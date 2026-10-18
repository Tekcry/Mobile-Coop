# CT co-op research - decisions to record at merge (2026-10-18)

These become G entries in docs/DECISIONS.md, with the next free G numbers, when this branch merges (another branch,
feature/operators, is also adding G123 onward, so numbers are assigned at merge time). Michael chose "today's answers
win": where an entry below differs from G1 ("pure CT") or an earlier G entry, the entry below wins. Each must also be
written into the bible (G86).

## Michael's design decisions D-01 to D-25 (research session, 2026-10-18; verbatim choices)
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

## Michael's answers in this session (native multiple-choice, 2026-10-18)
| Topic | Michael's pick | Replaces |
| --- | --- | --- |
| Prototype order | "CT movement first" | the recommended co-op-first order |
| Team moves | "Anywhere with room": free moves wherever the space allows, with a prompt naming the move | G81 (marked boost spots only) |
| Jammer | "Yes, held jammer": the held pistol jammer (one light, camera or laser; charge drains; stand still) replaces the thrown EMP | the EMP gadget; sharpens G76's disruptor |
| Kits | "Fixed per mission": complementary kits issued per mission (D-11) | G105 (Stealth / Assault / Recommended choice) |
| Raw research | "Digests only": master gets the scrubbed digests; the raw files are kept as the tag archive/ct-research-raw | - (G6 holds) |
| Heavies | "Adopt CT's way": no heavy or dog archetypes in co-op missions; armour and helmets come with alarm stages | G42's heavies exception, G49's heavies part |
| Voice chat | "After the prototype" (D-06, D-17 built later) | - |
| Level standard | "Review list later": the 12 proposed changes (design-kit-digest appendix) come to Michael item by item before the first real mission map | - |

## Research facts that correct earlier entries (Michael to confirm at the plan review)
- G78 says CT has no co-op tutorial: CT had one in both builds (moves-mechanics-digest). Its drill order is a template
  for the bunker rebuild (G79).
- G110 (no rope climb) vs CT's two-person rope where the partner climbs the held rope (belay line; after the prototype).
- G106 vs D-08: alert tolerance scales with the fixed difficulty levels (not a setting).
- G119 medkits: CT's wall cabinets healed full on Normal, 50 % on Hard, less on Expert, probably single use (solo
  sources). Proposal: single use, heal by difficulty.
- G52's "brace" and "dual takedown" moves: CT had no brace, and its double takedown was two ordinary takedowns timed
  together.
- G11: kept (CT has them): guards relight lamps and investigate dead lights, impromptu paired searches, eavesdropping,
  lock picking with a noise cost, adaptive music. Dropped: the last-known-position marker, the remote digital layer, the
  under-3-second retry target, the after-action route map (kit-design-digest section 5).
