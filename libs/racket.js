/**
 * Racket.js - Generic HTML Element Infinite Slider Engine
 * Supports standard arrays, handles auto-hiding of source nodes,
 * clones entire rich DOM structures, and adapts dynamically
 * to mobile viewports (1 slide) and desktop viewports (3 slides).
 * Use for image slider or carousel
 */
class Racket {
  constructor() {
    this.rawInputList = [];       // Holds raw ID/selector inputs
    this.slides = [];             // Stores resolved, hidden source nodes
    this.intervalDuration = 2000; // Carousel speed
    this.currentPage = 0;         // Slide page index
    this.container = null;        // Slider mounting viewport
    this.timer = null;            // Animation rotation timer
    this.isPlaying = false;       // Playback state
    this.track = null;            // Inner moving rail
    this.changeCallback = null;   // Realtime callback updates
    this.isTransitioning = false; // Transition guard locks
    this.isHovered = false;       // Cursor tracking
    this.isHoverPaused = false;   // Hover suspension state
    this.lastItemsPerPage = this.getItemsPerPage(); // Cache to check breakpoint changes
    this.resizeBound = false;     // Guard duplicate resize listeners
  }

  /**
   * Helper to detect active items per page based on viewport size.
   * Mobile (< 768px) shows 1 slide at a time. Desktop (>= 768px) shows 3.
   * @returns {number}
   */
  getItemsPerPage() {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 1;
    }
    return 3;
  }

  /**
   * Mounts the Racket slider onto a targeted DOM element wrapper.
   * @param {string|HTMLElement} selector
   */
  mount(selector) {
    this.container = typeof selector === 'string' 
      ? document.querySelector(selector) 
      : selector;

    if (!this.container) {
      console.warn(`Racket.js: Mounting container "${selector}" not found yet. Retrying on render.`);
    } else {
      this.setupHoverEvents();
      this.setupResizeEvent();
    }
    return this;
  }

  /**
   * Listens for mouse hover patterns to suspend playback.
   */
  setupHoverEvents() {
    if (!this.container) return;

    // Use a flag to avoid adding duplicate event listeners
    if (this.container.dataset.racketHoverBound) return;
    this.container.dataset.racketHoverBound = "true";

    this.container.addEventListener('mouseenter', () => {
      this.isHovered = true;
      if (this.isPlaying && !this.isHoverPaused) {
        this.isHoverPaused = true;
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
        this.updatePosition();
        if (window.logToSandboxConsole) {
          window.logToSandboxConsole('Carousel auto-rotation paused on hover 🧊', 'info');
        }
      }
    });

    this.container.addEventListener('mouseleave', () => {
      this.isHovered = false;
      if (this.isPlaying && this.isHoverPaused) {
        this.isHoverPaused = false;
        this.startTimer();
        this.updatePosition();
        if (window.logToSandboxConsole) {
          window.logToSandboxConsole('Carousel auto-rotation resumed 🚀', 'info');
        }
      }
    });
  }

  /**
   * Attaches window resize listeners to trigger smooth layout adaptions.
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
          this.currentPage = 0; // Reset to start index to avoid layout miscalculation
          this.render();
          if (window.logToSandboxConsole) {
            window.logToSandboxConsole(`Responsive Layout update: Displaying ${currentBreakpointVal} item(s) per frame 📱💻`, 'info');
          }
        }
      }, 150);
    });
  }

  /**
   * Accepts array list representing raw image IDs or direct URLs.
   * @param {Array} imgArray 
   */
  images(imgArray) {
    this.rawInputList = Array.isArray(imgArray) ? imgArray : [imgArray];
    this.render();
    return this;
  }

  /**
   * Adjusts the transition frequency duration limit.
   * @param {number} ms 
   */
  duration(ms) {
    this.intervalDuration = Number(ms) || 2000;
    if (this.isPlaying && !this.isHoverPaused) {
      this.play();
    } else {
      this.updatePosition();
    }
    return this;
  }

  /**
   * Resolves elements from IDs, clones them, hides the static versions,
   * and compiles the infinite scrolling layout.
   */
  render() {
    this.slides = [];
    this.rawInputList.forEach(item => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        const element = document.getElementById(trimmed) || document.querySelector(trimmed);
        if (element) {
          // Hide the static element from the page layout so they don't appear stacked!
          element.style.display = 'none';
          this.slides.push({ type: 'dom', node: element });
        } else {
          // Fallback to simple URL string
          this.slides.push({ type: 'url', url: item });
        }
      } else {
        this.slides.push({ type: 'url', url: String(item) });
      }
    });

    if (this.slides.length === 0) return;

    if (!this.container) {
      const firstDom = this.slides.find(s => s.type === 'dom');
      if (firstDom && firstDom.node.parentElement) {
        this.container = firstDom.node.parentElement;
        this.setupHoverEvents();
        this.setupResizeEvent();
      }
    }

    if (!this.container) return;

    // Setup container dimensions & structural viewport wrapper
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';

    let viewport = this.container.querySelector('.racket-viewport-wrapper');
    if (!viewport) {
      viewport = document.createElement('div');
      viewport.className = 'racket-viewport-wrapper';
      viewport.style.overflow = 'hidden';
      viewport.style.width = '100%';
      this.container.appendChild(viewport);
    } else {
      viewport.innerHTML = ''; // Clean old slider rails
    }

    const track = document.createElement('div');
    track.className = 'racket-track';
    track.style.display = 'flex';
    track.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    track.style.width = '100%';
    viewport.appendChild(track);

    // Dynamic items per view page depending on responsiveness parameters
    const itemsPerPage = this.getItemsPerPage();
    const originalCount = this.slides.length;
    const paddedSlides = [...this.slides];

    // Align padding sizes dynamically to avoid division remainders
    while (paddedSlides.length % itemsPerPage !== 0) {
      paddedSlides.push(this.slides[paddedSlides.length % originalCount]);
    }
    const totalPages = paddedSlides.length / itemsPerPage;

    // Build responsive dynamic circular buffers (cloned items for infinite scrolling loop)
    const lastPageItems = paddedSlides.slice((totalPages - 1) * itemsPerPage);
    const firstPageItems = paddedSlides.slice(0, itemsPerPage);
    const trackItems = [...lastPageItems, ...paddedSlides, ...firstPageItems];

    trackItems.forEach((slide) => {
      const itemWrapper = document.createElement('div');
      itemWrapper.style.flex = `0 0 calc(100% / ${itemsPerPage})`;
      itemWrapper.style.maxWidth = `calc(100% / ${itemsPerPage})`;
      itemWrapper.style.boxSizing = 'border-box';
      itemWrapper.style.padding = '8px'; // Uniform gap spacing

      if (slide.type === 'dom') {
        // Clone the entire rich card element (maintaining styles, names, text, and images)
        const clone = slide.node.cloneNode(true);
        clone.style.display = ''; // Clear display: none
        clone.style.width = '100%';
        clone.removeAttribute('id'); // Avoid element ID duplication
        itemWrapper.appendChild(clone);
      } else {
        // Render simple fallback image block
        const imgWrapper = document.createElement('div');
        imgWrapper.style.position = 'relative';
        imgWrapper.style.width = '100%';
        imgWrapper.style.overflow = 'hidden';
        imgWrapper.style.borderRadius = '12px';
        imgWrapper.style.aspectRatio = '4/3';
        imgWrapper.style.backgroundColor = '#111827';

        const img = document.createElement('img');
        img.src = slide.url;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        imgWrapper.appendChild(img);
        itemWrapper.appendChild(imgWrapper);
      }

      track.appendChild(itemWrapper);
    });

    this.track = track;

    this.track.addEventListener('transitionend', () => {
      this.isTransitioning = false;
      if (this.currentPage >= totalPages) {
        this.track.style.transition = 'none';
        this.currentPage = 0;
        this.updatePosition();
        this.track.offsetHeight; // Force layout flow reflow
        this.track.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      }
      if (this.currentPage <= -1) {
        this.track.style.transition = 'none';
        this.currentPage = totalPages - 1;
        this.updatePosition();
        this.track.offsetHeight; // Force layout flow reflow
        this.track.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      }
    });

    this.updatePosition();
  }

  /**
   * Transforms slider tracks smoothly relative to target index.
   */
  updatePosition() {
    if (!this.track || this.slides.length === 0) return;
    const itemsPerPage = this.getItemsPerPage();
    const originalCount = this.slides.length;
    const totalPages = Math.ceil(originalCount / itemsPerPage);

    const visualPageIndex = this.currentPage + 1;
    this.track.style.transform = `translateX(-${visualPageIndex * 100}%)`;

    if (this.changeCallback) {
      let normalizedPage = this.currentPage;
      if (normalizedPage >= totalPages) normalizedPage = 0;
      if (normalizedPage < 0) normalizedPage = totalPages - 1;

      this.changeCallback({
        currentIndex: normalizedPage * itemsPerPage,
        pageIndex: normalizedPage,
        totalPages: totalPages,
        interval: this.intervalDuration,
        isPlaying: this.isPlaying,
        isHoverPaused: this.isHoverPaused,
        itemsPerPage: itemsPerPage
      });
    }
  }

  next() {
    if (this.isTransitioning) return this;
    this.isTransitioning = true;
    this.currentPage++;
    this.updatePosition();
    return this;
  }

  prev() {
    if (this.isTransitioning) return this;
    this.isTransitioning = true;
    this.currentPage--;
    this.updatePosition();
    return this;
  }

  startTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.next();
    }, this.intervalDuration);
  }

  play() {
    this.isPlaying = true;
    if (this.isHovered) {
      this.isHoverPaused = true;
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    } else {
      this.isHoverPaused = false;
      this.startTimer();
    }
    this.updatePosition();
    return this;
  }

  stop() {
    this.isPlaying = false;
    this.isHoverPaused = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.updatePosition();
    return this;
  }

  onUpdate(fn) {
    this.changeCallback = fn;
    return this;
  }
}

if (typeof window !== 'undefined') {
  window.Racket = Racket;
  window.racket = new Racket();
}


/**************************
How to use this library
**************************
*/
/*
racket.images(['img1', 'img2', 'img3'])//list of image IDs
racket.duration([2000])//Duration
racket.play()//Start carousel
*/