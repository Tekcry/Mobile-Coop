# Guard render: shared guard GPU buffers (S7)
kind: patch
- Guards of the same look now share one copy of the merged body's static GPU vertex and index buffers (per LOD
  level) instead of uploading their own; colour, thermal heat, skeleton and culling box stay per guard
  (`src/player/smoothBody.ts`). A grunt's buffers go from about 1.34 MB to 0.28 MB a guard after the first of its
  look (24 guards of one look: about 32 MB -> 8 MB). No look change.
