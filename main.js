/* Verros Robotics marketing site: navigation, smooth scroll, and form handling. */
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

  /* ---------- Footer year ---------- */
  var year = $('year');
  if (year) year.textContent = String(new Date().getFullYear());

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

  /* ---------- Scroll to section (offset for the sticky nav) ---------- */
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
        errorEl.textContent = bad.type === 'email' ? "That email doesn't look right." : "Looks like a few fields are still empty.";
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
        showSuccess("Your email app should pop open with everything filled in. If it doesn't, just email " + CONFIG.CONTACT_EMAIL + ".");
        return;
      }

      button.disabled = true;
      var label = button.textContent;
      button.textContent = 'Sending';
      postJSON(endpoint, data)
        .then(function () { showSuccess(null); })
        .catch(function () {
          errorEl.textContent = "Hmm, that didn't go through. Email " + CONFIG.CONTACT_EMAIL + " and we'll sort it out.";
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
