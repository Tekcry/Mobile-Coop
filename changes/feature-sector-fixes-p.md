# Sector Ops laser power panels
kind: minor
- (sector-fixes P, Michael item 6) Every laser has a power panel nearby, out of plain sight and hard to reach; jamming
  the panel (the pistol jammer: 5 s at most, 5 s cooldown, stand still, a clear line) cuts every laser it powers for
  the jam and its 1.5 s reboot. The beams themselves are no longer jam targets (A1).
- Sector Ops: four panels. Workshop: in the office void, jammed from the catwalk through its opening. Plant deck: in the
  slot behind the AHU, jammed round its corner from the deck's south-west corner. VNA aisle: on top of R2N, jammed from
  R1N's top. Mezzanine (both deck lasers): under the deck behind the parts store's back shelf, jammed along the slot. A
  panel of a section that is not live is dark like its lasers.
- Marlow Yard station 4: the panel is high on the far side's south wall, jammed diagonally through the gap from the near
  side's north half; the throw and the release stay the taught route. Walkthrough and spec updated.
- The panel is a small procedural wall box (housing, door seam, hinge, label, conduit) with a status LED: green
  powered, cyan blink jammed, amber rebooting, dark when dead or released. Electro vision highlights it.
- The laser trip radio line now says to jam its power panel (electro shows it).
- Co-op: the panel rides the existing jam claim and device timelines; PROTOCOL_VERSION 28 -> 29 (the jam ids name
  panels, not lasers).
