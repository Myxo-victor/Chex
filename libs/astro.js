/*!
 * astro.js V.1.0.0
 * @author Myxo victor
 *
 * A zero-dependency vanilla JS "orbital presentation engine": a closed
 * elliptical wheel of cards where one card at a time is brought to the
 * front, popped out, reveals its info, retracts, and the wheel advances
 * to the next card. Continues indefinitely; loops seamlessly.
 *
 * Public API (nothing else is exposed):
 *   const astro = new Astro({ parent, cards, popoutTime });
 *   astro.pause();
 *   astro.resume();
 *   astro.destroy();
 *
 */
(function (global) {
  'use strict';

  // ---------------------------------------------------------------------
  // Shared monotonic clock. Both Tween and PausableTimer use this so an
  // OS clock adjustment can never distort elapsed/remaining duration
  // math (performance.now() is monotonic; Date.now() is not).
  // ---------------------------------------------------------------------
  function now() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
  }

  // ---------------------------------------------------------------------
  // Easing
  // ---------------------------------------------------------------------
  var Easing = {
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    inCubic: function (t) { return t * t * t; },
    inOutCubic: function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
  };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  // ---------------------------------------------------------------------
  // Tween: a manual rAF-driven interpolation from 0 to 1 over `duration`
  // ms, pausable/resumable at its exact elapsed progress.
  //
  // duration <= 0 (reduced motion) is handled as an "instant" tween: the
  // final value is applied synchronously (so the DOM never shows a
  // half-animated frame), but completion is still deferred one tick, and
  // that deferral is itself pause/resume/cancel-able exactly like a real
  // tween. This is what makes zero-duration phases deterministic under
  // pause()/resume()/destroy(): calling pause() in the window between
  // start() and the deferred completion reliably prevents the state
  // machine from advancing, and cancel() reliably prevents it forever.
  // ---------------------------------------------------------------------
  function Tween(duration, onUpdate, onComplete) {
    this.duration = Math.max(0, duration);
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    this.elapsed = 0;
    this.running = false;
    this.done = false;
    this.cancelled = false;
    this.rafId = null;
    this.deferredId = null;
    this.pendingInstantComplete = false;
    this.lastTime = null;
    this._tick = this._tick.bind(this);
  }

  Tween.prototype.start = function () {
    if (this.done || this.cancelled) return;
    if (this.duration <= 0) {
      this.elapsed = this.duration;
      this.onUpdate(1);
      this._scheduleInstantComplete();
      return;
    }
    this.running = true;
    this.lastTime = now();
    this.rafId = requestAnimationFrame(this._tick);
  };

  // The deferred completion is modeled as "running" so pause() can
  // intercept it before it fires.
  Tween.prototype._scheduleInstantComplete = function () {
    var self = this;
    this.running = true;
    this.deferredId = setTimeout(function () {
      self.deferredId = null;
      if (self.cancelled) return;
      self.running = false;
      self.done = true;
      self.onComplete && self.onComplete();
    }, 0);
  };

  Tween.prototype._tick = function () {
    if (!this.running) return;
    var t = now();
    var dt = t - this.lastTime;
    this.lastTime = t;
    this.elapsed = Math.min(this.duration, this.elapsed + dt);
    var progress = this.duration > 0 ? this.elapsed / this.duration : 1;
    this.onUpdate(progress);
    if (this.elapsed >= this.duration) {
      this.running = false;
      this.done = true;
      this.onComplete && this.onComplete();
      return;
    }
    this.rafId = requestAnimationFrame(this._tick);
  };

  Tween.prototype.pause = function () {
    if (!this.running) return;
    this.running = false;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.deferredId != null) {
      clearTimeout(this.deferredId);
      this.deferredId = null;
      this.pendingInstantComplete = true;
    }
  };

  Tween.prototype.resume = function () {
    if (this.running || this.done || this.cancelled) return;
    if (this.pendingInstantComplete) {
      this.pendingInstantComplete = false;
      this._scheduleInstantComplete();
      return;
    }
    this.running = true;
    this.lastTime = now();
    this.rafId = requestAnimationFrame(this._tick);
  };

  Tween.prototype.cancel = function () {
    this.cancelled = true;
    this.running = false;
    this.pendingInstantComplete = false;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.deferredId != null) {
      clearTimeout(this.deferredId);
      this.deferredId = null;
    }
  };

  // ---------------------------------------------------------------------
  // PausableTimer: setTimeout wrapper for the HOLD phase. Pause/resume
  // preserve exact remaining time using the same monotonic clock as
  // Tween. start()/resume() are idempotent by contract: calling either
  // while already running, done, or cancelled is a guaranteed no-op, so
  // no caller can ever produce two competing timeout callbacks.
  // ---------------------------------------------------------------------
  function PausableTimer(duration, onComplete) {
    this.remaining = Math.max(0, duration);
    this.onComplete = onComplete;
    this.running = false;
    this.done = false;
    this.cancelled = false;
    this.timeoutId = null;
    this.startedAt = null;
  }

  PausableTimer.prototype.start = function () {
    if (this.running || this.done || this.cancelled) return;
    this._schedule(this.remaining);
  };

  PausableTimer.prototype._schedule = function (ms) {
    var self = this;
    this.running = true;
    this.startedAt = now();
    this.timeoutId = setTimeout(function () {
      self.timeoutId = null;
      if (self.cancelled) return;
      self.running = false;
      self.done = true;
      self.onComplete && self.onComplete();
    }, ms);
  };

  PausableTimer.prototype.pause = function () {
    if (!this.running) return;
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
    var elapsed = now() - this.startedAt;
    this.remaining = Math.max(0, this.remaining - elapsed);
    this.running = false;
  };

  PausableTimer.prototype.resume = function () {
    if (this.running || this.done || this.cancelled) return;
    this._schedule(this.remaining);
  };

  PausableTimer.prototype.cancel = function () {
    this.cancelled = true;
    if (this.timeoutId != null) clearTimeout(this.timeoutId);
    this.timeoutId = null;
    this.running = false;
  };

  // ---------------------------------------------------------------------
  // Injected stylesheet (once per page). All *computed* geometry is set
  // via inline styles per-instance; this stylesheet only defines the
  // static structural/cosmetic rules, so the developer never writes CSS.
  // No CSS variables or developer-facing hooks are exposed in v1.
  // ---------------------------------------------------------------------
  var STYLE_ID = 'astro-js-styles';
  function ensureStylesInjected() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '.astro-wheel{position:relative;width:100%;height:100%;overflow:visible;}' +
      '.astro-card{position:absolute;top:0;left:0;will-change:transform,opacity;' +
      'transform-origin:center center;}' +
      '.astro-card__inner{position:relative;width:100%;height:100%;border-radius:10px;' +
      'overflow:hidden;background:#1a1a1a;box-shadow:0 8px 24px rgba(0,0,0,.35);}' +
      '.astro-card__image{width:100%;height:100%;object-fit:cover;display:block;' +
      'user-select:none;-webkit-user-drag:none;}' +
      '.astro-card__overlay{position:absolute;inset:0;background:rgba(0,0,0,.6);' +
      'display:flex;flex-direction:column;justify-content:flex-end;' +
      'padding:12% 10%;box-sizing:border-box;color:#fff;pointer-events:none;' +
      'opacity:0;}' +
      '.astro-card__name{font:600 1em/0.9 ;margin:0 0 .3em;}' +
      '.astro-card__desc{font-family:"Outfit",sans-serif;font-weight:400;line-height:.8;' +
      'margin:0;opacity:.85;}';
    document.head.appendChild(style);
  }

  // Internal-only animation timing constants (not developer-configurable).
  var POP_DURATION = 450;
  var ROTATE_DURATION = 700;

  function getMatchMedia() {
    return (typeof window !== 'undefined' && window.matchMedia)
      ? window.matchMedia.bind(window)
      : null;
  }

  // =======================================================================
  // Astro
  // =======================================================================
  function Astro(options) {
    if (!options || typeof options !== 'object') {
      throw new Error('Astro: an options object is required.');
    }
    var parentEl = typeof options.parent === 'string'
      ? document.querySelector(options.parent)
      : options.parent;
    if (!parentEl || !(parentEl instanceof Element)) {
      throw new Error('Astro: "parent" must be a valid selector or element.');
    }
    if (!Array.isArray(options.cards) || options.cards.length === 0) {
      throw new Error('Astro: "cards" must be a non-empty array.');
    }

    this.container = parentEl;
    this.cards = options.cards.slice();
    this.n = this.cards.length;
    this.popoutTime = (typeof options.popoutTime === 'number' && options.popoutTime >= 0)
      ? options.popoutTime
      : 5000;

    this._destroyed = false;
    this._ready = false;
    this._paused = false;
    this._pendingStart = false;
    this._generation = 0;

    this._currentIndex = 0;
    this._accumulatedRotation = 0;

    // Explicitly-maintained "last authoritative paint state". Only the
    // state machine (never resize) writes these. Resize reads them to
    // repaint at the correct geometry without ever touching lifecycle
    // progress — see _paint() vs the resize handler below.
    this._currentRotation = 0;
    this._currentPopProgress = 0;

    this._phase = 'init'; // 'init' | 'popout' | 'hold' | 'retract' | 'rotate'
    this._activeTween = null;
    this._holdTimer = null;

    var mm = getMatchMedia();
    this._reducedMotion = !!(mm && mm('(prefers-reduced-motion: reduce)').matches);
    this._mq = mm ? mm('(prefers-reduced-motion: reduce)') : null;
    var self = this;
    this._onMqChange = function (e) { self._reducedMotion = e.matches; };
    if (this._mq) {
      if (this._mq.addEventListener) this._mq.addEventListener('change', this._onMqChange);
      else if (this._mq.addListener) this._mq.addListener(this._onMqChange); // older Safari
    }

    this._resizeObserver = null;
    this._resizePending = false;

    ensureStylesInjected();
    this._buildDom();

    var gen = this._generation;
    this._preloadImages().then(function () {
      if (self._destroyed || gen !== self._generation) return; // destroyed during preload
      self._computeGeometry();
      self._paint(0, 0); // settle: currentIndex 0, no pop, no rotation
      self._ready = true;
      self._observeResize();
      if (self._paused) {
        self._pendingStart = true;
      } else {
        self._startCycle();
      }
    });
  }

  // -- DOM construction ---------------------------------------------------

  Astro.prototype._buildDom = function () {
    var wheel = document.createElement('div');
    wheel.className = 'astro-wheel';

    var cardEls = [];
    for (var i = 0; i < this.n; i++) {
      var data = this.cards[i] || {};
      var card = document.createElement('div');
      card.className = 'astro-card';

      var inner = document.createElement('div');
      inner.className = 'astro-card__inner';

      var img = document.createElement('img');
      img.className = 'astro-card__image';
      img.alt = data.name || '';
      if (data.image) img.src = data.image;
      img.addEventListener('error', function () {
        this.style.visibility = 'hidden';
      });

      var overlay = document.createElement('div');
      overlay.className = 'astro-card__overlay';

      var nameEl = document.createElement('p');
      nameEl.className = 'astro-card__name';
      nameEl.textContent = data.name || '';

      var descEl = document.createElement('p');
      descEl.className = 'astro-card__desc';
      descEl.textContent = data.description || '';

      overlay.appendChild(nameEl);
      overlay.appendChild(descEl);
      inner.appendChild(img);
      inner.appendChild(overlay);
      card.appendChild(inner);
      wheel.appendChild(card);

      cardEls.push({ root: card, overlay: overlay });
    }

    this.container.appendChild(wheel);
    this._wheelEl = wheel;
    this._cardEls = cardEls;
  };

  Astro.prototype._preloadImages = function () {
    var srcs = this.cards.map(function (c) { return c && c.image; });
    return Promise.all(srcs.map(function (src) {
      return new Promise(function (resolve) {
        if (!src) return resolve();
        var img = new Image();
        img.onload = function () { resolve(); };
        img.onerror = function () { resolve(); }; // a bad image must never block startup
        img.src = src;
      });
    }));
  };

  // -- Geometry -------------------------------------------------------------

  Astro.prototype._computeGeometry = function () {
    var rect = this.container.getBoundingClientRect();
    var width = rect.width || 0;
    var height = rect.height || 0;
    if (width === 0) width = 400;
    if (height === 0) height = 400; // container has no intrinsic height; fall back

    this._width = width;
    this._height = height;
    this._cx = width / 2;
    this._cy = height / 2;

    if (width <= 600) {
  this._cardWidth = clamp(width * 0.32, 100, 150);
  this._cardHeight = this._cardWidth * 1.18;

  this._rx = clamp(width * 0.23, 65, 135);
  this._ry = clamp(height * 0.14, 55, 105);

  this._minScale = 0.70;
  this._maxScale = 1.0;
  this._minOpacity = 0.48;

  this._popScale = 1.18;
  this._popOffsetY = this._cardHeight * 0.12;

  this._titleSize = clamp(this._cardWidth * 0.075, 9, 12);
  this._descriptionSize = clamp(this._cardWidth * 0.055, 7, 9);

  return;
}

this._cardWidth = clamp(width * 0.16, 110, 220);
this._cardHeight = this._cardWidth * 1.30;

this._rx = Math.max(width * 0.32, this._cardWidth * 0.55);
this._rx = Math.max(this._rx, width * 0.43);

this._ry = Math.max(height * 0.22, this._cardHeight * 0.38);
this._ry = Math.max(this._ry, height * 0.38);

this._minScale = 0.55;
this._maxScale = 1.0;
this._minOpacity = 0.35;

this._popScale = 1.45;
this._popOffsetY = this._cardHeight * 0.45;

this._titleSize = clamp(this._cardWidth * 0.095, 13, 20);
this._descriptionSize = clamp(this._cardWidth * 0.05, 9, 12);
    // Orbit radii scale with container size, but never collapse below a
    // fraction of the card's own size — otherwise, on very narrow
    // containers, cards would stack almost fully on top of one another.
    // This keeps narrow containers *degenerate but stable*: cards may
    // still overlap and extend past the container edges, but the layout
    // never divides by zero or produces NaN, and some separation between
    // slots is always preserved.
    this._rx = Math.max(width * 0.32, this._cardWidth * 0.4);
    this._ry = Math.max(height * 0.22, this._cardHeight * 0.3);

    this._minScale = 0.55;
    this._maxScale = 1.0;
    this._minOpacity = 0.35;

    // Pop-out enlargement/offset. Chosen so the focus card grows clearly
    // beyond the max in-orbit scale (1.0) without dominating the whole
    // wheel, and so it extends toward the viewer past the container edge
    // (intentional — see the "overflow: visible" note) without routinely
    // leaving the page. These are internal constants, not developer
    // configuration; the numbers were checked against representative
    // container sizes (see the accompanying notes) rather than eyeballed
    // in a live renderer.
    this._popScale = 1.45;
    this._popOffsetY = this._cardHeight * 0.45;
  };

  Astro.prototype._observeResize = function () {
    if (typeof ResizeObserver === 'undefined') return;
    var self = this;
    this._resizeObserver = new ResizeObserver(function () {
      if (self._destroyed) return;
      if (self._resizePending) return;
      self._resizePending = true;
      requestAnimationFrame(function () {
        self._resizePending = false;
        if (self._destroyed) return;
        self._computeGeometry();
        // Resize changes geometry only. It repaints using whatever
        // rotation/pop-progress the state machine last recorded via
        // _paint(); it never reads from an in-flight tween directly and
        // never writes _currentRotation/_currentPopProgress itself, so
        // it structurally cannot perturb lifecycle progress.
        self._render(self._currentRotation, self._currentPopProgress);
      });
    });
    this._resizeObserver.observe(this.container);
  };

  // -- Rendering --------------------------------------------------------

  // Pure function: computes and applies transform/opacity/z-index for
  // every card from the given rotation (degrees, possibly mid-tween) and
  // popProgress (0..1, applied only to the current focus card). Has no
  // side effects on `this` beyond writing to the DOM.
  Astro.prototype._render = function (rotation, popProgress) {
    var step = 360 / this.n;
    for (var i = 0; i < this.n; i++) {
      var angleDeg = step * i + rotation;
      var rad = (angleDeg * Math.PI) / 180;
      var depth = (1 + Math.cos(rad)) / 2; // 1 = front (bottom-center), 0 = back (top-center)

      var baseX = this._cx + this._rx * Math.sin(rad);
      var baseY = this._cy + this._ry * Math.cos(rad);
      var baseScale = lerp(this._minScale, this._maxScale, depth);
      var baseOpacity = lerp(this._minOpacity, 1, depth);
      var baseZ = Math.round(depth * 1000) + i;

      var x = baseX, y = baseY, scale = baseScale, opacity = baseOpacity, z = baseZ;
      var overlayOpacity = 0;

      if (i === this._currentIndex && popProgress > 0) {
        x = lerp(baseX, this._cx, popProgress);
        y = lerp(baseY, this._cy + this._ry + this._popOffsetY, popProgress);
        scale = lerp(baseScale, this._popScale, popProgress);
        opacity = lerp(baseOpacity, 1, popProgress);
        z = 9999;
        overlayOpacity = popProgress;
      }

      var el = this._cardEls[i];
      el.root.style.width = this._cardWidth + 'px';
      el.root.style.height = this._cardHeight + 'px';
      el.root.style.transform =
        'translate(' + (x - this._cardWidth / 2) + 'px,' + (y - this._cardHeight / 2) + 'px) scale(' + scale + ')';
      el.root.style.opacity = opacity;
      el.root.style.zIndex = z;
      el.root.querySelector('.astro-card__desc').style.fontSize = this._descriptionSize + 'px';
      el.overlay.style.opacity = overlayOpacity;
    }
  };

  // The ONLY path by which _currentRotation/_currentPopProgress change.
  // Called exclusively from state-machine code (never from resize).
  Astro.prototype._paint = function (rotation, popProgress) {
    this._currentRotation = rotation;
    this._currentPopProgress = popProgress;
    this._render(rotation, popProgress);
  };

  // -- State machine ------------------------------------------------------
  //
  // Transition audit (every completion callback below follows the same
  // shape): check generation/destroyed -> null the finishing primitive ->
  // create the next primitive. Because the check happens first, a stale
  // callback from a cancelled/destroyed primitive can never reach the
  // "null + create next" step, so exactly one primitive is ever alive.

  Astro.prototype._startCycle = function () {
    if (this._destroyed) return;
    this._phase = 'popout';
    this._runPopout();
  };

  Astro.prototype._runPopout = function () {
    var self = this;
    var gen = this._generation;
    var duration = this._reducedMotion ? 0 : POP_DURATION;
    this._activeTween = new Tween(duration, function (t) {
      self._paint(self._accumulatedRotation, Easing.outCubic(t));
    }, function () {
      // POPOUT -> HOLD
      if (self._destroyed || gen !== self._generation) return;
      self._activeTween = null;
      self._enterHold();
    });
    this._activeTween.start();
  };

  Astro.prototype._enterHold = function () {
    var self = this;
    var gen = this._generation;
    this._phase = 'hold';
    this._paint(this._accumulatedRotation, 1);
    this._holdTimer = new PausableTimer(this.popoutTime, function () {
      // HOLD -> RETRACT
      if (self._destroyed || gen !== self._generation) return;
      self._holdTimer = null;
      self._runRetract();
    });
    this._holdTimer.start();
  };

  Astro.prototype._runRetract = function () {
    var self = this;
    var gen = this._generation;
    this._phase = 'retract';
    var duration = this._reducedMotion ? 0 : POP_DURATION;
    this._activeTween = new Tween(duration, function (t) {
      self._paint(self._accumulatedRotation, 1 - Easing.inCubic(t));
    }, function () {
      // RETRACT -> ROTATE (n > 1) or RETRACT -> POPOUT (n === 1)
      if (self._destroyed || gen !== self._generation) return;
      self._activeTween = null;
      if (self.n === 1) {
        self._startCycle();
      } else {
        self._runRotate();
      }
    });
    this._activeTween.start();
  };

  Astro.prototype._runRotate = function () {
    var self = this;
    var gen = this._generation;
    this._phase = 'rotate';
    var step = 360 / this.n;
    var fromRot = this._accumulatedRotation;
    var toRot = fromRot - step; // continuous — never reset/wrapped
    var duration = this._reducedMotion ? 0 : ROTATE_DURATION;

    this._activeTween = new Tween(duration, function (t) {
      var eased = Easing.inOutCubic(t);
      self._paint(lerp(fromRot, toRot, eased), 0);
    }, function () {
      // ROTATE -> POPOUT
      if (self._destroyed || gen !== self._generation) return;
      self._accumulatedRotation = toRot;
      self._currentIndex = (self._currentIndex + 1) % self.n;
      self._activeTween = null;
      self._paint(self._accumulatedRotation, 0);
      self._startCycle();
    });
    this._activeTween.start();
  };

  // -- Public lifecycle API ------------------------------------------------

  Astro.prototype.pause = function () {
    if (this._destroyed || this._paused) return;
    this._paused = true;
    if (!this._ready) return; // preload still in flight; _pendingStart stays false, so it won't autostart
    if (this._activeTween) this._activeTween.pause();
    if (this._holdTimer) this._holdTimer.pause();
  };

  Astro.prototype.resume = function () {
    if (this._destroyed || !this._paused) return;
    this._paused = false;
    if (this._pendingStart) {
      this._pendingStart = false;
      this._startCycle();
      return;
    }
    if (this._activeTween) this._activeTween.resume();
    if (this._holdTimer) this._holdTimer.resume();
  };

  Astro.prototype.destroy = function () {
    if (this._destroyed) return;
    this._destroyed = true;
    this._generation++; // invalidates every previously-scheduled callback

    if (this._activeTween) this._activeTween.cancel();
    this._activeTween = null;
    if (this._holdTimer) this._holdTimer.cancel();
    this._holdTimer = null;

    if (this._resizeObserver) this._resizeObserver.disconnect();
    this._resizeObserver = null;

    if (this._mq) {
      if (this._mq.removeEventListener) this._mq.removeEventListener('change', this._onMqChange);
      else if (this._mq.removeListener) this._mq.removeListener(this._onMqChange);
    }

    if (this._wheelEl && this._wheelEl.parentNode) {
      this._wheelEl.parentNode.removeChild(this._wheelEl);
    }
    this._wheelEl = null;
    this._cardEls = null;
  };

  global.Astro = Astro;
})(typeof window !== 'undefined' ? window : this);



/*
--------------------
How to use
--------------------
*/
/*
 const astro = new Astro({
      parent: '#astro-stage',

      cards: [
        {
          image: './images/card-1.jpg',
          name: 'Card One',
          description: 'This is the first card.'
        },
        {
          image: './images/card-2.jpg',
          name: 'Card Two',
          description: 'This is the second card.'
        },
        {
          image: './images/card-3.jpg',
          name: 'Card Three',
          description: 'This is the third card.'
        },
        {
          image: './images/card-4.jpg',
          name: 'Card Four',
          description: 'This is the fourth card.'
        },
        {
          image: './images/card-5.jpg',
          name: 'Card Five',
          description: 'This is the fifth card.'
        }
      ],

      popoutTime: 1000
    });

    */
