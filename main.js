/* Verros Robotics marketing site: navigation, forms, and interactive features.
   Everything is vanilla JS. Heavy effects pause when offscreen and are skipped
   entirely when the visitor prefers reduced motion. */
(function () {
  'use strict';

  /* ---------- Configuration ----------
     Both forms POST JSON to a form backend (Formspree, Web3Forms, Basin, or your own endpoint).
     Set the endpoints below once you create the forms. Until then, submissions fall back to
     opening the visitor's email client with a prefilled message to CONTACT_EMAIL. */
  var CONFIG = Object.assign({
    CONTACT_EMAIL: 'tarun@verrosrobotics.com',
    QUOTE_ENDPOINT: '',   /* e.g. 'https://formspree.io/f/xxxxxxxx' */
    SIGNUP_ENDPOINT: ''   /* e.g. 'https://formspree.io/f/yyyyyyyy' */
  }, window.VERROS_CONFIG || {});
  window.VERROS_CONFIG = CONFIG;

  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(revealEls, function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    Array.prototype.forEach.call(revealEls, function (el) { io.observe(el); });
  }

  /* ---------- Scramble (decode) text reveal ---------- */
  var GLYPHS = '01<>/\\|=+-_[]{}#%&*ABCDEFGHJKLMNPQRSTUVWXYZ';
  function scramble(el) {
    if (reduceMotion || el.dataset.scrambled) return;
    el.dataset.scrambled = '1';
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.textContent = '';
    var spans = [];
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (word) {
          if (!word) return;
          if (/^\s+$/.test(word)) { el.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span');
          w.className = 'sc-w';
          word.split('').forEach(function (ch) {
            var sp = document.createElement('span');
            sp.className = 'sc';
            sp.textContent = ch;
            sp.dataset.ch = ch;
            w.appendChild(sp);
            spans.push(sp);
          });
          el.appendChild(w);
        });
      } else {
        el.appendChild(node.cloneNode(true));
      }
    });
    var start = null, duration = 900;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / duration);
      spans.forEach(function (sp, i) {
        var ch = sp.dataset.ch;
        if (ch === ' ') return;
        var settle = (i / spans.length) * 0.7 + 0.3;
        if (p >= settle) { sp.textContent = ch; sp.classList.remove('is-rand'); }
        else { sp.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]; sp.classList.add('is-rand'); }
      });
      if (p < 1) raf(frame); else spans.forEach(function (sp) { sp.textContent = sp.dataset.ch; sp.classList.remove('is-rand'); });
    }
    raf(frame);
  }
  var scrambleEls = document.querySelectorAll('[data-scramble]');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { scramble(e.target); sio.unobserve(e.target); } });
    }, { threshold: 0.3 });
    Array.prototype.forEach.call(scrambleEls, function (el) { sio.observe(el); });
  }

  /* ---------- Stat countdown: the zero backlash tile counts down to 0 ---------- */
  var zero = $('stat-zero');
  if (zero && !reduceMotion && 'IntersectionObserver' in window) {
    var zio = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      zio.disconnect();
      var start = null, from = 4.8, duration = 1400;
      function tick(ts) {
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - p, 3);
        var v = from * (1 - eased);
        zero.textContent = p < 1 ? v.toFixed(1) : '0';
        if (p < 1) raf(tick);
      }
      raf(tick);
    }, { threshold: 0.5 });
    zio.observe(zero);
  }

  /* ---------- Footer year and live San Francisco clock ---------- */
  var year = $('year');
  if (year) year.textContent = String(new Date().getFullYear());
  var clock = $('sf-clock');
  if (clock && window.Intl && Intl.DateTimeFormat) {
    var fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' });
    var tickClock = function () { clock.textContent = fmt.format(new Date()); };
    tickClock();
    setInterval(tickClock, 15000);
  }

  /* ---------- Mobile nav ---------- */
  var toggle = $('nav-toggle');
  var links = $('nav-links');
  function closeNav() {
    if (!links.classList.contains('is-open')) return;
    links.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('.nav-toggle-label').textContent = 'Menu';
  }
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.querySelector('.nav-toggle-label').textContent = open ? 'Close' : 'Menu';
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
  }

  /* ---------- Active section indicator in the nav ---------- */
  var navLinks = document.querySelectorAll('.nav-links a[data-nav]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var sections = Array.prototype.map.call(navLinks, function (a) { return $(a.dataset.nav); }).filter(Boolean);
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        Array.prototype.forEach.call(navLinks, function (a) { a.classList.toggle('is-active', a.dataset.nav === e.target.id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (s) { nio.observe(s); });
  }

  /* ---------- Scroll to section (offset for the floating nav) ---------- */
  function scrollToId(id, focusId) {
    var target = $(id);
    if (!target) return;
    var navHeight = (document.querySelector('.nav-wrap').offsetHeight || 0) + 8;
    var top = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
    window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    if (focusId) {
      var field = $(focusId);
      if (field) setTimeout(function () { field.focus({ preventScroll: true }); }, reduceMotion ? 0 : 450);
    }
  }
  var FOCUS_FOR = { contact: 'q-name', preorder: 'signup-email' };

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id || !$(id)) return;
    e.preventDefault();
    closeNav();
    var wantsFocus = a.hasAttribute('data-scroll');
    scrollToId(id, wantsFocus ? FOCUS_FOR[id] : null);
  });

  /* ---------- Cursor-tracking glow on cards ---------- */
  if (finePointer && !reduceMotion) {
    document.addEventListener('pointermove', function (e) {
      var el = e.target.closest('.card, .panel, .demo-dial');
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, { passive: true });
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduceMotion) {
    Array.prototype.forEach.call(document.querySelectorAll('.btn'), function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        btn.style.transform = 'translate(' + (dx * 6).toFixed(1) + 'px,' + (dy * 6).toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
    });
  }

  /* ---------- Hero point-cloud visual ----------
     An abstract cylindrical housing with end flanges and an output shaft, drawn as a
     rotating point cloud. Purely decorative: it does not depict the real product. */
  (function heroVisual() {
    var wrap = $('hero-visual');
    var canvas = $('hero-canvas');
    if (!wrap || !canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var pts = [];
    function ring(r, z, n, jitter) {
      for (var i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2 + (jitter ? Math.random() * 0.05 : 0);
        pts.push([Math.cos(a) * r, Math.sin(a) * r, z]);
      }
    }
    /* housing: radius 1, length 2.2 (z from -1.1 to 1.1) */
    for (var z = -1.1; z <= 1.1; z += 0.07) ring(1, z, 64, true);
    /* flanges at both ends */
    for (var rr = 1.02; rr <= 1.28; rr += 0.06) { ring(rr, -1.12, 72, true); ring(rr, 1.12, 72, true); }
    /* output shaft */
    for (var zs = 1.12; zs <= 1.75; zs += 0.07) ring(0.32, zs, 28, true);
    ring(0.32, 1.76, 28, false);
    for (var ri = 0.08; ri < 0.32; ri += 0.08) ring(ri, 1.76, 14, false);
    /* rear cap concentric rings */
    for (var rc = 0.15; rc < 1; rc += 0.17) ring(rc, -1.12, Math.round(rc * 40) + 8, false);

    var W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    function resize() {
      var r = wrap.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    var targetX = 0, targetY = 0, curX = 0, curY = 0, spin = 0, visible = true;
    if (finePointer) {
      wrap.addEventListener('pointermove', function (e) {
        var r = wrap.getBoundingClientRect();
        targetX = ((e.clientX - r.left) / r.width - 0.5) * 1.2;
        targetY = ((e.clientY - r.top) / r.height - 0.5) * 0.8;
        wrap.classList.add('is-touched');
      });
      wrap.addEventListener('pointerleave', function () { targetX = 0; targetY = 0; });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) raf(draw); }, { threshold: 0.01 }).observe(wrap);
    }

    var last = 0;
    function draw(ts) {
      if (!visible) return;
      var dt = Math.min(50, ts - last || 16); last = ts;
      if (!reduceMotion) spin += dt * 0.00025;
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;

      ctx.clearRect(0, 0, W, H);
      var scale = Math.min(W, H) * 0.34;
      var cx = W / 2, cy = H / 2;
      var ay = spin + curX * 0.9 + 0.6;   /* yaw: rotate around vertical axis */
      var ax = 0.35 + curY * 0.6;         /* pitch */
      var cosY = Math.cos(ay), sinY = Math.sin(ay), cosX = Math.cos(ax), sinX = Math.sin(ax);
      var proj = new Array(pts.length);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        /* the model's z axis (shaft) lies along world x so the housing reads sideways */
        var x = p[2], y = p[1], z = p[0];
        var x1 = x * cosY - z * sinY, z1 = x * sinY + z * cosY;
        var y1 = y * cosX - z1 * sinX, z2 = y * sinX + z1 * cosX;
        var persp = 1 / (1 + z2 * 0.22);
        proj[i] = [cx + x1 * scale * persp, cy + y1 * scale * persp, z2];
      }
      for (var j = 0; j < proj.length; j++) {
        var q = proj[j];
        var depth = (q[2] + 1.4) / 2.8;        /* 0 far, 1 near */
        var alpha = 0.18 + depth * 0.7;
        var size = 0.8 + depth * 1.6;
        ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(2) + ')';
        ctx.fillRect(q[0], q[1], size, size);
      }
      if (!reduceMotion || Math.abs(targetX - curX) > 0.001) raf(draw);
    }
    raf(draw);
  })();

  /* ---------- Backlash demo ----------
     Pure illustration of the backlash effect: the conventional output only moves once the
     input has crossed a dead band equal to the chosen backlash. The Verros output tracks the
     input exactly. Nothing here models or hints at any real mechanism. */
  (function backlashDemo() {
    var dial = $('dial-input');
    var trace = $('trace-canvas');
    if (!dial || !trace || !trace.getContext) return;

    function buildTicks(id) {
      var g = $(id); if (!g) return;
      var html = '';
      for (var i = 0; i < 60; i++) {
        var a = i / 60 * Math.PI * 2, major = i % 5 === 0;
        var r1 = major ? 80 : 86, r2 = 92;
        html += '<line class="' + (major ? 'major' : '') + '" x1="' + (100 + Math.sin(a) * r1).toFixed(1) + '" y1="' + (100 - Math.cos(a) * r1).toFixed(1) +
                '" x2="' + (100 + Math.sin(a) * r2).toFixed(1) + '" y2="' + (100 - Math.cos(a) * r2).toFixed(1) + '"/>';
      }
      g.innerHTML = html;
    }
    ['ticks-input', 'ticks-conv', 'ticks-verros'].forEach(buildTicks);

    var needleIn = $('needle-input'), knob = $('knob-input'), needleConv = $('needle-conv'), ghost = $('ghost-conv'),
        needleV = $('needle-verros'), deadband = $('deadband-conv'),
        readIn = $('read-input'), readConv = $('read-conv'), readV = $('read-verros'), errConv = $('err-conv'),
        slider = $('backlash'), sliderOut = $('backlash-out');

    var input = 0, conv = 0, backlash = parseFloat(slider.value), manual = false, lastManual = 0, t = 0;
    var history = [];
    var MAX_HISTORY = 420;

    function setNeedle(el, deg) { el.setAttribute('transform', 'rotate(' + deg.toFixed(2) + ' 100 100)'); }
    function arcPath(a0, a1, r) {
      var s = a0 * Math.PI / 180, e = a1 * Math.PI / 180;
      var x0 = 100 + Math.sin(s) * r, y0 = 100 - Math.cos(s) * r, x1 = 100 + Math.sin(e) * r, y1 = 100 - Math.cos(e) * r;
      return 'M100 100 L' + x0.toFixed(2) + ' ' + y0.toFixed(2) + ' A' + r + ' ' + r + ' 0 0 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' Z';
    }
    function step(dt) {
      if (!manual) {
        t += dt;
        /* a slow sweep with frequent reversals so the dead band shows up often */
        input = 70 * Math.sin(t * 0.9) + 25 * Math.sin(t * 2.3);
      } else if (performance.now() - lastManual > 4000) {
        manual = false;
        t = Math.asin(Math.max(-1, Math.min(1, input / 95))) / 0.9;
      }
      var half = backlash / 2;
      if (input > conv + half) conv = input - half;
      else if (input < conv - half) conv = input + half;

      setNeedle(needleIn, input);
      knob.setAttribute('transform', 'rotate(' + input.toFixed(2) + ' 100 100)');
      setNeedle(needleConv, conv);
      setNeedle(ghost, input);
      setNeedle(needleV, input);
      deadband.setAttribute('d', arcPath(conv - half, conv + half, 92));
      readIn.textContent = input.toFixed(1);
      readConv.textContent = conv.toFixed(1);
      readV.textContent = input.toFixed(1);
      errConv.textContent = Math.abs(input - conv).toFixed(1);
      dial.setAttribute('aria-valuenow', Math.round(input));
      dial.setAttribute('aria-valuetext', input.toFixed(0) + ' degrees');

      history.push([input, conv]);
      if (history.length > MAX_HISTORY) history.shift();
    }

    /* trace drawing */
    var tctx = trace.getContext('2d'), TW = 0, TH = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    function resizeTrace() {
      var r = trace.getBoundingClientRect();
      TW = Math.max(1, Math.round(r.width)); TH = 160;
      trace.width = TW * dpr; trace.height = TH * dpr;
      tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeTrace();
    window.addEventListener('resize', resizeTrace);
    function drawTrace() {
      tctx.clearRect(0, 0, TW, TH);
      tctx.strokeStyle = 'rgba(255,255,255,0.08)';
      tctx.lineWidth = 1;
      tctx.beginPath(); tctx.moveTo(0, TH / 2); tctx.lineTo(TW, TH / 2); tctx.stroke();
      var n = history.length; if (n < 2) return;
      var xs = TW / (MAX_HISTORY - 1);
      var x0 = TW - (n - 1) * xs;
      function yOf(deg) { return TH / 2 - (deg / 110) * (TH / 2 - 8); }
      function line(idx, style, width, dash) {
        tctx.strokeStyle = style; tctx.lineWidth = width; tctx.setLineDash(dash || []);
        tctx.beginPath();
        for (var i = 0; i < n; i++) { var x = x0 + i * xs, y = yOf(history[i][idx]); if (i === 0) tctx.moveTo(x, y); else tctx.lineTo(x, y); }
        tctx.stroke(); tctx.setLineDash([]);
      }
      /* shaded error band between input and conventional output */
      tctx.fillStyle = 'rgba(255,255,255,0.10)';
      tctx.beginPath();
      for (var i = 0; i < n; i++) tctx.lineTo(x0 + i * xs, yOf(history[i][0]));
      for (var k = n - 1; k >= 0; k--) tctx.lineTo(x0 + k * xs, yOf(history[k][1]));
      tctx.closePath(); tctx.fill();
      line(0, 'rgba(255,255,255,0.25)', 1);
      line(1, 'rgba(255,255,255,0.6)', 1.5, [4, 4]);
      line(0, '#ffffff', 2);
    }

    /* pointer control of the input dial */
    function angleFromEvent(e) {
      var r = dial.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      var deg = Math.atan2(dx, -dy) * 180 / Math.PI;
      return Math.max(-180, Math.min(180, deg));
    }
    var dragging = false;
    dial.addEventListener('pointerdown', function (e) { dragging = true; manual = true; lastManual = performance.now(); dial.setPointerCapture(e.pointerId); input = angleFromEvent(e); e.preventDefault(); });
    dial.addEventListener('pointermove', function (e) { if (!dragging) return; lastManual = performance.now(); input = angleFromEvent(e); });
    dial.addEventListener('pointerup', function () { dragging = false; lastManual = performance.now(); });
    dial.addEventListener('pointercancel', function () { dragging = false; });
    dial.addEventListener('keydown', function (e) {
      var d = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { input = Math.max(-180, input - d); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { input = Math.min(180, input + d); }
      else if (e.key === 'Home') { input = -180; }
      else if (e.key === 'End') { input = 180; }
      else return;
      manual = true; lastManual = performance.now(); e.preventDefault();
    });
    slider.addEventListener('input', function () { backlash = parseFloat(slider.value); sliderOut.textContent = backlash.toFixed(1); });

    var running = true, last = 0, section = $('demo');
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { running = en[0].isIntersecting; if (running) raf(loop); }, { threshold: 0.05 }).observe(section);
    }
    function loop(ts) {
      if (!running) return;
      var dt = Math.min(0.05, (ts - last || 16) / 1000); last = ts;
      step(reduceMotion && !manual ? 0 : dt);
      drawTrace();
      raf(loop);
    }
    if (reduceMotion) { input = 40; }
    raf(loop);
  })();

  /* ---------- Forms ---------- */
  function fieldsOf(form) {
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.name === '_gotcha') return;
      data[el.name] = el.value.trim();
    });
    return data;
  }

  function validate(form) {
    var firstBad = null;
    Array.prototype.forEach.call(form.querySelectorAll('[required]'), function (el) {
      var ok = el.value.trim() !== '' && (el.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok && !firstBad) firstBad = el;
    });
    return firstBad;
  }

  function postJSON(url, data) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (res) {
      if (!res.ok) throw new Error('Request failed with status ' + res.status);
      return res;
    });
  }

  function mailtoFallback(subject, data) {
    var lines = Object.keys(data).map(function (k) { return k + ': ' + data[k]; });
    var href = 'mailto:' + CONFIG.CONTACT_EMAIL +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lines.join('\n'));
    window.location.href = href;
  }

  function wireForm(opts) {
    var form = $(opts.formId);
    if (!form) return;
    var errorEl = $(opts.errorId);
    var successEl = $(opts.successId);
    var detailEl = $(opts.successDetailId);
    var button = form.querySelector('button[type="submit"]');
    var honeypot = form.querySelector('[name="_gotcha"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errorEl.textContent = '';

      if (honeypot && honeypot.value) return; /* bot filled the hidden field */

      var bad = validate(form);
      if (bad) {
        errorEl.textContent = bad.type === 'email' ? 'Please enter a valid email address.' : 'Please fill in every required field.';
        bad.focus();
        return;
      }

      var data = fieldsOf(form);
      data._subject = opts.subject;

      function showSuccess(detail) {
        form.hidden = true;
        if (detail) detailEl.textContent = detail;
        successEl.hidden = false;
        successEl.setAttribute('tabindex', '-1');
        successEl.focus({ preventScroll: true });
      }

      var endpoint = CONFIG[opts.endpointKey];
      if (!endpoint) {
        mailtoFallback(opts.subject, data);
        showSuccess('Your email app should open with the details prefilled. If it does not, email ' + CONFIG.CONTACT_EMAIL + ' directly.');
        return;
      }

      button.disabled = true;
      var label = button.textContent;
      button.textContent = 'Sending';
      postJSON(endpoint, data)
        .then(function () { showSuccess(null); })
        .catch(function () {
          errorEl.textContent = 'Something went wrong. Please email ' + CONFIG.CONTACT_EMAIL + ' directly.';
        })
        .then(function () { button.disabled = false; button.textContent = label; });
    });
  }

  wireForm({
    formId: 'quote-form', errorId: 'quote-error', successId: 'quote-success', successDetailId: 'quote-success-detail',
    endpointKey: 'QUOTE_ENDPOINT', subject: 'Quote request from verrosrobotics.com'
  });
  wireForm({
    formId: 'signup-form', errorId: 'signup-error', successId: 'signup-success', successDetailId: 'signup-success-detail',
    endpointKey: 'SIGNUP_ENDPOINT', subject: 'Preorder list signup from verrosrobotics.com'
  });
})();
