p = 'stealth.py'
s = open(p, encoding='utf8').read()


def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:60], s.count(a))
    s = s.replace(a, b)


rep("""                hit = TREE.ray_cast(o, Vector(d), reach)
                if hit[0] is not None:
                    R[i, j] = hit[3]""", """                hit = TREE.ray_cast(o, Vector(d), reach)
                if hit[0] is not None:
                    r1 = hit[3]
                    o2 = o + Vector(d * (r1 + 0.008))
                    h2 = TREE.ray_cast(o2, Vector(-d), 0.0085)
                    R[i, j] = r1 + 0.008 - h2[3] if h2[0] is not None else r1""")
rep("""        n = FT.unit(np.cross(tu, tv))
        if n @ self.dirs(u / self.R0) < 0:
            n = -n
        tv = FT.unit(np.cross(n, tu))
        return P, tu, tv, n""", """        n = FT.unit(np.cross(tu, tv))
        if n @ self.dirs(u / self.R0) < 0:
            n = -n
        tv = FT.unit(tv - n * (tv @ n))
        tu = FT.unit(np.cross(tv, n))
        return P, tu, tv, n""")
rep("""        zone('stretch', 'sh' + sd, outline_rr(-math.pi * 0.07 * 0.95, -0.085, 0.04, 0.15, 0.015)
             if sd == 'L' else outline_rr(0.085, math.pi * 0.07 * 0.95, 0.04, 0.15, 0.015))""",
    """        zone('stretch', 'sh' + sd, outline_rr(-math.pi * 0.07 * 0.95, -0.085, 0.04, 0.15, 0.015))""")
rep("""    # crotch gusset stretch: low centre front / back between the legs
    zone('stretch', 'torso', ellipse(0.0, -0.045, 0.045, 0.06))
""", "")
rep("surf_strip('tape', fr, np.vstack([poly, poly[:1]]), 0.0055, 0.0007, off=0.0009, mode='soft')",
    "surf_strip('tape', fr, np.vstack([poly, poly[:1]]), 0.0055, 0.0007, off=0.0003, mode='soft')")
rep("rbox_w('poly', FR['shL'].P(-1.2 * 0.07, 0.045, 0.012)", "rbox_w('poly', FR['shL'].P(1.25 * 0.07, 0.045, 0.012)")
rep("Q = FR['thigh' + sd].P(-0.025 * sg * 0 - 0.03 * sg, 0.07, 0.006)", "Q = FR['thigh' + sd].P(-0.03, 0.07, 0.006)")
rep("    uc = math.radians(-35) * fa.R0", "    uc = math.radians(80) * fa.R0")
rep("""    band('web', TOR, zt(1.17), 0.022, 0.0028, off=0.0035, th0=0.75, th1=math.pi - 0.62)
    band('web', TOR, zt(1.17), 0.022, 0.0028, off=0.0035, th0=-(math.pi - 0.62), th1=-0.75)
    band('web', TOR, zt(1.17), 0.022, 0.0028, off=0.0035, th0=math.pi + 0.62, th1=1.5 * math.pi - 0.001)""",
    """    band('web', TOR, zt(1.17), 0.022, 0.0028, off=0.0035, th0=0.72, th1=math.pi - 0.5)
    band('web', TOR, zt(1.17), 0.022, 0.0028, off=0.0035, th0=-math.pi / 2, th1=-0.72)
    band('web', TOR, zt(1.17), 0.022, 0.0028, off=0.0035, th0=math.pi + 0.5, th1=1.5 * math.pi)""")
rep("""    band('elastic', TOR, zt(1.12), 0.06, 0.004, off=0.006, th0=0.7, th1=math.pi - 0.66)
    band('elastic', TOR, zt(1.12), 0.06, 0.004, off=0.006, th0=-(math.pi - 0.66), th1=-0.7)
    band('elastic', TOR, zt(1.12), 0.06, 0.004, off=0.006, th0=math.pi + 0.66, th1=1.5 * math.pi - 0.001)""",
    """    band('elastic', TOR, zt(1.12), 0.06, 0.004, off=0.004, th0=0.7, th1=math.pi - 0.6)
    band('elastic', TOR, zt(1.12), 0.06, 0.004, off=0.004, th0=-math.pi / 2, th1=-0.7)
    band('elastic', TOR, zt(1.12), 0.06, 0.004, off=0.004, th0=math.pi + 0.6, th1=1.5 * math.pi)""")
rep("for k, u in enumerate((0.03, 0.068)):", "for k, u in enumerate((0.026, 0.074)):")
rep("plate('plate', TOR, ol[::-1] if False else ol, 0.012, 0.0075, rr=0.0045)",
    "plate('plate', TOR, ol, 0.0155, 0.0065, rr=0.0042)")
rep("""    for k, (z0, z1, hw, off) in enumerate(((1.085, 1.155, 0.105, 0.0095), (1.035, 1.10, 0.095, 0.007),
                                           (0.985, 1.05, 0.085, 0.0048))):
        plate('plate', TOR, outline_rr(-hw, hw, zt(z0), zt(z1), 0.018), off, 0.0055, rr=0.004)""",
    """    for k, (z0, z1, hw, off) in enumerate(((1.085, 1.152, 0.105, 0.0105), (1.035, 1.10, 0.095, 0.0058),
                                           (0.985, 1.05, 0.085, 0.0012))):
        plate('plate', TOR, outline_rr(-hw, hw, zt(z0), zt(z1), 0.018), off, 0.0045, rr=0.0035)""")
rep("mag('cordura', TOR, u, zt(1.19), 0.019, -0.32, pistol=True)", "mag('cordura', TOR, u, zt(1.19), 0.022, -0.32, pistol=True)")
rep("box_at('cordura', TOR, -0.06, zt(1.215), 0.019,", "box_at('cordura', TOR, -0.06, zt(1.215), 0.022,")
rep("""        plate('plate', sh, outline_rr(-0.045, 0.045, -0.035, 0.03, 0.02), 0.004, 0.009, rr=0.004)
        plate('plate', sh, outline_rr(-0.038, 0.038, 0.022, 0.075, 0.016), 0.003, 0.007, rr=0.004)""",
    """        band('elastic', sh, 0.058, 0.018, 0.002, off=0.0012)
        plate('plate', sh, outline_rr(-0.045, 0.045, -0.035, 0.03, 0.02), 0.0045, 0.008, rr=0.004)
        plate('plate', sh, outline_rr(-0.038, 0.038, 0.034, 0.085, 0.016), 0.0036, 0.006, rr=0.0035)""")
rep("        band('elastic', sh, 0.05, 0.02, 0.002, off=0.0015, th0=0.9, th1=2 * math.pi - 0.9 - 0.0)\n", "")
rep("""    for k, (z0, z1, hw, off) in enumerate(((1.105, 1.165, 0.09, 0.0028), (1.055, 1.115, 0.085, 0.0022),
                                           (1.005, 1.065, 0.078, 0.0016))):""",
    """    for k, (z0, z1, hw, off) in enumerate(((1.11, 1.152, 0.09, 0.002), (1.06, 1.102, 0.085, 0.002),
                                           (1.01, 1.052, 0.078, 0.002))):""")
rep("plate('plate', ua, outline_rr(lat - 0.04, lat + 0.04, 0.065, 0.115, 0.016), 0.0022, 0.0045, rr=0.003)",
    "plate('plate', ua, outline_rr(lat - 0.04, lat + 0.04, 0.085, 0.135, 0.016), 0.003, 0.0045, rr=0.003)")
rep("plate('plate', fa, outline_rr(uo - 0.03, uo + 0.03, 0.04, 0.12, 0.014), 0.0025, 0.0045, rr=0.003)",
    "plate('plate', fa, outline_rr(uo - 0.03, uo + 0.03, 0.04, 0.12, 0.014), 0.003, 0.0045, rr=0.003)")
rep("plate('plate', fa, outline_rr(uo - 0.026, uo + 0.026, 0.115, 0.19, 0.012), 0.0018, 0.0042, rr=0.003)",
    "plate('plate', fa, outline_rr(uo - 0.026, uo + 0.026, 0.13, 0.20, 0.012), 0.003, 0.0042, rr=0.003)")
rep("plate('plate', sh, outline_rr(-0.036, 0.036, 0.04, 0.17, 0.016), 0.0026, 0.005, rr=0.003)",
    "plate('plate', sh, outline_rr(-0.036, 0.036, 0.04, 0.17, 0.016), 0.003, 0.005, rr=0.003)")
rep("plate('plate', sh, outline_rr(-0.032, 0.032, 0.16, 0.27, 0.014), 0.002, 0.0045, rr=0.003)",
    "plate('plate', sh, outline_rr(-0.032, 0.032, 0.18, 0.28, 0.014), 0.003, 0.0045, rr=0.003)")
rep("pocket(TOR, -0.12, -0.04, zt(1.06), zt(1.15) - 0.0, False)", "pocket(TOR, -0.165, -0.105, zt(1.0), zt(1.1), False)")
rep("for u in (0.13, 0.155):", "for u in (0.12, 0.165):")
open(p, 'w', encoding='utf8').write(s)
print('patched')
