

# ================================================================ A2 (D23): concept A made logical for the game
G = MT.Graph


def mat_shell(name, colour):
    """Premium bonded suit face: a fine tonal diamond micro-emboss (about 1.6 mm) over a matte soft-shell."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = G(mat)
    u, v, _ = g.uv()
    a = g.tri(g.math('ADD', u, v), 0.0016)
    b = g.tri(g.math('SUBTRACT', u, v), 0.0016)
    dia = g.math('MULTIPLY', a, b)
    fade = g.near_fade(0.6, 1.8)
    h = g.math('ADD', g.math('MULTIPLY', g.math('MULTIPLY', dia, fade), 0.6), g.math('MULTIPLY', g.noise(900.0, 2.0), 0.25))
    nrm = g.bump(h, g.math('ADD', 0.05, g.math('MULTIPLY', fade, 0.22)), 0.0003)
    col = g.mix_rgb(g.math('MULTIPLY', g.math('MULTIPLY', dia, fade), 0.3), colour, tuple(c * 0.8 for c in colour))
    g.link(g.wear(col, dust_amount=0.18), g.bsdf.inputs['Base Color'])
    g.bsdf.inputs['Roughness'].default_value = 0.8
    g.bsdf.inputs['Sheen Weight'].default_value = 0.2
    g.bsdf.inputs['Sheen Roughness'].default_value = 0.45
    g.link(nrm, g.bsdf.inputs['Normal'])
    return mat


def mat_vent(name, colour):
    """Laser-perforated vent panel: staggered 1.4 mm holes on a 3.2 mm pitch showing the dark mesh behind."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'fabric'
    g = G(mat)
    u, v, _ = g.uv()
    p = 0.0032
    vv = g.math('DIVIDE', v, p)
    row = g.math('FLOOR', vv)
    fu = g.math('SUBTRACT', g.math('FRACT', g.math('ADD', g.math('DIVIDE', u, p), g.math('MULTIPLY', row, 0.5))), 0.5)
    fv = g.math('SUBTRACT', g.math('FRACT', vv), 0.5)
    d = g.math('SQRT', g.math('ADD', g.math('MULTIPLY', fu, fu), g.math('MULTIPLY', fv, fv)))
    hole = g.math('SUBTRACT', 1.0, g.smoothstep(0.2, 0.26, d))
    g.link(g.mix_rgb(hole, colour, (0.005, 0.005, 0.0055)), g.bsdf.inputs['Base Color'])
    g.link(g.bump(g.math('SUBTRACT', 1.0, hole), 0.6, 0.0004), g.bsdf.inputs['Normal'])
    g.bsdf.inputs['Roughness'].default_value = 0.82
    g.bsdf.inputs['Sheen Weight'].default_value = 0.15
    return mat


def mat_grip(name, colour):
    """Rubberised grip panel: a printed micro-pebble (about 1.8 mm) in matte rubber."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'hard'
    g = G(mat)
    _, _, uvv = g.uv()
    vor = g.node('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = 550.0
    g.link(uvv, vor.inputs['Vector'])
    peb = g.math('SUBTRACT', 1.0, g.smoothstep(0.25, 0.5, vor.outputs['Distance']))
    g.link(g.mix_rgb(g.math('MULTIPLY', peb, 0.35), colour, tuple(c * 1.35 for c in colour)), g.bsdf.inputs['Base Color'])
    g.link(g.bump(peb, 0.45, 0.0004), g.bsdf.inputs['Normal'])
    g.bsdf.inputs['Roughness'].default_value = 0.66
    g.bsdf.inputs['Specular IOR Level'].default_value = 0.35
    return mat


def mat_comp(name, colour):
    """Composite plate: a matte resin face over a faint fine fibre texture; chamfers catch a little lighter."""
    mat = bpy.data.materials.new(name)
    mat['operators_class'] = 'hard'
    g = G(mat)
    u, v, _ = g.uv()
    tw = g.tri(g.math('ADD', g.math('MULTIPLY', u, 1.0), g.math('MULTIPLY', v, 0.5)), 0.0024)
    fade = g.near_fade(0.6, 1.6)
    h = g.math('ADD', g.math('MULTIPLY', g.math('MULTIPLY', tw, fade), 0.25), g.math('MULTIPLY', g.noise(500.0, 2.0), 0.3))
    pt = g.node('ShaderNodeNewGeometry').outputs['Pointiness']
    edge = g.smoothstep(0.54, 0.66, pt)
    g.link(g.mix_rgb(g.math('MULTIPLY', edge, 0.45), colour, (0.07, 0.072, 0.075)), g.bsdf.inputs['Base Color'])
    g.link(g.bump(h, 0.12, 0.0003), g.bsdf.inputs['Normal'])
    g.bsdf.inputs['Roughness'].default_value = 0.62
    return mat


M['shell'] = mat_shell('a2 suit shell', (0.024, 0.025, 0.026))
M['vent'] = mat_vent('a2 vent panel', (0.019, 0.02, 0.021))
M['grip'] = mat_grip('a2 grip rubber', (0.018, 0.018, 0.019))
M['plate'] = mat_comp('a2 composite', (0.03, 0.032, 0.035))
M['gun'] = MT.anodised('a2 gunmetal', (0.05, 0.052, 0.056))
M['tape'] = MT.polymer('a2 seam tape', (0.02, 0.021, 0.022), 0.72)
M['rmetal'] = MT.painted_metal('a2 rifle finish', (0.026, 0.027, 0.029))
M['rpoly'] = MT.polymer('a2 rifle polymer', (0.022, 0.022, 0.023), 0.68)
M['lacebar'] = MT.polymer('a2 lace', (0.02, 0.02, 0.021), 0.75)


# ---------------------------------------------------------------- suit
def zones_a2():
    R0 = {k: f.R0 for k, f in FR.items()}
    for sd, sg in (('L', 1), ('R', -1)):
        zone('grip', 'shin' + sd, ellipse(0.0, -0.005, 0.052, 0.08))                       # knee grip
        zone('vent', 'shin' + sd, ellipse(math.pi * R0['shin' + sd], 0.0, 0.055, 0.065))   # back of knee
        zone('abr', 'farm' + sd, ellipse(math.pi * R0['farm' + sd], 0.0, 0.04, 0.05))      # elbow point
        zone('stretch', 'farm' + sd, ellipse(0.0, -0.01, 0.035, 0.04))                      # inner elbow
        zone('grip', 'farm' + sd, outline_rr(0.02, 0.085, 0.06, 0.20, 0.012))               # forearm grip
        zone('abr', 'sh' + sd, outline_rr(-0.075, 0.07, 0.035, 0.14, 0.02))                 # shoulder yoke
        su = (math.pi / 2) * 0.14 * sg
        zone('vent', 'torso', outline_rr(su - 0.032, su + 0.032, 0.30, 0.49, 0.02))         # underarm vent
        zone('stretch', 'sh' + sd, outline_rr(-math.pi * 0.07 * 0.95, -0.085, 0.04, 0.15, 0.015))
    zone('abr', 'torso', outline_rr(math.pi * 0.14 - 0.12, math.pi * 0.14 + 0.12, 0.0, 0.13, 0.04))


def apply_suit_a2():
    zones_a2()
    names = ['shell', 'stretch', 'abr', 'grip', 'vent']
    idx = {k: i for i, k in enumerate(names)}
    me = suit.data
    me.materials.clear()
    for k in names:
        me.materials.append(M[k])
    npoly = len(me.polygons)
    C = np.zeros(npoly * 3)
    me.polygons.foreach_get('center', C)
    C = C.reshape(-1, 3) @ mw[:3, :3].T + mw[:3, 3]
    lab = np.zeros(npoly, int)
    for label, fk, poly in ZONES:
        fr = FR[fk]
        u, v, r = fr.local(C)
        lo, hi = poly.min(0), poly.max(0)
        cand = np.nonzero((u >= lo[0]) & (u <= hi[0]) & (v >= lo[1]) & (v <= hi[1]))[0]
        if not len(cand):
            continue
        ok = np.abs(r[cand] - fr.R(u[cand], v[cand], 'raw')) < 0.012
        ins = in_poly(poly, u[cand], v[cand]) & ok
        lab[cand[ins]] = idx[label]
        surf_strip('tape', fr, np.vstack([poly, poly[:1]]), 0.006, 0.0006, off=0.0003, mode='soft')
    me.polygons.foreach_set('material_index', lab.tolist())
    me.update()
    bpy.data.objects['wren-base_layer-stitches'].hide_render = True     # bonded construction: no visible stitching


def mag_buckle(P, tu, tv, n, w=0.026, h=0.018):
    """Quiet magnetic quick-release: two flush gunmetal halves with a split line, on a rubber-edged base."""
    rbox_w('trim', P + n * 0.0013, [tu, tv, n], (w / 2 + 0.0015, h / 2 + 0.0012, 0.0013), 0.001)
    for sgn in (1, -1):
        rbox_w('gun', P + n * 0.0038 + tu * sgn * (w * 0.255), [tu, tv, n], (w * 0.235, h / 2, 0.0021), 0.0015)


def mag_pouch(fr, u, v, h, ang, half, mode):
    """Open-top mag pouch: shock-cord loop and pull tab over the magazine's base plate."""
    hw, hh, hd = half
    c, tu, tv, n = box_at('cordura', fr, u, v, h, half, 0.005, ang=ang, mode=mode)
    rbox_w('mag', c + tv * (hh + 0.005), [tu, tv, n], (hw * 0.66, 0.009, hd * 0.75), 0.0035)
    loop = [c + tv * (hh + 0.008) + tu * hw * 0.55 * math.cos(t) + n * (hd * 0.85) * math.sin(t)
            for t in np.linspace(-0.2, math.pi + 0.2, 12)]
    tube_w('cord', loop, 0.0016, sides=6)
    rbox_w('poly', c + tv * (hh + 0.013) + n * (hd * 0.92), [tu, tv, n], (0.006, 0.005, 0.0018), 0.0012)


def concept_A2():
    for side, sg in (('L', 1.0), ('R', -1.0)):     # short reach: inner-thigh rays must not find the other leg
        FR['thigh' + side] = Frame(J['hip' + side] + np.array([0, 0, 0.06]), J['kn' + side], -Y, X * sg, 0.075, 0.0,
                                   0.46, reach=0.11)
    apply_suit_a2()
    chest_zip()
    # ---- armour: contoured composite chest plate, three overlapping rib segments, slim back plate
    neck = [(0.075, zt(1.335)), (0.04, zt(1.31)), (-0.04, zt(1.31)), (-0.075, zt(1.335))]
    cp = plate('plate', TOR, outline_rr(-0.115, 0.115, zt(1.14), zt(1.335), 0.03, notch=neck), 0.0155, 0.0065, rr=0.0042)
    for z0, z1, hw, off in ((1.085, 1.152, 0.105, 0.0105), (1.035, 1.10, 0.095, 0.0058), (0.985, 1.05, 0.085, 0.0012)):
        plate('plate', TOR, outline_rr(-hw, hw, zt(z0), zt(z1), 0.018), off, 0.0045, rr=0.0035)
    bp = plate('plate', TOR, outline_rr(TU - 0.10, TU + 0.10, zt(1.14), zt(1.33), 0.035), 0.008, 0.0065, rr=0.004)
    # ---- low-profile harness with magnetic buckles
    band('web', TOR, zt(1.17), 0.022, 0.0028, off=0.0035, th0=0.72, th1=math.pi - 0.5)
    band('web', TOR, zt(1.17), 0.022, 0.0028, off=0.0035, th0=-math.pi / 2, th1=-0.72)
    band('web', TOR, zt(1.17), 0.022, 0.0028, off=0.0035, th0=math.pi + 0.5, th1=1.5 * math.pi)
    for uu in (0.108, -0.108):
        mag_buckle(*TOR.basis(uu, zt(1.17), 0.0065, mode=cp.mode)[0:4], w=0.024, h=0.02)
    for sd in ('L', 'R'):
        fr = FR['sh' + sd]
        band('web', fr, 0.032, 0.022, 0.003, off=0.003, th0=-1.6, th1=1.52, mode='rig')
        P, tu, tv, n = fr.basis(1.36 * fr.R0, 0.032, 0.006)
        mag_buckle(P, tv, tu, n, w=0.022, h=0.016)
    # ---- chest rig on the plate: two rifle mags right of centre (tops lean to the left hand), gadget slot, knife
    for u in (-0.018, -0.072):
        mag_pouch(TOR, u, zt(1.205), 0.0225, 0.28, (0.023, 0.047, 0.0115), cp.mode)
    c, tu, tv, n = box_at('cordura', TOR, -0.062, zt(1.292), 0.0225, (0.03, 0.02, 0.0085), 0.006, mode=cp.mode)
    rbox_w('cordura', c + tv * 0.013 + n * 0.0085, [tu, tv, n], (0.032, 0.009, 0.0022), 0.002)      # flap
    rbox_w('gun', c + tv * 0.004 + n * 0.0105, [tu, tv, n], (0.007, 0.004, 0.0015), 0.0012)         # magnetic tab
    # knife: slim sheath on the plate left of centre, handle down
    c, tu, tv, n = box_at('poly', TOR, 0.05, zt(1.248), 0.0225, (0.011, 0.045, 0.006), 0.004, mode=cp.mode)
    rbox_w('gun', c - tv * 0.047 + n * 0.0005, [tu, tv, n], (0.0135, 0.0025, 0.007), 0.0015)        # guard
    rbox_w('grip', c - tv * 0.08 + n * 0.0005, [tu, tv, n], (0.0098, 0.031, 0.0072), 0.0042)        # handle
    rbox_w('gun', c - tv * 0.113 + n * 0.0005, [tu, tv, n], (0.0085, 0.0025, 0.0064), 0.002)        # pommel
    rbox_w('gun', c + tv * 0.018 + n * 0.007, [tu, tv, n], (0.0042, 0.008, 0.0015), 0.0012)         # release
    # ---- comms: PTT at the left collarbone where the step 07 earpiece cable ends
    bpy.data.objects['wren-head_kit-cable'].hide_render = False
    pend = np.array([0.071, -0.079, 1.366])
    hit = TREE.find_nearest(Vector(pend))
    nn = FT.unit(np.array(hit[1][:]))
    up = FT.unit(Z - nn * (Z @ nn))
    side = FT.unit(np.cross(up, nn))
    pc = pend - up * 0.016 + nn * 0.004
    rbox_w('poly', pc, [side, up, nn], (0.011, 0.016, 0.0055), 0.004)
    rbox_w('gun', pc + nn * 0.0058, [side, up, nn], (0.0065, 0.0085, 0.0014), 0.003)
    PTT = pc
    # ---- waist belt: slim, integrated, magnetic front closure, flush rappel ring at the back
    band('lam', TOR, zt(0.925), 0.032, 0.0045, off=0.0018)
    mag_buckle(*TOR.basis(0.012, zt(0.925), 0.0065)[0:4], w=0.04, h=0.026)
    P, tu, tv, n = TOR.basis(TU, zt(0.925), 0.0065)
    rbox_w('lam', P + n * 0.0025, [tu, tv, n], (0.024, 0.017, 0.0025), 0.002)                      # ring tunnel
    ring = [P - tv * 0.016 + n * 0.0022 + tu * 0.014 * math.cos(t) - tv * 0.012 * math.sin(t)
            for t in np.linspace(0, math.pi, 14)]
    tube_w('gun', ring, 0.0028, sides=8)
    # ---- pistol: suppressed sidearm, mid right thigh
    holster_a2()
    # ---- pistol mags: slim double pouch, left front of the belt (support hand)
    for u in (0.068, 0.1):
        mag_pouch(TOR, u, zt(0.905), 0.0065, 0.0, (0.0155, 0.038, 0.0095), 'raw')
    # ---- sticky cams and mines: small flat pouch at the left hip
    c, tu, tv, n = box_at('cordura', TOR, 0.205, zt(0.888), 0.0062, (0.034, 0.034, 0.0105), 0.006, mode='raw')
    rbox_w('cordura', c + tv * 0.026 + n * 0.0105, [tu, tv, n], (0.036, 0.012, 0.0022), 0.002)
    rbox_w('gun', c + tv * 0.016 + n * 0.013, [tu, tv, n], (0.0075, 0.004, 0.0015), 0.0012)
    # ---- throwables: three double canister sleeves on the left thigh panel
    thigh_sleeves()
    # ---- back: radio module in the plate, rifle, pod, medkit
    back_kit(bp, PTT)
    boots_a2()


def holster_a2():
    th = FR['thighR']
    uc = math.radians(80) * th.R0
    v0, v1 = 0.11, 0.29
    plate('poly', th, outline_rr(uc - 0.04, uc + 0.04, v0, v1, 0.012), 0.004, 0.004, rr=0.002)
    for vv in (v0 + 0.05, v1 - 0.035):
        band('elastic', th, vv, 0.024, 0.0026, off=0.0016)
        mag_buckle(*th.basis(uc - 0.055, vv, 0.0045)[0:4], w=0.02, h=0.02)
    surf_strip('web', th, [(uc, 0.0), (uc, v0 + 0.02)], 0.024, 0.0028, off=0.006)
    c, tu, tv, n = box_at('pistol', th, uc, (v0 + v1) / 2 + 0.01, 0.008, (0.025, 0.083, 0.016), 0.009)
    up = -tv
    rbox_w('pistol', c + up * 0.103 + n * 0.006, [tu, up, n], (0.014, 0.044, 0.012), 0.006)        # grip
    rbox_w('poly', c + up * 0.068 + n * 0.014, [tu, up, n], (0.021, 0.016, 0.006), 0.004)          # hood
    rbox_w('gun', c + up * 0.068 + n * 0.0205 + tu * 0.012, [tu, up, n], (0.005, 0.006, 0.0015), 0.001)
    tube_w('rmetal', [c - up * 0.083, c - up * 0.145], 0.0132, sides=16)                         # suppressor
    tube_w('gun', [c - up * 0.144, c - up * 0.146], 0.0134, sides=16)


def thigh_sleeves():
    th = FR['thighL']
    R0 = th.R0
    plate('lam', th, outline_rr(math.radians(34) * R0, math.radians(110) * R0, 0.075, 0.305, 0.012), 0.004, 0.003,
          rr=0.0015)
    for vv in (0.14, 0.28):
        band('elastic', th, vv, 0.022, 0.0025, off=0.0016)
        mag_buckle(*th.basis(math.radians(20) * R0, vv, 0.0045)[0:4], w=0.02, h=0.019)
    surf_strip('web', th, [(math.radians(72) * R0, 0.0), (math.radians(72) * R0, 0.085)], 0.022, 0.0026, off=0.005)
    for k, deg_ in enumerate((50, 72, 94)):
        u = math.radians(deg_) * R0
        P0, tu0, tv0, n0 = th.basis(u, 0.1, 0.007, )
        P1, _, _, n1 = th.basis(u, 0.29, 0.007)
        a = P0 + n0 * 0.0185
        b = P1 + n1 * 0.0185
        tube_w('elastic', [a, b], 0.0185, sides=18)
        tube_w('trim', [a - FT.unit(b - a) * 0.0005, a + FT.unit(b - a) * 0.004], 0.0192, sides=18)  # bound top
        ax = FT.unit(a - b)
        cap = a + ax * 0.006
        tube_w('mag', [a, cap + ax * 0.004], 0.0158, sides=16)                                      # canister top
        if k == 0:      # frag: knurled ring
            for q in range(3):
                tube_w('gun', [cap - ax * (0.001 + q * 0.003), cap - ax * (0.0025 + q * 0.003)], 0.0164, sides=16)
        elif k == 1:    # gas: domed cap
            rbox_w('mag', cap + ax * 0.006, [FT.unit(np.cross(ax, n0)), n0, ax], (0.012, 0.012, 0.004), 0.004)
        else:           # flash: two ridges
            for q in range(2):
                tube_w('poly', [cap - ax * (0.0005 + q * 0.005), cap - ax * (0.0025 + q * 0.005)], 0.0168, sides=16)
        # shock-cord retention over the cap, pull tab on the outer face
        side = FT.unit(np.cross(ax, n0))
        loop = [a + ax * 0.012 + side * 0.016 * math.cos(t) + n0 * 0.016 * math.sin(t)
                for t in np.linspace(0, math.pi, 12)]
        tube_w('cord', loop, 0.0015, sides=6)
        rbox_w('poly', a + ax * 0.012 + n0 * 0.0175, [side, ax, n0], (0.005, 0.005, 0.0016), 0.0012)


def back_kit(bp, PTT):
    # radio module seated in a recess in the back plate's upper left; cable up the left shoulder strap to the PTT
    ru0, ru1, rz0, rz1 = TU - 0.094, TU - 0.04, zt(1.255), zt(1.316)
    plate('poly', TOR, outline_rr(ru0, ru1, rz0, rz1, 0.008), 0.0145, 0.0062, rr=0.0025, mode=bp.mode)
    P, tu, tv, n = TOR.basis((ru0 + ru1) / 2, rz1 - 0.012, 0.0215, mode=bp.mode)
    rbox_w('gun', P + n * 0.0012 + tu * 0.012, [tu, tv, n], (0.006, 0.004, 0.0014), 0.001)          # channel knob
    # antenna: short flexible stub along the plate's top edge toward the centre, in an elastic keeper
    A0 = TOR.P(ru1 - 0.004, rz1 - 0.004, 0.024, bp.mode)
    A1 = TOR.P(ru1 + 0.03, rz1 + 0.004, 0.0235, bp.mode)
    tube_w('rpoly', [A0, (A0 + A1) / 2, A1], 0.0032, sides=10)
    # cable: radio top -> over the left shoulder along the strap edge -> PTT
    fr = FR['shL']
    pts = [TOR.P(ru0 + 0.012, rz1 + 0.001, 0.0235, bp.mode), TOR.P(ru0 + 0.004, zt(1.345), 0.02)]
    for t in np.linspace(-1.45, 1.05, 9):
        pts.append(fr.P(t * fr.R0, 0.032 - 0.0125, 0.0055))
    pts.append(PTT + Z * 0.0 - FT.unit(PTT - pts[-1]) * 0.0)
    tube_w('cord', pts, 0.0019, sides=8)
    for t in (-0.9, 0.0, 0.8):
        P, tu, tv, n = fr.basis(t * fr.R0, 0.032 - 0.012, 0.004)
        rbox_w('elastic', P + n * 0.002, [tu, tv, n], (0.004, 0.006, 0.0025), 0.0015)               # keepers
    rifle(bp)
    # pod: folded tri-rotor + battery, low on the back, left of the rifle line
    pu0, pu1, pz0, pz1 = TU - 0.128, TU - 0.016, zt(0.964), zt(1.06)
    plate('pod', TOR, outline_rr(pu0, pu1, pz0, pz1, 0.022), 0.004, 0.04, rr=0.014)
    ol = outline_rr(pu0 + 0.004, pu1 - 0.004, pz0 + 0.004, pz1 - 0.004, 0.022)
    Pl = TOR.P(ol[:, 0], ol[:, 1], 0.004 + 0.04 * 0.6)
    tube_w('trim', np.vstack([Pl, Pl[:1]]), 0.0015, sides=6)                                       # lid seal
    P, tu, tv, n = TOR.basis((pu0 + pu1) / 2, pz0 + 0.012, 0.046)
    rbox_w('gun', P, [tu, tv, n], (0.012, 0.004, 0.003), 0.0015)                                   # lid latch
    for uu in (pu0 + 0.03, pu1 - 0.03):
        surf_strip('web', TOR, [(uu, zt(1.152)), (uu, pz1 - 0.015)], 0.018, 0.0025, off=0.006)
    # medkit: flat tear-away pouch on the belt under the pod
    plate('cordura', TOR, outline_rr(TU - 0.122, TU - 0.026, zt(0.866), zt(0.95), 0.014), 0.0065, 0.019, rr=0.006)
    P, tu, tv, n = TOR.basis(TU - 0.074, zt(0.866), 0.024)
    pull = [P + tu * 0.012 * math.cos(t) - tv * (0.002 + 0.011 * math.sin(t)) for t in np.linspace(0, math.pi, 12)]
    tube_w('web', pull, 0.0026, sides=6)                                                            # pull handle
    ol = outline_rr(TU - 0.118, TU - 0.03, zt(0.87), zt(0.946), 0.012)
    Pl = TOR.P(ol[:, 0], ol[:, 1], 0.0065 + 0.019 * 0.55)
    tube_w('trim', np.vstack([Pl, Pl[:1]]), 0.0012, sides=6)                                       # tear seam


def rifle(bp):
    """Compact suppressed carbine (original shape) in a hard mount: stock up behind the left shoulder, muzzle down
    to the right hip, held by a plate clamp at the receiver and a belt cup round the suppressor."""
    a2 = FT.unit(np.array([-0.423, -0.906]))
    B = np.array([0.14, 1.38])
    L = 0.66
    d2 = np.array([-a2[1], a2[0]])
    if d2[0] > 0:
        d2 = -d2                                       # gun-down (mag, grip) points up and to the wearer's right
    S_ = np.linspace(0, L, 40)
    cons = []
    for s in S_:
        for t, half in ((0.0, 0.021), (-0.03, 0.017)):
            cons.append((s, t, half))
    for s in np.linspace(0.19, 0.36, 8):
        for t in (0.04, 0.07, 0.10):
            cons.append((s, t, 0.013))
    cs, req = [], []
    for s, t, half in cons:
        x, z = B + a2 * s + d2 * t
        hit = TREE.ray_cast(Vector((x, 0.6, z)), Vector((0, -1, 0)), 1.0)
        if hit[0] is None:
            continue
        yh = hit[0].y
        extra = 0.004
        if abs(x) < 0.105 and 1.135 < z < 1.335:
            extra += 0.0235
        elif abs(z - 0.925) < 0.02:
            extra += 0.0075
        cs.append(s)
        req.append(yh + extra + half)
    cs, req = np.array(cs), np.array(req)
    best = None
    for k in np.linspace(-0.2, 0.2, 401):
        y0 = np.max(req - k * cs)
        sc_ = np.mean(y0 + k * cs - req)
        if best is None or sc_ < best[0]:
            best = (sc_, y0, k)
    _, y0, k = best
    print('stealth: rifle line y0 %.3f slope %.3f mean gap %.4f' % (y0, k, best[0]))
    a3 = FT.unit(np.array([a2[0], k, a2[1]]))
    d3 = np.array([d2[0], 0.0, d2[1]])
    n3 = FT.unit(np.cross(a3, d3))
    if n3[1] < 0:
        n3 = -n3
    d3 = FT.unit(np.cross(n3, a3))
    if d3 @ np.array([d2[0], 0, d2[1]]) < 0:
        d3 = -d3

    def c(s, t=0.0, h=0.0):
        return np.array([B[0] + a2[0] * s, y0 + k * s, B[1] + a2[1] * s]) + d3 * t + n3 * h

    AX = [a3, d3, n3]
    rbox_w('rpoly', c(0.009, 0.006), AX, (0.009, 0.047, 0.016), 0.005)                 # butt pad
    rbox_w('grip', c(0.0015, 0.006), AX, (0.0018, 0.042, 0.014), 0.0015)               # rubber butt face
    tube_w('rpoly', [c(0.012, -0.028), c(0.165, -0.012)], 0.0068, sides=10)            # stock bars
    tube_w('rpoly', [c(0.012, 0.042), c(0.15, 0.013)], 0.0062, sides=10)
    tube_w('rmetal', [c(0.10), c(0.172)], 0.0125, sides=14)                          # buffer tube
    rbox_w('rmetal', c(0.28), AX, (0.115, 0.024, 0.0155), 0.005)                     # receiver
    rbox_w('rmetal', c(0.30, 0.03), AX, (0.05, 0.012, 0.0145), 0.004)                # mag well
    rbox_w('rmetal', c(0.335, -0.028), AX, (0.095, 0.004, 0.0085), 0.0015)           # top rail
    rbox_w('rpoly', c(0.245, -0.042), AX, (0.026, 0.013, 0.0125), 0.005)             # enclosed sight
    g = FT.unit(d3 * 0.96 - a3 * 0.28)
    ga = FT.unit(np.cross(g, n3))
    rbox_w('rpoly', c(0.205, 0.024) + g * 0.044, [ga, g, n3], (0.0125, 0.044, 0.0132), 0.006)  # grip
    guard = [c(0.218 + 0.022 * (1 - math.cos(t)), 0.024 + 0.022 * math.sin(t)) for t in np.linspace(0, math.pi, 10)]
    tube_w('rmetal', guard, 0.0022, sides=6)
    m = FT.unit(d3 + a3 * 0.62)                       # swept toward the muzzle: stays inside the torso outline
    ma = FT.unit(np.cross(m, n3))
    rbox_w('mag', c(0.305, 0.03) + m * 0.044, [ma, m, n3], (0.0155, 0.044, 0.011), 0.004)        # magazine
    rbox_w('rpoly', c(0.305, 0.03) + m * 0.09, [ma, m, n3], (0.018, 0.004, 0.0125), 0.002)
    rbox_w('rpoly', c(0.47), AX, (0.08, 0.021, 0.0185), 0.0085)                      # handguard
    rbox_w('elastic', c(0.47), AX, (0.008, 0.0235, 0.0205), 0.003)                   # sling keeper
    tube_w('rmetal', [c(0.545), c(0.66)], 0.0175, sides=22)                          # suppressor
    tube_w('gun', [c(0.548), c(0.556)], 0.0181, sides=22)
    tube_w('gun', [c(0.655), c(0.661)], 0.0179, sides=22)
    # upper mount: composite riser on the back plate, gunmetal clamp round the receiver's rear
    s_m = 0.19
    gp = c(s_m)
    u, v, _ = TOR.local(gp[None])
    ps = TOR.P(u[0], v[0], 0.0215, bp.mode)
    back = gp - n3 * 0.0155
    hh = max(0.002, (back - ps) @ n3 / 2)
    rbox_w('plate', ps + n3 * hh, AX, (0.026, 0.028, hh), 0.003)
    for sgn in (1, -1):
        rbox_w('gun', c(s_m, sgn * 0.0265, 0.0), AX, (0.02, 0.0045, 0.017), 0.002)
    rbox_w('gun', c(s_m, -0.031, 0.008), AX, (0.008, 0.004, 0.006), 0.0015)          # release lever
    # lower mount: moulded cup round the suppressor on the belt (open bottom: the muzzle shows)
    tube_w('plate', [c(0.55), c(0.625)], 0.0222, sides=24)
    gp = c(0.585)
    u, v, _ = TOR.local(gp[None])
    ps = TOR.P(u[0], v[0], 0.0063)
    back = gp - n3 * 0.021
    hh = max(0.002, (back - ps) @ n3 / 2)
    rbox_w('plate', ps + n3 * hh, AX, (0.03, 0.016, hh), 0.003)


def boots_a2():
    """Lighter approach boot from the step 06 boot: cut low, padded collar, heel pull loop, sticky toe rand, low lugs."""
    def zcut(p):
        return 0.122 + 0.016 * min(1.0, max(0.0, (-p[1] - 0.0) / 0.06))

    for n in ('wren-boots-hero', 'wren-boots-laces', 'wren-boots-hardware', 'wren-boots-stitches'):
        o = bpy.data.objects[n]
        bm = bmesh.new()
        bm.from_mesh(o.data)
        M4 = o.matrix_world
        kill = [v for v in bm.verts if (M4 @ v.co).z > zcut(M4 @ v.co)]
        bmesh.ops.delete(bm, geom=kill, context='VERTS')
        bm.to_mesh(o.data)
        bm.free()
        o.data.update()
    for n in ('wren-boots-pull', 'wren-boots-garage'):
        bpy.data.objects[n].hide_render = True
    lg = bpy.data.objects['wren-boots-lugs']
    for v in lg.data.vertices:
        w = lg.matrix_world @ v.co
        w.z = 0.007 - (0.007 - w.z) * 0.45
        v.co = lg.matrix_world.inverted() @ w
    lg.data.update()
    dg2 = bpy.context.evaluated_depsgraph_get()
    hero = bpy.data.objects['wren-boots-hero']
    he = hero.evaluated_get(dg2)
    me = he.to_mesh()
    HV = np.array([hero.matrix_world @ v.co for v in me.vertices])
    HF = [tuple(p.vertices) for p in me.polygons]
    he.to_mesh_clear()
    for sg in (1, -1):
        keep = [f for f in HF if HV[f[0]][0] * sg > 0]
        tree = BVHTree.FromPolygons([tuple(v) for v in HV], keep)
        cx, cy = 0.163 * sg, -0.072

        def wrap(z, th, off):
            dv = np.array([math.cos(th), math.sin(th), 0.0])
            o = np.array([cx, cy, z]) + dv * 0.3
            hit = tree.ray_cast(Vector(o), Vector(-dv), 0.3)
            if hit[0] is None:
                return None
            return np.array(hit[0][:]) + FT.unit(np.array(hit[1][:])) * off

        # sticky rand: rubber band round the sole edge, rising over the toe
        ths = np.linspace(0, 2 * math.pi, 160, endpoint=False)
        rows = 6
        Vr, Fr = part('rand')
        base = len(Vr)
        ok = True
        grid = []
        for th in ths:
            front = max(0.0, -math.sin(th))
            ztop = 0.037 + 0.02 * front ** 1.6
            col = []
            for r_ in range(rows):
                z = 0.026 + (ztop - 0.026) * r_ / (rows - 1)
                p = wrap(z, th, 0.0026)
                col.append(p)
            grid.append(col)
        for j, col in enumerate(grid):
            for r_, p in enumerate(col):
                if p is None:
                    p = grid[j - 1][r_] if grid[j - 1][r_] is not None else np.array([cx, cy, 0.03])
                    grid[j][r_] = p
                Vr.append(p)
        nth = len(ths)
        for j in range(nth):
            j2 = (j + 1) % nth
            for r_ in range(rows - 1):
                Fr.append((base + j * rows + r_, base + j2 * rows + r_, base + j2 * rows + r_ + 1, base + j * rows + r_ + 1))
        # padded collar round the cut
        ring = []
        cx2 = 0.162 * sg
        for th in np.linspace(0, 2 * math.pi, 72, endpoint=False):
            dv = np.array([math.cos(th), math.sin(th), 0.0])
            z = zcut(np.array([cx2, -0.009 + dv[1] * 0.04, 0])) - 0.004
            o = np.array([cx2, -0.009, z]) + dv * 0.3
            hit = tree.ray_cast(Vector(o), Vector(-dv), 0.3)
            if hit[0] is not None:
                ring.append(np.array(hit[0][:]) + FT.unit(np.array(hit[1][:])) * 0.002)
        tube_w('pad', ring, 0.0055, sides=10, closed=True)
        # heel pull loop
        pb = max(ring, key=lambda q: q[1])
        tube_w('web', [pb + np.array([0.008 * sg, 0.003, -0.004]), pb + np.array([0.008 * sg, 0.012, 0.022]),
                       pb + np.array([-0.008 * sg, 0.012, 0.022]), pb + np.array([-0.008 * sg, 0.003, -0.004])],
               0.0028, sides=6)


M['rand'] = MT.rubber('a2 sticky rand', (0.027, 0.028, 0.03), 0.62)
concept_A2()
flush()
print('stealth: built')

# ---------------------------------------------------------------- render (same rig and AgX exposure as the concepts)
if args.save:
    bpy.ops.wm.save_as_mainfile(filepath=args.save)
RN.floor(8.0)
sc.view_settings.exposure = -1.9
try:
    sc.view_settings.look = 'AgX - Medium High Contrast'
except TypeError:
    pass
sc.cycles.max_bounces = 6
sc.render.film_transparent = False


def lights_studio():
    RN.world(sc, strength=0.12, colour=(0.2, 0.205, 0.215))
    RN.area_light('key', (2.2, -3.2, 2.6), (0, 0, 1.0), 520, 2.4)
    RN.area_light('fill', (-3.0, -2.2, 1.4), (0, 0, 0.9), 170, 3.0, (0.92, 0.95, 1.0))
    RN.area_light('rimL', (1.8, 2.8, 2.2), (0, 0, 1.1), 320, 1.4, (0.9, 0.95, 1.0))
    RN.area_light('rimR', (-1.8, 2.8, 2.2), (0, 0, 1.1), 320, 1.4, (0.9, 0.95, 1.0))


def lights_rim():
    RN.world(sc, strength=0.02, colour=(0.15, 0.16, 0.18))
    RN.area_light('rimL', (1.7, 2.0, 1.9), (0, 0, 1.0), 700, 0.8, (0.8, 0.9, 1.0))
    RN.area_light('rimR', (-1.7, 2.0, 1.9), (0, 0, 1.0), 700, 0.8, (0.8, 0.9, 1.0))
    RN.area_light('top', (0.0, 1.0, 3.2), (0, 0, 1.0), 120, 0.6, (0.8, 0.9, 1.0))


def clear_lights():
    for o in list(bpy.data.objects):
        if o.type == 'LIGHT':
            bpy.data.objects.remove(o)


def shoot(name, loc, target, lens, res):
    for o in list(bpy.data.objects):
        if o.type == 'CAMERA':
            bpy.data.objects.remove(o)
    c = RN.camera('cam', loc, target, lens)
    c.data.sensor_fit = 'VERTICAL'
    c.data.sensor_height = 24.0
    sc.camera = c
    res = (res[0] * args.scale // 100, res[1] * args.scale // 100)
    path = os.path.join(args.dest, f'A2-{name}.webp')
    RN.write_webp(sc, path, res, 90)
    print('stealth: wrote', path)


SH = set(args.shots.split(','))
FULL = (1000, 1500)
CLOSE = (1200, 1400)
lights_studio()
if 'front' in SH:
    shoot('front', (0, -5.7, 0.95), (0, 0, 0.88), 70, FULL)
if 'back34' in SH:
    shoot('back34', (3.9, 4.1, 1.05), (0, 0, 0.88), 70, FULL)
if 'side' in SH:
    shoot('side', (-5.7, 0, 0.95), (0, 0, 0.88), 70, FULL)
if 'chest' in SH:
    shoot('chest', (-0.75, -1.75, 1.25), (0.0, -0.05, 1.12), 70, CLOSE)
if 'back' in SH:
    shoot('back', (0.55, 2.0, 1.25), (0.0, 0.05, 1.08), 60, CLOSE)
if 'thigh-right' in SH:
    shoot('thigh-right', (-1.55, -1.05, 0.95), (-0.15, -0.01, 0.76), 70, CLOSE)
if 'thigh-left' in SH:
    shoot('thigh-left', (0.95, -1.7, 0.92), (0.14, -0.02, 0.8), 70, CLOSE)
if 'boot' in SH:
    shoot('boot', (-0.75, -0.9, 0.32), (-0.165, -0.07, 0.065), 70, CLOSE)
if 'rim' in SH:
    clear_lights()
    lights_rim()
    shoot('rim', (-2.4, -5.2, 1.0), (0, 0, 0.88), 70, FULL)
print('stealth: done')
