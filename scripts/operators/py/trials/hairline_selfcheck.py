"""(G10a D4 / D4b) Synthetic self-check of the hair-cap hairline snap (build_head.py helpers). Blender Python, no scene:
blender -b --factory-startup --python-exit-code 1 --python scripts/operators/py/trials/hairline_selfcheck.py
(a) a 48-vertex sawtooth ring with a swapped pair against a 400-point circle contour: after snap_loops 0.0 mm off the
    contour and <= 15 deg, no corner slide, both windings.
(b) a planar 400-point contour with one 110 deg corner filleted at 3 mm, a coarse 24-vertex loop spaced evenly with one
    vertex on the corner: before corner_slide the corner turns > 75 deg; after <= 70, 0.0 mm, par strictly increasing
    (unwrapped), both windings, the corner mid-loop and on the seam; and through snap_loops / loops_measure.
Exits 1 on any fail."""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import build_head as bh  # noqa: E402

fails = []


def check(ok, what):
    print(('PASS ' if ok else 'FAIL ') + what)
    if not ok:
        fails.append(what)


def as_line(P):
    P = np.asarray(P, dtype=np.float64)
    seg = np.linalg.norm(np.roll(P, -1, axis=0) - P, axis=1)
    cum = np.concatenate([[0.0], np.cumsum(seg)])
    return P, cum, float(cum[-1])


def resample(dense, m, start=0):
    """m points evenly by arc length along a closed dense polyline, the first at dense[start]."""
    line = as_line(np.roll(dense, -start, axis=0))
    return np.array([bh.polyline_point(line, line[2] * k / m) for k in range(m)])


def fan(n, flip):
    """Triangles from a ring 0..n-1 to a centre vertex n; flip reverses the winding."""
    return [[i, n, (i + 1) % n] if flip else [i, (i + 1) % n, n] for i in range(n)]


# (a) sawtooth against a circle
R = 0.08
circle = np.array([[R * math.cos(a), R * math.sin(a), 0.0] for a in np.linspace(0, 2 * math.pi, 400, endpoint=False)])
lines_a = [as_line(circle)]
ring = []
for k in range(48):
    a = 2 * math.pi * (k + 0.3) / 48
    r = R + (0.004 if k % 2 else -0.004)
    ring.append([r * math.cos(a), r * math.sin(a), 0.0])
ring[10], ring[11] = ring[11], ring[10]
co_a = np.array(ring + [[0.0, 0.0, 0.0]])
for flip in (False, True):
    polys = fan(48, flip)
    pre = bh.loops_measure(co_a, polys, lines_a)
    co, kept, slides = bh.snap_loops(co_a, polys, lines_a)
    post = bh.loops_measure(co, polys, lines_a, kept, slides)
    tag = f'(a) sawtooth flip={flip}'
    print(tag, 'before', pre, 'after', post)
    check(pre['maxTurnDeg'] > 75 and pre['maxDevMm'] > 1.5, f'{tag}: the input is a sawtooth')
    check(post['maxDevMm'] == 0.0, f'{tag}: 0.0 mm off the contour')
    check(post['maxTurnDeg'] <= 15.0, f'{tag}: turns <= 15 deg')
    check(post['cornerSlides'] == 0 and post['keptOwn'] == 0 and post['pinchVerts'] == 0, f'{tag}: no slide, kept, pinch')

# (b) a 110 deg corner filleted at 3 mm
HALF = math.radians(35.0)   # half the 70 deg inside angle: the contour turns 110 deg there
RB, RF, STEP = 0.05, 0.003, 0.0001
u1, u2 = np.array([math.sin(HALF), math.cos(HALF)]), np.array([-math.sin(HALF), math.cos(HALF)])
cf, cb = np.array([0.0, RF / math.sin(HALF)]), np.array([0.0, RB / math.sin(HALF)])
f1, f2 = u1 * RF / math.tan(HALF), u2 * RF / math.tan(HALF)
g1, g2 = u1 * RB / math.tan(HALF), u2 * RB / math.tan(HALF)


def arc(c, p, q, r, through):
    a0, a1 = math.atan2(*(p - c)[::-1]), math.atan2(*(q - c)[::-1])
    a1 = a0 + ((a1 - a0) % (2 * math.pi))          # counterclockwise p -> q
    mid = (a0 + a1) / 2
    if abs(((mid - through + math.pi) % (2 * math.pi)) - math.pi) > math.pi / 2:
        a1 -= 2 * math.pi                            # the other way round
    m = max(2, int(abs(a1 - a0) * r / STEP))
    return [c + r * np.array([math.cos(a), math.sin(a)]) for a in np.linspace(a0, a1, m, endpoint=False)]


def seg(p, q):
    m = max(2, int(np.linalg.norm(q - p) / STEP))
    return [p + (q - p) * t for t in np.linspace(0, 1, m, endpoint=False)]


dense2 = arc(cf, f1, f2, RF, -math.pi / 2) + seg(f2, g2) + arc(cb, g2, g1, RB, math.pi / 2) + seg(g1, f1)
dense = np.array([[p[0], p[1], 0.0] for p in dense2])
apex = int(np.argmin(dense[:, 1]))                  # the fillet's middle: the corner
contour = resample(dense, 400, apex)
for flip in (False, True):
    P = np.roll(contour[::-1], 1, axis=0) if flip else contour   # P[0] stays the corner
    line = as_line(P)
    L = line[2]
    print(f'(b) contour flip={flip}: {len(P)} pts, {L * 1000:.1f} mm, max turn {bh.turn_degs_all(P).max():.1f} deg')
    for mid in (12, 0):
        tag = f'(b) corner flip={flip} corner at {mid}'
        s0 = -mid * L / 24
        par = [k * L / 24 for k in range(24)]
        own = np.array([bh.polyline_point(line, s0 + p) for p in par])
        t0 = bh.turn_degs_all(own)
        par2, slides = bh.corner_slide(line, s0, par, own)
        pos = np.array([bh.polyline_point(line, s0 + p) for p in par2])
        t1 = bh.turn_degs_all(pos)
        dev = max(bh.polyline_nearest(x, line)[2] for x in pos)
        steps = [(par2[(i + 1) % 24] - par2[i]) % L for i in range(24)]
        print(tag, f'before {t0.max():.1f} deg at {int(np.argmax(t0))}, after {t1.max():.1f} deg, slides {slides}, '
                   f'dev {dev * 1000:.4f} mm, min step {min(steps) * 1000:.2f} mm')
        check(t0.max() > 75 and int(np.argmax(t0)) == mid, f'{tag}: before turns > 75 at the corner')
        check(t1.max() <= 70, f'{tag}: after <= 70 deg')
        check(round(dev * 1000, 3) == 0.0, f'{tag}: 0.0 mm off the contour')
        check(min(steps) > 0 and abs(sum(steps) - L) < 1e-9, f'{tag}: par strictly increasing')
    # the same corner through snap_loops (the cap path), a fan from inside the contour
    ring = [bh.polyline_point(line, k * L / 24) for k in range(24)]
    co_b = np.array(ring + [[cb[0], cb[1], 0.0]])
    for fl in (False, True):
        polys = fan(24, fl)
        pre = bh.loops_measure(co_b, polys, [line])
        co, kept, slides = bh.snap_loops(co_b, polys, [line])
        post = bh.loops_measure(co, polys, [line], kept, slides)
        tag = f'(b) snap_loops contour flip={flip} fan flip={fl}'
        print(tag, 'before', pre, 'after', post)
        check(pre['maxTurnDeg'] > 75, f'{tag}: before > 75 deg')
        check(post['maxTurnDeg'] <= 70 and post['maxDevMm'] == 0.0 and post['cornerSlides'] > 0,
              f'{tag}: after <= 70 deg, 0.0 mm, slides')

print(f'hairline_selfcheck: {len(fails)} fail(s)')
sys.stdout.flush()
if fails:
    sys.exit(1)
