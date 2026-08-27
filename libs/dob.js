/* ==========================================================================
   dob.js — Production-Ready Zero-Dependency Smart Date-of-Birth Picker Library
   ========================================================================== */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory()) :
    (global.dob = factory());
}(this, (function () { 'use strict';

    /* ==========================================================================
       1. Constants & Scoped Styles
       ========================================================================== */
    const STYLE_ID = 'dobjs-styles';
    const CSS_STYLES = `
        :root {
            --dobjs-primary: #2563eb;
            --dobjs-primary-hover: #1d4ed8;
            --dobjs-bg: #ffffff;
            --dobjs-surface: #f8fafc;
            --dobjs-text: #0f172a;
            --dobjs-text-muted: #64748b;
            --dobjs-border: #cbd5e1;
            --dobjs-radius: 12px;
            --dobjs-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            --dobjs-error: #ef4444;
            --dobjs-focus-ring: rgba(37, 99, 235, 0.15);
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --dobjs-primary: #3b82f6;
                --dobjs-primary-hover: #2563eb;
                --dobjs-bg: #0f172a;
                --dobjs-surface: #1e293b;
                --dobjs-text: #f8fafc;
                --dobjs-text-muted: #94a3b8;
                --dobjs-border: #334155;
                --dobjs-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                --dobjs-error: #f87171;
                --dobjs-focus-ring: rgba(59, 130, 246, 0.25);
            }
        }

        .dobjs-dropdown {
            position: absolute;
            top: 0;
            left: 0;
            width: 340px;
            max-width: 95vw;
            background: var(--dobjs-bg);
            border: 1px solid var(--dobjs-border);
            border-radius: var(--dobjs-radius);
            box-shadow: var(--dobjs-shadow);
            padding: 20px;
            z-index: 2147483647;
            display: none;
            box-sizing: border-box;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            animation: dobjsFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            color: var(--dobjs-text);
        }

        .dobjs-dropdown *, .dobjs-dropdown *::before, .dobjs-dropdown *::after {
            box-sizing: border-box;
        }

        .dobjs-dropdown.dobjs-open {
            display: block;
        }

        @keyframes dobjsFadeIn {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .dobjs-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--dobjs-border);
        }

        .dobjs-back-btn, .dobjs-close-btn {
            background: none;
            border: none;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--dobjs-primary);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;
            transition: background-color 0.15s;
        }

        .dobjs-back-btn:hover, .dobjs-close-btn:hover {
            background-color: var(--dobjs-surface);
        }

        .dobjs-title {
            font-size: 1rem;
            font-weight: 700;
            color: var(--dobjs-text);
            margin: 0;
        }

        .dobjs-month-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
        }

        .dobjs-button-month {
            padding: 12px 8px;
            background: var(--dobjs-surface);
            border: 1px solid transparent;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            color: var(--dobjs-text);
            cursor: pointer;
            transition: all 0.15s ease;
            text-align: center;
        }

        .dobjs-button-month:hover {
            background: var(--dobjs-primary);
            color: #ffffff;
        }

        .dobjs-day-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 6px;
            max-height: 240px;
            overflow-y: auto;
            padding-right: 2px;
        }

        .dobjs-button-day {
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--dobjs-surface);
            border: 1px solid transparent;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 500;
            color: var(--dobjs-text);
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .dobjs-button-day:hover:not(:disabled) {
            background: var(--dobjs-primary);
            color: #ffffff;
        }

        .dobjs-button-day:disabled, .dobjs-button-month:disabled, .dobjs-button-year:disabled {
            opacity: 0.35;
            cursor: not-allowed;
            background: var(--dobjs-surface);
        }

        .dobjs-year-controls {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        .dobjs-decade-nav {
            background: var(--dobjs-surface);
            border: 1px solid var(--dobjs-border);
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            color: var(--dobjs-text);
            font-size: 0.85rem;
        }

        .dobjs-decade-nav:hover:not(:disabled) {
            background: var(--dobjs-border);
        }

        .dobjs-year-search {
            width: 100%;
            padding: 10px 12px;
            margin-bottom: 12px;
            background: var(--dobjs-bg);
            color: var(--dobjs-text);
            border: 1px solid var(--dobjs-border);
            border-radius: 8px;
            font-size: 0.9rem;
            outline: none;
            transition: border-color 0.15s, box-shadow 0.15s;
        }

        .dobjs-year-search:focus {
            border-color: var(--dobjs-primary);
            box-shadow: 0 0 0 3px var(--dobjs-focus-ring);
        }

        .dobjs-year-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            max-height: 220px;
            overflow-y: auto;
            padding-right: 2px;
        }

        .dobjs-button-year {
            padding: 10px 4px;
            background: var(--dobjs-surface);
            border: 1px solid transparent;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            color: var(--dobjs-text);
            cursor: pointer;
            text-align: center;
            transition: all 0.15s ease;
        }

        .dobjs-button-year:hover:not(:disabled) {
            background: var(--dobjs-primary);
            color: #ffffff;
        }

        .dobjs-error-msg {
            font-size: 0.8rem;
            color: var(--dobjs-error);
            margin-top: 10px;
            font-weight: 500;
            text-align: center;
        }

        @media (max-width: 480px) {
            .dobjs-dropdown {
                position: fixed !important;
                bottom: 0 !important;
                left: 0 !important;
                top: auto !important;
                width: 100% !important;
                max-width: 100% !important;
                border-bottom-left-radius: 0 !important;
                border-bottom-right-radius: 0 !important;
                border-top-left-radius: 20px !important;
                border-top-right-radius: 20px !important;
                box-shadow: 0 -10px 30px rgba(0,0,0,0.2) !important;
                animation: dobjsSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                padding: 24px 20px 32px 20px;
            }
            @keyframes dobjsSlideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
            }
        }
    `;

    /* ==========================================================================
       2. Style Injection
       ========================================================================== */
    function injectStyles() {
        if (!document.getElementById(STYLE_ID)) {
            const styleEl = document.createElement('style');
            styleEl.id = STYLE_ID;
            styleEl.textContent = CSS_STYLES;
            document.head.appendChild(styleEl);
        }
    }

    /* ==========================================================================
       3. Date & Constraint Utilities
       ========================================================================== */
    const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }

    function getDaysInMonth(month, year) {
        const daysMap = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        return daysMap[month];
    }

    function parseDateString(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return null;
        const parts = dateStr.split('-');
        if (parts.length !== 3) return null;
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
        if (m < 0 || m > 11 || d < 1 || d > getDaysInMonth(m, y)) return null;
        return new Date(y, m, d);
    }

    function formatDate(year, month, day, format) {
        const dStr = String(day).padStart(2, '0');
        const mStr = String(month + 1).padStart(2, '0');
        const mName = MONTH_NAMES[month];
        const mAbbr = MONTH_ABBR[month];
        const yStr = String(year);

        switch (format) {
            case 'DD/MM/YYYY':
                return `${dStr}/${mStr}/${yStr}`;
            case 'MM/DD/YYYY':
                return `${mStr}/${dStr}/${yStr}`;
            case 'YYYY-MM-DD':
                return `${yStr}-${mStr}-${dStr}`;
            case 'DD MMM YYYY':
            default:
                return `${day} ${mAbbr} ${yStr}`;
        }
    }

    /* ==========================================================================
       4. Registry & Global Event Management
       ========================================================================== */
    const registry = new Map();
    let globalListenersInitialized = false;
    let rafId = null;

    function handleGlobalClick(e) {
        let clickedInsideAny = false;
        registry.forEach((instance) => {
            if (instance.isOpen) {
                if (instance.dropdownElement.contains(e.target) || instance.inputElement.contains(e.target)) {
                    clickedInsideAny = true;
                }
            }
        });
        if (!clickedInsideAny) {
            dob.closeAll();
        }
    }

    function handleGlobalScrollResize() {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            rafId = null;
            registry.forEach(instance => {
                if (instance.isOpen) {
                    instance._positionDropdown();
                }
            });
        });
    }

    function initGlobalListeners() {
        if (globalListenersInitialized) return;
        document.addEventListener('click', handleGlobalClick);
        window.addEventListener('resize', handleGlobalScrollResize);
        window.addEventListener('scroll', handleGlobalScrollResize, true);
        globalListenersInitialized = true;
    }

    function removeGlobalListenersIfNeeded() {
        if (registry.size === 0 && globalListenersInitialized) {
            document.removeEventListener('click', handleGlobalClick);
            window.removeEventListener('resize', handleGlobalScrollResize);
            window.removeEventListener('scroll', handleGlobalScrollResize, true);
            globalListenersInitialized = false;
        }
    }

    /* ==========================================================================
       5. DOBPickerInstance Class
       ========================================================================== */
    class DOBPickerInstance {
        constructor(inputEl, options = {}) {
            this.inputElement = inputEl;
            
            // Resolve options with dataset fallbacks
            const dsMinAge = inputEl.getAttribute('data-min-age');
            const dsMaxAge = inputEl.getAttribute('data-max-age');
            const dsMinDate = inputEl.getAttribute('data-min-date');
            const dsMaxDate = inputEl.getAttribute('data-max-date');
            const dsFormat = inputEl.getAttribute('data-format');

            this.options = Object.assign({
                minAge: dsMinAge !== null ? parseInt(dsMinAge, 10) : 0,
                maxAge: dsMaxAge !== null ? parseInt(dsMaxAge, 10) : 120,
                minDate: dsMinDate || null,
                maxDate: dsMaxDate || null,
                format: dsFormat || 'DD MMM YYYY',
                onChange: null,
                onOpen: null,
                onClose: null
            }, options);

            this.selectedMonth = null; // 0 - 11
            this.selectedDay = null;   // 1 - 31
            this.selectedYear = null;  // YYYY
            
            this.currentDecadeStart = null;
            this.isOpen = false;
            this.step = 'month'; // 'month' | 'day' | 'year'
            this.errorMessage = '';

            this._init();
        }

        _init() {
            injectStyles();
            initGlobalListeners();

            if (!this.inputElement.placeholder) {
                this.inputElement.placeholder = "Select date of birth";
            }
            this.inputElement.setAttribute('aria-haspopup', 'true');
            this.inputElement.setAttribute('aria-expanded', 'false');
            this.inputElement.setAttribute('autocomplete', 'off');

            // Handle Form Submission Cleanly: Create or link hidden canonical input if input has name
            const originalName = this.inputElement.getAttribute('name');
            if (originalName) {
                this.inputElement.removeAttribute('name');
                this.hiddenInput = document.createElement('input');
                this.hiddenInput.type = 'hidden';
                this.hiddenInput.name = originalName;
                this.inputElement.parentNode.insertBefore(this.hiddenInput, this.inputElement.nextSibling);
            }

            // Create Dropdown Container and append directly to document.body
            this.dropdownElement = document.createElement('div');
            this.dropdownElement.className = 'dobjs-dropdown';
            this.dropdownElement.setAttribute('role', 'dialog');
            this.dropdownElement.setAttribute('aria-modal', 'true');
            document.body.appendChild(this.dropdownElement);

            // Bind Event Listeners
            this._boundInputClick = (e) => {
                e.stopPropagation();
                if (!this.isOpen) {
                    dob.closeAll();
                    this.open();
                }
            };

            this._boundInputKeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!this.isOpen) {
                        dob.closeAll();
                        this.open();
                    } else {
                        this.close();
                        this.inputElement.focus();
                    }
                } else if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                    this.inputElement.focus();
                }
            };

            this.inputElement.addEventListener('click', this._boundInputClick);
            this.inputElement.addEventListener('keydown', this._boundInputKeydown);

            this._updateConstraints();
        }

        _updateConstraints() {
            const today = new Date();
            this.todayYear = today.getFullYear();
            this.todayMonth = today.getMonth();
            this.todayDay = today.getDate();

            // Exact Age constraints
            this.maxAllowedBirthDate = new Date(this.todayYear - this.options.minAge, this.todayMonth, this.todayDay);
            this.minAllowedBirthDate = new Date(this.todayYear - this.options.maxAge, this.todayMonth, this.todayDay);

            if (this.options.minDate) {
                const parsedMin = parseDateString(this.options.minDate);
                if (parsedMin && parsedMin > this.minAllowedBirthDate) {
                    this.minAllowedBirthDate = parsedMin;
                }
            }

            if (this.options.maxDate) {
                const parsedMax = parseDateString(this.options.maxDate);
                if (parsedMax && parsedMax < this.maxAllowedBirthDate) {
                    this.maxAllowedBirthDate = parsedMax;
                }
            }

            this.minAllowedYear = this.minAllowedBirthDate.getFullYear();
            this.maxAllowedYear = this.maxAllowedBirthDate.getFullYear();
        }

        open() {
            if (this.isOpen) return;
            this._updateConstraints();
            this.isOpen = true;
            this.dropdownElement.classList.add('dobjs-open');
            this.inputElement.setAttribute('aria-expanded', 'true');
            this._positionDropdown();
            this._render();

            if (typeof this.options.onOpen === 'function') {
                this.options.onOpen();
            }
        }

        close() {
            if (!this.isOpen) return;
            this.isOpen = false;
            this.dropdownElement.classList.remove('dobjs-open');
            this.inputElement.setAttribute('aria-expanded', 'false');

            if (typeof this.options.onClose === 'function') {
                this.options.onClose();
            }
        }

        clear() {
            this.selectedMonth = null;
            this.selectedDay = null;
            this.selectedYear = null;
            this.step = 'month';
            this.errorMessage = '';
            this.inputElement.value = '';
            if (this.hiddenInput) {
                this.hiddenInput.value = '';
            }
            if (this.isOpen) {
                this._render();
            }
        }

        getCanonicalValue() {
            if (this.selectedYear !== null && this.selectedMonth !== null && this.selectedDay !== null) {
                const m = String(this.selectedMonth + 1).padStart(2, '0');
                const d = String(this.selectedDay).padStart(2, '0');
                return `${this.selectedYear}-${m}-${d}`;
            }
            return null;
        }

        getDisplayValue() {
            if (this.selectedYear !== null && this.selectedMonth !== null && this.selectedDay !== null) {
                return formatDate(this.selectedYear, this.selectedMonth, this.selectedDay, this.options.format);
            }
            return null;
        }

        isValid() {
            const canonical = this.getCanonicalValue();
            if (!canonical) return false;
            const d = parseDateString(canonical);
            if (!d) return false;
            return d >= this.minAllowedBirthDate && d <= this.maxAllowedBirthDate;
        }

        _isMobile() {
            return window.innerWidth <= 480;
        }

        _positionDropdown() {
            if (this._isMobile()) {
                this.dropdownElement.style.top = '';
                this.dropdownElement.style.left = '';
                return;
            }

            const rect = this.inputElement.getBoundingClientRect();
            const dropHeight = this.dropdownElement.offsetHeight || 320;
            const dropWidth = this.dropdownElement.offsetWidth || 340;
            
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            let topPos;
            if (spaceBelow < dropHeight && spaceAbove > dropHeight) {
                topPos = window.scrollY + rect.top - dropHeight - 6;
            } else {
                topPos = window.scrollY + rect.bottom + 6;
            }

            let leftPos = window.scrollX + rect.left;
            if (leftPos + dropWidth > window.innerWidth - 12) {
                leftPos = window.innerWidth - dropWidth - 12;
                if (leftPos < 12) leftPos = 12;
            }

            this.dropdownElement.style.top = `${topPos}px`;
            this.dropdownElement.style.left = `${leftPos}px`;
        }

        _render() {
            let contentHTML = '';

            switch (this.step) {
                case 'month':
                    contentHTML = this._renderMonthStep();
                    break;
                case 'day':
                    contentHTML = this._renderDayStep();
                    break;
                case 'year':
                    contentHTML = this._renderYearStep();
                    break;
            }

            this.dropdownElement.innerHTML = contentHTML;
            this._bindStepEvents();

            if (!this._isMobile()) {
                setTimeout(() => this._positionDropdown(), 0);
            }
        }

        _renderMonthStep() {
            let monthsHTML = MONTH_NAMES.map((m, idx) => `
                <button type="button" class="dobjs-button-month" data-month="${idx}">
                    ${m.substring(0, 3)}
                </button>
            `).join('');

            return `
                <div class="dobjs-header">
                    <h3 class="dobjs-title">Select birth month</h3>
                    <button type="button" class="dobjs-close-btn" id="dobjsCloseBtn" aria-label="Close picker">✕</button>
                </div>
                <div class="dobjs-month-grid">
                    ${monthsHTML}
                </div>
                ${this.errorMessage ? `<div class="dobjs-error-msg">${this.errorMessage}</div>` : ''}
            `;
        }

        _renderDayStep() {
            const monthName = MONTH_NAMES[this.selectedMonth];
            const testYear = this.selectedYear !== null ? this.selectedYear : this.maxAllowedYear;
            const daysInMonth = getDaysInMonth(this.selectedMonth, testYear);

            let daysHTML = '';
            for (let d = 1; d <= daysInMonth; d++) {
                daysHTML += `
                    <button type="button" class="dobjs-button-day" data-day="${d}">
                        ${d}
                    </button>
                `;
            }

            return `
                <div class="dobjs-header">
                    <button type="button" class="dobjs-back-btn" id="dobjsBackBtn" aria-label="Back to month">← Month</button>
                    <h3 class="dobjs-title">${monthName}</h3>
                    <button type="button" class="dobjs-close-btn" id="dobjsCloseBtn" aria-label="Close picker">✕</button>
                </div>
                <div class="dobjs-day-grid">
                    ${daysHTML}
                </div>
                ${this.errorMessage ? `<div class="dobjs-error-msg">${this.errorMessage}</div>` : ''}
            `;
        }

        _renderYearStep() {
            if (this.currentDecadeStart === null) {
                const baseYear = this.selectedYear !== null ? this.selectedYear : this.maxAllowedYear;
                this.currentDecadeStart = Math.floor(baseYear / 10) * 10;
            }

            let yearsHTML = '';
            for (let y = this.currentDecadeStart + 9; y >= this.currentDecadeStart; y--) {
                const isDisabled = (y > this.maxAllowedYear || y < this.minAllowedYear);
                yearsHTML += `
                    <button type="button" class="dobjs-button-year" data-year="${y}" ${isDisabled ? 'disabled' : ''}>
                        ${y}
                    </button>
                `;
            }

            return `
                <div class="dobjs-header">
                    <button type="button" class="dobjs-back-btn" id="dobjsBackBtn" aria-label="Back to day">← Day</button>
                    <h3 class="dobjs-title">Select year</h3>
                    <button type="button" class="dobjs-close-btn" id="dobjsCloseBtn" aria-label="Close picker">✕</button>
                </div>
                <input type="text" class="dobjs-year-search" id="dobjsYearSearch" placeholder="Search year (e.g. 2002)..." autocomplete="off" />
                <div class="dobjs-year-controls">
                    <button type="button" class="dobjs-decade-nav" id="dobjsPrevDecade">‹ ${this.currentDecadeStart - 10}s</button>
                    <span style="font-weight: 700; font-size: 0.85rem;">${this.currentDecadeStart}s Era</span>
                    <button type="button" class="dobjs-decade-nav" id="dobjsNextDecade">${this.currentDecadeStart + 10}s ›</button>
                </div>
                <div class="dobjs-year-grid" id="dobjsYearGridContainer">
                    ${yearsHTML}
                </div>
                ${this.errorMessage ? `<div class="dobjs-error-msg" id="dobjsErrorMsg">${this.errorMessage}</div>` : ''}
            `;
        }

        _updateYearGridView() {
            const gridContainer = this.dropdownElement.querySelector('#dobjsYearGridContainer');
            if (!gridContainer) return;

            let yearsHTML = '';
            for (let y = this.currentDecadeStart + 9; y >= this.currentDecadeStart; y--) {
                const isDisabled = (y > this.maxAllowedYear || y < this.minAllowedYear);
                yearsHTML += `
                    <button type="button" class="dobjs-button-year" data-year="${y}" ${isDisabled ? 'disabled' : ''}>
                        ${y}
                    </button>
                `;
            }
            gridContainer.innerHTML = yearsHTML;

            const decadeLabel = this.dropdownElement.querySelector('.dobjs-year-controls span');
            if (decadeLabel) {
                decadeLabel.textContent = `${this.currentDecadeStart}s Era`;
            }
            const prevBtn = this.dropdownElement.querySelector('#dobjsPrevDecade');
            if (prevBtn) prevBtn.textContent = `‹ ${this.currentDecadeStart - 10}s`;
            const nextBtn = this.dropdownElement.querySelector('#dobjsNextDecade');
            if (nextBtn) nextBtn.textContent = `${this.currentDecadeStart + 10}s ›`;

            this._bindYearGridButtons();
        }

        _bindYearGridButtons() {
            this.dropdownElement.querySelectorAll('.dobjs-button-year').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const chosenYear = parseInt(e.target.getAttribute('data-year'), 10);
                    this._validateAndComplete(chosenYear);
                });
            });
        }

        _bindStepEvents() {
            const closeBtn = this.dropdownElement.querySelector('#dobjsCloseBtn');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.close();
                    this.inputElement.focus();
                });
            }

            const backBtn = this.dropdownElement.querySelector('#dobjsBackBtn');
            if (backBtn) {
                backBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.errorMessage = '';
                    if (this.step === 'day') {
                        this.step = 'month';
                    } else if (this.step === 'year') {
                        this.step = 'day';
                    }
                    this._render();
                });
            }

            if (this.step === 'month') {
                this.dropdownElement.querySelectorAll('.dobjs-button-month').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectedMonth = parseInt(e.target.getAttribute('data-month'), 10);
                        this.errorMessage = '';
                        this.step = 'day';
                        this._render();
                    });
                });
            } else if (this.step === 'day') {
                this.dropdownElement.querySelectorAll('.dobjs-button-day').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectedDay = parseInt(e.target.getAttribute('data-day'), 10);
                        this.errorMessage = '';
                        this.step = 'year';
                        this._render();
                    });
                });
            } else if (this.step === 'year') {
                this._bindYearGridButtons();

                const prevDecadeBtn = this.dropdownElement.querySelector('#dobjsPrevDecade');
                const nextDecadeBtn = this.dropdownElement.querySelector('#dobjsNextDecade');

                if (prevDecadeBtn) {
                    prevDecadeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.currentDecadeStart -= 10;
                        this._updateYearGridView();
                    });
                }
                if (nextDecadeBtn) {
                    nextDecadeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.currentDecadeStart += 10;
                        this._updateYearGridView();
                    });
                }

                // Non-destructive live Year Search Input
                const searchInput = this.dropdownElement.querySelector('#dobjsYearSearch');
                if (searchInput) {
                    searchInput.addEventListener('click', (e) => e.stopPropagation());
                    searchInput.addEventListener('input', (e) => {
                        e.stopPropagation();
                        const val = e.target.value.trim();
                        if (val.length === 4 && !isNaN(val)) {
                            const targetYear = parseInt(val, 10);
                            if (targetYear >= this.minAllowedYear && targetYear <= this.maxAllowedYear) {
                                this.currentDecadeStart = Math.floor(targetYear / 10) * 10;
                                this._updateYearGridView();
                                const targetBtn = this.dropdownElement.querySelector(`[data-year="${targetYear}"]`);
                                if (targetBtn) {
                                    targetBtn.style.background = 'var(--dobjs-primary)';
                                    targetBtn.style.color = '#fff';
                                }
                            }
                        }
                    });

                    searchInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.target.value.trim();
                            if (val.length === 4 && !isNaN(val)) {
                                const targetYear = parseInt(val, 10);
                                if (targetYear >= this.minAllowedYear && targetYear <= this.maxAllowedYear) {
                                    this._validateAndComplete(targetYear);
                                } else {
                                    this.errorMessage = `Year ${targetYear} is outside allowed range (${this.minAllowedYear}-${this.maxAllowedYear}).`;
                                    let errEl = this.dropdownElement.querySelector('#dobjsErrorMsg');
                                    if (!errEl) {
                                        errEl = document.createElement('div');
                                        errEl.className = 'dobjs-error-msg';
                                        errEl.id = 'dobjsErrorMsg';
                                        this.dropdownElement.appendChild(errEl);
                                    }
                                    errEl.textContent = this.errorMessage;
                                }
                            }
                        }
                    });
                }
            }
        }

        _validateAndComplete(chosenYear) {
            if (this.selectedMonth === 1 && this.selectedDay === 29) {
                if (!isLeapYear(chosenYear)) {
                    this.errorMessage = `${chosenYear} is not a leap year (Feb has 28 days). Please choose another day.`;
                    this.step = 'day';
                    this.selectedDay = null;
                    this._render();
                    return;
                }
            }

            this._updateConstraints();
            const dobDate = new Date(chosenYear, this.selectedMonth, this.selectedDay);

            if (dobDate > this.maxAllowedBirthDate) {
                this.errorMessage = `Must be at least ${this.options.minAge} years old.`;
                this.step = 'year';
                this._render();
                return;
            }

            if (dobDate < this.minAllowedBirthDate) {
                this.errorMessage = `Birth date cannot exceed maximum allowed limit.`;
                this.step = 'year';
                this._render();
                return;
            }

            this.selectedYear = chosenYear;
            this.errorMessage = '';
            
            const canonicalVal = this.getCanonicalValue();
            const displayVal = this.getDisplayValue();

            this.inputElement.value = displayVal;
            if (this.hiddenInput) {
                this.hiddenInput.value = canonicalVal;
            }

            this.close();
            this.inputElement.focus();

            if (typeof this.options.onChange === 'function') {
                this.options.onChange(canonicalVal);
            }

            this.inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        }

        destroy() {
            this.inputElement.removeEventListener('click', this._boundInputClick);
            this.inputElement.removeEventListener('keydown', this._boundInputKeydown);
            
            if (this.dropdownElement) {
                this.dropdownElement.remove();
            }
            if (this.hiddenInput) {
                this.hiddenInput.remove();
            }
            // Restore original name attribute if present
            if (this.inputElement._originalName) {
                this.inputElement.setAttribute('name', this.inputElement._originalName);
            }
        }
    }

    /* ==========================================================================
       6. Public API Definition
       ========================================================================== */
    const dob = {
        pick(selectorOrEl, options = {}) {
            let elements = [];
            if (typeof selectorOrEl === 'string') {
                elements = Array.from(document.querySelectorAll(selectorOrEl));
            } else if (selectorOrEl instanceof Element) {
                elements = [selectorOrEl];
            }

            const instances = [];

            elements.forEach(el => {
                if (!el) return;
                if (registry.has(el)) {
                    instances.push(registry.get(el));
                    return;
                }
                const instance = new DOBPickerInstance(el, options);
                registry.set(el, instance);
                instances.push(instance);
            });

            return instances.length === 1 ? instances[0] : instances;
        },

        getInstance(selectorOrEl) {
            let el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
            if (!el) return null;
            return registry.get(el) || null;
        },

        getDob(selectorOrEl) {
            const instance = dob.getInstance(selectorOrEl);
            if (instance) {
                return instance.getCanonicalValue();
            }
            const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
            if (el && el.value) {
                const parsed = parseDateString(el.value);
                if (parsed) {
                    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
                }
            }
            return null;
        },

        getDisplay(selectorOrEl) {
            const instance = dob.getInstance(selectorOrEl);
            if (instance) {
                return instance.getDisplayValue();
            }
            const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
            return el ? el.value || null : null;
        },

        isValid(selectorOrEl) {
            const instance = dob.getInstance(selectorOrEl);
            if (instance) {
                return instance.isValid();
            }
            return false;
        },

        clear(selectorOrEl) {
            const instance = dob.getInstance(selectorOrEl);
            if (instance) {
                instance.clear();
            }
        },

        open(selectorOrEl) {
            const instance = dob.getInstance(selectorOrEl);
            if (instance) {
                dob.closeAll();
                instance.open();
            }
        },

        close(selectorOrEl) {
            const instance = dob.getInstance(selectorOrEl);
            if (instance) {
                instance.close();
            }
        },

        destroy(selectorOrEl) {
            const instance = dob.getInstance(selectorOrEl);
            if (instance) {
                instance.destroy();
                const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
                if (el) registry.delete(el);
                removeGlobalListenersIfNeeded();
            }
        },

        closeAll() {
            registry.forEach(instance => {
                instance.close();
            });
        }
    };

    /* ==========================================================================
       7. Auto Initialization
       ========================================================================== */
    function autoInit() {
        const autoInputs = document.querySelectorAll('input[pickdate]');
        autoInputs.forEach(input => {
            if (!registry.has(input)) {
                dob.pick(input);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

    return dob;
})));



/*
------------------------------
* How to use dob.js library
------------------------------

const pickerInstance = dob.pick('#birthdate', {
    minAge: 18,
    maxAge: 90,
    format: 'YYYY-MM-DD',

    onChange: function(canonicalDate) {
        console.log('Selected canonical date:', canonicalDate);
    }
});






*/