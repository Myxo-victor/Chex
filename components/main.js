const { div, section, header, footer, nav, h1, h2, h3, p, span, a, ul, li, strong, pre, code, button, img } = Chex;

const injectWelcomeStyles = () => {
    if (document.getElementById('chex-welcome-styles')) return;

    const style = document.createElement('style');
    style.id = 'chex-welcome-styles';
    style.textContent = `
        .chex-page {
            position: relative;
            min-height: 100vh;
        }

        /* -------------------- nav -------------------- */
        .chex-nav {
            position: sticky;
            top: 0;
            z-index: 50;
            background: rgba(10, 10, 12, 0.82);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid var(--chex-border);
        }

        .chex-nav-inner {
            width: min(1180px, calc(100% - 40px));
            margin: 0 auto;
            height: 68px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
        }

        .chex-brand {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
        }

        .chex-brand-mark {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(2, 1fr);
            width: 26px;
            height: 26px;
            border-radius: 7px;
            overflow: hidden;
            border: 1px solid var(--chex-border-strong);
        }
        .chex-brand-mark span { display: block; }
        .chex-brand-mark span:nth-child(1) { background: var(--chex-accent); }
        .chex-brand-mark span:nth-child(2) { background: var(--chex-surface-2); }
        .chex-brand-mark span:nth-child(3) { background: var(--chex-surface-2); }
        .chex-brand-mark span:nth-child(4) { background: var(--chex-accent); }

        .chex-brand-name {
            font-family: var(--chex-font-display);
            font-weight: 700;
            font-size: 1.05rem;
            letter-spacing: -0.02em;
            color: var(--chex-text);
        }

        .chex-nav-links {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .chex-nav-link {
            padding: 8px 14px;
            border-radius: 999px;
            color: var(--chex-text-dim);
            font-size: 0.9rem;
            text-decoration: none;
            transition: color .15s ease, background .15s ease;
        }
        .chex-nav-link:hover { color: var(--chex-text); background: rgba(255,255,255,0.06); }

        .chex-nav-cta {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: 999px;
            background: var(--chex-accent);
            color: var(--chex-accent-ink);
            font-weight: 700;
            font-size: 0.88rem;
            text-decoration: none;
            margin-left: 6px;
            transition: transform .15s ease, background .15s ease;
        }
        .chex-nav-cta:hover { background: var(--chex-accent-dim); transform: translateY(-1px); }

        /* -------------------- hero -------------------- */
        .chex-hero {
            position: relative;
            width: min(1180px, calc(100% - 40px));
            margin: 0 auto;
            padding: 96px 0 64px;
            overflow: hidden;
        }

        .chex-hero::before {
            content: '';
            position: absolute;
            top: -40px;
            right: -80px;
            width: 420px;
            height: 420px;
            background-image: repeating-conic-gradient(rgba(201,255,63,0.05) 0% 25%, transparent 0% 50%);
            background-size: 34px 34px;
            border-radius: 40px;
            mask-image: radial-gradient(circle, black 40%, transparent 72%);
            pointer-events: none;
            z-index: 0;
        }

        .chex-hero-content {
            position: relative;
            z-index: 1;
            max-width: 700px;
        }

        .chex-eyebrow-row {
            display: inline-flex;
            align-items: center;
            gap: 9px;
            padding: 7px 13px 7px 10px;
            border-radius: 999px;
            border: 1px solid var(--chex-border-strong);
            background: var(--chex-surface);
            margin-bottom: 26px;
        }

        .chex-pulse-dot {
            width: 7px; height: 7px; border-radius: 50%;
            background: var(--chex-accent);
            box-shadow: 0 0 0 0 rgba(201,255,63,0.55);
            animation: chex-pulse 1.8s infinite;
        }
        @keyframes chex-pulse {
            0%   { box-shadow: 0 0 0 0 rgba(201,255,63,0.5); }
            70%  { box-shadow: 0 0 0 7px rgba(201,255,63,0); }
            100% { box-shadow: 0 0 0 0 rgba(201,255,63,0); }
        }

        .chex-eyebrow-text {
            font-family: var(--chex-font-mono);
            font-size: 0.76rem;
            letter-spacing: 0.06em;
            color: var(--chex-text-dim);
        }

        .chex-hero h1 {
            font-size: clamp(2.6rem, 5.2vw, 4.2rem);
            line-height: 1.04;
            letter-spacing: -0.03em;
            margin-bottom: 22px;
        }
        .chex-hero h1 em {
            font-style: normal;
            color: var(--chex-accent);
        }

        .chex-hero-copy {
            font-size: 1.08rem;
            line-height: 1.7;
            color: var(--chex-text-dim);
            max-width: 560px;
            margin-bottom: 34px;
        }

        .chex-hero-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 14px;
            margin-bottom: 46px;
        }

        .chex-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            height: 48px;
            padding: 0 22px;
            border-radius: var(--chex-radius-sm);
            font-weight: 600;
            font-size: 0.95rem;
            text-decoration: none;
            border: 1px solid transparent;
            cursor: pointer;
            transition: transform .15s ease, background .15s ease, border-color .15s ease;
        }
        .chex-btn-primary {
            background: var(--chex-accent);
            color: var(--chex-accent-ink);
        }
        .chex-btn-primary:hover { background: var(--chex-accent-dim); transform: translateY(-2px); }
        .chex-btn-secondary {
            background: transparent;
            color: var(--chex-text);
            border-color: var(--chex-border-strong);
        }
        .chex-btn-secondary:hover { border-color: var(--chex-text-dim); transform: translateY(-2px); }

        .chex-proof-row {
            display: flex;
            flex-wrap: wrap;
            gap: 28px;
        }
        .chex-proof-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .chex-proof-item strong {
            font-family: var(--chex-font-display);
            font-size: 1.3rem;
            color: var(--chex-text);
        }
        .chex-proof-item span {
            font-size: 0.8rem;
            color: var(--chex-text-faint);
        }

        /* -------------------- demo -------------------- */
        .chex-demo-wrap {
            width: min(1180px, calc(100% - 40px));
            margin: 0 auto 90px;
            display: grid;
            grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
            gap: 18px;
        }

        .chex-panel {
            background: var(--chex-surface);
            border: 1px solid var(--chex-border);
            border-radius: var(--chex-radius-md);
            overflow: hidden;
        }

        .chex-panel-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            border-bottom: 1px solid var(--chex-border);
            font-family: var(--chex-font-mono);
            font-size: 0.72rem;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--chex-text-faint);
        }

        .chex-live-tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--chex-accent);
        }

        .chex-demo-stage {
            min-height: 220px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
            padding: 32px 20px;
        }

        .chex-count-display {
            font-family: var(--chex-font-display);
            font-size: 3.4rem;
            font-weight: 700;
            color: var(--chex-text);
            letter-spacing: -0.02em;
        }

        .chex-count-controls {
            display: flex;
            gap: 10px;
        }

        .chex-count-btn {
            width: 40px; height: 40px;
            border-radius: var(--chex-radius-sm);
            border: 1px solid var(--chex-border-strong);
            background: var(--chex-surface-2);
            color: var(--chex-text);
            font-family: var(--chex-font-mono);
            font-size: 1.1rem;
            cursor: pointer;
            transition: border-color .15s ease, transform .1s ease;
        }
        .chex-count-btn:hover { border-color: var(--chex-accent); }
        .chex-count-btn:active { transform: scale(0.94); }
        .chex-count-btn.reset {
            width: auto; padding: 0 14px; font-family: var(--chex-font-body); font-size: 0.82rem; color: var(--chex-text-dim);
        }

        .chex-code-panel pre {
            margin: 0;
            padding: 18px 20px;
            font-size: 0.83rem;
            line-height: 1.75;
            color: #d8dce1;
            overflow-x: auto;
            white-space: pre;
        }
        .chex-tok-kw   { color: #ff8f7a; }
        .chex-tok-fn   { color: var(--chex-accent); }
        .chex-tok-str  { color: #9fd9ff; }
        .chex-tok-com  { color: var(--chex-text-faint); }

        /* -------------------- features -------------------- */
        .chex-section {
            width: min(1180px, calc(100% - 40px));
            margin: 0 auto 90px;
        }

        .chex-section-head {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .chex-section-head h2 {
            font-size: clamp(1.7rem, 2.6vw, 2.2rem);
            letter-spacing: -0.02em;
        }
        .chex-section-head p {
            color: var(--chex-text-faint);
            font-size: 0.92rem;
            max-width: 360px;
        }

        .chex-feature-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
        }

        .chex-feature-card {
            position: relative;
            padding: 24px 22px;
            border-radius: var(--chex-radius-md);
            background: var(--chex-surface);
            border: 1px solid var(--chex-border);
            transition: border-color .15s ease, transform .15s ease;
        }
        .chex-feature-card:hover {
            border-color: var(--chex-border-strong);
            transform: translateY(-3px);
        }

        .chex-feature-icon {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(2, 1fr);
            width: 22px; height: 22px;
            border-radius: 5px;
            overflow: hidden;
            margin-bottom: 16px;
        }
        .chex-feature-icon span { display:block; background: var(--chex-surface-2); }
        .chex-feature-icon span.on { background: var(--chex-accent); }

        .chex-feature-card h3 {
            font-size: 1rem;
            margin-bottom: 8px;
            font-family: var(--chex-font-body);
            font-weight: 600;
        }
        .chex-feature-card p {
            color: var(--chex-text-dim);
            font-size: 0.88rem;
            line-height: 1.65;
        }

        /* -------------------- quickstart -------------------- */
        .chex-quickstart-panel {
            background: var(--chex-surface);
            border: 1px solid var(--chex-border);
            border-radius: var(--chex-radius-md);
            padding: 8px;
        }

        .chex-quickstart-panel pre {
            margin: 0;
            padding: 22px 24px;
            font-size: 0.86rem;
            line-height: 1.8;
            color: #d8dce1;
            overflow-x: auto;
        }

        /* -------------------- footer -------------------- */
        .chex-footer {
            border-top: 1px solid var(--chex-border);
            padding: 30px 0 60px;
        }
        .chex-footer-inner {
            width: min(1180px, calc(100% - 40px));
            margin: 0 auto;
            display: flex;
            flex-wrap: wrap;
            gap: 14px;
            align-items: center;
            justify-content: space-between;
        }
        .chex-footer-credit {
            font-size: 0.85rem;
            color: var(--chex-text-faint);
        }
        .chex-footer-links {
            display: flex;
            gap: 20px;
        }
        .chex-footer-links a {
            font-size: 0.85rem;
            color: var(--chex-text-dim);
            text-decoration: none;
        }
        .chex-footer-links a:hover { color: var(--chex-accent); }

        @media (max-width: 900px) {
            .chex-demo-wrap { grid-template-columns: 1fr; }
            .chex-feature-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }

        @media (max-width: 640px) {
            .chex-nav-links a.chex-nav-link { display: none; }
            .chex-feature-grid { grid-template-columns: 1fr; }
            .chex-hero { padding: 64px 0 48px; }
            .chex-proof-row { gap: 20px; }
        }
    `;
    document.head.appendChild(style);
};

const checkerMark = () =>
    img({class:'logo', src:'./images/logo.png', alt:'Chex Logo'});

const featureItems = [
    {
        title: 'Signal-based reactivity',
        description: 'Change a value, and every part of the UI that depends on it updates — no virtual DOM diffing to reason about.'
    },
    {
        title: 'Zero build, zero bundler',
        description: 'Drop in a script tag and start writing components. No compiler step between you and the browser.'
    },
    {
        title: 'Composable by default',
        description: 'Every element is a function. Build UI the same way you build any other piece of JavaScript.'
    },
    {
        title: 'Router included',
        description: 'Client-side routing ships in the core — no separate package to install and wire up.'
    },
    {
        title: 'Backend-ready',
        description: 'Chex.db connects straight to a PHP backend, so data fetching needs no extra glue code.'
    },
    {
        title: 'No dependencies',
        description: 'The entire engine is self-contained. Nothing to audit in your lockfile, nothing to update.'
    }
];

const demoCount = Chex.signal(0);

const DemoCounter = () => {
    return div({ class: 'chex-demo-stage' }, [
        span({ class: 'chex-count-display' }, `${demoCount.value}`),
        div({ class: 'chex-count-controls' }, [
            button({ class: 'chex-count-btn', onClick: () => demoCount.value -= 1 }, '−'),
            button({ class: 'chex-count-btn', onClick: () => demoCount.value += 1 }, '+'),
            button({ class: 'chex-count-btn reset', onClick: () => demoCount.value = 0 }, 'Reset')
        ])
    ]);
};

const WelcomePage = () => {
    injectWelcomeStyles();

    return div({ class: 'chex-page' }, [

        header({ class: 'chex-nav' }, [
            div({ class: 'chex-nav-inner' }, [
                a({ class: 'chex-brand', href: '#' }, [
                    checkerMark(),
                    span({ class: 'chex-brand-name' }, 'Chex')
                ]),
                nav({ class: 'chex-nav-links' }, [
                    a({ class: 'chex-nav-link', href: 'docs/index.html' }, 'Docs'),
                    a({ class: 'chex-nav-link', href: 'README.md' }, 'Quick start'),
                    a({ class: 'chex-nav-link', href: 'api/read.txt' }, 'API'),
                    a({ class: 'chex-nav-cta', href: 'README.md' }, 'Get started →')
                ])
            ])
        ]),

        section({ class: 'chex-hero' }, [
            div({ class: 'chex-hero-content' }, [
                div({ class: 'chex-eyebrow-row' }, [
                    span({ class: 'chex-pulse-dot' }),
                    span({ class: 'chex-eyebrow-text' }, 'BROWSER-NATIVE · ZERO BUILD')
                ]),
                h1('UI that reacts — no compiler required.'),
                p({ class: 'chex-hero-copy' }, 'Chex is a lightweight, signal-based UI engine you write directly in the browser. No bundler, no JSX transform, no framework lock-in — just functions that return elements.'),
                div({ class: 'chex-hero-actions' }, [
                    a({ class: 'chex-btn chex-btn-primary', href: 'README.md' }, 'Get started'),
                    a({ class: 'chex-btn chex-btn-secondary', href: 'docs/index.html' }, 'Browse docs')
                ]),
                div({ class: 'chex-proof-row' }, [
                    div({ class: 'chex-proof-item' }, [ strong('0'), span('build steps') ]),
                    div({ class: 'chex-proof-item' }, [ strong('0'), span('dependencies') ]),
                    div({ class: 'chex-proof-item' }, [ strong('1 tag') , span('to get started') ])
                ])
            ])
        ]),

        div({ class: 'chex-demo-wrap' }, [
            div({ class: 'chex-panel' }, [
                div({ class: 'chex-panel-head' }, [
                    span({ class: 'chex-live-tag' }, [ span({ class: 'chex-pulse-dot' }), 'Live signal' ]),
                    span('demo.js')
                ]),
                DemoCounter()
            ]),
            div({ class: 'chex-panel chex-code-panel' }, [
                div({ class: 'chex-panel-head' }, [ span('source'), span('4 lines') ]),
                pre({ innerHTML:
`<span class="chex-tok-kw">const</span> count = Chex.<span class="chex-tok-fn">signal</span>(0);

<span class="chex-tok-kw">const</span> Counter = () => div([
  span(<span class="chex-tok-str">\`\${count.value}\`</span>),
  button({ onClick: () => count.value += 1 }, <span class="chex-tok-str">'+'</span>)
]);

<span class="chex-tok-com">// updates automatically — no re-render call</span>` })
            ])
        ]),

        section({ class: 'chex-section' }, [
            div({ class: 'chex-section-head' }, [
                h2('Everything you need, nothing you don\u2019t'),
                p('A small core with the parts most projects actually reach for.')
            ]),
            div({ class: 'chex-feature-grid' },
                featureItems.map((item, i) =>
                    div({ class: 'chex-feature-card' }, [
                        div({ class: 'chex-feature-icon' }, [
                            span({ class: i % 2 === 0 ? 'on' : '' }),
                            span({ class: i % 2 === 0 ? '' : 'on' }),
                            span({ class: i % 2 === 0 ? '' : 'on' }),
                            span({ class: i % 2 === 0 ? 'on' : '' })
                        ]),
                        h3(item.title),
                        p(item.description)
                    ])
                )
            )
        ]),

        section({ class: 'chex-section' }, [
            div({ class: 'chex-section-head' }, [
                h2('Up and running in under a minute'),
                p('Paste this, open the file in a browser. That\u2019s the whole setup.')
            ]),
            div({ class: 'chex-quickstart-panel' }, [
                pre({ innerHTML:
`<span class="chex-tok-kw">&lt;script</span> src=<span class="chex-tok-str">"chex.js"</span><span class="chex-tok-kw">&gt;&lt;/script&gt;</span>
<span class="chex-tok-kw">&lt;script&gt;</span>
  <span class="chex-tok-kw">const</span> { div, h1, button } = Chex;
  <span class="chex-tok-kw">const</span> count = Chex.<span class="chex-tok-fn">signal</span>(0);

  <span class="chex-tok-kw">const</span> App = () => div([
    h1(<span class="chex-tok-str">\`Count: \${count.value}\`</span>),
    button({ onClick: () => count.value += 1 }, <span class="chex-tok-str">'Increment'</span>)
  ]);

  Chex.<span class="chex-tok-fn">render</span>(document.getElementById(<span class="chex-tok-str">'app'</span>), App);
<span class="chex-tok-kw">&lt;/script&gt;</span>` })
            ])
        ]),

        footer({ class: 'chex-footer' }, [
            div({ class: 'chex-footer-inner' }, [
                span({ class: 'chex-footer-credit' }, '© Chex — a browser-native UI engine.'),
                div({ class: 'chex-footer-links' }, [
                    a({ href: 'docs/index.html' }, 'Docs'),
                    a({ href: 'README.md' }, 'Quick start'),
                    a({ href: 'api/read.txt' }, 'API')
                ])
            ])
        ])
    ]);
};

Chex.render(document.getElementById('app'), WelcomePage);