/*
 * ellura motion runtime.
 * Port of the reference site's shared animation layer (ellura-v2): GSAP defaults,
 * Lenis smooth scroll, declarative reveals (data-split / data-fade / data-stagger /
 * data-img / data-arch / data-count), magnetic buttons and ScrollTrigger refreshes.
 * Loaded deferred after gsap, ScrollTrigger, SplitText and Lenis (snippets/gsap-init.liquid).
 * Section scripts read window.elluraMotion for shared media queries and intro timing.
 */
(function () {
  if (window.elluraMotion) return;

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var SplitText = window.SplitText;
  var root = document.documentElement;

  if (!gsap || !ScrollTrigger) {
    root.classList.remove('motion-pending');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  if (SplitText) gsap.registerPlugin(SplitText);
  gsap.defaults({ ease: 'power3.out', duration: 1 });
  ScrollTrigger.config({ ignoreMobileResize: true });

  var media = {
    desktop: '(min-width: 901px) and (prefers-reduced-motion: no-preference)',
    motion: '(prefers-reduced-motion: no-preference)',
    reduce: '(prefers-reduced-motion: reduce)',
  };

  function reduced() {
    return window.matchMedia(media.reduce).matches;
  }

  function touch() {
    return window.matchMedia('(hover: none), (pointer: coarse)').matches;
  }

  /* First intro on the page starts at 0.15s, later ones at 0.25s; calls within 400ms share a value. */
  var firstIntro = true;
  var introCache = { at: -Infinity, value: 0 };
  function introDelay() {
    var now = performance.now();
    if (now - introCache.at < 400) return introCache.value;
    var value = 0.25;
    if (firstIntro) {
      firstIntro = false;
      value = 0.15;
    }
    introCache = { at: now, value: value };
    return value;
  }

  /* ---- Smooth scroll ---- */
  var lenis = null;
  var lockCount = 0;

  function startLenis() {
    if (lenis || reduced() || typeof window.Lenis !== 'function') return;
    if (window.Shopify && window.Shopify.designMode) return;

    lenis = new window.Lenis({
      duration: 1.1,
      easing: function (t) {
        return 1 - Math.pow(1 - t, 4);
      },
      smoothWheel: true,
      anchors: { offset: -110, duration: 1.2 },
      allowNestedScroll: true,
      prevent: function (node) {
        return !!(node.closest && node.closest('dialog, [data-lenis-prevent]'));
      },
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) {
      if (lenis) lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  /* Overlays (mobile menu) stop page scrolling while open; nested locks are counted. */
  function lockScroll(locked) {
    lockCount = Math.max(0, lockCount + (locked ? 1 : -1));
    var isLocked = lockCount > 0;
    if (lenis) {
      if (isLocked) lenis.stop();
      else lenis.start();
    }
    root.style.overflow = isLocked ? 'hidden' : '';
  }

  /* ---- Declarative reveals ---- */
  function reveal(scope) {
    if (!scope || reduced()) return null;
    if (scope._elluraReveal) scope._elluraReveal.revert();

    var delayBase = introDelay();
    function extraDelay(el) {
      return parseFloat(el.dataset.delay || '0');
    }
    function all(selector) {
      return Array.prototype.slice.call(scope.querySelectorAll(selector));
    }

    var ctx = gsap.context(function () {
      all('[data-split]').forEach(function (el) {
        var onLoad = el.dataset.split === 'load';
        if (!SplitText) {
          gsap.fromTo(el, { opacity: 0, y: 28 }, {
            opacity: 1,
            y: 0,
            duration: 1.05,
            delay: (onLoad ? delayBase : 0) + extraDelay(el),
            scrollTrigger: onLoad ? undefined : { trigger: el, start: 'top 88%', once: true },
          });
          return;
        }
        SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          linesClass: 'split-line',
          onSplit: function (self) {
            el.classList.add('is-split');
            return gsap.from(self.lines, {
              yPercent: 110,
              duration: onLoad ? 1.3 : 1.15,
              ease: 'expo.out',
              stagger: 0.09,
              delay: (onLoad ? delayBase : 0) + extraDelay(el),
              scrollTrigger: onLoad ? undefined : { trigger: el, start: 'top 88%', once: true },
            });
          },
        });
      });

      all('[data-fade]').forEach(function (el) {
        var onLoad = el.dataset.fade === 'load';
        gsap.fromTo(el, { opacity: 0, y: 28 }, {
          opacity: 1,
          y: 0,
          duration: 1.05,
          ease: 'power3.out',
          delay: (onLoad ? delayBase + 0.3 : 0) + extraDelay(el),
          scrollTrigger: onLoad ? undefined : { trigger: el, start: 'top 90%', once: true },
        });
      });

      all('[data-stagger]').forEach(function (el) {
        if (!el.children.length) return;
        var onLoad = el.dataset.stagger === 'load';
        gsap.fromTo(el.children, { opacity: 0, y: 30 }, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          stagger: 0.08,
          delay: (onLoad ? delayBase + 0.35 : 0) + extraDelay(el),
          scrollTrigger: onLoad ? undefined : { trigger: el, start: 'top 88%', once: true },
        });
      });

      all('[data-img], [data-arch]').forEach(function (el) {
        var media = el.querySelector('img, video');
        var isArch = el.hasAttribute('data-arch');
        var onLoad = el.dataset.img === 'load' || el.dataset.arch === 'load';
        var tl = gsap.timeline({
          delay: (onLoad ? delayBase + 0.1 : 0) + extraDelay(el),
          scrollTrigger: onLoad ? undefined : { trigger: el, start: 'top 86%', once: true },
        });
        if (isArch) {
          tl.fromTo(el,
            { clipPath: 'inset(100% 0% 0% 0% round 50% 50% 0 0)' },
            { clipPath: 'inset(0% 0% 0% 0% round 50% 50% 0 0)', duration: 1.5, ease: 'expo.out' }
          );
        } else {
          tl.fromTo(el,
            { clipPath: 'inset(100% 0% 0% 0%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.35, ease: 'expo.out' }
          );
        }
        if (media) tl.fromTo(media, { scale: 1.22 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0);
        tl.set(el, { clearProps: 'clipPath' });
      });

      all('[data-parallax]').forEach(function (el) {
        var distance = parseFloat(el.dataset.parallax || '10');
        gsap.fromTo(el, { yPercent: -distance }, {
          yPercent: distance,
          ease: 'none',
          scrollTrigger: { trigger: el.parentElement || el, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });

      all('[data-draw]').forEach(function (el) {
        if (typeof el.getTotalLength !== 'function') return;
        var length = el.getTotalLength();
        gsap.fromTo(el, { strokeDasharray: length, strokeDashoffset: length }, {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: { trigger: el.closest('[data-draw-trigger]') || el, start: 'top 80%', end: 'bottom 40%', scrub: 0.6 },
        });
      });

      all('[data-pac-chart]').forEach(function (chart) {
        var q = function (s) { return chart.querySelectorAll(s); };
        gsap.timeline({ scrollTrigger: { trigger: chart, start: 'top 75%', once: true } })
          .fromTo(q('.chart__gridline'), { scaleX: 0 }, { scaleX: 1, duration: 0.9, stagger: 0.08, ease: 'power3.inOut', transformOrigin: 'left' })
          .fromTo(q('.chart__bar--ellura'), { scaleY: 0 }, { scaleY: 1, duration: 1.4, ease: 'expo.out', transformOrigin: 'bottom' }, 0.3)
          .fromTo(q('.chart__bar--other'), { scaleY: 0 }, { scaleY: 1, duration: 1.1, ease: 'expo.out', transformOrigin: 'bottom' }, 0.55)
          .fromTo(q('.chart__bar--pomace'), { scaleY: 0 }, { scaleY: 1, duration: 1, ease: 'expo.out', transformOrigin: 'bottom' }, 0.7)
          .fromTo(q('.chart__txt'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.6 }, 0.9)
          .fromTo(q('.chart__capsule'), { opacity: 0, rotate: -40, y: -30 }, { opacity: 1, rotate: -28, y: 0, duration: 1, ease: 'back.out(1.6)' }, 1);
      });

      all('[data-count]').forEach(function (el) {
        var raw = String(el.dataset.count || '').trim();
        if (!/^\d+(\.\d+)?$/.test(raw)) return;
        var target = parseFloat(raw);
        var decimals = parseInt(el.dataset.decimals || String((raw.split('.')[1] || '').length), 10);
        var counter = { v: 0 };
        el.textContent = (0).toFixed(decimals);
        gsap.to(counter, {
          v: target,
          duration: 1.8,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          onUpdate: function () {
            el.textContent = counter.v.toFixed(decimals);
          },
        });
      });
    }, scope);

    scope._elluraReveal = ctx;
    return ctx;
  }

  /* ---- Magnetic buttons ---- */
  function initMagnetic() {
    if (reduced() || touch()) return;
    document.addEventListener('pointermove', function (event) {
      var el = event.target && event.target.closest ? event.target.closest('[data-magnetic]') : null;
      if (!el) return;
      var rect = el.getBoundingClientRect();
      gsap.to(el, {
        x: (event.clientX - (rect.left + rect.width / 2)) * 0.2,
        y: (event.clientY - (rect.top + rect.height / 2)) * 0.3,
        duration: 0.5,
        ease: 'power3.out',
        overwrite: true,
      });
    });
    document.addEventListener('pointerout', function (event) {
      var el = event.target && event.target.closest ? event.target.closest('[data-magnetic]') : null;
      if (!el || el.contains(event.relatedTarget)) return;
      gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.45)', overwrite: true });
    });
  }

  /* ---- Accordions: [data-acc] containers holding .acc items (reference Lf component) ---- */
  function setAccordion(item, open, animate) {
    var btn = item.querySelector('.acc__btn');
    var panel = item.querySelector('.acc__panel');
    if (!btn || !panel) return;
    item.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    gsap.killTweensOf(panel);
    /* Only user toggles change layout after load; initial setup must not refresh per item. */
    var duration = animate && !reduced() ? 0.55 : 0;
    if (open) {
      panel.removeAttribute('inert');
      panel.style.visibility = 'visible';
      if (!animate) {
        gsap.set(panel, { height: 'auto' });
        return;
      }
      gsap.fromTo(panel, { height: panel.offsetHeight }, { height: 'auto', duration: duration, ease: 'power3.inOut', onComplete: refresh });
    } else {
      panel.setAttribute('inert', '');
      if (!animate) {
        gsap.set(panel, { height: 0 });
        panel.style.visibility = 'hidden';
        return;
      }
      gsap.to(panel, {
        height: 0,
        duration: duration,
        ease: 'power3.inOut',
        onComplete: function () {
          panel.style.visibility = 'hidden';
          refresh();
        },
      });
    }
  }

  function initAccordions(scope) {
    (scope || document).querySelectorAll('[data-acc] .acc').forEach(function (item) {
      if (item._accReady) return;
      item._accReady = true;
      var open = item.classList.contains('is-open') || (location.hash && item.id && '#' + item.id === location.hash);
      setAccordion(item, open, false);
    });
  }

  document.addEventListener('click', function (event) {
    var btn = event.target.closest ? event.target.closest('[data-acc] .acc__btn') : null;
    if (!btn) return;
    var item = btn.closest('.acc');
    setAccordion(item, !item.classList.contains('is-open'), true);
  });

  function refresh() {
    ScrollTrigger.refresh();
  }

  /* ---- Theme editor: rebuild reveals for re-rendered sections ---- */
  function killTriggersIn(el) {
    ScrollTrigger.getAll().forEach(function (trigger) {
      if (trigger.trigger && el.contains(trigger.trigger)) trigger.kill();
    });
  }

  document.addEventListener('shopify:section:unload', function (event) {
    var section = event.target;
    if (section._elluraReveal) section._elluraReveal.revert();
    killTriggersIn(section);
  });

  document.addEventListener('shopify:section:load', function (event) {
    initAccordions(event.target);
    reveal(event.target);
    refresh();
  });

  window.elluraMotion = {
    media: media,
    reduced: reduced,
    touch: touch,
    introDelay: introDelay,
    reveal: reveal,
    setAccordion: setAccordion,
    initAccordions: initAccordions,
    lockScroll: lockScroll,
    refresh: refresh,
    get lenis() {
      return lenis;
    },
  };

  /*
   * Section scripts register their DOMContentLoaded handlers while the page parses,
   * so they run before this one: pinned sections exist before reveal triggers are created.
   */
  function init() {
    initAccordions(document);
    startLenis();
    document.querySelectorAll('.shopify-section').forEach(reveal);
    initMagnetic();
    root.classList.remove('motion-pending');
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    window.addEventListener('load', refresh);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
