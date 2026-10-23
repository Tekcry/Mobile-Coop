"""Every gear builder by piece id, and a pure dry run (no Blender) for budgets and bounds:
`<blender python> scripts/operators/py/gear/pieces.py <guards.json> [base ...]` prints tris against each piece's LOD0
budget for every (base, piece), and exits 1 when one is over or fails to build.
"""
import json
import os
import sys

if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from gear import headwear, helmet, kit, shield, torso    # noqa: E402
from gear.fit import FIT, Fit                             # noqa: E402
from gear.mesh import Piece                               # noqa: E402

BUILDERS = {**headwear.BUILDERS, **helmet.BUILDERS, **torso.BUILDERS, **shield.BUILDERS, **kit.BUILDERS}
SHIELD_BASE = 'broad'     # the shield is one job (own GLB): built on the enforcer's base


def kit_entry(kit, piece_id):
    for p in kit.get('pieces', []):
        if isinstance(p, dict) and p.get('id') == piece_id:
            return p
    raise SystemExit(f'gear: piece "{piece_id}" is not in the kit')


def build(piece_id, fit, entry):
    if piece_id not in BUILDERS:
        raise SystemExit(f'gear: no builder for "{piece_id}" (kind {entry.get("kind")}); outfits are the garments stage')
    P = Piece(piece_id)
    BUILDERS[piece_id](P, fit, entry)
    undeclared = set(P.bones()) - set(entry.get('bones') or [])
    if undeclared:
        raise SystemExit(f'gear: {piece_id} uses bones {sorted(undeclared)} not declared in the kit {entry.get("bones")}')
    return P


def main(argv):
    with open(argv[0], encoding='utf-8') as fh:
        kit = json.load(fh)
    bases = argv[1:] or list(FIT)
    env = (kit.get('face') or {}).get('envelopeOffset', 0.015)
    bad = 0
    for p in kit['pieces']:
        if p['id'] not in BUILDERS:
            continue
        for b in ([SHIELD_BASE] if p.get('ownGlb') else bases):
            try:
                P = build(p['id'], Fit(b, env), p)
                t, cap = P.tris(), p['tris'][0]
                lo, hi = P.bounds()
                flag = 'ok ' if t <= cap else 'OVER'
                bad += t > cap
                print(f'{flag} {b:8s} {p["id"]:17s} {t:5d} / {cap:5d}  parts {len(P.parts)}  bones {",".join(P.bones())}  '
                      f'size {hi[0]-lo[0]:.3f} x {hi[1]-lo[1]:.3f} x {hi[2]-lo[2]:.3f}  z {lo[2]:.3f}..{hi[2]:.3f}')
            except SystemExit as err:
                bad += 1
                print(f'FAIL {b} {p["id"]}: {err}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
