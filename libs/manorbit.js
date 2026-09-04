/**
 * ManOrbitJS Engine V3.2.2 - Production-Hardened Manual Gallery Carousel Library
 * Zero-dependency manual gallery carousel driven by IDs array initialization.
 * 
 * FIXES IN V3.2.2:
 * - Unified Transition State Architecture: Created an authoritative `_setTransition(enabled)` helper
 *   method that consistently manages CSS `transition` shorthand (`transform duration timing-function`),
 *   eliminating the bug where mixing `transition = 'none'` with `transitionDuration` caused snapped or stuck animations.
 * - Robust `transitionend` Filtering: Explicitly verifies `e.propertyName === 'transform'` so unrelated
 *   CSS transitions never falsely trigger slide completion.
 * - Flawless Infinite-Loop & Swipe-to-Chevron Interoperability: Ensures the carousel always restores
 *   its enabled transition state immediately after an invisible clone boundary correction, preventing the
 *   notorious "every second click snaps" bug.
 * - Zero Autoplay: Retains 100% manual navigation (chevrons, dots, keyboard, swipe).
 * 
 * @author Myxo victor
 */
(function (global) {
    'use strict';

    const activeInstances = new Set();

    const DEFAULTS = {
        IDs: [],
        interval: 600, // Transition animation duration in ms (NO autoplay)
        arrows: true,
        dots: false,
        swipe: true,
        keyboard: true,
        threshold: 50, // Pixel threshold for swipe detection
        onInit: null,
        onSlideChange: null,
        onSlideStart: null,
        onSlideEnd: null,
        onDestroy: null
    };

    /**
     * Injects the complete self-contained ManOrbit stylesheet idempotently into the document head.
     * Scoped strictly under .manorbit to prevent host page collisions.
     */
    function injectStyles() {
        if (document.getElementById('manorbit-styles')) return;

        const style = document.createElement('style');
        style.id = 'manorbit-styles';
        style.textContent = `
            :root {
                --manorbit-arrow-size: 44px;
                --manorbit-arrow-bg: rgba(0, 0, 0, 0.55);
                --manorbit-arrow-color: #ffffff;
                --manorbit-arrow-hover-bg: rgba(0, 0, 0, 0.85);
                --manorbit-dot-size: 10px;
                --manorbit-dot-gap: 8px;
                --manorbit-dot-bg: rgba(255, 255, 255, 0.5);
                --manorbit-dot-active-bg: #ffffff;
                --manorbit-focus-ring: rgba(56, 189, 248, 0.8);
            }

            .manorbit {
                position: relative;
                display: block;
                width: 100%;
                box-sizing: border-box;
                isolation: isolate;
            }

            .manorbit-viewport {
                position: relative;
                display: block;
                width: 100%;
                overflow: hidden;
                touch-action: pan-y;
                box-sizing: border-box;
            }

            .manorbit-track {
                display: flex;
                width: 100%;
                height: 100%;
                will-change: transform;
                box-sizing: border-box;
            }

            .manorbit-slide {
                flex: 0 0 100%;
                width: 100%;
                height: 100%;
                box-sizing: border-box;
                display: block;
                user-select: none;
            }

            .manorbit-slide img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
            }

            /* Arrow Navigation Buttons (Chevrons) */
            .manorbit-arrow {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                background: var(--manorbit-arrow-bg);
                color: var(--manorbit-arrow-color);
                border: none;
                width: var(--manorbit-arrow-size);
                height: var(--manorbit-arrow-size);
                border-radius: 50%;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 25;
                transition: background 0.3s ease, transform 0.2s ease, opacity 0.3s ease;
                opacity: 0.85;
                outline: none;
                box-sizing: border-box;
            }

            .manorbit-arrow:hover {
                background: var(--manorbit-arrow-hover-bg);
                opacity: 1;
                transform: translateY(-50%) scale(1.08);
            }

            .manorbit-arrow:focus-visible {
                box-shadow: 0 0 0 3px var(--manorbit-focus-ring);
            }

            .manorbit-prev {
                left: 16px;
            }

            .manorbit-next {
                right: 16px;
            }

            /* Pagination Dots */
            .manorbit-dots {
                position: absolute;
                bottom: 16px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: var(--manorbit-dot-gap);
                z-index: 20;
                box-sizing: border-box;
            }

            .manorbit-dot {
                width: var(--manorbit-dot-size);
                height: var(--manorbit-dot-size);
                border-radius: 50%;
                background: var(--manorbit-dot-bg);
                border: none;
                padding: 0;
                cursor: pointer;
                transition: background 0.3s ease, transform 0.3s ease;
                box-sizing: border-box;
            }

            .manorbit-dot:hover {
                background: rgba(255, 255, 255, 0.8);
            }

            .manorbit-dot-active {
                background: var(--manorbit-dot-active-bg);
                transform: scale(1.25);
            }

            .manorbit-dot:focus-visible {
                box-shadow: 0 0 0 2px var(--manorbit-focus-ring);
            }

            /* Reduced Motion Override */
            .manorbit-reduced-motion .manorbit-track {
                transition: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    function validateConfig(config) {
        const validated = { ...DEFAULTS, ...config };
        
        if (!Array.isArray(validated.IDs)) {
            validated.IDs = [];
        } else {
            validated.IDs = [...new Set(validated.IDs)];
        }

        if (!Number.isFinite(validated.interval) || validated.interval < 0) {
            validated.interval = 600;
        }
        if (!Number.isFinite(validated.threshold) || validated.threshold < 0) {
            validated.threshold = 50;
        }

        return validated;
    }

    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    class ManOrbitInstance {
        constructor(config) {
            this.config = validateConfig(config);
            this.originalSlides = [];
            this.originalCount = 0;
            this.currentIndex = 1;
            this.isTransitioning = false;
            this.destroyed = false;
            this.dots = [];
            this.boundEvents = {};

            this.parentContainer = null;
            this.wrapper = null;
            this.viewport = null;
            this.track = null;
            this.slides = [];
            this.prevBtn = null;
            this.nextBtn = null;
            this.dotsContainer = null;
            this.resizeObserver = null;
            this.fallbackTimer = null;

            this.pointerState = {
                isDragging: false,
                startX: 0,
                startY: 0,
                currentX: 0,
                currentY: 0,
                isHorizontalSwipe: null
            };

            this._init();
        }

        _init() {
            const ids = this.config.IDs;
            if (ids.length === 0) {
                console.warn('[ManOrbit] No valid IDs provided in configuration.');
                return;
            }

            const resolvedElements = [];
            const seenIds = new Set();

            for (const id of ids) {
                const el = document.getElementById(id);
                if (!el) {
                    console.warn(`[ManOrbit] Slide element with ID "${id}" was not found.`);
                    continue;
                }
                if (seenIds.has(el)) {
                    console.warn(`[ManOrbit] Duplicate slide element reference encountered for ID "${id}". Skipping.`);
                    continue;
                }
                if (el._manOrbitInstance) {
                    return el._manOrbitInstance;
                }
                seenIds.add(el);
                resolvedElements.push(el);
            }

            if (resolvedElements.length === 0) {
                console.error('[ManOrbit] Initialization failed: No valid slide elements found in the DOM.');
                return;
            }

            this.originalSlides = resolvedElements;
            this.originalCount = this.originalSlides.length;

            const firstParent = this.originalSlides[0].parentElement;
            for (let i = 1; i < this.originalCount; i++) {
                if (this.originalSlides[i].parentElement !== firstParent) {
                    console.error('[ManOrbit] Initialization failed: All slide elements must share the same parent container.');
                    return;
                }
            }
            this.parentContainer = firstParent;

            this.originalSlides.forEach(el => { el._manOrbitInstance = this; });

            this.currentIndex = this.originalCount > 1 ? 1 : 0;

            try {
                injectStyles();
                this._buildDOM();

                if (this.config.arrows && this.originalCount > 1) {
                    this._createArrows();
                }
                if (this.config.dots && this.originalCount > 1) {
                    this._createDots();
                }

                this._bindEvents();
                this._setupObservers();

                activeInstances.add(this);

                this._updateTrackPosition(false);
                if (this.config.dots && this.originalCount > 1) {
                    this._updateDots();
                }

                if (typeof this.config.onInit === 'function') {
                    try { this.config.onInit(this); } catch (e) { console.error(e); }
                }
            } catch (err) {
                console.error('[ManOrbit] Initialization failed during DOM assembly:', err);
                this.destroy();
            }
        }

        _buildDOM() {
            this.domMarkers = this.originalSlides.map(slide => {
                return {
                    element: slide,
                    nextSibling: slide.nextSibling,
                    parent: slide.parentElement,
                    cssText: slide.style.cssText,
                    className: slide.className
                };
            });

            this.wrapper = document.createElement('div');
            this.wrapper.className = 'manorbit';
            this.wrapper.setAttribute('role', 'region');
            this.wrapper.setAttribute('aria-roledescription', 'carousel');
            this.wrapper.setAttribute('aria-label', 'Image gallery carousel');
            
            if (this.config.keyboard) {
                this.wrapper.setAttribute('tabindex', '0');
            }

            if (prefersReducedMotion()) {
                this.wrapper.classList.add('manorbit-reduced-motion');
            }

            this.viewport = document.createElement('div');
            this.viewport.className = 'manorbit-viewport';

            this.track = document.createElement('div');
            this.track.className = 'manorbit-track';

            let slideNodesToAppend = [];
            const needsLoop = this.originalCount > 1;

            if (needsLoop) {
                const firstClone = this.originalSlides[0].cloneNode(true);
                const lastClone = this.originalSlides[this.originalCount - 1].cloneNode(true);
                
                firstClone.removeAttribute('id');
                lastClone.removeAttribute('id');
                firstClone.classList.add('manorbit-clone');
                lastClone.classList.add('manorbit-clone');
                delete firstClone._manOrbitInstance;
                delete lastClone._manOrbitInstance;
                
                slideNodesToAppend = [lastClone, ...this.originalSlides, firstClone];
            } else {
                slideNodesToAppend = [...this.originalSlides];
            }

            const firstSlide = this.originalSlides[0];
            firstSlide.parentNode.insertBefore(this.wrapper, firstSlide);

            slideNodesToAppend.forEach((slide) => {
                const slideWrapper = document.createElement('div');
                slideWrapper.className = 'manorbit-slide';
                slideWrapper.appendChild(slide);
                this.track.appendChild(slideWrapper);
            });

            this.viewport.appendChild(this.track);
            this.wrapper.appendChild(this.viewport);
            this.slides = Array.from(this.track.children);
        }

        _createArrows() {
            this.prevBtn = document.createElement('button');
            this.prevBtn.type = 'button';
            this.prevBtn.className = 'manorbit-arrow manorbit-prev';
            this.prevBtn.setAttribute('aria-label', 'Previous slide');
            this.prevBtn.innerHTML = '&#10094;';

            this.nextBtn = document.createElement('button');
            this.nextBtn.type = 'button';
            this.nextBtn.className = 'manorbit-arrow manorbit-next';
            this.nextBtn.setAttribute('aria-label', 'Next slide');
            this.nextBtn.innerHTML = '&#10095;';

            this.boundEvents.prevClick = (e) => {
                e.stopPropagation();
                this.prev();
            };
            this.boundEvents.nextClick = (e) => {
                e.stopPropagation();
                this.next();
            };

            this.prevBtn.addEventListener('click', this.boundEvents.prevClick);
            this.nextBtn.addEventListener('click', this.boundEvents.nextClick);

            this.wrapper.appendChild(this.prevBtn);
            this.wrapper.appendChild(this.nextBtn);
        }

        _createDots() {
            this.dotsContainer = document.createElement('div');
            this.dotsContainer.className = 'manorbit-dots';

            for (let i = 0; i < this.originalCount; i++) {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'manorbit-dot';
                dot.setAttribute('aria-label', `Go to slide ${i + 1}`);

                const targetIndex = this.originalCount > 1 ? i + 1 : i;

                const dotHandler = (e) => {
                    e.stopPropagation();
                    this.goTo(targetIndex);
                };
                dot.addEventListener('click', dotHandler);
                dot._manOrbitHandler = dotHandler;

                this.dotsContainer.appendChild(dot);
                this.dots.push(dot);
            }

            this.wrapper.appendChild(this.dotsContainer);
        }

        _bindEvents() {
            if (this.config.keyboard) {
                this.boundEvents.keydown = (e) => {
                    if (this.destroyed) return;
                    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
                    if (['input', 'textarea', 'select'].includes(activeTag) || (document.activeElement && document.activeElement.isContentEditable)) {
                        return;
                    }

                    const isHoveredOrFocused = this.wrapper.contains(document.activeElement) || this.wrapper.matches(':hover');
                    if (!isHoveredOrFocused) return;

                    if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        this.prev();
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        this.next();
                    } else if (e.key === 'Home') {
                        e.preventDefault();
                        this.goTo(this.originalCount > 1 ? 1 : 0);
                    } else if (e.key === 'End') {
                        e.preventDefault();
                        this.goTo(this.originalCount > 1 ? this.originalCount : this.originalCount - 1);
                    }
                };
                this.wrapper.addEventListener('keydown', this.boundEvents.keydown);
            }

            if (this.config.swipe && this.originalCount > 1) {
                this.boundEvents.pointerdown = (e) => this._onPointerDown(e);
                this.boundEvents.pointermove = (e) => this._onPointerMove(e);
                this.boundEvents.pointerup = (e) => this._onPointerUp(e);
                this.boundEvents.pointercancel = (e) => this._onPointerUp(e);

                this.viewport.addEventListener('pointerdown', this.boundEvents.pointerdown);
                window.addEventListener('pointermove', this.boundEvents.pointermove);
                window.addEventListener('pointerup', this.boundEvents.pointerup);
                window.addEventListener('pointercancel', this.boundEvents.pointercancel);
            }

            this.boundEvents.transitionend = (e) => {
                if (e.target === this.track && e.propertyName === 'transform' && !this.destroyed) {
                    this._handleTransitionEnd();
                }
            };
            this.track.addEventListener('transitionend', this.boundEvents.transitionend);
        }

        _setupObservers() {
            if ('ResizeObserver' in window) {
                this.resizeObserver = new ResizeObserver(() => {
                    if (!this.destroyed) {
                        this._updateTrackPosition(false);
                    }
                });
                this.resizeObserver.observe(this.wrapper);
            }
        }

        /**
         * Authoritative helper for setting the track's CSS transition state.
         * Ensures we never leave the track in 'none' unintentionally and cleanly syncs duration & easing.
         */
        _setTransition(enabled) {
            if (this.destroyed || !this.track) return;
            const useTransition = enabled && !prefersReducedMotion() && this.config.interval > 0;
            if (useTransition) {
                this.track.style.transition = `transform ${this.config.interval}ms cubic-bezier(0.25, 1, 0.5, 1)`;
            } else {
                this.track.style.transition = 'none';
            }
        }

        _updateTrackPosition(withTransition = true) {
            if (this.destroyed) return;
            this._setTransition(withTransition);
            this.track.style.transform = `translateX(-${this.currentIndex * 100}%)`;
        }

        _onPointerDown(e) {
            if (this.destroyed || this.isTransitioning) return;
            if (e.button !== undefined && e.button !== 0) return;

            const st = this.pointerState;
            st.isDragging = true;
            st.startX = e.clientX;
            st.startY = e.clientY;
            st.currentX = e.clientX;
            st.currentY = e.clientY;
            st.isHorizontalSwipe = null;

            if (this.viewport.setPointerCapture) {
                try { this.viewport.setPointerCapture(e.pointerId); } catch (err) {}
            }

            this._setTransition(false);
        }

        _onPointerMove(e) {
            const st = this.pointerState;
            if (!st.isDragging || this.destroyed) return;

            st.currentX = e.clientX;
            st.currentY = e.clientY;

            const diffX = st.currentX - st.startX;
            const diffY = st.currentY - st.startY;

            if (st.isHorizontalSwipe === null) {
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 5) {
                    st.isHorizontalSwipe = true;
                } else if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 5) {
                    st.isHorizontalSwipe = false;
                    st.isDragging = false;
                    return;
                }
            }

            if (st.isHorizontalSwipe) {
                e.preventDefault();
                const containerWidth = this.viewport.offsetWidth;
                const currentTranslate = -this.currentIndex * containerWidth;
                const dampedDiff = diffX * 0.9;
                this.track.style.transform = `translateX(${currentTranslate + dampedDiff}px)`;
            }
        }

        _onPointerUp(e) {
            const st = this.pointerState;
            if (!st.isDragging || this.destroyed) return;
            st.isDragging = false;

            if (this.viewport.releasePointerCapture && e && e.pointerId !== undefined) {
                try { this.viewport.releasePointerCapture(e.pointerId); } catch (err) {}
            }

            if (!st.isHorizontalSwipe) return;

            const diffX = st.currentX - st.startX;

            if (Math.abs(diffX) >= this.config.threshold) {
                if (diffX > 0) {
                    this.prev();
                } else {
                    this.next();
                }
            } else {
                this._updateTrackPosition(true);
            }
        }

        _handleTransitionEnd() {
            if (this.destroyed) return;
            
            if (this.fallbackTimer) {
                clearTimeout(this.fallbackTimer);
                this.fallbackTimer = null;
            }

            this.isTransitioning = false;

            if (this.originalCount > 1) {
                if (this.currentIndex === 0) {
                    this._setTransition(false);
                    this.currentIndex = this.originalCount;
                    this._updateTrackPosition(false);
                } else if (this.currentIndex === this.originalCount + 1) {
                    this._setTransition(false);
                    this.currentIndex = 1;
                    this._updateTrackPosition(false);
                }
            }

            this._updateDots();

            if (typeof this.config.onSlideEnd === 'function') {
                try { this.config.onSlideEnd(this, this.getRealIndex()); } catch (e) { console.error(e); }
            }
        }

        _updateDots() {
            if (this.dots.length === 0 || this.destroyed) return;
            let realIdx = this.getRealIndex();

            this.dots.forEach((dot, idx) => {
                const isActive = idx === realIdx;
                if (isActive) {
                    dot.classList.add('manorbit-dot-active');
                    dot.setAttribute('aria-current', 'true');
                } else {
                    dot.classList.remove('manorbit-dot-active');
                    dot.removeAttribute('aria-current');
                }
            });
        }

        getRealIndex() {
            if (this.originalCount <= 1) {
                return this.currentIndex;
            }
            let idx = this.currentIndex - 1;
            if (idx >= this.originalCount) idx = 0;
            if (idx < 0) idx = this.originalCount - 1;
            return idx;
        }

        next() {
            if (this.isTransitioning || this.destroyed) return;
            this.goTo(this.currentIndex + 1);
        }

        prev() {
            if (this.isTransitioning || this.destroyed) return;
            this.goTo(this.currentIndex - 1);
        }

        goTo(index) {
            if (this.isTransitioning || this.destroyed) return;

            const maxIndex = this.originalCount > 1 ? this.originalCount + 1 : this.originalCount - 1;

            if (this.originalCount > 1) {
                if (index < 0) index = 0;
                if (index > maxIndex) index = maxIndex;
            } else {
                index = 0;
            }

            if (index === this.currentIndex) return;

            if (typeof this.config.onSlideStart === 'function') {
                try { this.config.onSlideStart(this, this.getRealIndex()); } catch (e) { console.error(e); }
            }

            this.isTransitioning = true;
            this.currentIndex = index;
            this._updateTrackPosition(true);
            this._updateDots();

            if (typeof this.config.onSlideChange === 'function') {
                try { this.config.onSlideChange(this, this.getRealIndex()); } catch (e) { console.error(e); }
            }

            const effectiveDuration = (prefersReducedMotion() || this.config.interval === 0) ? 0 : this.config.interval;
            if (this.originalCount <= 1 || effectiveDuration === 0) {
                this._handleTransitionEnd();
            } else {
                if (this.fallbackTimer) clearTimeout(this.fallbackTimer);
                this.fallbackTimer = setTimeout(() => {
                    if (this.isTransitioning) {
                        this._handleTransitionEnd();
                    }
                }, effectiveDuration + 150);
            }
        }

        destroy() {
            if (this.destroyed) return;
            this.destroyed = true;

            if (this.fallbackTimer) {
                clearTimeout(this.fallbackTimer);
                this.fallbackTimer = null;
            }

            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
                this.resizeObserver = null;
            }

            if (this.boundEvents.keydown && this.wrapper) {
                this.wrapper.removeEventListener('keydown', this.boundEvents.keydown);
            }
            if (this.boundEvents.pointerdown && this.viewport) {
                this.viewport.removeEventListener('pointerdown', this.boundEvents.pointerdown);
                window.removeEventListener('pointermove', this.boundEvents.pointermove);
                window.removeEventListener('pointerup', this.boundEvents.pointerup);
                window.removeEventListener('pointercancel', this.boundEvents.pointercancel);
            }
            if (this.boundEvents.transitionend && this.track) {
                this.track.removeEventListener('transitionend', this.boundEvents.transitionend);
            }

            if (this.prevBtn && this.boundEvents.prevClick) {
                this.prevBtn.removeEventListener('click', this.boundEvents.prevClick);
            }
            if (this.nextBtn && this.boundEvents.nextClick) {
                this.nextBtn.removeEventListener('click', this.boundEvents.nextClick);
            }

            if (this.dots && this.dots.length > 0) {
                this.dots.forEach(dot => {
                    if (dot._manOrbitHandler) {
                        dot.removeEventListener('click', dot._manOrbitHandler);
                    }
                });
            }

            if (this.domMarkers) {
                this.domMarkers.forEach(marker => {
                    delete marker.element._manOrbitInstance;
                    marker.element.style.cssText = marker.cssText || '';
                    marker.element.className = marker.className || '';
                    
                    if (marker.nextSibling && marker.nextSibling.parentNode === marker.parent) {
                        marker.parent.insertBefore(marker.element, marker.nextSibling);
                    } else if (marker.parent) {
                        marker.parent.appendChild(marker.element);
                    }
                });
            }

            if (this.wrapper && this.wrapper.parentNode) {
                this.wrapper.parentNode.removeChild(this.wrapper);
            }

            activeInstances.delete(this);

            if (typeof this.config.onDestroy === 'function') {
                try { this.config.onDestroy(this); } catch (e) { console.error(e); }
            }
        }
    }

    const ManOrbit = {
        version: '3.2.2',
        slides: function (config) {
            return new ManOrbitInstance(config);
        },
        destroyAll: function () {
            activeInstances.forEach(instance => instance.destroy());
            activeInstances.clear();
        }
    };

    global.ManOrbit = ManOrbit;
    global.manorbit = ManOrbit;

})(window);


/*
----------------------------------
How to use this library - by Myxo victor 
----------------------------------
*/
/*
Let's take it that this is your html card or anything code (anything with image you are building)

<div class="carousel-wrapper">
        <div id="slide-one">
            <img src="https://picsum.photos/id/10/600/350" alt="Nature 1">
        </div>
        <div id="slide-two">
            <img src="https://picsum.photos/id/20/600/350" alt="Nature 2">
        </div>
        <div id="slide-three">
            <img src="https://picsum.photos/id/30/600/350" alt="Nature 3">
        </div>
    </div>

-----------------------------------
Here is how to use the api
-----------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Initialize ManOrbit gallery carousel using explicit element IDs[cite: 2]
    const gallery = ManOrbit.slides({
        IDs: ['slide-one', 'slide-two', 'slide-three'],[cite: 2]
        interval: 600,      // Transition duration in milliseconds[cite: 2]
        arrows: true,       // Enable navigation chevrons[cite: 2]
        dots: true,         // Enable pagination dots[cite: 2]
        swipe: true,        // Enable touch/pointer swipe gestures[cite: 2]
        keyboard: true,     // Enable keyboard arrow navigation[cite: 2]
        threshold: 50,      // Minimum pixel threshold for swipe detection[cite: 2]
        onInit: (instance) => {
            console.log('ManOrbit carousel initialized successfully.', instance);[cite: 2]
        },
        onSlideChange: (instance, realIndex) => {
            console.log('Active slide changed to index:', realIndex);[cite: 2]
        }
    });
});


---------------------------------------------
If the first api is hard, then use this simple one
---------------------------------------------
 manorbit.slides({
    IDs: ['slide-one', 'slide-two', 'slide-three'],
    interval: 1000,
    dots: true
 })
*/
