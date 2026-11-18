// ── EsaSim block ──────────────────────────────────────────────────────
// Wind tunnel view (ws-wind-tunnel-view) · version 1 · view, JavaScript: function render(ctx)
// The wind tunnel in 3D: each car with its surface pressure, streamlines, moving particles and flow slices; pick a model, change the wind speed, compare drag; the flow forms live while the tunnel runs.
// Workspace: Gianluca De Novi's workspace · Author: Gianluca De Novi
// Saved: 2026-11-18
//
// Inputs   ctx.input("id") gives { files, stream }; ctx.rows("id"), ctx.json("id"), ctx.text("id")
//   tunnel      Files (gz, json)          Tunnel results · several · <model>.tunnel.json.gz from the Wind tunnel block
//   live        Stream                    Live · several · optional · The Wind tunnel block's live telemetry (channel tunnel)
// Settings ctx.params.key
//   tunnel_node text      Tunnel node = "tunnel"
// EsaSim rewrites these lines from the block's definition each time it is saved: change the definition, not them.
// ── end of EsaSim block header ────────────────────────────────────────

/* Wind tunnel view: the cars of a Wind tunnel run in 3D with their surface pressure, streamlines, particles and
 * flow slices; pick a model, change the wind speed, compare drag; the flow forms live while the tunnel runs.
 * Inputs: tunnel (the *.tunnel.json.gz files, esasim.windtunnel/1) and live (the Wind tunnel block's telemetry). */
function render(ctx) {
  var THREE = ctx.THREE, el = ctx.el, P = ctx.params || {};
  el.innerHTML = '';
  var css = document.createElement('style');
  css.textContent = [
    '.wt{position:absolute;inset:0;display:flex;background:#06090f;color:#e6ecf5;font:13px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden}',
    '.wt .stage{position:relative;flex:1;min-width:0}',
    '.wt canvas.gl{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab}',
    '.wt .bar{position:absolute;left:12px;right:12px;top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;pointer-events:none}',
    '.wt .bar>*{pointer-events:auto}',
    '.wt .chip{background:rgba(14,20,30,.82);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.1);border-radius:9px;padding:5px 8px;display:flex;gap:6px;align-items:center}',
    '.wt select,.wt button{background:#141c29;color:#e6ecf5;border:1px solid rgba(255,255,255,.14);border-radius:7px;padding:4px 8px;font:inherit;cursor:pointer}',
    '.wt button.on{background:#0e7490;border-color:#22d3ee}',
    '.wt button.go{background:#76b900;color:#0b1200;font-weight:700;border-color:#a3e635}',
    '.wt button:disabled{opacity:.5;cursor:default}',
    '.wt input[type=range]{width:120px;accent-color:#22d3ee}',
    '.wt .lab{font-size:11px;opacity:.65;text-transform:uppercase;letter-spacing:.4px}',
    '.wt .legend{position:absolute;left:12px;bottom:12px;background:rgba(14,20,30,.82);border:1px solid rgba(255,255,255,.1);border-radius:9px;padding:7px 10px;min-width:220px}',
    '.wt .legend .ramp{height:10px;border-radius:3px;margin:4px 0 2px}',
    '.wt .legend .ticks{display:flex;justify-content:space-between;font-size:11px;opacity:.75}',
    '.wt .title{position:absolute;left:14px;top:104px;pointer-events:none;text-shadow:0 1px 3px #000}',
    '.wt .title b{font-size:20px;font-weight:700}',
    '.wt .title .big{display:flex;gap:14px;margin-top:4px}',
    '.wt .title .big div span{display:block;font-size:10.5px;opacity:.6;text-transform:uppercase;letter-spacing:.4px}',
    '.wt .title .big div b{font-size:22px;font-variant-numeric:tabular-nums}',
    '.wt .side{width:340px;max-width:42%;border-left:1px solid rgba(255,255,255,.08);background:#0a0f17;display:flex;flex-direction:column;overflow:auto}',
    '.wt .sec{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06)}',
    '.wt .sec h3{margin:0 0 8px;font-size:12px;font-weight:650;opacity:.8;text-transform:uppercase;letter-spacing:.5px}',
    '.wt table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}',
    '.wt td,.wt th{padding:4px 4px;text-align:right;font-size:12px}',
    '.wt th{font-weight:600;opacity:.6;font-size:11px}',
    '.wt td:first-child,.wt th:first-child{text-align:left}',
    '.wt tr.row{cursor:pointer}.wt tr.row:hover{background:rgba(255,255,255,.04)}',
    '.wt tr.sel{background:rgba(34,211,238,.12)}',
    '.wt .barc{height:6px;border-radius:3px;background:#22d3ee}',
    '.wt .live canvas{width:100%;image-rendering:pixelated;border-radius:6px;background:#000}',
    '.wt .prog{height:4px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden;margin:6px 0}',
    '.wt .prog b{display:block;height:100%;background:linear-gradient(90deg,#76b900,#22d3ee)}',
    '.wt .muted{opacity:.6}',
    '.wt .empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:30px;opacity:.75;pointer-events:none}',
    '.wt .hist{width:100%;height:90px}'
  ].join('\n');
  el.appendChild(css);
  var root = document.createElement('div'); root.className = 'wt'; el.appendChild(root);
  root.innerHTML =
    '<div class="stage"><canvas class="gl"></canvas>' +
    '<div class="bar">' +
    '<div class="chip"><span class="lab">Model</span><select data-k="model"></select></div>' +
    '<div class="chip"><span class="lab">Surface</span><button data-k="sCp" class="on">Pressure</button><button data-k="sPaint">Paint</button></div>' +
    '<div class="chip"><button data-k="lines" class="on">Streamlines</button><button data-k="parts" class="on">Particles</button></div>' +
    '<div class="chip"><span class="lab">Slice</span><select data-k="slice"><option value="off">off</option><option value="xz">centre</option><option value="xy">horizontal</option></select><select data-k="field"><option value="speed">speed</option><option value="cp">pressure</option></select></div>' +
    '<div class="chip"><span class="lab">Wind</span><input type="range" data-k="wind" min="20" max="300" step="5"><b data-k="windv"></b></div>' +
    '<div class="chip" data-k="runchip"><button class="go" data-k="run">▶ Run tunnel</button><select data-k="res"><option>64 (quick)</option><option selected>96 (standard)</option><option>128 (fine)</option><option>160 (very fine)</option></select></div>' +
    '</div>' +
    '<div class="title"><b data-k="name"></b><div class="muted" data-k="sub"></div><div class="big">' +
    '<div><span>Cd</span><b data-k="cd">–</b></div><div><span>Cl</span><b data-k="cl">–</b></div><div><span>Drag</span><b data-k="drag">–</b></div><div><span>Power</span><b data-k="pow">–</b></div></div></div>' +
    '<div class="legend"><div class="lab" data-k="legT">Surface pressure Cp</div><div class="ramp" data-k="ramp"></div><div class="ticks" data-k="ticks"></div></div>' +
    '<div class="empty" data-k="empty">Run the wind tunnel: upload car models (STL, OBJ, GLB) to the Car models dataset, or use the sample cars. Each car appears here with its pressure, streamlines and drag.</div>' +
    '</div>' +
    '<div class="side">' +
    '<div class="sec live" data-k="liveSec" style="display:none"><h3>Live tunnel</h3><div data-k="liveT"></div><div class="prog"><b data-k="liveBar" style="width:0"></b></div><canvas data-k="liveC"></canvas><div class="muted" data-k="liveS"></div></div>' +
    '<div class="sec"><h3>Compare models</h3><table data-k="table"></table></div>' +
    '<div class="sec"><h3>Drag coefficient over time</h3><canvas class="hist" data-k="hist"></canvas><div class="muted" style="font-size:11.5px">Time in car lengths of flow (L/U). The shaded part is averaged.</div></div>' +
    '<div class="sec muted" style="font-size:11.5px" data-k="about"></div>' +
    '</div>';
  var $ = function (k) { return root.querySelector('[data-k="' + k + '"]'); };

  // colour map (turbo-like), shared with the solver's PLY colours
  var STOPS = [[0.19, 0.07, 0.23], [0.16, 0.47, 0.93], [0.10, 0.85, 0.68], [0.64, 0.99, 0.24], [0.98, 0.73, 0.22], [0.85, 0.22, 0.04], [0.48, 0.02, 0.01]];
  function cmap(t, out, o) {
    t = Math.max(0, Math.min(1, t)) * (STOPS.length - 1);
    var i = Math.min(Math.floor(t), STOPS.length - 2), a = t - i, A = STOPS[i], B = STOPS[i + 1];
    out[o] = A[0] + (B[0] - A[0]) * a; out[o + 1] = A[1] + (B[1] - A[1]) * a; out[o + 2] = A[2] + (B[2] - A[2]) * a;
  }
  var tmp = [0, 0, 0];
  function rgb(t) { cmap(t, tmp, 0); return 'rgb(' + (tmp[0] * 255 | 0) + ',' + (tmp[1] * 255 | 0) + ',' + (tmp[2] * 255 | 0) + ')'; }
  $('ramp').style.background = 'linear-gradient(90deg,' + [0, .17, .33, .5, .67, .83, 1].map(rgb).join(',') + ')';

  var S = ctx.loadState ? (ctx.loadState() || {}) : {};
  var st = {
    docs: {}, order: [], cur: S.cur || null, surf: S.surf || 'cp', lines: S.lines !== false, parts: S.parts !== false,
    slice: S.slice || 'off', field: S.field || 'speed', wind: S.wind || null, res: S.res || '96 (standard)'
  };
  function save() { if (ctx.saveState) ctx.saveState({ cur: st.cur, surf: st.surf, lines: st.lines, parts: st.parts, slice: st.slice, field: st.field, wind: st.wind, res: st.res }); }

  // three.js scene
  var canvas = root.querySelector('canvas.gl');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06090f);
  scene.fog = new THREE.Fog(0x06090f, 30, 90);
  var camera = new THREE.PerspectiveCamera(38, 1, 0.05, 400);
  camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x1a2230, 0.9));
  var sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-6, -8, 12); scene.add(sun);
  var fill = new THREE.DirectionalLight(0x9fc4ff, 0.5); fill.position.set(8, 6, 4); scene.add(fill);
  var floorTex = (function () {
    var c = document.createElement('canvas'); c.width = 256; c.height = 256; var g = c.getContext('2d');
    g.fillStyle = '#10151e'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(120,160,210,.16)'; g.lineWidth = 2;
    for (var i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 30); return t;
  })();
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9, metalness: 0.0 }));
  floor.position.z = -0.002; scene.add(floor);
  var group = new THREE.Group(); scene.add(group);

  var orb = { tx: 2.3, ty: 0, tz: 0.6, r: 11, az: -2.35, el: 0.33 };
  function placeCam() {
    var ce = Math.cos(orb.el);
    camera.position.set(orb.tx + orb.r * ce * Math.cos(orb.az), orb.ty + orb.r * ce * Math.sin(orb.az), orb.tz + orb.r * Math.sin(orb.el));
    camera.lookAt(orb.tx, orb.ty, orb.tz);
  }
  var drag = null;
  canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
  canvas.addEventListener('pointerup', function () { drag = null; canvas.style.cursor = 'grab'; });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (drag.b === 2 || drag.shift) {
      var s = orb.r * 0.0016, sa = Math.sin(orb.az), ca = Math.cos(orb.az);
      orb.tx += (sa * dx) * s; orb.ty += (-ca * dx) * s; orb.tz += dy * s;
    } else { orb.az -= dx * 0.006; orb.el = Math.max(0.02, Math.min(1.45, orb.el + dy * 0.005)); }
    placeCam();
  });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  canvas.addEventListener('wheel', function (e) { e.preventDefault(); orb.r = Math.max(1, Math.min(80, orb.r * Math.exp(e.deltaY * 0.001))); placeCam(); }, { passive: false });

  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight; if (w < 2 || h < 2) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function b64(s, T) {
    var bin = atob(s), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return new T(u.buffer, 0, n / T.BYTES_PER_ELEMENT);
  }
  function gunzip(buf) {
    var u = new Uint8Array(buf);
    if (u[0] !== 0x1f || u[1] !== 0x8b) return Promise.resolve(new TextDecoder().decode(u));
    var ds = new DecompressionStream('gzip');
    return new Response(new Blob([u]).stream().pipeThrough(ds)).text();
  }

  var objs = null, anim = { parts: null, t0: performance.now() };
  function clearGroup() {
    while (group.children.length) {
      var o = group.children.pop();
      o.traverse(function (q) { if (q.geometry) q.geometry.dispose(); if (q.material) { if (q.material.map) q.material.map.dispose(); q.material.dispose(); } });
    }
    objs = null;
  }
  function build(doc) {
    clearGroup();
    if (!doc._v) {
      doc._v = b64(doc.mesh.v, Float32Array); doc._f = b64(doc.mesh.f, Uint32Array); doc._cp = b64(doc.mesh.cp, Float32Array);
      doc._so = b64(doc.streamlines.offsets, Int32Array); doc._sp = b64(doc.streamlines.p, Float32Array); doc._ss = b64(doc.streamlines.s, Float32Array);
    }
    objs = {};
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(doc._v, 3));
    g.setIndex(new THREE.BufferAttribute(doc._f, 1));
    g.computeVertexNormals();
    var col = new Float32Array(doc._cp.length * 3);
    for (var i = 0; i < doc._cp.length; i++) cmap((doc._cp[i] + 1.5) / 2.5, col, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    objs.cpMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide });
    objs.paintMat = new THREE.MeshPhysicalMaterial({ color: 0xc9ced6, roughness: 0.28, metalness: 0.6, clearcoat: 1.0, clearcoatRoughness: 0.12, side: THREE.DoubleSide });
    objs.car = new THREE.Mesh(g, st.surf === 'cp' ? objs.cpMat : objs.paintMat);
    group.add(objs.car);
    var so = doc._so, sp = doc._sp, ss = doc._ss, nl = so.length - 1, segs = 0;
    for (var l = 0; l < nl; l++) segs += Math.max(0, so[l + 1] - so[l] - 1);
    var lp = new Float32Array(segs * 6), lc = new Float32Array(segs * 6), k = 0;
    for (l = 0; l < nl; l++) for (var j = so[l]; j < so[l + 1] - 1; j++) {
      for (var e = 0; e < 2; e++) {
        var q = j + e; lp[k * 3] = sp[q * 3]; lp[k * 3 + 1] = sp[q * 3 + 1]; lp[k * 3 + 2] = sp[q * 3 + 2];
        cmap(ss[q] / 1.5, lc, k * 3); k++;
      }
    }
    var lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
    objs.lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55 }));
    objs.lines.visible = st.lines; group.add(objs.lines);
    var per = 6, np_ = nl * per, pp = new Float32Array(np_ * 3), pc = new Float32Array(np_ * 3);
    var pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
    objs.parts = new THREE.Points(pg, new THREE.PointsMaterial({ size: Math.max(0.03, doc.L * 0.012), vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
    objs.parts.visible = st.parts; group.add(objs.parts);
    var tt = new Float32Array(sp.length / 3), ttot = new Float32Array(nl);
    for (l = 0; l < nl; l++) {
      var acc = 0; tt[so[l]] = 0;
      for (j = so[l] + 1; j < so[l + 1]; j++) {
        var dx = sp[j * 3] - sp[j * 3 - 3], dy = sp[j * 3 + 1] - sp[j * 3 - 2], dz = sp[j * 3 + 2] - sp[j * 3 - 1];
        var v = Math.max(0.05, 0.5 * (ss[j] + ss[j - 1]));
        acc += Math.sqrt(dx * dx + dy * dy + dz * dz) / v; tt[j] = acc;
      }
      ttot[l] = acc;
    }
    anim.parts = { so: so, sp: sp, ss: ss, tt: tt, ttot: ttot, per: per, nl: nl, phase: Array.from({ length: np_ }, function (_, i) { return (i % per) / per + Math.random() * 0.08; }) };
    objs.slices = {};
    ['xz', 'xy'].forEach(function (key) {
      var s = doc.slices[key];
      var data = new Uint8Array(s.w * s.h * 4);
      var raw = { speed: b64(s.speed, Uint8Array), cp: b64(s.cp, Uint8Array) };
      var tex = new THREE.DataTexture(data, s.w, s.h, THREE.RGBAFormat);
      tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
      if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      var w = s.w * s.dx, h = s.h * s.dx;
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.82 }));
      if (key === 'xz') { m.rotation.x = Math.PI / 2; m.position.set(s.x0 - s.dx / 2 + w / 2, 0, s.z0 - s.dx / 2 + h / 2); }
      else { m.position.set(s.x0 - s.dx / 2 + w / 2, s.y0 - s.dx / 2 + h / 2, s.z); }
      m.visible = false; group.add(m);
      objs.slices[key] = { mesh: m, tex: tex, data: data, raw: raw, n: s.w * s.h };
    });
    paintSlices();
    showSlice();
  }
  function paintSlices() {
    if (!objs) return;
    Object.keys(objs.slices).forEach(function (k) {
      var o = objs.slices[k], r = o.raw[st.field], d = o.data, c = [0, 0, 0];
      for (var i = 0; i < o.n; i++) {
        var v = r[i];
        if (v === 0) { d[i * 4 + 3] = 0; continue; }
        cmap((v - 1) / 254, c, 0);
        d[i * 4] = c[0] * 255; d[i * 4 + 1] = c[1] * 255; d[i * 4 + 2] = c[2] * 255; d[i * 4 + 3] = 235;
      }
      o.tex.needsUpdate = true;
    });
  }
  function showSlice() {
    if (!objs) return;
    objs.slices.xz.mesh.visible = st.slice === 'xz';
    objs.slices.xy.mesh.visible = st.slice === 'xy';
    legend();
  }
  function legend() {
    var sl = st.slice !== 'off';
    if (sl && st.field === 'speed') { $('legT').textContent = 'Air speed (km/h) in the slice'; ticks([0, 0.5, 1, 1.5].map(function (f) { return Math.round(f * st.wind); })); }
    else if (sl || st.surf === 'cp') { $('legT').textContent = 'Pressure coefficient Cp' + (sl ? ' in the slice' : ' on the surface'); ticks([-1.5, -0.875, -0.25, 0.375, 1.0]); }
    else { $('legT').textContent = 'Streamline speed (km/h)'; ticks([0, 0.5, 1, 1.5].map(function (f) { return Math.round(f * st.wind); })); }
  }
  function ticks(a) { $('ticks').innerHTML = a.map(function (v) { return '<span>' + v + '</span>'; }).join(''); }

  function fmt(v, d) { return v == null || !isFinite(v) ? '–' : Number(v).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function forces(doc) {
    var V = st.wind / 3.6, q = 0.5 * (doc.rho_air || 1.204) * V * V;
    return { drag: doc.cd * q * doc.area, lift: doc.cl * q * doc.area, pow: doc.cd * q * doc.area * V / 1000 };
  }
  function numbers() {
    var doc = st.docs[st.cur];
    $('empty').style.display = st.order.length ? 'none' : '';
    $('windv').textContent = st.wind + ' km/h';
    if (!doc) { $('name').textContent = ''; $('sub').textContent = ''; return; }
    var f = forces(doc);
    $('name').textContent = doc.label;
    $('sub').textContent = fmt(doc.L, 2) + ' × ' + fmt(doc.W, 2) + ' × ' + fmt(doc.H, 2) + ' m · frontal area ' + fmt(doc.area, 2) + ' m² · CdA ' + fmt(doc.cd * doc.area, 3) + ' m²';
    $('cd').textContent = fmt(doc.cd, 3); $('cl').textContent = fmt(doc.cl, 3);
    $('drag').textContent = fmt(f.drag, 0) + ' N'; $('pow').textContent = fmt(f.pow, 1) + ' kW';
    var maxA = Math.max.apply(null, st.order.map(function (id) { return st.docs[id].cd * st.docs[id].area; }));
    var rows = st.order.slice().sort(function (a, b) { return st.docs[a].cd * st.docs[a].area - st.docs[b].cd * st.docs[b].area; });
    $('table').innerHTML = '<tr><th>Model</th><th>Cd</th><th>Cl</th><th>CdA m²</th><th>Drag N</th><th>kW</th></tr>' + rows.map(function (id) {
      var d = st.docs[id], ff = forces(d), a = d.cd * d.area;
      return '<tr class="row' + (id === st.cur ? ' sel' : '') + '" data-id="' + id + '"><td>' + esc(d.label) + '<div class="barc" style="width:' + (100 * a / maxA).toFixed(0) + '%;background:' + rgb(a / maxA * 0.85) + '"></div></td><td>' + fmt(d.cd, 3) + '</td><td>' + fmt(d.cl, 3) + '</td><td>' + fmt(a, 3) + '</td><td>' + fmt(ff.drag, 0) + '</td><td>' + fmt(ff.pow, 1) + '</td></tr>';
    }).join('');
    Array.prototype.forEach.call($('table').querySelectorAll('tr.row'), function (tr) { tr.onclick = function () { select(tr.getAttribute('data-id')); }; });
    $('about').innerHTML = 'Lattice Boltzmann LES on the GPU · ' + doc.grid.join('×') + ' cells (' + fmt(doc.dx * 100, 1) + ' cm) · ' + doc.flow_time + ' flow-through times · Re ' + doc.re_phys.toExponential(1) + '. Forces are averaged over the last part of the run; the wind speed slider scales them (same Cd). Drag the view to orbit, right-drag to pan, scroll to zoom.';
    hist(doc);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hist(doc) {
    var c = $('hist'), dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
    if (w < 10) return; c.width = w * dpr; c.height = h * dpr;
    var g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    var H = doc.history || []; if (!H.length) return;
    var t0 = H[0][0], t1 = H[H.length - 1][0];
    var ys = H.map(function (r) { return r[1]; }).sort(function (a, b) { return a - b; });
    var lo = Math.min(ys[Math.floor(ys.length * 0.05)], doc.cd) * 0.8, hi = Math.max(ys[Math.floor(ys.length * 0.95)], doc.cd) * 1.2;
    function X(t) { return 30 + (t - t0) / (t1 - t0 || 1) * (w - 36); }
    function Y(v) { return h - 14 - (v - lo) / (hi - lo || 1) * (h - 22); }
    var avgFrom = Math.max(t0, doc.flow_time * 0.45);
    g.fillStyle = 'rgba(34,211,238,.08)'; g.fillRect(X(avgFrom), 4, X(t1) - X(avgFrom), h - 18);
    g.strokeStyle = '#22d3ee'; g.lineWidth = 1.4; g.beginPath();
    H.forEach(function (r, i) { var y = Math.max(lo, Math.min(hi, r[1])); if (i) g.lineTo(X(r[0]), Y(y)); else g.moveTo(X(r[0]), Y(y)); }); g.stroke();
    g.strokeStyle = '#fbbf24'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(X(avgFrom), Y(doc.cd)); g.lineTo(X(t1), Y(doc.cd)); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(230,236,245,.6)'; g.font = '10.5px system-ui'; g.textAlign = 'right';
    g.fillText(fmt(hi, 2), 26, 12); g.fillText(fmt(lo, 2), 26, h - 14); g.textAlign = 'center'; g.fillText(fmt(t0, 0) + ' … ' + fmt(t1, 0) + ' L/U', w / 2, h - 2);
  }

  function select(id) {
    if (!st.docs[id]) return;
    var first = !objs;
    st.cur = id; save(); build(st.docs[id]); numbers();
    var d = st.docs[id];
    if (first || st._lastL !== d.L) { orb.tx = d.L * 0.5; orb.ty = 0; orb.tz = d.H * 0.4; orb.r = d.L * 2.3; st._lastL = d.L; placeCam(); }
    var sel = $('model'); if (sel.value !== id) sel.value = id;
  }

  var loading = {};
  function load() {
    var files = ((ctx.input('tunnel') || {}).files || []).filter(function (f) { return /\.tunnel\.json(\.gz)?$/i.test(f.name || f.path || ''); });
    var pending = files.map(function (f) {
      var key = (f.name || f.path) + ':' + (f.size || '') + ':' + (f.task || '') + ':' + (f.path || '') + ':' + (f.url || f.id || '');
      if (loading[key]) return loading[key];
      loading[key] = Promise.resolve(ctx.files.buffer(f)).then(gunzip).then(function (t) { var d = JSON.parse(t); d._key = key; return d; }).catch(function (e) { console.warn('wind tunnel: cannot read', f.name, e); return null; });
      return loading[key];
    });
    Promise.all(pending).then(function (docs) {
      var newDocs = {}, order = [];
      docs.forEach(function (d) { if (d && d.format === 'esasim.windtunnel/1') { newDocs[d.id] = d; if (order.indexOf(d.id) < 0) order.push(d.id); } });
      var changed = order.join('|') !== st.order.join('|') || order.some(function (id) { return !st.docs[id] || st.docs[id]._key !== newDocs[id]._key; });
      if (!changed) return;
      st.docs = newDocs; st.order = order;
      $('model').innerHTML = order.map(function (id) { return '<option value="' + id + '">' + esc(newDocs[id].label) + '</option>'; }).join('');
      if (order.length) select(st.cur && newDocs[st.cur] ? st.cur : order[0]); else { clearGroup(); numbers(); }
    });
    liveUpdate();
  }
  function liveUpdate() {
    var s = ((ctx.input('live') || {}).stream || []).filter(function (i) { return i.channel === 'tunnel' && i.data; });
    var running = ctx.run && ctx.run.active;
    if (!s.length) { $('liveSec').style.display = 'none'; return; }
    var last = s[s.length - 1].data, lastSlice = null;
    for (var i = s.length - 1; i >= 0; i--) if (s[i].data.slice) { lastSlice = s[i].data; break; }
    var allDone = last.done && last.index === last.count - 1;
    $('liveSec').style.display = allDone && !running ? 'none' : '';
    if (allDone && !running) return;
    var d = lastSlice || last;
    $('liveT').innerHTML = '<b>' + esc(last.label) + '</b> <span class="muted">· model ' + (last.index + 1) + ' of ' + last.count + '</span>';
    var frac = last.done ? 1 : (d.steps ? d.step / d.steps : 0);
    $('liveBar').style.width = (100 * (last.index + frac) / last.count).toFixed(1) + '%';
    $('liveS').textContent = last.done ? 'Done: Cd ' + fmt(last.cd, 3) : 't = ' + fmt(d.t, 1) + ' of ' + d.T + ' L/U · Cd ' + (d.cd != null ? fmt(d.cd, 3) : '…') + (d.averaging ? ' (averaging)' : '') + ' · ' + fmt(d.mlups, 0) + ' MLUPS';
    if (d.slice) {
      var sl = d.slice, c = $('liveC'); if (c.width !== sl.w || c.height !== sl.h) { c.width = sl.w; c.height = sl.h; }
      var raw = b64(sl.data, Uint8Array), g = c.getContext('2d'), img = g.createImageData(sl.w, sl.h), col = [0, 0, 0];
      for (var y = 0; y < sl.h; y++) for (var x = 0; x < sl.w; x++) {
        var v = raw[y * sl.w + x], o = ((sl.h - 1 - y) * sl.w + x) * 4;
        if (v === 0) { img.data[o] = 230; img.data[o + 1] = 232; img.data[o + 2] = 236; img.data[o + 3] = 255; continue; }
        cmap((v - 1) / 254, col, 0); img.data[o] = col[0] * 255; img.data[o + 1] = col[1] * 255; img.data[o + 2] = col[2] * 255; img.data[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }
  }

  function toggle(btn, on) { $(btn).classList.toggle('on', on); }
  $('sCp').onclick = function () { st.surf = 'cp'; toggle('sCp', true); toggle('sPaint', false); if (objs) objs.car.material = objs.cpMat; legend(); save(); };
  $('sPaint').onclick = function () { st.surf = 'paint'; toggle('sCp', false); toggle('sPaint', true); if (objs) objs.car.material = objs.paintMat; legend(); save(); };
  $('lines').onclick = function () { st.lines = !st.lines; toggle('lines', st.lines); if (objs) objs.lines.visible = st.lines; save(); };
  $('parts').onclick = function () { st.parts = !st.parts; toggle('parts', st.parts); if (objs) objs.parts.visible = st.parts; save(); };
  $('slice').onchange = function () { st.slice = this.value; showSlice(); save(); };
  $('field').onchange = function () { st.field = this.value; paintSlices(); legend(); save(); };
  $('model').onchange = function () { select(this.value); };
  $('wind').oninput = function () { st.wind = +this.value; numbers(); legend(); save(); };
  $('res').onchange = function () { st.res = this.value; save(); };
  toggle('sCp', st.surf === 'cp'); toggle('sPaint', st.surf !== 'cp'); toggle('lines', st.lines); toggle('parts', st.parts);
  $('slice').value = st.slice; $('field').value = st.field; $('res').value = st.res;
  var node = P.tunnel_node || 'tunnel';
  if (!ctx.run) $('runchip').style.display = 'none';
  $('run').onclick = function () {
    var params = {}; params[node] = { resolution: st.res, speed_kmh: st.wind || 120 };
    save();
    $('run').disabled = true; $('run').textContent = 'Starting…';
    ctx.run({ params: params }).then(function () { $('run').textContent = 'Running…'; }).catch(function (e) {
      $('run').disabled = false; $('run').textContent = '▶ Run tunnel'; $('liveSec').style.display = ''; $('liveT').textContent = String(e && e.message || e);
    });
  };
  function runState() {
    var active = ctx.run && ctx.run.active;
    $('run').disabled = !!active; $('run').textContent = active ? 'Running…' : '▶ Run tunnel';
  }

  var lastT = performance.now();
  function frame(now) {
    if (!el.isConnected) return;
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    var A = anim.parts, doc = st.docs[st.cur];
    if (A && objs && objs.parts.visible && doc) {
      var tnow = (now - anim.t0) / 1000 / 2.2 * doc.L;
      var pos = objs.parts.geometry.attributes.position.array, col = objs.parts.geometry.attributes.color.array;
      for (var l = 0; l < A.nl; l++) {
        var a = A.so[l], b = A.so[l + 1], T = A.ttot[l]; if (b - a < 2 || T <= 0) continue;
        for (var p = 0; p < A.per; p++) {
          var idx = l * A.per + p, tt = ((tnow + A.phase[idx] * T) % T);
          var lo = a, hi = b - 1;
          while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (A.tt[mid] <= tt) lo = mid; else hi = mid; }
          var f = (tt - A.tt[lo]) / ((A.tt[hi] - A.tt[lo]) || 1);
          for (var k = 0; k < 3; k++) pos[idx * 3 + k] = A.sp[lo * 3 + k] + (A.sp[hi * 3 + k] - A.sp[lo * 3 + k]) * f;
          cmap(A.ss[lo] / 1.5, col, idx * 3);
          col[idx * 3] = Math.min(1, col[idx * 3] * 1.25 + 0.1); col[idx * 3 + 1] = Math.min(1, col[idx * 3 + 1] * 1.25 + 0.1); col[idx * 3 + 2] = Math.min(1, col[idx * 3 + 2] * 1.25 + 0.1);
        }
      }
      objs.parts.geometry.attributes.position.needsUpdate = true; objs.parts.geometry.attributes.color.needsUpdate = true;
    }
    if (doc) floorTex.offset.x -= dt * (st.wind / 3.6) / 4.0 * 0.25;
    renderer.render(scene, camera);
  }

  ctx.on('update', load);
  ctx.on('resize', function () { resize(); numbers(); });
  ctx.on('run', function () { runState(); liveUpdate(); });
  if (st.wind == null) st.wind = 120;
  $('wind').value = st.wind;
  resize(); placeCam(); legend(); numbers(); runState();
  load();
  requestAnimationFrame(frame);
  setTimeout(resize, 50);
}
