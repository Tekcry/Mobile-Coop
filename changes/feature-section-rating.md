# Section rating: four marks, rewards and best records
kind: minor
- Sector Ops sections and Marlow Yard sets A2-A8 are rated on four marks: undetected, no kills, no alarms and bodies hidden. Each mark you earn counts once, so a clean section scores 4 of 4.
- Each mark pays a reward. Undetected gives a gadget charge. No kills gives a medkit heal. No alarms gives a syringe (a medkit heal when you play solo). Bodies hidden gives a gadget charge.
- Rewards never go over the usual carry limits.
- Synced takedowns pay more in co-op. A synced takedown is two players taking down guards within 1.5 seconds. Each one pays a gadget charge and a syringe, up to two paid takedowns per section.
- A card shows after each rated section, on the host and on the client. It lists each mark as earned or missed, and the reward you got. It hides by itself after about 4 seconds.
- The last section of an op or course shows no card. Its rating goes to the results screen.
- Each section is rated once, when you leave it. A restart does not rate it again.
- Your best marks per section are saved. More marks wins. A tie goes to more synced takedowns.
- The Sector Ops select screen shows each section's best marks as four pips. Unrated sections show no pips. Marlow Yard saves best marks too, but its select screen does not show them yet.
- The results screen lists every rated section in order, with its marks (for example 4/4) and its synced count.
- Co-op wire: protocol 42. The section rating adds the `rt` field to the sector and course messages and `rh` to the course message. It rides marlow-final's 42 (one bump per train), so host and client must both run 42. Builds on 41 and below are refused.
