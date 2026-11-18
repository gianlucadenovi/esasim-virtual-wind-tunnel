// ── EsaSim block ──────────────────────────────────────────────────────
// Wind tunnel view (ws-wind-tunnel-view) · version 2 · view, JavaScript: function render(ctx)
// The wind tunnel in 3D: each car with its own materials, its surface pressure or paint, and realistic smoke from a wand you move in real time through the computed flow; drag compared across models.
// Workspace: Gianluca De Novi's workspace · Author: Gianluca De Novi
// Saved: 2026-11-18
//
// Inputs   ctx.input("id") gives { files, stream }; ctx.rows("id"), ctx.json("id"), ctx.text("id")
//   tunnel      Files (gz, glb, gltf, json) Tunnel results · several · <model>.tunnel.json.gz, <model>.field.bin.gz and <model>.source.glb from the Wind tunnel block
//   live        Stream                    Live · several · optional · The Wind tunnel block's live telemetry (channel tunnel)
// Settings ctx.params.key
//   tunnel_node text      Tunnel node = "tunnel"
// EsaSim rewrites these lines from the block's definition each time it is saved: change the definition, not them.
// ── end of EsaSim block header ────────────────────────────────────────

/* Wind tunnel view (v2): the cars of a Wind tunnel run in a 3D wind tunnel. A smoke wand you move in real time sends
 * smoke through the computed flow (interpolated from the simulation's mean velocity, spread by its turbulence).
 * Each car shows its own materials (GLB/glTF), its surface pressure, or a neutral paint, at the press of a button.
 * Inputs: tunnel (*.tunnel.json.gz, *.field.bin.gz and the original *.source.glb of each car) and live (telemetry). */
function render(ctx) {
  var THREE = ctx.THREE, A = THREE.addons || {}, el = ctx.el, P = ctx.params || {};
  el.innerHTML = '';
  var css = document.createElement('style');
  css.textContent = [
    '.wt{position:absolute;inset:0;display:flex;background:#0b0d10;color:#e6ecf5;font:13px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden}',
    '.wt .stage{position:relative;flex:1;min-width:0}',
    '.wt canvas.gl{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '.wt .bar{position:absolute;left:12px;right:12px;top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;pointer-events:none}',
    '.wt .bar>*,.wt .wand>*{pointer-events:auto}',
    '.wt .chip{background:rgba(14,18,24,.84);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.1);border-radius:9px;padding:5px 8px;display:flex;gap:6px;align-items:center}',
    '.wt select,.wt button{background:#161c26;color:#e6ecf5;border:1px solid rgba(255,255,255,.14);border-radius:7px;padding:4px 8px;font:inherit;cursor:pointer}',
    '.wt button.on{background:#0e7490;border-color:#22d3ee}',
    '.wt button.go{background:#76b900;color:#0b1200;font-weight:700;border-color:#a3e635}',
    '.wt button:disabled{opacity:.45;cursor:default}',
    '.wt input[type=range]{width:110px;accent-color:#facc15}',
    '.wt .lab{font-size:11px;opacity:.65;text-transform:uppercase;letter-spacing:.4px}',
    '.wt .wand{position:absolute;left:12px;bottom:12px;width:250px;background:rgba(14,18,24,.86);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.1);border-radius:11px;padding:9px 11px;display:flex;flex-direction:column;gap:5px}',
    '.wt .wand h4{margin:0 0 2px;font-size:11.5px;text-transform:uppercase;letter-spacing:.5px;opacity:.8;display:flex;justify-content:space-between;align-items:center}',
    '.wt .wand .row{display:flex;align-items:center;gap:8px;font-size:12px}',
    '.wt .wand .row span{width:74px;opacity:.75}',
    '.wt .wand .row input[type=range]{flex:1;width:auto}',
    '.wt .wand .row b{width:44px;text-align:right;font-variant-numeric:tabular-nums;font-weight:600}',
    '.wt .legend{position:absolute;right:12px;bottom:12px;background:rgba(14,18,24,.84);border:1px solid rgba(255,255,255,.1);border-radius:9px;padding:7px 10px;min-width:210px}',
    '.wt .legend .ramp{height:9px;border-radius:3px;margin:4px 0 2px}',
    '.wt .legend .ticks{display:flex;justify-content:space-between;font-size:11px;opacity:.75}',
    '.wt .title{position:absolute;left:14px;top:96px;pointer-events:none;text-shadow:0 1px 3px #000}',
    '.wt .title b{font-size:20px;font-weight:700}',
    '.wt .title .big{display:flex;gap:14px;margin-top:4px}',
    '.wt .title .big div span{display:block;font-size:10.5px;opacity:.6;text-transform:uppercase;letter-spacing:.4px}',
    '.wt .title .big div b{font-size:22px;font-variant-numeric:tabular-nums}',
    '.wt .credit{position:absolute;right:14px;top:96px;font-size:11px;opacity:.7;text-align:right;max-width:320px;text-shadow:0 1px 2px #000}',
    '.wt .busy{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(14,18,24,.85);padding:8px 14px;border-radius:9px;display:none}',
    '.wt .side{width:330px;max-width:40%;border-left:1px solid rgba(255,255,255,.08);background:#0a0d12;display:flex;flex-direction:column;overflow:auto}',
    '.wt .sec{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06)}',
    '.wt .sec h3{margin:0 0 8px;font-size:12px;font-weight:650;opacity:.8;text-transform:uppercase;letter-spacing:.5px}',
    '.wt table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}',
    '.wt td,.wt th{padding:4px 4px;text-align:right;font-size:12px}',
    '.wt th{font-weight:600;opacity:.6;font-size:11px}',
    '.wt td:first-child,.wt th:first-child{text-align:left}',
    '.wt tr.row{cursor:pointer}.wt tr.row:hover{background:rgba(255,255,255,.04)}',
    '.wt tr.sel{background:rgba(250,204,21,.12)}',
    '.wt .barc{height:6px;border-radius:3px}',
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
    '<div class="chip"><span class="lab">Car</span><button data-k="mOrig">Original</button><button data-k="mCp">Pressure</button><button data-k="mPaint">Paint</button></div>' +
    '<div class="chip"><button data-k="smoke" class="on">Smoke</button><button data-k="lines">Streamlines</button></div>' +
    '<div class="chip"><span class="lab">Slice</span><select data-k="slice"><option value="off">off</option><option value="xz">centre</option><option value="xy">horizontal</option></select><select data-k="field"><option value="speed">speed</option><option value="cp">pressure</option></select></div>' +
    '<div class="chip"><span class="lab">Wind</span><input type="range" data-k="wind" min="20" max="350" step="5"><b data-k="windv"></b></div>' +
    '<div class="chip" data-k="runchip"><button class="go" data-k="run">▶ Run tunnel</button><select data-k="res"><option>64 (quick)</option><option>96 (standard)</option><option selected>128 (fine)</option><option>160 (very fine)</option></select></div>' +
    '</div>' +
    '<div class="title"><b data-k="name"></b><div class="muted" data-k="sub"></div><div class="big">' +
    '<div><span>Cd</span><b data-k="cd">–</b></div><div><span>Cl</span><b data-k="cl">–</b></div><div><span>Drag</span><b data-k="drag">–</b></div><div><span>Power</span><b data-k="pow">–</b></div></div></div>' +
    '<div class="credit" data-k="credit"></div>' +
    '<div class="wand" data-k="wandPanel"><h4>Smoke wand <span class="muted" style="text-transform:none;letter-spacing:0">drag the yellow handle</span></h4>' +
    '<div class="row"><span>Jets</span><input type="range" data-k="jets" min="1" max="11" step="1"><b data-k="jetsv"></b></div>' +
    '<div class="row"><span>Rake</span><select data-k="rake" style="flex:1"><option value="v">vertical</option><option value="h">horizontal</option><option value="p">single point</option></select></div>' +
    '<div class="row"><span>Height</span><input type="range" data-k="wz" min="0" max="1000" step="1"><b data-k="wzv"></b></div>' +
    '<div class="row"><span>Side</span><input type="range" data-k="wy" min="0" max="1000" step="1"><b data-k="wyv"></b></div>' +
    '<div class="row"><span>Spacing</span><input type="range" data-k="sp" min="10" max="400" step="1"><b data-k="spv"></b></div>' +
    '<div class="row"><span>Ahead</span><input type="range" data-k="wx" min="0" max="1000" step="1"><b data-k="wxv"></b></div>' +
    '<div class="row"><span>Density</span><input type="range" data-k="dens" min="20" max="200" step="1"><b data-k="densv"></b></div>' +
    '<div class="row"><span>Slow motion</span><input type="range" data-k="slow" min="1" max="60" step="1"><b data-k="slowv"></b></div>' +
    '<div class="row"><span>Colour</span><select data-k="scol" style="flex:1"><option value="yellow">yellow</option><option value="white">white</option><option value="speed">by speed</option></select></div>' +
    '</div>' +
    '<div class="legend" data-k="legend"><div class="lab" data-k="legT"></div><div class="ramp" data-k="ramp"></div><div class="ticks" data-k="ticks"></div></div>' +
    '<div class="busy" data-k="busy"></div>' +
    '<div class="empty" data-k="empty">Run the wind tunnel with the car models of the Car models dataset (GLB, glTF, STL, OBJ). Each car appears here in the tunnel, with smoke you can move.</div>' +
    '</div>' +
    '<div class="side">' +
    '<div class="sec live" data-k="liveSec" style="display:none"><h3>Live tunnel</h3><div data-k="liveT"></div><div class="prog"><b data-k="liveBar" style="width:0"></b></div><canvas data-k="liveC"></canvas><div class="muted" data-k="liveS"></div></div>' +
    '<div class="sec"><h3>Compare models</h3><table data-k="table"></table></div>' +
    '<div class="sec"><h3>Drag coefficient over time</h3><canvas class="hist" data-k="hist"></canvas><div class="muted" style="font-size:11.5px">Time in car lengths of flow (L/U). The shaded part is averaged.</div></div>' +
    '<div class="sec muted" style="font-size:11.5px" data-k="about"></div>' +
    '</div>';
  var $ = function (k) { return root.querySelector('[data-k="' + k + '"]'); };

  // ---------------------------------------------------------------- colours
  var STOPS = [[0.19, 0.07, 0.23], [0.16, 0.47, 0.93], [0.10, 0.85, 0.68], [0.64, 0.99, 0.24], [0.98, 0.73, 0.22], [0.85, 0.22, 0.04], [0.48, 0.02, 0.01]];
  function cmap(t, out, o) {
    t = Math.max(0, Math.min(1, t)) * (STOPS.length - 1);
    var i = Math.min(Math.floor(t), STOPS.length - 2), a = t - i, Q = STOPS[i], B = STOPS[i + 1];
    out[o] = Q[0] + (B[0] - Q[0]) * a; out[o + 1] = Q[1] + (B[1] - Q[1]) * a; out[o + 2] = Q[2] + (B[2] - Q[2]) * a;
  }
  var tmp = [0, 0, 0];
  function rgb(t) { cmap(t, tmp, 0); return 'rgb(' + (tmp[0] * 255 | 0) + ',' + (tmp[1] * 255 | 0) + ',' + (tmp[2] * 255 | 0) + ')'; }
  $('ramp').style.background = 'linear-gradient(90deg,' + [0, .17, .33, .5, .67, .83, 1].map(rgb).join(',') + ')';

  // ---------------------------------------------------------------- state
  var S = (ctx.loadState && ctx.loadState()) || {};
  var st = {
    docs: {}, order: [], cur: S.cur || null, mode: S.mode || 'original', smoke: S.smoke !== false, lines: !!S.lines,
    slice: S.slice || 'off', field: S.field || 'speed', wind: S.wind || 120, res: S.res || '128 (fine)',
    jets: S.jets || 5, rake: S.rake || 'v', wz: S.wz != null ? S.wz : 0.24, wy: S.wy != null ? S.wy : 0.5, sp: S.sp || 130,
    wx: S.wx != null ? S.wx : 0.4, dens: S.dens || 100, slow: S.slow || 12, scol: S.scol || 'yellow'
  };
  function save() {
    if (!ctx.saveState) return;
    ctx.saveState({ cur: st.cur, mode: st.mode, smoke: st.smoke, lines: st.lines, slice: st.slice, field: st.field, wind: st.wind, res: st.res,
      jets: st.jets, rake: st.rake, wz: st.wz, wy: st.wy, sp: st.sp, wx: st.wx, dens: st.dens, slow: st.slow, scol: st.scol });
  }

  // ---------------------------------------------------------------- renderer, tunnel room, lights
  var canvas = root.querySelector('canvas.gl');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111418);
  try { if (A.RoomEnvironment) { var pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new A.RoomEnvironment(), 0.04).texture; } } catch (e) { }
  var camera = new THREE.PerspectiveCamera(36, 1, 0.05, 500);
  camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xe8eefc, 0x2a2e36, 0.55));
  var key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-4, -6, 9); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key); scene.add(key.target);
  var rim = new THREE.DirectionalLight(0xcfe0ff, 0.8); rim.position.set(6, 5, 4); scene.add(rim);

  function canvasTex(w, h, draw, rep) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]);
    if ('colorSpace' in t && THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8; return t;
  }
  function noise(g, w, h, a) { var d = g.getImageData(0, 0, w, h); for (var i = 0; i < d.data.length; i += 4) { var n = (Math.random() - 0.5) * a; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; } g.putImageData(d, 0, 0); }
  var room = new THREE.Group(); scene.add(room);
  var floorTex = canvasTex(512, 512, function (g, w, h) {
    g.fillStyle = '#5d6066'; g.fillRect(0, 0, w, h); noise(g, w, h, 14);
    g.strokeStyle = 'rgba(40,42,46,.55)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
  }, [1, 1]);
  var beltTex = canvasTex(256, 256, function (g, w, h) {
    g.fillStyle = '#3a3d42'; g.fillRect(0, 0, w, h); noise(g, w, h, 26);
    g.fillStyle = 'rgba(255,255,255,.05)'; for (var i = 0; i < 8; i++) g.fillRect(i * 32, 0, 2, h);
  }, [1, 1]);
  var wallTex = canvasTex(512, 512, function (g, w, h) {
    g.fillStyle = '#2b2e33'; g.fillRect(0, 0, w, h); noise(g, w, h, 10);
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 4;
    for (var x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (var y = 0; y <= h; y += 256) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  }, [1, 1]);
  var belt = null;
  function buildRoom(L, H) {
    while (room.children.length) { var o = room.children.pop(); if (o.geometry) o.geometry.dispose(); }
    var X0 = -2.6 * L, X1 = 4.2 * L, Y = 1.9 * L, Z = Math.max(1.3 * L, 4 * H);
    var fl = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, 2 * Y), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0 }));
    floorTex.repeat.set((X1 - X0) / 2.5, 2 * Y / 2.5);
    fl.position.set((X0 + X1) / 2, 0, -0.003); fl.receiveShadow = true; room.add(fl);
    belt = new THREE.Mesh(new THREE.PlaneGeometry(2.4 * L, 0.55 * L), new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.95, metalness: 0 }));
    beltTex.repeat.set(2.4 * L / 1.2, 0.55 * L / 1.2);
    belt.position.set(0.5 * L, 0, -0.001); belt.receiveShadow = true; room.add(belt);
    var wm = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, metalness: 0.05, side: THREE.BackSide });
    wallTex.repeat.set((X1 - X0) / 3, Z / 3);
    var box = new THREE.Mesh(new THREE.BoxGeometry(X1 - X0, 2 * Y, Z * 2), wm);
    box.position.set((X0 + X1) / 2, 0, 0); room.add(box);
    var ceil = new THREE.MeshBasicMaterial({ color: 0xf3f6ff });
    for (var i = 0; i < 4; i++) { var lt = new THREE.Mesh(new THREE.PlaneGeometry(0.06 * L, 1.6 * L), ceil); lt.position.set(-0.6 * L + i * 0.75 * L, 0, Z - 0.01); lt.rotation.x = Math.PI; room.add(lt); }
    var hc = canvasTex(256, 256, function (g, w, h) { g.fillStyle = '#1a1c20'; g.fillRect(0, 0, w, h); g.strokeStyle = '#33373d'; g.lineWidth = 3; for (var x = 0; x < w; x += 16) for (var y = 0; y < h; y += 16) g.strokeRect(x, y, 16, 16); }, [8, 4]);
    var inlet = new THREE.Mesh(new THREE.PlaneGeometry(2 * Y * 0.9, Z * 0.9), new THREE.MeshStandardMaterial({ map: hc, roughness: 0.8 }));
    inlet.rotation.y = Math.PI / 2; inlet.rotation.z = Math.PI / 2; inlet.position.set(X0 + 0.02, 0, Z * 0.45); room.add(inlet);
    key.position.set(0.2 * L, -1.2 * L, 2.4 * L); key.target.position.set(0.5 * L, 0, 0);
    var sc = key.shadow.camera; sc.left = -1.6 * L; sc.right = 1.6 * L; sc.top = 1.6 * L; sc.bottom = -1.6 * L; sc.near = 0.1; sc.far = 6 * L; sc.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- camera
  var controls = null;
  if (A.OrbitControls) {
    controls = new A.OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.495; controls.screenSpacePanning = true;
  }
  function frameCar(d) {
    camera.position.set(d.L * 0.15, -d.L * 1.55, d.H * 0.9 + d.L * 0.12);
    var t = new THREE.Vector3(d.L * 0.45, 0, d.H * 0.4);
    if (controls) { controls.target.copy(t); controls.minDistance = d.L * 0.3; controls.maxDistance = d.L * 5; controls.update(); } else camera.lookAt(t);
  }
  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight; if (w < 2 || h < 2) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    smokeMat.uniforms.uScale.value = h / (2 * Math.tan(camera.fov * Math.PI / 360)) * renderer.getPixelRatio();
  }

  // ---------------------------------------------------------------- decoding and files
  function b64(s, T) {
    var bin = atob(s), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return new T(u.buffer, 0, n / T.BYTES_PER_ELEMENT);
  }
  function gunzipBuf(buf) {
    var u = new Uint8Array(buf);
    if (u[0] !== 0x1f || u[1] !== 0x8b) return Promise.resolve(u.buffer);
    return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  function fileByName(name) {
    var fs = (ctx.input('tunnel') || {}).files || [];
    for (var i = 0; i < fs.length; i++) { var n = fs[i].name || String(fs[i].path || '').split('/').pop(); if (n === name) return fs[i]; }
    return null;
  }
  function busy(t) { $('busy').style.display = t ? 'block' : 'none'; $('busy').textContent = t || ''; }

  // ---------------------------------------------------------------- the flow field (for smoke and pressure)
  function loadField(doc) {
    if (doc._field) return Promise.resolve(doc._field);
    var F = doc.field, f = F && fileByName(F.file);
    if (!f) return Promise.resolve(null);
    return Promise.resolve(ctx.files.buffer(f)).then(gunzipBuf).then(function (buf) {
      var nx = F.n[0], ny = F.n[1], nz = F.n[2], N = nx * ny * nz;
      var fld = {
        nx: nx, ny: ny, nz: nz, x0: F.origin[0], y0: F.origin[1], z0: F.origin[2], h: F.h,
        ux: new Int8Array(buf, 0, N), uy: new Int8Array(buf, N, N), uz: new Int8Array(buf, 2 * N, N),
        cp: new Uint8Array(buf, 3 * N, N), tu: new Uint8Array(buf, 4 * N, N)
      };
      doc._field = fld; return fld;
    }).catch(function (e) { console.warn('wind tunnel: field', e); return null; });
  }
  // trilinear sample at p (metres): out = [ux, uy, uz, turb, solid fraction] in units of U
  function sample(F, x, y, z, out) {
    var fx = (x - F.x0) / F.h, fy = (y - F.y0) / F.h, fz = (z - F.z0) / F.h;
    if (fx < 0 || fy < 0 || fx > F.nx - 1.001 || fy > F.ny - 1.001 || fz > F.nz - 1.001) return false;
    if (fz < 0) fz = 0;
    var i = fx | 0, j = fy | 0, k = fz | 0, a = fx - i, b = fy - j, c = fz - k;
    var sy = F.nz, sx = F.ny * F.nz, o = i * sx + j * sy + k;
    var ux = 0, uy = 0, uz = 0, tu = 0, so = 0;
    for (var n = 0; n < 8; n++) {
      var di = n & 1, dj = (n >> 1) & 1, dk = (n >> 2) & 1;
      var w = (di ? a : 1 - a) * (dj ? b : 1 - b) * (dk ? c : 1 - c);
      var q = o + di * sx + dj * sy + dk;
      ux += w * F.ux[q]; uy += w * F.uy[q]; uz += w * F.uz[q];
      var t = F.tu[q]; if (t === 255) so += w; else tu += w * t;
    }
    out[0] = ux / 80; out[1] = uy / 80; out[2] = uz / 80; out[3] = tu / 400; out[4] = so;
    return true;
  }
  function sampleCp(F, x, y, z) {
    var fx = Math.min(Math.max((x - F.x0) / F.h, 0), F.nx - 1.001), fy = Math.min(Math.max((y - F.y0) / F.h, 0), F.ny - 1.001), fz = Math.min(Math.max((z - F.z0) / F.h, 0), F.nz - 1.001);
    var i = fx | 0, j = fy | 0, k = fz | 0, a = fx - i, b = fy - j, c = fz - k, sy = F.nz, sx = F.ny * F.nz, o = i * sx + j * sy + k, v = 0;
    for (var n = 0; n < 8; n++) {
      var di = n & 1, dj = (n >> 1) & 1, dk = (n >> 2) & 1;
      v += (di ? a : 1 - a) * (dj ? b : 1 - b) * (dk ? c : 1 - c) * F.cp[o + di * sx + dj * sy + dk];
    }
    return v / 254 * 2.5 - 1.5;
  }

  // ---------------------------------------------------------------- the car: original materials, pressure, paint
  var carGroup = new THREE.Group(); scene.add(carGroup);
  var paintMat = new THREE.MeshPhysicalMaterial({ color: 0xbfc5cc, roughness: 0.32, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.08 });
  var cpMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.0, side: THREE.DoubleSide });
  var car = null;
  function disposeTree(o) { o.traverse(function (q) { if (q.geometry && q.userData.own) q.geometry.dispose(); }); }
  function loadGLB(doc) {
    if (doc._glb !== undefined) return Promise.resolve(doc._glb);
    var f = doc.source_file && fileByName(doc.source_file);
    if (!f || !A.GLTFLoader) { doc._glb = null; return Promise.resolve(null); }
    busy('Loading ' + doc.label + '…');
    return Promise.resolve(ctx.files.buffer(f)).then(function (buf) {
      return new Promise(function (res, rej) {
        var gl = new A.GLTFLoader();
        // pictures inside the file through <img>: the frame may not fetch the blob: URLs the loader makes
        gl.register(function (parser) { parser.textureLoader = new THREE.TextureLoader(); return { name: 'esasim_images' }; });
        gl.parse(buf, '', function (g) { res(g); }, rej);
      });
    }).then(function (g) {
      var holder = new THREE.Group();
      holder.matrixAutoUpdate = false;
      var M = doc.transform, m4 = new THREE.Matrix4();
      m4.set(M[0], M[1], M[2], M[3], M[4], M[5], M[6], M[7], M[8], M[9], M[10], M[11], M[12], M[13], M[14], M[15]);
      holder.matrix.copy(m4);
      holder.add(g.scene);
      holder.updateMatrixWorld(true);
      holder.traverse(function (q) { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; } });
      doc._credit = (g.parser && g.parser.json && g.parser.json.asset && g.parser.json.asset.extras) || {};
      doc._glb = holder; busy(''); return holder;
    }).catch(function (e) { console.warn('wind tunnel: GLB', e); busy(''); doc._glb = null; return null; });
  }
  // a copy of the original geometry painted with the pressure (or plain paint), in the tunnel's coordinates
  function pressureCopy(doc, holder, F) {
    var g = new THREE.Group(), v = new THREE.Vector3(), n = new THREE.Vector3();
    holder.updateMatrixWorld(true);
    holder.traverse(function (q) {
      if (!q.isMesh || !q.geometry || !q.geometry.attributes.position) return;
      var mt = Array.isArray(q.material) ? q.material[0] : q.material;
      if (mt && (mt.transparent || mt.alphaTest > 0)) return; // decals and glass overlays: leave out
      var geo = q.geometry.clone(), pos = geo.attributes.position;
      geo.applyMatrix4(q.matrixWorld);
      if (!geo.attributes.normal) geo.computeVertexNormals();
      var nr = geo.attributes.normal, c = new Float32Array(pos.count * 3), off = 0.6 * F.h;
      for (var i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i); n.fromBufferAttribute(nr, i);
        cmap((sampleCp(F, v.x + n.x * off, v.y + n.y * off, v.z + n.z * off) + 1.5) / 2.5, c, i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
      var mesh = new THREE.Mesh(geo, cpMat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.own = true;
      g.add(mesh);
    });
    return g;
  }
  function docMesh(doc) {
    if (!doc._v) {
      doc._v = b64(doc.mesh.v, Float32Array); doc._f = b64(doc.mesh.f, Uint32Array); doc._cp = b64(doc.mesh.cp, Float32Array);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(doc._v, 3)); g.setIndex(new THREE.BufferAttribute(doc._f, 1)); g.computeVertexNormals();
    var c = new Float32Array(doc._cp.length * 3);
    for (var i = 0; i < doc._cp.length; i++) cmap((doc._cp[i] + 1.5) / 2.5, c, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    var m = new THREE.Mesh(g, cpMat); m.castShadow = true; m.receiveShadow = true; m.userData.own = true;
    var grp = new THREE.Group(); grp.add(m); return grp;
  }
  function showMode() {
    if (!car) return;
    var hasOrig = !!car.original;
    $('mOrig').disabled = !hasOrig;
    var mode = st.mode === 'original' && !hasOrig ? 'pressure' : st.mode;
    if (car.original) car.original.visible = mode === 'original';
    car.cpObj.visible = mode !== 'original';
    car.cpObj.traverse(function (q) { if (q.isMesh) q.material = mode === 'paint' ? paintMat : cpMat; });
    ['mOrig', 'mCp', 'mPaint'].forEach(function (k, i) { $(k).classList.toggle('on', mode === ['original', 'pressure', 'paint'][i]); });
    legend();
  }

  // ---------------------------------------------------------------- streamlines and slices (from the run's files)
  var extras = new THREE.Group(); scene.add(extras);
  var lineObj = null, slices = {};
  function buildExtras(doc) {
    while (extras.children.length) { var o = extras.children.pop(); if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }
    var so = b64(doc.streamlines.offsets, Int32Array), sp = b64(doc.streamlines.p, Float32Array), ss = b64(doc.streamlines.s, Float32Array);
    var nl = so.length - 1, segs = 0, l, j;
    for (l = 0; l < nl; l++) segs += Math.max(0, so[l + 1] - so[l] - 1);
    var lp = new Float32Array(segs * 6), lc = new Float32Array(segs * 6), k = 0;
    for (l = 0; l < nl; l++) for (j = so[l]; j < so[l + 1] - 1; j++) for (var e = 0; e < 2; e++) {
      var q = j + e; lp[k * 3] = sp[q * 3]; lp[k * 3 + 1] = sp[q * 3 + 1]; lp[k * 3 + 2] = sp[q * 3 + 2]; cmap(ss[q] / 1.5, lc, k * 3); k++;
    }
    var lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
    lineObj = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6 }));
    extras.add(lineObj);
    slices = {};
    ['xz', 'xy'].forEach(function (key) {
      var s = doc.slices[key], data = new Uint8Array(s.w * s.h * 4);
      var tex = new THREE.DataTexture(data, s.w, s.h, THREE.RGBAFormat); tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
      if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      var w = s.w * s.dx, h = s.h * s.dx;
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.85, toneMapped: false }));
      if (key === 'xz') { m.rotation.x = Math.PI / 2; m.position.set(s.x0 - s.dx / 2 + w / 2, 0, s.z0 - s.dx / 2 + h / 2); }
      else m.position.set(s.x0 - s.dx / 2 + w / 2, s.y0 - s.dx / 2 + h / 2, s.z);
      extras.add(m);
      slices[key] = { mesh: m, tex: tex, data: data, raw: { speed: b64(s.speed, Uint8Array), cp: b64(s.cp, Uint8Array) }, n: s.w * s.h };
    });
    paintSlices(); showExtras();
  }
  function paintSlices() {
    Object.keys(slices).forEach(function (k) {
      var o = slices[k], r = o.raw[st.field], d = o.data, c = [0, 0, 0];
      for (var i = 0; i < o.n; i++) { var v = r[i]; if (v === 0) { d[i * 4 + 3] = 0; continue; } cmap((v - 1) / 254, c, 0); d[i * 4] = c[0] * 255; d[i * 4 + 1] = c[1] * 255; d[i * 4 + 2] = c[2] * 255; d[i * 4 + 3] = 230; }
      o.tex.needsUpdate = true;
    });
  }
  function showExtras() {
    if (lineObj) lineObj.visible = st.lines;
    if (slices.xz) slices.xz.mesh.visible = st.slice === 'xz';
    if (slices.xy) slices.xy.mesh.visible = st.slice === 'xy';
    legend();
  }

  // ---------------------------------------------------------------- smoke
  var MAXP = 60000;
  var pPos = new Float32Array(MAXP * 3), pCol = new Float32Array(MAXP * 3), pAge = new Float32Array(MAXP), pSize = new Float32Array(MAXP);
  var pVel = new Float32Array(MAXP * 3), pLife = new Float32Array(MAXP), pSpr = new Float32Array(MAXP), alive = 0;
  var sg = new THREE.BufferGeometry();
  var aPos = new THREE.BufferAttribute(pPos, 3), aCol = new THREE.BufferAttribute(pCol, 3), aAge = new THREE.BufferAttribute(pAge, 1), aSize = new THREE.BufferAttribute(pSize, 1);
  [aPos, aCol, aAge, aSize].forEach(function (a) { a.setUsage(THREE.DynamicDrawUsage); });
  sg.setAttribute('position', aPos); sg.setAttribute('aCol', aCol); sg.setAttribute('aAge', aAge); sg.setAttribute('aSize', aSize);
  var smokeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.NormalBlending, toneMapped: false,
    uniforms: { uScale: { value: 600 }, uOpacity: { value: 0.16 } },
    vertexShader: [
      'attribute vec3 aCol; attribute float aAge; attribute float aSize; uniform float uScale;',
      'varying vec3 vCol; varying float vA; varying float aAgeV;',
      'void main(){ aAgeV = aAge; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;',
      ' gl_PointSize = clamp(aSize * uScale / -mv.z, 1.0, 256.0); vCol = aCol;',
      ' vA = smoothstep(0.0, 0.04, aAge) * (1.0 - smoothstep(0.65, 1.0, aAge)); }'
    ].join('\n'),
    fragmentShader: [
      'uniform float uOpacity; varying vec3 vCol; varying float vA; varying float aAgeV;',
      'void main(){ vec2 d = gl_PointCoord - 0.5; float r2 = dot(d,d) * 4.0; if (r2 > 1.0) discard;',
      ' float a = exp(-r2 * 3.2) * uOpacity * vA * (1.0 - 0.55 * aAgeV);',
      ' float shade = 0.72 + 0.28 * (1.0 - r2) + 0.12 * (0.5 - gl_PointCoord.y);',
      ' gl_FragColor = vec4(vCol * shade, a); }'
    ].join('\n')
  });
  var smokePts = new THREE.Points(sg, smokeMat); smokePts.frustumCulled = false; smokePts.renderOrder = 10; scene.add(smokePts);

  // the wand: a rake of nozzles in front of the car, and a handle to drag it
  var wand = new THREE.Group(); scene.add(wand);
  var nozzleMat = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.45, metalness: 0.6 });
  var handle = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0x6b5500, roughness: 0.4 }));
  scene.add(handle);
  var nozzles = [];
  function wandGeometry() {
    var d = st.docs[st.cur]; if (!d) return;
    var L = d.L;
    var xw = -(0.08 + 0.42 * st.wx) * L;
    var zc = Math.max(0.02 * L, st.wz * Math.max(1.4 * d.H, 0.4 * L));
    var yc = (st.wy - 0.5) * (d.W + 0.6 * L);
    var gap = st.sp / 1000 * L * 0.25, n = st.rake === 'p' ? 1 : st.jets;
    nozzles = [];
    for (var i = 0; i < n; i++) {
      var o = (i - (n - 1) / 2) * gap;
      nozzles.push(st.rake === 'h' ? [xw, yc + o, zc] : [xw, yc, Math.max(0.01 * L, zc + o)]);
    }
    while (wand.children.length) { var c = wand.children.pop(); c.geometry.dispose(); }
    var r = 0.006 * L, len = 0.05 * L;
    nozzles.forEach(function (p) {
      var cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.3, len, 12), nozzleMat);
      cyl.rotation.z = -Math.PI / 2; cyl.position.set(p[0] - len / 2, p[1], p[2]); cyl.castShadow = true; wand.add(cyl);
    });
    var a = nozzles[0], b = nozzles[nozzles.length - 1], bx = xw - len;
    if (st.rake === 'h') {
      var span = Math.abs(b[1] - a[1]) + 2 * r;
      var bar = new THREE.Mesh(new THREE.BoxGeometry(2.2 * r, span, 2.2 * r), nozzleMat); bar.position.set(bx, (a[1] + b[1]) / 2, a[2]); wand.add(bar);
      var post = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a[2], 10), nozzleMat); post.rotation.x = Math.PI / 2; post.position.set(bx, (a[1] + b[1]) / 2, a[2] / 2); wand.add(post);
    } else {
      var top = Math.max(a[2], b[2]) + r;
      var pole = new THREE.Mesh(new THREE.BoxGeometry(2.2 * r, 2.2 * r, top), nozzleMat); pole.position.set(bx, a[1], top / 2); wand.add(pole);
    }
    handle.scale.setScalar(0.018 * L);
    handle.position.set(xw - len, yc, zc + (st.rake === 'v' ? 0 : 0.03 * L));
    handle.visible = st.smoke;
    wand.visible = st.smoke;
    labels();
  }
  function labels() {
    var d = st.docs[st.cur]; if (!d) return;
    var p = handle.position;
    $('jetsv').textContent = st.rake === 'p' ? 1 : st.jets;
    $('wzv').textContent = fmt(p.z, 2) + ' m'; $('wyv').textContent = fmt(p.y, 2) + ' m';
    $('spv').textContent = fmt(st.sp / 1000 * d.L * 0.25 * 100, 0) + ' cm'; $('wxv').textContent = fmt(-p.x, 2) + ' m';
    $('densv').textContent = st.dens + '%'; $('slowv').textContent = '×' + st.slow;
  }
  var ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), dragging = false, plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), hit = new THREE.Vector3();
  function setMouse(e) { var r = canvas.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, camera); }
  canvas.addEventListener('pointerdown', function (e) {
    if (!st.smoke || e.button !== 0) return; setMouse(e);
    if (ray.intersectObject(handle).length) {
      dragging = true; if (controls) controls.enabled = false; plane.constant = -handle.position.x;
      canvas.setPointerCapture(e.pointerId); e.preventDefault(); e.stopImmediatePropagation();
    }
  }, true);
  canvas.addEventListener('pointermove', function (e) {
    setMouse(e);
    if (!dragging) { canvas.style.cursor = st.smoke && ray.intersectObject(handle).length ? 'grab' : ''; return; }
    var d = st.docs[st.cur]; if (!d || !ray.ray.intersectPlane(plane, hit)) return;
    var zr = Math.max(1.4 * d.H, 0.4 * d.L), yr = d.W + 0.6 * d.L;
    st.wz = Math.max(0, Math.min(1, hit.z / zr)); st.wy = Math.max(0, Math.min(1, hit.y / yr + 0.5));
    $('wz').value = st.wz * 1000; $('wy').value = st.wy * 1000;
    wandGeometry();
  });
  canvas.addEventListener('pointerup', function () { if (dragging) { dragging = false; if (controls) controls.enabled = true; save(); } });

  var smp = [0, 0, 0, 0, 0], smp2 = [0, 0, 0, 0, 0], emitAcc = 0;
  function gauss() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); }
  function kill(i) {
    var j = --alive; if (i === j) return;
    pPos[i * 3] = pPos[j * 3]; pPos[i * 3 + 1] = pPos[j * 3 + 1]; pPos[i * 3 + 2] = pPos[j * 3 + 2];
    pVel[i * 3] = pVel[j * 3]; pVel[i * 3 + 1] = pVel[j * 3 + 1]; pVel[i * 3 + 2] = pVel[j * 3 + 2];
    pCol[i * 3] = pCol[j * 3]; pCol[i * 3 + 1] = pCol[j * 3 + 1]; pCol[i * 3 + 2] = pCol[j * 3 + 2];
    pAge[i] = pAge[j]; pLife[i] = pLife[j]; pSize[i] = pSize[j]; pSpr[i] = pSpr[j];
  }
  var SMOKE = { yellow: [0.98, 0.86, 0.16], white: [0.93, 0.94, 0.96] };
  function stepSmoke(dt) {
    var d = st.docs[st.cur], F = d && d._field;
    if (!d || !F || !st.smoke) { alive = 0; sg.setDrawRange(0, 0); return; }
    var L = d.L, Uv = L / (st.slow / 8);            // on screen the air crosses one car length in slow/8 seconds
    var TL = 0.06 * L / Uv, base = 0.012 * L * 0.025, s0 = 0.011 * L * (0.7 + 0.3 * st.dens / 100);
    var life = 3.2 * L / Uv, rate = (140 + 5.2 * st.dens) * 12 / st.slow, col = SMOKE[st.scol];
    emitAcc += dt * rate;
    var ne = Math.floor(emitAcc); emitAcc -= ne;
    for (var e = 0; e < ne; e++) for (var z = 0; z < nozzles.length && alive < MAXP; z++) {
      var i = alive++, p = nozzles[z], jit = 0.002 * L;
      pPos[i * 3] = p[0] + Math.random() * Uv * dt; pPos[i * 3 + 1] = p[1] + gauss() * jit; pPos[i * 3 + 2] = p[2] + gauss() * jit;
      pVel[i * 3] = pVel[i * 3 + 1] = pVel[i * 3 + 2] = 0;
      pAge[i] = 0; pLife[i] = life * (0.85 + 0.3 * Math.random()); pSize[i] = s0; pSpr[i] = 0;
      if (col) { pCol[i * 3] = col[0]; pCol[i * 3 + 1] = col[1]; pCol[i * 3 + 2] = col[2]; }
    }
    // move: mean flow (midpoint rule) + turbulent velocity (a random walk with the local intensity)
    var sq = Math.sqrt(2 * dt / TL);
    for (var n = alive - 1; n >= 0; n--) {
      var x = pPos[n * 3], y = pPos[n * 3 + 1], zz = pPos[n * 3 + 2];
      if (!sample(F, x, y, zz, smp)) { if (x < F.x0) { smp[0] = 1; smp[1] = smp[2] = smp[3] = smp[4] = 0; } else { kill(n); continue; } }
      var mx = x + 0.5 * dt * smp[0] * Uv, my = y + 0.5 * dt * smp[1] * Uv, mz = zz + 0.5 * dt * smp[2] * Uv;
      if (!sample(F, mx, my, mz, smp2)) { smp2[0] = smp[0]; smp2[1] = smp[1]; smp2[2] = smp[2]; smp2[3] = smp[3]; smp2[4] = 0; }
      var sig = smp2[3] * Uv * 0.85 + base * Uv;
      for (var c = 0; c < 3; c++) pVel[n * 3 + c] += -pVel[n * 3 + c] * dt / TL + sig * sq * gauss();
      var nx = x + dt * (smp2[0] * Uv + pVel[n * 3]), ny = y + dt * (smp2[1] * Uv + pVel[n * 3 + 1]), nz = zz + dt * (smp2[2] * Uv + pVel[n * 3 + 2]);
      if (nz < 0.004 * L) { nz = 0.004 * L; pVel[n * 3 + 2] = Math.abs(pVel[n * 3 + 2]); }
      if (sample(F, nx, ny, nz, smp) && smp[4] > 0.45) {
        pVel[n * 3] *= -0.3; pVel[n * 3 + 1] *= -0.3; pVel[n * 3 + 2] *= -0.3; nx = x + dt * smp2[0] * Uv * 0.5; ny = y; nz = zz;
      }
      pPos[n * 3] = nx; pPos[n * 3 + 1] = ny; pPos[n * 3 + 2] = nz;
      pAge[n] += dt / pLife[n];
      pSpr[n] += smp2[3] * dt * Uv;
      pSize[n] = s0 * (1 + 2.2 * pAge[n]) + 0.35 * pSpr[n] * 0.12;
      if (!col) { var spd = Math.sqrt(smp2[0] * smp2[0] + smp2[1] * smp2[1] + smp2[2] * smp2[2]); cmap(spd / 1.5, pCol, n * 3); }
      if (pAge[n] >= 1) kill(n);
    }
    smokeMat.uniforms.uOpacity.value = (0.05 + 0.1 * st.dens / 100) * (1 + 0.6 * (12 - Math.min(12, st.slow)) / 12);
    sg.setDrawRange(0, alive);
    aPos.needsUpdate = true; aCol.needsUpdate = true; aAge.needsUpdate = true; aSize.needsUpdate = true;
  }

  // ---------------------------------------------------------------- legend, numbers, table, history
  function legend() {
    var showSl = st.slice !== 'off';
    var lg = $('legend');
    if (showSl && st.field === 'speed') { $('legT').textContent = 'Air speed in the slice (km/h)'; ticks([0, .5, 1, 1.5].map(function (f) { return Math.round(f * st.wind); })); }
    else if (showSl || st.mode === 'pressure') { $('legT').textContent = 'Pressure coefficient Cp' + (showSl ? ' (slice)' : ' (surface)'); ticks([-1.5, -0.875, -0.25, 0.375, 1.0]); }
    else if (st.smoke && st.scol === 'speed') { $('legT').textContent = 'Smoke: air speed (km/h)'; ticks([0, .5, 1, 1.5].map(function (f) { return Math.round(f * st.wind); })); }
    else if (st.lines) { $('legT').textContent = 'Streamlines: air speed (km/h)'; ticks([0, .5, 1, 1.5].map(function (f) { return Math.round(f * st.wind); })); }
    else { lg.style.display = 'none'; return; }
    lg.style.display = '';
  }
  function ticks(a) { $('ticks').innerHTML = a.map(function (v) { return '<span>' + v + '</span>'; }).join(''); }
  function fmt(v, d) { return v == null || !isFinite(v) ? '–' : Number(v).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function forces(doc) { var V = st.wind / 3.6, q = 0.5 * (doc.rho_air || 1.204) * V * V; return { drag: doc.cd * q * doc.area, pow: doc.cd * q * doc.area * V / 1000 }; }
  function numbers() {
    var doc = st.docs[st.cur];
    $('empty').style.display = st.order.length ? 'none' : '';
    $('wandPanel').style.display = st.order.length && st.smoke ? '' : 'none';
    $('windv').textContent = st.wind + ' km/h';
    if (!doc) { $('name').textContent = ''; $('sub').textContent = ''; $('credit').innerHTML = ''; return; }
    var f = forces(doc);
    $('name').textContent = doc.label;
    $('sub').textContent = fmt(doc.L, 2) + ' × ' + fmt(doc.W, 2) + ' × ' + fmt(doc.H, 2) + ' m · frontal area ' + fmt(doc.area, 2) + ' m² · CdA ' + fmt(doc.cd * doc.area, 3) + ' m²';
    $('cd').textContent = fmt(doc.cd, 3); $('cl').textContent = fmt(doc.cl, 3);
    $('drag').textContent = fmt(f.drag, 0) + ' N'; $('pow').textContent = fmt(f.pow, 1) + ' kW';
    var cr = doc._credit || {};
    $('credit').innerHTML = cr.title || cr.author ? 'Model: ' + esc(cr.title || doc.label) + (cr.author ? '<br>by ' + esc(String(cr.author).replace(/\s*\(https?:[^)]*\)/, '')) : '') + (cr.license ? ' · ' + esc(String(cr.license).split(' (')[0]) : '') : '';
    var maxA = Math.max.apply(null, st.order.map(function (id) { return st.docs[id].cd * st.docs[id].area; }));
    var rows = st.order.slice().sort(function (a, b) { return st.docs[a].cd * st.docs[a].area - st.docs[b].cd * st.docs[b].area; });
    $('table').innerHTML = '<tr><th>Model</th><th>Cd</th><th>Cl</th><th>CdA m²</th><th>Drag N</th><th>kW</th></tr>' + rows.map(function (id) {
      var d = st.docs[id], ff = forces(d), a = d.cd * d.area;
      return '<tr class="row' + (id === st.cur ? ' sel' : '') + '" data-id="' + esc(id) + '"><td>' + esc(d.label) + '<div class="barc" style="width:' + (100 * a / maxA).toFixed(0) + '%;background:' + rgb(a / maxA * 0.85) + '"></div></td><td>' + fmt(d.cd, 3) + '</td><td>' + fmt(d.cl, 3) + '</td><td>' + fmt(a, 3) + '</td><td>' + fmt(ff.drag, 0) + '</td><td>' + fmt(ff.pow, 1) + '</td></tr>';
    }).join('');
    Array.prototype.forEach.call($('table').querySelectorAll('tr.row'), function (tr) { tr.onclick = function () { select(tr.getAttribute('data-id')); }; });
    $('about').innerHTML = 'Lattice Boltzmann LES on the GPU · ' + doc.grid.join('×') + ' cells (' + fmt(doc.dx * 100, 1) + ' cm) · ' + doc.flow_time + ' flow-through times · Re ' + Number(doc.re_phys).toExponential(1) + '. The smoke follows the time-averaged flow of the run, interpolated wherever you put the wand, and spreads with the measured turbulence. Forces are averaged over the last part of the run; the wind slider scales them (same Cd). Drag to orbit, right-drag to pan, scroll to zoom.';
    hist(doc);
  }
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
    g.fillStyle = 'rgba(250,204,21,.08)'; g.fillRect(X(avgFrom), 4, X(t1) - X(avgFrom), h - 18);
    g.strokeStyle = '#22d3ee'; g.lineWidth = 1.4; g.beginPath();
    H.forEach(function (r, i) { var y = Math.max(lo, Math.min(hi, r[1])); if (i) g.lineTo(X(r[0]), Y(y)); else g.moveTo(X(r[0]), Y(y)); }); g.stroke();
    g.strokeStyle = '#facc15'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(X(avgFrom), Y(doc.cd)); g.lineTo(X(t1), Y(doc.cd)); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(230,236,245,.6)'; g.font = '10.5px system-ui'; g.textAlign = 'right';
    g.fillText(fmt(hi, 2), 26, 12); g.fillText(fmt(lo, 2), 26, h - 14); g.textAlign = 'center'; g.fillText(fmt(t0, 0) + ' … ' + fmt(t1, 0) + ' L/U', w / 2, h - 2);
  }

  // ---------------------------------------------------------------- choosing a model
  var selToken = 0;
  function select(id) {
    var doc = st.docs[id]; if (!doc) return;
    var token = ++selToken, first = st._shown == null;
    st.cur = id; save();
    if (car) { if (car.cpObj) { carGroup.remove(car.cpObj); disposeTree(car.cpObj); } if (car.original) carGroup.remove(car.original); car = null; }
    alive = 0;
    if (st._roomL !== doc.L) { buildRoom(doc.L, doc.H); st._roomL = doc.L; }
    if (first || st._shown !== id) frameCar(doc);
    st._shown = id;
    buildExtras(doc);
    numbers();
    var sel = $('model'); if (sel.value !== id) sel.value = id;
    busy('Loading the flow around ' + doc.label + '…');
    Promise.all([loadField(doc), doc.source_file ? loadGLB(doc) : Promise.resolve(null)]).then(function (r) {
      if (token !== selToken) return;
      var F = r[0], orig = r[1];
      busy('');
      car = { original: orig, cpObj: orig && F ? pressureCopy(doc, orig, F) : docMesh(doc) };
      if (orig) carGroup.add(orig);
      carGroup.add(car.cpObj);
      showMode(); wandGeometry(); numbers();
    });
  }

  // ---------------------------------------------------------------- inputs
  var loading = {};
  function load() {
    var files = ((ctx.input('tunnel') || {}).files || []).filter(function (f) { return /\.tunnel\.json(\.gz)?$/i.test(f.name || f.path || ''); });
    var pending = files.map(function (f) {
      var key = (f.name || f.path) + ':' + (f.size || '') + ':' + (f.id || f.url || f.path || '');
      if (!loading[key]) loading[key] = Promise.resolve(ctx.files.buffer(f)).then(gunzipBuf).then(function (b) { var d = JSON.parse(new TextDecoder().decode(b)); d._key = key; return d; })
        .catch(function (e) { console.warn('wind tunnel: cannot read', f.name, e); delete loading[key]; return null; });
      return loading[key];
    });
    if (files.length && !st.order.length) busy('Loading the results…');
    Promise.all(pending).then(function (docs) {
      busy('');
      var nd = {}, order = [];
      docs.forEach(function (d) { if (d && d.format === 'esasim.windtunnel/1') { nd[d.id] = st.docs[d.id] && st.docs[d.id]._key === d._key ? st.docs[d.id] : d; if (order.indexOf(d.id) < 0) order.push(d.id); } });
      var changed = order.join('|') !== st.order.join('|') || order.some(function (id) { return nd[id] !== st.docs[id]; });
      if (!changed) return;
      st.docs = nd; st.order = order;
      $('model').innerHTML = order.map(function (id) { return '<option value="' + esc(id) + '">' + esc(nd[id].label) + '</option>'; }).join('');
      if (order.length) select(st.cur && nd[st.cur] ? st.cur : order[0]); else numbers();
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

  // ---------------------------------------------------------------- controls
  function setMode(m) { st.mode = m; showMode(); save(); }
  $('mOrig').onclick = function () { setMode('original'); };
  $('mCp').onclick = function () { setMode('pressure'); };
  $('mPaint').onclick = function () { setMode('paint'); };
  $('smoke').onclick = function () { st.smoke = !st.smoke; this.classList.toggle('on', st.smoke); if (!st.smoke) alive = 0; wandGeometry(); numbers(); legend(); save(); };
  $('lines').onclick = function () { st.lines = !st.lines; this.classList.toggle('on', st.lines); showExtras(); save(); };
  $('slice').onchange = function () { st.slice = this.value; showExtras(); save(); };
  $('field').onchange = function () { st.field = this.value; paintSlices(); legend(); save(); };
  $('model').onchange = function () { select(this.value); };
  $('wind').oninput = function () { st.wind = +this.value; numbers(); legend(); save(); };
  $('res').onchange = function () { st.res = this.value; save(); };
  [['jets', 'jets', 1], ['wz', 'wz', 1000], ['wy', 'wy', 1000], ['sp', 'sp', 1], ['wx', 'wx', 1000], ['dens', 'dens', 1], ['slow', 'slow', 1]].forEach(function (c) {
    var inp = $(c[0]); inp.value = c[2] === 1000 ? st[c[1]] * 1000 : st[c[1]];
    inp.oninput = function () { st[c[1]] = c[2] === 1000 ? +this.value / 1000 : +this.value; wandGeometry(); save(); };
  });
  $('rake').value = st.rake; $('rake').onchange = function () { st.rake = this.value; wandGeometry(); save(); };
  $('scol').value = st.scol; $('scol').onchange = function () { st.scol = this.value; var c = SMOKE[st.scol]; if (c) for (var i = 0; i < alive; i++) { pCol[i * 3] = c[0]; pCol[i * 3 + 1] = c[1]; pCol[i * 3 + 2] = c[2]; } legend(); save(); };
  $('smoke').classList.toggle('on', st.smoke); $('lines').classList.toggle('on', st.lines);
  $('slice').value = st.slice; $('field').value = st.field; $('res').value = st.res; $('wind').value = st.wind;
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
  function runState() { var a = ctx.run && ctx.run.active; $('run').disabled = !!a; $('run').textContent = a ? 'Running…' : '▶ Run tunnel'; }

  // ---------------------------------------------------------------- animation
  var lastT = performance.now();
  function frame(now) {
    if (!el.isConnected) return;
    requestAnimationFrame(frame);
    var real = Math.min(0.25, (now - lastT) / 1000); lastT = now;
    var nsub = Math.max(1, Math.ceil(real / (1 / 30))), dt = real / nsub;
    for (var si = 0; si < nsub; si++) stepSmoke(dt);
    var d = st.docs[st.cur];
    if (d && belt) beltTex.offset.x -= real * (d.L / (st.slow / 8)) / 1.2;
    if (controls) controls.update();
    renderer.render(scene, camera);
  }

  ctx.on('update', load);
  ctx.on('resize', function () { resize(); numbers(); });
  ctx.on('run', function () { runState(); liveUpdate(); });
  resize(); legend(); numbers(); runState();
  load();
  requestAnimationFrame(frame);
  setTimeout(resize, 60);
}
