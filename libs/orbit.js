/**
 * OrbitJS Engine V3.1.0 - Professional Grade
 * Fixed Visibility & Dynamic Rendering Support
 * Features: Seamless Loop, Touch, Hover-Pause, Auto-Dots, Chex-Ready.
 * @author Myxo victor
 * Single Image slider (Allows us to display slide through bunch of images 1 by 1)
 */

const orbit = {
    _sliders: [],

    /**
     * Initialize the sliding logic
     * @param {Object} config - { IDs: ['id1', 'id2'], interval: 4000, dots: true }
     */
    slides: function(config) {
        // 1. Initial Check & Delay for Dynamic Content (Chex support)
        const init = () => {
            const ids = config.IDs || [];
            const elements = ids.map(id => document.getElementById(id)).filter(el => el !== null);

            // If elements aren't in the DOM yet, retry in 100ms
            if (elements.length === 0) {
                setTimeout(init, 100);
                return;
            }

            this._build(config, elements);
        };

        init();
    },

    _build: function(config, elements) {
        const interval = config.interval || 4000;
        const showDots = config.dots !== false;
        const pauseOnHover = config.pauseOnHover !== false;
        const wrapper = elements[0].parentElement;
        const originalCount = elements.length;

        // Prevent nested/duplicate initialization (can blank out content)
        if (wrapper && wrapper.classList && wrapper.classList.contains('orbit-track')) {
            return;
        }
        if (wrapper && wrapper.querySelector && wrapper.querySelector('.orbit-track')) {
            return;
        }

        // 2. Setup Wrapper Layout
        // If height is 0, images will be invisible. We force a min-height.
        if (wrapper.offsetHeight === 0) {
            wrapper.style.minHeight = "300px"; 
        }
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'hidden';
        wrapper.style.display = 'block';
        wrapper.style.touchAction = 'pan-y';

        // 3. Create Seamless Track
        const track = document.createElement('div');
        track.className = 'orbit-track';
        track.style.cssText = `
            display: flex;
            width: 100%;
            height: 100%;
            z-index: 5;
            transition: transform 0.8s cubic-bezier(0.645, 0.045, 0.355, 1);
            will-change: transform;
        `;

        // 4. Handle Clones for Seamless Loop
        const firstClone = elements[0].cloneNode(true);
        const lastClone = elements[elements.length - 1].cloneNode(true);
        firstClone.id += '-clone';
        lastClone.id += '-clone';

        const trackElements = [lastClone, ...elements, firstClone];

        trackElements.forEach(el => {
            el.style.flex = '0 0 100%';
            el.style.width = '100%';
            el.style.height = '100%';
            el.style.objectFit = 'cover';
            el.style.display = 'block'; // Force visibility
            el.style.visibility = 'visible';
            el.style.opacity = '1';
            track.appendChild(el);
        });

        // 5. Replace contents and start
        wrapper.innerHTML = ''; 
        wrapper.appendChild(track);

        // Force a browser reflow to ensure the -100% takes effect immediately
        track.offsetHeight; 
        let currentIndex = 1;
        track.style.transform = `translateX(-100%)`;

        const state = {
            wrapper, track, originalCount, currentIndex, interval,
            timer: null, started: false, isTransitioning: false, dots: []
        };

        if (showDots) this._createDots(wrapper, state);
        if (pauseOnHover) {
            wrapper.addEventListener('mouseenter', () => this._pause(state));
            wrapper.addEventListener('mouseleave', () => this._start(state));
        }

        this._addTouchListeners(wrapper, state);
        track.addEventListener('transitionend', () => this._handleTransitionEnd(state));
        
        this._sliders.push(state);
        this._observe(wrapper, state);
    },

    _createDots: function(wrapper, state) {
        const dotsContainer = document.createElement('div');
        dotsContainer.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:10px;z-index:20;';
        
        for (let i = 0; i < state.originalCount; i++) {
            const dot = document.createElement('div');
            dot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.5);cursor:pointer;transition:0.3s;';
            if (i === 0) dot.style.background = '#fff';
            dot.onclick = (e) => { e.stopPropagation(); this._goTo(state, i + 1); };
            dotsContainer.appendChild(dot);
            state.dots.push(dot);
        }
        wrapper.appendChild(dotsContainer);
    },

    _updateDots: function(state) {
        if (state.dots.length === 0) return;
        let activeDot = state.currentIndex - 1;
        if (activeDot >= state.originalCount) activeDot = 0;
        if (activeDot < 0) activeDot = state.originalCount - 1;

        state.dots.forEach((dot, i) => {
            dot.style.background = i === activeDot ? '#fff' : 'rgba(255,255,255,0.5)';
            dot.style.transform = i === activeDot ? 'scale(1.2)' : 'scale(1)';
        });
    },

    _addTouchListeners: function(wrapper, state) {
        let startX = 0;
        wrapper.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            this._pause(state);
        }, {passive: true});

        wrapper.addEventListener('touchend', (e) => {
            let endX = e.changedTouches[0].clientX;
            let diff = startX - endX;
            if (Math.abs(diff) > 50) { 
                diff > 0 ? this._next(state) : this._prev(state);
            }
            this._start(state);
        }, {passive: true});
    },

    _handleTransitionEnd: function(state) {
        state.isTransitioning = false;
        if (state.currentIndex === 0) {
            state.track.style.transition = 'none';
            state.currentIndex = state.originalCount;
            state.track.style.transform = `translateX(-${state.currentIndex * 100}%)`;
        } else if (state.currentIndex === state.originalCount + 1) {
            state.track.style.transition = 'none';
            state.currentIndex = 1;
            state.track.style.transform = `translateX(-100%)`;
        }
        this._updateDots(state);
    },

    _goTo: function(state, index) {
        if (state.isTransitioning) return;
        state.isTransitioning = true;
        state.currentIndex = index;
        state.track.style.transition = 'transform 0.8s cubic-bezier(0.645, 0.045, 0.355, 1)';
        state.track.style.transform = `translateX(-${index * 100}%)`;
        this._updateDots(state);
    },

    _next: function(state) { this._goTo(state, state.currentIndex + 1); },
    _prev: function(state) { this._goTo(state, state.currentIndex - 1); },

    _observe: function(target, state) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !state.started) {
                    this._start(state);
                    state.started = true;
                }
            });
        }, { threshold: 0.1 }); 
        observer.observe(target);
    },

    _start: function(state) {
        if (state.timer) clearInterval(state.timer);
        state.timer = setInterval(() => this._next(state), state.interval);
    },

    _pause: function(state) { clearInterval(state.timer); }
};


/**************************
How to use this library
**************************
*/

  /*  orbit.slides({
        IDs: ['ic','ic','ic'],
        interval: 5000,
        dots: true
    })*/