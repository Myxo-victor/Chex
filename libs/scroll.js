/**
 * @file scrollHeader.js
 * @version 1.3.0
 * @author Myxo Victor
 * @license MIT
 * @description Pure, zero-dependency vanilla JS behavior library for scroll-reactive website headers.
 *              Maintains TOP / SCROLLED state machine via passive window scroll + rAF. Developer owns all CSS styling.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ScrollHeader = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULTS = {
    header: '#site-header',
    logo: '#site-logo',
    threshold: 50,
    topLogo: null,
    scrolledLogo: null,
    scrolledClass: 'is-scrolled',
    dataAttribute: 'data-scroll-header',

    // Lifecycle Callbacks
    onStateChange: null
  };

  /**
   * ScrollHeader Constructor
   * @param {Object} options Configuration object
   */
  function ScrollHeader(options) {
    this.opts = Object.assign({}, DEFAULTS, options || {});

    // Threshold Normalization (evaluated once during construction)
    var threshold = Number(this.opts.threshold);
    if (!Number.isFinite(threshold)) {
      threshold = DEFAULTS.threshold;
    }
    this.opts.threshold = Math.max(0, threshold);

    this._state = null; // 'TOP' | 'SCROLLED'
    this._headerEl = null;
    this._logoEl = null;
    this._scrollHandler = null;
    this._rafId = null;
    this._initialLogoSrc = null;
    this._preloadedTopLogo = null;
    this._preloadedScrolledLogo = null;
    this._isDestroyed = false;

    this.init();
  }

  /**
   * Static helper initializer
   */
  ScrollHeader.init = function (options) {
    return new ScrollHeader(options);
  };

  /**
   * Initialize or re-initialize instance
   */
  ScrollHeader.prototype.init = function () {
    this._isDestroyed = false;

    // Resolve Header Element
    if (typeof this.opts.header === 'string') {
      this._headerEl = document.querySelector(this.opts.header);
    } else if (this.opts.header && this.opts.header.nodeType === 1) {
      this._headerEl = this.opts.header;
    }

    if (!this._headerEl) {
      console.warn('[ScrollHeader] Target header element not found:', this.opts.header);
      return this;
    }

    // Resolve Logo Element
    if (typeof this.opts.logo === 'string') {
      this._logoEl = document.querySelector(this.opts.logo);
    } else if (this.opts.logo && this.opts.logo.nodeType === 1) {
      this._logoEl = this.opts.logo;
    }

    // Preserve initial logo src for clean restoration on destroy
    if (this._logoEl && this._logoEl.tagName === 'IMG') {
      this._initialLogoSrc = this._logoEl.getAttribute('src') || '';
    }

    // Preload Logo Assets if provided
    if (this.opts.topLogo) {
      this._preloadedTopLogo = new Image();
      this._preloadedTopLogo.src = this.opts.topLogo;
    }
    if (this.opts.scrolledLogo) {
      this._preloadedScrolledLogo = new Image();
      this._preloadedScrolledLogo.src = this.opts.scrolledLogo;
    }

    var self = this;
    this._scrollHandler = function () {
      if (self._isDestroyed) return;
      if (self._rafId === null) {
        self._rafId = window.requestAnimationFrame(function () {
          self._rafId = null;
          if (self._isDestroyed) return;
          self._evaluateScrollPosition();
        });
      }
    };

    window.addEventListener('scroll', this._scrollHandler, { passive: true });

    // Synchronize initial state synchronously on boot
    this.refresh();

    return this;
  };

  /**
   * Read scroll Y coordinate and evaluate state transition
   */
  ScrollHeader.prototype._evaluateScrollPosition = function () {
    var currentY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    
    // Clamp negative values from elastic iOS overscroll bounce
    currentY = Math.max(0, currentY);

    var newState = currentY >= this.opts.threshold ? 'SCROLLED' : 'TOP';
    this._updateState(newState);
  };

  /**
   * State Machine Update Guard
   * Prevents unnecessary DOM mutations if state has not changed
   * @param {string} newState ('TOP' | 'SCROLLED')
   */
  ScrollHeader.prototype._updateState = function (newState) {
    if (this._state === newState || !this._headerEl) {
      return; // Exit early: State unchanged
    }

    this._state = newState;
    var isScrolled = newState === 'SCROLLED';

    // 1. Toggle CSS Class
    if (this.opts.scrolledClass) {
      this._headerEl.classList.toggle(this.opts.scrolledClass, isScrolled);
    }

    // 2. Toggle Data Attribute
    if (this.opts.dataAttribute) {
      this._headerEl.setAttribute(this.opts.dataAttribute, isScrolled ? 'scrolled' : 'top');
    }

    // 3. Swap Logo Image Source according to explicit 4-part matrix
    if (this._logoEl && this._logoEl.tagName === 'IMG') {
      var targetLogo = this._determineTargetLogo(isScrolled);
      if (targetLogo !== null) {
        this._logoEl.setAttribute('src', targetLogo);
      }
    }

    // 4. Trigger Callback
    if (typeof this.opts.onStateChange === 'function') {
      this.opts.onStateChange({
        state: this._state,
        isScrolled: isScrolled,
        threshold: this.opts.threshold,
        header: this._headerEl
      });
    }
  };

  /**
   * Evaluates explicit logo matrix rules:
   * - No topLogo, No scrolledLogo -> original / original
   * - scrolledLogo only          -> original / scrolledLogo
   * - topLogo only               -> topLogo / topLogo
   * - Both topLogo & scrolledLogo -> topLogo / scrolledLogo
   * @param {boolean} isScrolled
   * @returns {string} Target logo URL
   */
  ScrollHeader.prototype._determineTargetLogo = function (isScrolled) {
    var topLogo = this.opts.topLogo;
    var scrolledLogo = this.opts.scrolledLogo;

    if (isScrolled) {
      if (scrolledLogo) return scrolledLogo;
      if (topLogo) return topLogo;
      return this._initialLogoSrc;
    } else {
      if (topLogo) return topLogo;
      return this._initialLogoSrc;
    }
  };

  /**
   * Recalculate scroll threshold and evaluate current position
   */
  ScrollHeader.prototype.refresh = function () {
    this._evaluateScrollPosition();
  };

  /**
   * Get current state string ('TOP' | 'SCROLLED')
   */
  ScrollHeader.prototype.getState = function () {
    return this._state;
  };

  /**
   * Destroy instance, cancel frame callbacks, and restore pristine DOM state
   */
  ScrollHeader.prototype.destroy = function () {
    if (this._isDestroyed) return;
    this._isDestroyed = true;

    // Cancel pending animation frame schedule
    if (this._rafId !== null) {
      window.cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    // Unbind passive window scroll listener
    if (this._scrollHandler) {
      window.removeEventListener('scroll', this._scrollHandler);
      this._scrollHandler = null;
    }

    // Clean up DOM classes and attributes
    if (this._headerEl) {
      if (this.opts.scrolledClass) {
        this._headerEl.classList.remove(this.opts.scrolledClass);
      }
      if (this.opts.dataAttribute) {
        this._headerEl.removeAttribute(this.opts.dataAttribute);
      }
    }

    // Restore original logo src
    if (this._logoEl && this._initialLogoSrc !== null) {
      this._logoEl.setAttribute('src', this._initialLogoSrc);
    }

    this._state = null;
  };

  return ScrollHeader;
}));




/*
How to use this library

const header = ScrollHeader.init({
  header: '#site-header',      // CSS Selector or DOM Element
  logo: '#site-logo',          // CSS Selector or DOM Element (optional)
  threshold: 50,               // Scroll distance in px before state switch
  topLogo: '/logo-light.svg',   // Logo image URL for top state (optional)
  scrolledLogo: '/logo-dark.svg',// Logo image URL for scrolled state (optional)
  scrolledClass: 'is-scrolled',// Class toggled on target header
  dataAttribute: 'data-scroll-header', // Attribute toggled on header ('top' | 'scrolled')
  onStateChange: (data) => {   // Optional state lifecycle callback
    console.log('Current State:', data.state); // 'TOP' or 'SCROLLED'
  }
});
*/
