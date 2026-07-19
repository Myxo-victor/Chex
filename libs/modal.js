/* ==========================================================
   FLEXMODAL: Self-Styling Zero-Dependency Modal Engine
   ========================================================== */
class FlexModal {
  constructor() {
    this.backdrop = null;
    this.container = null;
    this.focusableElements = [];
    this.previouslyFocusedElement = null;
    this.resolvePromise = null;

    this._boundKeyDown = this._handleKeyDown.bind(this);
    this._boundOverlayClick = this._handleOverlayClick.bind(this);

    // Dynamic self-styling injection
    this._injectStyles();
  }

  // Pure CSS Stylesheet Injector (Zero CSS dependencies)
  _injectStyles() {
    const STYLE_ID = 'flexmodal-embedded-styles';
    if (document.getElementById(STYLE_ID)) return;

    const stylesheet = document.createElement('style');
    stylesheet.id = STYLE_ID;
    stylesheet.textContent = `
      .flexmodal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        opacity: 0;
        transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
      }
      .flexmodal-backdrop.is-active {
        opacity: 1;
      }
      .flexmodal-container {
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        width: 100%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
        border: 1px solid #e2e8f0;
        transform: scale(0.95) translateY(12px);
        opacity: 0;
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
        box-sizing: border-box;
      }
      .flexmodal-backdrop.is-active .flexmodal-container {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
      
      /* Slide-Over Right Panel variation */
      .flexmodal-backdrop.slide-over {
        justify-content: flex-end;
        padding: 0;
      }
      .flexmodal-backdrop.slide-over .flexmodal-container {
        height: 100%;
        max-height: 100%;
        border-radius: 0;
        border-left: 1px solid #e2e8f0;
        border-top: none;
        border-bottom: none;
        width: 100%;
        max-width: 400px;
        transform: translateX(100%);
        transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .flexmodal-backdrop.slide-over.is-active .flexmodal-container {
        transform: translateX(0);
      }

      /* Inner UI Styles */
      .flexmodal-body {
        padding: 24px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #1e293b;
        line-height: 1.5;
        box-sizing: border-box;
      }
      .flexmodal-row {
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }
      .flexmodal-column {
        flex: 1;
      }
      .flexmodal-title {
        font-size: 18px;
        font-weight: 700;
        margin: 0 0 6px 0;
        color: #0f172a;
      }
      .flexmodal-subtitle {
        font-size: 14px;
        color: #64748b;
        margin: 0;
      }
      
      /* Icons */
      .flexmodal-icon-box {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .flexmodal-icon-box.informational {
        background-color: #e0f2fe;
        color: #0369a1;
      }
      .flexmodal-icon-box.promise {
        background-color: #dcfce7;
        color: #15803d;
      }
      
      /* Header & Close Action */
      .flexmodal-head-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 16px;
        margin-bottom: 16px;
      }
      .flexmodal-head-title {
        font-size: 18px;
        font-weight: 700;
        margin: 0;
        color: #0f172a;
      }
      .flexmodal-close-icon {
        background: transparent;
        border: none;
        padding: 4px;
        border-radius: 6px;
        cursor: pointer;
        color: #94a3b8;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, color 0.15s;
      }
      .flexmodal-close-icon:hover {
        background-color: #f1f5f9;
        color: #334155;
      }

      /* Buttons & Footer */
      .flexmodal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #f1f5f9;
      }
      .flexmodal-btn {
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        padding: 10px 18px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
        border: none;
        outline: none;
      }
      .flexmodal-btn:focus-visible {
        outline: 2px solid #4f46e5;
        outline-offset: 2px;
      }
      .flexmodal-btn-primary {
        background-color: #4f46e5;
        color: #ffffff;
      }
      .flexmodal-btn-primary:hover {
        background-color: #4338ca;
      }
      .flexmodal-btn-success {
        background-color: #16a34a;
        color: #ffffff;
      }
      .flexmodal-btn-success:hover {
        background-color: #15803d;
      }
      .flexmodal-btn-secondary {
        background-color: #ffffff;
        border: 1px solid #cbd5e1;
        color: #475569;
      }
      .flexmodal-btn-secondary:hover {
        background-color: #f8fafc;
        border-color: #94a3b8;
      }
      .flexmodal-btn-full {
        width: 100%;
      }

      /* Containers for tabs */
      .flexmodal-tabs-container {
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
    `;
    document.head.appendChild(stylesheet);
  }

  // Static entry shortcut
  static open(options) {
    const modal = new FlexModal();
    return modal.open(options);
  }

  open(options = {}) {
    this.options = Object.assign({
      type: 'informational', // informational, promise, slide-over, dynamic
      title: 'Alert Notification',
      subtitle: '',
      button1: 'OK',
      button2: 'Cancel',
      tabs: null,            // HTML string OR HTMLElement node
      html: '',              // Raw HTML for dynamic mode
      closeOnOverlayClick: true,
      closeOnEscape: true
    }, options);

    this.previouslyFocusedElement = document.activeElement;

    // Build the dynamic elements
    this._prepareDOM();

    // Attach keyboard / overlay binders
    if (this.options.closeOnOverlayClick) {
      this.backdrop.addEventListener('click', this._boundOverlayClick);
    }
    if (this.options.closeOnEscape) {
      document.addEventListener('keydown', this._boundKeyDown);
    }

    // Trigger visual transitions
    requestAnimationFrame(() => {
      this.backdrop.classList.add('is-active');
    });

    // Capture focus loop
    this._updateFocusableElements();
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }

    // Auto update any lucide-icons if present in host app
    if (window.lucide) {
      window.lucide.createIcons();
    }

    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  _prepareDOM() {
    this.backdrop = document.createElement('div');
    this.backdrop.className = `flexmodal-backdrop ${this.options.type === 'slide-over' ? 'slide-over' : ''}`;
    this.backdrop.setAttribute('role', 'dialog');
    this.backdrop.setAttribute('aria-modal', 'true');

    this.container = document.createElement('div');
    this.container.className = 'flexmodal-container';
    this.backdrop.appendChild(this.container);

    // Assemble the body markup with pure CSS styles
    const bodyWrapper = document.createElement('div');
    bodyWrapper.className = 'flexmodal-body';

    if (this.options.type === 'slide-over') {
      // Right Slide Drawer Panel
      const headRow = document.createElement('div');
      headRow.className = 'flexmodal-head-row';

      const headTitle = document.createElement('h3');
      headTitle.className = 'flexmodal-head-title';
      headTitle.textContent = this.options.title;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'flexmodal-close-icon';
      closeBtn.onclick = () => this.close(false);
      closeBtn.appendChild(this._svgCloseIcon());

      headRow.appendChild(headTitle);
      headRow.appendChild(closeBtn);

      const contentBox = document.createElement('div');
      contentBox.className = 'flexmodal-column';

      if (this.options.subtitle) {
        const subtitle = document.createElement('p');
        subtitle.className = 'flexmodal-subtitle';
        subtitle.textContent = this.options.subtitle;
        contentBox.appendChild(subtitle);
      }

      const tabsTarget = document.createElement('div');
      tabsTarget.id = 'flexmodal-tabs-target';
      tabsTarget.className = 'flexmodal-tabs-container';
      contentBox.appendChild(tabsTarget);

      const footer = document.createElement('div');
      footer.className = 'flexmodal-footer';

      const footerBtn = document.createElement('button');
      footerBtn.className = 'flexmodal-btn flexmodal-btn-primary flexmodal-btn-full';
      footerBtn.onclick = () => this.close(true);
      footerBtn.textContent = this.options.button1;
      footer.appendChild(footerBtn);

      bodyWrapper.appendChild(headRow);
      bodyWrapper.appendChild(contentBox);
      bodyWrapper.appendChild(footer);

    } else if (this.options.type === 'dynamic') {
      // Custom Dynamic Injected Canvas
      const headRow = document.createElement('div');
      headRow.className = 'flexmodal-head-row';

      const headTitle = document.createElement('h3');
      headTitle.className = 'flexmodal-head-title';
      headTitle.textContent = this.options.title;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'flexmodal-close-icon';
      closeBtn.onclick = () => this.close(false);
      closeBtn.appendChild(this._svgCloseIcon());

      headRow.appendChild(headTitle);
      headRow.appendChild(closeBtn);

      const dynamicContentWrapper = document.createElement('div');
      dynamicContentWrapper.style.margin = '16px 0';
      if (typeof this.options.html === 'string') {
        dynamicContentWrapper.innerHTML = this.options.html;
      } else if (this.options.html instanceof HTMLElement) {
        dynamicContentWrapper.appendChild(this.options.html);
      }

      const footer = document.createElement('div');
      footer.className = 'flexmodal-footer';

      const footerBtn = document.createElement('button');
      footerBtn.className = 'flexmodal-btn flexmodal-btn-primary';
      footerBtn.onclick = () => this.close(true);
      footerBtn.textContent = this.options.button1;
      footer.appendChild(footerBtn);

      bodyWrapper.appendChild(headRow);
      bodyWrapper.appendChild(dynamicContentWrapper);
      bodyWrapper.appendChild(footer);

    } else {
      // Informational & Promise Standard Dialog Box
      const isPromise = this.options.type === 'promise';
      const iconClass = isPromise ? 'promise' : 'informational';
      
      const row = document.createElement('div');
      row.className = 'flexmodal-row';

      const iconBox = document.createElement('div');
      iconBox.className = `flexmodal-icon-box ${iconClass}`;
      iconBox.appendChild(isPromise ? this._svgPromiseIcon() : this._svgAlertIcon());

      const column = document.createElement('div');
      column.className = 'flexmodal-column';

      const title = document.createElement('h3');
      title.className = 'flexmodal-title';
      title.textContent = this.options.title;
      column.appendChild(title);

      if (this.options.subtitle) {
        const subtitle = document.createElement('p');
        subtitle.className = 'flexmodal-subtitle';
        subtitle.textContent = this.options.subtitle;
        column.appendChild(subtitle);
      }

      row.appendChild(iconBox);
      row.appendChild(column);

      const footer = document.createElement('div');
      footer.className = 'flexmodal-footer';

      if (isPromise) {
        const btnSecondary = document.createElement('button');
        btnSecondary.className = 'flexmodal-btn flexmodal-btn-secondary';
        btnSecondary.onclick = () => this.close(false);
        btnSecondary.textContent = this.options.button2;
        footer.appendChild(btnSecondary);
      }

      const btnPrimary = document.createElement('button');
      btnPrimary.className = `flexmodal-btn ${isPromise ? 'flexmodal-btn-success' : 'flexmodal-btn-primary'}`;
      btnPrimary.onclick = () => this.close(true);
      btnPrimary.textContent = this.options.button1;
      footer.appendChild(btnPrimary);

      bodyWrapper.appendChild(row);
      bodyWrapper.appendChild(footer);
    }

    this.container.appendChild(bodyWrapper);

    // Inject tabs element node if applicable
    if (this.options.type === 'slide-over' && this.options.tabs) {
      const target = this.container.querySelector('#flexmodal-tabs-target');
      if (target) {
        if (this.options.tabs instanceof HTMLElement) {
          target.appendChild(this.options.tabs);
        } else {
          target.innerHTML = this.options.tabs;
        }
      }
    }

    document.body.appendChild(this.backdrop);
  }

  /* Internal SVGs to ensure zero-dependencies */
  _svgCloseIcon() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    return wrapper.firstChild;
  }

  _svgAlertIcon() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    return wrapper.firstChild;
  }

  _svgPromiseIcon() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    return wrapper.firstChild;
  }

  close(resultVal = false) {
    if (!this.backdrop) return;

    this.backdrop.classList.remove('is-active');

    // Tear down elements after transitions
    setTimeout(() => {
      this._destroy(resultVal);
    }, 250);
  }

  _destroy(resultVal) {
    if (this.options.closeOnOverlayClick && this.backdrop) {
      this.backdrop.removeEventListener('click', this._boundOverlayClick);
    }
    if (this.options.closeOnEscape) {
      document.removeEventListener('keydown', this._boundKeyDown);
    }

    if (this.backdrop && this.backdrop.parentNode) {
      this.backdrop.parentNode.removeChild(this.backdrop);
    }

    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus();
    }

    if (this.resolvePromise) {
      this.resolvePromise(resultVal);
    }
  }

  _handleOverlayClick(e) {
    if (e.target === this.backdrop) {
      this.close(false);
    }
  }

  _handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.close(false);
      return;
    }

    if (e.key === 'Tab') {
      this._updateFocusableElements();
      if (this.focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const first = this.focusableElements[0];
      const last = this.focusableElements[this.focusableElements.length - 1];

      if (e.shiftKey) { // Back Tab
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else { // Forward Tab
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }
  }

  _updateFocusableElements() {
    const query = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    this.focusableElements = Array.from(this.container.querySelectorAll(query))
      .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }
}

// Global hook injection
window.modal = FlexModal;


/*****************************
 * How to use this library: Use anyone of your choice below to open a modal. The modal returns a Promise that resolves to true or false depending on the user's action.
 *****************************
 */

 //For informational modal:
 //Use this when you want to show a clean message box to the user with a single action button.
 /* modal.open({
    type: 'informational',
    title: 'Welcome to My App',
    subtitle: 'In this app you can enjoy free gifts, I hope this finds you well!',
    button1: 'Awesome, got it!'
    }).then((dismissed) => {
    console.log("Modal closed:", dismissed); // Returns true when button1 is clicked
    });
*/

//  For promise modal:
//Use this for dual-option operations (such as destructive actions). It returns a native JavaScript Promise resolving to true (primary button clicked) or false (secondary button clicked, backdrop clicked, or Escape pressed).
/*
   modal.open({
   type: 'promise',
   title: 'Confirm Critical Settings',
   subtitle: 'Are you sure you want to deploy these configuration files to production?',
   button1: 'Deploy Now',
   button2: 'Review Changes'
   }).then((confirmed) => {
   if (confirmed) {
    console.log("Proceed with deployment...");
   } else {
    console.log("User cancelled execution.");
   }
   });

*/


//For slide-over modal:
//Use this for a right-side slide-over panel with optional tabbed content. It returns a native JavaScript Promise resolving to true (primary button clicked) or false (secondary button clicked, backdrop clicked, or Escape pressed).
/*
   modal.open({
   type: 'slide-over',
   title: 'Settings Panel',
   subtitle: 'Adjust your preferences below.',
   button1: 'Save Changes',
   button2: 'Cancel',
   tabs: '<div>Tab 1 Content</div><div>Tab 2 Content</div>'
   }).then((confirmed) => {
   if (confirmed) {
    console.log("Changes saved.");
   } else {
    console.log("User cancelled changes.");
   }
   });
*/

//For dynamic modal:
//Use this for a fully custom modal with your own HTML content. It returns a native JavaScript Promise resolving to true (primary button clicked) or false (secondary button clicked, backdrop clicked, or Escape pressed).
/*
   modal.open({
   type: 'dynamic',
   title: 'Custom Modal',
   html: '<p>This is a custom modal with your own HTML content.</p><input type="text" placeholder="Enter something...">',
   button1: 'Submit'
   }).then((confirmed) => {
   if (confirmed) {
    console.log("User submitted the form.");
   } else {
    console.log("User closed the modal without submitting.");
   }
   });
*/

