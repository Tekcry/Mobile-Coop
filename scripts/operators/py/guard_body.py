"""Guard base body fit (guard-models G1, docs/guard-models/PLAN.md G1, SPEC sections 1, 6, 7): numpy only, no bpy, so
the heads (G1h) can reuse the same fit and seam.

Wren's method (build_body.py, which stays untouched) on a male MakeHuman body from the kit's macro sliders:
1. The kit base's macro (guards.json `bases[].macro`), plus G1's build on top (SPEC 1: "G1 raises shoulder and chest
   girth and the neck"): fixed pectoral / latissimus mass, and the shoulder-muscle and neck-circumference targets solved
   so the bideltoid breadth and the neck girth hit their targets.
2. Linear blend skinning onto the base's game skeleton (joints/guard-<base>.json from the prep stage): every game bone
   maps its MakeHuman segment onto its own; the A-pose bind (D13) keeps the game's bone lengths in MakeHuman's limb
   directions.
3. A smooth torso height field solves hips, waist, chest depth and chest girth; the head bone's breadth / depth scale
   solves the head. Targets: the rig's proportions (proportions(build, height): what the hit volumes follow) and, for
   the girths G1 raises, ANSUR II male means scaled by stature and the build's chest / girth mods.
4. Skin weights: the CC0 default rig summed onto the 31 deform bones (19 game bones, clavL / clavR by the anim-skeleton
   split moved onto the guard's size, one bone per finger), the neck seam's blend, 4 influences.
5. The neck seam (SPEC 7): the hm08 neck edge loop nearest `at` (0.45) of the way from the neck joint to the head
   joint; the body keeps the faces below it, the head (G1h) the faces above. Seam vertices are shared by hm08 index.
"""
import math

import numpy as np

import mh

GAME_BONES = ['pelvis', 'spine', 'chest', 'neck', 'head', 'shL', 'elL', 'wrL', 'shR', 'elR', 'wrR',
              'hipL', 'knL', 'anL', 'toeL', 'hipR', 'knR', 'anR', 'toeR']
# Wren's finger joint scheme `finger<S>_<f>_<seg>` (src/anim/fingers.ts FINGER_RE; 1 = thumb), one segment per finger
FINGERS = [f'finger{s}_{f}_1' for s in 'LR' for f in range(1, 6)]
# The thumb's base flex axis (fingers.ts THUMB_AXES[0], opposition across the palm) as Wren's hero file has it, in the
# hand frame (c = n x along, along = wrist to the middle knuckle, n = the back of the hand), game frame; measured from
# src/operators/assets/wren/wren-hero.glb (fingerS_1_1's bind rotation). The guard's one thumb bone is rolled so its
# THUMB_AXES[0] lands on it, so fingers.ts drives the guard thumb as Wren's.
WREN_THUMB_FLEX = {'L': (-0.399, -0.408, -0.821), 'R': (-0.399, 0.408, 0.821)}
THUMB_AXIS0 = (-0.96, -0.15, -0.25)   # fingers.ts THUMB_AXES[0] (right hand; the left mirrors x, -y, -z)
DEFORM_BONES = GAME_BONES + ['clavL', 'clavR'] + FINGERS
CHILD = {'pelvis': 'spine', 'spine': 'chest', 'chest': 'neck', 'neck': 'head', 'shL': 'elL', 'elL': 'wrL',
         'wrL': 'handL', 'shR': 'elR', 'elR': 'wrR', 'wrR': 'handR', 'hipL': 'knL', 'knL': 'anL', 'anL': 'toeL',
         'hipR': 'knR', 'knR': 'anR', 'anR': 'toeR'}
TORSO = ('pelvis', 'spine', 'chest', 'neck', 'head')
LIMB_CHAINS = [['shL', 'elL', 'wrL', 'handL'], ['shR', 'elR', 'wrR', 'handR'],
               ['hipL', 'knL', 'anL', 'toeL'], ['hipR', 'knR', 'anR', 'toeR']]
ARM_BONES = ('shL', 'elL', 'wrL', 'shR', 'elR', 'wrR')

# G1's build on top of the kit macro. Fixed: chest mass that reads at 8 m. Solved (weights in [-1, 1], incr above 0):
# the deltoids to the bideltoid target, the neck to the neck girth target.
FIXED_TARGETS = {'torso/torso-muscle-pectoral': 0.35, 'torso/torso-muscle-dorsi': 0.3}
SOLVED_TARGETS = {
    'shoulders': ['arms/l-upperarm-shoulder-muscle', 'arms/r-upperarm-shoulder-muscle'],
    'neck': ['neck/measure-neck-circ'],
}
# ANSUR II male means (stature 1.756 m): chest circumference 1.056 m, neck circumference 0.398 m. Bideltoid: the rig's
# shoulder width (0.49 at 1.75 m, already ANSUR) raised 4 % (G1: shoulder girth up).
ANSUR_STATURE = 1.756
ANSUR_CHEST = 1.056
ANSUR_NECK = 0.398
SHOULDER_UP = 1.04
BUILD_CHEST = {'average': 1.0, 'lean': 0.92, 'athletic': 1.07, 'broad': 1.13}   # proportions.ts BUILD_MODS chest
BUILD_GIRTH = {'average': 1.0, 'lean': 0.88, 'athletic': 1.05, 'broad': 1.15}   # proportions.ts BUILD_MODS girth
# SPEC 7: head share of the neck + head weight on the rings round the seam (negative: the body side)
SEAM_BLEND = {-2: 0.1, -1: 0.3, 0: 0.5, 1: 0.7, 2: 0.9}
# where the neck girth is taken (fraction of the way from the neck joint to the head joint; below the seam)
NECK_GIRTH_AT = 0.25


def rot_between(a, b):
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    v = np.cross(a, b)
    c = float(np.dot(a, b))
    if np.linalg.norm(v) < 1e-9:
        return np.eye(3)
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx * (1.0 / (1.0 + c))


def hull_perimeter(pts):
    """Perimeter of the 2D convex hull (a tape measure round a section). Andrew's monotone chain."""
    p = sorted(set(map(tuple, np.round(pts, 6))))
    if len(p) < 3:
        return 0.0

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, hi = [], []
    for q in p:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], q) <= 0:
            lo.pop()
        lo.append(q)
    for q in reversed(p):
        while len(hi) >= 2 and cross(hi[-2], hi[-1], q) <= 0:
            hi.pop()
        hi.append(q)
    h = np.array(lo[:-1] + hi[:-1])
    return float(np.linalg.norm(h - np.roll(h, -1, axis=0), axis=1).sum())


def mh_bone_to_deform(n):
    """A MakeHuman default-rig bone -> the guard deform bone that takes its weight (clavicles split later)."""
    side = 'L' if n.endswith('.L') else 'R' if n.endswith('.R') else ''
    base = n[:-2] if side else n
    if base in ('spine05', 'spine04', 'pelvis', 'root'):
        return 'pelvis'
    if base == 'spine03':
        return 'spine'
    if base in ('spine02', 'spine01', 'clavicle', 'breast'):
        return 'chest'
    if base.startswith('neck'):
        return 'neck'
    if base in ('shoulder01', 'upperarm01', 'upperarm02'):
        return f'sh{side}'
    if base.startswith('lowerarm'):
        return f'el{side}'
    if base == 'wrist' or base.startswith('metacarpal'):
        return f'wr{side}'
    if base.startswith('finger'):
        return f'finger{side}_{base[6]}_1'   # finger3-2 -> finger<side>_3_1: one bone per finger (SPEC 6)
    if base.startswith('upperleg'):
        return f'hip{side}'
    if base.startswith('lowerleg'):
        return f'kn{side}'
    if base == 'foot':
        return f'an{side}'
    if base.startswith('toe'):
        return f'toe{side}'
    return 'head'


def fold_game(bone):
    """Deform bone -> the game bone whose map shapes the mesh (fingers ride the wrist, clavicles the chest)."""
    if bone.startswith('finger'):
        return 'wr' + bone[6]
    if bone.startswith('clav'):
        return 'chest'
    return bone


# --------------------------------------------------------------------------------------------------------- topology
class Topology:
    """Edges and faces of the hm08 'body' faces: edge loops round the neck and the head / body split at a loop."""

    def __init__(self, faces):
        self.faces = faces
        self.nbr = {}
        self.edge_faces = {}
        for fi, f in enumerate(faces):
            for a, b in zip(f, f[1:] + f[:1]):
                self.nbr.setdefault(a, set()).add(b)
                self.nbr.setdefault(b, set()).add(a)
                self.edge_faces.setdefault(frozenset((a, b)), []).append(fi)

    def opposite(self, prev, cur):
        """The edge leaving `cur` straight on from (prev, cur) on a 4-valence quad vertex, else None."""
        nb = self.nbr.get(cur, set())
        if len(nb) != 4:
            return None
        side = set()
        for fi in self.edge_faces.get(frozenset((prev, cur)), []):
            f = self.faces[fi]
            i = f.index(cur)
            side.add(f[i - 1])
            side.add(f[(i + 1) % len(f)])
        rest = nb - side - {prev}
        return next(iter(rest)) if len(rest) == 1 else None

    def walk(self, v0, v1, limit=400):
        loop = [v0, v1]
        while len(loop) < limit:
            n = self.opposite(loop[-2], loop[-1])
            if n is None:
                return None
            if n == v0:
                return loop
            if n in loop:
                return None
            loop.append(n)
        return None

    def split(self, seam, top_vertex):
        """Face indices above the seam loop (connected to `top_vertex`'s faces without crossing a seam edge)."""
        seam_edges = {frozenset((a, b)) for a, b in zip(seam, seam[1:] + seam[:1])}
        start = [fi for fi, f in enumerate(self.faces) if top_vertex in f]
        seen = set(start)
        stack = list(start)
        while stack:
            fi = stack.pop()
            f = self.faces[fi]
            for a, b in zip(f, f[1:] + f[:1]):
                e = frozenset((a, b))
                if e in seam_edges:
                    continue
                for g in self.edge_faces[e]:
                    if g not in seen:
                        seen.add(g)
                        stack.append(g)
        return seen


def neck_loops(topo, V, neck_y, head_y, axis_z):
    """Closed edge loops round the neck between the neck and head joints (game frame V), keyed by their vertex set.
    Started on the back midline (unambiguous: the front runs under the jaw), each walked both ways round."""
    loops = {}
    y_max = neck_y + 0.8 * (head_y - neck_y)   # stay off the skull
    for v0 in topo.nbr:
        x, y, z = V[v0]
        if abs(x) > 1e-5 or z > axis_z or not (neck_y - 0.02 < y < y_max):
            continue
        for v1 in topo.nbr[v0]:
            d = V[v1] - V[v0]
            if abs(d[0]) < 2 * abs(d[1]) or d[0] < 0:
                continue   # sideways edge only, one direction
            lp = topo.walk(v0, v1)
            if lp is None or len(lp) < 12:
                continue
            P = V[lp]
            r = np.hypot(P[:, 0], P[:, 2] - axis_z)
            if r.max() > 0.13 or np.ptp(P[:, 1]) > 0.09:
                continue
            loops.setdefault(frozenset(lp), lp)
    return list(loops.values())


def loop_length(V, lp):
    P = V[lp]
    return float(np.linalg.norm(P - np.roll(P, -1, axis=0), axis=1).sum())


# --------------------------------------------------------------------------------------------------------- the fit
def targets_for(P, H, build):
    """What the fit aims at, metres. Rig proportions for the shape the hit volumes follow, ANSUR for G1's girths."""
    k = H / ANSUR_STATURE
    return {
        'stature': H,
        'hipW': P['pelvis']['w'], 'hipD': P['pelvis']['d'],
        'waistW': P['waist']['w'], 'waistD': P['waist']['d'],
        'chestD': P['chest']['d'],
        'chestGirth': ANSUR_CHEST * k * BUILD_CHEST[build],
        'shoulderWidth': P['shoulderWidth'] * SHOULDER_UP,
        'neckGirth': ANSUR_NECK * k * BUILD_GIRTH[build],
        'headW': P['head']['w'], 'headD': P['head']['d'],
    }


class GuardFit:
    """The fitted base body. After `solve()`: V (every hm08 vertex, game frame, bind pose, feet on y = 0), tgt (bind
    joints), W (deform weights per hm08 vertex over DEFORM_BONES, before the seam / 4-influence pass), measurements."""

    def __init__(self, mpfb_dir, op, macro, extra_targets=None):
        self.op = op
        self.P = op['proportions']
        self.H = op['height']
        self.build = op['build']
        self.GJ = {j['name']: np.array(j['pos'], dtype=np.float64) for j in op['joints']}
        for k, v in op['ends'].items():
            self.GJ[k] = np.array(v, dtype=np.float64)
        self.body = mh.BaseBody(mpfb_dir)
        self.macro = dict(macro)
        self.co_macro = self.body.macro(macro['gender'], macro['muscle'], macro['weight'],
                                        proportions=macro.get('proportions', 0.5))
        for rel, w in (extra_targets or {}).items():
            self.body.apply(self.co_macro, rel, w)
        for name, w in FIXED_TARGETS.items():
            self._apply(self.co_macro, name, w)
        self.body_idx = self.body.group_indices('body')
        self.floor_y = self.co_macro[self.body_idx, 1].min()
        self.mh_stature = (self.co_macro[self.body_idx, 1].max() - self.floor_y) / 10.0
        self.K = self.H / self.mh_stature
        self.target = targets_for(self.P, self.H, self.build)
        self.solved = {k: 0.0 for k in SOLVED_TARGETS}
        self.scale = {b: np.array([1.0, 1.0]) for b in TORSO}
        y = self.P['y']
        self.ctrl_y = np.array([y['hip'] - 0.15, y['hip'] - 0.04, y['waist'], y['chest'], y['shoulder'] + 0.02])
        self.field = np.ones((len(self.ctrl_y), 2))
        self._weights()
        keep = [f for f, g in zip(self.body.faces, self.body.face_group) if g == 'body']
        self.topo = Topology(keep)

    # -- helpers
    def _apply(self, co, name, w):
        if abs(w) < 1e-6:
            return
        self.body.apply(co, f'{name}-{"incr" if w > 0 else "decr"}.target.gz', abs(w))

    def to_game(self, p):
        p = np.asarray(p, dtype=np.float64)
        out = np.empty_like(p)
        out[..., 0] = -p[..., 0] * 0.1 * self.K
        out[..., 1] = (p[..., 1] - self.floor_y) * 0.1 * self.K
        out[..., 2] = p[..., 2] * 0.1 * self.K
        return out

    def _weights(self):
        mh_w = self.body.weights('default')
        nv = len(self.co_macro)
        idx = {n: i for i, n in enumerate(DEFORM_BONES)}
        W = np.zeros((nv, len(DEFORM_BONES)))
        for b, pairs in mh_w.items():
            gi = idx[mh_bone_to_deform(b)]
            for v, w in pairs:
                W[v, gi] += w
        tot = W.sum(axis=1, keepdims=True)
        self.unweighted = int((tot[self.body_idx, 0] < 1e-6).sum())
        self.W = np.divide(W, tot, out=np.zeros_like(W), where=tot > 1e-9)
        gidx = {n: i for i, n in enumerate(GAME_BONES)}
        Wg = np.zeros((nv, len(GAME_BONES)))
        for n, i in idx.items():
            Wg[:, gidx[fold_game(n)]] += self.W[:, i]
        self.Wg = Wg
        self.gidx = gidx
        not_torso = sum(Wg[:, gidx[b]] for b in ('neck', 'head') + ARM_BONES)
        self.torso_w = np.clip(1.0 - not_torso, 0.0, 1.0)
        self.arm_w = sum(Wg[:, gidx[b]] for b in ARM_BONES)

    def co(self):
        co = self.co_macro.copy()
        for name, w in self.solved.items():
            for t in SOLVED_TARGETS[name]:
                self._apply(co, t, w)
        return co

    def sources(self, V0, co):
        def mj(name):
            return self.to_game(self.body.joint(co, name))
        GJ, P, bi = self.GJ, self.P, self.body_idx
        src = {}
        for side, s in (('L', 'l'), ('R', 'r')):
            src[f'sh{side}'] = mj(f'joint-{s}-shoulder')
            src[f'el{side}'] = mj(f'joint-{s}-elbow')
            src[f'wr{side}'] = mj(f'joint-{s}-hand')
            src[f'hand{side}'] = mj(f'joint-{s}-finger-3-4')
            src[f'hip{side}'] = mj(f'joint-{s}-upper-leg')
            src[f'kn{side}'] = mj(f'joint-{s}-knee')
            src[f'an{side}'] = mj(f'joint-{s}-ankle')
            src[f'toe{side}'] = mj(f'joint-{s}-foot-1')
        hip_mid = (src['hipL'] + src['hipR']) / 2.0
        src['pelvis'] = hip_mid + np.array([0.0, GJ['pelvis'][1] - GJ['hipL'][1], 0.0])
        src['neck'] = mj('joint-neck')
        head_top = V0[bi, 1].max()
        head_c_y = head_top - P['head']['h'] / 2.0
        near = bi[np.abs(V0[bi, 1] - head_c_y) < 0.01]
        near = near[np.abs(V0[near, 0]) < 0.12]
        src['head'] = np.array([0.0, head_c_y, (V0[near, 2].max() + V0[near, 2].min()) / 2.0])
        for name in ('spine', 'chest'):
            f = (GJ[name][1] - GJ['pelvis'][1]) / (GJ['neck'][1] - GJ['pelvis'][1])
            src[name] = src['pelvis'] + (src['neck'] - src['pelvis']) * f
        self.mj = mj
        return src

    def bind_targets(self, src, hang=False):
        """Bind joints: the game's lengths in MakeHuman's limb directions (A-pose); `hang` gives the rig rest instead."""
        tgt = {k: v.copy() for k, v in self.GJ.items()}
        if hang:
            return tgt
        for chain in LIMB_CHAINS:
            for a, b in zip(chain, chain[1:]):
                length = np.linalg.norm(self.GJ[b] - self.GJ[a])
                d = src[b] - src[a]
                tgt[b] = tgt[a] + d / np.linalg.norm(d) * length
        return tgt

    def bone_maps(self, src, tgt):
        M = {}
        for b in GAME_BONES:
            c = CHILD.get(b)
            s0, t0 = src[b], tgt[b]
            if b in TORSO:
                ky = 1.0 if b == 'head' else (tgt[c][1] - t0[1]) / (src[c][1] - s0[1])
                S = np.diag([self.scale[b][0], ky, self.scale[b][1]])
                M[b] = (S, t0 - S @ s0)
                continue
            if c is None:
                continue
            d_src, d_tgt = src[c] - s0, tgt[c] - t0
            R = rot_between(d_src, d_tgt)
            u = d_src / np.linalg.norm(d_src)
            k = np.linalg.norm(d_tgt) / np.linalg.norm(d_src)
            A = R @ (np.eye(3) + (k - 1.0) * np.outer(u, u))
            M[b] = (A, t0 - A @ s0)
        for side in ('L', 'R'):
            M[f'toe{side}'] = M[f'an{side}']
        return M

    def skin(self, V0, M):
        out = np.zeros_like(V0)
        for b, (A, t) in M.items():
            w = self.Wg[:, self.gidx[b]]
            m = w > 0
            out[m] += w[m, None] * (V0[m] @ A.T + t)
        return out

    def _interp(self, yv, vals):
        cy = self.ctrl_y
        i = np.clip(np.searchsorted(cy, yv) - 1, 0, len(cy) - 2)
        t = np.clip((yv - cy[i]) / (cy[i + 1] - cy[i]), 0.0, 1.0)
        t = (1.0 - np.cos(t * math.pi)) / 2.0
        return vals[i] * (1.0 - t) + vals[i + 1] * t

    def apply_field(self, V, ref=None):
        """Torso breadth / depth scale per height (1 at the crotch and the shoulders). `ref` gives the band centres."""
        R = (V if ref is None else ref)[self.body_idx]
        cz = []
        for cy in self.ctrl_y:
            sl = R[(np.abs(R[:, 1] - cy) < 0.006) & (np.abs(R[:, 0]) < 0.2)]
            cz.append((sl[:, 2].max() + sl[:, 2].min()) / 2.0)
        cz = np.array(cz)
        yv = V[:, 1]
        sx = 1.0 + (self._interp(yv, self.field[:, 0]) - 1.0) * self.torso_w
        sz = 1.0 + (self._interp(yv, self.field[:, 1]) - 1.0) * self.torso_w
        czv = self._interp(yv, cz)
        out = V.copy()
        out[:, 0] *= sx
        out[:, 2] = czv + (V[:, 2] - czv) * sz
        return out

    # -- measurements
    def measure(self, V, Vh, tgt):
        B = V[self.body_idx]
        bi = self.body_idx
        y = self.P['y']

        def band(Y, h=0.006, xmax=0.3):
            return B[(np.abs(B[:, 1] - Y) < h) & (np.abs(B[:, 0]) < xmax)]
        waist = band(y['waist'])
        hips = np.concatenate([band(yy) for yy in np.linspace(y['hip'] - 0.09, y['hip'] + 0.01, 11)])
        torso = bi[(np.abs(V[bi, 1] - y['chest']) < 0.006) & (self.arm_w[bi] < 0.5)]
        chest = V[torso]
        headband = band(self.GJ['head'][1], h=0.01, xmax=0.15)
        # bideltoid with the arms hanging (the rig's rest): the widest point round the shoulder joints
        Bh = Vh[bi]
        sy = self.GJ['shL'][1]
        sh = Bh[(Bh[:, 1] > sy - 0.06) & (Bh[:, 1] < sy + 0.03)]
        neck_y = tgt['neck'][1] + NECK_GIRTH_AT * (tgt['head'][1] - tgt['neck'][1])
        loops = neck_loops(self.topo, V, tgt['neck'][1], tgt['head'][1], tgt['neck'][2])
        nl = min(loops, key=lambda lp: abs(V[lp, 1].mean() - neck_y)) if loops else None
        return {
            'stature': float(B[:, 1].max() - B[:, 1].min()),
            'waistW': float(np.ptp(waist[:, 0])), 'waistD': float(np.ptp(waist[:, 2])),
            'hipW': float(np.ptp(hips[:, 0])), 'hipD': float(np.ptp(hips[:, 2])),
            'chestD': float(np.ptp(chest[:, 2])), 'chestW': float(np.ptp(chest[:, 0])),
            'chestGirth': hull_perimeter(chest[:, [0, 2]]),
            'shoulderWidth': float(np.ptp(sh[:, 0])),
            'neckGirth': loop_length(V, nl) if nl else float('nan'),
            'headW': float(np.ptp(headband[:, 0])), 'headD': float(np.ptp(headband[:, 2])),
        }

    def evaluate(self):
        co = self.co()
        V0 = self.to_game(co)
        src = self.sources(V0, co)
        tgt = self.bind_targets(src)
        M = self.bone_maps(src, tgt)
        Vs = self.skin(V0, M)
        lift = -Vs[self.body_idx, 1].min()
        Vs[:, 1] += lift
        V = self.apply_field(Vs)
        Mh = self.bone_maps(src, self.bind_targets(src, hang=True))
        Vh = self.skin(V0, Mh)
        Vh[:, 1] += lift
        Vh = self.apply_field(Vh, ref=V)
        for k in tgt:
            if k != 'root':
                tgt[k] = tgt[k] + np.array([0.0, lift, 0.0])
        m = self.measure(V, Vh, tgt)
        return {'co': co, 'V0': V0, 'src': src, 'tgt': tgt, 'M': M, 'V': V, 'Vh': Vh, 'lift': lift, 'm': m}

    def solve(self, iters=18):
        T = self.target
        slope = {}
        prev = {}
        for it in range(iters):
            r = self.evaluate()
            m = r['m']
            self.field[1] *= [T['hipW'] / m['hipW'], T['hipD'] / m['hipD']]
            self.field[2] *= [T['waistW'] / m['waistW'], T['waistD'] / m['waistD']]
            self.field[3, 1] *= T['chestD'] / m['chestD']
            self.field[3, 0] *= (T['chestGirth'] / m['chestGirth']) ** 1.6
            self.scale['head'] *= np.array([T['headW'] / m['headW'], T['headD'] / m['headD']])
            for name, key in (('shoulders', 'shoulderWidth'), ('neck', 'neckGirth')):
                w = self.solved[name]
                if not np.isfinite(m[key]):
                    continue
                if name not in slope:
                    if name in prev:   # second look: the slope from the first two weights
                        dw = w - prev[name][0]
                        s = (m[key] - prev[name][1]) / dw if abs(dw) > 1e-9 else 0.0
                        slope[name] = s if abs(s) > 1e-4 else None
                    else:
                        prev[name] = (w, m[key])
                        self.solved[name] = 0.5
                        continue
                if slope[name]:
                    want = w + (T[key] - m[key]) / slope[name]
                    self.solved[name] = float(np.clip(want, -1.0, 1.0))
                    if name == 'neck' and abs(w) >= 1.0 - 1e-9 and abs(want) > 1.0:
                        # the target saturated (the weight already sat at +-1 and still wants past it): the neck bone's
                        # breadth / depth scale takes the rest. An overshoot on the way in does not count.
                        self.scale['neck'] *= T[key] / m[key]
        self.result = self.evaluate()
        self.slopes = {k: v for k, v in slope.items()}
        return self.result

    # -- after the solve
    def fingers(self):
        """One bone per finger (`finger<S>_<f>_1`, Wren's names): head at the MakeHuman MCP (thumb: CMC) joint, tail at
        the tip, carried by the wrist's map. `zAxis` (game frame, unit, normal to the bone) is the bone's local Z as
        src/anim/fingers.ts reads it: the curl axis, so a turn about +Z (right hand) / -Z (left hand) closes the finger
        toward the palm (`palm`). The thumb is rolled so fingers.ts' THUMB_AXES[0] lands on Wren's opposition axis
        (`thumbFlexDot`: how well). `dorsal`: the back of the hand."""
        r = self.result
        out = {}
        for side, s in (('L', 'l'), ('R', 'r')):
            A, t = r['M'][f'wr{side}']
            lift = np.array([0.0, r['lift'], 0.0])

            def at(name):
                return A @ self.mj(name) + t + lift   # noqa: B023
            mcp = {f: at(f'joint-{s}-finger-{f}-1') for f in range(1, 6)}
            tip = {f: at(f'joint-{s}-finger-{f}-4') for f in range(1, 6)}
            along = (mcp[3] - at(f'joint-{s}-hand'))
            along /= np.linalg.norm(along)
            across = mcp[5] - mcp[2]
            n = np.cross(across, along)
            n /= np.linalg.norm(n)
            palm_c = (mcp[2] + mcp[5]) / 2.0
            if np.dot(n, tip[1] - palm_c) > 0:   # the thumb tip sits on the palm side
                n = -n
            palm = -n
            c = np.cross(n, along)
            mx = -1.0 if side == 'L' else 1.0
            for f in range(1, 6):
                y = tip[f] - mcp[f]
                y = y / np.linalg.norm(y)
                extra = {}
                if f == 1:
                    # Z maximising (THUMB_AXES[0] in the bone frame) . Wren's axis: flex = l0 X + l1 Y + l2 Z with
                    # X = Y x Z, so flex . a = Z . (l0 (a x Y) + l2 a) + const
                    h = WREN_THUMB_FLEX[side]
                    a = h[0] * c + h[1] * along + h[2] * n
                    l0, l1, l2 = THUMB_AXIS0[0], THUMB_AXIS0[1] * mx, THUMB_AXIS0[2] * mx
                    w = l0 * np.cross(a, y) + l2 * a
                    z = w - np.dot(w, y) * y
                    z /= np.linalg.norm(z)
                    flex = l0 * np.cross(y, z) + l1 * y + l2 * z
                    extra['thumbFlexDot'] = float(np.dot(flex / np.linalg.norm(flex), a))
                else:
                    z = np.cross(y, palm) if side == 'R' else np.cross(palm, y)
                    z /= np.linalg.norm(z)
                out[f'finger{side}_{f}_1'] = {'head': mcp[f], 'tail': tip[f], 'parent': f'wr{side}', 'dorsal': n,
                                              'palm': palm, 'zAxis': z, **extra}
        return out

    def seam_transforms(self, seam):
        """How the MakeHuman frame maps onto the body frame round the neck seam (SPEC 7; for G1h / G4).
        MakeHuman frame (`V0`): GuardFit.co() (macro + G1's fixed and solved targets) through `to_game`: x negated,
        x 0.1 K, y from the hm08 floor (`floorY`, MakeHuman units). Body frame `V`: each vertex skinned by the default rig
        weights over the bone maps (neck, head: diagonal scale + translation), then lifted by `floorLift` (the torso field
        is 1 above the shoulders). `neck` / `head`: those maps with the lift folded in (p_body = A p0 + t). `similarity`:
        the best uniform scale + translation (p_body ~ s p0 + T) over the seam loop and over the whole head part, with
        the residuals that per-vertex offsets (headref - (s V0 + T)) take."""
        r = self.result
        V0, V = r['V0'], r['V']
        lift = np.array([0.0, r['lift'], 0.0])
        maps = {}
        for b in ('neck', 'head'):
            Am, tm = r['M'][b]
            maps[b] = {'matrix': np.round(Am, 6).tolist(), 'translation': np.round(tm + lift, 6).tolist()}

        def fit(idx):
            P, Q = V0[idx], V[idx]
            pc, qc = P.mean(axis=0), Q.mean(axis=0)
            dp, dq = P - pc, Q - qc
            s = float((dp * dq).sum() / (dp * dp).sum())
            T = qc - s * pc
            res = np.linalg.norm(Q - (s * P + T), axis=1)
            return {'scale': round(s, 6), 'translation': np.round(T, 6).tolist(),
                    'rmsMm': round(float(np.sqrt((res ** 2).mean())) * 1000, 3), 'maxMm': round(float(res.max()) * 1000, 3)}
        head_v = sorted({v for fi in seam['head_faces'] for v in self.topo.faces[fi]})
        return {
            'makeHuman': {'scale': 0.1 * self.K, 'flipX': True, 'floorY': float(self.floor_y), 'K': self.K},
            'floorLift': float(r['lift']),
            'neck': maps['neck'], 'head': maps['head'],
            'similarity': {'seam': fit(np.array(seam['seam'])), 'headPart': fit(np.array(head_v))},
        }

    def skin_weights(self, clav_split, seam_rings):
        """Deform weights per hm08 vertex: clavicle split, the seam blend, then the 4 largest, normalised."""
        V = self.result['V']
        W = self.W.copy()
        col = {n: i for i, n in enumerate(DEFORM_BONES)}

        def smooth(e0, e1, x):
            t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
            return t * t * (3 - 2 * t)
        if clav_split:
            share = (smooth(clav_split['x'][0], clav_split['x'][1], np.abs(V[:, 0]))
                     * smooth(clav_split['y'][0], clav_split['y'][1], V[:, 1]) * clav_split['max'])
            ch = col['chest']
            for s, sign in (('L', -1), ('R', 1)):   # game frame: left is -X
                on = (np.sign(V[:, 0]) == sign) & (W[:, ch] > 0) & (share > 1e-4)
                k = col[f'clav{s}']
                W[on, k] += W[on, ch] * share[on]
                W[on, ch] *= 1 - share[on]
        nk, hd = col['neck'], col['head']
        for ring, verts in seam_rings.items():
            h = SEAM_BLEND[ring]
            v = np.array(sorted(verts), dtype=np.int64)
            if not len(v):
                continue
            if ring == 0:
                W[v] = 0.0
                W[v, nk], W[v, hd] = 1.0 - h, h
                continue
            tot = W[v, nk] + W[v, hd]
            W[v, nk], W[v, hd] = tot * (1.0 - h), tot * h
        order = np.argsort(-W, axis=1, kind='stable')
        keep = np.zeros_like(W, bool)
        np.put_along_axis(keep, order[:, :4], True, axis=1)
        W = np.where(keep & (W > 1e-4), W, 0.0)
        s = W.sum(axis=1, keepdims=True)
        return np.divide(W, s, out=np.zeros_like(W), where=s > 1e-9)

    def neck_seam(self, at):
        """The seam loop (ordered hm08 indices), the head faces above it, and the 2 rings on each side."""
        r = self.result
        V, tgt = r['V'], r['tgt']
        y_seam = tgt['neck'][1] + at * (tgt['head'][1] - tgt['neck'][1])
        loops = neck_loops(self.topo, V, tgt['neck'][1], tgt['head'][1], tgt['neck'][2])
        if not loops:
            raise SystemExit('neck seam: no closed edge loop round the neck')
        seam = min(loops, key=lambda lp: abs(V[lp, 1].mean() - y_seam))
        bi = self.body_idx
        top = int(bi[np.argmax(V[bi, 1])])
        head_faces = self.topo.split(seam, top)
        faces = self.topo.faces
        if len(head_faces) > 0.35 * len(faces):
            raise SystemExit(f'neck seam: the head side has {len(head_faces)} of {len(faces)} faces (loop not closed off)')
        head_v = {v for fi in head_faces for v in faces[fi]}
        body_v = {v for fi, f in enumerate(faces) if fi not in head_faces for v in f}
        seam_set = set(seam)
        if not seam_set <= head_v or not seam_set <= body_v:
            raise SystemExit('neck seam: the loop is not the boundary between head and body')
        rings = {0: seam_set}
        for sign, side in ((-1, body_v - seam_set), (1, head_v - seam_set)):
            last, done = seam_set, set(seam_set)
            for k in (1, 2):
                nxt = {n for v in last for n in self.topo.nbr[v] if n in side and n not in done}
                rings[sign * k] = nxt
                done |= nxt
                last = nxt
        return {'seam': seam, 'y': y_seam, 'meanY': float(V[seam, 1].mean()), 'head_faces': head_faces,
                'rings': rings, 'perimeter': loop_length(V, seam)}
