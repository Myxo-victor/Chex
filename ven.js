/*
* @author Myxo victor
* @type Enterprise-Level UI Framework + Engine
* @Version 5.9.0 (Unified: VDom + Signals + Store + Animation + API + Notifications + Components)
* @copy Copyright Aximon 2026 | MIT License
*/

const venjs = (() => {
    const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

    // --- UTILS ---
    const isEvent = (key) => key.startsWith("on");
    const isProperty = (key) => key !== "children" && key !== "key" && key !== "ref" && key !== "onMount" && key !== "onUnmount" && !isEvent(key);
    const isLifecycle = (key) => key === "onMount" || key === "onUnmount";
    const shallowEqual = (a, b) => {
        if (a === b) return true;
        if (!a || !b) return false;
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        for (const key of keysA) {
            if (a[key] !== b[key]) return false;
        }
        return true;
    };

    // --- VIRTUAL DOM CORE ---
    function createVNode(tag, props, ...children) {
        const flatChildren = children.flat(Infinity).filter(c => c !== null && c !== undefined);
        const vnodeProps = props || {};
        return {
            tag,
            key: vnodeProps.key,
            props: vnodeProps,
            children: flatChildren.map(child =>
                (typeof child === "object" && child.tag) 
                    ? child 
                    : createTextVNode(String(child))
            )
        };
    }

    function createTextVNode(text) {
        return {
            tag: "TEXT_ELEMENT",
            props: { nodeValue: text },
            children: []
        };
    }

    // --- REACTIVE SIGNALS ---
    let activeEffect = null;

    function stopEffect(effectRunner) {
        if (!effectRunner) return;
        if (typeof effectRunner._cleanup === "function") {
            effectRunner._cleanup();
        }
        effectRunner._cleanup = null;
        effectRunner._deps.forEach(depSet => depSet.delete(effectRunner));
        effectRunner._deps.clear();
    }

    function signal(value) {
        const subscriptions = new Set();
        return {
            get value() {
                if (activeEffect) {
                    subscriptions.add(activeEffect);
                    activeEffect._deps.add(subscriptions);
                }
                return value;
            },
            set value(newValue) {
                if (value === newValue) return;
                value = newValue;
                Array.from(subscriptions).forEach(fn => fn());
            },
            peek: () => value
        };
    }

    function effect(fn) {
        const effectRunner = () => {
            stopEffect(effectRunner);
            activeEffect = effectRunner;
            const nextCleanup = fn();
            activeEffect = null;
            if (typeof nextCleanup === "function") {
                effectRunner._cleanup = nextCleanup;
            }
        };
        effectRunner._cleanup = null;
        effectRunner._deps = new Set();
        effectRunner();
        return () => stopEffect(effectRunner);
    }

    // --- DOM RENDERING ENGINE ---
    function createDom(vnode) {
        const dom = vnode.tag === "TEXT_ELEMENT"
            ? document.createTextNode("")
            : document.createElement(vnode.tag);

        updateDom(dom, {}, vnode.props);

        vnode.children.forEach(child => {
            dom.appendChild(createDom(child));
        });

        vnode.dom = dom;
        if (typeof vnode.props?.ref === "function") vnode.props.ref(dom);
        return dom;
    }

    function updateDom(dom, prevProps, nextProps) {
        const prev = prevProps || {};
        const next = nextProps || {};

        // Remove old or changed event listeners
        Object.keys(prev).forEach(name => {
            if (isEvent(name)) {
                const eventType = name.toLowerCase().substring(2);
                if (!next[name] || prev[name] !== next[name]) {
                    dom.removeEventListener(eventType, prev[name]);
                }
            } else if (isProperty(name) && !(name in next)) {
                if (name === "className" || name === "class") {
                    dom.className = "";
                } else if (name === "style" && typeof prev[name] === "object") {
                    Object.keys(prev[name]).forEach(styleKey => {
                        dom.style[styleKey] = "";
                    });
                } else if (name in dom) {
                    dom[name] = "";
                } else {
                    dom.removeAttribute(name);
                }
            }
        });

        // Add/update new props
        Object.keys(next).forEach(name => {
            if (isLifecycle(name)) return;
            const val = next[name];
            if (isEvent(name)) {
                const eventType = name.toLowerCase().substring(2);
                if (!prev[name] || prev[name] !== val) {
                    dom.addEventListener(eventType, val);
                }
            } else if (isProperty(name)) {
                if (name === "style" && typeof val === "object") {
                    const prevStyle = prev.style && typeof prev.style === "object" ? prev.style : {};
                    Object.keys(prevStyle).forEach(styleKey => {
                        if (!(styleKey in val)) dom.style[styleKey] = "";
                    });
                    Object.assign(dom.style, val);
                } else if (name === "className" || name === "class") {
                    dom.className = val;
                } else if (name === "innerHTML") {
                    dom.innerHTML = val;
                } else if (name === "value" || name === "checked" || name === "selected" || name === "disabled") {
                    dom[name] = val;
                } else {
                    if (name in dom) dom[name] = val;
                    else dom.setAttribute(name, val);
                }
            }
        });

        if (typeof next.ref === "function") next.ref(dom);
    }

    function sameVNode(a, b) {
        if (!a || !b) return false;
        if (a.tag !== b.tag) return false;
        if (a.tag === "TEXT_ELEMENT") {
            return a.props.nodeValue === b.props.nodeValue;
        }
        if (a.key !== undefined || b.key !== undefined) {
            return a.key === b.key && a.tag === b.tag;
        }
        return true;
    }

    function callMount(vnode) {
        if (!vnode) return;
        if (typeof vnode.props?.onMount === "function" && vnode.dom) {
            vnode.props.onMount(vnode.dom, vnode);
        }
        vnode.children.forEach(callMount);
    }

    function callUnmount(vnode) {
        if (!vnode) return;
        vnode.children.forEach(callUnmount);
        if (typeof vnode.props?.onUnmount === "function" && vnode.dom) {
            vnode.props.onUnmount(vnode.dom, vnode);
        }
    }

    function patch(parentDom, oldVNode, newVNode, index = 0) {
        const existingDom = parentDom.childNodes[index];

        if (!oldVNode && newVNode) {
            const newDom = createDom(newVNode);
            parentDom.appendChild(newDom);
            callMount(newVNode);
            return;
        }

        if (oldVNode && !newVNode) {
            callUnmount(oldVNode);
            if (existingDom) parentDom.removeChild(existingDom);
            return;
        }

        if (!oldVNode || !newVNode) return;

        if (!sameVNode(oldVNode, newVNode)) {
            const newDom = createDom(newVNode);
            callUnmount(oldVNode);
            if (existingDom) parentDom.replaceChild(newDom, existingDom);
            else parentDom.appendChild(newDom);
            callMount(newVNode);
            return;
        }

        if (newVNode.tag === "TEXT_ELEMENT") {
            const oldText = oldVNode.props.nodeValue;
            const newText = newVNode.props.nodeValue;
            if (oldText !== newText && existingDom) existingDom.nodeValue = newText;
            newVNode.dom = existingDom;
            return;
        }

        newVNode.dom = existingDom;
        updateDom(existingDom, oldVNode.props, newVNode.props);

        const oldChildren = oldVNode.children || [];
        const newChildren = newVNode.children || [];
        const commonLength = Math.min(oldChildren.length, newChildren.length);

        // 1. Update existing common children
        for (let i = 0; i < commonLength; i++) {
            patch(existingDom, oldChildren[i], newChildren[i], i);
        }

        // 2. Add new children or remove excess old children
        if (newChildren.length > oldChildren.length) {
            for (let i = commonLength; i < newChildren.length; i++) {
                patch(existingDom, null, newChildren[i], i);
            }
        } else if (oldChildren.length > newChildren.length) {
            // Iterate backwards to keep DOM indices stable during removal
            for (let i = oldChildren.length - 1; i >= commonLength; i--) {
                patch(existingDom, oldChildren[i], null, i);
            }
        }
    }

    // --- ENTERPRISE UI COMPONENTS ---
    const UI = {
        button: (props, ...children) => {
            const baseClass = "px-6 py-2.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ";
            const variant = props.variant === 'outline' 
                ? "border-2 border-blue-600 text-blue-600 hover:bg-blue-50" 
                : "bg-blue-600 text-white shadow-lg hover:shadow-blue-200";
            return createVNode("button", { ...props, class: baseClass + variant + " " + (props.class || "") }, ...children);
        },
        input: (props) => createVNode("div", { class: "flex flex-col gap-1 w-full" }, [
            props.label ? createVNode("label", { class: "text-sm font-semibold text-gray-600 ml-1" }, props.label) : null,
            createVNode("input", { 
                ...props, 
                class: "px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all " + (props.class || "") 
            })
        ]),
        appBar: (props) => createVNode("nav", { 
            class: "sticky top-0 z-50 w-full px-6 py-4 flex items-center justify-between backdrop-blur-md bg-white/80 border-b border-gray-100" 
        }, [
            createVNode("div", { class: "text-xl font-black tracking-tighter text-blue-600" }, props.title || "VENJS"),
            createVNode("div", { class: "hidden md:flex gap-6 font-medium text-gray-600" }, props.links || []),
            props.trailing || createVNode("div", { class: "w-8 h-8 rounded-full bg-gray-200" })
        ]),
        sideBar: (props) => {
            const isOpen = props.isOpen !== false;
            return createVNode("aside", { 
                class: `fixed left-0 top-0 h-full bg-white border-r border-gray-100 transition-all duration-300 z-[60] ${isOpen ? 'w-64' : 'w-0 -translate-x-full'} md:translate-x-0 md:w-64 p-6` 
            }, props.children || []);
        },
        bottomNav: (props) => createVNode("div", { 
            class: "fixed bottom-0 left-0 w-full h-16 bg-white border-t border-gray-100 flex md:hidden items-center justify-around px-4 pb-safe z-50" 
        }, props.items || []),
        card: (props, ...children) => createVNode("div", { 
            class: "bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow " + (props.class || "") 
        }, ...children)
    };

    // --- THE CORE BASE OBJECT ---
    const base = {
        isWeb,
        signal,
        effect,
        createElement: createVNode,
        ...UI,

        render: function(container, componentFactory) {
            if (!isWeb || !container) return;
            let prevVNode = null;
            const stop = effect(() => {
                const nextVNode = typeof componentFactory === 'function' ? componentFactory() : componentFactory;
                if (!prevVNode) {
                    container.innerHTML = '';
                    const dom = createDom(nextVNode);
                    container.appendChild(dom);
                    callMount(nextVNode);
                } else {
                    patch(container, prevVNode, nextVNode, 0);
                }
                prevVNode = nextVNode;
            });
            return () => {
                stop();
                if (prevVNode) callUnmount(prevVNode);
                container.innerHTML = '';
                prevVNode = null;
            };
        },

        createRouter: function(routes = {}, options = {}) {
            const mode = options.mode === "history" ? "history" : "hash";
            const basePath = (() => {
                const rawBase = options.base ? String(options.base).trim() : "";
                if (!rawBase || rawBase === "/") return "";
                const withPrefix = rawBase.startsWith("/") ? rawBase : `/${rawBase}`;
                return withPrefix.endsWith("/") ? withPrefix.slice(0, -1) : withPrefix;
            })();
            const normalizePath = (path) => {
                if (!path) return "/";
                const trimmed = String(path).trim();
                if (trimmed === "#/" || trimmed === "#") return "/";
                return trimmed.startsWith("/") ? trimmed : `/${trimmed.replace(/^#/, "")}`;
            };
            const withBase = (path) => {
                if (!basePath) return path;
                if (path === "/") return `${basePath}/`;
                return `${basePath}${path}`;
            };
            const stripBase = (path) => {
                const normalized = normalizePath(path);
                if (!basePath) return normalized;
                if (normalized === basePath) return "/";
                if (normalized.startsWith(`${basePath}/`)) {
                    return normalized.slice(basePath.length) || "/";
                }
                return normalized;
            };
            const readPath = () => {
                if (!isWeb) return "/";
                if (mode === "hash") {
                    return normalizePath(window.location.hash.replace(/^#/, ""));
                }
                return stripBase(window.location.pathname);
            };

            const current = signal(readPath());
            const onChange = () => { current.value = readPath(); };

            if (isWeb) {
                if (mode === "hash") window.addEventListener("hashchange", onChange);
                else window.addEventListener("popstate", onChange);
            }

            const navigate = (to) => {
                const nextPath = normalizePath(to);
                if (!isWeb) {
                    current.value = nextPath;
                    return;
                }
                if (mode === "hash") {
                    if (window.location.hash !== `#${nextPath}`) window.location.hash = nextPath;
                    else current.value = nextPath;
                } else {
                    const target = withBase(nextPath);
                    if (window.location.pathname !== target) window.history.pushState({}, "", target);
                    current.value = nextPath;
                }
            };

            const resolve = () => {
                const page = routes[current.value] || routes["*"] || options.notFound;
                if (!page) return createVNode("p", { style: "padding:12px" }, `Route "${current.value}" not found`);
                return typeof page === "function" ? page({ path: current.value, navigate }) : page;
            };

            return {
                path: current,
                navigate,
                resolve,
                view: () => resolve(),
                destroy: () => {
                    if (!isWeb) return;
                    if (mode === "hash") window.removeEventListener("hashchange", onChange);
                    else window.removeEventListener("popstate", onChange);
                }
            };
        },

        notification: {
            registerServiceWorker: async (swPath = '/sw.js') => {
                if (isWeb && 'serviceWorker' in navigator) {
                    try {
                        return await navigator.serviceWorker.register(swPath);
                    } catch (e) { console.error('SW Registration Failed:', e); }
                }
            },
            ask: async (phpUrl = null) => {
                if (!isWeb || !("Notification" in window)) return false;
                const permission = await Notification.requestPermission();
                if (permission === "granted") {
                    const deviceId = btoa(navigator.userAgent + Math.random()).substring(0, 24);
                    if (phpUrl) {
                        fetch(phpUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ deviceId, type: 'browser_push', timestamp: Date.now() })
                        }).catch(e => console.error("Venjs Sync Error:", e));
                    }
                    return deviceId;
                }
                return false;
            },
            push: (options) => {
                if (isWeb && Notification.permission === "granted") {
                    const n = new Notification("VenJS 5.0 App", {
                        body: options.Content,
                        icon: options.icon || '',
                    });
                    n.onclick = () => {
                        window.focus();
                        if (options.url) window.open(options.url, '_blank');
                        n.close();
                    };
                }
            }
        },

        createStore: (initialState) => {
            let state = { ...initialState };
            const listeners = [];
            return {
                getState: () => state,
                setState: (ns) => { state = { ...state, ...ns }; listeners.forEach(l => l(state)); },
                subscribe: (l) => { listeners.push(l); return () => listeners.splice(listeners.indexOf(l), 1); }
            };
        },

        api: {
            connect: async (url, options = {}) => {
                const config = {
                    method: options.method || 'GET',
                    headers: { 'Content-Type': 'application/json', ...options.headers },
                    ...options
                };
                if (options.body && typeof options.body === 'object') config.body = JSON.stringify(options.body);
                const res = await fetch(url, config);
                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
                }
                return await res.json();
            },
            _cache: new Map(),
            query: async function(key, fetcher, options = {}) {
                const cacheKey = typeof key === "string" ? key : JSON.stringify(key);
                const ttl = typeof options.ttl === "number" ? options.ttl : 30000;
                const force = options.force === true;
                const now = Date.now();
                const cached = this._cache.get(cacheKey);
                if (!force && cached && (now - cached.timestamp) < ttl) {
                    return cached.data;
                }
                const data = await fetcher();
                this._cache.set(cacheKey, { data, timestamp: now });
                return data;
            },
            invalidate: function(key) {
                const cacheKey = typeof key === "string" ? key : JSON.stringify(key);
                this._cache.delete(cacheKey);
            },
            clearCache: function() {
                this._cache.clear();
            }
        },

        db: {
            request: async function(endpoint, payload = {}, options = {}) {
                const headers = {
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                };

                if (options.apiKey) {
                    headers['X-Venjs-Key'] = String(options.apiKey);
                }

                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                    credentials: options.credentials || 'same-origin',
                    mode: options.mode || 'cors',
                    cache: 'no-store'
                });

                const raw = await res.text();
                let json = null;
                try { json = raw ? JSON.parse(raw) : null; } catch (_) {}

                if (!res.ok || (json && json.ok === false)) {
                    const message = (json && (json.error || json.message)) || `HTTP ${res.status}`;
                    throw new Error(message);
                }

                return json;
            },

            connect: function(config = {}) {
                const endpoint = config.endpoint || '/ven.php';
                const defaultTable = config.table || null;
                const options = {
                    apiKey: config.apiKey || '',
                    headers: config.headers || {},
                    credentials: config.credentials || 'same-origin',
                    mode: config.mode || 'cors'
                };

                const send = (payload) => this.request(endpoint, payload, options);
                const resolveTable = (tableOverride) => tableOverride || defaultTable;

                return {
                    request: (payload) => send(payload),
                    read: (args = {}) => send({
                        op: 'read',
                        table: resolveTable(args.table),
                        select: args.select,
                        where: args.where,
                        orderBy: args.orderBy,
                        limit: args.limit,
                        offset: args.offset
                    }),
                    create: (data, args = {}) => send({
                        op: 'create',
                        table: resolveTable(args.table),
                        data
                    }),
                    register: (data, args = {}) => send({
                        op: 'register',
                        table: resolveTable(args.table),
                        data
                    }),
                    update: (where, data, args = {}) => send({
                        op: 'update',
                        table: resolveTable(args.table),
                        where,
                        data
                    }),
                    remove: (where, args = {}) => send({
                        op: 'delete',
                        table: resolveTable(args.table),
                        where
                    }),
                    delete: (where, args = {}) => send({
                        op: 'delete',
                        table: resolveTable(args.table),
                        where
                    }),
                    exists: (where, args = {}) => send({
                        op: 'exists',
                        table: resolveTable(args.table),
                        where
                    }),
                    login: (credentials, args = {}) => send({
                        op: 'login',
                        table: resolveTable(args.table),
                        credentials,
                        login: {
                            userField: args.userField || 'email',
                            passField: args.passField || 'password_hash'
                        },
                        select: args.select || ['id', 'email']
                    })
                };
            }
        },

        // --- FIXED ANIMATION ENGINE ---
        animate: function(selector, options = {}) {
            if (!isWeb) return;
            const elements = typeof selector === 'string' ? document.querySelectorAll(selector) : (selector instanceof HTMLElement ? [selector] : selector);
            if (!elements || elements.length === 0) return;

            const config = { 
                duration: options.duration || 800, 
                easing: options.easing || 'cubic-bezier(0.4, 0, 0.2, 1)', 
                once: options.once !== false 
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this._play(entry.target, options, config);
                        if (config.once) observer.unobserve(entry.target);
                    }
                });
            }, { threshold: options.threshold || 0.1 });
            
            elements.forEach(el => {
                // Set initial state to avoid flash
                el.style.opacity = options.opacity ? options.opacity[0] : 0;
                observer.observe(el);
            });
        },

        _play: (el, options, config) => {
            // Directional Map for slideFrom logic
            const directionMap = {
                'top': 'translateY(-100px)',
                'bottom': 'translateY(100px)',
                'left': 'translateX(-100px)',
                'right': 'translateX(100px)'
            };

            const startTransform = options.transform 
                ? options.transform[0] 
                : (directionMap[options.slideFrom] || 'translateY(40px)');

            const keyframes = [
                { 
                    opacity: options.opacity ? options.opacity[0] : 0, 
                    transform: startTransform 
                },
                { 
                    opacity: options.opacity ? options.opacity[1] : 1, 
                    transform: options.transform ? options.transform[1] : 'translate(0, 0)' 
                }
            ];
            
            el.animate(keyframes, { 
                duration: config.duration, 
                easing: config.easing, 
                fill: 'forwards' 
            });
        }
    };

    // Proxied to support legacy calls like venjs.div()
    return new Proxy(base, {
        get(target, prop) {
            if (prop in target) return target[prop];
            return (props, ...children) => createVNode(prop, props, ...children);
        }
    });
})();

// Legacy Aliases
venjs.ven = venjs.render;
venjs.mount = venjs.render;

// --- GLOBAL ATTACHMENT ---
if (typeof window !== 'undefined') {
    window.venjs = venjs;
    window.venX = venjs;
    window.v = venjs.createElement;
}

if (typeof exports !== 'undefined') {
    module.exports = venjs;
}
