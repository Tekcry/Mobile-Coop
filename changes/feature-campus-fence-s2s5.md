# Saltmarsh Park S2-S5 perimeter leaks
kind: patch
- Sector Ops (v2 layout, sections 2-5): you can no longer get out of the campus. The HQ roof's low parapet could be
  climbed and dropped off on every side, and the sunshade under the window-cleaning rope could be walked off. In the
  labs a climb in the crawl space under the roof came up through it onto the roof and over the edge. On the data hall,
  the corners of the plant deck and the generator yard's tanks and generator led over the yard walls. At the Old House
  the roof vents, the low roof's vents and its north-east corner led over the parapets and the estate wall. These edges
  now have invisible anti-climb caps (no change to the look, lighting or cover), and the sunshade has an invisible catch
  so letting go of the rope at the end of a swing still lands on it. A new test checks walking and climbing out of every
  section (`tests/campusV2Perimeter.test.ts`).
