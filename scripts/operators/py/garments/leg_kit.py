"""Wren's leg kit (step 09; SPEC 5.1 "Legs"; ART-DIRECTION 9.2; concept A2, D24, D25, A40). A FITTED item over the belt.

- Right thigh: the empty holster at the game's thigh slot (weaponModel.ts: the sidearm's extents centred 0.25 m below
  the hip joint, its inner face CARRY_GAP outside rig.thighOuter, muzzle down, top forward). A slim polymer shell whose
  cavity fits the largest thigh-slot sidearm in weaponDefs.ts (the five-seven's 31 mm width, the pistols' slide and
  frame), open at the muzzle end (the suppressed pistol's barrel passes through), a retention hood shown closed over
  the rear of the slide with a gunmetal release; the shell on a moulded laminate platform (its back on the leg bands,
  its front the shell's flat back) on two elastic leg bands with magnetic buckles; a short hanger from the belt.
  The frame `pistolHolster` (empty) is the game's sidearm frame; its offset from the game's slot is reported.
- Left thigh, outer side (D28: nothing on the front of the thigh reaches the groin or the abdomen when the knee rises):
  the knife at the panel's front edge (true 190 mm, handle up, left-hand draw straight up) and three straight double
  throwable sleeves behind it (frag 2, sleeping gas 2, flashbang 2, one type per sleeve), each top canister's cap
  different by touch (knurled ring, dome, two ridges) under a shock-cord loop with a pull tab; every hard item on its
  own rigid frame with a moulded seat where the thigh falls away under it; the panel on two leg bands and a hanger.
- Skinning (D28): the holster, its platform, the thigh kit and the leg-band buckles ride one thigh bone each.
- The bands are tensioned rows on each thigh's pressed hull (TC.Ring on the thigh's own axis, a short reach, so no ray
  meets the other leg); the suit is pressed in under them (TC.compress), so they bow round the thigh and dent it.
"""
import math

import bpy
import numpy as np
from mathutils import Vector

import fitted as FT
import head_common as HC
import kit_common as KC
import torso_common as TC
import waist_belt as WB

KIT = 'thighHolster'
KITS = ['holsterHanger', 'legBands', 'sleevePanel', 'throwableSleeves', 'sleeveHanger', 'magBuckle', 'knife']
METHOD = ('tensioned elastic bands on each thigh\'s pressed hull, a rigid moulded holster shell on a lofted platform, '
          'laminate and elastic parts on conformal thigh maps; the suit pressed in under the bands (no simulation)')
BAND_W, BAND_T = 0.025, 0.0022
BANDS_Z = (0.715, 0.565)
AXIS = {'R': (-0.105, -0.04), 'L': (0.105, -0.04)}
# the game's thigh slot (operatorBody.ts for Wren: hipHalf 0.0898, thighOuter = max(r0, 0.95 r0 + 0.0225) 0.0958;
# weaponModel.ts CARRY_GAP 0.012; the widest sidearm's half width 0.0155; 0.25 m below the hip joint at z 0.8524)
HIP_HALF, THIGH_OUTER, CARRY_GAP, HALF_W = 0.0897895, 0.0957883, 0.012, 0.015
SLOT = np.array([-(HIP_HALF + THIGH_OUTER + CARRY_GAP + HALF_W), 0.0, 0.85236 - 0.25])
WALL = 0.0022
CAV_FA, CAV_W = 0.0293, 0.0158          # cavity half sizes: fore-aft (slide + frame 57 mm), across (the 31 mm width)
SHELL_HL, SHELL_UP = 0.0775, 0.0605     # shell half length; its centre this far above the slot (toward the slide rear)
DROP = 0.009                            # the holster (and its frame) set 9 mm down the thigh from the game's slot
FWD_OFF = 0.0415                        # the slide-and-frame centre forward of the extents centre
R_S, R_N = 0.015, 0.0105                # throwable sleeve: an oval 30 mm across, 21 mm out from the panel
STRAP_W, STRAP_T = 0.022, 0.0022
# D28 thigh layout (left thigh map angles: -90 the front, 0 the outer side): the knife at the panel's front edge, the
# three sleeves behind it (LAYOUT.md "Recommended changes" 2, packing A: nothing reaches the calf in a deep crouch)
KNIFE_DEG, SLEEVE_DEG, PANEL_DEG = -60.0, (-35.0, -13.0, 9.0), (-74.0, 21.0)
KNIFE_TOP = 0.745                        # the pommel's top (under the hip crease, level with the sleeve caps)
SHEATH_L, GUARD_L, GRIP_L, POMMEL_L = 0.100, 0.006, 0.078, 0.006   # 190 mm overall (a 90 mm handle)
PANEL_Z = (0.535, 0.785)                 # the panel runs 3 cm above the caps: the hanger ends there
HL = {'hipL': 1.0}
HR = {'hipR': 1.0}
PELV = {'pelvis': 1.0}


def leg_tree(op, dg, side):
    s = 1.0 if side == 'L' else -1.0
    return KC.suit_trees(op, dg, keep=lambda P: np.all(P[:, 0] * s > 0.012) and P[:, 2].max() < 0.83)


def thigh_ring(tree, skin, side, zs, th):
    cx, cy = AXIS[side]
    return TC.Ring(tree, skin, cy, zs, th, reach=0.12, axis_x=cx)


def eased_band(ring, side):
    cx, cy = AXIS[side]
    G, Nn = ring.G.copy(), ring.Nn.copy()
    ax = np.array([cx, cy])
    r0 = np.linalg.norm(G[..., :2] - ax, axis=-1)
    for _ in range(4):
        G[1:-1] = (G[:-2] + 2 * G[1:-1] + G[2:]) / 4
        G[:, 1:-1] = (G[:, :-2] + 2 * G[:, 1:-1] + G[:, 2:]) / 4
        dv = G[..., :2] - ax
        rr = np.linalg.norm(dv, axis=-1)
        G[..., :2] = ax + dv * (np.maximum(rr, r0) / rr)[..., None]
    Ns = np.cross(np.gradient(G, axis=1), np.gradient(G, axis=0))
    Ns *= np.sign(np.sum(Ns * Nn, axis=-1))[..., None]
    return G, FT.unit(Ns.reshape(-1, 3)).reshape(Nn.shape)


def build(ctx):
    scene, reuse, MAT, skin, op = ctx['scene'], ctx['reuse'], ctx['MAT'], ctx['skin'], ctx['op_id']
    dg = bpy.context.evaluated_depsgraph_get()
    pt, reg, meas = KC.Parts(base=300), {}, {}
    mats = KC.materials(reuse, MAT)
    press = []

    def add(name, key, rng):
        reg.setdefault(name, []).append((key, rng[0], rng[1]))
    suit_tree, _, _ = KC.suit_trees(op, dg)
    trees = {s: leg_tree(op, dg, s)[0] for s in ('L', 'R')}
    ths = {'R': np.radians(np.arange(-270.0, 91.0, 1.0)), 'L': np.radians(np.arange(-180.0, 181.0, 1.0))}
    maps = {}
    for s in ('L', 'R'):
        ring = thigh_ring(trees[s], skin, s, np.arange(0.50, 0.7961, 0.004), ths[s])
        maps[s] = KC.RingMap(ring, math.radians(-90.0), 0.64)
        meas.setdefault('thighRayMisses', {})[s] = ring.misses
    Mh, _ = WB.hip_map(op, dg, skin)
    H_ON = BAND_T + 0.0004               # parts over the bands

    # --- Leg bands (two per thigh), magnetic buckles ----------------------------------------------------------------
    t_buckle = {'R': -75.0, 'L': -12.0}
    bands = {}
    for s in ('L', 'R'):
        for k, zc in enumerate(BANDS_Z):
            zs = np.linspace(zc - BAND_W / 2, zc + BAND_W / 2, 9)
            th = np.radians(t_buckle[s] + np.arange(0.5, 359.6, 1.0))
            ring = thigh_ring(trees[s], skin, s, zs, th)
            G, Nn = eased_band(ring, s)
            Ve, Fe, Ee = pt('elastic')
            b0 = len(Ve)
            TC.band_slab(Ve, Fe, G, Nn, BAND_T)
            Ee.extend([0.004] * (len(Ve) - len(Ee)))
            add('legBands', 'elastic', (b0, len(Ve)))
            R_, C_ = G.shape[:2]
            press.append((G.reshape(-1, 3), [(i * C_ + j, i * C_ + j + 1, (i + 1) * C_ + j + 1, (i + 1) * C_ + j)
                                             for i in range(R_ - 1) for j in range(C_ - 1)]))
            u_b = float(np.interp(math.radians(t_buckle[s]), maps[s].th, maps[s].s))
            O, A_, U_, N_ = KC.frame(maps[s], u_b, zc, BAND_T + 0.0002)
            pt.pad('metal'), pt.pad('rubber')
            KC.buckle(pt, O, A_, N_, BAND_W, pt.part(f'legBandBuckle{s}{k}', HL if s == 'L' else HR, item='magBuckle'))
            bands[f'{s}{k}'] = {'z': zc, 'arcM': round(TC.path_length(G[R_ // 2]), 3)}
    meas['legBands'] = bands

    # --- Holster: the game's slot, the shell, the hood, the platform -------------------------------------------------
    Mr = maps['R']
    cx, cy = AXIS['R']
    # the holster sits round the thigh where the slide and frame are: forward of the slot (the extents centre)
    C_est = SLOT + np.array([0.0, -FWD_OFF, 0.0])
    th_s = math.atan2(C_est[1] - cy, C_est[0] - cx)
    if th_s > math.radians(90.0):
        th_s -= 2 * math.pi
    u_s = float(np.interp(th_s, Mr.th, Mr.s))
    v_s = SLOT[2] + SHELL_UP
    O, A_, U_, N_ = KC.frame(Mr, u_s, v_s, 0.0)
    n_h = FT.unit(N_ - Z * (N_ @ Z) * 0.0)
    up_h = FT.unit(U_ - n_h * (U_ @ n_h))
    fwd_h = FT.unit(np.cross(n_h, up_h))
    if fwd_h[1] > 0:
        fwd_h = -fwd_h
    sgnA = 1.0 if (A_ @ fwd_h) > 0 else -1.0       # map u toward the front?

    def back_clear(C):
        g = []
        for a in np.linspace(-CAV_FA - WALL, CAV_FA + WALL, 9):
            for b in np.linspace(-SHELL_HL, SHELL_HL, 13):
                p = C - n_h * (CAV_W + WALL) + fwd_h * a + up_h * b
                hit, _, t = TC.ray(suit_tree, p + n_h * 0.0, -n_h, 0.06)
                g.append(t if hit is not None else 0.06)
        return float(min(g))
    C0 = SLOT + fwd_h * FWD_OFF + up_h * (SHELL_UP - DROP)
    g0 = back_clear(C0)
    need = BAND_T + 0.0035 + 0.0003              # band, the platform's thinnest, a clearance
    delta = float(np.clip(need - g0, -0.0095, 0.02))
    C = C0 + n_h * delta
    r_hol = pt.part('holster', HR, item='thighHolster')
    nhol = pt.count('poly', 'metal')
    fr = KC.Frame(C, fwd_h, up_h)                     # the holster built in its own frame (design record)
    Cl, fl, ul, nl = np.zeros(3), fr.v(fwd_h), fr.v(up_h), fr.v(n_h)
    Vp_, Fp_, Ep_ = pt('poly')
    pt.pad('poly')
    rng = holster_shell(Vp_, Fp_, Cl, fl, ul, nl)
    Ep_.extend([0.002] * (len(Vp_) - len(Ep_)))
    add('thighHolster', 'poly', rng)
    # the retention hood: a moulded cap closed over the whole mouth, its arm down the outer face to a gunmetal pivot,
    # latched by the gunmetal thumb release at the rear edge below the cap
    pt.pad('poly')
    rng = holster_hood(Vp_, Fp_, Cl, fl, ul, nl)
    Ep_.extend([0.002] * (len(Vp_) - len(Ep_)))
    add('thighHolster', 'poly', rng)
    s_arm = SHELL_HL - HOOD_SKIRT - 0.0095
    arm_c = Cl + fl * 0.004 + ul * s_arm + nl * (outer_b(0.004) + 0.0008 + 0.0001)
    pt.pad('poly')
    rr = HC.rbox(Vp_, Fp_, arm_c, [fl, ul, nl], (0.0065, 0.0105, 0.0008), 0.0007, step=0.0012)
    Ep_.extend(TC.rbox_edge(Vp_, rr, arm_c, [fl, ul, nl], (0.0065, 0.0105, 0.0008)))
    add('thighHolster', 'poly', rr)
    Vm, Fm, Em = pt('metal')
    pt.pad('metal')
    rel_c = Cl + fl * -0.0205 + ul * (SHELL_HL - HOOD_SKIRT - 0.0072) + nl * (outer_b(-0.0205) + 0.0006 - 0.0003)
    rr = HC.rbox(Vm, Fm, rel_c, [fl, ul, nl], (0.0045, 0.0065, 0.0006), 0.0005, step=0.001)
    Em.extend(TC.rbox_edge(Vm, rr, rel_c, [fl, ul, nl], (0.0045, 0.0065, 0.0006)))
    add('thighHolster', 'metal', rr)
    piv = Cl + fl * 0.004 + ul * (s_arm - 0.0055) + nl * (outer_b(0.004) + 0.0012)
    KC.tube(pt('metal'), [piv, piv + nl * 0.0008], 0.0032, sides=20)
    add('thighHolster', 'metal', KC.tube.last)
    pt.place(nhol, fr)
    pt.tag_since(nhol, r_hol)
    # the platform: its back on the bands (the thigh map), its front the shell's flat back (a moulded wedge)
    face = C - n_h * (CAV_W + WALL)
    hp = (CAV_FA + WALL + 0.004, SHELL_HL + 0.018, 0.003)
    PL_UP = 0.012                  # the platform runs 3 cm above the shell's mouth (the hanger's end is held behind it)
    v_c = float(C[2])
    Vl, Fl, El = pt('lam')
    pt.pad('lam')
    b0, b1 = HC.rbox(Vl, Fl, np.zeros(3), np.eye(3), hp, 0.003, step=0.003)
    L = np.array(Vl[b0:b1])
    t_ = np.clip((L[:, 2] + hp[2]) / (2 * hp[2]), 0, 1)[:, None]
    backP = Mr(u_s + sgnA * L[:, 0], v_c + PL_UP + L[:, 1], np.full(len(L), H_ON)).reshape(-1, 3)
    frontP = face[None, :] + fwd_h[None, :] * L[:, 0:1] + up_h[None, :] * (L[:, 1:2] + PL_UP)
    Vl[b0:b1] = list(backP * (1 - t_) + frontP * t_)
    El.extend(KC.edge_local(L, hp))
    add('holsterPlatform', 'lam', (b0, b1))
    pt.tag('lam', (b0, b1), pt.part('holsterPlatform', HR, 'carrier', item='thighHolster'))
    thick = np.linalg.norm(frontP - backP, axis=1)
    origin = SLOT + n_h * delta - up_h * DROP
    za, ya = -up_h, fwd_h
    xa = FT.unit(np.cross(ya, za))
    KC.empty(scene, 'pistolHolster', origin, xa, ya, za)
    meas['pistolHolster'] = {
        'origin': [round(float(v), 5) for v in origin], 'x': [round(float(v), 4) for v in xa],
        'y': [round(float(v), 4) for v in ya], 'z': [round(float(v), 4) for v in za],
        'gameSlot': [round(float(v), 5) for v in SLOT], 'offsetFromSlotMm': round(float(np.linalg.norm(origin - SLOT)) * 1000, 2),
        'axisTiltDeg': round(math.degrees(math.acos(float(np.clip(-za[2], -1, 1)))), 2),
        'cavityHalfM': [CAV_FA, CAV_W], 'cavityAcrossMm': {'centre': round(2 * CAV_W * 1000, 1), 'at15mm': round((2 * CAV_W - crown_dip(0.015, CAV_W)) * 1000, 1), 'at20mm': round((2 * CAV_W - crown_dip(0.020, CAV_W)) * 1000, 1)},
        'shellZ': [round(float((C - up_h * SHELL_HL)[2]), 4), round(float((C + up_h * SHELL_HL)[2]), 4)],
        'backGapNoPlatformMm': round(g0 * 1000, 2), 'platformThickMm': [round(float(thick.min()) * 1000, 1), round(float(thick.max()) * 1000, 1)],
        'contents': "the game's sidearm (not modelled)"}

    # --- Left thigh (D28): the panel, the knife at its front edge, three straight sleeves behind it ---------------------
    Ml = maps['L']

    def u_at(deg):
        return float(np.interp(math.radians(deg), Ml.th, Ml.s))
    u0p, u1p = u_at(PANEL_DEG[0]), u_at(PANEL_DEG[1])
    u_p = 0.5 * (u0p + u1p)
    v0, v1 = PANEL_Z
    r_pan = pt.part('sleevePanel', HL, 'carrier', item='sleevePanel')
    npan = pt.count('lam')
    _, r_ = KC.cbox(pt('lam'), Ml, u_p, (v0 + v1) / 2, (0.5 * (u1p - u0p), (v1 - v0) / 2, 0.0015), 0.0012, H_ON)
    add('sleevePanel', 'lam', r_)
    pt.tag_since(npan, r_pan)
    H_PAN = H_ON + 0.003                     # the panel's outer face
    seats = {}

    def mount(name, Fk, uk, vc, half, gap, item):
        """A moulded seat under a straight item where the thigh falls away more than 3 mm (D28)."""
        seats[name] = gap
        pt.seat_of(name if name == 'knife' else 'canister' + name[-1], gap, name + 'Seat' if gap > 3.0 else None)
        if gap > 3.0:
            r_s = pt.part(name + 'Seat', HL, 'mount', item=item, gapMm=gap)
            n_s = pt.count('lam')
            rs = KC.seat(pt('lam'), Fk, Ml, uk, vc, half, h_top=-0.0002, h_base=H_PAN - 0.0004)
            add(item, 'lam', rs)
            pt.tag_since(n_s, r_s)

    # the knife: a moulded polymer sheath (100 x 34 x 14 mm, tapering to the tip, a gunmetal release at the throat),
    # a gunmetal guard and pommel, a rubber grip; handle up, the left hand draws it straight up
    uk = u_at(KNIFE_DEG)
    k_len = SHEATH_L + GUARD_L + GRIP_L + POMMEL_L
    vk = KNIFE_TOP - k_len / 2
    Fk0, sg = KC.flat_on(Ml, uk, vk, (0.017, k_len / 2))
    Fk = Fk0.lifted(H_PAN)
    gap_k = round(sg['maxMm'] + 0.4, 1)
    r_kn = pt.part('knife', HL, item='knife', size='knife')
    nkn = pt.count('poly', 'metal', 'rubber')
    y_sh = -k_len / 2 + SHEATH_L / 2                       # the sheath's centre (the tip down at -k_len / 2)

    def sheath(L):
        L = np.array(L, float)
        t = np.clip((SHEATH_L / 2 - L[:, 1]) / SHEATH_L, 0, 1)        # 0 at the throat, 1 at the tip
        L[:, 0] *= 1 - 0.32 * t ** 1.5
        L[:, 2] += 0.0012 * np.clip(L[:, 2] / 0.007, 0, 1) * np.clip(1 - (L[:, 0] / 0.017) ** 2, 0, 1)
        return L
    _, r_ = KC.cbox(pt('poly'), Fk, uk, vk, (0.017, SHEATH_L / 2, 0.007), 0.004, 0.0, off=(0.0, y_sh, 0.0),
                    deform=sheath)
    add('knife', 'poly', r_)
    _, r_ = KC.cbox(pt('metal'), Fk, uk, vk, (0.0045, 0.0055, 0.0010), 0.0008, 0.0,
                    off=(0.0, y_sh + SHEATH_L / 2 - 0.009, 0.0142))
    add('knife', 'metal', r_)
    y_g = -k_len / 2 + SHEATH_L + GUARD_L / 2
    _, r_ = KC.cbox(pt('metal'), Fk, uk, vk, (0.015, GUARD_L / 2, 0.009), 0.0015, 0.0, off=(0.0, y_g, 0.0))
    add('knife', 'metal', r_)

    def grip(L):
        L = np.array(L, float)
        L[:, 0] *= 1 - 0.1 * np.cos(math.pi * L[:, 1] / GRIP_L) ** 2
        return L
    y_r = -k_len / 2 + SHEATH_L + GUARD_L + GRIP_L / 2
    _, r_ = KC.cbox(pt('rubber'), Fk, uk, vk, (0.013, GRIP_L / 2, 0.011), 0.006, 0.0, off=(0.0, y_r, 0.0),
                    deform=grip)
    add('knife', 'rubber', r_)
    _, r_ = KC.cbox(pt('metal'), Fk, uk, vk, (0.012, POMMEL_L / 2, 0.0105), 0.0025, 0.0,
                    off=(0.0, k_len / 2 - POMMEL_L / 2, 0.0))
    add('knife', 'metal', r_)
    pt.tag_since(nkn, r_kn)
    mount('knife', Fk, uk, vk, (0.015, k_len / 2 - 0.004), gap_k, 'knife')
    meas['knife'] = {'deg': KNIFE_DEG, 'u': round(uk, 4), 'z': [round(KNIFE_TOP - k_len, 4), KNIFE_TOP],
                     'lengthMm': round(k_len * 1000, 1), 'handleUp': True, 'seatGapMm': gap_k, 'frame': Fk.report()}

    sl0, sl1 = 0.558, 0.737
    caps = {}
    for k, (deg, kind) in enumerate(zip(SLEEVE_DEG, ('frag', 'gas', 'flash'))):
        uk = u_at(deg)
        vc = 0.5 * (sl0 + sl1)
        Fs0, sg = KC.flat_on(Ml, uk, vc, (R_S, (sl1 - sl0) / 2))
        Fs = Fs0.lifted(H_PAN)
        gap_s = round(sg['maxMm'] + 0.4, 1)
        vs = np.linspace(sl0, sl1, 30)
        axp = KC.mpts(Fs, [(0.0, v_ - vc, 0.003 + R_N) for v_ in vs], uk, vc, 0.0, 0.0)
        Nax = np.repeat(Fs.N[None], len(vs), axis=0)
        r_sl = pt.part(f'sleeve{k}', HL, 'carrier', item='throwableSleeves')
        nsl = pt.count('elastic', 'lam', 'cord', 'rubber')
        KC.tube(pt('elastic'), axp, R_S, sides=28, step=0.004)
        ovalize(pt('elastic')[0], KC.tube.last, axp, Nax, R_N / R_S)
        add('throwableSleeves', 'elastic', KC.tube.last)
        ax = FT.unit(axp[-1] - axp[0])
        top = axp[-1]
        nk = Fs.N
        sk = FT.unit(np.cross(ax, nk))
        nk = FT.unit(np.cross(sk, ax))
        nk1 = (np.array([top]), np.array([nk]))
        KC.tube(pt('lam'), [top - ax * 0.003, top + ax * 0.0005], R_S + 0.0007, sides=28, step=0.002)  # bound top
        ovalize(pt('lam')[0], KC.tube.last, *nk1, (R_N + 0.0007) / (R_S + 0.0007))
        add('throwableSleeves', 'lam', KC.tube.last)
        # the top canister, true size (25 x 18 x 90 mm with its cap; the lower one hidden in the sleeve): one rigid part
        r_can = pt.part(f'canister{k}', HL, item='throwableSleeves', size='canister', kind=kind)
        ncan = pt.count('poly', 'metal')
        # the canister built in its own frame (design record); x kept on the world's x, so FT.tube / HC.knurl pick the
        # same reference axis as a build in world coordinates (the same ring phase as before the frame)
        fr = KC.Frame(top, np.array([1.0, 0.0, 0.0]), FT.unit(np.cross(ax, np.array([1.0, 0.0, 0.0]))))
        top_l, ax_l, sk_l, nk_l = np.zeros(3), fr.v(ax), fr.v(sk), fr.v(nk)
        nk1_l = (np.zeros((1, 3)), np.array([nk_l]))
        KC.tube(pt('poly'), [top_l - ax_l * 0.074, top_l + ax_l * 0.009], 0.0127, sides=24, step=0.004)
        ovalize(pt('poly')[0], KC.tube.last, *nk1_l, R_N / R_S)
        add('throwableSleeves', 'poly', KC.tube.last)
        Vk, Fk_, Ek = pt('metal' if kind == 'frag' else 'poly')
        key = 'metal' if kind == 'frag' else 'poly'
        pt.pad(key)
        b0 = len(Vk)
        if kind == 'frag':                 # a knurled ring
            HC.knurl(Vk, Fk_, top_l + ax_l * 0.0125, ax_l, 0.0134, 0.007, ridges=28, rings=3)
            cap_top = 0.016
        elif kind == 'gas':                # a dome
            HC.rbox(Vk, Fk_, top_l + ax_l * 0.0115, [sk_l, nk_l, ax_l], (0.0127, 0.0127, 0.0042), 0.0042, step=0.0015)
            cap_top = 0.0157
        else:                              # two ridges
            for z_ in (0.0105, 0.0145):
                FT.tube(Vk, Fk_, np.array([top_l + ax_l * (z_ - 0.0008), top_l + ax_l * (z_ + 0.0008)]), 0.0137, sides=28)
            FT.tube(Vk, Fk_, np.array([top_l + ax_l * 0.009, top_l + ax_l * 0.0155]), 0.0124, sides=28)
            cap_top = 0.0155
        Ek.extend([0.0] * (len(Vk) - len(Ek)))
        ovalize(Vk, (b0, len(Vk)), *nk1_l, R_N / R_S)                  # the oval canister's cap
        add('throwableSleeves', key, (b0, len(Vk)))
        # the design record on the canister's own oval axes (sk width, nk depth, ax length) so its design extents are
        # its true 25 x 18 x 90; the world geometry stays exactly as built in `fr` (the same ring phase)
        fa = KC.Frame(top, sk, nk)
        for k_, n0 in ncan.items():
            V_ = pt.d[k_][0]
            if len(V_) > n0:
                V_[n0:] = list(fa.p(fr.world(np.asarray(V_[n0:], float).reshape(-1, 3))))
        pt.place(ncan, fa)
        pt.tag_since(ncan, r_can)
        caps[kind] = {'cap': {'frag': 'knurled ring', 'gas': 'dome', 'flash': 'two ridges'}[kind], 'count': 2,
                      'deg': deg, 'seatGapMm': gap_s}
        # the shock-cord loop over the cap (anchored in the sleeve's sides below the bound top) and its pull tab
        hw = R_S + 0.0013
        arc = []
        for a in np.linspace(math.pi, 0.0, 21):
            c_, s_ = math.cos(a), math.sin(a)
            arc.append(top + sk * (hw * math.copysign(abs(c_) ** 0.35, c_))
                       + ax * (-0.006 + (cap_top + 0.0014 + 0.006) * abs(s_) ** 0.35))
        lp = ([top - sk * (R_S - 0.002) - ax * 0.008, top - sk * (R_S + 0.0012) - ax * 0.007] + arc
              + [top + sk * (R_S + 0.0012) - ax * 0.007, top + sk * (R_S - 0.002) - ax * 0.008])
        KC.tube(pt('cord'), lp, 0.0013, sides=8, step=0.002)
        add('throwableSleeves', 'cord', KC.tube.last)
        tc = top + ax * (cap_top + 0.0023) + nk * 0.0033          # the tab lies on the cap, from the cord forward
        Vr, Fr, Er = pt('rubber')
        pt.pad('rubber')
        rr = HC.rbox(Vr, Fr, tc, [sk, nk, ax], (0.0045, 0.0045, 0.0009), 0.0008, step=0.001)
        Er.extend(TC.rbox_edge(Vr, rr, tc, [sk, nk, ax], (0.0045, 0.0045, 0.0009)))
        add('throwableSleeves', 'rubber', rr)
        pt.tag_since(nsl, r_sl)
        mount(f'sleeve{k}', Fs, uk, vc, (R_S - 0.002, (sl1 - sl0) / 2 - 0.004), gap_s, 'throwableSleeves')
    meas['throwableSleeves'] = {'u': round(u_p, 4), 'z': [sl0, sl1], 'ovalM': [2 * R_S, 2 * R_N], 'types': caps,
                                'straight': True, 'panelDeg': list(PANEL_DEG)}
    meas['thighSeatsMm'] = seats

    # --- Hangers from the belt (right: to the holster platform; left: to the sleeve panel) ----------------------------
    belt_ob = bpy.data.objects.get(f'{op}-waist_belt-lam')
    Vbt, Fbt = TC.mesh_world(belt_ob, dg)
    Vsu, Fsu = TC.mesh_world(bpy.data.objects[f'{op}-suit-hero'], dg)
    hang = {}
    # fix round 2: the right hanger runs behind the platform (on the bands, between the platform and the suit) and
    # stops 1.6 cm into it, its end flat to the platform's back (n_h), so no corner reaches the platform's face
    PL_TOP = SHELL_HL + 0.018 + PL_UP                  # the platform's top edge, up the holster axis from C
    bot_R = Mr(u_s, v_c + SHELL_HL + 0.014, H_ON + STRAP_T * 0.5 + 0.0004).reshape(3)
    z_pl = float((C + up_h * PL_TOP)[2])
    hang_u = list(belt_ob['hangU']) if belt_ob is not None and 'hangU' in belt_ob else [0.122, WB.U_HANG_R]
    for s, u_h, bot, hax in (('R', float(hang_u[1]), bot_R, AXIS['R']),
                             ('L', float(hang_u[0]), None, AXIS['L'])):
        sg = 1.0 if s == 'L' else -1.0
        if bot is None:
            bot = Ml(u_p, v1 - 0.014, H_ON + 0.003).reshape(3)        # the panel's top band, above the caps
        keep = [f for f in Fsu if np.all(Vsu[list(f), 0] * sg > 0.0) and 0.7 < Vsu[list(f), 2].mean() < 0.96]
        off = len(Vsu)
        tr = TC.bvh(np.vstack([Vsu, Vbt]), keep + [tuple(i + off for i in f) for f in Fbt])
        topP = Mh(u_h, WB.Z_MID + WB.BELT_W / 2 + 0.0016, WB.BELT_T * 0.5 + STRAP_T * 0.5).reshape(3)
        a0 = Mh(u_h, WB.Z_MID + WB.BELT_W / 2 - 0.002, WB.BELT_T + 0.0004).reshape(3)
        a1 = Mh(u_h, WB.Z_MID - WB.BELT_W / 2 - 0.003, 0.0006).reshape(3)
        line = [a0 + (a1 - a0) * f for f in np.linspace(0, 1, 6)]
        n_seg = 24
        for f in np.linspace(0, 1, n_seg)[1:]:
            line.append(a1 + (bot - a1) * f)
        def push(q):
            zf = float(np.clip((0.93 - q[2]) / 0.18, 0, 1))
            cxy = np.array([0.0, -0.01]) * (1 - zf) + np.array(hax) * zf
            d = FT.unit(np.array([q[0] - cxy[0], q[1] - cxy[1], 0.0]))
            hit, hn, _ = TC.ray(tr, q + d * 0.06, -d, 0.12)
            if hit is not None and hn @ d < 0:
                hn = -hn                     # the face normal turned outward (toward the ray's origin)
            if hit is not None and (hit + hn * 0.0005 - q) @ hn > 0:
                return q + hn * float((hit + hn * 0.0005 - q) @ hn)
            return q
        out = np.array([push(q) for q in line])
        out = FT.smooth_polyline(TC.resample(np.vstack([[topP], out]), 0.003), 2)
        for _ in range(2):                  # smoothing cuts the corner under the belt's edge: pushed out again
            out[1:] = np.array([push(q) for q in out[1:]])
            out[2:-1] = (out[1:-2] + 2 * out[2:-1] + out[3:]) / 4
        out[1:] = np.array([push(q) for q in out[1:]])
        out[0] = topP

        def snap(q, gmax):
            # a point bridging a hollow (the hip crease) drawn in to gmax off the surface; returns it and the normal
            zf = float(np.clip((0.93 - q[2]) / 0.18, 0, 1))
            cxy = np.array([0.0, -0.01]) * (1 - zf) + np.array(hax) * zf
            d = FT.unit(np.array([q[0] - cxy[0], q[1] - cxy[1], 0.0]))
            hit, hn, _ = TC.ray(tr, q + d * 0.06, -d, 0.12)
            if hit is None:
                return q, d, d
            if hn @ d < 0:
                hn = -hn
            gap = float((q - hit) @ hn)
            return (q - hn * (gap - gmax) if gap > gmax else q), hn, d
        Nh = np.zeros_like(out)
        z_lo = float(bot[2]) + 0.012
        for i in range(len(out)):
            q2, hn_, d_ = snap(out[i], STRAP_T * 0.5 + 0.0008)
            if s == 'L':
                Nh[i] = hn_
            else:                            # radial on the run, turned to the platform's n_h as it goes behind it
                w_ = float(np.clip((z_pl + 0.012 - out[i, 2]) / 0.012, 0, 1))
                Nh[i] = FT.unit(d_ * (1 - w_) + n_h * w_)
            if s == 'L' and 0 < i and out[i, 2] < WB.Z_MID - WB.BELT_W / 2 - 0.004 and out[i, 2] > z_lo:
                out[i] = q2
        for _ in range(3 if s == 'L' else 0):
            Nh[1:-1] = (Nh[:-2] + 2 * Nh[1:-1] + Nh[2:]) / 4
        Tn = TC.tangents(out)
        Nh = FT.unit(Nh - Tn * np.sum(Nh * Tn, 1, keepdims=True))
        Bh = FT.unit(np.cross(Nh, Tn))
        Vl, Fl, El = pt('lam')
        pt.pad('lam')
        b0 = len(Vl)
        TC.padded_strap(Vl, Fl, out, Nh, Bh, STRAP_W, STRAP_T, STRAP_T * 0.85, cols=7)
        El.extend([0.004] * (len(Vl) - len(El)))
        nm = 'holsterHanger' if s == 'R' else 'sleeveHanger'
        add(nm, 'lam', (b0, len(Vl)))
        low = out[:, 2] < WB.Z_MID - WB.BELT_W / 2 - 0.02           # clear of the belt (the belt takes the rest)
        press.append(KC_sheet(out[low], Nh[low], Bh[low], STRAP_W))
        # the loop round the belt closes with a magnetic buckle on the belt's face
        j = int(np.argmin(np.abs(out[:, 2] - (WB.Z_MID - 0.002))))
        pt.pad('metal'), pt.pad('rubber')
        KC.buckle(pt, out[j] + Nh[j] * STRAP_T, -Tn[j], Nh[j], STRAP_W, pt.part(f'hangerBuckle{s}', PELV, item='magBuckle'))
        us_ = np.arange(-0.4, 0.4, 0.002)
        Pu = Mh(us_, np.full_like(us_, WB.Z_MID), np.zeros_like(us_)).reshape(-1, 3)
        ideal = float(us_[np.argmin(np.linalg.norm(Pu[:, :2] - bot[:2], axis=1))])
        hang[nm] = {'idealU': round(ideal, 4), 'u': u_h, 'lengthM': round(TC.path_length(out), 3), 'top': [round(float(v), 4) for v in topP],
                    'bottom': [round(float(v), 4) for v in out[-1]]}
    meas['hangers'] = hang
    for nm in ('holsterHanger', 'sleeveHanger'):         # the run below the belt (the loop round the belt excluded)
        Vh = KC.reg_verts(pt, reg, [nm])
        Vh = np.asarray(Vh)[np.asarray(Vh)[:, 2] < WB.Z_MID - WB.BELT_W / 2 - 0.004]
        hang[nm]['runStandoffM'] = KC.standoff(Vh, suit_tree)

    # --- Fit and the suit pressed in --------------------------------------------------------------------------------------
    meas['standoffFromSuitM'] = {n: KC.standoff(KC.reg_verts(pt, reg, [n]), suit_tree) for n in reg}
    PV, PF = KC.merge(press)
    meas['suitPress'] = TC.compress(KC.suit_follow(op), [TC.bvh(PV, PF)], skin, cap=0.0025,
                                    region=(PV.min(axis=0), PV.max(axis=0)))
    meas['rigid'] = pt.report()
    objs = KC.write_objects(scene, op, 'leg_kit', pt, mats)
    return {'shell': KC.shell_of(pt), 'objects': list(objs.values()), 'kits': KITS, 'measurements': meas,
            'report': {'parts': {k: len(v[1]) for k, v in pt.d.items()}}}


# --- The moulded holster shell (fix round 1): a sidearm-following section lofted along the shell ---------------------
R_IN = 0.0068                    # the cavity's corner radius: the outer 9 mm (A56's R1)
CROWN = 0.0025                   # the outer face crowned toward the slide's top and the trigger guard's front
A_REF = 0.0315                   # the crown's half width (the mouth's fore-aft half)
STEP_S, STEP_L = SHELL_HL - 0.056, 0.026   # the trigger-guard step: the full frame section ends 56 mm below the mouth
STEP_IN = 0.017                  # below the guard the rear edge steps 17 mm forward (slide and dust cover only)
TAPER = 0.0022                   # the outer face tapers 2.2 mm toward the muzzle end
HOOD_SKIRT = 0.013               # the hood's skirt runs this far down the shell


def smooth01(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def cav_box(s):
    """The cavity's (a_lo, a_hi, b_lo, b_hi) at s along the shell (-SHELL_HL the muzzle end, +SHELL_HL the mouth);
    a along fwd (the slide forward), b along n (out from the thigh); the back (b_lo) stays flat on the platform."""
    w = smooth01((s - (STEP_S - STEP_L)) / STEP_L)
    t = (s + SHELL_HL) / (2 * SHELL_HL)
    return -CAV_FA + STEP_IN * (1 - w), CAV_FA, -CAV_W, CAV_W - TAPER * (1 - t)


def crown_dip(a, b):
    h = min(max((b + CAV_W + WALL) / (2 * (CAV_W + WALL)), 0.0), 1.0)
    return CROWN * (a / A_REF) ** 2 * h


def outer_b(a, s=None):
    s = SHELL_HL - HOOD_SKIRT - 0.01 if s is None else s
    b1 = cav_box(s)[3] + WALL
    return b1 - crown_dip(a, b1)


def rr_loop(a0, a1, b0, b1, r, kc=7, ke=7):
    """A rounded rectangle with a fixed point count (4 (kc + 1 + ke)), counter-clockwise from the top-right corner, so
    sections of different sizes loft point for point; the crown applied."""
    r = min(r, 0.5 * (a1 - a0) - 1e-4, 0.5 * (b1 - b0) - 1e-4)
    cs = [(a1 - r, b1 - r), (a0 + r, b1 - r), (a0 + r, b0 + r), (a1 - r, b0 + r)]
    P = []
    for i, (ca, cb) in enumerate(cs):
        t0 = 0.5 * math.pi * i
        for k in range(kc + 1):
            t = t0 + 0.5 * math.pi * k / kc
            P.append((ca + r * math.cos(t), cb + r * math.sin(t)))
        t1 = t0 + 0.5 * math.pi
        na, nb = cs[(i + 1) % 4]
        e0 = np.array((ca + r * math.cos(t1), cb + r * math.sin(t1)))
        e1 = np.array((na + r * math.cos(t1), nb + r * math.sin(t1)))
        for k in range(1, ke + 1):
            P.append(tuple(e0 + (e1 - e0) * k / (ke + 1)))
    P = np.array(P)
    P[:, 1] -= np.array([crown_dip(a, b) for a, b in P])
    return P


def sec_loop(s, off):
    a0, a1, b0, b1 = cav_box(s)
    return rr_loop(a0 - off, a1 + off, b0 - off, b1 + off, R_IN + off)


def loft(V, F, rings, fan0=None, fan1=None):
    """Quad strips between consecutive rings (same point count), optional fans to a start / end centre point."""
    m = len(rings[0])
    b0 = len(V)
    if fan0 is not None:
        V.append(fan0)
    base = len(V)
    for R in rings:
        V.extend(R)
    if fan0 is not None:
        for j in range(m):
            F.append((b0, base + (j + 1) % m, base + j))
    for k in range(len(rings) - 1):
        for j in range(m):
            j2 = (j + 1) % m
            F.append((base + k * m + j, base + k * m + j2, base + (k + 1) * m + j2, base + (k + 1) * m + j))
    if fan1 is not None:
        c = len(V)
        V.append(fan1)
        last = base + (len(rings) - 1) * m
        for j in range(m):
            F.append((last + j, last + (j + 1) % m, c))
    return b0, len(V)


def holster_shell(V, F, C, fwd, up, n):
    """The shell as one sheet: the muzzle end's inner edge, its rounded lip, the outer face up to the mouth, the mouth's
    lip (under the hood), the cavity's face back down; open at the muzzle end."""
    def W(loop, s):
        return [C + fwd * a + n * b + up * s for a, b in loop]
    zs = np.linspace(-SHELL_HL, SHELL_HL, 64)
    b0 = len(V)
    outer = [W(sec_loop(z, WALL), z) for z in zs]
    inner = [W(sec_loop(z, 0.0), z) for z in zs]
    lip0 = [W(sec_loop(zs[0], WALL * (1 - a)), zs[0] - WALL * 0.5 * math.sin(math.pi * a)) for a in (0.3, 0.5, 0.7)]
    lip1 = [W(sec_loop(zs[-1], WALL * (1 - a)), zs[-1] + WALL * 0.5 * math.sin(math.pi * a)) for a in (0.3, 0.5, 0.7)]
    loft(V, F, [inner[0]] + lip0[::-1] + outer + lip1 + inner[::-1])
    return b0, len(V)


def holster_hood(V, F, C, fwd, up, n):
    """The retention hood: a moulded cap over the whole mouth (the shell's top section grown by a 0.4 mm gap and a
    2.2 mm wall), its skirt HOOD_SKIRT down the shell, a rounded lip, a 2.5 mm round on the top edge, a flat top."""
    g, th, rr = 0.0003, 0.0015, 0.0014
    s_m = SHELL_HL
    s_bot, s_in = s_m - HOOD_SKIRT, s_m + 0.0012
    s_top = s_in + th

    def R(off, s, k=1.0):
        L = sec_loop(s_m, WALL + off)
        c = L.mean(axis=0)
        L = c + (L - c) * k
        return [C + fwd * a + n * b + up * s for a, b in L]
    rings = [R(g, s_in, 0.5), R(g, s_in), R(g, s_bot + 0.0008), R(g + th * 0.5, s_bot - 0.0005), R(g + th, s_bot + 0.0008)]
    for f in np.linspace(0.0, 0.5 * math.pi, 6):
        rings.append(R(g + th - rr * (1 - math.cos(f)), s_top - rr + rr * math.sin(f)))
    rings += [R(g + th - rr, s_top, 0.75), R(g + th - rr, s_top, 0.45)]
    c2 = sec_loop(s_m, WALL).mean(axis=0)
    return loft(V, F, rings, fan0=C + fwd * c2[0] + n * c2[1] + up * s_in,
                fan1=C + fwd * c2[0] + n * c2[1] + up * s_top)


Z = np.array([0.0, 0.0, 1.0])


def ovalize(V, rng, P, N, k):
    """Flatten a round part into an oval: each vertex's offset from its nearest axis point P[i] along that point's
    normal N[i] scaled by k (a round tube becomes an oval k as deep as it is wide)."""
    b0, b1 = rng
    X = np.array(V[b0:b1], float)
    i = np.argmin(np.linalg.norm(X[:, None, :] - P[None, :, :], axis=2), axis=1)
    c = np.sum((X - P[i]) * N[i], axis=1)
    V[b0:b1] = list(X - N[i] * (c * (1 - k))[:, None])


def KC_sheet(P, N, B, w):
    Vp, Fp = [], []
    FT.strip(Vp, Fp, P, N, B, w, 0.0002)
    return np.array(Vp), Fp
