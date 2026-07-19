# Chex 6.0.0

Chex is a lightweight JavaScript UI engine for fast, reactive, component-driven interfaces. It runs directly in the browser with no compiler or build step.

## Quick start

Include the engine, then write components with the tag helpers you need:

```html
<script src="./Chex.js"></script>
<script src="./components/main.js"></script>
```

```js
const { div, h1, button } = Chex;
const app = document.getElementById('app');
const count = Chex.signal(0);

const Counter = () => div({ class: 'counter' }, [
  h1(`Count: ${count.value}`),
  button({ onClick: () => (count.value += 1) }, 'Increment')
]);

Chex.render(app, Counter);
```

## Fast element API

Chex tag helpers accept props when you have them, and accept children directly when you do not:

```js
const { div, h1, button } = Chex;

// With props
div({ class: 'hero' }, [
  h1({}, 'Title'),
  button({ onClick: save }, 'Save')
]);

// No empty props object required
div([
  h1('Title'),
  button('Save')
]);
```

You can also use `Chex.div(...)`, `Chex.h1(...)`, and any standard HTML tag directly.

## Core features

- Fast VNode rendering and DOM patching with `Chex.render(...)`
- Concise tag helpers and custom-tag support
- Signals and effects: `Chex.signal(...)`, `Chex.effect(...)`
- Hash or history routing with `Chex.createRouter(...)`
- Fetch and cached query helpers through `Chex.api`
- Secure PHP database client through `Chex.db`
- Notifications, service-worker registration, and animation helpers
- Reusable UI components: Button, Input, AppBar, SideBar, BottomNav, and Card

## Backend database engine

`Chex.php` is the optional secure PHP/PDO endpoint used by `Chex.db.connect(...)`.

```js
const server = Chex.db.connect({
  endpoint: '/Chex.php',
  apiKey: 'YOUR_SECURE_API_KEY',
  table: 'users'
});

await server.create({ email: 'demo@example.com' });
const users = await server.read({ select: ['id', 'email'], limit: 10 });
```

Open `Chex.php` to set database credentials, allowed origins, allowed tables, and the API key. The client sends the key in the `X-Chex-Key` header.

`Chex_notify.php` receives browser notification registrations. Pair it with `Chex.notification.ask('/Chex_notify.php')` when notifications are enabled.

## Included libraries

All libraries are standalone and dependency-free. Load them after `Chex.js` when needed.

| File | Global | Purpose |
| --- | --- | --- |
| `scrollEcho.js` | `ScrollEcho` | Scroll-triggered text and element reveals. |
| `racket.js` | `racket` | Responsive multi-panel image carousel. |
| `orbit.js` | `orbit` | Swipe-friendly banner and slider helper. |
| `rinx.js` | `rinx` | Horizontal and vertical scroll-card layouts. |
| `smooth.js` | `smooth` | Continuous ticker and infinite carousel. |
| `modal.js` | `modal` | Self-styling, zero-dependency accessible modal engine. |
| `skeleton.js` | `skeleton` | DOM-to-skeleton shimmer loader that reduces layout shift. |

Example:

```html
<script src="./Chex.js"></script>
<script src="./libs/modal.js"></script>
<script src="./libs/skeleton.js"></script>
```

## Project structure

```text
ChexJs/
  Chex.js              Core engine
  Chex.php             Optional PHP/PDO backend
  Chex_notify.php      Notification registration endpoint
  components/          Page components and views
  libs/                Standalone visual and UI helpers
  index.html           Welcome page launcher
  index.css            Welcome page styles
  sw.js                Service worker
```

## Documentation

Open `docs/index.html` through a local web server for the full API, component, backend, library, and example guides.

## License

MIT License. Copyright (c) 2026 Aximon. Created by Myxo Victor.
