/**
 * triD.js v3.1.0 — Zero-dependency vanilla JavaScript inside-out 3D ring carousel.
 * @author: Myxo Victor
 *
 */

'use strict';

const TRID_VERSION = '3.1.0';

/* --- Design constants. Named for what they mean; all are ratios, not magic
   screen-space numbers, and each is consumed by exactly one derivation. --- */
const CARD_ASPECT = 1.38;              // card height / card width
const CARD_HEIGHT_FRACTION = 0.82;     // of container height, before vertical fit
const NARROW_CONTAINER_PX = 560;       // container-width breakpoint (not viewport)
const CARD_WIDTH_FRACTION_NARROW = 0.52;
const CARD_WIDTH_FRACTION_WIDE = 0.30;
const RADIUS_FACTOR_NARROW = 0.50;     // radius as a fraction of container width
const RADIUS_FACTOR_WIDE = 0.58;       // larger => shallower arc, narrower FOV
const DEFAULT_BORDER_RADIUS = '1.25rem';
const MIN_RADIUS_TO_CARD_WIDTH = 2.0;  // keeps theta_crit ≥ 63.4°
const CARD_GAP_RATIO = 0.16;           // tangential gap, as a fraction of card width
const MIN_CARD_WIDTH_PX = 44;          // floor before the ring grows instead of shrinking
const VERTICAL_SAFE_FRACTION = 0.96;   // of container height, for the guarded card
const CULL_SAFETY = 0.85;              // cullAngle ≤ CULL_SAFETY · theta_crit
const WRAP_MARGIN = 1.04;              // pushes the ring wrap just past cullAngle
const FADE_BAND = 0.45;                // fraction of the exit band spent fading
const LAYOUT_SOLVE_ITERATIONS = 4;     // fixed-point passes for the vertical fit
const TRID_MAX_FRAME_MS = 100;         // dt clamp after tab suspension
const TWO_PI = Math.PI * 2;
const RAD_TO_DEG = 180 / Math.PI;

/* --------------------------------- math ---------------------------------- */

/** Mathematical modulo: result always in [0, m) for any finite n. */
function tridMod(n, m) {
    return ((n % m) + m) % m;
}

/** Angular footprint of a tangential length `size` at distance `radius`. Exact. */
function tridAngularSize(size, radius) {
    return 2 * Math.atan(size / (2 * radius));
}

/**
 * Projection factor of a card's NEAR edge at angle theta.
 * Edge point: x = R·sin + u·cos, z = R(1−cos) + u·sin with u = +W/2, so
 * P − z = R·cos(theta) − (W/2)·sin(theta) and factor = R / (P − z).
 * This is the worst-case magnification of the card's height.
 */
function tridNearEdgeFactor(theta, width, radius) {
    const denom = Math.cos(theta) - (width / (2 * radius)) * Math.sin(theta);
    return denom > 1e-6 ? 1 / denom : Infinity;
}

function tridClamp(value, min, max) {
    return value < min ? min : (value > max ? max : value);
}

/* ------------------------------ the library ------------------------------ */

class TriDCarousel {

    constructor() {
        this.config = null;
        this.parentEl = null;
        this.stageEl = null;
        this.images = [];

        /** Continuous ring offset, invariant: 0 <= position < images.length. */
        this.position = 0;
        this.isDestroyed = false;
        this.isPaused = false;

        this.layout = null;

        // Lifecycle restoration state
        this.createdStage = false;
        this.originalHasContainerClass = false;
        this.originalContainerCssText = '';
        this.originalImageStyles = new Map();

        // Animation state
        this._rafId = null;
        this._lastTs = null;
        this._boundTick = (ts) => this._tick(ts);

        // Observers / listeners
        this._resizeObserver = null;
        this._boundWindowResize = null;
        this._boundVisibility = null;
        this._layoutRafId = null;
        this._lastMeasuredWidth = -1;
        this._lastMeasuredHeight = -1;

        // Per-image write cache, so the frame path only touches changed props
        this._frameCache = [];

        this._injectStyles();
    }

    /* ---------------------------- configuration --------------------------- */

    _injectStyles() {
        if (document.getElementById('trid-js-styles')) return;
        const style = document.createElement('style');
        style.id = 'trid-js-styles';
        style.textContent = `
            .trid-container {
                position: relative;
                width: 100%;
                min-height: 380px;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                box-sizing: border-box;
            }
            .trid-stage {
                position: relative;
                width: 100%;
                height: 100%;
                min-height: 340px;
                display: flex;
                align-items: center;
                justify-content: center;
                transform-style: preserve-3d;
            }
            .trid-item {
                position: absolute;
                left: 50%;
                top: 50%;
                box-sizing: border-box;
                object-fit: cover;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);
                user-select: none;
                -webkit-user-drag: none;
                pointer-events: none;
                /* Motion is written every frame; a CSS transition here would
                   fight the rAF loop and destroy frame-rate independence. */
                transition: none;
                will-change: transform, opacity;
                backface-visibility: hidden;
                transform-origin: center center;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Validates the user config and resolves DOM references. Throws on every
     * invalid input — a carousel that silently renders nothing is worse in
     * production than one that fails loudly at the call site.
     */
    _validate(userConfig) {
        if (!userConfig || typeof userConfig !== 'object') {
            throw new TypeError("triD.js: roll() requires a configuration object.");
        }

        const { parent, images, speed, direction, width, height, borderRadius } = userConfig;

        if (typeof parent !== 'string' || parent.trim() === '') {
            throw new TypeError("triD.js: 'parent' must be a non-empty selector string.");
        }
        const parentEl = document.querySelector(parent);
        if (!parentEl) {
            throw new Error(`triD.js: no element matches parent selector '${parent}'.`);
        }

        if (!Array.isArray(images) || images.length === 0) {
            throw new TypeError("triD.js: 'images' must be a non-empty array of selectors.");
        }
        if (new Set(images).size !== images.length) {
            throw new Error("triD.js: duplicate image selectors are not allowed.");
        }

        let resolvedSpeed = 1400;
        if (speed !== undefined) {
            if (typeof speed !== 'number' || !Number.isFinite(speed) || speed <= 0) {
                throw new TypeError("triD.js: 'speed' must be a positive finite number (ms per card).");
            }
            resolvedSpeed = speed;
        }

        let resolvedDirection = 1;
        if (direction !== undefined) {
            if (direction !== 1 && direction !== -1) {
                throw new TypeError("triD.js: 'direction' must be exactly 1 or -1.");
            }
            resolvedDirection = direction;
        }

        // width/height are an optional fixed card size in CSS pixels. When set,
        // layout skips the aspect-derived sizing and uses these directly (still
        // subject to the ring-capacity shrink so cards can't self-overlap).
        let resolvedWidth = null;
        if (width !== undefined) {
            if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) {
                throw new TypeError("triD.js: 'width' must be a positive finite number (px).");
            }
            resolvedWidth = width;
        }
        let resolvedHeight = null;
        if (height !== undefined) {
            if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0) {
                throw new TypeError("triD.js: 'height' must be a positive finite number (px).");
            }
            resolvedHeight = height;
        }

        let resolvedBorderRadius = DEFAULT_BORDER_RADIUS;
        if (borderRadius !== undefined) {
            if (typeof borderRadius !== 'string' && typeof borderRadius !== 'number') {
                throw new TypeError("triD.js: 'borderRadius' must be a CSS length string or a number (px).");
            }
            resolvedBorderRadius = typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius;
        }

        const existingStage = parentEl.querySelector('.trid-stage');
        const resolvedImages = images.map((selector) => {
            if (typeof selector !== 'string' || selector.trim() === '') {
                throw new TypeError("triD.js: every entry in 'images' must be a non-empty selector string.");
            }
            const imgEl = document.querySelector(selector);
            if (!imgEl) {
                throw new Error(`triD.js: no element matches image selector '${selector}'.`);
            }
            if (imgEl.tagName !== 'IMG') {
                throw new TypeError(`triD.js: image selector '${selector}' must resolve to an <img> element.`);
            }
            const inParent = parentEl.contains(imgEl) || (existingStage && existingStage.contains(imgEl));
            if (!inParent) {
                throw new Error(`triD.js: image '${selector}' is not inside the parent container.`);
            }
            return imgEl;
        });

        return {
            parentEl,
            images: resolvedImages,
            config: {
                parent, images: images.slice(),
                speed: resolvedSpeed, direction: resolvedDirection,
                fixedWidth: resolvedWidth, fixedHeight: resolvedHeight,
                borderRadius: resolvedBorderRadius
            }
        };
    }

    /* ------------------------------ lifecycle ----------------------------- */

    /**
     * roll({ parent, images, speed, direction })
     *   speed     — ms of drift per card advance (default 1400)
     *   direction — 1 (default) or -1
     * Idempotent with respect to the container: any live instance on that
     * parent (including this one) is destroyed first, so repeated roll() calls
     * cannot stack listeners, stages or rAF loops.
     */
    roll(userConfig) {
        const { parentEl, images, config } = this._validate(userConfig);

        if (this.parentEl && this.parentEl !== parentEl) {
            this.destroy();
        }
        const live = parentEl._tridInstance;
        if (live && live !== this && typeof live.destroy === 'function') {
            live.destroy();
        }
        if (this.parentEl === parentEl && !this.isDestroyed) {
            this.destroy();
        }

        this.config = config;
        this.parentEl = parentEl;
        this.images = images;
        this.position = 0;
        this.isDestroyed = false;
        this.isPaused = false;
        this.layout = null;
        this._lastMeasuredWidth = -1;
        this._lastMeasuredHeight = -1;
        this._frameCache = images.map(() => ({ transform: '', opacity: '', visible: null }));

        parentEl._tridInstance = this;

        this.originalContainerCssText = parentEl.style.cssText;
        this.originalHasContainerClass = parentEl.classList.contains('trid-container');
        if (!this.originalHasContainerClass) {
            parentEl.classList.add('trid-container');
        }

        // Reuse an existing stage if one is already in the DOM, so a
        // destroy()/roll() cycle does not churn the element tree.
        let stage = parentEl.querySelector('.trid-stage');
        if (!stage) {
            stage = document.createElement('div');
            stage.className = 'trid-stage';
            while (parentEl.firstChild) stage.appendChild(parentEl.firstChild);
            parentEl.appendChild(stage);
            this.createdStage = true;
        } else {
            this.createdStage = false;
        }
        this.stageEl = stage;

        this.originalImageStyles.clear();
        this.images.forEach((img) => {
            this.originalImageStyles.set(img, { cssText: img.style.cssText, className: img.className });
            img.classList.add('trid-item');
        });

        this._attachObservers();
        this._computeLayout();
        this._applyFrame();
        this._startLoop();

        return this;
    }

    _attachObservers() {
        // A library cannot assume its container resizes only with the window:
        // flex reflow, sidebar toggles and parent animations all change the
        // container size without firing a window resize event.
        if (typeof ResizeObserver === 'function') {
            this._resizeObserver = new ResizeObserver(() => this._scheduleLayout());
            this._resizeObserver.observe(this.parentEl);
        } else {
            this._boundWindowResize = () => this._scheduleLayout();
            window.addEventListener('resize', this._boundWindowResize);
        }

        this._boundVisibility = () => {
            if (document.hidden) {
                this._stopLoop();
            } else if (!this.isDestroyed && !this.isPaused) {
                this._startLoop();
            }
        };
        document.addEventListener('visibilitychange', this._boundVisibility);
    }

    /** Coalesces observer bursts into one layout per frame; no thrashing. */
    _scheduleLayout() {
        if (this.isDestroyed || this._layoutRafId !== null) return;
        this._layoutRafId = requestAnimationFrame(() => {
            this._layoutRafId = null;
            if (this.isDestroyed) return;
            if (this._computeLayout()) this._applyFrame();
        });
    }

    /* ------------------------------- layout ------------------------------- */

    /**
     * Resolves card size, radius, angular pitch, cull and fade angles.
     * Runs at init and on container resize only — never per frame.
     * Returns false when the container has no measurable box (display:none) or
     * when nothing changed; the observer will call back when it does.
     *
     * The loop is a 4-pass fixed point on a single scalar (card height), not a
     * search: each pass applies the vertical-containment bound and re-derives.
     * It converges because shrinking the card shrinks its own magnification.
     */
    _computeLayout() {
        if (!this.stageEl || !this.parentEl) return false;

        const containerWidth = this.stageEl.clientWidth || this.parentEl.clientWidth || 0;
        const containerHeight = this.stageEl.clientHeight || this.parentEl.clientHeight || 0;
        if (containerWidth < 1 || containerHeight < 1) return false;

        if (containerWidth === this._lastMeasuredWidth &&
            containerHeight === this._lastMeasuredHeight &&
            this.layout) {
            return false; // nothing changed; skip the work and the writes
        }
        this._lastMeasuredWidth = containerWidth;
        this._lastMeasuredHeight = containerHeight;

        const total = this.images.length;
        const narrow = containerWidth < NARROW_CONTAINER_PX;
        const widthFraction = narrow ? CARD_WIDTH_FRACTION_NARROW : CARD_WIDTH_FRACTION_WIDE;
        const radiusFactor = narrow ? RADIUS_FACTOR_NARROW : RADIUS_FACTOR_WIDE;
        const halfContainerWidth = containerWidth * 0.5;
        const maxStep = TWO_PI / total;

        const fixedW = this.config.fixedWidth;
        const fixedH = this.config.fixedHeight;
        const hasFixedSize = fixedW !== null || fixedH !== null;
        const aspect = (fixedW !== null && fixedH !== null) ? (fixedH / fixedW) : CARD_ASPECT;

        let height, width;
        if (hasFixedSize) {
            // Explicit size overrides the aspect-derived default entirely.
            // It still passes through the same fixed-point loop below, so it
            // is still subject to the ring-capacity and vertical-fit bounds —
            // an explicit size can shrink to avoid overlap, never grow past it.
            width = fixedW !== null ? fixedW : fixedH / aspect;
            height = fixedH !== null ? fixedH : fixedW * aspect;
        } else {
            height = containerHeight * CARD_HEIGHT_FRACTION;
            width = height / CARD_ASPECT;
            if (width > containerWidth * widthFraction) {
                width = containerWidth * widthFraction;
                height = width * CARD_ASPECT;
            }
        }

        let radius = 0, cardAngle = 0, angleStep = 0, halfFov = 0, cullAngle = 0;

        for (let pass = 0; pass < LAYOUT_SOLVE_ITERATIONS; pass++) {
            radius = Math.max(containerWidth * radiusFactor, width * MIN_RADIUS_TO_CARD_WIDTH);

            // Ring capacity: the footprint of all cards plus gaps must fit in 2π,
            // or two cards would occupy the same angular sector. atan(x) < x, so
            // sizing with the small-angle form is conservative: the exact step
            // computed below is always ≤ maxStep.
            const capacityWidth = (maxStep * radius) / (1 + CARD_GAP_RATIO);
            if (width > capacityWidth) {
                width = capacityWidth;
                height = width * aspect;
                if (width < MIN_CARD_WIDTH_PX) {
                    // Policy for very large collections: stop shrinking the card
                    // and grow the ring instead. The arc flattens and the field
                    // of view narrows, which is graceful; sub-44px cards are not.
                    width = MIN_CARD_WIDTH_PX;
                    height = width * aspect;
                    radius = Math.max(radius, (total * width * (1 + CARD_GAP_RATIO)) / TWO_PI);
                }
            }

            cardAngle = tridAngularSize(width, radius);
            const gapAngle = tridAngularSize(width * CARD_GAP_RATIO, radius);
            halfFov = Math.atan(halfContainerWidth / radius);

            // A card is gone once its trailing edge clears the frame edge.
            cullAngle = halfFov + cardAngle * 0.5;
            // Never render near the eye-plane singularity at atan(2R/W).
            cullAngle = Math.min(cullAngle, CULL_SAFETY * Math.atan((2 * radius) / width));

            // angleStep ∈ [wrap-safe lower bound, ring-capacity upper bound].
            const minStep = Math.min((2 * cullAngle * WRAP_MARGIN) / total, maxStep);
            angleStep = tridClamp(cardAngle + gapAngle, minStep, maxStep);

            // Vertical containment, guaranteed for the guarded card: the widest
            // theta at which a card is still substantially on screen.
            const guardAngle = Math.min(angleStep, halfFov);
            const factor = tridNearEdgeFactor(guardAngle, width, radius);
            const maxHeight = (containerHeight * VERTICAL_SAFE_FRACTION) / factor;
            if (height <= maxHeight + 0.5) break;
            height = maxHeight;
            width = height / aspect;
        }

        const exitStart = Math.max(0, halfFov - cardAngle * 0.5);
        const fadeStart = exitStart + (1 - FADE_BAND) * (cullAngle - exitStart);

        this.layout = {
            width, height, radius, angleStep, cardAngle,
            halfFov, cullAngle, fadeStart,
            fadeSpan: Math.max(1e-6, cullAngle - fadeStart)
        };

        // perspective === radius is the interior-view invariant.
        this.parentEl.style.perspective = `${radius.toFixed(2)}px`;

        // perspective-origin is measured on the container's border box, while
        // cards are centred on the stage. If the container is padded or
        // bordered those two centres differ, which would shear the whole ring.
        const parentRect = this.parentEl.getBoundingClientRect();
        const stageRect = this.stageEl.getBoundingClientRect();
        const originX = (stageRect.left - parentRect.left) + stageRect.width * 0.5;
        const originY = (stageRect.top - parentRect.top) + stageRect.height * 0.5;
        this.parentEl.style.perspectiveOrigin = `${originX.toFixed(2)}px ${originY.toFixed(2)}px`;

        const widthPx = `${width.toFixed(2)}px`;
        const heightPx = `${height.toFixed(2)}px`;
        const borderRadius = this.config.borderRadius;
        this.images.forEach((img) => {
            img.style.width = widthPx;
            img.style.height = heightPx;
            img.style.borderRadius = borderRadius;
        });

        // Sizes changed, so every cached transform string is stale.
        this._frameCache.forEach((c) => { c.transform = ''; c.opacity = ''; c.visible = null; });
        return true;
    }

    /* ------------------------------ rendering ----------------------------- */

    /**
     * Writes transform and opacity for the current position.
     * Hot path: no DOM reads, no queries, no allocation beyond the transform
     * string, and writes are skipped when a property has not changed.
     */
    _applyFrame() {
        const layout = this.layout;
        if (!layout) return;

        const radius = layout.radius;
        const angleStep = layout.angleStep;
        const cullAngle = layout.cullAngle;
        const fadeStart = layout.fadeStart;
        const fadeSpan = layout.fadeSpan;
        const total = this.images.length;

        for (let i = 0; i < total; i++) {
            const img = this.images[i];
            const cache = this._frameCache[i];

            // Shortest way round the ring: diff ∈ (−total/2, total/2].
            let diff = i - this.position;
            diff -= total * Math.round(diff / total);

            const theta = diff * angleStep;
            const absTheta = theta < 0 ? -theta : theta;

            if (absTheta >= cullAngle) {
                // Behind the observer or fully out of frame: removed entirely.
                if (cache.visible !== false) {
                    img.style.visibility = 'hidden';
                    img.style.opacity = '0';
                    cache.visible = false;
                    cache.opacity = '0';
                    cache.transform = '';
                }
                continue;
            }

            const transform =
                'translate(-50%, -50%) translate3d(' +
                (radius * Math.sin(theta)).toFixed(2) + 'px, 0px, ' +
                (radius * (1 - Math.cos(theta))).toFixed(2) + 'px) rotateY(' +
                (-theta * RAD_TO_DEG).toFixed(3) + 'deg)';

            let opacity = '1';
            if (absTheta > fadeStart) {
                opacity = tridClamp(1 - (absTheta - fadeStart) / fadeSpan, 0, 1).toFixed(3);
            }

            if (cache.transform !== transform) {
                img.style.transform = transform;
                cache.transform = transform;
            }
            if (cache.opacity !== opacity) {
                img.style.opacity = opacity;
                cache.opacity = opacity;
            }
            if (cache.visible !== true) {
                img.style.visibility = 'visible';
                cache.visible = true;
            }
        }
    }

    /* ------------------------------ animation ----------------------------- */

    _startLoop() {
        if (this._rafId !== null || this.isDestroyed) return;
        // A single card has nowhere to travel; leave it parked and burn no frames.
        if (this.images.length <= 1) return;
        this._lastTs = null;
        this._rafId = requestAnimationFrame(this._boundTick);
    }

    _stopLoop() {
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        this._lastTs = null;
    }

    /**
     * Frame-rate independent: displacement is dt/speed, so 30/60/120/144/240Hz
     * all advance at the same rate per wall-clock millisecond. dt is clamped so
     * a suspended tab or a long main-thread block cannot teleport the ring.
     * _lastTs uses a null sentinel, not 0, because a timestamp of 0 is legal.
     */
    _tick(ts) {
        if (this.isDestroyed) return;

        if (this._lastTs === null) this._lastTs = ts;
        let dt = ts - this._lastTs;
        this._lastTs = ts;
        if (!(dt > 0)) dt = 0;                                  // NaN / non-monotonic guard
        if (dt > TRID_MAX_FRAME_MS) dt = TRID_MAX_FRAME_MS;

        this.position = tridMod(
            this.position + (dt / this.config.speed) * this.config.direction,
            this.images.length
        );

        this._applyFrame();
        this._rafId = requestAnimationFrame(this._boundTick);
    }

    /* ------------------------------ public API ---------------------------- */

    /** Stops the drift. No-op before roll() and after destroy(). */
    pause() {
        if (this.isDestroyed || !this.config) return;
        this.isPaused = true;
        this._stopLoop();
    }

    /** Resumes the drift with no positional jump. No-op after destroy(). */
    resume() {
        if (this.isDestroyed || !this.config) return;
        this.isPaused = false;
        if (!document.hidden) this._startLoop();
    }

    /**
     * Places `targetIndex` directly in front of the observer. Accepts any
     * finite number (fractional offsets are legal and land between cards);
     * the value is reduced by mathematical modulo, so negatives are fine.
     * Does not start, stop or interrupt the drift.
     */
    goTo(targetIndex) {
        if (this.isDestroyed || !this.config) return;
        if (typeof targetIndex !== 'number' || !Number.isFinite(targetIndex)) {
            throw new TypeError("triD.js: goTo() requires a finite number.");
        }
        this.position = tridMod(targetIndex, this.images.length);
        this._applyFrame();
    }

    /** Changes drift rate (ms per card) live, without restarting the loop. */
    setSpeed(ms) {
        if (this.isDestroyed || !this.config) return;
        if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) {
            throw new TypeError("triD.js: setSpeed() requires a positive finite number.");
        }
        this.config.speed = ms;
    }

    /** Index of the card nearest the front. Always 0 <= index < total. */
    getCurrentIndex() {
        const total = this.images.length;
        if (!total) return 0;
        return tridMod(Math.round(this.position), total);
    }

    /** Idempotent. Restores the DOM to its pre-roll() state. */
    destroy() {
        if (this.isDestroyed || !this.parentEl) return;
        this.isDestroyed = true;

        this._stopLoop();
        if (this._layoutRafId !== null) {
            cancelAnimationFrame(this._layoutRafId);
            this._layoutRafId = null;
        }
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        if (this._boundWindowResize) {
            window.removeEventListener('resize', this._boundWindowResize);
            this._boundWindowResize = null;
        }
        if (this._boundVisibility) {
            document.removeEventListener('visibilitychange', this._boundVisibility);
            this._boundVisibility = null;
        }

        this.images.forEach((img) => {
            const orig = this.originalImageStyles.get(img);
            if (orig) {
                img.style.cssText = orig.cssText;
                img.className = orig.className;
            }
        });

        this.parentEl.style.cssText = this.originalContainerCssText || '';
        if (!this.originalHasContainerClass) {
            this.parentEl.classList.remove('trid-container');
        }
        if (this.createdStage && this.stageEl && this.stageEl.parentNode === this.parentEl) {
            while (this.stageEl.firstChild) {
                this.parentEl.appendChild(this.stageEl.firstChild);
            }
            this.parentEl.removeChild(this.stageEl);
        }
        if (this.parentEl._tridInstance === this) {
            delete this.parentEl._tridInstance;
        }

        this.config = null;
        this.parentEl = null;
        this.stageEl = null;
        this.layout = null;
        this.images = [];
        this._frameCache = [];
        this.originalImageStyles.clear();
    }
}

TriDCarousel.version = TRID_VERSION;

window.TriDCarousel = TriDCarousel;
window.triD = {
    version: TRID_VERSION,
    roll(config) {
        return new TriDCarousel().roll(config);
    }
};
