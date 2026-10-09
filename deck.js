/* Visor de la presentación CIMAT · Propuesta para Consorcio Médico Mius
   Escala 1280×720, navegación, contadores, portadas animadas, diagrama de plataforma e interacción del ticket. */
(function () {
  'use strict';
  var STATIC = /[?&]static\b/.test(location.search);
  if (STATIC) document.documentElement.classList.add('static');
  var reduce = STATIC || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var stage = document.getElementById('stage');
  var slides = Array.prototype.slice.call(stage.querySelectorAll('.slide'));
  var N = slides.length, cur = -1;
  var prog = document.getElementById('prog'), cnt = document.getElementById('cnt'), pgn = document.getElementById('pgn');
  var ui = document.getElementById('ui'), ov = document.getElementById('ov'), ovg = document.getElementById('ovg');

  function fit() {
    var s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    stage.style.setProperty('--s', s);
    if (platform) platform.redraw();
  }

  /* ---------------------------------------------------------------- contadores */
  function fmt(el, n) {
    var dec = +el.getAttribute('data-dec') || 0, sep = el.getAttribute('data-sep');
    var s = (sep || dec) ? n.toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : String(n);
    return (el.getAttribute('data-prefix') || '') + s + (el.getAttribute('data-suffix') || '');
  }
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-count')), dec = +el.getAttribute('data-dec') || 0, k10 = Math.pow(10, dec);
    if (reduce) { el.textContent = fmt(el, to); return; }
    var t0 = performance.now(), dur = 1200, done = false;
    function finish() { done = true; el.textContent = fmt(el, to); }
    function step() {
      if (done) return;
      var k = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      if (k >= 1) { finish(); return; }
      el.textContent = fmt(el, Math.round(to * e * k10) / k10);
      requestAnimationFrame(step);
    }
    el.textContent = fmt(el, 0); requestAnimationFrame(step);
    setTimeout(finish, dur + 300);
  }

  /* ---------------------------------------------------------------- red de nodos, símbolos y parallax (portadas) */
  function initNet(canvasId, artId, cfg) {
    var canvas = document.getElementById(canvasId), art = document.getElementById(artId);
    var ctx = canvas.getContext('2d'), W = 1280, H = 720, raf = 0, running = false;
    var mouse = { x: W * 0.5, y: H * 0.5, on: false }, par = { x: 0, y: 0 };
    var cols = cfg.cols, syms = ['∑', '∫', 'π', '∇', 'λ', '∂', '√', '∞', 'σ', 'θ', 'Δ', '≈'];
    var nodes = [], glyphs = [], i;
    function rnd(a, b) { return a + Math.random() * (b - a); }
    for (i = 0; i < cfg.nodes; i++) nodes.push({ x: rnd(0, W), y: rnd(0, H), vx: rnd(-.32, .32), vy: rnd(-.32, .32), r: rnd(1.6, 3.6), c: cols[i % cols.length] });
    for (i = 0; i < 12; i++) glyphs.push({ s: syms[i], x: rnd(0, W), y: rnd(0, H), vy: -rnd(.12, .34), vx: rnd(-.08, .08), rot: rnd(-.6, .6), vr: rnd(-.003, .003), size: rnd(30, 74), a: rnd(cfg.glyphA[0], cfg.glyphA[1]) });
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect(), k = r.width / W;
      mouse.x = (e.clientX - r.left) / k; mouse.y = (e.clientY - r.top) / k; mouse.on = true;
    });
    stage.addEventListener('pointerleave', function () { mouse.on = false; });
    function frame() {
      ctx.clearRect(0, 0, W, H);
      var tx = mouse.on ? (mouse.x / W - .5) * 2 : 0, ty = mouse.on ? (mouse.y / H - .5) * 2 : 0;
      par.x += (tx - par.x) * .06; par.y += (ty - par.y) * .06;
      art.style.setProperty('--mx', par.x.toFixed(3)); art.style.setProperty('--my', par.y.toFixed(3));
      glyphs.forEach(function (g) {
        g.x += g.vx; g.y += g.vy; g.rot += g.vr;
        if (g.y < -90) { g.y = H + 90; g.x = rnd(0, W); }
        ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot);
        ctx.font = '700 ' + g.size + 'px Georgia, serif'; ctx.fillStyle = 'rgba(' + cfg.glyph + ',' + g.a + ')';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(g.s, 0, 0); ctx.restore();
      });
      var n = nodes.length, a, b, dx, dy, d;
      for (a = 0; a < n; a++) {
        var p = nodes[a];
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10 || p.x > W + 10) p.vx *= -1;
        if (p.y < -10 || p.y > H + 10) p.vy *= -1;
        if (mouse.on) {
          dx = mouse.x - p.x; dy = mouse.y - p.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < 190) {
            p.x += dx * .006; p.y += dy * .006;
            ctx.strokeStyle = 'rgba(' + p.c + ',' + ((1 - d / 190) * .6).toFixed(3) + ')'; ctx.lineWidth = 1.1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
        for (b = a + 1; b < n; b++) {
          var q = nodes[b]; dx = p.x - q.x; dy = p.y - q.y; d = dx * dx + dy * dy;
          if (d < 20000) {
            ctx.strokeStyle = 'rgba(' + p.c + ',' + ((1 - d / 20000) * cfg.lineA).toFixed(3) + ')'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      nodes.forEach(function (p) { ctx.fillStyle = 'rgba(' + p.c + ',.75)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill(); });
      if (running && !reduce) raf = requestAnimationFrame(frame);
    }
    return {
      start: function () { if (running) return; running = true; frame(); },
      stop: function () { running = false; cancelAnimationFrame(raf); }
    };
  }
  var netCfg = { nodes: 58, cols: ['0,169,244', '34,81,255', '169,196,245'], glyph: '255,255,255', glyphA: [.05, .11], lineA: .3 };
  var cover = initNet('cvNet', 'cvArt', netCfg);
  var section = initNet('scNet', 'scArt', { nodes: 44, cols: netCfg.cols, glyph: '255,255,255', glyphA: [.04, .09], lineA: .26 });

  /* ---------------------------------------------------------------- plataforma Health Tower Intelligence */
  var IDLE_HTML = '<div class="idle-ico" aria-hidden="true"><svg viewBox="0 0 76 76"><rect class="slot" x="42" y="42" width="26" height="26" rx="7"/><rect class="mA" x="8" y="8" width="26" height="26" rx="7"/><rect class="mB" x="42" y="8" width="26" height="26" rx="7"/><rect class="mC" x="8" y="42" width="26" height="26" rx="7"/><rect class="mD" x="42" y="42" width="26" height="26" rx="7"/></svg></div>' +
    '<div class="idle-body"><p class="idle-lead">Una <b class="k1">plataforma modular</b> que integra los <b class="k2">datos de la operación</b> (<span class="dm d1">inventario</span>, <span class="dm d2">logística</span>, <span class="dm d3">equipos y clínicas</span>) y los convierte en <b class="k3">decisiones</b> mediante <b class="k4">analítica, optimización e inteligencia artificial</b>.</p>' +
    '<p class="idle-dyn"><b class="tag">Es dinámica:</b> sus módulos se pueden <span class="op add"><i data-g="+" aria-hidden="true"></i>sumar</span>, <span class="op adj"><i data-g="&#8644;" aria-hidden="true"></i>ajustar</span> o <span class="op del"><i data-g="&minus;" aria-hidden="true"></i>retirar</span> conforme cambien las necesidades de Mius.</p>' +
    '<p class="idle-hint"><svg class="cur" viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M3 2l12 6.2-5.2 1.6L7.6 15z" fill="currentColor"/></svg>Pasa el cursor o toca un módulo para ver cómo se conecta</p></div>';
  var platform = HTI.mount(document.getElementById('dg-platform'), {
    view: 'arq', compact: true, plain: true, static: true, start: false, idleHTML: IDLE_HTML,
    // Sin hardware por ahora: se omiten red fría (IoT), visión en almacén (cámaras) y la fuente de sensores IoT
    omitProjects: ['P4', 'P7'], omitSources: ['S3'],
    rename: { D2: { name: 'Logística', sub: 'Almacén, rutas y entregas' }, E4: { name: 'PLN y modelos de lenguaje' } }
  });

  /* ---------------------------------------------------------------- ticket de venta: cada dato resalta su línea */
  (function () {
    var ticket = document.getElementById('ticket');
    if (!ticket) return;
    var lines = Array.prototype.slice.call(ticket.querySelectorAll('.tl[data-k]'));
    function set(keys, on) { lines.forEach(function (l) { l.classList.toggle('hl', on && keys.indexOf(l.getAttribute('data-k')) > -1); }); }
    Array.prototype.forEach.call(stage.querySelectorAll('.dim'), function (d) {
      var keys = d.getAttribute('data-hl').split(' ');
      function on() { set(keys, true); d.classList.add('on'); }
      function off() { set(keys, false); d.classList.remove('on'); }
      d.addEventListener('pointerenter', on); d.addEventListener('pointerleave', off);
      d.addEventListener('focus', on); d.addEventListener('blur', off);
    });
  })();

  /* ---------------------------------------------------------------- navegación */
  slides.forEach(function (s, i) {
    var b = document.createElement('button');
    b.innerHTML = '<em>' + String(i + 1).padStart(2, '0') + '</em><small>' + s.getAttribute('data-kicker') + '</small><b>' + s.getAttribute('data-title') + '</b>';
    b.addEventListener('click', function () { toggleOv(false); go(i); });
    ovg.appendChild(b);
  });
  function toggleOv(on) { ov.classList.toggle('open', on === undefined ? !ov.classList.contains('open') : on); }

  function go(i) {
    i = Math.max(0, Math.min(N - 1, i));
    if (i === cur) return;
    slides.forEach(function (s, k) { s.classList.toggle('active', k === i); s.classList.toggle('past', k < i); });
    cur = i;
    var s = slides[i], id = s.id;
    stage.setAttribute('data-sec', s.getAttribute('data-sec') || '0');
    pgn.innerHTML = '<b>' + String(i + 1).padStart(2, '0') + '</b> / ' + String(N).padStart(2, '0');
    prog.style.width = ((i + 1) / N * 100) + '%';
    cnt.textContent = (i + 1) + ' / ' + N;
    try { history.replaceState(null, '', '#' + (i + 1)); } catch (e) {}
    Array.prototype.forEach.call(s.querySelectorAll('[data-count]'), function (el) { if (STATIC) { el.textContent = fmt(el, parseFloat(el.getAttribute('data-count'))); } else { setTimeout(function () { countUp(el); }, 520); } });
    if (id === 'sl-cover') cover.start(); else cover.stop();
    if (id === 'sl-section') section.start(); else section.stop();
    if (id === 'sl-platform') { platform.redraw(); setTimeout(function () { platform.redraw(); }, 700); }
    Array.prototype.forEach.call(ovg.children, function (b, k) { b.classList.toggle('cur', k === i); });
  }

  function fs() {
    var d = document, el = d.documentElement;
    if (d.fullscreenElement) { d.exitFullscreen && d.exitFullscreen(); }
    else if (el.requestFullscreen) { el.requestFullscreen().catch(function () {}); }
  }
  document.getElementById('bPrev').onclick = function () { go(cur - 1); };
  document.getElementById('bNext').onclick = function () { go(cur + 1); };
  document.getElementById('bOv').onclick = function () { toggleOv(); };
  document.getElementById('bFs').onclick = fs;

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (k === 'Escape') { toggleOv(false); return; }
    if (ov.classList.contains('open')) return;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'Enter') { e.preventDefault(); go(cur + 1); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); go(cur - 1); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(N - 1);
    else if (k === 'f' || k === 'F') fs();
    else if (k === 'g' || k === 'G' || k === 'o' || k === 'O') toggleOv();
  });

  var tx = null;
  stage.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1));
  });
  var wheelLock = 0;
  window.addEventListener('wheel', function (e) {
    if (ov.classList.contains('open') || Math.abs(e.deltaY) < 40 || Date.now() < wheelLock) return;
    wheelLock = Date.now() + 700; go(cur + (e.deltaY > 0 ? 1 : -1));
  }, { passive: true });

  var idle;
  function wake() { ui.classList.remove('idle'); clearTimeout(idle); idle = setTimeout(function () { ui.classList.add('idle'); }, 2600); }
  ['mousemove', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, wake, { passive: true }); });
  wake();

  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', function () { var n = parseInt(location.hash.slice(1), 10); if (n) go(n - 1); });
  fit();
  var start = parseInt(location.hash.slice(1), 10);
  go(start ? start - 1 : 0);
})();
