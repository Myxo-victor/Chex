/*!
 * bend.js — v3.4.1 (Cleaned Standalone Engine)
 *
 * Zero-dependency vanilla JS curved/fan card presentation engine.
 * Supports desktop circular fan layout, mobile windowing, pointer events,
 * and automatic reset to initial position when pointer leaves a card.
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.bend = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    'use strict';

    const VERSION = '3.4.1';
    const STYLE_ID = 'bend-js-v341-styles';
    const instances = new WeakMap();

    // Layout Parameters
    const BREAKPOINT = 700;
    const DESKTOP_CARD_WIDTH = 220;
    const DESKTOP_CARD_HEIGHT = 310;
    const MIN_CARD_WIDTH = 145;
    const MAX_CARD_WIDTH = 300;
    const DESKTOP_OVERLAP = 0.48;
    const MOBILE_OVERLAP = 0.48;
    const MOBILE_MAX_ANGLE_DEG = 17;
    const CARD_GAP = 10;
    const ACTIVE_SCALE = 1.045;
    const ACTIVE_LIFT = 18;
    const MIN_ANGLE_DEG = 2;
    const MAX_ANGLE_DEG = 42;
    const MOBILE_VISIBLE_COUNT = 3;

    /**
     * Clamps a number between a minimum and maximum bound.
     */
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Resolves DOM element or CSS selector string.
     */
    function resolveParent(parent) {
        if (parent instanceof Element) return parent;
        if (typeof parent === 'string') {
            const element = document.querySelector(parent);
            if (!element) {
                throw new Error(`bend.js: parent element not found: ${parent}`);
            }
            return element;
        }
        throw new TypeError('bend.js: "parent" must be a selector or DOM element.');
    }

    /**
     * Normalizes card input array into uniform card objects.
     */
    function normalizeCards(cards) {
        if (!Array.isArray(cards)) {
            throw new TypeError('bend.js: "cards" must be an array.');
        }
        return cards.map((card, index) => {
            if (typeof card === 'string') {
                return { image: card, title: '', description: '' };
            }
            if (!card || typeof card !== 'object') {
                throw new TypeError(`bend.js: invalid card at index ${index}`);
            }
            return {
                image: card.image == null ? '' : String(card.image),
                title: card.title == null ? '' : String(card.title),
                description: card.description == null ? '' : String(card.description)
            };
        });
    }

    /**
     * Calculates maximum arc angle based on user-defined bend factor.
     */
    function resolveMaxAngle(bendFactor) {
        const factor = Number.isFinite(bendFactor) ? bendFactor : 0.65;
        const normalized = clamp(factor, 0, 1);
        return (MIN_ANGLE_DEG + (MAX_ANGLE_DEG - MIN_ANGLE_DEG) * normalized) * Math.PI / 180;
    }

    /**
     * Calculates circular point position and rotation angle for ratio t [-1, 1].
     */
    function getCircularPoint(t, radius, maxAngle) {
        const theta = t * maxAngle;
        return {
            x: radius * Math.sin(theta),
            y: radius * (1 - Math.cos(theta)),
            rotation: theta * 180 / Math.PI
        };
    }

    /**
     * Injects stage & card CSS styles into head once.
     */
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .bend-stage {
                position: relative;
                width: 100%;
                overflow: visible;
                box-sizing: border-box;
                isolation: isolate;
                user-select: none;
                touch-action: pan-y;
            }

            .bend-card {
                position: absolute;
                left: 0;
                top: 0;
                width: 220px;
                height: 310px;
                box-sizing: border-box;
                overflow: hidden;
                border-radius: 18px;
                background: #1e293b;
                transform-origin: 50% 100%;
                cursor: pointer;
                user-select: none;
                -webkit-user-select: none;
                -webkit-tap-highlight-color: transparent;
                will-change: transform;
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
                transition: transform 420ms cubic-bezier(.22,.61,.36,1), box-shadow 300ms ease;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .bend-card[hidden] {
                display: none;
            }

            .bend-card:focus-visible {
                outline: 3px solid #3b82f6;
                outline-offset: 3px;
            }

            .bend-card__image {
                position: absolute;
                inset: 0;
                display: block;
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
                pointer-events: none;
            }

            .bend-card__shade {
                position: absolute;
                inset: 0;
                pointer-events: none;
                background: linear-gradient(
                    to bottom,
                    rgba(0,0,0,0) 25%,
                    rgba(0,0,0,0.15) 50%,
                    rgba(0,0,0,0.85) 100%
                );
            }

            .bend-card__content {
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;
                padding: 22px 18px 18px;
                box-sizing: border-box;
                color: #ffffff;
                pointer-events: none;
            }

            .bend-card__title {
                margin: 0 0 4px;
                font-size: 18px;
                line-height: 1.2;
                font-weight: 700;
                letter-spacing: -0.01em;
            }

            .bend-card__description {
                margin: 0;
                font-size: 13px;
                line-height: 1.45;
                opacity: 0.85;
            }

            .bend-card.is-active {
                box-shadow: 0 24px 50px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(59, 130, 246, 0.6);
            }

            @media (max-width: 700px) {
                .bend-stage {
                    min-height: 270px;
                }
                .bend-card {
                    border-radius: 16px;
                }
                .bend-card__content {
                    padding: 18px 15px 16px;
                }
                .bend-card__title {
                    font-size: 16px;
                }
                .bend-card__description {
                    font-size: 11px;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .bend-card {
                    transition: box-shadow 160ms ease;
                }
            }
        `;
        document.head.appendChild(style);
    }

    class BendInstance {
        constructor(options) {
            this.options = options || {};
            this.parent = resolveParent(this.options.parent);
            this.cards = normalizeCards(this.options.cards || []);

            if (!this.cards.length) {
                throw new Error('bend.js: at least one card is required.');
            }

            this.bendFactor = clamp(
                Number.isFinite(this.options.bendFactor) ? this.options.bendFactor : 0.65,
                0, 1
            );

            this.stage = null;
            this.cardElements = [];
            this.visibleIndexes = [];
            // -1 represents idle initial fan state (no active card popped up)
            this.activeIndex = -1;
            this.mobileBaseIndex = 0;
            this.isMobile = false;
            this.resizeObserver = null;
            this.mediaQuery = null;
            this.cleanup = [];
            this.raf = 0;
            this.destroyed = false;

            // Optional change callback
            this.onActiveChange = typeof this.options.onChange === 'function' ? this.options.onChange : null;

            injectStyles();
            this._build();
            this._attachEvents();
            this._render();
        }

        _build() {
            this.stage = document.createElement('div');
            this.stage.className = 'bend-stage';
            this.parent.appendChild(this.stage);
            this._buildCards();
        }

        _buildCards() {
            const fragment = document.createDocumentFragment();

            this.cards.forEach((card, index) => {
                const element = document.createElement('article');
                element.className = 'bend-card';
                element.dataset.index = String(index);
                element.tabIndex = 0;
                element.setAttribute('role', 'button');
                element.setAttribute('aria-label', card.title || `Card ${index + 1}`);

                const image = document.createElement('img');
                image.className = 'bend-card__image';
                image.src = card.image;
                image.alt = card.title || '';
                image.draggable = false;

                const shade = document.createElement('div');
                shade.className = 'bend-card__shade';

                const content = document.createElement('div');
                content.className = 'bend-card__content';

                if (card.title) {
                    const title = document.createElement('h3');
                    title.className = 'bend-card__title';
                    title.textContent = card.title;
                    content.appendChild(title);
                }

                if (card.description) {
                    const description = document.createElement('p');
                    description.className = 'bend-card__description';
                    description.textContent = card.description;
                    content.appendChild(description);
                }

                element.appendChild(image);
                element.appendChild(shade);
                element.appendChild(content);

                this._bindCard(element, index);
                this.cardElements.push(element);
                fragment.appendChild(element);
            });

            this.stage.appendChild(fragment);
        }

        _bindCard(element, index) {
            const activate = () => {
                if (this.destroyed) return;
                this.setActive(index);
            };

            const deactivate = () => {
                if (this.destroyed) return;
                // If currently active card unhovers/blurs, return to initial idle fan position
                if (this.activeIndex === index) {
                    this.setActive(-1);
                }
            };

            const keyboard = (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    activate();
                }
            };

            element.addEventListener('pointerenter', activate);
            element.addEventListener('pointerleave', deactivate);
            element.addEventListener('pointerdown', activate);
            element.addEventListener('focus', activate);
            element.addEventListener('blur', deactivate);
            element.addEventListener('keydown', keyboard);

            this.cleanup.push(() => {
                element.removeEventListener('pointerenter', activate);
                element.removeEventListener('pointerleave', deactivate);
                element.removeEventListener('pointerdown', activate);
                element.removeEventListener('focus', activate);
                element.removeEventListener('blur', deactivate);
                element.removeEventListener('keydown', keyboard);
            });
        }

        _attachEvents() {
            // Resize handling
            if (typeof ResizeObserver !== 'undefined') {
                this.resizeObserver = new ResizeObserver(() => this._queueRender());
                this.resizeObserver.observe(this.parent);
            } else {
                const handleResize = () => this._queueRender();
                window.addEventListener('resize', handleResize, { passive: true });
                this.cleanup.push(() => window.removeEventListener('resize', handleResize));
            }

            // Media query tracking
            if (typeof window.matchMedia === 'function') {
                this.mediaQuery = window.matchMedia(`(max-width: ${BREAKPOINT}px)`);
                this.isMobile = this.mediaQuery.matches;

                const handleMQ = (e) => {
                    this.isMobile = e.matches;
                    if (this.isMobile && this.activeIndex !== -1) {
                        this.mobileBaseIndex = this._getMobileStart(this.activeIndex);
                    }
                    this._queueRender();
                };

                if (typeof this.mediaQuery.addEventListener === 'function') {
                    this.mediaQuery.addEventListener('change', handleMQ);
                    this.cleanup.push(() => this.mediaQuery.removeEventListener('change', handleMQ));
                } else if (typeof this.mediaQuery.addListener === 'function') {
                    this.mediaQuery.addListener(handleMQ);
                    this.cleanup.push(() => this.mediaQuery.removeListener(handleMQ));
                }
            } else {
                this.isMobile = window.innerWidth <= BREAKPOINT;
            }

            // Keyboard Arrow Navigation
            const handleGlobalKeys = (e) => {
                if (document.activeElement && this.stage.contains(document.activeElement)) {
                    if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        this.prev();
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        this.next();
                    }
                }
            };
            window.addEventListener('keydown', handleGlobalKeys);
            this.cleanup.push(() => window.removeEventListener('keydown', handleGlobalKeys));

            // Touch Swipe Gestures
            let touchStartX = 0;
            const handleTouchStart = (e) => {
                touchStartX = e.touches[0].clientX;
            };
            const handleTouchEnd = (e) => {
                const diffX = e.changedTouches[0].clientX - touchStartX;
                if (Math.abs(diffX) > 40) {
                    if (diffX > 0) this.prev();
                    else this.next();
                }
            };

            this.stage.addEventListener('touchstart', handleTouchStart, { passive: true });
            this.stage.addEventListener('touchend', handleTouchEnd, { passive: true });
            this.cleanup.push(() => {
                this.stage.removeEventListener('touchstart', handleTouchStart);
                this.stage.removeEventListener('touchend', handleTouchEnd);
            });
        }

        _getMobileStart(activeIndex) {
            const total = this.cards.length;
            if (total <= MOBILE_VISIBLE_COUNT) return 0;
            const target = activeIndex === -1 ? 0 : activeIndex;
            let start = target - 1;
            return clamp(start, 0, total - MOBILE_VISIBLE_COUNT);
        }

        _getMobileIndexes() {
            const total = this.cards.length;
            if (total <= MOBILE_VISIBLE_COUNT) {
                return Array.from({ length: total }, (_, i) => i);
            }
            const start = clamp(this.mobileBaseIndex, 0, total - MOBILE_VISIBLE_COUNT);
            return [start, start + 1, start + 2];
        }

        _getGeometry() {
            const width = this.parent.clientWidth || 600;
            const mobile = this.isMobile;
            const count = mobile ? Math.min(MOBILE_VISIBLE_COUNT, this.cards.length) : this.cards.length;

            let cardWidth = mobile
                ? Math.min(280, Math.max(MIN_CARD_WIDTH, width * 0.62))
                : DESKTOP_CARD_WIDTH;

            if (!mobile && width < 1050) {
                cardWidth = Math.min(DESKTOP_CARD_WIDTH, Math.max(MIN_CARD_WIDTH, width * 0.25));
            }

            cardWidth = clamp(cardWidth, MIN_CARD_WIDTH, MAX_CARD_WIDTH);
            const cardHeight = cardWidth * (DESKTOP_CARD_HEIGHT / DESKTOP_CARD_WIDTH);

            if (mobile) {
                const maxAngle = MOBILE_MAX_ANGLE_DEG * Math.PI / 180;
                const spacing = cardWidth * (1 - MOBILE_OVERLAP) + CARD_GAP;
                const chord = spacing * 2;
                const radius = chord / (2 * Math.sin(maxAngle));
                const arcDepth = radius * (1 - Math.cos(maxAngle));

                return {
                    width, mobile: true, count, cardWidth, cardHeight,
                    spacing, maxAngle, radius, arcDepth,
                    stageHeight: cardHeight + arcDepth + ACTIVE_LIFT + 30
                };
            }

            const spacing = cardWidth * (1 - DESKTOP_OVERLAP) + CARD_GAP;
            const chord = spacing * Math.max(count - 1, 0);
            const maxAngle = resolveMaxAngle(this.bendFactor);
            const radius = chord <= 0 || maxAngle < 0.0001 ? 100000 : (chord / 2) / Math.sin(maxAngle);
            const arcDepth = radius * (1 - Math.cos(maxAngle));

            return {
                width, mobile: false, count, cardWidth, cardHeight,
                spacing, chord, maxAngle, radius, arcDepth,
                stageHeight: Math.max(230, cardHeight + arcDepth + ACTIVE_LIFT + 25)
            };
        }

        _queueRender() {
            if (this.raf) cancelAnimationFrame(this.raf);
            this.raf = requestAnimationFrame(() => this._render());
        }

        _render() {
            if (this.destroyed || !this.stage) return;

            const geometry = this._getGeometry();
            this.visibleIndexes = geometry.mobile ? this._getMobileIndexes() : this.cards.map((_, i) => i);

            this.cardElements.forEach((card, index) => {
                card.hidden = this.visibleIndexes.indexOf(index) === -1;
            });

            this.stage.style.height = `${geometry.stageHeight}px`;

            if (geometry.mobile) {
                this._renderMobile(geometry);
            } else {
                this._renderDesktop(geometry);
            }
        }

        _renderDesktop(geometry) {
            const count = geometry.count;
            const centerX = geometry.width / 2;

            this.visibleIndexes.forEach((cardIndex, position) => {
                const card = this.cardElements[cardIndex];
                const t = count === 1 ? 0 : (position / (count - 1)) * 2 - 1;
                const point = getCircularPoint(t, geometry.radius, geometry.maxAngle);
                const left = centerX + point.x - geometry.cardWidth / 2;
                const top = point.y;
                const active = cardIndex === this.activeIndex;

                const distance = Math.abs(t);
                let zIndex = 1000 - Math.round(distance * 300);

                if (Math.abs(t) < 0.001) {
                    zIndex += 500;
                }

                if (active) {
                    zIndex += 2000;
                    card.classList.add('is-active');
                } else {
                    card.classList.remove('is-active');
                }

                const scale = active ? ACTIVE_SCALE : 1;
                const translateY = active ? top - ACTIVE_LIFT : top;

                card.style.width = `${geometry.cardWidth}px`;
                card.style.height = `${geometry.cardHeight}px`;
                card.style.zIndex = zIndex;
                card.style.transform = `translate3d(${left}px, ${translateY}px, 0px) rotate(${point.rotation}deg) scale(${scale})`;
            });
        }

        _renderMobile(geometry) {
            const centerX = geometry.width / 2;
            const visibleCount = this.visibleIndexes.length;

            this.visibleIndexes.forEach((cardIndex, position) => {
                const card = this.cardElements[cardIndex];
                const t = visibleCount === 1 ? 0 : (position / (visibleCount - 1)) * 2 - 1;
                const point = getCircularPoint(t, geometry.radius, geometry.maxAngle);
                const left = centerX + point.x - geometry.cardWidth / 2;
                const top = point.y;
                const active = cardIndex === this.activeIndex;

                let zIndex = 1000 - Math.round(Math.abs(t) * 300);

                if (active) {
                    zIndex += 2000;
                    card.classList.add('is-active');
                } else {
                    card.classList.remove('is-active');
                }

                const scale = active ? ACTIVE_SCALE : 0.96;
                const translateY = active ? top - ACTIVE_LIFT : top;

                card.style.width = `${geometry.cardWidth}px`;
                card.style.height = `${geometry.cardHeight}px`;
                card.style.zIndex = zIndex;
                card.style.transform = `translate3d(${left}px, ${translateY}px, 0px) rotate(${point.rotation}deg) scale(${scale})`;
            });
        }

        /**
         * Sets active card index (-1 resets all cards to initial idle position).
         * @param {number} index
         */
        setActive(index) {
            if (index !== -1 && (index < 0 || index >= this.cards.length)) return;
            this.activeIndex = index;
            if (this.isMobile && index !== -1) {
                this.mobileBaseIndex = this._getMobileStart(index);
            }
            this._queueRender();

            if (typeof this.onActiveChange === 'function') {
                this.onActiveChange(
                    this.activeIndex,
                    this.activeIndex !== -1 ? this.cards[this.activeIndex] : null
                );
            }
        }

        next() {
            if (!this.cards.length) return;
            const nextIndex = this.activeIndex === -1 ? 0 : (this.activeIndex + 1) % this.cards.length;
            this.setActive(nextIndex);
        }

        prev() {
            if (!this.cards.length) return;
            const prevIndex = this.activeIndex === -1
                ? this.cards.length - 1
                : (this.activeIndex - 1 + this.cards.length) % this.cards.length;
            this.setActive(prevIndex);
        }

        update(options) {
            if (!options) return;
            if (options.bendFactor !== undefined) {
                this.bendFactor = clamp(Number(options.bendFactor) || 0.65, 0, 1);
            }
            if (options.cards) {
                this.cards = normalizeCards(options.cards);
                this.stage.innerHTML = '';
                this.cardElements = [];
                this._buildCards();
                this.setActive(-1);
            } else {
                this._queueRender();
            }
        }

        destroy() {
            if (this.destroyed) return;
            this.destroyed = true;

            if (this.raf) cancelAnimationFrame(this.raf);
            if (this.resizeObserver) this.resizeObserver.disconnect();

            this.cleanup.forEach(fn => fn());
            this.cleanup = [];

            if (this.stage && this.stage.parentNode) {
                this.stage.parentNode.removeChild(this.stage);
            }

            instances.delete(this.parent);
        }
    }

    return {
        version: VERSION,
        roll(options) {
            const instance = new BendInstance(options);
            instances.set(instance.parent, instance);
            return instance;
        },
        get(parent) {
            const el = typeof parent === 'string' ? document.querySelector(parent) : parent;
            return instances.get(el);
        }
    };
}));