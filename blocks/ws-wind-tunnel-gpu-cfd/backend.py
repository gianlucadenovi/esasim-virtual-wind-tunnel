# ── EsaSim block ──────────────────────────────────────────────────────
# Wind tunnel (GPU CFD) (ws-wind-tunnel-gpu-cfd) · version 5 · worker block, Python: def run(ctx)
# A virtual wind tunnel for car models: lattice-Boltzmann LES on the GPU (NVIDIA Warp) gives drag, lift, surface pressure, streamlines and the flow field for real-time smoke, for each GLB/STL/OBJ car.
# Workspace: Gianluca De Novi's workspace · Author: Gianluca De Novi
# Saved: 2026-11-18
#
# Inputs   ctx.inputs["id"] is a list of files: .path .name .size .read_text() .read_json()
#   models      Files (glb, gltf, stl, obj, ply, off) Car models · several · optional · One car per file; orientation and units are found automatically (see the settings)
# Outputs  ctx.output("id", "name.ext") is the path to write; ctx.write_json / ctx.write_text
#   tunnel      Files (gz, glb, gltf)     Tunnel results (View) · <model>.tunnel.json.gz, <model>.field.bin.gz and <model>.source.glb for the Wind tunnel view
#   results     Table (csv)               Results · results.csv: one row per car: Cd, Cl, Cs, frontal area, CdA, drag, lift, drag power
#   history     Table (csv)               Convergence · convergence.csv: model, t (flow-through times), cd, cl
#   surfaces    Files (ply)               Pressure surfaces · <model>_cp.ply: the surface coloured by Cp, with a cp vertex property
#   models      Files (stl)               Sample cars · The built-in cars used, as STL
#   report      Text (md)                 Report
#   telemetry   Live telemetry            ctx.telemetry("channel", data) while it runs
# Settings ctx.params["key"]
#   samples     text      Sample cars = "none"
#   resolution  select    Resolution (cells per car length) = "128 (fine)" of 64 (quick) | 96 (standard) | 128 (fine) | 160 (…
#   speed_kmh   number    Wind speed (km/h) = 120
#   flow_time   number    Flow-through times = 8
#   real_lengths textarea  Real lengths = ""
#   length_axis select    Length axis (files) = "auto" of auto | x | y | z
#   up_axis     select    Up axis (files) = "auto" of auto | z | y | x
#   nose        select    Nose at = "auto" of auto | min | max
#   units       select    Units (files) = "auto" of auto | m | cm | mm | in
#   reynolds    number    LES Reynolds number cap = 1000000
#   smagorinsky number    Smagorinsky constant = 0.17
#   wall_slip   number    Wall slip (0 no-slip, 1 free-slip) = 0.85
#   max_triangles number    Triangles in the View (STL/OBJ) = 160000
# Runs on  NVIDIA GPU. Return a dict to fill the "result" output.
# Packages warp-lang, numpy, scipy, scikit-image, trimesh, fast-simplification (installed by the worker with pip when missing)
# EsaSim rewrites these lines from the block's definition each time it is saved: change the definition, not them.
# ── end of EsaSim block header ────────────────────────────────────────

# EsaSim wind tunnel: GPU lattice-Boltzmann CFD around car models (NVIDIA Warp)
import numpy as np


def _poly_sdf(px, pz, poly):
    poly = np.asarray(poly, dtype=np.float64)
    d2 = np.full(px.shape, np.inf)
    sign = np.ones(px.shape)
    n = len(poly)
    for i in range(n):
        ax, az = poly[i - 1]
        bx, bz = poly[i]
        ex, ez = bx - ax, bz - az
        wx, wz = px - ax, pz - az
        t = np.clip((wx * ex + wz * ez) / (ex * ex + ez * ez + 1e-12), 0.0, 1.0)
        dx, dz = wx - ex * t, wz - ez * t
        d2 = np.minimum(d2, dx * dx + dz * dz)
        c1 = pz >= az
        c2 = pz < bz
        c3 = ex * wz > ez * wx
        flip = (c1 & c2 & c3) | (~c1 & ~c2 & ~c3)
        sign = np.where(flip, -sign, sign)
    return sign * np.sqrt(d2)


def _smax(a, b, k):
    h = np.clip(0.5 - 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1 - h) + a * h + k * h * (1 - h)


def _box(x, y, z, x0, x1, hy, z0, z1):
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    qx = np.abs(x - cx) - (x1 - x0) / 2
    qy = np.abs(y) - hy
    qz = np.abs(z - cz) - (z1 - z0) / 2
    out = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2 + np.maximum(qz, 0) ** 2)
    return out + np.minimum(np.maximum(np.maximum(qx, qy), qz), 0)


CARS = {
    "fastback": dict(label="Fastback sedan (DrivAer-like)", L=4.61, W=1.82, H=1.42, wb=2.79, xf=0.88, r=0.33, tw=0.22, track=1.56,
                     profile=[(0.06, 0.20), (0.0, 0.42), (0.03, 0.66), (0.95, 0.86), (1.55, 0.95), (2.30, 1.42), (3.00, 1.40),
                              (4.30, 0.98), (4.61, 0.92), (4.58, 0.40), (4.35, 0.20), (0.40, 0.17)]),
    "notchback": dict(label="Notchback sedan", L=4.61, W=1.82, H=1.42, wb=2.79, xf=0.88, r=0.33, tw=0.22, track=1.56,
                      profile=[(0.06, 0.20), (0.0, 0.42), (0.03, 0.66), (0.95, 0.86), (1.55, 0.95), (2.30, 1.42), (3.10, 1.40),
                               (3.75, 1.02), (4.55, 0.98), (4.61, 0.90), (4.58, 0.40), (4.35, 0.20), (0.40, 0.17)]),
    "estate": dict(label="Estate / wagon", L=4.61, W=1.82, H=1.45, wb=2.79, xf=0.88, r=0.33, tw=0.22, track=1.56,
                   profile=[(0.06, 0.20), (0.0, 0.42), (0.03, 0.66), (0.95, 0.86), (1.55, 0.95), (2.30, 1.45), (4.35, 1.42),
                            (4.55, 1.05), (4.61, 0.60), (4.58, 0.40), (4.35, 0.20), (0.40, 0.17)]),
    "suv": dict(label="SUV", L=4.75, W=1.92, H=1.72, wb=2.85, xf=0.92, r=0.37, tw=0.25, track=1.64,
                profile=[(0.05, 0.30), (0.0, 0.55), (0.04, 0.95), (1.00, 1.08), (1.65, 1.14), (2.30, 1.72), (4.45, 1.68),
                         (4.70, 1.25), (4.75, 0.70), (4.70, 0.45), (4.45, 0.26), (0.45, 0.24)]),
    "pickup": dict(label="Pickup truck", L=5.35, W=2.00, H=1.86, wb=3.30, xf=0.95, r=0.40, tw=0.28, track=1.70,
                   profile=[(0.05, 0.36), (0.0, 0.65), (0.04, 1.10), (1.20, 1.22), (1.75, 1.26), (2.35, 1.86), (3.15, 1.84),
                            (3.25, 1.25), (5.35, 1.22), (5.35, 0.55), (5.20, 0.35), (0.45, 0.30)],
                   bed=(3.35, 5.25, 0.92)),
    "van": dict(label="Van", L=5.10, W=2.00, H=2.05, wb=3.25, xf=0.85, r=0.36, tw=0.24, track=1.70,
                profile=[(0.05, 0.25), (0.0, 0.55), (0.06, 1.00), (0.75, 1.15), (1.35, 2.05), (5.05, 2.03),
                         (5.10, 1.60), (5.10, 0.45), (4.95, 0.24), (0.40, 0.22)]),
    "sports": dict(label="Sports car", L=4.45, W=1.95, H=1.16, wb=2.65, xf=0.98, r=0.34, tw=0.28, track=1.62,
                   profile=[(0.08, 0.12), (0.0, 0.30), (0.10, 0.52), (1.40, 0.74), (1.75, 0.80), (2.35, 1.16), (2.85, 1.14),
                            (4.30, 0.82), (4.45, 0.78), (4.45, 0.30), (4.25, 0.12), (0.40, 0.10)],
                   wing=(4.05, 4.40, 1.02, 1.07)),
    "ahmed25": dict(label="Ahmed body 25° (reference)", L=1.044, W=0.389, H=0.338, ahmed=25.0),
}


def car_sdf(kind):
    p = CARS[kind]
    if p.get("ahmed"):
        return _ahmed_sdf(p)
    L, W, H = p["L"], p["W"], p["H"]
    prof = p["profile"]
    xr = p["xf"] + p["wb"]
    r, tw, tr = p["r"], p["tw"], p["track"] / 2
    zs = np.array([q[1] for q in prof])
    belt = zs.min() + 0.62 * (H - zs.min()) if H > 1.3 else 0.75 * H
    belt = min(belt, 0.70 * H)

    def sdf(x, y, z):
        d_side = _poly_sdf(x, z, prof)
        fx = np.minimum(1.0, 0.78 + 0.22 * np.sqrt(np.clip(x / 0.75, 0, 1)))
        fx = fx * np.minimum(1.0, 0.86 + 0.14 * np.sqrt(np.clip((L - x) / 0.6, 0, 1)))
        tumble = 1.0 - 0.20 * np.clip((z - belt) / max(H - belt, 1e-3), 0, 1)
        d_plan = np.abs(y) - (W / 2) * fx * tumble
        body = _smax(d_side, d_plan, 0.10)
        if "bed" in p:
            x0, x1, zb = p["bed"]
            body = np.maximum(body, -_box(x, y, z, x0, x1, W / 2 - 0.08, zb, 3.0))
        if "wing" in p:
            x0, x1, z0, z1 = p["wing"]
            wing = _box(x, y, z, x0, x1, W / 2 - 0.06, z0, z1)
            for sy in (0.45,):
                strut = _box(x, np.abs(y) - sy, z, x0 + 0.10, x0 + 0.16, 0.02, 0.6, z0 + 0.01)
                wing = np.minimum(wing, strut)
            body = np.minimum(body, wing)
        for xa in (p["xf"], xr):
            rr = np.sqrt((x - xa) ** 2 + (z - r) ** 2)
            arch = np.maximum(rr - (r + 0.05), (tr - tw / 2 - 0.05) - np.abs(y))
            body = np.maximum(body, -arch)
        for xa in (p["xf"], xr):
            rr = np.sqrt((x - xa) ** 2 + (z - (r - 0.012)) ** 2)
            wheel = np.maximum(rr - r, np.abs(np.abs(y) - tr) - tw / 2)
            body = np.minimum(body, wheel)
        return np.maximum(body, -z)

    info = dict(label=p["label"], L=L, W=W, H=H, wheels=[(p["xf"], r - 0.012, r, tr, tw), (xr, r - 0.012, r, tr, tw)])
    return sdf, info


def _ahmed_sdf(p):
    L, W, Hb = 1.044, 0.389, 0.288
    c = 0.050
    R = 0.100
    ang = np.radians(p["ahmed"])
    ls = 0.222

    def sdf(x, y, z):
        zc = z - (c + Hb / 2)
        qx = np.abs(x - L / 2) - L / 2
        qy = np.abs(y) - W / 2
        qz = np.abs(zc) - Hb / 2
        fx = np.maximum(R - x, 0)
        ry = np.maximum(np.abs(y) - (W / 2 - R), 0)
        rz = np.maximum(np.abs(zc) - (Hb / 2 - R), 0)
        front = np.where(x < R, np.sqrt(fx ** 2 + ry ** 2 + rz ** 2) - R, -np.inf)
        frontz = np.where(x < R, np.sqrt(fx ** 2 + rz ** 2) - R, -np.inf)
        fronty = np.where(x < R, np.sqrt(fx ** 2 + ry ** 2) - R, -np.inf)
        box = np.maximum(np.maximum(qx, qy), qz)
        box = np.maximum(box, np.maximum(front, np.maximum(frontz, fronty)))
        nx_, nz_ = np.sin(ang), np.cos(ang)
        plane = (x - (L - ls)) * nx_ + (z - (c + Hb)) * nz_
        box = np.maximum(box, plane)
        legs = np.inf
        for lx in (0.163, 0.163 + 0.47):
            for ly in (-0.1635, 0.1635):
                d = np.maximum(np.sqrt((x - lx) ** 2 + (y - ly) ** 2) - 0.015, z - (c + 0.01))
                legs = np.minimum(legs, d)
        return np.maximum(np.minimum(box, legs), -z)

    return sdf, dict(label=p["label"], L=L, W=W, H=c + Hb, wheels=[])


import warp as wp

C = np.array([[0, 0, 0],
              [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
              [1, 1, 0], [-1, -1, 0], [1, -1, 0], [-1, 1, 0],
              [1, 0, 1], [-1, 0, -1], [1, 0, -1], [-1, 0, 1],
              [0, 1, 1], [0, -1, -1], [0, 1, -1], [0, -1, 1]], dtype=np.int32)
W = np.array([1 / 3] + [1 / 18] * 6 + [1 / 36] * 12, dtype=np.float32)


def _index_of(v):
    return int(np.where((C == v).all(1))[0][0])


OPP = np.array([_index_of(-c) for c in C], dtype=np.int32)
MY = np.array([_index_of(c * [1, -1, 1]) for c in C], dtype=np.int32)
MZ = np.array([_index_of(c * [1, 1, -1]) for c in C], dtype=np.int32)

vec19 = wp.types.vector(length=19, dtype=wp.float32)


@wp.kernel
def lbm_step(f_in: wp.array4d(dtype=wp.float32), f_out: wp.array4d(dtype=wp.float32),
             flag: wp.array3d(dtype=wp.int8), uw: wp.array3d(dtype=wp.vec3),
             cx: wp.array(dtype=wp.int32), cy: wp.array(dtype=wp.int32), cz: wp.array(dtype=wp.int32),
             w: wp.array(dtype=wp.float32), opp: wp.array(dtype=wp.int32),
             my: wp.array(dtype=wp.int32), mz: wp.array(dtype=wp.int32),
             nx: int, ny: int, nz: int, u_in: float, ground_u: float, tau0: float, cs2: float, wall_damp: float, sponge: int,
             acc: int, rho_m: wp.array3d(dtype=wp.float32), u_m: wp.array3d(dtype=wp.vec3), u2_m: wp.array3d(dtype=wp.vec3)):
    x, y, z = wp.tid()
    fl = flag[x, y, z]
    if fl == wp.int8(1):
        return
    f = vec19()
    # wall model: next to the body the wall slides with the tangential flow (partial slip)
    uwall = wp.vec3(0.0, 0.0, 0.0)
    if fl == wp.int8(2):
        rp = float(0.0)
        px = float(0.0)
        py = float(0.0)
        pz = float(0.0)
        for j in range(19):
            fj = f_in[j, x, y, z]
            rp += fj
            px += fj * float(cx[j])
            py += fj * float(cy[j])
            pz += fj * float(cz[j])
        up = wp.vec3(px, py, pz) / wp.max(rp, 0.2)
        nn = uw[x, y, z]
        uwall = (up - wp.dot(up, nn) * nn) * wall_damp
    rho = float(0.0)
    jx = float(0.0)
    jy = float(0.0)
    jz = float(0.0)
    for i in range(19):
        sx = x - cx[i]
        sy = y - cy[i]
        sz = z - cz[i]
        val = float(0.0)
        if sz < 0:
            # road: slip floor
            sxx = x - cx[i]
            if sxx < 0:
                sxx = 0
            if sxx >= nx:
                sxx = nx - 1
            syy = y - cy[i]
            if syy < 0:
                syy = ny - 1
            if syy >= ny:
                syy = 0
            val = f_in[mz[i], sxx, syy, z]
        else:
            k = i
            if sy < 0:
                sy = ny - 1
            if sy >= ny:
                sy = 0
            if sz >= nz:
                sz = z
                k = mz[k]
            if sx < 0:
                # velocity inlet
                r0 = float(1.0)
                cu = 3.0 * float(cx[i]) * u_in
                val = w[i] * r0 * (1.0 + cu + 0.5 * cu * cu - 1.5 * u_in * u_in)
            elif sx >= nx:
                # pressure outlet: equilibrium at rho = 1 with the local velocity
                r1 = float(0.0)
                ox = float(0.0)
                oy = float(0.0)
                oz = float(0.0)
                for j in range(19):
                    fj = f_in[j, nx - 1, sy, sz]
                    r1 += fj
                    ox += fj * float(cx[j])
                    oy += fj * float(cy[j])
                    oz += fj * float(cz[j])
                ox = ox / r1
                oy = oy / r1
                oz = oz / r1
                cu = 3.0 * (float(cx[k]) * ox + float(cy[k]) * oy + float(cz[k]) * oz)
                val = w[k] * (1.0 + cu + 0.5 * cu * cu - 1.5 * (ox * ox + oy * oy + oz * oz))
            else:
                if flag[sx, sy, sz] == wp.int8(1):
                    val = f_in[opp[i], x, y, z] + 6.0 * w[i] * (float(cx[i]) * uwall[0] + float(cy[i]) * uwall[1] + float(cz[i]) * uwall[2])
                else:
                    val = f_in[k, sx, sy, sz]
        f[i] = val
        rho += val
        jx += val * float(cx[i])
        jy += val * float(cy[i])
        jz += val * float(cz[i])
    if rho < 0.2 or rho > 5.0:
        rho = 1.0
    ux = jx / rho
    uy = jy / rho
    uz = jz / rho
    usq = ux * ux + uy * uy + uz * uz
    if usq > 0.16:
        s = 0.4 / wp.sqrt(usq)
        ux = ux * s
        uy = uy * s
        uz = uz * s
        usq = 0.16
    pxx = float(0.0)
    pyy = float(0.0)
    pzz = float(0.0)
    pxy = float(0.0)
    pxz = float(0.0)
    pyz = float(0.0)
    for i in range(19):
        cxi = float(cx[i])
        cyi = float(cy[i])
        czi = float(cz[i])
        cu = 3.0 * (cxi * ux + cyi * uy + czi * uz)
        feq = w[i] * rho * (1.0 + cu + 0.5 * cu * cu - 1.5 * usq)
        fn = f[i] - feq
        pxx += fn * cxi * cxi
        pyy += fn * cyi * cyi
        pzz += fn * czi * czi
        pxy += fn * cxi * cyi
        pxz += fn * cxi * czi
        pyz += fn * cyi * czi
    q = wp.sqrt(pxx * pxx + pyy * pyy + pzz * pzz + 2.0 * (pxy * pxy + pxz * pxz + pyz * pyz))
    tau = 0.5 * (tau0 + wp.sqrt(tau0 * tau0 + 18.0 * 1.41421356 * cs2 * q / rho))
    if x > sponge:
        tau = tau + 1.5 * float(x - sponge) / float(nx - sponge)
    om = 1.0 - 1.0 / tau
    for i in range(19):
        cxi = float(cx[i])
        cyi = float(cy[i])
        czi = float(cz[i])
        cu = 3.0 * (cxi * ux + cyi * uy + czi * uz)
        feq = w[i] * rho * (1.0 + cu + 0.5 * cu * cu - 1.5 * usq)
        qp = (cxi * cxi - 1.0 / 3.0) * pxx + (cyi * cyi - 1.0 / 3.0) * pyy + (czi * czi - 1.0 / 3.0) * pzz \
            + 2.0 * (cxi * cyi * pxy + cxi * czi * pxz + cyi * czi * pyz)
        f_out[i, x, y, z] = feq + om * 4.5 * w[i] * qp
    if acc != 0:
        rho_m[x, y, z] = rho_m[x, y, z] + rho
        u_m[x, y, z] = u_m[x, y, z] + wp.vec3(ux, uy, uz)
        u2_m[x, y, z] = u2_m[x, y, z] + wp.vec3(ux * ux, uy * uy, uz * uz)


@wp.kernel
def link_force(f: wp.array4d(dtype=wp.float32), lx: wp.array(dtype=wp.int32), ly: wp.array(dtype=wp.int32),
               lz: wp.array(dtype=wp.int32), li: wp.array(dtype=wp.int32),
               cx: wp.array(dtype=wp.int32), cy: wp.array(dtype=wp.int32), cz: wp.array(dtype=wp.int32),
               w: wp.array(dtype=wp.float32), opp: wp.array(dtype=wp.int32), uw: wp.array3d(dtype=wp.vec3),
               slip: float, out: wp.array(dtype=wp.vec3)):
    t = wp.tid()
    x = lx[t]
    y = ly[t]
    z = lz[t]
    i = li[t]
    fo = f[opp[i], x, y, z]
    c = wp.vec3(float(cx[i]), float(cy[i]), float(cz[i]))
    rp = float(0.0)
    p = wp.vec3(0.0, 0.0, 0.0)
    for j in range(19):
        fj = f[j, x, y, z]
        rp += fj
        p += fj * wp.vec3(float(cx[j]), float(cy[j]), float(cz[j]))
    up = p / wp.max(rp, 0.2)
    nn = uw[x, y, z]
    v = (up - wp.dot(up, nn) * nn) * slip
    fi = fo + 6.0 * w[i] * wp.dot(c, v)
    out[t] = -c * (fo + fi)


@wp.kernel
def init_eq(f: wp.array4d(dtype=wp.float32), flag: wp.array3d(dtype=wp.int8), w: wp.array(dtype=wp.float32),
            cx: wp.array(dtype=wp.int32), u0: float):
    x, y, z = wp.tid()
    for i in range(19):
        if flag[x, y, z] == wp.int8(1):
            f[i, x, y, z] = 0.0
        else:
            cu = 3.0 * float(cx[i]) * u0
            f[i, x, y, z] = w[i] * (1.0 + cu + 0.5 * cu * cu - 1.5 * u0 * u0)


@wp.kernel
def speed_slice_xz(f: wp.array4d(dtype=wp.float32), flag: wp.array3d(dtype=wp.int8), y: int,
                   cx: wp.array(dtype=wp.int32), cz: wp.array(dtype=wp.int32), out: wp.array2d(dtype=wp.float32)):
    x, z = wp.tid()
    if flag[x, y, z] == wp.int8(1):
        out[x, z] = -1.0
        return
    rho = float(0.0)
    jx = float(0.0)
    jz = float(0.0)
    for i in range(19):
        v = f[i, x, y, z]
        rho += v
        jx += v * float(cx[i])
        jz += v * float(cz[i])
    out[x, z] = wp.sqrt(jx * jx + jz * jz) / rho


class Tunnel:
    def __init__(self, solid, uw, u_lat, tau0, cs=0.16, device=None, sponge_frac=0.12, moving_ground=True, u0=None, wall_slip=0.85):
        self.device = device or wp.get_preferred_device()
        nx, ny, nz = solid.shape
        self.shape = (nx, ny, nz)
        d = self.device
        from scipy import ndimage
        near = ndimage.binary_dilation(solid, structure=np.ones((3, 3, 3), bool)) & ~solid
        self.flag = wp.array(np.where(solid, 1, np.where(near, 2, 0)).astype(np.int8), dtype=wp.int8, device=d)
        sm = ndimage.gaussian_filter(solid.astype(np.float32), 1.2)
        g = np.stack(np.gradient(sm), -1)
        g = -g / (np.linalg.norm(g, axis=-1, keepdims=True) + 1e-9)
        uw = np.where(near[..., None], g, 0.0).astype(np.float32)
        del sm, g
        self.wall_damp = float(wall_slip)
        self.uw = wp.array(uw, dtype=wp.vec3, device=d)
        del uw
        self.f0 = wp.zeros((19, nx, ny, nz), dtype=wp.float32, device=d)
        self.f1 = wp.zeros((19, nx, ny, nz), dtype=wp.float32, device=d)
        self.rho_m = wp.zeros((nx, ny, nz), dtype=wp.float32, device=d)
        self.u_m = wp.zeros((nx, ny, nz), dtype=wp.vec3, device=d)
        self.u2_m = wp.zeros((nx, ny, nz), dtype=wp.vec3, device=d)
        self.n_acc = 0
        self.cx = wp.array(C[:, 0].copy(), dtype=wp.int32, device=d)
        self.cy = wp.array(C[:, 1].copy(), dtype=wp.int32, device=d)
        self.cz = wp.array(C[:, 2].copy(), dtype=wp.int32, device=d)
        self.w = wp.array(W, dtype=wp.float32, device=d)
        self.opp = wp.array(OPP, dtype=wp.int32, device=d)
        self.my = wp.array(MY, dtype=wp.int32, device=d)
        self.mz = wp.array(MZ, dtype=wp.int32, device=d)
        self.u_lat, self.tau0, self.cs2 = float(u_lat), float(tau0), float(cs * cs)
        self.ground_u = float(u_lat) if moving_ground else 0.0
        self.sponge = int(nx * (1 - sponge_frac))
        wp.launch(init_eq, dim=self.shape, inputs=[self.f0, self.flag, self.w, self.cx, self.u_lat if u0 is None else float(u0)], device=d)
        fluid = ~solid
        lx, ly, lz, li = [], [], [], []
        for i in range(1, 19):
            c = C[i]
            src = np.zeros_like(solid)
            sl_dst = tuple(slice(max(ci, 0), n + min(ci, 0)) for ci, n in zip(c, solid.shape))
            sl_src = tuple(slice(max(-ci, 0), n + min(-ci, 0)) for ci, n in zip(c, solid.shape))
            src[sl_dst] = solid[sl_src]
            hit = np.argwhere(src & fluid)
            lx.append(hit[:, 0]); ly.append(hit[:, 1]); lz.append(hit[:, 2]); li.append(np.full(len(hit), i))
        cat = lambda a: wp.array(np.concatenate(a).astype(np.int32), dtype=wp.int32, device=d)
        self.nlinks = int(sum(len(a) for a in lx))
        # reference pressure (rho = 1) on the wetted surface, subtracted: a car on the road feels only gauge pressure
        self.f_ref = np.zeros(3)
        for a, i in zip(lx, range(1, 19)):
            self.f_ref += -2.0 * W[i] * C[i] * len(a)
        self.lx, self.ly, self.lz, self.li = cat(lx), cat(ly), cat(lz), cat(li)
        self.fout = wp.zeros(self.nlinks, dtype=wp.vec3, device=d)
        self.slice = wp.zeros((nx, nz), dtype=wp.float32, device=d)

    def step(self, n=1, u_in=None, accumulate=False):
        u = self.u_lat if u_in is None else float(u_in)
        nx, ny, nz = self.shape
        for _ in range(n):
            wp.launch(lbm_step, dim=self.shape, device=self.device,
                      inputs=[self.f0, self.f1, self.flag, self.uw, self.cx, self.cy, self.cz, self.w, self.opp,
                              self.my, self.mz, nx, ny, nz, u, self.ground_u * u / self.u_lat, self.tau0, self.cs2, self.wall_damp,
                              self.sponge, 1 if accumulate else 0, self.rho_m, self.u_m, self.u2_m])
            self.f0, self.f1 = self.f1, self.f0
            if accumulate:
                self.n_acc += 1

    def force(self):
        if self.nlinks == 0:
            return np.zeros(3)
        wp.launch(link_force, dim=self.nlinks, device=self.device,
                  inputs=[self.f0, self.lx, self.ly, self.lz, self.li, self.cx, self.cy, self.cz, self.w, self.opp,
                          self.uw, self.wall_damp, self.fout])
        return self.fout.numpy().astype(np.float64).sum(0) - self.f_ref

    def center_slice(self, y):
        wp.launch(speed_slice_xz, dim=(self.shape[0], self.shape[2]), device=self.device,
                  inputs=[self.f0, self.flag, int(y), self.cx, self.cz, self.slice])
        return self.slice.numpy()

    def means(self):
        n = max(self.n_acc, 1)
        return self.rho_m.numpy() / n, self.u_m.numpy() / n, self.u2_m.numpy() / n


import os, json, gzip, base64, math, time, shutil


def _b64(a):
    return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()


def _slug(s):
    out = "".join(ch.lower() if ch.isalnum() else "-" for ch in s).strip("-")
    while "--" in out:
        out = out.replace("--", "-")
    return out[:48] or "model"


def _load_mesh(path, length_axis, up_axis, nose, units):
    """Places a car in the tunnel frame (x: nose to tail, y: left, z: up, wheels on z = 0).
    Returns vertices, faces, the 4x4 matrix from the file's world coordinates to the tunnel, and a note."""
    import trimesh
    ext = path.lower().rsplit(".", 1)[-1]
    m = trimesh.load(path, force="mesh", process=False)
    v0 = np.asarray(m.vertices, dtype=np.float64)
    f = np.asarray(m.faces, dtype=np.int64)
    ext_ = v0.max(0) - v0.min(0)
    li = int(np.argmax(ext_)) if length_axis == "auto" else "xyz".index(length_axis)
    if up_axis == "auto":
        pref = [1, 2, 0] if ext in ("glb", "gltf") else [2, 1, 0]
        ui = [a for a in pref if a != li][0]
    else:
        ui = "xyz".index(up_axis)
    if li == ui:
        raise ValueError("length axis and up axis must differ")
    wi = 3 - li - ui
    R = np.zeros((3, 3))
    R[0, li] = 1.0
    R[2, ui] = 1.0
    R[1, wi] = 1.0
    if np.linalg.det(R) < 0:  # a proper rotation: never a mirror image of the car
        R[1, wi] = -1.0
    v = v0 @ R.T
    L = v[:, 0].max() - v[:, 0].min()
    if nose == "auto":
        # the rear is the taller end (roof line, boot, rear wing): the nose is at the other end
        x0, x1 = v[:, 0].min(), v[:, 0].max()
        top_min = v[v[:, 0] < x0 + 0.15 * L, 2].max()
        top_max = v[v[:, 0] > x1 - 0.15 * L, 2].max()
        nose = "max" if top_min > top_max else "min"
    if nose == "max":
        R = np.diag([-1.0, -1.0, 1.0]) @ R  # turn the car round (180 degrees about the vertical)
        v = v0 @ R.T
    if units == "auto":
        scale = 0.001 if L > 30 else (0.01 if L > 15 else 1.0)
    else:
        scale = {"m": 1.0, "cm": 0.01, "mm": 0.001, "in": 0.0254}[units]
    v = v * scale
    t = np.array([-v[:, 0].min(), -0.5 * (v[:, 1].max() + v[:, 1].min()), -v[:, 2].min()])
    v = v + t
    if v[:, 0].max() < 0.05:
        raise ValueError("model is empty or too small")
    M = np.eye(4)
    M[:3, :3] = scale * R
    M[:3, 3] = t
    note = f"length along {'xyz'[li]}, up {'xyz'[ui]}, nose at {nose} {'xyz'[li]}, scale {scale:g}"
    return v, f, M, note


def _sample_mesh(kind):
    from skimage.measure import marching_cubes
    sdf, info = car_sdf(kind)
    L, W, H = info["L"], info["W"], info["H"]
    h = L / 170
    xs = np.arange(-0.1, L + 0.1, h)
    ys = np.arange(-W / 2 - 0.1, W / 2 + 0.1, h)
    zs = np.arange(-h, H + 0.15, h)
    X, Y, Z = np.meshgrid(xs, ys, zs, indexing="ij")
    d = sdf(X, Y, Z)
    v, f, _, _ = marching_cubes(d, 0.0, spacing=(h, h, h))
    v += [xs[0], ys[0], zs[0]]
    v[:, 2] = np.maximum(v[:, 2], 0.0)
    f = f[:, ::-1].copy()
    return v.astype(np.float64), f.astype(np.int64), info["label"]


def _decimate(v, f, target):
    if len(f) <= target:
        return v, f
    try:
        import fast_simplification
        v2, f2 = fast_simplification.simplify(v.astype(np.float32), f.astype(np.int32), 1.0 - target / len(f))
        return np.asarray(v2, np.float64), np.asarray(f2, np.int64)
    except Exception:
        try:
            import trimesh
            m = trimesh.Trimesh(v, f, process=False).simplify_quadric_decimation(face_count=target)
            return np.asarray(m.vertices), np.asarray(m.faces)
        except Exception:
            return v, f


def _voxelize(v, f, origin, dx, shape):
    """Solid cells: rasterize the surface, close small gaps, flood the outside from the tunnel walls (not the road)."""
    from scipy import ndimage
    tri = v[f]
    pts = [tri.mean(1)]
    stack = tri
    for _ in range(12):
        e = np.max(np.linalg.norm(stack - np.roll(stack, 1, axis=1), axis=2), axis=1)
        big = stack[e > 0.45 * dx]
        pts.append(stack.reshape(-1, 3))
        if len(big) == 0:
            break
        a, b, c = big[:, 0], big[:, 1], big[:, 2]
        ab, bc, ca = (a + b) / 2, (b + c) / 2, (c + a) / 2
        stack = np.concatenate([np.stack([a, ab, ca], 1), np.stack([ab, b, bc], 1),
                                np.stack([ca, bc, c], 1), np.stack([ab, bc, ca], 1)])
        if len(stack) > 60_000_000:
            break
    pts.append(stack.reshape(-1, 3))
    p = np.concatenate(pts)
    idx = np.floor((p - origin) / dx).astype(np.int64)
    ok = np.all((idx >= 0) & (idx < np.array(shape)), axis=1)
    idx = idx[ok]
    surf = np.zeros(shape, bool)
    surf[idx[:, 0], idx[:, 1], idx[:, 2]] = True
    closed = ndimage.binary_closing(surf, iterations=1, border_value=0) | surf
    pad = np.pad(~closed, ((1, 1), (1, 1), (0, 1)), constant_values=True)
    pad = np.concatenate([np.zeros_like(pad[:, :, :1]), pad], axis=2)
    lab, _ = ndimage.label(pad)
    out_label = lab[0, 0, -1]
    outside = (lab == out_label)[1:-1, 1:-1, 1:-1]
    return ~outside


def _fill_solid(field, solid):
    from scipy import ndimage
    if not solid.any():
        return field
    idx = ndimage.distance_transform_edt(solid, return_distances=False, return_indices=True)
    return field[tuple(idx)]


def _vertex_normals(v, f):
    n = np.zeros_like(v)
    fn = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
    for k in range(3):
        np.add.at(n, f[:, k], fn)
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
    return n


def _streamlines(u_mean, solid, seeds, max_steps, h=0.6):
    from scipy.ndimage import map_coordinates
    nx, ny, nz = solid.shape
    ux, uy, uz = (np.ascontiguousarray(u_mean[..., k]) for k in range(3))
    sol = solid.astype(np.float32)

    def vel(p):
        c = p.T
        return np.stack([map_coordinates(a, c, order=1, mode="nearest") for a in (ux, uy, uz)], 1)

    p = seeds.copy()
    alive = np.ones(len(p), bool)
    paths = [[q.copy()] for q in p]
    speeds = [[] for _ in p]
    for it in range(max_steps):
        ids = np.where(alive)[0]
        if len(ids) == 0:
            break
        q = p[ids]
        v1 = vel(q)
        s1 = np.linalg.norm(v1, axis=1) + 1e-9
        mid = q + 0.5 * h * v1 / s1[:, None]
        v2 = vel(mid)
        s2 = np.linalg.norm(v2, axis=1) + 1e-9
        q2 = q + h * v2 / s2[:, None]
        inside = (q2[:, 0] >= 0) & (q2[:, 0] < nx - 1) & (q2[:, 1] >= 0) & (q2[:, 1] < ny - 1) & (q2[:, 2] >= 0) & (q2[:, 2] < nz - 1)
        hit = map_coordinates(sol, q2.T, order=1, mode="nearest") > 0.5
        stop = (~inside) | hit | (s1 < 1e-4)
        for j, k in enumerate(ids):
            speeds[k].append(s1[j])
            if stop[j]:
                alive[k] = False
            else:
                if it % 2 == 1:
                    paths[k].append(q2[j].copy())
                p[k] = q2[j]
    out = []
    for path, sp in zip(paths, speeds):
        if len(path) < 6:
            continue
        sp = np.asarray(sp)
        ss = sp[np.linspace(0, len(sp) - 1, len(path)).astype(int)] if len(sp) else np.zeros(len(path))
        out.append((np.asarray(path), ss))
    return out


def _slice_u8(a, lo, hi, mask):
    q = np.clip((a - lo) / (hi - lo), 0, 1) * 254 + 1
    q = q.astype(np.uint8)
    q[mask] = 0
    return q


def run(ctx):
    from scipy.ndimage import map_coordinates
    wp.config.quiet = True
    wp.init()
    P = ctx.params
    N = int(float(str(P.get("resolution", "128 (fine)")).split()[0]))
    speed_kmh = float(P.get("speed_kmh", 120))
    flow_time = float(P.get("flow_time", 8))
    re_eff = float(P.get("reynolds", 1e6))
    u_lat = 0.1
    rho_air, nu_air = 1.204, 1.5e-5
    samples = [s.strip() for s in str(P.get("samples", "none")).replace(";", ",").split(",") if s.strip()]
    real_len = {}
    for line in str(P.get("real_lengths", "") or "").replace(";", "\n").splitlines():
        if "=" in line:
            key, val = line.rsplit("=", 1)
            try:
                real_len[key.strip().lower()] = float(val.strip().lower().replace("m", ""))
            except ValueError:
                ctx.log(f"Real lengths: cannot read '{line.strip()}' (write: part of the file name = metres)")
    device = "cuda" if wp.is_cuda_available() else "cpu"
    mem_budget = 0
    if device == "cuda":
        try:
            dev = wp.get_device("cuda:0")
            mem_budget = 0.88 * float(getattr(dev, "free_memory", 0) or 0.8 * dev.total_memory)
        except Exception:
            mem_budget = 0
    if device == "cuda":
        ctx.log(f"GPU: {wp.get_device('cuda').name}")
    ctx.log(f"Wind tunnel on {device}: {N} cells per car length, {speed_kmh:.0f} km/h, {flow_time:g} flow-through times")

    models = []
    files = [fi for fi in (ctx.inputs.get("models", []) or [])
             if fi.name.lower().rsplit(".", 1)[-1] in ("stl", "obj", "glb", "gltf", "ply", "off")]
    for fi in files:
        try:
            v, f, M, note = _load_mesh(fi.path, P.get("length_axis", "auto"), P.get("up_axis", "auto"),
                                       P.get("nose", "auto"), P.get("units", "auto"))
            Lf = float(v[:, 0].max())
            match = [Lr for key, Lr in real_len.items() if key and key in fi.name.lower()]
            if match and match[0] > 0:
                k = match[0] / Lf
                v = v * k
                M = np.asarray(M, dtype=np.float64).copy()
                M[:3, :] *= k
                note += f"; rescaled from {Lf:.2f} m to its real length {match[0]:.2f} m"
            elif Lf > 7.0:
                note += (f"; it is {Lf:.1f} m long: if the model is drawn at the wrong size, give its real length in "
                         f"Real lengths (Cd and Cl are right either way)")
            label = os.path.splitext(fi.name)[0]
            models.append(dict(id=_slug(label), label=label, v=v, f=f, source=fi.name, path=fi.path, M=M))
            ctx.log(f"Loaded {fi.name}: {len(f)} triangles; {note}")
        except Exception as e:
            ctx.log(f"Could not read {fi.name}: {e}")
    if samples == ["auto"]:
        samples = [] if models else ["fastback", "suv", "pickup", "sports"]
    if samples == ["all"]:
        samples = list(CARS.keys())
    for s in samples:
        if s in ("none", "auto"):
            continue
        if s not in CARS:
            ctx.log(f"Unknown sample car '{s}' (choose from {', '.join(CARS)})")
            continue
        v, f, label = _sample_mesh(s)
        models.append(dict(id=s, label=label, v=v, f=f, source="sample"))
        _write_stl(ctx.output("models", f"{s}.stl"), v, f)
    if not models:
        raise RuntimeError("No car models: upload GLB/glTF/STL/OBJ files to the Car models dataset (or set Sample cars).")
    ids = set()
    for m in models:
        base, k = m["id"], 2
        while m["id"] in ids:
            m["id"] = f"{base}-{k}"; k += 1
        ids.add(m["id"])

    results, history_rows = [], []
    t_all = time.time()
    for mi, m in enumerate(models):
        v, f = m["v"], m["f"]
        L, W, H = (v.max(0) - v.min(0))
        up, down = 1.0 * L, 2.6 * L
        width = max(1.4 * L, 5.0 * W)
        height = max(0.75 * L, 3.6 * H)
        # the grid must fit in the GPU's memory (about 200 bytes a cell): beyond it the driver spills into system
        # memory and the run crawls, so a car too big for the chosen resolution gets the finest grid that fits
        Nm = N
        if mem_budget:
            cells = (up + L + down) * width * height / L ** 3 * N ** 3
            if cells * 200 > mem_budget:
                Nm = int(N * (mem_budget / (cells * 200)) ** (1 / 3)) // 4 * 4
                ctx.log(f"[{m['label']}] {N} cells per car length needs {cells * 200 / 1e9:.1f} GB, more than this GPU has free: "
                        f"using {Nm} for this car")
        dx = L / Nm
        nx = int(round((up + L + down) / dx))
        ny = int(round(width / dx)) // 2 * 2
        nz = int(round(height / dx))
        origin = np.array([-up, -ny * dx / 2, 0.0])
        ctx.progress(100 * mi / len(models), f"{m['label']}: voxelizing")
        solid = _voxelize(v, f, origin, dx, (nx, ny, nz))
        area_lat = int(solid.any(0).sum())
        area = area_lat * dx * dx
        uw = np.zeros((1, 1, 1, 3), np.float32)
        re_phys = speed_kmh / 3.6 * L / nu_air
        re = min(re_eff, re_phys)
        tau0 = 0.5 + 3.0 * u_lat * Nm / re
        ctx.log(f"[{m['label']}] {L:.2f} x {W:.2f} x {H:.2f} m, grid {nx}x{ny}x{nz} = {nx*ny*nz/1e6:.1f} M cells, "
                f"dx {dx*100:.1f} cm, frontal area {area:.2f} m², Re {re_phys:.2e} (LES at {re:.1e})")
        tun = Tunnel(solid, uw, u_lat, tau0, cs=float(P.get("smagorinsky", 0.17)), device=device, u0=0.0,
                     wall_slip=float(P.get("wall_slip", 0.85)))
        steps_per_T = Nm / u_lat
        steps = int(flow_time * steps_per_T)
        ramp = int(1.5 * steps_per_T)
        avg_from = int(max(ramp + steps_per_T, steps * 0.45))
        chunk = 10
        hist = []
        t0 = time.time()
        last_tel = 0
        yc = ny // 2
        q_lat = 0.5 * u_lat * u_lat
        s = 0
        while s < steps:
            ui = u_lat * 0.5 * (1 - math.cos(math.pi * min(s / ramp, 1.0)))
            tun.step(chunk, u_in=ui, accumulate=s >= avg_from)
            s += chunk
            if s >= ramp:
                F = tun.force()
                cd, cl, cs_ = F[0] / (q_lat * area_lat), F[2] / (q_lat * area_lat), F[1] / (q_lat * area_lat)
                if not np.isfinite(cd):
                    raise RuntimeError("The flow blew up: try a lower Reynolds number cap or another resolution")
                hist.append((s / steps_per_T, cd, cl, cs_))
            now = time.time()
            if now - last_tel > 1.5 or s >= steps:
                last_tel = now
                sl = tun.center_slice(yc)
                x0, x1 = int((up - 0.5 * L) / dx), int((up + 2.4 * L) / dx)
                z1 = min(nz, int(2.2 * H / dx) + 1)
                sl = sl[x0:x1, :z1]
                # telemetry items must stay under 60 KB: thin the live slice on fine grids (about 48 KB in base64)
                k = max(1, int(np.ceil(np.sqrt(sl.shape[0] * sl.shape[1] / 36000.0))))
                sl = sl[::k, ::k]
                q = _slice_u8(sl / u_lat, 0.0, 1.5, sl < 0)
                mean = np.array(hist)[-200:] if hist else None
                ctx.telemetry("tunnel", {
                    "model": m["id"], "label": m["label"], "index": mi, "count": len(models),
                    "t": round(s / steps_per_T, 3), "T": flow_time, "step": s, "steps": steps,
                    "cd": round(float(mean[:, 1].mean()), 4) if mean is not None else None,
                    "cl": round(float(mean[:, 2].mean()), 4) if mean is not None else None,
                    "averaging": s >= avg_from,
                    "mlups": round(s * nx * ny * nz / max(now - t0, 1e-3) / 1e6, 1),
                    "slice": {"w": int(q.shape[0]), "h": int(q.shape[1]), "data": _b64(q.T.copy()),
                              "x0": float(origin[0] + x0 * dx), "dx": dx * k},
                })
                ctx.progress(100 * (mi + s / steps * 0.9) / len(models), f"{m['label']}: t = {s/steps_per_T:.1f} L/U")
        elapsed = time.time() - t0
        h = np.array(hist)
        avg = h[h[:, 0] >= avg_from / steps_per_T]
        cd, cl, cs_ = float(avg[:, 1].mean()), float(avg[:, 2].mean()), float(avg[:, 3].mean())
        cd_std = float(avg[:, 1].std())
        for row in h[:: max(1, len(h) // 400)]:
            history_rows.append(dict(model=m["label"], t=round(row[0], 3), cd=round(row[1], 4), cl=round(row[2], 4)))
        ctx.progress(100 * (mi + 0.92) / len(models), f"{m['label']}: pressure, streamlines and the flow field")

        rho_m, u_m, u2_m = tun.means()
        del tun
        cp = ((rho_m - 1.0) / 3.0) / q_lat
        del rho_m
        cp_f = _fill_solid(cp, solid)
        u_m[solid] = 0
        vd, fd = _decimate(v, f, int(P.get("max_triangles", 160000)))
        nrm = _vertex_normals(vd, fd)
        pos = (vd + nrm * 0.8 * dx - origin) / dx - 0.5
        cp_v = map_coordinates(cp_f, pos.T, order=1, mode="nearest").astype(np.float32)
        ys = np.linspace(-0.62 * W, 0.62 * W, 15)
        zs = np.linspace(0.04 * H, 1.12 * H, 11)
        Ys, Zs = np.meshgrid(ys, zs, indexing="ij")
        seeds = np.stack([np.full(Ys.size, -0.25 * L), Ys.ravel(), Zs.ravel()], 1)
        seeds_i = (seeds - origin) / dx - 0.5
        lines = _streamlines(u_m, solid, seeds_i, int(3.2 * L / dx / 0.6))
        sl_pts, sl_spd, offs = [], [], [0]
        for path, sp in lines:
            sl_pts.append((path + 0.5) * dx + origin)
            sl_spd.append(sp / u_lat)
            offs.append(offs[-1] + len(path))
        sl_pts = np.concatenate(sl_pts).astype(np.float32) if sl_pts else np.zeros((0, 3), np.float32)
        sl_spd = np.concatenate(sl_spd).astype(np.float32) if sl_spd else np.zeros(0, np.float32)
        spd = np.linalg.norm(u_m, axis=-1) / u_lat
        x0, x1 = int((up - 0.6 * L) / dx), int((up + 2.5 * L) / dx)
        z1 = min(nz, int(2.0 * H / dx) + 1)
        yw = min(ny // 2, int(1.6 * W / dx))
        yc = int(round(-origin[1] / dx))
        zc = max(1, int(0.4 * H / dx))
        xz_s = spd[x0:x1, yc, :z1]; xz_c = cp[x0:x1, yc, :z1]; xz_m = solid[x0:x1, yc, :z1]
        xy_s = spd[x0:x1, yc - yw:yc + yw, zc]; xy_c = cp[x0:x1, yc - yw:yc + yw, zc]; xy_m = solid[x0:x1, yc - yw:yc + yw, zc]
        slices = {
            "xz": {"w": int(xz_s.shape[0]), "h": int(xz_s.shape[1]), "x0": float(origin[0] + (x0 + 0.5) * dx),
                   "z0": 0.5 * dx, "y": 0.0, "dx": dx,
                   "speed": _b64(_slice_u8(xz_s, 0, 1.5, xz_m).T.copy()), "cp": _b64(_slice_u8(xz_c, -1.5, 1.0, xz_m).T.copy())},
            "xy": {"w": int(xy_s.shape[0]), "h": int(xy_s.shape[1]), "x0": float(origin[0] + (x0 + 0.5) * dx),
                   "y0": float((-yw + 0.5) * dx), "z": float((zc + 0.5) * dx), "dx": dx,
                   "speed": _b64(_slice_u8(xy_s, 0, 1.5, xy_m).T.copy()), "cp": _b64(_slice_u8(xy_c, -1.5, 1.0, xy_m).T.copy())},
        }
        del spd
        # the flow around the car for the View's smoke: mean velocity, pressure and turbulence on a coarser grid,
        # read back by trilinear interpolation wherever the smoke wand is put
        urms = np.sqrt(np.maximum(u2_m - u_m * u_m, 0).sum(-1) / 3.0) / u_lat
        del u2_m
        urms[solid] = 0
        fx0, fx1 = -0.6 * L, 2.4 * L
        fy = 0.5 * W + max(0.45 * W, 0.12 * L)
        fz = max(2.0 * H, H + 0.25 * L)
        hf = max(L / 80.0, ((fx1 - fx0) * 2 * fy * fz / 1.6e6) ** (1 / 3))
        gx = np.arange(fx0, fx1, hf); gy = np.arange(-fy, fy + 1e-9, hf); gz = np.arange(0.5 * hf, fz, hf)
        GX, GY, GZ = np.meshgrid(gx, gy, gz, indexing="ij")
        ci = np.stack([(GX - origin[0]) / dx - 0.5, (GY - origin[1]) / dx - 0.5, (GZ - origin[2]) / dx - 0.5])
        del GX, GY, GZ
        fs = map_coordinates(solid.astype(np.float32), ci, order=1, mode="nearest") > 0.5
        fu = [map_coordinates(np.ascontiguousarray(u_m[..., k]), ci, order=1, mode="nearest") / u_lat for k in range(3)]
        fcp = map_coordinates(cp_f, ci, order=1, mode="nearest")
        ft = map_coordinates(urms, ci, order=1, mode="nearest")
        del ci, urms
        q8 = lambda a: np.clip(np.round(a * 80.0), -127, 127).astype(np.int8)
        cp8 = np.clip(np.round((fcp + 1.5) / 2.5 * 254), 0, 254).astype(np.uint8)
        t8 = np.clip(np.round(ft * 400.0), 0, 254).astype(np.uint8)
        t8[fs] = 255
        field_name = f"{m['id']}.field.bin.gz"
        with gzip.open(ctx.output("tunnel", field_name), "wb", compresslevel=6) as fh:
            for a in (q8(fu[0]), q8(fu[1]), q8(fu[2]), cp8, t8):
                fh.write(np.ascontiguousarray(a).tobytes())
        field = {"file": field_name, "n": [len(gx), len(gy), len(gz)], "origin": [float(gx[0]), float(gy[0]), float(gz[0])],
                 "h": float(hf), "order": "x-major (index = (i*ny + j)*nz + k)",
                 "arrays": ["ux int8 /80", "uy int8 /80", "uz int8 /80", "cp uint8 (v/254*2.5-1.5)", "turb uint8 /400, 255 = solid"]}
        ctx.log(f"[{m['label']}] flow field for the smoke: {len(gx)}x{len(gy)}x{len(gz)} cells of {hf*100:.1f} cm")
        del fu, fcp, ft
        source_file = None
        if m.get("path") and m["source"].lower().endswith((".glb", ".gltf")):
            source_file = f"{m['id']}.source." + m["source"].lower().rsplit(".", 1)[-1]
            shutil.copyfile(m["path"], ctx.output("tunnel", source_file))
        V = speed_kmh / 3.6
        qd = 0.5 * rho_air * V * V
        res = dict(model=m["label"], source=m["source"], length_m=round(L, 3), width_m=round(W, 3), height_m=round(H, 3),
                   frontal_area_m2=round(area, 3), Cd=round(cd, 4), Cd_std=round(cd_std, 4), Cl=round(cl, 4),
                   Cs=round(cs_, 4), CdA_m2=round(cd * area, 4), drag_N=round(cd * qd * area, 1),
                   lift_N=round(cl * qd * area, 1), drag_power_kW=round(cd * qd * area * V / 1000, 2),
                   speed_kmh=speed_kmh, cells_M=round(nx * ny * nz / 1e6, 2), steps=steps,
                   seconds=round(elapsed, 1), MLUPS=round(steps * nx * ny * nz / elapsed / 1e6, 0))
        results.append(res)
        ctx.log(f"[{m['label']}] Cd {cd:.3f} (±{cd_std:.3f})  Cl {cl:.3f}  CdA {cd*area:.3f} m²  "
                f"drag {res['drag_N']:.0f} N at {speed_kmh:.0f} km/h  ({elapsed:.0f} s, {res['MLUPS']:.0f} MLUPS)")
        doc = {
            "format": "esasim.windtunnel/1", "id": m["id"], "label": m["label"], "source": m["source"],
            "L": float(L), "W": float(W), "H": float(H), "area": area, "cd": cd, "cl": cl, "cs": cs_, "cd_std": cd_std,
            "speed_kmh": speed_kmh, "rho_air": rho_air, "re_phys": re_phys, "re_les": re, "dx": dx,
            "grid": [nx, ny, nz], "flow_time": flow_time,
            "mesh": {"v": _b64(vd.astype(np.float32)), "f": _b64(fd.astype(np.uint32)), "cp": _b64(cp_v)},
            "streamlines": {"offsets": _b64(np.asarray(offs, np.int32)), "p": _b64(sl_pts), "s": _b64(sl_spd)},
            "slices": slices, "field": field, "source_file": source_file,
            "transform": (np.asarray(m["M"]).ravel().tolist() if m.get("M") is not None else None),
            "history": [[round(r[0], 3), round(r[1], 4), round(r[2], 4)] for r in h[:: max(1, len(h) // 300)]],
        }
        with gzip.open(ctx.output("tunnel", f"{m['id']}.tunnel.json.gz"), "wt") as fh:
            json.dump(doc, fh, separators=(",", ":"))
        _write_ply(ctx.output("surfaces", f"{m['id']}_cp.ply"), vd, fd, cp_v)
        ctx.telemetry("tunnel", {"model": m["id"], "label": m["label"], "index": mi, "count": len(models),
                                 "done": True, "cd": round(cd, 4), "cl": round(cl, 4)})
        del u_m, cp, cp_f, solid

    import csv
    with open(ctx.output("results", "results.csv"), "w", newline="") as fh:
        wr = csv.DictWriter(fh, fieldnames=list(results[0].keys()))
        wr.writeheader(); wr.writerows(results)
    with open(ctx.output("history", "convergence.csv"), "w", newline="") as fh:
        wr = csv.DictWriter(fh, fieldnames=["model", "t", "cd", "cl"])
        wr.writeheader(); wr.writerows(history_rows)
    best = min(results, key=lambda r: r["CdA_m2"])
    lines = [f"# Wind tunnel results at {speed_kmh:.0f} km/h", "",
             f"{len(results)} model(s), {N} cells per car length, {flow_time:g} flow-through times each, "
             f"on {device} in {time.time()-t_all:.0f} s.", "",
             "| Model | Cd | Cl | Frontal area (m²) | CdA (m²) | Drag (N) | Drag power (kW) |",
             "|---|---|---|---|---|---|---|"]
    for r in sorted(results, key=lambda r: r["CdA_m2"]):
        lines.append(f"| {r['model']} | {r['Cd']:.3f} | {r['Cl']:.3f} | {r['frontal_area_m2']:.2f} | {r['CdA_m2']:.3f} | "
                     f"{r['drag_N']:.0f} | {r['drag_power_kW']:.1f} |")
    lines += ["", f"Lowest drag: **{best['model']}** (CdA {best['CdA_m2']:.3f} m²).", "",
              "Method: lattice Boltzmann (D3Q19, regularized collision with a Smagorinsky LES model) on the GPU with NVIDIA Warp; "
              "partial-slip wall model on the body, slip floor (like a rolling road), static wheels, time-averaged forces by momentum exchange. "
              "The grid is coarse next to production CFD, so compare models with each other rather than reading absolute "
              "Cd values as final: finer grids move them closer to wind-tunnel numbers."]
    ctx.write_text("report", "report.md", "\n".join(lines))
    ctx.progress(100, "done")
    return {"models": len(results), "best": best["model"], "best_CdA": float(best["CdA_m2"])}


def _write_stl(path, v, f):
    tri = v[f].astype(np.float32)
    n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
    rec = np.zeros(len(f), dtype=[("n", "<f4", 3), ("v", "<f4", (3, 3)), ("a", "<u2")])
    rec["n"], rec["v"] = n, tri
    with open(path, "wb") as fh:
        fh.write(b"esasim wind tunnel sample car".ljust(80, b" "))
        fh.write(np.uint32(len(f)).tobytes())
        fh.write(rec.tobytes())


def _cp_colors(cp):
    t = np.clip((cp + 1.5) / 2.5, 0, 1)
    stops = np.array([[0.19, 0.07, 0.23], [0.16, 0.47, 0.93], [0.10, 0.85, 0.68], [0.64, 0.99, 0.24],
                      [0.98, 0.73, 0.22], [0.85, 0.22, 0.04], [0.48, 0.02, 0.01]])
    x = t * (len(stops) - 1)
    i = np.minimum(x.astype(int), len(stops) - 2)
    a = (x - i)[:, None]
    return ((stops[i] * (1 - a) + stops[i + 1] * a) * 255).astype(np.uint8)


def _write_ply(path, v, f, cp):
    col = _cp_colors(cp)
    vert = np.zeros(len(v), dtype=[("x", "<f4"), ("y", "<f4"), ("z", "<f4"), ("red", "u1"), ("green", "u1"),
                                   ("blue", "u1"), ("cp", "<f4")])
    vert["x"], vert["y"], vert["z"] = v[:, 0], v[:, 1], v[:, 2]
    vert["red"], vert["green"], vert["blue"] = col[:, 0], col[:, 1], col[:, 2]
    vert["cp"] = cp
    face = np.zeros(len(f), dtype=[("n", "u1"), ("i", "<i4", 3)])
    face["n"], face["i"] = 3, f
    hdr = (f"ply\nformat binary_little_endian 1.0\nelement vertex {len(v)}\nproperty float x\nproperty float y\n"
           f"property float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nproperty float cp\n"
           f"element face {len(f)}\nproperty list uchar int vertex_indices\nend_header\n")
    with open(path, "wb") as fh:
        fh.write(hdr.encode()); fh.write(vert.tobytes()); fh.write(face.tobytes())
