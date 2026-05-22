/**
 * Rinx Text Slider V1.0
 * Specifically designed for sliding text blocks inside overlays 
 * without breaking parent container layouts.
 * This library allows us to make a container holding some texts to slide one by one
 */

const rinx = {
    _instances: [],

    slides: function(config) {
        const ids = config.IDs || [];
        const interval = config.interval || 3000;
        const effect = config.effect || 'fade'; // 'fade' or 'slide'

        const elements = ids.map(id => document.getElementById(id)).filter(el => el !== null);
        if (elements.length === 0) return;

        // Setup Initial State
        elements.forEach((el, index) => {
            el.style.transition = 'all 0.8s ease-in-out';
            if (index === 0) {
                el.style.opacity = '1';
                el.style.display = 'block';
                el.style.transform = 'translateX(0)';
            } else {
                el.style.opacity = '0';
                el.style.display = 'none';
                el.style.transform = 'translateX(20px)';
            }
        });

        let currentIndex = 0;

        const state = {
            elements: elements,
            interval: interval,
            timer: null,
            next: () => {
                const current = elements[currentIndex];
                currentIndex = (currentIndex + 1) % elements.length;
                const nextEl = elements[currentIndex];

                // Hide Current
                current.style.opacity = '0';
                current.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    current.style.display = 'none';
                    
                    // Show Next
                    nextEl.style.display = 'block';
                    // Small timeout to trigger CSS transition after display:block
                    setTimeout(() => {
                        nextEl.style.opacity = '1';
                        nextEl.style.transform = 'translateX(0)';
                    }, 50);
                }, 400); // Wait for fade out
            }
        };

        state.timer = setInterval(state.next, interval);
        this._instances.push(state);
        return state;
    },

    destroyAll: function() {
        if (!this._instances || this._instances.length === 0) return;
        this._instances.forEach((instance) => {
            if (instance && instance.timer) clearInterval(instance.timer);
            if (instance) instance.timer = null;
        });
        this._instances = [];
    }
};


/**************************
How to use this library
***************************
*/
/*
rinx.slides({
            IDs: ['scroll1', 'scroll2', 'scroll3'],
            interval: 5000,
            effect:'slide'
        });
*/