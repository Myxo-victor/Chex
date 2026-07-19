/**
 * skeleton.js (v1.0.0)
 * Zero-Config DOM-to-Skeleton Compiler
 * 
 * Auto-creates highly accurate shimmer layouts directly from your rendered DOM markup
 * to guarantee zero layout drift (CLS) without writing manual skeleton designs.
 */

class SkeletonLoader {
  constructor(target, options = {}) {
    // Resolve target selector or HTMLElement directly
    this.target = typeof target === 'string' ? document.querySelector(target) : target;
    
    // Default config values
    this.options = {
      speed: options.speed || 1600,            // Shimmer speed in milliseconds
      baseColor: options.baseColor || '#1e293b', // Base placeholder background color (dark slate default)
      varyTextLines: options.varyTextLines !== undefined ? options.varyTextLines : true, // Vary sentence endings
      exclude: options.exclude || [],          // Selectors to skip morphing
      classToKeep: options.classToKeep || [],  // Classes to preserve during layout transfer
      ...options
    };

    this.skeletonClone = null;
    this.isShowing = false;
    this.originalStyles = {
      display: '',
      visibility: ''
    };

    // Calculate light linear gradient contrast shine based on base color
    this.highlightColor = this._computeHighlight(this.options.baseColor);

    // Inject styles dynamically into document head
    this._injectStyles();
  }

  /**
   * Automatically handles injecting visual shimmer keyframes into head to make library Zero-Config
   */
  _injectStyles() {
    const styleId = 'skeleton-loader-shimmer-styles';
    let styleTag = document.getElementById(styleId);
    
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    styleTag.textContent = `
      @keyframes skeleton-shimmer-sweep {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .sk-shimmer-active {
        background-size: 200% 100% !important;
        animation: skeleton-shimmer-sweep ${this.options.speed}ms infinite linear !important;
      }
      .sk-hidden-original {
        display: none !important;
      }
      .sk-faded-text {
        color: transparent !important;
        user-select: none !important;
        pointer-events: none !important;
      }
    `;
  }

  /**
   * Helper algorithm to calculate slightly brighter color tone for gradients
   */
  _computeHighlight(hex) {
    try {
      let cleanHex = hex.replace('#', '');
      if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(char => char + char).join('');
      }
      let r = parseInt(cleanHex.substring(0, 2), 16);
      let g = parseInt(cleanHex.substring(2, 4), 16);
      let b = parseInt(cleanHex.substring(4, 6), 16);

      // Brighten color channel weights
      r = Math.min(255, Math.round(r + 20));
      g = Math.min(255, Math.round(g + 20));
      b = Math.min(255, Math.round(b + 20));

      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch (e) {
      return '#334155'; // Fallback highlight
    }
  }

  /**
   * Core Traversal Engine: Mutates cloned elements into static blocks while maintaining coordinates
   */
  _compileSkeleton(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      
      // Handle user custom skips or ignored blocks
      if (node.hasAttribute('data-skeleton-ignore') || this._shouldExclude(node)) {
        node.style.visibility = 'hidden';
        return;
      }

      // 1. Convert Images and heavy vectors to Solid blocks
      if (node.tagName === 'IMG' || node.tagName === 'svg' || node.classList.contains('avatar') || node.hasAttribute('data-skeleton-img')) {
        this._morphToPlaceholderBlock(node, 'image');
        return;
      }

      // 2. Convert Buttons, Pills & small Badges
      if (node.tagName === 'BUTTON' || node.classList.contains('badge') || node.hasAttribute('data-skeleton-badge')) {
        this._morphToPlaceholderBlock(node, 'badge');
        return;
      }

      // 3. Process direct text lines inside child elements
      const children = Array.from(node.childNodes);
      let containsDirectText = false;

      children.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim().length > 0) {
          containsDirectText = true;
        } else {
          this._compileSkeleton(child);
        }
      });

      // 4. Render block text wireframe bands
      if (containsDirectText && node.children.length === 0) {
        this._morphTextPlaceholder(node);
      }
    }
  }

  /**
   * Converts plain text characters into modern, line-scaled shimmer bars
   */
  _morphTextPlaceholder(element) {
    const originalText = element.textContent.trim();
    element.innerHTML = '';
    element.classList.add('sk-faded-text');

    // Estimate line generation bounds based on string size
    const charactersCount = originalText.length;
    const linesToGenerate = Math.max(1, Math.min(6, Math.round(charactersCount / 65)));

    for (let i = 0; i < linesToGenerate; i++) {
      const textBar = document.createElement('span');
      textBar.style.display = 'block';
      textBar.style.height = '0.7rem';
      textBar.style.marginTop = i === 0 ? '0px' : '6px';
      textBar.style.borderRadius = '0.25rem';
      textBar.style.backgroundColor = this.options.baseColor;
      
      // Calculate layout variance percentages for paragraph look
      if (linesToGenerate > 1 && i === linesToGenerate - 1 && this.options.varyTextLines) {
        textBar.style.width = `${50 + Math.floor(Math.random() * 25)}%`;
      } else if (this.options.varyTextLines && linesToGenerate > 1) {
        textBar.style.width = `${85 + Math.floor(Math.random() * 15)}%`;
      } else {
        textBar.style.width = '100%';
      }

      // Add shimmer transitions
      textBar.classList.add('sk-shimmer-active');
      textBar.style.backgroundImage = `linear-gradient(90deg, ${this.options.baseColor} 25%, ${this.highlightColor} 50%, ${this.options.baseColor} 75%)`;

      element.appendChild(textBar);
    }
  }

  /**
   * Helper to strip sources, colors, and border classes to enforce neutral shapes
   */
  _morphToPlaceholderBlock(element, type) {
    element.innerHTML = '';
    element.style.backgroundImage = 'none';
    element.style.borderColor = 'transparent';
    element.style.backgroundColor = this.options.baseColor;
    element.removeAttribute('src');

    element.classList.add('sk-shimmer-active');
    element.style.backgroundImage = `linear-gradient(90deg, ${this.options.baseColor} 25%, ${this.highlightColor} 50%, ${this.options.baseColor} 75%)`;

    if (type === 'image') {
      element.style.borderRadius = '0.75rem';
      if (!element.style.height && element.clientHeight === 0) {
        element.style.minHeight = '150px'; // Safe aspect boundary
      }
    } else if (type === 'badge') {
      element.style.borderRadius = '9999px';
      element.style.height = '22px';
      element.style.minWidth = '60px';
    }
  }

  _shouldExclude(element) {
    return this.options.exclude.some(selector => element.matches(selector));
  }

  /**
   * Creates the visual skeleton clone and hides original DOM layouts
   */
  start() {
    if (!this.target) {
      console.warn('SkeletonLoader: Target element not found inside current DOM scope.');
      return;
    }
    if (this.isShowing) return;

    // 1. Deep clone target markup layout
    this.skeletonClone = this.target.cloneNode(true);
    this.skeletonClone.classList.add('skeleton-loader-clone');
    this.skeletonClone.setAttribute('aria-busy', 'true');
    this.skeletonClone.setAttribute('role', 'alert');

    // Remove ID tags to prevent duplicate selectors breaking DOM scripts
    this.skeletonClone.removeAttribute('id');
    const childsWithId = this.skeletonClone.querySelectorAll('[id]');
    childsWithId.forEach(el => el.removeAttribute('id'));

    // 2. Transpile the clone nodes to shimmering frames
    this._compileSkeleton(this.skeletonClone);

    // 3. Hide original layouts and inject the skeleton directly adjacent
    this.target.classList.add('sk-hidden-original');
    this.target.parentNode.insertBefore(this.skeletonClone, this.target.nextSibling);

    this.isShowing = true;
  }

  /**
   * Restores original components cleanly and drops simulated skeleton elements
   */
  dismiss() {
    if (!this.isShowing) return;

    if (this.skeletonClone && this.skeletonClone.parentNode) {
      this.skeletonClone.parentNode.removeChild(this.skeletonClone);
    }

    this.target.classList.remove('sk-hidden-original');
    this.isShowing = false;
    this.skeletonClone = null;
  }
}

/**
 * Global factory interface to fulfill simple API requirement:
 * const sk = skeleton.load('#element', { speed: 1600 });
 * sk.start();
 */
const skeleton = {
  load(targetSelector, options = {}) {
    return new SkeletonLoader(targetSelector, options);
  }
};

// Make library accessible to both browser globals & modern module architectures
if (typeof window !== 'undefined') {
  window.skeleton = skeleton;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = skeleton;
}

/**
 * ==============================================================================
 *                         SKELETON.JS DEVELOPER MANUAL
 * ==============================================================================
 * 
 * skeleton.js is a zero-dependency, automated skeleton placeholder generator.
 * It inspects your actual rendered markup and transforms a clone of it into a 
 * proportion-perfect, shimmering skeletal container. This prevents Cumulative 
 * Layout Shift (CLS) on dynamic websites.
 * 
 * ------------------------------------------------------------------------------
 * 1. QUICKEST START (DEFAULT)
 * ------------------------------------------------------------------------------
 * Include this script file in your project, and execute:
 * 
 *   const myLoader = skeleton.load('#my-product-card');
 *   myLoader.start();
 * 
 * ------------------------------------------------------------------------------
 * 2. FULL CONFIGURATION PARAMETERS
 * ------------------------------------------------------------------------------
 * Pass configuration arguments into the second initialization parameter:
 * 
 *   const myLoader = skeleton.load('#my-product-card', {
 *     speed: 1600,             // Shimmer sweep animation loop speed (milliseconds)
 *     baseColor: '#1e293b',    // Background plate color of placeholders (HEX)
 *     varyTextLines: true,     // Give multi-line text paragraphs varied endings
 *     exclude: ['.no-shimmer', 'footer'] // Array of CSS classes/tags to ignore
 *   });
 * 
 * ------------------------------------------------------------------------------
 * 3. COMPLETE REAL-WORLD WORKFLOW EXAMPLE
 * ------------------------------------------------------------------------------
 * Here is how you run skeleton.js during standard API data fetch calls:
 * 
 *   // A. Instantiate and show skeleton over container during network wait
 *   const profileLoader = skeleton.load('#profile-section', {
 *     speed: 1200,
 *     baseColor: '#0f172a'
 *   });
 * 
 *   profileLoader.start(); // This clones your component, morphs it, & hides original
 * 
 *   // B. Call backend resource
 *   fetch('/api/user/profile')
 *     .then(response => response.json())
 *     .then(data => {
 *       // C. Populate layout fields with actual incoming records
 *       document.querySelector('#user-name').textContent = data.name;
 *       document.querySelector('#user-avatar').src = data.avatarUrl;
 *       document.querySelector('#user-bio').textContent = data.bio;
 * 
 *       // D. Simply dismiss the skeleton. The real populated components instantly reappear!
 *       profileLoader.dismiss();
 *     });
 * 
 * ------------------------------------------------------------------------------
 * 4. SPECIFIC SECTOR ATTR OVERRIDES
 * ------------------------------------------------------------------------------
 * If there are elements in your DOM that you want to exclude or control manually,
 * use these simple HTML5 markers inside your template tags:
 * 
 *   <div data-skeleton-ignore="true">
 *      This whole section and its children will become hidden during generation.
 *   </div>
 * 
 *   <div class="custom-card-graphic" data-skeleton-img="true">
 *      This node will automatically represent an image placeholder block.
 *   </div>
 * 
 * ==============================================================================
 */