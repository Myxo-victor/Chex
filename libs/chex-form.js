/**
 * @author Myxo victor
 * chex-form.js - Production-Hardened Lightweight Multi-Step Form Slider & Validator
 */

(function(window) {
    window.chex = window.chex || {};

    // Private WeakMap for instance tracking to avoid polluting DOM objects
    const instances = new WeakMap();

    window.chex.form = {
        start: function(opts) {
            if (!opts || !opts.IDs || !Array.isArray(opts.IDs) || opts.IDs.length === 0) {
                console.warn('[chex-form] Missing or invalid IDs array in configuration options.');
                return null;
            }

            const formIds = opts.IDs;
            const validEffects = ['slide', 'rotate', 'fall'];
            let animStyle = opts.effect || 'slide';
            if (!validEffects.includes(animStyle)) {
                console.warn(`[chex-form] Invalid effect "${animStyle}" provided. Falling back to "slide".`);
                animStyle = 'slide';
            }

            const legacyButtonDetection = !!opts.legacyButtonDetection;
            const buttonStyles = opts.buttonStyles || {};
            const ANIMATION_DURATION = 400; // ms

            const formElements = formIds.map(id => document.getElementById(id)).filter(Boolean);
            if (formElements.length !== formIds.length) {
                console.warn('[chex-form] One or more form IDs could not be found in the DOM.');
            }
            if (formElements.length === 0) return null;

            // Prevent duplicate initialization by destroying any existing instance on the first element
            const existingInstance = instances.get(formElements[0]);
            if (existingInstance) {
                existingInstance.destroy();
            }

            let activeIdx = 0;
            let isAnimating = false;
            let destroyed = false;
            let activeAnimationTimeout = null;
            let activeTransitionHandler = null;
            let activeTransitionElement = null;

            const boundListeners = [];
            const originalStyles = new Map();
            const originalBtnStyles = new Map();

            function addTrackedEventListener(target, event, handler, options) {
                target.addEventListener(event, handler, options);
                boundListeners.push({ target, event, handler, options });
            }

            function safeCallback(fn, ...args) {
                if (destroyed) return;
                if (typeof fn === 'function') {
                    try {
                        return fn(...args);
                    } catch (err) {
                        console.error('[chex-form] Error in user callback:', err);
                    }
                }
            }

            // Setup initial layout positions, capture original styles, and apply button styles
            formElements.forEach((el, idx) => {
                originalStyles.set(el, {
                    transition: el.style.transition,
                    position: el.style.position,
                    top: el.style.top,
                    left: el.style.left,
                    width: el.style.width,
                    boxSizing: el.style.boxSizing,
                    display: el.style.display,
                    opacity: el.style.opacity,
                    transform: el.style.transform,
                    willChange: el.style.willChange
                });

                el.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                el.style.position = idx === 0 ? 'relative' : 'absolute';
                el.style.top = '0';
                el.style.left = '0';
                el.style.width = '100%';
                el.style.boxSizing = 'border-box';

                if (idx === 0) {
                    el.style.display = 'block';
                    el.style.opacity = '1';
                    el.style.transform = 'none';
                } else {
                    el.style.display = 'none';
                    el.style.opacity = '0';
                    setInitialHiddenTransform(el, animStyle);
                }

                const buttons = el.querySelectorAll('button');
                buttons.forEach((btn, bIdx) => {
                    originalBtnStyles.set(btn, {
                        backgroundColor: btn.style.backgroundColor,
                        color: btn.style.color,
                        borderRadius: btn.style.borderRadius
                    });

                    const btnKey = `btn-${bIdx + 1}`;
                    if (buttonStyles[btnKey]) {
                        if (buttonStyles[btnKey].background) btn.style.backgroundColor = buttonStyles[btnKey].background;
                        if (buttonStyles[btnKey].color) btn.style.color = buttonStyles[btnKey].color;
                        if (buttonStyles[btnKey].borderRadius) btn.style.borderRadius = buttonStyles[btnKey].borderRadius;
                    }
                });
            });

            function setInitialHiddenTransform(node, style) {
                if (style === 'slide') node.style.transform = 'translateX(100%)';
                else if (style === 'rotate') node.style.transform = 'rotate(360deg) scale(0.8)';
                else if (style === 'fall') node.style.transform = 'translateY(-60px)';
            }

            safeCallback(opts.onStart, {
                stepElement: formElements[0],
                index: 0,
                formElement: formElements[0].closest('form') || null
            });

            // Centralized navigation actions using activeIdx as single source of truth
            function next() {
                if (destroyed || isAnimating) return;
                const currentEl = formElements[activeIdx];
                if (validateStep(currentEl)) {
                    if (activeIdx < formElements.length - 1) {
                        goTo(activeIdx + 1, 'forward');
                    }
                }
            }

            function back() {
                if (destroyed || isAnimating) return;
                if (activeIdx > 0) {
                    goTo(activeIdx - 1, 'backward');
                }
            }

            function submitForm() {
                if (destroyed || isAnimating) return;
                const currentEl = formElements[activeIdx];
                if (validateStep(currentEl)) {
                    const parentForm = currentEl.closest('form');
                    const formData = parentForm ? new FormData(parentForm) : new FormData();
                    
                    if (typeof opts.onSubmit === 'function') {
                        safeCallback(opts.onSubmit, formData, parentForm);
                    } else if (parentForm) {
                        if (typeof parentForm.requestSubmit === 'function') {
                            parentForm.requestSubmit();
                        } else {
                            parentForm.submit();
                        }
                    }
                }
            }

            // Bind controls using data-chex or legacy detection
            formElements.forEach((frm, idx) => {
                const actionButtons = frm.querySelectorAll('button');

                actionButtons.forEach(btn => {
                    let action = btn.getAttribute('data-chex');

                    if (!action && legacyButtonDetection) {
                        const label = btn.textContent.trim().toLowerCase();
                        if (label.includes('next') || label.includes('sign up')) {
                            action = 'next';
                        } else if (label.includes('submit')) {
                            action = 'submit';
                        } else if (label.includes('back') || label.includes('prev')) {
                            action = 'back';
                        }
                    }

                    if (action === 'next') {
                        addTrackedEventListener(btn, 'click', function(e) {
                            e.preventDefault();
                            next();
                        });
                    } else if (action === 'submit') {
                        addTrackedEventListener(btn, 'click', function(e) {
                            e.preventDefault();
                            submitForm();
                        });
                    } else if (action === 'back') {
                        addTrackedEventListener(btn, 'click', function(e) {
                            e.preventDefault();
                            back();
                        });
                    }
                });
            });

            // Native constraint validation engine with accessibility and safe JS-filtered radio group validation
            function validateStep(container) {
                let isValid = true;
                let firstInvalidField = null;

                container.querySelectorAll('.chex-validation-error').forEach(err => err.remove());
                container.querySelectorAll('[aria-invalid="true"]').forEach(el => {
                    el.removeAttribute('aria-invalid');
                    const desc = el.getAttribute('aria-describedby');
                    if (desc) {
                        const ids = desc.split(/\s+/).filter(id => !id.startsWith('chex-err-'));
                        if (ids.length > 0) {
                            el.setAttribute('aria-describedby', ids.join(' '));
                        } else {
                            el.removeAttribute('aria-describedby');
                        }
                    }
                    el.style.borderColor = '';
                });

                // Validate radio groups by collecting all radios and filtering by name via JS comparison
                const allRadios = container.querySelectorAll('input[type="radio"]');
                const radioGroups = new Map();
                allRadios.forEach(radio => {
                    if (radio.name) {
                        if (!radioGroups.has(radio.name)) {
                            radioGroups.set(radio.name, []);
                        }
                        radioGroups.get(radio.name).push(radio);
                    }
                });

                radioGroups.forEach((radios, groupName) => {
                    const isRequired = radios.some(r => r.required);
                    const isChecked = radios.some(r => r.checked);

                    if (isRequired && !isChecked) {
                        isValid = false;
                        const firstRadio = radios[0];
                        if (!firstInvalidField) firstInvalidField = firstRadio;
                        displayError(firstRadio, 'Please select one of the options.');
                    }
                });

                // Validate standard controls using native HTML validation
                const controls = container.querySelectorAll('input:not([type="radio"]), select, textarea');
                controls.forEach(field => {
                    if (!field.checkValidity()) {
                        isValid = false;
                        if (!firstInvalidField) firstInvalidField = field;
                        displayError(field, field.validationMessage || 'Invalid input.');
                    }
                });

                if (!isValid && firstInvalidField) {
                    firstInvalidField.focus();
                    safeCallback(opts.onValidationError, {
                        field: firstInvalidField,
                        stepElement: container,
                        index: activeIdx
                    });
                }

                return isValid;
            }

            function displayError(field, msg) {
                field.setAttribute('aria-invalid', 'true');
                field.style.borderColor = '#ff3b30';

                const fieldId = field.id || ('chex-field-' + Math.random().toString(36).substr(2, 9));
                if (!field.id) field.id = fieldId;
                const errId = 'chex-err-' + fieldId;

                const existingDesc = field.getAttribute('aria-describedby');
                let descIds = existingDesc ? existingDesc.split(/\s+/) : [];
                if (!descIds.includes(errId)) {
                    descIds.push(errId);
                    field.setAttribute('aria-describedby', descIds.join(' '));
                }

                if (field.parentNode) {
                    const errBox = document.createElement('span');
                    errBox.id = errId;
                    errBox.className = 'chex-validation-error chex-error-message';
                    errBox.setAttribute('data-chex-error-for', field.id);
                    errBox.style.color = '#ff3b30';
                    errBox.style.fontSize = '12px';
                    errBox.style.marginTop = '4px';
                    errBox.style.display = 'block';
                    errBox.textContent = msg;
                    field.insertAdjacentElement('afterend', errBox);
                }
            }

            function goTo(targetIndex, direction = 'forward') {
                if (destroyed || targetIndex < 0 || targetIndex >= formElements.length || targetIndex === activeIdx) return;
                if (isAnimating) return;

                const currentEl = formElements[activeIdx];
                const targetEl = formElements[targetIndex];
                isAnimating = true;

                const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                const duration = prefersReducedMotion ? 0 : ANIMATION_DURATION;

                // Apply will-change only during active transition
                currentEl.style.willChange = 'transform, opacity';
                targetEl.style.willChange = 'transform, opacity';

                if (!prefersReducedMotion) {
                    if (animStyle === 'slide') {
                        currentEl.style.transform = direction === 'forward' ? 'translateX(-100%)' : 'translateX(100%)';
                    } else if (animStyle === 'rotate') {
                        currentEl.style.transform = 'rotate(-360deg) scale(0.5)';
                    } else if (animStyle === 'fall') {
                        currentEl.style.transform = 'translateY(80px)';
                    }
                    currentEl.style.opacity = '0';
                } else {
                    currentEl.style.display = 'none';
                    currentEl.style.position = 'absolute';
                }

                const finishTransition = () => {
                    if (destroyed) return;
                    currentEl.style.display = 'none';
                    currentEl.style.position = 'absolute';
                    currentEl.style.willChange = '';

                    targetEl.style.display = 'block';
                    targetEl.style.position = 'relative';
                    setInitialHiddenTransform(targetEl, animStyle);
                    targetEl.style.opacity = '0';

                    void targetEl.offsetWidth;

                    targetEl.style.opacity = '1';
                    targetEl.style.transform = 'none';
                    targetEl.style.willChange = '';

                    const oldIdx = activeIdx;
                    activeIdx = targetIndex;
                    isAnimating = false;

                    safeCallback(opts.onChange, {
                        currentIndex: activeIdx,
                        previousIndex: oldIdx,
                        stepElement: targetEl,
                        formElement: targetEl.closest('form') || null
                    });

                    if (direction === 'forward') {
                        safeCallback(opts.onNext, {
                            currentIndex: activeIdx,
                            stepElement: targetEl,
                            formElement: targetEl.closest('form') || null
                        });
                    } else if (direction === 'backward') {
                        safeCallback(opts.onBack, {
                            currentIndex: activeIdx,
                            stepElement: targetEl,
                            formElement: targetEl.closest('form') || null
                        });
                    }
                };

                if (prefersReducedMotion || duration === 0) {
                    finishTransition();
                } else {
                    let transitioned = false;
                    activeTransitionElement = currentEl;
                    activeTransitionHandler = (e) => {
                        if (e.target === currentEl) {
                            currentEl.removeEventListener('transitionend', activeTransitionHandler);
                            activeTransitionHandler = null;
                            activeTransitionElement = null;
                            if (activeAnimationTimeout) {
                                clearTimeout(activeAnimationTimeout);
                                activeAnimationTimeout = null;
                            }
                            transitioned = true;
                            finishTransition();
                        }
                    };
                    currentEl.addEventListener('transitionend', activeTransitionHandler);
                    activeAnimationTimeout = setTimeout(() => {
                        if (!transitioned) {
                            if (activeTransitionElement && activeTransitionHandler) {
                                activeTransitionElement.removeEventListener('transitionend', activeTransitionHandler);
                                activeTransitionHandler = null;
                                activeTransitionElement = null;
                            }
                            activeAnimationTimeout = null;
                            finishTransition();
                        }
                    }, duration + 50);
                }
            }

            const instance = {
                next: next,
                back: back,
                goTo: function(index) {
                    if (destroyed) return;
                    if (index >= 0 && index < formElements.length) {
                        goTo(index, index > activeIdx ? 'forward' : 'backward');
                    }
                },
                destroy: function() {
                    if (destroyed) return;
                    destroyed = true;

                    if (activeAnimationTimeout) {
                        clearTimeout(activeAnimationTimeout);
                        activeAnimationTimeout = null;
                    }

                    if (activeTransitionElement && activeTransitionHandler) {
                        activeTransitionElement.removeEventListener('transitionend', activeTransitionHandler);
                        activeTransitionHandler = null;
                        activeTransitionElement = null;
                    }

                    boundListeners.forEach(({ target, event, handler, options }) => {
                        target.removeEventListener(event, handler, options);
                    });
                    boundListeners.length = 0;

                    formElements.forEach(el => {
                        const orig = originalStyles.get(el);
                        if (orig) {
                            el.style.transition = orig.transition;
                            el.style.position = orig.position;
                            el.style.top = orig.top;
                            el.style.left = orig.left;
                            el.style.width = orig.width;
                            el.style.boxSizing = orig.boxSizing;
                            el.style.display = orig.display;
                            el.style.opacity = orig.opacity;
                            el.style.transform = orig.transform;
                            el.style.willChange = orig.willChange;
                        }
                    });

                    originalBtnStyles.forEach((orig, btn) => {
                        btn.style.backgroundColor = orig.backgroundColor;
                        btn.style.color = orig.color;
                        btn.style.borderRadius = orig.borderRadius;
                    });

                    if (formElements[0]) {
                        instances.delete(formElements[0]);
                    }
                }
            };

            instances.set(formElements[0], instance);
            return instance;
        }
    };

})(window);