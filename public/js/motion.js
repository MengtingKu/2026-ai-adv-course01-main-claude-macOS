(function () {
  'use strict';

  // Opt-in to motion CSS hidden states
  document.documentElement.classList.add('motion-ready');

  // ── 1. Hero entrance — staggered translateY reveals ─────────────────────
  function heroEntrance() {
    document.querySelectorAll('[data-hero-item]').forEach(function (el) {
      var delay = parseInt(el.dataset.heroDelay || 0, 10);
      setTimeout(function () {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 80 + delay);
    });
  }

  // ── 2. Scroll reveal (static elements) ──────────────────────────────────
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var delay = parseInt(e.target.dataset.revealDelay || 0, 10);
      setTimeout(function () { e.target.classList.add('is-visible'); }, delay);
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

  function setupReveal() {
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      if (!el._rObs) { el._rObs = true; revealIO.observe(el); }
    });
  }

  // ── 3. Stagger grids (works with Vue-rendered children) ─────────────────
  var staggerIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      activateStagger(e.target);
      staggerIO.unobserve(e.target);
    });
  }, { threshold: 0.04, rootMargin: '0px 0px -30px 0px' });

  function activateStagger(container) {
    var step = parseInt(container.dataset.staggerStep || 80, 10);

    function applyChild(child, idx) {
      if (child._sApplied) return;
      child._sApplied = true;
      child.style.animationDelay = (idx * step) + 'ms';
      child.classList.add('reveal-child');
    }

    Array.from(container.children).forEach(applyChild);

    // Watch for Vue async-rendered children added after activation
    new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          var idx = Array.from(container.children).indexOf(node);
          applyChild(node, idx >= 0 ? idx : 0);
        });
      });
    }).observe(container, { childList: true });
  }

  function setupStagger() {
    document.querySelectorAll('[data-stagger]').forEach(function (el) {
      if (!el._sObs) { el._sObs = true; staggerIO.observe(el); }
    });
  }

  // ── 4. Gold divider scale-from-left ────────────────────────────────────
  var dividerIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        dividerIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });

  function setupDividers() {
    document.querySelectorAll('[data-divider]').forEach(function (el) {
      if (!el._dObs) { el._dObs = true; dividerIO.observe(el); }
    });
  }

  // ── 5. Nav — deepen on scroll ────────────────────────────────────────────
  function initNav() {
    var header = document.querySelector('header');
    if (!header) return;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          header.classList.toggle('nav-scrolled', window.scrollY > 60);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ── 6. Hero parallax ────────────────────────────────────────────────────
  function initParallax() {
    var img = document.querySelector('[data-parallax]');
    if (!img) return;
    // Pre-scale ensures no white edges during translateY travel
    img.style.transform = 'scale(1.1)';
    var vh = window.innerHeight;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          var y = window.scrollY;
          if (y < vh) img.style.transform = 'scale(1.1) translateY(' + (y * 0.24) + 'px)';
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ── 7. Scroll indicator — fade on scroll, click to products ────────────
  function initScrollIndicator() {
    var el = document.querySelector('[data-scroll-indicator]');
    if (!el) return;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          el.style.opacity = window.scrollY > 80 ? '0' : '1';
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
    el.addEventListener('click', function () {
      var target = document.querySelector('#products');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // ── Re-scan for late-mounted elements (Vue async) ────────────────────────
  function rescan() {
    setupReveal();
    setupStagger();
    setupDividers();
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    heroEntrance();
    initNav();
    initParallax();
    initScrollIndicator();
    rescan();
    // Second pass after Vue mounts and API products load
    setTimeout(rescan, 700);
  });
})();
