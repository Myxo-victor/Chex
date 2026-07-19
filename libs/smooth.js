/**
 * Smooth.js - Seamless, Fluid Continuous Infinite Ticker Slider Engine
 * * Unlike traditional carousels that transition and pause, Smooth.js uses
 * high-performance requestAnimationFrame delta-time rendering to run a 
 * completely seamless, non-stutter, continuous carousel loop.
 * * Supports cloning rich DOM nodes, fallback image URLs, responsive column count,
 * customizable speeds, and on-the-fly direction switching.
 * * Responsive Breakpoints:
 * - Desktop (>= 768px): Displays 3 slides at once
 * - Mobile (< 768px): Displays 2 slides at once
 */

class Smooth {
  static defaultStylesInjected = false;
  static activeAutoCarousels = new Map();
  static autoInitTimer = null;
  static autoLifecycleBound = false;

  constructor() {
    this.rawInputList = [];         // Holds element selectors/IDs or image URLs
    this.slides = [];               // Resolved slide nodes and content elements
    this.pixelsPerSecond = 60;      // Standard ticker speed (px/sec)
    this.directionVector = 'left';  // Horizontal scroll direction ('left' | 'right')
    this.container = null;          // Active mount viewport element
    this.viewport = null;           // Internal masked viewport element
    this.track = null;              // Ticker movement rail element
    
    this.isPlaying = false;         // Playback running state
    this.isHovered = false;         // Kept for backwards-compatible telemetry
    this.pauseOnHover = false;      // Hover suspension is disabled
    
    this.scrollOffset = 0;          // Raw scroll distance accumulator (pixels)
    this.lastTimestamp = null;      // Frame delta tracker
    this.animationFrameId = null;   // Animation loop reference handle
    this.changeCallback = null;     // Active telemetry update listeners

    this.lastItemsPerPage = this.getItemsPerPage(); // Cache width state
    this.resizeBound = false;       // Guards against duplicate window listeners
    this.itemsWidthSum = 0;         // Total physical width of unique slide pack (one full loop)
  }

  /**
   * Adds baseline carousel styling once per page so images look polished even
   * when the user does not provide custom CSS.
   */
  injectDefaultStyles() {
    if (Smooth.defaultStylesInjected || typeof document === 'undefined') return;

    const style = document.createElement('style');
    style.id = 'smooth-default-styles';
    style.textContent = `
.smooth-viewport {
  overflow: hidden;
  width: 100%;
}

.smooth-track {
  display: flex;
  align-items: center;
  width: max-content;
  will-change: transform;
}

.smooth-slide-item {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 8px;
}

.smooth-media-frame {
  width: 100%;
  aspect-ratio: var(--smooth-image-ratio, 4 / 3);
  overflow: hidden;
  border-radius: var(--smooth-image-radius, 12px);
  background: var(--smooth-image-background, #f1f5f9);
}

.smooth-media-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: var(--smooth-image-fit, cover);
}
`;

    document.head.appendChild(style);
    Smooth.defaultStylesInjected = true;
  }

  /**
   * Gives cloned image nodes the same default frame used by URL images.
   * @param {HTMLImageElement} image
   * @returns {HTMLDivElement}
   */
  createImageFrame(image) {
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'smooth-media-frame';

    image.classList.add('smooth-media-image');
    image.style.display = '';
    image.removeAttribute('id'); // Avoid ID duplication conflicts

    imgWrapper.appendChild(image);
    return imgWrapper;
  }

  /**
   * Starts one or many carousels from simple config objects.
   * @param {Object|Object[]} configs
   * @returns {boolean}
   */
  static start(configs) {
    const list = Array.isArray(configs) ? configs : [configs];
    Smooth.autoConfigs = list.filter(Boolean);
    Smooth.setupAutoLifecycle();
    Smooth.scheduleAutoInit();
    return true;
  }

  /**
   * Instance-friendly alias for Smooth.start().
   * @param {Object|Object[]} configs
   * @returns {Smooth}
   */
  start(configs) {
    Smooth.start(configs);
    return this;
  }

  /**
   * Binds page lifecycle events once so declarative configs survive delayed
   * rendering and route changes.
   */
  static setupAutoLifecycle() {
    if (Smooth.autoLifecycleBound || typeof window === 'undefined') return;
    Smooth.autoLifecycleBound = true;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', Smooth.scheduleAutoInit);
    } else {
      Smooth.scheduleAutoInit();
    }

    window.addEventListener('load', Smooth.scheduleAutoInit);
    window.addEventListener('hashchange', Smooth.scheduleAutoInit);
    window.addEventListener('popstate', Smooth.scheduleAutoInit);

    const observer = new MutationObserver(Smooth.scheduleAutoInit);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Debounces automatic setup while frameworks are rendering.
   */
  static scheduleAutoInit() {
    clearTimeout(Smooth.autoInitTimer);
    Smooth.autoInitTimer = setTimeout(Smooth.initConfiguredCarousels, 50);
  }

  /**
   * Initializes every carousel declared through Smooth.start().
   * @returns {boolean}
   */
  static initConfiguredCarousels() {
    const configs = Smooth.autoConfigs || [];
    return configs.map(Smooth.initConfiguredCarousel).every(Boolean);
  }

  /**
   * Stops a managed carousel when its container leaves the DOM.
   * @param {string} selector
   */
  static stopConfiguredCarousel(selector) {
    const active = Smooth.activeAutoCarousels.get(selector);
    if (!active) return;

    active.carousel.stop();
    Smooth.activeAutoCarousels.delete(selector);
  }

  /**
   * Resolves item IDs/selectors from a declarative carousel config.
   * @param {HTMLElement} container
   * @param {Object} config
   * @returns {string[]}
   */
  static getConfiguredItems(container, config) {
    if (Array.isArray(config.items)) return config.items;
    if (Array.isArray(config.images)) return config.images;

    const itemSelector = config.itemSelector || 'img';
    const idPrefix = config.idPrefix || `smooth-item-${Math.random().toString(36).slice(2)}`;
    const items = Array.from(container.querySelectorAll(itemSelector));

    return items.map((item, index) => {
      if (config.idPrefix || !item.id) item.id = `${idPrefix}-${index + 1}`;
      item.style.display = 'none';
      return item.id;
    });
  }

  /**
   * Initializes a single declarative carousel config.
   * @param {Object} config
   * @returns {boolean}
   */
  static initConfiguredCarousel(config) {
    if (!config || !config.selector) return false;

    const container = document.querySelector(config.selector);
    const active = Smooth.activeAutoCarousels.get(config.selector);

    if (!container) {
      Smooth.stopConfiguredCarousel(config.selector);
      return false;
    }

    if (active?.container === container) return true;

    Smooth.stopConfiguredCarousel(config.selector);

    const items = Smooth.getConfiguredItems(container, config);
    if (items.length === 0) return false;

    const carousel = new Smooth();
    carousel
      .mount(container)
      .items(items)
      .speed(config.speed || 60)
      .direction(config.direction || 'left');

    if (config.autoPlay !== false) carousel.play();

    Smooth.activeAutoCarousels.set(config.selector, { carousel, container });
    return true;
  }

  /**
   * Resolves IDs and CSS selectors without throwing on plain image URLs.
   * @param {string} value
   * @returns {HTMLElement|null}
   */
  resolveInputElement(value) {
    const trimmed = value.trim();
    const idMatch = document.getElementById(trimmed);
    if (idMatch) return idMatch;

    try {
      return document.querySelector(trimmed);
    } catch (error) {
      return null;
    }
  }

  /**
   * Detects the optimal layout mode based on viewport width.
   * Responsive: Desktop (>= 768px) shows 3, Mobile (< 768px) shows 2.
   * @returns {number}
   */
  getItemsPerPage() {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 2;
    }
    return 3;
  }

  /**
   * Anchors the carousel wrapper to the targeted element.
   * @param {string|HTMLElement} selector
   * @returns {Smooth}
   */
  mount(selector) {
    if (Array.isArray(selector) || (selector && typeof selector === 'object' && selector.selector)) {
      return this.start(selector);
    }

    this.container = typeof selector === 'string' 
      ? document.querySelector(selector) 
      : selector;

    if (!this.container) {
      console.error(`Smooth.js: Mounting container "${selector}" was not resolved.`);
    } else {
      this.setupResizeEvent();
    }
    return this;
  }

  /**
   * Hover pausing is disabled; kept as a no-op for backwards compatibility.
   */
  setupHoverEvents() {
    return this;
  }

  /**
   * Sets up highly responsive window resize listeners to reconstruct
   * track sizes and boundaries.
   */
  setupResizeEvent() {
    if (this.resizeBound || typeof window === 'undefined') return;
    this.resizeBound = true;

    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const currentBreakpointVal = this.getItemsPerPage();
        if (currentBreakpointVal !== this.lastItemsPerPage) {
          this.lastItemsPerPage = currentBreakpointVal;
          this.render(); // Breakpoint changed: requires full reconstruction
        } else {
          this.recalculateDimensions(); // Just adapt sizing on same layout mode
        }
      }, 150);
    });
  }

  /**
   * Accepts array list representing raw image IDs, selectors, or direct URLs.
   * @param {Array} list 
   * @returns {Smooth}
   */
  items(list) {
    this.rawInputList = Array.isArray(list) ? list : [list];
    this.render();
    return this;
  }

  /**
   * Alias interface for items() to ensure backwards compatibility.
   * @param {Array} list 
   * @returns {Smooth}
   */
  images(list) {
    return this.items(list);
  }

  /**
   * Sets continuous motion speed (pixels scrolled per second).
   * @param {number} rate 
   * @returns {Smooth}
   */
  speed(rate) {
    this.pixelsPerSecond = Math.max(1, Number(rate) || 60);
    this.updateCallback();
    return this;
  }

  /**
   * Adjusts the moving direction of the carousel loop.
   * @param {string} dir ('left' | 'right')
   * @returns {Smooth}
   */
  direction(dir) {
    if (dir === 'left' || dir === 'right') {
      this.directionVector = dir;
      this.updateCallback();
    }
    return this;
  }

  /**
   * Hover suspension is disabled; kept chainable for existing calls.
   * @param {boolean} value 
   * @returns {Smooth}
   */
  setPauseOnHover(value) {
    this.pauseOnHover = false;
    return this;
  }

  /**
   * Resolves selector nodes, clones DOM elements, constructs circular buffer blocks,
   * and mounts the elements into the track.
   */
  render() {
    this.slides = [];
    this.injectDefaultStyles();

    this.rawInputList.forEach(item => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        const element = this.resolveInputElement(trimmed);
        if (element) {
          element.style.display = 'none'; // Hide static layout source elements
          this.slides.push({ type: 'dom', node: element });
        } else {
          this.slides.push({ type: 'url', url: item });
        }
      } else {
        this.slides.push({ type: 'url', url: String(item) });
      }
    });

    if (this.slides.length === 0) return;

    // Automatic container parent matching fallback
    if (!this.container) {
      const firstDom = this.slides.find(s => s.type === 'dom');
      if (firstDom && firstDom.node.parentElement) {
        this.container = firstDom.node.parentElement;
        this.setupResizeEvent();
      }
    }

    if (!this.container) return;

    // Set styling baseline to mask content
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';

    // Establish viewport layer
    this.viewport = this.container.querySelector('.smooth-viewport');
    if (!this.viewport) {
      this.viewport = document.createElement('div');
      this.viewport.className = 'smooth-viewport';
      this.viewport.style.overflow = 'hidden';
      this.viewport.style.width = '100%';
      this.container.appendChild(this.viewport);
    } else {
      this.viewport.innerHTML = ''; // Fresh DOM compilation
    }

    // Horizontal sliding track rail
    this.track = document.createElement('div');
    this.track.className = 'smooth-track';
    this.track.style.display = 'flex';
    this.track.style.width = 'max-content';
    this.track.style.willChange = 'transform';
    this.viewport.appendChild(this.track);

    const itemsPerPage = this.getItemsPerPage();
    
    // Triple-duplication technique: 
    // We render: [Buffer Left Block] [Main Content Block] [Buffer Right Block]
    // Allowing the window to continuously warp offsets seamlessly without blank gaps.
    const originalSet = [...this.slides];
    const tripleSets = [...originalSet, ...originalSet, ...originalSet];

    tripleSets.forEach((slide) => {
      const itemWrapper = document.createElement('div');
      itemWrapper.className = 'smooth-slide-item';
      itemWrapper.style.width = `${this.viewport.clientWidth / itemsPerPage}px`;
      itemWrapper.style.flexShrink = '0';
      itemWrapper.style.boxSizing = 'border-box';
      itemWrapper.style.padding = '8px'; // Fluid spacing gutters

      if (slide.type === 'dom') {
        const clone = slide.node.cloneNode(true);

        if (clone.tagName === 'IMG') {
          itemWrapper.appendChild(this.createImageFrame(clone));
        } else {
          clone.style.display = ''; // Clear display hidden from source
          clone.style.width = '100%';
          clone.removeAttribute('id'); // Avoid ID duplication conflicts
          itemWrapper.appendChild(clone);
        }
      } else {
        // Fallback placeholder image element
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'smooth-media-frame';

        const img = document.createElement('img');
        img.src = slide.url;
        img.className = 'smooth-media-image';
        imgWrapper.appendChild(img);
        itemWrapper.appendChild(imgWrapper);
      }

      this.track.appendChild(itemWrapper);
    });

    this.recalculateDimensions();
    
    // Align starting scroll position cleanly onto the middle (main) copy
    this.scrollOffset = this.itemsWidthSum;
    this.updatePositionDOM();
  }

  /**
   * Recalculates individual item widths and updates the boundary parameters.
   */
  recalculateDimensions() {
    if (!this.viewport || !this.track) return;
    const itemsPerPage = this.getItemsPerPage();
    const slideWidth = this.viewport.clientWidth / itemsPerPage;
    
    const slideNodes = this.track.querySelectorAll('.smooth-slide-item');
    slideNodes.forEach(node => {
      node.style.width = `${slideWidth}px`;
    });

    // Compute absolute scroll length of 1 unique set iteration
    this.itemsWidthSum = slideWidth * this.slides.length;
  }

  /**
   * Triggers hardware-accelerated transform manipulations directly on the track.
   */
  updatePositionDOM() {
    if (!this.track) return;
    this.track.style.transform = `translate3d(-${this.scrollOffset}px, 0, 0)`;
  }

  /**
   * Animation frame loop calculation using delta time variables to maintain
   * uniform rate values on variable device configurations (60Hz, 120Hz, 144Hz monitors).
   * @param {DOMHighResTimeStamp} timestamp 
   */
  tick(timestamp) {
    if (!this.isPlaying) return;

    if (!this.lastTimestamp) {
      this.lastTimestamp = timestamp;
      this.animationFrameId = requestAnimationFrame((t) => this.tick(t));
      return;
    }

    const deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    // Safeguard frame skip jumps if user changes background tabs
    if (deltaTime < 0.1) {
      const deltaScroll = this.pixelsPerSecond * deltaTime;

      if (this.directionVector === 'left') {
        this.scrollOffset += deltaScroll;
      } else {
        this.scrollOffset -= deltaScroll;
      }

      // Bound checking wrapping resets
      if (this.scrollOffset >= this.itemsWidthSum * 2) {
        this.scrollOffset -= this.itemsWidthSum; // Wrap backwards
      } else if (this.scrollOffset <= this.itemsWidthSum) {
        this.scrollOffset += this.itemsWidthSum; // Wrap forwards
      }

      this.updatePositionDOM();
    }

    this.updateCallback();
    this.animationFrameId = requestAnimationFrame((t) => this.tick(t));
  }

  /**
   * Starts the continuous loop motion.
   * @returns {Smooth}
   */
  play() {
    if (this.isPlaying) return this;
    this.isPlaying = true;
    this.lastTimestamp = null;
    this.animationFrameId = requestAnimationFrame((t) => this.tick(t));
    this.updateCallback();
    return this;
  }

  /**
   * Halts the continuous loop motion immediately.
   * @returns {Smooth}
   */
  stop() {
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.updateCallback();
    return this;
  }

  /**
   * Registers a callback hook to track carousel position and telemetry updates in real-time.
   * @param {function} fn 
   * @returns {Smooth}
   */
  onUpdate(fn) {
    this.changeCallback = fn;
    return this;
  }

  /**
   * Broadcasts engine states downstream.
   */
  updateCallback() {
    if (this.changeCallback) {
      this.changeCallback({
        scrollOffset: this.scrollOffset,
        direction: this.directionVector,
        speed: this.pixelsPerSecond,
        isPlaying: this.isPlaying,
        isHoverSuspended: this.isHovered && this.pauseOnHover,
        itemsPerPage: this.getItemsPerPage()
      });
    }
  }
}

// Global Exposure
if (typeof window !== 'undefined') {
  window.Smooth = Smooth;
  window.smooth = new Smooth();
}

// Module Support
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Smooth;
}

/*
Example usage:

smooth.start([
  {
    selector: '#carousel-container',
    itemSelector: '.carousol-image',
    idPrefix: 'impact-carousel-image',
    speed: 80,
    direction: 'left'
  },
  {
    selector: '#schools-carousel-container',
    itemSelector: '.partner-logo',
    idPrefix: 'schools-carousel-logo',
    speed: 70,
    direction: 'right'
  }
]);

You can also use the classic chainable API:

smooth
  .mount('#carousel-container')
  .items(['img1', 'img2', 'img3', 'img4'])
  .speed(100)
  .direction('left')
  .play();
*/
