"""Every gear builder by piece id, the gear job set from the kit, and a pure dry run (no Blender) for budgets and
bounds: `<blender python> scripts/operators/py/gear/pieces.py <guards.json> [--all] [base ...]` prints tris against each
piece's LOD0 budget for every job of the gear stage (or, with --all, every base x piece), and exits 1 when one is over
or fails to build.

The job set mirrors scripts/operators/guardBakePlan.mjs (P1 fix): a base's gear jobs are the union of its kinds'
headwear, headwear2, eyewear, fixedGear, gameplayGear and kitPool, minus outfits (garments stage) and own-GLB pieces
(the shield: one job with no base). With the P1 kit: average 12, lean 8, broad 4, shield_riot 1 (25).
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
GEAR_LISTS = ('headwear', 'headwear2', 'eyewear', 'fixedGear', 'gameplayGear', 'kitPool')


def kit_entry(kit, piece_id):
    for p in kit.get('pieces', []):
        if isinstance(p, dict) and p.get('id') == piece_id:
            return p
    raise SystemExit(f'gear: piece "{piece_id}" is not in the kit')


def own_glb(entry):
    return bool(entry.get('ownGlb')) or entry.get('perBase') is False


def base_pieces(kit, base):
    """The gear piece ids baked on `base`, in kit order: every piece one of the base's kinds can show."""
    used = set()
    for k in kit.get('kinds', []):
        if k.get('base') != base:
            continue
        for key in GEAR_LISTS:
            used.update(k.get(key) or [])
    return [p['id'] for p in kit.get('pieces', [])
            if isinstance(p, dict) and p['id'] in used and p.get('kind') != 'outfit' and not own_glb(p)]


def gear_jobs(kit):
    """[(base or None, piece)]: per base its pieces, then each own-GLB piece some kind uses, once with no base."""
    jobs = [(b['id'], p) for b in kit.get('bases', []) for p in base_pieces(kit, b['id'])]
    used = {pid for k in kit.get('kinds', []) for key in GEAR_LISTS for pid in (k.get(key) or [])}
    jobs += [(None, p['id']) for p in kit.get('pieces', []) if isinstance(p, dict) and own_glb(p) and p['id'] in used]
    return jobs


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
    every = '--all' in argv
    argv = [a for a in argv if a != '--all']
    with open(argv[0], encoding='utf-8') as fh:
        kit = json.load(fh)
    bases = argv[1:] or list(FIT)
    env = (kit.get('face') or {}).get('envelopeOffset', 0.015)
    if every:
        jobs = [(None if own_glb(p) else b, p['id']) for p in kit['pieces'] if p['id'] in BUILDERS
                for b in ([None] if own_glb(p) else bases)]
    else:
        jobs = [(b, p) for b, p in gear_jobs(kit) if b is None or b in bases]
    bad = 0
    per_base = {}
    for b, pid in jobs:
        p = kit_entry(kit, pid)
        fb = b or SHIELD_BASE
        per_base[b or pid] = per_base.get(b or pid, 0) + 1
        try:
            P = build(pid, Fit(fb, env), p)
            t, cap = P.tris(), p['tris'][0]
            lo, hi = P.bounds()
            flag = 'ok ' if t <= cap else 'OVER'
            bad += t > cap
            print(f'{flag} {fb:8s} {pid:17s} {t:5d} / {cap:5d}  parts {len(P.parts)}  bones {",".join(P.bones())}  '
                  f'size {hi[0]-lo[0]:.3f} x {hi[1]-lo[1]:.3f} x {hi[2]-lo[2]:.3f}  z {lo[2]:.3f}..{hi[2]:.3f}')
        except SystemExit as err:
            bad += 1
            print(f'FAIL {fb} {pid}: {err}')
    print(f'jobs {len(jobs)}: ' + ', '.join(f'{k} {n}' for k, n in per_base.items()) + f'; failed or over: {bad}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
