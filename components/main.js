const app = document.getElementById('app');

const topics = {
    home: {
        title: 'What is VenJS?',
        body: 'VenJS is a lightweight JavaScript UI engine for building interactive interfaces with simple component functions.'
    },
    features: {
        title: 'Why use it?',
        body: 'It keeps UI code readable, makes rendering straightforward, and lets you ship clean front-end pages quickly.'
    },
    started: {
        title: 'Getting started',
        body: 'Create components with venjs tags, render into #app, then add behavior with plain JavaScript and VenJS helpers.'
    }
};

const RoutePage = ({ keyName }) => {
    const current = topics[keyName] || topics.home;
    return venjs.div({ class: 'page' }, [
        venjs.h2({ class: 'page-title' }, current.title),
        venjs.p({ class: 'page-copy' }, current.body)
    ]);
};

const router = venjs.createRouter({
    '/home': () => RoutePage({ keyName: 'home' }),
    '/features': () => RoutePage({ keyName: 'features' }),
    '/started': () => RoutePage({ keyName: 'started' }),
    '/demo': () => (typeof DemoPage !== 'undefined' ? DemoPage() : RoutePage({ keyName: 'home' })),
    '*': () => RoutePage({ keyName: 'home' })
}, { mode: 'history', base: '/venjs' });

if (router.path.value === '/') {
    router.navigate('/home');
}

const routeLink = (label, route) => venjs.button({
    class: router.path.value === route ? 'nav-btn active' : 'nav-btn',
    onclick: () => router.navigate(route)
}, label);

const App = () => venjs.div({ class: 'app' }, [
    venjs.h1({ class: 'hero-title' }, 'VenJS 5.0 Single Page Demo'),
    venjs.p({ class: 'hero-copy' }, 'A tiny SPA-style layout powered by VenJS 5.0.'),
    venjs.div({ class: 'nav' }, [
        routeLink('Home', '/home'),
        routeLink('Features', '/features'),
        routeLink('Start', '/started'),
        routeLink('Demo', '/demo')
    ]),
    router.view()
]);

venjs.render(app, App);

venjs.animate('.hero-title', {
    slideFrom: 'top',
    duration: 700,
    opacity: [0, 1]
});

venjs.animate('.page', {
    slideFrom: 'bottom',
    duration: 500,
    opacity: [0, 1]
});

