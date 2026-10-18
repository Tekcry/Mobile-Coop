"""The flush magnetic quick-release buckle (step 08b, kit `magBuckle`; SPEC 3.2, ART-DIRECTION 9.1): every strap
closure on Wren. Two gunmetal halves meet on a split line across the strap, on a rubber-edged base; one pull parts
them, silently (no spring, no latch to click). Parametric in the strap width (20-40 mm); steps 09 and 09b reuse it.

- Base: a rubber pad a little larger than the halves (the rubber edge round the metal), 1.4 mm.
- Halves: two satin-matte anodised blocks (the one gunmetal finish), crowned 0.4 mm, rounded edges (one radius),
  split by a 0.7 mm line; the strap end is bonded into the near half, the far half is bonded to its anchor.
- Wear: the anodised finish wears through on the sharpest edges (materials.anodised, pointiness), and the 'edge'
  attribute (distance to the nearest box edge) is written for the rubber.

Frame: O on the mounting surface, `along` the strap, `across` it, `n` out. Not a separate module name from the
hardware helper's `py/hardware/` package on purpose (the step file).
"""
import numpy as np

import fitted as FT
import head_common as HC
import torso_common as TC

KIT = 'magBuckle'
BASE_T = 0.0014
HALF_T = 0.0024
SPLIT = 0.0007
RIM = 0.0015          # rubber showing round the metal


def size(strap_w):
    """(width across, length along) of the metal for a strap width (clamped to 20-40 mm)."""
    w = float(np.clip(strap_w, 0.02, 0.04))
    return w + 0.004, 0.55 * w + 0.012


def build(metal, rubber, O, along, across, n, strap_w):
    """Adds one buckle. metal, rubber: (V, F, E) lists (E: per-vertex edge distance, padded by the caller). Returns
    {'top': height of the metal's top over O, 'half': (across, along) half sizes of the base, 'near': the centre of the
    near half (the strap end's side, -along), 'far': the far half's centre}."""
    along, n = FT.unit(np.asarray(along, float)), FT.unit(np.asarray(n, float))
    across = FT.unit(np.cross(n, along)) if across is None else FT.unit(np.asarray(across, float))
    O = np.asarray(O, float)
    w, L = size(strap_w)
    ax = [across, along, n]
    Vr, Fr, Er = rubber
    hb = (w / 2 + RIM, L / 2 + RIM, BASE_T / 2)
    cb = O + n * (BASE_T / 2)
    rng = HC.rbox(Vr, Fr, cb, ax, hb, 0.0006, step=0.0015)
    Er.extend(TC.rbox_edge(Vr, rng, cb, ax, hb))
    hh = (w / 2, (L - SPLIT) / 4, HALF_T / 2)

    def crown(Lp):
        Lp = Lp.copy()
        top = Lp[:, 2] > 0
        Lp[top, 2] += 0.0004 * np.clip(1 - (Lp[top, 0] / hh[0]) ** 2, 0, 1)
        return Lp
    Vm, Fm, Em = metal
    out = {}
    for key, s in (('far', 1.0), ('near', -1.0)):
        c = O + n * (BASE_T + HALF_T / 2 - 0.0002) + along * s * (SPLIT / 2 + hh[1])
        rng = HC.rbox(Vm, Fm, c, ax, hh, 0.0011, step=0.0012, deform=crown)
        Em.extend(TC.rbox_edge(Vm, rng, c, ax, hh))
        out[key] = c
    out.update({'top': BASE_T + HALF_T + 0.0002, 'half': (hb[0], hb[1])})
    return out
