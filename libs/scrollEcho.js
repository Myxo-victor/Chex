/**
 * ScrollEcho.js
 * A high-performance, lightweight scroll-triggered text reveal library.
 * Supports character-by-character and word-by-word reveal cascades.
 * * Initializer Syntax:
 * ScrollEcho.auto('#target', { type: 'char', delay: 20 });
 */

class ScrollEcho {
    constructor(selector, options = {}) {
        // DOM lookup for target elements
        this.elements = document.querySelectorAll(selector);
        
        // Configuration options with fluid defaults
        this.options = {
            type: options.type || 'word', // Reveal type: 'word' or 'char'
            delay: options.delay !== undefined ? options.delay : 40, // Stagger delay gap in milliseconds
            duration: options.duration !== undefined ? options.duration : 400, // Speed of transition animation in ms
            threshold: options.threshold !== undefined ? options.threshold : 0.15, // Viewport visibility scroll threshold (0.0 to 1.0)
            transformY: options.transformY || '12px', // Vertical rise offset displacement
            ease: options.ease || 'cubic-bezier(0.25, 1, 0.5, 1)', // Easing transition timing curve
            onRevealComplete: options.onRevealComplete || null, // Optional callback executed when reveal loop completes
            ...options
        };

        // Initialize global instance registry for manual retrigger controls
        if (!window.scrollTextTriggerInstances) {
            window.scrollTextTriggerInstances = {};
        }

        this.init();
    }

    /**
     * Static Auto Initializer Endpoint
     * @param {string} selector - Target selector string (e.g. '#target-element')
     * @param {object} options - Configuration overrides
     * @returns {ScrollEcho} Instance of ScrollEcho
     */
    static auto(selector, options = {}) {
        return new ScrollEcho(selector, options);
    }

    /**
     * Initializes elements by parsing text content and wrapping with spans
     */
    init() {
        this.elements.forEach((element) => {
            // Guard clause to prevent duplicate parsing initialization on the same node
            if (element.dataset.revealerInitialized) return;

            const originalText = element.textContent.trim();
            element.innerHTML = ''; // Clear original text nodes safely
            element.dataset.revealerInitialized = "true";

            // Store original text format for re-trigger calculations
            element.dataset.originalContent = originalText;

            let splitArray = [];
            if (this.options.type === 'char') {
                splitArray = originalText.split(''); // Split to individual characters
            } else {
                splitArray = originalText.split(/\s+/); // Split on whitespace blocks to get words
            }

            const docFragment = document.createDocumentFragment();

            splitArray.forEach((item, index) => {
                const span = document.createElement('span');
                
                if (this.options.type === 'char') {
                    span.className = 'reveal-char';
                    // Manage spaces elegantly using non-breaking spaces
                    if (item === ' ') {
                        span.innerHTML = '&nbsp;';
                    } else {
                        span.innerText = item;
                    }
                } else {
                    span.className = 'reveal-word';
                    span.innerText = item;
                    
                    // Inject a separation space node to avoid text compression when wrapped inside inline-block elements
                    if (index < splitArray.length - 1) {
                        const space = document.createTextNode(' ');
                        docFragment.appendChild(span);
                        docFragment.appendChild(space);
                        return;
                    }
                }

                // Apply initial hidden layout properties & custom configurations
                span.style.opacity = '0';
                span.style.transform = `translateY(${this.options.transformY})`;
                span.style.transitionDuration = `${this.options.duration}ms`;
                span.style.transitionTimingFunction = this.options.ease;

                docFragment.appendChild(span);
            });

            element.appendChild(docFragment);

            // Dynamically assign an ID if element does not have one to map callbacks
            const trackerId = element.id || 'el-' + Math.random().toString(36).substr(2, 9);
            if (!element.id) element.id = trackerId;
            
            // Map reference inside global window register
            window.scrollTextTriggerInstances[trackerId] = this;

            // Bind element to the IntersectionObserver API
            this.createObserver(element);
        });
    }

    /**
     * Binds observation triggers using native high-performance IntersectionObserver
     * @param {HTMLElement} element - Target text node element container
     */
    createObserver(element) {
        const observerOptions = {
            root: null, // Scans parent window viewport bounds
            rootMargin: '0px',
            threshold: this.options.threshold
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateReveal(entry.target);
                    observer.unobserve(entry.target); // Kill observer to fire animation only once
                }
            });
        }, observerOptions);

        observer.observe(element);
    }

    /**
     * Staggers animation opacity & transformation triggers for elements children spans
     * @param {HTMLElement} element - Parent element containing split reveal spans
     */
    animateReveal(element) {
        const targetClass = this.options.type === 'char' ? '.reveal-char' : '.reveal-word';
        const children = element.querySelectorAll(targetClass);

        children.forEach((child, index) => {
            const itemDelay = index * this.options.delay;
            
            setTimeout(() => {
                child.style.opacity = '1';
                child.style.transform = 'translateY(0)';
            }, itemDelay);
        });

        // Trigger optional complete callback if defined
        if (typeof this.options.onRevealComplete === 'function') {
            const totalAnimateTime = (children.length * this.options.delay) + this.options.duration;
            setTimeout(() => {
                this.options.onRevealComplete(element);
            }, totalAnimateTime);
        }
    }

    /**
     * Public method to reset animations and play the reveal sequence on command
     * @param {string} elementId - ID string of target element to replay
     */
    retrigger(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const targetClass = this.options.type === 'char' ? '.reveal-char' : '.reveal-word';
        const children = element.querySelectorAll(targetClass);

        // Reset elements silently back to offset position without transitions
        children.forEach(child => {
            child.style.transition = 'none'; // Temporarily bypass CSS transitions
            child.style.opacity = '0';
            child.style.transform = `translateY(${this.options.transformY})`;
            
            // Force browser layout reflow/repaint recalculation
            child.offsetHeight; 
            
            child.style.transition = ''; // Restore style defaults for cascade
        });

        // Play the staggered cascade reveal loop
        this.animateReveal(element);
    }
}



/*
**************************
How to use this library
**************************
*/


/*
ScrollEcho.auto('#target', {
    type: 'char',       // 'char' (characters) or 'word' (words)
    delay: 30,          // stagger delay between each piece (ms)
    duration: 500,      // speed of the reveal animation (ms)
    threshold: 0.15,    // viewport enter intersection threshold
    transformY: '12px'  // customized rise offset
});
*/